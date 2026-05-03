/**
 * OpenRechtspraak API Client
 * 
 * Hybride aanpak:
 * 1. Zoeken via data.rechtspraak.nl (officiële API met XML/Atom feed)
 * 2. JSON parsing en transformatie naar bruikbaar formaat
 * 3. Content ophalen via data.rechtspraak.nl/uitspraken/content
 * 
 * Voordelen:
 * - Officiële bron (data.rechtspraak.nl)
 * - Filtering op rechtsgebied (bestuursrecht)
 * - Zoeken op termen
 * - Retry logic en rate limiting
 */

import { XMLParser } from 'fast-xml-parser';

// API Configuration
const RECHTSPRAAK_API_BASE = "https://data.rechtspraak.nl";
const UITSPRAKEN_WEBSITE = "https://uitspraken.rechtspraak.nl";

// Rechtsgebied URIs
const RECHTSGEBIED = {
  BESTUURSRECHT: "http://psi.rechtspraak.nl/rechtsgebied#bestuursrecht",
  BESTUURSRECHT_OMGEVINGSRECHT: "http://psi.rechtspraak.nl/rechtsgebied#bestuursrecht_omgevingsrecht",
  CIVIEL: "http://psi.rechtspraak.nl/rechtsgebied#civielRecht",
  STRAF: "http://psi.rechtspraak.nl/rechtsgebied#strafrecht"
};

// Instantie URIs (belangrijkste voor omgevingsrecht)
const INSTANTIE = {
  RAAD_VAN_STATE: "http://standaarden.overheid.nl/owms/terms/Raad_van_State",
  RECHTBANK_AMSTERDAM: "http://standaarden.overheid.nl/owms/terms/Rechtbank_Amsterdam",
  RECHTBANK_DEN_HAAG: "http://standaarden.overheid.nl/owms/terms/Rechtbank_Den_Haag",
  // Add more as needed
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  requestsPerSecond: 10, // rechtspraak.nl limit
};

// Rate limiter
let lastRequestTime = 0;
const minRequestInterval = 1000 / RETRY_CONFIG.requestsPerSecond;

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < minRequestInterval) {
    await sleep(minRequestInterval - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
  return fetch(url, options);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}

/**
 * Uitspraak interface (JSON formaat)
 */
export interface Uitspraak {
  ecli: string;
  titel: string;
  samenvatting: string;
  datumUitspraak: Date | null;
  datumPublicatie: Date | null;
  instantie: string;
  rechtsgebied: string;
  proceduresoort: string;
  url: string;
  inhoudsindicatie?: string;
  volledigeTekst?: string;
}

/**
 * Zoek parameters
 */
export interface ZoekParams {
  zoekterm?: string;
  rechtsgebied?: string;
  instantie?: string;
  datumVanaf?: Date;
  datumTot?: Date;
  max?: number;
  sort?: 'date' | 'relevance';
}

/**
 * Parse Atom feed XML naar Uitspraak objecten
 */
function parseAtomFeed(xmlContent: string): Uitspraak[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
  });
  
  try {
    const result = parser.parse(xmlContent);
    const feed = result.feed;
    
    if (!feed || !feed.entry) {
      return [];
    }
    
    // Ensure entries is always an array
    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    
    return entries.map((entry: any) => {
      const ecli = entry.id || '';
      const titel = entry.title?.['#text'] || entry.title || '';
      const samenvatting = entry.summary?.['#text'] || entry.summary || '';
      const updated = entry.updated;
      const link = entry.link?.['@_href'] || '';
      
      // Parse datum from title (format: "ECLI:..., Instantie, DD-MM-YYYY, ...")
      let datumUitspraak: Date | null = null;
      const datumMatch = titel.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (datumMatch) {
        datumUitspraak = new Date(`${datumMatch[3]}-${datumMatch[2]}-${datumMatch[1]}`);
      }
      
      // Extract instantie from title
      const instantieParts = titel.split(',');
      const instantie = instantieParts.length > 1 ? instantieParts[1].trim() : '';
      
      return {
        ecli,
        titel,
        samenvatting,
        datumUitspraak,
        datumPublicatie: updated ? new Date(updated) : null,
        instantie,
        rechtsgebied: '', // Will be enriched later
        proceduresoort: '',
        url: link || `${UITSPRAKEN_WEBSITE}/details?id=${encodeURIComponent(ecli)}`,
      };
    });
  } catch (error) {
    console.error('[OpenRechtspraakClient] Error parsing Atom feed:', error);
    return [];
  }
}

/**
 * Zoek uitspraken via data.rechtspraak.nl API
 * 
 * Ondersteunde parameters:
 * - q: zoekterm (full-text search)
 * - rechtsgebied: URI van rechtsgebied
 * - instantie: URI van instantie
 * - date: datum filter (>=YYYY-MM-DD of <=YYYY-MM-DD)
 * - max: maximum aantal resultaten (default 1000)
 * - sort: sortering (date of relevance)
 */
export async function zoekUitspraken(params: ZoekParams): Promise<Uitspraak[]> {
  const queryParams = new URLSearchParams();
  
  // Zoekterm
  if (params.zoekterm) {
    queryParams.append('q', params.zoekterm);
  }
  
  // Rechtsgebied filter
  if (params.rechtsgebied) {
    queryParams.append('rechtsgebied', params.rechtsgebied);
  }
  
  // Instantie filter
  if (params.instantie) {
    queryParams.append('instantie', params.instantie);
  }
  
  // Datum filter
  if (params.datumVanaf) {
    queryParams.append('date', `>=${params.datumVanaf.toISOString().split('T')[0]}`);
  }
  if (params.datumTot) {
    queryParams.append('date', `<=${params.datumTot.toISOString().split('T')[0]}`);
  }
  
  // Max results
  queryParams.append('max', (params.max || 50).toString());
  
  // Sort
  if (params.sort) {
    queryParams.append('sort', params.sort);
  }
  
  const url = `${RECHTSPRAAK_API_BASE}/uitspraken/zoeken?${queryParams}`;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await rateLimitedFetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/atom+xml, application/xml, text/xml',
          'User-Agent': 'Ro-flow/1.0 (omgevingsvergunning-assistent)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const xmlContent = await response.text();
        return parseAtomFeed(xmlContent);
      }
      
      if (response.status === 429) {
        console.warn(`[OpenRechtspraakClient] Rate limited, waiting before retry ${attempt + 1}`);
        await sleep(getRetryDelay(attempt) * 2);
        continue;
      }
      
      if (response.status >= 500) {
        console.warn(`[OpenRechtspraakClient] Server error ${response.status}, retry ${attempt + 1}`);
        await sleep(getRetryDelay(attempt));
        continue;
      }
      
      console.error(`[OpenRechtspraakClient] Client error ${response.status}`);
      return [];
      
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isNetworkError = error instanceof Error && 
        (error.message.includes('ECONNRESET') || 
         error.message.includes('ETIMEDOUT') ||
         error.message.includes('fetch failed'));
      
      if ((isTimeout || isNetworkError) && attempt < RETRY_CONFIG.maxRetries) {
        console.warn(`[OpenRechtspraakClient] Network error, retry ${attempt + 1}:`, error);
        await sleep(getRetryDelay(attempt));
        continue;
      }
      
      console.error(`[OpenRechtspraakClient] Fetch failed:`, error);
      return [];
    }
  }
  
  return [];
}

/**
 * Haal volledige uitspraak content op
 */
export async function getUitspraakContent(ecli: string): Promise<string | null> {
  const url = `${RECHTSPRAAK_API_BASE}/uitspraken/content?id=${encodeURIComponent(ecli)}`;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await rateLimitedFetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/xml, application/xml',
          'User-Agent': 'Ro-flow/1.0 (omgevingsvergunning-assistent)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const xmlContent = await response.text();
        return extractTextFromXML(xmlContent);
      }
      
      if (response.status === 429 || response.status >= 500) {
        await sleep(getRetryDelay(attempt));
        continue;
      }
      
      return null;
      
    } catch (error) {
      if (attempt < RETRY_CONFIG.maxRetries) {
        await sleep(getRetryDelay(attempt));
        continue;
      }
      console.error(`[OpenRechtspraakClient] Error fetching content for ${ecli}:`, error);
      return null;
    }
  }
  
  return null;
}

/**
 * Extract plain text from rechtspraak XML document
 */
function extractTextFromXML(xmlContent: string): string {
  const parser = new XMLParser({
    ignoreAttributes: true,
    textNodeName: '#text',
    trimValues: true,
  });
  
  try {
    const result = parser.parse(xmlContent);
    
    // Navigate to the text content
    const uitspraak = result['open-rechtspraak'] || result.uitspraak || result;
    
    // Extract all text nodes recursively
    const textParts: string[] = [];
    extractTextNodes(uitspraak, textParts);
    
    return textParts.join('\n').trim();
  } catch (error) {
    // Fallback: strip XML tags
    return xmlContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

function extractTextNodes(obj: any, result: string[]): void {
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed) result.push(trimmed);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => extractTextNodes(item, result));
  } else if (typeof obj === 'object' && obj !== null) {
    Object.values(obj).forEach(value => extractTextNodes(value, result));
  }
}

/**
 * Zoek omgevingsrecht uitspraken met RO-specifieke filters
 */
export async function zoekOmgevingsrechtUitspraken(
  zoekterm: string,
  options: {
    datumVanaf?: Date;
    max?: number;
    alleenRaadVanState?: boolean;
  } = {}
): Promise<Uitspraak[]> {
  const params: ZoekParams = {
    zoekterm,
    rechtsgebied: RECHTSGEBIED.BESTUURSRECHT,
    datumVanaf: options.datumVanaf,
    max: options.max || 50,
    sort: 'date'
  };
  
  if (options.alleenRaadVanState) {
    params.instantie = INSTANTIE.RAAD_VAN_STATE;
  }
  
  return zoekUitspraken(params);
}

/**
 * Zoek uitspraken op specifieke thema's
 */
export async function zoekUitsprakenOpThema(
  thema: 'omgevingsvergunning' | 'omgevingsplan' | 'bopa' | 'welstand' | 'monument' | 'stikstof' | 'parkeren',
  options: {
    datumVanaf?: Date;
    max?: number;
  } = {}
): Promise<Uitspraak[]> {
  const themaZoektermen: Record<string, string> = {
    omgevingsvergunning: 'omgevingsvergunning',
    omgevingsplan: 'omgevingsplan OR "evenwichtige toedeling van functies"',
    bopa: '"buitenplanse omgevingsplanactiviteit" OR BOPA',
    welstand: 'welstand OR "redelijke eisen van welstand"',
    monument: 'rijksmonument OR "gemeentelijk monument"',
    stikstof: 'stikstof OR "natura 2000" OR depositie',
    parkeren: 'parkeren OR parkeernorm OR parkeerbeleid'
  };
  
  return zoekOmgevingsrechtUitspraken(themaZoektermen[thema], options);
}

/**
 * Batch zoeken met meerdere zoektermen
 */
export async function batchZoekUitspraken(
  zoektermen: string[],
  options: {
    datumVanaf?: Date;
    maxPerZoekterm?: number;
    dedupliceer?: boolean;
  } = {}
): Promise<Uitspraak[]> {
  const alleUitspraken: Uitspraak[] = [];
  const gezienEclis = new Set<string>();
  
  for (const zoekterm of zoektermen) {
    const uitspraken = await zoekOmgevingsrechtUitspraken(zoekterm, {
      datumVanaf: options.datumVanaf,
      max: options.maxPerZoekterm || 20
    });
    
    for (const uitspraak of uitspraken) {
      if (options.dedupliceer !== false && gezienEclis.has(uitspraak.ecli)) {
        continue;
      }
      gezienEclis.add(uitspraak.ecli);
      alleUitspraken.push(uitspraak);
    }
    
    // Small delay between requests to be nice to the API
    await sleep(100);
  }
  
  return alleUitspraken;
}

// Export rechtsgebied constants for external use
export { RECHTSGEBIED, INSTANTIE };
