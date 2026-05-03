/**
 * Omgevingsscan Engine v2
 * "Fetch once, compute many" — datasets are fetched in parallel,
 * then multiple indicators are derived from each dataset.
 * Integrates: PDOK WFS, BAG, Natura2000, Ruimtelijkeplannen, DSO, AERIUS WFS
 */

import { INDICATOR_CATALOG, IndicatorDefinition, INDICATOR_THEMES } from '../../shared/indicatorCatalog';
import { analyseerLocatiePDOK, type PDOKAnalyseResultaat } from './pdokService';
import { haalGebouwInfo, type BagGebouwInfo } from './bagApiService';
import { checkNatura2000 as checkNatura2000Api } from './natura2000ApiService';
import { detecteerBestemmingen, type RuimtelijkePlannenResultaat } from './ruimtelijkeplannenService';
import { haalActiviteitenOp, haalToepasbareRegels, bepaalVergunningCheck, bepaalBevoegdGezag } from './dsoApiService';
import { invokeLLM } from '../_core/llm';
import proj4 from 'proj4';
import { enrichIndicators } from './indicatorEnrichment';
import { fetchAtlasLeefomgevingData, type AtlasLeefomgevingData } from './atlasLeefomgevingService';
import { bevraagBodemloket, type BodemloketResultaat } from './bodemloketService';
import { analyzeGeurbelasting, type GeurAnalyse } from './geurcontourenService';
import { analyseerExterneVeiligheid, type ExterneVeiligheidResult } from './externeVeiligheidService';

// ============ TYPES ============

export interface ScanLocatie {
  adres: string;
  lat: number;
  lng: number;
  gemeente?: string;
  postcode?: string;
  /** Gedetecteerde activiteit uit de PDF (bouw/kap/milieu/sloop/aanleg/functiewijziging) */
  activiteitType?: ActiviteitType;
  /** Samenvatting van het geüploade document */
  documentSamenvatting?: string;
}

/** Activiteittypes voor de omgevingsvergunning */
export type ActiviteitType = 
  | 'bouwen'
  | 'slopen'
  | 'kappen'
  | 'milieu'
  | 'aanleggen'
  | 'functiewijziging'
  | 'reclame'
  | 'uitrit'
  | 'brandveilig_gebruik'
  | 'onbekend';

/** Indicatoren die ALTIJD worden gecheckt ongeacht activiteittype (wettelijke plicht) */
export const ALTIJD_CHECKEN_INDICATOREN: string[] = [
  'NATURA2000',      // Wnb art. 2.7: altijd toetsen op significante effecten
  'STIKSTOF',        // Wnb art. 2.7 + AERIUS: stikstof altijd relevant bij elke activiteit
  'NNN',             // Provinciale verordening: nee-tenzij regime, altijd checken
  'STILTEGEBIED',    // Provinciale verordening: altijd checken bij activiteiten in/nabij stiltegebied
  'ENKELBESTEMMING', // Art. 5.1 Omgevingswet: altijd toetsen aan omgevingsplan
  'DUBBELBESTEMMING',// Art. 3.1 Wro: dubbelbestemmingen altijd meenemen
  'BESTEMMINGSPLAN', // Altijd het geldende plan identificeren
  'DSO_ACTIVITEITEN',// Art. 16.2 Omgevingswet: altijd DSO raadplegen
  'DSO_REGELS',      // Art. 4.7 Omgevingswet: toepasbare regels altijd checken
  'VERGUNNINGCHECK', // Altijd vergunningplicht bepalen
];

/** Wettelijke zoekafstanden per indicator (in meters) — gebaseerd op regelgeving */
export const WETTELIJKE_ZOEKAFSTANDEN: Record<string, { afstand: number; grondslag: string }> = {
  NATURA2000:           { afstand: 25000, grondslag: 'Wnb art. 2.7 — externe werking stikstof tot 25km (AERIUS drempelwaarde)' },
  STIKSTOF:            { afstand: 25000, grondslag: 'Wnb art. 2.7 — AERIUS berekening tot 25km' },
  NNN:                 { afstand: 0,     grondslag: 'Provinciale verordening — nee-tenzij regime geldt alleen als locatie IN NNN valt' },
  STILTEGEBIED:        { afstand: 0,     grondslag: 'Provinciale verordening — geldt alleen als locatie IN stiltegebied valt' },
  WATERKERING:         { afstand: 200,   grondslag: 'Waterschapsverordening — kernzone + beschermingszone (typisch 100-200m)' },
  OVERSTROMINGSRISICO: { afstand: 5000,  grondslag: 'Bkl art. 5.4 — overstromingsrisico beoordelen bij kwetsbare functies' },
  EXTERNE_VEILIGHEID:  { afstand: 1500,  grondslag: 'Bkl art. 5.12-5.18 — invloedsgebied groepsrisico tot ~1500m' },
  BEVI:                { afstand: 1500,  grondslag: 'Bkl art. 5.12 — PR 10⁻⁶ contour + invloedsgebied GR' },
  RISICOCONTOUR:       { afstand: 1500,  grondslag: 'Bkl art. 5.12-5.18 — risicocontouren Bevi-inrichtingen' },
  RIJKSMONUMENT:       { afstand: 50,    grondslag: 'Erfgoedwet art. 3.1 — bescherming monument en directe omgeving' },
  BESCHERMD_GEZICHT:   { afstand: 0,     grondslag: 'Erfgoedwet art. 2.34c — geldt alleen als locatie IN beschermd gezicht valt' },
  WERELDERFGOED:       { afstand: 2000,  grondslag: 'UNESCO Werelderfgoedverdrag — bufferzone werelderfgoed' },
  ARCHEOLOGIE:         { afstand: 0,     grondslag: 'Erfgoedwet art. 3.1 + gemeentelijke vrijstellingsgrenzen' },
  GELUID_WEG:          { afstand: 600,   grondslag: 'Bkl art. 3.35 — geluidaandachtsgebied wegen (max 600m)' },
  GELUID_SPOOR:        { afstand: 600,   grondslag: 'Bkl art. 3.35 — geluidaandachtsgebied spoorwegen (max 600m)' },
  GELUID_INDUSTRIE:    { afstand: 1000,  grondslag: 'Bkl art. 3.35 — geluidaandachtsgebied industrieterreinen' },
  GEURZONE:            { afstand: 500,   grondslag: 'Bal afd. 3.5 — geurbelasting veehouderij (afstandsnormen)' },
  GRONDWATERBESCHERMING: { afstand: 0,   grondslag: 'Provinciale verordening — geldt alleen als locatie IN beschermingsgebied valt' },
  BODEMKWALITEIT:      { afstand: 0,     grondslag: 'Bbl art. 4.3 — bodemkwaliteit op de locatie zelf' },
  LUCHTKWALITEIT:      { afstand: 300,   grondslag: 'Bkl art. 5.53 — NSL/GCN concentratiekaarten' },
  HOOGSPANNING:        { afstand: 200,   grondslag: 'Bkl art. 5.163 — magneetveldzone hoogspanningslijnen' },
  GASLEIDING:          { afstand: 200,   grondslag: 'Bkl art. 5.12 — risicocontour hogedrukaardgasleiding' },
};

/** Mapping van activiteittype naar relevante indicator-codes */
export const ACTIVITEIT_INDICATOR_MATRIX: Record<ActiviteitType, string[]> = {
  bouwen: [
    'ENKELBESTEMMING', 'DUBBELBESTEMMING', 'BOUWVLAK', 'MAATVOERING',
    'WELSTAND', 'BAG_PAND', 'ARCHEOLOGIE', 'BODEMKWALITEIT',
    'GELUID_WEG', 'GELUID_SPOOR', 'GELUID_INDUSTRIE', 'LUCHTKWALITEIT',
    'STIKSTOF', 'NATURA2000', 'NNN', 'EXTERNE_VEILIGHEID', 'BEVI',
    'RISICOCONTOUR', 'OVERSTROMINGSRISICO', 'WATERKERING',
    'FUNDERINGSPROBLEMATIEK', 'HOOGSPANNING', 'GASLEIDING',
    'RIJKSMONUMENT', 'BESCHERMD_GEZICHT', 'WERELDERFGOED',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
    'GRONDWATERBESCHERMING', 'OO',
  ],
  slopen: [
    'BAG_PAND', 'ARCHEOLOGIE', 'BODEMKWALITEIT', 'OO',
    'RIJKSMONUMENT', 'BESCHERMD_GEZICHT', 'WERELDERFGOED',
    'FUNDERINGSPROBLEMATIEK', 'ENKELBESTEMMING', 'DUBBELBESTEMMING',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
  ],
  kappen: [
    'NNN', 'NATURA2000', 'STIKSTOF', 'STILTEGEBIED',
    'BESCHERMDE_SOORTEN', 'ENKELBESTEMMING', 'DUBBELBESTEMMING',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
  ],
  milieu: [
    'GELUID_WEG', 'GELUID_SPOOR', 'GELUID_INDUSTRIE', 'GEURZONE',
    'LUCHTKWALITEIT', 'BODEMKWALITEIT', 'EXTERNE_VEILIGHEID', 'BEVI',
    'RISICOCONTOUR', 'GRONDWATERBESCHERMING', 'WATERKERING',
    'OVERSTROMINGSRISICO', 'NATURA2000', 'STIKSTOF', 'NNN',
    'ENKELBESTEMMING', 'DUBBELBESTEMMING',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
  ],
  aanleggen: [
    'WATERKERING', 'OVERSTROMINGSRISICO', 'GRONDWATERBESCHERMING',
    'NNN', 'NATURA2000', 'STIKSTOF', 'STILTEGEBIED',
    'ARCHEOLOGIE', 'BODEMKWALITEIT', 'OO',
    'ENKELBESTEMMING', 'DUBBELBESTEMMING',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
    'BESCHERMDE_SOORTEN',
  ],
  functiewijziging: [
    'ENKELBESTEMMING', 'DUBBELBESTEMMING', 'BAG_PAND',
    'GELUID_WEG', 'GELUID_SPOOR', 'GELUID_INDUSTRIE', 'GEURZONE',
    'LUCHTKWALITEIT', 'EXTERNE_VEILIGHEID', 'BEVI', 'RISICOCONTOUR',
    'NATURA2000', 'STIKSTOF', 'PARKEREN',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
  ],
  reclame: [
    'ENKELBESTEMMING', 'WELSTAND', 'RIJKSMONUMENT', 'BESCHERMD_GEZICHT',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
  ],
  uitrit: [
    'ENKELBESTEMMING', 'WATERKERING',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
  ],
  brandveilig_gebruik: [
    'BAG_PAND', 'ENKELBESTEMMING', 'EXTERNE_VEILIGHEID', 'BEVI',
    'RISICOCONTOUR',
    'DSO_ACTIVITEITEN', 'DSO_REGELS', 'VERGUNNINGCHECK',
  ],
  onbekend: [], // Lege array = alle indicatoren worden getoond
};

export interface IndicatorResult {
  code: string;
  theme: string;
  humanName: string;
  status: 'relevant' | 'niet_relevant' | 'aandachtspunt' | 'onbekend' | 'error';
  waarde: string;
  toelichting: string;
  bronnen: string[];
  afstandM?: number;
  rawData?: any;
  /** Wettelijke grondslag: artikelnummers en wetten */
  wettelijkeGrondslag?: string;
  /** Mogelijke consequenties voor de aanvrager */
  consequenties?: string;
  /** Suggesties: welke onderzoeken/adviezen worden aanbevolen (suggestief, niet dwingend) */
  suggesties?: string[];
  /** Waarom is deze indicator relevant bij dit type aanvraag? */
  relevantieToelichting?: string;
}

export interface ScanResultaat {
  locatie: ScanLocatie;
  timestamp: string;
  duurMs: number;
  indicatoren: IndicatorResult[];
  samenvatting: {
    totaal: number;
    relevant: number;
    aandachtspunten: number;
    nietRelevant: number;
    onbekend: number;
    errors: number;
  };
  themaOverzicht: {
    theme: string;
    label: string;
    color: string;
    indicatoren: IndicatorResult[];
    heeftAandachtspunten: boolean;
  }[];
  dsoData?: {
    activiteiten: any[];
    regels: any[];
  };
  /** GeoJSON features for map visualization */
  geoFeatures?: GeoFeature[];
  /** BOPA-detectie: past de aanvraag binnen het omgevingsplan? */
  procedureBeoordeling?: {
    type: 'regulier' | 'bopa' | 'uitgebreid' | 'onbekend';
    toelichting: string;
    redenen: string[];
    wettelijkeGrondslag: string;
    aanbeveling: string;
  };
}

export interface GeoFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  properties: {
    layer: string;       // e.g. 'natura2000', 'spoorweg', 'rijksmonument', 'bevi', 'nationaalpark'
    name: string;        // human-readable name
    color: string;       // hex color for rendering
    fillOpacity?: number;
    strokeWidth?: number;
    indicatorCode?: string; // link to indicator
    // Relevantie-velden voor contextafhankelijke weergave
    relevance?: 'hoog' | 'midden' | 'laag' | 'achtergrond'; // impact-niveau voor deze aanvraag
    afstandM?: number;       // afstand tot aanvraaglocatie in meters
    relevanceToelichting?: string; // waarom dit relevant is voor deze aanvraag
  };
}

// ============ COORDINATE CONVERSION ============

// Define RD New (EPSG:28992) projection
proj4.defs('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs');

function wgs84ToRD(lon: number, lat: number): [number, number] {
  return proj4('EPSG:4326', 'EPSG:28992', [lon, lat]) as [number, number];
}

// ============ HELPER FUNCTIONS ============

function createBBox(lon: number, lat: number, bufferMeters: number): string {
  const latBuffer = bufferMeters / 111000;
  const lonBuffer = bufferMeters / (111000 * Math.cos(lat * Math.PI / 180));
  return `${lon - lonBuffer},${lat - latBuffer},${lon + lonBuffer},${lat + latBuffer}`;
}

function createRDBBox(lon: number, lat: number, bufferMeters: number): string {
  const [rdX, rdY] = wgs84ToRD(lon, lat);
  return `${rdX - bufferMeters},${rdY - bufferMeters},${rdX + bufferMeters},${rdY + bufferMeters}`;
}

/**
 * Check of een locatie binnen het Natuurnetwerk Nederland (NNN) ligt
 * via de PDOK NNN WMS GetFeatureInfo API.
 * Geeft een definitief ja/nee antwoord.
 */
async function fetchNNNCheck(lon: number, lat: number): Promise<{ binnenNNN: boolean; features: any[] }> {
  try {
    const [rdX, rdY] = wgs84ToRD(lon, lat);
    const buffer = 50; // 50m buffer
    const bbox = `${rdX - buffer},${rdY - buffer},${rdX + buffer},${rdY + buffer}`;
    const url = `https://service.pdok.nl/provincies/natuurnetwerk-nederland/wms/v1_0?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=PS.ProtectedSite&QUERY_LAYERS=PS.ProtectedSite&INFO_FORMAT=application/json&CRS=EPSG:28992&BBOX=${bbox}&WIDTH=256&HEIGHT=256&I=128&J=128`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { binnenNNN: false, features: [] };
    const data = await response.json();
    const features = data.features || [];
    return { binnenNNN: features.length > 0, features };
  } catch (error) {
    console.error('[Engine] NNN WMS check failed:', (error as Error).message);
    return { binnenNNN: false, features: [] };
  }
}

/**
 * Check of een locatie in een stiltegebied ligt
 * via de PDOK Stiltegebieden WMS GetFeatureInfo API.
 * Returns features with name and classification.
 */
async function fetchStiltegebiedCheck(lon: number, lat: number): Promise<{ binnenStiltegebied: boolean; naam: string; features: any[] }> {
  try {
    const [rdX, rdY] = wgs84ToRD(lon, lat);
    const buffer = 50; // 50m buffer
    const bbox = `${rdX - buffer},${rdY - buffer},${rdX + buffer},${rdY + buffer}`;
    const url = `https://service.pdok.nl/provincies/stiltegebieden/wms/v1_0?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=PS.ProtectedSite&QUERY_LAYERS=PS.ProtectedSite&INFO_FORMAT=application/json&CRS=EPSG:28992&BBOX=${bbox}&WIDTH=256&HEIGHT=256&I=128&J=128`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { binnenStiltegebied: false, naam: '', features: [] };
    const data = await response.json();
    const features = data.features || [];
    const naam = features[0]?.properties?.siteNameSpelling || features[0]?.properties?.naam || '';
    return { binnenStiltegebied: features.length > 0, naam, features };
  } catch (error) {
    console.error('[Engine] Stiltegebied WMS check failed:', (error as Error).message);
    return { binnenStiltegebied: false, naam: '', features: [] };
  }
}

/**
 * Check of een locatie in een grondwaterbeschermingsgebied ligt
 * via de PDOK Grondwaterbeschermingsgebieden WMS GetFeatureInfo API.
 * Vereist EPSG:28992 (RD) coördinaten.
 */
async function fetchGrondwaterBescherming(lon: number, lat: number): Promise<any[]> {
  try {
    const [rdX, rdY] = wgs84ToRD(lon, lat);
    const buffer = 500; // 500m buffer
    const bbox = `${rdX - buffer},${rdY - buffer},${rdX + buffer},${rdY + buffer}`;
    const url = `https://service.pdok.nl/provincies/grondwaterbeschermingsgebieden/wms/v1_0?service=WMS&version=1.3.0&request=GetFeatureInfo&layers=AM.DrinkingWaterProtectionArea&query_layers=AM.DrinkingWaterProtectionArea&crs=EPSG:28992&bbox=${bbox}&width=256&height=256&info_format=application/json&i=128&j=128`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('[Engine] Grondwaterbescherming WMS failed:', (error as Error).message);
    return [];
  }
}

/** Fetch with retry logic to handle ECONNRESET from PDOK rate limiting */
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errMsg = (error as Error).message || '';
      const isRetryable = errMsg.includes('fetch failed') || errMsg.includes('ECONNRESET') || errMsg.includes('ETIMEDOUT') || errMsg.includes('socket');
      if (isLastAttempt || !isRetryable) throw error;
      // Exponential backoff: 500ms, 1500ms, 3500ms
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`[Engine] Retry ${attempt + 1}/${maxRetries} for ${url.substring(0, 80)}... (waiting ${Math.round(delay)}ms)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

// In-memory cache for API responses (H5)
const apiCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | undefined {
  const entry = apiCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { apiCache.delete(key); return undefined; }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  if (apiCache.size > 500) {
    const keys = Array.from(apiCache.keys()).slice(0, 125);
    keys.forEach(k => apiCache.delete(k));
  }
  apiCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchWFS(baseUrl: string, typeName: string, bbox: string, maxFeatures = 100, srs = 'EPSG:4326'): Promise<any[]> {
  const cacheKey = `wfs:${typeName}:${bbox}:${maxFeatures}:${srs}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    // WFS 2.0 with EPSG:4326 uses lat,lng axis order, but createBBox returns lng,lat order
    // We need to swap the coordinates for WFS calls with EPSG:4326
    let wfsBbox = bbox;
    if (srs === 'EPSG:4326') {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4) {
        // Swap from lng,lat,lng,lat to lat,lng,lat,lng
        wfsBbox = `${parts[1]},${parts[0]},${parts[3]},${parts[2]}`;
      }
    }
    const url = `${baseUrl}?service=WFS&version=2.0.0&request=GetFeature&typeName=${typeName}&outputFormat=application/json&srsName=${srs}&bbox=${wfsBbox},${srs}&count=${maxFeatures}`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return [];
    const data = await response.json();
    const features = data.features || [];
    setCache(cacheKey, features);
    return features;
  } catch (error) {
    console.error(`[Engine] WFS failed ${typeName}:`, (error as Error).message);
    return [];
  }
}

async function fetchOGCAPI(baseUrl: string, collection: string, bbox: string, limit = 100): Promise<any[]> {
  const cacheKey = `ogc:${collection}:${bbox}:${limit}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${baseUrl}/collections/${collection}/items?bbox=${bbox}&f=json&limit=${limit}`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return [];
    const data = await response.json();
    const features = data.features || [];
    setCache(cacheKey, features);
    return features;
  } catch (error) {
    console.error(`[Engine] OGC API failed ${collection}:`, (error as Error).message);
    return [];
  }
}

function berekenAfstand(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function closestDist(features: any[], lon: number, lat: number): number | null {
  let min: number | null = null;
  for (const f of features) {
    let fLon: number, fLat: number;
    if (f.geometry?.type === 'Point') {
      [fLon, fLat] = f.geometry.coordinates;
    } else if (f.geometry?.coordinates) {
      const coords = JSON.stringify(f.geometry.coordinates);
      const nums = coords.match(/-?\d+\.?\d*/g)?.map(Number) || [];
      if (nums.length < 2) continue;
      const lons = nums.filter((_, i) => i % 2 === 0);
      const lats = nums.filter((_, i) => i % 2 === 1);
      fLon = lons.reduce((a, b) => a + b, 0) / lons.length;
      fLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    } else continue;
    const d = berekenAfstand(lon, lat, fLon!, fLat!);
    if (min === null || d < min) min = d;
  }
  return min;
}

// ============ DATASET FETCHERS ============
// Each fetcher returns raw features. Called once, results shared across indicators.

/**
 * Fetch terrain height (NAP) from AHN WCS.
 * Returns height in meters relative to NAP (Normaal Amsterdams Peil).
 * Negative values = below sea level.
 */
async function fetchAHNHoogte(lon: number, lat: number): Promise<number | null> {
  try {
    const [rdX, rdY] = wgs84ToRD(lon, lat);
    // Request a 1x1 meter area around the point
    const url = `https://service.pdok.nl/rws/ahn/wcs/v1_0?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=dtm_05m&format=image/tiff&subset=x(${Math.floor(rdX)},${Math.floor(rdX) + 1})&subset=y(${Math.floor(rdY)},${Math.floor(rdY) + 1})`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    // Parse GeoTIFF: find the float32 pixel value
    // Simple TIFF parser for single-band float32
    const view = new DataView(buffer);
    const littleEndian = view.getUint16(0) === 0x4949;
    // Find IFD offset
    const ifdOffset = view.getUint32(4, littleEndian);
    const numEntries = view.getUint16(ifdOffset, littleEndian);
    let stripOffset = 0;
    let bitsPerSample = 32;
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tag = view.getUint16(entryOffset, littleEndian);
      const value = view.getUint32(entryOffset + 8, littleEndian);
      if (tag === 273) stripOffset = value; // StripOffsets
      if (tag === 258) bitsPerSample = value; // BitsPerSample
    }
    if (stripOffset > 0 && bitsPerSample === 32) {
      const height = view.getFloat32(stripOffset, littleEndian);
      if (height > -100 && height < 500) return Math.round(height * 100) / 100;
    }
    return null;
  } catch (error) {
    console.error('[Engine] AHN WCS failed:', (error as Error).message);
    return null;
  }
}

/**
 * Fetch soil type from BRO Bodemkaart WMS via GetFeatureInfo.
 * Returns soil code and name (e.g., "Vn" = veengrond).
 */
async function fetchBodemType(lon: number, lat: number): Promise<{ soilcode: string; soilname: string } | null> {
  try {
    const [rdX, rdY] = wgs84ToRD(lon, lat);
    // Create a small bbox around the point (100m x 100m)
    const bbox = `${rdX - 50},${rdY - 50},${rdX + 50},${rdY + 50}`;
    const url = `https://service.pdok.nl/bzk/bro-bodemkaart/wms/v1_0?service=WMS&version=1.3.0&request=GetFeatureInfo&layers=soilarea&query_layers=soilarea&crs=EPSG:28992&bbox=${bbox}&width=100&height=100&info_format=application/json&i=50&j=50`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const data = await response.json();
    const feature = data?.features?.[0];
    if (feature?.properties) {
      return {
        soilcode: feature.properties.first_soilcode || feature.properties.soilcode || '',
        soilname: feature.properties.first_soilname || feature.properties.normal_soilprofile_name || '',
      };
    }
    return null;
  } catch (error) {
    console.error('[Engine] Bodemkaart WMS failed:', (error as Error).message);
    return null;
  }
}

/**
 * Fetch RRGS (Risico Register Gevaarlijke Stoffen) data from RIVM.
 * Contains LPG stations, BRZO bedrijven, vuurwerkopslag, etc.
 * Uses RD coordinates (EPSG:28992).
 */
async function fetchRRGS(lon: number, lat: number, bufferMeters: number): Promise<any[]> {
  try {
    const [rdX, rdY] = wgs84ToRD(lon, lat);
    const bbox = `${rdX - bufferMeters},${rdY - bufferMeters},${rdX + bufferMeters},${rdY + bufferMeters}`;
    const url = `https://data.rivm.nl/geo/alo/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=alo:rrgs_terreingrenzen_01012023&outputFormat=application/json&srsName=EPSG:28992&bbox=${bbox},EPSG:28992&count=20`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('[Engine] RRGS WFS failed:', (error as Error).message);
    return [];
  }
}

/**
 * Fetch aardkundige waarden (geological/geomorphological values) via Provincies WMS.
 * Returns protected site features with classification.
 */
async function fetchAardkundigeWaarden(lon: number, lat: number): Promise<any[]> {
  try {
    const [rdX, rdY] = wgs84ToRD(lon, lat);
    const buffer = 500;
    const bbox = `${rdX - buffer},${rdY - buffer},${rdX + buffer},${rdY + buffer}`;
    const url = `https://service.pdok.nl/provincies/aardkundige-waarden/wms/v1_0?service=WMS&version=1.3.0&request=GetFeatureInfo&layers=PS.ProtectedSite&query_layers=PS.ProtectedSite&info_format=application/json&crs=EPSG:28992&bbox=${bbox}&width=256&height=256&i=128&j=128`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('[Engine] Aardkundige waarden WMS failed:', (error as Error).message);
    return [];
  }
}

/**
 * Fetch watergangen (waterways) from BGT OGC API.
 * Returns waterdeel features within the given buffer.
 */
async function fetchWatergangen(lon: number, lat: number, bufferMeters: number): Promise<any[]> {
  try {
    const latBuffer = bufferMeters / 111000;
    const lonBuffer = bufferMeters / (111000 * Math.cos(lat * Math.PI / 180));
    const bbox = `${lon - lonBuffer},${lat - latBuffer},${lon + lonBuffer},${lat + latBuffer}`;
    const url = `https://api.pdok.nl/lv/bgt/ogc/v1/collections/waterdeel/items?bbox=${bbox}&f=json&limit=20`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('[Engine] BGT Waterdeel failed:', (error as Error).message);
    return [];
  }
}

interface DatasetBundle {
  pdok: PDOKAnalyseResultaat | null;
  natura2000: any;
  bestemmingen: RuimtelijkePlannenResultaat | null;
  spoorwegen: any[];
  stations: any[];
  nwbWegen: any[];
  brpGewas: any[];
  revKwetsbaar: any[];
  revBuisleiding: any[];
  revLpg: any[];
  revVuurwerk: any[];
  rijksmonumenten: any[];
  beschermdGezicht: any[];
  ikaw: any[];
  histBuitenplaats: any[];
  werelderfgoed: any[];
  nnn: { binnenNNN: boolean; features: any[] };
  stiltegebied: { binnenStiltegebied: boolean; naam: string; features: any[] };
  beschermdNatuur: any[];
  nationaalPark: any[];
  waterkering: any[];
  grondwaterBescherming: any[];
  watergang: any[];
  zwemwater: any[];
  bodemOnderzoek: any[];
  oo: any[];
  aardkundig: any[];
  fgr: any[];
  aeriusDepositie: any[];
  dsoActiviteiten: any[];
  dsoRegels: any[];
  ahnHoogte: number | null;
  bodemType: { soilcode: string; soilname: string } | null;
  funderingsproblematiek: any[];
  overstromingsRisico: any[];
  natura2000Polygonen: any[];
  spoorwegenTrace: any[];
  atlasLeefomgeving: AtlasLeefomgevingData | null;
  vergunningCheck: any;
  bevoegdGezag: any;
  bodemloket: BodemloketResultaat | null;
  geurAnalyse: GeurAnalyse | null;
  externeVeiligheid: ExterneVeiligheidResult | null;
}

async function fetchAllDatasets(lat: number, lng: number): Promise<DatasetBundle> {
  const bbox50 = createBBox(lng, lat, 50);
  const bbox100 = createBBox(lng, lat, 100);
  const bbox200 = createBBox(lng, lat, 200);
  const bbox500 = createBBox(lng, lat, 500);
  const bbox800 = createBBox(lng, lat, 800);
  const bbox1000 = createBBox(lng, lat, 1000);
  const bbox1500 = createBBox(lng, lat, 1500);
  const bbox5000 = createBBox(lng, lat, 5000);
  const bbox10000 = createBBox(lng, lat, 10000);
  const bbox15000 = createBBox(lng, lat, 15000);
  const bbox25000 = createBBox(lng, lat, 25000);
  const rdBbox500 = createRDBBox(lng, lat, 500);

  // All fetches in parallel
  const [
    pdok, natura2000, bestemmingen,
    spoorwegen, stations, nwbWegen, brpGewas,
    revKwetsbaar, revBuisleiding, revLpg, revVuurwerk,
    rijksmonumenten, beschermdGezicht, ikaw, histBuitenplaats, werelderfgoed,
    nnn, stiltegebied, beschermdNatuur, nationaalPark,
    waterkering, grondwaterBescherming, watergang, zwemwater,
    bodemOnderzoek, oo, aardkundig, fgr,
    aeriusDepositie,
    dsoActiviteiten, dsoRegels,
    ahnHoogte, bodemType,
    funderingsproblematiek, overstromingsRisico,
    natura2000Polygonen, spoorwegenTrace,
  ] = await Promise.all([
    // 1. PDOK combined (BAG, Kadaster, BGT, etc.)
    analyseerLocatiePDOK(lng, lat).catch(() => null),
    // 2. Natura 2000
    checkNatura2000Api(lat, lng).catch(() => null),
    // 3. Ruimtelijke plannen
    detecteerBestemmingen(lat, lng).catch(() => null),
    // 4. Spoorwegen (OGC API)
    fetchOGCAPI('https://api.pdok.nl/prorail/spoorwegen/ogc/v1', 'trace', bbox1500, 20),
    fetchOGCAPI('https://api.pdok.nl/prorail/spoorwegen/ogc/v1', 'station', bbox5000, 10),
    // 5. NWB Wegen (shared: geluid weg, luchtkwaliteit, rijksweg)
    fetchWFS('https://service.pdok.nl/rws/nwbwegen/wfs/v1_0', 'nwbwegen:wegvakken', bbox200, 20),
    // 6. BRP Gewaspercelen (shared: gewas, glastuinbouw, landbouwgrond, spuitzone)
    fetchWFS('https://service.pdok.nl/rvo/brpgewaspercelen/wfs/v1_0', 'brpgewaspercelen:brpgewaspercelen', bbox50),
    // 7. REV Risicokaart (OGC API) — productie-installaties en productiefaciliteiten
    fetchOGCAPI('https://api.pdok.nl/rws/productie-en-industrie-productie-installaties/ogc/v1', 'production_installation_point', bbox1500, 20),
    fetchOGCAPI('https://api.pdok.nl/rws/productie-en-industrie-productiefaciliteiten/ogc/v1', 'production_facility_point', bbox1500, 20),
    // REV LPG & Vuurwerk via RRGS (RIVM) — uses RD coordinates
    fetchRRGS(lng, lat, 2000).then(features => features.filter((f: any) => f.properties?.type_inr === 'LPG')),
    fetchRRGS(lng, lat, 2000).then(features => features.filter((f: any) => (f.properties?.type_inr || '').toUpperCase().includes('VUURWERK'))),
    // 8. Erfgoed (shared: monument, gezicht, archeologie, buitenplaats, werelderfgoed)
    fetchWFS('https://service.pdok.nl/rce/ps-ch/wfs/v1_0', 'ps-ch:rce_inspire_points', bbox500),
    fetchWFS('https://service.pdok.nl/rce/ps-ch/wfs/v1_0', 'ps-ch:rce_inspire_polygons', bbox100),
    // IKAW, historische buitenplaatsen, werelderfgoed — via RCE Beschermde Gebieden Cultuurhistorie OGC API
    fetchOGCAPI('https://api.pdok.nl/rce/beschermde-gebieden-cultuurhistorie/ogc/v1', 'rce_inspire_polygons', bbox1000, 20),  // ikaw/cultuurhistorie polygons
    fetchOGCAPI('https://api.pdok.nl/rce/beschermde-gebieden-cultuurhistorie/ogc/v1', 'rce_inspire_points', bbox5000, 10),  // histBuitenplaats/cultuurhistorie points
    // Werelderfgoed: filter from RCE beschermde gebieden for UNESCO designation
    fetchWFS('https://service.pdok.nl/rce/ps-ch/wfs/v1_0', 'ps-ch:rce_inspire_polygons', bbox10000, 20)
      .then(features => features.filter((f: any) => {
        const scheme = (f.properties?.designationscheme || f.properties?.designationScheme || '').toLowerCase();
        const desig = (f.properties?.designation || '').toLowerCase();
        return scheme.includes('werelderfgoed') || scheme.includes('world heritage') || desig.includes('werelderfgoed') || desig.includes('unesco');
      })),
    // 9. Natuur (shared: NNN, beschermd, nationaal park)
    // NNN: via PDOK NNN WMS GetFeatureInfo (definitief ja/nee)
    fetchNNNCheck(lng, lat).catch(() => ({ binnenNNN: false, features: [] })),
    // Stiltegebied: via PDOK Stiltegebieden WMS GetFeatureInfo
    fetchStiltegebiedCheck(lng, lat).catch(() => ({ binnenStiltegebied: false, naam: '', features: [] })),
    // beschermdNatuur: Natura 2000 gebieden als beschermde natuur (via WFS 10km radius)
    fetchWFS('https://service.pdok.nl/rvo/natura2000/wfs/v1_0', 'natura2000:natura2000', bbox10000, 20),
    // nationaalPark: via OGC API
    fetchOGCAPI('https://api.pdok.nl/rvo/nationale-parken/ogc/v1', 'nationaleparken', bbox5000, 10),
    // 10. Water — waterkering via OGC API (overstromingsrisico), grondwater via WMS
    fetchOGCAPI('https://api.pdok.nl/rws/overstromingen-risicogebied/ogc/v1', 'risk_zone', bbox1000, 10),  // waterkering
    fetchGrondwaterBescherming(lng, lat),  // grondwaterBescherming via PDOK WMS GetFeatureInfo
    // Watergang via BGT OGC API waterdeel
    fetchWatergangen(lng, lat, 200),
    Promise.resolve([]),  // zwemwater (geen werkend publiek endpoint beschikbaar)
    // 11. Bodem — geen apart bodemonderzoek endpoint, bodemType via BRO WMS is al opgenomen
    Promise.resolve([]),  // bodemOnderzoek (geen werkend publiek endpoint)
    // 12. Ontplofbare oorlogsresten — geen werkend publiek endpoint
    Promise.resolve([]),  // oo (geen werkend publiek endpoint)
    // 13. Landschap — aardkundige waarden via Provincies WMS, FGR via PDOK WFS
    fetchAardkundigeWaarden(lng, lat),
    fetchWFS('https://service.pdok.nl/rvo/fysisch-geografische-regios/wfs/v1_0', 'fysischgeografischeregios:fysischgeografischeregios', bbox100, 5),
    // 14. AERIUS depositie (RD coordinates)
    fetchWFS('https://connect.aerius.nl/opendata/wfs', 'depositions:depositions', rdBbox500, 10, 'EPSG:28992'),
    // 15. DSO activiteiten
    haalActiviteitenOp(undefined, { locatie: { type: 'Point', coordinates: [lng, lat] } }).then(r => r.success ? r.data?.activiteiten || [] : []).catch(() => []),
    // 16. DSO toepasbare regels
    haalToepasbareRegels({ type: 'Point', coordinates: [lng, lat] }).then(r => r.success ? r.data?.regels || [] : []).catch(() => []),
    // 17. AHN hoogte (NAP) via WCS
    fetchAHNHoogte(lng, lat),
    // 18. BRO Bodemkaart via WMS GetFeatureInfo
    fetchBodemType(lng, lat),
    // 19. Funderingsproblematiek (OGC API)
    fetchOGCAPI('https://api.pdok.nl/rvo/indicatieve-aandachtsgebieden-funderingsproblematiek/ogc/v1', 'indgebfunderingsproblematiek', bbox100, 5),
    // 20. Overstromingsrisico (OGC API) — wider bbox for broader risk assessment
    fetchOGCAPI('https://api.pdok.nl/rws/overstromingen-risicogebied/ogc/v1', 'risk_zone', bbox5000, 10),
    // 21. Natura 2000 polygonen (WFS) — 25km radius (Wnb art. 2.7: stikstof externe werking)
    fetchWFS('https://service.pdok.nl/rvo/natura2000/wfs/v1_0', 'natura2000:natura2000', bbox25000, 20),
    // 22. Spoorwegen trace (WFS) — for map visualization (wider bbox)
    fetchWFS('https://service.pdok.nl/prorail/spoorwegen/wfs/v1_0', 'spoorwegen:trace', bbox5000, 20),
  ]);

  // Fetch Atlas Leefomgeving data separately (not in the main Promise.all to avoid overwhelming APIs)
  const atlasLeefomgeving = await fetchAtlasLeefomgevingData(lat, lng).catch((err) => {
    console.error('[Engine] Atlas Leefomgeving fetch failed:', (err as Error).message);
    return null;
  });

  // Fetch Bodemloket, Geurcontouren and Externe Veiligheid in parallel
  const [bodemloket, geurAnalyse] = await Promise.all([
    bevraagBodemloket(lat, lng).catch((err) => {
      console.error('[Engine] Bodemloket fetch failed:', (err as Error).message);
      return null;
    }),
    analyzeGeurbelasting(lng, lat, 500).catch((err) => {
      console.error('[Engine] Geurcontouren fetch failed:', (err as Error).message);
      return null;
    }),
  ]);

  // DSO Vergunningcheck: use the fetched activiteiten to determine vergunningplicht
  let vergunningCheck: any = null;
  let bevoegdGezag: any = null;
  const dsoActs = (dsoActiviteiten as any[]) || [];
  if (dsoActs.length > 0) {
    const actIds = dsoActs.slice(0, 10).map((a: any) => a.identificatie || a.id).filter(Boolean);
    if (actIds.length > 0) {
      const locatieObj = { type: 'Point' as const, coordinates: [lng, lat] };
      const [vcResult, bgResult] = await Promise.all([
        bepaalVergunningCheck(actIds, locatieObj).catch((err) => {
          console.error('[Engine] DSO vergunningcheck failed:', (err as Error).message);
          return { success: false, error: (err as Error).message };
        }),
        bepaalBevoegdGezag(actIds, locatieObj).catch((err) => {
          console.error('[Engine] DSO bevoegd gezag failed:', (err as Error).message);
          return { success: false, error: (err as Error).message };
        }),
      ]);
      if (vcResult.success && 'data' in vcResult) vergunningCheck = vcResult.data;
      if (bgResult.success && 'data' in bgResult) bevoegdGezag = bgResult.data;
    }
  }

  return {
    pdok, natura2000, bestemmingen,
    spoorwegen, stations, nwbWegen, brpGewas,
    revKwetsbaar, revBuisleiding, revLpg, revVuurwerk,
    rijksmonumenten, beschermdGezicht, ikaw, histBuitenplaats, werelderfgoed,
    nnn, stiltegebied, beschermdNatuur, nationaalPark,
    waterkering, grondwaterBescherming, watergang, zwemwater,
    bodemOnderzoek, oo, aardkundig, fgr,
    aeriusDepositie,
    dsoActiviteiten: dsoActiviteiten as any[],
    dsoRegels: dsoRegels as any[],
    ahnHoogte: ahnHoogte as number | null,
    bodemType: bodemType as { soilcode: string; soilname: string } | null,
    funderingsproblematiek,
    overstromingsRisico,
    natura2000Polygonen,
    spoorwegenTrace,
    atlasLeefomgeving,
    vergunningCheck,
    bevoegdGezag,
    bodemloket,
    geurAnalyse,
    externeVeiligheid: null, // Will be computed after indicators using REV data
  };
}

// ============ INDICATOR COMPUTERS ============
// Pure functions: take dataset results, return indicator results. No API calls.

function computeBasisIndicatoren(d: DatasetBundle, lat: number, lng: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const pdok = d.pdok;

  // BAG_PAND
  if (pdok?.bag?.pand) {
    const p = pdok.bag.pand;
    const vo = pdok.bag.verblijfsobject;
    results.push({
      code: 'BAG_PAND', theme: 'basis', humanName: 'BAG Pandgegevens',
      status: 'relevant',
      waarde: `Bouwjaar ${p.bouwjaar}, ${vo?.gebruiksdoel?.join(', ') || 'onbekend gebruiksdoel'}`,
      toelichting: `Pand uit ${p.bouwjaar}, status: ${p.status}. ${vo ? `Oppervlakte: ${vo.oppervlakte} m², gebruiksdoel: ${vo.gebruiksdoel.join(', ')}.` : ''} De Basisregistratie Adressen en Gebouwen (BAG) is een wettelijke registratie (Wet BAG). Het bouwjaar is relevant voor asbest (vóór 1994), funderingsrisico (vóór 1970) en energielabel. Het gebruiksdoel bepaalt welke activiteiten vergunningvrij zijn (Bbl bijlage II).`,
      bronnen: ['BAG Kadaster', 'Wet BAG'],
    });
  } else {
    results.push({ code: 'BAG_PAND', theme: 'basis', humanName: 'BAG Pandgegevens', status: 'onbekend', waarde: 'Geen pandgegevens gevonden', toelichting: 'Geen BAG-pand gevonden op deze locatie. Dit kan betekenen dat het een onbebouwd perceel betreft, of dat het pand nog niet is geregistreerd in de Basisregistratie Adressen en Gebouwen (Wet BAG).', bronnen: ['BAG Kadaster', 'Wet BAG'] });
  }

  // KADASTER
  if (pdok?.kadaster?.perceel) {
    const k = pdok.kadaster.perceel;
    results.push({
      code: 'KADASTER', theme: 'basis', humanName: 'Kadastraal perceel',
      status: 'relevant',
      waarde: `${k.gemeente} ${k.sectie} ${k.perceelnummer}`,
      toelichting: `Kadastraal perceel: ${k.gemeente} sectie ${k.sectie} nr ${k.perceelnummer}. Oppervlakte: ${k.oppervlakte} m². De kadastrale registratie (Kadasterwet) is de basis voor eigendomsinformatie. De perceelgrenzen bepalen het plangebied voor de vergunningaanvraag. Bij grensoverschrijdende bouw is toestemming van de eigenaar van het aangrenzende perceel vereist (art. 5:1 BW).`,
      bronnen: ['Kadaster', 'Kadasterwet'],
    });
  } else {
    results.push({ code: 'KADASTER', theme: 'basis', humanName: 'Kadastraal perceel', status: 'onbekend', waarde: 'Geen kadastergegevens', toelichting: 'Geen kadastraal perceel gevonden op deze coördinaten. Controleer of de locatie correct is. Kadastrale informatie is essentieel voor de vergunningaanvraag (Kadasterwet).', bronnen: ['Kadaster', 'Kadasterwet'] });
  }

  // GRONDGEBRUIK
  const bgtFunctie = pdok?.bgt?.wegdelen?.[0]?.functie || pdok?.bgt?.groenvoorzieningen?.[0]?.functie || null;
  results.push({
    code: 'GRONDGEBRUIK', theme: 'basis', humanName: 'Grondgebruik (BGT)',
    status: pdok?.bgt ? 'relevant' : 'onbekend',
    waarde: bgtFunctie || (pdok?.bgt ? `${pdok.bgt.totaalVerhard}m² verhard, ${pdok.bgt.totaalGroen}m² groen` : 'Onbekend'),
    toelichting: pdok?.bgt ? `BGT: ${pdok.bgt.totaalVerhard}m² verhard, ${pdok.bgt.totaalGroen}m² groen. ${pdok.bgt.wegdelen.length} wegdelen, ${pdok.bgt.waterdelen.length} waterdelen. De Basisregistratie Grootschalige Topografie (BGT) is een wettelijke registratie (Wet BGT). De verhouding verhard/onverhard is relevant voor watercompensatie (Keur waterschap) en het bepalen van de hemelwaterafvoer.` : 'Geen BGT-data beschikbaar. De BGT (Wet BGT) bevat informatie over verharding, groen en water die relevant is voor watercompensatie.',
    bronnen: ['BGT', 'Wet BGT'],
  });

  // GRONDWATERSTAND
  const gwBeschermd = pdok?.grondwater?.binnenBeschermingsgebied;
  const gwZones = pdok?.grondwater?.zones || [];
  results.push({
    code: 'GRONDWATERSTAND', theme: 'basis', humanName: 'Grondwaterbescherming',
    status: gwBeschermd ? 'aandachtspunt' : (gwZones.length > 0 ? 'relevant' : 'onbekend'),
    waarde: gwBeschermd ? `Binnen grondwaterbeschermingsgebied` : (gwZones.length > 0 ? `${gwZones.length} zone(s) in omgeving` : 'Geen grondwaterdata'),
    toelichting: gwBeschermd ? `Locatie binnen grondwaterbeschermingsgebied. Zones: ${gwZones.map(z => z.naam).join(', ')}. In grondwaterbeschermingsgebieden gelden strenge regels voor bodemactiviteiten, opslag van gevaarlijke stoffen en ondergronds bouwen (Provinciale Omgevingsverordening, art. 7.11 Bkl). Een vergunning of melding bij de provincie kan vereist zijn.` : 'Geen grondwaterbeschermingszones gevonden op basis van PDOK-data. Raadpleeg ook de provinciale omgevingsverordening.',
    bronnen: ['PDOK Grondwaterbescherming', 'Provinciale Omgevingsverordening', 'Bkl art. 7.11'],
  });

  // GEMEENTE — not directly in PDOKAnalyseResultaat, derive from kadaster
  const gemeente = pdok?.kadaster?.perceel?.gemeente || 'Onbekend';
  results.push({
    code: 'GEMEENTE', theme: 'basis', humanName: 'Gemeente',
    status: 'relevant',
    waarde: gemeente,
    toelichting: `Gemeente: ${gemeente}. De gemeente is het bevoegd gezag voor de meeste omgevingsvergunningen (art. 5.8 Omgevingswet). Het gemeentelijk omgevingsplan bevat de lokale regels voor bouwen en gebruik. Raadpleeg ook het gemeentelijk welstandsbeleid en de lokale verordeningen.`,
    bronnen: ['PDOK Kadaster', 'Omgevingswet art. 5.8'],
  });

  return results;
}

function computePlanIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const b = d.bestemmingen;
  
  // ---- Bestemmingsplannen ----
  const bps = b?.bestemmingsplannen || [];
  const hoofdPlan = bps.find(p => p.status === 'onherroepelijk' || p.status === 'vastgesteld') || bps[0];
  const planNaam = hoofdPlan?.naam || b?.plannen?.[0]?.naam || 'Onbekend';
  const planType = hoofdPlan?.type || b?.plannen?.[0]?.type || 'type onbekend';
  const planStatus = hoofdPlan?.status || b?.plannen?.[0]?.status || 'onbekend';
  const allePlannen = b?.plannen || [];

  results.push({
    code: 'BESTEMMINGSPLAN', theme: 'planologie', humanName: 'Bestemmingsplan / Omgevingsplan',
    status: b && allePlannen.length > 0 ? 'relevant' : 'onbekend',
    waarde: planNaam,
    toelichting: allePlannen.length > 0 
      ? `Geldend plan: ${planNaam} (${planType}, status: ${planStatus}). In totaal ${allePlannen.length} plan(nen) op deze locatie. Het bestemmingsplan/omgevingsplan is het toetsingskader voor omgevingsvergunningen (art. 5.1 lid 1 sub a Omgevingswet). Bouwen in strijd met het plan vereist een buitenplanse omgevingsplanactiviteit (BOPA, art. 5.1 lid 1 sub b Omgevingswet).`
      : 'Geen bestemmingsplan gevonden. Raadpleeg ruimtelijkeplannen.nl voor het geldende plan. Zonder geldend plan is het omgevingsplan van de gemeente het toetsingskader (Omgevingswet art. 4.1).',
    bronnen: ['Ruimtelijkeplannen.nl'],
    rawData: { allePlannen: allePlannen.map(p => ({ naam: p.naam, type: p.type, status: p.status, categorie: p.typePlanCategorie })) },
  });

  // ---- Parapluplannen ----
  const paraplu = b?.parapluplannen || [];
  results.push({
    code: 'PARAPLUPLAN', theme: 'planologie', humanName: 'Parapluplan / Facetplan',
    status: paraplu.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: paraplu.length > 0 ? paraplu.map(p => p.naam).join('; ') : 'Geen parapluplannen',
    toelichting: paraplu.length > 0 
      ? `⚠️ ${paraplu.length} parapluplan(nen) van kracht: ${paraplu.map(p => p.naam).join('; ')}. Parapluplannen bevatten aanvullende regels die het onderliggende bestemmingsplan overstijgen (bijv. parkeren, archeologie, kamerverhuur, duurzaamheid). Deze regels moeten ALTIJD worden meegenomen bij de toetsing van de aanvraag. Wettelijke grondslag: art. 3.1 Wro / art. 4.1 Omgevingswet.`
      : 'Geen parapluplannen of facetplannen op deze locatie. Parapluplannen zijn thematische bestemmingsplannen die aanvullende regels bevatten (art. 3.1 Wro).',
    bronnen: ['Ruimtelijkeplannen.nl'],
    rawData: { parapluplannen: paraplu },
  });

  // ---- Voorbereidingsbesluiten ----
  const vb = b?.voorbereidingsbesluiten || [];
  results.push({
    code: 'VOORBEREIDINGSBESLUIT', theme: 'planologie', humanName: 'Voorbereidingsbesluit',
    status: vb.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: vb.length > 0 ? vb.map(p => p.naam).join('; ') : 'Geen voorbereidingsbesluit',
    toelichting: vb.length > 0 
      ? `⚠️ Voorbereidingsbesluit van kracht: ${vb.map(p => p.naam).join('; ')}. Er geldt een aanhoudingsplicht voor aanvragen die in strijd zijn met het voorbereidingsbesluit (art. 4.14 Omgevingswet / art. 3.7 Wro). De gemeente bereidt een nieuw omgevingsplan of bestemmingsplan voor. Aanvragen worden aangehouden totdat het nieuwe plan in werking treedt of het voorbereidingsbesluit vervalt (maximaal 1 jaar). Neem contact op met de gemeente voor de actuele stand van zaken.`
      : 'Geen voorbereidingsbesluit op deze locatie. Een voorbereidingsbesluit (art. 4.14 Omgevingswet) kan een aanhoudingsplicht voor vergunningaanvragen met zich meebrengen.',
    bronnen: ['Ruimtelijkeplannen.nl'],
  });

  // ---- Beheersverordeningen ----
  const bv = b?.beheersverordeningen || [];
  if (bv.length > 0) {
    results.push({
      code: 'BEHEERSVERORDENING', theme: 'planologie', humanName: 'Beheersverordening',
      status: 'relevant',
      waarde: bv.map(p => p.naam).join('; '),
      toelichting: `Beheersverordening van kracht: ${bv.map(p => p.naam).join('; ')}. Een beheersverordening (art. 3.38 Wro) bevriest het bestaande gebruik en bouwmogelijkheden. Nieuwe ontwikkelingen die afwijken van het bestaande gebruik zijn niet toegestaan zonder planherziening. Onder de Omgevingswet worden beheersverordeningen omgezet naar het omgevingsplan.`,
      bronnen: ['Ruimtelijkeplannen.nl'],
    });
  }

  // ---- Enkelbestemmingen ----
  const enkel = b?.enkelbestemmingen || [];
  results.push({
    code: 'BESTEMMING', theme: 'planologie', humanName: 'Enkelbestemming',
    status: enkel.length > 0 ? 'relevant' : 'onbekend',
    waarde: enkel.length > 0 ? enkel.map(e => e.naam).join(', ') : 'Onbekend',
    toelichting: enkel.length > 0 
      ? `Enkelbestemming(en): ${enkel.map(e => `${e.naam} (${e.hoofdgroep})`).join(', ')}. De enkelbestemming bepaalt het toegestane gebruik en de bouwmogelijkheden op het perceel (art. 3.1 Wro / art. 4.1 Omgevingswet). Gebruik in strijd met de bestemming is verboden. Voor afwijkend gebruik is een omgevingsvergunning voor een buitenplanse omgevingsplanactiviteit (BOPA) nodig.`
      : 'Geen enkelbestemming gevonden. Raadpleeg ruimtelijkeplannen.nl voor de geldende bestemming.',
    bronnen: ['Ruimtelijkeplannen.nl'],
  });

  // ---- Dubbelbestemmingen ----
  const dubbel = b?.dubbelbestemmingen || [];
  results.push({
    code: 'DUBBELBESTEMMING', theme: 'planologie', humanName: 'Dubbelbestemming',
    status: dubbel.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: dubbel.length > 0 ? dubbel.map(d => d.naam).join(', ') : 'Geen dubbelbestemming',
    toelichting: dubbel.length > 0 
      ? `⚠️ Dubbelbestemming(en): ${dubbel.map(d => `${d.naam} (advies: ${d.adviesInstantie})`).join('; ')}. Dubbelbestemmingen leggen aanvullende beschermingsregimes op bovenop de enkelbestemming (art. 3.1 Wro). Bij dubbelbestemmingen is advies van de betreffende instantie VERPLICHT voordat een vergunning kan worden verleend. Aandachtspunten: ${dubbel.flatMap(d => d.aandachtspunten).join('; ')}. Vaak is aanvullend onderzoek vereist (bijv. archeologisch, waterstaatkundig of ecologisch onderzoek).`
      : 'Geen dubbelbestemmingen op deze locatie. Dubbelbestemmingen (art. 3.1 Wro) leggen aanvullende beschermingsregimes op.',
    bronnen: ['Ruimtelijkeplannen.nl'],
    rawData: { dubbelbestemmingen: dubbel },
  });

  // ---- Gebiedsaanduidingen ----
  const aanduiding = b?.gebiedsaanduidingen || [];
  results.push({
    code: 'GEBIEDSAANDUIDING', theme: 'planologie', humanName: 'Gebiedsaanduiding',
    status: aanduiding.length > 0 ? (b?.heeftGeluidszone || b?.heeftVeiligheidszone || b?.heeftMilieuzone ? 'aandachtspunt' : 'relevant') : 'niet_relevant',
    waarde: aanduiding.length > 0 ? aanduiding.map(a => `${a.naam} (${a.type})`).join(', ') : 'Geen gebiedsaanduiding',
    toelichting: aanduiding.length > 0 
      ? `Gebiedsaanduiding(en): ${aanduiding.map(a => `${a.naam} (${a.type})`).join(', ')}. Gebiedsaanduidingen (art. 3.1 Wro) leggen specifieke beperkingen of mogelijkheden op voor een groter gebied.${b?.heeftGeluidszone ? ' ⚠️ Geluidszone aanwezig — akoestisch onderzoek vereist bij geluidgevoelige functies (art. 3.8 Bkl).' : ''}${b?.heeftVeiligheidszone ? ' ⚠️ Veiligheidszone — kwantitatieve risicoanalyse (QRA) vereist (Bevi / art. 5.12 Bkl).' : ''}${b?.heeftMilieuzone ? ' ⚠️ Milieuzone — milieuonderzoek mogelijk vereist (Bal).' : ''}`
      : 'Geen gebiedsaanduidingen. Gebiedsaanduidingen (art. 3.1 Wro) kunnen specifieke beperkingen opleggen.',
    bronnen: ['Ruimtelijkeplannen.nl'],
  });

  // ---- Bouwvlak (now with real data) ----
  const bouwvlakken = b?.bouwvlakken || [];
  results.push({
    code: 'BOUWVLAK', theme: 'planologie', humanName: 'Bouwvlak',
    status: bouwvlakken.length > 0 ? 'relevant' : 'onbekend',
    waarde: bouwvlakken.length > 0 ? `${bouwvlakken.length} bouwvlak(ken) aanwezig` : 'Geen bouwvlak gevonden',
    toelichting: bouwvlakken.length > 0 
      ? `Bouwvlak aanwezig op deze locatie (${bouwvlakken.length} vlak(ken)). Bouwen is in principe alleen toegestaan binnen het bouwvlak (art. 3.1 Wro / planregels). Plan: ${bouwvlakken[0].planNaam || planNaam}. Bouwen buiten het bouwvlak is alleen mogelijk met een afwijkingsvergunning (art. 2.12 Wabo / BOPA Omgevingswet).`
      : 'Geen bouwvlak gevonden op deze locatie. Mogelijk is bouwen niet toegestaan, of geldt een afwijkende regeling. Raadpleeg de plankaart op ruimtelijkeplannen.nl.',
    bronnen: ['Ruimtelijkeplannen.nl'],
  });

  // ---- Functieaanduidingen ----
  const functies = b?.functieaanduidingen || [];
  if (functies.length > 0) {
    results.push({
      code: 'FUNCTIEAANDUIDING', theme: 'planologie', humanName: 'Functieaanduiding',
      status: 'relevant',
      waarde: functies.map(f => f.naam).join(', '),
      toelichting: `Functieaanduiding(en): ${functies.map(f => f.naam).join(', ')}. Functieaanduidingen specificeren het toegestane gebruik binnen de bestemming (art. 3.1 Wro). Voorbeelden: "detailhandel", "horeca", "bedrijf tot en met categorie 2". Gebruik dat niet past binnen de functieaanduiding is niet toegestaan zonder afwijkingsvergunning.`,
      bronnen: ['Ruimtelijkeplannen.nl'],
    });
  }

  // ---- Maatvoering (now with real data) ----
  const maatvoeringen = b?.maatvoeringen || [];
  results.push({
    code: 'MAATVOERING', theme: 'planologie', humanName: 'Maatvoering',
    status: maatvoeringen.length > 0 ? 'relevant' : 'onbekend',
    waarde: maatvoeringen.length > 0 
      ? maatvoeringen.map(m => `${m.naam}${m.waarde ? `: ${m.waarde}${m.eenheid ? ` ${m.eenheid}` : ''}` : ''}`).join('; ')
      : 'Geen maatvoering gevonden',
    toelichting: maatvoeringen.length > 0 
      ? `Maatvoering: ${maatvoeringen.map(m => `${m.naam}${m.waarde ? ` = ${m.waarde}${m.eenheid ? ` ${m.eenheid}` : ''}` : ''}`).join('; ')}. Deze waarden bepalen de maximale bouwmogelijkheden (bouwhoogte, goothoogte, bebouwingspercentage, etc.) conform de planregels (art. 3.1 Wro). Overschrijding van de maatvoering vereist een afwijkingsvergunning.`
      : 'Geen maatvoering gevonden. Raadpleeg de plankaart en planregels op ruimtelijkeplannen.nl voor de geldende bouwmogelijkheden.',
    bronnen: ['Ruimtelijkeplannen.nl'],
  });

  // ---- Planregels ----
  results.push({
    code: 'PLANREGELS', theme: 'planologie', humanName: 'Planregels',
    status: 'relevant',
    waarde: planNaam !== 'Onbekend' ? `Planregels van ${planNaam}${paraplu.length > 0 ? ` + ${paraplu.length} parapluplan(nen)` : ''}` : 'Raadpleeg planregels',
    toelichting: `De planregels bevatten de specifieke bouw- en gebruiksregels voor deze locatie (art. 3.1 Wro / art. 4.1 Omgevingswet). Hierin staan de voorwaarden voor vergunningvrij bouwen, de afwijkingsmogelijkheden en de specifieke gebruiksregels.${paraplu.length > 0 ? ` Let op: er zijn ${paraplu.length} parapluplan(nen) die aanvullende regels bevatten die ook getoetst moeten worden.` : ''} Raadpleeg de volledige planregels op ruimtelijkeplannen.nl.`,
    bronnen: ['Ruimtelijkeplannen.nl'],
  });

  // ---- Onderzoeksvereisten ----
  const onderzoeken = b?.onderzoeksVereisten || [];
  if (onderzoeken.length > 0) {
    results.push({
      code: 'ONDERZOEKSVEREISTEN', theme: 'planologie', humanName: 'Vereiste onderzoeken',
      status: 'aandachtspunt',
      waarde: `${onderzoeken.length} onderzoek(en) vereist`,
      toelichting: `Op basis van de dubbelbestemmingen en gebiedsaanduidingen zijn de volgende onderzoeken vereist: ${onderzoeken.map(o => `${o.type} (${o.verplicht ? 'verplicht' : 'aanbevolen'}) — ${o.toelichting}`).join('; ')}.`,
      bronnen: ['Ruimtelijkeplannen.nl'],
      rawData: { onderzoeken },
    });
  }

  return results;
}

function computeDSOIndicatoren(d: DatasetBundle, lat: number, lng: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const activiteiten = d.dsoActiviteiten;
  const regels = d.dsoRegels;

  results.push({
    code: 'DSO_ACTIVITEITEN', theme: 'planologie', humanName: 'DSO Activiteiten',
    status: activiteiten.length > 0 ? 'relevant' : 'onbekend',
    waarde: activiteiten.length > 0 ? `${activiteiten.length} activiteit(en) gevonden` : 'Geen activiteiten opgehaald',
    toelichting: activiteiten.length > 0 ? `Via het Digitaal Stelsel Omgevingswet (DSO) zijn ${activiteiten.length} activiteiten gevonden voor deze locatie: ${activiteiten.slice(0, 5).map((a: any) => a.naam || a.identificatie).join(', ')}${activiteiten.length > 5 ? '...' : ''}. Het DSO is het centrale loket voor omgevingsvergunningen onder de Omgevingswet (art. 16.2 Omgevingswet). Activiteiten bepalen welke vergunningen, meldingen of informatieplichten van toepassing zijn.` : 'Geen activiteiten via DSO opgehaald. Dit kan duiden op een API-fout of ontbrekende data in het DSO (art. 16.2 Omgevingswet).',
    bronnen: ['DSO Omgevingsloket', 'Omgevingswet art. 16.2'],
  });

  results.push({
    code: 'DSO_REGELS', theme: 'planologie', humanName: 'DSO Toepasbare regels',
    status: regels.length > 0 ? 'relevant' : 'onbekend',
    waarde: regels.length > 0 ? `${regels.length} regel(s) van toepassing` : 'Geen regels opgehaald',
    toelichting: regels.length > 0 ? `${regels.length} toepasbare regel(s) gevonden via het DSO. Toepasbare regels zijn de digitale vertaling van de juridische regels uit het omgevingsplan, de AMvB's en de provinciale verordening. Ze bepalen of een activiteit vergunningplichtig, meldingsplichtig of vergunningvrij is (art. 4.7 Omgevingswet).` : 'Geen toepasbare regels via DSO opgehaald. Raadpleeg het Omgevingsloket (omgevingswet.overheid.nl) voor de actuele regels.',
    bronnen: ['DSO Omgevingsloket', 'Omgevingswet art. 4.7'],
  });

  // K1: DSO Vergunningcheck — conclusies (vergunningplicht/meldingsplicht/vergunningvrij)
  const vc = d.vergunningCheck;
  if (vc) {
    const conclusies = vc.conclusies || [];
    const vergunningplichtig = conclusies.filter((c: any) => c.type === 'vergunningplicht');
    const meldingsplichtig = conclusies.filter((c: any) => c.type === 'meldingsplicht');
    const vergunningvrij = conclusies.filter((c: any) => c.type === 'vergunningvrij');
    const verboden = conclusies.filter((c: any) => c.type === 'verbod');
    const indieningsvereisten = vc.indieningsvereisten || [];
    const openVragen = vc.openVragen || [];

    let vcStatus: 'aandachtspunt' | 'relevant' | 'onbekend' = 'relevant';
    let vcWaarde = '';
    let vcToelichting = '';

    if (verboden.length > 0) {
      vcStatus = 'aandachtspunt';
      vcWaarde = `VERBOD — ${verboden.length} activiteit(en) verboden op deze locatie`;
      vcToelichting = `De DSO vergunningcheck heeft vastgesteld dat ${verboden.length} activiteit(en) VERBODEN zijn op deze locatie: ${verboden.map((c: any) => c.omschrijving).join('; ')}. Dit betekent dat de aangevraagde activiteit niet kan worden uitgevoerd zonder wijziging van het omgevingsplan (art. 5.1 Omgevingswet).`;
    } else if (vergunningplichtig.length > 0) {
      vcStatus = 'aandachtspunt';
      vcWaarde = `Vergunningplichtig — ${vergunningplichtig.length} activiteit(en) vereisen een omgevingsvergunning`;
      vcToelichting = `De DSO vergunningcheck wijst uit dat ${vergunningplichtig.length} activiteit(en) vergunningplichtig zijn: ${vergunningplichtig.map((c: any) => c.omschrijving).join('; ')}. ${indieningsvereisten.length > 0 ? `Er zijn ${indieningsvereisten.length} indieningsvereiste(n) vastgesteld: ${indieningsvereisten.slice(0, 5).map((v: any) => v.naam).join(', ')}${indieningsvereisten.length > 5 ? '...' : ''}.` : ''} ${meldingsplichtig.length > 0 ? `Daarnaast zijn ${meldingsplichtig.length} activiteit(en) meldingsplichtig.` : ''} ${vergunningvrij.length > 0 ? `${vergunningvrij.length} activiteit(en) zijn vergunningvrij.` : ''}`;
    } else if (meldingsplichtig.length > 0) {
      vcStatus = 'relevant';
      vcWaarde = `Meldingsplichtig — ${meldingsplichtig.length} activiteit(en) vereisen een melding`;
      vcToelichting = `De DSO vergunningcheck wijst uit dat ${meldingsplichtig.length} activiteit(en) meldingsplichtig zijn: ${meldingsplichtig.map((c: any) => c.omschrijving).join('; ')}. Een melding moet minimaal 4 weken voor aanvang van de activiteit worden ingediend bij het bevoegd gezag (art. 4.4 Omgevingswet). ${vergunningvrij.length > 0 ? `${vergunningvrij.length} activiteit(en) zijn vergunningvrij.` : ''}`;
    } else if (vergunningvrij.length > 0) {
      vcStatus = 'relevant';
      vcWaarde = `Vergunningvrij — ${vergunningvrij.length} activiteit(en) zijn vergunningvrij`;
      vcToelichting = `De DSO vergunningcheck wijst uit dat alle ${vergunningvrij.length} getoetste activiteit(en) vergunningvrij zijn. Let op: vergunningvrij betekent niet regelvrij. De activiteit moet nog steeds voldoen aan de regels uit het omgevingsplan, het Bbl en het Bal.`;
    } else if (openVragen.length > 0) {
      vcStatus = 'onbekend';
      vcWaarde = `Vergunningcheck onvolledig — ${openVragen.length} open vra(a)g(en)`;
      vcToelichting = `De DSO vergunningcheck kon niet worden afgerond omdat er ${openVragen.length} open vra(a)g(en) zijn die beantwoord moeten worden: ${openVragen.slice(0, 3).map((v: any) => v.vraagTekst).join('; ')}. Beantwoord deze vragen in het Omgevingsloket voor een definitieve conclusie.`;
    } else {
      vcStatus = 'onbekend';
      vcWaarde = 'Geen conclusie uit DSO vergunningcheck';
      vcToelichting = 'De DSO vergunningcheck heeft geen conclusie opgeleverd. Dit kan duiden op ontbrekende data in het DSO of een technische fout. Raadpleeg het Omgevingsloket (omgevingswet.overheid.nl) voor een handmatige check.';
    }

    results.push({
      code: 'DSO_VERGUNNINGCHECK', theme: 'planologie', humanName: 'DSO Vergunningcheck',
      status: vcStatus,
      waarde: vcWaarde,
      toelichting: vcToelichting,
      wettelijkeGrondslag: 'Art. 5.1 Omgevingswet (vergunningplicht); art. 4.4 Omgevingswet (meldingsplicht); Bal (Besluit activiteiten leefomgeving); Bbl (Besluit bouwwerken leefomgeving).',
      consequenties: vergunningplichtig.length > 0
        ? `Een omgevingsvergunning is vereist voor ${vergunningplichtig.length} activiteit(en). De aanvraag moet voldoen aan ${indieningsvereisten.length} indieningsvereiste(n). De reguliere procedure duurt 8 weken (art. 16.64 Omgevingswet), de uitgebreide procedure 26 weken (art. 16.65 Omgevingswet).`
        : verboden.length > 0
          ? 'De activiteit is verboden op deze locatie. Een wijziging van het omgevingsplan is nodig om de activiteit mogelijk te maken.'
          : undefined,
      suggesties: vergunningplichtig.length > 0 || meldingsplichtig.length > 0
        ? [
            'Dien de aanvraag in via het Omgevingsloket (omgevingswet.overheid.nl)',
            `Zorg dat alle ${indieningsvereisten.length} indieningsvereisten compleet zijn bij indiening`,
            'Neem vooraf contact op met het bevoegd gezag voor een vooroverleg (art. 16.5 Omgevingswet)',
          ]
        : undefined,
      bronnen: ['DSO Omgevingsloket', 'Omgevingswet art. 5.1', 'Bal', 'Bbl'],
    });

    // Indieningsvereisten als aparte indicator
    if (indieningsvereisten.length > 0) {
      const verplicht = indieningsvereisten.filter((v: any) => v.verplicht);
      const optioneel = indieningsvereisten.filter((v: any) => !v.verplicht);
      results.push({
        code: 'DSO_INDIENINGSVEREISTEN', theme: 'planologie', humanName: 'Indieningsvereisten',
        status: 'relevant',
        waarde: `${verplicht.length} verplicht, ${optioneel.length} optioneel`,
        toelichting: `Bij de vergunningaanvraag moeten de volgende documenten worden ingediend:\n\nVerplicht:\n${verplicht.map((v: any) => `• ${v.naam}${v.omschrijving ? ': ' + v.omschrijving : ''}`).join('\n')}${optioneel.length > 0 ? `\n\nOptioneel:\n${optioneel.map((v: any) => `• ${v.naam}`).join('\n')}` : ''}`,
        bronnen: ['DSO Omgevingsloket', 'Omgevingsregeling'],
      });
    }
  } else {
    results.push({
      code: 'DSO_VERGUNNINGCHECK', theme: 'planologie', humanName: 'DSO Vergunningcheck',
      status: 'onbekend',
      waarde: 'Vergunningcheck niet uitgevoerd',
      toelichting: 'De DSO vergunningcheck kon niet worden uitgevoerd. Dit kan komen doordat er geen activiteiten zijn gevonden via het DSO, of doordat de DSO API niet bereikbaar was. Raadpleeg het Omgevingsloket (omgevingswet.overheid.nl) voor een handmatige vergunningcheck.',
      bronnen: ['DSO Omgevingsloket'],
    });
  }

  // Bevoegd gezag indicator
  const bg = d.bevoegdGezag;
  if (bg) {
    const gezag = bg.bevoegdGezag;
    const behandeldienst = bg.behandeldienst;
    results.push({
      code: 'DSO_BEVOEGD_GEZAG', theme: 'planologie', humanName: 'Bevoegd gezag',
      status: 'relevant',
      waarde: gezag ? `${gezag.naam}` : 'Bevoegd gezag niet bepaald',
      toelichting: gezag
        ? `Het bevoegd gezag voor deze locatie is **${gezag.naam}** (OIN: ${gezag.oin}). ${behandeldienst ? `De behandeldienst is ${behandeldienst.naam} (OIN: ${behandeldienst.oin}).` : ''} Het bevoegd gezag is verantwoordelijk voor de beoordeling van de vergunningaanvraag en het nemen van het besluit (art. 5.8-5.14 Omgevingswet).`
        : 'Het bevoegd gezag kon niet worden bepaald via de DSO verzoeksroutering. Raadpleeg het Omgevingsloket voor de juiste instantie.',
      bronnen: ['DSO Verzoeksroutering', 'Omgevingswet art. 5.8-5.14'],
    });
  }

  return results;
}

function computeNatuurIndicatoren(d: DatasetBundle, lat: number, lng: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const n2k = d.natura2000;
  const aerius = d.aeriusDepositie;

  // Derive NNN, beschermdNatuur, nationaalPark from Natura 2000 API data
  // (WFS endpoints for these are offline/404)
  const n2kGebieden = n2k?.gebiedenBinnenStraal || n2k?.gebieden || [];
  const dichtstbijN2k = n2kGebieden.length > 0 ? n2kGebieden[0] : (n2k?.dichtstbijzijndeGebied || null);
  const afstandN2k = dichtstbijN2k?.afstandMeter ?? n2k?.afstandTotDichtstbijzijnde ?? null;
  const binnenN2k = n2k?.binnenGebied === true;

  // NNN: gebruik echte PDOK NNN WMS GetFeatureInfo API data
  const nnnData = d.nnn;
  const binnenNNN = nnnData?.binnenNNN === true;
  const nnnFeatures = nnnData?.features || [];

  // Derive beschermd natuurgebied: Natura 2000 gebieden binnen 500m
  const beschermdNatuurGebieden = n2kGebieden.filter((g: any) => (g.afstandMeter ?? Infinity) <= 500);

  // NATURA2000 — H1: toon ALLE gebieden binnen 10km
  const n2kIsAandacht = binnenN2k || (afstandN2k !== null && afstandN2k < 3000);
  const alleN2kGebieden = n2kGebieden
    .filter((g: any) => (g.afstandMeter ?? Infinity) <= 10000)
    .sort((a: any, b: any) => (a.afstandMeter ?? 0) - (b.afstandMeter ?? 0));
  const n2kLijst = alleN2kGebieden.map((g: any) =>
    `• ${g.naam} (${g.afstandMeter != null ? Math.round(g.afstandMeter) + 'm' : 'afstand onbekend'})`
  ).join('\n');
  results.push({
    code: 'NATURA2000', theme: 'natuur', humanName: 'Natura 2000-gebied',
    status: n2kIsAandacht ? 'aandachtspunt' : (afstandN2k !== null && afstandN2k < 10000 ? 'relevant' : 'niet_relevant'),
    waarde: alleN2kGebieden.length > 0
      ? `${alleN2kGebieden.length} gebied(en) binnen 10km — dichtstbij: ${dichtstbijN2k?.naam} (${binnenN2k ? 'BINNEN gebied' : Math.round(afstandN2k || 0) + 'm'})`
      : 'Geen Natura 2000 binnen 10km',
    toelichting: alleN2kGebieden.length > 0
      ? `${alleN2kGebieden.length} Natura 2000-gebied(en) binnen 10 km:\n${n2kLijst}\n\nDichtstbijzijnd: ${dichtstbijN2k?.naam}${binnenN2k ? ' — locatie ligt BINNEN dit gebied' : ` op ${Math.round(afstandN2k || 0)} meter`}. Natura 2000-gebieden zijn beschermd op grond van de Europese Habitatrichtlijn en Vogelrichtlijn. Voor activiteiten die significante gevolgen kunnen hebben is toestemming nodig van het bevoegd gezag (doorgaans de provincie). Let op: bij meerdere nabijgelegen gebieden moet de cumulatieve stikstofdepositie op álle gebieden worden beoordeeld.`
      : 'Geen Natura 2000-gebieden binnen 10 km aangetroffen. Bij projecten met grote stikstofuitstoot kan een AERIUS-berekening alsnog nodig zijn.',
    wettelijkeGrondslag: 'Art. 2.7 en 2.8 Wet natuurbescherming (Wnb); art. 16.53c Omgevingswet; Habitatrichtlijn (92/43/EEG) art. 6 lid 3; Vogelrichtlijn (2009/147/EG).',
    consequenties: n2kIsAandacht
      ? `De nabijheid van Natura 2000-gebied ${dichtstbijN2k?.naam || ''} betekent dat het bevoegd gezag (provincie) moet beoordelen of de aangevraagde activiteit significante gevolgen kan hebben. Dit kan leiden tot: (1) een langere doorlooptijd van de vergunningprocedure, (2) aanvullende onderzoekskosten (voortoets, passende beoordeling, AERIUS-berekening), (3) mogelijke weigering als significante effecten niet kunnen worden uitgesloten. Ook bij een relatief kleine ingreep zoals een uitbouw kan dit spelen als er sprake is van stikstofdepositie in de bouwfase.`
      : 'Bij de huidige afstand tot Natura 2000-gebieden zijn directe gevolgen minder waarschijnlijk, maar bij grotere projecten met stikstofuitstoot kan alsnog een AERIUS-berekening nodig zijn.',
    suggesties: n2kIsAandacht
      ? [
          'Overweeg een voortoets (art. 2.7 Wnb) te laten uitvoeren om te beoordelen of significante effecten kunnen worden uitgesloten',
          'Laat een AERIUS-berekening uitvoeren voor zowel de aanleg- als gebruiksfase (aerius.nl)',
          'Bij mogelijke significante effecten: laat een passende beoordeling opstellen (art. 2.8 Wnb)',
          'Raadpleeg de provincie over de vergunningplicht op grond van de Wet natuurbescherming',
          'Houd rekening met externe werking: ook activiteiten buiten het gebied kunnen vergunningplichtig zijn'
        ]
      : [
          'Bij grote projecten met stikstofuitstoot: overweeg een AERIUS-berekening',
          'Raadpleeg de AERIUS Calculator (aerius.nl) bij twijfel over stikstofdepositie'
        ],
    relevantieToelichting: n2kIsAandacht
      ? 'Deze indicator is relevant omdat de locatie zich in of nabij een Natura 2000-gebied bevindt. Zelfs bij een relatief kleine ingreep (zoals een uitbouw of dakkapel) kan stikstofdepositie tijdens de bouwfase een rol spelen. Bij een functiewijziging of nieuwbouw is de kans op significante effecten groter door langdurige stikstofuitstoot in de gebruiksfase. Het bevoegd gezag (provincie) beoordeelt of een natuurvergunning nodig is.'
      : 'De locatie ligt op ruime afstand van Natura 2000-gebieden. Voor de meeste kleinschalige aanvragen (uitbouw, dakkapel, interne verbouwing) is deze indicator doorgaans niet van belang. Bij nieuwbouw of grote projecten met significante stikstofuitstoot kan een AERIUS-berekening alsnog nodig zijn.',
    bronnen: ['PDOK Natura 2000', 'Wet natuurbescherming art. 2.7/2.8', 'Omgevingswet art. 16.53c', 'Habitatrichtlijn art. 6 lid 3'],
    afstandM: afstandN2k ?? undefined,
  });

  // STIKSTOF_AERIUS — use real AERIUS WFS data
  const heeftDepositie = aerius.length > 0;
  const depositieWaarde = heeftDepositie ? aerius[0]?.properties?.total_deposition : null;
  const stikstofNabij = afstandN2k !== null && afstandN2k < 5000;
  results.push({
    code: 'STIKSTOF_AERIUS', theme: 'natuur', humanName: 'Stikstof (AERIUS depositie)',
    status: heeftDepositie ? 'aandachtspunt' : (stikstofNabij ? 'relevant' : 'niet_relevant'),
    waarde: heeftDepositie ? `Depositie: ${depositieWaarde ? (depositieWaarde as number).toFixed(1) : '?'} mol/ha/jr (drempel: 0,00 mol/ha/jr)` : (stikstofNabij ? 'Nabij Natura 2000 — AERIUS-berekening aanbevolen (drempel: 0,00 mol/ha/jr)' : 'Geen stikstofrisico'),
    toelichting: heeftDepositie
      ? `AERIUS depositiedata beschikbaar: ${depositieWaarde ? (depositieWaarde as number).toFixed(1) : 'onbekend'} mol/ha/jr. Stikstof is een van de meest complexe thema\'s in de vergunningverlening. Elk project dat stikstof uitstoot (bouw, sloop, verkeer, gebruik) kan bijdragen aan depositie op stikstofgevoelige Natura 2000-habitats. De drempelwaarde is 0,00 mol/ha/jr op overbelaste habitats.`
      : (stikstofNabij ? 'Nabij Natura 2000-gebied. Bij bouw- of sloopactiviteiten met stikstofuitstoot is het raadzaam een AERIUS-berekening te laten uitvoeren. Dit geldt voor zowel de aanlegfase (bouwverkeer, materieel) als de gebruiksfase (verkeersgeneratie, verwarming).' : 'Geen stikstofgevoelig gebied in de directe omgeving. Bij grote projecten met significante stikstofuitstoot kan een AERIUS-berekening alsnog nodig zijn.'),
    wettelijkeGrondslag: 'Art. 2.7 en 2.8 Wet natuurbescherming (Wnb); art. 16.53c Omgevingswet; Regeling natuurbescherming; Stikstofregistratiesysteem (SSRS).',
    consequenties: heeftDepositie
      ? `Bij een depositie > 0,00 mol/ha/jr op een overbelast habitattype is een natuurvergunning vereist. Dit kan leiden tot: (1) vertraging van het project totdat een oplossing is gevonden, (2) kosten voor een AERIUS-berekening en eventueel ecologisch advies, (3) noodzaak tot intern salderen (verschil bestaand-nieuw gebruik), extern salderen (aankoop stikstofrechten) of gebruik van de stikstofbank. Bij een uitbouw speelt vooral de bouwfase-emissie (materieel, transport). Bij nieuwbouw of functiewijziging speelt ook de structurele gebruiksfase-emissie.`
      : 'Bij de huidige afstand is het stikstofrisico beperkt, maar bij projecten met veel verkeersgeneratie of gasgestookte installaties kan alsnog een AERIUS-berekening nodig zijn.',
    suggesties: heeftDepositie || stikstofNabij
      ? [
          'Laat een AERIUS-berekening uitvoeren via aerius.nl voor zowel de aanleg- als gebruiksfase',
          'Onderzoek de mogelijkheid van intern salderen (vergelijk bestaand en nieuw gebruik)',
          'Bij overschrijding: overweeg extern salderen of gebruik van de stikstofbank',
          'Raadpleeg de provincie over de vergunningplicht Wet natuurbescherming',
          'Overweeg elektrisch materieel in de bouwfase om emissies te beperken'
        ]
      : ['Bij grote projecten: overweeg een AERIUS-berekening ter zekerheid'],
    relevantieToelichting: heeftDepositie
      ? 'Stikstof is relevant voor vrijwel elke bouwactiviteit nabij Natura 2000-gebieden. Zelfs een kleine uitbouw genereert stikstof in de bouwfase (bouwverkeer, materieel). Bij een functiewijziging kan de verkeersgeneratie in de gebruiksfase toenemen. Het bevoegd gezag (provincie) beoordeelt of de depositie aanvaardbaar is.'
      : 'Bij de huidige afstand tot Natura 2000-gebieden is stikstof voor kleinschalige aanvragen (uitbouw, dakkapel) doorgaans geen belemmering. Bij nieuwbouw of functiewijziging met meer verkeer kan het wel relevant worden.',
    bronnen: ['AERIUS Calculator', 'Wet natuurbescherming art. 2.7', 'Omgevingswet art. 16.53c'],
  });

  // NNN — via echte PDOK NNN WMS GetFeatureInfo API (definitief ja/nee)
  results.push({
    code: 'NNN', theme: 'natuur', humanName: 'Natuurnetwerk Nederland (NNN)',
    status: binnenNNN ? 'aandachtspunt' : 'niet_relevant',
    waarde: binnenNNN ? 'Locatie ligt binnen het Natuurnetwerk Nederland (NNN)' : 'Locatie ligt niet binnen het NNN',
    toelichting: binnenNNN
      ? `De locatie ligt binnen het Natuurnetwerk Nederland (NNN), vastgesteld door de provincie. Het nee-tenzij beschermingsregime is van toepassing (art. 2.44 Omgevingswet / art. 7.7 Bkl). Ruimtelijke ingrepen zijn niet toegestaan tenzij er sprake is van een groot openbaar belang, er geen alternatieven zijn, en de schade wordt gecompenseerd. Een natuurtoets en compensatieplan zijn vereist.`
      : 'De locatie ligt niet binnen het Natuurnetwerk Nederland (NNN). Het nee-tenzij beschermingsregime is niet van toepassing.',
    bronnen: ['PDOK Natuurnetwerk Nederland (Provincies)'],
  });

  // ECOLOGISCHE_VERBINDING
  results.push({
    code: 'ECOLOGISCHE_VERBINDING', theme: 'natuur', humanName: 'Ecologische verbindingszone',
    status: binnenNNN ? 'relevant' : 'niet_relevant',
    waarde: binnenNNN ? 'Locatie binnen NNN — mogelijk ecologische verbindingszone' : 'Geen ecologische verbindingszone',
    toelichting: binnenNNN
      ? 'De locatie ligt binnen het NNN en kan deel uitmaken van een ecologische verbindingszone. Ecologische verbindingszones zijn essentieel voor de migratie van soorten tussen natuurgebieden. Aantasting is niet toegestaan tenzij er sprake is van een groot openbaar belang en compensatie plaatsvindt (art. 2.44 Omgevingswet / Provinciale Omgevingsverordening). Raadpleeg de provinciale omgevingsverordening voor specifieke regels.'
      : 'De locatie ligt niet binnen het NNN. Geen ecologische verbindingszone van toepassing. Raadpleeg de provinciale natuurkaart voor de exacte begrenzing van ecologische verbindingszones.',
    bronnen: ['Provincie', 'PDOK Natuurnetwerk Nederland', 'Omgevingswet art. 2.44'],
  });

  // BESCHERMD_NATUURGEBIED — derived from Natura 2000 API (within 500m)
  results.push({
    code: 'BESCHERMD_NATUURGEBIED', theme: 'natuur', humanName: 'Beschermd natuurgebied',
    status: beschermdNatuurGebieden.length > 0 ? 'aandachtspunt' : (binnenN2k ? 'aandachtspunt' : 'niet_relevant'),
    waarde: binnenN2k ? `Binnen beschermd gebied: ${dichtstbijN2k?.naam}` : (beschermdNatuurGebieden.length > 0 ? `Nabij beschermd gebied: ${beschermdNatuurGebieden[0]?.naam}` : 'Geen beschermd natuurgebied'),
    toelichting: binnenN2k ? `Locatie ligt binnen beschermd Natura 2000-gebied: ${dichtstbijN2k?.naam}. Beschermde natuurgebieden vallen onder de Wet natuurbescherming (art. 2.1) en de Omgevingswet (art. 5.1 lid 2 sub g). Activiteiten die de kwaliteit van het gebied kunnen verslechteren zijn vergunningplichtig. Een passende beoordeling is vereist.` : (beschermdNatuurGebieden.length > 0 ? `Beschermd Natura 2000-gebied in de directe omgeving: ${beschermdNatuurGebieden[0]?.naam} (${beschermdNatuurGebieden[0]?.afstandMeter}m). Externe werking: ook activiteiten buiten het gebied die significante effecten kunnen hebben zijn vergunningplichtig (art. 2.7 Wnb).` : 'Geen beschermd natuurgebied in de directe omgeving.'),
    bronnen: ['PDOK Natura 2000', 'Wet natuurbescherming art. 2.1/2.7'],
  });

  // NATIONAAL_PARK — check OGC API nationale parken data + N2000 area names
  const ogcParken = d.nationaalPark || [];
  const parkGebieden = n2kGebieden.filter((g: any) => {
    const naam = (g.naam || '').toLowerCase();
    return naam.includes('nationaal park') || naam.includes('de biesbosch') || naam.includes('veluwezoom') || naam.includes('schiermonnikoog');
  });
  const heeftPark = ogcParken.length > 0 || parkGebieden.length > 0;
  const parkNaam = ogcParken[0]?.properties?.naam || ogcParken[0]?.properties?.name || parkGebieden[0]?.naam || '';
  results.push({
    code: 'NATIONAAL_PARK', theme: 'natuur', humanName: 'Nationaal Park',
    status: heeftPark ? 'aandachtspunt' : 'niet_relevant',
    waarde: heeftPark ? `Nabij Nationaal Park${parkNaam ? ': ' + parkNaam : ''}` : 'Niet in Nationaal Park',
    toelichting: heeftPark ? `Locatie nabij Nationaal Park${parkNaam ? ': ' + parkNaam : ''}. Nationale Parken hebben een bijzondere status voor natuur- en landschapsbescherming. Hoewel er geen apart wettelijk beschermingsregime geldt, overlappen Nationale Parken vaak met Natura 2000-gebieden en NNN-gebieden waarvoor wel wettelijke bescherming geldt. Extra aandacht voor natuur- en landschapswaarden is vereist bij ruimtelijke ontwikkelingen.` : 'Niet gelegen in of nabij een Nationaal Park.',
    bronnen: ['RVO Nationale Parken', 'PDOK Natura 2000'],
  });

  // SOORTENBESCHERMING
  results.push({
    code: 'SOORTENBESCHERMING', theme: 'natuur', humanName: 'Soortenbescherming (flora/fauna)',
    status: (binnenNNN || (afstandN2k !== null && afstandN2k < 3000)) ? 'aandachtspunt' : 'relevant',
    waarde: 'Quickscan flora en fauna aanbevolen',
    toelichting: (binnenNNN || (afstandN2k !== null && afstandN2k < 3000))
      ? `De locatie ligt ${binnenNNN ? 'binnen het NNN' : `nabij Natura 2000 (${Math.round(afstandN2k || 0)}m)`}. Een quickscan flora en fauna is VEREIST om te beoordelen of beschermde soorten aanwezig (kunnen) zijn (art. 3.1-3.10 Wnb / art. 5.1 lid 2 sub g Omgevingswet). Beschermde soorten omvatten: vogels (Vogelrichtlijn), Habitatrichtlijn bijlage IV-soorten, en nationaal beschermde soorten. Bij aanwezigheid is een ontheffing (art. 3.3/3.8 Wnb) of vergunning nodig. Een ecologisch werkprotocol kan vereist zijn.`
      : 'Bij ruimtelijke ingrepen is een quickscan flora en fauna aan te bevelen (art. 3.1-3.10 Wnb / art. 5.1 lid 2 sub g Omgevingswet). De quickscan beoordeelt of beschermde soorten aanwezig (kunnen) zijn en of nader onderzoek nodig is. Dit geldt voor alle drie beschermingsregimes: vogels, habitatrichtlijnsoorten en nationaal beschermde soorten.',
    bronnen: ['Wet natuurbescherming art. 3.1-3.10', 'NDFF', 'Omgevingswet art. 5.1'],
  });

  // WEIDEVOGELGEBIED — derived from BRP
  const grasland = d.brpGewas.filter((f: any) => {
    const gewas = (f.properties?.gewasnaam || f.properties?.gewas || '').toLowerCase();
    return gewas.includes('gras') || gewas.includes('weide');
  });
  results.push({
    code: 'WEIDEVOGELGEBIED', theme: 'natuur', humanName: 'Weidevogelgebied',
    status: grasland.length > 0 ? 'relevant' : 'niet_relevant',
    waarde: grasland.length > 0 ? 'Grasland nabij — weidevogelgebied mogelijk' : 'Geen grasland gedetecteerd',
    toelichting: grasland.length > 0 ? 'Grasland in de directe omgeving gedetecteerd via BRP Gewaspercelen. Dit kan duiden op een weidevogelgebied. In weidevogelgebieden gelden beperkingen voor verstorende activiteiten tijdens het broedseizoen (15 maart - 15 juli). Raadpleeg de provinciale weidevogelkaart en de provinciale omgevingsverordening voor specifieke regels. Bij bouwactiviteiten in of nabij weidevogelgebieden kan een ecologisch onderzoek vereist zijn (art. 3.1 Wnb).' : 'Geen grasland gedetecteerd in de directe omgeving. Weidevogelgebieden zijn provinciaal aangewezen (Provinciale Omgevingsverordening).',
    bronnen: ['PDOK BRP Gewaspercelen', 'Provincie', 'Wet natuurbescherming art. 3.1'],
  });

  // HOUTOPSTANDEN
  results.push({
    code: 'HOUTOPSTANDEN', theme: 'natuur', humanName: 'Houtopstanden (Wnb)',
    status: 'relevant',
    waarde: 'Controleer aanwezigheid bomen/bos',
    toelichting: 'Bij kap van bomen of houtopstanden buiten de bebouwde kom (Boswet-grens) geldt een meldingsplicht en herplantplicht op grond van art. 4.2 Wet natuurbescherming (art. 11.6 Bal onder Omgevingswet). De melding moet minimaal 6 weken voor de kap worden gedaan bij de provincie. Binnen de bebouwde kom geldt de gemeentelijke kapverordening (APV). Herplant moet binnen 3 jaar na kap plaatsvinden op dezelfde of een andere locatie.',
    bronnen: ['Wet natuurbescherming art. 4.2', 'Bal art. 11.6', 'Gemeente APV'],
  });

  return results;
}

function computeLandschapIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  results.push({
    code: 'LANDSCHAPSTYPE', theme: 'landschap', humanName: 'Landschapstype (FGR)',
    status: d.fgr.length > 0 ? 'relevant' : 'onbekend',
    waarde: d.fgr.length > 0 ? (d.fgr[0]?.properties?.beheertype || d.fgr[0]?.properties?.naam || 'Bepaald') : 'Onbekend',
    toelichting: d.fgr.length > 0 ? `Landschapstype bepaald op basis van Fysisch-Geografische Regio's (FGR). Het landschapstype is relevant voor de landschappelijke inpassing van nieuwe ontwikkelingen. De provincie kan in de omgevingsverordening eisen stellen aan de landschappelijke kwaliteit (art. 4.2 Omgevingswet). Bij ruimtelijke plannen moet rekening worden gehouden met de kernkwaliteiten van het landschap.` : 'Landschapstype niet bepaald. Raadpleeg de provinciale omgevingsverordening voor landschappelijke kwaliteitseisen.',
    bronnen: ['PDOK FGR', 'Provinciale Omgevingsverordening'],
  });

  results.push({
    code: 'AARDKUNDIG_WAARDEVOL', theme: 'landschap', humanName: 'Aardkundig waardevol gebied',
    status: d.aardkundig.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.aardkundig.length > 0 ? `Aardkundig waardevol: ${d.aardkundig[0]?.properties?.naam || 'ja'}` : 'Geen aardkundige waarde',
    toelichting: d.aardkundig.length > 0 ? `Locatie in aardkundig waardevol gebied: ${d.aardkundig[0]?.properties?.naam || 'onbekend'}. Aardkundig waardevolle gebieden bevatten bijzondere geologische en geomorfologische waarden die bescherming verdienen. De provincie kan in de omgevingsverordening regels stellen ter bescherming van deze waarden. Bij ruimtelijke ingrepen moet rekening worden gehouden met het behoud van de aardkundige waarden.` : 'Geen aardkundige waarden gedetecteerd op basis van beschikbare data.',
    bronnen: ['RCE Aardkundige Waarden', 'Provinciale Omgevingsverordening'],
  });

  // STILTEGEBIED — via echte PDOK Stiltegebieden WMS GetFeatureInfo API
  const stilteData = d.stiltegebied;
  const binnenStilte = stilteData?.binnenStiltegebied === true;
  const stilteNaam = stilteData?.naam || '';
  results.push({
    code: 'STILTEGEBIED', theme: 'landschap', humanName: 'Stiltegebied',
    status: binnenStilte ? 'aandachtspunt' : 'niet_relevant',
    waarde: binnenStilte ? `Locatie ligt in stiltegebied${stilteNaam ? ': ' + stilteNaam : ''}` : 'Locatie ligt niet in een stiltegebied',
    toelichting: binnenStilte
      ? `De locatie ligt in het provinciale stiltegebied${stilteNaam ? ' "' + stilteNaam + '"' : ''}. Stiltegebieden zijn door de provincie aangewezen ter bescherming van de stilte en rust in het buitengebied (Provinciale Omgevingsverordening). In stiltegebieden gelden strenge beperkingen voor geluidproducerende activiteiten, waaronder bouwwerkzaamheden, evenementen en industriële activiteiten. Voor activiteiten die geluid produceren boven de vastgestelde grenswaarden is een ontheffing van de provincie vereist. Bouwactiviteiten zijn doorgaans alleen overdag toegestaan.`
      : 'De locatie ligt niet in een provinciaal stiltegebied. Stiltegebieden zijn door de provincie aangewezen ter bescherming van de stilte en rust. Raadpleeg de provinciale omgevingsverordening voor de exacte begrenzing.',
    wettelijkeGrondslag: binnenStilte ? 'Provinciale Omgevingsverordening; Wet milieubeheer (Wm); Omgevingswet art. 2.22 (instructieregels provincie).' : undefined,
    consequenties: binnenStilte ? `De ligging in stiltegebied${stilteNaam ? ' "' + stilteNaam + '"' : ''} betekent dat geluidproducerende activiteiten aan strenge beperkingen zijn gebonden. Dit kan leiden tot: (1) beperking van werktijden voor bouwactiviteiten, (2) verplichting tot gebruik van geluidsarm materieel, (3) noodzaak tot een ontheffing van de provincie voor geluidproducerende activiteiten, (4) mogelijke weigering van activiteiten die de stilte onevenredig verstoren.` : undefined,
    suggesties: binnenStilte ? [
      'Raadpleeg de provinciale omgevingsverordening voor de specifieke regels van dit stiltegebied',
      'Vraag een ontheffing aan bij de provincie voor geluidproducerende bouwactiviteiten',
      'Gebruik geluidsarm materieel en beperk werktijden tot dagperiode',
      'Overweeg een akoestisch onderzoek om de geluidbelasting in kaart te brengen'
    ] : undefined,
    bronnen: ['PDOK Stiltegebieden (Provincies)', 'Provinciale Omgevingsverordening'],
  });

  // DONKERTEGEBIED — enhanced with lichtemissie data from Atlas Leefomgeving
  const lichtemissie = d.atlasLeefomgeving?.lichtemissie;
  const lichtemissieStr = lichtemissie !== null && lichtemissie !== undefined ? `${lichtemissie}` : null;
  // Low lichtemissie (<100) could indicate a dark area
  const isDonkerGebied = lichtemissie !== null && lichtemissie !== undefined && lichtemissie < 100;
  results.push({
    code: 'DONKERTEGEBIED', theme: 'landschap', humanName: 'Donkertegebied / Lichtemissie',
    status: isDonkerGebied ? 'relevant' : 'niet_relevant',
    waarde: lichtemissieStr ? `Lichtemissie: ${lichtemissieStr} (${isDonkerGebied ? 'donker gebied' : 'normaal'})` : 'Raadpleeg provincie',
    toelichting: lichtemissieStr
      ? `Lichtemissie op deze locatie: ${lichtemissieStr} (bron: RIVM Atlas Leefomgeving). ${isDonkerGebied ? 'Dit is een relatief donker gebied. ' : ''}Donkertegebieden zijn provinciaal aangewezen ter bescherming van de nachtelijke duisternis. In donkertegebieden gelden beperkingen voor buitenverlichting en lichtemissie. Bij nieuwe ontwikkelingen met buitenverlichting kan een ontheffing vereist zijn. Raadpleeg de provinciale omgevingsverordening.`
      : 'Donkertegebieden zijn provinciaal aangewezen ter bescherming van de nachtelijke duisternis en het donkere landschap. In donkertegebieden gelden beperkingen voor buitenverlichting en lichtemissie. Bij nieuwe ontwikkelingen met buitenverlichting kan een ontheffing vereist zijn. Raadpleeg de provinciale omgevingsverordening.',
    bronnen: lichtemissieStr ? ['RIVM Atlas Leefomgeving', 'Provinciale Omgevingsverordening'] : ['Provinciale Omgevingsverordening'],
  });

  return results;
}

function computeWaterIndicatoren(d: DatasetBundle, lat: number, lng: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const waterkering = d.waterkering;
  const grondwater = d.grondwaterBescherming;
  const watergang = d.watergang;
  const zwemwater = d.zwemwater;

  // WATERKERING
  results.push({
    code: 'WATERKERING', theme: 'water', humanName: 'Waterkering',
    status: waterkering.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: waterkering.length > 0 ? `Waterkering binnen 200m` : 'Geen waterkering binnen 200m',
    toelichting: waterkering.length > 0 ? 'Waterkering in de directe omgeving. Waterkeringen zijn beschermd op grond van de Waterwet (art. 6.1) en de Keur van het waterschap. Binnen de beschermingszone (kernzone en buitenbeschermingszone) geldt een vergunningplicht voor bouwactiviteiten, grondwerkzaamheden en het aanbrengen van beplanting. Een watervergunning van het waterschap is vereist (art. 6.5 Waterwet / art. 5.4 Omgevingswet). Overtreding kan leiden tot handhaving en herstelplicht.' : 'Geen waterkeringen in de directe omgeving.',
    bronnen: ['PDOK Legger RWS', 'Waterwet art. 6.1/6.5', 'Omgevingswet art. 5.4'],
  });

  // BESCHERMINGSZONE_WATERKERING — derived from waterkering
  results.push({
    code: 'BESCHERMINGSZONE_WATERKERING', theme: 'water', humanName: 'Beschermingszone waterkering',
    status: waterkering.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: waterkering.length > 0 ? 'Binnen beschermingszone' : 'Niet in beschermingszone',
    toelichting: waterkering.length > 0 ? 'Binnen de beschermingszone van een waterkering. De beschermingszone bestaat uit een kernzone (direct naast de waterkering) en een buitenbeschermingszone. In de kernzone zijn vrijwel alle activiteiten vergunningplichtig. In de buitenbeschermingszone gelden minder strenge regels maar is een watervergunning vaak nog steeds vereist (Keur waterschap / art. 6.5 Waterwet). Neem vroegtijdig contact op met het waterschap.' : 'Niet in een beschermingszone van een waterkering.',
    bronnen: ['Waterschap', 'Waterwet art. 6.5', 'Keur'],
  });

  // WATERGANG
  results.push({
    code: 'WATERGANG', theme: 'water', humanName: 'Watergang',
    status: watergang.length > 0 ? 'relevant' : 'niet_relevant',
    waarde: watergang.length > 0 ? `Watergang binnen 100m` : 'Geen watergang binnen 100m',
    toelichting: watergang.length > 0 ? 'Watergang in de directe omgeving. Langs watergangen geldt een beschermingszone en onderhoudsstrook (Keur waterschap). Bouwen binnen de beschermingszone is vergunningplichtig. De onderhoudsstrook moet vrij blijven voor onderhoud door het waterschap. Demping of verlegging van watergangen vereist een watervergunning en watercompensatie (art. 6.5 Waterwet / Keur).' : 'Geen watergangen in de directe omgeving.',
    bronnen: ['PDOK Legger RWS', 'Keur waterschap'],
  });

  // KEUR_WATERSCHAP — derived from waterkering + watergang
  results.push({
    code: 'KEUR_WATERSCHAP', theme: 'water', humanName: 'Keur waterschap',
    status: (waterkering.length > 0 || watergang.length > 0) ? 'aandachtspunt' : 'niet_relevant',
    waarde: (waterkering.length > 0 || watergang.length > 0) ? 'Keur van toepassing' : 'Geen keur-objecten',
    toelichting: (waterkering.length > 0 || watergang.length > 0) ? 'Waterstaatswerken in de omgeving. De Keur van het waterschap bevat regels voor bouwen nabij water, grondwateronttrekking, lozing en demping (art. 78 Waterschapswet / art. 6.5 Waterwet). Een watervergunning is vereist voor activiteiten die invloed hebben op het watersysteem. Neem vroegtijdig contact op met het waterschap voor een wateradvies.' : 'Geen waterstaatswerken in de directe omgeving. De Keur van het waterschap kan alsnog van toepassing zijn bij grondwateronttrekking of lozing.',
    bronnen: ['Waterschap', 'Keur', 'Waterwet art. 6.5'],
  });

  // GRONDWATERBESCHERMING
  results.push({
    code: 'GRONDWATERBESCHERMING', theme: 'water', humanName: 'Grondwaterbeschermingsgebied',
    status: grondwater.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: grondwater.length > 0 ? 'Binnen grondwaterbeschermingsgebied' : 'Niet in grondwaterbeschermingsgebied',
    toelichting: grondwater.length > 0 ? 'Locatie in grondwaterbeschermingsgebied (vastgesteld door de provincie). In grondwaterbeschermingsgebieden gelden strenge regels voor: opslag van gevaarlijke stoffen, ondergrondse tanks, bodemactiviteiten, heiwerkzaamheden en grondwateronttrekking (Provinciale Omgevingsverordening / art. 7.11 Bkl). Een vergunning of melding bij de provincie is vaak vereist. Het doel is bescherming van de drinkwaterwinning.' : 'Niet in een grondwaterbeschermingsgebied op basis van PDOK-data.',
    bronnen: ['PDOK Grondwaterbescherming', 'Provinciale Omgevingsverordening', 'Bkl art. 7.11'],
  });

  // WATERWINGEBIED — derived from grondwater
  results.push({
    code: 'WATERWINGEBIED', theme: 'water', humanName: 'Waterwingebied',
    status: grondwater.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: grondwater.length > 0 ? 'Mogelijk waterwingebied' : 'Niet in waterwingebied',
    toelichting: grondwater.length > 0 ? 'Grondwaterbeschermingsgebied gedetecteerd. Controleer of dit ook een waterwingebied is — in waterwingebieden gelden de strengste regels. Waterwingebieden zijn de directe omgeving van drinkwaterputten waar vrijwel alle bodembedreigende activiteiten verboden zijn (Provinciale Omgevingsverordening). Raadpleeg de provincie en het drinkwaterbedrijf voor de exacte begrenzing en regels.' : 'Niet in een waterwingebied op basis van beschikbare data. Waterwingebieden zijn de meest beschermde zones rondom drinkwaterwinningen.',
    bronnen: ['Provincie', 'Drinkwaterbedrijf', 'Provinciale Omgevingsverordening'],
  });

  // OVERSTROMINGSRISICO — use OGC API overstromingsRisico data (wider bbox) + waterkering (narrow bbox) + Atlas Leefomgeving
  // Note: waterkering uses bbox1000 (narrow), overstromingsRisico uses bbox5000 (wider) for broader risk assessment
  const overstromingsData = d.overstromingsRisico || [];
  const aloOverstroming = d.atlasLeefomgeving?.overstromingskans;
  const heeftOverstromingsRisico = overstromingsData.length > 0 || waterkering.length > 0 || (aloOverstroming !== null && aloOverstroming !== undefined && aloOverstroming >= 1);
  const riskZone = overstromingsData[0]?.properties;
  const riskDesc = riskZone?.risk_zone_description || riskZone?.description || '';
  results.push({
    code: 'OVERSTROMINGSRISICO', theme: 'water', humanName: 'Overstromingsrisico',
    status: heeftOverstromingsRisico ? 'aandachtspunt' : 'niet_relevant',
    waarde: heeftOverstromingsRisico ? `Overstromingsrisico${riskDesc ? ': ' + riskDesc : ''}${aloOverstroming && aloOverstroming >= 1 ? ' (RIVM: overstrombaar gebied)' : ''} — raadpleeg risicokaart` : 'Laag overstromingsrisico',
    toelichting: heeftOverstromingsRisico ? `Locatie valt in een overstromingsrisicogebied${riskDesc ? ' (' + riskDesc + ')' : ''}${aloOverstroming && aloOverstroming >= 1 ? '. De RIVM Atlas Leefomgeving bevestigt dat deze locatie in een potentieel overstroombaar gebied ligt' : ''}. Op grond van de EU Richtlijn Overstromingsrisico's (2007/60/EG) en de Waterwet moeten overstromingsrisico's worden meegewogen bij ruimtelijke besluiten. Raadpleeg de overstromingsrisicokaart (Risicokaart.nl) voor waterdiepte bij doorbraak, stroomsnelheid en evacuatieroutes. Bij kwetsbare functies (ziekenhuizen, scholen) gelden aanvullende eisen voor zelfredzaamheid en evacuatie (art. 5.12 Bkl).` : 'Geen directe indicatie van verhoogd overstromingsrisico op basis van RWS-data en RIVM Atlas Leefomgeving.',
    bronnen: heeftOverstromingsRisico && aloOverstroming ? ['RWS Overstromingen Risicogebied', 'RIVM Atlas Leefomgeving', 'Risicokaart.nl', 'Waterwet', 'EU Richtlijn 2007/60/EG'] : ['RWS Overstromingen Risicogebied', 'Risicokaart.nl', 'Waterwet', 'EU Richtlijn 2007/60/EG'],
  });

  // WATERTOETS
  results.push({
    code: 'WATERTOETS', theme: 'water', humanName: 'Watertoets',
    status: 'aandachtspunt',
    waarde: 'Altijd vereist bij ruimtelijke plannen',
    toelichting: 'De watertoets is verplicht bij alle ruimtelijke plannen en besluiten (art. 3.1.1 Bro / art. 5.37 Omgevingswet). Het waterschap moet vroegtijdig worden betrokken via de digitale watertoets (dewatertoets.nl). Het waterschap brengt een wateradvies uit over de gevolgen van het plan voor het watersysteem. Aspecten: waterberging, waterkwaliteit, grondwater, riolering en waterveiligheid. Het wateradvies moet worden verwerkt in de toelichting van het ruimtelijk plan.',
    bronnen: ['Bro art. 3.1.1', 'Omgevingswet art. 5.37', 'Waterschap'],
  });

  // ZWEMWATER
  results.push({
    code: 'ZWEMWATER', theme: 'water', humanName: 'Zwemwaterlocatie',
    status: zwemwater.length > 0 ? 'relevant' : 'niet_relevant',
    waarde: zwemwater.length > 0 ? `Zwemwater binnen 500m: ${zwemwater[0]?.properties?.naam || 'ja'}` : 'Geen zwemwater binnen 500m',
    toelichting: zwemwater.length > 0 ? `Zwemwaterlocatie in de omgeving: ${zwemwater[0]?.properties?.naam || 'onbekend'}. Zwemwaterlocaties zijn aangewezen op grond van de Zwemwaterrichtlijn (2006/7/EG) en de Wet hygiene en veiligheid badinrichtingen en zwemgelegenheden. Bij lozingen of activiteiten die de waterkwaliteit kunnen beinvloeden gelden aanvullende eisen ter bescherming van de zwemwaterkwaliteit.` : 'Geen zwemwaterlocaties in de directe omgeving.',
    bronnen: ['PDOK Zwemwater', 'Zwemwaterrichtlijn 2006/7/EG'],
  });

  // WATERBERGING
  results.push({
    code: 'WATERBERGING', theme: 'water', humanName: 'Waterberging',
    status: 'relevant',
    waarde: 'Watercompensatie berekenen',
    toelichting: 'Bij toename van verhard oppervlak is watercompensatie vereist op grond van de Keur van het waterschap. De compensatienorm verschilt per waterschap (vaak 10-15% van de toename aan verhard oppervlak). Watercompensatie kan worden gerealiseerd door aanleg van waterberging (vijver, wadi, infiltratievoorziening) of door een financiele bijdrage aan het waterschap. De compensatie-eis geldt ook bij vervanging van onverhard door verhard oppervlak. Gebruik de BGT-data voor het bepalen van de bestaande verhardingsgraad.',
    bronnen: ['Waterschap', 'Keur', 'BGT'],
  });

  return results;
}

function computeBodemIndicatoren(d: DatasetBundle, bouwjaar?: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  // BODEMKWALITEIT — enriched with Bodemloket data
  const bl = d.bodemloket;
  const heeftBodemloketData = bl && bl.gevonden;
  const bodemStatus: 'aandachtspunt' | 'relevant' | 'onbekend' = heeftBodemloketData && bl!.dossierBeschikbaar ? 'aandachtspunt' : (heeftBodemloketData ? 'relevant' : 'onbekend');
  const bodemWaarde = heeftBodemloketData
    ? `Bevoegd gezag: ${bl!.omgevingsdienstNaam || 'onbekend'}${bl!.dossierBeschikbaar ? ' — dossiergegevens beschikbaar' : ''}`
    : 'Geen bodemonderzoek bekend';
  const bodemToelichting = heeftBodemloketData
    ? `${bl!.aanbeveling} Bij functiewijziging van bedrijfsmatig naar wonen is een verkennend bodemonderzoek (NEN 5740) vereist (art. 8.6 Bkl / Besluit bodemkwaliteit). ${bl!.dossierBeschikbaar ? 'Er zijn dossiergegevens beschikbaar bij het bevoegd gezag — controleer of er eerdere bodemonderzoeken of saneringen zijn uitgevoerd.' : 'Raadpleeg het Bodemloket (bodemloket.nl) voor historische gegevens.'} Bij verdachte locaties kan een nader onderzoek en saneringsplan nodig zijn.`
    : 'Geen bodemonderzoek geregistreerd. Bij functiewijziging of bouw is een verkennend bodemonderzoek (NEN 5740) vaak vereist (art. 8.6 Bkl / Besluit bodemkwaliteit). Raadpleeg het Bodemloket (bodemloket.nl) voor historische gegevens.';
  results.push({
    code: 'BODEMKWALITEIT', theme: 'bodem', humanName: 'Bodemkwaliteit',
    status: bodemStatus,
    waarde: bodemWaarde,
    toelichting: bodemToelichting,
    bronnen: heeftBodemloketData ? [bl!.bron, 'Bkl art. 8.6', 'Besluit bodemkwaliteit', 'NEN 5740'] : ['Bodemloket', 'Bkl art. 8.6', 'Besluit bodemkwaliteit'],
    rawData: { bodemloket: bl },
  });

  // ONTPLOFBARE_OORLOGSRESTEN
  results.push({
    code: 'ONTPLOFBARE_OORLOGSRESTEN', theme: 'bodem', humanName: 'Ontplofbare oorlogsresten (OO)',
    status: d.oo.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.oo.length > 0 ? 'Verdacht gebied — OO-onderzoek vereist' : 'Geen OO-verdacht gebied',
    toelichting: d.oo.length > 0 ? 'Locatie in een gebied verdacht van ontplofbare oorlogsresten (OO/CE). Bij grondwerkzaamheden dieper dan 30 cm is een vooronderzoek Conventionele Explosieven (CE) vereist conform het WSCS-OCE (Werkveldspecifiek certificatieschema Opsporen Conventionele Explosieven). Het vooronderzoek bepaalt of detectie- en ruimingsonderzoek nodig is. De opdrachtgever is verantwoordelijk voor een veilige werkomgeving (Arbeidsomstandighedenwet). Kosten komen voor rekening van de opdrachtgever.' : 'Geen bekende verdachte gebieden voor ontplofbare oorlogsresten op basis van beschikbare data. Raadpleeg de gemeentelijke explosievenkaart voor aanvullende informatie.',
    bronnen: ['RCE Ontplofbare Oorlogsresten', 'WSCS-OCE', 'Arbeidsomstandighedenwet'],
  });

  // FUNDERINGSPROBLEMATIEK — derived from RVO officiele data + AHN height + bodemkaart soil type + bouwjaar
  const ahnHoogte = d.ahnHoogte;
  const bodem = d.bodemType;
  const rvoFundering = d.funderingsproblematiek;
  const soilCode = (bodem?.soilcode || '').toLowerCase();
  const soilName = (bodem?.soilname || '').toLowerCase();
  // Veen (peat) soils are highest risk for foundation issues
  const isVeen = soilCode.startsWith('v') || soilName.includes('veen');
  // Klei (clay) soils have moderate risk, especially when wet
  const isKlei = soilName.includes('klei') || soilName.includes('zavel') || soilCode.includes('mn') || soilCode.includes('mo');
  // Low-lying areas (below NAP) have higher risk due to groundwater
  const isBenedNAP = ahnHoogte !== null && ahnHoogte < 0;
  const isZeerLaag = ahnHoogte !== null && ahnHoogte < -2;
  // Older buildings (pre-1970) often have wooden pile foundations
  const isOudPand = bouwjaar ? bouwjaar < 1970 : false;
  
  // Calculate risk level
  let funderingStatus: 'aandachtspunt' | 'relevant' | 'niet_relevant' | 'onbekend' = 'onbekend';
  let funderingWaarde = '';
  let funderingToelichting = '';
  const risicofactoren: string[] = [];
  
  if (isVeen) risicofactoren.push('veengrond');
  if (isKlei) risicofactoren.push('klei-/zavelgrond');
  if (isZeerLaag) risicofactoren.push(`zeer laag gelegen (${ahnHoogte!.toFixed(1)}m NAP)`);
  else if (isBenedNAP) risicofactoren.push(`beneden NAP (${ahnHoogte!.toFixed(1)}m)`);
  if (isOudPand) risicofactoren.push(`oud pand (bouwjaar ${bouwjaar})`);

  // Integreer officiële RVO funderingsproblematiek data
  const rvoData = rvoFundering?.[0]?.properties;
  const rvoLegenda = rvoData?.legenda || '';
  const rvoKwetsbaar = rvoLegenda.toLowerCase().includes('kwetsbaar');
  const rvoPcVoor1970 = rvoData?.percvoor1970 ? parseInt(rvoData.percvoor1970) : null;
  const rvoFgr = rvoData?.fgr || '';
  if (rvoKwetsbaar) risicofactoren.push(`RVO: ${rvoLegenda}`);
  if (rvoPcVoor1970 && rvoPcVoor1970 > 50) risicofactoren.push(`${rvoPcVoor1970}% panden vóór 1970`);
  
  if (isVeen || (isZeerLaag && isOudPand) || (rvoKwetsbaar && rvoPcVoor1970 && rvoPcVoor1970 > 50)) {
    funderingStatus = 'aandachtspunt';
    funderingWaarde = `Verhoogd funderingsrisico: ${risicofactoren.join(', ')}`;
    funderingToelichting = `Verhoogd risico op funderingsproblemen. ${isVeen ? 'Veengrond is gevoelig voor inklinking en oxidatie, wat leidt tot zetting en schade aan funderingen.' : ''} ${isZeerLaag ? `Locatie ligt ${Math.abs(ahnHoogte!).toFixed(1)}m onder NAP — verhoogd risico op grondwaterstandverlaging en paalrot.` : ''} ${isOudPand ? `Pand uit ${bouwjaar} kan houten paalfundering hebben die gevoelig is voor paalrot bij grondwaterstandverlaging.` : ''} Bij bouw of verbouw is een funderingsonderzoek (NEN 8707) aan te bevelen. Raadpleeg het KCAF (Kennis Centrum Aanpak Funderingsproblematiek) en de gemeentelijke funderingsrisicokaart.`;
  } else if (risicofactoren.length >= 2 || (isBenedNAP && isKlei)) {
    funderingStatus = 'relevant';
    funderingWaarde = `Matig funderingsrisico: ${risicofactoren.join(', ')}`;
    funderingToelichting = `Matig risico op funderingsproblemen op basis van: ${risicofactoren.join(', ')}. ${ahnHoogte !== null ? `Maaiveldhoogte: ${ahnHoogte.toFixed(1)}m NAP.` : ''} ${bodem ? `Bodemtype: ${bodem.soilname || bodem.soilcode}.` : ''} Bij nieuwbouw is een geotechnisch onderzoek (NEN 9997-1) vereist voor het funderingsontwerp. Raadpleeg het KCAF bij twijfel over de bestaande fundering.`;
  } else if (ahnHoogte !== null || bodem) {
    funderingStatus = risicofactoren.length > 0 ? 'relevant' : 'niet_relevant';
    funderingWaarde = risicofactoren.length > 0 ? `Beperkt risico: ${risicofactoren.join(', ')}` : `Geen verhoogd risico${ahnHoogte !== null ? ` (${ahnHoogte.toFixed(1)}m NAP)` : ''}`;
    funderingToelichting = `${ahnHoogte !== null ? `Maaiveldhoogte: ${ahnHoogte.toFixed(1)}m NAP.` : ''} ${bodem ? `Bodemtype: ${bodem.soilname || bodem.soilcode}.` : ''} ${risicofactoren.length > 0 ? 'Enig risico aanwezig, raadpleeg het KCAF bij twijfel.' : 'Geen verhoogd funderingsrisico op basis van beschikbare data.'}`;
  } else {
    funderingStatus = 'onbekend';
    funderingWaarde = 'Geen data beschikbaar';
    funderingToelichting = 'Hoogte- en bodemgegevens niet beschikbaar. Raadpleeg het KCAF (Kennis Centrum Aanpak Funderingsproblematiek) voor een funderingsrisicokaart.';
  }
  
  results.push({
    code: 'FUNDERINGSPROBLEMATIEK', theme: 'bodem', humanName: 'Funderingsproblematiek',
    status: funderingStatus,
    waarde: funderingWaarde,
    toelichting: funderingToelichting.trim(),
    bronnen: ['RVO Indicatieve Aandachtsgebieden Funderingsproblematiek', 'AHN (Actueel Hoogtebestand Nederland)', 'BRO Bodemkaart', 'KCAF', 'BAG'],
    rawData: { ahnHoogte, bodemType: bodem, risicofactoren, rvoData: rvoData || null },
  });

  // ASBEST_RISICO — derived from bouwjaar
  const heeftAsbestRisico = bouwjaar ? bouwjaar < 1994 : false;
  results.push({
    code: 'ASBEST_RISICO', theme: 'bodem', humanName: 'Asbestrisico',
    status: heeftAsbestRisico ? 'aandachtspunt' : (bouwjaar ? 'niet_relevant' : 'onbekend'),
    waarde: heeftAsbestRisico ? `Bouwjaar ${bouwjaar} — asbestrisico` : (bouwjaar ? `Bouwjaar ${bouwjaar} — geen asbestrisico` : 'Bouwjaar onbekend'),
    toelichting: heeftAsbestRisico ? `Pand gebouwd vóór 1994 (bouwjaar ${bouwjaar}). Bij sloop of renovatie is een asbestinventarisatie door een SC-540 gecertificeerd bedrijf VERPLICHT (Asbestverwijderingsbesluit 2005 / art. 4.54a Arbeidsomstandighedenbesluit). Asbestverwijdering mag alleen door een SC-530 gecertificeerd bedrijf worden uitgevoerd. Een sloopmelding bij de gemeente is vereist minimaal 4 weken voor aanvang (art. 7.10 Bbl). Illegale asbestverwijdering is strafbaar.` : (bouwjaar ? `Pand gebouwd na 1993 (bouwjaar ${bouwjaar}). Geen verhoogd asbestrisico — het gebruik van asbest is sinds 1 juli 1993 verboden in Nederland.` : 'Bouwjaar onbekend. Bij panden van vóór 1994 is asbestinventarisatie verplicht bij sloop/renovatie (Asbestverwijderingsbesluit 2005).'),
    bronnen: ['BAG', 'Asbestverwijderingsbesluit 2005', 'Bbl art. 7.10'],
  });

  return results;
}

function computeMilieuIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const rijkswegen = d.nwbWegen.filter((f: any) => {
    const wegnummer = f.properties?.wegnummer || '';
    const beheerder = (f.properties?.wegbeheerdersoort || '').toLowerCase();
    return wegnummer.startsWith('A') || (wegnummer.startsWith('N') && beheerder.includes('rijk'));
  });

  // GELUIDZONE_WEG — from nwbWegen + Atlas Leefomgeving geluidkaart
  const alo = d.atlasLeefomgeving;
  const ldenWeg = alo?.geluid?.ldenWegverkeer;
  const ldenWegStr = ldenWeg && ldenWeg > 0 ? `${ldenWeg} dB Lden` : null;
  const lnightWeg = alo?.geluid?.lnightWegverkeer;
  const lnightWegStr = lnightWeg && lnightWeg > 0 ? `${lnightWeg} dB Lnight` : null;
  const wegGeluidHoog = ldenWeg !== null && ldenWeg !== undefined && ldenWeg >= 48;
  const wegGeluidStatus = wegGeluidHoog ? 'aandachtspunt' : (rijkswegen.length > 0 ? 'aandachtspunt' : (d.nwbWegen.length > 0 || (ldenWeg && ldenWeg > 0) ? 'relevant' : 'niet_relevant'));
  const wegGeluidWaarde = ldenWegStr
    ? `Wegverkeer: ${ldenWegStr} (grens: 48 dB)${lnightWegStr ? `, nacht: ${lnightWegStr} (grens: 43 dB)` : ''}${rijkswegen.length > 0 ? ` — nabij rijksweg` : ''}`
    : (rijkswegen.length > 0 ? `Nabij rijksweg(en) — geluidzone mogelijk (grens: 48 dB Lden)` : (d.nwbWegen.length > 0 ? 'Wegen in de omgeving' : 'Geen grote wegen binnen 200m'));
  results.push({
    code: 'GELUIDZONE_WEG', theme: 'milieu', humanName: 'Geluidzone weg',
    status: wegGeluidStatus,
    waarde: wegGeluidWaarde,
    toelichting: ldenWegStr
      ? `Gemeten geluidbelasting wegverkeer: ${ldenWegStr}${lnightWegStr ? ` (nacht: ${lnightWegStr})` : ''} (bron: RIVM Atlas Leefomgeving). ${wegGeluidHoog ? '⚠️ De geluidbelasting overschrijdt de voorkeursgrenswaarde van 48 dB Lden — een akoestisch onderzoek is VERPLICHT bij geluidgevoelige functies (art. 3.8 Bkl). ' : ''}De geluidzone langs wegen is vastgesteld in de Wet geluidhinder (art. 74 Wgh / art. 3.8 Bkl). Bij de realisatie van geluidgevoelige functies (woningen, scholen, ziekenhuizen) binnen de geluidzone is een akoestisch onderzoek vereist. De voorkeursgrenswaarde bedraagt 48 dB (Lden). Hogere waarden zijn mogelijk via een hogere-waardenbesluit van B&W.`
      : (rijkswegen.length > 0 ? `Nabij een rijksweg (${d.nwbWegen.filter((f: any) => f.properties?.wegnummer?.startsWith('A')).map((f: any) => f.properties?.wegnummer).filter(Boolean).join(', ') || 'onbekend'}). Geluidzone Wet geluidhinder is van toepassing (art. 74 Wgh / art. 3.8 Bkl). Bij de realisatie van geluidgevoelige functies binnen de geluidzone is een akoestisch onderzoek VERPLICHT.` : 'Raadpleeg de geluidkaart voor de exacte geluidbelasting op deze locatie. Bij geluidgevoelige functies is een akoestisch onderzoek vereist (art. 3.8 Bkl).'),
    bronnen: ldenWegStr ? ['RIVM Atlas Leefomgeving', 'PDOK NWB Wegen', 'Wet geluidhinder art. 74', 'Bkl art. 3.8'] : ['PDOK NWB Wegen', 'Wet geluidhinder art. 74', 'Bkl art. 3.8'],
  });

  // GELUIDZONE_SPOOR — from spoorwegen + Atlas Leefomgeving geluidkaart
  const ldenTrein = alo?.geluid?.ldenTreinverkeer;
  const ldenTreinStr = ldenTrein && ldenTrein > 0 ? `${ldenTrein} dB Lden` : null;
  const spoorGeluidHoog = ldenTrein !== null && ldenTrein !== undefined && ldenTrein >= 55;
  results.push({
    code: 'GELUIDZONE_SPOOR', theme: 'milieu', humanName: 'Geluidzone spoor',
    status: spoorGeluidHoog ? 'aandachtspunt' : (d.spoorwegen.length > 0 ? 'aandachtspunt' : (ldenTrein && ldenTrein > 0 ? 'relevant' : 'niet_relevant')),
    waarde: ldenTreinStr
      ? `Treinverkeer: ${ldenTreinStr} (grens: 55 dB)${d.spoorwegen.length > 0 ? ' — spoorlijn binnen 200m' : ''}`
      : (d.spoorwegen.length > 0 ? `Spoorlijn binnen 200m (grens: 55 dB Lden)` : 'Geen spoorlijnen binnen 200m'),
    toelichting: ldenTreinStr
      ? `Gemeten geluidbelasting treinverkeer: ${ldenTreinStr} (bron: RIVM Atlas Leefomgeving). ${spoorGeluidHoog ? '⚠️ De geluidbelasting overschrijdt de voorkeursgrenswaarde van 55 dB Lden — een akoestisch onderzoek is VERPLICHT. ' : ''}De geluidzone langs spoorwegen is vastgesteld in het Geluidregister (art. 3.25 Bkl / art. 87 Wgh). Daarnaast kan trillingshinder optreden — bij geluidgevoelige functies binnen 100m van het spoor is een trillingsonderzoek aan te bevelen (SBR Richtlijn B).`
      : (d.spoorwegen.length > 0 ? 'Spoorlijn in de directe omgeving. De geluidzone langs spoorwegen is vastgesteld in het Geluidregister (art. 3.25 Bkl / art. 87 Wgh). Bij de realisatie van geluidgevoelige functies binnen de geluidzone is een akoestisch onderzoek verplicht. De voorkeursgrenswaarde bedraagt 55 dB (Lden). Daarnaast kan trillingshinder optreden.' : 'Geen spoorlijnen in de directe omgeving.'),
    bronnen: ldenTreinStr ? ['RIVM Atlas Leefomgeving', 'PDOK Spoorwegen', 'Bkl art. 3.25', 'Wet geluidhinder art. 87'] : ['PDOK Spoorwegen', 'Bkl art. 3.25', 'Wet geluidhinder art. 87'],
  });

  // GELUIDZONE_INDUSTRIE — enhanced with Atlas Leefomgeving
  const ldenIndustrie = alo?.geluid?.ldenIndustrie;
  const ldenIndustrieStr = ldenIndustrie && ldenIndustrie > 0 ? `${ldenIndustrie} dB Lden` : null;
  results.push({
    code: 'GELUIDZONE_INDUSTRIE', theme: 'milieu', humanName: 'Geluidzone industrie',
    status: ldenIndustrie && ldenIndustrie >= 50 ? 'aandachtspunt' : (ldenIndustrieStr ? 'relevant' : 'relevant'),
    waarde: ldenIndustrieStr ? `Industrie: ${ldenIndustrieStr} (grens: 50 dB)` : 'Raadpleeg geluidkaart (grens: 50 dB Lden)',
    toelichting: ldenIndustrieStr
      ? `Gemeten geluidbelasting industrie: ${ldenIndustrieStr} (bron: RIVM Atlas Leefomgeving). Geluidzones rondom gezoneerde industrieterreinen zijn vastgelegd in het bestemmingsplan/omgevingsplan (art. 40 Wgh / art. 3.31 Bkl). Binnen de geluidzone is een akoestisch onderzoek vereist bij geluidgevoelige functies.`
      : 'Geluidzones rondom gezoneerde industrieterreinen zijn vastgelegd in het bestemmingsplan/omgevingsplan (art. 40 Wgh / art. 3.31 Bkl). Binnen de geluidzone is een akoestisch onderzoek vereist bij geluidgevoelige functies. Raadpleeg de geluidkaart van de gemeente.',
    bronnen: ldenIndustrieStr ? ['RIVM Atlas Leefomgeving', 'Wgh art. 40', 'Bkl art. 3.31'] : ['Gemeente', 'Geluidkaart', 'Wgh art. 40', 'Bkl art. 3.31'],
  });

  // GELUIDZONE_LUCHTVAART
  results.push({ code: 'GELUIDZONE_LUCHTVAART', theme: 'milieu', humanName: 'Geluidzone luchtvaart', status: 'relevant', waarde: 'Raadpleeg LIB/luchthavenbesluiten', toelichting: 'Geluidzones rondom luchthavens zijn vastgelegd in het Luchthavenindelingbesluit (LIB, art. 8.1 Wet luchtvaart) en luchthavenbesluiten. Binnen de geluidcontouren gelden beperkingen voor woningbouw en andere geluidgevoelige functies. Bij Schiphol geldt de 20 Ke-contour als buitenste grens. Raadpleeg het LIB voor de exacte contouren en beperkingen.', bronnen: ['LIB', 'Wet luchtvaart art. 8.1', 'Luchthavenbesluiten'] });

  // LUCHTKWALITEIT — from Atlas Leefomgeving + nwbWegen
  const lucht = alo?.luchtkwaliteit;
  const heeftLuchtData = lucht && (lucht.no2 !== null || lucht.pm10 !== null || lucht.pm25 !== null);
  const no2Grens = 40; // µg/m³ jaargemiddelde grenswaarde
  const pm10Grens = 40; // µg/m³ jaargemiddelde grenswaarde
  const pm25Grens = 25; // µg/m³ jaargemiddelde grenswaarde
  const overschrijding = heeftLuchtData && (
    (lucht!.no2 !== null && lucht!.no2 >= no2Grens) ||
    (lucht!.pm10 !== null && lucht!.pm10 >= pm10Grens) ||
    (lucht!.pm25 !== null && lucht!.pm25 >= pm25Grens)
  );
  const luchtWaarde = heeftLuchtData
    ? `NO₂: ${lucht!.no2 ?? '?'}/${no2Grens} µg/m³, PM10: ${lucht!.pm10 ?? '?'}/${pm10Grens} µg/m³, PM2.5: ${lucht!.pm25 ?? '?'}/${pm25Grens} µg/m³ (${lucht!.jaar})`
    : (rijkswegen.length > 0 ? `Nabij drukke weg — grenswaarden: NO₂ ${no2Grens}, PM10 ${pm10Grens}, PM2.5 ${pm25Grens} µg/m³` : 'Geen indicatie luchtkwaliteitsprobleem');
  results.push({
    code: 'LUCHTKWALITEIT', theme: 'milieu', humanName: 'Luchtkwaliteit (NSL)',
    status: overschrijding ? 'aandachtspunt' : (heeftLuchtData ? 'relevant' : (rijkswegen.length > 0 ? 'relevant' : 'niet_relevant')),
    waarde: luchtWaarde,
    toelichting: heeftLuchtData
      ? `Gemeten luchtkwaliteit (${lucht!.jaar}, bron: RIVM Atlas Leefomgeving / NSL): NO₂ = ${lucht!.no2 ?? 'onbekend'} µg/m³ (grenswaarde: ${no2Grens}), PM10 = ${lucht!.pm10 ?? 'onbekend'} µg/m³ (grenswaarde: ${pm10Grens}), PM2.5 = ${lucht!.pm25 ?? 'onbekend'} µg/m³ (grenswaarde: ${pm25Grens}). ${overschrijding ? '⚠️ Grenswaarde overschreden — een luchtkwaliteitsonderzoek is VERPLICHT (art. 5.16 Wet milieubeheer / art. 5.53 Bkl). ' : 'Alle waarden liggen onder de grenswaarden. '}Bij de realisatie van gevoelige bestemmingen (woningen, scholen, kinderopvang) nabij drukke wegen moet worden getoetst aan de grenswaarden voor luchtkwaliteit.`
      : (rijkswegen.length > 0 ? 'Nabij een drukke weg. Raadpleeg de NSL-monitoringstool (nsl-monitoring.nl) voor concentraties fijnstof (PM10/PM2.5) en stikstofdioxide (NO2). Bij de realisatie van gevoelige bestemmingen nabij drukke wegen moet worden getoetst aan de grenswaarden voor luchtkwaliteit (art. 5.16 Wet milieubeheer / art. 5.53 Bkl). De grenswaarden zijn: PM10 <= 40 µg/m³, PM2.5 <= 25 µg/m³, NO2 <= 40 µg/m³ (jaargemiddelde).' : 'Geen directe indicatie van luchtkwaliteitsproblemen op basis van de ligging.'),
    bronnen: heeftLuchtData ? ['RIVM Atlas Leefomgeving', 'NSL Monitoringstool', 'Wet milieubeheer art. 5.16', 'Bkl art. 5.53'] : ['NSL Monitoringstool', 'RIVM', 'Wet milieubeheer art. 5.16', 'Bkl art. 5.53'],
  });

  // GEURZONE — enriched with real geurcontouren data + BRP proxy + bestemmingsplan
  const heeftGeurzone = d.bestemmingen?.gebiedsaanduidingen?.some(
    (ga: any) => (ga.naam || '').toLowerCase().includes('geur')
  ) || false;
  const geurzoneNamen = d.bestemmingen?.gebiedsaanduidingen
    ?.filter((ga: any) => (ga.naam || '').toLowerCase().includes('geur'))
    ?.map((ga: any) => ga.naam) || [];
  // Check BRP for livestock-related parcels (grasland = possible cattle farming)
  const veehouderijProxy = d.brpGewas.filter((f: any) => {
    const gewas = (f.properties?.gewasnaam || f.properties?.gewas || '').toLowerCase();
    return gewas.includes('gras') || gewas.includes('maïs') || gewas.includes('mais') || gewas.includes('snijma') || gewas.includes('voeder');
  });
  // Use real geurcontouren data if available
  const geur = d.geurAnalyse;
  const heeftEchteGeurData = geur && geur.binnenGeurcontour;
  
  let geurStatus: 'aandachtspunt' | 'relevant' | 'niet_relevant' = 'niet_relevant';
  let geurWaarde = 'Geen geurzone';
  let geurToelichting = 'Geen geurzone of geurhinder gedetecteerd op basis van beschikbare data.';
  const geurBronnen: string[] = ['Wet geurhinder en veehouderij'];
  
  if (heeftEchteGeurData) {
    // Real GES score data from provincial WFS
    const gesScore = geur!.gesScore;
    const risicoNiveau = geur!.risiconiveau;
    geurStatus = risicoNiveau === 'hoog' || risicoNiveau === 'zeer_hoog' ? 'aandachtspunt' : (risicoNiveau === 'middel' ? 'aandachtspunt' : 'relevant');
    geurWaarde = `GES ${gesScore}: ${geur!.gesOmschrijving}${geur!.provincie ? ` (${geur!.provincie})` : ''}`;
    geurToelichting = `Geurbelasting gemeten via provinciale geurcontouren (GES-score: ${gesScore}). ${geur!.gesOmschrijving}. ${geur!.aanbevelingen.join(' ')} Bij de realisatie van geurgevoelige objecten (woningen, scholen) is een geuronderzoek vereist op grond van de Wet geurhinder en veehouderij (Wgv) / art. 5.42 Bkl.`;
    geurBronnen.unshift(`Provinciale geurcontouren${geur!.provincie ? ` (${geur!.provincie})` : ''}`);
  } else if (heeftGeurzone) {
    geurStatus = 'aandachtspunt';
    geurWaarde = `Geurzone in bestemmingsplan: ${geurzoneNamen.join(', ')}`;
    geurToelichting = `Gebiedsaanduiding geurzone aanwezig in het bestemmingsplan: ${geurzoneNamen.join(', ')}. Bij de realisatie van geurgevoelige objecten (woningen, scholen) is een geuronderzoek vereist op grond van de Wet geurhinder en veehouderij (Wgv) / art. 5.42 Bkl. De geurbelasting wordt uitgedrukt in odour units (ouE/m3). De norm is afhankelijk van de ligging (concentratiegebied of niet) en het type veehouderij.`;
    geurBronnen.unshift('Ruimtelijkeplannen.nl');
  } else if (veehouderijProxy.length > 0) {
    geurStatus = 'relevant';
    geurWaarde = `Agrarische percelen nabij — geurhinder mogelijk`;
    geurToelichting = `Agrarische percelen (grasland/mais) in de directe omgeving. Dit kan duiden op veehouderij. Bij woningbouw nabij veehouderijen gelden geurafstandsnormen op grond van de Wet geurhinder en veehouderij (Wgv) / art. 5.42 Bkl. De vaste afstanden zijn: 100m in de bebouwde kom en 50m buiten de bebouwde kom. ${geur?.provincie ? `Provincie: ${geur.provincie}. Geen geurcontouren gevonden in provinciale WFS.` : 'Provinciale geurcontouren niet beschikbaar voor deze locatie.'} Raadpleeg de geurkaart van de gemeente.`;
    geurBronnen.unshift('PDOK BRP Gewaspercelen');
  }
  
  results.push({
    code: 'GEURZONE', theme: 'milieu', humanName: 'Geurzone',
    status: geurStatus,
    waarde: geurWaarde,
    toelichting: geurToelichting,
    bronnen: geurBronnen,
    rawData: { geurAnalyse: geur, bestemmingsplanGeurzone: heeftGeurzone, veehouderijProxy: veehouderijProxy.length },
  });

  // TRILLINGEN — from spoorwegen
  results.push({
    code: 'TRILLINGEN', theme: 'milieu', humanName: 'Trillingsgevoelig',
    status: d.spoorwegen.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.spoorwegen.length > 0 ? 'Nabij spoor — trillingshinder mogelijk' : 'Geen trillingsbronnen gedetecteerd',
    toelichting: d.spoorwegen.length > 0 ? 'Nabij een spoorlijn. Trillingshinder kan optreden door treinverkeer. Bij de realisatie van trillingsgevoelige functies (woningen, ziekenhuizen, laboratoria) is een trillingsonderzoek aan te bevelen conform de SBR Richtlijn B "Hinder voor personen in gebouwen" en SBR Richtlijn A "Schade aan gebouwen". Er zijn geen wettelijke grenswaarden voor trillingen, maar de SBR-richtlijnen worden als maatgevend beschouwd in de jurisprudentie. Bij overschrijding van de streefwaarden zijn trillingsreducerende maatregelen nodig.' : 'Geen significante trillingsbronnen gedetecteerd in de directe omgeving.',
    bronnen: ['PDOK Spoorwegen', 'SBR Richtlijn A/B'],
  });

  return results;
}

function computeVeiligheidIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  results.push({
    code: 'BEVI_INRICHTING', theme: 'veiligheid', humanName: 'Bevi-inrichting',
    status: d.revKwetsbaar.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.revKwetsbaar.length > 0 ? `${d.revKwetsbaar.length} risicovolle inrichting(en) binnen 1.5km` : 'Geen risicovolle inrichtingen binnen 1.5km',
    toelichting: d.revKwetsbaar.length > 0 ? (d.revKwetsbaar.length + ' risicovolle inrichting(en) binnen 1,5 km. Op grond van het Besluit externe veiligheid inrichtingen (Bevi / art. 5.12 Bkl) moet bij kwetsbare objecten (woningen, scholen) worden voldaan aan de grenswaarde voor het plaatsgebonden risico (PR <= 10^-6 per jaar). Daarnaast moet het groepsrisico (GR) worden verantwoord. Een kwantitatieve risicoanalyse (QRA) is vereist. Raadpleeg de Risicokaart (risicokaart.nl) voor de exacte risicocontouren.') : 'Geen risicovolle inrichtingen binnen 1,5 km op basis van REV/Risicokaart-data.',
    bronnen: ['RIVM Risicokaart', 'Bevi', 'Bkl art. 5.12'],
  });

  results.push({
    code: 'BUISLEIDING', theme: 'veiligheid', humanName: 'Buisleiding (gevaarlijke stoffen)',
    status: d.revBuisleiding.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.revBuisleiding.length > 0 ? `Buisleiding(en) binnen 200m` : 'Geen buisleidingen binnen 200m',
    toelichting: d.revBuisleiding.length > 0 ? 'Buisleiding(en) met gevaarlijke stoffen in de directe omgeving. Op grond van het Besluit externe veiligheid buisleidingen (Bevb / art. 5.15 Bkl) gelden veiligheidsafstanden en een belemmeringenstrook (5 meter aan weerszijden). Binnen de belemmeringenstrook mag niet worden gebouwd. Het plaatsgebonden risico (PR) en groepsrisico (GR) moeten worden beoordeeld. Een KLIC-melding is verplicht bij grondwerkzaamheden.' : 'Geen buisleidingen met gevaarlijke stoffen gedetecteerd.',
    bronnen: ['RIVM Risicokaart', 'Bevb', 'Bkl art. 5.15'],
  });

  // RISICOCONTOUR — derived from revKwetsbaar
  results.push({
    code: 'RISICOCONTOUR', theme: 'veiligheid', humanName: 'Risicocontour (PR/GR)',
    status: d.revKwetsbaar.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.revKwetsbaar.length > 0 ? 'Risicocontouren mogelijk van toepassing' : 'Geen risicocontouren',
    toelichting: d.revKwetsbaar.length > 0 ? 'Bij nabijheid van risicovolle inrichtingen gelden risicocontouren. Het plaatsgebonden risico (PR) is de kans per jaar dat een persoon op een bepaalde afstand overlijdt als gevolg van een ongeval. De grenswaarde is PR <= 10^-6/jaar voor kwetsbare objecten (Bevi / art. 5.12 Bkl). Het groepsrisico (GR) betreft de kans op een ongeval met meerdere slachtoffers en moet worden verantwoord in de ruimtelijke onderbouwing. Raadpleeg de Risicokaart (risicokaart.nl) voor de exacte contouren.' : 'Geen risicocontouren van toepassing op basis van beschikbare data.',
    bronnen: ['RIVM Risicokaart', 'Bevi', 'Bkl art. 5.12'],
  });

  results.push({
    code: 'LPG_TANKSTATION', theme: 'veiligheid', humanName: 'LPG-tankstation',
    status: d.revLpg.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.revLpg.length > 0 ? `LPG-tankstation binnen 150m` : 'Geen LPG-tankstation binnen 150m',
    toelichting: d.revLpg.length > 0 ? 'LPG-tankstation in de directe omgeving. Op grond van het Bevi (art. 5.12 Bkl) gelden vaste veiligheidsafstanden: 45m tot kwetsbare objecten (bij doorzet <= 1.500 m3/jr), 110m invloedsgebied voor groepsrisicoverantwoording. Binnen deze afstanden is woningbouw niet toegestaan. Raadpleeg de Risicokaart voor de exacte contouren.' : 'Geen LPG-tankstations binnen 150m.',
    bronnen: ['RIVM Risicokaart', 'Bevi', 'Bkl art. 5.12'],
  });

  results.push({
    code: 'VUURWERK_OPSLAG', theme: 'veiligheid', humanName: 'Vuurwerkopslag',
    status: d.revVuurwerk.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.revVuurwerk.length > 0 ? `Vuurwerkopslag binnen 800m` : 'Geen vuurwerkopslag binnen 800m',
    toelichting: d.revVuurwerk.length > 0 ? 'Vuurwerkopslagplaats in de omgeving. Op grond van het Vuurwerkbesluit en het Bevi gelden veiligheidsafstanden tot kwetsbare en beperkt kwetsbare objecten. De afstanden zijn afhankelijk van de opslagcategorie en hoeveelheid. Binnen de veiligheidsafstand is woningbouw niet toegestaan. Raadpleeg de Risicokaart voor de exacte contouren.' : 'Geen vuurwerkopslagplaatsen gedetecteerd in de omgeving.',
    bronnen: ['RIVM Risicokaart', 'Vuurwerkbesluit', 'Bevi'],
  });

  return results;
}

function computeErfgoedIndicatoren(d: DatasetBundle, lat: number, lng: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  // RIJKSMONUMENT — uses RCE ps-ch WFS (rce_inspire_points)
  // Properties: namespace='nlps-rijksmonumenten', text=name, ci_citation=link
  const monumenten = d.rijksmonumenten.filter((f: any) => {
    const ns = f.properties?.namespace || '';
    return ns.includes('rijksmonumenten');
  });
  const opLocatie = monumenten.filter((f: any) => {
    if (!f.geometry?.coordinates) return false;
    // RCE ps-ch returns EPSG:28992 coordinates, convert centroid for distance
    const coords = f.geometry.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      try {
        const [wgsLon, wgsLat] = proj4('EPSG:28992', 'EPSG:4326', [coords[0], coords[1]]);
        return berekenAfstand(lng, lat, wgsLon, wgsLat) < 50;
      } catch { return false; }
    }
    return false;
  });
  const monumentNaam = opLocatie.length > 0 ? (opLocatie[0]?.properties?.text || 'onbekend') : '';
  results.push({
    code: 'RIJKSMONUMENT', theme: 'erfgoed', humanName: 'Rijksmonument',
    status: opLocatie.length > 0 ? 'aandachtspunt' : (monumenten.length > 0 ? 'relevant' : 'niet_relevant'),
    waarde: opLocatie.length > 0 ? `Rijksmonument op locatie${monumentNaam ? `: ${monumentNaam}` : ''}` : (monumenten.length > 0 ? `${monumenten.length} monument(en) binnen 500m` : 'Geen monumenten binnen 500m'),
    toelichting: opLocatie.length > 0 ? `Dit pand is (mogelijk) een rijksmonument${monumentNaam ? ` (${monumentNaam})` : ''}. Voor elke wijziging aan een rijksmonument is een omgevingsvergunning voor een rijksmonumentenactiviteit vereist (art. 5.1 lid 1 sub b Omgevingswet / art. 13.7 Bkl). Dit geldt voor zowel het exterieur als het interieur. De Rijksdienst voor het Cultureel Erfgoed (RCE) brengt advies uit bij ingrijpende wijzigingen. Sloop is in principe niet toegestaan.${opLocatie[0]?.properties?.ci_citation ? ` Zie: ${opLocatie[0].properties.ci_citation}` : ''}` : (monumenten.length > 0 ? `${monumenten.length} rijksmonument(en) in de omgeving. Bij bouwactiviteiten nabij rijksmonumenten moet rekening worden gehouden met de monumentale waarden en het beschermde gezichtsveld.` : 'Geen rijksmonumenten in de directe omgeving.'),
    bronnen: ['RCE Rijksmonumenten', 'Omgevingswet art. 5.1', 'Bkl art. 13.7'],
  });

  results.push({ code: 'GEMEENTELIJK_MONUMENT', theme: 'erfgoed', humanName: 'Gemeentelijk monument', status: 'relevant', waarde: 'Raadpleeg gemeentelijke monumentenlijst', toelichting: 'Gemeentelijke monumenten zijn niet centraal beschikbaar als open dataset. Raadpleeg de gemeentelijke monumentenlijst. Voor wijzigingen aan gemeentelijke monumenten is een omgevingsvergunning vereist op grond van het omgevingsplan (art. 4.1 Omgevingswet). De gemeente kan aanvullende eisen stellen aan materiaalgebruik, kleurstelling en detaillering. De gemeentelijke monumentencommissie brengt advies uit.', bronnen: ['Gemeente', 'Omgevingswet art. 4.1'] });

  // BESCHERMD_GEZICHT — uses RCE ps-ch WFS (rce_inspire_polygons)
  // Properties: namespace='nlps-stadsendorpsgezichten', text=name, ci_citation=link
  const gezichten = d.beschermdGezicht.filter((f: any) => {
    const ns = f.properties?.namespace || '';
    return ns.includes('stadsendorpsgezichten') || ns.includes('beschermd');
  });
  const gezichtNaam = gezichten.length > 0 ? (gezichten[0]?.properties?.text || 'onbekend') : '';
  results.push({
    code: 'BESCHERMD_GEZICHT', theme: 'erfgoed', humanName: 'Beschermd stads-/dorpsgezicht',
    status: gezichten.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: gezichten.length > 0 ? `Binnen beschermd gezicht: ${gezichtNaam}` : 'Niet in beschermd gezicht',
    toelichting: gezichten.length > 0 ? `Locatie binnen een beschermd stads- of dorpsgezicht: ${gezichtNaam}. In een beschermd gezicht gelden aanvullende regels: sloopvergunningplicht (art. 5.1 lid 1 sub a Omgevingswet), extra welstandseisen, en bescherming van het historische karakter. Nieuwbouw en verbouw moeten passen binnen het beschermde gezicht. De gemeentelijke welstandscommissie en/of monumentencommissie brengt advies uit.${gezichten[0]?.properties?.ci_citation ? ` Zie: ${gezichten[0].properties.ci_citation}` : ''}` : 'Niet in een beschermd stads- of dorpsgezicht.',
    bronnen: ['RCE Beschermde Gezichten', 'Omgevingswet art. 5.1'],
  });

  results.push({
    code: 'ARCHEOLOGIE', theme: 'erfgoed', humanName: 'Archeologische verwachtingswaarde',
    status: d.ikaw.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.ikaw.length > 0 ? `Archeologische verwachting: ${d.ikaw[0]?.properties?.verwachting || d.ikaw[0]?.properties?.waarde || 'aanwezig'}` : 'Geen archeologische verwachting',
    toelichting: d.ikaw.length > 0 ? `Archeologische verwachtingswaarde op deze locatie: ${d.ikaw[0]?.properties?.verwachting || d.ikaw[0]?.properties?.waarde || 'aanwezig'}. Bij bodemingrepen dieper dan de gemeentelijke vrijstellingsgrens (vaak 30-50 cm) en groter dan de vrijstellingsoppervlakte (vaak 100-2500 m2) is archeologisch vooronderzoek vereist (art. 5.1 lid 1 sub a Omgevingswet / Verdrag van Malta). Het onderzoek bestaat uit bureauonderzoek, eventueel gevolgd door booronderzoek en/of proefsleuvenonderzoek. Kosten komen voor rekening van de verstoorder.` : 'Geen bekende archeologische verwachtingswaarde op basis van de IKAW. Raadpleeg de gemeentelijke archeologische beleidskaart voor lokale verwachtingen.',
    bronnen: ['RCE IKAW', 'Verdrag van Malta', 'Omgevingswet art. 5.1'],
  });

  results.push({ code: 'CULTUURLANDSCHAP', theme: 'erfgoed', humanName: 'Cultuurhistorisch landschap', status: 'relevant', waarde: 'Raadpleeg CHS', toelichting: 'Cultuurhistorische waarden zijn vastgelegd in de Cultuurhistorische Hoofdstructuur (CHS) van de provincie. Bij ruimtelijke plannen moet rekening worden gehouden met cultuurhistorische waarden (art. 3.1.6 lid 5 Bro / art. 5.130 Bkl). De provincie kan in de omgevingsverordening regels stellen ter bescherming van cultuurhistorische waarden. Raadpleeg de provinciale cultuurhistorische waardenkaart.', bronnen: ['Provincie', 'RCE', 'Bro art. 3.1.6', 'Bkl art. 5.130'] });

  results.push({
    code: 'HISTORISCHE_BUITENPLAATS', theme: 'erfgoed', humanName: 'Historische buitenplaats',
    status: d.histBuitenplaats.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.histBuitenplaats.length > 0 ? `Historische buitenplaats binnen 500m` : 'Geen historische buitenplaats binnen 500m',
    toelichting: d.histBuitenplaats.length > 0 ? 'Historische buitenplaats in de omgeving. Historische buitenplaatsen zijn vaak rijksmonumenten of liggen in een beschermd gezicht. Bescherming van zichtlijnen, landschappelijke setting en historische tuinaanleg is van belang. Bij ruimtelijke ontwikkelingen in de omgeving moet rekening worden gehouden met de cultuurhistorische waarden van de buitenplaats.' : 'Geen historische buitenplaatsen in de directe omgeving.',
    bronnen: ['RCE Historische Buitenplaatsen'],
  });

  // VERDRAG_MALTA — derived from IKAW
  results.push({
    code: 'VERDRAG_MALTA', theme: 'erfgoed', humanName: 'Verdrag van Malta',
    status: d.ikaw.length > 0 ? 'aandachtspunt' : 'relevant',
    waarde: d.ikaw.length > 0 ? 'Archeologisch onderzoek mogelijk vereist' : 'Vrijstellingsgrenzen controleren',
    toelichting: d.ikaw.length > 0 ? 'Op basis van de archeologische verwachtingswaarde kan archeologisch vooronderzoek vereist zijn conform het Verdrag van Malta (1992), geimplementeerd in de Omgevingswet (art. 5.1 lid 1 sub a). De gemeente stelt vrijstellingsgrenzen vast in het omgevingsplan (oppervlakte en diepte). Raadpleeg de gemeentelijke archeologische beleidskaart voor de exacte vrijstellingsgrenzen.' : 'Raadpleeg de gemeentelijke archeologische beleidskaart en vrijstellingsgrenzen. Het Verdrag van Malta (1992) verplicht tot het meewegen van archeologische waarden bij ruimtelijke besluiten.',
    bronnen: ['Verdrag van Malta', 'Gemeente', 'Omgevingswet art. 5.1'],
  });

  // WERELDERFGOED
  results.push({
    code: 'WERELDERFGOED', theme: 'erfgoed', humanName: 'UNESCO Werelderfgoed',
    status: d.werelderfgoed.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.werelderfgoed.length > 0 ? `Nabij werelderfgoed: ${d.werelderfgoed[0]?.properties?.naam || 'ja'}` : 'Geen werelderfgoed',
    toelichting: d.werelderfgoed.length > 0 ? `Nabij UNESCO Werelderfgoed: ${d.werelderfgoed[0]?.properties?.naam || 'onbekend'}. UNESCO Werelderfgoed geniet de hoogste bescherming. De Outstanding Universal Value (OUV) mag niet worden aangetast. Bij ruimtelijke ontwikkelingen in de bufferzone moet een Heritage Impact Assessment (HIA) worden uitgevoerd. Nederland heeft zich verplicht tot bescherming via het Werelderfgoedverdrag (1972).` : 'Geen UNESCO Werelderfgoed in de directe omgeving.',
    bronnen: ['RCE Werelderfgoed', 'UNESCO', 'Werelderfgoedverdrag 1972'],
  });

  return results;
}

function computeAgrarischIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const brp = d.brpGewas;
  const glasFeatures = brp.filter((f: any) => {
    const gewas = (f.properties?.gewasnaam || f.properties?.gewas || '').toLowerCase();
    return gewas.includes('glas') || gewas.includes('kas') || gewas.includes('tuinbouw');
  });

  results.push({
    code: 'GEWASPERCEEL', theme: 'agrarisch', humanName: 'Gewasperceel (BRP)',
    status: brp.length > 0 ? 'relevant' : 'niet_relevant',
    waarde: brp.length > 0 ? `Gewas: ${brp[0]?.properties?.gewasnaam || brp[0]?.properties?.gewas || 'onbekend'}` : 'Geen gewasperceel',
    toelichting: brp.length > 0 ? `Gewasperceel geregistreerd in de Basisregistratie Gewaspercelen (BRP): ${brp.map((f: any) => f.properties?.gewasnaam || f.properties?.gewas).filter(Boolean).join(', ')}. De BRP bevat de jaarlijkse opgave van landbouwpercelen. De aanwezigheid van gewaspercelen is relevant voor: spuitzones (50m richtafstand), geurcontouren veehouderij, en de beoordeling van agrarische functies in het bestemmingsplan.` : 'Geen geregistreerd gewasperceel in de BRP. Dit kan betekenen dat de locatie niet agrarisch in gebruik is.',
    bronnen: ['PDOK BRP Gewaspercelen'],
  });

  // GEURCONTOUR_VEEHOUDERIJ — derived from BRP gewaspercelen + gebiedsaanduiding geurzone
  const heeftGeurAanduiding = d.bestemmingen?.gebiedsaanduidingen?.some(
    (ga: any) => (ga.naam || '').toLowerCase().includes('geur')
  ) || false;
  const veehouderijPercelen = brp.filter((f: any) => {
    const gewas = (f.properties?.gewasnaam || f.properties?.gewas || '').toLowerCase();
    return gewas.includes('gras') || gewas.includes('maïs') || gewas.includes('mais') || gewas.includes('snijma') || gewas.includes('voeder');
  });
  
  let geurVeeStatus: 'aandachtspunt' | 'relevant' | 'niet_relevant' = 'niet_relevant';
  let geurVeeWaarde = 'Geen geurcontour veehouderij';
  let geurVeeToelichting = 'Geen aanwijzingen voor geurcontouren van veehouderijen.';
  
  if (heeftGeurAanduiding) {
    geurVeeStatus = 'aandachtspunt';
    const geurNamen = d.bestemmingen?.gebiedsaanduidingen
      ?.filter((ga: any) => (ga.naam || '').toLowerCase().includes('geur'))
      ?.map((ga: any) => ga.naam) || [];
    geurVeeWaarde = `Geurzone in bestemmingsplan: ${geurNamen.join(', ')}`;
    geurVeeToelichting = `Geurzone aanwezig in het bestemmingsplan: ${geurNamen.join(', ')}. Bij nieuwe geurgevoelige objecten (woningen) is een geurberekening vereist conform de Wet geurhinder en veehouderij (Wgv) / art. 5.42 Bkl. De geurbelasting wordt bepaald met het verspreidingsmodel V-Stacks. De norm is afhankelijk van het type veehouderij en de ligging (concentratiegebied of niet).`;
  } else if (veehouderijPercelen.length > 0) {
    geurVeeStatus = 'relevant';
    geurVeeWaarde = `Agrarische percelen nabij — geurcontour mogelijk`;
    geurVeeToelichting = `Agrarische percelen (grasland/mais) in de directe omgeving, wat kan duiden op veehouderij. Geurafstandsnormen kunnen van toepassing zijn op grond van de Wet geurhinder en veehouderij (Wgv) / art. 5.42 Bkl. De vaste afstanden zijn: 100m in de bebouwde kom en 50m buiten de bebouwde kom. Raadpleeg de gemeentelijke geurkaart voor de exacte geurcontouren.`;
  }
  
  results.push({
    code: 'GEURCONTOUR_VEEHOUDERIJ', theme: 'agrarisch', humanName: 'Geurcontour veehouderij',
    status: geurVeeStatus,
    waarde: geurVeeWaarde,
    toelichting: geurVeeToelichting,
    bronnen: ['Ruimtelijkeplannen.nl', 'PDOK BRP Gewaspercelen', 'Wet geurhinder en veehouderij'],
  });

  results.push({
    code: 'GLASTUINBOUW', theme: 'agrarisch', humanName: 'Glastuinbouwgebied',
    status: glasFeatures.length > 0 ? 'relevant' : 'niet_relevant',
    waarde: glasFeatures.length > 0 ? 'Glastuinbouw in de omgeving' : 'Geen glastuinbouw',
    toelichting: glasFeatures.length > 0 ? 'Glastuinbouw in de omgeving gedetecteerd via BRP. Bij glastuinbouw zijn de volgende aspecten relevant: lichthinder (assimilatieverlichting), gewasbeschermingsmiddelen (spuitzone 50m), energiegebruik (WKK-installaties), en waterverbruik. De provincie kan in de omgevingsverordening regels stellen voor glastuinbouwconcentratiegebieden.' : 'Geen glastuinbouw gedetecteerd in de BRP-data.',
    bronnen: ['PDOK BRP Gewaspercelen', 'Provinciale Omgevingsverordening'],
  });

  results.push({
    code: 'LANDBOUWGROND', theme: 'agrarisch', humanName: 'Landbouwgrond',
    status: brp.length > 0 ? 'relevant' : 'niet_relevant',
    waarde: brp.length > 0 ? 'Agrarische grond' : 'Geen agrarische grond',
    toelichting: brp.length > 0 ? 'Locatie op of nabij agrarische grond (BRP). Bij functiewijziging van agrarisch naar een andere bestemming (bijv. wonen) is een bestemmingsplanwijziging of omgevingsplanwijziging vereist (art. 4.1 Omgevingswet). Hierbij moet rekening worden gehouden met de Ladder voor duurzame verstedelijking (art. 3.1.6 lid 2 Bro / art. 5.129g Bkl) en de provinciale regels voor het buitengebied.' : 'Geen agrarische grond op basis van BRP-data.',
    bronnen: ['PDOK BRP Gewaspercelen', 'Omgevingswet art. 4.1'],
  });

  results.push({ code: 'MESTVERWERKING', theme: 'agrarisch', humanName: 'Mestverwerkingslocatie', status: 'niet_relevant', waarde: 'Geen centraal register', toelichting: 'Mestverwerkingsinstallaties zijn niet centraal beschikbaar als open dataset. Mestverwerkingsinstallaties vallen onder de Wet milieubeheer en het Activiteitenbesluit. Bij nabijheid gelden geurafstanden en milieuzonering. Raadpleeg de gemeente en de provinciale omgevingsverordening.', bronnen: ['Gemeente', 'Activiteitenbesluit'] });

  results.push({
    code: 'SPUITZONE', theme: 'agrarisch', humanName: 'Spuitzone',
    status: brp.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: brp.length > 0 ? 'Spuitzone mogelijk van toepassing (50m)' : 'Geen spuitzone',
    toelichting: brp.length > 0 ? 'Nabij agrarische percelen. Bij de realisatie van geurgevoelige of kwetsbare objecten (woningen, scholen) geldt een richtafstand van 50 meter tot percelen waar gewasbeschermingsmiddelen worden gebruikt (jurisprudentie / VNG-brochure Bedrijven en milieuzonering). Deze afstand is gebaseerd op het voorzorgsbeginsel ter bescherming van de gezondheid. Bij fruitteelt en boomkwekerij kan een grotere afstand nodig zijn.' : 'Geen agrarische percelen in de directe omgeving.',
    bronnen: ['VNG Bedrijven en milieuzonering', 'Jurisprudentie'],
  });

  results.push({ code: 'DIERENWELZIJN', theme: 'agrarisch', humanName: 'Dierenwelzijnszone', status: 'niet_relevant', waarde: 'Niet van toepassing', toelichting: 'Dierenwelzijnszones zijn relevant bij nieuwe veehouderijen of uitbreiding van bestaande veehouderijen. De provincie kan in de omgevingsverordening regels stellen over dieraantallen, staloppervlakte en uitloopmogelijkheden. Raadpleeg de provinciale omgevingsverordening en het Besluit emissiearme huisvesting.', bronnen: ['Provinciale Omgevingsverordening', 'Besluit emissiearme huisvesting'] });

  return results;
}

function computeInfraIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const rijkswegen = d.nwbWegen.filter((f: any) => {
    const wegnummer = f.properties?.wegnummer || '';
    const beheerder = (f.properties?.wegbeheerdersoort || '').toLowerCase();
    return wegnummer.startsWith('A') || (wegnummer.startsWith('N') && beheerder.includes('rijk'));
  });

  results.push({ code: 'HOOGSPANNING', theme: 'infra', humanName: 'Hoogspanningsleiding', status: 'relevant', waarde: 'Raadpleeg KLIC/netbeheerder', toelichting: 'Hoogspanningsleidingen en magneetveldzones zijn niet centraal beschikbaar als open WFS. Bij hoogspanningsleidingen geldt het RIVM-advies om geen gevoelige bestemmingen (woningen, scholen) te realiseren binnen de magneetveldzone (0,4 microtesla jaargemiddelde). Dit is vastgelegd in de beleidsbrief van het ministerie van VROM (2005). Raadpleeg het Kadaster (KLIC) of de netbeheerder (TenneT/Stedin/Liander) voor de exacte ligging en magneetveldzone.', bronnen: ['Kadaster KLIC', 'Netbeheerder', 'RIVM magneetveldadvies'] });

  results.push({ code: 'GASLEIDING', theme: 'infra', humanName: 'Gasleiding (hogedruk)', status: 'relevant', waarde: 'Raadpleeg KLIC/netbeheerder', toelichting: 'Hogedruk gasleidingen en veiligheidsstroken zijn beschikbaar via KLIC-melding. Langs hogedruk gasleidingen geldt een belemmeringenstrook (4-5 meter aan weerszijden) en een veiligheidsafstand op grond van het Besluit externe veiligheid buisleidingen (Bevb / art. 5.15 Bkl). Binnen de belemmeringenstrook mag niet worden gebouwd. Een KLIC-melding is verplicht bij grondwerkzaamheden (WIBON).', bronnen: ['Kadaster KLIC', 'Gasunie', 'Bevb', 'WIBON'] });

  results.push({ code: 'KLIC_MELDING', theme: 'infra', humanName: 'KLIC-melding vereist', status: 'aandachtspunt', waarde: 'Altijd vereist bij graven', toelichting: 'Bij mechanisch graven is een KLIC-melding verplicht op grond van de Wet informatie-uitwisseling bovengrondse en ondergrondse netten en netwerken (WIBON, art. 2). De melding moet minimaal 3 werkdagen voor aanvang van de graafwerkzaamheden worden gedaan bij het Kadaster. Netbeheerders leveren binnen 2 werkdagen de liggingsgegevens aan. Het niet doen van een KLIC-melding is een overtreding die kan leiden tot boetes en aansprakelijkheid voor schade.', bronnen: ['Kadaster KLIC', 'WIBON art. 2'] });

  results.push({
    code: 'SPOORWEG', theme: 'infra', humanName: 'Spoorweg',
    status: d.spoorwegen.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: d.spoorwegen.length > 0 ? `Spoorlijn binnen 200m` : 'Geen spoorlijnen binnen 200m',
    toelichting: d.spoorwegen.length > 0 ? 'Spoorlijn in de directe omgeving. Langs spoorwegen gelden veiligheidszones (Basisnet Spoor / art. 5.12 Bkl), geluidzones (art. 87 Wgh / art. 3.25 Bkl) en trillingshinder (SBR Richtlijn B). Bij de realisatie van kwetsbare objecten nabij het spoor moet rekening worden gehouden met het plaatsgebonden risico, groepsrisico en het plasbrandaandachtsgebied.' : 'Geen spoorlijnen in de directe omgeving.',
    bronnen: ['PDOK Spoorwegen', 'Basisnet Spoor', 'Bkl art. 5.12'],
  });

  results.push({
    code: 'RIJKSWEG', theme: 'infra', humanName: 'Rijksweg',
    status: rijkswegen.length > 0 ? 'aandachtspunt' : 'niet_relevant',
    waarde: rijkswegen.length > 0 ? `Rijksweg ${rijkswegen[0]?.properties?.wegnummer || ''} binnen 600m` : 'Geen rijkswegen binnen 600m',
    toelichting: rijkswegen.length > 0 ? `Rijksweg ${rijkswegen[0]?.properties?.wegnummer || ''} in de omgeving. Langs rijkswegen gelden geluidzones (art. 74 Wgh / art. 3.8 Bkl), luchtkwaliteitsnormen (art. 5.16 Wm) en externe veiligheidscontouren (Basisnet Weg / art. 5.12 Bkl). Bij de realisatie van geluidgevoelige functies is een akoestisch onderzoek verplicht.` : 'Geen rijkswegen in de directe omgeving.',
    bronnen: ['PDOK NWB Wegen', 'Wgh art. 74', 'Bkl art. 3.8'],
  });

  results.push({ code: 'VAARWEG', theme: 'infra', humanName: 'Vaarweg', status: 'niet_relevant', waarde: 'Raadpleeg NWB Vaarwegen', toelichting: 'Vaarwegen zijn beschikbaar via PDOK NWB Vaarwegen. Langs vaarwegen gelden beschermingszones en oeverbeperkingen. Bij bouwactiviteiten nabij vaarwegen is een watervergunning van Rijkswaterstaat of het waterschap vereist. Raadpleeg de Vaarwegenkaart voor classificatie en beperkingen.', bronnen: ['PDOK NWB Vaarwegen', 'Rijkswaterstaat'] });

  return results;
}

function computeMobiliteitIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  results.push({ code: 'PARKEERDRUK', theme: 'mobiliteit', humanName: 'Parkeerdruk', status: 'relevant', waarde: 'Raadpleeg gemeentelijke parkeernormen', toelichting: 'Parkeernormen zijn gemeentelijk vastgesteld in het omgevingsplan of de parkeernota. Bij nieuwbouw of functiewijziging moeten voldoende parkeerplaatsen worden gerealiseerd conform de CROW-publicatie 381 "Toekomstbestendig parkeren". De parkeernorm is afhankelijk van de functie, locatie (stedelijkheidsgraad) en OV-bereikbaarheid. Bij onvoldoende parkeerplaatsen kan de omgevingsvergunning worden geweigerd.', bronnen: ['Gemeente', 'CROW publicatie 381'] });

  results.push({
    code: 'OV_BEREIKBAARHEID', theme: 'mobiliteit', humanName: 'OV-bereikbaarheid',
    status: d.stations.length > 0 ? 'relevant' : 'niet_relevant',
    waarde: d.stations.length > 0 ? `${d.stations.length} station(s) binnen 1km` : 'Geen stations binnen 1km',
    toelichting: d.stations.length > 0 ? `Station(s) binnen 1 km: ${d.stations.map((f: any) => f.properties?.naam || f.properties?.station_naam).filter(Boolean).join(', ')}. Goede OV-bereikbaarheid kan leiden tot lagere parkeernormen (CROW publicatie 381). Bij stationslocaties kan de gemeente een lagere parkeernorm hanteren. De nabijheid van OV is ook relevant voor de Ladder voor duurzame verstedelijking (art. 3.1.6 lid 2 Bro / art. 5.129g Bkl).` : 'Geen treinstations binnen 1 km.',
    bronnen: ['PDOK Spoorwegen', 'CROW publicatie 381'],
  });

  results.push({ code: 'FIETSROUTE', theme: 'mobiliteit', humanName: 'Fietsroute', status: 'niet_relevant', waarde: 'Raadpleeg fietsroutenetwerk', toelichting: 'Hoofdfietsroutes zijn niet centraal beschikbaar als open WFS. Bij ruimtelijke ontwikkelingen moet rekening worden gehouden met het fietsroutenetwerk. De gemeente en provincie hebben fietsbeleid vastgelegd in het mobiliteitsplan. Raadpleeg de gemeentelijke fietskaart voor de ligging van hoofdfietsroutes en snelfietsroutes.', bronnen: ['Gemeente', 'Provincie'] });

  return results;
}

function computeOverigIndicatoren(d: DatasetBundle): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  results.push({ code: 'ZORGINSTELLING', theme: 'overig', humanName: 'Zorginstelling nabijheid', status: 'niet_relevant', waarde: 'Handmatig te controleren', toelichting: 'Nabijheid van zorginstellingen is relevant bij externe veiligheid. Zorginstellingen zijn kwetsbare objecten in de zin van het Bevi (art. 1 lid 1 sub l). Bij de realisatie van risicovolle activiteiten nabij zorginstellingen gelden strenge veiligheidsafstanden. Raadpleeg de Risicokaart voor de ligging van kwetsbare objecten.', bronnen: ['Risicokaart.nl', 'Bevi'] });
  results.push({ code: 'SCHOOL_KINDEROPVANG', theme: 'overig', humanName: 'School / Kinderopvang', status: 'niet_relevant', waarde: 'Handmatig te controleren', toelichting: 'Nabijheid van scholen en kinderopvang is relevant bij externe veiligheid (kwetsbare objecten conform Bevi) en milieuzonering (VNG-brochure Bedrijven en milieuzonering). Bij de realisatie van milieubelastende activiteiten nabij scholen gelden aanvullende afstandseisen. Ook relevant voor luchtkwaliteit (GGD-richtlijn).', bronnen: ['Risicokaart.nl', 'Bevi', 'VNG Bedrijven en milieuzonering'] });
  results.push({ code: 'LUCHTVAART_BEPERKING', theme: 'overig', humanName: 'Luchtvaartbeperking', status: 'relevant', waarde: 'Raadpleeg LIB', toelichting: 'Luchtvaartbeperkingen en hoogterestricties zijn vastgelegd in het Luchthavenindelingbesluit (LIB, art. 8.1 Wet luchtvaart). Het LIB bevat: geluidcontouren (beperking woningbouw), hoogtebeperkingen (obstakelvrije zones), vogelaantrekkende bestemmingen (beperking nabij luchthavens), en externe veiligheidscontouren. Raadpleeg het LIB en de ILT voor de exacte beperkingen.', bronnen: ['LIB', 'ILT', 'Wet luchtvaart art. 8.1'] });
  results.push({ code: 'DEFENSIE_ZONE', theme: 'overig', humanName: 'Defensiezone', status: 'niet_relevant', waarde: 'Raadpleeg Defensie', toelichting: 'Militaire zones en beperkingsgebieden zijn relevant bij hoge gebouwen en windturbines. Het Ministerie van Defensie heeft beperkingsgebieden vastgesteld rondom militaire luchthavens, radarstations en oefenterreinen. Bij bouwhoogtes boven 100 meter is toestemming van Defensie vereist. Raadpleeg het Ministerie van Defensie en de ILT voor de exacte beperkingsgebieden.', bronnen: ['Ministerie van Defensie', 'ILT'] });

  return results;
}

// ============ MAIN SCAN FUNCTION ============

export async function uitvoerenOmgevingsscan(locatie: ScanLocatie): Promise<ScanResultaat> {
  const startTime = Date.now();
  console.log(`[Engine] Start scan voor ${locatie.adres} (${locatie.lat}, ${locatie.lng})`);

  // STEP 1: Fetch ALL datasets in parallel (one call per dataset)
  const datasets = await fetchAllDatasets(locatie.lat, locatie.lng);

  // Extract bouwjaar from PDOK data
  const bouwjaar = datasets.pdok?.bag?.pand?.bouwjaar;

  // STEP 2: Compute all indicators from cached datasets (no API calls)
  const alleIndicatoren: IndicatorResult[] = [
    ...computeBasisIndicatoren(datasets, locatie.lat, locatie.lng),
    ...computePlanIndicatoren(datasets),
    ...computeDSOIndicatoren(datasets, locatie.lat, locatie.lng),
    ...computeNatuurIndicatoren(datasets, locatie.lat, locatie.lng),
    ...computeLandschapIndicatoren(datasets),
    ...computeWaterIndicatoren(datasets, locatie.lat, locatie.lng),
    ...computeBodemIndicatoren(datasets, bouwjaar),
    ...computeMilieuIndicatoren(datasets),
    ...computeVeiligheidIndicatoren(datasets),
    ...computeErfgoedIndicatoren(datasets, locatie.lat, locatie.lng),
    ...computeAgrarischIndicatoren(datasets),
    ...computeInfraIndicatoren(datasets),
    ...computeMobiliteitIndicatoren(datasets),
    ...computeOverigIndicatoren(datasets),
  ];

  // STEP 2b: RELEVANCE ROUTER — use plan data to upgrade indicator statuses
  applyRelevanceRouter(alleIndicatoren, datasets.bestemmingen);

  // STEP 2c: ACTIVITEIT FILTER — markeer niet-relevante indicatoren op basis van activiteittype
  // MAAR: ALTIJD_CHECKEN_INDICATOREN worden NOOIT weggefilterd (wettelijke plicht)
  const activiteitType = locatie.activiteitType || 'onbekend';
  const relevanteIndicatorCodes = ACTIVITEIT_INDICATOR_MATRIX[activiteitType];
  
  let gefilterd = alleIndicatoren;
  if (relevanteIndicatorCodes.length > 0) {
    // Markeer indicatoren die niet relevant zijn voor dit activiteittype
    // UITZONDERING: ALTIJD_CHECKEN_INDICATOREN en indicatoren met status 'aandachtspunt' worden NOOIT weggefilterd
    gefilterd = alleIndicatoren.map(ind => {
      // Nooit wegfilteren: wettelijk verplichte checks
      if (ALTIJD_CHECKEN_INDICATOREN.includes(ind.code)) return ind;
      // Nooit wegfilteren: aandachtspunten (er is iets gevonden)
      if (ind.status === 'aandachtspunt') return ind;
      // Wegfilteren als niet in de activiteitenmatrix
      if (!relevanteIndicatorCodes.includes(ind.code)) {
        return {
          ...ind,
          status: 'niet_relevant' as const,
          relevantieToelichting: `Niet van toepassing bij activiteit '${activiteitType}'. Oorspronkelijke status: ${ind.status}.`,
        };
      }
      return ind;
    });
    console.log(`[Engine] Activiteitfilter '${activiteitType}': ${relevanteIndicatorCodes.length} relevante codes + ${ALTIJD_CHECKEN_INDICATOREN.length} verplichte checks, ${gefilterd.filter(i => i.status !== 'niet_relevant').length} actieve indicatoren`);
  }

  // STEP 2d: ENRICH — add wettelijkeGrondslag, consequenties, suggesties, relevantieToelichting
  const verrijkteIndicatoren = enrichIndicators(gefilterd);

  // STEP 3: Build summary
  const samenvatting = {
    totaal: verrijkteIndicatoren.length,
    relevant: verrijkteIndicatoren.filter(i => i.status === 'relevant').length,
    aandachtspunten: verrijkteIndicatoren.filter(i => i.status === 'aandachtspunt').length,
    nietRelevant: verrijkteIndicatoren.filter(i => i.status === 'niet_relevant').length,
    onbekend: verrijkteIndicatoren.filter(i => i.status === 'onbekend').length,
    errors: verrijkteIndicatoren.filter(i => i.status === 'error').length,
  };

  // STEP 4: Build theme overview
  const themaOverzicht = INDICATOR_THEMES.map(theme => {
    const themaIndicatoren = verrijkteIndicatoren.filter(i => i.theme === theme.code);
    return {
      theme: theme.code,
      label: theme.label,
      color: theme.color,
      indicatoren: themaIndicatoren,
      heeftAandachtspunten: themaIndicatoren.some(i => i.status === 'aandachtspunt'),
    };
  });

  // STEP 5: Extract geo features for map visualization
  const geoFeatures = extractGeoFeatures(datasets, locatie.lat, locatie.lng);

  // STEP 6: BOPA-detectie — bepaal of aanvraag past binnen omgevingsplan
  const procedureBeoordeling = bepaalProcedureType(datasets, verrijkteIndicatoren, locatie);

  const duurMs = Date.now() - startTime;
  console.log(`[Engine] Scan voltooid in ${duurMs}ms: ${samenvatting.relevant} relevant, ${samenvatting.aandachtspunten} aandachtspunten, ${samenvatting.totaal} totaal, ${geoFeatures.length} geoFeatures, procedure: ${procedureBeoordeling.type}`);

  return {
    locatie,
    timestamp: new Date().toISOString(),
    duurMs,
    indicatoren: verrijkteIndicatoren,
    samenvatting,
    themaOverzicht,
    dsoData: {
      activiteiten: datasets.dsoActiviteiten,
      regels: datasets.dsoRegels,
    },
    geoFeatures,
    procedureBeoordeling,
  };
}

// ============ BOPA-DETECTIE ============
// Bepaal of de aanvraag past binnen het omgevingsplan (regulier) of niet (BOPA)

function bepaalProcedureType(
  datasets: DatasetBundle,
  indicatoren: IndicatorResult[],
  locatie: ScanLocatie
): NonNullable<ScanResultaat['procedureBeoordeling']> {
  const redenen: string[] = [];
  let type: 'regulier' | 'bopa' | 'uitgebreid' | 'onbekend' = 'onbekend';

  const b = datasets.bestemmingen;
  const enkel = b?.enkelbestemmingen || [];
  const dubbel = b?.dubbelbestemmingen || [];
  const bouwvlakken = b?.bouwvlakken || [];
  const maatvoeringen = b?.maatvoeringen || [];
  const activiteitType = locatie.activiteitType || 'onbekend';
  const documentSamenvatting = locatie.documentSamenvatting || '';

  // DSO vergunningcheck conclusies
  const vc = datasets.vergunningCheck;
  const conclusies = vc?.conclusies || [];
  const verboden = conclusies.filter((c: any) => c.type === 'verbod');
  const vergunningplichtig = conclusies.filter((c: any) => c.type === 'vergunningplicht');

  // ---- Check 1: Is er een geldend bestemmingsplan? ----
  const bps = b?.bestemmingsplannen || [];
  if (bps.length === 0 && !b?.plannen?.length) {
    redenen.push('Geen geldend bestemmingsplan/omgevingsplan gevonden — toetsingskader onduidelijk');
    type = 'onbekend';
  }

  // ---- Check 2: DSO verbod → BOPA nodig ----
  if (verboden.length > 0) {
    redenen.push(`DSO vergunningcheck: ${verboden.length} activiteit(en) VERBODEN op deze locatie`);
    type = 'bopa';
  }

  // ---- Check 3: Enkelbestemming analyse ----
  if (enkel.length > 0 && activiteitType !== 'onbekend') {
    // Heuristische check: past de activiteit bij de bestemming?
    const bestemmingNamen = enkel.map(e => (e.naam || '').toLowerCase()).join(' ');
    const hoofdgroepen = enkel.map(e => (e.hoofdgroep || '').toLowerCase()).join(' ');
    
    const BESTEMMING_ACTIVITEIT_MATCH: Record<string, string[]> = {
      bouwen: ['wonen', 'woondoeleinden', 'gemengd', 'centrum', 'maatschappelijk', 'bedrijf', 'kantoor', 'detailhandel', 'horeca', 'sport', 'recreatie'],
      slopen: ['wonen', 'woondoeleinden', 'gemengd', 'centrum', 'maatschappelijk', 'bedrijf', 'kantoor'],
      kappen: ['groen', 'natuur', 'bos', 'agrarisch', 'wonen', 'tuin'],
      milieu: ['bedrijf', 'bedrijventerrein', 'industrie', 'gemengd'],
      aanleggen: ['agrarisch', 'natuur', 'groen', 'water', 'verkeer'],
      functiewijziging: ['wonen', 'gemengd', 'centrum', 'maatschappelijk', 'bedrijf'],
      uitrit: ['wonen', 'verkeer', 'gemengd'],
      brandveilig_gebruik: ['maatschappelijk', 'bedrijf', 'horeca', 'kantoor', 'detailhandel'],
    };

    const verwachtebestemmingen = BESTEMMING_ACTIVITEIT_MATCH[activiteitType] || [];
    const pastBinnenBestemming = verwachtebestemmingen.some(vb => 
      bestemmingNamen.includes(vb) || hoofdgroepen.includes(vb)
    );

    if (!pastBinnenBestemming && verwachtebestemmingen.length > 0) {
      redenen.push(`Activiteit '${activiteitType}' past mogelijk niet binnen enkelbestemming '${enkel.map(e => e.naam).join(', ')}' (hoofdgroep: ${enkel.map(e => e.hoofdgroep).join(', ')})`);
      if (type !== 'bopa') type = 'bopa';
    }
  }

  // ---- Check 4: Bouwvlak check (bij bouwen) ----
  if ((activiteitType === 'bouwen' || activiteitType === 'onbekend') && bouwvlakken.length === 0 && enkel.length > 0) {
    // Geen bouwvlak gevonden maar er is een bestemming — bouwen buiten bouwvlak = BOPA
    redenen.push('Geen bouwvlak aangetroffen op deze locatie — bouwen buiten bouwvlak vereist afwijking');
    if (type !== 'bopa') type = 'bopa';
  }

  // ---- Check 5: Natura 2000 / NNN impact → uitgebreide procedure ----
  const natura2000Ind = indicatoren.find(i => i.code === 'NATURA2000');
  const nnnInd = indicatoren.find(i => i.code === 'NNN');
  if (natura2000Ind?.status === 'aandachtspunt' && natura2000Ind.rawData?.dichtstbijAfstandM && natura2000Ind.rawData.dichtstbijAfstandM < 3000) {
    redenen.push(`Natura 2000-gebied op ${Math.round(natura2000Ind.rawData.dichtstbijAfstandM)}m — passende beoordeling mogelijk vereist (Wnb art. 2.7)`);
    type = 'uitgebreid';
  }
  if (nnnInd?.status === 'aandachtspunt') {
    redenen.push('Locatie valt (deels) binnen NNN — nee-tenzij toets vereist (provinciale verordening)');
    if (type !== 'uitgebreid') type = 'bopa';
  }

  // ---- Check 6: Voorbereidingsbesluit → aanhouding ----
  const vbInd = indicatoren.find(i => i.code === 'VOORBEREIDINGSBESLUIT');
  if (vbInd?.status === 'aandachtspunt') {
    redenen.push('Voorbereidingsbesluit van kracht — aanhoudingsplicht mogelijk (art. 4.14 Omgevingswet)');
  }

  // ---- Check 7: Vergunningplichtig via DSO → regulier (tenzij al BOPA) ----
  if (vergunningplichtig.length > 0 && type === 'onbekend') {
    type = 'regulier';
    redenen.push(`DSO vergunningcheck: ${vergunningplichtig.length} activiteit(en) vergunningplichtig via reguliere procedure`);
  }

  // ---- Als geen triggers gevonden en er is een plan → waarschijnlijk regulier ----
  if (type === 'onbekend' && bps.length > 0 && redenen.length === 0) {
    type = 'regulier';
    redenen.push('Geen strijdigheid met omgevingsplan gedetecteerd — aanvraag past waarschijnlijk binnen het plan');
  }

  // Stel toelichting en aanbeveling samen
  const toelichting = type === 'bopa'
    ? `De aanvraag past waarschijnlijk NIET binnen het geldende omgevingsplan. Een buitenplanse omgevingsplanactiviteit (BOPA) vergunning is vereist (art. 5.1 lid 1 sub b Omgevingswet). De gemeente moet beoordelen of medewerking wordt verleend aan de afwijking.`
    : type === 'uitgebreid'
    ? `De aanvraag vereist waarschijnlijk een UITGEBREIDE procedure (26 weken) vanwege de nabijheid van beschermde natuur. Een passende beoordeling (Wnb art. 2.7) en/of milieueffectrapportage kan nodig zijn.`
    : type === 'regulier'
    ? `De aanvraag past waarschijnlijk binnen het geldende omgevingsplan. De reguliere procedure (8 weken) is van toepassing (art. 16.64 Omgevingswet).`
    : `Onvoldoende gegevens om het proceduretype te bepalen. Raadpleeg het omgevingsplan en de planregels.`;

  const aanbeveling = type === 'bopa'
    ? 'Adviseer aanvrager om vooroverleg aan te vragen (art. 16.5 Omgevingswet). Beoordeel of de afwijking ruimtelijk aanvaardbaar is. Toets aan instructieregels Bkl (art. 5.129-5.133) inclusief ladder duurzame verstedelijking, Natura 2000, NNN en cultuurhistorie.'
    : type === 'uitgebreid'
    ? 'Start de uitgebreide procedure (art. 16.65 Omgevingswet). Laat een passende beoordeling (Wnb) en AERIUS-berekening uitvoeren. Betrek provincie als bevoegd gezag voor Wnb-vergunning.'
    : type === 'regulier'
    ? 'Behandel via reguliere procedure (8 weken, art. 16.64 Omgevingswet). Toets aan omgevingsplan, Bbl en eventuele parapluplannen.'
    : 'Raadpleeg het omgevingsplan en neem contact op met de aanvrager voor verduidelijking van de activiteit.';

  const wettelijkeGrondslag = type === 'bopa'
    ? 'Art. 5.1 lid 1 sub b Omgevingswet (BOPA); art. 5.18 Omgevingswet (beoordelingsregels); Bkl art. 5.129-5.133 (instructieregels).'
    : type === 'uitgebreid'
    ? 'Art. 16.65 Omgevingswet (uitgebreide procedure); Wnb art. 2.7 (passende beoordeling); art. 16.43 Omgevingswet (m.e.r.-beoordeling).'
    : 'Art. 5.1 lid 1 sub a Omgevingswet (omgevingsplanactiviteit); art. 16.64 Omgevingswet (reguliere procedure, 8 weken).';

  return { type, toelichting, redenen, wettelijkeGrondslag, aanbeveling };
}

// ============ GEO FEATURES EXTRACTION ============
// Extract real geometries from dataset features for map visualization

function extractGeoFeatures(d: DatasetBundle, lat: number, lng: number): GeoFeature[] {
  const features: GeoFeature[] = [];

  // Helper: bereken afstand van een feature centroid tot de aanvraaglocatie
  function featureAfstand(geometry: any): number {
    if (!geometry?.coordinates) return Infinity;
    if (geometry.type === 'Point') {
      const [fLon, fLat] = geometry.coordinates;
      return berekenAfstand(lng, lat, fLon, fLat);
    }
    // Voor polygonen/lijnen: gebruik centroid
    const coords = JSON.stringify(geometry.coordinates);
    const nums = coords.match(/-?\d+\.?\d*/g)?.map(Number) || [];
    if (nums.length < 2) return Infinity;
    const lons = nums.filter((_, i) => i % 2 === 0);
    const lats = nums.filter((_, i) => i % 2 === 1);
    const cLon = lons.reduce((a, b) => a + b, 0) / lons.length;
    const cLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    return berekenAfstand(lng, lat, cLon, cLat);
  }

  // Relevantie-drempels per laagtype (in meters) — gebaseerd op wettelijke kaders
  // hoog = directe impact (binnen wettelijke zone), midden = externe werking, laag = context
  const relevantieRegels: Record<string, { hoog: number; midden: number; laag: number }> = {
    natura2000:      { hoog: 3000,  midden: 10000, laag: 25000 },  // Wnb art. 2.7: stikstof externe werking tot 25km
    nationaalpark:   { hoog: 500,   midden: 2000,  laag: 5000 },   // Bescherming kerngebied + bufferzone
    stiltegebied:    { hoog: 0,     midden: 500,   laag: 2000 },   // Provinciale verordening: alleen IN stiltegebied
    spoorweg:        { hoog: 100,   midden: 300,   laag: 600 },    // Bkl art. 3.35: geluidaandachtsgebied max 600m
    station:         { hoog: 200,   midden: 500,   laag: 1500 },
    rijksweg:        { hoog: 100,   midden: 300,   laag: 600 },    // Bkl art. 3.35: geluidaandachtsgebied max 600m
    rijksmonument:   { hoog: 0,     midden: 50,    laag: 200 },    // Erfgoedwet art. 3.1: directe omgeving
    beschermd_gezicht: { hoog: 0,   midden: 50,    laag: 200 },    // Erfgoedwet art. 2.34c: IN beschermd gezicht
    bevi:            { hoog: 200,   midden: 500,   laag: 1500 },   // Bkl art. 5.12: PR-contour + invloedsgebied GR
    waterkering:     { hoog: 100,   midden: 200,   laag: 500 },    // Waterschapsverordening: kern + beschermingszone
    archeologie:     { hoog: 0,     midden: 50,    laag: 200 },    // Erfgoedwet: op locatie zelf
    gewasperceel:    { hoog: 0,     midden: 50,    laag: 200 },    // Spuitzone: 50m afstand
  };

  function bepaalRelevantie(layer: string, afstandM: number): { relevance: 'hoog' | 'midden' | 'laag' | 'achtergrond'; toelichting: string } {
    const regels = relevantieRegels[layer] || { hoog: 100, midden: 500, laag: 2000 };
    const afstandTekst = afstandM < 1000 ? `${Math.round(afstandM)}m` : `${(afstandM / 1000).toFixed(1)}km`;
    if (afstandM <= regels.hoog) {
      return { relevance: 'hoog', toelichting: `Direct van toepassing — ${layer === 'natura2000' ? 'locatie binnen of direct grenzend aan Natura 2000-gebied' : layer === 'bevi' ? 'binnen PR-contour risicovolle inrichting' : layer === 'spoorweg' || layer === 'rijksweg' ? `binnen ${afstandTekst} — geluidbelasting en trillingen relevant` : `op ${afstandTekst} afstand`}` };
    }
    if (afstandM <= regels.midden) {
      return { relevance: 'midden', toelichting: `Externe werking mogelijk — ${layer === 'natura2000' ? `Natura 2000-gebied op ${afstandTekst}, stikstof en verstoring toetsen (art. 2.7 Wnb)` : layer === 'bevi' ? `risicovolle inrichting op ${afstandTekst}, groepsrisico beoordelen` : `op ${afstandTekst} afstand`}` };
    }
    if (afstandM <= regels.laag) {
      return { relevance: 'laag', toelichting: `Op afstand (${afstandTekst}) — beperkte invloed verwacht, maar meenemen in beoordeling` };
    }
    return { relevance: 'achtergrond', toelichting: `Ver weg (${afstandTekst}) — geen directe invloed op aanvraag` };
  }

  // 1. Natura 2000 polygonen — real boundaries from WFS
  for (const f of d.natura2000Polygonen) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('natura2000', afstand);
      // Filter: toon alleen als niet achtergrond
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'natura2000',
            name: f.properties?.naamN2K || 'Natura 2000-gebied',
            color: rel.relevance === 'hoog' ? '#dc2626' : rel.relevance === 'midden' ? '#f59e0b' : '#22c55e',
            fillOpacity: rel.relevance === 'hoog' ? 0.3 : rel.relevance === 'midden' ? 0.2 : 0.1,
            strokeWidth: rel.relevance === 'hoog' ? 3 : 2,
            indicatorCode: 'NATURA2000',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 2. Spoorwegen — real rail lines from ProRail WFS
  for (const f of d.spoorwegenTrace) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('spoorweg', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'spoorweg',
            name: f.properties?.kmlint_omschrijving || f.properties?.geocode_naam || 'Spoorlijn',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#facc15',
            fillOpacity: 0,
            strokeWidth: rel.relevance === 'hoog' ? 6 : rel.relevance === 'midden' ? 5 : 3,
            indicatorCode: 'SPOORWEG',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 3. Spoorwegen from OGC API (already fetched, LineStrings)
  for (const f of d.spoorwegen) {
    if (f.geometry && !d.spoorwegenTrace.length) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('spoorweg', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'spoorweg',
            name: f.properties?.kmlint_omschrijving || 'Spoorlijn',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#facc15',
            fillOpacity: 0,
            strokeWidth: rel.relevance === 'hoog' ? 6 : 5,
            indicatorCode: 'SPOORWEG',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 4. Stations
  for (const f of d.stations) {
    if (f.geometry?.type === 'Point') {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('station', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'station',
            name: f.properties?.naam || f.properties?.station_naam || 'Station',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#facc15',
            fillOpacity: 0.9,
            strokeWidth: 2,
            indicatorCode: 'SPOORWEG',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 5. Rijksmonumenten — points from RCE WFS
  for (const f of d.rijksmonumenten) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('rijksmonument', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'rijksmonument',
            name: f.properties?.naam || f.properties?.omschrijving || 'Rijksmonument',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#f59e0b',
            fillOpacity: rel.relevance === 'hoog' ? 0.5 : 0.3,
            strokeWidth: 2,
            indicatorCode: 'RIJKSMONUMENT',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 6. Beschermd gezicht — polygons from RCE WFS
  for (const f of d.beschermdGezicht) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('beschermd_gezicht', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'beschermd_gezicht',
            name: f.properties?.naam || 'Beschermd stadsgezicht',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#d97706',
            fillOpacity: rel.relevance === 'hoog' ? 0.2 : 0.12,
            strokeWidth: 2,
            indicatorCode: 'BESCHERMD_GEZICHT',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 7. BEVI / REV — risicovolle inrichtingen (points)
  for (const f of d.revKwetsbaar) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('bevi', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'bevi',
            name: f.properties?.naam || f.properties?.name || 'Risicovolle inrichting',
            color: rel.relevance === 'hoog' ? '#dc2626' : rel.relevance === 'midden' ? '#ef4444' : '#f87171',
            fillOpacity: rel.relevance === 'hoog' ? 0.8 : 0.6,
            strokeWidth: rel.relevance === 'hoog' ? 3 : 2,
            indicatorCode: 'BEVI',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 8. Nationale parken
  for (const f of d.nationaalPark) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('nationaalpark', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'nationaalpark',
            name: f.properties?.naam || f.properties?.name || 'Nationaal Park',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#16a34a',
            fillOpacity: rel.relevance === 'hoog' ? 0.2 : 0.1,
            strokeWidth: 2,
            indicatorCode: 'NATIONAAL_PARK',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 9. NWB Wegen (major roads)
  for (const f of d.nwbWegen) {
    if (f.geometry && (f.properties?.wegbehsrt === 'R' || f.properties?.stt_naam)) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('rijksweg', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'rijksweg',
            name: f.properties?.stt_naam || f.properties?.wegnummer || 'Rijksweg',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#f97316',
            fillOpacity: 0,
            strokeWidth: rel.relevance === 'hoog' ? 4 : 3,
            indicatorCode: 'GELUID_WEG',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 10. Overstromingsrisicogebied — REMOVED from geoFeatures
  // These flood risk zone polygons are enormous and cover the entire map, making it unusable.
  // Users can enable the overstromingsrisico WMS layer via the Kaartlagen panel instead.

  // 11. IKAW / Archeologie polygons
  for (const f of d.ikaw) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('archeologie', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'archeologie',
            name: f.properties?.naam || 'Archeologische verwachtingswaarde',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#92400e',
            fillOpacity: rel.relevance === 'hoog' ? 0.2 : 0.1,
            strokeWidth: rel.relevance === 'hoog' ? 2 : 1,
            indicatorCode: 'IKAW',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 12. BRP Gewaspercelen (agricultural)
  for (const f of d.brpGewas) {
    if (f.geometry) {
      const afstand = featureAfstand(f.geometry);
      const rel = bepaalRelevantie('gewasperceel', afstand);
      if (rel.relevance !== 'achtergrond') {
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'gewasperceel',
            name: f.properties?.gewas || f.properties?.gewasnaam || 'Gewasperceel',
            color: '#84cc16',
            fillOpacity: 0.1,
            strokeWidth: 1,
            indicatorCode: 'LANDBOUWGROND',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // 13. Stiltegebied polygonen (from WMS GetFeatureInfo)
  if (d.stiltegebied?.binnenStiltegebied && d.stiltegebied.features) {
    for (const f of d.stiltegebied.features) {
      if (f.geometry) {
        const afstand = featureAfstand(f.geometry);
        const rel = bepaalRelevantie('stiltegebied', afstand);
        features.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            layer: 'stiltegebied',
            name: f.properties?.siteNameSpelling || 'Stiltegebied',
            color: rel.relevance === 'hoog' ? '#dc2626' : '#7c3aed',
            fillOpacity: rel.relevance === 'hoog' ? 0.2 : 0.12,
            strokeWidth: 2,
            indicatorCode: 'STILTEGEBIED',
            relevance: rel.relevance,
            afstandM: Math.round(afstand),
            relevanceToelichting: rel.toelichting,
          },
        });
      }
    }
  }

  // Convert any RD (EPSG:28992) coordinates to WGS84 for features that might be in RD
  for (const feature of features) {
    if (feature.geometry && needsRDConversion(feature.geometry.coordinates)) {
      feature.geometry.coordinates = convertRDToWGS84(feature.geometry);
    }
  }

  // Simplify large geometries to prevent browser crashes
  for (const feature of features) {
    if (feature.geometry) {
      const beforeSize = JSON.stringify(feature.geometry.coordinates).length;
      if (beforeSize > 5000) {
        feature.geometry.coordinates = simplifyGeometry(feature.geometry);
        const afterSize = JSON.stringify(feature.geometry.coordinates).length;
        console.log(`[Engine] Simplified ${feature.properties.name}: ${beforeSize} -> ${afterSize} bytes`);
      }
    }
  }

  console.log(`[Engine] Extracted ${features.length} geoFeatures for map`);
  console.log(`[Engine] geoFeatures breakdown: natura2000=${d.natura2000Polygonen.length}, spoorTrace=${d.spoorwegenTrace.length}, spoor=${d.spoorwegen.length}, stations=${d.stations.length}, rijksmon=${d.rijksmonumenten.length}, beschGez=${d.beschermdGezicht.length}, bevi=${d.revKwetsbaar.length}, natPark=${d.nationaalPark.length}, nwb=${d.nwbWegen.length}, ikaw=${d.ikaw.length}, brp=${d.brpGewas.length}, stilte=${d.stiltegebied?.features?.length || 0}`);
  return features;
}

/** Douglas-Peucker line simplification */
function douglasPeucker(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points;
  
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  
  return [start, end];
}

function perpendicularDistance(point: number[], lineStart: number[], lineEnd: number[]): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);
  const t = Math.max(0, Math.min(1, ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lenSq));
  const projX = lineStart[0] + t * dx;
  const projY = lineStart[1] + t * dy;
  return Math.sqrt((point[0] - projX) ** 2 + (point[1] - projY) ** 2);
}

/** Simplify geometry coordinates based on type */
function simplifyGeometry(geometry: any): any {
  const tolerance = 0.0003; // ~30m at Dutch latitudes
  const type = geometry.type;
  const coords = geometry.coordinates;
  
  if (type === 'LineString') {
    return douglasPeucker(coords, tolerance);
  }
  if (type === 'MultiLineString') {
    return coords.map((line: number[][]) => douglasPeucker(line, tolerance));
  }
  if (type === 'Polygon') {
    return coords.map((ring: number[][]) => {
      const simplified = douglasPeucker(ring, tolerance);
      // Ensure polygon is closed and has at least 4 points
      if (simplified.length < 4) return ring.length > 100 ? ring.filter((_: any, i: number) => i % Math.ceil(ring.length / 50) === 0 || i === ring.length - 1) : ring;
      return simplified;
    });
  }
  if (type === 'MultiPolygon') {
    return coords.map((polygon: number[][][]) =>
      polygon.map((ring: number[][]) => {
        const simplified = douglasPeucker(ring, tolerance);
        if (simplified.length < 4) return ring.length > 100 ? ring.filter((_: any, i: number) => i % Math.ceil(ring.length / 50) === 0 || i === ring.length - 1) : ring;
        return simplified;
      })
    );
  }
  return coords;
}

/** Check if coordinates look like RD (x > 10000, y > 300000) */
function needsRDConversion(coords: any): boolean {
  if (!coords) return false;
  // Get first coordinate pair
  let first = coords;
  while (Array.isArray(first) && Array.isArray(first[0])) {
    first = first[0];
  }
  if (Array.isArray(first) && first.length >= 2) {
    return first[0] > 10000 && first[1] > 100000;
  }
  return false;
}

/** Recursively convert RD coordinates to WGS84 */
function convertRDToWGS84(geometry: { type: string; coordinates: any }): any {
  const convertCoord = (coord: [number, number]): [number, number] => {
    try {
      const [lon, lat] = proj4('EPSG:28992', 'EPSG:4326', coord);
      return [lon, lat];
    } catch {
      return coord;
    }
  };

  const convertNested = (coords: any, depth: number): any => {
    if (depth === 0) return convertCoord(coords as [number, number]);
    return (coords as any[]).map((c: any) => convertNested(c, depth - 1));
  };

  switch (geometry.type) {
    case 'Point': return convertCoord(geometry.coordinates);
    case 'LineString': return convertNested(geometry.coordinates, 1);
    case 'MultiLineString': return convertNested(geometry.coordinates, 2);
    case 'Polygon': return convertNested(geometry.coordinates, 2);
    case 'MultiPolygon': return convertNested(geometry.coordinates, 3);
    default: return geometry.coordinates;
  }
}

// ============ RELEVANCE ROUTER ============
// Uses dubbelbestemmingen, gebiedsaanduidingen, and plan flags to upgrade indicator statuses

function applyRelevanceRouter(indicatoren: IndicatorResult[], planData: RuimtelijkePlannenResultaat | null): void {
  if (!planData) return;

  const upgradeToAandachtspunt = (code: string, reden: string) => {
    const ind = indicatoren.find(i => i.code === code);
    if (ind && ind.status !== 'aandachtspunt') {
      ind.status = 'aandachtspunt';
      ind.toelichting = `\u26a0\ufe0f Opgewaardeerd op basis van plandata: ${reden}. ${ind.toelichting}`;
    }
  };

  // Archeologie dubbelbestemming → upgrade IKAW and archeologie indicators
  if (planData.heeftArcheologie) {
    upgradeToAandachtspunt('IKAW', 'Dubbelbestemming Waarde - Archeologie aanwezig');
    upgradeToAandachtspunt('BODEMONDERZOEK', 'Dubbelbestemming Waarde - Archeologie — mogelijk archeologisch vooronderzoek vereist');
  }

  // Waterkering dubbelbestemming → upgrade water indicators
  if (planData.heeftWaterkering) {
    upgradeToAandachtspunt('WATERKERING', 'Dubbelbestemming Waterstaat - Waterkering aanwezig');
    upgradeToAandachtspunt('WATERGANG', 'Dubbelbestemming Waterstaat aanwezig — watervergunning mogelijk vereist');
    upgradeToAandachtspunt('WATERTOETS', 'Dubbelbestemming Waterstaat aanwezig — watertoets verplicht');
  }

  // Leiding dubbelbestemming → upgrade infra indicators
  if (planData.heeftLeiding) {
    upgradeToAandachtspunt('KLIC_MELDING', 'Dubbelbestemming Leiding aanwezig — KLIC-melding verplicht');
    upgradeToAandachtspunt('GASLEIDING', 'Dubbelbestemming Leiding aanwezig');
    upgradeToAandachtspunt('HOOGSPANNING', 'Dubbelbestemming Leiding aanwezig');
  }

  // Geluidszone → upgrade geluid indicators
  if (planData.heeftGeluidszone) {
    upgradeToAandachtspunt('GELUID_WEG', 'Geluidszone in bestemmingsplan — akoestisch onderzoek vereist');
    upgradeToAandachtspunt('GELUID_INDUSTRIE', 'Geluidszone in bestemmingsplan');
    upgradeToAandachtspunt('GELUID_SPOOR', 'Geluidszone in bestemmingsplan');
  }

  // Veiligheidszone → upgrade veiligheid indicators
  if (planData.heeftVeiligheidszone) {
    upgradeToAandachtspunt('BEVI', 'Veiligheidszone in bestemmingsplan — risicoanalyse vereist');
    upgradeToAandachtspunt('RISICOCONTOUR', 'Veiligheidszone in bestemmingsplan');
  }

  // Milieuzone → upgrade milieu indicators
  if (planData.heeftMilieuzone) {
    upgradeToAandachtspunt('LUCHTKWALITEIT', 'Milieuzone in bestemmingsplan');
    upgradeToAandachtspunt('GEURZONE', 'Milieuzone in bestemmingsplan');
    upgradeToAandachtspunt('GEURCONTOUR_VEEHOUDERIJ', 'Milieuzone in bestemmingsplan');
  }

  // Voorbereidingsbesluit → flag all planologie indicators
  if (planData.heeftVoorbereidingsbesluit) {
    upgradeToAandachtspunt('BESTEMMINGSPLAN', 'Voorbereidingsbesluit van kracht — aanhoudingsplicht mogelijk');
  }

  // Parapluplan → flag planregels
  if (planData.heeftParapluplan) {
    upgradeToAandachtspunt('PLANREGELS', 'Parapluplan(nen) van kracht — aanvullende regels van toepassing');
  }

  // Check gebiedsaanduidingen for specific keywords
  for (const ga of planData.gebiedsaanduidingen) {
    const naam = ga.naam.toLowerCase();
    if (naam.includes('vrijwaringszone') || naam.includes('beschermingszone')) {
      upgradeToAandachtspunt('WATERKERING', `Gebiedsaanduiding: ${ga.naam}`);
    }
    if (naam.includes('wro-zone') || naam.includes('wijzigingsgebied')) {
      upgradeToAandachtspunt('BESTEMMINGSPLAN', `Gebiedsaanduiding: ${ga.naam} — wijzigingsbevoegdheid of uitwerkingsplicht`);
    }
    if (naam.includes('luchtvaart')) {
      upgradeToAandachtspunt('LUCHTVAART_BEPERKING', `Gebiedsaanduiding: ${ga.naam}`);
    }
    if (naam.includes('natuur') || naam.includes('ecologi')) {
      upgradeToAandachtspunt('NNN', `Gebiedsaanduiding: ${ga.naam}`);
    }
  }

  // Check dubbelbestemmingen for additional upgrades
  for (const db of planData.dubbelbestemmingen) {
    const naam = db.naam.toLowerCase();
    if (naam.includes('cultuurhistorie')) {
      upgradeToAandachtspunt('BESCHERMD_GEZICHT', 'Dubbelbestemming Waarde - Cultuurhistorie');
      upgradeToAandachtspunt('RIJKSMONUMENT', 'Dubbelbestemming Waarde - Cultuurhistorie');
    }
  }
}

// ============ AI NARRATIVE GENERATION ============

export async function genereerAINarratief(scanResultaat: ScanResultaat): Promise<string> {
  const aandachtspunten = scanResultaat.indicatoren.filter(i => i.status === 'aandachtspunt');
  const relevante = scanResultaat.indicatoren.filter(i => i.status === 'relevant');

  // Build detailed indicator summaries including wettelijke grondslag and consequenties
  const aandachtDetails = aandachtspunten.map(i => {
    let detail = `- **${i.humanName}** (${i.theme}): ${i.waarde}`;
    if (i.toelichting && i.toelichting !== i.waarde) detail += ` — ${i.toelichting}`;
    if ((i as any).wettelijkeGrondslag) detail += `\n  Wettelijke grondslag: ${(i as any).wettelijkeGrondslag}`;
    if ((i as any).consequenties) detail += `\n  Consequenties: ${(i as any).consequenties}`;
    if (i.afstandM) detail += `\n  Afstand: ${i.afstandM < 1000 ? i.afstandM + 'm' : (i.afstandM / 1000).toFixed(1) + 'km'}`;
    return detail;
  }).join('\n');

  const relevanteDetails = relevante.map(i => {
    let detail = `- ${i.humanName} (${i.theme}): ${i.waarde}`;
    if ((i as any).wettelijkeGrondslag) detail += ` [${(i as any).wettelijkeGrondslag}]`;
    return detail;
  }).join('\n');

  // Group by theme for structured analysis
  const themaGroepen = scanResultaat.themaOverzicht?.map(t => {
    const aa = t.indicatoren.filter(i => i.status === 'aandachtspunt');
    const rel = t.indicatoren.filter(i => i.status === 'relevant');
    if (aa.length === 0 && rel.length === 0) return '';
    return `${t.label}: ${aa.length} aandachtspunten, ${rel.length} relevant`;
  }).filter(Boolean).join('\n') || '';

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `Je bent een senior jurist ruimtelijke ordening (jurist RO) en vergunningverlener RO met uitgebreide kennis van de Omgevingswet, het Besluit activiteiten leefomgeving (Bal), het Besluit bouwwerken leefomgeving (Bbl), en het Besluit kwaliteit leefomgeving (Bkl).

Schrijf een professionele, uitgebreide analyse van de omgevingsscan resultaten in het Nederlands. De analyse moet bruikbaar zijn voor een vergunningverlener die een aanvraag moet beoordelen.

## Structuur van je analyse:

### 1. Locatieprofiel
Beschrijf de locatie, gemeente, en de belangrijkste ruimtelijke kenmerken. Noem het bestemmingsplan/omgevingsplan en relevante dubbelbestemmingen.

### 2. Kritieke aandachtspunten
Beschrijf per aandachtspunt:
- Wat is geconstateerd
- Welke wettelijke grondslag is van toepassing (noem specifieke artikelen)
- Wat zijn de consequenties voor de aanvrager
- Welk vervolgonderzoek is nodig

### 3. Relevante omgevingsfactoren
Beschrijf kort welke omgevingsfactoren relevant zijn maar geen directe belemmering vormen. Noem meetwaarden waar beschikbaar (geluid in dB, luchtkwaliteit in µg/m³, stikstof in mol/ha/jr).

### 4. Vereiste vervolgonderzoeken
Maak een concrete lijst van alle vereiste onderzoeken met:
- Type onderzoek
- Wettelijke grondslag (artikel)
- Wanneer dit onderzoek verplicht is

### 5. Conclusie en haalbaarheidsadvies
Geef een eerlijk oordeel over de haalbaarheid van het project op deze locatie. Noem de belangrijkste risico's en kansen.

Wees specifiek, noem wetsartikelen, en vermijd vage formuleringen. Gebruik meetwaarden en afstanden waar beschikbaar.`
        },
        {
          role: 'user',
          content: `Omgevingsscan resultaten voor ${scanResultaat.locatie.adres}${scanResultaat.locatie.gemeente ? `, gemeente ${scanResultaat.locatie.gemeente}` : ''}:

Samenvatting: ${scanResultaat.samenvatting.totaal} indicatoren geëvalueerd, ${scanResultaat.samenvatting.aandachtspunten} aandachtspunten, ${scanResultaat.samenvatting.relevant} relevant, ${scanResultaat.samenvatting.nietRelevant} niet relevant.

Thema-overzicht:
${themaGroepen}

Aandachtspunten (gedetailleerd):
${aandachtDetails || 'Geen aandachtspunten gevonden.'}

Relevante indicatoren:
${relevanteDetails || 'Geen relevante indicatoren.'}

Schrijf een uitgebreide professionele analyse.`
        }
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    return (typeof content === 'string' ? content : null) || 'Samenvatting kon niet worden gegenereerd.';
  } catch (error) {
    console.error('[Engine] AI narratief generatie failed:', error);
    // Fallback: generate a structured summary without AI
    const fallbackSections = [
      `## Omgevingsscan Analyse — ${scanResultaat.locatie.adres}`,
      '',
      `**Locatie:** ${scanResultaat.locatie.adres}${scanResultaat.locatie.gemeente ? `, gemeente ${scanResultaat.locatie.gemeente}` : ''}`,
      `**Datum:** ${new Date(scanResultaat.timestamp).toLocaleDateString('nl-NL')}`,
      '',
      `### Samenvatting`,
      `Er zijn **${scanResultaat.samenvatting.totaal}** indicatoren geëvalueerd. Hiervan zijn **${scanResultaat.samenvatting.aandachtspunten}** als aandachtspunt gemarkeerd en **${scanResultaat.samenvatting.relevant}** als relevant.`,
      '',
    ];
    if (aandachtspunten.length > 0) {
      fallbackSections.push('### Aandachtspunten', '');
      aandachtspunten.forEach(i => {
        fallbackSections.push(`- **${i.humanName}**: ${i.waarde}`);
        if ((i as any).wettelijkeGrondslag) fallbackSections.push(`  Grondslag: ${(i as any).wettelijkeGrondslag}`);
      });
    }
    fallbackSections.push('', '### Conclusie', '', 'Raadpleeg de volledige scanresultaten en het bevoegd gezag voor definitieve beoordelingen.');
    return fallbackSections.join('\n');
  }
}
