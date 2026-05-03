/**
 * Milieutoets Signalering Service
 * 
 * Automatisch signaleren wanneer milieutoetsing nodig is en welke thema's relevant zijn.
 * Gebaseerd op de Omgevingswet, Besluit activiteiten leefomgeving (Bal) en Besluit kwaliteit leefomgeving (Bkl).
 */

// Types voor milieutoets signalering
export interface MilieuToetsResultaat {
  isToetsNodig: boolean;
  activiteitType: ActiviteitType;
  relevanteThemas: MilieuThema[];
  balBklRegels: RegelVerwijzing[];
  merBeoordeling: MerBeoordeling;
  bopaMotivering: BopaMotivering | null;
  checklist: ChecklistItem[];
  samenvatting: string;
}

export type ActiviteitType = 
  | 'bouwactiviteit'
  | 'milieubelastende_activiteit'
  | 'wijziging_gebruik'
  | 'bopa'
  | 'combinatie'
  | 'geen_milieugevolgen';

export interface MilieuThema {
  naam: string;
  code: 'geluid' | 'lucht' | 'bodem' | 'water' | 'natuur' | 'veiligheid' | 'geur' | 'energie' | 'afval';
  isRelevant: boolean;
  reden: string;
  prioriteit: 'hoog' | 'middel' | 'laag';
  regelverwijzingen: RegelVerwijzing[];
}

export interface RegelVerwijzing {
  bron: 'Bal' | 'Bkl' | 'Omgevingsregeling' | 'Omgevingsplan' | 'EU-richtlijn';
  artikel: string;
  titel: string;
  url: string;
  samenvatting: string;
}

export interface MerBeoordeling {
  isNodig: boolean;
  reden: string;
  drempelwaarden: DrempelWaarde[];
  aanbeveling: string;
}

export interface DrempelWaarde {
  criterium: string;
  drempel: string;
  actueleWaarde: string | null;
  overschreden: boolean | null;
}

export interface BopaMotivering {
  isVanToepassing: boolean;
  afwijkingVan: string;
  integraleBelangafweging: string[];
  milieuAspecten: string[];
}

export interface ChecklistItem {
  categorie: string;
  item: string;
  status: 'verplicht' | 'aanbevolen' | 'optioneel';
  toelichting: string;
  regelgrondslag: string;
}

// Milieubelastende activiteiten volgens Bal hoofdstuk 3
const MILIEUBELASTENDE_ACTIVITEITEN = [
  { code: 'bedrijf', keywords: ['bedrijf', 'industrie', 'productie', 'fabriek', 'werkplaats'], balHoofdstuk: '3.2' },
  { code: 'horeca', keywords: ['horeca', 'restaurant', 'café', 'hotel', 'eetgelegenheid', 'bar'], balHoofdstuk: '3.3' },
  { code: 'agrarisch', keywords: ['agrarisch', 'boerderij', 'veehouderij', 'landbouw', 'kas', 'stal'], balHoofdstuk: '3.4' },
  { code: 'opslag', keywords: ['opslag', 'gevaarlijke stoffen', 'brandstof', 'chemisch', 'tank'], balHoofdstuk: '3.5' },
  { code: 'afval', keywords: ['afval', 'recycling', 'verwerking', 'storten'], balHoofdstuk: '3.6' },
  { code: 'energie', keywords: ['energie', 'windturbine', 'zonnepanelen', 'biomassa', 'warmtepomp'], balHoofdstuk: '3.7' },
  { code: 'transport', keywords: ['transport', 'logistiek', 'distributie', 'laden', 'lossen'], balHoofdstuk: '3.8' },
  { code: 'recreatie', keywords: ['recreatie', 'evenement', 'festival', 'camping', 'attractie'], balHoofdstuk: '3.9' },
];

// Thema-specifieke triggers
const THEMA_TRIGGERS: Record<string, { keywords: string[], balArtikelen: string[], bklArtikelen: string[] }> = {
  geluid: {
    keywords: ['geluid', 'lawaai', 'decibel', 'db', 'installatie', 'ventilatie', 'airco', 'muziek', 'machine'],
    balArtikelen: ['4.1', '4.2', '4.3'],
    bklArtikelen: ['3.1', '3.2'],
  },
  lucht: {
    keywords: ['lucht', 'emissie', 'uitstoot', 'fijnstof', 'stikstof', 'geur', 'rook', 'damp'],
    balArtikelen: ['4.4', '4.5'],
    bklArtikelen: ['3.3', '3.4'],
  },
  bodem: {
    keywords: ['bodem', 'grond', 'graven', 'fundering', 'sanering', 'verontreiniging', 'ondergronds'],
    balArtikelen: ['4.6', '4.7'],
    bklArtikelen: ['3.5', '3.6'],
  },
  water: {
    keywords: ['water', 'lozing', 'afvalwater', 'grondwater', 'oppervlaktewater', 'riool', 'drainage'],
    balArtikelen: ['4.8', '4.9', '4.10'],
    bklArtikelen: ['3.7', '3.8'],
  },
  natuur: {
    keywords: ['natuur', 'flora', 'fauna', 'beschermde soorten', 'habitat', 'ecologie', 'groen'],
    balArtikelen: ['4.11', '4.12'],
    bklArtikelen: ['3.9', '3.10'],
  },
  veiligheid: {
    keywords: ['veiligheid', 'brand', 'explosie', 'gevaar', 'risico', 'calamiteit', 'nooduitgang'],
    balArtikelen: ['4.13', '4.14'],
    bklArtikelen: ['3.11', '3.12'],
  },
  geur: {
    keywords: ['geur', 'stank', 'geurhinder', 'geurcontour', 'geurbelasting'],
    balArtikelen: ['4.15'],
    bklArtikelen: ['3.13'],
  },
  energie: {
    keywords: ['energie', 'duurzaamheid', 'isolatie', 'epc', 'beng', 'warmte', 'koeling'],
    balArtikelen: ['4.16', '4.17'],
    bklArtikelen: ['3.14'],
  },
  afval: {
    keywords: ['afval', 'afvoer', 'scheiding', 'container', 'vuilnis'],
    balArtikelen: ['4.18'],
    bklArtikelen: ['3.15'],
  },
};

// MER drempelwaarden (vereenvoudigd)
const MER_DREMPELWAARDEN = [
  { criterium: 'Woningen', drempel: '> 2000 woningen', categorie: 'stedelijk' },
  { criterium: 'Bedrijventerrein', drempel: '> 150 hectare', categorie: 'industrie' },
  { criterium: 'Winkelcentrum', drempel: '> 200.000 m² bvo', categorie: 'detailhandel' },
  { criterium: 'Parkeerplaatsen', drempel: '> 2000 plaatsen', categorie: 'verkeer' },
  { criterium: 'Windturbines', drempel: '> 3 turbines of > 15 MW', categorie: 'energie' },
  { criterium: 'Veehouderij', drempel: 'Afhankelijk van diersoort', categorie: 'agrarisch' },
];

/**
 * Bepaal het activiteittype op basis van de aanvraag
 */
function bepaalActiviteitType(
  activiteiten: string[],
  omschrijving: string,
  isBopa: boolean
): ActiviteitType {
  const tekst = [...activiteiten, omschrijving].join(' ').toLowerCase();
  
  // Check voor BOPA
  if (isBopa) {
    return 'bopa';
  }
  
  // Check voor milieubelastende activiteiten
  const isMilieubelastend = MILIEUBELASTENDE_ACTIVITEITEN.some(act => 
    act.keywords.some(kw => tekst.includes(kw))
  );
  
  // Check voor bouwactiviteit
  const isBouw = ['bouwen', 'bouw', 'nieuwbouw', 'uitbreiding', 'verbouw', 'aanbouw', 'dakkapel', 'kozijn']
    .some(kw => tekst.includes(kw));
  
  // Check voor wijziging gebruik
  const isGebruikswijziging = ['functiewijziging', 'gebruikswijziging', 'omzetting', 'transformatie']
    .some(kw => tekst.includes(kw));
  
  if (isMilieubelastend && isBouw) return 'combinatie';
  if (isMilieubelastend) return 'milieubelastende_activiteit';
  if (isGebruikswijziging) return 'wijziging_gebruik';
  if (isBouw) return 'bouwactiviteit';
  
  return 'geen_milieugevolgen';
}

/**
 * Identificeer relevante milieuthema's
 */
function identificeerMilieuThemas(
  activiteiten: string[],
  omschrijving: string,
  activiteitType: ActiviteitType
): MilieuThema[] {
  const tekst = [...activiteiten, omschrijving].join(' ').toLowerCase();
  const themas: MilieuThema[] = [];
  
  for (const [themaCode, config] of Object.entries(THEMA_TRIGGERS)) {
    const isRelevant = config.keywords.some(kw => tekst.includes(kw));
    const prioriteit = bepaalPrioriteit(themaCode, activiteitType, isRelevant);
    
    // Bepaal reden
    let reden = '';
    if (isRelevant) {
      const gevondenKeywords = config.keywords.filter(kw => tekst.includes(kw));
      reden = `Aanvraag bevat termen gerelateerd aan ${themaCode}: ${gevondenKeywords.join(', ')}`;
    } else if (activiteitType === 'bouwactiviteit') {
      reden = `Standaard toets bij bouwactiviteiten`;
    } else if (activiteitType === 'bopa') {
      reden = `Verplicht onderdeel van integrale belangenafweging bij BOPA`;
    }
    
    // Genereer regelverwijzingen
    const regelverwijzingen: RegelVerwijzing[] = [];
    
    for (const artikel of config.balArtikelen) {
      regelverwijzingen.push({
        bron: 'Bal',
        artikel: `Artikel ${artikel}`,
        titel: `${themaCode.charAt(0).toUpperCase() + themaCode.slice(1)} - Bal`,
        url: `https://wetten.overheid.nl/BWBR0044328/zoeken?artikel=${artikel}`,
        samenvatting: `Regels voor ${themaCode} bij milieubelastende activiteiten`,
      });
    }
    
    for (const artikel of config.bklArtikelen) {
      regelverwijzingen.push({
        bron: 'Bkl',
        artikel: `Artikel ${artikel}`,
        titel: `${themaCode.charAt(0).toUpperCase() + themaCode.slice(1)} - Bkl`,
        url: `https://wetten.overheid.nl/BWBR0044329/zoeken?artikel=${artikel}`,
        samenvatting: `Kwaliteitseisen voor ${themaCode}`,
      });
    }
    
    themas.push({
      naam: themaCode.charAt(0).toUpperCase() + themaCode.slice(1),
      code: themaCode as MilieuThema['code'],
      isRelevant: isRelevant || activiteitType === 'bopa' || (activiteitType === 'bouwactiviteit' && ['geluid', 'bodem', 'energie'].includes(themaCode)),
      reden,
      prioriteit,
      regelverwijzingen,
    });
  }
  
  return themas;
}

/**
 * Bepaal prioriteit van een thema
 */
function bepaalPrioriteit(
  themaCode: string,
  activiteitType: ActiviteitType,
  isExplicietRelevant: boolean
): 'hoog' | 'middel' | 'laag' {
  if (isExplicietRelevant) return 'hoog';
  
  // Standaard hoge prioriteit thema's per activiteittype
  const hogePrioriteit: Record<string, string[]> = {
    bouwactiviteit: ['geluid', 'bodem', 'energie'],
    milieubelastende_activiteit: ['geluid', 'lucht', 'geur', 'veiligheid'],
    wijziging_gebruik: ['geluid', 'geur', 'veiligheid'],
    bopa: ['geluid', 'lucht', 'bodem', 'water', 'natuur', 'veiligheid'],
    combinatie: ['geluid', 'lucht', 'bodem', 'veiligheid'],
  };
  
  if (hogePrioriteit[activiteitType]?.includes(themaCode)) return 'middel';
  
  return 'laag';
}

/**
 * Beoordeel of MER nodig is
 */
function beoordeelMER(
  activiteiten: string[],
  omschrijving: string,
  oppervlakte: number | null,
  aantalWoningen: number | null
): MerBeoordeling {
  const drempelwaarden: DrempelWaarde[] = [];
  let isNodig = false;
  let reden = '';
  
  // Check woningen drempel
  if (aantalWoningen !== null) {
    const overschreden = aantalWoningen > 2000;
    drempelwaarden.push({
      criterium: 'Aantal woningen',
      drempel: '> 2000 woningen',
      actueleWaarde: `${aantalWoningen} woningen`,
      overschreden,
    });
    if (overschreden) {
      isNodig = true;
      reden = 'Project overschrijdt drempelwaarde voor woningbouw (> 2000 woningen)';
    }
  }
  
  // Check oppervlakte drempel
  if (oppervlakte !== null) {
    const overschreden = oppervlakte > 150 * 10000; // 150 hectare in m²
    drempelwaarden.push({
      criterium: 'Oppervlakte bedrijventerrein',
      drempel: '> 150 hectare',
      actueleWaarde: `${(oppervlakte / 10000).toFixed(1)} hectare`,
      overschreden,
    });
    if (overschreden) {
      isNodig = true;
      reden = 'Project overschrijdt drempelwaarde voor oppervlakte (> 150 hectare)';
    }
  }
  
  // Standaard drempelwaarden toevoegen zonder actuele waarde
  for (const drempel of MER_DREMPELWAARDEN) {
    if (!drempelwaarden.some(d => d.criterium === drempel.criterium)) {
      drempelwaarden.push({
        criterium: drempel.criterium,
        drempel: drempel.drempel,
        actueleWaarde: null,
        overschreden: null,
      });
    }
  }
  
  return {
    isNodig,
    reden: reden || 'Geen drempelwaarden overschreden op basis van beschikbare gegevens',
    drempelwaarden,
    aanbeveling: isNodig 
      ? 'MER-plicht: Milieueffectrapportage is verplicht. Start MER-procedure.'
      : 'Geen MER-plicht vastgesteld. Overweeg MER-beoordeling bij twijfel over aanzienlijke milieugevolgen.',
  };
}

/**
 * Genereer BOPA motivering
 */
function genereerBopaMotivering(
  activiteiten: string[],
  omschrijving: string,
  relevanteThemas: MilieuThema[],
  isBopa: boolean
): BopaMotivering | null {
  const tekst = [...activiteiten, omschrijving].join(' ').toLowerCase();
  
  // Check of het een BOPA betreft (expliciet meegegeven of uit tekst)
  const isBopaIndicatie = isBopa || ['bopa', 'buitenplans', 'afwijking', 'afwijken'].some(kw => tekst.includes(kw));
  
  if (!isBopaIndicatie) return null;
  
  const hogeprioriteit = relevanteThemas.filter(t => t.prioriteit === 'hoog' || t.prioriteit === 'middel');
  
  return {
    isVanToepassing: true,
    afwijkingVan: 'Omgevingsplan (nader te specificeren)',
    integraleBelangafweging: [
      'Ruimtelijke inpassing en stedenbouwkundige aspecten',
      'Verkeer en parkeren',
      'Milieuhygiënische aanvaardbaarheid',
      'Economische uitvoerbaarheid',
      'Maatschappelijke uitvoerbaarheid',
    ],
    milieuAspecten: hogeprioriteit.map(t => `${t.naam}: ${t.reden}`),
  };
}

/**
 * Genereer checklist voor behandelaar
 */
function genereerChecklist(
  activiteitType: ActiviteitType,
  relevanteThemas: MilieuThema[],
  merBeoordeling: MerBeoordeling
): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];
  
  // Algemene items
  checklist.push({
    categorie: 'Algemeen',
    item: 'Controleer of alle relevante milieuaspecten zijn geïdentificeerd',
    status: 'verplicht',
    toelichting: 'Vergelijk de aanvraag met de geïdentificeerde milieuthema\'s',
    regelgrondslag: 'Artikel 8.0a Bkl',
  });
  
  // Activiteittype-specifieke items
  if (activiteitType === 'bouwactiviteit') {
    checklist.push({
      categorie: 'Bouwactiviteit',
      item: 'Controleer bodemkwaliteit (historisch bodemonderzoek)',
      status: 'verplicht',
      toelichting: 'Bij bouwen is bodemonderzoek vaak vereist',
      regelgrondslag: 'Artikel 4.1225 Bal',
    });
    checklist.push({
      categorie: 'Bouwactiviteit',
      item: 'Controleer geluidseisen voor installaties (ventilatie, warmtepomp)',
      status: 'aanbevolen',
      toelichting: 'Nieuwe installaties moeten voldoen aan geluidsnormen',
      regelgrondslag: 'Artikel 4.77 Bal',
    });
    checklist.push({
      categorie: 'Bouwactiviteit',
      item: 'Controleer energieprestatie-eisen (BENG)',
      status: 'verplicht',
      toelichting: 'Nieuwbouw moet voldoen aan BENG-eisen',
      regelgrondslag: 'Artikel 4.149 Bbl',
    });
  }
  
  if (activiteitType === 'milieubelastende_activiteit' || activiteitType === 'combinatie') {
    checklist.push({
      categorie: 'Milieubelastende activiteit',
      item: 'Identificeer van toepassing zijnde Bal-regels',
      status: 'verplicht',
      toelichting: 'Bepaal welke hoofdstukken van het Bal van toepassing zijn',
      regelgrondslag: 'Hoofdstuk 3 Bal',
    });
    checklist.push({
      categorie: 'Milieubelastende activiteit',
      item: 'Controleer of melding of vergunning vereist is',
      status: 'verplicht',
      toelichting: 'Sommige activiteiten zijn meldingsplichtig, andere vergunningplichtig',
      regelgrondslag: 'Artikel 2.8 Bal',
    });
  }
  
  if (activiteitType === 'wijziging_gebruik') {
    checklist.push({
      categorie: 'Wijziging gebruik',
      item: 'Beoordeel milieuhygiënische aanvaardbaarheid nieuw gebruik',
      status: 'verplicht',
      toelichting: 'Toets of het nieuwe gebruik milieuhygiënisch aanvaardbaar is',
      regelgrondslag: 'Artikel 5.1 Omgevingswet',
    });
    checklist.push({
      categorie: 'Wijziging gebruik',
      item: 'Controleer geurcontouren bij gevoelige functies',
      status: 'aanbevolen',
      toelichting: 'Bij wonen nabij bedrijven: check geurbelasting',
      regelgrondslag: 'Artikel 5.90 Bkl',
    });
  }
  
  if (activiteitType === 'bopa') {
    checklist.push({
      categorie: 'BOPA',
      item: 'Voer integrale belangenafweging uit',
      status: 'verplicht',
      toelichting: 'Bij BOPA is een volledige belangenafweging verplicht',
      regelgrondslag: 'Artikel 8.0a Bkl',
    });
    checklist.push({
      categorie: 'BOPA',
      item: 'Motiveer afweging per milieuaspect',
      status: 'verplicht',
      toelichting: 'Elk relevant milieuaspect moet worden afgewogen en gemotiveerd',
      regelgrondslag: 'Artikel 3:46 Awb',
    });
  }
  
  // Thema-specifieke items
  for (const thema of relevanteThemas.filter(t => t.isRelevant)) {
    checklist.push({
      categorie: thema.naam,
      item: `Toets aan ${thema.naam.toLowerCase()}regels`,
      status: thema.prioriteit === 'hoog' ? 'verplicht' : 'aanbevolen',
      toelichting: thema.reden,
      regelgrondslag: thema.regelverwijzingen[0]?.artikel || 'Zie Bal/Bkl',
    });
  }
  
  // MER item
  if (merBeoordeling.isNodig) {
    checklist.push({
      categorie: 'MER',
      item: 'Start MER-procedure',
      status: 'verplicht',
      toelichting: merBeoordeling.reden,
      regelgrondslag: 'Bijlage V Omgevingsbesluit',
    });
  } else {
    checklist.push({
      categorie: 'MER',
      item: 'Beoordeel of MER-beoordeling nodig is',
      status: 'aanbevolen',
      toelichting: 'Bij twijfel over aanzienlijke milieugevolgen: voer MER-beoordeling uit',
      regelgrondslag: 'Artikel 16.43 Omgevingswet',
    });
  }
  
  return checklist;
}

/**
 * Genereer Bal/Bkl regelverwijzingen
 */
function genereerBalBklRegels(
  activiteitType: ActiviteitType,
  relevanteThemas: MilieuThema[]
): RegelVerwijzing[] {
  const regels: RegelVerwijzing[] = [];
  
  // Algemene regels
  regels.push({
    bron: 'Bal',
    artikel: 'Hoofdstuk 2',
    titel: 'Algemene bepalingen milieubelastende activiteiten',
    url: 'https://wetten.overheid.nl/BWBR0044328/Hoofdstuk2',
    samenvatting: 'Algemene regels die gelden voor alle milieubelastende activiteiten',
  });
  
  regels.push({
    bron: 'Bkl',
    artikel: 'Hoofdstuk 5',
    titel: 'Omgevingswaarden en instructieregels',
    url: 'https://wetten.overheid.nl/BWBR0044329/Hoofdstuk5',
    samenvatting: 'Kwaliteitseisen voor de fysieke leefomgeving',
  });
  
  // Activiteittype-specifieke regels
  if (activiteitType === 'milieubelastende_activiteit' || activiteitType === 'combinatie') {
    regels.push({
      bron: 'Bal',
      artikel: 'Hoofdstuk 3',
      titel: 'Milieubelastende activiteiten',
      url: 'https://wetten.overheid.nl/BWBR0044328/Hoofdstuk3',
      samenvatting: 'Specifieke regels per type milieubelastende activiteit',
    });
  }
  
  // Thema-specifieke regels
  for (const thema of relevanteThemas.filter(t => t.isRelevant)) {
    regels.push(...thema.regelverwijzingen);
  }
  
  // Deduplicate
  const uniqueRegels = regels.filter((regel, index, self) =>
    index === self.findIndex(r => r.artikel === regel.artikel && r.bron === regel.bron)
  );
  
  return uniqueRegels;
}

/**
 * Hoofdfunctie: Voer milieutoets signalering uit
 */
export function voerMilieuToetsSignaleringUit(
  activiteiten: string[],
  omschrijving: string,
  isBopa: boolean = false,
  oppervlakte: number | null = null,
  aantalWoningen: number | null = null
): MilieuToetsResultaat {
  // Stap 1: Bepaal activiteittype
  const activiteitType = bepaalActiviteitType(activiteiten, omschrijving, isBopa);
  
  // Stap 2: Identificeer relevante milieuthema's
  const relevanteThemas = identificeerMilieuThemas(activiteiten, omschrijving, activiteitType);
  
  // Stap 3: Beoordeel MER-plicht
  const merBeoordeling = beoordeelMER(activiteiten, omschrijving, oppervlakte, aantalWoningen);
  
  // Stap 4: Genereer BOPA motivering indien van toepassing
  const bopaMotivering = genereerBopaMotivering(activiteiten, omschrijving, relevanteThemas, isBopa);
  
  // Stap 5: Genereer Bal/Bkl regelverwijzingen
  const balBklRegels = genereerBalBklRegels(activiteitType, relevanteThemas);
  
  // Stap 6: Genereer checklist
  const checklist = genereerChecklist(activiteitType, relevanteThemas, merBeoordeling);
  
  // Stap 7: Bepaal of toets nodig is
  const isToetsNodig = activiteitType !== 'geen_milieugevolgen';
  
  // Stap 8: Genereer samenvatting
  const relevanteThemasHoog = relevanteThemas.filter(t => t.isRelevant && t.prioriteit === 'hoog');
  const samenvatting = isToetsNodig
    ? `Milieutoets is vereist voor deze ${activiteitType.replace(/_/g, ' ')}. ` +
      `${relevanteThemasHoog.length} thema('s) met hoge prioriteit: ${relevanteThemasHoog.map(t => t.naam).join(', ') || 'geen'}. ` +
      `${merBeoordeling.isNodig ? 'MER is verplicht.' : 'Geen MER-plicht vastgesteld.'}`
    : 'Geen milieutoets vereist op basis van de beschikbare informatie. Controleer of alle activiteiten correct zijn geïdentificeerd.';
  
  return {
    isToetsNodig,
    activiteitType,
    relevanteThemas,
    balBklRegels,
    merBeoordeling,
    bopaMotivering,
    checklist,
    samenvatting,
  };
}

/**
 * Formatteer milieutoets resultaat voor AI context
 */
export function formatMilieuToetsVoorAI(resultaat: MilieuToetsResultaat): string {
  const lines: string[] = [
    '=== MILIEUTOETS SIGNALERING ===',
    '',
    `Toets nodig: ${resultaat.isToetsNodig ? 'JA' : 'NEE'}`,
    `Activiteittype: ${resultaat.activiteitType.replace(/_/g, ' ')}`,
    '',
    'RELEVANTE MILIEUTHEMA\'S:',
  ];
  
  for (const thema of resultaat.relevanteThemas.filter(t => t.isRelevant)) {
    lines.push(`- ${thema.naam} (${thema.prioriteit}): ${thema.reden}`);
  }
  
  lines.push('', 'BAL/BKL REGELVERWIJZINGEN:');
  for (const regel of resultaat.balBklRegels.slice(0, 5)) {
    lines.push(`- ${regel.bron} ${regel.artikel}: ${regel.titel}`);
  }
  
  lines.push('', 'MER-BEOORDELING:');
  lines.push(`- MER nodig: ${resultaat.merBeoordeling.isNodig ? 'JA' : 'NEE'}`);
  lines.push(`- ${resultaat.merBeoordeling.aanbeveling}`);
  
  if (resultaat.bopaMotivering) {
    lines.push('', 'BOPA MOTIVERING:');
    lines.push(`- Afwijking van: ${resultaat.bopaMotivering.afwijkingVan}`);
    lines.push('- Milieuaspecten voor integrale afweging:');
    for (const aspect of resultaat.bopaMotivering.milieuAspecten) {
      lines.push(`  * ${aspect}`);
    }
  }
  
  lines.push('', 'CHECKLIST BEHANDELAAR:');
  for (const item of resultaat.checklist.filter(i => i.status === 'verplicht')) {
    lines.push(`- [${item.status.toUpperCase()}] ${item.item}`);
    lines.push(`  Grondslag: ${item.regelgrondslag}`);
  }
  
  lines.push('', 'SAMENVATTING:');
  lines.push(resultaat.samenvatting);
  
  return lines.join('\n');
}
