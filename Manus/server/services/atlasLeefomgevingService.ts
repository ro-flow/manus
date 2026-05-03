/**
 * Atlas Leefomgeving Service
 * Queries RIVM WMS (data.rivm.nl) for environmental data:
 * - Geluid (noise): Lden per bron (wegverkeer, trein, industrie, windturbines)
 * - Luchtkwaliteit (air quality): NO2, PM10, PM2.5
 * - Overstromingskans
 * - Lichtemissie
 */

import proj4 from 'proj4';

// Ensure RD New projection is defined
proj4.defs('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs');

const ALO_WMS_BASE = 'https://data.rivm.nl/geo/alo/wms';

// ============ TYPES ============

export interface GeluidData {
  ldenAlleBronnen: number | null;     // dB Lden alle bronnen gecombineerd
  ldenWegverkeer: number | null;      // dB Lden wegverkeer
  lnightWegverkeer: number | null;    // dB Lnight wegverkeer
  ldenTreinverkeer: number | null;    // dB Lden treinverkeer
  ldenIndustrie: number | null;       // dB Lden industrie
  ldenWindturbines: number | null;    // dB Lden windturbines
}

export interface LuchtkwaliteitData {
  no2: number | null;    // µg/m³ NO2 jaargemiddelde
  pm10: number | null;   // µg/m³ PM10 jaargemiddelde
  pm25: number | null;   // µg/m³ PM2.5 jaargemiddelde
  jaar: string;          // Meetjaar
}

export interface AtlasLeefomgevingData {
  geluid: GeluidData;
  luchtkwaliteit: LuchtkwaliteitData;
  overstromingskans: number | null;   // 1 = ja, 0 = nee
  lichtemissie: number | null;        // Lichtemissie waarde
}

// ============ LAYER DEFINITIONS ============

const LAYERS = {
  // Geluid - actuele kaarten
  geluid_lden_alle: 'rivm_20210201_g_geluidkaart_lden_alle_bronnen_v3',
  geluid_lden_weg: 'rivm_Geluid_lden_wegverkeer_actueel',
  geluid_lnight_weg: 'rivm_Geluid_lnight_wegverkeer_actueel',
  geluid_lden_trein: 'rivm_Geluid_lden_treinverkeer_actueel',
  geluid_lden_industrie: 'rivm_Geluid_lden_industrie_actueel',
  geluid_lden_wind: 'rivm_geluid_Lden_windturbines_actueel',

  // Luchtkwaliteit - meest recente data (2023)
  lucht_no2: 'rivm_nsl_20250401_gm_NO22023',
  lucht_pm10: 'rivm_nsl_20250401_gm_PM102023',
  lucht_pm25: 'rivm_nsl_20250401_gm_PM252023',

  // Overstroming
  overstroming: '20231201_kans_overstroming',

  // Lichtemissie
  lichtemissie: 'lichtemissie2018',
} as const;

// ============ HELPERS ============

function wgs84ToRD(lon: number, lat: number): [number, number] {
  return proj4('EPSG:4326', 'EPSG:28992', [lon, lat]) as [number, number];
}

/**
 * Query a single WMS layer using GetFeatureInfo at a point.
 * Returns the GRAY_INDEX value (raster pixel value) or null.
 */
async function queryWMSPoint(layerName: string, rdX: number, rdY: number): Promise<number | null> {
  const buffer = 10; // 10m buffer around point
  const bbox = `${rdX - buffer},${rdY - buffer},${rdX + buffer},${rdY + buffer}`;
  const url = `${ALO_WMS_BASE}?service=WMS&version=1.3.0&request=GetFeatureInfo` +
    `&layers=${layerName}&query_layers=${layerName}` +
    `&info_format=application/json&crs=EPSG:28992` +
    `&bbox=${bbox}&width=1&height=1&i=0&j=0`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      console.warn(`[AtlasLO] WMS query failed for ${layerName}: HTTP ${response.status}`);
      return null;
    }
    const data = await response.json();
    const features = data.features || [];
    if (features.length === 0) return null;
    const value = features[0]?.properties?.GRAY_INDEX;
    if (value === undefined || value === null) return null;
    // GRAY_INDEX = 0 usually means "no data" for noise layers
    return value;
  } catch (error) {
    console.warn(`[AtlasLO] WMS query error for ${layerName}:`, (error as Error).message);
    return null;
  }
}

// ============ MAIN FUNCTION ============

/**
 * Fetch all Atlas Leefomgeving environmental data for a given WGS84 coordinate.
 * Queries are done in parallel for speed.
 */
export async function fetchAtlasLeefomgevingData(lat: number, lng: number): Promise<AtlasLeefomgevingData> {
  const [rdX, rdY] = wgs84ToRD(lng, lat);
  console.log(`[AtlasLO] Querying RIVM WMS at RD: ${Math.round(rdX)}, ${Math.round(rdY)}`);

  // All queries in parallel
  const [
    ldenAlle, ldenWeg, lnightWeg, ldenTrein, ldenIndustrie, ldenWind,
    no2, pm10, pm25,
    overstroming, lichtemissie,
  ] = await Promise.all([
    // Geluid
    queryWMSPoint(LAYERS.geluid_lden_alle, rdX, rdY),
    queryWMSPoint(LAYERS.geluid_lden_weg, rdX, rdY),
    queryWMSPoint(LAYERS.geluid_lnight_weg, rdX, rdY),
    queryWMSPoint(LAYERS.geluid_lden_trein, rdX, rdY),
    queryWMSPoint(LAYERS.geluid_lden_industrie, rdX, rdY),
    queryWMSPoint(LAYERS.geluid_lden_wind, rdX, rdY),
    // Luchtkwaliteit
    queryWMSPoint(LAYERS.lucht_no2, rdX, rdY),
    queryWMSPoint(LAYERS.lucht_pm10, rdX, rdY),
    queryWMSPoint(LAYERS.lucht_pm25, rdX, rdY),
    // Overstroming
    queryWMSPoint(LAYERS.overstroming, rdX, rdY),
    // Lichtemissie
    queryWMSPoint(LAYERS.lichtemissie, rdX, rdY),
  ]);

  const result: AtlasLeefomgevingData = {
    geluid: {
      ldenAlleBronnen: ldenAlle,
      ldenWegverkeer: ldenWeg,
      lnightWegverkeer: lnightWeg,
      ldenTreinverkeer: ldenTrein,
      ldenIndustrie: ldenIndustrie,
      ldenWindturbines: ldenWind,
    },
    luchtkwaliteit: {
      no2: no2 !== null ? Math.round(no2 * 10) / 10 : null,
      pm10: pm10 !== null ? Math.round(pm10 * 10) / 10 : null,
      pm25: pm25 !== null ? Math.round(pm25 * 10) / 10 : null,
      jaar: '2023',
    },
    overstromingskans: overstroming,
    lichtemissie: lichtemissie !== null ? Math.round(lichtemissie) : null,
  };

  console.log(`[AtlasLO] Results: Geluid Lden=${ldenAlle}dB, NO2=${result.luchtkwaliteit.no2}µg/m³, PM10=${result.luchtkwaliteit.pm10}µg/m³, PM2.5=${result.luchtkwaliteit.pm25}µg/m³, Overstroming=${overstroming}, Licht=${result.lichtemissie}`);

  return result;
}
