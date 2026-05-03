/**
 * Beschermde Gebieden - Cultuurhistorie Service
 * 
 * Integreert met de PDOK RCE Beschermde Gebieden Cultuurhistorie API
 * voor detectie van monumenten en beschermde stadsgezichten.
 */

const CULTUURHISTORIE_API_BASE = 'https://api.pdok.nl/rce/beschermde-gebieden-cultuurhistorie/ogc/v1';

export interface BeschermdGebied {
  type: 'monument' | 'beschermd_stadsgezicht' | 'beschermd_dorpsgezicht';
  naam: string;
  aanwijzingsDatum: string;
  namespace: string;
  localId: string;
  afstand?: number; // in meters
  ligging: 'binnen' | 'nabij';
}

export interface CultuurhistorieCheckResult {
  heeftBeschermdeStatus: boolean;
  inBeschermdStadsgezicht: boolean;
  inBeschermdDorpsgezicht: boolean;
  nabijMonumenten: boolean;
  beschermdeGebieden: BeschermdGebied[];
  monumentenInOmgeving: number;
  aanbevelingen: string[];
  checkDatum: string;
}

/**
 * Bereken afstand tussen twee punten in meters (Haversine formule)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius van de aarde in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bepaal of een punt binnen een polygon ligt (ray casting algoritme)
 */
function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    if (((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check beschermde stadsgezichten en dorpsgezichten (polygons)
 */
async function checkBeschermdeGezichten(lat: number, lng: number, radiusKm: number = 0.5): Promise<BeschermdGebied[]> {
  const beschermdeGebieden: BeschermdGebied[] = [];
  
  // Bereken bbox rond de locatie
  const latOffset = radiusKm / 111;
  const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  
  const bbox = `${lng - lngOffset},${lat - latOffset},${lng + lngOffset},${lat + latOffset}`;
  
  try {
    const response = await fetch(
      `${CULTUURHISTORIE_API_BASE}/collections/rce_inspire_polygons/items?bbox=${bbox}&limit=50`
    );
    
    if (!response.ok) {
      console.error('[Cultuurhistorie] Polygons API error:', response.status);
      return beschermdeGebieden;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      for (const feature of data.features) {
        const props = feature.properties;
        const geometry = feature.geometry;
        
        // Bepaal type op basis van namespace
        let type: 'beschermd_stadsgezicht' | 'beschermd_dorpsgezicht' = 'beschermd_stadsgezicht';
        if (props.namespace?.includes('dorpsgezicht')) {
          type = 'beschermd_dorpsgezicht';
        }
        
        // Check of punt binnen polygon ligt
        let ligging: 'binnen' | 'nabij' = 'nabij';
        if (geometry?.type === 'Polygon' && geometry.coordinates?.[0]) {
          if (pointInPolygon(lat, lng, geometry.coordinates[0])) {
            ligging = 'binnen';
          }
        } else if (geometry?.type === 'MultiPolygon' && geometry.coordinates) {
          for (const polygon of geometry.coordinates) {
            if (polygon[0] && pointInPolygon(lat, lng, polygon[0])) {
              ligging = 'binnen';
              break;
            }
          }
        }
        
        beschermdeGebieden.push({
          type,
          naam: props.text || 'Onbekend',
          aanwijzingsDatum: props.legalfoundationdate || 'Onbekend',
          namespace: props.namespace || '',
          localId: props.localid || '',
          ligging,
        });
      }
    }
  } catch (error) {
    console.error('[Cultuurhistorie] Error fetching polygons:', error);
  }
  
  return beschermdeGebieden;
}

/**
 * Check monumenten in de omgeving (points)
 */
async function checkMonumenten(lat: number, lng: number, radiusKm: number = 0.2): Promise<{ monumenten: BeschermdGebied[], aantal: number }> {
  const monumenten: BeschermdGebied[] = [];
  
  // Bereken bbox rond de locatie
  const latOffset = radiusKm / 111;
  const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  
  const bbox = `${lng - lngOffset},${lat - latOffset},${lng + lngOffset},${lat + latOffset}`;
  
  try {
    const response = await fetch(
      `${CULTUURHISTORIE_API_BASE}/collections/rce_inspire_points/items?bbox=${bbox}&limit=100`
    );
    
    if (!response.ok) {
      console.error('[Cultuurhistorie] Points API error:', response.status);
      return { monumenten, aantal: 0 };
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      for (const feature of data.features) {
        const props = feature.properties;
        const geometry = feature.geometry;
        
        // Bereken afstand tot monument
        let afstand: number | undefined;
        if (geometry?.type === 'Point' && geometry.coordinates) {
          afstand = Math.round(calculateDistance(lat, lng, geometry.coordinates[1], geometry.coordinates[0]));
        }
        
        monumenten.push({
          type: 'monument',
          naam: props.text || 'Rijksmonument',
          aanwijzingsDatum: props.legalfoundationdate || 'Onbekend',
          namespace: props.namespace || '',
          localId: props.localid || '',
          afstand,
          ligging: afstand && afstand < 50 ? 'binnen' : 'nabij',
        });
      }
      
      // Sorteer op afstand
      monumenten.sort((a, b) => (a.afstand || 999999) - (b.afstand || 999999));
    }
    
    return { monumenten: monumenten.slice(0, 10), aantal: data.numberMatched || monumenten.length };
  } catch (error) {
    console.error('[Cultuurhistorie] Error fetching points:', error);
    return { monumenten, aantal: 0 };
  }
}

/**
 * Voer een complete cultuurhistorie check uit voor een locatie
 */
export async function checkCultuurhistorie(lat: number, lng: number): Promise<CultuurhistorieCheckResult> {
  console.log(`[Cultuurhistorie] Checking location: ${lat}, ${lng}`);
  
  // Parallel uitvoeren van beide checks
  const [beschermdeGezichten, monumentenResult] = await Promise.all([
    checkBeschermdeGezichten(lat, lng, 0.5),
    checkMonumenten(lat, lng, 0.2),
  ]);
  
  // Combineer resultaten
  const alleBeschermdeGebieden = [...beschermdeGezichten, ...monumentenResult.monumenten];
  
  // Bepaal status
  const inBeschermdStadsgezicht = beschermdeGezichten.some(
    g => g.type === 'beschermd_stadsgezicht' && g.ligging === 'binnen'
  );
  const inBeschermdDorpsgezicht = beschermdeGezichten.some(
    g => g.type === 'beschermd_dorpsgezicht' && g.ligging === 'binnen'
  );
  const nabijMonumenten = monumentenResult.monumenten.some(m => (m.afstand || 999999) < 100);
  
  // Genereer aanbevelingen
  const aanbevelingen: string[] = [];
  
  if (inBeschermdStadsgezicht || inBeschermdDorpsgezicht) {
    const type = inBeschermdStadsgezicht ? 'beschermd stadsgezicht' : 'beschermd dorpsgezicht';
    aanbevelingen.push(`⚠️ Locatie ligt binnen een ${type}. Extra welstandseisen van toepassing.`);
    aanbevelingen.push('Raadpleeg de welstandsnota voor specifieke eisen aan materiaalgebruik en vormgeving.');
    aanbevelingen.push('Mogelijk is advies van de monumentencommissie vereist.');
  }
  
  if (nabijMonumenten) {
    const dichtstbijzijnde = monumentenResult.monumenten[0];
    aanbevelingen.push(`📍 Rijksmonument binnen ${dichtstbijzijnde.afstand}m: "${dichtstbijzijnde.naam}"`);
    aanbevelingen.push('Check of de werkzaamheden invloed hebben op het monument of de omgeving.');
  }
  
  if (monumentenResult.aantal > 5) {
    aanbevelingen.push(`ℹ️ ${monumentenResult.aantal} monumenten in de directe omgeving. Gebied heeft hoge cultuurhistorische waarde.`);
  }
  
  if (aanbevelingen.length === 0) {
    aanbevelingen.push('✓ Geen bijzondere cultuurhistorische beperkingen gedetecteerd.');
  }
  
  const result: CultuurhistorieCheckResult = {
    heeftBeschermdeStatus: inBeschermdStadsgezicht || inBeschermdDorpsgezicht || nabijMonumenten,
    inBeschermdStadsgezicht,
    inBeschermdDorpsgezicht,
    nabijMonumenten,
    beschermdeGebieden: alleBeschermdeGebieden,
    monumentenInOmgeving: monumentenResult.aantal,
    aanbevelingen,
    checkDatum: new Date().toISOString(),
  };
  
  console.log('[Cultuurhistorie] Check result:', {
    inBeschermdStadsgezicht,
    inBeschermdDorpsgezicht,
    nabijMonumenten,
    monumentenInOmgeving: monumentenResult.aantal,
  });
  
  return result;
}

export { checkBeschermdeGezichten, checkMonumenten };
