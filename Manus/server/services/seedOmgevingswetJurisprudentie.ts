/**
 * Seed Script: Gecureerde Omgevingswet Jurisprudentie
 * 
 * Dit script laadt handmatig gecureerde belangrijke Omgevingswet-uitspraken
 * in de database met hoge relevantie-scores en toetsingskader koppelingen.
 * 
 * Bron: Research_BelangrijksteUitsprakenOmgevingswet.md
 */

import { getDb } from "../db";
import { 
  jurisprudentie, 
  jurisprudentieThemas, 
  jurisprudentieToetsingskaderLink 
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Thema mapping naar database enum
type ThemaEnum = 
  | "omgevingsvergunning_bouwen"
  | "omgevingsvergunning_milieu"
  | "bestemmingsplan_wijziging"
  | "afwijking_bestemmingsplan"
  | "bopa_procedure"
  | "welstandstoets"
  | "monumenten_erfgoed"
  | "natura2000_stikstof"
  | "geluidhinder"
  | "parkeren"
  | "handhaving"
  | "planschade"
  | "ladder_duurzame_verstedelijking"
  | "kruimelgevallenregeling"
  | "belangenafweging"
  | "motiveringsgebrek"
  | "zorgvuldigheid"
  | "overig";

// Categorie naar thema mapping
const CATEGORIE_THEMA_MAP: Record<string, ThemaEnum[]> = {
  "overgangsrecht": ["overig"],
  "omgevingsplan": ["bestemmingsplan_wijziging", "afwijking_bestemmingsplan"],
  "bopa": ["bopa_procedure", "afwijking_bestemmingsplan"],
  "etfal": ["belangenafweging", "motiveringsgebrek"],
  "participatie": ["zorgvuldigheid", "overig"],
  "zorgplichten": ["zorgvuldigheid", "omgevingsvergunning_milieu"],
  "technische_bouwactiviteit": ["omgevingsvergunning_bouwen"],
  "handhaving": ["handhaving"],
  "bruidsschat": ["overig", "omgevingsvergunning_bouwen"],
  "overig": ["overig"]
};

// Toetsingskader mapping per categorie
const CATEGORIE_TOETSINGSKADER_MAP: Record<string, string[]> = {
  "overgangsrecht": ["Overgangsrecht Omgevingswet"],
  "omgevingsplan": ["Omgevingsplan", "Ruimtelijke ordening"],
  "bopa": ["BOPA procedure", "Afwijking omgevingsplan", "Participatie"],
  "etfal": ["ETFAL", "Evenwichtige toedeling functies", "Belangenafweging"],
  "participatie": ["Participatie", "Zorgvuldigheid"],
  "zorgplichten": ["Zorgplichten", "Milieubelastende activiteiten"],
  "technische_bouwactiviteit": ["Technische bouwactiviteit", "Kwaliteitsborging", "Bbl"],
  "handhaving": ["Handhaving", "Bouwstop"],
  "bruidsschat": ["Bruidsschat", "Vergunningvrij bouwen"],
  "overig": ["Omgevingswet algemeen"]
};

// Gecureerde uitspraken uit het research bestand
interface GecureerdeUitspraak {
  ecli: string;
  datum: string;
  onderwerp: string;
  categorie: string;
  instantie: string;
}

const GECUREERDE_UITSPRAKEN: GecureerdeUitspraak[] = [
  // 1. Overzichtsuitspraken (Overgangsrecht)
  { ecli: "ECLI:NL:RVS:2024:1174", datum: "2024-03-27", onderwerp: "Overgangsrecht na vernietiging bestemmingsplan", categorie: "overgangsrecht", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2024:1529", datum: "2024-04-17", onderwerp: "Overgangsrecht bij ruimtelijke plannen op aanvraag", categorie: "overgangsrecht", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2024:2645", datum: "2024-07-03", onderwerp: "Overgangsrecht bij handhavingsbesluiten", categorie: "overgangsrecht", instantie: "Raad van State" },
  
  // 2. Omgevingsplan
  { ecli: "ECLI:NL:RVS:2024:5100", datum: "2024-12-18", onderwerp: "Eerste uitspraak wijziging omgevingsplan, toetsingskader ETFAL", categorie: "omgevingsplan", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2025:1928", datum: "2025-04-30", onderwerp: "Wijzigingssystematiek omgevingsplan Amsterdam met voorrangsregels", categorie: "omgevingsplan", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2025:4476", datum: "2025-09-22", onderwerp: "Vierde uitspraak over wijziging omgevingsplan", categorie: "omgevingsplan", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2025:5339", datum: "2025-11-05", onderwerp: "Uitspraak wijziging omgevingsplan", categorie: "omgevingsplan", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2025:6122", datum: "2025-12-17", onderwerp: "Aanpassen bruidsschat kan alleen met omgevingsplanwijziging", categorie: "omgevingsplan", instantie: "Raad van State" },
  
  // 3. BOPA (Buitenplanse Omgevingsplanactiviteit)
  { ecli: "ECLI:NL:RBDHA:2025:6664", datum: "2025-04-29", onderwerp: "Bij verplichte participatie moet het gaan om een BOPA", categorie: "bopa", instantie: "Rechtbank Den Haag" },
  { ecli: "ECLI:NL:RBDHA:2025:3705", datum: "2025-03-25", onderwerp: "Lijst advies raad niet bruikbaar voor verplichte participatie BOPA", categorie: "bopa", instantie: "Rechtbank Den Haag" },
  { ecli: "ECLI:NL:RBOVE:2025:7373", datum: "2025-12-22", onderwerp: "Wanneer BOPA vs omgevingsplanwijziging?", categorie: "bopa", instantie: "Rechtbank Overijssel" },
  { ecli: "ECLI:NL:RBGEL:2025:6233", datum: "2025-12-22", onderwerp: "Verhouding BOPA tot onderliggende bestemming", categorie: "bopa", instantie: "Rechtbank Gelderland" },
  { ecli: "ECLI:NL:RBZWB:2025:6534", datum: "2025-10-15", onderwerp: "Bij BOPA actievere houding verwacht van bevoegd gezag", categorie: "bopa", instantie: "Rechtbank Zeeland-West-Brabant" },
  { ecli: "ECLI:NL:RBAMS:2025:7372", datum: "2025-11-05", onderwerp: "Weigeren BOPA ondanks gelijkheidsbeginsel", categorie: "bopa", instantie: "Rechtbank Amsterdam" },
  
  // 4. ETFAL (Evenwichtige Toedeling van Functies aan Locaties)
  { ecli: "ECLI:NL:RBGEL:2025:7749", datum: "2025-09-24", onderwerp: "BOPA en ETFAL, motiveringsplicht en zorgvuldigheidsbeginsel", categorie: "etfal", instantie: "Rechtbank Gelderland" },
  { ecli: "ECLI:NL:RBLIM:2025:11638", datum: "2025-11-28", onderwerp: "ETFAL in orde bij bouw 11 woningen", categorie: "etfal", instantie: "Rechtbank Limburg" },
  { ecli: "ECLI:NL:RBDHA:2025:21067", datum: "2025-11-13", onderwerp: "Trillingsschade meegewogen binnen ETFAL", categorie: "etfal", instantie: "Rechtbank Den Haag" },
  { ecli: "ECLI:NL:RBNHO:2025:12950", datum: "2025-11-13", onderwerp: "Bij ETFAL-toetsing oude jurisprudentielijn parkeren voortgezet", categorie: "etfal", instantie: "Rechtbank Noord-Holland" },
  { ecli: "ECLI:NL:RBOBR:2025:6283", datum: "2025-10-10", onderwerp: "ETFAL ziet niet op integratie groepen mensen", categorie: "etfal", instantie: "Rechtbank Oost-Brabant" },
  { ecli: "ECLI:NL:RBGEL:2025:7174", datum: "2025-08-28", onderwerp: "Wat van appellant wordt verwacht om ETFAL-motivering aan te vechten", categorie: "etfal", instantie: "Rechtbank Gelderland" },
  
  // 5. Participatie
  { ecli: "ECLI:NL:RBDHA:2025:5355", datum: "2025-03-31", onderwerp: "Geen resultaatsverplichting participatie", categorie: "participatie", instantie: "Rechtbank Den Haag" },
  { ecli: "ECLI:NL:RBDHA:2025:1300", datum: "2025-01-30", onderwerp: "Geen lijst verplichte gevallen, weinig eisen aan participatie", categorie: "participatie", instantie: "Rechtbank Den Haag" },
  { ecli: "ECLI:NL:RBAMS:2024:7981", datum: "2024-12-17", onderwerp: "Participatie inspanningsverplichting, geen resultaatsverplichting", categorie: "participatie", instantie: "Rechtbank Amsterdam" },
  { ecli: "ECLI:NL:RBGEL:2024:5928", datum: "2024-08-29", onderwerp: "Relevant is dát participatie heeft plaatsgevonden", categorie: "participatie", instantie: "Rechtbank Gelderland" },
  { ecli: "ECLI:NL:RBAMS:2025:9275", datum: "2025-12-01", onderwerp: "Verplichte participatie onvoldoende uitgevoerd", categorie: "participatie", instantie: "Rechtbank Amsterdam" },
  { ecli: "ECLI:NL:RBOBR:2025:5437", datum: "2025-08-29", onderwerp: "Participeren is meer dan enkel informeren", categorie: "participatie", instantie: "Rechtbank Oost-Brabant" },
  
  // 6. Zorgplichten
  { ecli: "ECLI:NL:RBROT:2025:1816", datum: "2025-02-14", onderwerp: "Handhaafbaarheid specifieke zorgplicht milieubelastende activiteiten", categorie: "zorgplichten", instantie: "Rechtbank Rotterdam" },
  { ecli: "ECLI:NL:RBGEL:2025:1311", datum: "2025-02-18", onderwerp: "Specifieke zorgplicht flora- en fauna-activiteiten", categorie: "zorgplichten", instantie: "Rechtbank Gelderland" },
  { ecli: "ECLI:NL:RBGEL:2025:7400", datum: "2025-09-02", onderwerp: "Algemene zorgplicht: handhaving alleen bij ernstige nadelige gevolgen", categorie: "zorgplichten", instantie: "Rechtbank Gelderland" },
  { ecli: "ECLI:NL:RBNNE:2025:5538", datum: "2025-12-23", onderwerp: "Overgangsrecht: algemene zorgplicht nog niet van toepassing", categorie: "zorgplichten", instantie: "Rechtbank Noord-Nederland" },
  { ecli: "ECLI:NL:RBGEL:2025:2775", datum: "2025-04-11", onderwerp: "Broedseizoen en algemene zorgplicht 11.17 Bal", categorie: "zorgplichten", instantie: "Rechtbank Gelderland" },
  
  // 7. Technische Bouwactiviteit / Kwaliteitsborging
  { ecli: "ECLI:NL:RBROT:2025:11621", datum: "2025-09-17", onderwerp: "Uitspraak technische bouwactiviteit Bbl", categorie: "technische_bouwactiviteit", instantie: "Rechtbank Rotterdam" },
  { ecli: "ECLI:NL:RBLIM:2025:10464", datum: "2025-10-28", onderwerp: "Stelsel kwaliteitsborging bouwen", categorie: "technische_bouwactiviteit", instantie: "Rechtbank Limburg" },
  { ecli: "ECLI:NL:RBNHO:2025:8844", datum: "2025-08-07", onderwerp: "Bouwtechnische vergunning en toetsing aan omgevingsplan", categorie: "technische_bouwactiviteit", instantie: "Rechtbank Noord-Holland" },
  { ecli: "ECLI:NL:RBMNE:2025:5845", datum: "2025-11-20", onderwerp: "OPA bouw gebonden bevoegdheid", categorie: "technische_bouwactiviteit", instantie: "Rechtbank Midden-Nederland" },
  
  // 8. Handhaving onder Omgevingswet
  { ecli: "ECLI:NL:RBZWB:2025:8834", datum: "2025-12-19", onderwerp: "Onder oud recht overtreding, onder Omgevingswet/Bkl niet meer", categorie: "handhaving", instantie: "Rechtbank Zeeland-West-Brabant" },
  { ecli: "ECLI:NL:RBGEL:2025:8094", datum: "2025-10-03", onderwerp: "Bouwstop onder de Omgevingswet", categorie: "handhaving", instantie: "Rechtbank Gelderland" },
  { ecli: "ECLI:NL:RBGEL:2025:6555", datum: "2025-08-26", onderwerp: "Art. 5.5 lid 1 Ow onjuiste grondslag voor bouwstop", categorie: "handhaving", instantie: "Rechtbank Gelderland" },
  
  // 9. Bruidsschat
  { ecli: "ECLI:NL:RVS:2025:4539", datum: "2025-09-24", onderwerp: "Vergunningsvrije mogelijkheden Bruidsschat (art. 22.27 en 22.36)", categorie: "bruidsschat", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RBDHA:2025:19651", datum: "2025-10-30", onderwerp: "Vergunningplicht OPA bouwen op grond van art. 22.26 bruidsschat", categorie: "bruidsschat", instantie: "Rechtbank Den Haag" },
  
  // 10. Overige Belangrijke Uitspraken
  { ecli: "ECLI:NL:RVS:2025:538", datum: "2025-02-12", onderwerp: "Reparatiebesluitvorming aan de hand van nieuwe ruimtelijke toets", categorie: "overig", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2025:2527", datum: "2025-06-04", onderwerp: "Ambtshalve voorziening kostenverhaal, ontoereikend overgangsrecht", categorie: "overig", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RVS:2025:2281", datum: "2025-05-21", onderwerp: "Nieuw begrip gebouwerf in relatie tot erf uit Bor", categorie: "overig", instantie: "Raad van State" },
  { ecli: "ECLI:NL:RBROT:2025:13854", datum: "2025-11-28", onderwerp: "Onlosmakelijke samenhang verdwenen", categorie: "overig", instantie: "Rechtbank Rotterdam" },
  { ecli: "ECLI:NL:RBZWB:2025:8697", datum: "2025-12-17", onderwerp: "Rechter mag overgangsrecht niet toetsen aan evenredigheidsbeginsel", categorie: "overig", instantie: "Rechtbank Zeeland-West-Brabant" },
];

/**
 * Extract instantie code from ECLI
 */
function extractInstantieCode(ecli: string): string {
  const parts = ecli.split(':');
  if (parts.length >= 3) {
    return parts[2]; // e.g., "RVS", "RBAMS", "RBDHA"
  }
  return '';
}

/**
 * Seed een enkele uitspraak in de database
 */
async function seedUitspraak(
  db: any,
  uitspraak: GecureerdeUitspraak
): Promise<number | null> {
  try {
    // Check of uitspraak al bestaat
    const existing = await db.select()
      .from(jurisprudentie)
      .where(eq(jurisprudentie.ecli, uitspraak.ecli))
      .limit(1);
    
    if (existing.length > 0) {
      console.log(`[Seed] Uitspraak ${uitspraak.ecli} bestaat al, updating...`);
      
      // Update met hogere relevantie score (gecureerd = belangrijk)
      await db.update(jurisprudentie)
        .set({
          relevantieScore: 95, // Hoge score voor gecureerde uitspraken
          isOmgevingswetRelevant: true,
          omgevingswetNotitie: `Gecureerde uitspraak: ${uitspraak.onderwerp}`,
          status: "verwerkt"
        })
        .where(eq(jurisprudentie.ecli, uitspraak.ecli));
      
      return existing[0].id;
    }
    
    // Insert nieuwe uitspraak
    const [result] = await db.insert(jurisprudentie).values({
      ecli: uitspraak.ecli,
      instantie: uitspraak.instantie,
      instantieCode: extractInstantieCode(uitspraak.ecli),
      datumUitspraak: new Date(uitspraak.datum),
      datumPublicatie: new Date(uitspraak.datum),
      rechtsgebied: "bestuursrecht_omgevingsrecht",
      titel: `${uitspraak.ecli} - ${uitspraak.onderwerp}`,
      inhoudsindicatie: uitspraak.onderwerp,
      aiSamenvatting: `Belangrijke Omgevingswet-uitspraak over ${uitspraak.onderwerp}. Categorie: ${uitspraak.categorie}.`,
      relevantieScore: 95, // Hoge score voor gecureerde uitspraken
      isOmgevingswetRelevant: true,
      omgevingswetNotitie: `Gecureerde uitspraak uit research: ${uitspraak.categorie}`,
      bronUrl: `https://uitspraken.rechtspraak.nl/details?id=${uitspraak.ecli}`,
      status: "verwerkt"
    });
    
    console.log(`[Seed] Uitspraak ${uitspraak.ecli} toegevoegd met ID ${result.insertId}`);
    return result.insertId;
    
  } catch (error) {
    console.error(`[Seed] Fout bij seeden ${uitspraak.ecli}:`, error);
    return null;
  }
}

/**
 * Voeg thema's toe aan een uitspraak
 */
async function addThemas(
  db: any,
  jurisprudentieId: number,
  categorie: string
): Promise<void> {
  const themas = CATEGORIE_THEMA_MAP[categorie] || ["overig"];
  
  for (const thema of themas) {
    try {
      await db.insert(jurisprudentieThemas).values({
        jurisprudentieId,
        thema,
        themaRelevantie: 90 // Hoge relevantie voor gecureerde uitspraken
      });
    } catch (error) {
      // Ignore duplicate key errors
      if (!(error instanceof Error && error.message.includes('Duplicate'))) {
        console.error(`[Seed] Fout bij toevoegen thema ${thema}:`, error);
      }
    }
  }
}

/**
 * Voeg toetsingskader koppelingen toe aan een uitspraak
 */
async function addToetsingskaderLinks(
  db: any,
  jurisprudentieId: number,
  categorie: string,
  onderwerp: string
): Promise<void> {
  const toetsingskaders = CATEGORIE_TOETSINGSKADER_MAP[categorie] || ["Omgevingswet algemeen"];
  
  for (const kader of toetsingskaders) {
    try {
      await db.insert(jurisprudentieToetsingskaderLink).values({
        jurisprudentieId,
        toetsingskaderNaam: kader,
        toetsingskaderCategorie: categorie,
        leerpunt: onderwerp
      });
    } catch (error) {
      // Ignore duplicate key errors
      if (!(error instanceof Error && error.message.includes('Duplicate'))) {
        console.error(`[Seed] Fout bij toevoegen toetsingskader ${kader}:`, error);
      }
    }
  }
}

/**
 * Hoofdfunctie: Seed alle gecureerde uitspraken
 */
export async function seedOmgevingswetJurisprudentie(): Promise<{
  totaal: number;
  toegevoegd: number;
  bijgewerkt: number;
  fouten: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let toegevoegd = 0;
  let bijgewerkt = 0;
  let fouten = 0;
  
  console.log(`[Seed] Start seeden van ${GECUREERDE_UITSPRAKEN.length} gecureerde uitspraken...`);
  
  for (const uitspraak of GECUREERDE_UITSPRAKEN) {
    // Check of al bestaat
    const existing = await db.select()
      .from(jurisprudentie)
      .where(eq(jurisprudentie.ecli, uitspraak.ecli))
      .limit(1);
    
    const jurisprudentieId = await seedUitspraak(db, uitspraak);
    
    if (jurisprudentieId) {
      if (existing.length > 0) {
        bijgewerkt++;
      } else {
        toegevoegd++;
      }
      
      // Voeg thema's toe
      await addThemas(db, jurisprudentieId, uitspraak.categorie);
      
      // Voeg toetsingskader koppelingen toe
      await addToetsingskaderLinks(db, jurisprudentieId, uitspraak.categorie, uitspraak.onderwerp);
    } else {
      fouten++;
    }
  }
  
  console.log(`[Seed] Klaar! Toegevoegd: ${toegevoegd}, Bijgewerkt: ${bijgewerkt}, Fouten: ${fouten}`);
  
  return {
    totaal: GECUREERDE_UITSPRAKEN.length,
    toegevoegd,
    bijgewerkt,
    fouten
  };
}

/**
 * Haal statistieken op over gecureerde jurisprudentie
 */
export async function getGecureerdeJurisprudentieStats(): Promise<{
  totaalGecureerd: number;
  perCategorie: Record<string, number>;
  perInstantie: Record<string, number>;
}> {
  const perCategorie: Record<string, number> = {};
  const perInstantie: Record<string, number> = {};
  
  for (const uitspraak of GECUREERDE_UITSPRAKEN) {
    perCategorie[uitspraak.categorie] = (perCategorie[uitspraak.categorie] || 0) + 1;
    perInstantie[uitspraak.instantie] = (perInstantie[uitspraak.instantie] || 0) + 1;
  }
  
  return {
    totaalGecureerd: GECUREERDE_UITSPRAKEN.length,
    perCategorie,
    perInstantie
  };
}

// Export voor gebruik in routers
export { GECUREERDE_UITSPRAKEN, CATEGORIE_THEMA_MAP, CATEGORIE_TOETSINGSKADER_MAP };
