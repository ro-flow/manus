/**
 * PDOK API Service
 * Gratis geo-data API's van de Nederlandse overheid
 */

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
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`[PDOK] Retry ${attempt + 1}/${maxRetries} for ${url.substring(0, 80)}... (waiting ${Math.round(delay)}ms)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

// BAG Gebouwinformatie
interface BAGPand {
  identificatie: string;
  bouwjaar: number;
  status: string;
  oppervlakte?: number;
  geometrie?: any;
}

interface BAGVerblijfsobject {
  identificatie: string;
  oppervlakte: number;
  status: string;
  gebruiksdoel: string[]; // woonfunctie, kantoorfunctie, etc.
  nummeraanduiding?: string;
}

export interface BAGResultaat {
  pand: BAGPand | null;
  verblijfsobject: BAGVerblijfsobject | null;
  adres?: string;
}

// Kadastrale Kaart
interface KadastraalPerceel {
  kadastraleAanduiding: string;  // bijv. "ASD01 A 1234"
  gemeente: string;
  sectie: string;
  perceelnummer: string;
  oppervlakte: number;  // m²
  geometrie?: any;
}

export interface KadasterResultaat {
  perceel: KadastraalPerceel | null;
  aantalPercelen: number;
}

// BGT Topografie
interface BGTObject {
  type: string;  // wegdeel, waterdeel, pand, etc.
  functie?: string;
  oppervlakte?: number;
}

export interface BGTResultaat {
  wegdelen: BGTObject[];
  waterdelen: BGTObject[];
  groenvoorzieningen: BGTObject[];
  verharding: { type: string; oppervlakte: number }[];
  totaalVerhard: number;  // m²
  totaalGroen: number;    // m²
}

// Grondwaterbescherming
interface Grondwaterzone {
  naam: string;
  type: 'waterwingebied' | 'grondwaterbeschermingsgebied' | 'boringsvrije_zone' | 'intrekgebied';
  provincie: string;
  beperkingen?: string;
}

export interface GrondwaterResultaat {
  binnenBeschermingsgebied: boolean;
  zones: Grondwaterzone[];
}

// Activiteiten waarbij BAG info relevant is
export type RelevantieContext = {
  bouwjaarRelevant: boolean;      // verbouw, uitbreiding, constructief
  functieRelevant: boolean;       // functiewijziging
  oppervlakteRelevant: boolean;   // uitbreiding, oppervlaktenormen
  activiteiten: string[];
};

interface Natura2000Gebied {
  naam: string;
  code: string;
  afstandMeter: number;
  oppervlakteHa?: number;
}

interface Monument {
  naam: string;
  rijksmonumentnummer: string;
  type: 'rijksmonument' | 'gemeentelijk_monument' | 'beschermd_gezicht';
  omschrijving?: string;
  afstandMeter: number;
}

interface BeschermdGezicht {
  naam: string;
  code: string;
  type: 'stads' | 'dorps';
  binnenGebied: boolean;
}

export interface PDOKAnalyseResultaat {
  bag?: BAGResultaat;
  kadaster?: KadasterResultaat;
  bgt?: BGTResultaat;
  grondwater?: GrondwaterResultaat;
  natura2000: {
    binnenGebied: boolean;
    dichtstbijzijnde: Natura2000Gebied | null;
    gebiedenBinnen5km: Natura2000Gebied[];
  };
  monumenten: {
    isRijksmonument: boolean;
    monument: Monument | null;
    monumentenInOmgeving: Monument[];
  };
  beschermdGezicht: {
    binnenGebied: boolean;
    gezicht: BeschermdGezicht | null;
  };
}

const NATURA2000_WFS = "https://service.pdok.nl/rvo/natura2000/wfs/v1_0";
// Old URLs give 404, use RCE ps-ch (Protected Sites Cultural Heritage) INSPIRE endpoint
const RCE_PSCH_WFS = "https://service.pdok.nl/rce/ps-ch/wfs/v1_0";
const MONUMENTEN_WFS = RCE_PSCH_WFS; // points layer: ps-ch:rce_inspire_points
const BESCHERMD_GEZICHT_WFS = RCE_PSCH_WFS; // polygons layer: ps-ch:rce_inspire_polygons
const KADASTER_WFS = "https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0";
const BGT_OGC = "https://api.pdok.nl/lv/bgt/ogc/v1_0";
const GRONDWATER_WMS = "https://service.pdok.nl/provincies/grondwaterbeschermingsgebieden/wms/v1_0";

/**
 * Check Natura 2000 gebieden bij een locatie
 */
async function checkNatura2000(lon: number, lat: number): Promise<PDOKAnalyseResultaat['natura2000']> {
  try {
    // Zoek binnen 5km radius
    const buffer = 5000; // 5km in meters
    const bbox = createBBox(lon, lat, buffer);
    
    const url = `${NATURA2000_WFS}?service=WFS&version=2.0.0&request=GetFeature&typeName=natura2000:natura2000&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox},EPSG:4326`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      console.error(`[PDOK] Natura 2000 API error: ${response.status}`);
      return { binnenGebied: false, dichtstbijzijnde: null, gebiedenBinnen5km: [] };
    }
    
    const data = await response.json();
    const features = data.features || [];
    
    if (features.length === 0) {
      return { binnenGebied: false, dichtstbijzijnde: null, gebiedenBinnen5km: [] };
    }
    
    // Bereken afstanden en sorteer
    const gebieden: Natura2000Gebied[] = features.map((f: any) => ({
      naam: f.properties.naam || f.properties.NAAM || 'Onbekend',
      code: f.properties.sitecode || f.properties.SITECODE || '',
      afstandMeter: berekenAfstand(lon, lat, f.geometry),
      oppervlakteHa: f.properties.oppervlakte_ha || f.properties.OPPERVLAKTE_HA
    })).sort((a: Natura2000Gebied, b: Natura2000Gebied) => a.afstandMeter - b.afstandMeter);
    
    const binnenGebied = gebieden.some(g => g.afstandMeter === 0);
    
    return {
      binnenGebied,
      dichtstbijzijnde: gebieden[0] || null,
      gebiedenBinnen5km: gebieden.filter(g => g.afstandMeter <= 5000)
    };
  } catch (error) {
    console.error('[PDOK] Natura 2000 check failed:', error);
    return { binnenGebied: false, dichtstbijzijnde: null, gebiedenBinnen5km: [] };
  }
}

/**
 * Check Rijksmonumenten bij een locatie
 */
async function checkMonumenten(lon: number, lat: number): Promise<PDOKAnalyseResultaat['monumenten']> {
  try {
    // Zoek binnen 100m radius voor exacte match, 500m voor omgeving
    const buffer = 500;
    const bbox = createBBox(lon, lat, buffer);
    
    // RCE ps-ch WFS requires EPSG:28992 (RD) coordinates
    const rdBbox = createRDBBox(lon, lat, buffer);
    const url = `${MONUMENTEN_WFS}?service=WFS&version=2.0.0&request=GetFeature&typeName=ps-ch:rce_inspire_points&outputFormat=application/json&bbox=${rdBbox},EPSG:28992&count=50`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      console.error(`[PDOK] Monumenten API error: ${response.status}`);
      return { isRijksmonument: false, monument: null, monumentenInOmgeving: [] };
    }
    
    const data = await response.json();
    const features = data.features || [];
    
    if (features.length === 0) {
      return { isRijksmonument: false, monument: null, monumentenInOmgeving: [] };
    }
    
    // Bereken afstanden — geometry is in RD (EPSG:28992), convert to approximate WGS84 distance
    const monumenten: Monument[] = features.map((f: any) => {
      // Calculate distance using RD coordinates directly (more accurate)
      let afstand = Infinity;
      if (f.geometry?.coordinates) {
        const [mx, my] = f.geometry.coordinates;
        // Convert our WGS84 point to RD for distance calc
        const dLat2 = 0.36 * (lat - 52.15517440);
        const dLon2 = 0.36 * (lon - 5.38720621);
        const px = 155000 + (190094.945 * dLon2) + (-11832.228 * dLat2 * dLon2);
        const py = 463000 + (309056.544 * dLat2) + (3638.893 * dLon2 * dLon2);
        afstand = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      }
      return {
        naam: f.properties.text || f.properties.naam || f.properties.NAAM || 'Onbekend monument',
        rijksmonumentnummer: f.properties.localid || f.properties.rijksmonumentnummer || f.properties.RIJKSMONUMENTNUMMER || '',
        type: 'rijksmonument' as const,
        omschrijving: f.properties.namespace || f.properties.omschrijving || f.properties.OMSCHRIJVING,
        afstandMeter: Math.round(afstand)
      };
    }).sort((a: Monument, b: Monument) => a.afstandMeter - b.afstandMeter);
    
    // Monument op locatie = binnen 25 meter
    const monumentOpLocatie = monumenten.find(m => m.afstandMeter <= 25);
    
    return {
      isRijksmonument: !!monumentOpLocatie,
      monument: monumentOpLocatie || null,
      monumentenInOmgeving: monumenten.filter(m => m.afstandMeter <= 500 && m.afstandMeter > 25)
    };
  } catch (error) {
    console.error('[PDOK] Monumenten check failed:', error);
    return { isRijksmonument: false, monument: null, monumentenInOmgeving: [] };
  }
}

/**
 * Check beschermde stads- en dorpsgezichten
 */
async function checkBeschermdGezicht(lon: number, lat: number): Promise<PDOKAnalyseResultaat['beschermdGezicht']> {
  try {
    const buffer = 100;
    const bbox = createBBox(lon, lat, buffer);
    
    // RCE ps-ch WFS requires EPSG:28992 (RD) coordinates
    const rdBbox = createRDBBox(lon, lat, buffer);
    const url = `${BESCHERMD_GEZICHT_WFS}?service=WFS&version=2.0.0&request=GetFeature&typeName=ps-ch:rce_inspire_polygons&outputFormat=application/json&bbox=${rdBbox},EPSG:28992&count=10`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      console.error(`[PDOK] Beschermd gezicht API error: ${response.status}`);
      return { binnenGebied: false, gezicht: null };
    }
    
    const data = await response.json();
    const features = data.features || [];
    
    if (features.length === 0) {
      return { binnenGebied: false, gezicht: null };
    }
    
    // Check of punt binnen polygoon ligt
    const feature = features[0];
    const gezicht: BeschermdGezicht = {
      naam: feature.properties.text || feature.properties.naam || feature.properties.NAAM || 'Onbekend',
      code: feature.properties.localid || feature.properties.code || feature.properties.CODE || '',
      type: (feature.properties.namespace || feature.properties.type || '').toLowerCase().includes('stads') ? 'stads' : 'dorps',
      binnenGebied: true // Als we een hit hebben binnen 100m bbox, is het waarschijnlijk binnen
    };
    
    return {
      binnenGebied: true,
      gezicht
    };
  } catch (error) {
    console.error('[PDOK] Beschermd gezicht check failed:', error);
    return { binnenGebied: false, gezicht: null };
  }
}

// BAG API endpoints
const BAG_API = "https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2";
const BAG_PDOK = "https://api.pdok.nl/lv/bag/ogc/v1_0";

/**
 * Haal BAG pand en verblijfsobject info op basis van coördinaten
 */
async function getBAGInfo(lon: number, lat: number): Promise<BAGResultaat> {
  try {
    // Gebruik PDOK BAG WFS voor spatial query
    const buffer = 10; // 10 meter radius
    const bbox = createBBox(lon, lat, buffer);
    
    // Haal verblijfsobjecten op
    const vboUrl = `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&typeName=bag:verblijfsobject&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox},EPSG:4326&count=1`;
    
    const vboResponse = await fetchWithRetry(vboUrl);
    if (!vboResponse.ok) {
      console.error(`[PDOK] BAG VBO API error: ${vboResponse.status}`);
      return { pand: null, verblijfsobject: null };
    }
    
    const vboData = await vboResponse.json();
    const vboFeatures = vboData.features || [];
    
    let verblijfsobject: BAGVerblijfsobject | null = null;
    let pandId: string | null = null;
    
    if (vboFeatures.length > 0) {
      const vbo = vboFeatures[0].properties;
      verblijfsobject = {
        identificatie: vbo.identificatie || '',
        oppervlakte: vbo.oppervlakte || 0,
        status: vbo.status || '',
        gebruiksdoel: parseGebruiksdoel(vbo.gebruiksdoel),
        nummeraanduiding: vbo.nummeraanduidingIdentificatie
      };
      pandId = vbo.pandIdentificatie || vbo.pandidentificatie;
    }
    
    // Haal pand info op als we een pandId hebben
    let pand: BAGPand | null = null;
    if (pandId) {
      const pandUrl = `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&typeName=bag:pand&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=identificatie='${pandId}'`;
      const pandResponse = await fetchWithRetry(pandUrl);
      if (pandResponse.ok) {
        const pandData = await pandResponse.json();
        const pandFeature = pandData.features?.[0];
        if (pandFeature) {
          const p = pandFeature.properties;
          pand = {
            identificatie: p.identificatie || pandId,
            bouwjaar: p.bouwjaar || p.oorspronkelijkBouwjaar || 0,
            status: p.status || '',
            oppervlakte: p.oppervlakte
          };
        }
      }
    } else {
      // Geen VBO gevonden, probeer direct pand te vinden
      const pandUrl = `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&typeName=bag:pand&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox},EPSG:4326&count=1`;
      
      const pandResponse = await fetchWithRetry(pandUrl);
      if (pandResponse.ok) {
        const pandData = await pandResponse.json();
        const pandFeatures = pandData.features || [];
        
        if (pandFeatures.length > 0) {
          const p = pandFeatures[0].properties;
          pand = {
            identificatie: p.identificatie || '',
            bouwjaar: p.bouwjaar || p.oorspronkelijkBouwjaar || 0,
            status: p.status || '',
            oppervlakte: p.oppervlakte
          };
        }
      }
    }
    
    return { pand, verblijfsobject };
  } catch (error) {
    console.error('[PDOK] BAG check failed:', error);
    return { pand: null, verblijfsobject: null };
  }
}

/**
 * Parse gebruiksdoel string naar array
 */
function parseGebruiksdoel(gebruiksdoel: any): string[] {
  if (!gebruiksdoel) return [];
  if (Array.isArray(gebruiksdoel)) return gebruiksdoel;
  if (typeof gebruiksdoel === 'string') {
    // Kan comma-separated zijn of JSON array
    try {
      const parsed = JSON.parse(gebruiksdoel);
      return Array.isArray(parsed) ? parsed : [gebruiksdoel];
    } catch {
      return gebruiksdoel.split(',').map(s => s.trim());
    }
  }
  return [];
}

/**
 * Bepaal welke BAG info relevant is voor de activiteiten
 */
export function bepaalRelevantie(activiteiten: string[]): RelevantieContext {
  const actLower = activiteiten.map(a => a.toLowerCase());
  
  // Bouwjaar relevant bij: verbouw, uitbreiding, renovatie, constructief
  const bouwjaarRelevant = actLower.some(a => 
    a.includes('verbouw') || 
    a.includes('uitbreid') || 
    a.includes('renov') ||
    a.includes('construct') ||
    a.includes('draagconstructie') ||
    a.includes('fundering') ||
    a.includes('casco')
  );
  
  // Functie relevant bij: functiewijziging, gebruik, bestemming
  const functieRelevant = actLower.some(a => 
    a.includes('functie') || 
    a.includes('gebruik') ||
    a.includes('bestemming') ||
    a.includes('wonen') ||
    a.includes('kantoor') ||
    a.includes('horeca') ||
    a.includes('detailhandel') ||
    a.includes('bedrijf')
  );
  
  // Oppervlakte relevant bij: uitbreiding, aanbouw, bijgebouw
  const oppervlakteRelevant = actLower.some(a => 
    a.includes('uitbreid') || 
    a.includes('aanbouw') ||
    a.includes('bijgebouw') ||
    a.includes('oppervlak') ||
    a.includes('m2') ||
    a.includes('m²')
  );
  
  return {
    bouwjaarRelevant,
    functieRelevant,
    oppervlakteRelevant,
    activiteiten
  };
}

/**
 * Haal kadastrale perceelinfo op
 */
async function getKadasterInfo(lon: number, lat: number): Promise<KadasterResultaat> {
  try {
    const buffer = 10;
    const bbox = createBBox(lon, lat, buffer);
    
    const url = `${KADASTER_WFS}?service=WFS&version=2.0.0&request=GetFeature&typeName=kadastralekaart:perceel&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox},EPSG:4326&count=5`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      console.error(`[PDOK] Kadaster API error: ${response.status}`);
      return { perceel: null, aantalPercelen: 0 };
    }
    
    const data = await response.json();
    const features = data.features || [];
    
    if (features.length === 0) {
      return { perceel: null, aantalPercelen: 0 };
    }
    
    const f = features[0].properties;
    const perceel: KadastraalPerceel = {
      kadastraleAanduiding: f.kadastraleAanduiding || `${f.kadastraleGemeenteCode || ''} ${f.sectie || ''} ${f.perceelnummer || ''}`.trim(),
      gemeente: f.kadastraleGemeenteCode || f.gemeente || '',
      sectie: f.sectie || '',
      perceelnummer: f.perceelnummer || '',
      oppervlakte: f.kadastraleGrootte || f.oppervlakte || 0
    };
    
    return { perceel, aantalPercelen: features.length };
  } catch (error) {
    console.error('[PDOK] Kadaster check failed:', error);
    return { perceel: null, aantalPercelen: 0 };
  }
}

/**
 * Haal BGT topografie info op (verharding, groen, water)
 */
async function getBGTInfo(lon: number, lat: number): Promise<BGTResultaat> {
  try {
    const buffer = 50; // 50m radius voor context
    const bbox = createBBox(lon, lat, buffer);
    
    // Haal verschillende BGT lagen parallel op via OGC API
    const bboxParam = `${lon - 0.001},${lat - 0.001},${lon + 0.001},${lat + 0.001}`;
    const [wegResponse, waterResponse, begroeidResponse] = await Promise.all([
      fetch(`${BGT_OGC}/collections/wegdeel/items?bbox=${bboxParam}&limit=50&f=json`),
      fetch(`${BGT_OGC}/collections/waterdeel/items?bbox=${bboxParam}&limit=50&f=json`),
      fetch(`${BGT_OGC}/collections/begroeidterreindeel/items?bbox=${bboxParam}&limit=50&f=json`)
    ]);
    
    const wegdelen: BGTObject[] = [];
    const waterdelen: BGTObject[] = [];
    const groenvoorzieningen: BGTObject[] = [];
    const verharding: { type: string; oppervlakte: number }[] = [];
    let totaalVerhard = 0;
    let totaalGroen = 0;
    
    if (wegResponse.ok) {
      const wegData = await wegResponse.json();
      for (const f of (wegData.features || [])) {
        const functie = f.properties.functie || f.properties.bgt_functie || 'onbekend';
        wegdelen.push({ type: 'wegdeel', functie });
        // Tel verharding
        const opp = f.properties.oppervlakte || 100; // schatting
        verharding.push({ type: functie, oppervlakte: opp });
        totaalVerhard += opp;
      }
    }
    
    if (waterResponse.ok) {
      const waterData = await waterResponse.json();
      for (const f of (waterData.features || [])) {
        waterdelen.push({ 
          type: 'waterdeel', 
          functie: f.properties.functie || f.properties.bgt_type || 'water' 
        });
      }
    }
    
    if (begroeidResponse.ok) {
      const groenData = await begroeidResponse.json();
      for (const f of (groenData.features || [])) {
        const opp = f.properties.oppervlakte || 50;
        groenvoorzieningen.push({ 
          type: 'groen', 
          functie: f.properties.fysiekVoorkomen || f.properties.bgt_fysiekvoorkomen || 'groen',
          oppervlakte: opp
        });
        totaalGroen += opp;
      }
    }
    
    return { wegdelen, waterdelen, groenvoorzieningen, verharding, totaalVerhard, totaalGroen };
  } catch (error) {
    console.error('[PDOK] BGT check failed:', error);
    return { wegdelen: [], waterdelen: [], groenvoorzieningen: [], verharding: [], totaalVerhard: 0, totaalGroen: 0 };
  }
}

/**
 * Check grondwaterbeschermingsgebieden
 */
async function getGrondwaterInfo(lon: number, lat: number): Promise<GrondwaterResultaat> {
  try {
    const zones: Grondwaterzone[] = [];
    
    // Use WMS GetFeatureInfo (WFS endpoint is offline/404)
    const layerNames = [
      'grondwaterbeschermingsgebied',
      'waterwingebied',
      'boringsvrije_zone'
    ];
    
    for (const layer of layerNames) {
      try {
        // WMS GetFeatureInfo: create a tiny bbox around the point
        const delta = 0.001; // ~100m
        const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
        const url = `${GRONDWATER_WMS}?service=WMS&version=1.3.0&request=GetFeatureInfo` +
          `&layers=${layer}&query_layers=${layer}` +
          `&info_format=application/json&crs=EPSG:4326` +
          `&bbox=${bbox}&width=256&height=256&i=128&j=128`;
        const response = await fetchWithRetry(url);
        
        if (response.ok) {
          const data = await response.json();
          for (const f of (data.features || [])) {
            const props = f.properties || {};
            zones.push({
              naam: props.naam || props.NAAM || props.label || 'Onbekend',
              type: layer as any,
              provincie: props.provincie || props.PROVINCIE || '',
              beperkingen: props.beperkingen || props.omschrijving || ''
            });
          }
        }
      } catch {
        // Negeer fouten per laag
      }
    }
    
    return {
      binnenBeschermingsgebied: zones.length > 0,
      zones
    };
  } catch (error) {
    console.error('[PDOK] Grondwater check failed:', error);
    return { binnenBeschermingsgebied: false, zones: [] };
  }
}

/**
 * Uitgebreide relevantie check inclusief nieuwe API's
 */
export function bepaalUitgebreideRelevantie(activiteiten: string[]): RelevantieContext & {
  kadasterRelevant: boolean;
  bgtRelevant: boolean;
  grondwaterRelevant: boolean;
} {
  const basis = bepaalRelevantie(activiteiten);
  const actLower = activiteiten.map(a => a.toLowerCase());
  
  // Kadaster relevant bij: nieuwbouw, splitsen, samenvoegen, erfgrens
  const kadasterRelevant = actLower.some(a => 
    a.includes('nieuwbouw') || 
    a.includes('split') ||
    a.includes('samenvoeg') ||
    a.includes('erfgrens') ||
    a.includes('perceel') ||
    a.includes('grond')
  );
  
  // BGT relevant bij: parkeren, verharding, groen, waterberging
  const bgtRelevant = actLower.some(a => 
    a.includes('parkeer') || 
    a.includes('verharding') ||
    a.includes('groen') ||
    a.includes('tuin') ||
    a.includes('waterberg') ||
    a.includes('hemelwater') ||
    a.includes('bestrat')
  );
  
  // Grondwater relevant bij: bodem, fundering, kelder, ondergronds, tank, opslag
  const grondwaterRelevant = actLower.some(a => 
    a.includes('bodem') || 
    a.includes('grondwater') ||
    a.includes('fundering') ||
    a.includes('kelder') ||
    a.includes('ondergronds') ||
    a.includes('tank') ||
    a.includes('opslag') ||
    a.includes('boring') ||
    a.includes('bronbemaling')
  );
  
  return {
    ...basis,
    kadasterRelevant,
    bgtRelevant,
    grondwaterRelevant
  };
}

/**
 * Volledige PDOK analyse voor een locatie
 */
export async function analyseerLocatiePDOK(
  lon: number, 
  lat: number,
  activiteiten?: string[]
): Promise<PDOKAnalyseResultaat> {
  console.log(`[PDOK] Analyseer locatie: ${lat}, ${lon}`);
  
  // Bepaal welke API's nodig zijn
  const relevantie = activiteiten ? bepaalUitgebreideRelevantie(activiteiten) : null;
  const bagNodig = !relevantie || relevantie.bouwjaarRelevant || relevantie.functieRelevant || relevantie.oppervlakteRelevant;
  const kadasterNodig = !relevantie || relevantie.kadasterRelevant;
  const bgtNodig = relevantie?.bgtRelevant;
  const grondwaterNodig = relevantie?.grondwaterRelevant;
  
  // Parallel uitvoeren voor snelheid
  const [natura2000, monumenten, beschermdGezicht, bag, kadaster, bgt, grondwater] = await Promise.all([
    checkNatura2000(lon, lat),
    checkMonumenten(lon, lat),
    checkBeschermdGezicht(lon, lat),
    bagNodig ? getBAGInfo(lon, lat) : Promise.resolve(undefined),
    kadasterNodig ? getKadasterInfo(lon, lat) : Promise.resolve(undefined),
    bgtNodig ? getBGTInfo(lon, lat) : Promise.resolve(undefined),
    grondwaterNodig ? getGrondwaterInfo(lon, lat) : Promise.resolve(undefined)
  ]);
  
  return { bag, kadaster, bgt, grondwater, natura2000, monumenten, beschermdGezicht };
}

/**
 * Format PDOK resultaten voor AI context
 * @param relevantie - optioneel, bepaalt welke BAG info getoond wordt
 */
export function formatPDOKVoorAI(
  resultaat: PDOKAnalyseResultaat, 
  relevantie?: RelevantieContext
): string {
  const lines: string[] = ['## PDOK Gebiedsanalyse'];
  
  // BAG Gebouwinformatie (alleen als relevant)
  if (resultaat.bag && (resultaat.bag.pand || resultaat.bag.verblijfsobject)) {
    const showBouwjaar = !relevantie || relevantie.bouwjaarRelevant;
    const showFunctie = !relevantie || relevantie.functieRelevant;
    const showOppervlakte = !relevantie || relevantie.oppervlakteRelevant;
    
    if (showBouwjaar || showFunctie || showOppervlakte) {
      lines.push('\n### BAG Gebouwinformatie');
      
      if (resultaat.bag.pand) {
        if (showBouwjaar && resultaat.bag.pand.bouwjaar) {
          lines.push(`**Bouwjaar**: ${resultaat.bag.pand.bouwjaar}`);
          // Voeg context toe bij oud gebouw
          if (resultaat.bag.pand.bouwjaar < 1992) {
            lines.push(`  ⚠️ Gebouw van vóór 1992 - mogelijk asbest aanwezig`);
          }
          if (resultaat.bag.pand.bouwjaar < 1975) {
            lines.push(`  ⚠️ Gebouw van vóór 1975 - let op constructieve staat bij verbouw`);
          }
        }
        lines.push(`**Pandstatus**: ${resultaat.bag.pand.status}`);
      }
      
      if (resultaat.bag.verblijfsobject) {
        if (showFunctie && resultaat.bag.verblijfsobject.gebruiksdoel.length > 0) {
          const functies = resultaat.bag.verblijfsobject.gebruiksdoel.join(', ');
          lines.push(`**Huidige functie(s)**: ${functies}`);
        }
        if (showOppervlakte && resultaat.bag.verblijfsobject.oppervlakte) {
          lines.push(`**Gebruiksoppervlakte**: ${resultaat.bag.verblijfsobject.oppervlakte} m²`);
        }
      }
      lines.push('');
    }
  }
  
  // Natura 2000
  lines.push('\n### Natura 2000');
  if (resultaat.natura2000.binnenGebied) {
    lines.push(`⚠️ **LOCATIE LIGT BINNEN NATURA 2000 GEBIED**`);
    lines.push(`Gebied: ${resultaat.natura2000.dichtstbijzijnde?.naam}`);
    lines.push(`Code: ${resultaat.natura2000.dichtstbijzijnde?.code}`);
    lines.push(`\nDit betekent: Stikstofberekening (AERIUS) is VERPLICHT voor bouw- en gebruiksactiviteiten.`);
  } else if (resultaat.natura2000.dichtstbijzijnde) {
    const afstand = resultaat.natura2000.dichtstbijzijnde.afstandMeter;
    if (afstand <= 3000) {
      lines.push(`⚠️ Natura 2000 gebied "${resultaat.natura2000.dichtstbijzijnde.naam}" op ${Math.round(afstand)}m afstand`);
      lines.push(`Bij significante activiteiten kan AERIUS-berekening nodig zijn.`);
    } else {
      lines.push(`Dichtstbijzijnde Natura 2000: ${resultaat.natura2000.dichtstbijzijnde.naam} (${Math.round(afstand)}m)`);
    }
  } else {
    lines.push('Geen Natura 2000 gebieden binnen 5km.');
  }
  
  // Monumenten
  lines.push('\n### Monumentenstatus');
  if (resultaat.monumenten.isRijksmonument && resultaat.monumenten.monument) {
    lines.push(`⚠️ **RIJKSMONUMENT**`);
    lines.push(`Naam: ${resultaat.monumenten.monument.naam}`);
    lines.push(`Nummer: ${resultaat.monumenten.monument.rijksmonumentnummer}`);
    if (resultaat.monumenten.monument.omschrijving) {
      lines.push(`Omschrijving: ${resultaat.monumenten.monument.omschrijving}`);
    }
    lines.push(`\nDit betekent: Monumentenvergunning vereist voor wijzigingen. RCE-advies nodig.`);
  } else if (resultaat.monumenten.monumentenInOmgeving.length > 0) {
    lines.push(`${resultaat.monumenten.monumentenInOmgeving.length} rijksmonument(en) in de omgeving (binnen 500m)`);
    resultaat.monumenten.monumentenInOmgeving.slice(0, 3).forEach(m => {
      lines.push(`- ${m.naam} (${Math.round(m.afstandMeter)}m)`);
    });
  } else {
    lines.push('Geen rijksmonumenten op of nabij de locatie.');
  }
  
  // Beschermd gezicht
  lines.push('\n### Beschermd Stads-/Dorpsgezicht');
  if (resultaat.beschermdGezicht.binnenGebied && resultaat.beschermdGezicht.gezicht) {
    lines.push(`⚠️ **BINNEN BESCHERMD ${resultaat.beschermdGezicht.gezicht.type.toUpperCase()}GEZICHT**`);
    lines.push(`Naam: ${resultaat.beschermdGezicht.gezicht.naam}`);
    lines.push(`\nDit betekent: Aanvullende welstandseisen. Advies monumentencommissie vaak vereist.`);
  } else {
    lines.push('Locatie ligt niet binnen een beschermd stads- of dorpsgezicht.');
  }
  
  // Kadastrale informatie (alleen als relevant)
  if (resultaat.kadaster?.perceel) {
    lines.push('\n### Kadastrale Gegevens');
    lines.push(`**Kadastrale aanduiding**: ${resultaat.kadaster.perceel.kadastraleAanduiding}`);
    if (resultaat.kadaster.perceel.oppervlakte > 0) {
      lines.push(`**Perceeloppervlakte**: ${resultaat.kadaster.perceel.oppervlakte} m²`);
    }
    if (resultaat.kadaster.aantalPercelen > 1) {
      lines.push(`*Let op: ${resultaat.kadaster.aantalPercelen} percelen op deze locatie*`);
    }
    lines.push('');
  }
  
  // BGT Topografie (alleen als relevant)
  if (resultaat.bgt && (resultaat.bgt.totaalVerhard > 0 || resultaat.bgt.totaalGroen > 0)) {
    lines.push('\n### BGT Topografie (omgeving)');
    if (resultaat.bgt.totaalVerhard > 0) {
      lines.push(`**Verharding in omgeving**: ~${Math.round(resultaat.bgt.totaalVerhard)} m²`);
    }
    if (resultaat.bgt.totaalGroen > 0) {
      lines.push(`**Groenvoorziening in omgeving**: ~${Math.round(resultaat.bgt.totaalGroen)} m²`);
    }
    if (resultaat.bgt.waterdelen.length > 0) {
      lines.push(`**Water in omgeving**: ${resultaat.bgt.waterdelen.length} waterdeel(en)`);
    }
    // Bereken verhardingspercentage als context
    const totaal = resultaat.bgt.totaalVerhard + resultaat.bgt.totaalGroen;
    if (totaal > 0) {
      const verhardingsPct = Math.round((resultaat.bgt.totaalVerhard / totaal) * 100);
      if (verhardingsPct > 70) {
        lines.push(`⚠️ Hoog verhardingspercentage (${verhardingsPct}%) - let op waterberging/hemelwaterafvoer`);
      }
    }
    lines.push('');
  }
  
  // Grondwaterbescherming (alleen als relevant)
  if (resultaat.grondwater?.binnenBeschermingsgebied) {
    lines.push('\n### Grondwaterbescherming');
    lines.push(`⚠️ **LOCATIE BINNEN GRONDWATERBESCHERMINGSGEBIED**`);
    for (const zone of resultaat.grondwater.zones) {
      lines.push(`- **${zone.type.replace(/_/g, ' ')}**: ${zone.naam}`);
      if (zone.provincie) {
        lines.push(`  Provincie: ${zone.provincie}`);
      }
    }
    lines.push('');
    lines.push('Dit betekent: Extra restricties voor bodemactiviteiten, opslag gevaarlijke stoffen, en ondergrondse werkzaamheden.');
    lines.push('Mogelijk milieuvergunning of melding vereist.');
    lines.push('');
  }
  
  return lines.join('\n');
}

// Helper functies
function createBBox(lon: number, lat: number, bufferMeters: number): string {
  // Ruwe conversie: 1 graad ≈ 111km op de evenaar, minder op hogere breedtegraden
  const latBuffer = bufferMeters / 111000;
  const lonBuffer = bufferMeters / (111000 * Math.cos(lat * Math.PI / 180));
  
  const minLon = lon - lonBuffer;
  const minLat = lat - latBuffer;
  const maxLon = lon + lonBuffer;
  const maxLat = lat + latBuffer;
  
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/**
 * Create bbox in RD (EPSG:28992) coordinates for WFS services that require RD
 */
function createRDBBox(lon: number, lat: number, bufferMeters: number): string {
  // Approximate WGS84 to RD conversion (Amersfoort)
  // More accurate than simple offset, uses standard Dutch projection approximation
  const dLat = 0.36 * (lat - 52.15517440);
  const dLon = 0.36 * (lon - 5.38720621);
  
  const x = 155000 + (190094.945 * dLon) + (-11832.228 * dLat * dLon) + (-114.221 * dLat * dLat * dLon);
  const y = 463000 + (309056.544 * dLat) + (3638.893 * dLon * dLon) + (73.077 * dLat * dLat * dLat);
  
  return `${x - bufferMeters},${y - bufferMeters},${x + bufferMeters},${y + bufferMeters}`;
}

function berekenAfstand(lon: number, lat: number, geometry: any): number {
  // Vereenvoudigde afstandsberekening - voor polygonen checken we of punt binnen ligt
  if (!geometry || !geometry.coordinates) return Infinity;
  
  if (geometry.type === 'Point') {
    return berekenAfstandPunt(lon, lat, geometry);
  }
  
  // Voor polygonen: check of punt binnen ligt (afstand = 0) of bereken afstand tot rand
  // Vereenvoudigd: als we een hit hebben in de bbox, nemen we aan dat het dichtbij is
  return 0;
}

function berekenAfstandPunt(lon: number, lat: number, geometry: any): number {
  if (!geometry || !geometry.coordinates) return Infinity;
  
  const [pLon, pLat] = geometry.coordinates;
  
  // Haversine formule voor afstand in meters
  const R = 6371000; // Aarde radius in meters
  const dLat = (pLat - lat) * Math.PI / 180;
  const dLon = (pLon - lon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(pLat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}
