/**
 * packages/core/src/completeness/checkCompleteness.ts
 *
 * Volledigheidscheck per perceel per activiteit.
 * Versie 4 — definitief voor MVP pilot.
 */

// ============================================================
// TYPES
// ============================================================

export type Activiteit =
  | 'bouwen'
  | 'slopen'
  | 'kappen'
  | 'milieu'
  | 'aanleggen'
  | 'uitweg'
  | 'bopa'
  | 'monument'
  | 'functiewijziging'
  | 'overig';

export type DocType =
  | 'situatietekening'
  | 'plattegrond'
  | 'geveltekening'
  | 'constructietekening'
  | 'berekening_oppervlakte'
  | 'asbestrapport'
  | 'sloopveiligheidsplan'
  | 'akoestisch_rapport'
  | 'ruimtelijke_onderbouwing'
  | 'redengevende_omschrijving'
  | 'fotorapportage'
  | 'motivering_kapverzoek'
  | 'boomgegevens'
  | 'milieubeschrijving'
  | 'emissierapport'
  | 'motivering_afwijking'
  | 'motivering_functiewijziging'
  | 'technische_beschrijving'
  | 'beschrijving_activiteit';

export interface IngediendDoc {
  type: DocType;
  bestandsnaam: string;
}

export interface PerceelInput {
  id: string;
  kadastraleAanduiding: string;
  postcode?: string;
  huisnummer?: string;
  huisletter?: string;
  activiteiten: Activiteit[];
  ingediendeDocs: IngediendDoc[];
  bouwjaar?: number | null;
  gebruiksdoel?: string[];
  oppervlakte?: number | null;
  // true = er staat al een gebouw (sloop/verbouw)
  // false = nieuwbouw op leeg perceel
  // null/undefined = onbekend — conservatief behandelen als true
  heeftBestaandGebouw?: boolean | null;
}

export type VereistType = 'altijd' | 'conditioneel' | 'aanbevolen';

interface Indieningsvereiste {
  type: DocType;
  naam: string;
  grondslag: string;
  vereistType: VereistType;
  conditie?: (perceel: PerceelInput) => boolean;
  conditieToelichting?: string;
}

export interface StukResultaat {
  type: DocType;
  naam: string;
  grondslag: string;
  aanwezig: boolean;
  vereistType: VereistType;
  conditieToelichting?: string;
}

export interface PerceelResultaat {
  perceelId: string;
  kadastraleAanduiding: string;
  activiteiten: Activiteit[];
  stukken: StukResultaat[];
  volledig: boolean;
  aantalVerplichtOntbrekend: number;
  aantalAanbevolenOntbrekend: number;
}

export interface CompletenessResultaat {
  volledig: boolean;
  aantalPercelen: number;
  aantalPerceelenVolledig: number;
  aantalPerceelenOnvolledig: number;
  aantalVerplichtOntbrekendTotaal: number;
  percelen: PerceelResultaat[];
  samenvatting: string;
}

// ============================================================
// ASBEST CONDITIE HELPER
// ============================================================

function asbestVanToepassing(perceel: PerceelInput): boolean {
  const { bouwjaar, heeftBestaandGebouw, activiteiten } = perceel;

  if (bouwjaar === null || bouwjaar === undefined) return false;
  if (bouwjaar >= 1994) return false;

  const alleenNieuwbouw =
    activiteiten.includes('bouwen') &&
    !activiteiten.includes('slopen') &&
    heeftBestaandGebouw === false;

  if (alleenNieuwbouw) return false;

  return true;
}

function asbestToelichting(perceel: PerceelInput): string {
  const jaar = perceel.bouwjaar;
  if (perceel.activiteiten.includes('slopen')) {
    return `Vereist omdat het bouwjaar (${jaar}) vóór 1994 ligt en er wordt gesloopt`;
  }
  return `Vereist omdat het bouwjaar (${jaar}) vóór 1994 ligt — bij verbouw of sloop is asbestinventarisatie verplicht`;
}

// ============================================================
// INDIENINGSVEREISTEN PER ACTIVITEIT
// ============================================================

const VEREISTEN: Record<Activiteit, Indieningsvereiste[]> = {
  bouwen: [
    { type: 'situatietekening',      naam: 'Situatietekening schaal 1:1000',            grondslag: 'artikel 7.6 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'plattegrond',           naam: 'Plattegronden en doorsneden schaal 1:100',  grondslag: 'artikel 7.7 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'geveltekening',         naam: 'Geveltekeningen schaal 1:100',              grondslag: 'artikel 7.7 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'constructietekening',   naam: 'Constructietekening',                       grondslag: 'artikel 7.8 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'berekening_oppervlakte',naam: 'Berekening oppervlakte en inhoud',          grondslag: 'artikel 7.9 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'asbestrapport',         naam: 'Asbestinventarisatierapport (SC-540)',      grondslag: 'artikel 7.2 Omgevingsregeling',  vereistType: 'conditioneel', conditie: asbestVanToepassing, conditieToelichting: '' },
  ],
  slopen: [
    { type: 'situatietekening',      naam: 'Situatietekening met slooplocatie',         grondslag: 'artikel 7.2 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'sloopveiligheidsplan',  naam: 'Sloopveiligheidsplan',                      grondslag: 'artikel 7.3 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'asbestrapport',         naam: 'Asbestinventarisatierapport (SC-540)',      grondslag: 'artikel 7.2 Omgevingsregeling',  vereistType: 'conditioneel', conditie: asbestVanToepassing, conditieToelichting: '' },
  ],
  kappen: [
    { type: 'situatietekening',      naam: 'Situatietekening met locatie boom/bomen',  grondslag: 'artikel 7.20 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'boomgegevens',          naam: 'Opgave boomsoort, stamomvang en hoogte',   grondslag: 'artikel 7.20 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'motivering_kapverzoek', naam: 'Motivering kapverzoek',                    grondslag: 'artikel 7.20 Omgevingsregeling', vereistType: 'altijd' },
  ],
  milieu: [
    { type: 'situatietekening',      naam: 'Situatietekening met inrichtingsgrenzen',  grondslag: 'artikel 7.14 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'milieubeschrijving',    naam: 'Beschrijving milieubelastende activiteit', grondslag: 'artikel 7.15 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'akoestisch_rapport',    naam: 'Akoestisch rapport',                       grondslag: 'artikel 7.18 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'emissierapport',        naam: 'Gegevens over emissies naar lucht en water',grondslag: 'artikel 7.16 Omgevingsregeling', vereistType: 'altijd' },
  ],
  aanleggen: [
    { type: 'situatietekening',      naam: 'Situatietekening schaal 1:1000',            grondslag: 'artikel 7.10 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'beschrijving_activiteit',naam: 'Beschrijving van de aanlegwerkzaamheden',  grondslag: 'artikel 7.10 Omgevingsregeling', vereistType: 'altijd' },
  ],
  uitweg: [
    { type: 'situatietekening',      naam: 'Situatietekening met locatie uitweg',       grondslag: 'artikel 7.11 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'technische_beschrijving',naam: 'Technische beschrijving uitweg',           grondslag: 'artikel 7.11 Omgevingsregeling', vereistType: 'altijd' },
  ],
  bopa: [
    { type: 'situatietekening',      naam: 'Situatietekening schaal 1:1000',            grondslag: 'artikel 7.6 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'ruimtelijke_onderbouwing',naam: 'Ruimtelijke onderbouwing',                grondslag: 'artikel 7.4 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'motivering_afwijking',  naam: 'Motivering afwijking omgevingsplan',        grondslag: 'artikel 16.55 Omgevingswet',     vereistType: 'altijd' },
  ],
  monument: [
    { type: 'redengevende_omschrijving',naam: 'Redengevende omschrijving monument',     grondslag: 'artikel 7.26 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'fotorapportage',         naam: 'Fotorapportage huidige staat',             grondslag: 'artikel 7.26 Omgevingsregeling', vereistType: 'altijd' },
    { type: 'beschrijving_activiteit',naam: 'Beschrijving van de voorgenomen wijziging',grondslag: 'artikel 7.27 Omgevingsregeling', vereistType: 'altijd' },
  ],
  functiewijziging: [
    { type: 'situatietekening',      naam: 'Situatietekening schaal 1:1000',            grondslag: 'artikel 7.6 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'plattegrond',           naam: 'Plattegronden nieuwe situatie',             grondslag: 'artikel 7.7 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'motivering_functiewijziging',naam: 'Motivering functiewijziging',          grondslag: 'artikel 7.4 Omgevingsregeling',  vereistType: 'altijd' },
  ],
  overig: [
    { type: 'situatietekening',      naam: 'Situatietekening',                          grondslag: 'artikel 7.6 Omgevingsregeling',  vereistType: 'altijd' },
    { type: 'beschrijving_activiteit',naam: 'Beschrijving van de activiteit',           grondslag: 'artikel 7.1 Omgevingsregeling',  vereistType: 'altijd' },
  ],
};

// ============================================================
// HOOFDFUNCTIE — synchroon, geen externe API calls
// ============================================================

export function checkCompleteness(percelen: PerceelInput[]): CompletenessResultaat {
  if (percelen.length === 0) {
    throw new Error('Geen percelen opgegeven');
  }

  const perceelResultaten: PerceelResultaat[] = [];
  let aantalVerplichtOntbrekendTotaal = 0;

  for (const perceel of percelen) {
    const vereistenMap = new Map<DocType, Indieningsvereiste>();

    for (const activiteit of perceel.activiteiten) {
      const lijst = VEREISTEN[activiteit];
      if (!lijst) {
        console.warn(`Onbekende activiteit '${activiteit}' op perceel ${perceel.kadastraleAanduiding} — valt terug op 'overig'`);
        for (const v of VEREISTEN.overig) {
          if (!vereistenMap.has(v.type)) vereistenMap.set(v.type, v);
        }
        continue;
      }
      for (const v of lijst) {
        if (!vereistenMap.has(v.type)) vereistenMap.set(v.type, v);
      }
    }

    const stukken: StukResultaat[] = [];

    for (const [, vereiste] of vereistenMap) {
      if (vereiste.vereistType === 'conditioneel' && vereiste.conditie) {
        if (!vereiste.conditie(perceel)) continue;
      }

      const aanwezig = perceel.ingediendeDocs.some((doc) => doc.type === vereiste.type);

      const toelichting =
        vereiste.type === 'asbestrapport' && !aanwezig
          ? asbestToelichting(perceel)
          : vereiste.conditieToelichting;

      stukken.push({
        type: vereiste.type,
        naam: vereiste.naam,
        grondslag: vereiste.grondslag,
        aanwezig,
        vereistType: vereiste.vereistType,
        ...(toelichting ? { conditieToelichting: toelichting } : {}),
      });

      if (!aanwezig && vereiste.vereistType !== 'aanbevolen') {
        aantalVerplichtOntbrekendTotaal++;
      }
    }

    const aantalVerplichtOntbrekend = stukken.filter(
      (s) => !s.aanwezig && s.vereistType !== 'aanbevolen'
    ).length;

    const aantalAanbevolenOntbrekend = stukken.filter(
      (s) => !s.aanwezig && s.vereistType === 'aanbevolen'
    ).length;

    perceelResultaten.push({
      perceelId: perceel.id,
      kadastraleAanduiding: perceel.kadastraleAanduiding,
      activiteiten: perceel.activiteiten,
      stukken,
      volledig: aantalVerplichtOntbrekend === 0,
      aantalVerplichtOntbrekend,
      aantalAanbevolenOntbrekend,
    });
  }

  const aantalPerceelenVolledig = perceelResultaten.filter((p) => p.volledig).length;
  const aantalPerceelenOnvolledig = perceelResultaten.filter((p) => !p.volledig).length;
  const volledig = aantalPerceelenOnvolledig === 0;

  const samenvatting = volledig
    ? `Alle ${percelen.length} percelen zijn volledig ingediend.`
    : `Van de ${percelen.length} percelen zijn ${aantalPerceelenVolledig} volledig en ${aantalPerceelenOnvolledig} onvolledig. In totaal ontbreken ${aantalVerplichtOntbrekendTotaal} verplichte stukken.`;

  return {
    volledig,
    aantalPercelen: percelen.length,
    aantalPerceelenVolledig,
    aantalPerceelenOnvolledig,
    aantalVerplichtOntbrekendTotaal,
    percelen: perceelResultaten,
    samenvatting,
  };
}

// ============================================================
// BRIEF DATA BUILDER — alleen ontbrekende stukken naar Groq
// ============================================================

export function buildBriefData(resultaat: CompletenessResultaat): object {
  return {
    volledig: resultaat.volledig,
    samenvatting: resultaat.samenvatting,
    aantalPercelen: resultaat.aantalPercelen,
    percelen: resultaat.percelen.map((p) => ({
      kadastraleAanduiding: p.kadastraleAanduiding,
      activiteiten: p.activiteiten,
      volledig: p.volledig,
      aantalOntbrekend: p.aantalVerplichtOntbrekend,
      ontbrekendeStukken: p.stukken
        .filter((s) => !s.aanwezig && s.vereistType !== 'aanbevolen')
        .map((s) => ({
          naam: s.naam,
          grondslag: s.grondslag,
          ...(s.conditieToelichting ? { toelichting: s.conditieToelichting } : {}),
        })),
    })),
  };
}
