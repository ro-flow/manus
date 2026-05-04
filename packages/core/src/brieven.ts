// Prompt-templates voor AI-gegenereerde ontvangstbevestigingen.
// AI gebruikt ALTIJD placeholders — nooit echte NAW-gegevens.
// Backend vult placeholders in via restoreTemplateFields na ontvangst van AI.

// ── Termijnberekeningen ──────────────────────────────────────────────────────

function datumNl(datum: Date): string {
  return datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addWeken(datum: Date, weken: number): Date {
  return new Date(datum.getTime() + weken * 7 * 24 * 60 * 60 * 1000);
}

export interface BriefTermijnen {
  ontvangstdatum: string;
  beslistermijnDatum: string;
  aanvuldeadlineDatum: string | null;
}

export function berekenTermijnen(
  ontvangstdatum: Date,
  procedureType: string,
  volledig: boolean
): BriefTermijnen {
  const weken = procedureType === 'uitgebreid' ? 26 : 8;
  return {
    ontvangstdatum: datumNl(ontvangstdatum),
    beslistermijnDatum: datumNl(addWeken(ontvangstdatum, weken)),
    aanvuldeadlineDatum: volledig ? null : datumNl(addWeken(ontvangstdatum, 4)),
  };
}

// ── Context interface ────────────────────────────────────────────────────────

export interface OntvangstbevestigingContext {
  gemeente: string;
  zaaknummer: string;
  ontvangstdatum: string;
  activiteitType?: string | null;
  activiteitOmschrijving?: string | null;
  gebiedstype?: string | null;
  aanvraagType: 'formeel' | 'concept';
  procedureType: string;
  doorlooptijd: string;
  volledig: boolean;
  beslistermijnDatum?: string;
  aanvuldeadlineDatum?: string | null;
  briefData: object;
}

// ── Variant bepalen ──────────────────────────────────────────────────────────

type BriefVariant = 'A' | 'B' | 'C' | 'D' | 'E';

function bepaalVariant(ctx: OntvangstbevestigingContext): BriefVariant {
  if (ctx.aanvraagType === 'concept') return 'E';
  if (ctx.volledig && ctx.procedureType !== 'uitgebreid') return 'A';
  if (ctx.volledig && ctx.procedureType === 'uitgebreid') return 'B';
  if (!ctx.volledig && ctx.procedureType !== 'uitgebreid') return 'C';
  return 'D';
}

// ── Sectie 2 — Procedure tekst per variant ───────────────────────────────────

function procedureTekst(ctx: OntvangstbevestigingContext, variant: BriefVariant): string {
  switch (variant) {
    case 'A':
      return `De aanvraag valt onder de reguliere procedure (artikel 16.62 Omgevingswet). ` +
        `De beslistermijn bedraagt 8 weken na de datum van ontvangst van de volledige aanvraag. ` +
        `De uiterste beslisdatum is ${ctx.beslistermijnDatum}. ` +
        `De termijn kan eenmalig met 6 weken worden verlengd (artikel 16.64 Omgevingswet).`;
    case 'B':
      return `De aanvraag valt onder de uitgebreide procedure (artikel 16.65 Omgevingswet). ` +
        `De beslistermijn bedraagt 26 weken na de datum van ontvangst van de volledige aanvraag. ` +
        `De uiterste beslisdatum is ${ctx.beslistermijnDatum}. ` +
        `Er zal een ontwerpbesluit ter inzage worden gelegd, waarop zienswijzen kunnen worden ingediend. ` +
        `De termijn kan eenmalig met 6 weken worden verlengd (artikel 16.68 Omgevingswet).`;
    case 'C':
      return `De aanvraag valt onder de reguliere procedure (artikel 16.62 Omgevingswet). ` +
        `De beslistermijn van 8 weken gaat lopen zodra de aanvraag volledig is. ` +
        `De termijn is opgeschort totdat de ontbrekende stukken zijn ontvangen (artikel 4:15 Awb). ` +
        `Wij verzoeken u de ontbrekende stukken uiterlijk ${ctx.aanvuldeadlineDatum} aan te leveren.`;
    case 'D':
      return `De aanvraag valt onder de uitgebreide procedure (artikel 16.65 Omgevingswet). ` +
        `De beslistermijn van 26 weken gaat lopen zodra de aanvraag volledig is. ` +
        `De termijn is opgeschort totdat de ontbrekende stukken zijn ontvangen (artikel 4:15 Awb). ` +
        `Wij verzoeken u de ontbrekende stukken uiterlijk ${ctx.aanvuldeadlineDatum} aan te leveren.`;
    case 'E':
      return `Dit betreft een conceptaanvraag (vooroverleg/principeverzoek). ` +
        `Voor conceptaanvragen gelden geen wettelijke beslistermijnen. ` +
        `De inschatting in deze brief is indicatief en gebaseerd op de aangeleverde informatie. ` +
        `Aan dit advies kunnen geen rechten worden ontleend.`;
  }
}

// ── Sectie 3 — Volledigheid tekst per variant ────────────────────────────────

function volledigheidsPassage(ctx: OntvangstbevestigingContext, variant: BriefVariant): string {
  if (variant === 'A' || variant === 'B') {
    return `Wij hebben uw aanvraag beoordeeld op volledigheid. ` +
      `De aanvraag bevat alle voor de behandeling benodigde stukken en gegevens.`;
  }

  const data = ctx.briefData as {
    percelen?: Array<{
      kadastraleAanduiding: string;
      ontbrekendeStukken: Array<{ naam: string; grondslag: string; toelichting?: string }>;
    }>;
  };

  let tekst = variant === 'E'
    ? `Voor de beoordeling van uw conceptaanvraag ontbreken de volgende stukken die bij een formele indiening verplicht zijn:\n\n`
    : `Uw aanvraag is niet volledig. De volgende stukken ontbreken:\n\n`;

  if (data?.percelen) {
    for (const perceel of data.percelen) {
      if (perceel.ontbrekendeStukken.length > 0) {
        tekst += `Perceel ${perceel.kadastraleAanduiding}:\n`;
        for (const stuk of perceel.ontbrekendeStukken) {
          tekst += `- ${stuk.naam} (grondslag: ${stuk.grondslag})`;
          if (stuk.toelichting) tekst += ` — ${stuk.toelichting}`;
          tekst += '\n';
        }
        tekst += '\n';
      }
    }
  }

  if (variant !== 'E') {
    tekst += `Indien de gevraagde stukken niet tijdig worden aangeleverd, kan de aanvraag buiten behandeling worden gesteld (artikel 4:5 Awb).`;
  }

  return tekst;
}

// ── Hoofdfunctie ─────────────────────────────────────────────────────────────

export function buildOntvangstbevestigingPrompt(ctx: OntvangstbevestigingContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const variant = bepaalVariant(ctx);

  const systemPrompt =
    `Je bent een gemeentelijk behandelaar omgevingsvergunningen bij de gemeente ${ctx.gemeente}. ` +
    `Schrijf een formele ontvangstbevestiging in goed Nederlands op basis van de aangeleverde gegevens.\n\n` +
    `VERPLICHTE REGELS:\n` +
    `- Gebruik [AANVRAGER] voor de naam van de aanvrager — nooit een echte naam\n` +
    `- Gebruik [ADRES_VERWIJDERD] voor het locatieadres van de activiteit\n` +
    `- Gebruik [AFDELING_NAAM] voor de naam van de afdeling — nooit "Afdeling Vergunningen" hardcoderen\n` +
    `- Noem nooit e-mailadressen, telefoonnummers of andere persoonsgegevens\n` +
    `- Schrijf professioneel, duidelijk en toegankelijk\n` +
    `- Verwijs naar wetsartikelen zoals aangeleverd\n` +
    `- Sluit af met: Met vriendelijke groet,\n[AFDELING_NAAM]\nGemeente ${ctx.gemeente}`;

  const proc = procedureTekst(ctx, variant);
  const volledig = volledigheidsPassage(ctx, variant);

  const voorbehoud = variant === 'E'
    ? `\n\nJURIDISCH VOORBEHOUD: Dit is een indicatief advies op basis van de aangeleverde informatie. Aan dit advies kunnen geen rechten worden ontleend. De formele beoordeling vindt plaats na indiening van een volledige aanvraag.`
    : `\n\nVoorlopige inschatting op basis van ingediende stukken. Kan wijzigen na inhoudelijke beoordeling. De behandelaar blijft verantwoordelijk voor het definitieve oordeel.`;

  const userPrompt =
    `Schrijf een volledige ontvangstbevestiging (variant ${variant}) met de volgende gegevens:\n\n` +

    `AANVRAAGGEGEVENS:\n` +
    `- Aanvrager: [AANVRAGER]\n` +
    `- Locatie: [ADRES_VERWIJDERD]\n` +
    `- Zaaknummer: ${ctx.zaaknummer}\n` +
    `- Ontvangstdatum: ${ctx.ontvangstdatum}\n` +
    `- Activiteit: ${ctx.activiteitType ?? 'niet opgegeven'}\n` +
    `- Omschrijving: ${ctx.activiteitOmschrijving ?? 'niet opgegeven'}\n` +
    (ctx.gebiedstype ? `- Gebiedstype: ${ctx.gebiedstype}\n` : '') +
    `\nSECTIE 2 — PROCEDURE EN TERMIJN:\n${proc}\n` +
    `\nSECTIE 3 — VOLLEDIGHEID:\n${volledig}\n` +
    `\nSECTIE 4 — CONTACT:\nVermeld dat de aanvrager contact kan opnemen met [AFDELING_NAAM] voor vragen.` +
    voorbehoud;

  return { systemPrompt, userPrompt };
}

// ── Volledigheidscheck prompt ─────────────────────────────────────────────────

export function buildVolledigheidsCheckPrompt(ctx: {
  activiteitType?: string | null;
  activiteitOmschrijving?: string | null;
  gemeente: string;
  briefData?: object;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt =
    `Je bent een gemeentelijk behandelaar omgevingsvergunningen in ${ctx.gemeente}. ` +
    `Schrijf een beknopte toelichting bij de volledigheidscheck van een ingediende aanvraag. ` +
    `Baseer je uitsluitend op de aangeleverde gegevens. ` +
    `Noem NOOIT namen, adressen of andere persoonsgegevens. ` +
    `Gebruik een professionele maar toegankelijke toon. ` +
    `Verwijs bij ontbrekende stukken naar de wettelijke grondslag als die is meegegeven.`;

  const ontbrekendeStukkenTekst = ctx.briefData
    ? `\n\nUitkomst volledigheidscheck:\n${JSON.stringify(ctx.briefData, null, 2)}`
    : '';

  const userPrompt =
    `Activiteitstype: ${ctx.activiteitType ?? 'onbekend'}\n` +
    `Omschrijving: ${ctx.activiteitOmschrijving ?? 'geen omschrijving'}\n` +
    `Gemeente: ${ctx.gemeente}${ontbrekendeStukkenTekst}\n\n` +
    `Schrijf een korte toelichting (max 150 woorden) voor de behandelaar over de volledigheid van deze aanvraag. ` +
    `Noem specifiek welke stukken ontbreken en waarom ze vereist zijn. Sluit af met een aanbeveling.`;

  return { systemPrompt, userPrompt };
}
