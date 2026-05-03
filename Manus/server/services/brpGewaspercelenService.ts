/**
 * BRP Gewaspercelen API Service
 * 
 * Integreert met de PDOK Basisregistratie Gewaspercelen (BRP) API
 * om te checken of een locatie op of nabij landbouwpercelen ligt.
 * 
 * API: https://api.pdok.nl/rvo/gewaspercelen/ogc/v1/
 * Geen API-key vereist (open data)
 * 
 * Relevantie voor vergunningverlening:
 * - Bouwen op landbouwgrond
 * - Functiewijziging agrarisch → wonen
 * - Stikstof voortoets (veehouderij detectie)
 */

const PDOK_BRP_BASE_URL = 'https://api.pdok.nl/rvo/gewaspercelen/ogc/v1';
const COLLECTION_NAME = 'brpgewas';

export interface GewasperceelInfo {
  id: string;
  gewas: string;
  gewascode: number;
  category: string;
  jaar: number;
  status: string;
  oppervlakteM2?: number;
}

export interface BRPCheckResult {
  heeftLandbouwpercelen: boolean;
  aantalPercelen: number;
  percelen: GewasperceelInfo[];
  
  // Samenvatting per categorie
  categorieën: {
    categorie: string;
    aantal: number;
    gewassen: string[];
  }[];
  
  // Relevantie voor vergunning
  relevantieIndicatie: {
    isAgrarischGebied: boolean;
    heeftVeehouderij: boolean;
    heeftAkkerbouw: boolean;
    heeftTuinbouw: boolean;
    heeftGrasland: boolean;
  };
  
  // Aanbevelingen
  aanbevelingen: string[];
  
  checkDatum: string;
}

// Gewascategorieën die wijzen op veehouderij
const VEEHOUDERIJ_GEWASSEN = [
  'grasland',
  'mais',
  'snijmais',
  'voedergewas',
  'luzerne',
  'klaver'
];

// Gewascategorieën die wijzen op akkerbouw
const AKKERBOUW_GEWASSEN = [
  'graan',
  'tarwe',
  'gerst',
  'haver',
  'rogge',
  'aardappel',
  'suikerbiet',
  'ui',
  'peen'
];

// Gewascategorieën die wijzen op tuinbouw
const TUINBOUW_GEWASSEN = [
  'groente',
  'fruit',
  'bloem',
  'bol',
  'boom',
  'sierteelt',
  'kas',
  'glastuinbouw'
];

/**
 * Bepaal of een gewas tot een bepaalde categorie behoort
 */
function isGewasInCategorie(gewas: string, categorieKeywords: string[]): boolean {
  const gewasLower = gewas.toLowerCase();
  return categorieKeywords.some(keyword => gewasLower.includes(keyword));
}

/**
 * Genereer aanbevelingen op basis van gevonden gewaspercelen
 */
function genereerAanbevelingen(result: Omit<BRPCheckResult, 'aanbevelingen'>): string[] {
  const aanbevelingen: string[] = [];
  
  if (!result.heeftLandbouwpercelen) {
    return ['Geen landbouwpercelen gevonden op of nabij deze locatie.'];
  }
  
  aanbevelingen.push(
    `Er ${result.aantalPercelen === 1 ? 'is' : 'zijn'} ${result.aantalPercelen} landbouwperce${result.aantalPercelen === 1 ? 'el' : 'len'} gevonden op of nabij deze locatie.`
  );
  
  if (result.relevantieIndicatie.isAgrarischGebied) {
    aanbevelingen.push(
      'Deze locatie ligt in agrarisch gebied. Bij bouwplannen of functiewijziging ' +
      'gelden mogelijk aanvullende regels voor bescherming van agrarische functies.'
    );
  }
  
  if (result.relevantieIndicatie.heeftVeehouderij) {
    aanbevelingen.push(
      'In de omgeving zijn percelen met veevoedergewassen (grasland, mais) aanwezig. ' +
      'Dit kan wijzen op nabijgelegen veehouderij. Controleer de stikstof voortoets.'
    );
  }
  
  if (result.relevantieIndicatie.heeftGrasland) {
    aanbevelingen.push(
      'Graslandpercelen aanwezig. Bij omzetting naar andere functies kan ' +
      'compensatie of vergunning vereist zijn (provinciaal beleid).'
    );
  }
  
  if (result.relevantieIndicatie.heeftTuinbouw) {
    aanbevelingen.push(
      'Tuinbouwpercelen in de omgeving. Let op mogelijke beperkingen voor ' +
      'gewasbeschermingsmiddelen en lichthinder bij nieuwbouw.'
    );
  }
  
  if (result.relevantieIndicatie.heeftAkkerbouw || result.relevantieIndicatie.heeftTuinbouw) {
    aanbevelingen.push(
      'Wederkerige toetsing: locatie ligt in de nabijheid van landbouwpercelen. ' +
      'Controleer of het plan binnen een spuitzone valt (doorgaans 50m voor open teelt, ' +
      '25m voor fruitteelt). Gewasbeschermingsmiddelen kunnen beperkingen opleggen ' +
      'aan gevoelige bestemmingen (wonen, onderwijs, zorg). Zie ook het activiteitenbesluit ' +
      'en gemeentelijk/provinciaal spuitzonebeleid.'
    );
  }
  
  if (result.relevantieIndicatie.heeftVeehouderij || result.relevantieIndicatie.heeftGrasland) {
    aanbevelingen.push(
      'Wederkerige toetsing: nabijheid van (mogelijke) veehouderij. ' +
      'Controleer geurcontouren en afstandsnormen conform de Wet geurhinder en veehouderij (Wgv). ' +
      'Bouw van gevoelige bestemmingen kan beperkt zijn door bestaande geurrechten van veehouderijen.'
    );
  }
  
  return aanbevelingen;
}

/**
 * Check of een locatie op of nabij landbouwpercelen ligt
 * 
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @param radiusKm Zoekradius in kilometers (default 0.5km = 500m)
 * @returns BRPCheckResult met perceelinfo en aanbevelingen
 */
export async function checkGewaspercelen(
  lat: number,
  lon: number,
  radiusKm: number = 0.5
): Promise<BRPCheckResult> {
  const checkDatum = new Date().toISOString();
  
  try {
    // Maak een bbox rond het punt
    // 1 graad latitude ≈ 111km, 1 graad longitude ≈ 111km * cos(lat)
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    
    const bbox = `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`;
    
    const url = `${PDOK_BRP_BASE_URL}/collections/${COLLECTION_NAME}/items?bbox=${bbox}&limit=50`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/geo+json'
      }
    });
    
    if (!response.ok) {
      console.error(`BRP API error: ${response.status}`);
      return createEmptyResult(checkDatum, 'BRP API niet beschikbaar');
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return createEmptyResult(checkDatum);
    }
    
    // Parse de features
    const percelen: GewasperceelInfo[] = data.features.map((feature: any) => ({
      id: feature.id,
      gewas: feature.properties.gewas?.trim() || 'Onbekend',
      gewascode: feature.properties.gewascode || 0,
      category: feature.properties.category || 'Onbekend',
      jaar: feature.properties.jaar || new Date().getFullYear(),
      status: feature.properties.status || 'Onbekend',
    }));
    
    // Groepeer per categorie
    const categorieMap = new Map<string, { aantal: number; gewassen: Set<string> }>();
    
    for (const perceel of percelen) {
      const cat = perceel.category;
      if (!categorieMap.has(cat)) {
        categorieMap.set(cat, { aantal: 0, gewassen: new Set() });
      }
      const entry = categorieMap.get(cat)!;
      entry.aantal++;
      entry.gewassen.add(perceel.gewas);
    }
    
    const categorieën = Array.from(categorieMap.entries()).map(([categorie, data]) => ({
      categorie,
      aantal: data.aantal,
      gewassen: Array.from(data.gewassen),
    }));
    
    // Bepaal relevantie indicaties
    const alleGewassen = percelen.map(p => p.gewas.toLowerCase()).join(' ');
    const alleCategorieen = percelen.map(p => p.category.toLowerCase()).join(' ');
    
    const relevantieIndicatie = {
      isAgrarischGebied: percelen.length >= 3, // Meerdere percelen = agrarisch gebied
      heeftVeehouderij: VEEHOUDERIJ_GEWASSEN.some(g => alleGewassen.includes(g) || alleCategorieen.includes(g)),
      heeftAkkerbouw: AKKERBOUW_GEWASSEN.some(g => alleGewassen.includes(g) || alleCategorieen.includes(g)),
      heeftTuinbouw: TUINBOUW_GEWASSEN.some(g => alleGewassen.includes(g) || alleCategorieen.includes(g)),
      heeftGrasland: alleGewassen.includes('grasland') || alleCategorieen.includes('grasland'),
    };
    
    const resultWithoutRecommendations = {
      heeftLandbouwpercelen: true,
      aantalPercelen: percelen.length,
      percelen,
      categorieën,
      relevantieIndicatie,
      checkDatum,
    };
    
    return {
      ...resultWithoutRecommendations,
      aanbevelingen: genereerAanbevelingen(resultWithoutRecommendations),
    };
    
  } catch (error) {
    console.error('BRP check error:', error);
    return createEmptyResult(checkDatum, 'Technische fout bij BRP check');
  }
}

/**
 * Helper om een leeg resultaat te maken
 */
function createEmptyResult(checkDatum: string, melding?: string): BRPCheckResult {
  return {
    heeftLandbouwpercelen: false,
    aantalPercelen: 0,
    percelen: [],
    categorieën: [],
    relevantieIndicatie: {
      isAgrarischGebied: false,
      heeftVeehouderij: false,
      heeftAkkerbouw: false,
      heeftTuinbouw: false,
      heeftGrasland: false,
    },
    aanbevelingen: [melding || 'Geen landbouwpercelen gevonden op of nabij deze locatie.'],
    checkDatum,
  };
}

/**
 * Check of BRP check relevant is voor een bepaalde bestemming
 */
export function isBRPCheckRelevant(bestemming: string): boolean {
  const bestemmingLower = bestemming.toLowerCase();
  const relevanteKeywords = [
    'agrarisch',
    'landbouw',
    'akkerbouw',
    'veeteelt',
    'tuinbouw',
    'glastuinbouw',
    'buitengebied',
    'landelijk',
    'groen',
    'natuur'
  ];
  
  return relevanteKeywords.some(keyword => bestemmingLower.includes(keyword));
}
