/**
 * AERIUS Service - Stikstofberekening vereisten bepaling
 * 
 * Bepaalt wanneer een AERIUS-berekening verplicht is op basis van:
 * - Activiteittype
 * - Afstand tot Natura 2000 gebied
 * - Omvang van het project
 */

// Activiteiten die altijd AERIUS vereisen
const AERIUS_ALTIJD_VEREIST = [
  'nieuwbouw_bedrijf',
  'uitbreiding_veehouderij',
  'nieuwbouw_industrie',
  'nieuwbouw_logistiek',
  'biomassacentrale',
  'datacenter'
];

// Activiteiten die AERIUS vereisen bij significante omvang
const AERIUS_BIJ_OMVANG = [
  'nieuwbouw_woning',
  'nieuwbouw_woningen',
  'uitbreiding_woning',
  'nieuwbouw_kantoor',
  'nieuwbouw_retail'
];

// Activiteiten die geen AERIUS vereisen
const AERIUS_NIET_VEREIST = [
  'dakkapel',
  'dakopbouw',
  'kozijn_vervangen',
  'interne_verbouwing',
  'functiewijziging_beperkt',
  'zonnepanelen',
  'warmtepomp'
];

export interface AeriusVereiste {
  vereist: boolean;
  reden: string;
  toelichting: string;
  afstandNatura2000?: number;
  dichtstbijzijndeGebied?: string;
  bouwfase: boolean;
  gebruiksfase: boolean;
}

/**
 * Bepaal of AERIUS-berekening vereist is
 */
export function bepaalAeriusVereiste(
  activiteiten: string[],
  afstandNatura2000Km?: number,
  natura2000Gebied?: string,
  aantalWoningen?: number,
  oppervlakteM2?: number
): AeriusVereiste {
  const result: AeriusVereiste = {
    vereist: false,
    reden: '',
    toelichting: '',
    afstandNatura2000: afstandNatura2000Km,
    dichtstbijzijndeGebied: natura2000Gebied,
    bouwfase: false,
    gebruiksfase: false
  };

  // Check activiteiten
  const activiteitenLower = activiteiten.map(a => a.toLowerCase().replace(/[\\s-]/g, '_'));
  
  // Altijd AERIUS vereist
  for (const act of AERIUS_ALTIJD_VEREIST) {
    if (activiteitenLower.some(a => a.includes(act))) {
      result.vereist = true;
      result.reden = `Activiteit '${act}' vereist altijd AERIUS-berekening`;
      result.bouwfase = true;
      result.gebruiksfase = true;
      break;
    }
  }

  // Bij omvang check
  if (!result.vereist) {
    for (const act of AERIUS_BIJ_OMVANG) {
      if (activiteitenLower.some(a => a.includes(act))) {
        // Check omvang criteria
        if (aantalWoningen && aantalWoningen >= 5) {
          result.vereist = true;
          result.reden = `Nieuwbouw van ${aantalWoningen} woningen vereist AERIUS-berekening`;
          result.bouwfase = true;
          result.gebruiksfase = aantalWoningen >= 10;
        } else if (oppervlakteM2 && oppervlakteM2 >= 500) {
          result.vereist = true;
          result.reden = `Project van ${oppervlakteM2}m² vereist AERIUS-berekening`;
          result.bouwfase = true;
          result.gebruiksfase = oppervlakteM2 >= 2000;
        } else if (afstandNatura2000Km !== undefined && afstandNatura2000Km < 3) {
          // Nabij Natura 2000: altijd berekening maken
          result.vereist = true;
          result.reden = `Locatie op ${afstandNatura2000Km.toFixed(1)}km van Natura 2000 gebied`;
          result.bouwfase = true;
          result.gebruiksfase = false;
        }
        break;
      }
    }
  }

  // Niet vereist check
  if (!result.vereist) {
    for (const act of AERIUS_NIET_VEREIST) {
      if (activiteitenLower.some(a => a.includes(act))) {
        result.reden = 'Activiteit heeft geen significante stikstofemissie';
        break;
      }
    }
  }

  // Afstand-gebaseerde waarschuwing
  if (afstandNatura2000Km !== undefined) {
    if (afstandNatura2000Km < 1) {
      result.vereist = true;
      result.reden = `Locatie op ${(afstandNatura2000Km * 1000).toFixed(0)}m van Natura 2000 gebied '${natura2000Gebied || 'onbekend'}'`;
      result.toelichting = 'Bij deze korte afstand is een AERIUS-berekening vrijwel altijd vereist, ook voor kleinere projecten.';
      result.bouwfase = true;
    } else if (afstandNatura2000Km < 5 && !result.vereist) {
      result.toelichting = `Let op: locatie ligt op ${afstandNatura2000Km.toFixed(1)}km van Natura 2000 gebied '${natura2000Gebied || 'onbekend'}'. Overweeg AERIUS-berekening.`;
    }
  }

  // Genereer toelichting
  if (result.vereist && !result.toelichting) {
    const fases: string[] = [];
    if (result.bouwfase) fases.push('bouwfase');
    if (result.gebruiksfase) fases.push('gebruiksfase');
    result.toelichting = `AERIUS-berekening vereist voor: ${fases.join(' en ')}. ` +
      `Bereken stikstofemissie via aerius.nl/nl/aerius-calculator. ` +
      `Drempelwaarde: 0,00 mol/ha/jaar (geen vrijstelling).`;
  }

  return result;
}

/**
 * Format AERIUS vereiste voor AI context
 */
export function formatAeriusVoorAI(vereiste: AeriusVereiste): string {
  if (!vereiste.vereist && !vereiste.toelichting) {
    return '';
  }

  const lines: string[] = [];
  
  if (vereiste.vereist) {
    lines.push('=== STIKSTOF (AERIUS) ===\\n');
    lines.push('⚠️ AERIUS-BEREKENING VEREIST');
    lines.push(`Reden: ${vereiste.reden}`);
    lines.push('');
    
    if (vereiste.afstandNatura2000 !== undefined) {
      lines.push(`Afstand tot Natura 2000: ${vereiste.afstandNatura2000.toFixed(1)} km`);
      if (vereiste.dichtstbijzijndeGebied) {
        lines.push(`Dichtstbijzijnde gebied: ${vereiste.dichtstbijzijndeGebied}`);
      }
      lines.push('');
    }
    
    lines.push('Benodigde berekening:');
    if (vereiste.bouwfase) {
      lines.push('- Bouwfase: emissie van bouwverkeer, materieel en aggregaten');
    }
    if (vereiste.gebruiksfase) {
      lines.push('- Gebruiksfase: emissie van verkeersgeneratie en eventuele installaties');
    }
    lines.push('');
    
    lines.push('Procedure:');
    lines.push('1. Maak AERIUS-berekening via aerius.nl/nl/aerius-calculator');
    lines.push('2. Bij depositie >0,00 mol/ha/jaar: vergunningplicht Wnb');
    lines.push('3. Mogelijke oplossingen: intern/extern salderen, ADC-toets, ecologische beoordeling');
    lines.push('');
  } else if (vereiste.toelichting) {
    lines.push('=== STIKSTOF (AERIUS) ===\\n');
    lines.push('ℹ️ AANDACHTSPUNT');
    lines.push(vereiste.toelichting);
    lines.push('');
  }

  return lines.join('\\n');
}

/**
 * Detecteer activiteiten uit aanvraagtekst
 */
export function detecteerActiviteitenVoorAerius(tekst: string): string[] {
  const activiteiten: string[] = [];
  const tekstLower = tekst.toLowerCase();
  
  const patterns: [RegExp, string][] = [
    [/nieuwbouw.*woning/i, 'nieuwbouw_woning'],
    [/(\\d+)\\s*woning/i, 'nieuwbouw_woningen'],
    [/uitbrei.*woning/i, 'uitbreiding_woning'],
    [/nieuwbouw.*bedrijf/i, 'nieuwbouw_bedrijf'],
    [/nieuwbouw.*kantoor/i, 'nieuwbouw_kantoor'],
    [/nieuwbouw.*logist/i, 'nieuwbouw_logistiek'],
    [/veehouderij|stal|schuur.*dier/i, 'uitbreiding_veehouderij'],
    [/industri/i, 'nieuwbouw_industrie'],
    [/datacenter/i, 'datacenter'],
    [/dakkapel/i, 'dakkapel'],
    [/dakopbouw/i, 'dakopbouw'],
    [/zonnepan/i, 'zonnepanelen'],
    [/warmtepomp/i, 'warmtepomp'],
    [/functiewijziging/i, 'functiewijziging_beperkt'],
    [/intern.*verbouw/i, 'interne_verbouwing']
  ];
  
  for (const [pattern, activiteit] of patterns) {
    if (pattern.test(tekstLower)) {
      activiteiten.push(activiteit);
    }
  }
  
  return activiteiten;
}
