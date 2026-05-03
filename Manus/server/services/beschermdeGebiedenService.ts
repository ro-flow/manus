/**
 * Beschermde Gebieden Service
 * 
 * Gecombineerde service voor het checken van alle beschermde natuurgebieden:
 * - Natura 2000 gebieden
 * - Natuurnetwerk Nederland (NNN/EHS)
 * - Nationale Parken
 * 
 * Gebruikt de PDOK CDDA (Common Database of Designated Areas) API
 */

const CDDA_API_BASE = 'https://api.pdok.nl/rvo/nationaal-beschermde-gebieden-cdda/ogc/v1';
const NATURA2000_API_BASE = 'https://api.pdok.nl/rvo/natura2000/ogc/v1';

export interface BeschermdeGebiedInfo {
  naam: string;
  type: 'natura2000' | 'nnn' | 'nationaal_park';
  afstandMeter?: number;
  binnenGebied: boolean;
}

export interface BeschermdeGebiedenCheck {
  // Natura 2000
  natura2000Gebieden: BeschermdeGebiedInfo[];
  dichtstbijzijndeNatura2000?: BeschermdeGebiedInfo;
  binnenNatura2000: boolean;
  
  // NNN (Natuurnetwerk Nederland)
  nnnGebieden: BeschermdeGebiedInfo[];
  dichtstbijzijndeNNN?: BeschermdeGebiedInfo;
  binnenNNN: boolean;
  
  // Nationale Parken
  nationaleParken: BeschermdeGebiedInfo[];
  dichtstbijzijndeNationaalPark?: BeschermdeGebiedInfo;
  binnenNationaalPark: boolean;
  
  // Gecombineerd
  alleGebiedenBinnenStraal: BeschermdeGebiedInfo[];
  stikstofRisico: 'laag' | 'middel' | 'hoog';
  aanbevelingen: string[];
  samenvatting: string;
}

/**
 * Bereken afstand tussen twee punten in meters (Haversine formule)
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Bereken centroid van een polygon
 */
function calculateCentroid(coordinates: number[][][]): { lat: number; lon: number } {
  let totalLat = 0;
  let totalLon = 0;
  let count = 0;
  
  for (const ring of coordinates) {
    for (const coord of ring) {
      totalLon += coord[0];
      totalLat += coord[1];
      count++;
    }
  }
  
  return {
    lat: totalLat / count,
    lon: totalLon / count
  };
}

/**
 * Check of een punt binnen een polygon ligt (ray casting algorithm)
 */
function pointInPolygon(lat: number, lon: number, polygon: number[][][]): boolean {
  const ring = polygon[0]; // Outer ring
  let inside = false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Haal alle beschermde gebieden op binnen een straal via CDDA API
 */
async function fetchCDDAGebieden(
  lat: number,
  lon: number,
  straalKm: number = 10
): Promise<{ nnn: BeschermdeGebiedInfo[]; parken: BeschermdeGebiedInfo[] }> {
  const nnnGebieden: BeschermdeGebiedInfo[] = [];
  const parken: BeschermdeGebiedInfo[] = [];
  
  try {
    // Bereken bbox (ongeveer)
    const latDelta = straalKm / 111;
    const lonDelta = straalKm / (111 * Math.cos(lat * Math.PI / 180));
    
    const bbox = `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`;
    
    const response = await fetch(
      `${CDDA_API_BASE}/collections/cdda/items?bbox=${bbox}&limit=100`
    );
    
    if (!response.ok) {
      console.error('CDDA API error:', response.status);
      return { nnn: [], parken: [] };
    }
    
    const data = await response.json();
    
    for (const feature of data.features || []) {
      const props = feature.properties;
      const naam = props.sitename || 'Onbekend';
      const namespace = props.namespac || '';
      
      // Bepaal type
      let type: 'nnn' | 'nationaal_park' | null = null;
      if (namespace.includes('EHS') || namespace.includes('NNN')) {
        type = 'nnn';
      } else if (namespace.includes('nationaleparken')) {
        type = 'nationaal_park';
      }
      
      if (!type) continue; // Skip natura2000, die halen we apart op
      
      // Bereken afstand
      let afstandMeter: number | undefined;
      let binnenGebied = false;
      
      if (feature.geometry) {
        if (feature.geometry.type === 'Polygon') {
          binnenGebied = pointInPolygon(lat, lon, feature.geometry.coordinates);
          const centroid = calculateCentroid(feature.geometry.coordinates);
          afstandMeter = binnenGebied ? 0 : calculateDistanceMeters(lat, lon, centroid.lat, centroid.lon);
        } else if (feature.geometry.type === 'MultiPolygon') {
          for (const polygon of feature.geometry.coordinates) {
            if (pointInPolygon(lat, lon, polygon)) {
              binnenGebied = true;
              break;
            }
          }
          // Gebruik eerste polygon voor centroid
          const centroid = calculateCentroid(feature.geometry.coordinates[0]);
          afstandMeter = binnenGebied ? 0 : calculateDistanceMeters(lat, lon, centroid.lat, centroid.lon);
        }
      }
      
      const gebiedInfo: BeschermdeGebiedInfo = {
        naam,
        type,
        afstandMeter,
        binnenGebied
      };
      
      if (type === 'nnn') {
        nnnGebieden.push(gebiedInfo);
      } else if (type === 'nationaal_park') {
        parken.push(gebiedInfo);
      }
    }
    
    // Sorteer op afstand
    nnnGebieden.sort((a, b) => (a.afstandMeter || 0) - (b.afstandMeter || 0));
    parken.sort((a, b) => (a.afstandMeter || 0) - (b.afstandMeter || 0));
    
  } catch (error) {
    console.error('Error fetching CDDA gebieden:', error);
  }
  
  return { nnn: nnnGebieden, parken };
}

/**
 * Haal Natura 2000 gebieden op (bestaande functionaliteit)
 */
async function fetchNatura2000Gebieden(
  lat: number,
  lon: number,
  straalKm: number = 10
): Promise<BeschermdeGebiedInfo[]> {
  const gebieden: BeschermdeGebiedInfo[] = [];
  
  try {
    const latDelta = straalKm / 111;
    const lonDelta = straalKm / (111 * Math.cos(lat * Math.PI / 180));
    const bbox = `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`;
    
    const response = await fetch(
      `${NATURA2000_API_BASE}/collections/natura2000/items?bbox=${bbox}&limit=50`
    );
    
    if (!response.ok) {
      console.error('Natura2000 API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    for (const feature of data.features || []) {
      const props = feature.properties;
      const naam = props.naam || props.sitename || 'Onbekend Natura 2000 gebied';
      
      let afstandMeter: number | undefined;
      let binnenGebied = false;
      
      if (feature.geometry) {
        if (feature.geometry.type === 'Polygon') {
          binnenGebied = pointInPolygon(lat, lon, feature.geometry.coordinates);
          const centroid = calculateCentroid(feature.geometry.coordinates);
          afstandMeter = binnenGebied ? 0 : calculateDistanceMeters(lat, lon, centroid.lat, centroid.lon);
        } else if (feature.geometry.type === 'MultiPolygon') {
          for (const polygon of feature.geometry.coordinates) {
            if (pointInPolygon(lat, lon, polygon)) {
              binnenGebied = true;
              break;
            }
          }
          const centroid = calculateCentroid(feature.geometry.coordinates[0]);
          afstandMeter = binnenGebied ? 0 : calculateDistanceMeters(lat, lon, centroid.lat, centroid.lon);
        }
      }
      
      gebieden.push({
        naam,
        type: 'natura2000',
        afstandMeter,
        binnenGebied
      });
    }
    
    gebieden.sort((a, b) => (a.afstandMeter || 0) - (b.afstandMeter || 0));
    
  } catch (error) {
    console.error('Error fetching Natura2000 gebieden:', error);
  }
  
  return gebieden;
}

/**
 * Bepaal stikstofrisico op basis van alle beschermde gebieden
 */
function bepaalStikstofRisico(check: Partial<BeschermdeGebiedenCheck>): 'laag' | 'middel' | 'hoog' {
  // Binnen een beschermd gebied = hoog risico
  if (check.binnenNatura2000 || check.binnenNNN || check.binnenNationaalPark) {
    return 'hoog';
  }
  
  // Check afstanden
  const dichtstbijzijnde = [
    check.dichtstbijzijndeNatura2000,
    check.dichtstbijzijndeNNN,
    check.dichtstbijzijndeNationaalPark
  ].filter(Boolean);
  
  const minAfstand = Math.min(...dichtstbijzijnde.map(g => g?.afstandMeter || Infinity));
  
  if (minAfstand < 1000) return 'hoog';      // < 1km
  if (minAfstand < 3000) return 'middel';    // < 3km
  if (minAfstand < 10000) return 'laag';     // < 10km
  
  return 'laag';
}

/**
 * Genereer aanbevelingen op basis van de gebiedencheck
 */
function genereerAanbevelingen(check: Partial<BeschermdeGebiedenCheck>): string[] {
  const aanbevelingen: string[] = [];
  
  if (check.binnenNatura2000) {
    aanbevelingen.push('Locatie ligt BINNEN een Natura 2000 gebied. AERIUS berekening is verplicht voor elke activiteit met stikstofemissie.');
    aanbevelingen.push('Neem contact op met de provincie voor een vooroverleg over de haalbaarheid.');
  } else if (check.dichtstbijzijndeNatura2000?.afstandMeter && check.dichtstbijzijndeNatura2000.afstandMeter < 3000) {
    aanbevelingen.push(`Natura 2000 gebied "${check.dichtstbijzijndeNatura2000.naam}" op ${check.dichtstbijzijndeNatura2000.afstandMeter}m afstand. AERIUS berekening sterk aanbevolen.`);
  }
  
  if (check.binnenNNN) {
    aanbevelingen.push('Locatie ligt BINNEN het Natuurnetwerk Nederland (NNN). Toets aan provinciaal natuurbeleid vereist.');
    aanbevelingen.push('Compensatie of mitigatie kan vereist zijn bij aantasting van natuurwaarden.');
  } else if (check.dichtstbijzijndeNNN?.afstandMeter && check.dichtstbijzijndeNNN.afstandMeter < 1000) {
    aanbevelingen.push(`NNN-gebied op ${check.dichtstbijzijndeNNN.afstandMeter}m afstand. Check externe werking op natuurwaarden.`);
  }
  
  if (check.binnenNationaalPark) {
    aanbevelingen.push('Locatie ligt BINNEN een Nationaal Park. Extra aandacht voor landschappelijke inpassing vereist.');
  }
  
  if (aanbevelingen.length === 0) {
    aanbevelingen.push('Geen directe ligging in of nabij beschermde natuurgebieden. Standaard stikstoftoets volstaat.');
  }
  
  return aanbevelingen;
}

/**
 * Genereer samenvatting van de gebiedencheck
 */
function genereerSamenvatting(check: Partial<BeschermdeGebiedenCheck>): string {
  const binnenGebieden: string[] = [];
  const nabijGebieden: string[] = [];
  
  if (check.binnenNatura2000) binnenGebieden.push('Natura 2000');
  if (check.binnenNNN) binnenGebieden.push('NNN');
  if (check.binnenNationaalPark) binnenGebieden.push('Nationaal Park');
  
  if (check.dichtstbijzijndeNatura2000?.afstandMeter && check.dichtstbijzijndeNatura2000.afstandMeter < 5000 && !check.binnenNatura2000) {
    nabijGebieden.push(`Natura 2000 (${check.dichtstbijzijndeNatura2000.afstandMeter}m)`);
  }
  if (check.dichtstbijzijndeNNN?.afstandMeter && check.dichtstbijzijndeNNN.afstandMeter < 5000 && !check.binnenNNN) {
    nabijGebieden.push(`NNN (${check.dichtstbijzijndeNNN.afstandMeter}m)`);
  }
  
  if (binnenGebieden.length > 0) {
    return `Locatie ligt BINNEN ${binnenGebieden.join(' en ')}. Uitgebreide natuurtoets en AERIUS berekening vereist.`;
  }
  
  if (nabijGebieden.length > 0) {
    return `Locatie ligt nabij ${nabijGebieden.join(' en ')}. AERIUS berekening aanbevolen voor activiteiten met stikstofemissie.`;
  }
  
  return 'Geen beschermde natuurgebieden in de directe omgeving. Standaard stikstoftoets volstaat.';
}

/**
 * Voer een complete beschermde gebieden check uit voor een locatie
 */
export async function checkBeschermdeGebieden(
  lat: number,
  lon: number,
  straalKm: number = 10
): Promise<BeschermdeGebiedenCheck> {
  // Haal alle gebieden parallel op
  const [natura2000, cddaResult] = await Promise.all([
    fetchNatura2000Gebieden(lat, lon, straalKm),
    fetchCDDAGebieden(lat, lon, straalKm)
  ]);
  
  const { nnn, parken } = cddaResult;
  
  // Bouw het resultaat
  const check: BeschermdeGebiedenCheck = {
    // Natura 2000
    natura2000Gebieden: natura2000,
    dichtstbijzijndeNatura2000: natura2000[0],
    binnenNatura2000: natura2000.some(g => g.binnenGebied),
    
    // NNN
    nnnGebieden: nnn,
    dichtstbijzijndeNNN: nnn[0],
    binnenNNN: nnn.some(g => g.binnenGebied),
    
    // Nationale Parken
    nationaleParken: parken,
    dichtstbijzijndeNationaalPark: parken[0],
    binnenNationaalPark: parken.some(g => g.binnenGebied),
    
    // Gecombineerd
    alleGebiedenBinnenStraal: [...natura2000, ...nnn, ...parken].sort(
      (a, b) => (a.afstandMeter || 0) - (b.afstandMeter || 0)
    ),
    stikstofRisico: 'laag',
    aanbevelingen: [],
    samenvatting: ''
  };
  
  // Bepaal risico en genereer aanbevelingen
  check.stikstofRisico = bepaalStikstofRisico(check);
  check.aanbevelingen = genereerAanbevelingen(check);
  check.samenvatting = genereerSamenvatting(check);
  
  return check;
}

/**
 * Snelle check of een locatie in of nabij beschermde gebieden ligt
 */
export async function quickBeschermdeGebiedenCheck(
  lat: number,
  lon: number
): Promise<{ risico: 'laag' | 'middel' | 'hoog'; samenvatting: string }> {
  const check = await checkBeschermdeGebieden(lat, lon, 5); // Kleinere straal voor snelle check
  return {
    risico: check.stikstofRisico,
    samenvatting: check.samenvatting
  };
}
