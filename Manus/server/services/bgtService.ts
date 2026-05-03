/**
 * BGT (Basisregistratie Grootschalige Topografie) API Service
 * 
 * Haalt gedetailleerde topografische informatie op voor een locatie:
 * - Panden en gebouwen
 * - Begroeid terreindeel (groen)
 * - Onbegroeid terreindeel (verharding)
 * - Waterdelen
 * - Wegdelen
 */

const BGT_API_BASE = 'https://api.pdok.nl/lv/bgt/ogc/v1_1';

interface BGTFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

interface BGTResponse {
  type: string;
  features: BGTFeature[];
  numberMatched?: number;
  numberReturned?: number;
}

export interface TopografischeAnalyse {
  panden: {
    aantal: number;
    statussen: Record<string, number>;
  };
  groenvoorziening: {
    aanwezig: boolean;
    types: Record<string, number>;
    totaalAantal: number;
  };
  verharding: {
    aanwezig: boolean;
    types: Record<string, number>;
    totaalAantal: number;
  };
  water: {
    aanwezig: boolean;
    types: Record<string, number>;
    totaalAantal: number;
  };
  wegen: {
    aanwezig: boolean;
    functies: Record<string, number>;
    totaalAantal: number;
  };
  samenvatting: string;
  aanbevelingen: string[];
}

/**
 * Haalt BGT features op voor een specifieke collectie binnen een bbox
 */
async function fetchBGTCollection(
  collection: string,
  bbox: string,
  limit: number = 100
): Promise<BGTFeature[]> {
  const url = `${BGT_API_BASE}/collections/${collection}/items?bbox=${bbox}&limit=${limit}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/geo+json'
      }
    });
    
    if (!response.ok) {
      console.warn(`BGT API error for ${collection}: ${response.status}`);
      return [];
    }
    
    const data: BGTResponse = await response.json();
    return data.features || [];
  } catch (error) {
    console.error(`Error fetching BGT ${collection}:`, error);
    return [];
  }
}

/**
 * Berekent een bbox rond een punt met een bepaalde radius in meters
 * Converteert WGS84 (lon/lat) naar een bbox string
 */
function calculateBbox(lon: number, lat: number, radiusMeters: number = 100): string {
  // Approximatie: 1 graad latitude ≈ 111km, 1 graad longitude ≈ 111km * cos(lat)
  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
  
  const minLon = lon - lonDelta;
  const minLat = lat - latDelta;
  const maxLon = lon + lonDelta;
  const maxLat = lat + latDelta;
  
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/**
 * Analyseert de topografie rond een locatie
 */
export async function analyzeTopografie(
  lon: number,
  lat: number,
  radiusMeters: number = 100
): Promise<TopografischeAnalyse> {
  const bbox = calculateBbox(lon, lat, radiusMeters);
  
  // Parallel ophalen van verschillende BGT collecties
  const [panden, begroeid, onbegroeid, water, wegen] = await Promise.all([
    fetchBGTCollection('pand', bbox),
    fetchBGTCollection('begroeidterreindeel', bbox),
    fetchBGTCollection('onbegroeidterreindeel', bbox),
    fetchBGTCollection('waterdeel', bbox),
    fetchBGTCollection('wegdeel', bbox)
  ]);
  
  // Analyseer panden
  const pandStatussen: Record<string, number> = {};
  panden.forEach(p => {
    const status = (p.properties.status as string) || 'onbekend';
    pandStatussen[status] = (pandStatussen[status] || 0) + 1;
  });
  
  // Analyseer groenvoorziening
  const groenTypes: Record<string, number> = {};
  begroeid.forEach(b => {
    const type = (b.properties.fysiek_voorkomen as string) || 'onbekend';
    groenTypes[type] = (groenTypes[type] || 0) + 1;
  });
  
  // Analyseer verharding
  const verhardingTypes: Record<string, number> = {};
  onbegroeid.forEach(o => {
    const type = (o.properties.fysiek_voorkomen as string) || 'onbekend';
    verhardingTypes[type] = (verhardingTypes[type] || 0) + 1;
  });
  
  // Analyseer water
  const waterTypes: Record<string, number> = {};
  water.forEach(w => {
    const type = (w.properties.type_water as string) || (w.properties.fysiek_voorkomen as string) || 'onbekend';
    waterTypes[type] = (waterTypes[type] || 0) + 1;
  });
  
  // Analyseer wegen
  const wegFuncties: Record<string, number> = {};
  wegen.forEach(w => {
    const functie = (w.properties.functie as string) || 'onbekend';
    wegFuncties[functie] = (wegFuncties[functie] || 0) + 1;
  });
  
  // Genereer samenvatting
  const samenvattingParts: string[] = [];
  
  if (panden.length > 0) {
    samenvattingParts.push(`${panden.length} pand(en) in de directe omgeving`);
  }
  if (begroeid.length > 0) {
    samenvattingParts.push(`groenvoorziening aanwezig (${begroeid.length} elementen)`);
  }
  if (water.length > 0) {
    samenvattingParts.push(`water in de nabijheid (${water.length} elementen)`);
  }
  if (wegen.length > 0) {
    samenvattingParts.push(`${wegen.length} wegdeel(en) in de omgeving`);
  }
  
  const samenvatting = samenvattingParts.length > 0
    ? `Topografische analyse: ${samenvattingParts.join(', ')}.`
    : 'Geen significante topografische elementen gevonden in de directe omgeving.';
  
  // Genereer aanbevelingen
  const aanbevelingen: string[] = [];
  
  if (water.length > 0) {
    aanbevelingen.push('Watertoets mogelijk vereist vanwege nabijheid van water');
  }
  
  if (begroeid.length > 5) {
    aanbevelingen.push('Significante groenvoorziening aanwezig - check compensatieplicht bij kap');
  }
  
  const heeftHoofdweg = Object.keys(wegFuncties).some(f => 
    f.toLowerCase().includes('rijbaan') || f.toLowerCase().includes('autoweg')
  );
  if (heeftHoofdweg) {
    aanbevelingen.push('Nabij hoofdweg - check geluidsnormen en luchtkwaliteit');
  }
  
  if (panden.length > 10) {
    aanbevelingen.push('Dichtbebouwd gebied - extra aandacht voor privacy en bezonning');
  }
  
  return {
    panden: {
      aantal: panden.length,
      statussen: pandStatussen
    },
    groenvoorziening: {
      aanwezig: begroeid.length > 0,
      types: groenTypes,
      totaalAantal: begroeid.length
    },
    verharding: {
      aanwezig: onbegroeid.length > 0,
      types: verhardingTypes,
      totaalAantal: onbegroeid.length
    },
    water: {
      aanwezig: water.length > 0,
      types: waterTypes,
      totaalAantal: water.length
    },
    wegen: {
      aanwezig: wegen.length > 0,
      functies: wegFuncties,
      totaalAantal: wegen.length
    },
    samenvatting,
    aanbevelingen
  };
}

/**
 * Snelle check of een locatie nabij water ligt
 */
export async function checkNabijWater(
  lon: number,
  lat: number,
  radiusMeters: number = 50
): Promise<{ nabijWater: boolean; waterTypes: string[] }> {
  const bbox = calculateBbox(lon, lat, radiusMeters);
  const water = await fetchBGTCollection('waterdeel', bbox, 10);
  
  const waterTypes = Array.from(new Set(
    water.map(w => (w.properties.type_water as string) || (w.properties.fysiek_voorkomen as string) || 'water')
  ));
  
  return {
    nabijWater: water.length > 0,
    waterTypes
  };
}

/**
 * Check bebouwingsdichtheid rond een locatie
 */
export async function checkBebouwingsdichtheid(
  lon: number,
  lat: number,
  radiusMeters: number = 100
): Promise<{ dichtheid: 'laag' | 'middel' | 'hoog'; aantalPanden: number }> {
  const bbox = calculateBbox(lon, lat, radiusMeters);
  const panden = await fetchBGTCollection('pand', bbox);
  
  let dichtheid: 'laag' | 'middel' | 'hoog';
  if (panden.length < 5) {
    dichtheid = 'laag';
  } else if (panden.length < 20) {
    dichtheid = 'middel';
  } else {
    dichtheid = 'hoog';
  }
  
  return {
    dichtheid,
    aantalPanden: panden.length
  };
}
