// Prompt-templates voor AI-gegenereerde brieven.
// AI gebruikt ALTIJD placeholders — nooit echte NAW-gegevens.
// Backend vult placeholders in via restoreTemplateFields na ontvangst van AI.

export interface OntvangstbevestigingContext {
  gemeente: string;
  activiteitType?: string | null;
  activiteitOmschrijving?: string | null;
  procedureType?: string;
  doorlooptijd?: string;
}

export function buildOntvangstbevestigingPrompt(ctx: OntvangstbevestigingContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `Je bent een gemeentelijk behandelaar voor omgevingsvergunningen in ${ctx.gemeente}.
Schrijf een formele ontvangstbevestiging in het Nederlands.

VERPLICHTE REGELS:
- Gebruik altijd de placeholder [AANVRAGER] voor de naam van de aanvrager.
- Gebruik altijd de placeholder [ADRES_VERWIJDERD] voor het adres van de activiteit.
- Noem NOOIT een echte naam, e-mailadres, telefoonnummer of woonadres.
- De brief moet professioneel, duidelijk en begrijpelijk zijn.
- Sluit af met 'Met vriendelijke groet, Gemeente ${ctx.gemeente}'.`;

  const userPrompt = `Schrijf een ontvangstbevestiging voor een aanvraag met de volgende gegevens:
- Activiteit: ${ctx.activiteitType ?? 'Niet opgegeven'}
- Omschrijving: ${ctx.activiteitOmschrijving ?? 'Niet opgegeven'}
- Procedure: ${ctx.procedureType ?? 'Regulier'}
- Doorlooptijd: ${ctx.doorlooptijd ?? 'Maximaal 8 weken'}

De brief is gericht aan [AANVRAGER] voor het adres [ADRES_VERWIJDERD].`;

  return { systemPrompt, userPrompt };
}

export function buildVolledigheidsCheckPrompt(ctx: {
  activiteitType?: string | null;
  activiteitOmschrijving?: string | null;
  gemeente: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Je bent een expert in omgevingsvergunningen en de Wet ruimtelijke ordening.
Controleer welke documenten en gegevens ontbreken voor een volledige aanvraag.
Geef een gestructureerd overzicht van ontbrekende stukken.
Noem NOOIT namen, adressen of andere persoonsgegevens.`;

  const userPrompt = `Activiteitstype: ${ctx.activiteitType ?? 'onbekend'}
Omschrijving: ${ctx.activiteitOmschrijving ?? 'geen omschrijving'}
Gemeente: ${ctx.gemeente}

Welke documenten zijn verplicht en welke ontbreken mogelijk voor deze aanvraag?`;

  return { systemPrompt, userPrompt };
}
