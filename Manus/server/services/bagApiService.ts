/**
 * BAG API Service - Basisregistratie Adressen en Gebouwen
 * 
 * Haalt officiële gebouwgegevens op via de Kadaster BAG API:
 * - Pand: bouwjaar, status, geometrie
 * - Verblijfsobject: oppervlakte, gebruiksdoel
 * - Nummeraanduiding: postcode, huisnummer, woonplaats
 * - Adres: zoeken op postcode/huisnummer
 * 
 * API Documentatie: https://lvbag.github.io/BAG-API/Technische%20specificatie/
 * Endpoint: https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/
 */

import { ENV } from '../_core/env';

// API configuratie
const BAG_API_BASE_URL = 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2';

// Types voor BAG objecten
export interface BagPand {
  identificatie: string;
  oorspronkelijkBouwjaar: number;
  status: string;
  geometrie?: {
    type: string;
    coordinates: number[][][];
  };
}

export interface BagVerblijfsobject {
  identificatie: string;
  oppervlakte: number;
  status: string;
  gebruiksdoelen: string[];
  pandIdentificaties: string[];
  nummeraanduidingIdentificatie: string;
}

export interface BagNummeraanduiding {
  identificatie: string;
  huisnummer: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode: string;
  woonplaatsNaam: string;
  openbareRuimteNaam: string; // straatnaam
}

export interface BagAdres {
  nummeraanduidingIdentificatie: string;
  openbareRuimteNaam: string;
  huisnummer: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode: string;
  woonplaatsNaam: string;
}

export interface BagGebouwInfo {
  adres: {
    straat: string;
    huisnummer: string;
    postcode: string;
    woonplaats: string;
  };
  pand?: {
    identificatie: string;
    bouwjaar: number;
    status: string;
  };
  verblijfsobject?: {
    identificatie: string;
    oppervlakte: number;
    gebruiksdoelen: string[];
    status: string;
  };
  // Afgeleide informatie voor onderzoeksvereisten
  isVoorOorlogsBouwjaar: boolean; // <1945 - mogelijk monument
  isAsbestRisico: boolean; // <1994 - asbest mogelijk aanwezig
  isOudBouwjaar: boolean; // <1992 - bouwbesluit 2012 niet van toepassing
}

/**
 * Haal de API key op uit environment
 */
function getApiKey(): string {
  const apiKey = ENV.bagApiKey;
  if (!apiKey) {
    console.warn('BAG_API_KEY niet geconfigureerd');
    return '';
  }
  return apiKey;
}

/**
 * Maak een API request naar de BAG API
 */
async function bagApiRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(`${BAG_API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/hal+json',
        'Accept-Crs': 'epsg:28992' // Rijksdriehoek coördinaten
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error(`BAG API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.error('BAG API request failed:', error);
    return null;
  }
}

/**
 * Zoek adressen op postcode en huisnummer
 */
export async function zoekAdres(
  postcode: string,
  huisnummer: number,
  huisletter?: string,
  huisnummertoevoeging?: string
): Promise<BagAdres[]> {
  const params: Record<string, string> = {
    postcode: postcode.replace(/\s/g, '').toUpperCase(),
    huisnummer: huisnummer.toString()
  };

  if (huisletter) params.huisletter = huisletter;
  if (huisnummertoevoeging) params.huisnummertoevoeging = huisnummertoevoeging;

  interface AdressenResponse {
    _embedded?: {
      adressen?: BagAdres[];
    };
  }

  const response = await bagApiRequest<AdressenResponse>('/adressen', params);
  return response?._embedded?.adressen || [];
}

/**
 * Haal nummeraanduiding op basis van identificatie
 */
export async function haalNummeraanduiding(identificatie: string): Promise<BagNummeraanduiding | null> {
  interface NummeraanduidingResponse {
    nummeraanduiding?: BagNummeraanduiding;
  }

  const response = await bagApiRequest<NummeraanduidingResponse>(
    `/nummeraanduidingen/${identificatie}`
  );
  return response?.nummeraanduiding || null;
}

/**
 * Haal verblijfsobject op basis van nummeraanduiding
 */
export async function haalVerblijfsobjectVoorNummeraanduiding(
  nummeraanduidingId: string
): Promise<BagVerblijfsobject | null> {
  interface VerblijfsobjectenResponse {
    _embedded?: {
      verblijfsobjecten?: BagVerblijfsobject[];
    };
  }

  const response = await bagApiRequest<VerblijfsobjectenResponse>(
    '/verblijfsobjecten',
    { nummeraanduidingIdentificatie: nummeraanduidingId }
  );

  const verblijfsobjecten = response?._embedded?.verblijfsobjecten;
  return verblijfsobjecten && verblijfsobjecten.length > 0 ? verblijfsobjecten[0] : null;
}

/**
 * Haal pand op basis van identificatie
 */
export async function haalPand(identificatie: string): Promise<BagPand | null> {
  interface PandResponse {
    pand?: BagPand;
  }

  const response = await bagApiRequest<PandResponse>(`/panden/${identificatie}`);
  return response?.pand || null;
}

/**
 * Haal volledige gebouwinformatie op basis van postcode en huisnummer
 * Dit is de hoofdfunctie die alle relevante BAG data combineert
 */
export async function haalGebouwInfo(
  postcode: string,
  huisnummer: number,
  huisletter?: string,
  huisnummertoevoeging?: string
): Promise<BagGebouwInfo | null> {
  // Stap 1: Zoek het adres
  const adressen = await zoekAdres(postcode, huisnummer, huisletter, huisnummertoevoeging);
  
  if (adressen.length === 0) {
    console.log(`Geen adres gevonden voor ${postcode} ${huisnummer}`);
    return null;
  }

  const adres = adressen[0];

  // Stap 2: Haal verblijfsobject op
  const verblijfsobject = await haalVerblijfsobjectVoorNummeraanduiding(
    adres.nummeraanduidingIdentificatie
  );

  // Stap 3: Haal pand op (als er een verblijfsobject is)
  let pand: BagPand | null = null;
  if (verblijfsobject && verblijfsobject.pandIdentificaties.length > 0) {
    pand = await haalPand(verblijfsobject.pandIdentificaties[0]);
  }

  // Bouw het resultaat
  const bouwjaar = pand?.oorspronkelijkBouwjaar || 0;

  return {
    adres: {
      straat: adres.openbareRuimteNaam,
      huisnummer: `${adres.huisnummer}${adres.huisletter || ''}${adres.huisnummertoevoeging || ''}`,
      postcode: adres.postcode,
      woonplaats: adres.woonplaatsNaam
    },
    pand: pand ? {
      identificatie: pand.identificatie,
      bouwjaar: pand.oorspronkelijkBouwjaar,
      status: pand.status
    } : undefined,
    verblijfsobject: verblijfsobject ? {
      identificatie: verblijfsobject.identificatie,
      oppervlakte: verblijfsobject.oppervlakte,
      gebruiksdoelen: verblijfsobject.gebruiksdoelen,
      status: verblijfsobject.status
    } : undefined,
    // Afgeleide informatie
    isVoorOorlogsBouwjaar: bouwjaar > 0 && bouwjaar < 1945,
    isAsbestRisico: bouwjaar > 0 && bouwjaar < 1994,
    isOudBouwjaar: bouwjaar > 0 && bouwjaar < 1992
  };
}

/**
 * Check of de BAG API beschikbaar is
 */
export async function isApiAvailable(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;

  try {
    // Doe een simpele test query
    const response = await fetch(
      `${BAG_API_BASE_URL}/adressen?postcode=1012JS&huisnummer=1`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Accept': 'application/hal+json'
        },
        signal: AbortSignal.timeout(5000)
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Format BAG info voor AI context
 */
export function formatBagInfoVoorAI(info: BagGebouwInfo): string {
  const lines: string[] = [];
  
  lines.push('=== BAG GEBOUWGEGEVENS (Kadaster) ===\n');
  
  lines.push('## ADRES');
  lines.push(`${info.adres.straat} ${info.adres.huisnummer}`);
  lines.push(`${info.adres.postcode} ${info.adres.woonplaats}`);
  lines.push('');

  if (info.pand) {
    lines.push('## PAND');
    lines.push(`Bouwjaar: ${info.pand.bouwjaar}`);
    lines.push(`Status: ${info.pand.status}`);
    lines.push(`BAG ID: ${info.pand.identificatie}`);
    lines.push('');

    // Waarschuwingen op basis van bouwjaar
    if (info.isAsbestRisico) {
      lines.push('⚠️ ASBEST RISICO: Bouwjaar vóór 1994 - asbestinventarisatie mogelijk vereist bij sloop/verbouw');
    }
    if (info.isVoorOorlogsBouwjaar) {
      lines.push('⚠️ VOOROORLOGS: Bouwjaar vóór 1945 - mogelijk cultuurhistorische waarde, check monumentenstatus');
    }
    if (info.isOudBouwjaar) {
      lines.push('ℹ️ Bouwjaar vóór 1992 - Bouwbesluit 2012 niet volledig van toepassing (rechtens verkregen niveau)');
    }
    lines.push('');
  }

  if (info.verblijfsobject) {
    lines.push('## VERBLIJFSOBJECT');
    lines.push(`Oppervlakte: ${info.verblijfsobject.oppervlakte} m²`);
    lines.push(`Gebruiksdoel: ${info.verblijfsobject.gebruiksdoelen.join(', ')}`);
    lines.push(`Status: ${info.verblijfsobject.status}`);
    lines.push(`BAG ID: ${info.verblijfsobject.identificatie}`);
    lines.push('');
  }

  return lines.join('\n');
}
