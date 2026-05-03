/**
 * Jurisprudentie Crawler Service
 * 
 * Haalt relevante omgevingsrecht jurisprudentie op van rechtspraak.nl Open Data API.
 * 
 * Features:
 * - Actualiteitsweging (recenter = relevanter)
 * - Omgevingswet-bewuste scoring (pre-2024 uitspraken afwaarderen indien achterhaald)
 * - Thema-classificatie voor gerichte zoekresultaten
 * - AI-samenvattingen voor snelle context
 * - Beleidsverwijzing extractie
 * - Slimme trigger detectie (alleen jurisprudentie ophalen wanneer meerwaarde)
 */

import { getDb } from "../db";
import { 
  jurisprudentie, 
  jurisprudentieThemas, 
  jurisprudentieCrawlerLog,
  jurisprudentieBeleidsverwijzing,
  jurisprudentieToetsingskaderLink
} from "../../drizzle/schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// Import OpenRechtspraak client
import { 
  zoekOmgevingsrechtUitspraken, 
  batchZoekUitspraken, 
  getUitspraakContent,
  type Uitspraak as OpenRechtspraakUitspraak 
} from './openRechtspraakClient';

// Omgevingsrecht-gerelateerde zoektermen
const OMGEVINGSRECHT_ZOEKTERMEN = [
  "omgevingsvergunning",
  "bestemmingsplan",
  "omgevingsplan",
  "bouwvergunning",
  "welstand",
  "monument",
  "natura 2000",
  "stikstof",
  "BOPA",
  "afwijking bestemmingsplan",
  "handhaving bouw",
  "planschade",
  "ladder duurzame verstedelijking"
];

// Thema detectie keywords
const THEMA_KEYWORDS: Record<string, string[]> = {
  omgevingsvergunning_bouwen: ["omgevingsvergunning", "bouwvergunning", "bouwen", "verbouwen", "aanbouw"],
  omgevingsvergunning_milieu: ["milieuvergunning", "milieu-activiteit", "emissie", "geur"],
  bestemmingsplan_wijziging: ["bestemmingsplanwijziging", "planwijziging", "herziening bestemmingsplan"],
  afwijking_bestemmingsplan: ["afwijking", "binnenplans", "buitenplans", "kruimelgeval"],
  bopa_procedure: ["bopa", "buitenplanse omgevingsplanactiviteit", "uitgebreide procedure"],
  welstandstoets: ["welstand", "welstandscommissie", "redelijke eisen van welstand", "beeldkwaliteit"],
  monumenten_erfgoed: ["monument", "rijksmonument", "gemeentelijk monument", "erfgoed", "cultuurhistorie"],
  natura2000_stikstof: ["natura 2000", "stikstof", "depositie", "passende beoordeling", "aerius"],
  geluidhinder: ["geluid", "geluidhinder", "geluidsbelasting", "geluidsnorm"],
  parkeren: ["parkeren", "parkeernorm", "parkeerdruk", "parkeerbeleid"],
  handhaving: ["handhaving", "last onder dwangsom", "bestuursdwang", "legalisatie"],
  planschade: ["planschade", "nadeelcompensatie", "schadevergoeding"],
  ladder_duurzame_verstedelijking: ["ladder", "duurzame verstedelijking", "behoefte", "bestaand stedelijk gebied"],
  kruimelgevallenregeling: ["kruimelgeval", "kruimelgevallenregeling", "bijlage II"],
  belangenafweging: ["belangenafweging", "belangen", "evenredigheid"],
  motiveringsgebrek: ["motivering", "motiveringsgebrek", "onvoldoende gemotiveerd"],
  zorgvuldigheid: ["zorgvuldigheid", "zorgvuldigheidsbeginsel", "onzorgvuldig"]
};

// Toetsingskader categorieën
const TOETSINGSKADER_KEYWORDS: Record<string, string[]> = {
  welstand: ["welstand", "welstandsnota", "beeldkwaliteitsplan", "redelijke eisen"],
  parkeren: ["parkeer", "parkeernorm", "parkeerbeleid", "CROW"],
  monumenten: ["monument", "erfgoed", "cultuurhistorie", "restauratie"],
  milieu: ["milieu", "emissie", "geur", "geluid", "bodem"],
  ruimtelijke_ordening: ["bestemmingsplan", "omgevingsplan", "ruimtelijke ordening"],
  bouwen: ["bouwbesluit", "constructie", "brandveiligheid", "toegankelijkheid"]
};

/**
 * SLIMME TRIGGER DETECTIE
 * Bepaalt of jurisprudentie meerwaarde biedt voor een specifieke analyse
 */
export interface AnalyseContext {
  activiteiten: string[];
  isBOPA: boolean;
  isMonument: boolean;
  heeftStikstof: boolean;
  heeftBelangenafweging: boolean;
  beleidOntbreekt: boolean;
  bezwaarWaarschijnlijk: boolean;
  vageNormen: string[];
}

export function bepaalJurisprudentieMeerwaarde(context: AnalyseContext): {
  heeftMeerwaarde: boolean;
  reden: string;
  relevanteThemas: string[];
} {
  const relevanteThemas: string[] = [];
  const redenen: string[] = [];
  
  // BOPA = altijd jurisprudentie relevant
  if (context.isBOPA) {
    relevanteThemas.push("bopa_procedure", "afwijking_bestemmingsplan", "belangenafweging");
    redenen.push("BOPA-procedure vereist zorgvuldige belangenafweging");
  }
  
  // Monument = jurisprudentie relevant
  if (context.isMonument) {
    relevanteThemas.push("monumenten_erfgoed");
    redenen.push("Monumentenstatus vereist specifieke toetsing");
  }
  
  // Stikstof = zeer dynamisch rechtsgebied
  if (context.heeftStikstof) {
    relevanteThemas.push("natura2000_stikstof");
    redenen.push("Stikstof/Natura2000 is zeer dynamisch rechtsgebied");
  }
  
  // Belangenafweging nodig
  if (context.heeftBelangenafweging) {
    relevanteThemas.push("belangenafweging");
    redenen.push("Belangenafweging vereist juridische onderbouwing");
  }
  
  // Beleid ontbreekt = jurisprudentie als vangnet
  if (context.beleidOntbreekt) {
    redenen.push("Ontbrekend beleid - jurisprudentie als vangnet");
  }
  
  // Bezwaar waarschijnlijk
  if (context.bezwaarWaarschijnlijk) {
    redenen.push("Bezwaar/beroep waarschijnlijk - juridische voorbereiding");
  }
  
  // Vage normen die moeten worden ingevuld
  if (context.vageNormen.length > 0) {
    redenen.push(`Vage normen moeten worden ingevuld: ${context.vageNormen.join(", ")}`);
  }
  
  // Activiteit-specifieke themas
  for (const activiteit of context.activiteiten) {
    const activiteitLower = activiteit.toLowerCase();
    if (activiteitLower.includes("parkeer")) relevanteThemas.push("parkeren");
    if (activiteitLower.includes("welstand")) relevanteThemas.push("welstandstoets");
    if (activiteitLower.includes("geluid")) relevanteThemas.push("geluidhinder");
    if (activiteitLower.includes("handhav")) relevanteThemas.push("handhaving");
  }
  
  const heeftMeerwaarde = redenen.length > 0 || relevanteThemas.length > 0;
  
  return {
    heeftMeerwaarde,
    reden: redenen.join("; ") || "Standaard aanvraag - geen jurisprudentie nodig",
    relevanteThemas: Array.from(new Set(relevanteThemas))
  };
}

/**
 * Bereken relevantie score op basis van actualiteit en Omgevingswet-relevantie
 */
function berekenRelevantieScore(
  datumUitspraak: Date | null,
  inhoud: string,
  instantie: string
): { score: number; isOmgevingswetRelevant: boolean; notitie: string } {
  let score = 50;
  let isOmgevingswetRelevant = true;
  let notitie = "";
  
  const nu = new Date();
  const omgevingswetDatum = new Date("2024-01-01");
  
  if (datumUitspraak) {
    const jarenOud = (nu.getTime() - datumUitspraak.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    // Actualiteit bonus/malus
    if (jarenOud < 1) {
      score += 30;
    } else if (jarenOud < 2) {
      score += 15;
    } else if (jarenOud < 5) {
      score -= 10;
    } else {
      score -= 25;
    }
    
    // Omgevingswet check (pre-2024)
    if (datumUitspraak < omgevingswetDatum) {
      const achterhaaldeTermen = [
        "kruimelgevallenregeling",
        "artikel 2.12 wabo",
        "artikel 4 bijlage ii bor",
        "wro",
        "wabo"
      ];
      
      const inhoudLower = inhoud.toLowerCase();
      const bevatAchterhaald = achterhaaldeTermen.some(term => inhoudLower.includes(term));
      
      if (bevatAchterhaald) {
        score -= 30;
        isOmgevingswetRelevant = false;
        notitie = "Deze uitspraak dateert van vóór de Omgevingswet (1-1-2024) en verwijst naar wetgeving die mogelijk is vervallen of gewijzigd.";
      } else {
        score -= 15;
        notitie = "Deze uitspraak dateert van vóór de Omgevingswet. De algemene juridische principes zijn waarschijnlijk nog relevant.";
      }
    }
  }
  
  // Instantie bonus
  if (instantie.toLowerCase().includes("raad van state") || instantie.includes("RVS")) {
    score += 20;
  } else if (instantie.toLowerCase().includes("rechtbank")) {
    score += 5;
  }
  
  return { 
    score: Math.max(0, Math.min(100, score)), 
    isOmgevingswetRelevant, 
    notitie 
  };
}

/**
 * Detecteer thema's in de uitspraaktekst
 */
function detecteerThemas(inhoud: string): { thema: string; relevantie: number }[] {
  const inhoudLower = inhoud.toLowerCase();
  const gevondenThemas: { thema: string; relevantie: number }[] = [];
  
  for (const [thema, keywords] of Object.entries(THEMA_KEYWORDS)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (inhoudLower.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    
    if (matchCount > 0) {
      const relevantie = Math.min(100, 30 + (matchCount * 20));
      gevondenThemas.push({ thema, relevantie });
    }
  }
  
  return gevondenThemas.sort((a, b) => b.relevantie - a.relevantie);
}

/**
 * Wrapper functie voor OpenRechtspraak client
 * Converteert OpenRechtspraak uitspraken naar het interne formaat
 */
async function fetchUitspraken(
  zoekterm: string,
  maxResults: number = 50,
  datumVanaf?: Date
): Promise<any[]> {
  console.log(`[JurisprudentieCrawler] Fetching via OpenRechtspraak: ${zoekterm}`);
  
  const uitspraken = await zoekOmgevingsrechtUitspraken(zoekterm, {
    datumVanaf,
    max: maxResults
  });
  
  // Convert to internal format
  return uitspraken.map(u => ({
    ecli: u.ecli,
    id: u.ecli,
    titel: u.titel,
    inhoudsindicatie: u.samenvatting,
    datum: u.datumUitspraak?.toISOString(),
    instantie: u.instantie,
    url: u.url
  }));
}

/**
 * Haal volledige uitspraak content op via OpenRechtspraak client
 */
async function fetchUitspraakContent(ecli: string): Promise<string | null> {
  return getUitspraakContent(ecli);
}

/**
 * Genereer AI-samenvatting van uitspraak met beleidsverwijzing extractie
 */
async function genereerAISamenvatting(
  titel: string,
  inhoudsindicatie: string,
  volledigeTekst: string
): Promise<{ 
  samenvatting: string; 
  toetsingscriteria: string; 
  beleidsverwijzingen: Array<{
    naam: string;
    type: string;
    gemeente?: string;
    normen?: string;
    citaat?: string;
  }>;
}> {
  try {
    const prompt = `Analyseer de volgende juridische uitspraak en geef:

1. Een beknopte samenvatting (max 200 woorden) gericht op de relevantie voor omgevingsvergunningen
2. De concrete toetsingscriteria die de rechter hanteert (als bullet points)
3. ALLE beleidsverwijzingen met details:
   - Naam van het beleidsdocument
   - Type (parkeerbeleid, welstandsnota, horecabeleid, woonbeleid, detailhandelsbeleid, milieubeleid, overig)
   - Gemeente waar het beleid van is (indien genoemd)
   - Specifieke normen die worden genoemd (bijv. "1,8 parkeerplaats per woning")
   - Relevant citaat uit de uitspraak

TITEL: ${titel}

INHOUDSINDICATIE: ${inhoudsindicatie}

RELEVANTE TEKST: ${volledigeTekst.substring(0, 10000)}

Geef je antwoord in JSON formaat.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Je bent een juridisch expert gespecialiseerd in omgevingsrecht. Analyseer uitspraken en extraheer relevante informatie voor vergunningverleners. Let vooral op verwijzingen naar beleidsdocumenten en de normen die daarin worden genoemd." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "jurisprudentie_analyse",
          strict: true,
          schema: {
            type: "object",
            properties: {
              samenvatting: { type: "string" },
              toetsingscriteria: { type: "string" },
              beleidsverwijzingen: { 
                type: "array", 
                items: { 
                  type: "object",
                  properties: {
                    naam: { type: "string" },
                    type: { type: "string" },
                    gemeente: { type: "string" },
                    normen: { type: "string" },
                    citaat: { type: "string" }
                  },
                  required: ["naam", "type"],
                  additionalProperties: false
                } 
              }
            },
            required: ["samenvatting", "toetsingscriteria", "beleidsverwijzingen"],
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
    console.error("Error generating AI summary:", error);
  }
  
  return {
    samenvatting: inhoudsindicatie || "",
    toetsingscriteria: "",
    beleidsverwijzingen: []
  };
}

/**
 * Verwerk en sla een uitspraak op
 */
async function verwerkUitspraak(uitspraakData: any): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const ecli = uitspraakData.ecli || uitspraakData.id;
    if (!ecli) return false;
    
    // Check of uitspraak al bestaat
    const bestaande = await db.select()
      .from(jurisprudentie)
      .where(eq(jurisprudentie.ecli, ecli))
      .limit(1);
    
    if (bestaande.length > 0) {
      return false;
    }
    
    const volledigeTekst = await fetchUitspraakContent(ecli);
    
    let datumUitspraak: Date | null = null;
    if (uitspraakData.datum) {
      datumUitspraak = new Date(uitspraakData.datum);
    }
    
    const analyseText = [
      uitspraakData.titel || "",
      uitspraakData.inhoudsindicatie || "",
      volledigeTekst || ""
    ].join(" ");
    
    const { score, isOmgevingswetRelevant, notitie } = berekenRelevantieScore(
      datumUitspraak,
      analyseText,
      uitspraakData.instantie || ""
    );
    
    // Genereer AI-samenvatting (alleen voor relevante uitspraken)
    let aiData = { 
      samenvatting: "", 
      toetsingscriteria: "", 
      beleidsverwijzingen: [] as Array<{ naam: string; type: string; gemeente?: string; normen?: string; citaat?: string }> 
    };
    if (score >= 40) {
      aiData = await genereerAISamenvatting(
        uitspraakData.titel || "",
        uitspraakData.inhoudsindicatie || "",
        volledigeTekst || ""
      );
    }
    
    // Sla uitspraak op
    const [inserted] = await db.insert(jurisprudentie).values({
      ecli,
      instantie: uitspraakData.instantie || "Onbekend",
      instantieCode: uitspraakData.instantieCode,
      datumUitspraak,
      datumPublicatie: uitspraakData.datumPublicatie ? new Date(uitspraakData.datumPublicatie) : null,
      zaaknummer: uitspraakData.zaaknummer,
      rechtsgebied: "bestuursrecht_omgevingsrecht",
      titel: uitspraakData.titel,
      inhoudsindicatie: uitspraakData.inhoudsindicatie,
      volledigeTekst,
      aiSamenvatting: aiData.samenvatting,
      aiToetsingscriteria: aiData.toetsingscriteria,
      aiBeleidsverwijzingen: JSON.stringify(aiData.beleidsverwijzingen),
      relevantieScore: score,
      isOmgevingswetRelevant,
      omgevingswetNotitie: notitie,
      bronUrl: `https://uitspraken.rechtspraak.nl/details?id=${ecli}`,
      status: "nieuw"
    });
    const jurisprudentieId = inserted.insertId;
    
    // Detecteer en sla thema's op
    const themas = detecteerThemas(analyseText);
    for (const { thema, relevantie } of themas.slice(0, 5)) {
      await db.insert(jurisprudentieThemas).values({
        jurisprudentieId,
        thema: thema as any,
        themaRelevantie: relevantie
      });
    }
    
    // Sla beleidsverwijzingen op met uitgebreide info
    for (const beleid of aiData.beleidsverwijzingen) {
      await db.insert(jurisprudentieBeleidsverwijzing).values({
        jurisprudentieId,
        beleidsNaam: beleid.naam,
        beleidsType: beleid.type,
        gemeenteInJurisprudentie: beleid.gemeente,
        genoemdeNormen: beleid.normen,
        citaat: beleid.citaat
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error processing uitspraak:", error);
    return false;
  }
}

/**
 * Hoofdfunctie: Crawl rechtspraak.nl voor omgevingsrecht jurisprudentie
 */
export async function crawlJurisprudentie(
  options: {
    maxPerZoekterm?: number;
    datumVanaf?: Date;
    alleenNieuwe?: boolean;
  } = {}
): Promise<{
  aantalGevonden: number;
  aantalNieuw: number;
  aantalFouten: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const startTime = Date.now();
  
  const { 
    maxPerZoekterm = 20, 
    datumVanaf,
    alleenNieuwe = true 
  } = options;
  
  const [logEntry] = await db.insert(jurisprudentieCrawlerLog).values({
    rechtsgebied: "bestuursrecht_omgevingsrecht",
    status: "running"
  });
  const logId = logEntry.insertId;
  
  let aantalGevonden = 0;
  let aantalNieuw = 0;
  let aantalFouten = 0;
  
  try {
    let filterDatum = datumVanaf;
    if (alleenNieuwe && !filterDatum) {
      filterDatum = new Date();
      filterDatum.setDate(filterDatum.getDate() - 30);
    }
    
    for (const zoekterm of OMGEVINGSRECHT_ZOEKTERMEN) {
      console.log(`Crawling jurisprudentie voor: ${zoekterm}`);
      
      const uitspraken = await fetchUitspraken(zoekterm, maxPerZoekterm, filterDatum);
      aantalGevonden += uitspraken.length;
      
      for (const uitspraak of uitspraken) {
        try {
          const isNieuw = await verwerkUitspraak(uitspraak);
          if (isNieuw) {
            aantalNieuw++;
          }
        } catch (error) {
          console.error(`Error processing uitspraak:`, error);
          aantalFouten++;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await db.update(jurisprudentieCrawlerLog)
      .set({
        aantalGevonden,
        aantalNieuw,
        aantalFouten,
        status: "completed",
        duurMs: Date.now() - startTime
      })
      .where(eq(jurisprudentieCrawlerLog.id, logId));
    
  } catch (error) {
    await db.update(jurisprudentieCrawlerLog)
      .set({
        aantalGevonden,
        aantalNieuw,
        aantalFouten,
        status: "failed",
        foutmelding: error instanceof Error ? error.message : "Unknown error",
        duurMs: Date.now() - startTime
      })
      .where(eq(jurisprudentieCrawlerLog.id, logId));
    
    throw error;
  }
  
  return { aantalGevonden, aantalNieuw, aantalFouten };
}

/**
 * Haal relevante jurisprudentie op voor een specifieke analyse
 */
export async function getRelevantJurisprudentie(
  themas: string[],
  maxResults: number = 5
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (themas.length === 0) return [];
  
  const results = await db.select({
    id: jurisprudentie.id,
    ecli: jurisprudentie.ecli,
    instantie: jurisprudentie.instantie,
    datumUitspraak: jurisprudentie.datumUitspraak,
    titel: jurisprudentie.titel,
    aiSamenvatting: jurisprudentie.aiSamenvatting,
    aiToetsingscriteria: jurisprudentie.aiToetsingscriteria,
    relevantieScore: jurisprudentie.relevantieScore,
    isOmgevingswetRelevant: jurisprudentie.isOmgevingswetRelevant,
    omgevingswetNotitie: jurisprudentie.omgevingswetNotitie,
    bronUrl: jurisprudentie.bronUrl
  })
  .from(jurisprudentie)
  .innerJoin(jurisprudentieThemas, eq(jurisprudentie.id, jurisprudentieThemas.jurisprudentieId))
  .where(
    and(
      inArray(jurisprudentieThemas.thema, themas as any[]),
      gte(jurisprudentie.relevantieScore, 40)
    )
  )
  .orderBy(desc(jurisprudentie.relevantieScore), desc(jurisprudentie.datumUitspraak))
  .limit(maxResults);
  
  return results;
}

/**
 * Haal beleidsverwijzingen op uit jurisprudentie voor een specifiek thema
 */
export async function getBeleidsverwijzingenVoorThema(
  thema: string
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({
    beleidsNaam: jurisprudentieBeleidsverwijzing.beleidsNaam,
    beleidsType: jurisprudentieBeleidsverwijzing.beleidsType,
    gemeenteInJurisprudentie: jurisprudentieBeleidsverwijzing.gemeenteInJurisprudentie,
    genoemdeNormen: jurisprudentieBeleidsverwijzing.genoemdeNormen,
    citaat: jurisprudentieBeleidsverwijzing.citaat,
    ecli: jurisprudentie.ecli,
    instantie: jurisprudentie.instantie,
    datumUitspraak: jurisprudentie.datumUitspraak
  })
  .from(jurisprudentieBeleidsverwijzing)
  .innerJoin(jurisprudentie, eq(jurisprudentieBeleidsverwijzing.jurisprudentieId, jurisprudentie.id))
  .innerJoin(jurisprudentieThemas, eq(jurisprudentie.id, jurisprudentieThemas.jurisprudentieId))
  .where(eq(jurisprudentieThemas.thema, thema as any))
  .orderBy(desc(jurisprudentie.datumUitspraak))
  .limit(20);
  
  return results;
}

/**
 * Haal alle beleidsverwijzingen op voor vergelijking met lokale kennisbank
 */
export async function getAlleBeleidsverwijzingen(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({
    id: jurisprudentieBeleidsverwijzing.id,
    jurisprudentieId: jurisprudentieBeleidsverwijzing.jurisprudentieId,
    beleidsNaam: jurisprudentieBeleidsverwijzing.beleidsNaam,
    beleidsType: jurisprudentieBeleidsverwijzing.beleidsType,
    gemeenteInJurisprudentie: jurisprudentieBeleidsverwijzing.gemeenteInJurisprudentie,
    genoemdeNormen: jurisprudentieBeleidsverwijzing.genoemdeNormen,
    ecli: jurisprudentie.ecli,
    datumUitspraak: jurisprudentie.datumUitspraak,
    relevantieScore: jurisprudentie.relevantieScore
  })
  .from(jurisprudentieBeleidsverwijzing)
  .innerJoin(jurisprudentie, eq(jurisprudentieBeleidsverwijzing.jurisprudentieId, jurisprudentie.id))
  .orderBy(desc(jurisprudentie.relevantieScore))
  .limit(100);
  
  return results;
}
