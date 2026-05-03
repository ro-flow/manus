/**
 * Onderzoeken Service - Bepaalt welke onderzoeken vereist zijn per activiteit
 * 
 * Dit is de centrale service die bepaalt welke onderzoeken/studies verplicht zijn
 * op basis van:
 * - Activiteittype (nieuwbouw, verbouw, functiewijziging, etc.)
 * - Locatiekenmerken (Natura 2000, archeologie, geluidzone, etc.)
 * - Dubbelbestemmingen (waterkering, leiding, veiligheidszone, etc.)
 * - Omvang van het project (aantal woningen, oppervlakte, etc.)
 */

import type { RuimtelijkePlannenResultaat, DubbelbestemmingType } from './ruimtelijkeplannenService';
import type { AeriusVereiste } from './aeriusService';
import type { MilieuAnalyse } from './milieuService';
import type { PDOKAnalyseResultaat } from './pdokService';

// Onderzoek types
export type OnderzoekType = 
  | 'archeologisch_onderzoek'
  | 'akoestisch_onderzoek'
  | 'bodemonderzoek'
  | 'flora_fauna_onderzoek'
  | 'stikstof_aerius'
  | 'watertoets'
  | 'cultuurhistorisch_onderzoek'
  | 'verkeersstudie'
  | 'luchtkwaliteit_onderzoek'
  | 'externe_veiligheid_qra'
  | 'trillingen_onderzoek'
  | 'geur_onderzoek'
  | 'asbestinventarisatie'
  | 'bouwhistorisch_onderzoek'
  | 'constructieve_berekening'
  | 'energieprestatieberekening'
  | 'daglicht_berekening'
  | 'brandveiligheid_onderzoek'
  | 'klic_melding';

// Gemeente-specifieke vrijstellingsgrenzen (uit omgevingsplan)
export interface GemeenteVrijstellingen {
  archeologieVrijstellingDiepteCm: number; // Default 30cm
  archeologieVrijstellingOppervlakteM2: number; // Default 100m²
  bodemonderzoekVrijstellingGebieden?: string[]; // Gebieden zonder onderzoeksplicht
  bodemonderzoekVrijstellingPostcodes?: string[]; // Postcodes zonder onderzoeksplicht
}

// Drempelwaarden voor wanneer onderzoek verplicht vs aanbevolen is
export interface OnderzoekDrempelwaarden {
  oppervlakteM2?: number; // Minimale oppervlakte voor verplichting
  diepteCm?: number; // Minimale diepte voor verplichting
  aantalWoningen?: number; // Minimaal aantal woningen
  afstandMeter?: number; // Maximale afstand tot beschermd gebied
  bouwjaarVoor?: number; // Bouwjaar voor (bijv. 1994 voor asbest)
}

export interface OnderzoekVereiste {
  type: OnderzoekType;
  naam: string;
  verplicht: boolean;
  reden: string;
  trigger: string;
  toelichting: string;
  instantie?: string; // Wie voert uit / adviseert
  kostenindicatie?: string;
  doorlooptijd?: string;
  wettelijkeBasis?: string;
  drempelwaarden?: OnderzoekDrempelwaarden; // Wanneer verplicht vs aanbevolen
  vrijstellingsgronden?: string[]; // Mogelijke vrijstellingen
}

export interface OnderzoekenResultaat {
  verplichteOnderzoeken: OnderzoekVereiste[];
  aanbevolenOnderzoeken: OnderzoekVereiste[];
  klicMeldingVereist: boolean;
  klicToelichting?: string;
  totaalAantalVerplicht: number;
  totaalAantalAanbevolen: number;
}

// Onderzoek definities met alle metadata, juridische grondslagen, drempelwaarden en vrijstellingen
const ONDERZOEK_DEFINITIES: Record<OnderzoekType, Omit<OnderzoekVereiste, 'verplicht' | 'reden' | 'trigger'>> = {
  archeologisch_onderzoek: {
    type: 'archeologisch_onderzoek',
    naam: 'Archeologisch onderzoek',
    toelichting: 'Bureauonderzoek (fase 1), eventueel gevolgd door booronderzoek (fase 2) of proefsleuven (fase 3). Vrijstellingsgrenzen vaak >30cm diepte en >100m² oppervlakte (check gemeentelijk omgevingsplan).',
    instantie: 'Gemeentelijk archeoloog of gecertificeerd archeologisch bureau (Erfgoedwet art. 5.1 certificaatplicht)',
    kostenindicatie: '€500-€5.000 (bureauonderzoek), €2.000-€15.000 (veldonderzoek)',
    doorlooptijd: '2-6 weken',
    wettelijkeBasis: 'Erfgoedwet art. 5.1 (certificaatplicht opgraving), Omgevingswet art. 5.1 lid 1 sub b (rijksmonumentenactiviteit) en art. 5.1 lid 2 sub a (omgevingsplanactiviteit), Omgevingsplan (gemeentelijke archeologische onderzoeksplicht)',
    drempelwaarden: {
      diepteCm: 30, // Standaard vrijstellingsgrens diepte
      oppervlakteM2: 100 // Standaard vrijstellingsgrens oppervlakte
    },
    vrijstellingsgronden: [
      'Bodemingreep ≤30cm diepte EN ≤100m² oppervlakte (check gemeentelijk omgevingsplan)',
      'Locatie reeds archeologisch onderzocht',
      'Locatie vrijgegeven door bevoegd gezag'
    ]
  },
  akoestisch_onderzoek: {
    type: 'akoestisch_onderzoek',
    naam: 'Akoestisch onderzoek',
    toelichting: 'Onderzoek naar geluidbelasting op de gevel en binnenniveau. Bepaalt of hogere waarde nodig is of dove gevel. Toetsing aan grenswaarden uit Bkl of omgevingsplan.',
    instantie: 'Akoestisch adviesbureau',
    kostenindicatie: '€1.500-€5.000',
    doorlooptijd: '2-4 weken',
    wettelijkeBasis: 'Bkl hoofdstuk 5 (art. 5.78-5.85 geluidgevoelige gebouwen), Omgevingsplan (decentrale geluidregels), Omgevingsverordening (provinciale geluidregels)'
  },
  bodemonderzoek: {
    type: 'bodemonderzoek',
    naam: 'Bodemonderzoek',
    toelichting: 'Vooronderzoek (NEN 5725), verkennend onderzoek (NEN 5740), nader onderzoek (NTA 5755). Trapsgewijze benadering: volgend onderzoek alleen bij noodzaak uit eerder onderzoek.',
    instantie: 'Gecertificeerd bodemonderzoeksbureau (BRL SIKB 2000 of AS SIKB 2000 erkenning bodemkwaliteit)',
    kostenindicatie: '€1.000-€3.000 (verkennend), €3.000-€10.000 (nader)',
    doorlooptijd: '2-4 weken',
    wettelijkeBasis: 'Bal paragraaf 5.2.2 (voorafgaand bodemonderzoek), Bal art. 4.119-4.121 (graven/saneren), Bkl paragraaf 5.1.4.5.1 (instructieregel bouwen bodemgevoelige locatie), Omgevingsregeling art. 7.207b (BOPA bodemonderzoek)',
    vrijstellingsgronden: [
      'Locatie aangewezen als vrijstellingsgebied in omgevingsplan',
      'Recent bodemonderzoek beschikbaar (<5 jaar, geen wijzigingen)',
      'Locatie niet-verdacht volgens vooronderzoek NEN 5725'
    ]
  },
  flora_fauna_onderzoek: {
    type: 'flora_fauna_onderzoek',
    naam: 'Flora en fauna onderzoek (Quickscan)',
    toelichting: 'Quickscan naar beschermde soorten (vogels, vleermuizen, amfibieën), eventueel gevolgd door nader soortenonderzoek. Let op: seizoensafhankelijk (vleermuizen mei-sept, vogels maart-juli).',
    instantie: 'Ecologisch adviesbureau',
    kostenindicatie: '€500-€1.500 (quickscan), €1.500-€5.000 (nader onderzoek)',
    doorlooptijd: '2-6 weken (seizoensafhankelijk)',
    wettelijkeBasis: 'Wet natuurbescherming art. 3.1-3.10 (soortenbescherming), Omgevingswet (integratie Wnb), Bkl hoofdstuk 10 (Natura 2000-activiteiten)'
  },
  stikstof_aerius: {
    type: 'stikstof_aerius',
    naam: 'AERIUS-berekening (stikstof)',
    toelichting: 'Berekening stikstofdepositie op Natura 2000-gebieden voor bouw- en gebruiksfase. Drempelwaarde: 0,00 mol/ha/jaar (geen vrijstelling). Bij overschrijding: vergunningplicht Wnb, mogelijke oplossingen: intern/extern salderen, ADC-toets.',
    instantie: 'Zelf uitvoeren via aerius.nl/nl/aerius-calculator of milieuadviesbureau',
    kostenindicatie: '€500-€2.000',
    doorlooptijd: '1-2 weken',
    wettelijkeBasis: 'Wet natuurbescherming art. 2.7 (vergunningplicht Natura 2000) en art. 2.8 (passende beoordeling), Omgevingswet (integratie Wnb), Bkl hoofdstuk 10 (Natura 2000-activiteiten)',
    drempelwaarden: {
      afstandMeter: 10000 // Binnen 10km van Natura 2000
    },
    vrijstellingsgronden: [
      'Geen stikstofemissie in bouw- of gebruiksfase',
      'Afstand tot dichtstbijzijnde Natura 2000-gebied >25km',
      'Intern salderen: geen toename t.o.v. referentiesituatie'
    ]
  },
  watertoets: {
    type: 'watertoets',
    naam: 'Watertoets',
    toelichting: 'Beoordeling waterhuishoudkundige aspecten: waterberging, afvoer, grondwater, waterkering. Digitale watertoets via dewatertoets.nl. Bij negatief advies: watervergunning nodig.',
    instantie: 'Waterschap (advies via Keur)',
    kostenindicatie: 'Gratis (onderdeel vergunningprocedure)',
    doorlooptijd: '4-6 weken',
    wettelijkeBasis: 'Waterwet (watervergunning), Omgevingswet (integratie Waterwet), Bkl (instructieregels water), Keur waterschap (regionale regels)'
  },
  cultuurhistorisch_onderzoek: {
    type: 'cultuurhistorisch_onderzoek',
    naam: 'Cultuurhistorisch onderzoek',
    toelichting: 'Waardestelling en bouwhistorisch onderzoek bij monumenten of beschermd stads-/dorpsgezicht. Beoordeelt impact op monumentale waarden en geeft advies over inpassing.',
    instantie: 'Monumentencommissie (gemeentelijk), RCE (rijksmonumenten) of erfgoedspecialist',
    kostenindicatie: '€1.000-€5.000',
    doorlooptijd: '3-6 weken',
    wettelijkeBasis: 'Erfgoedwet art. 3.1 (rijksmonumenten) en art. 3.16 (beschermde gezichten), Omgevingswet art. 5.1 lid 1 sub b (rijksmonumentenactiviteit), Omgevingsplan (gemeentelijke monumenten en beschermde gezichten)'
  },
  verkeersstudie: {
    type: 'verkeersstudie',
    naam: 'Verkeersstudie',
    toelichting: 'Analyse verkeerseffecten, parkeerbalans en ontsluiting. Verplicht bij significante verkeersgeneratie.',
    instantie: 'Verkeerskundig adviesbureau',
    kostenindicatie: '€2.000-€10.000',
    doorlooptijd: '3-6 weken',
    wettelijkeBasis: 'Gemeentelijk parkeerbeleid, Omgevingsplan',
    drempelwaarden: {
      aantalWoningen: 10 // Bij >10 woningen vaak verplicht
    },
    vrijstellingsgronden: [
      'Geen significante toename verkeersgeneratie',
      'Voldoende parkeergelegenheid op eigen terrein',
      'Locatie in gebied met lage parkeernorm'
    ]
  },
  luchtkwaliteit_onderzoek: {
    type: 'luchtkwaliteit_onderzoek',
    naam: 'Luchtkwaliteitsonderzoek',
    toelichting: 'Berekening concentraties fijnstof (PM10, PM2.5) en NO2',
    instantie: 'Milieuadviesbureau',
    kostenindicatie: '€1.500-€5.000',
    doorlooptijd: '2-4 weken',
    wettelijkeBasis: 'Omgevingswet, Bkl hoofdstuk 5'
  },
  externe_veiligheid_qra: {
    type: 'externe_veiligheid_qra',
    naam: 'Risicoanalyse externe veiligheid (QRA)',
    toelichting: 'Kwantitatieve risicoanalyse (QRA) en verantwoording groepsrisico. Toetst aan plaatsgebonden risico (10-6/jaar) en aandachtsgebieden. Bij kwetsbare objecten in veiligheidszone: advies Veiligheidsregio verplicht.',
    instantie: 'Veiligheidsregio (advies), Omgevingsdienst of gespecialiseerd bureau',
    kostenindicatie: '€3.000-€15.000',
    doorlooptijd: '4-8 weken',
    wettelijkeBasis: 'Bkl hoofdstuk 5 (art. 5.12-5.22 plaatsgebonden risico, art. 5.23-5.28 aandachtsgebieden), Omgevingsplan (veiligheidszones), Bkl art. 5.35 (advies Veiligheidsregio)'
  },
  trillingen_onderzoek: {
    type: 'trillingen_onderzoek',
    naam: 'Trillingenonderzoek',
    toelichting: 'Onderzoek naar trillingshinder van spoor, industrie of bouwwerkzaamheden',
    instantie: 'Akoestisch/trillingen adviesbureau',
    kostenindicatie: '€2.000-€8.000',
    doorlooptijd: '2-4 weken',
    wettelijkeBasis: 'Bkl, SBR-richtlijnen'
  },
  geur_onderzoek: {
    type: 'geur_onderzoek',
    naam: 'Geuronderzoek',
    toelichting: 'Geurverspreidingsberekening en geurbelastingsonderzoek',
    instantie: 'Milieuadviesbureau',
    kostenindicatie: '€2.000-€8.000',
    doorlooptijd: '3-6 weken',
    wettelijkeBasis: 'Bkl, Omgevingsplan'
  },
  asbestinventarisatie: {
    type: 'asbestinventarisatie',
    naam: 'Asbestinventarisatie',
    toelichting: 'Inventarisatie asbesthoudende materialen bij sloop/verbouw van gebouwen van vóór 1994. Type A (volledig) of Type B (beperkt). Verplicht vóór sloopmelding.',
    instantie: 'Gecertificeerd asbestinventarisatiebureau (SC-540 certificatieschema)',
    kostenindicatie: '€500-€2.000',
    doorlooptijd: '1-2 weken',
    wettelijkeBasis: 'Arbeidsomstandighedenbesluit art. 4.54a (inventarisatieplicht), Asbestverwijderingsbesluit 2005 (verwijdering), Bbl art. 7.10-7.22 (sloopmelding met asbestinventarisatierapport)',
    drempelwaarden: {
      bouwjaarVoor: 1994 // Gebouwen van vóór 1994
    },
    vrijstellingsgronden: [
      'Bouwjaar 1994 of later (geen asbest toegepast)',
      'Eerder asbestvrij verklaard door gecertificeerd bureau',
      'Geen sloop of verbouw van asbesthoudende onderdelen'
    ]
  },
  bouwhistorisch_onderzoek: {
    type: 'bouwhistorisch_onderzoek',
    naam: 'Bouwhistorisch onderzoek',
    toelichting: 'Onderzoek naar bouwgeschiedenis en waardevolle elementen',
    instantie: 'Bouwhistoricus of monumentenspecialist',
    kostenindicatie: '€1.500-€5.000',
    doorlooptijd: '3-6 weken',
    wettelijkeBasis: 'Erfgoedwet, gemeentelijk monumentenbeleid'
  },
  constructieve_berekening: {
    type: 'constructieve_berekening',
    naam: 'Constructieve berekening',
    toelichting: 'Berekening draagconstructie conform Eurocode (NEN-EN 1990-1999). Toetst aan fundamentele belastingscombinaties en uiterste grenstoestand.',
    instantie: 'Constructeur (bij gevolgklasse 2-3: erkend constructeur)',
    kostenindicatie: '€1.000-€5.000',
    doorlooptijd: '2-4 weken',
    wettelijkeBasis: 'Bbl hoofdstuk 4 (art. 4.3-4.6 constructieve veiligheid), Eurocode NEN-EN 1990-1999, Bbl art. 2.17-2.20 (bouwmelding gevolgklasse 1)'
  },
  energieprestatieberekening: {
    type: 'energieprestatieberekening',
    naam: 'Energieprestatieberekening (BENG)',
    toelichting: 'Berekening energieprestatie voor nieuwbouw: BENG 1 (energiebehoefte), BENG 2 (primair fossiel energiegebruik), BENG 3 (aandeel hernieuwbare energie). Bepalingsmethode: NTA 8800.',
    instantie: 'EP-adviseur (gecertificeerd voor NTA 8800)',
    kostenindicatie: '€500-€1.500',
    doorlooptijd: '1-2 weken',
    wettelijkeBasis: 'Bbl hoofdstuk 5 (art. 5.2 BENG-eisen nieuwbouw), NTA 8800 (bepalingsmethode), Bbl art. 5.9-5.12 (ingrijpende renovatie >25% gebouwschil)'
  },
  daglicht_berekening: {
    type: 'daglicht_berekening',
    naam: 'Daglichtberekening',
    toelichting: 'Berekening daglichttoetreding conform Bbl',
    instantie: 'Bouwfysisch adviseur',
    kostenindicatie: '€500-€1.500',
    doorlooptijd: '1-2 weken',
    wettelijkeBasis: 'Bbl hoofdstuk 4'
  },
  brandveiligheid_onderzoek: {
    type: 'brandveiligheid_onderzoek',
    naam: 'Brandveiligheidsonderzoek',
    toelichting: 'Beoordeling brandveiligheid: vluchtroutes, brandcompartimentering, brandwerendheid, blusmiddelen. Bij bijeenkomstfunctie >50 personen of logiesfunctie >10 personen: omgevingsvergunning brandveilig gebruik.',
    instantie: 'Brandveiligheidsadviseur of Veiligheidsregio (advies)',
    kostenindicatie: '€1.000-€5.000',
    doorlooptijd: '2-4 weken',
    wettelijkeBasis: 'Bbl hoofdstuk 6 (brandveiligheid), Bbl art. 6.7 (gebruiksmelding), Bbl art. 6.8 (omgevingsvergunning brandveilig gebruik), Omgevingswet art. 5.1 lid 2 (vergunningplichtige activiteit)',
    vrijstellingsgronden: [
      'Woonfunctie zonder bijzondere voorzieningen',
      'Bijeenkomstfunctie ≤50 personen',
      'Logiesfunctie ≤10 personen'
    ]
  },
  klic_melding: {
    type: 'klic_melding',
    naam: 'KLIC-melding',
    toelichting: 'Melding bij Kadaster voor informatie over kabels en leidingen. Verplicht bij mechanisch graven. Grondroerder ontvangt binnen 1 werkdag gebiedsinformatie met ligging kabels/leidingen.',
    instantie: 'Kadaster (via kadaster.nl/klic of klicapp.nl)',
    kostenindicatie: '€15-€50 per melding',
    doorlooptijd: 'Minimaal 3 werkdagen voor aanvang graafwerk',
    wettelijkeBasis: 'WION art. 2 (meldingsplicht grondroerder), WION art. 8 (informatieverstrekking netbeheerder), WION art. 13 (zorgvuldigheidseisen grondroerder)'
  }
};

// Activiteit naar onderzoek mapping
interface ActiviteitOnderzoekMapping {
  altijdVerplicht: OnderzoekType[];
  bijOmvang: { onderzoek: OnderzoekType; drempel: string }[];
  bijLocatie: { onderzoek: OnderzoekType; locatieKenmerk: string }[];
}

const ACTIVITEIT_ONDERZOEK_MAPPING: Record<string, ActiviteitOnderzoekMapping> = {
  nieuwbouw: {
    altijdVerplicht: ['bodemonderzoek', 'constructieve_berekening', 'energieprestatieberekening'],
    bijOmvang: [
      { onderzoek: 'verkeersstudie', drempel: '>10 woningen of >1000m² BVO' },
      { onderzoek: 'stikstof_aerius', drempel: '>5 woningen of nabij Natura 2000' },
      { onderzoek: 'akoestisch_onderzoek', drempel: 'geluidsgevoelige functie' }
    ],
    bijLocatie: [
      { onderzoek: 'archeologisch_onderzoek', locatieKenmerk: 'archeologisch waardevol gebied' },
      { onderzoek: 'flora_fauna_onderzoek', locatieKenmerk: 'nabij Natura 2000 of NNN' },
      { onderzoek: 'watertoets', locatieKenmerk: 'nabij water of waterkering' }
    ]
  },
  verbouw: {
    altijdVerplicht: [],
    bijOmvang: [
      { onderzoek: 'constructieve_berekening', drempel: 'wijziging draagconstructie' },
      { onderzoek: 'asbestinventarisatie', drempel: 'gebouw van vóór 1994' }
    ],
    bijLocatie: [
      { onderzoek: 'bouwhistorisch_onderzoek', locatieKenmerk: 'monument of beschermd gezicht' }
    ]
  },
  functiewijziging: {
    altijdVerplicht: [],
    bijOmvang: [
      { onderzoek: 'verkeersstudie', drempel: 'significante toename verkeersgeneratie' },
      { onderzoek: 'akoestisch_onderzoek', drempel: 'naar geluidsgevoelige of geluidproducerende functie' },
      { onderzoek: 'brandveiligheid_onderzoek', drempel: 'naar bijeenkomstfunctie of logiesfunctie' }
    ],
    bijLocatie: []
  },
  sloop: {
    altijdVerplicht: [],
    bijOmvang: [
      { onderzoek: 'asbestinventarisatie', drempel: 'gebouw van vóór 1994' }
    ],
    bijLocatie: [
      { onderzoek: 'archeologisch_onderzoek', locatieKenmerk: 'archeologisch waardevol gebied' }
    ]
  },
  uitbouw: {
    altijdVerplicht: [],
    bijOmvang: [
      { onderzoek: 'constructieve_berekening', drempel: '>30m² of wijziging draagconstructie' }
    ],
    bijLocatie: []
  },
  dakkapel: {
    altijdVerplicht: [],
    bijOmvang: [],
    bijLocatie: [
      { onderzoek: 'bouwhistorisch_onderzoek', locatieKenmerk: 'monument' }
    ]
  }
};

// Default vrijstellingsgrenzen (landelijk gangbaar)
const DEFAULT_VRIJSTELLINGEN: GemeenteVrijstellingen = {
  archeologieVrijstellingDiepteCm: 30,
  archeologieVrijstellingOppervlakteM2: 100,
  bodemonderzoekVrijstellingGebieden: [],
  bodemonderzoekVrijstellingPostcodes: []
};

/**
 * Bepaal alle vereiste en aanbevolen onderzoeken
 * 
 * @param activiteiten - Lijst van activiteiten (nieuwbouw, verbouw, etc.)
 * @param ruimtelijkePlannen - Resultaat van ruimtelijke plannen analyse
 * @param pdokAnalyse - Resultaat van PDOK analyse
 * @param milieuAnalyse - Resultaat van milieu analyse
 * @param aeriusVereiste - AERIUS vereiste
 * @param projectDetails - Project specifieke details
 * @param gemeenteVrijstellingen - Gemeente-specifieke vrijstellingsgrenzen uit omgevingsplan
 */
export function bepaalOnderzoeken(
  activiteiten: string[],
  ruimtelijkePlannen?: RuimtelijkePlannenResultaat,
  pdokAnalyse?: PDOKAnalyseResultaat,
  milieuAnalyse?: MilieuAnalyse,
  aeriusVereiste?: AeriusVereiste,
  projectDetails?: {
    aantalWoningen?: number;
    oppervlakteM2?: number;
    bouwjaar?: number;
    isGeluidsgevoelig?: boolean;
    heeftGraafwerk?: boolean;
    graafdiepteCm?: number;
    postcode?: string;
    gebiedsnaam?: string;
  },
  gemeenteVrijstellingen?: GemeenteVrijstellingen
): OnderzoekenResultaat {
  // Gebruik gemeente-specifieke vrijstellingen of defaults
  const vrijstellingen = gemeenteVrijstellingen || DEFAULT_VRIJSTELLINGEN;
  const verplichteOnderzoeken: OnderzoekVereiste[] = [];
  const aanbevolenOnderzoeken: OnderzoekVereiste[] = [];
  let klicMeldingVereist = false;
  let klicToelichting: string | undefined;

  // Helper om onderzoek toe te voegen
  const voegOnderzoekToe = (
    type: OnderzoekType,
    verplicht: boolean,
    reden: string,
    trigger: string
  ) => {
    // Check of al toegevoegd
    const bestaand = [...verplichteOnderzoeken, ...aanbevolenOnderzoeken].find(o => o.type === type);
    if (bestaand) {
      // Upgrade naar verplicht indien nodig
      if (verplicht && !bestaand.verplicht) {
        const idx = aanbevolenOnderzoeken.findIndex(o => o.type === type);
        if (idx >= 0) {
          aanbevolenOnderzoeken.splice(idx, 1);
          verplichteOnderzoeken.push({
            ...ONDERZOEK_DEFINITIES[type],
            verplicht: true,
            reden,
            trigger
          });
        }
      }
      return;
    }

    const onderzoek: OnderzoekVereiste = {
      ...ONDERZOEK_DEFINITIES[type],
      verplicht,
      reden,
      trigger
    };

    if (verplicht) {
      verplichteOnderzoeken.push(onderzoek);
    } else {
      aanbevolenOnderzoeken.push(onderzoek);
    }
  };

  // 1. Check dubbelbestemmingen uit ruimtelijke plannen
  if (ruimtelijkePlannen) {
    for (const db of ruimtelijkePlannen.dubbelbestemmingen) {
      switch (db.type) {
        case 'waarde_archeologie': {
          // Check vrijstellingsgrenzen voor archeologie
          const diepte = projectDetails?.graafdiepteCm || 0;
          const oppervlakte = projectDetails?.oppervlakteM2 || 0;
          const vrijstellingDiepte = vrijstellingen.archeologieVrijstellingDiepteCm;
          const vrijstellingOppervlakte = vrijstellingen.archeologieVrijstellingOppervlakteM2;
          
          // Onderzoek alleen verplicht als BEIDE drempels overschreden
          const overschrijdtDrempels = diepte > vrijstellingDiepte && oppervlakte > vrijstellingOppervlakte;
          
          if (overschrijdtDrempels) {
            voegOnderzoekToe(
              'archeologisch_onderzoek',
              true,
              `Dubbelbestemming: ${db.naam}`,
              `Bodemingreep >${vrijstellingDiepte}cm diep en >${vrijstellingOppervlakte}m² in archeologisch waardevol gebied`
            );
          } else if (diepte > 0 || oppervlakte > 0) {
            // Onder drempels: aanbevolen, niet verplicht
            voegOnderzoekToe(
              'archeologisch_onderzoek',
              false,
              `Dubbelbestemming: ${db.naam} (onder vrijstellingsgrens)`,
              `Vrijstelling: ≤${vrijstellingDiepte}cm diepte OF ≤${vrijstellingOppervlakte}m² oppervlakte. Huidige waarden: ${diepte}cm / ${oppervlakte}m²`
            );
          } else {
            // Geen details bekend: verplicht (voorzichtigheidsprincipe)
            voegOnderzoekToe(
              'archeologisch_onderzoek',
              true,
              `Dubbelbestemming: ${db.naam}`,
              `Bodemingreep in archeologisch waardevol gebied (vrijstellingsgrens: >${vrijstellingDiepte}cm en >${vrijstellingOppervlakte}m²)`
            );
          }
          break;
        }
        case 'waarde_cultuurhistorie':
          voegOnderzoekToe(
            'cultuurhistorisch_onderzoek',
            true,
            `Dubbelbestemming: ${db.naam}`,
            'Wijziging in cultuurhistorisch waardevol gebied'
          );
          break;
        case 'waterstaat_waterkering':
        case 'waterstaat_waterloop':
          voegOnderzoekToe(
            'watertoets',
            true,
            `Dubbelbestemming: ${db.naam}`,
            'Activiteit nabij waterkering of waterloop'
          );
          break;
        case 'geluidszone':
          voegOnderzoekToe(
            'akoestisch_onderzoek',
            true,
            `Dubbelbestemming: ${db.naam}`,
            'Geluidsgevoelige functie in geluidszone'
          );
          break;
        case 'veiligheidszone':
          voegOnderzoekToe(
            'externe_veiligheid_qra',
            true,
            `Dubbelbestemming: ${db.naam}`,
            'Kwetsbaar object in veiligheidszone'
          );
          break;
        case 'leiding_gas':
        case 'leiding_hoogspanning':
        case 'leiding_riool':
        case 'leiding_water':
          klicMeldingVereist = true;
          klicToelichting = `KLIC-melding verplicht vanwege dubbelbestemming: ${db.naam}`;
          voegOnderzoekToe(
            'klic_melding',
            true,
            `Dubbelbestemming: ${db.naam}`,
            'Graafwerk nabij ondergrondse leiding'
          );
          break;
      }
    }
  }

  // 2. Check PDOK analyse resultaten
  if (pdokAnalyse) {
    // Natura 2000
    if (pdokAnalyse.natura2000.binnenGebied || 
        (pdokAnalyse.natura2000.dichtstbijzijnde && pdokAnalyse.natura2000.dichtstbijzijnde.afstandMeter < 3000)) {
      voegOnderzoekToe(
        'flora_fauna_onderzoek',
        true,
        `Nabij Natura 2000: ${pdokAnalyse.natura2000.dichtstbijzijnde?.naam || 'onbekend'}`,
        'Activiteit in of nabij Natura 2000-gebied'
      );
    }

    // Rijksmonument
    if (pdokAnalyse.monumenten.isRijksmonument) {
      voegOnderzoekToe(
        'bouwhistorisch_onderzoek',
        true,
        `Rijksmonument: ${pdokAnalyse.monumenten.monument?.naam || 'onbekend'}`,
        'Wijziging aan rijksmonument'
      );
    }

    // Beschermd gezicht
    if (pdokAnalyse.beschermdGezicht.binnenGebied) {
      voegOnderzoekToe(
        'cultuurhistorisch_onderzoek',
        true,
        `Beschermd gezicht: ${pdokAnalyse.beschermdGezicht.gezicht?.naam || 'onbekend'}`,
        'Activiteit in beschermd stads- of dorpsgezicht'
      );
    }

    // Grondwaterbescherming - check vrijstellingen
    if (pdokAnalyse.grondwater?.binnenBeschermingsgebied) {
      const zoneNaam = pdokAnalyse.grondwater.zones?.[0]?.naam || 'onbekend';
      
      // Check of locatie in vrijstellingsgebied of postcode ligt
      const postcode = projectDetails?.postcode;
      const gebiedsnaam = projectDetails?.gebiedsnaam;
      const isVrijgesteld = (
        (postcode && vrijstellingen.bodemonderzoekVrijstellingPostcodes?.includes(postcode)) ||
        (gebiedsnaam && vrijstellingen.bodemonderzoekVrijstellingGebieden?.includes(gebiedsnaam))
      );
      
      if (isVrijgesteld) {
        voegOnderzoekToe(
          'bodemonderzoek',
          false,
          `Grondwaterbeschermingsgebied: ${zoneNaam} (vrijgesteld)`,
          `Locatie valt onder gemeentelijke vrijstelling voor bodemonderzoek`
        );
      } else {
        voegOnderzoekToe(
          'bodemonderzoek',
          true,
          `Grondwaterbeschermingsgebied: ${zoneNaam}`,
          'Activiteit in grondwaterbeschermingsgebied'
        );
      }
    }
  }

  // 3. Check milieu analyse
  if (milieuAnalyse) {
    // Geluidszones
    if (milieuAnalyse.geluidzoneVliegveld || milieuAnalyse.nabijHoofdweg || milieuAnalyse.nabijSpoorweg) {
      voegOnderzoekToe(
        'akoestisch_onderzoek',
        true,
        'Locatie in geluidszone',
        milieuAnalyse.geluidzoneVliegveld 
          ? 'Geluidszone vliegveld' 
          : milieuAnalyse.nabijHoofdweg 
            ? 'Nabij hoofdweg' 
            : 'Nabij spoorweg'
      );
    }

    // Bodem - check vrijstellingen
    if (milieuAnalyse.bodemverontreiniging) {
      // Bij bekende verontreiniging is onderzoek altijd verplicht (geen vrijstelling)
      voegOnderzoekToe(
        'bodemonderzoek',
        true,
        'Bodemverontreiniging bekend',
        `Bodemloket: ${milieuAnalyse.bodemverontreiniging.status || 'verdachte locatie'}`
      );
    }

    // Externe veiligheid
    if (milieuAnalyse.risicocontouren?.some(r => r.binnenContour)) {
      voegOnderzoekToe(
        'externe_veiligheid_qra',
        true,
        'Locatie binnen risicocontouren',
        'REV: locatie binnen plaatsgebonden risico of aandachtsgebied'
      );
    }
  }

  // 4. Check AERIUS vereiste
  if (aeriusVereiste?.vereist) {
    voegOnderzoekToe(
      'stikstof_aerius',
      true,
      aeriusVereiste.reden,
      aeriusVereiste.toelichting
    );
  }

  // 5. Check activiteit-specifieke onderzoeken
  for (const activiteit of activiteiten) {
    const mapping = ACTIVITEIT_ONDERZOEK_MAPPING[activiteit.toLowerCase()];
    if (!mapping) continue;

    // Altijd verplicht
    for (const type of mapping.altijdVerplicht) {
      voegOnderzoekToe(
        type,
        true,
        `Standaard bij ${activiteit}`,
        `Activiteit: ${activiteit}`
      );
    }

    // Bij omvang
    for (const { onderzoek, drempel } of mapping.bijOmvang) {
      // Check specifieke drempels
      if (projectDetails) {
        let vereist = false;
        if (onderzoek === 'verkeersstudie' && projectDetails.aantalWoningen && projectDetails.aantalWoningen > 10) {
          vereist = true;
        }
        if (onderzoek === 'stikstof_aerius' && projectDetails.aantalWoningen && projectDetails.aantalWoningen >= 5) {
          vereist = true;
        }
        if (onderzoek === 'asbestinventarisatie' && projectDetails.bouwjaar && projectDetails.bouwjaar < 1994) {
          vereist = true;
        }
        if (onderzoek === 'akoestisch_onderzoek' && projectDetails.isGeluidsgevoelig) {
          vereist = true;
        }

        if (vereist) {
          voegOnderzoekToe(onderzoek, true, `Drempel overschreden: ${drempel}`, `Activiteit: ${activiteit}`);
        } else {
          voegOnderzoekToe(onderzoek, false, `Mogelijk vereist bij: ${drempel}`, `Activiteit: ${activiteit}`);
        }
      } else {
        voegOnderzoekToe(onderzoek, false, `Mogelijk vereist bij: ${drempel}`, `Activiteit: ${activiteit}`);
      }
    }
  }

  // 6. KLIC-melding bij graafwerk
  if (projectDetails?.heeftGraafwerk || (projectDetails?.graafdiepteCm && projectDetails.graafdiepteCm > 20)) {
    klicMeldingVereist = true;
    klicToelichting = klicToelichting || 'KLIC-melding verplicht bij graafwerkzaamheden >20cm diepte';
    voegOnderzoekToe(
      'klic_melding',
      true,
      'Graafwerkzaamheden gepland',
      `Graafdiepte: ${projectDetails.graafdiepteCm || '>20'}cm`
    );
  }

  return {
    verplichteOnderzoeken,
    aanbevolenOnderzoeken,
    klicMeldingVereist,
    klicToelichting,
    totaalAantalVerplicht: verplichteOnderzoeken.length,
    totaalAantalAanbevolen: aanbevolenOnderzoeken.length
  };
}

/**
 * Format onderzoeken voor AI context
 */
export function formatOnderzoekenVoorAI(resultaat: OnderzoekenResultaat): string {
  if (resultaat.totaalAantalVerplicht === 0 && resultaat.totaalAantalAanbevolen === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('=== VEREISTE ONDERZOEKEN ===\n');

  // Verplichte onderzoeken
  if (resultaat.verplichteOnderzoeken.length > 0) {
    lines.push('## VERPLICHTE ONDERZOEKEN');
    lines.push('⚠️ De volgende onderzoeken MOETEN worden uitgevoerd:\n');

    for (const onderzoek of resultaat.verplichteOnderzoeken) {
      lines.push(`### ${onderzoek.naam}`);
      lines.push(`**Reden**: ${onderzoek.reden}`);
      lines.push(`**Trigger**: ${onderzoek.trigger}`);
      lines.push(`**Toelichting**: ${onderzoek.toelichting}`);
      if (onderzoek.instantie) {
        lines.push(`**Uitvoerder**: ${onderzoek.instantie}`);
      }
      if (onderzoek.kostenindicatie) {
        lines.push(`**Kostenindicatie**: ${onderzoek.kostenindicatie}`);
      }
      if (onderzoek.doorlooptijd) {
        lines.push(`**Doorlooptijd**: ${onderzoek.doorlooptijd}`);
      }
      if (onderzoek.wettelijkeBasis) {
        lines.push(`**Wettelijke basis**: ${onderzoek.wettelijkeBasis}`);
      }
      // Toon drempelwaarden indien aanwezig
      if (onderzoek.drempelwaarden) {
        const drempels: string[] = [];
        if (onderzoek.drempelwaarden.diepteCm) drempels.push(`diepte >${onderzoek.drempelwaarden.diepteCm}cm`);
        if (onderzoek.drempelwaarden.oppervlakteM2) drempels.push(`oppervlakte >${onderzoek.drempelwaarden.oppervlakteM2}m²`);
        if (onderzoek.drempelwaarden.aantalWoningen) drempels.push(`>${onderzoek.drempelwaarden.aantalWoningen} woningen`);
        if (onderzoek.drempelwaarden.afstandMeter) drempels.push(`binnen ${onderzoek.drempelwaarden.afstandMeter}m`);
        if (onderzoek.drempelwaarden.bouwjaarVoor) drempels.push(`bouwjaar vóór ${onderzoek.drempelwaarden.bouwjaarVoor}`);
        if (drempels.length > 0) {
          lines.push(`**Drempelwaarden**: ${drempels.join(', ')}`);
        }
      }
      // Toon vrijstellingsgronden indien aanwezig
      if (onderzoek.vrijstellingsgronden && onderzoek.vrijstellingsgronden.length > 0) {
        lines.push(`**Mogelijke vrijstellingen**:`);
        for (const vrijstelling of onderzoek.vrijstellingsgronden) {
          lines.push(`  - ${vrijstelling}`);
        }
      }
      lines.push('');
    }
  }

  // Aanbevolen onderzoeken
  if (resultaat.aanbevolenOnderzoeken.length > 0) {
    lines.push('## AANBEVOLEN ONDERZOEKEN');
    lines.push('ℹ️ De volgende onderzoeken worden aanbevolen:\n');

    for (const onderzoek of resultaat.aanbevolenOnderzoeken) {
      lines.push(`### ${onderzoek.naam}`);
      lines.push(`**Reden**: ${onderzoek.reden}`);
      lines.push(`**Trigger**: ${onderzoek.trigger}`);
      lines.push(`**Toelichting**: ${onderzoek.toelichting}`);
      lines.push('');
    }
  }

  // KLIC-melding
  if (resultaat.klicMeldingVereist) {
    lines.push('## KLIC-MELDING');
    lines.push('⚠️ **KLIC-melding is VERPLICHT**');
    if (resultaat.klicToelichting) {
      lines.push(resultaat.klicToelichting);
    }
    lines.push('- Aanvragen via: kadaster.nl/klic');
    lines.push('- Minimaal 3 werkdagen voor aanvang graafwerk');
    lines.push('- Wettelijke basis: WION (Wet informatie-uitwisseling ondergrondse netten)');
    lines.push('');
  }

  // Samenvatting
  lines.push('## SAMENVATTING');
  lines.push(`- **Verplichte onderzoeken**: ${resultaat.totaalAantalVerplicht}`);
  lines.push(`- **Aanbevolen onderzoeken**: ${resultaat.totaalAantalAanbevolen}`);
  lines.push(`- **KLIC-melding**: ${resultaat.klicMeldingVereist ? 'Ja, verplicht' : 'Niet van toepassing'}`);
  lines.push('');

  return lines.join('\n');
}
