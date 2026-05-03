/**
 * Gemini AI Service - DSO Analyse met Policy Assist Juridische Filtermethodiek
 * 
 * KERN PRINCIPE: Niet "alles zoeken" maar systematisch uitsluiten wat NIET relevant is.
 * Beleid zoeken doe je locatie-, activiteit- en proceduregestuurd. Niet document-gestuurd.
 * 
 * 7-STAPPEN METHODIEK:
 * 1. Exacte locatie bepalen (perceelgrenzen, kadastraal, omgevingsplan)
 * 2. Procedure bepalen (binnenplans/BOPA/vergunningvrij) - hangt af van locatie
 * 3. Activiteiten identificeren (inclusief impliciete activiteiten)
 * 4. Beleids-hiërarchie toepassen (hoger recht gaat voor)
 * 5. Juridische status per document checken
 * 6. Tweezijdige werking check bij BOPA's
 * 7. Documenteren wat NIET wordt gebruikt en waarom
 */

import { invokeLLM } from '../_core/llm';
import { analyseLocatie, formatLocatieVoorAI, type LocatieAnalyse } from './locatieService';
import { getFeedbackPatronenForAI } from '../db';
import { 
  genereerBasislaagContext, 
  formatBasislaagVoorAI, 
  type BasislaagInput,
  type BasislaagContext 
} from './basislaagService';
import {
  formatToetsingskadersVoorAI,
  detecteerActiviteitType,
  detecteerFunctieType,
  type ActiviteitType,
  type FunctieType
} from './toetsingsmatrixService';
import {
  bepaalIndieningsvereisten,
  controleerVolledigheid,
  formatIndieningsvereistenVoorAI,
  type IndieningsvereistenResultaat
} from './indieningsvereistenService';
import {
  haalVrijstellingsGrenzen,
  analyseerGraafwerk,
  vergelijkMetVrijstellingen,
  bepaalGraafwerkConsequenties,
  type GraafwerkAnalyse,
  type GraafwerkConsequentie,
  type VrijstellingsGrenzen
} from './vrijstellingsService';
import {
  bepaalVergunningCheck,
  bepaalBevoegdGezag,
  haalToepasbareRegels,
  type Locatie as DSOLocatie
} from './dsoApiService';
import {
  voerBeslisboomUit,
  combineerConclusies,
  formatBeslisboomVoorAI,
  type BeslisboomInput,
  type BeslisboomResultaat,
  type BeschermingsRegime,
  type DSOConclusieBasis,
  type ActiviteitType as BeslisboomActiviteitType
} from './vergunningBeslisboomService';
import {
  voerCentraleBeslisboomUit,
  formatCentraleBeslisboomVoorAI,
  type BeslisboomInput as CentraleBeslisboomInput,
  type BeslisboomResultaat as CentraleBeslisboomResultaat,
  type ActiviteitType as CentraleActiviteitType,
  type FunctieType as CentraleFunctieType
} from './centraleBeslisboomService';
import {
  haalKennisbankItems,
  formatKennisbankVoorAI,
  type KennisbankQuery,
  type KennisbankResultaat,
  type GemeenteContext as KennisbankGemeenteContext
} from './gelaagdeKennisbankService';
import { generateNitrogenPreAssessment, generateNitrogenPreAssessmentWithNatura2000 } from './aeriusApiService';
import { checkFunderingsproblematiek, type FunderingsCheckResult } from './funderingsproblematiekService';
import { bevraagBodemloket } from './bodemloketService';
import { checkGewaspercelen, isBRPCheckRelevant, type BRPCheckResult } from './brpGewaspercelenService';
import { checkCultuurhistorie, type CultuurhistorieCheckResult } from './cultuurhistorieService';
import { analyzeTopografie, type TopografischeAnalyse } from './bgtService';
import { analyzeGeurbelasting, type GeurAnalyse } from './geurcontourenService';
import { 
  verzamelJurisprudentieContext, 
  genereerJurisprudentieSectie,
  type JurisprudentieContext 
} from './jurisprudentieIntegratie.service';

// In-memory cache voor Gemini resultaten
const analysisCache = new Map<string, { result: AnalysisResult; timestamp: number; policyUpdate: Date }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 uur

export interface GemeenteContext {
  id: number;
  gemeenteNaam: string;
  provincie: string;
  waterschapCode?: string;
  waterschapNaam?: string;
  vrCode?: string;
  vrNaam?: string;
  odCode?: string;
  odNaam?: string;
  ggdCode?: string;
  ggdNaam?: string;
  recreatieschapNaam?: string;
  recreatieschapCode?: string;
  welstandsniveauDefault?: string;
  heeftBeschermdGezicht?: boolean;
  lastPolicyUpdate?: Date;
  neemConceptenMee?: boolean;
  kennisbank?: KennisbankContext;
}

export interface KennisbankContext {
  adviseurs: {
    naam: string;
    type: 'intern' | 'extern';
    categorie: string;
    triggers: string[];
    termijnWeken: number;
    grondslag: string;
    isVerplicht?: boolean;
    juridischeStatus?: 'bindend' | 'richtinggevend' | 'afwegingskader';
  }[];
  beleidsdocumenten: {
    naam: string;
    type: string;
    relevantieTags?: string;
    isConceptDocument?: boolean;
    juridischeStatus?: 'normstellend' | 'richtinggevend' | 'afwegingskader';
    heeftTweezijdigeWerking?: boolean;
  }[];
  toetsingskaders?: {
    naam: string;
    laag: string;
    beschrijving: string;
    toepassingscriteria?: string;
    juridischeStatus?: 'normstellend' | 'richtinggevend' | 'afwegingskader';
  }[];
}

export interface DSOAanvraag {
  zaaknummer: string;
  activiteiten: string[];
  omschrijving?: string;
  adres?: string;
  coordinates?: { lat: number; lon: number };
  // Locatie-specifieke informatie (Stap 1)
  kadastraalObject?: string;
  perceelgrenzen?: string;
  omgevingsplanGebied?: string;
  bestemmingHuidig?: string;
  // Gebiedsinformatie
  natura2000?: { inGebied: boolean; gebiedNaam?: string };
  archeologie?: { inZone: boolean; zoneType?: string };
  beschermdGezicht?: boolean;
  // Bijlagen
  bijlagen?: { naam: string; type: string }[];
  // Automatisch opgehaalde locatie analyse (via DSO API's)
  locatieAnalyse?: LocatieAnalyse;
}

export interface AdviseurAdvies {
  adviseurNaam: string;
  categorie: string;
  type: 'intern' | 'extern';
  isVerplicht: boolean;
  termijnWeken: number;
  grondslag?: string;
  contactEmail?: string;
  juridischeStatus?: 'bindend' | 'richtinggevend' | 'afwegingskader';
}

// Uitgebreide interface voor uitgesloten beleid (Stap 7)
export interface UitgeslotenBeleid {
  naam: string;
  laag: 'basis' | 'landelijk' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
  redenUitsluiting: string;
  juridischeMotivering: string;
}

export interface AnalysisResult {
  zaaknummer: string;
  datumAnalyse: Date;
  
  // Stap 0: Aanvraag samenvatting (nieuw)
  aanvraagSamenvatting?: {
    bouwactiviteitOmschrijving: string; // bijv. "bouwen van een uitbouw van 10m² (4m x 2,5m) aan de achterzijde"
    bouwactiviteitType: 'nieuwbouw' | 'uitbreiding' | 'verbouwing' | 'dakkapel' | 'bijgebouw' | 'aanbouw' | 'opbouw' | 'overig';
    geschatteAfmetingen?: {
      oppervlakteM2?: number;
      hoogteM?: number;
      breedteM?: number;
      diepteM?: number;
    };
    locatieOpPerceel?: string; // bijv. "achterzijde", "voorgevel", "zijgevel"
    beoogdGebruik?: string; // bijv. "woonruimte", "berging", "kantoor"
    afmetingenBron?: string; // bijv. "tekening", "omschrijving", "schatting"
  };
  
  // Stap 0b: Omgevingsplan toets (nieuw - aan begin rapport)
  omgevingsplanToets?: {
    planNaam: string; // bijv. "Omgevingsplan Hoorn"
    planStatus: 'vastgesteld' | 'ontwerp' | 'bruidsschat';
    geldendeBestemming: string; // bijv. "Wonen"
    toegestaanGebruik: string[]; // bijv. ["wonen", "aan-huis-verbonden beroep"]
    bouwregels: {
      maxBouwhoogte?: string;
      maxGoothoogte?: string;
      maxBebouwingspercentage?: string;
      maxInhoud?: string;
      afstandTotErfgrens?: string;
    };
    // Nieuw: Dubbelbestemmingen uit Ruimtelijkeplannen.nl API
    dubbelbestemmingen?: {
      naam: string;
      type: string;
      artikelNummer?: string;
      adviesInstantie?: string;
      aandachtspunten: string[];
    }[];
    // Nieuw: Gebiedsaanduidingen
    gebiedsaanduidingen?: {
      naam: string;
      type: string;
      artikelNummer?: string;
    }[];
    passenBinnenBestemming: boolean;
    afwijkingNodig: boolean;
    afwijkingType?: 'binnenplans' | 'buitenplans_regulier' | 'buitenplans_uitgebreid';
    afwijkingMotivering?: string;
    relevantePlanregels: {
      artikel: string;
      inhoud: string;
      conclusie: 'voldoet' | 'voldoet_niet' | 'nader_onderzoek';
      bronUrl?: string; // Link naar ruimtelijkeplannen.nl of omgevingsloket
      planId?: string; // Plan identificatie voor directe link
    }[];
  };
  
  // Stap 1: Locatie analyse
  locatieAnalyse: {
    adres: string;
    kadastraalObject?: string;
    omgevingsplanGebied?: string;
    bestemmingHuidig?: string;
    bijzondereGebieden: string[]; // Natura2000, beschermd gezicht, etc.
  };
  
  // Stap 2: Procedure bepaling (afhankelijk van locatie)
  procedureBepaling: {
    isBinnenplans: boolean;
    isBOPA: boolean;
    isVergunningvrij: boolean;
    procedureType: 'VERGUNNINGVRIJ' | 'REGULIER' | 'BOPA_REGULIER' | 'BOPA_UITGEBREID';
    procedureTermijn: number;
    motivering: string;
  };
  
  // Stap 3: Activiteiten (inclusief impliciete)
  activiteitenAnalyse: {
    expliciet: string[]; // Wat is aangekruist in DSO
    impliciet: string[]; // Gedetecteerde neveneffecten
    totaal: string[];
  };
  
  // Stap 4: Beleids-hiërarchie (hoger recht gaat voor)
  beleidsHierarchie: {
    naam: string;
    laag: 'basis' | 'landelijk' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
    relevant: boolean;
    toelichting: string;
    isConceptDocument?: boolean;
    juridischeStatus?: 'normstellend' | 'richtinggevend' | 'afwegingskader';
    // Als regel al in hoger recht zit, geen los beleid meer zoeken
    overschrevenDoorHogerRecht?: boolean;
  }[];
  
  // Stap 5: Juridische status per document
  toetsingskaders: {
    naam: string;
    laag: 'basis' | 'landelijk' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
    relevant: boolean;
    toelichting: string;
    isConceptDocument?: boolean;
    juridischeStatus: 'normstellend' | 'richtinggevend' | 'afwegingskader';
    isBindend: boolean;
    isConcreetGenoeg: boolean; // Om rechten aan te ontlenen
  }[];
  
  // Stap 6: Tweezijdige werking (alleen bij BOPA's)
  tweezijdigeWerkingCheck?: {
    isRelevant: boolean; // Alleen bij BOPA
    beschermdeFuncties: {
      functie: string;
      type: 'nieuw' | 'bestaand';
      beschermdDoor: string;
    }[];
    vernietigingsrisico: 'laag' | 'middel' | 'hoog';
    toelichting: string;
  };
  
  // Stap 7: Uitgesloten beleid met motivering
  uitgeslotenBeleid: UitgeslotenBeleid[];
  
  // Adviseurs
  adviseurs: AdviseurAdvies[];
  
  // Aandachtspunten
  aandachtspunten: {
    categorie: string;
    beschrijving: string;
    prioriteit: 'hoog' | 'middel' | 'laag';
    juridischRisico?: boolean;
  }[];
  
  // Samenvatting
  samenvatting: string;

  // Haalbaarheidsschatting
  haalbaarheidsschatting?: {
    conclusie: 'haalbaar' | 'haalbaar_met_voorwaarden' | 'waarschijnlijk_niet_haalbaar' | 'niet_haalbaar';
    score: number; // 0-100
    toelichting: string;
    positieveFactoren: string[];
    risicofactoren: string[];
    voorwaarden?: string[];
    aanbevelingen: string[];
  };

  // Vereiste onderzoeken
  onderzoekenResultaat?: {
    verplichteOnderzoeken: {
      type: string;
      naam: string;
      reden: string;
      trigger: string;
      toelichting: string;
      instantie?: string;
      kostenindicatie?: string;
      doorlooptijd?: string;
      wettelijkeBasis?: string;
    }[];
    aanbevolenOnderzoeken: {
      type: string;
      naam: string;
      reden: string;
      trigger: string;
      toelichting: string;
    }[];
    klicMeldingVereist: boolean;
    klicToelichting?: string;
    totaalAantalVerplicht: number;
    totaalAantalAanbevolen: number;
  };

  // Indieningsvereisten check
  indieningsvereisten?: {
    volledig: boolean;
    aantalVerplicht: number;
    aantalAanwezig: number;
    aantalOntbreekt: number;
    ontbrekendeDocumenten: {
      id: string;
      naam: string;
      wettelijkeBasis: string;
      toelichting: string;
    }[];
    aanbevolenDocumenten: {
      id: string;
      naam: string;
      toelichting: string;
    }[];
  };
  
  // Graafwerk analyse (met formuliergegevens of schatting)
  graafwerkAnalyse?: {
    heeftGraafwerk: boolean;
    graafdiepteCm: number;
    oppervlakteM2: number;
    diepteBron: 'formulier' | 'schatting';
    oppervlakteBron: 'formulier' | 'schatting';
    indicatoren: string[];
    zekerheid: 'hoog' | 'middel' | 'laag';
    toelichting: string;
    // Backwards compatibility
    geschatteGraafdiepteCm: number;
    geschatteOppervlakteM2: number;
    // Realiteitscheck: vergelijkt opgegeven waarden met verwachte ranges
    realiteitscheck?: {
      diepteRealistisch: boolean;
      oppervlakteRealistisch: boolean;
      verwachteRangeDiepteCm: { min: number; max: number };
      verwachteRangeOppervlakteM2: { min: number; max: number };
      waarschuwingen: string[];
    };
    // Consequenties van graafwerk (KLIC-melding, grondverzet, bemaling, bodemonderzoek)
    consequenties?: GraafwerkConsequentie[];
    // Vergelijking met vrijstellingsgrenzen
    vrijstellingsCheck?: {
      onderzoekVerplicht: boolean;
      reden: string;
      vrijstellingVanToepassing: boolean;
      vrijstellingsgrenzen: {
        diepteCm: number;
        oppervlakteM2: number;
        bron: string;
      };
    };
  };
  
  // Bodemloket check (bevoegde omgevingsdienst voor bodemkwaliteit)
  bodemloketCheck?: {
    gevonden: boolean;
    omgevingsdienstNaam: string | null;
    omgevingsdienstUrl: string | null;
    websiteBeschikbaar: boolean;
    dossierBeschikbaar: boolean;
    aanbeveling: string;
    bron: string;
  };

  // Volledigheidscheck door AI
  volledigheidscheck?: {
    isVolledig: boolean;
    ontbrekendeStukken: {
      document: string;
      wettelijkeBasis: string;
      toelichting: string;
    }[];
    aanbevelingen: string[];
    aiToelichting: string;
  };
  
  // DSO Vergunningcheck resultaten (officiële API)
  dsoVergunningcheck?: {
    conclusies: {
      type: 'vergunningplicht' | 'meldingsplicht' | 'vergunningvrij' | 'verbod' | 'onbekend';
      omschrijving: string;
      activiteiten: string[];
      juridischeGrondslag?: string;
    }[];
    indieningsvereisten: {
      naam: string;
      omschrijving: string;
      verplicht: boolean;
      documentType?: string;
    }[];
    openVragen?: {
      vraagId: string;
      vraagTekst: string;
      antwoordOpties?: string[];
    }[];
    bevoegdGezag?: {
      naam: string;
      oin: string;
    }[];
    behandeldienst?: {
      naam: string;
      oin: string;
    };
    toepasbareRegels?: {
      identificatie: string;
      naam: string;
      type: string;
      conclusie?: string;
      juridischeGrondslag?: string;
    }[];
    // Samenvatting voor rapport
    samenvattingConclusie: 'vergunningplicht' | 'meldingsplicht' | 'vergunningvrij' | 'gemengd' | 'onbekend';
    samenvattingToelichting: string;
  };
  
  // Vergunning Beslisboom Resultaat (juridisch correcte conclusie)
  beslisboomResultaat?: {
    conclusie: 'vergunningplichtig' | 'meldingsplichtig' | 'vergunningvrij';
    motivering: string;
    juridischeGrondslag: string;
    isOverride: boolean;
    overrideReden?: string;
    overrideBron?: string;
    beschermingsregimesContext: string[]; // Namen van regimes die alleen context zijn
    beschermingsregimesDoorslaggevend: string[]; // Namen van regimes die doorslaggevend zijn
    rapportageTekst: string;
    stappen: {
      stap: number;
      titel: string;
      vraag: string;
      antwoord: string;
      toelichting: string;
    }[];
  };
  
  // Centrale Beslisboom Resultaat (geïntegreerde toetsingshiërarchie + vergunningplicht)
  centraleBeslisboomResultaat?: {
    eindconclusie: 'vergunningvrij' | 'meldingsplichtig' | 'vergunningplichtig_regulier' | 'vergunningplichtig_uitgebreid';
    motivering: string;
    juridischeGrondslag: string;
    toetsingskaders: {
      naam: string;
      laag: string;
      prioriteit: 'altijd' | 'soms' | 'nooit';
      wettelijkeBasis: string;
      toelichting: string;
    }[];
    beschermingsregimes: {
      naam: string;
      type: string;
      isDoorslaggevend: boolean;
      uitzonderingArtikel?: string;
    }[];
    doorlopenStappen: {
      stap: number;
      titel: string;
      resultaat: string;
      toelichting: string;
    }[];
  };
  
  // Gelaagde Kennisbank Resultaat (5 lagen, 4 categorieën)
  kennisbankResultaat?: {
    perLaag: {
      laag: 'basis' | 'landelijk' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
      aantalItems: number;
      items: {
        categorie: 'adviseurs' | 'toetsingskaders' | 'onderzoeken' | 'beleidsdocumenten';
        naam: string;
        toelichting: string;
        juridischeStatus?: string;
        trigger?: string;
      }[];
    }[];
    perCategorie: {
      categorie: 'adviseurs' | 'toetsingskaders' | 'onderzoeken' | 'beleidsdocumenten';
      aantalItems: number;
    }[];
    totaalAantalItems: number;
    aiContext: string; // Geformatteerde context voor AI prompt
  };
  
  // Legacy velden voor backwards compatibility
  isVergunningvrij: boolean;
  procedureType: 'VERGUNNINGVRIJ' | 'REGULIER' | 'BOPA_REGULIER' | 'BOPA_UITGEBREID';
  procedureTermijn: number;
  
  // Stikstof voortoets (AERIUS)
  stikstofVoortoets?: {
    requiresCalculation: boolean;
    riskLevel: 'laag' | 'middel' | 'hoog';
    summary: string;
    recommendations: string[];
    emissionSources: string[];
  };
  
  // BRP Gewaspercelen check (optioneel voor agrarische locaties)
  gewaspercelenCheck?: {
    heeftLandbouwpercelen: boolean;
    aantalPercelen: number;
    categorieën: {
      categorie: string;
      aantal: number;
      gewassen: string[];
    }[];
    relevantieIndicatie: {
      isAgrarischGebied: boolean;
      heeftVeehouderij: boolean;
      heeftAkkerbouw: boolean;
      heeftTuinbouw: boolean;
      heeftGrasland: boolean;
    };
    aanbevelingen: string[];
  };
  
  // Cultuurhistorie check (RCE - monumenten en beschermde gezichten)
  cultuurhistorieCheck?: {
    heeftBeschermdeStatus: boolean;
    inBeschermdStadsgezicht: boolean;
    inBeschermdDorpsgezicht: boolean;
    nabijMonumenten: boolean;
    monumentenInOmgeving: number;
    beschermdeGebieden: {
      type: 'monument' | 'beschermd_stadsgezicht' | 'beschermd_dorpsgezicht';
      naam: string;
      afstand?: number;
      ligging: 'binnen' | 'nabij';
    }[];
    aanbevelingen: string[];
  };
  
  // BGT Topografische analyse
  topografischeAnalyse?: {
    panden: {
      aantal: number;
      statussen: Record<string, number>;
    };
    groenvoorziening: {
      aanwezig: boolean;
      types: Record<string, number>;
      totaalAantal: number;
    };
    water: {
      aanwezig: boolean;
      types: Record<string, number>;
      totaalAantal: number;
    };
    wegen: {
      aanwezig: boolean;
      functies: Record<string, number>;
      totaalAantal: number;
    };
    samenvatting: string;
    aanbevelingen: string[];
  };
  
  // Geurcontouren veehouderijen
  geurAnalyse?: {
    binnenGeurcontour: boolean;
    gesScore: number | null;
    gesOmschrijving: string;
    risiconiveau: 'geen' | 'laag' | 'middel' | 'hoog' | 'zeer_hoog';
    provincie: string | null;
    aanbevelingen: string[];
  };
  
  // Funderingsproblematiek check (PDOK)
  funderingscheck?: {
    inRisicogebied: boolean;
    risicoNiveau: 'geen' | 'laag' | 'middel' | 'hoog';
    gebiedsInfo?: {
      postcodegebied: string;
      gemeente: string;
      fysischGeografischeRegio: string;
      percentageVoor1970: number;
      legendaKlasse: string;
    };
    aanbevelingen: string[];
  };
  
  // Milieutoets Signalering
  milieuToetsSignalering?: {
    isToetsNodig: boolean;
    activiteitType: 'bouwactiviteit' | 'milieubelastende_activiteit' | 'wijziging_gebruik' | 'bopa' | 'combinatie' | 'geen_milieugevolgen';
    relevanteThemas: {
      naam: string;
      code: string;
      isRelevant: boolean;
      reden: string;
      prioriteit: 'hoog' | 'middel' | 'laag';
      regelverwijzingen: {
        bron: string;
        artikel: string;
        titel: string;
        url: string;
        samenvatting: string;
      }[];
    }[];
    balBklRegels: {
      bron: string;
      artikel: string;
      titel: string;
      url: string;
      samenvatting: string;
    }[];
    merBeoordeling: {
      isNodig: boolean;
      reden: string;
      drempelwaarden: {
        criterium: string;
        drempel: string;
        actueleWaarde: string | null;
        overschreden: boolean | null;
      }[];
      aanbeveling: string;
    };
    bopaMotivering: {
      isVanToepassing: boolean;
      afwijkingVan: string;
      integraleBelangafweging: string[];
      milieuAspecten: string[];
    } | null;
    checklist: {
      categorie: string;
      item: string;
      status: 'verplicht' | 'aanbevolen' | 'optioneel';
      toelichting: string;
      regelgrondslag: string;
    }[];
    samenvatting: string;
  };
  
  // Geluid/Geur/Externe Veiligheid
  geluidsAnalyse?: {
    heeftGeluidsbelasting: boolean;
    wegverkeer: { aanwezig: boolean; ldenWaarde: number | null; categorie: string | null; };
    railverkeer: { aanwezig: boolean; afstandTotSpoor: number | null; };
    industrie: { aanwezig: boolean; binnenGeluidszone: boolean; };
    vliegveld: { aanwezig: boolean; vliegveldNaam: string | null; };
    stiltegebied: { aanwezig: boolean; gebiedNaam: string | null; };
    overschrijding: { heeftOverschrijding: boolean; overschrijdingDb: number | null; };
    aanbevelingen: string[];
    bronnen: string[];
  };
  
  geurAnalyseUitgebreid?: {
    heeftGeurbelasting: boolean;
    veehouderij: { aanwezig: boolean; dichtstbijzijndeAfstand: number | null; typeVeehouderij: string | null; overschrijdtNorm: boolean; };
    industrie: { aanwezig: boolean; binnenGeurcontour: boolean; };
    aanbevelingen: string[];
    bronnen: string[];
  };
  
  externeVeiligheidAnalyse?: {
    heeftRisico: boolean;
    plaatsgebondenRisico: { binnenPR10_6: boolean; bronType: string | null; bronNaam: string | null; };
    groepsrisico: { verantwoordingsplicht: boolean; adviesVeiligheidsregio: boolean; };
    beviInrichtingen: Array<{ naam: string; afstand: number; risicoCategorie: string; }>;
    buisleidingen: Array<{ type: string; afstand: number; invloedsgebied: number; }>;
    aanbevelingen: string[];
    bronnen: string[];
  };

  // Metadata
  verwerkingDuurMs: number;
  bronnen: string[];
}

/**
 * Genereer cache key voor analyse
 */
function generateCacheKey(aanvraag: DSOAanvraag, gemeente: GemeenteContext): string {
  return `${aanvraag.zaaknummer}-${gemeente.gemeenteNaam}-${aanvraag.activiteiten.sort().join(',')}`;
}

/**
 * Check of cache geldig is
 */
function isCacheValid(cacheEntry: { result: AnalysisResult; timestamp: number; policyUpdate: Date }, gemeente: GemeenteContext): boolean {
  const now = Date.now();
  if (now - cacheEntry.timestamp > CACHE_TTL) return false;
  if (gemeente.lastPolicyUpdate && cacheEntry.policyUpdate < gemeente.lastPolicyUpdate) return false;
  return true;
}

/**
 * Bouw de 7-stappen methodiek context voor de AI prompt
 */
function buildJuridischeMethodiekContext(gemeente: GemeenteContext): string {
  let kennisbankSection = '';
  let basislaagSection = '';
  
  if (gemeente.kennisbank) {
    const { adviseurs, beleidsdocumenten, toetsingskaders } = gemeente.kennisbank;
    
    // Basislaag: Policy Assist methodiek - ALTIJD meesturen
    if (toetsingskaders && toetsingskaders.length > 0) {
      const basisKaders = toetsingskaders.filter(k => k.laag === 'rijks' || k.laag === 'basis');
      if (basisKaders.length > 0) {
        basislaagSection = `\n## BASISLAAG: Policy Assist Methodiek (ALTIJD toepassen)\n`;
        for (const kader of basisKaders) {
          basislaagSection += `\n### ${kader.naam}\n${kader.beschrijving}\n`;
          if (kader.toepassingscriteria) {
            basislaagSection += `**Wanneer van toepassing:** ${kader.toepassingscriteria}\n`;
          }
        }
      }
    }
    
    if (adviseurs.length > 0) {
      kennisbankSection += `\n## Beschikbare Adviseurs\n`;
      for (const adv of adviseurs) {
        kennisbankSection += `- **${adv.naam}** (${adv.type}, ${adv.categorie})\n`;
        kennisbankSection += `  - Triggers: ${adv.triggers.join(', ')}\n`;
        kennisbankSection += `  - Termijn: ${adv.termijnWeken} weken | Grondslag: ${adv.grondslag}\n`;
        if (adv.juridischeStatus) {
          kennisbankSection += `  - Juridische status: ${adv.juridischeStatus}\n`;
        }
      }
    }
    
    if (beleidsdocumenten.length > 0) {
      kennisbankSection += `\n## Beleidsdocumenten\n`;
      for (const doc of beleidsdocumenten) {
        const conceptLabel = doc.isConceptDocument ? ' [CONCEPT]' : '';
        kennisbankSection += `- **${doc.naam}**${conceptLabel} (${doc.type})\n`;
        if (doc.relevantieTags) {
          kennisbankSection += `  - Relevant voor: ${doc.relevantieTags}\n`;
        }
        if (doc.juridischeStatus) {
          kennisbankSection += `  - Juridische status: ${doc.juridischeStatus}\n`;
        }
        if (doc.heeftTweezijdigeWerking) {
          kennisbankSection += `  - ⚠️ Heeft tweezijdige werking\n`;
        }
      }
    }
  }
  
  return `
# POLICY ASSIST JURIDISCHE FILTERMETHODIEK

## KERNPRINCIPE
De beste manier is NIET "alles zoeken", maar SYSTEMATISCH UITSLUITEN wat NIET relevant is.
Beleid zoeken doe je locatie-, activiteit- en proceduregestuurd. NIET document-gestuurd.
Wie "alles doorzoekt", maakt juridisch juist MEER fouten.

## 7-STAPPEN ANALYSE (in deze volgorde!)

### STAP 1: EXACTE LOCATIE BEPALEN (EERST!)
- Niet globaal ("Hoorn") maar: perceelgrenzen, kadastraal object
- Omgevingsplan is LOCATIE-SPECIFIEK
- Parapluplannen gelden soms maar deels
- Beschermde gebieden lopen dwars door percelen
❗ Veel fouten ontstaan hier: verkeerde planlaag, verkeerde bestemming

### STAP 2: PROCEDURE BEPALEN (hangt af van locatie!)
De procedure bepaalt het toetsingskader. Eerste vraag is NOOIT "Welk beleid geldt hier?" maar:
- Binnenplans? → beleid speelt vaak geen zelfstandige rol
- BOPA? → ETFAL → beleid kan beslissend zijn
- Meldingsplichtig?
- Vergunningvrij?
⚠️ Verkeerde procedure = verkeerd beleid = VERNIETIGING bij bezwaar (vaste rechtspraak)

### STAP 3: ACTIVITEITEN IDENTIFICEREN
Niet alleen wat is aangekruist in DSO, maar ook:
- Impliciete activiteiten
- Neveneffecten (geluid, parkeren, gebruik)
Voorbeeld: "Schuur bouwen" → kan zijn: bouwen + gebruiken + afwijken + milieubelasting
👉 Beleid toets je PER ACTIVITEIT, niet per aanvraag

### STAP 4: BELEIDS-HIËRARCHIE TOEPASSEN (essentieel!)
De volgorde is JURIDISCH VAST:
1. Omgevingswet / AMvB's (Bkl, Bbl, Bal) - HOOGSTE
2. Omgevingsplan (incl. bruidsschat + paraplu's)
3. Instructieregels provincie
4. Gemeentelijk beleid (welstand, parkeren, etc.)
5. Regionaal beleid (OD, waterschap, VR) - LAAGSTE
👉 LAGER BELEID MAG NOOIT HOGER RECHT OVERRULEN
👉 Als een regel AL in het omgevingsplan zit, zoek je GEEN los beleid meer

### STAP 5: JURIDISCHE STATUS PER BELEIDSDOCUMENT
Per document ALTIJD checken:
- Is dit beleid NORMSTELLEND of RICHTINGGEVEND?
- Is het BINDEND of AFWEGINGSKADER?
- Heeft het TWEEZIJDIGE WERKING?
- Is het CONCREET GENOEG om rechten aan te ontlenen?
Veel beleid valt hier al af!

### STAP 6: TWEEZIJDIGE WERKING CHECK (bij BOPA's ALTIJD!)
Bij BOPA's ALTIJD nagaan:
- Beschermt dit beleid alleen de NIEUWE functie?
- Of ook BESTAANDE functies?
Als je dit overslaat, loop je GROOT VERNIETIGINGSRISICO

### STAP 7: DOCUMENTEER WAT JE NIET GEBRUIKT
Juridisch heel belangrijk:
- Noteer EXPLICIET waarom bepaald beleid NIET relevant is
- Dat voorkomt discussies in bezwaar
- Niet noemen = risico
- Gemotiveerd uitsluiten = STERK besluit

${basislaagSection}

## WETTELIJK KADER

### Landelijk (Laag 2)
- Omgevingswet (Ow) - Kaderwet fysieke leefomgeving
- Besluit bouwwerken leefomgeving (Bbl) - Technische bouweisen
- Besluit activiteiten leefomgeving (Bal) - Milieubelastende activiteiten
- Besluit kwaliteit leefomgeving (Bkl) - Omgevingswaarden, beoordelingsregels
- Omgevingsbesluit (Ob) - Procedurele bepalingen
- Wet natuurbescherming (Wnb) - Soorten- en gebiedsbescherming
- Erfgoedwet - Monumenten, archeologie

### Provinciaal (Laag 3)
- Provincie: ${gemeente.provincie}
- Provinciale Omgevingsverordening (POV) ${gemeente.provincie}
- Provinciale instructieregels voor omgevingsplan
- NNN-beleid (nee-tenzij regime)

### Regionaal (Laag 4)
- Waterschap: ${gemeente.waterschapNaam || 'Niet gespecificeerd'} - Keur en Legger
- Veiligheidsregio: ${gemeente.vrNaam || 'Niet gespecificeerd'} - Brandveiligheid
- Omgevingsdienst: ${gemeente.odNaam || 'Niet gespecificeerd'} - Milieu
- GGD: ${gemeente.ggdNaam || 'Niet gespecificeerd'} - Gezondheid
${gemeente.recreatieschapNaam ? `- Recreatieschap: ${gemeente.recreatieschapNaam} - Recreatie en natuur` : ''}

### Gemeentelijk (Laag 5)
- Gemeente: ${gemeente.gemeenteNaam}
- Welstandsniveau default: ${gemeente.welstandsniveauDefault || 'Regulier'}
- Beschermd stadsgezicht: ${gemeente.heeftBeschermdGezicht ? 'Ja' : 'Nee'}
${kennisbankSection}

## WAT VAAK FOUT GAAT (VERMIJD DIT!)
❌ "Alle beleidsdocumenten downloaden"
❌ "Zoeken op gemeente + onderwerp"
❌ "Alles noemen voor de zekerheid"
❌ "Beleid toepassen zonder juridische status te checken"

Dit leidt tot:
- Tegenstrijdige motivering
- Onnodige adviseurs
- Zwakke besluiten

## DE KERN
Goed beleid zoeken is GEEN zoekprobleem, maar een JURIDISCH FILTERPROBLEEM.
`;
}

/**
 * Bepaal relevante adviseurs op basis van activiteiten en locatie
 */
function determineAdviseurs(
  activiteiten: string[],
  gemeente: GemeenteContext,
  natura2000: boolean,
  archeologie: boolean
): AdviseurAdvies[] {
  const adviseurs: AdviseurAdvies[] = [];
  
  // Waterschap - bij bouwactiviteiten nabij water of grondwerk
  if (activiteiten.some(a => a.toLowerCase().includes('bouw') || a.toLowerCase().includes('grond'))) {
    adviseurs.push({
      adviseurNaam: gemeente.waterschapNaam || 'Waterschap',
      categorie: 'Waterhuishouding',
      type: 'extern',
      isVerplicht: false,
      termijnWeken: 4,
      grondslag: 'Keur waterschap',
      juridischeStatus: 'bindend',
    });
  }
  
  // Veiligheidsregio - bij brandveiligheid
  if (activiteiten.some(a => a.toLowerCase().includes('brand') || a.toLowerCase().includes('gebruik'))) {
    adviseurs.push({
      adviseurNaam: gemeente.vrNaam || 'Veiligheidsregio',
      categorie: 'Brandveiligheid',
      type: 'extern',
      isVerplicht: true,
      termijnWeken: 4,
      grondslag: 'Bbl hoofdstuk 6',
      juridischeStatus: 'bindend',
    });
  }
  
  // Omgevingsdienst - bij milieuaspecten
  if (activiteiten.some(a => a.toLowerCase().includes('milieu') || a.toLowerCase().includes('bedrijf'))) {
    adviseurs.push({
      adviseurNaam: gemeente.odNaam || 'Omgevingsdienst',
      categorie: 'Milieu',
      type: 'extern',
      isVerplicht: true,
      termijnWeken: 6,
      grondslag: 'Bal',
      juridischeStatus: 'bindend',
    });
  }
  
  // Natura 2000 - RVO
  if (natura2000) {
    adviseurs.push({
      adviseurNaam: 'Rijksdienst voor Ondernemend Nederland (RVO)',
      categorie: 'Natuur',
      type: 'extern',
      isVerplicht: true,
      termijnWeken: 13,
      grondslag: 'Wet natuurbescherming',
      juridischeStatus: 'bindend',
    });
  }
  
  // Archeologie - RCE
  if (archeologie) {
    adviseurs.push({
      adviseurNaam: 'Rijksdienst voor het Cultureel Erfgoed (RCE)',
      categorie: 'Archeologie',
      type: 'extern',
      isVerplicht: true,
      termijnWeken: 8,
      grondslag: 'Erfgoedwet',
      juridischeStatus: 'bindend',
    });
  }
  
  // Welstand - bij bouwactiviteiten
  if (activiteiten.some(a => a.toLowerCase().includes('bouw'))) {
    adviseurs.push({
      adviseurNaam: 'Welstandscommissie',
      categorie: 'Welstand',
      type: 'intern',
      isVerplicht: true,
      termijnWeken: 2,
      grondslag: 'Welstandsnota gemeente',
      juridischeStatus: 'richtinggevend',
    });
  }
  
  return adviseurs;
}

/**
 * Analyseer een DSO-aanvraag met de 7-stappen juridische filtermethodiek
 */
export async function analyzeDSOAanvraag(
  aanvraag: DSOAanvraag,
  gemeente: GemeenteContext
): Promise<AnalysisResult> {
  const startTime = Date.now();
  
  // Check cache
  const cacheKey = generateCacheKey(aanvraag, gemeente);
  const cached = analysisCache.get(cacheKey);
  if (cached && isCacheValid(cached, gemeente)) {
    console.log('[Gemini] Returning cached result for', aanvraag.zaaknummer);
    return cached.result;
  }
  
  // STAP 1: Automatisch locatie analyse uitvoeren als adres beschikbaar is
  // Nu ook met activiteiten voor DSO Toepasbare Regels API
  let locatieContext = '';
  if (aanvraag.adres && !aanvraag.locatieAnalyse) {
    console.log('[Gemini] Automatisch locatie analyse uitvoeren voor:', aanvraag.adres);
    console.log('[Gemini] Met activiteiten voor DSO API:', aanvraag.activiteiten);
    try {
      // Geef activiteiten mee voor DSO Toepasbare Regels API integratie
      const locatieAnalyse = await analyseLocatie(aanvraag.adres, aanvraag.activiteiten);
      if (locatieAnalyse) {
        aanvraag.locatieAnalyse = locatieAnalyse;
        locatieContext = formatLocatieVoorAI(locatieAnalyse);
        
        // Update aanvraag met gevonden gegevens
        aanvraag.kadastraalObject = locatieAnalyse.locatie.kadastraalObject;
        
        // Update bijzondere gebieden
        if (locatieAnalyse.bijzondereGebieden.natura2000) {
          aanvraag.natura2000 = { inGebied: true, gebiedNaam: 'Natura 2000 gebied' };
        }
        if (locatieAnalyse.bijzondereGebieden.archeologischWaardevol) {
          aanvraag.archeologie = { inZone: true, zoneType: 'Archeologisch waardevol' };
        }
        if (locatieAnalyse.bijzondereGebieden.beschermdStadsgezicht) {
          aanvraag.beschermdGezicht = true;
        }
        
        console.log('[Gemini] Locatie analyse voltooid:', {
          gemeente: locatieAnalyse.locatie.gemeente,
          bestemmingsplannen: locatieAnalyse.bestemmingsplannen.length,
          omgevingsplanRegels: locatieAnalyse.omgevingsplanRegels.length,
          bijzondereGebieden: locatieAnalyse.bijzondereGebieden
        });
      }
    } catch (error) {
      console.error('[Gemini] Locatie analyse fout:', error);
    }
  } else if (aanvraag.locatieAnalyse) {
    locatieContext = formatLocatieVoorAI(aanvraag.locatieAnalyse);
  }
  
  // BASISLAAG: Genereer juridisch kader context (altijd gebruiken bij rapport)
  const basislaagInput: BasislaagInput = {
    activiteiten: aanvraag.activiteiten,
    locatieKenmerken: {
      isMonument: aanvraag.locatieAnalyse?.pdokAnalyse?.monumenten?.isRijksmonument || false,
      isBeschermdGezicht: aanvraag.beschermdGezicht || gemeente.heeftBeschermdGezicht || false,
      isNatura2000: aanvraag.natura2000?.inGebied || false,
      isNNN: false, // NNN wordt apart gedetecteerd via provinciaal beleid
      isBinnenOmgevingsplan: !aanvraag.activiteiten.some(a => 
        a.toLowerCase().includes('bopa') || 
        a.toLowerCase().includes('afwijken')
      )
    },
    heeftMERplicht: aanvraag.activiteiten.some(a => a.toLowerCase().includes('mer')),
    nieuweFunctie: aanvraag.activiteiten.find(a => a.toLowerCase().includes('functiewijziging'))?.split(':')[1]?.trim(),
    bestaandeFuncties: aanvraag.locatieAnalyse?.bestemmingsplannen?.flatMap(bp => 
      bp.bestemmingen?.map(b => b.naam) || []
    ).filter(Boolean) || []
  };
  const basislaagContext = genereerBasislaagContext(basislaagInput);
  const basislaagForAI = formatBasislaagVoorAI(basislaagContext);
  
  // Bouw methodiek context
  const methodiekContext = buildJuridischeMethodiekContext(gemeente);
  
  // Bepaal adviseurs
  const adviseurs = determineAdviseurs(
    aanvraag.activiteiten,
    gemeente,
    aanvraag.natura2000?.inGebied || false,
    aanvraag.archeologie?.inZone || false
  );
  
  // Detecteer activiteiten en functies voor toetsingsmatrix
  const aanvraagTekst = `${aanvraag.activiteiten.join(' ')} ${aanvraag.omschrijving || ''} ${aanvraag.bestemmingHuidig || ''}`;
  const gedetecteerdeActiviteiten = detecteerActiviteitType(aanvraagTekst);
  const gedetecteerdeFuncties = detecteerFunctieType(aanvraagTekst);
  
  // Genereer toetsingsmatrix context (MOET/KAN structuur)
  const toetsingsmatrixContext = formatToetsingskadersVoorAI(gedetecteerdeActiviteiten, gedetecteerdeFuncties);
  
  // JURISPRUDENTIE INTEGRATIE: Bepaal of meerwaarde (BOPA, monument, stikstof, vage normen)
  const isBOPA = aanvraag.activiteiten.some(a => 
    a.toLowerCase().includes('bopa') || 
    a.toLowerCase().includes('buitenplans') ||
    a.toLowerCase().includes('afwijken omgevingsplan')
  );
  const isMonument = basislaagInput.locatieKenmerken.isMonument || 
    aanvraag.activiteiten.some(a => a.toLowerCase().includes('monument'));
  const heeftStikstof = aanvraag.natura2000?.inGebied || 
    aanvraag.activiteiten.some(a => a.toLowerCase().includes('stikstof'));
  
  // PARALLELLE UITVOERING: Feedback patronen en jurisprudentie tegelijk ophalen
  // Dit bespaart 2-5 seconden per analyse
  const parallelStartTime = Date.now();
  console.log('[Gemini] Starting parallel context gathering...');
  
  const [feedbackPatronenContext, jurisprudentieResult] = await Promise.all([
    // ZELFLEREND SYSTEEM: Haal feedback patronen op voor deze gemeente
    getFeedbackPatronenForAI(gemeente.id, gemeente.provincie),
    
    // JURISPRUDENTIE: Alleen ophalen wanneer meerwaarde
    (async () => {
      if (!isBOPA && !isMonument && !heeftStikstof) {
        return { context: null, forAI: '' };
      }
      
      console.log('[Gemini] Jurisprudentie check gestart (parallel) - BOPA:', isBOPA, 'Monument:', isMonument, 'Stikstof:', heeftStikstof);
      try {
        const context = await verzamelJurisprudentieContext(
          aanvraag.activiteiten,
          aanvraag.omschrijving || '',
          gemeente.id,
          gemeente.gemeenteNaam,
          isBOPA,
          isMonument,
          heeftStikstof
        );
        
        if (context.isRelevant) {
          console.log('[Gemini] Jurisprudentie context toegevoegd:', context.cases.length, 'cases');
          return { context, forAI: context.aiContextTekst };
        }
        return { context, forAI: '' };
      } catch (error) {
        console.error('[Gemini] Jurisprudentie ophalen mislukt:', error);
        return { context: null, forAI: '' };
      }
    })()
  ]);
  
  const jurisprudentieContext = jurisprudentieResult.context;
  const jurisprudentieForAI = jurisprudentieResult.forAI;
  
  console.log(`[Gemini] Parallel context gathering completed in ${Date.now() - parallelStartTime}ms`);
  
  // Bouw system prompt met 7-stappen methodiek + basislaag + toetsingsmatrix + feedback patronen + jurisprudentie
  const systemPrompt = `Je bent een expert juridisch behandelassistent voor omgevingsvergunningen in Nederland.
Je analyseert DSO-aanvragen volgens de POLICY ASSIST 7-STAPPEN JURIDISCHE FILTERMETHODIEK.

${basislaagForAI}

${toetsingsmatrixContext}

${methodiekContext}
${feedbackPatronenContext}
${jurisprudentieForAI}

BELANGRIJK: 
1. Gebruik de BASISLAAG als fundament voor elke analyse
2. Gebruik de TOETSINGSMATRIX om te bepalen welke kaders VERPLICHT en OPTIONEEL zijn
3. Volg de 7 stappen IN VOLGORDE. Begin ALTIJD met de exacte locatie (stap 1), dan pas procedure (stap 2)
4. De procedure uit de basislaag bepaalt welk toetsingskader van toepassing is
5. Documenteer EXPLICIET welk beleid je NIET gebruikt en WAAROM (stap 7)
6. Let EXTRA op de geleerde correcties uit het zelflerende systeem (indien aanwezig)

Geef een gestructureerd JSON antwoord met alle 7 stappen.`;

  const userPrompt = `Analyseer deze DSO-aanvraag volgens de 7-stappen methodiek:

## AANVRAAG GEGEVENS
- Zaaknummer: ${aanvraag.zaaknummer}
- Activiteiten (DSO): ${aanvraag.activiteiten.join(', ')}
- Omschrijving: ${aanvraag.omschrijving || 'Niet opgegeven'}

## LOCATIE (Stap 1)
${locatieContext || `- Adres: ${aanvraag.adres || 'Niet opgegeven'}
- Kadastraal object: ${aanvraag.kadastraalObject || 'Niet opgegeven'}
- Omgevingsplan gebied: ${aanvraag.omgevingsplanGebied || 'Niet opgegeven'}
- Huidige bestemming: ${aanvraag.bestemmingHuidig || 'Niet opgegeven'}`}

## BIJZONDERE GEBIEDEN
- Natura 2000: ${aanvraag.natura2000?.inGebied ? `Ja - ${aanvraag.natura2000.gebiedNaam}` : 'Nee'}
- Archeologische zone: ${aanvraag.archeologie?.inZone ? `Ja - ${aanvraag.archeologie.zoneType}` : 'Nee'}
- Beschermd gezicht: ${aanvraag.beschermdGezicht || gemeente.heeftBeschermdGezicht ? 'Ja' : 'Nee'}

## GEMEENTE CONTEXT
- Gemeente: ${gemeente.gemeenteNaam}
- Provincie: ${gemeente.provincie}
- Welstandsniveau: ${gemeente.welstandsniveauDefault || 'Regulier'}

## BIJLAGEN
${aanvraag.bijlagen?.map(b => `- ${b.naam} (${b.type})`).join('\n') || 'Geen bijlagen'}

## INSTRUCTIES VOOR AFMETINGEN EXTRACTIE
Analyseer de bijgevoegde bouwtekeningen en documenten om de volgende afmetingen te extraheren:
1. **Oppervlakte (m²)**: Zoek naar oppervlaktematen in plattegronden, situatietekeningen of omschrijvingen
2. **Hoogte (m)**: Zoek naar hoogtematen in doorsneden, geveltekeningen of omschrijvingen
3. **Breedte en diepte (m)**: Zoek naar afmetingen in plattegronden
4. **Locatie op perceel**: Bepaal waar op het perceel wordt gebouwd (achterzijde, voorgevel, zijgevel, etc.)

Let op: Afmetingen kunnen in verschillende eenheden staan (mm, cm, m). Converteer altijd naar meters.
Als afmetingen niet expliciet vermeld zijn, maak een schatting op basis van de tekeningen of geef aan dat het onbekend is.

## HAALBAARHEIDSSCHATTING
Geef een expliciete haalbaarheidsschatting voor deze aanvraag. Beoordeel op basis van ALLE voorgaande analyses:
- **conclusie**: Kies uit: 'haalbaar', 'haalbaar_met_voorwaarden', 'waarschijnlijk_niet_haalbaar', 'niet_haalbaar'
- **score**: Geef een score van 0-100 (0=kansloos, 100=zeker haalbaar)
- **toelichting**: Leg in 2-3 zinnen uit waarom je tot deze conclusie komt
- **positieveFactoren**: Noem alle factoren die de haalbaarheid POSITIEF beïnvloeden
- **risicofactoren**: Noem alle factoren die de haalbaarheid NEGATIEF beïnvloeden of risico's vormen
- **voorwaarden**: Als conclusie 'haalbaar_met_voorwaarden' is, noem de specifieke voorwaarden
- **aanbevelingen**: Concrete acties die de aanvrager kan nemen om de kans op verlening te vergroten

Weeg hierbij mee: omgevingsplan conformiteit, bestemmingsplan, welstandseisen, monumentenstatus, Natura 2000, archeologie, indieningsvereisten, procedurekeuze, en alle andere relevante factoren.

Voer de 7-stappen analyse uit en geef een volledig rapport inclusief haalbaarheidsschatting.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'policy_assist_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              // Stap 0: Aanvraag samenvatting (specifieke bouwactiviteit)
              aanvraagSamenvatting: {
                type: 'object',
                properties: {
                  bouwactiviteitOmschrijving: { type: 'string', description: 'Specifieke omschrijving van de bouwactiviteit met afmetingen, bijv. "bouwen van een uitbouw van 10m² (4m x 2,5m) aan de achterzijde met een hoogte van 3m"' },
                  bouwactiviteitType: { type: 'string', enum: ['nieuwbouw', 'uitbreiding', 'verbouwing', 'dakkapel', 'bijgebouw', 'aanbouw', 'opbouw', 'overig'] },
                  oppervlakteM2: { type: 'number', description: 'Oppervlakte in m² (geêxtraheerd uit tekeningen of omschrijving)' },
                  hoogteM: { type: 'number', description: 'Hoogte in meters (geêxtraheerd uit tekeningen of omschrijving)' },
                  breedteM: { type: 'number', description: 'Breedte in meters (geêxtraheerd uit tekeningen of omschrijving)' },
                  diepteM: { type: 'number', description: 'Diepte in meters (geêxtraheerd uit tekeningen of omschrijving)' },
                  locatieOpPerceel: { type: 'string', description: 'Locatie op het perceel, bijv. achterzijde, voorgevel, zijgevel, vrijstaand' },
                  beoogdGebruik: { type: 'string', description: 'Beoogd gebruik, bijv. woonruimte, berging, kantoor, garage' },
                  afmetingenBron: { type: 'string', description: 'Bron van de afmetingen: tekening, omschrijving, schatting' },
                },
                required: ['bouwactiviteitOmschrijving', 'bouwactiviteitType'],
                additionalProperties: false,
              },
              // Stap 0b: Omgevingsplan toets
              omgevingsplanToets: {
                type: 'object',
                properties: {
                  planNaam: { type: 'string', description: 'Naam van het geldende omgevingsplan' },
                  planStatus: { type: 'string', enum: ['vastgesteld', 'ontwerp', 'bruidsschat'] },
                  geldendeBestemming: { type: 'string', description: 'De geldende bestemming, bijv. Wonen' },
                  toegestaanGebruik: { type: 'array', items: { type: 'string' }, description: 'Toegestaan gebruik binnen de bestemming' },
                  maxBouwhoogte: { type: 'string', description: 'Maximale bouwhoogte volgens planregels' },
                  maxGoothoogte: { type: 'string', description: 'Maximale goothoogte volgens planregels' },
                  maxBebouwingspercentage: { type: 'string', description: 'Maximaal bebouwingspercentage' },
                  passenBinnenBestemming: { type: 'boolean', description: 'Past de aanvraag binnen de bestemming?' },
                  afwijkingNodig: { type: 'boolean', description: 'Is een afwijking van het omgevingsplan nodig?' },
                  afwijkingType: { type: 'string', enum: ['binnenplans', 'buitenplans_regulier', 'buitenplans_uitgebreid', 'geen'] },
                  afwijkingMotivering: { type: 'string', description: 'Motivering waarom wel/geen afwijking nodig is' },
                  relevantePlanregels: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        artikel: { type: 'string' },
                        inhoud: { type: 'string' },
                        conclusie: { type: 'string', enum: ['voldoet', 'voldoet_niet', 'nader_onderzoek'] },
                      },
                      required: ['artikel', 'inhoud', 'conclusie'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['planNaam', 'geldendeBestemming', 'passenBinnenBestemming', 'afwijkingNodig', 'relevantePlanregels'],
                additionalProperties: false,
              },
              // Stap 1: Locatie
              locatieAnalyse: {
                type: 'object',
                properties: {
                  adres: { type: 'string' },
                  kadastraalObject: { type: 'string' },
                  omgevingsplanGebied: { type: 'string' },
                  bestemmingHuidig: { type: 'string' },
                  bijzondereGebieden: { type: 'array', items: { type: 'string' } },
                },
                required: ['adres', 'bijzondereGebieden'],
                additionalProperties: false,
              },
              // Stap 2: Procedure
              procedureBepaling: {
                type: 'object',
                properties: {
                  isBinnenplans: { type: 'boolean' },
                  isBOPA: { type: 'boolean' },
                  isVergunningvrij: { type: 'boolean' },
                  procedureType: { type: 'string', enum: ['VERGUNNINGVRIJ', 'REGULIER', 'BOPA_REGULIER', 'BOPA_UITGEBREID'] },
                  procedureTermijn: { type: 'integer' },
                  motivering: { type: 'string' },
                },
                required: ['isBinnenplans', 'isBOPA', 'isVergunningvrij', 'procedureType', 'procedureTermijn', 'motivering'],
                additionalProperties: false,
              },
              // Stap 3: Activiteiten
              activiteitenAnalyse: {
                type: 'object',
                properties: {
                  expliciet: { type: 'array', items: { type: 'string' } },
                  impliciet: { type: 'array', items: { type: 'string' } },
                  totaal: { type: 'array', items: { type: 'string' } },
                },
                required: ['expliciet', 'impliciet', 'totaal'],
                additionalProperties: false,
              },
              // Stap 4 & 5: Toetsingskaders met juridische status
              toetsingskaders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    naam: { type: 'string' },
                    laag: { type: 'string', enum: ['basis', 'landelijk', 'provinciaal', 'regionaal', 'gemeentelijk'] },
                    relevant: { type: 'boolean' },
                    toelichting: { type: 'string' },
                    juridischeStatus: { type: 'string', enum: ['normstellend', 'richtinggevend', 'afwegingskader'] },
                    isBindend: { type: 'boolean' },
                    isConcreetGenoeg: { type: 'boolean' },
                    overschrevenDoorHogerRecht: { type: 'boolean' },
                  },
                  required: ['naam', 'laag', 'relevant', 'toelichting', 'juridischeStatus', 'isBindend', 'isConcreetGenoeg'],
                  additionalProperties: false,
                },
              },
              // Stap 6: Tweezijdige werking (alleen bij BOPA)
              tweezijdigeWerkingCheck: {
                type: 'object',
                properties: {
                  isRelevant: { type: 'boolean' },
                  beschermdeFuncties: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        functie: { type: 'string' },
                        type: { type: 'string', enum: ['nieuw', 'bestaand'] },
                        beschermdDoor: { type: 'string' },
                      },
                      required: ['functie', 'type', 'beschermdDoor'],
                      additionalProperties: false,
                    },
                  },
                  vernietigingsrisico: { type: 'string', enum: ['laag', 'middel', 'hoog'] },
                  toelichting: { type: 'string' },
                },
                required: ['isRelevant', 'beschermdeFuncties', 'vernietigingsrisico', 'toelichting'],
                additionalProperties: false,
              },
              // Stap 7: Uitgesloten beleid
              uitgeslotenBeleid: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    naam: { type: 'string' },
                    laag: { type: 'string', enum: ['basis', 'landelijk', 'provinciaal', 'regionaal', 'gemeentelijk'] },
                    redenUitsluiting: { type: 'string' },
                    juridischeMotivering: { type: 'string' },
                  },
                  required: ['naam', 'laag', 'redenUitsluiting', 'juridischeMotivering'],
                  additionalProperties: false,
                },
              },
              // Aandachtspunten
              aandachtspunten: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    categorie: { type: 'string' },
                    beschrijving: { type: 'string' },
                    prioriteit: { type: 'string', enum: ['hoog', 'middel', 'laag'] },
                    juridischRisico: { type: 'boolean' },
                  },
                  required: ['categorie', 'beschrijving', 'prioriteit'],
                  additionalProperties: false,
                },
              },
              // Samenvatting
              samenvatting: { type: 'string' },
              // Haalbaarheidsschatting
              haalbaarheidsschatting: {
                type: 'object',
                properties: {
                  conclusie: { type: 'string', enum: ['haalbaar', 'haalbaar_met_voorwaarden', 'waarschijnlijk_niet_haalbaar', 'niet_haalbaar'] },
                  score: { type: 'integer', minimum: 0, maximum: 100 },
                  toelichting: { type: 'string' },
                  positieveFactoren: { type: 'array', items: { type: 'string' } },
                  risicofactoren: { type: 'array', items: { type: 'string' } },
                  voorwaarden: { type: 'array', items: { type: 'string' } },
                  aanbevelingen: { type: 'array', items: { type: 'string' } },
                },
                required: ['conclusie', 'score', 'toelichting', 'positieveFactoren', 'risicofactoren', 'aanbevelingen'],
                additionalProperties: false,
              },
            },
            required: [
              'aanvraagSamenvatting',
              'omgevingsplanToets',
              'locatieAnalyse',
              'procedureBepaling',
              'activiteitenAnalyse',
              'toetsingskaders',
              'tweezijdigeWerkingCheck',
              'uitgeslotenBeleid',
              'aandachtspunten',
              'samenvatting',
              'haalbaarheidsschatting'
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const aiResult = JSON.parse(typeof content === 'string' ? content : '{}');
    
    const result: AnalysisResult = {
      zaaknummer: aanvraag.zaaknummer,
      datumAnalyse: new Date(),
      
      // Stap 0: Aanvraag samenvatting en omgevingsplan toets
      aanvraagSamenvatting: aiResult.aanvraagSamenvatting ? {
        bouwactiviteitOmschrijving: aiResult.aanvraagSamenvatting.bouwactiviteitOmschrijving,
        bouwactiviteitType: aiResult.aanvraagSamenvatting.bouwactiviteitType,
        geschatteAfmetingen: (aiResult.aanvraagSamenvatting.oppervlakteM2 || aiResult.aanvraagSamenvatting.hoogteM || aiResult.aanvraagSamenvatting.breedteM || aiResult.aanvraagSamenvatting.diepteM) ? {
          oppervlakteM2: aiResult.aanvraagSamenvatting.oppervlakteM2,
          hoogteM: aiResult.aanvraagSamenvatting.hoogteM,
          breedteM: aiResult.aanvraagSamenvatting.breedteM,
          diepteM: aiResult.aanvraagSamenvatting.diepteM,
        } : undefined,
        locatieOpPerceel: aiResult.aanvraagSamenvatting.locatieOpPerceel,
        beoogdGebruik: aiResult.aanvraagSamenvatting.beoogdGebruik,
        afmetingenBron: aiResult.aanvraagSamenvatting.afmetingenBron,
      } : undefined,
      omgevingsplanToets: aiResult.omgevingsplanToets ? {
        planNaam: aiResult.omgevingsplanToets.planNaam,
        planStatus: aiResult.omgevingsplanToets.planStatus || 'bruidsschat',
        geldendeBestemming: aiResult.omgevingsplanToets.geldendeBestemming,
        toegestaanGebruik: aiResult.omgevingsplanToets.toegestaanGebruik || [],
        bouwregels: {
          maxBouwhoogte: aiResult.omgevingsplanToets.maxBouwhoogte,
          maxGoothoogte: aiResult.omgevingsplanToets.maxGoothoogte,
          maxBebouwingspercentage: aiResult.omgevingsplanToets.maxBebouwingspercentage,
        },
        // Dubbelbestemmingen uit ruimtelijke plannen (indien beschikbaar)
        dubbelbestemmingen: aanvraag.locatieAnalyse?.ruimtelijkePlannen?.dubbelbestemmingen?.map(db => ({
          naam: db.naam,
          type: db.type,
          artikelNummer: undefined,
          adviesInstantie: db.adviesInstantie,
          aandachtspunten: db.aandachtspunten || []
        })) || [],
        // Gebiedsaanduidingen uit ruimtelijke plannen
        gebiedsaanduidingen: aanvraag.locatieAnalyse?.ruimtelijkePlannen?.gebiedsaanduidingen?.map(ga => ({
          naam: ga.naam,
          type: ga.type,
          artikelNummer: undefined
        })) || [],
        passenBinnenBestemming: aiResult.omgevingsplanToets.passenBinnenBestemming,
        afwijkingNodig: aiResult.omgevingsplanToets.afwijkingNodig,
        afwijkingType: aiResult.omgevingsplanToets.afwijkingType,
        afwijkingMotivering: aiResult.omgevingsplanToets.afwijkingMotivering,
        relevantePlanregels: aiResult.omgevingsplanToets.relevantePlanregels || [],
      } : undefined,
      
      // Stap 1-7 resultaten
      locatieAnalyse: aiResult.locatieAnalyse,
      procedureBepaling: aiResult.procedureBepaling,
      activiteitenAnalyse: aiResult.activiteitenAnalyse,
      beleidsHierarchie: aiResult.toetsingskaders.filter((t: any) => t.relevant),
      toetsingskaders: aiResult.toetsingskaders,
      tweezijdigeWerkingCheck: aiResult.tweezijdigeWerkingCheck,
      uitgeslotenBeleid: aiResult.uitgeslotenBeleid,
      
      // Adviseurs en aandachtspunten
      adviseurs,
      aandachtspunten: aiResult.aandachtspunten,
      samenvatting: aiResult.samenvatting,
      
      // Haalbaarheidsschatting
      haalbaarheidsschatting: aiResult.haalbaarheidsschatting ? {
        conclusie: aiResult.haalbaarheidsschatting.conclusie,
        score: aiResult.haalbaarheidsschatting.score,
        toelichting: aiResult.haalbaarheidsschatting.toelichting,
        positieveFactoren: aiResult.haalbaarheidsschatting.positieveFactoren,
        risicofactoren: aiResult.haalbaarheidsschatting.risicofactoren,
        voorwaarden: aiResult.haalbaarheidsschatting.voorwaarden,
        aanbevelingen: aiResult.haalbaarheidsschatting.aanbevelingen,
      } : undefined,
      
      // Vereiste onderzoeken (uit locatieAnalyse)
      onderzoekenResultaat: aanvraag.locatieAnalyse?.onderzoekenResultaat ? {
        verplichteOnderzoeken: aanvraag.locatieAnalyse.onderzoekenResultaat.verplichteOnderzoeken.map(o => ({
          type: o.type,
          naam: o.naam,
          reden: o.reden,
          trigger: o.trigger,
          toelichting: o.toelichting,
          instantie: o.instantie,
          kostenindicatie: o.kostenindicatie,
          doorlooptijd: o.doorlooptijd,
          wettelijkeBasis: o.wettelijkeBasis
        })),
        aanbevolenOnderzoeken: aanvraag.locatieAnalyse.onderzoekenResultaat.aanbevolenOnderzoeken.map(o => ({
          type: o.type,
          naam: o.naam,
          reden: o.reden,
          trigger: o.trigger,
          toelichting: o.toelichting
        })),
        klicMeldingVereist: aanvraag.locatieAnalyse.onderzoekenResultaat.klicMeldingVereist,
        klicToelichting: aanvraag.locatieAnalyse.onderzoekenResultaat.klicToelichting,
        totaalAantalVerplicht: aanvraag.locatieAnalyse.onderzoekenResultaat.totaalAantalVerplicht,
        totaalAantalAanbevolen: aanvraag.locatieAnalyse.onderzoekenResultaat.totaalAantalAanbevolen
      } : undefined,

      // Indieningsvereisten check
      indieningsvereisten: (() => {
        // Bepaal locatiekenmerken voor indieningsvereisten
        const locatieKenmerken = {
          isMonument: aanvraag.locatieAnalyse?.pdokAnalyse?.monumenten?.isRijksmonument || false,
          isBeschermdGezicht: aanvraag.beschermdGezicht || false,
          nabijNatura2000: aanvraag.natura2000?.inGebied || false,
          nabijWater: aanvraag.locatieAnalyse?.ruimtelijkePlannen?.dubbelbestemmingen?.some(
            (d: any) => d.type?.includes('water')
          ) || false,
          bouwjaar: undefined, // TODO: Toevoegen aan aanvraag indien beschikbaar
          isBOPA: aiResult.procedureBepaling.procedureType?.includes('BOPA') || false
        };
        
        // Bepaal vereiste documenten
        const vereisten = bepaalIndieningsvereisten(aanvraag.activiteiten, locatieKenmerken);
        
        // Voor nu: geen documenten ingediend (volledigheidscheck)
        const resultaat = controleerVolledigheid(vereisten, []);
        
        return {
          volledig: resultaat.volledig,
          aantalVerplicht: resultaat.aantalVerplicht,
          aantalAanwezig: resultaat.aantalAanwezig,
          aantalOntbreekt: resultaat.aantalOntbreekt,
          ontbrekendeDocumenten: resultaat.ontbrekendeDocumenten.map(d => ({
            id: d.id,
            naam: d.naam,
            wettelijkeBasis: d.wettelijkeBasis,
            toelichting: d.toelichting
          })),
          aanbevolenDocumenten: resultaat.aanbevolenDocumenten.map(d => ({
            id: d.id,
            naam: d.naam,
            toelichting: d.toelichting
          }))
        };
      })(),

      // Graafwerk analyse (met formuliergegevens indien beschikbaar)
      graafwerkAnalyse: await (async () => {
        // Bouw formuliergegevens op uit aanvraagSamenvatting (AI-geëxtraheerd uit DSO-formulier)
        const formulierGegevens = aiResult.aanvraagSamenvatting?.geschatteAfmetingen ? {
          diepteM: aiResult.aanvraagSamenvatting.geschatteAfmetingen.diepteM,
          oppervlakteM2: aiResult.aanvraagSamenvatting.geschatteAfmetingen.oppervlakteM2,
        } : undefined;
        
        // Analyseer graafwerk - gebruikt formulierwaarden als primaire bron, schat als fallback
        const graafwerk = await analyseerGraafwerk(
          aanvraag.activiteiten,
          aanvraag.omschrijving,
          undefined, // bouwtype
          formulierGegevens
        );
        
        if (!graafwerk.heeftGraafwerk) {
          return {
            heeftGraafwerk: false,
            graafdiepteCm: 0,
            oppervlakteM2: 0,
            diepteBron: 'schatting' as const,
            oppervlakteBron: 'schatting' as const,
            indicatoren: [],
            zekerheid: 'laag' as const,
            toelichting: 'Geen graafwerk gedetecteerd op basis van de aanvraag.',
            geschatteGraafdiepteCm: 0,
            geschatteOppervlakteM2: 0,
          };
        }
        
        // Haal vrijstellingsgrenzen op voor de gemeente
        // Gebruik gemeente ID 1 als fallback (Hoorn)
        const gemeenteId = 1; // TODO: Koppelen aan echte gemeente ID
        const vrijstellingen = await haalVrijstellingsGrenzen(gemeenteId, gemeente.gemeenteNaam);
        
        // Vergelijk met vrijstellingsgrenzen
        const vergelijking = vergelijkMetVrijstellingen(graafwerk, vrijstellingen);
        
        return {
          heeftGraafwerk: graafwerk.heeftGraafwerk,
          graafdiepteCm: graafwerk.graafdiepteCm,
          oppervlakteM2: graafwerk.oppervlakteM2,
          diepteBron: graafwerk.diepteBron,
          oppervlakteBron: graafwerk.oppervlakteBron,
          indicatoren: graafwerk.indicatoren,
          zekerheid: graafwerk.zekerheid,
          toelichting: graafwerk.toelichting,
          // Backwards compatibility
          geschatteGraafdiepteCm: graafwerk.geschatteGraafdiepteCm,
          geschatteOppervlakteM2: graafwerk.geschatteOppervlakteM2,
          realiteitscheck: graafwerk.realiteitscheck,
          // Consequenties van graafwerk (KLIC-melding, grondverzet, bemaling, bodemonderzoek)
          consequenties: bepaalGraafwerkConsequenties(graafwerk),
          vrijstellingsCheck: {
            onderzoekVerplicht: vergelijking.onderzoekVerplicht,
            reden: vergelijking.reden,
            vrijstellingVanToepassing: vergelijking.vrijstellingVanToepassing,
            vrijstellingsgrenzen: {
              diepteCm: vrijstellingen.archeologieDiepteCm,
              oppervlakteM2: vrijstellingen.archeologieOppervlakteM2,
              bron: vrijstellingen.bron
            }
          }
        };
      })(),
      
      // Volledigheidscheck door AI
      volledigheidscheck: (() => {
        // Analyseer ingediende documenten vs vereisten
        const ingediendeBijlagen = aanvraag.bijlagen?.map(b => b.naam.toLowerCase()) || [];
        const vereisten = bepaalIndieningsvereisten(aanvraag.activiteiten, {
          isMonument: aanvraag.locatieAnalyse?.pdokAnalyse?.monumenten?.isRijksmonument || false,
          isBeschermdGezicht: aanvraag.beschermdGezicht || false,
          nabijNatura2000: aanvraag.natura2000?.inGebied || false,
          nabijWater: false,
          isBOPA: aiResult.procedureBepaling.procedureType?.includes('BOPA') || false
        });
        
        // Check welke verplichte documenten ontbreken
        const ontbrekendeStukken: { document: string; wettelijkeBasis: string; toelichting: string }[] = [];
        const aanbevelingen: string[] = [];
        
        for (const vereiste of vereisten.filter(v => v.verplicht)) {
          // Zoek of een bijlage matcht met dit vereiste
          const gevonden = ingediendeBijlagen.some(bijlage => 
            bijlage.includes(vereiste.id.replace(/_/g, ' ')) ||
            bijlage.includes(vereiste.naam.toLowerCase())
          );
          
          if (!gevonden) {
            ontbrekendeStukken.push({
              document: vereiste.naam,
              wettelijkeBasis: vereiste.wettelijkeBasis,
              toelichting: vereiste.toelichting
            });
          }
        }
        
        // Genereer aanbevelingen
        if (ontbrekendeStukken.length > 0) {
          aanbevelingen.push(`Vraag de aanvrager om ${ontbrekendeStukken.length} ontbrekende document(en) aan te leveren.`);
          if (ontbrekendeStukken.some(s => s.document.includes('tekening'))) {
            aanbevelingen.push('Controleer of de tekeningen voldoen aan de schaalvereisten (1:100 voor plattegronden, 1:1000 voor situatietekening).');
          }
        }
        
        const isVolledig = ontbrekendeStukken.length === 0;
        
        return {
          isVolledig,
          ontbrekendeStukken,
          aanbevelingen,
          aiToelichting: isVolledig 
            ? 'De aanvraag bevat alle verplichte documenten op basis van de gedetecteerde activiteiten en locatiekenmerken.'
            : `De aanvraag is onvolledig. Er ontbreken ${ontbrekendeStukken.length} verplichte document(en). De aanvrager dient deze aan te leveren voordat de aanvraag in behandeling kan worden genomen (art. 4:5 Awb).`
        };
      })(),

      // DSO Vergunningcheck resultaten (officiële API)
      dsoVergunningcheck: await (async () => {
        // Alleen uitvoeren als we coördinaten hebben
        if (!aanvraag.locatieAnalyse?.locatie?.coordinaten?.rd) {
          console.log('[Gemini] Geen coördinaten beschikbaar voor DSO vergunningcheck');
          return undefined;
        }
        
        const { x, y } = aanvraag.locatieAnalyse.locatie.coordinaten.rd;
        const dsoLocatie: DSOLocatie = {
          type: 'Point',
          coordinates: [x, y]
        };
        
        try {
          // Parallel DSO API calls uitvoeren
          const [vergunningResult, bevoegdGezagResult, toepasbareRegelsResult] = await Promise.all([
            bepaalVergunningCheck(aanvraag.activiteiten, dsoLocatie),
            bepaalBevoegdGezag(aanvraag.activiteiten, dsoLocatie),
            haalToepasbareRegels(dsoLocatie, aanvraag.activiteiten)
          ]);
          
          // Parse conclusies
          const conclusies = vergunningResult.success && vergunningResult.data?.conclusies || [];
          const indieningsvereisten = vergunningResult.success && vergunningResult.data?.indieningsvereisten || [];
          const openVragen = vergunningResult.success ? vergunningResult.data?.openVragen : undefined;
          
          // Parse bevoegd gezag
          const bevoegdGezag = bevoegdGezagResult.success ? bevoegdGezagResult.data?.bevoegdGezag : undefined;
          const behandeldienst = bevoegdGezagResult.success ? bevoegdGezagResult.data?.behandeldienst : undefined;
          
          // Parse toepasbare regels
          const toepasbareRegels = toepasbareRegelsResult.success ? toepasbareRegelsResult.data?.regels : undefined;
          
          // Bepaal samenvatting conclusie
          let samenvattingConclusie: 'vergunningplicht' | 'meldingsplicht' | 'vergunningvrij' | 'gemengd' | 'onbekend' = 'onbekend';
          let samenvattingToelichting = 'Geen DSO conclusies beschikbaar.';
          
          if (conclusies.length > 0) {
            const types = conclusies.map(c => c.type);
            const heeftVergunningplicht = types.includes('vergunningplicht');
            const heeftMeldingsplicht = types.includes('meldingsplicht');
            const heeftVergunningvrij = types.includes('vergunningvrij');
            
            if (heeftVergunningplicht && (heeftMeldingsplicht || heeftVergunningvrij)) {
              samenvattingConclusie = 'gemengd';
              samenvattingToelichting = `De aanvraag bevat ${conclusies.length} activiteiten met verschillende conclusies: sommige zijn vergunningplichtig, andere meldingsplichtig of vergunningvrij.`;
            } else if (heeftVergunningplicht) {
              samenvattingConclusie = 'vergunningplicht';
              samenvattingToelichting = `Alle ${conclusies.length} activiteit(en) zijn vergunningplichtig volgens de DSO toepasbare regels.`;
            } else if (heeftMeldingsplicht) {
              samenvattingConclusie = 'meldingsplicht';
              samenvattingToelichting = `Alle ${conclusies.length} activiteit(en) zijn meldingsplichtig volgens de DSO toepasbare regels.`;
            } else if (heeftVergunningvrij) {
              samenvattingConclusie = 'vergunningvrij';
              samenvattingToelichting = `Alle ${conclusies.length} activiteit(en) zijn vergunningvrij volgens de DSO toepasbare regels.`;
            }
            
            // Voeg juridische grondslagen toe aan toelichting
            const grondslagen = conclusies
              .filter(c => c.juridischeGrondslag)
              .map(c => c.juridischeGrondslag)
              .filter((v, i, a) => a.indexOf(v) === i); // Unique
            
            if (grondslagen.length > 0) {
              samenvattingToelichting += ` Juridische grondslag: ${grondslagen.join(', ')}.`;
            }
          }
          
          console.log('[Gemini] DSO vergunningcheck voltooid:', {
            aantalConclusies: conclusies.length,
            samenvattingConclusie,
            aantalIndieningsvereisten: indieningsvereisten.length,
            aantalToepasbareRegels: toepasbareRegels?.length || 0
          });
          
          return {
            conclusies,
            indieningsvereisten,
            openVragen,
            bevoegdGezag,
            behandeldienst,
            toepasbareRegels,
            samenvattingConclusie,
            samenvattingToelichting
          };
        } catch (error) {
          console.error('[Gemini] DSO vergunningcheck fout:', error);
          return undefined;
        }
      })(),

      // Vergunning Beslisboom Resultaat (juridisch correcte conclusie)
      beslisboomResultaat: await (async () => {
        // Bouw beschermingsregimes lijst op basis van locatieAnalyse
        const beschermingsregimes: BeschermingsRegime[] = [];
        
        // Check beschermd stadsgezicht
        if (aanvraag.beschermdGezicht || aanvraag.locatieAnalyse?.pdokAnalyse?.beschermdGezicht?.binnenGebied) {
          beschermingsregimes.push({
            type: 'beschermd_stadsgezicht',
            naam: aanvraag.locatieAnalyse?.pdokAnalyse?.beschermdGezicht?.gezicht?.naam || 'Beschermd stadsgezicht',
            bron: 'PDOK/Erfgoedwet',
            heeftExplicieteUitzondering: false // Moet uit omgevingsplan komen
          });
        }
        
        // Check rijksmonument
        if (aanvraag.locatieAnalyse?.pdokAnalyse?.monumenten?.isRijksmonument) {
          beschermingsregimes.push({
            type: 'rijksmonument',
            naam: aanvraag.locatieAnalyse.pdokAnalyse.monumenten.monument?.naam || 'Rijksmonument',
            bron: 'Erfgoedwet',
            heeftExplicieteUitzondering: true, // Monumenten zijn altijd vergunningplichtig
            uitzonderingArtikel: 'Omgevingswet art. 5.1 lid 1 sub b',
            uitzonderingTekst: 'Wijzigen van een rijksmonument is altijd vergunningplichtig'
          });
        }
        
        // Check Natura 2000
        if (aanvraag.natura2000?.inGebied || aanvraag.locatieAnalyse?.pdokAnalyse?.natura2000?.binnenGebied) {
          beschermingsregimes.push({
            type: 'natura2000',
            naam: aanvraag.locatieAnalyse?.pdokAnalyse?.natura2000?.dichtstbijzijnde?.naam || aanvraag.natura2000?.gebiedNaam || 'Natura 2000 gebied',
            bron: 'Wet natuurbescherming',
            heeftExplicieteUitzondering: false // Afhankelijk van significante effecten
          });
        }
        
        // Check waterkering (via milieuAnalyse of ruimtelijke plannen)
        // Waterkering info komt via dubbelbestemmingen uit ruimtelijke plannen
        const heeftWaterkering = aanvraag.locatieAnalyse?.ruimtelijkePlannen?.dubbelbestemmingen?.some(
          db => db.type.toLowerCase().includes('waterkering') || db.type.toLowerCase().includes('water')
        );
        if (heeftWaterkering) {
          beschermingsregimes.push({
            type: 'waterkering',
            naam: 'Waterkering',
            bron: 'Waterwet',
            heeftExplicieteUitzondering: true,
            uitzonderingArtikel: 'Waterwet art. 6.5',
            uitzonderingTekst: 'Activiteiten in/nabij waterkering vereisen watervergunning'
          });
        }
        
        // Bepaal DSO conclusie basis
        let dsoConclusieBasis: DSOConclusieBasis | null = null;
        if (aiResult.procedureBepaling) {
          if (aiResult.procedureBepaling.isVergunningvrij) {
            dsoConclusieBasis = {
              conclusie: 'vergunningvrij',
              bron: 'Bbl',
              toelichting: aiResult.procedureBepaling.motivering
            };
          } else if (aiResult.procedureBepaling.procedureType?.includes('BOPA')) {
            dsoConclusieBasis = {
              conclusie: 'vergunningplichtig',
              bron: 'omgevingsplan',
              toelichting: 'Buitenplanse omgevingsplanactiviteit vereist vergunning'
            };
          } else {
            dsoConclusieBasis = {
              conclusie: 'vergunningplichtig',
              bron: 'omgevingsplan',
              toelichting: aiResult.procedureBepaling.motivering
            };
          }
        }
        
        // Bepaal activiteittype voor beslisboom
        const activiteitType: BeslisboomActiviteitType = 
          aanvraag.activiteiten.some(a => a.toLowerCase().includes('bouw')) ? 'bouwen' :
          aanvraag.activiteiten.some(a => a.toLowerCase().includes('sloop')) ? 'slopen' :
          aanvraag.activiteiten.some(a => a.toLowerCase().includes('verbouw')) ? 'verbouwen' :
          aanvraag.activiteiten.some(a => a.toLowerCase().includes('gebruik')) ? 'gebruikswijziging' :
          aanvraag.activiteiten.some(a => a.toLowerCase().includes('monument')) ? 'monument_wijzigen' :
          'bouwen';
        
        // Voer beslisboom uit
        const beslisboomInput: BeslisboomInput = {
          activiteit: activiteitType,
          locatie: {
            coordinates: aanvraag.locatieAnalyse?.locatie?.coordinaten?.rd 
              ? [aanvraag.locatieAnalyse.locatie.coordinaten.rd.x, aanvraag.locatieAnalyse.locatie.coordinaten.rd.y]
              : [0, 0],
            gemeente: gemeente.gemeenteNaam
          },
          beschermingsregimes,
          dsoConclusieBasis: dsoConclusieBasis || undefined
        };
        
        const beslisboomResultaat = voerBeslisboomUit(beslisboomInput);
        
        console.log('[Gemini] Beslisboom resultaat:', {
          conclusie: beslisboomResultaat.conclusie,
          isOverride: beslisboomResultaat.isOverride,
          aantalRegimesContext: beslisboomResultaat.beschermingsregimesContext.length,
          aantalRegimesDoorslaggevend: beslisboomResultaat.beschermingsregimesDoorslaggevend.length
        });
        
        return {
          conclusie: beslisboomResultaat.conclusie,
          motivering: beslisboomResultaat.motivering,
          juridischeGrondslag: beslisboomResultaat.juridischeGrondslag,
          isOverride: beslisboomResultaat.isOverride,
          overrideReden: beslisboomResultaat.overrideReden,
          overrideBron: beslisboomResultaat.overrideBron,
          beschermingsregimesContext: beslisboomResultaat.beschermingsregimesContext.map(r => r.naam),
          beschermingsregimesDoorslaggevend: beslisboomResultaat.beschermingsregimesDoorslaggevend.map(r => r.naam),
          rapportageTekst: beslisboomResultaat.rapportageTekst,
          stappen: beslisboomResultaat.stappen
        };
      })(),

      // Centrale Beslisboom Resultaat (geïntegreerde toetsingshiërarchie + vergunningplicht)
      centraleBeslisboomResultaat: await (async () => {
        try {
          // Bepaal activiteittype voor centrale beslisboom
          // CentraleActiviteitType: bouwen | verbouwen | uitbouwen | aanbouwen | slopen | gebruikswijziging | splitsen | samenvoegen | aanleggen | kappen | uitweg | reclame | monument_wijzigen | evenement | terras
          const activiteitType: CentraleActiviteitType = 
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('nieuwbouw') || a.toLowerCase().includes('bouwen')) ? 'bouwen' :
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('verbouw')) ? 'verbouwen' :
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('sloop')) ? 'slopen' :
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('functiewijziging') || a.toLowerCase().includes('gebruik')) ? 'gebruikswijziging' :
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('uitbreiding') || a.toLowerCase().includes('aanbouw')) ? 'aanbouwen' :
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('monument')) ? 'monument_wijzigen' :
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('kappen')) ? 'kappen' :
            aanvraag.activiteiten.some(a => a.toLowerCase().includes('uitweg')) ? 'uitweg' :
            'bouwen';
          
          // Bepaal functietype
          const functieType: CentraleFunctieType = 
            aanvraag.locatieAnalyse?.bestemmingsplannen?.some(bp => bp.bestemmingen?.some(b => b.naam?.toLowerCase().includes('wonen'))) ? 'wonen' :
            aanvraag.locatieAnalyse?.bestemmingsplannen?.some(bp => bp.bestemmingen?.some(b => b.naam?.toLowerCase().includes('bedrijf'))) ? 'bedrijf' :
            aanvraag.locatieAnalyse?.bestemmingsplannen?.some(bp => bp.bestemmingen?.some(b => b.naam?.toLowerCase().includes('horeca'))) ? 'horeca' :
            aanvraag.locatieAnalyse?.bestemmingsplannen?.some(bp => bp.bestemmingen?.some(b => b.naam?.toLowerCase().includes('detailhandel'))) ? 'detailhandel' :
            'wonen';
          
          // Bepaal beschermingsregimes voor centrale beslisboom
          // Import BeschermingsRegimeType from centraleBeslisboomService
          type LocalBeschermingsRegimeType = 
            | 'beschermd_stadsgezicht' | 'beschermd_dorpsgezicht'
            | 'rijksmonument' | 'gemeentelijk_monument' | 'provinciaal_monument'
            | 'archeologisch_monument' | 'waterkering'
            | 'natura2000' | 'nnn_gebied' | 'grondwaterbeschermingsgebied'
            | 'geluidzone' | 'veiligheidszone' | 'milieuzone';
          
          const beschermingsregimes: Array<{
            type: LocalBeschermingsRegimeType;
            naam: string;
            bron: string;
            heeftExplicieteUitzondering: boolean;
            uitzonderingArtikel?: string;
          }> = [];
          
          if (aanvraag.beschermdGezicht || aanvraag.locatieAnalyse?.pdokAnalyse?.beschermdGezicht?.binnenGebied) {
            beschermingsregimes.push({
              type: 'beschermd_stadsgezicht',
              naam: aanvraag.locatieAnalyse?.pdokAnalyse?.beschermdGezicht?.gezicht?.naam || 'Beschermd stadsgezicht',
              bron: 'Erfgoedwet',
              heeftExplicieteUitzondering: true,
              uitzonderingArtikel: 'Omgevingswet art. 5.1 lid 1 sub a'
            });
          }
          
          if (aanvraag.locatieAnalyse?.pdokAnalyse?.monumenten?.isRijksmonument) {
            beschermingsregimes.push({
              type: 'rijksmonument',
              naam: aanvraag.locatieAnalyse.pdokAnalyse.monumenten.monument?.naam || 'Rijksmonument',
              bron: 'Erfgoedwet',
              heeftExplicieteUitzondering: true,
              uitzonderingArtikel: 'Omgevingswet art. 5.1 lid 1 sub b'
            });
          }
          
          if (aanvraag.natura2000?.inGebied || aanvraag.locatieAnalyse?.pdokAnalyse?.natura2000?.binnenGebied) {
            beschermingsregimes.push({
              type: 'natura2000',
              naam: aanvraag.locatieAnalyse?.pdokAnalyse?.natura2000?.dichtstbijzijnde?.naam || 'Natura 2000',
              bron: 'Wet natuurbescherming',
              heeftExplicieteUitzondering: false
            });
          }
          
          if (aanvraag.archeologie?.inZone) {
            beschermingsregimes.push({
              type: 'archeologisch_monument',
              naam: aanvraag.archeologie.zoneType || 'Archeologisch waardevol gebied',
              bron: 'Erfgoedwet',
              heeftExplicieteUitzondering: false
            });
          }
          
          // Voer centrale beslisboom uit
          const centraleBeslisboomInput: CentraleBeslisboomInput = {
            activiteiten: [activiteitType],
            functies: {
              huidig: functieType,
              nieuw: functieType
            },
            locatie: {
              gemeente: gemeente.gemeenteNaam,
              provincie: gemeente.provincie,
              coordinates: aanvraag.locatieAnalyse?.locatie?.coordinaten?.rd 
                ? [aanvraag.locatieAnalyse.locatie.coordinaten.rd.x, aanvraag.locatieAnalyse.locatie.coordinaten.rd.y] as [number, number]
                : [0, 0] as [number, number]
            },
            beschermingsregimes,
            dsoConclusieBasis: aiResult.procedureBepaling?.isVergunningvrij 
              ? { conclusie: 'vergunningvrij', bron: 'Bbl', toelichting: aiResult.procedureBepaling.motivering }
              : { conclusie: 'vergunningplichtig', bron: 'omgevingsplan', toelichting: aiResult.procedureBepaling?.motivering || '' },
            projectDetails: {
              oppervlakteM2: aanvraag.locatieAnalyse?.bagInfo?.verblijfsobject?.oppervlakte,
              bouwjaar: aanvraag.locatieAnalyse?.bagInfo?.pand?.bouwjaar,
              graafdiepteCm: undefined // Wordt later ingevuld via graafwerkAnalyse
            }
          };
          
          const centraalResultaat = voerCentraleBeslisboomUit(centraleBeslisboomInput);
          
          console.log('[Gemini] Centrale beslisboom resultaat:', {
            conclusie: centraalResultaat.vergunningplicht.conclusie,
            aantalToetsingskadersAltijd: centraalResultaat.toetsingskaders.altijd.length,
            aantalToetsingskadersSoms: centraalResultaat.toetsingskaders.soms.length,
            aantalBeschermingsregimesContext: centraalResultaat.vergunningplicht.beschermingsregimesContext.length,
            aantalBeschermingsregimesDoorslaggevend: centraalResultaat.vergunningplicht.beschermingsregimesDoorslaggevend.length
          });
          
          // Combineer alle toetsingskaders
          const alleToetsingskaders = [
            ...centraalResultaat.toetsingskaders.altijd.map(tk => ({ ...tk, laag: 'basis' as const })),
            ...centraalResultaat.toetsingskaders.soms.map(tk => ({ ...tk, laag: 'basis' as const }))
          ];
          
          // Combineer beschermingsregimes
          const alleBeschermingsregimes = [
            ...centraalResultaat.vergunningplicht.beschermingsregimesContext.map(br => ({
              naam: br.naam,
              type: br.type,
              isDoorslaggevend: false,
              uitzonderingArtikel: br.uitzonderingArtikel
            })),
            ...centraalResultaat.vergunningplicht.beschermingsregimesDoorslaggevend.map(br => ({
              naam: br.naam,
              type: br.type,
              isDoorslaggevend: true,
              uitzonderingArtikel: br.uitzonderingArtikel
            }))
          ];
          
          return {
            eindconclusie: centraalResultaat.vergunningplicht.conclusie === 'vergunningvrij' ? 'vergunningvrij' :
                           centraalResultaat.vergunningplicht.conclusie === 'meldingsplichtig' ? 'meldingsplichtig' :
                           centraalResultaat.vergunningplicht.conclusie === 'uitgebreid' ? 'vergunningplichtig_uitgebreid' :
                           'vergunningplichtig_regulier',
            motivering: centraalResultaat.vergunningplicht.motivering,
            juridischeGrondslag: centraalResultaat.vergunningplicht.juridischeGrondslag,
            toetsingskaders: alleToetsingskaders.map(tk => ({
              naam: tk.naam,
              laag: tk.laag,
              prioriteit: tk.categorie,
              wettelijkeBasis: tk.wettelijkeBasis || '',
              toelichting: tk.reden
            })),
            beschermingsregimes: alleBeschermingsregimes,
            doorlopenStappen: centraalResultaat.stappen.map(s => ({
              stap: s.stap,
              titel: s.titel,
              resultaat: s.antwoord,
              toelichting: s.toelichting
            }))
          };
        } catch (error) {
          console.error('[Gemini] Centrale beslisboom fout:', error);
          return undefined;
        }
      })(),
      
      // Gelaagde Kennisbank Resultaat (5 lagen, 4 categorieën)
      kennisbankResultaat: await (async () => {
        try {
          // Bouw kennisbank query
          const kennisbankQuery: KennisbankQuery = {
            activiteiten: aanvraag.activiteiten,
            beschermingsregimes: [
              ...(aanvraag.beschermdGezicht ? ['beschermd_gezicht'] : []),
              ...(aanvraag.locatieAnalyse?.pdokAnalyse?.monumenten?.isRijksmonument ? ['rijksmonument'] : []),
              ...(aanvraag.natura2000?.inGebied ? ['natura2000'] : []),
              ...(aanvraag.archeologie?.inZone ? ['archeologie'] : [])
            ],
            dubbelbestemmingen: aanvraag.locatieAnalyse?.ruimtelijkePlannen?.dubbelbestemmingen?.map(d => d.type) || [],
            functieHuidig: aanvraag.locatieAnalyse?.bestemmingsplannen?.[0]?.bestemmingen?.[0]?.naam,
            projectDetails: {
              oppervlakteM2: aanvraag.locatieAnalyse?.bagInfo?.verblijfsobject?.oppervlakte,
              bouwjaar: aanvraag.locatieAnalyse?.bagInfo?.pand?.bouwjaar
            },
            gemeenteContext: {
              gemeenteId: 1, // Default gemeente ID
              gemeenteNaam: gemeente.gemeenteNaam,
              provincie: gemeente.provincie,
              waterschapCode: gemeente.waterschapCode,
              veiligheidsregioCode: gemeente.vrCode,
              omgevingsdienstCode: gemeente.odCode,
              ggdCode: gemeente.ggdCode
            }
          };
          
          const kennisbankData = await haalKennisbankItems(kennisbankQuery);
          const aiContext = formatKennisbankVoorAI(kennisbankData);
          
          console.log('[Gemini] Kennisbank resultaat:', {
            totaalItems: kennisbankData.totaalAantal,
            perLaag: Object.entries(kennisbankData.perLaag).map(([laag, aantal]) => ({ laag, aantal }))
          });
          
          // Transformeer naar het AnalysisResult formaat
          const lagen: Array<'basis' | 'landelijk' | 'provinciaal' | 'regionaal' | 'gemeentelijk'> = 
            ['basis', 'landelijk', 'provinciaal', 'regionaal', 'gemeentelijk'];
          
          return {
            perLaag: lagen.map(laag => {
              const laagItems = [
                ...kennisbankData.adviseurs.filter(i => i.laag === laag),
                ...kennisbankData.toetsingskaders.filter(i => i.laag === laag),
                ...kennisbankData.onderzoeken.filter(i => i.laag === laag),
                ...kennisbankData.beleidsdocumenten.filter(i => i.laag === laag)
              ];
              return {
                laag,
                aantalItems: kennisbankData.perLaag[laag],
                items: laagItems.map(item => ({
                  categorie: item.categorie === 'adviseur' ? 'adviseurs' as const :
                             item.categorie === 'toetsingskader' ? 'toetsingskaders' as const :
                             item.categorie === 'onderzoek' ? 'onderzoeken' as const :
                             'beleidsdocumenten' as const,
                  naam: item.naam,
                  toelichting: item.omschrijving || '',
                  juridischeStatus: item.toetsingskaderInfo?.toetsingsCategorie || 
                                    item.adviseurInfo?.isVerplicht ? 'verplicht' : 'optioneel',
                  trigger: item.triggers?.[0]?.waarde
                }))
              };
            }),
            perCategorie: [
              { categorie: 'adviseurs' as const, aantalItems: kennisbankData.perCategorie.adviseur },
              { categorie: 'toetsingskaders' as const, aantalItems: kennisbankData.perCategorie.toetsingskader },
              { categorie: 'onderzoeken' as const, aantalItems: kennisbankData.perCategorie.onderzoek },
              { categorie: 'beleidsdocumenten' as const, aantalItems: kennisbankData.perCategorie.beleidsdocument }
            ],
            totaalAantalItems: kennisbankData.totaalAantal,
            aiContext
          };
        } catch (error) {
          console.error('[Gemini] Kennisbank fout:', error);
          return undefined;
        }
      })(),

      // Stikstof voortoets (AERIUS + Natura 2000)
      stikstofVoortoets: await (async () => {
        // Genereer stikstof voortoets op basis van activiteiten en locatie
        const locatie = {
          lat: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 0,
          lng: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 0,
          adres: aanvraag.adres || 'Onbekend adres'
        };
        
        // Gebruik async versie met Natura 2000 check als we coördinaten hebben
        if (locatie.lat !== 0 && locatie.lng !== 0) {
          try {
            const voortoets = await generateNitrogenPreAssessmentWithNatura2000(aanvraag.activiteiten, locatie);
            
            console.log('[Gemini] Stikstof voortoets met Natura 2000:', {
              requiresCalculation: voortoets.requiresCalculation,
              riskLevel: voortoets.riskLevel,
              emissionSources: voortoets.emissionSources,
              natura2000: {
                binnenGebied: voortoets.natura2000Check.binnenGebied,
                afstandMeter: voortoets.natura2000Check.afstandMeter,
                dichtstbijzijndeGebied: voortoets.natura2000Check.dichtstbijzijndeGebied
              }
            });
            
            return voortoets;
          } catch (error) {
            console.error('[Gemini] Natura 2000 check failed, falling back to basic check:', error);
          }
        }
        
        // Fallback naar synchrone versie zonder Natura 2000 check
        const voortoets = generateNitrogenPreAssessment(aanvraag.activiteiten, locatie);
        
        console.log('[Gemini] Stikstof voortoets (basic):', {
          requiresCalculation: voortoets.requiresCalculation,
          riskLevel: voortoets.riskLevel,
          emissionSources: voortoets.emissionSources
        });
        
        return voortoets;
      })(),

      // BRP Gewaspercelen check (optioneel voor agrarische locaties)
      gewaspercelenCheck: await (async () => {
        const locatie = {
          lat: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 0,
          lng: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 0,
        };
        
        // Check of BRP check relevant is op basis van bestemming
        const bestemmingObj = aanvraag.locatieAnalyse?.bestemmingsplannen?.[0]?.bestemmingen?.[0];
        const bestemming = typeof bestemmingObj === 'string' ? bestemmingObj : (bestemmingObj?.naam || '');
        const isRelevant = isBRPCheckRelevant(bestemming) || 
                           aanvraag.activiteiten.some(a => 
                             a.toLowerCase().includes('agrarisch') ||
                             a.toLowerCase().includes('landbouw') ||
                             a.toLowerCase().includes('functiewijziging')
                           );
        
        if (locatie.lat !== 0 && locatie.lng !== 0 && isRelevant) {
          try {
            const brpResult = await checkGewaspercelen(locatie.lat, locatie.lng, 0.5);
            
            console.log('[Gemini] BRP Gewaspercelen check:', {
              heeftLandbouwpercelen: brpResult.heeftLandbouwpercelen,
              aantalPercelen: brpResult.aantalPercelen,
              isAgrarischGebied: brpResult.relevantieIndicatie.isAgrarischGebied,
            });
            
            return {
              heeftLandbouwpercelen: brpResult.heeftLandbouwpercelen,
              aantalPercelen: brpResult.aantalPercelen,
              categorieën: brpResult.categorieën,
              relevantieIndicatie: brpResult.relevantieIndicatie,
              aanbevelingen: brpResult.aanbevelingen,
            };
          } catch (error) {
            console.error('[Gemini] BRP Gewaspercelen check failed:', error);
          }
        }
        return undefined;
      })(),

      // Funderingsproblematiek check (PDOK)
      funderingscheck: await (async () => {
        const locatie = {
          lat: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 0,
          lng: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 0,
        };
        
        if (locatie.lat !== 0 && locatie.lng !== 0) {
          try {
            const funderingsResult = await checkFunderingsproblematiek(locatie.lat, locatie.lng);
            
            console.log('[Gemini] Funderingsproblematiek check:', {
              inRisicogebied: funderingsResult.inRisicogebied,
              risicoNiveau: funderingsResult.risicoNiveau,
              gemeente: funderingsResult.gebiedsInfo?.gemeente,
              bodemtype: funderingsResult.gebiedsInfo?.fysischGeografischeRegio
            });
            
            return {
              inRisicogebied: funderingsResult.inRisicogebied,
              risicoNiveau: funderingsResult.risicoNiveau,
              gebiedsInfo: funderingsResult.gebiedsInfo ? {
                postcodegebied: funderingsResult.gebiedsInfo.postcodegebied,
                gemeente: funderingsResult.gebiedsInfo.gemeente,
                fysischGeografischeRegio: funderingsResult.gebiedsInfo.fysischGeografischeRegio,
                percentageVoor1970: funderingsResult.gebiedsInfo.percentageVoor1970,
                legendaKlasse: funderingsResult.gebiedsInfo.legendaKlasse,
              } : undefined,
              aanbevelingen: funderingsResult.aanbevelingen,
            };
          } catch (error) {
            console.error('[Gemini] Funderingsproblematiek check failed:', error);
          }
        }
        return undefined;
      })(),

      // Cultuurhistorie check (RCE - monumenten en beschermde gezichten)
      cultuurhistorieCheck: await (async () => {
        const locatie = {
          lat: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 0,
          lng: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 0,
        };
        
        if (locatie.lat !== 0 && locatie.lng !== 0) {
          try {
            const cultuurResult = await checkCultuurhistorie(locatie.lat, locatie.lng);
            
            console.log('[Gemini] Cultuurhistorie check:', {
              heeftBeschermdeStatus: cultuurResult.heeftBeschermdeStatus,
              inBeschermdStadsgezicht: cultuurResult.inBeschermdStadsgezicht,
              monumentenInOmgeving: cultuurResult.monumentenInOmgeving
            });
            
            return {
              heeftBeschermdeStatus: cultuurResult.heeftBeschermdeStatus,
              inBeschermdStadsgezicht: cultuurResult.inBeschermdStadsgezicht,
              inBeschermdDorpsgezicht: cultuurResult.inBeschermdDorpsgezicht,
              nabijMonumenten: cultuurResult.nabijMonumenten,
              monumentenInOmgeving: cultuurResult.monumentenInOmgeving,
              beschermdeGebieden: cultuurResult.beschermdeGebieden.slice(0, 10).map(g => ({
                type: g.type,
                naam: g.naam,
                afstand: g.afstand,
                ligging: g.ligging,
              })),
              aanbevelingen: cultuurResult.aanbevelingen,
            };
          } catch (error) {
            console.error('[Gemini] Cultuurhistorie check failed:', error);
          }
        }
        return undefined;
      })(),

      // BGT Topografische analyse
      topografischeAnalyse: await (async () => {
        const locatie = {
          lat: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 0,
          lng: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 0,
        };
        
        if (locatie.lat !== 0 && locatie.lng !== 0) {
          try {
            const bgtResult = await analyzeTopografie(locatie.lng, locatie.lat, 100);
            
            console.log('[Gemini] BGT Topografische analyse:', {
              panden: bgtResult.panden.aantal,
              groen: bgtResult.groenvoorziening.totaalAantal,
              water: bgtResult.water.aanwezig
            });
            
            return {
              panden: bgtResult.panden,
              groenvoorziening: bgtResult.groenvoorziening,
              water: bgtResult.water,
              wegen: bgtResult.wegen,
              samenvatting: bgtResult.samenvatting,
              aanbevelingen: bgtResult.aanbevelingen,
            };
          } catch (error) {
            console.error('[Gemini] BGT analyse failed:', error);
          }
        }
        return undefined;
      })(),

      // Geurcontouren veehouderijen (relevant voor woningbouw)
      geurAnalyse: await (async () => {
        const locatie = {
          lat: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 0,
          lng: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 0,
        };
        
        // Check alleen bij woningbouw of andere gevoelige bestemmingen
        const isGevoeligeBestemming = aanvraag.activiteiten?.some(a => 
          a.toLowerCase().includes('woning') ||
          a.toLowerCase().includes('wonen') ||
          a.toLowerCase().includes('school') ||
          a.toLowerCase().includes('kinderdagverblijf') ||
          a.toLowerCase().includes('zorginstelling')
        );
        
        if (locatie.lat !== 0 && locatie.lng !== 0 && isGevoeligeBestemming) {
          try {
            const geurResult = await analyzeGeurbelasting(locatie.lng, locatie.lat, 500);
            
            console.log('[Gemini] Geurcontouren analyse:', {
              binnenContour: geurResult.binnenGeurcontour,
              gesScore: geurResult.gesScore,
              risiconiveau: geurResult.risiconiveau
            });
            
            return {
              binnenGeurcontour: geurResult.binnenGeurcontour,
              gesScore: geurResult.gesScore,
              gesOmschrijving: geurResult.gesOmschrijving,
              risiconiveau: geurResult.risiconiveau,
              provincie: geurResult.provincie,
              aanbevelingen: geurResult.aanbevelingen,
            };
          } catch (error) {
            console.error('[Gemini] Geurcontouren analyse failed:', error);
          }
        }
        return undefined;
      })(),

      // Milieutoets Signalering
      milieuToetsSignalering: await (async () => {
        try {
          const { voerMilieuToetsSignaleringUit } = await import('./milieuToetsService');
          
          const isBopa = aiResult.procedureBepaling?.isBOPA || false;
          const oppervlakte = aiResult.aanvraagSamenvatting?.geschatteAfmetingen?.oppervlakteM2 || null;
          
          const resultaat = voerMilieuToetsSignaleringUit(
            aanvraag.activiteiten,
            aanvraag.omschrijving || '',
            isBopa,
            oppervlakte,
            null // aantalWoningen - indien beschikbaar
          );
          
          console.log('[Gemini] Milieutoets signalering:', {
            isToetsNodig: resultaat.isToetsNodig,
            activiteitType: resultaat.activiteitType,
            aantalRelevanteThemas: resultaat.relevanteThemas.filter(t => t.isRelevant).length,
            merNodig: resultaat.merBeoordeling.isNodig,
            aantalChecklistItems: resultaat.checklist.length
          });
          
          return resultaat;
        } catch (error) {
          console.error('[Gemini] Milieutoets signalering failed:', error);
          return undefined;
        }
      })(),

      // Geluid/Geur/Externe Veiligheid analyses
      geluidsAnalyse: await (async () => {
        try {
          const { analyseerGeluidszones } = await import('./geluidszonesService');
          const lat = aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 52.5;
          const lon = aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 4.9;
          const result = await analyseerGeluidszones(lat, lon, 'wonen_nieuw');
          console.log('[Gemini] Geluidsanalyse:', { heeftGeluidsbelasting: result.heeftGeluidsbelasting });
          return result;
        } catch (error) {
          console.error('[Gemini] Geluidsanalyse failed:', error);
          return undefined;
        }
      })(),
      
      // geurAnalyseUitgebreid is geïntegreerd in de bestaande geurAnalyse hierboven
      
      // Bodemloket check (bevoegde omgevingsdienst voor bodemkwaliteit)
      bodemloketCheck: await (async () => {
        const locatie = {
          lat: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 0,
          lng: aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 0,
        };
        
        if (locatie.lat !== 0 && locatie.lng !== 0) {
          try {
            const bodemResult = await bevraagBodemloket(locatie.lat, locatie.lng);
            
            console.log('[Gemini] Bodemloket check:', {
              gevonden: bodemResult.gevonden,
              omgevingsdienst: bodemResult.omgevingsdienstNaam,
              websiteBeschikbaar: bodemResult.websiteBeschikbaar,
            });
            
            return bodemResult;
          } catch (error) {
            console.error('[Gemini] Bodemloket check failed:', error);
          }
        }
        return undefined;
      })(),

      externeVeiligheidAnalyse: await (async () => {
        try {
          const { analyseerExterneVeiligheid } = await import('./externeVeiligheidService');
          const lat = aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lat || 52.5;
          const lon = aanvraag.locatieAnalyse?.locatie?.coordinaten?.wgs84?.lng || 4.9;
          const beoogdeFunctie = aiResult.aanvraagSamenvatting?.beoogdGebruik || 'wonen';
          const result = await analyseerExterneVeiligheid(lat, lon, beoogdeFunctie);
          console.log('[Gemini] Externe veiligheid analyse:', { heeftRisico: result.heeftRisico });
          return result;
        } catch (error) {
          console.error('[Gemini] Externe veiligheid analyse failed:', error);
          return undefined;
        }
      })(),

      // Legacy velden
      isVergunningvrij: aiResult.procedureBepaling.isVergunningvrij,
      procedureType: aiResult.procedureBepaling.procedureType,
      procedureTermijn: aiResult.procedureBepaling.procedureTermijn,
      
      // Metadata
      verwerkingDuurMs: Date.now() - startTime,
      bronnen: [
        'Policy Assist 7-stappen methodiek',
        'Centrale Beslisboom (toetsingshiërarchie + vergunningplicht)',
        'Gelaagde Kennisbank (5 lagen, 4 categorieën)',
        'Omgevingswet',
        'Besluit bouwwerken leefomgeving',
        `POV ${gemeente.provincie}`,
        `Omgevingsplan ${gemeente.gemeenteNaam}`,
        'DSO Toepasbare Regels API',
      ],
    };
    
    // Cache result
    analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      policyUpdate: gemeente.lastPolicyUpdate || new Date(),
    });
    
    console.log(`[Gemini] Analysis complete for ${aanvraag.zaaknummer} in ${result.verwerkingDuurMs}ms`);
    return result;
    
  } catch (error) {
    console.error('[Gemini] Analysis error:', error);
    throw new Error(`Analyse mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
  }
}

/**
 * Clear de analyse cache
 */
export function clearAnalysisCache(): void {
  analysisCache.clear();
  console.log('[Gemini] Analysis cache cleared');
}
