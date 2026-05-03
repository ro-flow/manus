/**
 * Toetsingsmatrix Service
 * 
 * Bepaalt welke toetsingskaders VERPLICHT en OPTIONEEL zijn per activiteit+functie combinatie.
 * Dit is het vangnet zodat GEEN enkel beleidsstuk wordt vergeten.
 * 
 * Werking:
 * 1. VERPLICHT: Deze kaders MOET de AI altijd gebruiken
 * 2. OPTIONEEL: Deze kaders KAN de AI raadplegen indien context relevant is
 * 3. AI kan zelf aanvullende kaders toevoegen op basis van specifieke omstandigheden
 */

import { getDb } from "../db";
import { toetsingsmatrix } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Type definities
export type ActiviteitType = 
  | "nieuwbouw" | "verbouw" | "uitbouw" | "aanbouw" | "dakkapel" | "dakopbouw"
  | "functiewijziging" | "splitsen" | "samenvoegen" | "sloop" | "reclame"
  | "erfafscheiding" | "bijgebouw" | "overkapping" | "zonnepanelen" | "warmtepomp"
  | "evenement" | "terras" | "inrit" | "kappen" | "uitweg" | "overig";

export type FunctieType = 
  | "wonen" | "horeca" | "detailhandel" | "kantoor" | "bedrijf"
  | "maatschappelijk" | "sport" | "recreatie" | "agrarisch" | "natuur"
  | "verkeer" | "water" | "gemengd" | "overig";

export interface ToetsingskaderSet {
  verplicht: string[];
  optioneel: string[];
  toelichting?: string;
  aandachtspunten?: string;
}

// Standaard toetsingskaders per categorie
const STANDAARD_KADERS = {
  // Altijd verplicht bij bouwen
  bouwen: ["welstandsnota", "bbl_technische_eisen", "omgevingsplan"],
  
  // Altijd verplicht bij functiewijziging
  functie: ["omgevingsplan", "parkeerbeleid"],
  
  // Milieu-gerelateerd
  milieu: ["geluidsnormen", "geurhinder", "luchtkwaliteit", "bodemkwaliteit"],
  
  // Verkeer-gerelateerd
  verkeer: ["parkeerbeleid", "verkeersveiligheid", "bereikbaarheid"],
  
  // Erfgoed-gerelateerd
  erfgoed: ["welstandsnota", "erfgoedbeleid", "monumentenbeleid"],
  
  // Natuur-gerelateerd
  natuur: ["groenbeleid", "bomenbeleid", "natura2000", "nnn"],
  
  // Horeca-specifiek
  horeca: ["horecabeleid", "terrassenbeleid", "geluidsnormen", "openingstijden"],
  
  // Wonen-specifiek
  wonen: ["woonvisie", "huisvestingsverordening"],
  
  // Bedrijf-specifiek
  bedrijf: ["bedrijventerreinenvisie", "vng_afstanden", "milieuzonering"],
};

/**
 * Standaard matrix met verplichte en optionele kaders per activiteit+functie
 * Dit is de fallback als er geen specifieke regel in de database staat
 */
const STANDAARD_MATRIX: Record<string, Record<string, ToetsingskaderSet>> = {
  // NIEUWBOUW
  nieuwbouw: {
    wonen: {
      verplicht: ["welstandsnota", "omgevingsplan", "parkeerbeleid", "bbl_technische_eisen", "woonvisie"],
      optioneel: ["duurzaamheidsbeleid", "groenbeleid", "waterbeleid", "archeologiebeleid"],
      toelichting: "Nieuwbouw woning: volledige toets aan welstand, technische eisen en parkeren",
    },
    horeca: {
      verplicht: ["welstandsnota", "omgevingsplan", "parkeerbeleid", "bbl_technische_eisen", "horecabeleid", "geluidsnormen"],
      optioneel: ["terrassenbeleid", "reclamebeleid", "evenementenbeleid"],
      toelichting: "Nieuwbouw horeca: extra aandacht voor geluid en openingstijden",
      aandachtspunten: "Let op tweezijdige werking: bescherming omliggende woningen",
    },
    detailhandel: {
      verplicht: ["welstandsnota", "omgevingsplan", "parkeerbeleid", "bbl_technische_eisen", "detailhandelsvisie"],
      optioneel: ["reclamebeleid", "bereikbaarheidsbeleid"],
    },
    kantoor: {
      verplicht: ["welstandsnota", "omgevingsplan", "parkeerbeleid", "bbl_technische_eisen"],
      optioneel: ["duurzaamheidsbeleid", "bereikbaarheidsbeleid"],
    },
    bedrijf: {
      verplicht: ["welstandsnota", "omgevingsplan", "parkeerbeleid", "bbl_technische_eisen", "milieuzonering", "vng_afstanden"],
      optioneel: ["bedrijventerreinenvisie", "duurzaamheidsbeleid"],
      aandachtspunten: "Controleer VNG-afstanden tot gevoelige functies",
    },
    maatschappelijk: {
      verplicht: ["welstandsnota", "omgevingsplan", "parkeerbeleid", "bbl_technische_eisen"],
      optioneel: ["maatschappelijke_voorzieningen_beleid", "bereikbaarheidsbeleid"],
    },
    overig: {
      verplicht: ["welstandsnota", "omgevingsplan", "parkeerbeleid", "bbl_technische_eisen"],
      optioneel: [],
    },
  },
  
  // VERBOUW
  verbouw: {
    wonen: {
      verplicht: ["welstandsnota", "omgevingsplan", "bbl_technische_eisen"],
      optioneel: ["parkeerbeleid", "duurzaamheidsbeleid"],
      toelichting: "Verbouw woning: toets aan welstand en technische eisen",
    },
    horeca: {
      verplicht: ["welstandsnota", "omgevingsplan", "bbl_technische_eisen", "horecabeleid"],
      optioneel: ["geluidsnormen", "brandveiligheid"],
    },
    overig: {
      verplicht: ["welstandsnota", "omgevingsplan", "bbl_technische_eisen"],
      optioneel: [],
    },
  },
  
  // UITBOUW
  uitbouw: {
    wonen: {
      verplicht: ["welstandsnota", "omgevingsplan", "bbl_technische_eisen"],
      optioneel: ["erfafscheidingsbeleid"],
      toelichting: "Uitbouw woning: check vergunningvrij criteria Bbl Bijlage II",
    },
    overig: {
      verplicht: ["welstandsnota", "omgevingsplan", "bbl_technische_eisen"],
      optioneel: [],
    },
  },
  
  // DAKKAPEL
  dakkapel: {
    wonen: {
      verplicht: ["welstandsnota", "omgevingsplan"],
      optioneel: ["bbl_technische_eisen"],
      toelichting: "Dakkapel: vaak vergunningvrij aan achterzijde, check welstandsnota voor voorzijde",
    },
    overig: {
      verplicht: ["welstandsnota", "omgevingsplan"],
      optioneel: [],
    },
  },
  
  // FUNCTIEWIJZIGING
  functiewijziging: {
    wonen: {
      verplicht: ["omgevingsplan", "parkeerbeleid", "woonvisie"],
      optioneel: ["huisvestingsverordening", "bbl_technische_eisen"],
      toelichting: "Functiewijziging naar wonen: check woningvoorraad en parkeernorm",
    },
    horeca: {
      verplicht: ["omgevingsplan", "parkeerbeleid", "horecabeleid", "geluidsnormen"],
      optioneel: ["terrassenbeleid", "openingstijdenbeleid", "reclamebeleid"],
      toelichting: "Functiewijziging naar horeca: uitgebreide toets milieu en overlast",
      aandachtspunten: "Tweezijdige werking: bescherming omliggende woningen én nieuwe horeca",
    },
    detailhandel: {
      verplicht: ["omgevingsplan", "parkeerbeleid", "detailhandelsvisie"],
      optioneel: ["reclamebeleid"],
    },
    kantoor: {
      verplicht: ["omgevingsplan", "parkeerbeleid"],
      optioneel: ["kantorenvisie"],
    },
    bedrijf: {
      verplicht: ["omgevingsplan", "parkeerbeleid", "milieuzonering", "vng_afstanden"],
      optioneel: ["bedrijventerreinenvisie"],
      aandachtspunten: "VNG-afstanden bepalen of functiewijziging mogelijk is",
    },
    overig: {
      verplicht: ["omgevingsplan", "parkeerbeleid"],
      optioneel: [],
    },
  },
  
  // SLOOP
  sloop: {
    wonen: {
      verplicht: ["omgevingsplan", "sloopmelding"],
      optioneel: ["asbestinventarisatie", "archeologiebeleid", "monumentenbeleid"],
      toelichting: "Sloop: check sloopmelding vereisten en asbest bij bouwjaar vóór 1994",
    },
    overig: {
      verplicht: ["omgevingsplan", "sloopmelding"],
      optioneel: ["asbestinventarisatie", "archeologiebeleid"],
    },
  },
  
  // EVENEMENT
  evenement: {
    overig: {
      verplicht: ["evenementenbeleid", "apv", "geluidsnormen"],
      optioneel: ["verkeerscirculatieplan", "veiligheidsplan"],
      toelichting: "Evenement: toets aan APV en evenementenbeleid",
    },
  },
  
  // TERRAS
  terras: {
    horeca: {
      verplicht: ["terrassenbeleid", "apv", "omgevingsplan"],
      optioneel: ["reclamebeleid", "geluidsnormen"],
      toelichting: "Terras: check terrassenbeleid en APV bepalingen",
    },
    overig: {
      verplicht: ["terrassenbeleid", "apv"],
      optioneel: [],
    },
  },
  
  // RECLAME
  reclame: {
    overig: {
      verplicht: ["reclamebeleid", "welstandsnota", "apv"],
      optioneel: ["omgevingsplan"],
      toelichting: "Reclame: toets aan reclamebeleid en welstandsnota",
    },
  },
  
  // KAPPEN
  kappen: {
    overig: {
      verplicht: ["bomenbeleid", "apv", "groenbeleid"],
      optioneel: ["herplantplicht"],
      toelichting: "Kappen: check kapvergunning vereisten en herplantplicht",
    },
  },
  
  // ZONNEPANELEN
  zonnepanelen: {
    wonen: {
      verplicht: ["welstandsnota"],
      optioneel: ["omgevingsplan", "monumentenbeleid"],
      toelichting: "Zonnepanelen: vaak vergunningvrij, check welstandsnota bij monument/beschermd gezicht",
    },
    overig: {
      verplicht: ["welstandsnota"],
      optioneel: ["omgevingsplan"],
    },
  },
};

/**
 * Haal toetsingskaders op voor een specifieke activiteit+functie combinatie
 */
export async function getToetsingskaders(
  activiteit: ActiviteitType,
  functie: FunctieType
): Promise<ToetsingskaderSet> {
  // Eerst proberen uit database
  const db = await getDb();
  let dbResult: any[] = [];
  
  if (db) {
    dbResult = await db
      .select()
      .from(toetsingsmatrix)
      .where(
        and(
          eq(toetsingsmatrix.activiteitType, activiteit),
          eq(toetsingsmatrix.functieType, functie),
          eq(toetsingsmatrix.status, "actief")
        )
      )
      .limit(1);
  }

  if (dbResult.length > 0) {
    const row = dbResult[0];
    return {
      verplicht: (row.verplichteKaders as string[]) || [],
      optioneel: (row.optioneleKaders as string[]) || [],
      toelichting: row.toelichting || undefined,
      aandachtspunten: row.aandachtspunten || undefined,
    };
  }

  // Fallback naar standaard matrix
  const activiteitMatrix = STANDAARD_MATRIX[activiteit];
  if (activiteitMatrix) {
    const functieSet = activiteitMatrix[functie] || activiteitMatrix["overig"];
    if (functieSet) {
      return functieSet;
    }
  }

  // Ultieme fallback: basis kaders
  return {
    verplicht: ["omgevingsplan"],
    optioneel: ["welstandsnota", "parkeerbeleid"],
    toelichting: `Geen specifieke matrix voor ${activiteit}+${functie}, basis toetsing`,
  };
}

/**
 * Haal alle beschikbare toetsingskaders op (voor AI om uit te kiezen)
 */
export function getAlleToetsingskaders(): string[] {
  const alleKaders = new Set<string>();
  
  // Verzamel uit standaard kaders
  Object.values(STANDAARD_KADERS).forEach(kaders => {
    kaders.forEach(k => alleKaders.add(k));
  });
  
  // Verzamel uit matrix
  Object.values(STANDAARD_MATRIX).forEach(activiteit => {
    Object.values(activiteit).forEach(functie => {
      functie.verplicht.forEach(k => alleKaders.add(k));
      functie.optioneel.forEach(k => alleKaders.add(k));
    });
  });
  
  return Array.from(alleKaders).sort();
}

/**
 * Format toetsingskaders voor AI prompt
 */
export function formatToetsingskadersVoorAI(
  activiteiten: ActiviteitType[],
  functies: FunctieType[]
): string {
  const verzameldVerplicht = new Set<string>();
  const verzameldOptioneel = new Set<string>();
  const toelichtingen: string[] = [];
  const aandachtspunten: string[] = [];

  // Verzamel kaders voor alle activiteit+functie combinaties
  for (const activiteit of activiteiten) {
    for (const functie of functies) {
      const activiteitMatrix = STANDAARD_MATRIX[activiteit];
      if (activiteitMatrix) {
        const functieSet = activiteitMatrix[functie] || activiteitMatrix["overig"];
        if (functieSet) {
          functieSet.verplicht.forEach(k => verzameldVerplicht.add(k));
          functieSet.optioneel.forEach(k => verzameldOptioneel.add(k));
          if (functieSet.toelichting) {
            toelichtingen.push(`${activiteit}+${functie}: ${functieSet.toelichting}`);
          }
          if (functieSet.aandachtspunten) {
            aandachtspunten.push(`${activiteit}+${functie}: ${functieSet.aandachtspunten}`);
          }
        }
      }
    }
  }

  // Verwijder optionele kaders die al verplicht zijn
  verzameldVerplicht.forEach(k => verzameldOptioneel.delete(k));

  let output = `## TOETSINGSKADERS MATRIX

### VERPLICHTE TOETSINGSKADERS (MOET gebruiken)
Deze kaders MOET je altijd raadplegen en toepassen in je analyse:
${Array.from(verzameldVerplicht).map(k => `- ${k}`).join('\n')}

### OPTIONELE TOETSINGSKADERS (KAN raadplegen)
Deze kaders KAN je raadplegen indien de context dit vereist:
${Array.from(verzameldOptioneel).map(k => `- ${k}`).join('\n')}

### ALLE BESCHIKBARE KADERS
Je mag ook andere kaders toevoegen als de specifieke situatie dit vereist:
${getAlleToetsingskaders().filter(k => !verzameldVerplicht.has(k) && !verzameldOptioneel.has(k)).map(k => `- ${k}`).join('\n')}
`;

  if (toelichtingen.length > 0) {
    output += `\n### TOELICHTING\n${toelichtingen.join('\n')}\n`;
  }

  if (aandachtspunten.length > 0) {
    output += `\n### AANDACHTSPUNTEN\n${aandachtspunten.join('\n')}\n`;
  }

  output += `
### INSTRUCTIE
1. Controleer EERST alle VERPLICHTE kaders
2. Bepaal daarna welke OPTIONELE kaders relevant zijn voor deze specifieke situatie
3. Voeg indien nodig aanvullende kaders toe uit de volledige lijst
4. Documenteer welke kaders je NIET hebt gebruikt en WAAROM (Stap 7)
`;

  return output;
}

/**
 * Detecteer activiteittype uit DSO-aanvraag tekst
 */
export function detecteerActiviteitType(tekst: string): ActiviteitType[] {
  const activiteiten: ActiviteitType[] = [];
  const lowerTekst = tekst.toLowerCase();

  const mapping: Record<string, ActiviteitType> = {
    "nieuwbouw": "nieuwbouw",
    "nieuw te bouwen": "nieuwbouw",
    "oprichten": "nieuwbouw",
    "verbouw": "verbouw",
    "verbouwen": "verbouw",
    "renovatie": "verbouw",
    "renoveren": "verbouw",
    "uitbouw": "uitbouw",
    "uitbreid": "uitbouw",
    "aanbouw": "aanbouw",
    "dakkapel": "dakkapel",
    "dakopbouw": "dakopbouw",
    "opbouw": "dakopbouw",
    "functiewijziging": "functiewijziging",
    "gebruikswijziging": "functiewijziging",
    "omzetten": "functiewijziging",
    "splitsen": "splitsen",
    "woningsplitsing": "splitsen",
    "samenvoegen": "samenvoegen",
    "sloop": "sloop",
    "slopen": "sloop",
    "reclame": "reclame",
    "uiting": "reclame",
    "erfafscheiding": "erfafscheiding",
    "schutting": "erfafscheiding",
    "hek": "erfafscheiding",
    "bijgebouw": "bijgebouw",
    "schuur": "bijgebouw",
    "garage": "bijgebouw",
    "overkapping": "overkapping",
    "carport": "overkapping",
    "zonnepanelen": "zonnepanelen",
    "zonnepaneel": "zonnepanelen",
    "pv-panelen": "zonnepanelen",
    "warmtepomp": "warmtepomp",
    "evenement": "evenement",
    "festival": "evenement",
    "terras": "terras",
    "inrit": "inrit",
    "uitrit": "inrit",
    "kappen": "kappen",
    "kap": "kappen",
    "boom": "kappen",
    "bomen": "kappen",
    "uitweg": "uitweg",
  };

  for (const [keyword, activiteit] of Object.entries(mapping)) {
    if (lowerTekst.includes(keyword) && !activiteiten.includes(activiteit)) {
      activiteiten.push(activiteit);
    }
  }

  if (activiteiten.length === 0) {
    activiteiten.push("overig");
  }

  return activiteiten;
}

/**
 * Detecteer functietype uit DSO-aanvraag tekst
 */
export function detecteerFunctieType(tekst: string): FunctieType[] {
  const functies: FunctieType[] = [];
  const lowerTekst = tekst.toLowerCase();

  const mapping: Record<string, FunctieType> = {
    "woning": "wonen",
    "wonen": "wonen",
    "woonfunctie": "wonen",
    "appartement": "wonen",
    "horeca": "horeca",
    "restaurant": "horeca",
    "café": "horeca",
    "bar": "horeca",
    "hotel": "horeca",
    "detailhandel": "detailhandel",
    "winkel": "detailhandel",
    "supermarkt": "detailhandel",
    "kantoor": "kantoor",
    "kantoorfunctie": "kantoor",
    "bedrijf": "bedrijf",
    "industrie": "bedrijf",
    "bedrijfsruimte": "bedrijf",
    "maatschappelijk": "maatschappelijk",
    "school": "maatschappelijk",
    "zorg": "maatschappelijk",
    "kerk": "maatschappelijk",
    "sport": "sport",
    "sporthal": "sport",
    "fitness": "sport",
    "recreatie": "recreatie",
    "vakantie": "recreatie",
    "camping": "recreatie",
    "agrarisch": "agrarisch",
    "boerderij": "agrarisch",
    "landbouw": "agrarisch",
    "veehouderij": "agrarisch",
    "natuur": "natuur",
    "groen": "natuur",
    "verkeer": "verkeer",
    "parkeren": "verkeer",
    "water": "water",
    "gemengd": "gemengd",
  };

  for (const [keyword, functie] of Object.entries(mapping)) {
    if (lowerTekst.includes(keyword) && !functies.includes(functie)) {
      functies.push(functie);
    }
  }

  if (functies.length === 0) {
    functies.push("overig");
  }

  return functies;
}
