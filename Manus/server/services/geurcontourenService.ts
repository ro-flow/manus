/**
 * Geurcontouren Veehouderijen Service
 * 
 * Haalt geurbelastingsgegevens op van veehouderijen voor een locatie.
 * Gebruikt WFS services van provincies (momenteel Utrecht als voorbeeld).
 * 
 * GES (Gezondheidseffectscreening) scores:
 * - GES 0: Geen geurbelasting
 * - GES 1: Zeer lichte geurbelasting (< 0.5 ouE/m³)
 * - GES 2: Lichte geurbelasting (0.5 - 1 ouE/m³)
 * - GES 3: Matige geurbelasting (1 - 2 ouE/m³)
 * - GES 4: Redelijke geurbelasting (2 - 5 ouE/m³)
 * - GES 5: Vrij ernstige geurbelasting (5 - 10 ouE/m³)
 * - GES 6: Ernstige geurbelasting (10 - 20 ouE/m³)
 * - GES 7: Zeer ernstige geurbelasting (> 20 ouE/m³)
 */

// WFS endpoints per provincie (uitbreidbaar)
const GEUR_WFS_ENDPOINTS: Record<string, string> = {
  'Utrecht': 'https://services.geodata-utrecht.nl/geoserver/m01_4_overlast_hinder_mgkp/wfs',
  // Andere provincies kunnen hier worden toegevoegd wanneer beschikbaar
};

interface GeurFeature {
  type: string;
  properties: {
    GES?: number;
    OBJECTID?: number;
    geurbelasting_oue?: number;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

interface WFSResponse {
  type: string;
  features: GeurFeature[];
  numberMatched?: number;
  numberReturned?: number;
}

export interface GeurAnalyse {
  binnenGeurcontour: boolean;
  gesScore: number | null;
  gesOmschrijving: string;
  geurbelastingOuE: number | null;
  risiconiveau: 'geen' | 'laag' | 'middel' | 'hoog' | 'zeer_hoog';
  provincie: string | null;
  aanbevelingen: string[];
  bronData: {
    aantalContouren: number;
    dichtstbijzijndeGES: number | null;
  };
}

/**
 * Converteer RD (Rijksdriehoek) coördinaten naar WGS84
 * Vereenvoudigde conversie - voor productie gebruik proj4
 */
function wgs84ToRD(lon: number, lat: number): { x: number; y: number } {
  // Vereenvoudigde conversie (approximatie)
  const x = 52000 + (lon - 3.31) * 40000 / 0.56;
  const y = 463000 + (lat - 51.68) * 40000 / 0.36;
  return { x, y };
}

/**
 * Berekent een bbox in RD coördinaten rond een punt
 */
function calculateRDBbox(lon: number, lat: number, radiusMeters: number = 500): string {
  const { x, y } = wgs84ToRD(lon, lat);
  
  const minX = x - radiusMeters;
  const minY = y - radiusMeters;
  const maxX = x + radiusMeters;
  const maxY = y + radiusMeters;
  
  return `${minX},${minY},${maxX},${maxY}`;
}

/**
 * Berekent een bbox in WGS84 coördinaten
 */
function calculateWGS84Bbox(lon: number, lat: number, radiusMeters: number = 500): string {
  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
  
  return `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`;
}

/**
 * Haalt geurcontouren op van een WFS service
 */
async function fetchGeurcontouren(
  wfsUrl: string,
  bbox: string,
  srsName: string = 'EPSG:28992'
): Promise<GeurFeature[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: 'm01_4_overlast_hinder_mgkp:Contouren_geur_veehouderijen',
    outputFormat: 'application/json',
    bbox: bbox,
    srsName: srsName,
    count: '50'
  });
  
  const url = `${wfsUrl}?${params.toString()}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`Geurcontouren WFS error: ${response.status}`);
      return [];
    }
    
    const data: WFSResponse = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error fetching geurcontouren:', error);
    return [];
  }
}

/**
 * Bepaalt de provincie op basis van coördinaten (vereenvoudigd)
 */
function bepaalProvincie(lon: number, lat: number): string | null {
  // Vereenvoudigde check - in productie zou dit via een API gaan
  // Utrecht: ongeveer 4.9-5.6 lon, 51.9-52.3 lat
  if (lon >= 4.9 && lon <= 5.6 && lat >= 51.9 && lat <= 52.3) {
    return 'Utrecht';
  }
  // Andere provincies kunnen hier worden toegevoegd
  return null;
}

/**
 * Vertaalt GES score naar omschrijving
 */
function gesScoreNaarOmschrijving(ges: number | null): string {
  if (ges === null) return 'Onbekend';
  
  const omschrijvingen: Record<number, string> = {
    0: 'Geen geurbelasting',
    1: 'Zeer lichte geurbelasting (< 0.5 ouE/m³)',
    2: 'Lichte geurbelasting (0.5 - 1 ouE/m³)',
    3: 'Matige geurbelasting (1 - 2 ouE/m³)',
    4: 'Redelijke geurbelasting (2 - 5 ouE/m³)',
    5: 'Vrij ernstige geurbelasting (5 - 10 ouE/m³)',
    6: 'Ernstige geurbelasting (10 - 20 ouE/m³)',
    7: 'Zeer ernstige geurbelasting (> 20 ouE/m³)'
  };
  
  return omschrijvingen[ges] || `GES ${ges}`;
}

/**
 * Bepaalt risiconiveau op basis van GES score
 */
function bepaalRisiconiveau(ges: number | null): 'geen' | 'laag' | 'middel' | 'hoog' | 'zeer_hoog' {
  if (ges === null || ges === 0) return 'geen';
  if (ges <= 2) return 'laag';
  if (ges <= 4) return 'middel';
  if (ges <= 6) return 'hoog';
  return 'zeer_hoog';
}

/**
 * Analyseert geurbelasting van veehouderijen voor een locatie
 */
export async function analyzeGeurbelasting(
  lon: number,
  lat: number,
  radiusMeters: number = 500
): Promise<GeurAnalyse> {
  const provincie = bepaalProvincie(lon, lat);
  
  // Default response wanneer geen data beschikbaar is
  const defaultResponse: GeurAnalyse = {
    binnenGeurcontour: false,
    gesScore: null,
    gesOmschrijving: 'Geen geurdata beschikbaar voor deze locatie',
    geurbelastingOuE: null,
    risiconiveau: 'geen',
    provincie: provincie,
    aanbevelingen: [],
    bronData: {
      aantalContouren: 0,
      dichtstbijzijndeGES: null
    }
  };
  
  // Check of we een WFS endpoint hebben voor deze provincie
  if (!provincie || !GEUR_WFS_ENDPOINTS[provincie]) {
    defaultResponse.aanbevelingen.push(
      'Geurcontouren data niet beschikbaar voor deze provincie. ' +
      'Raadpleeg de provinciale atlas of omgevingsdienst voor geurinformatie.'
    );
    return defaultResponse;
  }
  
  const wfsUrl = GEUR_WFS_ENDPOINTS[provincie];
  const bbox = calculateWGS84Bbox(lon, lat, radiusMeters);
  
  // Probeer eerst met WGS84, dan met RD
  let features = await fetchGeurcontouren(wfsUrl, bbox, 'EPSG:4326');
  
  if (features.length === 0) {
    const rdBbox = calculateRDBbox(lon, lat, radiusMeters);
    features = await fetchGeurcontouren(wfsUrl, rdBbox, 'EPSG:28992');
  }
  
  if (features.length === 0) {
    defaultResponse.gesOmschrijving = 'Geen geurcontouren gevonden binnen zoekgebied';
    defaultResponse.aanbevelingen.push(
      'Locatie ligt buiten bekende geurcontouren van veehouderijen'
    );
    return defaultResponse;
  }
  
  // Analyseer de gevonden contouren
  const gesScores = features
    .map(f => f.properties.GES)
    .filter((ges): ges is number => typeof ges === 'number');
  
  const hoogsteGES = gesScores.length > 0 ? Math.max(...gesScores) : null;
  
  // Genereer aanbevelingen
  const aanbevelingen: string[] = [];
  
  if (hoogsteGES !== null) {
    if (hoogsteGES >= 5) {
      aanbevelingen.push(
        'WAARSCHUWING: Locatie ligt binnen gebied met significante geurbelasting van veehouderijen. ' +
        'Woningbouw op deze locatie wordt afgeraden zonder nader onderzoek.'
      );
      aanbevelingen.push(
        'Geuronderzoek conform Wet geurhinder en veehouderij (Wgv) is verplicht'
      );
    } else if (hoogsteGES >= 3) {
      aanbevelingen.push(
        'Locatie ligt binnen gebied met matige geurbelasting. ' +
        'Overweeg geuronderzoek uit te voeren voor woningbouwplannen.'
      );
    } else if (hoogsteGES >= 1) {
      aanbevelingen.push(
        'Lichte geurbelasting aanwezig. Bij gevoelige bestemmingen (woningen, scholen) ' +
        'kan aanvullend onderzoek wenselijk zijn.'
      );
    }
  }
  
  return {
    binnenGeurcontour: features.length > 0,
    gesScore: hoogsteGES,
    gesOmschrijving: gesScoreNaarOmschrijving(hoogsteGES),
    geurbelastingOuE: null, // Niet altijd beschikbaar in de data
    risiconiveau: bepaalRisiconiveau(hoogsteGES),
    provincie: provincie,
    aanbevelingen,
    bronData: {
      aantalContouren: features.length,
      dichtstbijzijndeGES: hoogsteGES
    }
  };
}

/**
 * Snelle check of een locatie binnen een geurcontour ligt
 */
export async function checkBinnenGeurcontour(
  lon: number,
  lat: number
): Promise<{ binnenContour: boolean; gesScore: number | null }> {
  const analyse = await analyzeGeurbelasting(lon, lat, 100);
  return {
    binnenContour: analyse.binnenGeurcontour,
    gesScore: analyse.gesScore
  };
}
