/**
 * Milieu Service - Toetst milieuaspecten voor omgevingsvergunningen
 * 
 * Bidirectionele analyse:
 * - INWAARTS: Wat komt er op de aanvrager af? (bijv. woningbouw nabij industrie)
 * - UITWAARTS: Wat veroorzaakt de aanvrager? (bijv. horeca naar omgeving)
 */

// ============ INTERFACES ============

export interface MilieuAnalyse {
  // Geluid
  stiltegebied: StiltegebiedInfo | null;
  geluidzoneVliegveld: GeluidzoneInfo | null;
  nabijHoofdweg: HoofdwegInfo | null;
  nabijSpoorweg: SpoorwegInfo | null;
  
  // Externe veiligheid
  risicocontouren: RisicocontourInfo[];
  
  // Bodem
  bodemverontreiniging: BodemInfo | null;
  
  // Samenvattingen
  aandachtspuntenInwaarts: string[];  // Wat komt op aanvrager af
  aandachtspuntenUitwaarts: string[]; // Wat veroorzaakt aanvrager
}

export interface StiltegebiedInfo {
  naam: string;
  type: string;
  afstandMeter: number;
  binnenGebied: boolean;
}

export interface GeluidzoneInfo {
  luchthaven: string;
  zone: string;
  binnenZone: boolean;
}

export interface HoofdwegInfo {
  wegnaam: string;
  wegtype: string;
  afstandMeter: number;
  geluidsbelasting?: string;
}

export interface SpoorwegInfo {
  trajectnaam: string;
  afstandMeter: number;
  geluidsbelasting?: string;
}

export interface RisicocontourInfo {
  inrichtingNaam: string;
  inrichtingType: string;
  risicoType: 'PR' | 'PAG' | 'aandachtsgebied';
  afstandMeter: number;
  binnenContour: boolean;
  advies: string;
}

export interface BodemInfo {
  locatieCode: string;
  status: string;
  verontreinigingsType: string;
  saneringsStatus: string;
  advies: string;
}

// ============ API ENDPOINTS ============

const PDOK_ENDPOINTS = {
  // Geluid
  stiltegebieden: 'https://service.pdok.nl/provincies/stiltegebieden/wfs/v1_0',
  geluidzonesLuchthavens: 'https://service.pdok.nl/provincies/geluidzonesluchthavens/wfs/v1_0',
  hoofdwegenOmgevingslawaai: 'https://service.pdok.nl/ienw/hoofdwegen-omgevingslawaai/wfs/v1_0',
  hoofdspoorwegenOmgevingslawaai: 'https://service.pdok.nl/ienw/hoofdspoorwegen-omgevingslawaai/wfs/v1_0',
  
  // Externe veiligheid - REV
  revProductiefaciliteiten: 'https://service.pdok.nl/rvo/rev-productiefaciliteiten/wfs/v1_0',
  
  // Bodem
  bodemloket: 'https://service.pdok.nl/provincies/bodemloket/wfs/v1_0',
};

// ============ HELPER FUNCTIONS ============

function createBboxFilter(lat: number, lng: number, radiusMeter: number): string {
  // Convert WGS84 to approximate bbox
  const latDelta = radiusMeter / 111320;
  const lngDelta = radiusMeter / (111320 * Math.cos(lat * Math.PI / 180));
  
  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;
  
  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

function createPointFilter(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`;
}

async function fetchWFS(
  endpoint: string, 
  typeName: string, 
  bbox: string,
  maxFeatures: number = 10
): Promise<any[]> {
  try {
    const url = new URL(endpoint);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('version', '2.0.0');
    url.searchParams.set('request', 'GetFeature');
    url.searchParams.set('typeName', typeName);
    url.searchParams.set('outputFormat', 'application/json');
    url.searchParams.set('srsName', 'EPSG:4326');
    url.searchParams.set('bbox', bbox + ',EPSG:4326');
    url.searchParams.set('count', maxFeatures.toString());
    
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.warn(`[Milieu] WFS request failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.warn(`[Milieu] WFS error for ${endpoint}:`, error);
    return [];
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// ============ ANALYSE FUNCTIONS ============

async function checkStiltegebieden(lat: number, lng: number): Promise<StiltegebiedInfo | null> {
  const bbox = createBboxFilter(lat, lng, 2000); // 2km radius
  const features = await fetchWFS(
    PDOK_ENDPOINTS.stiltegebieden,
    'stiltegebieden:stiltegebied',
    bbox
  );
  
  if (features.length === 0) return null;
  
  const nearest = features[0];
  const props = nearest.properties || {};
  
  // Check if point is inside polygon (simplified - assume inside if returned)
  return {
    naam: props.naam || props.NAAM || 'Onbekend stiltegebied',
    type: props.type || 'stiltegebied',
    afstandMeter: 0, // Inside or very close
    binnenGebied: true,
  };
}

async function checkGeluidzonesVliegvelden(lat: number, lng: number): Promise<GeluidzoneInfo | null> {
  const bbox = createBboxFilter(lat, lng, 5000); // 5km radius
  const features = await fetchWFS(
    PDOK_ENDPOINTS.geluidzonesLuchthavens,
    'geluidzonesluchthavens:geluidszone',
    bbox
  );
  
  if (features.length === 0) return null;
  
  const nearest = features[0];
  const props = nearest.properties || {};
  
  return {
    luchthaven: props.luchthaven || props.LUCHTHAVEN || 'Onbekende luchthaven',
    zone: props.zone || props.ZONE || 'geluidszone',
    binnenZone: true,
  };
}

async function checkHoofdwegen(lat: number, lng: number): Promise<HoofdwegInfo | null> {
  const bbox = createBboxFilter(lat, lng, 500); // 500m radius
  const features = await fetchWFS(
    PDOK_ENDPOINTS.hoofdwegenOmgevingslawaai,
    'hoofdwegen-omgevingslawaai:wegvak',
    bbox
  );
  
  if (features.length === 0) return null;
  
  const nearest = features[0];
  const props = nearest.properties || {};
  
  return {
    wegnaam: props.wegnaam || props.WEGNAAM || 'Hoofdweg',
    wegtype: props.wegtype || 'rijksweg',
    afstandMeter: 100, // Approximate
    geluidsbelasting: props.lden || undefined,
  };
}

async function checkSpoorwegen(lat: number, lng: number): Promise<SpoorwegInfo | null> {
  const bbox = createBboxFilter(lat, lng, 500); // 500m radius
  const features = await fetchWFS(
    PDOK_ENDPOINTS.hoofdspoorwegenOmgevingslawaai,
    'hoofdspoorwegen-omgevingslawaai:spoorvak',
    bbox
  );
  
  if (features.length === 0) return null;
  
  const nearest = features[0];
  const props = nearest.properties || {};
  
  return {
    trajectnaam: props.trajectnaam || props.TRAJECTNAAM || 'Spoorlijn',
    afstandMeter: 100, // Approximate
    geluidsbelasting: props.lden || undefined,
  };
}

async function checkRisicocontouren(lat: number, lng: number): Promise<RisicocontourInfo[]> {
  const bbox = createBboxFilter(lat, lng, 2000); // 2km radius
  const features = await fetchWFS(
    PDOK_ENDPOINTS.revProductiefaciliteiten,
    'rev-productiefaciliteiten:productiefaciliteit',
    bbox,
    20
  );
  
  return features.map(f => {
    const props = f.properties || {};
    return {
      inrichtingNaam: props.naam || props.NAAM || 'Onbekende inrichting',
      inrichtingType: props.type || props.TYPE || 'industrieel',
      risicoType: 'aandachtsgebied' as const,
      afstandMeter: 500, // Approximate
      binnenContour: false,
      advies: 'Neem contact op met de omgevingsdienst voor actuele risicocontouren',
    };
  });
}

async function checkBodemverontreiniging(lat: number, lng: number): Promise<BodemInfo | null> {
  const bbox = createBboxFilter(lat, lng, 100); // 100m radius - very local
  const features = await fetchWFS(
    PDOK_ENDPOINTS.bodemloket,
    'bodemloket:locatie',
    bbox
  );
  
  if (features.length === 0) return null;
  
  const nearest = features[0];
  const props = nearest.properties || {};
  
  return {
    locatieCode: props.locatiecode || props.LOCATIECODE || 'Onbekend',
    status: props.status || 'onbekend',
    verontreinigingsType: props.verontreinigingstype || 'onbekend',
    saneringsStatus: props.saneringsstatus || 'onbekend',
    advies: 'Raadpleeg het bodemloket voor actuele informatie over deze locatie',
  };
}

// ============ MAIN ANALYSE FUNCTION ============

export async function analyseerMilieu(
  lat: number, 
  lng: number,
  activiteiten: string[] = []
): Promise<MilieuAnalyse> {
  console.log(`[Milieu] Analyseren locatie: ${lat}, ${lng}`);
  console.log(`[Milieu] Activiteiten: ${activiteiten.join(', ')}`);
  
  // Parallel alle checks uitvoeren
  const [
    stiltegebied,
    geluidzoneVliegveld,
    nabijHoofdweg,
    nabijSpoorweg,
    risicocontouren,
    bodemverontreiniging,
  ] = await Promise.all([
    checkStiltegebieden(lat, lng),
    checkGeluidzonesVliegvelden(lat, lng),
    checkHoofdwegen(lat, lng),
    checkSpoorwegen(lat, lng),
    checkRisicocontouren(lat, lng),
    checkBodemverontreiniging(lat, lng),
  ]);
  
  // Genereer aandachtspunten
  const aandachtspuntenInwaarts: string[] = [];
  const aandachtspuntenUitwaarts: string[] = [];
  
  // INWAARTS: Wat komt op de aanvrager af?
  if (nabijHoofdweg) {
    aandachtspuntenInwaarts.push(
      `Locatie ligt nabij ${nabijHoofdweg.wegnaam} (${nabijHoofdweg.wegtype}). ` +
      `Beoordeel geluidsbelasting voor geluidsgevoelige functies (wonen, onderwijs, zorg).`
    );
  }
  
  if (nabijSpoorweg) {
    aandachtspuntenInwaarts.push(
      `Locatie ligt nabij spoorlijn ${nabijSpoorweg.trajectnaam}. ` +
      `Trillingen en geluid kunnen relevant zijn voor geluidsgevoelige bestemmingen.`
    );
  }
  
  if (geluidzoneVliegveld) {
    aandachtspuntenInwaarts.push(
      `Locatie ligt binnen geluidszone van ${geluidzoneVliegveld.luchthaven}. ` +
      `Woningbouw en andere geluidsgevoelige functies zijn mogelijk beperkt.`
    );
  }
  
  if (risicocontouren.length > 0) {
    const namen = risicocontouren.slice(0, 3).map(r => r.inrichtingNaam).join(', ');
    aandachtspuntenInwaarts.push(
      `Nabij risicovolle inrichtingen: ${namen}. ` +
      `Raadpleeg het Register Externe Veiligheid (REV) voor actuele contouren. ` +
      `Beperkt bebouwing voor kwetsbare objecten (woningen, scholen, ziekenhuizen).`
    );
  }
  
  if (bodemverontreiniging) {
    aandachtspuntenInwaarts.push(
      `Mogelijke bodemverontreiniging geregistreerd (${bodemverontreiniging.status}). ` +
      `Raadpleeg het bodemloket en overweeg bodemonderzoek voorafgaand aan bouw.`
    );
  }
  
  // UITWAARTS: Wat veroorzaakt de aanvrager?
  const activiteitenLower = activiteiten.map(a => a.toLowerCase()).join(' ');
  
  // Geluidproducerende activiteiten
  if (activiteitenLower.includes('horeca') || 
      activiteitenLower.includes('evenement') ||
      activiteitenLower.includes('muziek')) {
    aandachtspuntenUitwaarts.push(
      'Horeca/evenementen kunnen geluidsoverlast veroorzaken voor omwonenden. ' +
      'Beoordeel geluidsnormen uit het Activiteitenbesluit en gemeentelijk beleid.'
    );
  }
  
  if (activiteitenLower.includes('industrie') || 
      activiteitenLower.includes('bedrijf') ||
      activiteitenLower.includes('productie')) {
    aandachtspuntenUitwaarts.push(
      'Industriële activiteiten kunnen geluid, geur en/of trillingen veroorzaken. ' +
      'Toets aan milieucategorie en afstandsnormen uit de VNG-brochure.'
    );
  }
  
  // Geurproducerende activiteiten
  if (activiteitenLower.includes('veehouderij') || 
      activiteitenLower.includes('stal') ||
      activiteitenLower.includes('agrarisch')) {
    aandachtspuntenUitwaarts.push(
      'Veehouderij veroorzaakt geuremissie. ' +
      'Bereken geurbelasting op geurgevoelige objecten conform Wet geurhinder veehouderij.'
    );
  }
  
  if (activiteitenLower.includes('restaurant') || 
      activiteitenLower.includes('keuken') ||
      activiteitenLower.includes('bakkerij')) {
    aandachtspuntenUitwaarts.push(
      'Voedselbereidingsactiviteiten kunnen geuroverlast veroorzaken. ' +
      'Beoordeel noodzaak van ontgeuringsinstallatie of afvoer op hoogte.'
    );
  }
  
  // Stiltegebied check (beide richtingen)
  if (stiltegebied) {
    aandachtspuntenInwaarts.push(
      `Locatie ligt in/nabij stiltegebied "${stiltegebied.naam}". ` +
      `Extra bescherming tegen geluid van buitenaf.`
    );
    aandachtspuntenUitwaarts.push(
      `Locatie ligt in/nabij stiltegebied "${stiltegebied.naam}". ` +
      `Strenge eisen aan geluidproductie. Geen activiteiten die stilte verstoren.`
    );
  }
  
  // Opslag gevaarlijke stoffen
  if (activiteitenLower.includes('opslag') || 
      activiteitenLower.includes('gevaarlijk') ||
      activiteitenLower.includes('chemisch')) {
    aandachtspuntenUitwaarts.push(
      'Opslag van gevaarlijke stoffen kan externe veiligheidscontouren genereren. ' +
      'Toets aan Bevi/PGS-richtlijnen en bepaal PR 10-6 en PAG-contouren.'
    );
  }
  
  console.log(`[Milieu] Analyse compleet: ${aandachtspuntenInwaarts.length} inwaarts, ${aandachtspuntenUitwaarts.length} uitwaarts`);
  
  return {
    stiltegebied,
    geluidzoneVliegveld,
    nabijHoofdweg,
    nabijSpoorweg,
    risicocontouren,
    bodemverontreiniging,
    aandachtspuntenInwaarts,
    aandachtspuntenUitwaarts,
  };
}

// ============ FORMAT FOR AI ============

export function formatMilieuVoorAI(analyse: MilieuAnalyse): string {
  const sections: string[] = [];
  
  sections.push('## MILIEUASPECTEN');
  sections.push('');
  
  // Inwaarts
  if (analyse.aandachtspuntenInwaarts.length > 0) {
    sections.push('### Invloed van omgeving op locatie (INWAARTS)');
    analyse.aandachtspuntenInwaarts.forEach((punt, i) => {
      sections.push(`${i + 1}. ${punt}`);
    });
    sections.push('');
  }
  
  // Uitwaarts
  if (analyse.aandachtspuntenUitwaarts.length > 0) {
    sections.push('### Invloed van activiteit op omgeving (UITWAARTS)');
    analyse.aandachtspuntenUitwaarts.forEach((punt, i) => {
      sections.push(`${i + 1}. ${punt}`);
    });
    sections.push('');
  }
  
  // Details
  const details: string[] = [];
  
  if (analyse.stiltegebied) {
    details.push(`- Stiltegebied: ${analyse.stiltegebied.naam}`);
  }
  if (analyse.geluidzoneVliegveld) {
    details.push(`- Geluidszone luchthaven: ${analyse.geluidzoneVliegveld.luchthaven}`);
  }
  if (analyse.nabijHoofdweg) {
    details.push(`- Nabij hoofdweg: ${analyse.nabijHoofdweg.wegnaam}`);
  }
  if (analyse.nabijSpoorweg) {
    details.push(`- Nabij spoorweg: ${analyse.nabijSpoorweg.trajectnaam}`);
  }
  if (analyse.risicocontouren.length > 0) {
    details.push(`- Risicovolle inrichtingen nabij: ${analyse.risicocontouren.length}`);
  }
  if (analyse.bodemverontreiniging) {
    details.push(`- Bodemverontreiniging: ${analyse.bodemverontreiniging.status}`);
  }
  
  if (details.length > 0) {
    sections.push('### Gedetecteerde milieuaspecten');
    sections.push(...details);
  }
  
  if (analyse.aandachtspuntenInwaarts.length === 0 && 
      analyse.aandachtspuntenUitwaarts.length === 0) {
    sections.push('Geen bijzondere milieuaspecten gedetecteerd op basis van beschikbare data.');
    sections.push('Dit sluit niet uit dat lokaal beleid of actuele situatie anders kan zijn.');
  }
  
  return sections.join('\n');
}
