/**
 * Indieningsvereisten Service - Controleert volledigheid van aanvraag
 * 
 * Gebaseerd op Omgevingsregeling hoofdstuk 7:
 * - Art. 7.3: Algemene indieningsvereisten
 * - Art. 7.4: Specifieke indieningsvereisten per activiteit
 * 
 * Dit is een centrale service die bepaalt welke documenten vereist zijn
 * voor een complete aanvraag en controleert of deze zijn ingediend.
 */

// Indieningsvereiste types
export type IndieningsvereisteCategorieType = 
  | 'algemeen'           // Art. 7.3 - Algemene vereisten
  | 'bouwactiviteit'     // Art. 7.188-7.199
  | 'sloopactiviteit'    // Art. 7.10-7.22
  | 'monumentenactiviteit' // Art. 7.200-7.210
  | 'milieubelastend'    // Art. 7.25-7.100
  | 'natuuractiviteit'   // Art. 7.211-7.220
  | 'wateractiviteit'    // Art. 7.221-7.230
  | 'afwijkactiviteit';  // Art. 7.231-7.240 (BOPA)

export interface Indieningsvereiste {
  id: string;
  naam: string;
  categorie: IndieningsvereisteCategorieType;
  verplicht: boolean;
  wettelijkeBasis: string;
  toelichting: string;
  bestandstypen?: string[]; // Toegestane bestandsformaten
  triggers?: string[]; // Wanneer is dit vereist
}

export interface IndieningsCheck {
  vereiste: Indieningsvereiste;
  status: 'aanwezig' | 'ontbreekt' | 'onvolledig' | 'niet_van_toepassing';
  opmerking?: string;
}

export interface IndieningsvereistenResultaat {
  volledig: boolean;
  aantalVerplicht: number;
  aantalAanwezig: number;
  aantalOntbreekt: number;
  checks: IndieningsCheck[];
  ontbrekendeDocumenten: Indieningsvereiste[];
  aanbevolenDocumenten: Indieningsvereiste[];
}

// Algemene indieningsvereisten (Omgevingsregeling art. 7.3)
const ALGEMENE_VEREISTEN: Indieningsvereiste[] = [
  {
    id: 'aanvraagformulier',
    naam: 'Aanvraagformulier',
    categorie: 'algemeen',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.3 lid 1',
    toelichting: 'Volledig ingevuld aanvraagformulier via DSO',
    bestandstypen: ['xml', 'pdf']
  },
  {
    id: 'situatietekening',
    naam: 'Situatietekening',
    categorie: 'algemeen',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.3 lid 2 sub a',
    toelichting: 'Situatietekening met schaal, noordpijl, afmetingen en afstanden tot perceelsgrenzen',
    bestandstypen: ['pdf', 'dwg', 'dxf']
  },
  {
    id: 'kadastrale_gegevens',
    naam: 'Kadastrale gegevens',
    categorie: 'algemeen',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.3 lid 2 sub b',
    toelichting: 'Kadastrale aanduiding van het perceel',
    bestandstypen: ['pdf']
  }
];

// Bouwactiviteit indieningsvereisten (Omgevingsregeling art. 7.188-7.199)
const BOUW_VEREISTEN: Indieningsvereiste[] = [
  {
    id: 'plattegronden',
    naam: 'Plattegronden',
    categorie: 'bouwactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.188 lid 1 sub a',
    toelichting: 'Plattegronden van alle bouwlagen met maatvoering, schaal 1:100',
    bestandstypen: ['pdf', 'dwg'],
    triggers: ['nieuwbouw', 'verbouw', 'uitbouw']
  },
  {
    id: 'doorsneden',
    naam: 'Doorsneden',
    categorie: 'bouwactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.188 lid 1 sub b',
    toelichting: 'Lengte- en dwarsdoorsneden met hoogtematen, schaal 1:100',
    bestandstypen: ['pdf', 'dwg'],
    triggers: ['nieuwbouw', 'verbouw']
  },
  {
    id: 'geveltekeningen',
    naam: 'Geveltekeningen',
    categorie: 'bouwactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.188 lid 1 sub c',
    toelichting: 'Alle gevels met materialen, kleuren en afmetingen',
    bestandstypen: ['pdf', 'dwg'],
    triggers: ['nieuwbouw', 'verbouw', 'gevelwijziging']
  },
  {
    id: 'constructieve_gegevens',
    naam: 'Constructieve gegevens',
    categorie: 'bouwactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.188 lid 2',
    toelichting: 'Constructieberekeningen en -tekeningen voor draagconstructie',
    bestandstypen: ['pdf'],
    triggers: ['nieuwbouw', 'verbouw']
  },
  {
    id: 'bouwveiligheidsplan',
    naam: 'Bouwveiligheidsplan',
    categorie: 'bouwactiviteit',
    verplicht: false,
    wettelijkeBasis: 'Omgevingsregeling art. 7.189',
    toelichting: 'Vereist bij bouwwerkzaamheden met risico voor omgeving',
    bestandstypen: ['pdf'],
    triggers: ['nieuwbouw', 'sloop']
  },
  {
    id: 'energieprestatieberekening',
    naam: 'Energieprestatieberekening (BENG)',
    categorie: 'bouwactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.190',
    toelichting: 'BENG-berekening conform NTA 8800 voor nieuwbouw',
    bestandstypen: ['pdf', 'xml'],
    triggers: ['nieuwbouw']
  },
  {
    id: 'ventilatie_berekening',
    naam: 'Ventilatieberekening',
    categorie: 'bouwactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.191',
    toelichting: 'Berekening ventilatiecapaciteit conform Bbl',
    bestandstypen: ['pdf'],
    triggers: ['nieuwbouw', 'verbouw']
  },
  {
    id: 'daglichtberekening',
    naam: 'Daglichtberekening',
    categorie: 'bouwactiviteit',
    verplicht: false,
    wettelijkeBasis: 'Omgevingsregeling art. 7.192',
    toelichting: 'Berekening daglichttoetreding bij verblijfsruimten',
    bestandstypen: ['pdf'],
    triggers: ['nieuwbouw']
  }
];

// Sloopactiviteit indieningsvereisten (Bbl art. 7.10-7.22)
const SLOOP_VEREISTEN: Indieningsvereiste[] = [
  {
    id: 'sloopmelding',
    naam: 'Sloopmelding',
    categorie: 'sloopactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Bbl art. 7.10',
    toelichting: 'Melding minimaal 4 weken voor aanvang sloopwerkzaamheden',
    bestandstypen: ['pdf', 'xml'],
    triggers: ['sloop']
  },
  {
    id: 'asbestinventarisatierapport',
    naam: 'Asbestinventarisatierapport',
    categorie: 'sloopactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Bbl art. 7.11',
    toelichting: 'Verplicht bij sloop gebouwen van vóór 1994, uitgevoerd door SC-540 gecertificeerd bureau',
    bestandstypen: ['pdf'],
    triggers: ['sloop']
  },
  {
    id: 'sloopveiligheidsplan',
    naam: 'Sloopveiligheidsplan',
    categorie: 'sloopactiviteit',
    verplicht: false,
    wettelijkeBasis: 'Bbl art. 7.12',
    toelichting: 'Vereist bij sloop met risico voor omgeving of bij asbest',
    bestandstypen: ['pdf'],
    triggers: ['sloop']
  }
];

// Monumentenactiviteit indieningsvereisten
const MONUMENT_VEREISTEN: Indieningsvereiste[] = [
  {
    id: 'bouwhistorisch_rapport',
    naam: 'Bouwhistorisch rapport',
    categorie: 'monumentenactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.200',
    toelichting: 'Onderzoek naar bouwgeschiedenis en waardevolle elementen',
    bestandstypen: ['pdf'],
    triggers: ['monument', 'beschermd_gezicht']
  },
  {
    id: 'foto_documentatie',
    naam: 'Fotodocumentatie bestaande situatie',
    categorie: 'monumentenactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.201',
    toelichting: 'Foto\'s van alle relevante onderdelen van het monument',
    bestandstypen: ['pdf', 'jpg', 'png'],
    triggers: ['monument', 'beschermd_gezicht']
  },
  {
    id: 'restauratieplan',
    naam: 'Restauratieplan',
    categorie: 'monumentenactiviteit',
    verplicht: false,
    wettelijkeBasis: 'Omgevingsregeling art. 7.202',
    toelichting: 'Plan voor restauratie met materiaalgebruik en werkmethoden',
    bestandstypen: ['pdf'],
    triggers: ['monument']
  }
];

// Natuuractiviteit indieningsvereisten
const NATUUR_VEREISTEN: Indieningsvereiste[] = [
  {
    id: 'quickscan_flora_fauna',
    naam: 'Quickscan flora en fauna',
    categorie: 'natuuractiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.211',
    toelichting: 'Ecologische quickscan naar beschermde soorten',
    bestandstypen: ['pdf'],
    triggers: ['natura2000', 'nnn', 'sloop', 'kap']
  },
  {
    id: 'aerius_berekening',
    naam: 'AERIUS-berekening',
    categorie: 'natuuractiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.212',
    toelichting: 'Stikstofberekening voor bouw- en gebruiksfase',
    bestandstypen: ['pdf', 'xml'],
    triggers: ['natura2000', 'stikstof']
  },
  {
    id: 'passende_beoordeling',
    naam: 'Passende beoordeling',
    categorie: 'natuuractiviteit',
    verplicht: false,
    wettelijkeBasis: 'Omgevingsregeling art. 7.213, Wnb art. 2.8',
    toelichting: 'Vereist bij significante effecten op Natura 2000-gebied',
    bestandstypen: ['pdf'],
    triggers: ['natura2000']
  }
];

// Wateractiviteit indieningsvereisten
const WATER_VEREISTEN: Indieningsvereiste[] = [
  {
    id: 'watertoets',
    naam: 'Watertoets',
    categorie: 'wateractiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.221',
    toelichting: 'Digitale watertoets via dewatertoets.nl',
    bestandstypen: ['pdf'],
    triggers: ['waterschap', 'verharding', 'grondwater']
  },
  {
    id: 'waterhuishoudkundig_plan',
    naam: 'Waterhuishoudkundig plan',
    categorie: 'wateractiviteit',
    verplicht: false,
    wettelijkeBasis: 'Omgevingsregeling art. 7.222',
    toelichting: 'Plan voor waterberging, afvoer en infiltratie',
    bestandstypen: ['pdf'],
    triggers: ['verharding', 'nieuwbouw']
  }
];

// Afwijkactiviteit (BOPA) indieningsvereisten
const BOPA_VEREISTEN: Indieningsvereiste[] = [
  {
    id: 'ruimtelijke_onderbouwing',
    naam: 'Ruimtelijke onderbouwing',
    categorie: 'afwijkactiviteit',
    verplicht: true,
    wettelijkeBasis: 'Omgevingsregeling art. 7.231',
    toelichting: 'Onderbouwing waarom afwijking van omgevingsplan aanvaardbaar is (ETFAL)',
    bestandstypen: ['pdf'],
    triggers: ['bopa', 'afwijking']
  },
  {
    id: 'participatieverslag',
    naam: 'Participatieverslag',
    categorie: 'afwijkactiviteit',
    verplicht: false,
    wettelijkeBasis: 'Omgevingsregeling art. 7.232',
    toelichting: 'Verslag van participatie met omwonenden en belanghebbenden',
    bestandstypen: ['pdf'],
    triggers: ['bopa']
  }
];

// Alle vereisten gecombineerd
const ALLE_VEREISTEN: Indieningsvereiste[] = [
  ...ALGEMENE_VEREISTEN,
  ...BOUW_VEREISTEN,
  ...SLOOP_VEREISTEN,
  ...MONUMENT_VEREISTEN,
  ...NATUUR_VEREISTEN,
  ...WATER_VEREISTEN,
  ...BOPA_VEREISTEN
];

/**
 * Bepaal welke indieningsvereisten van toepassing zijn
 */
export function bepaalIndieningsvereisten(
  activiteiten: string[],
  locatieKenmerken?: {
    isMonument?: boolean;
    isBeschermdGezicht?: boolean;
    nabijNatura2000?: boolean;
    nabijWater?: boolean;
    bouwjaar?: number;
    isBOPA?: boolean;
  }
): Indieningsvereiste[] {
  const vereisten: Indieningsvereiste[] = [];
  const toegevoegdeIds = new Set<string>();

  // Helper om vereiste toe te voegen (voorkomt duplicaten)
  const voegToe = (vereiste: Indieningsvereiste) => {
    if (!toegevoegdeIds.has(vereiste.id)) {
      vereisten.push(vereiste);
      toegevoegdeIds.add(vereiste.id);
    }
  };

  // Algemene vereisten altijd toevoegen
  ALGEMENE_VEREISTEN.forEach(voegToe);

  // Check activiteiten
  const activiteitenLower = activiteiten.map(a => a.toLowerCase());

  // Bouwactiviteit
  if (activiteitenLower.some(a => 
    a.includes('bouw') || a.includes('nieuwbouw') || 
    a.includes('verbouw') || a.includes('uitbouw') ||
    a.includes('aanbouw')
  )) {
    BOUW_VEREISTEN.forEach(v => {
      if (v.triggers?.some(t => activiteitenLower.some(a => a.includes(t)))) {
        voegToe(v);
      }
    });
  }

  // Sloopactiviteit
  if (activiteitenLower.some(a => a.includes('sloop'))) {
    SLOOP_VEREISTEN.forEach(v => {
      // Asbestinventarisatie alleen bij gebouwen vóór 1994
      if (v.id === 'asbestinventarisatierapport') {
        if (!locatieKenmerken?.bouwjaar || locatieKenmerken.bouwjaar < 1994) {
          voegToe(v);
        }
      } else {
        voegToe(v);
      }
    });
  }

  // Monumentenactiviteit
  if (locatieKenmerken?.isMonument || locatieKenmerken?.isBeschermdGezicht) {
    MONUMENT_VEREISTEN.forEach(voegToe);
  }

  // Natuuractiviteit
  if (locatieKenmerken?.nabijNatura2000) {
    NATUUR_VEREISTEN.forEach(voegToe);
  }

  // Wateractiviteit
  if (locatieKenmerken?.nabijWater || activiteitenLower.some(a => 
    a.includes('water') || a.includes('verharding')
  )) {
    WATER_VEREISTEN.forEach(voegToe);
  }

  // BOPA
  if (locatieKenmerken?.isBOPA || activiteitenLower.some(a => 
    a.includes('bopa') || a.includes('afwijking') || a.includes('buitenplans')
  )) {
    BOPA_VEREISTEN.forEach(voegToe);
  }

  return vereisten;
}

/**
 * Controleer volledigheid van ingediende documenten
 */
export function controleerVolledigheid(
  vereisten: Indieningsvereiste[],
  ingediendeDocs: string[] // Lijst van document IDs die zijn ingediend
): IndieningsvereistenResultaat {
  const checks: IndieningsCheck[] = [];
  const ontbrekendeDocumenten: Indieningsvereiste[] = [];
  const aanbevolenDocumenten: Indieningsvereiste[] = [];

  for (const vereiste of vereisten) {
    const isAanwezig = ingediendeDocs.includes(vereiste.id);
    
    if (vereiste.verplicht) {
      checks.push({
        vereiste,
        status: isAanwezig ? 'aanwezig' : 'ontbreekt',
        opmerking: isAanwezig ? undefined : `Verplicht document ontbreekt: ${vereiste.naam}`
      });
      
      if (!isAanwezig) {
        ontbrekendeDocumenten.push(vereiste);
      }
    } else {
      checks.push({
        vereiste,
        status: isAanwezig ? 'aanwezig' : 'niet_van_toepassing',
        opmerking: isAanwezig ? undefined : 'Aanbevolen maar niet verplicht'
      });
      
      if (!isAanwezig) {
        aanbevolenDocumenten.push(vereiste);
      }
    }
  }

  const verplichteVereisten = vereisten.filter(v => v.verplicht);
  const aanwezigeVerplichte = verplichteVereisten.filter(v => ingediendeDocs.includes(v.id));

  return {
    volledig: ontbrekendeDocumenten.length === 0,
    aantalVerplicht: verplichteVereisten.length,
    aantalAanwezig: aanwezigeVerplichte.length,
    aantalOntbreekt: ontbrekendeDocumenten.length,
    checks,
    ontbrekendeDocumenten,
    aanbevolenDocumenten
  };
}

/**
 * Format indieningsvereisten voor AI context
 */
export function formatIndieningsvereistenVoorAI(
  resultaat: IndieningsvereistenResultaat
): string {
  const lines: string[] = [];
  lines.push('=== INDIENINGSVEREISTEN CHECK ===\\n');

  // Status
  if (resultaat.volledig) {
    lines.push('✅ **AANVRAAG VOLLEDIG**');
    lines.push(`Alle ${resultaat.aantalVerplicht} verplichte documenten zijn ingediend.\\n`);
  } else {
    lines.push('⚠️ **AANVRAAG ONVOLLEDIG**');
    lines.push(`${resultaat.aantalOntbreekt} van ${resultaat.aantalVerplicht} verplichte documenten ontbreken.\\n`);
  }

  // Ontbrekende documenten
  if (resultaat.ontbrekendeDocumenten.length > 0) {
    lines.push('## ONTBREKENDE VERPLICHTE DOCUMENTEN');
    lines.push('De volgende documenten MOETEN nog worden ingediend:\\n');

    for (const doc of resultaat.ontbrekendeDocumenten) {
      lines.push(`### ${doc.naam}`);
      lines.push(`**Wettelijke basis**: ${doc.wettelijkeBasis}`);
      lines.push(`**Toelichting**: ${doc.toelichting}`);
      if (doc.bestandstypen) {
        lines.push(`**Toegestane formaten**: ${doc.bestandstypen.join(', ')}`);
      }
      lines.push('');
    }
  }

  // Aanbevolen documenten
  if (resultaat.aanbevolenDocumenten.length > 0) {
    lines.push('## AANBEVOLEN DOCUMENTEN');
    lines.push('De volgende documenten zijn niet verplicht maar worden aanbevolen:\\n');

    for (const doc of resultaat.aanbevolenDocumenten) {
      lines.push(`- **${doc.naam}**: ${doc.toelichting}`);
    }
    lines.push('');
  }

  return lines.join('\\n');
}

/**
 * Genereer checklist voor behandelaar
 */
export function genereerChecklist(
  vereisten: Indieningsvereiste[]
): string {
  const lines: string[] = [];
  lines.push('# Indieningsvereisten Checklist\\n');
  lines.push('Controleer of de volgende documenten zijn ingediend:\\n');

  // Groepeer per categorie
  const perCategorie = new Map<IndieningsvereisteCategorieType, Indieningsvereiste[]>();
  for (const v of vereisten) {
    const lijst = perCategorie.get(v.categorie) || [];
    lijst.push(v);
    perCategorie.set(v.categorie, lijst);
  }

  const categorieNamen: Record<IndieningsvereisteCategorieType, string> = {
    algemeen: 'Algemene vereisten',
    bouwactiviteit: 'Bouwactiviteit',
    sloopactiviteit: 'Sloopactiviteit',
    monumentenactiviteit: 'Monumentenactiviteit',
    milieubelastend: 'Milieubelastende activiteit',
    natuuractiviteit: 'Natuuractiviteit',
    wateractiviteit: 'Wateractiviteit',
    afwijkactiviteit: 'Afwijkactiviteit (BOPA)'
  };

  const categorieKeys = Array.from(perCategorie.keys());
  for (const categorie of categorieKeys) {
    const docs = perCategorie.get(categorie) || [];
    lines.push(`## ${categorieNamen[categorie]}\\n`);
    for (const doc of docs) {
      const verplichtLabel = doc.verplicht ? '(VERPLICHT)' : '(aanbevolen)';
      lines.push(`- [ ] ${doc.naam} ${verplichtLabel}`);
      lines.push(`      Grondslag: ${doc.wettelijkeBasis}`);
    }
    lines.push('');
  }

  return lines.join('\\n');
}
