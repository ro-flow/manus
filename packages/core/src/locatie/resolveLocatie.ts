/**
 * packages/core/src/locatie/resolveLocatie.ts
 *
 * Universele locatie-resolver voor RO-flow.
 * Zet elke vorm van locatie-invoer om naar coördinaten.
 * Coördinaten worden gebruikt voor bestemmingsplantoets via PDOK.
 *
 * Ondersteunde invoervormen:
 * 1. Kadastraal nummer (bijv. KGL02-AE-324)
 * 2. Adres (bijv. Zesstedenweg 12, Koggenland)
 * 3. Projectnaam + gemeente (bijv. "De Hulk", Koggenland)
 * 4. Coördinaten direct (als al bekend)
 *
 * Alle API calls worden parallel uitgevoerd via Promise.all().
 */

// ============================================================
// TYPES
// ============================================================

export type LocatieInvoerType =
  | 'kadastraal'
  | 'adres'
  | 'projectnaam'
  | 'coordinaten';

export interface KadastraalInvoer {
  type: 'kadastraal';
  kadastraleGemeente: string;  // bijv. "Wester-Koggenland" of "KGL02"
  sectie: string;               // bijv. "AE" of "AC"
  perceelnummer: string;        // bijv. "324"
  origineel: string;            // originele string zoals in aanvraag
}

export interface AdresInvoer {
  type: 'adres';
  straat: string;
  huisnummer: string;
  huisletter?: string;
  postcode?: string;
  woonplaats?: string;
}

export interface ProjectnaamInvoer {
  type: 'projectnaam';
  naam: string;
  gemeente: string;
}

export interface CoordinatenInvoer {
  type: 'coordinaten';
  lat: number;
  lon: number;
  rd_x?: number;  // Rijksdriehoek X
  rd_y?: number;  // Rijksdriehoek Y
}

export type LocatieInvoer =
  | KadastraalInvoer
  | AdresInvoer
  | ProjectnaamInvoer
  | CoordinatenInvoer;

export interface ResolvedLocatie {
  invoer: LocatieInvoer;
  lat: number;
  lon: number;
  rd_x?: number;
  rd_y?: number;
  kadastraalObjectId?: string;
  kadastraleAanduiding?: string;
  weergavenaam?: string;
  betrouwbaarheid: 'hoog' | 'middel' | 'laag';
  methode: string;
  fout?: string;
}

// ============================================================
// PDOK LOCATIESERVER — ENDPOINTS
// ============================================================

const PDOK_LOCATIESERVER =
  process.env['PDOK_LOCATIESERVER'] ??
  'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

// ============================================================
// DETECTEER LOCATIE TYPE UIT PDF TEKST
// ============================================================

/**
 * Detecteert alle locaties in een PDF tekst.
 * Herkent kadastrale nummers, adressen en projectnamen.
 * Geeft een array terug van alle gevonden locaties.
 */
export function detecteerLocaties(
  tekst: string,
  gemeente?: string
): LocatieInvoer[] {
  const locaties: LocatieInvoer[] = [];
  const gevonden = new Set<string>();

  // ── 1. Kadastrale nummers ─────────────────────────────────
  // Patroon 1: "KGL02 - AE - 324" (DSO formaat)
  const kadastraalDSO = tekst.matchAll(
    /\b([A-Z]{2,5}[0-9]{0,2})\s*[-–]\s*([A-Z]{1,3})\s*[-–]\s*([0-9]{1,5})\b/g
  );
  for (const match of kadastraalDSO) {
    const origineel = match[0].trim();
    if (!gevonden.has(origineel)) {
      gevonden.add(origineel);
      locaties.push({
        type: 'kadastraal',
        kadastraleGemeente: match[1].trim(),
        sectie: match[2].trim(),
        perceelnummer: match[3].trim(),
        origineel,
      });
    }
  }

  // Patroon 2: "Wester-Koggenland AC 476" (OLO formaat)
  const kadastraalOLO = tekst.matchAll(
    /\b([A-Z][a-z]+(?:-[A-Z][a-z]+)*)\s+([A-Z]{1,2})\s+([0-9]{1,5})\b/g
  );
  for (const match of kadastraalOLO) {
    const origineel = match[0].trim();
    if (
      !gevonden.has(origineel) &&
      match[1].length > 3 &&
      !match[1].match(/^(Datum|Naam|Type|Status|Pagina)$/i)
    ) {
      gevonden.add(origineel);
      locaties.push({
        type: 'kadastraal',
        kadastraleGemeente: match[1].trim(),
        sectie: match[2].trim(),
        perceelnummer: match[3].trim(),
        origineel,
      });
    }
  }

  // ── 2. Adressen ──────────────────────────────────────────
  const adresMatches = tekst.matchAll(
    /\b([A-Z][a-z]+(?:[\s-][A-Za-z]+)*(?:straat|weg|laan|plein|dijk|pad|dreef|allee|kade|gracht|singel|boulevard|avenue))\s+(\d+[a-zA-Z]?)\b/gi
  );
  for (const match of adresMatches) {
    const key = `adres:${match[0]}`;
    if (!gevonden.has(key)) {
      gevonden.add(key);
      locaties.push({
        type: 'adres',
        straat: match[1].trim(),
        huisnummer: match[2].trim(),
        woonplaats: gemeente,
      });
    }
  }

  // Postcode + huisnummer patroon
  const postcodeMatches = tekst.matchAll(
    /\b([1-9][0-9]{3}\s?[A-Z]{2})\s+(\d+[a-zA-Z]?)\b/g
  );
  for (const match of postcodeMatches) {
    const key = `postcode:${match[0]}`;
    if (!gevonden.has(key)) {
      gevonden.add(key);
      locaties.push({
        type: 'adres',
        straat: '',
        huisnummer: match[2].trim(),
        postcode: match[1].replace(/\s/, ''),
        woonplaats: gemeente,
      });
    }
  }

  // ── 3. Projectnaam als fallback ───────────────────────────
  if (locaties.length === 0 && gemeente) {
    const aanvraagnaamMatch = tekst.match(
      /Aanvraagnaam\s+([^\n\r]+)/i
    );
    if (aanvraagnaamMatch) {
      const volleNaam = aanvraagnaamMatch[1].trim();
      const korteNaam = verkortProjectnaam(volleNaam);
      locaties.push({
        type: 'projectnaam',
        naam: korteNaam,
        gemeente,
      });
    }
  }

  return locaties;
}

function verkortProjectnaam(naam: string): string {
  const prefixen = [
    /^werkzaamheden\s+/i,
    /^kwaliteitsimpuls\s+/i,
    /^nieuwbouw\s+/i,
    /^verbouw\s+/i,
    /^renovatie\s+/i,
    /^aanleg\s+/i,
    /^uitbreiding\s+/i,
    /^realisatie\s+/i,
    /^ontwikkeling\s+/i,
    /^bouw\s+/i,
  ];
  let kort = naam;
  for (const prefix of prefixen) {
    kort = kort.replace(prefix, '');
  }
  return kort.trim();
}

// ============================================================
// RESOLVE NAAR COÖRDINATEN VIA PDOK
// ============================================================

export async function resolveLocatie(
  invoer: LocatieInvoer
): Promise<ResolvedLocatie> {
  try {
    switch (invoer.type) {
      case 'kadastraal':
        return await resolveKadastraal(invoer);
      case 'adres':
        return await resolveAdres(invoer);
      case 'projectnaam':
        return await resolveProjectnaam(invoer);
      case 'coordinaten':
        return {
          invoer,
          lat: invoer.lat,
          lon: invoer.lon,
          rd_x: invoer.rd_x,
          rd_y: invoer.rd_y,
          betrouwbaarheid: 'hoog',
          methode: 'coordinaten_direct',
        };
    }
  } catch (fout: unknown) {
    return {
      invoer,
      lat: 0,
      lon: 0,
      betrouwbaarheid: 'laag',
      methode: 'mislukt',
      fout: fout instanceof Error ? fout.message : String(fout),
    };
  }
}

export async function resolveAlleLocaties(
  locaties: LocatieInvoer[]
): Promise<ResolvedLocatie[]> {
  return Promise.all(locaties.map(resolveLocatie));
}

// ── Kadastraal resolve ────────────────────────────────────

async function resolveKadastraal(
  invoer: KadastraalInvoer
): Promise<ResolvedLocatie> {
  const zoekterm = `${invoer.kadastraleGemeente} ${invoer.sectie} ${invoer.perceelnummer}`;

  const url = new URL(`${PDOK_LOCATIESERVER}/free`);
  url.searchParams.set('q', zoekterm);
  url.searchParams.set('fq', 'type:perceel');
  url.searchParams.set('fl', 'centroide_ll,centroide_rd,kadastrale_aanduiding,kadastraal_object_id,weergavenaam');
  url.searchParams.set('rows', '1');

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`PDOK Locatieserver fout: ${response.status}`);

  const data = await response.json() as { response?: { docs?: Record<string, string>[] } };
  const docs = data.response?.docs;

  if (!docs || docs.length === 0) return resolveKadastraalFallback(invoer);

  const doc = docs[0];
  const { lat, lon } = parseCentroide(doc['centroide_ll'] ?? '');
  const { x, y } = parseCentroideRD(doc['centroide_rd'] ?? '');

  return {
    invoer,
    lat,
    lon,
    rd_x: x,
    rd_y: y,
    kadastraalObjectId: doc['kadastraal_object_id'],
    kadastraleAanduiding: doc['kadastrale_aanduiding'] || invoer.origineel,
    weergavenaam: doc['weergavenaam'],
    betrouwbaarheid: 'hoog',
    methode: 'pdok_kadastraal',
  };
}

async function resolveKadastraalFallback(
  invoer: KadastraalInvoer
): Promise<ResolvedLocatie> {
  const url = new URL(`${PDOK_LOCATIESERVER}/free`);
  url.searchParams.set('q', `${invoer.sectie} ${invoer.perceelnummer} ${invoer.kadastraleGemeente}`);
  url.searchParams.set('rows', '1');
  url.searchParams.set('fl', 'centroide_ll,centroide_rd,weergavenaam');

  const response = await fetch(url.toString());
  const data = await response.json() as { response?: { docs?: Record<string, string>[] } };
  const docs = data.response?.docs;

  if (!docs || docs.length === 0) throw new Error(`Perceel niet gevonden: ${invoer.origineel}`);

  const doc = docs[0];
  const { lat, lon } = parseCentroide(doc['centroide_ll'] ?? '');
  const { x, y } = parseCentroideRD(doc['centroide_rd'] ?? '');

  return {
    invoer,
    lat,
    lon,
    rd_x: x,
    rd_y: y,
    kadastraleAanduiding: invoer.origineel,
    weergavenaam: doc['weergavenaam'],
    betrouwbaarheid: 'middel',
    methode: 'pdok_kadastraal_fallback',
  };
}

// ── Adres resolve ─────────────────────────────────────────

async function resolveAdres(invoer: AdresInvoer): Promise<ResolvedLocatie> {
  const zoekterm = [
    invoer.straat,
    invoer.huisnummer,
    invoer.huisletter ?? '',
    invoer.postcode ?? '',
    invoer.woonplaats ?? '',
  ].filter(Boolean).join(' ').trim();

  const url = new URL(`${PDOK_LOCATIESERVER}/free`);
  url.searchParams.set('q', zoekterm);
  url.searchParams.set('fq', 'type:adres');
  url.searchParams.set('fl', 'centroide_ll,centroide_rd,kadastraal_object_id,kadastrale_aanduiding,weergavenaam');
  url.searchParams.set('rows', '1');

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`PDOK adres resolve fout: ${response.status}`);

  const data = await response.json() as { response?: { docs?: Record<string, string>[] } };
  const docs = data.response?.docs;

  if (!docs || docs.length === 0) throw new Error(`Adres niet gevonden: ${zoekterm}`);

  const doc = docs[0];
  const { lat, lon } = parseCentroide(doc['centroide_ll'] ?? '');
  const { x, y } = parseCentroideRD(doc['centroide_rd'] ?? '');

  return {
    invoer,
    lat,
    lon,
    rd_x: x,
    rd_y: y,
    kadastraalObjectId: doc['kadastraal_object_id'],
    kadastraleAanduiding: doc['kadastrale_aanduiding'],
    weergavenaam: doc['weergavenaam'],
    betrouwbaarheid: 'hoog',
    methode: 'pdok_adres',
  };
}

// ── Projectnaam resolve ───────────────────────────────────

async function resolveProjectnaam(invoer: ProjectnaamInvoer): Promise<ResolvedLocatie> {
  const zoekterm = `${invoer.naam} ${invoer.gemeente}`;

  const url = new URL(`${PDOK_LOCATIESERVER}/free`);
  url.searchParams.set('q', zoekterm);
  url.searchParams.set('fl', 'centroide_ll,centroide_rd,weergavenaam,type');
  url.searchParams.set('rows', '1');

  const response = await fetch(url.toString());
  const data = await response.json() as { response?: { docs?: Record<string, string>[] } };
  const docs = data.response?.docs;

  if (!docs || docs.length === 0) throw new Error(`Projectlocatie niet gevonden: ${zoekterm}`);

  const doc = docs[0];
  const { lat, lon } = parseCentroide(doc['centroide_ll'] ?? '');
  const { x, y } = parseCentroideRD(doc['centroide_rd'] ?? '');

  return {
    invoer,
    lat,
    lon,
    rd_x: x,
    rd_y: y,
    weergavenaam: doc['weergavenaam'],
    betrouwbaarheid: 'laag',
    methode: 'pdok_projectnaam',
  };
}

// ============================================================
// HELPERS
// ============================================================

function parseCentroide(centroide: string): { lat: number; lon: number } {
  if (!centroide) return { lat: 0, lon: 0 };
  const match = centroide.match(/POINT\(([0-9.]+)\s+([0-9.]+)\)/);
  if (!match) return { lat: 0, lon: 0 };
  return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
}

function parseCentroideRD(centroide: string): { x: number; y: number } {
  if (!centroide) return { x: 0, y: 0 };
  const match = centroide.match(/POINT\(([0-9.]+)\s+([0-9.]+)\)/);
  if (!match) return { x: 0, y: 0 };
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}
