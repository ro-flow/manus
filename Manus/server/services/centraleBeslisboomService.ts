/**
 * Centrale Beslisboom Service
 * 
 * Geconsolideerde beslisboom die zowel:
 * 1. Toetsingshiërarchie bepaalt (ALTIJD/SOMS/NOOIT toetsen) - "De Gouden Regel"
 * 2. Vergunningplicht bepaalt met override-logica
 * 
 * De Gouden Juridische Regel:
 * "Alles wat 'mag / moet / niet mag' bevat, moet je toetsen.
 *  Alles wat 'wenst / stimuleert / richting geeft', alleen als dat nodig is."
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Activiteit types
export type ActiviteitType = 
  | 'bouwen' | 'verbouwen' | 'uitbouwen' | 'aanbouwen'
  | 'slopen' | 'gebruikswijziging' | 'splitsen' | 'samenvoegen'
  | 'aanleggen' | 'kappen' | 'uitweg' | 'reclame'
  | 'monument_wijzigen' | 'evenement' | 'terras';

// Functie types
export type FunctieType = 
  | 'wonen' | 'horeca' | 'detailhandel' | 'kantoor' | 'bedrijf'
  | 'maatschappelijk' | 'sport' | 'recreatie' | 'agrarisch' | 'natuur'
  | 'verkeer' | 'water' | 'gemengd' | 'overig';

// Procedure types
export type ProcedureType = 'vergunningvrij' | 'meldingsplichtig' | 'regulier' | 'uitgebreid';

// Toetsings categorie
export type ToetsingsCategorie = 'altijd' | 'soms' | 'nooit';

// Beschermingsregime types
export type BeschermingsRegimeType =
  | 'beschermd_stadsgezicht' | 'beschermd_dorpsgezicht'
  | 'rijksmonument' | 'gemeentelijk_monument' | 'provinciaal_monument'
  | 'archeologisch_monument' | 'waterkering'
  | 'natura2000' | 'nnn_gebied' | 'grondwaterbeschermingsgebied'
  | 'geluidzone' | 'veiligheidszone' | 'milieuzone';

// ============================================================================
// BESLISBOOM INPUT/OUTPUT
// ============================================================================

export interface BeslisboomInput {
  // Aanvraag context
  activiteiten: ActiviteitType[];
  functies: {
    huidig: FunctieType;
    nieuw?: FunctieType;
  };
  
  // Locatie context
  locatie: {
    coordinates: [number, number];
    gemeente: string;
    provincie?: string;
  };
  
  // Beschermingsregimes
  beschermingsregimes: BeschermingsRegime[];
  
  // DSO conclusie (indien beschikbaar)
  dsoConclusieBasis?: DSOConclusieBasis;
  
  // Omgevingsplan regels (indien beschikbaar)
  omgevingsplanRegels?: OmgevingsplanRegel[];
  
  // Project details
  projectDetails?: {
    bouwjaar?: number;
    oppervlakteM2?: number;
    graafdiepteCm?: number;
    hoogteM?: number;
  };
}

export interface BeschermingsRegime {
  type: BeschermingsRegimeType;
  naam: string;
  bron: string;
  heeftExplicieteUitzondering: boolean;
  uitzonderingArtikel?: string;
  uitzonderingTekst?: string;
}

export interface DSOConclusieBasis {
  conclusie: 'vergunningplichtig' | 'meldingsplichtig' | 'vergunningvrij' | 'onbekend';
  bron: 'Bbl' | 'Bal' | 'omgevingsplan' | 'bruidsschat';
  artikel?: string;
  toelichting?: string;
}

export interface OmgevingsplanRegel {
  artikel: string;
  tekst: string;
  isExplicieteUitzondering: boolean;
  vanToepassing: boolean;
  beschermingsregimeType?: BeschermingsRegimeType;
}

// ============================================================================
// BESLISBOOM OUTPUT
// ============================================================================

export interface BeslisboomResultaat {
  // === VERGUNNINGPLICHT CONCLUSIE ===
  vergunningplicht: {
    conclusie: ProcedureType;
    motivering: string;
    juridischeGrondslag: string;
    termijnWeken: number;
    
    // Override informatie
    isOverride: boolean;
    overrideReden?: string;
    overrideBron?: string;
    
    // Beschermingsregimes
    beschermingsregimesContext: BeschermingsRegime[];
    beschermingsregimesDoorslaggevend: BeschermingsRegime[];
  };
  
  // === TOETSINGSKADERS ===
  toetsingskaders: {
    altijd: ToetsingskaderItem[];
    soms: ToetsingskaderItem[];
    nietVanToepassing: ToetsingskaderItem[];
  };
  
  // === DOORLOPEN STAPPEN ===
  stappen: BeslisboomStap[];
  
  // === RAPPORTAGE ===
  rapportageTekst: string;
}

export interface ToetsingskaderItem {
  naam: string;
  categorie: ToetsingsCategorie;
  reden: string;
  wettelijkeBasis?: string;
  prioriteit: number;
}

export interface BeslisboomStap {
  stap: number;
  titel: string;
  vraag: string;
  antwoord: string;
  toelichting: string;
}

// ============================================================================
// DE GOUDEN REGEL - TOETSINGSHIËRARCHIE
// ============================================================================

/**
 * Toetsingskaders die ALTIJD getoetst moeten worden
 * "Alles wat 'mag / moet / niet mag' bevat"
 */
const ALTIJD_TOETSEN: ToetsingskaderItem[] = [
  {
    naam: 'Omgevingsplanregels',
    categorie: 'altijd',
    reden: 'Bindende regels voor bestemming, bouwregels, gebruiksregels',
    wettelijkeBasis: 'Omgevingswet art. 5.1',
    prioriteit: 1
  },
  {
    naam: 'Bbl - Besluit bouwwerken leefomgeving',
    categorie: 'altijd',
    reden: 'Technische eisen voor constructie, brandveiligheid, gezondheid',
    wettelijkeBasis: 'Besluit bouwwerken leefomgeving',
    prioriteit: 2
  },
  {
    naam: 'Bal - Besluit activiteiten leefomgeving',
    categorie: 'altijd',
    reden: 'Milieuregels voor geluid, geur, emissies',
    wettelijkeBasis: 'Besluit activiteiten leefomgeving',
    prioriteit: 3
  },
  {
    naam: 'Bkl - Besluit kwaliteit leefomgeving',
    categorie: 'altijd',
    reden: 'Instructieregels voor ruimtelijke kwaliteit',
    wettelijkeBasis: 'Besluit kwaliteit leefomgeving',
    prioriteit: 4
  },
  {
    naam: 'Welstandsnota',
    categorie: 'altijd',
    reden: 'Bindende criteria voor uiterlijk bouwwerken',
    wettelijkeBasis: 'Omgevingswet art. 4.19',
    prioriteit: 5
  }
];

/**
 * Toetsingskaders die SOMS getoetst moeten worden
 * "Alles wat 'wenst / stimuleert / richting geeft', alleen als dat nodig is"
 */
const SOMS_TOETSEN: Record<string, ToetsingskaderItem> = {
  parkeerbeleid: {
    naam: 'Parkeerbeleid',
    categorie: 'soms',
    reden: 'Bij toename parkeerdruk of functiewijziging',
    wettelijkeBasis: 'Omgevingsplan (parapluregels)',
    prioriteit: 10
  },
  horecabeleid: {
    naam: 'Horecabeleid',
    categorie: 'soms',
    reden: 'Bij horeca-activiteiten',
    wettelijkeBasis: 'Gemeentelijk beleid',
    prioriteit: 11
  },
  erfgoedbeleid: {
    naam: 'Erfgoedbeleid',
    categorie: 'soms',
    reden: 'Bij monumenten of beschermd gezicht',
    wettelijkeBasis: 'Erfgoedwet / Omgevingsplan',
    prioriteit: 12
  },
  archeologiebeleid: {
    naam: 'Archeologiebeleid',
    categorie: 'soms',
    reden: 'Bij graafwerk in archeologisch waardevol gebied',
    wettelijkeBasis: 'Erfgoedwet art. 5.1',
    prioriteit: 13
  },
  groenbeleid: {
    naam: 'Groenbeleid',
    categorie: 'soms',
    reden: 'Bij kappen of aantasten groen',
    wettelijkeBasis: 'APV / Omgevingsplan',
    prioriteit: 14
  },
  waterbeleid: {
    naam: 'Waterbeleid',
    categorie: 'soms',
    reden: 'Bij waterkeringen of watergangen',
    wettelijkeBasis: 'Waterwet / Keur waterschap',
    prioriteit: 15
  },
  natuurbeleid: {
    naam: 'Natuurbeleid (Wnb)',
    categorie: 'soms',
    reden: 'Bij Natura 2000 of NNN-gebied',
    wettelijkeBasis: 'Wet natuurbescherming',
    prioriteit: 16
  },
  duurzaamheidsbeleid: {
    naam: 'Duurzaamheidsbeleid',
    categorie: 'soms',
    reden: 'Bij nieuwbouw of grote verbouw',
    wettelijkeBasis: 'Gemeentelijk beleid',
    prioriteit: 17
  },
  reclamebeleid: {
    naam: 'Reclamebeleid',
    categorie: 'soms',
    reden: 'Bij reclame-uitingen',
    wettelijkeBasis: 'APV / Omgevingsplan',
    prioriteit: 18
  },
  evenementenbeleid: {
    naam: 'Evenementenbeleid',
    categorie: 'soms',
    reden: 'Bij evenementen',
    wettelijkeBasis: 'APV / Gemeentelijk beleid',
    prioriteit: 19
  }
};

// ============================================================================
// PROCEDURE TERMIJNEN
// ============================================================================

const PROCEDURE_TERMIJNEN: Record<ProcedureType, { weken: number; verlenging: number | null }> = {
  vergunningvrij: { weken: 0, verlenging: null },
  meldingsplichtig: { weken: 4, verlenging: null },
  regulier: { weken: 8, verlenging: 6 },
  uitgebreid: { weken: 26, verlenging: 6 }
};

// ============================================================================
// HOOFDFUNCTIE: VOER BESLISBOOM UIT
// ============================================================================

/**
 * Voert de centrale beslisboom uit
 */
export function voerCentraleBeslisboomUit(input: BeslisboomInput): BeslisboomResultaat {
  const stappen: BeslisboomStap[] = [];
  let stapNummer = 0;
  
  // === STAP 1: BEPAAL BASISVERGUNNINGPLICHT ===
  stapNummer++;
  const basisConclusieDSO = input.dsoConclusieBasis?.conclusie || 'onbekend';
  const basisConclusie = basisConclusieDSO === 'onbekend' ? 
    bepaalBasisVergunningplicht(input) : 
    basisConclusieDSO;
  
  stappen.push({
    stap: stapNummer,
    titel: 'Basisvergunningplicht bepalen',
    vraag: 'Wat is de basisconclisie op grond van Bbl/Bal/Omgevingsplan?',
    antwoord: basisConclusie,
    toelichting: input.dsoConclusieBasis?.toelichting || 
      `Bepaald op basis van activiteiten: ${input.activiteiten.join(', ')}`
  });
  
  // === STAP 2: CHECK EXPLICIETE UITZONDERINGEN ===
  stapNummer++;
  const explicieteUitzonderingen = input.beschermingsregimes.filter(r => r.heeftExplicieteUitzondering);
  const heeftExplicieteUitzondering = explicieteUitzonderingen.length > 0;
  
  stappen.push({
    stap: stapNummer,
    titel: 'Expliciete uitzonderingen zoeken',
    vraag: 'Zijn er expliciete normstellende bepalingen die de vergunningvrijstelling uitsluiten?',
    antwoord: heeftExplicieteUitzondering ? 'Ja' : 'Nee',
    toelichting: heeftExplicieteUitzondering ?
      `Gevonden: ${explicieteUitzonderingen.map(r => `${r.naam} (${r.uitzonderingArtikel})`).join(', ')}` :
      'Geen expliciete uitzonderingen gevonden die vergunningvrijstelling uitsluiten'
  });
  
  // === STAP 3: BEPAAL FINALE CONCLUSIE ===
  stapNummer++;
  let finaleConclusieProcedure: ProcedureType;
  let isOverride = false;
  let overrideReden: string | undefined;
  let overrideBron: string | undefined;
  
  if (basisConclusie === 'vergunningvrij' && heeftExplicieteUitzondering) {
    // Override: vergunningvrij wordt vergunningplichtig
    finaleConclusieProcedure = 'regulier';
    isOverride = true;
    const eersteUitzondering = explicieteUitzonderingen[0];
    overrideReden = eersteUitzondering.uitzonderingTekst || 
      `Expliciete uitzondering in ${eersteUitzondering.bron}`;
    overrideBron = eersteUitzondering.uitzonderingArtikel || eersteUitzondering.bron;
  } else if (basisConclusie === 'vergunningplichtig') {
    // Bepaal of regulier of uitgebreid
    finaleConclusieProcedure = bepaalProcedureType(input);
  } else if (basisConclusie === 'meldingsplichtig') {
    finaleConclusieProcedure = 'meldingsplichtig';
  } else {
    finaleConclusieProcedure = 'vergunningvrij';
  }
  
  stappen.push({
    stap: stapNummer,
    titel: 'Finale conclusie bepalen',
    vraag: 'Wat is de finale vergunningplicht na afweging van alle factoren?',
    antwoord: finaleConclusieProcedure.toUpperCase(),
    toelichting: isOverride ?
      `Override toegepast: ${overrideReden}` :
      `Geen override nodig, basisconclisie blijft van kracht`
  });
  
  // === STAP 4: BEPAAL TOETSINGSKADERS ===
  stapNummer++;
  const toetsingskaders = bepaalToetsingskaders(input);
  
  stappen.push({
    stap: stapNummer,
    titel: 'Toetsingskaders bepalen (Gouden Regel)',
    vraag: 'Welke toetsingskaders zijn van toepassing?',
    antwoord: `${toetsingskaders.altijd.length} verplicht, ${toetsingskaders.soms.length} optioneel`,
    toelichting: 'Bepaald volgens de Gouden Regel: "mag/moet/niet mag" = ALTIJD, "wenst/stimuleert" = SOMS'
  });
  
  // === STAP 5: BESCHERMINGSREGIMES CATEGORISEREN ===
  stapNummer++;
  const beschermingsregimesContext = input.beschermingsregimes.filter(r => !r.heeftExplicieteUitzondering);
  const beschermingsregimesDoorslaggevend = input.beschermingsregimes.filter(r => r.heeftExplicieteUitzondering);
  
  stappen.push({
    stap: stapNummer,
    titel: 'Beschermingsregimes categoriseren',
    vraag: 'Welke beschermingsregimes zijn context en welke zijn doorslaggevend?',
    antwoord: `${beschermingsregimesContext.length} context, ${beschermingsregimesDoorslaggevend.length} doorslaggevend`,
    toelichting: beschermingsregimesDoorslaggevend.length > 0 ?
      `Doorslaggevend: ${beschermingsregimesDoorslaggevend.map(r => r.naam).join(', ')}` :
      'Alle beschermingsregimes zijn alleen context (geen expliciete uitzonderingen)'
  });
  
  // === GENEREER RAPPORTAGE TEKST ===
  const rapportageTekst = genereerRapportageTekst(
    finaleConclusieProcedure,
    isOverride,
    overrideReden,
    overrideBron,
    beschermingsregimesContext,
    beschermingsregimesDoorslaggevend,
    input
  );
  
  // === BEPAAL JURIDISCHE GRONDSLAG ===
  const juridischeGrondslag = bepaalJuridischeGrondslag(
    finaleConclusieProcedure,
    input.dsoConclusieBasis,
    isOverride,
    overrideBron
  );
  
  return {
    vergunningplicht: {
      conclusie: finaleConclusieProcedure,
      motivering: rapportageTekst,
      juridischeGrondslag,
      termijnWeken: PROCEDURE_TERMIJNEN[finaleConclusieProcedure].weken,
      isOverride,
      overrideReden,
      overrideBron,
      beschermingsregimesContext,
      beschermingsregimesDoorslaggevend
    },
    toetsingskaders,
    stappen,
    rapportageTekst
  };
}

// ============================================================================
// HELPER FUNCTIES
// ============================================================================

/**
 * Bepaal basisvergunningplicht op basis van activiteiten
 */
function bepaalBasisVergunningplicht(input: BeslisboomInput): 'vergunningplichtig' | 'meldingsplichtig' | 'vergunningvrij' {
  // Activiteiten die altijd vergunningplichtig zijn
  const altijdVergunningplichtig = ['monument_wijzigen'];
  if (input.activiteiten.some(a => altijdVergunningplichtig.includes(a))) {
    return 'vergunningplichtig';
  }
  
  // Activiteiten die vaak meldingsplichtig zijn
  const vaakMeldingsplichtig = ['slopen', 'gebruikswijziging'];
  if (input.activiteiten.some(a => vaakMeldingsplichtig.includes(a))) {
    return 'meldingsplichtig';
  }
  
  // Kleine bouwwerken kunnen vergunningvrij zijn
  const kleineBouwwerken = ['uitbouwen', 'aanbouwen'];
  if (input.activiteiten.every(a => kleineBouwwerken.includes(a))) {
    // Check oppervlakte
    if (input.projectDetails?.oppervlakteM2 && input.projectDetails.oppervlakteM2 <= 30) {
      return 'vergunningvrij';
    }
  }
  
  // Default: vergunningplichtig
  return 'vergunningplichtig';
}

/**
 * Bepaal procedure type (regulier vs uitgebreid)
 */
function bepaalProcedureType(input: BeslisboomInput): ProcedureType {
  // Uitgebreide procedure bij:
  // - BOPA (buitenplanse omgevingsplanactiviteit)
  // - Rijksmonument
  // - Natura 2000
  const uitgebreideTriggers = ['rijksmonument', 'natura2000'];
  if (input.beschermingsregimes.some(r => uitgebreideTriggers.includes(r.type))) {
    return 'uitgebreid';
  }
  
  // Grote projecten
  if (input.projectDetails?.oppervlakteM2 && input.projectDetails.oppervlakteM2 > 1000) {
    return 'uitgebreid';
  }
  
  return 'regulier';
}

/**
 * Bepaal welke toetsingskaders van toepassing zijn
 */
function bepaalToetsingskaders(input: BeslisboomInput): {
  altijd: ToetsingskaderItem[];
  soms: ToetsingskaderItem[];
  nietVanToepassing: ToetsingskaderItem[];
} {
  const altijd = [...ALTIJD_TOETSEN];
  const soms: ToetsingskaderItem[] = [];
  const nietVanToepassing: ToetsingskaderItem[] = [];
  
  // Check parkeerbeleid
  if (input.activiteiten.includes('gebruikswijziging') || 
      input.functies.nieuw !== input.functies.huidig ||
      input.activiteiten.includes('bouwen')) {
    soms.push(SOMS_TOETSEN.parkeerbeleid);
  } else {
    nietVanToepassing.push({...SOMS_TOETSEN.parkeerbeleid, reden: 'Geen toename parkeerdruk verwacht'});
  }
  
  // Check horecabeleid
  if (input.functies.nieuw === 'horeca' || input.functies.huidig === 'horeca') {
    soms.push(SOMS_TOETSEN.horecabeleid);
  }
  
  // Check erfgoedbeleid
  const erfgoedRegimes = ['rijksmonument', 'gemeentelijk_monument', 'provinciaal_monument', 
                          'beschermd_stadsgezicht', 'beschermd_dorpsgezicht'];
  if (input.beschermingsregimes.some(r => erfgoedRegimes.includes(r.type))) {
    soms.push(SOMS_TOETSEN.erfgoedbeleid);
  }
  
  // Check archeologiebeleid
  if (input.beschermingsregimes.some(r => r.type === 'archeologisch_monument') ||
      (input.projectDetails?.graafdiepteCm && input.projectDetails.graafdiepteCm > 30)) {
    soms.push(SOMS_TOETSEN.archeologiebeleid);
  }
  
  // Check groenbeleid
  if (input.activiteiten.includes('kappen')) {
    soms.push(SOMS_TOETSEN.groenbeleid);
  }
  
  // Check waterbeleid
  if (input.beschermingsregimes.some(r => r.type === 'waterkering')) {
    soms.push(SOMS_TOETSEN.waterbeleid);
  }
  
  // Check natuurbeleid
  if (input.beschermingsregimes.some(r => r.type === 'natura2000' || r.type === 'nnn_gebied')) {
    soms.push(SOMS_TOETSEN.natuurbeleid);
  }
  
  // Check duurzaamheidsbeleid
  if (input.activiteiten.includes('bouwen') && 
      input.projectDetails?.oppervlakteM2 && input.projectDetails.oppervlakteM2 > 100) {
    soms.push(SOMS_TOETSEN.duurzaamheidsbeleid);
  }
  
  // Check reclamebeleid
  if (input.activiteiten.includes('reclame')) {
    soms.push(SOMS_TOETSEN.reclamebeleid);
  }
  
  // Check evenementenbeleid
  if (input.activiteiten.includes('evenement')) {
    soms.push(SOMS_TOETSEN.evenementenbeleid);
  }
  
  return { altijd, soms, nietVanToepassing };
}

/**
 * Genereer rapportage tekst
 */
function genereerRapportageTekst(
  conclusie: ProcedureType,
  isOverride: boolean,
  overrideReden: string | undefined,
  overrideBron: string | undefined,
  beschermingsregimesContext: BeschermingsRegime[],
  beschermingsregimesDoorslaggevend: BeschermingsRegime[],
  input: BeslisboomInput
): string {
  let tekst = '';
  
  if (conclusie === 'vergunningvrij') {
    tekst = `De aangevraagde activiteit (${input.activiteiten.join(', ')}) is **vergunningvrij** `;
    tekst += `op grond van de geldende regelgeving. `;
    
    if (beschermingsregimesContext.length > 0) {
      tekst += `\n\nDe locatie ligt binnen ${beschermingsregimesContext.map(r => r.naam).join(', ')}. `;
      tekst += `Deze beschermingsregimes vormen relevante context maar bevatten geen expliciete bepalingen `;
      tekst += `die de vergunningvrijstelling voor deze specifieke activiteit uitsluiten.`;
    }
  } else if (isOverride) {
    tekst = `De aangevraagde activiteit zou op grond van het Bbl/omgevingsplan vergunningvrij zijn, `;
    tekst += `maar is **${conclusie}** vanwege een expliciete uitzondering.\n\n`;
    tekst += `**Reden override:** ${overrideReden}\n`;
    tekst += `**Juridische grondslag:** ${overrideBron}`;
    
    if (beschermingsregimesDoorslaggevend.length > 0) {
      tekst += `\n\n**Doorslaggevende beschermingsregimes:**\n`;
      beschermingsregimesDoorslaggevend.forEach(r => {
        tekst += `- ${r.naam}: ${r.uitzonderingTekst || 'Expliciete uitzondering van toepassing'}\n`;
      });
    }
  } else {
    tekst = `De aangevraagde activiteit (${input.activiteiten.join(', ')}) is **${conclusie}**. `;
    tekst += `De ${conclusie === 'regulier' ? 'reguliere procedure (8 weken)' : 
              conclusie === 'uitgebreid' ? 'uitgebreide procedure (26 weken)' : 
              'meldingsprocedure (4 weken)'} is van toepassing.`;
  }
  
  return tekst;
}

/**
 * Bepaal juridische grondslag
 */
function bepaalJuridischeGrondslag(
  conclusie: ProcedureType,
  dsoConclusieBasis: DSOConclusieBasis | undefined,
  isOverride: boolean,
  overrideBron: string | undefined
): string {
  if (isOverride && overrideBron) {
    return overrideBron;
  }
  
  if (dsoConclusieBasis?.artikel) {
    return `${dsoConclusieBasis.bron} art. ${dsoConclusieBasis.artikel}`;
  }
  
  switch (conclusie) {
    case 'vergunningvrij':
      return 'Bbl art. 2.27 / Omgevingsplan';
    case 'meldingsplichtig':
      return 'Bbl art. 2.17 / Bal';
    case 'regulier':
      return 'Omgevingswet art. 5.1 lid 1';
    case 'uitgebreid':
      return 'Omgevingswet art. 16.65';
    default:
      return 'Omgevingswet';
  }
}

// ============================================================================
// EXPORT FUNCTIES VOOR BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Format beslisboom resultaat voor AI context
 */
export function formatCentraleBeslisboomVoorAI(resultaat: BeslisboomResultaat): string {
  let output = '## Centrale Beslisboom Analyse\n\n';
  
  // Vergunningplicht
  output += `### Vergunningplicht: ${resultaat.vergunningplicht.conclusie.toUpperCase()}\n`;
  output += `**Juridische grondslag:** ${resultaat.vergunningplicht.juridischeGrondslag}\n`;
  output += `**Termijn:** ${resultaat.vergunningplicht.termijnWeken} weken\n\n`;
  
  if (resultaat.vergunningplicht.isOverride) {
    output += `⚠️ **Override toegepast**\n`;
    output += `- Reden: ${resultaat.vergunningplicht.overrideReden}\n`;
    output += `- Bron: ${resultaat.vergunningplicht.overrideBron}\n\n`;
  }
  
  // Toetsingskaders
  output += `### Toetsingskaders (Gouden Regel)\n\n`;
  output += `**ALTIJD toetsen (${resultaat.toetsingskaders.altijd.length}):**\n`;
  resultaat.toetsingskaders.altijd.forEach(k => {
    output += `- ${k.naam} (${k.wettelijkeBasis})\n`;
  });
  
  if (resultaat.toetsingskaders.soms.length > 0) {
    output += `\n**SOMS toetsen (${resultaat.toetsingskaders.soms.length}):**\n`;
    resultaat.toetsingskaders.soms.forEach(k => {
      output += `- ${k.naam}: ${k.reden}\n`;
    });
  }
  
  // Beschermingsregimes
  if (resultaat.vergunningplicht.beschermingsregimesContext.length > 0) {
    output += `\n### Beschermingsregimes (context)\n`;
    resultaat.vergunningplicht.beschermingsregimesContext.forEach(r => {
      output += `- ${r.naam} (${r.bron})\n`;
    });
  }
  
  if (resultaat.vergunningplicht.beschermingsregimesDoorslaggevend.length > 0) {
    output += `\n### Beschermingsregimes (doorslaggevend)\n`;
    resultaat.vergunningplicht.beschermingsregimesDoorslaggevend.forEach(r => {
      output += `- ${r.naam}: ${r.uitzonderingArtikel}\n`;
    });
  }
  
  // Doorlopen stappen
  output += `\n### Doorlopen stappen (${resultaat.stappen.length})\n`;
  resultaat.stappen.forEach(s => {
    output += `${s.stap}. **${s.titel}**: ${s.antwoord}\n`;
  });
  
  return output;
}
