/**
 * PDOK Natura2000 OGC API Service
 * 
 * Haalt Natura 2000 gebieden op en berekent afstand tot locaties.
 * Gebruikt voor stikstof voortoets en natuurbeschermingscheck.
 */

const NATURA2000_API_BASE = 'https://api.pdok.nl/rvo/natura2000/ogc/v1';

/** Fetch with retry logic to handle ECONNRESET from PDOK rate limiting */
async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errMsg = (error as Error).message || '';
      const isRetryable = errMsg.includes('fetch failed') || errMsg.includes('ECONNRESET') || errMsg.includes('ETIMEDOUT') || errMsg.includes('socket');
      if (isLastAttempt || !isRetryable) throw error;
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`[Natura2000] Retry ${attempt + 1}/${maxRetries} for ${url.substring(0, 80)}... (waiting ${Math.round(delay)}ms)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

/**
 * Natura 2000 gebied informatie
 */
export interface Natura2000Gebied {
  id: string;
  naam: string;
  nummer: number;
  beschermingsType: 'vogelrichtlijn' | 'habitatrichtlijn' | 'beide';
  sitecodeVogelrichtlijn?: string;
  sitecodeHabitatrichtlijn?: string;
  status: string;
  oppervlakteM2: number;
  staatscourant?: string;
  afstandMeter?: number;
}

/**
 * Resultaat van Natura 2000 check
 */
export interface Natura2000CheckResult {
  success: boolean;
  binnenGebied: boolean;
  dichtstbijzijndeGebied?: Natura2000Gebied;
  gebiedenBinnenStraal: Natura2000Gebied[];
  afstandTotDichtstbijzijnde?: number;
  stikstofRisico: 'geen' | 'laag' | 'middel' | 'hoog';
  aanbeveling: string;
  error?: string;
}

/**
 * Bereken afstand tussen twee punten in meters (Haversine formule)
 */
function calculateDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Radius van de aarde in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bereken de dichtstbijzijnde punt van een polygon tot een punt
 */
function calculateMinDistanceToPolygon(
  pointLat: number, pointLon: number,
  coordinates: number[][][]
): number {
  let minDistance = Infinity;
  
  for (const ring of coordinates) {
    for (const coord of ring) {
      const [lon, lat] = coord;
      const distance = calculateDistanceMeters(pointLat, pointLon, lat, lon);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
  }
  
  return minDistance;
}

/**
 * Check of een punt binnen een polygon ligt (ray casting algoritme)
 */
function isPointInPolygon(
  pointLat: number, pointLon: number,
  coordinates: number[][][]
): boolean {
  // Gebruik alleen de buitenste ring (eerste ring)
  const ring = coordinates[0];
  if (!ring || ring.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = [ring[i][0], ring[i][1]]; // lon, lat
    const [xj, yj] = [ring[j][0], ring[j][1]];
    
    if (((yi > pointLat) !== (yj > pointLat)) &&
        (pointLon < (xj - xi) * (pointLat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Parse beschermingstype uit de API response
 */
function parseBeschermingsType(beschermin: string): 'vogelrichtlijn' | 'habitatrichtlijn' | 'beide' {
  if (beschermin === 'VR') return 'vogelrichtlijn';
  if (beschermin === 'HR') return 'habitatrichtlijn';
  if (beschermin === 'VR/HR' || beschermin === 'HR/VR') return 'beide';
  return 'beide'; // Default
}

/**
 * Haal Natura 2000 gebieden op binnen een bounding box
 */
export async function getNatura2000GebiedenInBbox(
  minLon: number, minLat: number,
  maxLon: number, maxLat: number,
  limit: number = 100
): Promise<Natura2000Gebied[]> {
  try {
    const url = `${NATURA2000_API_BASE}/collections/natura2000/items?bbox=${minLon},${minLat},${maxLon},${maxLat}&limit=${limit}`;
    
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/geo+json'
      }
    });
    
    if (!response.ok) {
      console.error(`[Natura2000] API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    return data.features.map((feature: any) => ({
      id: feature.id,
      naam: feature.properties.naam_n2k || 'Onbekend',
      nummer: feature.properties.nr,
      beschermingsType: parseBeschermingsType(feature.properties.beschermin),
      sitecodeVogelrichtlijn: feature.properties.sitecode_v?.trim() || undefined,
      sitecodeHabitatrichtlijn: feature.properties.sitecode_h?.trim() || undefined,
      status: feature.properties.status,
      oppervlakteM2: feature.properties.shape_area,
      staatscourant: feature.properties.staatscour
    }));
  } catch (error) {
    console.error('[Natura2000] Error fetching gebieden:', error);
    return [];
  }
}

/**
 * Voer een Natura 2000 check uit voor een locatie
 * 
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @param straalMeter Zoekstraal in meters (default 10km)
 */
export async function checkNatura2000(
  lat: number,
  lon: number,
  straalMeter: number = 10000
): Promise<Natura2000CheckResult> {
  try {
    // Bereken bounding box op basis van straal
    // 1 graad lat ≈ 111km, 1 graad lon ≈ 111km * cos(lat)
    const latDelta = straalMeter / 111000;
    const lonDelta = straalMeter / (111000 * Math.cos(lat * Math.PI / 180));
    
    const minLon = lon - lonDelta;
    const maxLon = lon + lonDelta;
    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    
    // Haal features op met geometrie
    const url = `${NATURA2000_API_BASE}/collections/natura2000/items?bbox=${minLon},${minLat},${maxLon},${maxLat}&limit=50`;
    
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/geo+json'
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        binnenGebied: false,
        gebiedenBinnenStraal: [],
        stikstofRisico: 'geen',
        aanbeveling: 'Natura 2000 check kon niet worden uitgevoerd.',
        error: `API error: ${response.status}`
      };
    }
    
    const data = await response.json();
    const features = data.features || [];
    
    let binnenGebied = false;
    let dichtstbijzijndeGebied: Natura2000Gebied | undefined;
    let minAfstand = Infinity;
    const gebiedenBinnenStraal: Natura2000Gebied[] = [];
    
    for (const feature of features) {
      const geometry = feature.geometry;
      if (!geometry) continue;
      
      let coordinates: number[][][] = [];
      
      // Handle MultiPolygon en Polygon
      if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
          coordinates.push(...polygon);
        }
      } else if (geometry.type === 'Polygon') {
        coordinates = geometry.coordinates;
      }
      
      if (coordinates.length === 0) continue;
      
      // Check of punt binnen polygon ligt
      const isInside = coordinates.some(ring => 
        isPointInPolygon(lat, lon, [ring])
      );
      
      // Bereken afstand tot dichtstbijzijnde punt
      const afstand = calculateMinDistanceToPolygon(lat, lon, coordinates);
      
      const gebied: Natura2000Gebied = {
        id: feature.id,
        naam: feature.properties.naam_n2k || 'Onbekend',
        nummer: feature.properties.nr,
        beschermingsType: parseBeschermingsType(feature.properties.beschermin),
        sitecodeVogelrichtlijn: feature.properties.sitecode_v?.trim() || undefined,
        sitecodeHabitatrichtlijn: feature.properties.sitecode_h?.trim() || undefined,
        status: feature.properties.status,
        oppervlakteM2: feature.properties.shape_area,
        staatscourant: feature.properties.staatscour,
        afstandMeter: isInside ? 0 : Math.round(afstand)
      };
      
      if (isInside) {
        binnenGebied = true;
        gebied.afstandMeter = 0;
      }
      
      if (afstand < minAfstand) {
        minAfstand = afstand;
        dichtstbijzijndeGebied = gebied;
      }
      
      if (afstand <= straalMeter || isInside) {
        gebiedenBinnenStraal.push(gebied);
      }
    }
    
    // Sorteer op afstand
    gebiedenBinnenStraal.sort((a, b) => (a.afstandMeter || 0) - (b.afstandMeter || 0));
    
    // Bepaal stikstof risico
    let stikstofRisico: 'geen' | 'laag' | 'middel' | 'hoog' = 'geen';
    let aanbeveling = '';
    
    if (binnenGebied) {
      stikstofRisico = 'hoog';
      aanbeveling = `De locatie ligt BINNEN Natura 2000 gebied "${dichtstbijzijndeGebied?.naam}". Een AERIUS berekening is verplicht voor elke activiteit met stikstofemissie. Neem contact op met de provincie voor een voortoets.`;
    } else if (minAfstand <= 500) {
      stikstofRisico = 'hoog';
      aanbeveling = `De locatie ligt op ${Math.round(minAfstand)}m van Natura 2000 gebied "${dichtstbijzijndeGebied?.naam}". Een AERIUS berekening is zeer waarschijnlijk vereist.`;
    } else if (minAfstand <= 3000) {
      stikstofRisico = 'middel';
      aanbeveling = `De locatie ligt op ${Math.round(minAfstand)}m van Natura 2000 gebied "${dichtstbijzijndeGebied?.naam}". Een AERIUS berekening wordt aanbevolen voor activiteiten met significante stikstofemissie.`;
    } else if (minAfstand <= 10000) {
      stikstofRisico = 'laag';
      aanbeveling = `De locatie ligt op ${Math.round(minAfstand / 1000).toFixed(1)}km van Natura 2000 gebied "${dichtstbijzijndeGebied?.naam}". Een AERIUS berekening is alleen nodig bij grote projecten met hoge emissies.`;
    } else {
      stikstofRisico = 'geen';
      aanbeveling = 'Geen Natura 2000 gebieden binnen 10km. Stikstofberekening is waarschijnlijk niet nodig, tenzij het project zeer grote emissies veroorzaakt.';
    }
    
    return {
      success: true,
      binnenGebied,
      dichtstbijzijndeGebied,
      gebiedenBinnenStraal,
      afstandTotDichtstbijzijnde: minAfstand === Infinity ? undefined : Math.round(minAfstand),
      stikstofRisico,
      aanbeveling
    };
    
  } catch (error) {
    console.error('[Natura2000] Check error:', error);
    return {
      success: false,
      binnenGebied: false,
      gebiedenBinnenStraal: [],
      stikstofRisico: 'geen',
      aanbeveling: 'Natura 2000 check kon niet worden uitgevoerd door een technische fout.',
      error: error instanceof Error ? error.message : 'Onbekende fout'
    };
  }
}

/**
 * Snelle check of een locatie in de buurt van Natura 2000 is
 * Gebruikt kleinere straal voor snellere response
 */
export async function quickNatura2000Check(
  lat: number,
  lon: number
): Promise<{ nabijNatura2000: boolean; afstandMeter?: number; gebiedNaam?: string }> {
  const result = await checkNatura2000(lat, lon, 5000); // 5km straal
  
  return {
    nabijNatura2000: result.binnenGebied || (result.afstandTotDichtstbijzijnde !== undefined && result.afstandTotDichtstbijzijnde <= 3000),
    afstandMeter: result.afstandTotDichtstbijzijnde,
    gebiedNaam: result.dichtstbijzijndeGebied?.naam
  };
}
