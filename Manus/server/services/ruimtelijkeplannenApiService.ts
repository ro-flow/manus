/**
 * Ruimtelijkeplannen.nl Officiële API Service
 * Gebruikt de officiële Informatiehuis Ruimte API voor betrouwbaardere data
 * 
 * API Documentatie: https://developer.omgevingswet.overheid.nl/api-register/api/rp-opvragen/
 * Endpoint: https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 */

import { ENV } from '../_core/env';

// API configuratie
const API_BASE_URL = 'https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4';

// Types voor de API response
export interface RuimtelijkPlan {
  id: string;
  type: string;
  naam: string;
  beleidsmatigVerantwoordelijkeOverheid: {
    type: string;
    code: string;
    naam: string;
  };
  planstatusInfo: {
    planstatus: string;
    datum: string;
  };
  regelStatus?: string;
  regelBinding?: string;
  isHistorisch: boolean;
  isTamPlan: boolean;
  eindeRechtsgeldigheid?: string;
  dossier?: {
    id: string;
    status: string;
  };
  _links: {
    self: { href: string };
  };
}

export interface Planobject {
  id: string;
  type: string;
  naam: string;
  planId: string;
  _links: {
    self: { href: string };
    plan?: { href: string };
    regels?: { href: string };
  };
}

export interface Bestemmingsvlak extends Planobject {
  bestemmingshoofdgroep?: string;
  artikelNummer?: string;
  labelInfo?: {
    tekst: string;
  };
}

export interface Dubbelbestemmingsvlak extends Planobject {
  artikelNummer?: string;
  labelInfo?: {
    tekst: string;
  };
}

export interface Gebiedsaanduidingsvlak extends Planobject {
  gebiedsaanduidinggroep?: string;
  artikelNummer?: string;
}

export interface Bouwvlak extends Planobject {
  artikelNummer?: string;
}

export interface Maatvoering extends Planobject {
  symboolCode?: string;
  maatvoeringInfo?: {
    waarde: string;
    eenheid: string;
    symboolCode: string;
  }[];
}

export interface Bouwaanduiding extends Planobject {
  artikelNummer?: string;
  labelInfo?: {
    tekst: string;
  };
}

export interface Functieaanduiding extends Planobject {
  artikelNummer?: string;
  labelInfo?: {
    tekst: string;
  };
}

export interface PlannenResponse {
  _embedded: {
    plannen: RuimtelijkPlan[];
  };
  _links: {
    self: { href: string };
    next?: { href: string };
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface PlanobjectenResponse<T> {
  _embedded: {
    bestemmingsvlakken?: T[];
    dubbelbestemmingen?: T[];
    gebiedsaanduidingen?: T[];
    bouwvlakken?: T[];
    maatvoeringen?: T[];
    bouwaanduidingen?: T[];
    functieaanduidingen?: T[];
  };
  _links: {
    self: { href: string };
    next?: { href: string };
  };
}

// Resultaat types voor omgevingsplan toets
export interface OmgevingsplanToetsResultaat {
  planNaam: string;
  planId: string;
  planStatus: 'vastgesteld' | 'bruidsschat' | 'ontwerp' | 'onbekend';
  planDatum?: string;
  
  // Hoofdbestemming
  enkelbestemming?: {
    naam: string;
    hoofdgroep: string;
    artikelNummer?: string;
  };
  
  // Dubbelbestemmingen
  dubbelbestemmingen: {
    naam: string;
    type: string;
    artikelNummer?: string;
    adviesInstantie?: string;
    aandachtspunten: string[];
  }[];
  
  // Gebiedsaanduidingen
  gebiedsaanduidingen: {
    naam: string;
    type: string;
    artikelNummer?: string;
  }[];
  
  // Bouwregels uit maatvoering
  bouwregels: {
    maxBouwhoogte?: string;
    maxGoothoogte?: string;
    maxBebouwingspercentage?: string;
    maxInhoud?: string;
    minDakhelling?: string;
    maxDakhelling?: string;
    afstandTotZijerfgrens?: string;
    afstandTotAchtererfgrens?: string;
  };
  
  // Functieaanduidingen
  toegestaanGebruik: string[];
  
  // Bronnen
  bronnen: string[];
}

/**
 * Haal de API key op uit environment
 */
function getApiKey(): string {
  const apiKey = ENV.ruimtelijkeplannenApiKey;
  if (!apiKey) {
    console.warn('RUIMTELIJKEPLANNEN_API_KEY niet geconfigureerd');
    return '';
  }
  return apiKey;
}

/**
 * Maak een GET API request met authenticatie
 */
async function apiGet<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/hal+json'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error(`Ruimtelijkeplannen API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.error('Ruimtelijkeplannen API request failed:', error);
    return null;
  }
}

/**
 * Maak een POST API request met GeoJSON body
 */
async function apiPost<T>(endpoint: string, body: object): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/hal+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      console.error(`Ruimtelijkeplannen API POST error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.error('Ruimtelijkeplannen API POST request failed:', error);
    return null;
  }
}

/**
 * Zoek plannen op basis van WGS84 coördinaten
 */
export async function zoekPlannenOpLocatie(lat: number, lng: number): Promise<RuimtelijkPlan[]> {
  const body = {
    _geo: {
      contains: {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON is [lng, lat]
      }
    }
  };

  const response = await apiPost<PlannenResponse>('/plannen/_zoek', body);
  
  if (!response?._embedded?.plannen) return [];
  
  // Filter op geldende plannen (niet historisch, geen eindeRechtsgeldigheid)
  return response._embedded.plannen.filter(plan => 
    !plan.isHistorisch && 
    !plan.eindeRechtsgeldigheid &&
    (plan.regelStatus === 'geldend' || !plan.regelStatus)
  );
}

/**
 * Zoek bestemmingsvlakken voor een plan op locatie
 */
export async function zoekBestemmingsvlakkenOpLocatie(
  planId: string, 
  lat: number, 
  lng: number
): Promise<Bestemmingsvlak[]> {
  const body = {
    _geo: {
      contains: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  };

  const response = await apiPost<PlanobjectenResponse<Bestemmingsvlak>>(
    `/plannen/${encodeURIComponent(planId)}/bestemmingsvlakken/_zoek`,
    body
  );
  
  return response?._embedded?.bestemmingsvlakken || [];
}

/**
 * Zoek dubbelbestemmingen voor een plan op locatie
 */
export async function zoekDubbelbestemmingOpLocatie(
  planId: string,
  lat: number,
  lng: number
): Promise<Dubbelbestemmingsvlak[]> {
  const body = {
    _geo: {
      contains: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  };

  const response = await apiPost<PlanobjectenResponse<Dubbelbestemmingsvlak>>(
    `/plannen/${encodeURIComponent(planId)}/dubbelbestemmingen/_zoek`,
    body
  );
  
  return response?._embedded?.dubbelbestemmingen || [];
}

/**
 * Zoek gebiedsaanduidingen voor een plan op locatie
 */
export async function zoekGebiedsaanduidingenOpLocatie(
  planId: string,
  lat: number,
  lng: number
): Promise<Gebiedsaanduidingsvlak[]> {
  const body = {
    _geo: {
      contains: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  };

  const response = await apiPost<PlanobjectenResponse<Gebiedsaanduidingsvlak>>(
    `/plannen/${encodeURIComponent(planId)}/gebiedsaanduidingen/_zoek`,
    body
  );
  
  return response?._embedded?.gebiedsaanduidingen || [];
}

/**
 * Zoek bouwvlakken voor een plan op locatie
 */
export async function zoekBouwvlakkenOpLocatie(
  planId: string,
  lat: number,
  lng: number
): Promise<Bouwvlak[]> {
  const body = {
    _geo: {
      contains: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  };

  const response = await apiPost<PlanobjectenResponse<Bouwvlak>>(
    `/plannen/${encodeURIComponent(planId)}/bouwvlakken/_zoek`,
    body
  );
  
  return response?._embedded?.bouwvlakken || [];
}

/**
 * Zoek maatvoeringen voor een plan op locatie
 */
export async function zoekMaatvoeringenOpLocatie(
  planId: string,
  lat: number,
  lng: number
): Promise<Maatvoering[]> {
  const body = {
    _geo: {
      contains: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  };

  const response = await apiPost<PlanobjectenResponse<Maatvoering>>(
    `/plannen/${encodeURIComponent(planId)}/maatvoeringen/_zoek`,
    body
  );
  
  return response?._embedded?.maatvoeringen || [];
}

/**
 * Zoek functieaanduidingen voor een plan op locatie
 */
export async function zoekFunctieaanduidingenOpLocatie(
  planId: string,
  lat: number,
  lng: number
): Promise<Functieaanduiding[]> {
  const body = {
    _geo: {
      contains: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  };

  const response = await apiPost<PlanobjectenResponse<Functieaanduiding>>(
    `/plannen/${encodeURIComponent(planId)}/functieaanduidingen/_zoek`,
    body
  );
  
  return response?._embedded?.functieaanduidingen || [];
}

/**
 * Mapping van dubbelbestemming namen naar adviesinstanties
 */
const DUBBELBESTEMMING_ADVIES: Record<string, { adviesInstantie: string; aandachtspunten: string[] }> = {
  'waarde - archeologie': {
    adviesInstantie: 'Gemeentelijk archeoloog of RCE',
    aandachtspunten: [
      'Archeologisch onderzoek mogelijk vereist',
      'Check vrijstellingsgrenzen in planregels',
      'Bureauonderzoek of quickscan als eerste stap'
    ]
  },
  'waarde - cultuurhistorie': {
    adviesInstantie: 'Monumentencommissie of RCE',
    aandachtspunten: [
      'Cultuurhistorische waarden beschermen',
      'Advies monumentencommissie nodig'
    ]
  },
  'waterstaat - waterkering': {
    adviesInstantie: 'Waterschap (Keur)',
    aandachtspunten: [
      'Watervergunning waterschap vereist',
      'Beschermingszone respecteren'
    ]
  },
  'waterstaat - waterloop': {
    adviesInstantie: 'Waterschap',
    aandachtspunten: [
      'Watervergunning mogelijk vereist',
      'Afstand tot waterloop respecteren'
    ]
  },
  'leiding': {
    adviesInstantie: 'Netbeheerder',
    aandachtspunten: [
      'KLIC-melding verplicht',
      'Veiligheidsafstanden respecteren'
    ]
  }
};

/**
 * Bepaal adviesinstantie en aandachtspunten voor een dubbelbestemming
 */
function getDubbelbestemmingAdvies(naam: string): { adviesInstantie: string; aandachtspunten: string[] } {
  const naamLower = naam.toLowerCase();
  
  for (const [key, value] of Object.entries(DUBBELBESTEMMING_ADVIES)) {
    if (naamLower.includes(key)) {
      return value;
    }
  }
  
  return {
    adviesInstantie: 'Gemeente',
    aandachtspunten: ['Check specifieke regels in planregels']
  };
}

/**
 * Extraheer bouwregels uit maatvoeringen
 */
function extractBouwregels(maatvoeringen: Maatvoering[]): OmgevingsplanToetsResultaat['bouwregels'] {
  const bouwregels: OmgevingsplanToetsResultaat['bouwregels'] = {};
  
  for (const mv of maatvoeringen) {
    if (!mv.maatvoeringInfo) continue;
    
    for (const info of mv.maatvoeringInfo) {
      const code = info.symboolCode?.toLowerCase() || '';
      const waarde = `${info.waarde} ${info.eenheid}`;
      
      if (code.includes('bouwhoogte') || code === 'bh') {
        bouwregels.maxBouwhoogte = waarde;
      } else if (code.includes('goothoogte') || code === 'gh') {
        bouwregels.maxGoothoogte = waarde;
      } else if (code.includes('bebouwingspercentage') || code === 'bp') {
        bouwregels.maxBebouwingspercentage = waarde;
      } else if (code.includes('inhoud')) {
        bouwregels.maxInhoud = waarde;
      } else if (code.includes('dakhelling')) {
        if (code.includes('min')) {
          bouwregels.minDakhelling = waarde;
        } else {
          bouwregels.maxDakhelling = waarde;
        }
      }
    }
  }
  
  return bouwregels;
}

/**
 * Voer een volledige omgevingsplan toets uit voor een locatie
 */
export async function voerOmgevingsplanToetsUit(
  lat: number,
  lng: number
): Promise<OmgevingsplanToetsResultaat | null> {
  console.log(`[RuimtelijkePlannen API] Omgevingsplan toets voor ${lat}, ${lng}`);
  
  // 1. Zoek plannen op locatie
  const plannen = await zoekPlannenOpLocatie(lat, lng);
  
  if (plannen.length === 0) {
    console.log('[RuimtelijkePlannen API] Geen plannen gevonden op locatie');
    return null;
  }
  
  // Filter op bestemmingsplannen (niet structuurvisies etc.)
  const bestemmingsplannen = plannen.filter(p => 
    p.type === 'bestemmingsplan' || 
    p.type === 'omgevingsplan' ||
    p.type === 'omgevingsvergunning' ||
    p.type === 'beheersverordening'
  );
  
  if (bestemmingsplannen.length === 0) {
    console.log('[RuimtelijkePlannen API] Geen bestemmingsplannen gevonden');
    return null;
  }
  
  // Neem het meest recente geldende plan
  const plan = bestemmingsplannen.sort((a, b) => {
    const dateA = new Date(a.planstatusInfo?.datum || '1900-01-01');
    const dateB = new Date(b.planstatusInfo?.datum || '1900-01-01');
    return dateB.getTime() - dateA.getTime();
  })[0];
  
  console.log(`[RuimtelijkePlannen API] Geselecteerd plan: ${plan.naam} (${plan.id})`);
  
  // 2. Haal alle planobjecten op voor dit plan en deze locatie
  const [
    bestemmingsvlakken,
    dubbelbestemmingen,
    gebiedsaanduidingen,
    bouwvlakken,
    maatvoeringen,
    functieaanduidingen
  ] = await Promise.all([
    zoekBestemmingsvlakkenOpLocatie(plan.id, lat, lng),
    zoekDubbelbestemmingOpLocatie(plan.id, lat, lng),
    zoekGebiedsaanduidingenOpLocatie(plan.id, lat, lng),
    zoekBouwvlakkenOpLocatie(plan.id, lat, lng),
    zoekMaatvoeringenOpLocatie(plan.id, lat, lng),
    zoekFunctieaanduidingenOpLocatie(plan.id, lat, lng)
  ]);
  
  console.log(`[RuimtelijkePlannen API] Gevonden: ${bestemmingsvlakken.length} bestemmingen, ${dubbelbestemmingen.length} dubbelbestemmingen`);
  
  // 3. Bouw het resultaat
  const result: OmgevingsplanToetsResultaat = {
    planNaam: plan.naam,
    planId: plan.id,
    planStatus: plan.isTamPlan ? 'bruidsschat' : 
                plan.planstatusInfo?.planstatus === 'vastgesteld' ? 'vastgesteld' : 
                plan.planstatusInfo?.planstatus === 'ontwerp' ? 'ontwerp' : 'onbekend',
    planDatum: plan.planstatusInfo?.datum,
    dubbelbestemmingen: [],
    gebiedsaanduidingen: [],
    bouwregels: {},
    toegestaanGebruik: [],
    bronnen: [`${plan.naam} (${plan.id})`]
  };
  
  // Enkelbestemming (neem de eerste)
  if (bestemmingsvlakken.length > 0) {
    const eb = bestemmingsvlakken[0];
    result.enkelbestemming = {
      naam: eb.naam,
      hoofdgroep: eb.bestemmingshoofdgroep || 'Onbekend',
      artikelNummer: eb.artikelNummer
    };
  }
  
  // Dubbelbestemmingen
  for (const db of dubbelbestemmingen) {
    const advies = getDubbelbestemmingAdvies(db.naam);
    result.dubbelbestemmingen.push({
      naam: db.naam,
      type: db.type,
      artikelNummer: db.artikelNummer,
      adviesInstantie: advies.adviesInstantie,
      aandachtspunten: advies.aandachtspunten
    });
  }
  
  // Gebiedsaanduidingen
  for (const ga of gebiedsaanduidingen) {
    result.gebiedsaanduidingen.push({
      naam: ga.naam,
      type: ga.gebiedsaanduidinggroep || 'Onbekend',
      artikelNummer: ga.artikelNummer
    });
  }
  
  // Bouwregels uit maatvoeringen
  result.bouwregels = extractBouwregels(maatvoeringen);
  
  // Toegestaan gebruik uit functieaanduidingen
  for (const fa of functieaanduidingen) {
    if (fa.naam && !result.toegestaanGebruik.includes(fa.naam)) {
      result.toegestaanGebruik.push(fa.naam);
    }
  }
  
  return result;
}

/**
 * Check of de API beschikbaar is
 */
export async function isApiAvailable(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/plannen?page=1&size=1`, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/hal+json'
      },
      signal: AbortSignal.timeout(5000)
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Zoek plannen voor een gemeente
 */
export async function zoekPlannenVoorGemeente(gemeenteCode: string): Promise<RuimtelijkPlan[]> {
  const response = await apiGet<PlannenResponse>('/plannen', {
    'beleidsmatigVerantwoordelijkeOverheid.code': gemeenteCode,
    'regelStatus': 'geldend'
  });

  if (!response?._embedded?.plannen) return [];
  
  return response._embedded.plannen.filter(plan => 
    !plan.isHistorisch && 
    !plan.eindeRechtsgeldigheid
  );
}

/**
 * Haal een specifiek plan op
 */
export async function haalPlan(planId: string): Promise<RuimtelijkPlan | null> {
  return await apiGet<RuimtelijkPlan>(`/plannen/${encodeURIComponent(planId)}`);
}

/**
 * Haal bestemmingsvlakken op voor een plan
 */
export async function haalBestemmingsvlakken(planId: string): Promise<Bestemmingsvlak[]> {
  const response = await apiGet<PlanobjectenResponse<Bestemmingsvlak>>(
    `/plannen/${encodeURIComponent(planId)}/bestemmingsvlakken`
  );
  
  return response?._embedded?.bestemmingsvlakken || [];
}

/**
 * Haal dubbelbestemmingen op voor een plan
 */
export async function haalDubbelbestemmingen(planId: string): Promise<Dubbelbestemmingsvlak[]> {
  const response = await apiGet<PlanobjectenResponse<Dubbelbestemmingsvlak>>(
    `/plannen/${encodeURIComponent(planId)}/dubbelbestemmingen`
  );
  
  return response?._embedded?.dubbelbestemmingen || [];
}

/**
 * Haal gebiedsaanduidingen op voor een plan
 */
export async function haalGebiedsaanduidingen(planId: string): Promise<Gebiedsaanduidingsvlak[]> {
  const response = await apiGet<PlanobjectenResponse<Gebiedsaanduidingsvlak>>(
    `/plannen/${encodeURIComponent(planId)}/gebiedsaanduidingen`
  );
  
  return response?._embedded?.gebiedsaanduidingen || [];
}

/**
 * Haal planregels op voor een planobject
 */
export async function haalPlanregels(planId: string, artikelNummer?: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `${API_BASE_URL}/plannen/${encodeURIComponent(planId)}/regels`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/xhtml+xml'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) return null;

    const xhtml = await response.text();
    
    if (artikelNummer) {
      const artikelRegex = new RegExp(`<artikel[^>]*nummer="${artikelNummer}"[^>]*>([\\s\\S]*?)</artikel>`, 'i');
      const match = xhtml.match(artikelRegex);
      if (match) return match[1];
    }
    
    return xhtml;
  } catch (error) {
    console.error('Fout bij ophalen planregels:', error);
    return null;
  }
}

/**
 * Zoek specifieke regels voor een bestemming (bijv. archeologie vrijstellingsgrenzen)
 */
export async function zoekVrijstellingsregels(
  planId: string, 
  bestemmingNaam: string
): Promise<{
  diepteVrijstelling?: number;
  oppervlakteVrijstelling?: number;
  regelTekst?: string;
} | null> {
  const regels = await haalPlanregels(planId);
  if (!regels) return null;

  const result: {
    diepteVrijstelling?: number;
    oppervlakteVrijstelling?: number;
    regelTekst?: string;
  } = {};

  // Zoek naar vrijstellingsregels in de tekst
  const dieptePatterns = [
    /(\d+)\s*(?:cm|centimeter)/gi,
    /(\d+[,.]?\d*)\s*(?:m|meter)\s*(?:diep|diepte)/gi,
    /diep(?:te|er)?\s*(?:van|tot)?\s*(\d+[,.]?\d*)\s*(?:m|meter|cm)/gi
  ];
  
  for (const pattern of dieptePatterns) {
    const match = regels.match(pattern);
    if (match) {
      const numMatch = match[0].match(/(\d+[,.]?\d*)/);
      if (numMatch) {
        let value = parseFloat(numMatch[1].replace(',', '.'));
        if (match[0].toLowerCase().includes('meter') || match[0].includes(' m')) {
          value = value * 100;
        }
        result.diepteVrijstelling = value;
        break;
      }
    }
  }

  const oppervlaktePatterns = [
    /(\d+)\s*(?:m²|m2|vierkante meter)/gi,
    /oppervlak(?:te)?\s*(?:van|tot|groter dan)?\s*(\d+)\s*(?:m²|m2)/gi
  ];
  
  for (const pattern of oppervlaktePatterns) {
    const match = regels.match(pattern);
    if (match) {
      const numMatch = match[0].match(/(\d+)/);
      if (numMatch) {
        result.oppervlakteVrijstelling = parseInt(numMatch[1]);
        break;
      }
    }
  }

  if (bestemmingNaam.toLowerCase().includes('archeologie')) {
    const archeologieMatch = regels.match(/(?:waarde|dubbelbestemming)[^<]*archeologie[^<]*(?:<[^>]*>)*([^<]+)/gi);
    if (archeologieMatch) {
      result.regelTekst = archeologieMatch.slice(0, 3).join(' ').substring(0, 500);
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Haal omgevingsplan regels op voor een gemeente en extract vrijstellingsgrenzen
 */
export async function haalOmgevingsplanVrijstellingen(gemeenteCode: string): Promise<{
  archeologieVrijstelling?: {
    diepte: number;
    oppervlakte: number;
    bron: string;
  };
  bodemVrijstellingsgebieden?: string[];
} | null> {
  const plannen = await zoekPlannenVoorGemeente(gemeenteCode);
  
  const relevantePlannen = plannen.filter(plan => 
    plan.type === 'omgevingsplan' || 
    plan.naam.toLowerCase().includes('omgevingsplan') ||
    plan.naam.toLowerCase().includes('bestemmingsplan')
  );

  if (relevantePlannen.length === 0) return null;

  for (const plan of relevantePlannen.slice(0, 3)) {
    const vrijstellingen = await zoekVrijstellingsregels(plan.id, 'archeologie');
    
    if (vrijstellingen?.diepteVrijstelling || vrijstellingen?.oppervlakteVrijstelling) {
      return {
        archeologieVrijstelling: {
          diepte: vrijstellingen.diepteVrijstelling || 30,
          oppervlakte: vrijstellingen.oppervlakteVrijstelling || 100,
          bron: `${plan.naam} (${plan.id})`
        }
      };
    }
  }

  return null;
}
