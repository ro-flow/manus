/**
 * Basislaag Service - Fundamentele Juridische Kennislaag
 * 
 * De basislaag is het "besturingssysteem" van Ro-flow en wordt ALTIJD gebruikt
 * bij het opstellen van rapporten. Het bevat:
 * - Procedurebepaling (regulier/uitgebreid/melding/vergunningvrij)
 * - Toetsingskader per procedure
 * - ETFAL-kader (8 criteria)
 * - Tweezijdige werking
 * - Vergunningvrij bouwen criteria
 * - Meldingen overzicht
 * - Termijnen
 * - Hiërarchie beleid
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ProcedureType = 'vergunningvrij' | 'melding' | 'regulier' | 'uitgebreid';

export interface ProcedureBepaling {
  procedure: ProcedureType;
  termijn: string;
  verlenging: string | null;
  wettelijkeBasis: string;
  motivering: string;
  toetsingskader: string[];
}

export interface ETFALCriterium {
  nummer: number;
  naam: string;
  omschrijving: string;
  toetsVragen: string[];
}

export interface VergunningvrijCriterium {
  type: string;
  artikel: string;
  criteria: string[];
  uitzonderingen: string[];
}

export interface MeldingType {
  naam: string;
  wettelijkeBasis: string;
  wanneer: string;
  termijn: string;
}

export interface BeleidsHierarchie {
  laag: 'basis' | 'rijks' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
  prioriteit: number;
  beschrijving: string;
  voorbeelden: string[];
}

export interface TweezijdigeWerkingAnalyse {
  isVanToepassing: boolean;
  nieuweFunctie: string | null;
  bestaandeFuncties: string[];
  beschermingsmaatregelen: string[];
  vernietigingsrisico: 'laag' | 'middel' | 'hoog' | null;
}

export interface DubbelbestemmingCheck {
  type: string;
  naam: string;
  adviesVerplicht: boolean;
  adviesInstantie: string;
  wettelijkeBasis: string;
  aandachtspunten: string[];
}

export interface ParapluplanCheck {
  naam: string;
  onderwerp: string;
  altijdToepassen: boolean;
  toelichting: string;
}

export interface StructuurvisieCheck {
  nodig: boolean;
  reden: string;
  teRaadplegen: string[];
}

export interface BasislaagContext {
  procedureBepaling: ProcedureBepaling;
  etfalToetsing: ETFALCriterium[];
  tweezijdigeWerking: TweezijdigeWerkingAnalyse;
  relevanteVergunningvrijCriteria: VergunningvrijCriterium[];
  relevanteMeldingen: MeldingType[];
  beleidsHierarchie: BeleidsHierarchie[];
  termijnenOverzicht: string;
  dubbelbestemmingen: DubbelbestemmingCheck[];
  parapluplannen: ParapluplanCheck[];
  structuurvisieCheck: StructuurvisieCheck;
}

// ============================================================================
// ETFAL KADER (8 CRITERIA)
// ============================================================================

export const ETFAL_CRITERIA: ETFALCriterium[] = [
  {
    nummer: 1,
    naam: 'Ruimtelijke kwaliteit',
    omschrijving: 'De activiteit draagt bij aan of doet geen afbreuk aan de ruimtelijke kwaliteit van het gebied',
    toetsVragen: [
      'Past de activiteit qua schaal en massa in de omgeving?',
      'Sluit de activiteit aan bij de bestaande stedenbouwkundige structuur?',
      'Wordt de beeldkwaliteit van het gebied behouden of verbeterd?'
    ]
  },
  {
    nummer: 2,
    naam: 'Gezondheid',
    omschrijving: 'De activiteit heeft geen onaanvaardbare gevolgen voor de gezondheid',
    toetsVragen: [
      'Zijn er risico\'s voor de volksgezondheid?',
      'Is er sprake van geluidshinder, geurhinder of luchtkwaliteitsproblemen?',
      'Wordt voldaan aan de GES-normen (Gezondheidseffectscreening)?'
    ]
  },
  {
    nummer: 3,
    naam: 'Veiligheid',
    omschrijving: 'De activiteit heeft geen onaanvaardbare gevolgen voor de veiligheid',
    toetsVragen: [
      'Zijn er externe veiligheidsrisico\'s?',
      'Is de brandveiligheid gewaarborgd?',
      'Zijn er risico\'s voor de sociale veiligheid?'
    ]
  },
  {
    nummer: 4,
    naam: 'Leefbaarheid',
    omschrijving: 'De activiteit heeft geen onaanvaardbare gevolgen voor de leefbaarheid',
    toetsVragen: [
      'Past de activiteit bij het karakter van de buurt?',
      'Zijn er effecten op de woonomgeving?',
      'Wordt de sociale cohesie niet aangetast?'
    ]
  },
  {
    nummer: 5,
    naam: 'Natuur en landschap',
    omschrijving: 'De activiteit heeft geen onaanvaardbare gevolgen voor natuur en landschap',
    toetsVragen: [
      'Zijn er effecten op beschermde natuurgebieden (Natura 2000, NNN)?',
      'Zijn er beschermde soorten aanwezig?',
      'Wordt het landschapsbeeld aangetast?'
    ]
  },
  {
    nummer: 6,
    naam: 'Cultureel erfgoed',
    omschrijving: 'De activiteit heeft geen onaanvaardbare gevolgen voor cultureel erfgoed',
    toetsVragen: [
      'Zijn er monumenten in de omgeving?',
      'Ligt de locatie in een beschermd stads- of dorpsgezicht?',
      'Zijn er archeologische waarden aanwezig?'
    ]
  },
  {
    nummer: 7,
    naam: 'Milieu',
    omschrijving: 'De activiteit heeft geen onaanvaardbare gevolgen voor het milieu',
    toetsVragen: [
      'Voldoet de activiteit aan de milieunormen?',
      'Is er sprake van bodemverontreiniging?',
      'Zijn er effecten op de waterkwaliteit?'
    ]
  },
  {
    nummer: 8,
    naam: 'Verkeer en parkeren',
    omschrijving: 'De activiteit heeft geen onaanvaardbare gevolgen voor verkeer en parkeren',
    toetsVragen: [
      'Is de verkeersafwikkeling gewaarborgd?',
      'Is er voldoende parkeergelegenheid?',
      'Zijn er effecten op de verkeersveiligheid?'
    ]
  }
];

// ============================================================================
// VERGUNNINGVRIJ BOUWEN (Bbl Bijlage II)
// ============================================================================

export const VERGUNNINGVRIJ_CRITERIA: VergunningvrijCriterium[] = [
  {
    type: 'Bijbehorend bouwwerk',
    artikel: 'Bbl art. 2.29',
    criteria: [
      'In achtererfgebied',
      'Max 150m² of 50% van achtererfgebied',
      'Max 5 meter hoog',
      'Op meer dan 1 meter van openbaar toegankelijk gebied'
    ],
    uitzonderingen: [
      'Monumenten (rijks of gemeentelijk)',
      'Beschermd stads- of dorpsgezicht',
      'Specifieke planregels die vergunningvrij uitsluiten'
    ]
  },
  {
    type: 'Dakkapel',
    artikel: 'Bbl art. 2.31',
    criteria: [
      'Niet in voordakvlak of naar openbaar toegankelijk gebied gekeerd zijdakvlak',
      'Max 1,75 meter hoog',
      'Zijkanten min 0,5 meter van zijkanten dakvlak',
      'Onderkant meer dan 0,5 meter en minder dan 1 meter boven dakvoet'
    ],
    uitzonderingen: [
      'Monumenten',
      'Beschermd stads- of dorpsgezicht'
    ]
  },
  {
    type: 'Kozijn/gevelelement',
    artikel: 'Bbl art. 2.32',
    criteria: [
      'Geen wijziging draagconstructie',
      'Geen wijziging brandcompartimentering',
      'Geen wijziging beschermde vluchtroute'
    ],
    uitzonderingen: [
      'Monumenten'
    ]
  },
  {
    type: 'Erfafscheiding',
    artikel: 'Bbl art. 2.33',
    criteria: [
      'Max 2 meter hoog in achtererfgebied',
      'Max 1 meter hoog in voorerfgebied',
      'Op meer dan 1 meter achter voorgevelrooilijn'
    ],
    uitzonderingen: []
  },
  {
    type: 'Zonnepanelen',
    artikel: 'Bbl art. 2.35',
    criteria: [
      'Plat op het dak of aan de gevel',
      'Binnen het bouwvlak van het gebouw'
    ],
    uitzonderingen: [
      'Monumenten (afhankelijk van zichtbaarheid)'
    ]
  },
  {
    type: 'Vlaggenmast',
    artikel: 'Bbl art. 2.36',
    criteria: [
      'Max 6 meter hoog'
    ],
    uitzonderingen: []
  },
  {
    type: 'Antenne',
    artikel: 'Bbl art. 2.37',
    criteria: [
      'Max 5 meter hoog',
      'Niet op een rijksmonument'
    ],
    uitzonderingen: [
      'Rijksmonumenten'
    ]
  }
];

// ============================================================================
// MELDINGEN OVERZICHT
// ============================================================================

export const MELDINGEN: MeldingType[] = [
  {
    naam: 'Sloopmelding',
    wettelijkeBasis: 'Bbl art. 7.10',
    wanneer: 'Bij sloop van meer dan 10m³ of bij aanwezigheid van asbest',
    termijn: '4 weken voor aanvang'
  },
  {
    naam: 'Gebruiksmelding brandveiligheid',
    wettelijkeBasis: 'Bbl art. 6.7',
    wanneer: 'Bij logiesfunctie, gezondheidszorgfunctie, onderwijsfunctie of kinderdagverblijf',
    termijn: '4 weken voor ingebruikname'
  },
  {
    naam: 'Bouwmelding gevolgklasse 1',
    wettelijkeBasis: 'Bbl art. 2.18',
    wanneer: 'Bij nieuwbouw onder de Wet kwaliteitsborging (Wkb)',
    termijn: '4 weken voor aanvang'
  },
  {
    naam: 'Gereedmelding',
    wettelijkeBasis: 'Bbl art. 2.21',
    wanneer: 'Na voltooiing van bouwwerkzaamheden',
    termijn: '2 weken na voltooiing'
  },
  {
    naam: 'Milieumelding',
    wettelijkeBasis: 'Bal (Besluit activiteiten leefomgeving)',
    wanneer: 'Bij milieubelastende activiteiten',
    termijn: '4 weken voor aanvang'
  }
];

// ============================================================================
// BELEIDS HIERARCHIE
// ============================================================================

export const BELEIDS_HIERARCHIE: BeleidsHierarchie[] = [
  {
    laag: 'basis',
    prioriteit: 0,
    beschrijving: 'Fundamentele juridische kaders (Omgevingswet, Bbl, Bal)',
    voorbeelden: ['Omgevingswet', 'Besluit bouwwerken leefomgeving', 'Besluit activiteiten leefomgeving', 'Besluit kwaliteit leefomgeving']
  },
  {
    laag: 'rijks',
    prioriteit: 1,
    beschrijving: 'Nationale regelgeving en instructieregels',
    voorbeelden: ['NOVI', 'Bkl instructieregels', 'Wet natuurbescherming', 'Erfgoedwet']
  },
  {
    laag: 'provinciaal',
    prioriteit: 2,
    beschrijving: 'Provinciale omgevingsverordening en instructieregels',
    voorbeelden: ['Provinciale Omgevingsverordening', 'NNN-begrenzing', 'Stiltegebieden', 'Weidevogelgebieden']
  },
  {
    laag: 'regionaal',
    prioriteit: 3,
    beschrijving: 'Regionale regelgeving (waterschap, veiligheidsregio, omgevingsdienst, recreatieschap)',
    voorbeelden: ['Waterschapskeur', 'Regionale Energiestrategie', 'Regionale afspraken']
  },
  {
    laag: 'gemeentelijk',
    prioriteit: 4,
    beschrijving: 'Gemeentelijk beleid en verordeningen',
    voorbeelden: ['Omgevingsplan', 'Welstandsnota', 'Parkeerbeleid', 'Erfgoedverordening']
  }
];

// ============================================================================
// TERMIJNEN
// ============================================================================

export const TERMIJNEN = {
  regulier: {
    termijn: '8 weken',
    verlenging: '6 weken',
    wettelijkeBasis: 'Art. 16.64 Omgevingswet',
    toelichting: 'Standaardprocedure voor de meeste omgevingsvergunningen'
  },
  uitgebreid: {
    termijn: '26 weken',
    verlenging: '6 weken',
    wettelijkeBasis: 'Art. 16.65 Omgevingswet',
    toelichting: 'Bij MER-plicht, rijksmonument, of artikel 10.24 Omgevingsbesluit'
  },
  melding: {
    termijn: '4 weken',
    verlenging: null,
    wettelijkeBasis: 'Diverse (Bbl, Bal)',
    toelichting: 'Geen besluit, maar wachttermijn voor aanvang activiteit'
  },
  bopa: {
    termijn: '8 weken',
    verlenging: '6 weken',
    wettelijkeBasis: 'Art. 16.64 Omgevingswet',
    toelichting: 'BOPA volgt standaard de reguliere procedure, tenzij MER-plicht of rijksmonument'
  }
};

// ============================================================================
// JURIDISCHE TOETSINGSHIËRARCHIE (ALTIJD/SOMS/NOOIT)
// ============================================================================

/**
 * De gouden juridische regel:
 * "Alles wat 'mag / moet / niet mag' bevat, moet je toetsen.
 *  Alles wat 'wenst / stimuleert / richting geeft', alleen als dat nodig is."
 */

export type ToetsingsCategorie = 'altijd' | 'soms' | 'nooit';

export interface ToetsingsItem {
  naam: string;
  categorie: ToetsingsCategorie;
  wanneer: string;
  voorbeelden: string[];
  wettelijkeBasis?: string;
}

export const TOETSINGSHIERARCHIE: ToetsingsItem[] = [
  // === ALTIJD TOETSEN ===
  {
    naam: 'Omgevingsplanregels',
    categorie: 'altijd',
    wanneer: 'Bij ELKE aanvraag, ongeacht omvang of procedure',
    voorbeelden: [
      'Bestemming / functie',
      'Bouwregels (hoogte, oppervlakte, bouwvlak)',
      'Gebruiksregels en -verboden',
      'Voorwaardelijke verplichtingen',
      'Parapluregels (parkeren, archeologie)',
      'Bruidsschatregels (per 1-1-2024 onderdeel omgevingsplan - check actuele versie!)'
    ],
    wettelijkeBasis: 'Omgevingswet art. 5.1'
  },
  {
    naam: 'Bbl - Besluit bouwwerken leefomgeving',
    categorie: 'altijd',
    wanneer: 'Bij bouwen, verbouwen of gebruiken van bouwwerken',
    voorbeelden: [
      'Constructieve veiligheid',
      'Brandveiligheid',
      'Gezondheid (ventilatie, daglichttoetreding)',
      'Bruikbaarheid',
      'Energiezuinigheid (BENG)',
      'Milieu (MPG)'
    ],
    wettelijkeBasis: 'Besluit bouwwerken leefomgeving'
  },
  {
    naam: 'Bal - Besluit activiteiten leefomgeving',
    categorie: 'altijd',
    wanneer: 'Bij milieubelastende activiteiten',
    voorbeelden: [
      'Geluidnormen',
      'Geuremissies',
      'Luchtemissies',
      'Lozingen',
      'Afvalstoffen'
    ],
    wettelijkeBasis: 'Besluit activiteiten leefomgeving'
  },
  {
    naam: 'Bkl - Besluit kwaliteit leefomgeving',
    categorie: 'altijd',
    wanneer: 'Bij belangenafweging (instructieregels)',
    voorbeelden: [
      'Ruimtelijke kwaliteit',
      'Gezondheid',
      'Veiligheid',
      'Milieukwaliteit',
      'Omgevingswaarden'
    ],
    wettelijkeBasis: 'Besluit kwaliteit leefomgeving'
  },
  {
    naam: 'Procedurele vereisten',
    categorie: 'altijd',
    wanneer: 'Bij ELKE aanvraag',
    voorbeelden: [
      'Juiste procedure (regulier/uitgebreid)',
      'Beslistermijnen',
      'Bevoegd gezag',
      'Volledigheid aanvraag',
      'Participatieplicht (alleen bij aangewezen gevallen in omgevingsplan of uitgebreide procedure art. 16.55 lid 6 Ow)'
    ],
    wettelijkeBasis: 'Omgevingswet hoofdstuk 16'
  },
  {
    naam: 'Beschermde regimes',
    categorie: 'altijd',
    wanneer: 'Indien van toepassing op de locatie - NIET toetsen is ernstige fout',
    voorbeelden: [
      'Natura 2000',
      'NNN / GNN (Natuurnetwerk)',
      'Rijks- of gemeentelijk monument',
      'Archeologie (dubbelbestemming)',
      'Waterbeschermingsgebieden',
      'Veiligheidszones (Bevi)'
    ],
    wettelijkeBasis: 'Diverse (Wnb, Erfgoedwet, Waterwet, Bevi)'
  },
  
  {
    naam: 'Welstandstoets',
    categorie: 'altijd',
    wanneer: 'Bij ELKE binnenplanse omgevingsvergunning voor bouwen (art. 4.19 Ow)',
    voorbeelden: [
      'Redelijke eisen van welstand',
      'Welstandsnota criteria',
      'Welstandscommissie advies (bij twijfel of afwijking)'
    ],
    wettelijkeBasis: 'Omgevingswet art. 4.19'
  },
  {
    naam: 'Adviesplicht',
    categorie: 'altijd',
    wanneer: 'Bij bepaalde activiteiten is advies VERPLICHT',
    voorbeelden: [
      'Rijksadviseur (bij rijksmonumenten)',
      'GGD (bij gezondheidsaspecten, bijv. kinderopvang)',
      'Veiligheidsregio (bij externe veiligheid)',
      'Waterschap (bij waterbelangen)',
      'Monumentencommissie (bij gemeentelijke monumenten)',
      'Welstandscommissie (bij twijfel of afwijking)'
    ],
    wettelijkeBasis: 'Diverse (Erfgoedwet, Omgevingsbesluit, Keur)'
  },
  
  // === SOMS TOETSEN ===
  {
    naam: 'Beleid (bij beoordelingsruimte)',
    categorie: 'soms',
    wanneer: 'Alleen bij BOPA, open normen, of discretionaire bevoegdheid',
    voorbeelden: [
      'Welstandsnota (alleen de open/richtinggevende criteria)',
      'Parkeerbeleid (bij afwijking)',
      'Horecabeleid',
      'Detailhandelsbeleid',
      'Woonvisie (bij BOPA)'
    ],
    wettelijkeBasis: 'Jurisprudentie - beleid is hulpmiddel, geen zelfstandig toetsingscriterium'
  },
  {
    naam: 'ETFAL-kader',
    categorie: 'soms',
    wanneer: 'Alleen bij BOPA (buitenplanse omgevingsplanactiviteit)',
    voorbeelden: [
      'Evenwichtige toedeling functies aan locaties',
      '8 criteria uit Bkl art. 8.0a lid 2'
    ],
    wettelijkeBasis: 'Bkl art. 8.0a lid 2'
  },
  {
    naam: 'Structuurvisies',
    categorie: 'soms',
    wanneer: 'Alleen bij afwijking van omgevingsplan (BOPA)',
    voorbeelden: [
      'Gemeentelijke Omgevingsvisie',
      'Provinciale Omgevingsvisie',
      'Regionale structuurvisie'
    ]
  },
  
  // === NOOIT ZELFSTANDIG TOETSEN ===
  {
    naam: 'Visies zonder normstelling',
    categorie: 'nooit',
    wanneer: 'Nooit als zelfstandig toetsingscriterium',
    voorbeelden: [
      'Structuurvisies zonder concrete criteria',
      'Beleidsnota\'s zonder normstelling',
      'Uitvoeringsagenda\'s',
      'Beleid van vóór de Omgevingswet zonder actualisatie'
    ]
  }
];

// Gouden Juridische Beslisboom (5 vragen in volgorde)
export interface BeslisboomVraag {
  nummer: number;
  vraag: string;
  jaAntwoord: string;
  neeAntwoord: string;
}

export const GOUDEN_BESLISBOOM: BeslisboomVraag[] = [
  {
    nummer: 1,
    vraag: 'Past de aanvraag volledig binnen het omgevingsplan?',
    jaAntwoord: 'Meestal geen beleidstoets nodig - alleen normstellende regels toetsen',
    neeAntwoord: 'Ga naar vraag 2'
  },
  {
    nummer: 2,
    vraag: 'Is sprake van een BOPA (buitenplanse omgevingsplanactiviteit)?',
    jaAntwoord: 'Beleid betrekken bij ETFAL-afweging',
    neeAntwoord: 'Ga naar vraag 3'
  },
  {
    nummer: 3,
    vraag: 'Bevat de norm beoordelingsruimte (open norm)?',
    jaAntwoord: 'Beleid mag richting geven aan invulling open norm',
    neeAntwoord: 'Ga naar vraag 4'
  },
  {
    nummer: 4,
    vraag: 'Is beleid bindend gemaakt via plan of instructieregel?',
    jaAntwoord: 'Toetsing aan beleid is verplicht (beleid is planregel geworden)',
    neeAntwoord: 'Ga naar vraag 5'
  },
  {
    nummer: 5,
    vraag: 'Is beleid nodig om belangen te wegen of willekeur te voorkomen?',
    jaAntwoord: 'Beleid betrekken en motiveren waarom',
    neeAntwoord: 'Geen beleidstoets - beleid toevoegen is juridisch fout'
  }
];

// Helper functie om relevante toetsingsitems te krijgen
export function getToetsingsItems(categorie: ToetsingsCategorie): ToetsingsItem[] {
  return TOETSINGSHIERARCHIE.filter(item => item.categorie === categorie);
}

// Helper functie om te bepalen of beleid getoetst moet worden
export function moetBeleidGetoetst(isBOPA: boolean, heeftOpenNormen: boolean, isBeleidBindend: boolean): {
  toetsen: boolean;
  reden: string;
} {
  if (isBeleidBindend) {
    return { toetsen: true, reden: 'Beleid is bindend gemaakt via plan of instructieregel' };
  }
  if (isBOPA) {
    return { toetsen: true, reden: 'BOPA vereist ETFAL-afweging waarbij beleid richting geeft' };
  }
  if (heeftOpenNormen) {
    return { toetsen: true, reden: 'Open normen mogen worden ingevuld met beleid' };
  }
  return { toetsen: false, reden: 'Geen beoordelingsruimte - beleid toevoegen verzwakt het besluit' };
}

// ============================================================================
// TOETSINGSKADERS PER PROCEDURE
// ============================================================================

export const TOETSINGSKADERS = {
  binnenplans: [
    'Omgevingsplan (bestemmingsregels)',
    'Bouwbesluit/Bbl technische eisen',
    'Welstandsnota (redelijke eisen)',
    'Parkeerbeleid',
    'Eventuele vergunningvoorschriften'
  ],
  bopa: [
    'ETFAL-kader (8 criteria evenwichtige toedeling)',
    'Tweezijdige werking (bescherming nieuwe én bestaande functies)',
    'Instructieregels provincie (POV)',
    'Instructieregels Rijk (Bkl)',
    'Omgevingswaarden',
    'Participatieverslag (art. 16.55 Ow)',
    'Bouwbesluit/Bbl technische eisen',
    'Welstandsnota'
  ],
  melding: [
    'Volledigheid melding',
    'Juiste formulieren en bijlagen',
    'Tijdigheid (4 weken voor aanvang)'
  ],
  vergunningvrij: [
    'Voldoen aan Bbl Bijlage II criteria',
    'Geen uitzonderingen van toepassing (monument, beschermd gezicht)',
    'Geen welstandsexces'
  ]
};

// ============================================================================
// PROCEDURE BEPALING LOGICA
// ============================================================================

interface ProcedureInput {
  activiteiten: string[];
  locatieKenmerken: {
    isMonument: boolean;
    isBeschermdGezicht: boolean;
    isNatura2000: boolean;
    isNNN: boolean;
    isBinnenOmgevingsplan: boolean;
  };
  omvang: {
    oppervlakte?: number;
    hoogte?: number;
    volume?: number;
  };
  heeftMERplicht: boolean;
}

export function bepaalProcedure(input: ProcedureInput): ProcedureBepaling {
  const { activiteiten, locatieKenmerken, heeftMERplicht } = input;
  
  // Stap 1: Check voor uitgebreide procedure
  if (heeftMERplicht) {
    return {
      procedure: 'uitgebreid',
      termijn: '26 weken',
      verlenging: '6 weken',
      wettelijkeBasis: 'Art. 16.65 Omgevingswet',
      motivering: 'MER-plicht vereist uitgebreide procedure',
      toetsingskader: TOETSINGSKADERS.bopa
    };
  }
  
  if (locatieKenmerken.isMonument && activiteiten.some(a => 
    a.toLowerCase().includes('rijksmonument') || 
    a.toLowerCase().includes('monument wijzigen')
  )) {
    return {
      procedure: 'uitgebreid',
      termijn: '26 weken',
      verlenging: '6 weken',
      wettelijkeBasis: 'Art. 16.65 Omgevingswet jo. art. 10.24 Ob',
      motivering: 'Wijziging rijksmonument vereist uitgebreide procedure',
      toetsingskader: TOETSINGSKADERS.bopa
    };
  }
  
  // Stap 2: Check voor vergunningvrij
  const vergunningvrijCheck = checkVergunningvrij(input);
  if (vergunningvrijCheck.isVergunningvrij) {
    return {
      procedure: 'vergunningvrij',
      termijn: 'n.v.t.',
      verlenging: null,
      wettelijkeBasis: vergunningvrijCheck.artikel || 'Bbl Bijlage II',
      motivering: vergunningvrijCheck.motivering,
      toetsingskader: TOETSINGSKADERS.vergunningvrij
    };
  }
  
  // Stap 3: Check voor melding
  const meldingCheck = checkMelding(activiteiten);
  if (meldingCheck.isMelding) {
    return {
      procedure: 'melding',
      termijn: '4 weken',
      verlenging: null,
      wettelijkeBasis: meldingCheck.wettelijkeBasis,
      motivering: meldingCheck.motivering,
      toetsingskader: TOETSINGSKADERS.melding
    };
  }
  
  // Stap 4: Binnenplans of BOPA
  if (locatieKenmerken.isBinnenOmgevingsplan) {
    return {
      procedure: 'regulier',
      termijn: '8 weken',
      verlenging: '6 weken',
      wettelijkeBasis: 'Art. 16.64 Omgevingswet',
      motivering: 'Activiteit past binnen het omgevingsplan (binnenplanse vergunning)',
      toetsingskader: TOETSINGSKADERS.binnenplans
    };
  }
  
  // BOPA (buitenplanse omgevingsplanactiviteit)
  return {
    procedure: 'regulier',
    termijn: '8 weken',
    verlenging: '6 weken',
    wettelijkeBasis: 'Art. 16.64 Omgevingswet',
    motivering: 'Activiteit wijkt af van het omgevingsplan (BOPA - buitenplanse omgevingsplanactiviteit)',
    toetsingskader: TOETSINGSKADERS.bopa
  };
}

function checkVergunningvrij(input: ProcedureInput): { isVergunningvrij: boolean; artikel?: string; motivering: string } {
  const { locatieKenmerken, omvang } = input;
  
  // Uitzonderingen die vergunningvrij uitsluiten
  if (locatieKenmerken.isMonument) {
    return { isVergunningvrij: false, motivering: 'Monument: vergunningvrij bouwen niet van toepassing' };
  }
  if (locatieKenmerken.isBeschermdGezicht) {
    return { isVergunningvrij: false, motivering: 'Beschermd stads-/dorpsgezicht: vergunningvrij bouwen beperkt' };
  }
  
  // Check criteria (vereenvoudigd)
  if (omvang.oppervlakte && omvang.oppervlakte <= 150 && omvang.hoogte && omvang.hoogte <= 5) {
    return { 
      isVergunningvrij: true, 
      artikel: 'Bbl art. 2.29',
      motivering: 'Bijbehorend bouwwerk voldoet aan criteria: max 150m², max 5m hoog, in achtererfgebied'
    };
  }
  
  return { isVergunningvrij: false, motivering: 'Voldoet niet aan vergunningvrij criteria' };
}

function checkMelding(activiteiten: string[]): { isMelding: boolean; wettelijkeBasis: string; motivering: string } {
  const meldingActiviteiten = [
    { keywords: ['sloop', 'slopen'], basis: 'Bbl art. 7.10', motivering: 'Sloopmelding vereist' },
    { keywords: ['brandveilig', 'logies', 'zorg', 'onderwijs', 'kinderopvang'], basis: 'Bbl art. 6.7', motivering: 'Gebruiksmelding brandveiligheid vereist' },
    { keywords: ['gevolgklasse 1', 'wkb', 'kwaliteitsborging'], basis: 'Bbl art. 2.18', motivering: 'Bouwmelding gevolgklasse 1 vereist' }
  ];
  
  for (const check of meldingActiviteiten) {
    if (activiteiten.some(a => check.keywords.some(k => a.toLowerCase().includes(k)))) {
      return { isMelding: true, wettelijkeBasis: check.basis, motivering: check.motivering };
    }
  }
  
  return { isMelding: false, wettelijkeBasis: '', motivering: '' };
}

// ============================================================================
// TWEEZIJDIGE WERKING ANALYSE
// ============================================================================

export function analyseerTweezijdigeWerking(
  nieuweFunctie: string | null,
  bestaandeFuncties: string[],
  activiteiten: string[]
): TweezijdigeWerkingAnalyse {
  // Tweezijdige werking is alleen relevant bij BOPA's met functiewijziging
  const isFunctiewijziging = activiteiten.some(a => 
    a.toLowerCase().includes('functiewijziging') || 
    a.toLowerCase().includes('gebruikswijziging') ||
    a.toLowerCase().includes('bopa')
  );
  
  if (!isFunctiewijziging || !nieuweFunctie) {
    return {
      isVanToepassing: false,
      nieuweFunctie: null,
      bestaandeFuncties: [],
      beschermingsmaatregelen: [],
      vernietigingsrisico: null
    };
  }
  
  // Bepaal beschermingsmaatregelen op basis van functies
  const maatregelen: string[] = [];
  let risico: 'laag' | 'middel' | 'hoog' = 'laag';
  
  // Gevoelige combinaties
  const gevoeligeCombinaties = [
    { nieuw: 'wonen', bestaand: 'horeca', maatregel: 'Geluidsisolatie en openingstijden beoordelen', risico: 'middel' as const },
    { nieuw: 'wonen', bestaand: 'industrie', maatregel: 'Afstandsnormen en milieuzonering controleren', risico: 'hoog' as const },
    { nieuw: 'wonen', bestaand: 'agrarisch', maatregel: 'Geurcirkels en spuitzonering controleren', risico: 'hoog' as const },
    { nieuw: 'horeca', bestaand: 'wonen', maatregel: 'Geluidsnormen en sluitingstijden vaststellen', risico: 'middel' as const },
    { nieuw: 'bedrijf', bestaand: 'wonen', maatregel: 'VNG-afstandsnormen en milieucategorie controleren', risico: 'middel' as const }
  ];
  
  for (const combinatie of gevoeligeCombinaties) {
    if (nieuweFunctie.toLowerCase().includes(combinatie.nieuw)) {
      for (const bestaand of bestaandeFuncties) {
        if (bestaand.toLowerCase().includes(combinatie.bestaand)) {
          maatregelen.push(combinatie.maatregel);
          if (combinatie.risico === 'hoog' || (combinatie.risico === 'middel' && risico === 'laag')) {
            risico = combinatie.risico;
          }
        }
      }
    }
  }
  
  return {
    isVanToepassing: true,
    nieuweFunctie,
    bestaandeFuncties,
    beschermingsmaatregelen: maatregelen,
    vernietigingsrisico: risico
  };
}

// ============================================================================
// FORMAT VOOR AI CONTEXT
// ============================================================================

export function formatBasislaagVoorAI(context: BasislaagContext): string {
  const lines: string[] = [];
  
  lines.push('=== BASISLAAG: JURIDISCH KADER ===\n');
  
  // Gouden Juridische Regel
  lines.push('## GOUDEN JURIDISCHE REGEL');
  lines.push('"Alles wat \'mag / moet / niet mag\' bevat, moet je toetsen.');
  lines.push(' Alles wat \'wenst / stimuleert / richting geeft\', alleen als dat nodig is."');
  lines.push('');
  
  // Toetsingshiërarchie
  lines.push('## TOETSINGSHIËRARCHIE');
  lines.push('');
  lines.push('### ALTIJD TOETSEN (ongeacht procedure):');
  const altijdItems = TOETSINGSHIERARCHIE.filter(i => i.categorie === 'altijd');
  for (const item of altijdItems) {
    lines.push(`- ${item.naam}: ${item.wanneer}`);
  }
  lines.push('');
  
  lines.push('### SOMS TOETSEN (bij beoordelingsruimte):');
  const somsItems = TOETSINGSHIERARCHIE.filter(i => i.categorie === 'soms');
  for (const item of somsItems) {
    lines.push(`- ${item.naam}: ${item.wanneer}`);
  }
  lines.push('');
  
  lines.push('### NOOIT ZELFSTANDIG TOETSEN:');
  const nooitItems = TOETSINGSHIERARCHIE.filter(i => i.categorie === 'nooit');
  for (const item of nooitItems) {
    lines.push(`- ${item.naam}: ${item.wanneer}`);
  }
  lines.push('');
  
  // Gouden Beslisboom
  lines.push('## GOUDEN BESLISBOOM (volg deze volgorde)');
  for (const vraag of GOUDEN_BESLISBOOM) {
    lines.push(`${vraag.nummer}. ${vraag.vraag}`);
    lines.push(`   → JA: ${vraag.jaAntwoord}`);
    lines.push(`   → NEE: ${vraag.neeAntwoord}`);
  }
  lines.push('');
  
  // Procedure
  lines.push('## PROCEDURE BEPALING');
  lines.push(`Type: ${context.procedureBepaling.procedure.toUpperCase()}`);
  lines.push(`Termijn: ${context.procedureBepaling.termijn}${context.procedureBepaling.verlenging ? ` (verlenging: ${context.procedureBepaling.verlenging})` : ''}`);
  lines.push(`Wettelijke basis: ${context.procedureBepaling.wettelijkeBasis}`);
  lines.push(`Motivering: ${context.procedureBepaling.motivering}`);
  lines.push('');
  
  // Toetsingskader
  lines.push('## TOETSINGSKADER');
  lines.push('De volgende toetsen zijn van toepassing:');
  for (const toets of context.procedureBepaling.toetsingskader) {
    lines.push(`- ${toets}`);
  }
  lines.push('');
  
  // ETFAL (alleen bij BOPA)
  if (context.procedureBepaling.procedure === 'regulier' && 
      context.procedureBepaling.motivering.includes('BOPA')) {
    lines.push('## ETFAL-KADER (8 CRITERIA)');
    lines.push('Bij BOPA moet worden getoetst aan evenwichtige toedeling functies aan locaties:');
    for (const criterium of context.etfalToetsing) {
      lines.push(`${criterium.nummer}. ${criterium.naam}: ${criterium.omschrijving}`);
    }
    lines.push('');
  }
  
  // Tweezijdige werking
  if (context.tweezijdigeWerking.isVanToepassing) {
    lines.push('## TWEEZIJDIGE WERKING');
    lines.push(`Nieuwe functie: ${context.tweezijdigeWerking.nieuweFunctie}`);
    lines.push(`Bestaande functies: ${context.tweezijdigeWerking.bestaandeFuncties.join(', ')}`);
    lines.push(`Vernietigingsrisico: ${context.tweezijdigeWerking.vernietigingsrisico}`);
    if (context.tweezijdigeWerking.beschermingsmaatregelen.length > 0) {
      lines.push('Aandachtspunten:');
      for (const maatregel of context.tweezijdigeWerking.beschermingsmaatregelen) {
        lines.push(`- ${maatregel}`);
      }
    }
    lines.push('');
  }
  
  // Relevante meldingen
  if (context.relevanteMeldingen.length > 0) {
    lines.push('## RELEVANTE MELDINGEN');
    for (const melding of context.relevanteMeldingen) {
      lines.push(`- ${melding.naam} (${melding.wettelijkeBasis}): ${melding.wanneer} - Termijn: ${melding.termijn}`);
    }
    lines.push('');
  }
  
  // Hiërarchie
  lines.push('## BELEIDS HIËRARCHIE');
  lines.push('Toets altijd in deze volgorde (hoger recht prevaleert):');
  for (const laag of context.beleidsHierarchie) {
    lines.push(`${laag.prioriteit}. ${laag.laag.toUpperCase()}: ${laag.beschrijving}`);
  }
  lines.push('');
  
  // Dubbelbestemmingen
  if (context.dubbelbestemmingen.length > 0) {
    lines.push('## DUBBELBESTEMMINGEN - ADVIES VEREIST');
    lines.push('De volgende dubbelbestemmingen zijn gedetecteerd. Hiervoor is advies VERPLICHT:');
    for (const db of context.dubbelbestemmingen) {
      lines.push(`\n### ${db.naam}`);
      lines.push(`- Adviesinstantie: ${db.adviesInstantie}`);
      lines.push(`- Wettelijke basis: ${db.wettelijkeBasis}`);
      lines.push('- Aandachtspunten:');
      for (const punt of db.aandachtspunten) {
        lines.push(`  * ${punt}`);
      }
    }
    lines.push('');
  }
  
  // Parapluplannen
  if (context.parapluplannen.length > 0) {
    lines.push('## PARAPLUPLANNEN - ALTIJD MEENEMEN');
    lines.push('De volgende parapluplannen zijn van toepassing naast het omgevingsplan:');
    for (const pp of context.parapluplannen) {
      lines.push(`- ${pp.naam}: ${pp.toelichting}`);
    }
    lines.push('');
  }
  
  // Structuurvisie check
  if (context.structuurvisieCheck.nodig) {
    lines.push('## STRUCTUURVISIE CHECK - VEREIST');
    lines.push(`Reden: ${context.structuurvisieCheck.reden}`);
    lines.push('Te raadplegen documenten:');
    for (const doc of context.structuurvisieCheck.teRaadplegen) {
      lines.push(`- ${doc}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

// ============================================================================
// DUBBELBESTEMMINGEN, PARAPLUPLANNEN EN STRUCTUURVISIES
// ============================================================================

// Bekende dubbelbestemmingen die advies vereisen
const DUBBELBESTEMMING_ADVIES: Record<string, { adviesInstantie: string; wettelijkeBasis: string; aandachtspunten: string[] }> = {
  'archeologie': {
    adviesInstantie: 'Gemeentelijk archeoloog of regioarcheoloog',
    wettelijkeBasis: 'Erfgoedwet art. 9.1',
    aandachtspunten: [
      'Archeologisch onderzoek kan verplicht zijn bij bodemverstoring',
      'Check vrijstellingsgrenzen in parapluplan archeologie',
      'Mogelijk voorwaardelijke verplichting in vergunning'
    ]
  },
  'waterkering': {
    adviesInstantie: 'Waterschap (dijkgraaf)',
    wettelijkeBasis: 'Waterwet + Keur waterschap',
    aandachtspunten: [
      'Watervergunning waterschap vaak ook vereist',
      'Kernzone en beschermingszone hebben verschillende regimes',
      'Stabiliteit waterkering mag niet worden aangetast'
    ]
  },
  'waterstaat': {
    adviesInstantie: 'Waterschap',
    wettelijkeBasis: 'Waterwet + Keur waterschap',
    aandachtspunten: [
      'Check waterbergingseisen',
      'Mogelijk compensatieplicht bij verharding',
      'Afvoer hemelwater regelen'
    ]
  },
  'leiding': {
    adviesInstantie: 'Leidingbeheerder (Gasunie, TenneT, etc.)',
    wettelijkeBasis: 'Omgevingsplan + zakelijk recht',
    aandachtspunten: [
      'Bebouwingsvrije zone respecteren',
      'KLIC-melding verplicht bij graven',
      'Toestemming leidingbeheerder vereist'
    ]
  },
  'natuur': {
    adviesInstantie: 'Provincie (Wet natuurbescherming)',
    wettelijkeBasis: 'Wnb + Omgevingsverordening',
    aandachtspunten: [
      'NNN/EHS compensatieplicht',
      'Nee-tenzij regime van toepassing',
      'Ontheffing flora en fauna mogelijk nodig'
    ]
  },
  'cultuurhistorie': {
    adviesInstantie: 'Monumentencommissie of erfgoeddeskundige',
    wettelijkeBasis: 'Erfgoedwet + gemeentelijke erfgoedverordening',
    aandachtspunten: [
      'Karakteristieke waarden behouden',
      'Mogelijk aanvullende welstandseisen',
      'Advies monumentencommissie kan verplicht zijn'
    ]
  },
  'geluid': {
    adviesInstantie: 'Omgevingsdienst (milieu)',
    wettelijkeBasis: 'Bkl + Omgevingsplan',
    aandachtspunten: [
      'Geluidbelasting op gevel toetsen',
      'Mogelijk dove gevel of extra isolatie vereist',
      'Cumulatie met andere bronnen meenemen'
    ]
  },
  'veiligheid': {
    adviesInstantie: 'Veiligheidsregio',
    wettelijkeBasis: 'Bkl + Bevi',
    aandachtspunten: [
      'Plaatsgebonden risico en groepsrisico toetsen',
      'Verantwoording groepsrisico kan nodig zijn',
      'Zelfredzaamheid en hulpverlening meenemen'
    ]
  }
};

// Bekende parapluplannen
const STANDAARD_PARAPLUPLANNEN: ParapluplanCheck[] = [
  {
    naam: 'Parapluplan Parkeren',
    onderwerp: 'Parkeernormen en -eisen',
    altijdToepassen: true,
    toelichting: 'Bevat de gemeentelijke parkeernormen die gelden naast het omgevingsplan'
  },
  {
    naam: 'Parapluplan Archeologie',
    onderwerp: 'Archeologische waarden en onderzoeksplicht',
    altijdToepassen: true,
    toelichting: 'Bevat vrijstellingsgrenzen en onderzoeksverplichtingen per waardegebied'
  },
  {
    naam: 'Parapluplan Cultuurhistorie',
    onderwerp: 'Cultuurhistorische waarden',
    altijdToepassen: false,
    toelichting: 'Van toepassing in gebieden met cultuurhistorische waarde'
  },
  {
    naam: 'Parapluplan Detailhandel',
    onderwerp: 'Detailhandelsbeleid en branchering',
    altijdToepassen: false,
    toelichting: 'Van toepassing bij detailhandelsactiviteiten'
  },
  {
    naam: 'Parapluplan Horeca',
    onderwerp: 'Horecabeleid en categorisering',
    altijdToepassen: false,
    toelichting: 'Van toepassing bij horecaactiviteiten'
  }
];

function analyseerDubbelbestemmingen(dubbelbestemmingen: string[]): DubbelbestemmingCheck[] {
  const checks: DubbelbestemmingCheck[] = [];
  
  for (const db of dubbelbestemmingen) {
    const lowerDb = db.toLowerCase();
    
    // Zoek matching advies configuratie
    for (const [key, config] of Object.entries(DUBBELBESTEMMING_ADVIES)) {
      if (lowerDb.includes(key)) {
        checks.push({
          type: 'dubbelbestemming',
          naam: db,
          adviesVerplicht: true,
          adviesInstantie: config.adviesInstantie,
          wettelijkeBasis: config.wettelijkeBasis,
          aandachtspunten: config.aandachtspunten
        });
        break;
      }
    }
    
    // Als geen match, toch toevoegen met generiek advies
    if (!checks.some(c => c.naam === db)) {
      checks.push({
        type: 'dubbelbestemming',
        naam: db,
        adviesVerplicht: true,
        adviesInstantie: 'Nader te bepalen - check omgevingsplan',
        wettelijkeBasis: 'Omgevingsplan',
        aandachtspunten: [
          'Controleer de specifieke regels in het omgevingsplan',
          'Mogelijk aanvullende voorwaarden of advies vereist'
        ]
      });
    }
  }
  
  return checks;
}

function analyseerParapluplannen(parapluplannen: string[]): ParapluplanCheck[] {
  const checks: ParapluplanCheck[] = [];
  
  // Voeg altijd de standaard parapluplannen toe die altijd gelden
  for (const standaard of STANDAARD_PARAPLUPLANNEN) {
    if (standaard.altijdToepassen) {
      checks.push(standaard);
    }
  }
  
  // Voeg specifiek genoemde parapluplannen toe
  for (const pp of parapluplannen) {
    // Check of al in standaard zit
    const bestaand = STANDAARD_PARAPLUPLANNEN.find(s => 
      s.naam.toLowerCase().includes(pp.toLowerCase()) ||
      pp.toLowerCase().includes(s.onderwerp.toLowerCase())
    );
    
    if (bestaand && !checks.includes(bestaand)) {
      checks.push(bestaand);
    } else if (!bestaand) {
      // Onbekend parapluplan - toch toevoegen
      checks.push({
        naam: pp,
        onderwerp: 'Nader te bepalen',
        altijdToepassen: true,
        toelichting: 'Specifiek parapluplan - raadpleeg de regels'
      });
    }
  }
  
  return checks;
}

function checkStructuurvisie(
  pastBinnenBestemmingsplan: boolean,
  isBinnenOmgevingsplan: boolean
): StructuurvisieCheck {
  // Als het past binnen het bestemmingsplan/omgevingsplan, geen structuurvisie nodig
  if (pastBinnenBestemmingsplan && isBinnenOmgevingsplan) {
    return {
      nodig: false,
      reden: 'Activiteit past binnen het geldende omgevingsplan',
      teRaadplegen: []
    };
  }
  
  // Bij afwijking: structuurvisies raadplegen
  return {
    nodig: true,
    reden: pastBinnenBestemmingsplan 
      ? 'Activiteit past niet binnen het omgevingsplan - BOPA vereist'
      : 'Afwijking van bestemmingsplan - toets aan structuurvisies',
    teRaadplegen: [
      'Gemeentelijke Omgevingsvisie',
      'Provinciale Omgevingsvisie (POV)',
      'Gemeentelijke Structuurvisie (indien nog geldig)',
      'Provinciale Structuurvisie (indien nog geldig)',
      'Regionale Structuurvisie (indien van toepassing)'
    ]
  };
}

// ============================================================================
// HOOFD FUNCTIE: GENEREER BASISLAAG CONTEXT
// ============================================================================

export interface BasislaagInput {
  activiteiten: string[];
  locatieKenmerken: {
    isMonument: boolean;
    isBeschermdGezicht: boolean;
    isNatura2000: boolean;
    isNNN: boolean;
    isBinnenOmgevingsplan: boolean;
    dubbelbestemmingen?: string[]; // bijv. 'Waarde - Archeologie', 'Waterstaat - Waterkering'
    parapluplannen?: string[]; // bijv. 'Parapluplan Parkeren', 'Parapluplan Archeologie'
  };
  omvang?: {
    oppervlakte?: number;
    hoogte?: number;
    volume?: number;
  };
  heeftMERplicht?: boolean;
  nieuweFunctie?: string;
  bestaandeFuncties?: string[];
  pastBinnenBestemmingsplan?: boolean; // false = structuurvisie check nodig
}

export function genereerBasislaagContext(input: BasislaagInput): BasislaagContext {
  // Bepaal procedure
  const procedureBepaling = bepaalProcedure({
    activiteiten: input.activiteiten,
    locatieKenmerken: input.locatieKenmerken,
    omvang: input.omvang || {},
    heeftMERplicht: input.heeftMERplicht || false
  });
  
  // Analyseer tweezijdige werking
  const tweezijdigeWerking = analyseerTweezijdigeWerking(
    input.nieuweFunctie || null,
    input.bestaandeFuncties || [],
    input.activiteiten
  );
  
  // Filter relevante vergunningvrij criteria
  const relevanteVergunningvrijCriteria = VERGUNNINGVRIJ_CRITERIA.filter(criterium => {
    // Toon alleen als er bouwactiviteiten zijn
    return input.activiteiten.some(a => 
      a.toLowerCase().includes('bouw') || 
      a.toLowerCase().includes('uitbreiding') ||
      a.toLowerCase().includes('dakkapel') ||
      a.toLowerCase().includes('erfafscheiding') ||
      a.toLowerCase().includes('zonnepaneel')
    );
  });
  
  // Filter relevante meldingen
  const relevanteMeldingen = MELDINGEN.filter(melding => {
    if (melding.naam === 'Sloopmelding') {
      return input.activiteiten.some(a => a.toLowerCase().includes('sloop'));
    }
    if (melding.naam === 'Gebruiksmelding brandveiligheid') {
      return input.activiteiten.some(a => 
        a.toLowerCase().includes('logies') || 
        a.toLowerCase().includes('zorg') ||
        a.toLowerCase().includes('onderwijs') ||
        a.toLowerCase().includes('kinderopvang')
      );
    }
    return false;
  });
  
  // Genereer termijnen overzicht
  const termijnenOverzicht = `${procedureBepaling.procedure}: ${procedureBepaling.termijn}${procedureBepaling.verlenging ? ` (max verlenging: ${procedureBepaling.verlenging})` : ''}`;
  
  // Analyseer dubbelbestemmingen
  const dubbelbestemmingen = analyseerDubbelbestemmingen(input.locatieKenmerken.dubbelbestemmingen || []);
  
  // Analyseer parapluplannen
  const parapluplannen = analyseerParapluplannen(input.locatieKenmerken.parapluplannen || []);
  
  // Check of structuurvisie nodig is
  const structuurvisieCheck = checkStructuurvisie(
    input.pastBinnenBestemmingsplan ?? true,
    input.locatieKenmerken.isBinnenOmgevingsplan
  );
  
  return {
    procedureBepaling,
    etfalToetsing: ETFAL_CRITERIA,
    tweezijdigeWerking,
    relevanteVergunningvrijCriteria,
    relevanteMeldingen,
    beleidsHierarchie: BELEIDS_HIERARCHIE,
    termijnenOverzicht,
    dubbelbestemmingen,
    parapluplannen,
    structuurvisieCheck
  };
}
