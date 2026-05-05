/**
 * packages/core/src/locatie/bestemmingsplanToets.ts
 *
 * PDOK WFS bestemmingsplantoets per perceel.
 * Gebruikt Rijksdriehoek coördinaten (rd_x, rd_y) uit resolveLocatie.
 * Groq geeft een indicatieve toets op basis van planregels + activiteiten.
 *
 * NOOIT juridische conclusies trekken — altijd "indicatief" en "voorlopig".
 */

import type { ResolvedLocatie } from './resolveLocatie.js';

// ============================================================
// TYPES
// ============================================================

export interface BestemmingsplanInfo {
  naam: string;
  imroCode: string;
  vastgesteld: string;
}

export interface BestemmingsplanToetsResultaat {
  kadastraleAanduiding: string;
  lat: number;
  lon: number;
  bestemmingsplan: BestemmingsplanInfo | null;
  enkelbestemming: string[];
  dubbelbestemming: string[];
  gebiedsaanduidingen: string[];
  afwijkingGesignaleerd: boolean;
  afwijkingToelichting?: string;
  pdokBereikbaar: boolean;
  fout?: string;
}

export interface IndicatieveToetsResultaat {
  perceelAanduiding: string;
  passendBinnenBestemming: 'ja' | 'nee' | 'mogelijk' | 'onbekend';
  relevanteArtikelen: string[];
  aandachtspunten: string[];
  procedureIndicatie: 'regulier' | 'mogelijk_uitgebreid' | 'onbekend';
  waterstaatsactiviteit: boolean;
  toelichting: string;
}

// ============================================================
// PDOK WFS ENDPOINTS
// ============================================================

const PDOK_WFS =
  process.env['PDOK_RUIMTELIJKEPLANNEN'] ??
  'https://service.pdok.nl/rws/ruimtelijkeplannen/wfs/v1_0';

// ============================================================
// PDOK WFS QUERIES
// ============================================================

function wfsUrl(typeName: string, rdX: number, rdY: number, buffer = 1): string {
  const url = new URL(PDOK_WFS);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeName', typeName);
  url.searchParams.set('outputFormat', 'application/json');
  url.searchParams.set('count', '10');
  // INTERSECTS met een punt (buffer 1m in RD coördinaten)
  url.searchParams.set(
    'CQL_FILTER',
    `INTERSECTS(geometrie,POINT(${rdX} ${rdY}))`
  );
  return url.toString();
}

async function wfsFetch(typeName: string, rdX: number, rdY: number): Promise<unknown[]> {
  try {
    const response = await fetch(wfsUrl(typeName, rdX, rdY), {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data = await response.json() as { features?: unknown[] };
    return data.features ?? [];
  } catch {
    return [];
  }
}

// ============================================================
// PDOK WFS: BESTEMMINGSPLAN DATA OPHALEN
// ============================================================

interface WfsFeature {
  properties?: Record<string, string | null>;
}

async function haalBestemmingsplanData(
  rdX: number,
  rdY: number
): Promise<{
  bestemmingsplan: BestemmingsplanInfo | null;
  enkelbestemming: string[];
  dubbelbestemming: string[];
  gebiedsaanduidingen: string[];
}> {
  // Alle WFS lagen parallel ophalen
  const [plannen, enkelvoudig, dubbel, gebieden] = await Promise.all([
    wfsFetch('bestemmingsplangebied', rdX, rdY),
    wfsFetch('enkelbestemming', rdX, rdY),
    wfsFetch('dubbelbestemming', rdX, rdY),
    wfsFetch('gebiedsaanduiding', rdX, rdY),
  ]);

  // Bestemmingsplan metadata
  let bestemmingsplan: BestemmingsplanInfo | null = null;
  if (plannen.length > 0) {
    const props = (plannen[0] as WfsFeature).properties ?? {};
    bestemmingsplan = {
      naam: props['naam'] ?? 'Onbekend',
      imroCode: props['imroCode'] ?? '',
      vastgesteld: props['datum'] ?? '',
    };
  }

  const enkelvoudigBestemmingen = enkelvoudig
    .map((f) => (f as WfsFeature).properties?.['naam'] ?? '')
    .filter(Boolean);

  const dubbelBestemmingen = dubbel
    .map((f) => (f as WfsFeature).properties?.['naam'] ?? '')
    .filter(Boolean);

  const gebiedsAanduidingen = gebieden
    .map((f) => (f as WfsFeature).properties?.['naam'] ?? '')
    .filter(Boolean);

  return {
    bestemmingsplan,
    enkelbestemming: [...new Set(enkelvoudigBestemmingen)],
    dubbelbestemming: [...new Set(dubbelBestemmingen)],
    gebiedsaanduidingen: [...new Set(gebiedsAanduidingen)],
  };
}

// ============================================================
// TOETS PER PERCEEL
// ============================================================

async function toetsPerceel(
  locatie: ResolvedLocatie,
  aangevraagdePlanNaam?: string
): Promise<BestemmingsplanToetsResultaat> {
  const aanduiding = locatie.kadastraleAanduiding ?? locatie.invoer.type;

  // Geen coördinaten — skip WFS
  if (!locatie.rd_x || !locatie.rd_y || locatie.lat === 0) {
    return {
      kadastraleAanduiding: aanduiding,
      lat: locatie.lat,
      lon: locatie.lon,
      bestemmingsplan: null,
      enkelbestemming: [],
      dubbelbestemming: [],
      gebiedsaanduidingen: [],
      afwijkingGesignaleerd: false,
      pdokBereikbaar: false,
      fout: locatie.fout ?? 'Geen coördinaten beschikbaar',
    };
  }

  try {
    const data = await haalBestemmingsplanData(locatie.rd_x, locatie.rd_y);

    // Afwijking signaleren als aanvrager een ander plan heeft genoemd
    let afwijkingGesignaleerd = false;
    let afwijkingToelichting: string | undefined;
    if (aangevraagdePlanNaam && data.bestemmingsplan) {
      const pdokNaam = data.bestemmingsplan.naam.toLowerCase();
      const aangevraagdNaam = aangevraagdePlanNaam.toLowerCase();
      if (!pdokNaam.includes(aangevraagdNaam) && !aangevraagdNaam.includes(pdokNaam)) {
        afwijkingGesignaleerd = true;
        afwijkingToelichting =
          `Aanvrager noemt "${aangevraagdePlanNaam}" maar PDOK toont "${data.bestemmingsplan.naam}". Controleer of het juiste plan van toepassing is.`;
      }
    }

    return {
      kadastraleAanduiding: aanduiding,
      lat: locatie.lat,
      lon: locatie.lon,
      ...data,
      afwijkingGesignaleerd,
      afwijkingToelichting,
      pdokBereikbaar: true,
    };
  } catch (err) {
    return {
      kadastraleAanduiding: aanduiding,
      lat: locatie.lat,
      lon: locatie.lon,
      bestemmingsplan: null,
      enkelbestemming: [],
      dubbelbestemming: [],
      gebiedsaanduidingen: [],
      afwijkingGesignaleerd: false,
      pdokBereikbaar: false,
      fout: err instanceof Error ? err.message : 'PDOK niet bereikbaar',
    };
  }
}

// ============================================================
// HOOFD EXPORT: PARALLEL PER PERCEEL
// ============================================================

export async function toetsBestemmingsplan(
  locaties: ResolvedLocatie[],
  aangevraagdePlanNaam?: string
): Promise<BestemmingsplanToetsResultaat[]> {
  return Promise.all(
    locaties.map((loc) => toetsPerceel(loc, aangevraagdePlanNaam))
  );
}

// ============================================================
// INDICATIEVE TOETS VIA GROQ
// ============================================================

export function buildBestemmingsplanToetsPrompt(
  toetsResultaten: BestemmingsplanToetsResultaat[],
  activiteitType: string,
  activiteitOmschrijving: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt =
    `Je bent een gemeentelijk behandelaar omgevingsvergunningen. ` +
    `Geef een indicatieve toets of de gevraagde activiteit past binnen het bestemmingsplan. ` +
    `Baseer je uitsluitend op de aangeleverde plangegevens. ` +
    `Noem NOOIT namen, adressen of andere persoonsgegevens. ` +
    `Gebruik ALTIJD: "voorlopige inschatting", "indicatief", "kan wijzigen na inhoudelijke beoordeling". ` +
    `Geef GEEN juridisch bindend advies. De behandelaar blijft verantwoordelijk voor het definitieve oordeel.`;

  const planSamenvatting = toetsResultaten
    .filter((t) => t.pdokBereikbaar)
    .map((t) => {
      const regels = [
        t.bestemmingsplan ? `Plan: ${t.bestemmingsplan.naam}` : null,
        t.enkelbestemming.length > 0 ? `Enkelbestemming: ${t.enkelbestemming.join(', ')}` : null,
        t.dubbelbestemming.length > 0 ? `Dubbelbestemming: ${t.dubbelbestemming.join(', ')}` : null,
        t.gebiedsaanduidingen.length > 0 ? `Gebiedsaanduidingen: ${t.gebiedsaanduidingen.join(', ')}` : null,
        t.afwijkingGesignaleerd ? `AFWIJKING: ${t.afwijkingToelichting}` : null,
      ].filter(Boolean);
      return `Perceel ${t.kadastraleAanduiding}:\n${regels.join('\n')}`;
    })
    .join('\n\n');

  const userPrompt =
    `Activiteitstype: ${activiteitType}\n` +
    `Omschrijving: ${activiteitOmschrijving}\n\n` +
    `Bestemmingsplangegevens uit PDOK:\n${planSamenvatting || 'Geen plangegevens beschikbaar'}\n\n` +
    `Geef een indicatieve toets als JSON (geen uitleg, geen markdown):\n` +
    `{\n` +
    `  "passendBinnenBestemming": "ja" | "nee" | "mogelijk" | "onbekend",\n` +
    `  "relevanteArtikelen": ["artikel ...", ...],\n` +
    `  "aandachtspunten": ["...", ...],\n` +
    `  "procedureIndicatie": "regulier" | "mogelijk_uitgebreid" | "onbekend",\n` +
    `  "waterstaatsactiviteit": true | false,\n` +
    `  "toelichting": "max 200 woorden, ALTIJD met juridisch voorbehoud"\n` +
    `}`;

  return { systemPrompt, userPrompt };
}

export function parseBestemmingsplanToetsResponse(
  response: string,
  perceelAanduiding: string
): IndicatieveToetsResultaat {
  const cleaned = response
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      perceelAanduiding,
      passendBinnenBestemming:
        (['ja', 'nee', 'mogelijk', 'onbekend'] as const).includes(
          parsed['passendBinnenBestemming'] as 'ja'
        )
          ? (parsed['passendBinnenBestemming'] as IndicatieveToetsResultaat['passendBinnenBestemming'])
          : 'onbekend',
      relevanteArtikelen: Array.isArray(parsed['relevanteArtikelen'])
        ? (parsed['relevanteArtikelen'] as string[])
        : [],
      aandachtspunten: Array.isArray(parsed['aandachtspunten'])
        ? (parsed['aandachtspunten'] as string[])
        : [],
      procedureIndicatie:
        (['regulier', 'mogelijk_uitgebreid', 'onbekend'] as const).includes(
          parsed['procedureIndicatie'] as 'regulier'
        )
          ? (parsed['procedureIndicatie'] as IndicatieveToetsResultaat['procedureIndicatie'])
          : 'onbekend',
      waterstaatsactiviteit: parsed['waterstaatsactiviteit'] === true,
      toelichting: typeof parsed['toelichting'] === 'string' ? parsed['toelichting'] : '',
    };
  } catch {
    return {
      perceelAanduiding,
      passendBinnenBestemming: 'onbekend',
      relevanteArtikelen: [],
      aandachtspunten: ['Toetsresultaat kon niet worden verwerkt'],
      procedureIndicatie: 'onbekend',
      waterstaatsactiviteit: false,
      toelichting: 'Indicatieve toets niet beschikbaar. Controleer de plangegevens handmatig.',
    };
  }
}
