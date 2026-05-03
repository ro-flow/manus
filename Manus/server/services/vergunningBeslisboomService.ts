/**
 * Vergunning Beslisboom Service
 * 
 * Implementeert de juridisch correcte beslisboom voor het bepalen van
 * vergunningplicht met correcte afweging van beschermingsregimes.
 * 
 * Kernregel: Een uitkomst "vergunningvrij" op basis van het Bbl of het omgevingsplan
 * mag uitsluitend worden overschreven indien een expliciete, normstellende bepaling
 * bestaat die deze vergunningvrijstelling voor de betreffende activiteit en locatie uitsluit.
 */

// Types voor de beslisboom
export interface BeslisboomInput {
  activiteit: ActiviteitType;
  locatie: {
    coordinates: [number, number];
    gemeente: string;
  };
  beschermingsregimes: BeschermingsRegime[];
  dsoConclusieBasis?: DSOConclusieBasis;
  omgevingsplanRegels?: OmgevingsplanRegel[];
}

export type ActiviteitType = 
  | 'bouwen'
  | 'verbouwen'
  | 'slopen'
  | 'gebruikswijziging'
  | 'aanleggen'
  | 'kappen'
  | 'uitweg'
  | 'reclame'
  | 'monument_wijzigen';

export interface BeschermingsRegime {
  type: BeschermingsRegimeType;
  naam: string;
  bron: string;
  heeftExplicieteUitzondering: boolean;
  uitzonderingArtikel?: string;
  uitzonderingTekst?: string;
}

export type BeschermingsRegimeType =
  | 'beschermd_stadsgezicht'
  | 'beschermd_dorpsgezicht'
  | 'rijksmonument'
  | 'gemeentelijk_monument'
  | 'provinciaal_monument'
  | 'archeologisch_monument'
  | 'waterkering'
  | 'natura2000'
  | 'nnn_gebied'
  | 'grondwaterbeschermingsgebied'
  | 'geluidzone'
  | 'veiligheidszone'
  | 'milieuzone';

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

export interface BeslisboomResultaat {
  // Eindconclusie
  conclusie: 'vergunningplichtig' | 'meldingsplichtig' | 'vergunningvrij';
  
  // Motivering
  motivering: string;
  juridischeGrondslag: string;
  
  // Override informatie
  isOverride: boolean;
  overrideReden?: string;
  overrideBron?: string;
  
  // Beschermingsregimes
  beschermingsregimesContext: BeschermingsRegime[]; // Alleen context, geen override
  beschermingsregimesDoorslaggevend: BeschermingsRegime[]; // Wel override
  
  // Stappen doorlopen
  stappen: BeslisboomStap[];
  
  // Rapportage tekst
  rapportageTekst: string;
}

export interface BeslisboomStap {
  stap: number;
  titel: string;
  vraag: string;
  antwoord: string;
  toelichting: string;
}

/**
 * Voert de beslisboom uit voor het bepalen van vergunningplicht
 */
export function voerBeslisboomUit(input: BeslisboomInput): BeslisboomResultaat {
  const stappen: BeslisboomStap[] = [];
  
  // Stap 1: Basisvraag - Is de activiteit vergunningvrij volgens Bbl/Bal/Omgevingsplan?
  const stap1 = bepaalBasisVergunningvrijheid(input);
  stappen.push(stap1.stap);
  
  if (!stap1.isVergunningvrij) {
    // Activiteit is sowieso vergunningplichtig, geen verdere analyse nodig
    return {
      conclusie: 'vergunningplichtig',
      motivering: stap1.motivering,
      juridischeGrondslag: stap1.juridischeGrondslag,
      isOverride: false,
      beschermingsregimesContext: input.beschermingsregimes,
      beschermingsregimesDoorslaggevend: [],
      stappen,
      rapportageTekst: genereerRapportageTekst('vergunningplichtig', stap1.motivering, false)
    };
  }
  
  // Stap 2: Zoek naar expliciete uitzonderingen op vergunningvrijheid
  const stap2 = zoekExplicieteUitzonderingen(input);
  stappen.push(stap2.stap);
  
  if (stap2.heeftExplicieteUitzondering) {
    // Er is een expliciete uitzondering gevonden - override is toegestaan
    return {
      conclusie: 'vergunningplichtig',
      motivering: stap2.motivering,
      juridischeGrondslag: stap2.juridischeGrondslag,
      isOverride: true,
      overrideReden: stap2.uitzonderingReden,
      overrideBron: stap2.uitzonderingBron,
      beschermingsregimesContext: stap2.regimesContext,
      beschermingsregimesDoorslaggevend: stap2.regimesDoorslaggevend,
      stappen,
      rapportageTekst: genereerRapportageTekst('vergunningplichtig', stap2.motivering, true, stap2.uitzonderingBron)
    };
  }
  
  // Stap 3: Bepaal rol van beschermingsregimes (context vs. norm)
  const stap3 = bepaalRolBeschermingsregimes(input);
  stappen.push(stap3.stap);
  
  // Stap 4: Genereer rapportage
  const stap4: BeslisboomStap = {
    stap: 4,
    titel: 'Rapportage',
    vraag: 'Hoe moet de conclusie worden gerapporteerd?',
    antwoord: 'Vergunningvrij met context',
    toelichting: 'Beschermingsregimes worden benoemd als context, maar wijzigen de conclusie niet.'
  };
  stappen.push(stap4);
  
  return {
    conclusie: 'vergunningvrij',
    motivering: stap1.motivering,
    juridischeGrondslag: stap1.juridischeGrondslag,
    isOverride: false,
    beschermingsregimesContext: input.beschermingsregimes,
    beschermingsregimesDoorslaggevend: [],
    stappen,
    rapportageTekst: genereerRapportageTekst('vergunningvrij', stap1.motivering, false, undefined, input.beschermingsregimes)
  };
}

/**
 * Stap 1: Bepaal of de activiteit vergunningvrij is volgens Bbl/Bal/Omgevingsplan
 */
function bepaalBasisVergunningvrijheid(input: BeslisboomInput): {
  isVergunningvrij: boolean;
  motivering: string;
  juridischeGrondslag: string;
  stap: BeslisboomStap;
} {
  const dso = input.dsoConclusieBasis;
  
  // Als DSO conclusie beschikbaar is, gebruik die als primaire bron
  if (dso) {
    const isVergunningvrij = dso.conclusie === 'vergunningvrij';
    const motivering = dso.toelichting || `Op basis van ${dso.bron}${dso.artikel ? ` artikel ${dso.artikel}` : ''}`;
    const juridischeGrondslag = `${dso.bron}${dso.artikel ? ` art. ${dso.artikel}` : ''}`;
    
    return {
      isVergunningvrij,
      motivering,
      juridischeGrondslag,
      stap: {
        stap: 1,
        titel: 'Basisvraag vergunningvrijheid',
        vraag: 'Is de activiteit vergunningvrij volgens Bbl, Bal of omgevingsplan?',
        antwoord: isVergunningvrij ? 'Ja, vergunningvrij' : 'Nee, vergunningplichtig',
        toelichting: motivering
      }
    };
  }
  
  // Fallback: bepaal op basis van activiteittype (conservatief)
  const activiteitInfo = getActiviteitVergunningvrijheid(input.activiteit);
  
  return {
    isVergunningvrij: activiteitInfo.kanVergunningvrij,
    motivering: activiteitInfo.motivering,
    juridischeGrondslag: activiteitInfo.juridischeGrondslag,
    stap: {
      stap: 1,
      titel: 'Basisvraag vergunningvrijheid',
      vraag: 'Is de activiteit vergunningvrij volgens Bbl, Bal of omgevingsplan?',
      antwoord: activiteitInfo.kanVergunningvrij ? 'Mogelijk vergunningvrij' : 'Vergunningplichtig',
      toelichting: activiteitInfo.motivering
    }
  };
}

/**
 * Stap 2: Zoek naar expliciete uitzonderingen op vergunningvrijheid
 */
function zoekExplicieteUitzonderingen(input: BeslisboomInput): {
  heeftExplicieteUitzondering: boolean;
  motivering: string;
  juridischeGrondslag: string;
  uitzonderingReden?: string;
  uitzonderingBron?: string;
  regimesContext: BeschermingsRegime[];
  regimesDoorslaggevend: BeschermingsRegime[];
  stap: BeslisboomStap;
} {
  const regimesContext: BeschermingsRegime[] = [];
  const regimesDoorslaggevend: BeschermingsRegime[] = [];
  
  // Controleer elk beschermingsregime op expliciete uitzonderingen
  for (const regime of input.beschermingsregimes) {
    if (regime.heeftExplicieteUitzondering && regime.uitzonderingArtikel) {
      // Dit regime heeft een expliciete uitzondering - doorslaggevend
      regimesDoorslaggevend.push(regime);
    } else {
      // Alleen context, geen uitzondering
      regimesContext.push(regime);
    }
  }
  
  // Controleer ook omgevingsplanregels op expliciete uitzonderingen
  const explicieteRegelUitzonderingen = (input.omgevingsplanRegels || [])
    .filter(regel => regel.isExplicieteUitzondering && regel.vanToepassing);
  
  if (regimesDoorslaggevend.length > 0) {
    const eersteDoorslaggevend = regimesDoorslaggevend[0];
    return {
      heeftExplicieteUitzondering: true,
      motivering: `Hoewel de activiteit normaal vergunningvrij is, vervalt deze vergunningvrijstelling vanwege ${eersteDoorslaggevend.uitzonderingArtikel}, waarin is bepaald dat ${eersteDoorslaggevend.uitzonderingTekst || `in ${eersteDoorslaggevend.naam} een vergunning is vereist`}.`,
      juridischeGrondslag: eersteDoorslaggevend.uitzonderingArtikel || eersteDoorslaggevend.bron,
      uitzonderingReden: eersteDoorslaggevend.uitzonderingTekst,
      uitzonderingBron: eersteDoorslaggevend.uitzonderingArtikel,
      regimesContext,
      regimesDoorslaggevend,
      stap: {
        stap: 2,
        titel: 'Expliciete uitzonderingen',
        vraag: 'Bestaat er een expliciete uitzondering op de vergunningvrijstelling?',
        antwoord: 'Ja, expliciete uitzondering gevonden',
        toelichting: `${eersteDoorslaggevend.naam}: ${eersteDoorslaggevend.uitzonderingArtikel}`
      }
    };
  }
  
  if (explicieteRegelUitzonderingen.length > 0) {
    const eersteRegel = explicieteRegelUitzonderingen[0];
    return {
      heeftExplicieteUitzondering: true,
      motivering: `Hoewel de activiteit normaal vergunningvrij is, vervalt deze vergunningvrijstelling vanwege ${eersteRegel.artikel} van het omgevingsplan.`,
      juridischeGrondslag: `Omgevingsplan ${eersteRegel.artikel}`,
      uitzonderingReden: eersteRegel.tekst,
      uitzonderingBron: eersteRegel.artikel,
      regimesContext,
      regimesDoorslaggevend: [],
      stap: {
        stap: 2,
        titel: 'Expliciete uitzonderingen',
        vraag: 'Bestaat er een expliciete uitzondering op de vergunningvrijstelling?',
        antwoord: 'Ja, expliciete uitzondering in omgevingsplan',
        toelichting: `${eersteRegel.artikel}: ${eersteRegel.tekst}`
      }
    };
  }
  
  return {
    heeftExplicieteUitzondering: false,
    motivering: 'Geen expliciete uitzonderingen gevonden op de vergunningvrijstelling.',
    juridischeGrondslag: '',
    regimesContext: input.beschermingsregimes,
    regimesDoorslaggevend: [],
    stap: {
      stap: 2,
      titel: 'Expliciete uitzonderingen',
      vraag: 'Bestaat er een expliciete uitzondering op de vergunningvrijstelling?',
      antwoord: 'Nee, geen expliciete uitzondering',
      toelichting: 'De aanwezige beschermingsregimes bevatten geen expliciete bepaling die de vergunningvrijstelling uitsluit.'
    }
  };
}

/**
 * Stap 3: Bepaal de rol van beschermingsregimes (context vs. doorslaggevend)
 */
function bepaalRolBeschermingsregimes(input: BeslisboomInput): {
  stap: BeslisboomStap;
} {
  const regimesMetUitzondering = input.beschermingsregimes.filter(r => r.heeftExplicieteUitzondering);
  const regimesZonderUitzondering = input.beschermingsregimes.filter(r => !r.heeftExplicieteUitzondering);
  
  let toelichting = '';
  
  if (regimesZonderUitzondering.length > 0) {
    const namen = regimesZonderUitzondering.map(r => r.naam).join(', ');
    toelichting = `De volgende beschermingsregimes zijn aanwezig maar hebben geen expliciete uitzondering: ${namen}. Deze worden als context benoemd in het rapport.`;
  }
  
  if (regimesMetUitzondering.length > 0) {
    const namen = regimesMetUitzondering.map(r => r.naam).join(', ');
    toelichting += ` De volgende regimes zijn doorslaggevend: ${namen}.`;
  }
  
  if (!toelichting) {
    toelichting = 'Geen beschermingsregimes van toepassing.';
  }
  
  return {
    stap: {
      stap: 3,
      titel: 'Rol beschermingsregimes',
      vraag: 'Zijn de beschermingsregimes context of doorslaggevend?',
      antwoord: regimesMetUitzondering.length > 0 ? 'Doorslaggevend' : 'Alleen context',
      toelichting
    }
  };
}

/**
 * Genereer de rapportagetekst voor het rapport
 */
function genereerRapportageTekst(
  conclusie: 'vergunningplichtig' | 'meldingsplichtig' | 'vergunningvrij',
  motivering: string,
  isOverride: boolean,
  overrideBron?: string,
  contextRegimes?: BeschermingsRegime[]
): string {
  if (conclusie === 'vergunningvrij' && contextRegimes && contextRegimes.length > 0) {
    // Situatie 1: Vergunningvrij met beschermingsregimes als context
    const regimeNamen = contextRegimes.map(r => r.naam).join(', ');
    return `De activiteit is vergunningvrij op grond van ${motivering}. De locatie ligt binnen ${regimeNamen}, maar voor deze activiteit geldt geen uitzondering op de vergunningvrijstelling.`;
  }
  
  if (conclusie === 'vergunningplichtig' && isOverride && overrideBron) {
    // Situatie 2: Vergunningplichtig door expliciete uitzondering
    return `Hoewel de activiteit normaal vergunningvrij zou zijn, vervalt deze vergunningvrijstelling vanwege ${overrideBron}. ${motivering}`;
  }
  
  if (conclusie === 'vergunningplichtig') {
    // Standaard vergunningplichtig
    return `De activiteit is vergunningplichtig. ${motivering}`;
  }
  
  if (conclusie === 'meldingsplichtig') {
    return `De activiteit is meldingsplichtig. ${motivering}`;
  }
  
  // Standaard vergunningvrij
  return `De activiteit is vergunningvrij. ${motivering}`;
}

/**
 * Hulpfunctie: bepaal basis vergunningvrijheid per activiteittype
 */
function getActiviteitVergunningvrijheid(activiteit: ActiviteitType): {
  kanVergunningvrij: boolean;
  motivering: string;
  juridischeGrondslag: string;
} {
  const activiteitInfo: Record<ActiviteitType, { kanVergunningvrij: boolean; motivering: string; juridischeGrondslag: string }> = {
    bouwen: {
      kanVergunningvrij: true,
      motivering: 'Bouwactiviteiten kunnen vergunningvrij zijn onder voorwaarden van het Bbl (bijv. bijbehorend bouwwerk ≤30m², hoogte ≤5m)',
      juridischeGrondslag: 'Bbl art. 2.27-2.29'
    },
    verbouwen: {
      kanVergunningvrij: true,
      motivering: 'Interne verbouwingen zijn vaak vergunningvrij mits de draagconstructie niet wordt gewijzigd',
      juridischeGrondslag: 'Bbl art. 2.27'
    },
    slopen: {
      kanVergunningvrij: true,
      motivering: 'Slopen is in principe vergunningvrij, tenzij in beschermd stadsgezicht of bij monumenten',
      juridischeGrondslag: 'Bbl art. 7.10'
    },
    gebruikswijziging: {
      kanVergunningvrij: false,
      motivering: 'Gebruikswijziging vereist toetsing aan het omgevingsplan',
      juridischeGrondslag: 'Omgevingswet art. 5.1 lid 1 sub a'
    },
    aanleggen: {
      kanVergunningvrij: false,
      motivering: 'Aanlegactiviteiten zijn afhankelijk van het omgevingsplan',
      juridischeGrondslag: 'Omgevingsplan'
    },
    kappen: {
      kanVergunningvrij: false,
      motivering: 'Kappen is afhankelijk van de gemeentelijke kapverordening/omgevingsplan',
      juridischeGrondslag: 'Omgevingsplan/APV'
    },
    uitweg: {
      kanVergunningvrij: false,
      motivering: 'Uitwegvergunning is afhankelijk van het omgevingsplan',
      juridischeGrondslag: 'Omgevingsplan'
    },
    reclame: {
      kanVergunningvrij: false,
      motivering: 'Reclame is afhankelijk van het omgevingsplan',
      juridischeGrondslag: 'Omgevingsplan'
    },
    monument_wijzigen: {
      kanVergunningvrij: false,
      motivering: 'Wijzigen van een monument is altijd vergunningplichtig',
      juridischeGrondslag: 'Omgevingswet art. 5.1 lid 1 sub b'
    }
  };
  
  return activiteitInfo[activiteit] || {
    kanVergunningvrij: false,
    motivering: 'Vergunningplicht moet worden getoetst',
    juridischeGrondslag: 'Omgevingswet'
  };
}

/**
 * Combineer DSO conclusie met AI-analyse volgens de beslisboom
 */
export function combineerConclusies(
  dsoConclusieBasis: DSOConclusieBasis | null,
  aiAnalyse: {
    beschermingsregimes: BeschermingsRegime[];
    omgevingsplanRegels?: OmgevingsplanRegel[];
  },
  activiteit: ActiviteitType,
  locatie: { coordinates: [number, number]; gemeente: string }
): BeslisboomResultaat {
  const input: BeslisboomInput = {
    activiteit,
    locatie,
    beschermingsregimes: aiAnalyse.beschermingsregimes,
    dsoConclusieBasis: dsoConclusieBasis || undefined,
    omgevingsplanRegels: aiAnalyse.omgevingsplanRegels
  };
  
  return voerBeslisboomUit(input);
}

/**
 * Valideer of een override juridisch is toegestaan
 * 
 * VERBODEN overrides (return false):
 * - Alleen de aanwezigheid van een beschermd stadsgezicht
 * - Beleidsdocumenten zonder normstelling
 * - Algemene beschermingsdoelen
 * - "Strengere uitkomst is veiliger"
 * 
 * TOEGESTANE overrides (return true):
 * - Een planregel, AMvB of wettelijk voorschrift dat expliciet bepaalt
 *   dat de activiteit hier niet vergunningvrij is
 */
export function isOverrideToegestaan(
  regime: BeschermingsRegime,
  activiteit: ActiviteitType
): { toegestaan: boolean; reden: string } {
  // Verboden: alleen aanwezigheid van regime zonder expliciete uitzondering
  if (!regime.heeftExplicieteUitzondering) {
    return {
      toegestaan: false,
      reden: `De aanwezigheid van ${regime.naam} alleen is onvoldoende voor een override. Er moet een expliciete normstellende bepaling zijn.`
    };
  }
  
  // Verboden: geen artikelverwijzing
  if (!regime.uitzonderingArtikel) {
    return {
      toegestaan: false,
      reden: 'Override vereist een specifieke artikelverwijzing naar de normstellende bepaling.'
    };
  }
  
  // Toegestaan: expliciete uitzondering met artikelverwijzing
  return {
    toegestaan: true,
    reden: `Override toegestaan op basis van ${regime.uitzonderingArtikel}: ${regime.uitzonderingTekst || 'expliciete uitzondering op vergunningvrijstelling'}`
  };
}

/**
 * Format de beslisboom resultaten voor AI context
 */
export function formatBeslisboomVoorAI(resultaat: BeslisboomResultaat): string {
  let output = '## Vergunning Beslisboom Analyse\n\n';
  
  output += `### Conclusie: ${resultaat.conclusie.toUpperCase()}\n`;
  output += `${resultaat.rapportageTekst}\n\n`;
  
  output += `**Juridische grondslag:** ${resultaat.juridischeGrondslag}\n\n`;
  
  if (resultaat.isOverride) {
    output += `**Override toegepast:** Ja\n`;
    output += `**Override reden:** ${resultaat.overrideReden}\n`;
    output += `**Override bron:** ${resultaat.overrideBron}\n\n`;
  }
  
  output += '### Doorlopen stappen\n';
  for (const stap of resultaat.stappen) {
    output += `\n**Stap ${stap.stap}: ${stap.titel}**\n`;
    output += `- Vraag: ${stap.vraag}\n`;
    output += `- Antwoord: ${stap.antwoord}\n`;
    output += `- Toelichting: ${stap.toelichting}\n`;
  }
  
  if (resultaat.beschermingsregimesContext.length > 0) {
    output += '\n### Beschermingsregimes (context)\n';
    output += 'Deze regimes zijn aanwezig maar wijzigen de conclusie niet:\n';
    for (const regime of resultaat.beschermingsregimesContext) {
      output += `- ${regime.naam} (${regime.bron})\n`;
    }
  }
  
  if (resultaat.beschermingsregimesDoorslaggevend.length > 0) {
    output += '\n### Beschermingsregimes (doorslaggevend)\n';
    output += 'Deze regimes hebben een expliciete uitzondering en zijn doorslaggevend:\n';
    for (const regime of resultaat.beschermingsregimesDoorslaggevend) {
      output += `- ${regime.naam}: ${regime.uitzonderingArtikel} - ${regime.uitzonderingTekst}\n`;
    }
  }
  
  return output;
}
