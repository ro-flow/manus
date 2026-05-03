// Controleert welke indieningsvereisten ontbreken op basis van activiteitstype.
// AI-respons wordt gecombineerd met deterministische regels voor het eindoordeel.

export interface VolledigheidsInput {
  activiteitType?: string | null;
  activiteitOmschrijving?: string | null;
  aanwezigeDokumenten?: string[];
}

export interface OntbrekendStuk {
  naam: string;
  toelichting: string;
  verplicht: boolean;
}

export interface VolledigheidsResultaat {
  volledig: boolean;
  ontbrekend: OntbrekendStuk[];
  aanwezig: string[];
  aiToelichting?: string;
}

// Minimale vereisten per activiteitstype (uit-breidbaar via kennisbank)
const VEREISTEN_PER_ACTIVITEIT: Record<string, OntbrekendStuk[]> = {
  bouwen: [
    { naam: 'Situatietekening', toelichting: 'Tekening van de situatie op schaal 1:500 of 1:1000', verplicht: true },
    { naam: 'Plattegronden', toelichting: 'Plattegronden op schaal 1:100 van alle bouwlagen', verplicht: true },
    { naam: 'Geveltekeningen', toelichting: 'Geveltekeningen op schaal 1:100', verplicht: true },
    { naam: 'Doorsneden', toelichting: 'Doorsneden op schaal 1:100', verplicht: true },
    { naam: 'Constructieberekening', toelichting: 'Statische berekening voor draagconstructie', verplicht: false },
  ],
  slopen: [
    { naam: 'Sloopveiligheidsplan', toelichting: 'Plan voor veilige uitvoering van de sloop', verplicht: true },
    { naam: 'Asbestinventarisatierapport', toelichting: 'Rapport van gecertificeerd asbestinventarisatiebedrijf', verplicht: true },
    { naam: 'Situatietekening', toelichting: 'Tekening met het te slopen gebouw', verplicht: true },
  ],
  kappen: [
    { naam: 'Situatietekening met bomen', toelichting: 'Tekening met locatie en soort boom', verplicht: true },
    { naam: 'Foto van de boom', toelichting: 'Recente foto van de te kappen boom', verplicht: false },
  ],
  uitweg: [
    { naam: 'Situatietekening', toelichting: 'Tekening met de gewenste uitweglocatie', verplicht: true },
    { naam: 'Foto van de huidige situatie', toelichting: 'Foto van de bestaande situatie', verplicht: false },
  ],
  default: [
    { naam: 'Motivering aanvraag', toelichting: 'Beschrijving van de activiteit en het doel', verplicht: true },
    { naam: 'Situatietekening', toelichting: 'Tekening van de locatie en de activiteit', verplicht: true },
  ],
};

export function checkVolledigheid(
  input: VolledigheidsInput,
  aiToelichting?: string
): VolledigheidsResultaat {
  const type = (input.activiteitType ?? 'default').toLowerCase();
  const vereisten = VEREISTEN_PER_ACTIVITEIT[type] ?? VEREISTEN_PER_ACTIVITEIT['default'];
  const aanwezig = input.aanwezigeDokumenten ?? [];

  const aanwezigLower = aanwezig.map((d) => d.toLowerCase());
  const ontbrekend = vereisten.filter(
    (v) => !aanwezigLower.some((a) => a.includes(v.naam.toLowerCase()))
  );

  const verplichtOntbreekt = ontbrekend.some((o) => o.verplicht);

  return {
    volledig: !verplichtOntbreekt,
    ontbrekend,
    aanwezig,
    aiToelichting,
  };
}
