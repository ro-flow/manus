/**
 * Gelaagde Kennisbank Service
 * 
 * Geconsolideerde kennisbank met:
 * - 5 lagen: Basis, Landelijk, Provinciaal, Regionaal, Gemeentelijk
 * - 4 categorieën: Adviseurs, Toetsingskaders, Onderzoeken, Beleidsdocumenten
 * 
 * Elke laag erft van de bovenliggende lagen:
 * Gemeentelijk → Regionaal → Provinciaal → Landelijk → Basis
 * 
 * Data isolatie: Gemeente X ziet alleen:
 * - Basis (gedeeld)
 * - Landelijk (gedeeld)
 * - Provinciaal van eigen provincie
 * - Regionaal van eigen regio's (waterschap, VR, OD, GGD, recreatieschap)
 * - Gemeentelijk van eigen gemeente
 */

import { getDb } from "../db";
import { eq, and, or, inArray, isNull } from "drizzle-orm";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// De 5 lagen
export type KennisbankLaag = 
  | 'basis'        // Omgevingswet, Bbl, Bal, Bkl - altijd van toepassing
  | 'landelijk'    // Rijksbeleid, landelijke richtlijnen
  | 'provinciaal'  // Provinciale verordeningen en beleid
  | 'regionaal'    // Waterschap, Veiligheidsregio, Omgevingsdienst, GGD, Recreatieschap
  | 'gemeentelijk'; // Gemeentelijk beleid en omgevingsplan

// De 4 categorieën
export type KennisbankCategorie = 
  | 'adviseur'          // Interne/externe adviseurs
  | 'toetsingskader'    // Beleidskaders om tegen te toetsen
  | 'onderzoek'         // Vereiste onderzoeken
  | 'beleidsdocument';  // Beleidsdocumenten en nota's

// Laag prioriteit (hogere = meer specifiek = voorrang)
const LAAG_PRIORITEIT: Record<KennisbankLaag, number> = {
  basis: 1,
  landelijk: 2,
  provinciaal: 3,
  regionaal: 4,
  gemeentelijk: 5
};

// ============================================================================
// KENNISBANK ITEM INTERFACE
// ============================================================================

export interface KennisbankItem {
  id?: number;
  
  // Classificatie
  laag: KennisbankLaag;
  categorie: KennisbankCategorie;
  
  // Scope (voor filtering)
  scopeProvincie?: string;           // Voor provinciaal
  scopeRegioCode?: string;           // Voor regionaal (waterschap/VR/OD/GGD code)
  scopeRegioType?: 'waterschap' | 'veiligheidsregio' | 'omgevingsdienst' | 'ggd' | 'recreatieschap';
  scopeGemeenteId?: number;          // Voor gemeentelijk
  
  // Basis informatie
  naam: string;
  omschrijving?: string;
  wettelijkeBasis?: string;
  
  // Triggers - wanneer is dit item van toepassing?
  triggers: KennisbankTrigger[];
  
  // Categorie-specifieke velden
  adviseurInfo?: AdviseurInfo;
  toetsingskaderInfo?: ToetsingskaderInfo;
  onderzoekInfo?: OnderzoekInfo;
  beleidsdocumentInfo?: BeleidsdocumentInfo;
  
  // Status
  status: 'actief' | 'concept' | 'inactief' | 'vervallen';
  versie?: string;
  geldigVanaf?: Date;
  geldigTot?: Date;
  
  // Metadata
  bron: 'systeem' | 'ai_gegenereerd' | 'handmatig' | 'import';
  laatstGewijzigd?: Date;
}

// ============================================================================
// TRIGGER INTERFACE
// ============================================================================

export interface KennisbankTrigger {
  type: TriggerType;
  waarde: string;
  conditie?: 'aanwezig' | 'afwezig' | 'groter_dan' | 'kleiner_dan' | 'gelijk_aan';
}

export type TriggerType = 
  // Activiteit triggers
  | 'activiteit'           // bouwen, verbouwen, slopen, etc.
  | 'functie_huidig'       // wonen, horeca, kantoor, etc.
  | 'functie_nieuw'        // bij functiewijziging
  
  // Locatie triggers
  | 'beschermingsregime'   // rijksmonument, natura2000, etc.
  | 'dubbelbestemming'     // archeologie, waterkering, etc.
  | 'gebiedstype'          // binnenstad, buitengebied, etc.
  
  // Project triggers
  | 'oppervlakte_m2'       // met conditie groter_dan/kleiner_dan
  | 'hoogte_m'             // met conditie
  | 'graafdiepte_cm'       // met conditie
  | 'bouwjaar'             // met conditie (voor asbest etc.)
  
  // Altijd
  | 'altijd';              // altijd van toepassing

// ============================================================================
// CATEGORIE-SPECIFIEKE INFO
// ============================================================================

export interface AdviseurInfo {
  type: 'intern' | 'extern';
  organisatie?: string;
  afdeling?: string;
  contactEmail?: string;
  contactTelefoon?: string;
  termijnWeken: number;
  isVerplicht: boolean;
  adviesType?: 'welstand' | 'monumenten' | 'brandweer' | 'waterschap' | 'provincie' | 'overig';
}

export interface ToetsingskaderInfo {
  toetsingsCategorie: 'altijd' | 'soms' | 'nooit';
  prioriteit: number;
  toetsVragen?: string[];
  normen?: string[];
  afwegingscriteria?: string[];
}

export interface OnderzoekInfo {
  onderzoekType: OnderzoekType;
  uitvoerder: string;
  doorlooptijdWeken: number;
  kostenIndicatie?: string;
  nenNormen?: string[];
  drempelwaarden?: {
    oppervlakteM2?: number;
    diepteCm?: number;
    hoogteM?: number;
  };
  vrijstellingsgronden?: string[];
}

export type OnderzoekType = 
  | 'archeologisch' | 'akoestisch' | 'bodem' | 'flora_fauna'
  | 'stikstof_aerius' | 'watertoets' | 'cultuurhistorisch'
  | 'verkeer' | 'luchtkwaliteit' | 'externe_veiligheid'
  | 'trillingen' | 'geur' | 'asbest' | 'bouwhistorisch'
  | 'constructief' | 'energieprestatie' | 'daglicht' | 'brandveiligheid'
  | 'klic_melding';

export interface BeleidsdocumentInfo {
  documentType: 'nota' | 'verordening' | 'visie' | 'richtlijn' | 'handleiding';
  documentUrl?: string;
  documentDatum?: Date;
  samenvatting?: string;
  zoektermen?: string[];
  juridischeStatus: 'normstellend' | 'richtinggevend' | 'afwegingskader';
}

// ============================================================================
// GEMEENTE CONTEXT
// ============================================================================

export interface GemeenteContext {
  gemeenteId: number;
  gemeenteNaam: string;
  gemeenteCode?: string;
  
  // Provinciale scope
  provincie: string;
  
  // Regionale scopes
  waterschapCode?: string;
  waterschapNaam?: string;
  veiligheidsregioCode?: string;
  veiligheidsregioNaam?: string;
  omgevingsdienstCode?: string;
  omgevingsdienstNaam?: string;
  ggdCode?: string;
  ggdNaam?: string;
}

// ============================================================================
// QUERY INTERFACE
// ============================================================================

export interface KennisbankQuery {
  // Filter op categorie
  categorie?: KennisbankCategorie;
  categorieen?: KennisbankCategorie[];
  
  // Filter op laag
  laag?: KennisbankLaag;
  lagen?: KennisbankLaag[];
  
  // Context voor scope filtering
  gemeenteContext: GemeenteContext;
  
  // Trigger matching
  activiteiten?: string[];
  functieHuidig?: string;
  functieNieuw?: string;
  beschermingsregimes?: string[];
  dubbelbestemmingen?: string[];
  projectDetails?: {
    oppervlakteM2?: number;
    hoogteM?: number;
    graafdiepteCm?: number;
    bouwjaar?: number;
  };
  
  // Status filter
  alleenActief?: boolean;
}

// ============================================================================
// KENNISBANK RESULTAAT
// ============================================================================

export interface KennisbankResultaat {
  // Gegroepeerd per categorie
  adviseurs: KennisbankItem[];
  toetsingskaders: KennisbankItem[];
  onderzoeken: KennisbankItem[];
  beleidsdocumenten: KennisbankItem[];
  
  // Metadata
  totaalAantal: number;
  perLaag: Record<KennisbankLaag, number>;
  perCategorie: Record<KennisbankCategorie, number>;
}

// ============================================================================
// BASIS KENNISBANK DATA (LAAG: BASIS)
// ============================================================================

const BASIS_KENNISBANK: KennisbankItem[] = [
  // === TOETSINGSKADERS - BASIS ===
  {
    laag: 'basis',
    categorie: 'toetsingskader',
    naam: 'Omgevingswet',
    omschrijving: 'Hoofdwet voor de fysieke leefomgeving',
    wettelijkeBasis: 'Omgevingswet',
    triggers: [{ type: 'altijd', waarde: 'true' }],
    toetsingskaderInfo: {
      toetsingsCategorie: 'altijd',
      prioriteit: 1,
      toetsVragen: ['Is de activiteit toegestaan onder de Omgevingswet?']
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'basis',
    categorie: 'toetsingskader',
    naam: 'Besluit bouwwerken leefomgeving (Bbl)',
    omschrijving: 'Technische eisen voor bouwwerken',
    wettelijkeBasis: 'Bbl',
    triggers: [
      { type: 'activiteit', waarde: 'bouwen' },
      { type: 'activiteit', waarde: 'verbouwen' }
    ],
    toetsingskaderInfo: {
      toetsingsCategorie: 'altijd',
      prioriteit: 2,
      toetsVragen: [
        'Voldoet het bouwwerk aan constructieve veiligheid?',
        'Voldoet het bouwwerk aan brandveiligheid?',
        'Voldoet het bouwwerk aan gezondheid (ventilatie, daglicht)?',
        'Voldoet het bouwwerk aan energiezuinigheid (BENG)?'
      ]
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'basis',
    categorie: 'toetsingskader',
    naam: 'Besluit activiteiten leefomgeving (Bal)',
    omschrijving: 'Milieuregels voor activiteiten',
    wettelijkeBasis: 'Bal',
    triggers: [
      { type: 'functie_nieuw', waarde: 'bedrijf' },
      { type: 'functie_nieuw', waarde: 'horeca' }
    ],
    toetsingskaderInfo: {
      toetsingsCategorie: 'altijd',
      prioriteit: 3,
      toetsVragen: [
        'Voldoet de activiteit aan geluidnormen?',
        'Voldoet de activiteit aan geurnormen?',
        'Zijn er emissies naar lucht/water?'
      ]
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'basis',
    categorie: 'toetsingskader',
    naam: 'Besluit kwaliteit leefomgeving (Bkl)',
    omschrijving: 'Instructieregels voor ruimtelijke kwaliteit',
    wettelijkeBasis: 'Bkl',
    triggers: [{ type: 'altijd', waarde: 'true' }],
    toetsingskaderInfo: {
      toetsingsCategorie: 'altijd',
      prioriteit: 4,
      toetsVragen: ['Past de activiteit binnen de instructieregels?']
    },
    status: 'actief',
    bron: 'systeem'
  },
  
  // === ONDERZOEKEN - BASIS ===
  {
    laag: 'basis',
    categorie: 'onderzoek',
    naam: 'Archeologisch onderzoek',
    omschrijving: 'Onderzoek naar archeologische waarden in de bodem',
    wettelijkeBasis: 'Erfgoedwet art. 5.1',
    triggers: [
      { type: 'dubbelbestemming', waarde: 'archeologie' },
      { type: 'graafdiepte_cm', waarde: '30', conditie: 'groter_dan' }
    ],
    onderzoekInfo: {
      onderzoekType: 'archeologisch',
      uitvoerder: 'Gecertificeerd archeologisch bureau',
      doorlooptijdWeken: 4,
      kostenIndicatie: '€2.000 - €15.000',
      nenNormen: ['KNA 4.1'],
      drempelwaarden: { diepteCm: 30, oppervlakteM2: 100 },
      vrijstellingsgronden: ['Reeds verstoorde bodem', 'Lage archeologische verwachting']
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'basis',
    categorie: 'onderzoek',
    naam: 'Bodemonderzoek',
    omschrijving: 'Onderzoek naar bodemkwaliteit en verontreiniging',
    wettelijkeBasis: 'Bkl art. 5.89',
    triggers: [
      { type: 'activiteit', waarde: 'bouwen' },
      { type: 'functie_nieuw', waarde: 'wonen' }
    ],
    onderzoekInfo: {
      onderzoekType: 'bodem',
      uitvoerder: 'Erkend bodemonderzoeksbureau',
      doorlooptijdWeken: 3,
      kostenIndicatie: '€1.500 - €5.000',
      nenNormen: ['NEN 5725', 'NEN 5740'],
      vrijstellingsgronden: ['Recent bodemonderzoek beschikbaar (<5 jaar)', 'Schone grondverklaring']
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'basis',
    categorie: 'onderzoek',
    naam: 'AERIUS-berekening (stikstof)',
    omschrijving: 'Berekening stikstofdepositie op Natura 2000-gebieden',
    wettelijkeBasis: 'Wnb art. 2.7, 2.8',
    triggers: [
      { type: 'beschermingsregime', waarde: 'natura2000' },
      { type: 'activiteit', waarde: 'bouwen' }
    ],
    onderzoekInfo: {
      onderzoekType: 'stikstof_aerius',
      uitvoerder: 'Milieuadviesbureau of zelf via AERIUS Calculator',
      doorlooptijdWeken: 2,
      kostenIndicatie: '€500 - €3.000',
      vrijstellingsgronden: ['Geen toename stikstofdepositie', 'Intern salderen']
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'basis',
    categorie: 'onderzoek',
    naam: 'KLIC-melding',
    omschrijving: 'Melding voor kabels en leidingen bij graafwerk',
    wettelijkeBasis: 'WION art. 2',
    triggers: [
      { type: 'graafdiepte_cm', waarde: '20', conditie: 'groter_dan' }
    ],
    onderzoekInfo: {
      onderzoekType: 'klic_melding',
      uitvoerder: 'Kadaster (via KLIC-online)',
      doorlooptijdWeken: 1,
      kostenIndicatie: '€20 - €50',
      drempelwaarden: { diepteCm: 20 }
    },
    status: 'actief',
    bron: 'systeem'
  },
  
  // === ADVISEURS - BASIS ===
  {
    laag: 'basis',
    categorie: 'adviseur',
    naam: 'Brandweer',
    omschrijving: 'Advies brandveiligheid bij grote bouwwerken',
    wettelijkeBasis: 'Bbl hoofdstuk 6',
    triggers: [
      { type: 'functie_nieuw', waarde: 'horeca' },
      { type: 'oppervlakte_m2', waarde: '500', conditie: 'groter_dan' }
    ],
    adviseurInfo: {
      type: 'extern',
      organisatie: 'Veiligheidsregio',
      termijnWeken: 4,
      isVerplicht: true,
      adviesType: 'brandweer'
    },
    status: 'actief',
    bron: 'systeem'
  }
];

// ============================================================================
// LANDELIJKE KENNISBANK DATA (LAAG: LANDELIJK)
// ============================================================================

const LANDELIJK_KENNISBANK: KennisbankItem[] = [
  {
    laag: 'landelijk',
    categorie: 'toetsingskader',
    naam: 'Erfgoedwet',
    omschrijving: 'Bescherming van cultureel erfgoed',
    wettelijkeBasis: 'Erfgoedwet',
    triggers: [
      { type: 'beschermingsregime', waarde: 'rijksmonument' },
      { type: 'beschermingsregime', waarde: 'beschermd_stadsgezicht' }
    ],
    toetsingskaderInfo: {
      toetsingsCategorie: 'soms',
      prioriteit: 10,
      toetsVragen: ['Wordt het monument aangetast?', 'Is de wijziging reversibel?']
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'landelijk',
    categorie: 'toetsingskader',
    naam: 'Wet natuurbescherming',
    omschrijving: 'Bescherming van natuur en soorten',
    wettelijkeBasis: 'Wnb',
    triggers: [
      { type: 'beschermingsregime', waarde: 'natura2000' },
      { type: 'beschermingsregime', waarde: 'nnn_gebied' }
    ],
    toetsingskaderInfo: {
      toetsingsCategorie: 'soms',
      prioriteit: 11,
      toetsVragen: ['Is er verstoring van beschermde soorten?', 'Is er aantasting van habitat?']
    },
    status: 'actief',
    bron: 'systeem'
  },
  {
    laag: 'landelijk',
    categorie: 'adviseur',
    naam: 'Rijksdienst voor het Cultureel Erfgoed (RCE)',
    omschrijving: 'Advies bij rijksmonumenten',
    wettelijkeBasis: 'Erfgoedwet art. 3.18',
    triggers: [
      { type: 'beschermingsregime', waarde: 'rijksmonument' }
    ],
    adviseurInfo: {
      type: 'extern',
      organisatie: 'Rijksdienst voor het Cultureel Erfgoed',
      termijnWeken: 8,
      isVerplicht: true,
      adviesType: 'monumenten'
    },
    status: 'actief',
    bron: 'systeem'
  }
];

// ============================================================================
// HOOFDFUNCTIES
// ============================================================================

/**
 * Haal kennisbank items op voor een gemeente context
 */
export async function haalKennisbankItems(query: KennisbankQuery): Promise<KennisbankResultaat> {
  // Start met basis en landelijk (altijd beschikbaar)
  let items: KennisbankItem[] = [...BASIS_KENNISBANK, ...LANDELIJK_KENNISBANK];
  
  // TODO: Haal provinciale, regionale en gemeentelijke items uit database
  // Dit wordt later geïmplementeerd met database queries
  
  // Filter op categorie
  if (query.categorie) {
    items = items.filter(i => i.categorie === query.categorie);
  } else if (query.categorieen && query.categorieen.length > 0) {
    items = items.filter(i => query.categorieen!.includes(i.categorie));
  }
  
  // Filter op laag
  if (query.laag) {
    items = items.filter(i => i.laag === query.laag);
  } else if (query.lagen && query.lagen.length > 0) {
    items = items.filter(i => query.lagen!.includes(i.laag));
  }
  
  // Filter op status
  if (query.alleenActief !== false) {
    items = items.filter(i => i.status === 'actief');
  }
  
  // Match triggers
  items = items.filter(item => matchTriggers(item.triggers, query));
  
  // Sorteer op laag prioriteit (specifiekere lagen eerst)
  items.sort((a, b) => LAAG_PRIORITEIT[b.laag] - LAAG_PRIORITEIT[a.laag]);
  
  // Groepeer per categorie
  const adviseurs = items.filter(i => i.categorie === 'adviseur');
  const toetsingskaders = items.filter(i => i.categorie === 'toetsingskader');
  const onderzoeken = items.filter(i => i.categorie === 'onderzoek');
  const beleidsdocumenten = items.filter(i => i.categorie === 'beleidsdocument');
  
  // Bereken metadata
  const perLaag: Record<KennisbankLaag, number> = {
    basis: items.filter(i => i.laag === 'basis').length,
    landelijk: items.filter(i => i.laag === 'landelijk').length,
    provinciaal: items.filter(i => i.laag === 'provinciaal').length,
    regionaal: items.filter(i => i.laag === 'regionaal').length,
    gemeentelijk: items.filter(i => i.laag === 'gemeentelijk').length
  };
  
  const perCategorie: Record<KennisbankCategorie, number> = {
    adviseur: adviseurs.length,
    toetsingskader: toetsingskaders.length,
    onderzoek: onderzoeken.length,
    beleidsdocument: beleidsdocumenten.length
  };
  
  return {
    adviseurs,
    toetsingskaders,
    onderzoeken,
    beleidsdocumenten,
    totaalAantal: items.length,
    perLaag,
    perCategorie
  };
}

/**
 * Match triggers tegen query parameters
 */
function matchTriggers(triggers: KennisbankTrigger[], query: KennisbankQuery): boolean {
  // Als er geen triggers zijn, is het item altijd van toepassing
  if (!triggers || triggers.length === 0) return true;
  
  // Check of minstens één trigger matcht
  return triggers.some(trigger => {
    switch (trigger.type) {
      case 'altijd':
        return true;
        
      case 'activiteit':
        return query.activiteiten?.includes(trigger.waarde);
        
      case 'functie_huidig':
        return query.functieHuidig === trigger.waarde;
        
      case 'functie_nieuw':
        return query.functieNieuw === trigger.waarde;
        
      case 'beschermingsregime':
        return query.beschermingsregimes?.includes(trigger.waarde);
        
      case 'dubbelbestemming':
        return query.dubbelbestemmingen?.includes(trigger.waarde);
        
      case 'oppervlakte_m2':
        if (!query.projectDetails?.oppervlakteM2) return false;
        return matchConditie(query.projectDetails.oppervlakteM2, parseFloat(trigger.waarde), trigger.conditie);
        
      case 'hoogte_m':
        if (!query.projectDetails?.hoogteM) return false;
        return matchConditie(query.projectDetails.hoogteM, parseFloat(trigger.waarde), trigger.conditie);
        
      case 'graafdiepte_cm':
        if (!query.projectDetails?.graafdiepteCm) return false;
        return matchConditie(query.projectDetails.graafdiepteCm, parseFloat(trigger.waarde), trigger.conditie);
        
      case 'bouwjaar':
        if (!query.projectDetails?.bouwjaar) return false;
        return matchConditie(query.projectDetails.bouwjaar, parseFloat(trigger.waarde), trigger.conditie);
        
      default:
        return false;
    }
  });
}

/**
 * Match numerieke conditie
 */
function matchConditie(
  waarde: number, 
  drempel: number, 
  conditie?: 'aanwezig' | 'afwezig' | 'groter_dan' | 'kleiner_dan' | 'gelijk_aan'
): boolean {
  switch (conditie) {
    case 'groter_dan':
      return waarde > drempel;
    case 'kleiner_dan':
      return waarde < drempel;
    case 'gelijk_aan':
      return waarde === drempel;
    default:
      return waarde >= drempel;
  }
}

// ============================================================================
// FORMAT FUNCTIES
// ============================================================================

/**
 * Format kennisbank resultaat voor AI context
 */
export function formatKennisbankVoorAI(resultaat: KennisbankResultaat): string {
  let output = '## Gelaagde Kennisbank Analyse\n\n';
  
  output += `**Totaal:** ${resultaat.totaalAantal} items\n`;
  output += `**Per laag:** Basis: ${resultaat.perLaag.basis}, Landelijk: ${resultaat.perLaag.landelijk}, `;
  output += `Provinciaal: ${resultaat.perLaag.provinciaal}, Regionaal: ${resultaat.perLaag.regionaal}, `;
  output += `Gemeentelijk: ${resultaat.perLaag.gemeentelijk}\n\n`;
  
  // Toetsingskaders
  if (resultaat.toetsingskaders.length > 0) {
    output += `### Toetsingskaders (${resultaat.toetsingskaders.length})\n`;
    resultaat.toetsingskaders.forEach(k => {
      const info = k.toetsingskaderInfo;
      output += `- **${k.naam}** [${k.laag}] - ${info?.toetsingsCategorie?.toUpperCase() || 'SOMS'}\n`;
      output += `  Grondslag: ${k.wettelijkeBasis || 'n.v.t.'}\n`;
    });
    output += '\n';
  }
  
  // Onderzoeken
  if (resultaat.onderzoeken.length > 0) {
    output += `### Vereiste Onderzoeken (${resultaat.onderzoeken.length})\n`;
    resultaat.onderzoeken.forEach(o => {
      const info = o.onderzoekInfo;
      output += `- **${o.naam}** [${o.laag}]\n`;
      output += `  Uitvoerder: ${info?.uitvoerder || 'n.v.t.'}\n`;
      output += `  Doorlooptijd: ${info?.doorlooptijdWeken || '?'} weken\n`;
      output += `  Grondslag: ${o.wettelijkeBasis || 'n.v.t.'}\n`;
    });
    output += '\n';
  }
  
  // Adviseurs
  if (resultaat.adviseurs.length > 0) {
    output += `### Te Raadplegen Adviseurs (${resultaat.adviseurs.length})\n`;
    resultaat.adviseurs.forEach(a => {
      const info = a.adviseurInfo;
      output += `- **${a.naam}** [${a.laag}] - ${info?.isVerplicht ? 'VERPLICHT' : 'optioneel'}\n`;
      output += `  Type: ${info?.type || 'n.v.t.'}\n`;
      output += `  Termijn: ${info?.termijnWeken || '?'} weken\n`;
    });
    output += '\n';
  }
  
  // Beleidsdocumenten
  if (resultaat.beleidsdocumenten.length > 0) {
    output += `### Relevante Beleidsdocumenten (${resultaat.beleidsdocumenten.length})\n`;
    resultaat.beleidsdocumenten.forEach(b => {
      const info = b.beleidsdocumentInfo;
      output += `- **${b.naam}** [${b.laag}] - ${info?.juridischeStatus || 'n.v.t.'}\n`;
    });
  }
  
  return output;
}

// ============================================================================
// CRUD FUNCTIES (voor database)
// ============================================================================

/**
 * Voeg een kennisbank item toe
 */
export async function voegKennisbankItemToe(item: KennisbankItem): Promise<number> {
  // TODO: Implementeer database insert
  console.log('[Kennisbank] Item toegevoegd:', item.naam);
  return 0;
}

/**
 * Update een kennisbank item
 */
export async function updateKennisbankItem(id: number, updates: Partial<KennisbankItem>): Promise<void> {
  // TODO: Implementeer database update
  console.log('[Kennisbank] Item geüpdatet:', id);
}

/**
 * Verwijder een kennisbank item (soft delete)
 */
export async function verwijderKennisbankItem(id: number): Promise<void> {
  // TODO: Implementeer soft delete (status = 'inactief')
  console.log('[Kennisbank] Item verwijderd:', id);
}
