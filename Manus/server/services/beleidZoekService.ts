/**
 * Beleid Zoek Service
 * 
 * Zoekt naar ontbrekend beleid op internet wanneer jurisprudentie verwijst naar
 * beleidsdocumenten die niet in de lokale kennisbank aanwezig zijn.
 * 
 * Flow:
 * 1. Jurisprudentie verwijst naar beleid (bijv. "Parkeerbeleid gemeente Utrecht")
 * 2. Check of vergelijkbaar beleid bestaat in lokale kennisbank
 * 3. Zo niet: zoek op internet naar het beleid van de behandelende gemeente
 * 4. Presenteer gevonden beleid aan gebruiker voor bevestiging
 * 5. Bij bevestiging: voeg toe aan kennisbank
 */

import { getDb } from "../db";
import { 
  kennisbankItems,
  beleidSuggestie,
  jurisprudentieBeleidsverwijzing
} from "../../drizzle/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// Beleid type mapping naar kennisbank categorieën
const BELEID_TYPE_MAPPING: Record<string, string[]> = {
  parkeerbeleid: ["parkeerbeleid", "parkeernota", "parkeervisie", "parkeernormen", "CROW"],
  welstandsnota: ["welstandsnota", "beeldkwaliteitsplan", "welstandsbeleid"],
  horecabeleid: ["horecabeleid", "horecavisie", "horecaverordening", "exploitatieverordening"],
  woonbeleid: ["woonvisie", "woonbeleid", "huisvestingsverordening", "woningbouwprogramma"],
  detailhandelsbeleid: ["detailhandelsvisie", "detailhandelsbeleid", "PDV-beleid", "winkelbeleid"],
  milieubeleid: ["milieubeleid", "duurzaamheidsvisie", "energiebeleid"],
  groenbeleid: ["groenstructuurplan", "bomenverordening", "bomenbeleid", "groenbeleidsplan"],
  erfgoedbeleid: ["erfgoedverordening", "monumentenbeleid", "cultuurhistorisch beleid"],
  verkeerbeleid: ["mobiliteitsplan", "verkeersbeleid", "verkeerscirculatieplan"]
};

// Zoek URL templates per bron
const ZOEK_BRONNEN = [
  {
    naam: "Gemeente website",
    urlTemplate: (gemeente: string, zoekterm: string) => 
      `https://www.google.com/search?q=site:${gemeente.toLowerCase().replace(/\s+/g, '')}.nl+${encodeURIComponent(zoekterm)}+filetype:pdf`
  },
  {
    naam: "Overheid.nl",
    urlTemplate: (gemeente: string, zoekterm: string) => 
      `https://www.google.com/search?q=site:overheid.nl+${encodeURIComponent(gemeente)}+${encodeURIComponent(zoekterm)}+filetype:pdf`
  },
  {
    naam: "Raadsinformatie",
    urlTemplate: (gemeente: string, zoekterm: string) => 
      `https://www.google.com/search?q=site:raadsinformatie.nl+${encodeURIComponent(gemeente)}+${encodeURIComponent(zoekterm)}`
  },
  {
    naam: "Algemeen",
    urlTemplate: (gemeente: string, zoekterm: string) => 
      `https://www.google.com/search?q=${encodeURIComponent(gemeente)}+${encodeURIComponent(zoekterm)}+beleid+pdf`
  }
];

export interface BeleidsverwijzingUitJurisprudentie {
  beleidsNaam: string;
  beleidsType: string;
  gemeenteInJurisprudentie?: string;
  genoemdeNormen?: string;
  citaat?: string;
  ecli: string;
}

export interface GevondenBeleid {
  titel: string;
  url: string;
  bron: string;
  gemeente: string;
  type: string;
  publicatieDatum?: string;
  samenvatting?: string;
  betrouwbaarheid: "hoog" | "gemiddeld" | "laag";
}

export interface BeleidSuggestie {
  id?: number;
  gemeenteId: number;
  beleidsNaam: string;
  beleidsType: string;
  bronUrl: string;
  bronNaam: string;
  gevondenVia: "jurisprudentie" | "internet_zoek" | "crawler";
  triggerEcli?: string;
  genoemdeNormen?: string;
  aiSamenvatting?: string;
  status: "pending" | "accepted" | "rejected";
}

/**
 * Check of vergelijkbaar beleid al bestaat in de kennisbank
 */
export async function checkBestaandBeleid(
  gemeenteId: number,
  beleidsType: string
): Promise<{ bestaat: boolean; bestaandBeleid?: any }> {
  const db = await getDb();
  if (!db) return { bestaat: false };
  
  // Haal zoektermen op voor dit beleidstype
  const zoektermen = BELEID_TYPE_MAPPING[beleidsType] || [beleidsType];
  
  // Zoek in kennisbank
  for (const zoekterm of zoektermen) {
    const results = await db.select()
      .from(kennisbankItems)
      .where(
        and(
          eq(kennisbankItems.scopeGemeenteId, gemeenteId),
          like(kennisbankItems.naam, `%${zoekterm}%`)
        )
      )
      .limit(1);
    
    if (results.length > 0) {
      return { bestaat: true, bestaandBeleid: results[0] };
    }
  }
  
  // Zoek ook op type
  const typeResults = await db.select()
    .from(kennisbankItems)
    .where(
      and(
        eq(kennisbankItems.scopeGemeenteId, gemeenteId),
        eq(kennisbankItems.itemType, "beleidsdocument")
      )
    )
    .limit(1);
  
  if (typeResults.length > 0) {
    return { bestaat: true, bestaandBeleid: typeResults[0] };
  }
  
  return { bestaat: false };
}

/**
 * Vergelijk beleidsverwijzingen uit jurisprudentie met lokale kennisbank
 */
export async function vergelijkMetKennisbank(
  gemeenteId: number,
  beleidsverwijzingen: BeleidsverwijzingUitJurisprudentie[]
): Promise<{
  gevonden: Array<{
    verwijzing: BeleidsverwijzingUitJurisprudentie;
    lokaalBeleid: any;
    vergelijking: string;
  }>;
  ontbrekend: BeleidsverwijzingUitJurisprudentie[];
}> {
  const gevonden: Array<{
    verwijzing: BeleidsverwijzingUitJurisprudentie;
    lokaalBeleid: any;
    vergelijking: string;
  }> = [];
  const ontbrekend: BeleidsverwijzingUitJurisprudentie[] = [];
  
  for (const verwijzing of beleidsverwijzingen) {
    const { bestaat, bestaandBeleid } = await checkBestaandBeleid(
      gemeenteId, 
      verwijzing.beleidsType
    );
    
    if (bestaat && bestaandBeleid) {
      // Genereer vergelijking
      let vergelijking = `Lokaal beleid gevonden: ${bestaandBeleid.naam}`;
      
      if (verwijzing.genoemdeNormen && bestaandBeleid.samenvatting) {
        vergelijking += `\n\nIn jurisprudentie (${verwijzing.gemeenteInJurisprudentie || 'andere gemeente'}): ${verwijzing.genoemdeNormen}`;
        vergelijking += `\n\nUw beleid: Zie ${bestaandBeleid.naam} voor lokale normen.`;
      }
      
      gevonden.push({
        verwijzing,
        lokaalBeleid: bestaandBeleid,
        vergelijking
      });
    } else {
      ontbrekend.push(verwijzing);
    }
  }
  
  return { gevonden, ontbrekend };
}

/**
 * Genereer zoekquery's voor ontbrekend beleid
 */
function genereerZoekQueries(
  gemeenteNaam: string,
  beleidsType: string,
  beleidsNaam: string
): string[] {
  const queries: string[] = [];
  
  // Specifieke zoektermen per type
  const typeZoektermen = BELEID_TYPE_MAPPING[beleidsType] || [beleidsType];
  
  for (const zoekterm of typeZoektermen) {
    queries.push(`${gemeenteNaam} ${zoekterm}`);
  }
  
  // Voeg originele naam toe
  if (beleidsNaam && !queries.some(q => q.includes(beleidsNaam))) {
    queries.push(`${gemeenteNaam} ${beleidsNaam}`);
  }
  
  return queries.slice(0, 3); // Max 3 queries
}

/**
 * Zoek beleid op internet (simulatie - in productie zou dit een echte search API gebruiken)
 */
export async function zoekBeleidOpInternet(
  gemeenteNaam: string,
  beleidsType: string,
  beleidsNaam: string
): Promise<GevondenBeleid[]> {
  const gevonden: GevondenBeleid[] = [];
  const queries = genereerZoekQueries(gemeenteNaam, beleidsType, beleidsNaam);
  
  // Genereer zoek-URLs voor de gebruiker
  for (const bron of ZOEK_BRONNEN) {
    for (const query of queries) {
      gevonden.push({
        titel: `Zoek: ${query}`,
        url: bron.urlTemplate(gemeenteNaam, query),
        bron: bron.naam,
        gemeente: gemeenteNaam,
        type: beleidsType,
        betrouwbaarheid: bron.naam === "Gemeente website" ? "hoog" : 
                         bron.naam === "Overheid.nl" ? "hoog" : "gemiddeld"
      });
    }
  }
  
  return gevonden;
}

/**
 * Maak een beleidsuggestie aan voor gebruikersbevestiging
 */
export async function maakBeleidSuggestie(
  gemeenteId: number,
  verwijzing: BeleidsverwijzingUitJurisprudentie,
  gevondenUrl?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(beleidSuggestie).values({
    gemeenteId,
    documentNaam: verwijzing.beleidsNaam,
    documentType: verwijzing.beleidsType,
    bronUrl: gevondenUrl || "https://placeholder.url",
    bronType: "google_search",
    status: "pending"
  });
  
  return result.insertId;
}

/**
 * Haal openstaande beleidsuggesties op voor een gemeente
 */
// Alias for router compatibility
export const getPendingSuggesties = getOpenBeleidSuggesties;

export async function getOpenBeleidSuggesties(
  gemeenteId: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select()
    .from(beleidSuggestie)
    .where(
      and(
        eq(beleidSuggestie.gemeenteId, gemeenteId),
        eq(beleidSuggestie.status, "pending")
      )
    )
    .orderBy(desc(beleidSuggestie.createdAt));
  
  return results;
}

/**
 * Verwerk gebruikersbevestiging van beleidsuggestie
 */
// Alias for router compatibility  
export const verwerkSuggestie = verwerkBeleidBevestiging;

export async function verwerkBeleidBevestiging(
  suggestieId: number,
  accepted: boolean,
  userId: string,
  documentUrl?: string,
  documentNaam?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  if (!accepted) {
    // Markeer als afgewezen
    await db.update(beleidSuggestie)
      .set({ 
        status: "afgewezen",
        bevestigdDoor: parseInt(userId) || null,
        bevestigdOp: new Date()
      })
      .where(eq(beleidSuggestie.id, suggestieId));
    return true;
  }
  
  // Haal suggestie op
  const [suggestie] = await db.select()
    .from(beleidSuggestie)
    .where(eq(beleidSuggestie.id, suggestieId))
    .limit(1);
  
  if (!suggestie) return false;
  
  // Voeg toe aan kennisbank
  await db.insert(kennisbankItems).values({
    scopeGemeenteId: suggestie.gemeenteId,
    naam: documentNaam || suggestie.documentNaam,
    itemType: "beleidsdocument",
    documentType: "nota",
    laag: "gemeentelijk",
    documentUrl: documentUrl || suggestie.bronUrl,
    samenvatting: suggestie.aiSamenvatting,
    status: "actief",
    bron: "import"
  });
  
  // Update suggestie status
  await db.update(beleidSuggestie)
    .set({ 
      status: "toegevoegd",
      bevestigdDoor: parseInt(userId) || null,
      bevestigdOp: new Date()
    })
    .where(eq(beleidSuggestie.id, suggestieId));
  
  return true;
}

/**
 * Hoofdfunctie: Analyseer jurisprudentie en zoek ontbrekend beleid
 */
export async function analyseerEnZoekOntbrekendBeleid(
  gemeenteId: number,
  gemeenteNaam: string,
  beleidsverwijzingen: BeleidsverwijzingUitJurisprudentie[]
): Promise<{
  gevondenInKennisbank: Array<{
    verwijzing: BeleidsverwijzingUitJurisprudentie;
    lokaalBeleid: any;
    vergelijking: string;
  }>;
  ontbrekendMetZoeklinks: Array<{
    verwijzing: BeleidsverwijzingUitJurisprudentie;
    zoekResultaten: GevondenBeleid[];
    suggestieId: number;
  }>;
}> {
  // Vergelijk met kennisbank
  const { gevonden, ontbrekend } = await vergelijkMetKennisbank(
    gemeenteId,
    beleidsverwijzingen
  );
  
  // Voor ontbrekend beleid: genereer zoeklinks en maak suggesties
  const ontbrekendMetZoeklinks: Array<{
    verwijzing: BeleidsverwijzingUitJurisprudentie;
    zoekResultaten: GevondenBeleid[];
    suggestieId: number;
  }> = [];
  
  for (const verwijzing of ontbrekend) {
    // Zoek op internet
    const zoekResultaten = await zoekBeleidOpInternet(
      gemeenteNaam,
      verwijzing.beleidsType,
      verwijzing.beleidsNaam
    );
    
    // Maak suggestie aan
    const suggestieId = await maakBeleidSuggestie(gemeenteId, verwijzing);
    
    ontbrekendMetZoeklinks.push({
      verwijzing,
      zoekResultaten,
      suggestieId
    });
  }
  
  return {
    gevondenInKennisbank: gevonden,
    ontbrekendMetZoeklinks
  };
}

/**
 * Genereer AI-samenvatting van gevonden beleidsdocument
 */
export async function genereerBeleidSamenvatting(
  documentTekst: string,
  beleidsType: string
): Promise<{ samenvatting: string; normen: string[] }> {
  try {
    const response = await invokeLLM({
      messages: [
        { 
          role: "system", 
          content: "Je bent een expert in gemeentelijk beleid. Analyseer het beleidsdocument en extraheer de belangrijkste normen en criteria die relevant zijn voor vergunningverlening." 
        },
        { 
          role: "user", 
          content: `Analyseer dit ${beleidsType} document en geef:
1. Een beknopte samenvatting (max 150 woorden)
2. De concrete normen/criteria die worden gehanteerd (als lijst)

Document:
${documentTekst.substring(0, 8000)}` 
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "beleid_analyse",
          strict: true,
          schema: {
            type: "object",
            properties: {
              samenvatting: { type: "string" },
              normen: { type: "array", items: { type: "string" } }
            },
            required: ["samenvatting", "normen"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string') {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error generating beleid summary:", error);
  }
  
  return { samenvatting: "", normen: [] };
}
