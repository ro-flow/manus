/**
 * Ruimtelijkeplannen.nl API Service — Enhanced
 * Queries ALL plan types: bestemmingsplannen, parapluplannen, voorbereidingsbesluiten,
 * beheersverordeningen, structuurvisies, inpassingsplannen, wijzigingsplannen, uitwerkingsplannen.
 * Also queries: bouwvlak, functieaanduiding, maatvoering.
 * 
 * API: PDOK WFS v5_0 — https://api.pdok.nl/kadaster/ruimtelijkeplannen/wfs/v5_0
 */

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
      console.log(`[RP] Retry ${attempt + 1}/${maxRetries} for ${url.substring(0, 80)}... (waiting ${Math.round(delay)}ms)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

// ============ TYPES ============

export type DubbelbestemmingType = 
  | 'waarde_archeologie'
  | 'waarde_cultuurhistorie'
  | 'waterstaat_waterkering'
  | 'waterstaat_waterloop'
  | 'leiding_gas'
  | 'leiding_hoogspanning'
  | 'leiding_riool'
  | 'leiding_water'
  | 'veiligheidszone'
  | 'geluidszone'
  | 'milieuzone'
  | 'overig';

export interface Dubbelbestemming {
  type: DubbelbestemmingType;
  naam: string;
  planNaam: string;
  planId: string;
  regelUrl?: string;
  adviesInstantie: string;
  aandachtspunten: string[];
}

export interface Enkelbestemming {
  naam: string;
  hoofdgroep: string;
  planNaam: string;
  planId: string;
  regelUrl?: string;
}

export interface Gebiedsaanduiding {
  naam: string;
  type: string;
  planNaam: string;
  planId: string;
}

export interface Bouwvlak {
  planNaam: string;
  planId: string;
  naam?: string;
}

export interface Functieaanduiding {
  naam: string;
  planNaam: string;
  planId: string;
}

export interface Maatvoering {
  naam: string;
  waarde?: string;
  eenheid?: string;
  planNaam: string;
  planId: string;
  maatvoeringType?: string;
}

export interface RuimtelijkPlan {
  naam: string;
  id: string;
  type: string;       // bestemmingsplan, parapluplan, voorbereidingsbesluit, beheersverordening, etc.
  typePlanCategorie: string; // bestemmingsplan, structuurvisie, besluit, etc.
  status: string;      // vastgesteld, onherroepelijk, ontwerp, etc.
  datum?: string;
  isParapluplan: boolean;
  isVoorbereidingsbesluit: boolean;
  isBeheersverordening: boolean;
  isOmgevingsplan: boolean;
}

export interface OnderzoeksVereiste {
  type: string;
  naam: string;
  verplicht: boolean;
  toelichting: string;
  trigger?: string;
}

export interface RuimtelijkePlannenResultaat {
  enkelbestemmingen: Enkelbestemming[];
  dubbelbestemmingen: Dubbelbestemming[];
  gebiedsaanduidingen: Gebiedsaanduiding[];
  bouwvlakken: Bouwvlak[];
  functieaanduidingen: Functieaanduiding[];
  maatvoeringen: Maatvoering[];
  plannen: RuimtelijkPlan[];
  // Categorized plans
  bestemmingsplannen: RuimtelijkPlan[];
  parapluplannen: RuimtelijkPlan[];
  voorbereidingsbesluiten: RuimtelijkPlan[];
  beheersverordeningen: RuimtelijkPlan[];
  structuurvisies: RuimtelijkPlan[];
  overigePlannen: RuimtelijkPlan[];
  // Flags
  heeftArcheologie: boolean;
  heeftWaterkering: boolean;
  heeftLeiding: boolean;
  heeftVeiligheidszone: boolean;
  heeftGeluidszone: boolean;
  heeftMilieuzone: boolean;
  heeftBouwvlak: boolean;
  heeftParapluplan: boolean;
  heeftVoorbereidingsbesluit: boolean;
  adviesInstanties: string[];
  onderzoeksVereisten: OnderzoeksVereiste[];
  klicMeldingVereist: boolean;
  aeriusVereist: boolean;
  aeriusToelichting?: string;
}

// ============ WFS CONFIG ============

const WFS_BASE_URL = 'https://api.pdok.nl/kadaster/ruimtelijkeplannen/wfs/v5_0';

// ============ DUBBELBESTEMMING MAPPING ============

interface OnderzoekInfo {
  type: string;
  verplicht: boolean;
  toelichting: string;
  trigger?: string;
}

const DUBBELBESTEMMING_MAPPING: Record<string, { 
  type: DubbelbestemmingType; 
  adviesInstantie: string;
  aandachtspunten: string[];
  onderzoek?: OnderzoekInfo;
}> = {
  'waarde - archeologie': {
    type: 'waarde_archeologie',
    adviesInstantie: 'Gemeentelijk archeoloog of RCE',
    aandachtspunten: [
      'Archeologisch onderzoek mogelijk vereist',
      'Check vrijstellingsgrenzen in planregels (vaak >30cm en >100m²)',
      'Quickscan of bureauonderzoek als eerste stap'
    ],
    onderzoek: {
      type: 'Archeologisch onderzoek',
      verplicht: true,
      toelichting: 'Bureauonderzoek, eventueel gevolgd door booronderzoek of proefsleuven',
      trigger: 'Bodemingreep >30cm en/of >100m² (check gemeentelijke vrijstellingsgrenzen)'
    }
  },
  'waarde - cultuurhistorie': {
    type: 'waarde_cultuurhistorie',
    adviesInstantie: 'Monumentencommissie of RCE',
    aandachtspunten: [
      'Cultuurhistorische waarden beschermen',
      'Mogelijk advies monumentencommissie nodig',
      'Let op karakteristieke elementen'
    ],
    onderzoek: {
      type: 'Cultuurhistorisch onderzoek',
      verplicht: false,
      toelichting: 'Bouwhistorisch onderzoek of waardestelling bij ingrijpende wijzigingen',
      trigger: 'Wijziging aan karakteristieke elementen'
    }
  },
  'waterstaat - waterkering': {
    type: 'waterstaat_waterkering',
    adviesInstantie: 'Waterschap (Keur)',
    aandachtspunten: [
      'Watervergunning waterschap vereist',
      'Geen activiteiten die waterkering verzwakken',
      'Beschermingszone respecteren'
    ],
    onderzoek: {
      type: 'Watervergunning',
      verplicht: true,
      toelichting: 'Watervergunning aanvragen bij waterschap voor activiteiten in/nabij waterkering',
      trigger: 'Bouwen binnen kernzone of beschermingszone waterkering'
    }
  },
  'waterstaat - waterloop': {
    type: 'waterstaat_waterloop',
    adviesInstantie: 'Waterschap',
    aandachtspunten: [
      'Watervergunning mogelijk vereist',
      'Afstand tot waterloop respecteren',
      'Geen belemmering waterafvoer'
    ]
  },
  'leiding - gas': {
    type: 'leiding_gas',
    adviesInstantie: 'Netbeheerder (Gasunie/Liander)',
    aandachtspunten: [
      'KLIC-melding verplicht',
      'Veiligheidsafstanden respecteren',
      'Geen bebouwing in beschermingszone'
    ]
  },
  'leiding - hoogspanning': {
    type: 'leiding_hoogspanning',
    adviesInstantie: 'Netbeheerder (TenneT/Liander)',
    aandachtspunten: [
      'Magneetveldzone respecteren',
      'Geen gevoelige bestemmingen (scholen, woningen) in zone',
      'Advies netbeheerder vereist'
    ]
  },
  'leiding - riool': {
    type: 'leiding_riool',
    adviesInstantie: 'Gemeente (riolering)',
    aandachtspunten: [
      'KLIC-melding verplicht',
      'Beschermingszone respecteren',
      'Afstemming met gemeentelijke rioleringsplan'
    ]
  },
  'leiding - water': {
    type: 'leiding_water',
    adviesInstantie: 'Waterleidingbedrijf',
    aandachtspunten: [
      'KLIC-melding verplicht',
      'Beschermingszone respecteren'
    ]
  },
  'veiligheidszone': {
    type: 'veiligheidszone',
    adviesInstantie: 'Veiligheidsregio / Omgevingsdienst',
    aandachtspunten: [
      'Externe veiligheid beoordelen',
      'Mogelijk QRA (kwantitatieve risicoanalyse) nodig',
      'Geen kwetsbare objecten in zone'
    ],
    onderzoek: {
      type: 'Risicoanalyse externe veiligheid',
      verplicht: true,
      toelichting: 'QRA (kwantitatieve risicoanalyse) of verantwoording groepsrisico',
      trigger: 'Kwetsbaar object (woning, school, ziekenhuis) in veiligheidszone'
    }
  },
  'geluidszone': {
    type: 'geluidszone',
    adviesInstantie: 'Omgevingsdienst',
    aandachtspunten: [
      'Akoestisch onderzoek vereist',
      'Geluidsgevoelige functies beperkt',
      'Mogelijk dove gevel of hogere waarde nodig'
    ],
    onderzoek: {
      type: 'Akoestisch onderzoek',
      verplicht: true,
      toelichting: 'Akoestisch onderzoek naar geluidbelasting op de gevel',
      trigger: 'Geluidsgevoelige functie (wonen, onderwijs, zorg) in geluidszone'
    }
  },
  'milieuzone': {
    type: 'milieuzone',
    adviesInstantie: 'Omgevingsdienst',
    aandachtspunten: [
      'Milieuonderzoek mogelijk vereist',
      'Beperkingen voor bepaalde activiteiten',
      'Check specifieke regels in planregels'
    ]
  }
};

// ============ PLAN TYPE CLASSIFICATION ============

function classifyPlan(typePlan: string, naam: string): { categorie: string; isParaplu: boolean; isVoorbereidingsbesluit: boolean; isBeheersverordening: boolean; isOmgevingsplan: boolean } {
  const t = (typePlan || '').toLowerCase();
  const n = (naam || '').toLowerCase();
  
  const isParaplu = n.includes('paraplu') || n.includes('facet') || 
    (t === 'bestemmingsplan' && (n.includes('parkeren') || n.includes('geluid') || n.includes('archeologie') || n.includes('wonen') || n.includes('kamerverhuur') || n.includes('huisvesting') || n.includes('detailhandel') || n.includes('horeca')));
  const isVoorbereidingsbesluit = t.includes('voorbereidingsbesluit') || t.includes('reactieve aanwijzing');
  const isBeheersverordening = t.includes('beheersverordening');
  const isOmgevingsplan = t.includes('omgevingsplan') || n.includes('omgevingsplan');
  
  let categorie = 'bestemmingsplan';
  if (isVoorbereidingsbesluit) categorie = 'voorbereidingsbesluit';
  else if (isBeheersverordening) categorie = 'beheersverordening';
  else if (t.includes('structuurvisie')) categorie = 'structuurvisie';
  else if (isParaplu) categorie = 'parapluplan';
  else if (t.includes('inpassingsplan')) categorie = 'inpassingsplan';
  else if (t.includes('wijzigingsplan')) categorie = 'wijzigingsplan';
  else if (t.includes('uitwerkingsplan')) categorie = 'uitwerkingsplan';
  else if (isOmgevingsplan) categorie = 'omgevingsplan';
  
  return { categorie, isParaplu, isVoorbereidingsbesluit, isBeheersverordening, isOmgevingsplan };
}

// ============ WFS QUERY HELPERS ============

async function wfsQuery(typeName: string, x: number, y: number, count: number = 20): Promise<any[]> {
  try {
    const url = new URL(WFS_BASE_URL);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('version', '2.0.0');
    url.searchParams.set('request', 'GetFeature');
    url.searchParams.set('typeName', typeName);
    url.searchParams.set('outputFormat', 'application/json');
    url.searchParams.set('srsName', 'EPSG:28992');
    url.searchParams.set('cql_filter', `INTERSECTS(geometrie,POINT(${x} ${y}))`);
    url.searchParams.set('count', String(count));

    const response = await fetchWithRetry(url.toString(), {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`[RP] WFS ${typeName}: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.warn(`[RP] WFS ${typeName} error:`, (error as Error).message);
    return [];
  }
}

// ============ MAIN FUNCTION ============

export async function detecteerBestemmingen(
  lat: number, 
  lng: number
): Promise<RuimtelijkePlannenResultaat> {
  const rdCoords = wgs84ToRd(lat, lng);
  const x = rdCoords.x;
  const y = rdCoords.y;

  // Parallel queries for ALL plan layers (7 queries in parallel)
  const [
    enkelFeatures,
    dubbelFeatures,
    gebiedsFeatures,
    bouwvlakFeatures,
    functieFeatures,
    maatvoeringFeatures,
    planFeatures,
  ] = await Promise.all([
    wfsQuery('enkelbestemming', x, y),
    wfsQuery('dubbelbestemming', x, y),
    wfsQuery('gebiedsaanduiding', x, y),
    wfsQuery('bouwvlak', x, y),
    wfsQuery('functieaanduiding', x, y, 30),
    wfsQuery('maatvoering', x, y, 30),
    wfsQuery('bestemmingsplangebied', x, y, 30), // Returns ALL plan types
  ]);

  // ---- Parse enkelbestemmingen ----
  const enkelbestemmingen: Enkelbestemming[] = enkelFeatures.map((f: any) => {
    const p = f.properties || {};
    return {
      naam: p.naam || p.bestemmingshoofdgroep || 'Onbekend',
      hoofdgroep: p.bestemmingshoofdgroep || 'Overig',
      planNaam: p.plannaam || '',
      planId: p.plangebied || '',
      regelUrl: p.verwijzingNaarTekst || undefined,
    };
  });

  // ---- Parse dubbelbestemmingen ----
  const dubbelbestemmingen: Dubbelbestemming[] = dubbelFeatures.map((f: any) => {
    const p = f.properties || {};
    const naam = (p.naam || '').toLowerCase();
    
    let mapping = DUBBELBESTEMMING_MAPPING[naam];
    if (!mapping) {
      for (const [key, value] of Object.entries(DUBBELBESTEMMING_MAPPING)) {
        if (naam.includes(key.split(' - ')[1] || key)) {
          mapping = value;
          break;
        }
      }
    }
    if (!mapping) {
      mapping = { type: 'overig', adviesInstantie: 'Gemeente', aandachtspunten: ['Check specifieke planregels'] };
    }

    return {
      type: mapping.type,
      naam: p.naam || 'Onbekende dubbelbestemming',
      planNaam: p.plannaam || '',
      planId: p.plangebied || '',
      regelUrl: p.verwijzingNaarTekst || undefined,
      adviesInstantie: mapping.adviesInstantie,
      aandachtspunten: mapping.aandachtspunten,
    };
  });

  // ---- Parse gebiedsaanduidingen ----
  const gebiedsaanduidingen: Gebiedsaanduiding[] = gebiedsFeatures.map((f: any) => {
    const p = f.properties || {};
    return {
      naam: p.naam || 'Onbekend',
      type: p.gebiedsaanduidinggroep || 'overig',
      planNaam: p.plannaam || '',
      planId: p.plangebied || '',
    };
  });

  // ---- Parse bouwvlakken ----
  const bouwvlakken: Bouwvlak[] = bouwvlakFeatures.map((f: any) => {
    const p = f.properties || {};
    return {
      planNaam: p.plannaam || '',
      planId: p.plangebied || '',
      naam: p.naam || undefined,
    };
  });

  // ---- Parse functieaanduidingen ----
  const functieaanduidingen: Functieaanduiding[] = functieFeatures.map((f: any) => {
    const p = f.properties || {};
    return {
      naam: p.naam || 'Onbekend',
      planNaam: p.plannaam || '',
      planId: p.plangebied || '',
    };
  });

  // ---- Parse maatvoeringen ----
  const maatvoeringen: Maatvoering[] = maatvoeringFeatures.map((f: any) => {
    const p = f.properties || {};
    return {
      naam: p.naam || 'Onbekend',
      waarde: p.waarde || p.waardeType1 || undefined,
      eenheid: p.eenheid || undefined,
      planNaam: p.plannaam || '',
      planId: p.plangebied || '',
      maatvoeringType: p.maatvoeringType || undefined,
    };
  });

  // ---- Parse plannen with classification ----
  const plannen: RuimtelijkPlan[] = planFeatures.map((f: any) => {
    const p = f.properties || {};
    const typePlan = p.typePlan || 'bestemmingsplan';
    const naam = p.naam || 'Onbekend plan';
    const classification = classifyPlan(typePlan, naam);
    
    return {
      naam,
      id: p.identificatie || '',
      type: typePlan,
      typePlanCategorie: classification.categorie,
      status: p.planstatus || 'onbekend',
      datum: p.datum || undefined,
      isParapluplan: classification.isParaplu,
      isVoorbereidingsbesluit: classification.isVoorbereidingsbesluit,
      isBeheersverordening: classification.isBeheersverordening,
      isOmgevingsplan: classification.isOmgevingsplan,
    };
  });

  // ---- Categorize plans ----
  const bestemmingsplannen = plannen.filter(p => p.typePlanCategorie === 'bestemmingsplan' || p.typePlanCategorie === 'inpassingsplan' || p.typePlanCategorie === 'wijzigingsplan' || p.typePlanCategorie === 'uitwerkingsplan' || p.typePlanCategorie === 'omgevingsplan');
  const parapluplannen = plannen.filter(p => p.isParapluplan);
  const voorbereidingsbesluiten = plannen.filter(p => p.isVoorbereidingsbesluit);
  const beheersverordeningen = plannen.filter(p => p.isBeheersverordening);
  const structuurvisies = plannen.filter(p => p.typePlanCategorie === 'structuurvisie');
  const overigePlannen = plannen.filter(p => !bestemmingsplannen.includes(p) && !parapluplannen.includes(p) && !voorbereidingsbesluiten.includes(p) && !beheersverordeningen.includes(p) && !structuurvisies.includes(p));

  // ---- Analyse flags ----
  let heeftArcheologie = false;
  let heeftWaterkering = false;
  let heeftLeiding = false;
  let heeftVeiligheidszone = false;
  let heeftGeluidszone = false;
  let heeftMilieuzone = false;
  let klicMeldingVereist = false;
  let aeriusVereist = false;
  const adviesInstanties: string[] = [];
  const onderzoeksVereisten: OnderzoeksVereiste[] = [];

  for (const db of dubbelbestemmingen) {
    if (db.type === 'waarde_archeologie') heeftArcheologie = true;
    if (db.type === 'waterstaat_waterkering' || db.type === 'waterstaat_waterloop') heeftWaterkering = true;
    if (db.type.startsWith('leiding_')) { heeftLeiding = true; klicMeldingVereist = true; }
    if (db.type === 'veiligheidszone') heeftVeiligheidszone = true;
    if (db.type === 'geluidszone') heeftGeluidszone = true;
    if (db.type === 'milieuzone') heeftMilieuzone = true;
    
    if (db.adviesInstantie && !adviesInstanties.includes(db.adviesInstantie)) {
      adviesInstanties.push(db.adviesInstantie);
    }

    const mapping = Object.values(DUBBELBESTEMMING_MAPPING).find(m => m.type === db.type);
    if (mapping?.onderzoek) {
      onderzoeksVereisten.push({
        type: mapping.onderzoek.type,
        naam: db.naam,
        verplicht: mapping.onderzoek.verplicht,
        toelichting: mapping.onderzoek.toelichting,
        trigger: mapping.onderzoek.trigger,
      });
    }
  }

  // Check gebiedsaanduidingen for additional flags
  for (const ga of gebiedsaanduidingen) {
    const gaNaam = ga.naam.toLowerCase();
    const gaType = ga.type.toLowerCase();
    if (gaNaam.includes('geluid') || gaType.includes('geluid')) heeftGeluidszone = true;
    if (gaNaam.includes('veiligheid') || gaType.includes('veiligheid')) heeftVeiligheidszone = true;
    if (gaNaam.includes('milieu') || gaType.includes('milieu')) heeftMilieuzone = true;
  }

  const result: RuimtelijkePlannenResultaat = {
    enkelbestemmingen,
    dubbelbestemmingen,
    gebiedsaanduidingen,
    bouwvlakken,
    functieaanduidingen,
    maatvoeringen,
    plannen,
    bestemmingsplannen,
    parapluplannen,
    voorbereidingsbesluiten,
    beheersverordeningen,
    structuurvisies,
    overigePlannen,
    heeftArcheologie,
    heeftWaterkering,
    heeftLeiding,
    heeftVeiligheidszone,
    heeftGeluidszone,
    heeftMilieuzone,
    heeftBouwvlak: bouwvlakken.length > 0,
    heeftParapluplan: parapluplannen.length > 0,
    heeftVoorbereidingsbesluit: voorbereidingsbesluiten.length > 0,
    adviesInstanties,
    onderzoeksVereisten,
    klicMeldingVereist,
    aeriusVereist,
  };

  console.log(`[RP] Resultaat: ${plannen.length} plannen (${bestemmingsplannen.length} bp, ${parapluplannen.length} paraplu, ${voorbereidingsbesluiten.length} vb), ${enkelbestemmingen.length} enkel, ${dubbelbestemmingen.length} dubbel, ${gebiedsaanduidingen.length} ga, ${bouwvlakken.length} bv, ${functieaanduidingen.length} fa, ${maatvoeringen.length} mv`);

  return result;
}

// ============ FORMAT FOR AI ============

export function formatRuimtelijkePlannenVoorAI(result: RuimtelijkePlannenResultaat): string {
  const lines: string[] = [];
  
  if (result.enkelbestemmingen.length === 0 && result.dubbelbestemmingen.length === 0 && result.plannen.length === 0) {
    return '';
  }

  lines.push('=== RUIMTELIJKE PLANNEN (OMGEVINGSPLAN) ===\n');

  // All plans by category
  if (result.bestemmingsplannen.length > 0) {
    lines.push('## BESTEMMINGSPLANNEN');
    for (const p of result.bestemmingsplannen) {
      lines.push(`- ${p.naam} (${p.type}, status: ${p.status}${p.datum ? `, datum: ${p.datum}` : ''})`);
    }
    lines.push('');
  }

  if (result.parapluplannen.length > 0) {
    lines.push('## PARAPLUPLANNEN / FACETPLANNEN');
    lines.push('⚠️ Parapluplannen bevatten aanvullende regels die het bestemmingsplan overstijgen!\n');
    for (const p of result.parapluplannen) {
      lines.push(`- ${p.naam} (status: ${p.status}${p.datum ? `, datum: ${p.datum}` : ''})`);
    }
    lines.push('');
  }

  if (result.voorbereidingsbesluiten.length > 0) {
    lines.push('## VOORBEREIDINGSBESLUITEN');
    lines.push('⚠️ Er is een voorbereidingsbesluit van kracht — er kunnen aanhoudingsplichten gelden!\n');
    for (const p of result.voorbereidingsbesluiten) {
      lines.push(`- ${p.naam} (status: ${p.status}${p.datum ? `, datum: ${p.datum}` : ''})`);
    }
    lines.push('');
  }

  if (result.beheersverordeningen.length > 0) {
    lines.push('## BEHEERSVERORDENINGEN');
    for (const p of result.beheersverordeningen) {
      lines.push(`- ${p.naam} (status: ${p.status})`);
    }
    lines.push('');
  }

  if (result.structuurvisies.length > 0) {
    lines.push('## STRUCTUURVISIES');
    for (const p of result.structuurvisies) {
      lines.push(`- ${p.naam} (status: ${p.status})`);
    }
    lines.push('');
  }

  // Enkelbestemmingen
  if (result.enkelbestemmingen.length > 0) {
    lines.push('## ENKELBESTEMMINGEN');
    for (const eb of result.enkelbestemmingen) {
      lines.push(`- ${eb.naam} (${eb.hoofdgroep}) — plan: ${eb.planNaam}`);
    }
    lines.push('');
  }

  // Dubbelbestemmingen
  if (result.dubbelbestemmingen.length > 0) {
    lines.push('## DUBBELBESTEMMINGEN — ADVIES VEREIST');
    lines.push('⚠️ Bij dubbelbestemmingen is advies van de betreffende instantie VERPLICHT!\n');
    for (const db of result.dubbelbestemmingen) {
      lines.push(`### ${db.naam}`);
      lines.push(`Adviesinstantie: ${db.adviesInstantie}`);
      lines.push('Aandachtspunten:');
      for (const punt of db.aandachtspunten) {
        lines.push(`  - ${punt}`);
      }
      lines.push('');
    }
  }

  // Gebiedsaanduidingen
  if (result.gebiedsaanduidingen.length > 0) {
    lines.push('## GEBIEDSAANDUIDINGEN');
    for (const ga of result.gebiedsaanduidingen) {
      lines.push(`- ${ga.naam} (${ga.type}) — plan: ${ga.planNaam}`);
    }
    lines.push('');
  }

  // Bouwvlak
  if (result.bouwvlakken.length > 0) {
    lines.push('## BOUWVLAK');
    lines.push(`Bouwvlak aanwezig (${result.bouwvlakken.length} vlak(ken)). Bouwen is in principe alleen toegestaan binnen het bouwvlak.`);
    lines.push('');
  }

  // Functieaanduidingen
  if (result.functieaanduidingen.length > 0) {
    lines.push('## FUNCTIEAANDUIDINGEN');
    for (const fa of result.functieaanduidingen) {
      lines.push(`- ${fa.naam} — plan: ${fa.planNaam}`);
    }
    lines.push('');
  }

  // Maatvoering
  if (result.maatvoeringen.length > 0) {
    lines.push('## MAATVOERING');
    for (const mv of result.maatvoeringen) {
      lines.push(`- ${mv.naam}${mv.waarde ? `: ${mv.waarde}${mv.eenheid ? ` ${mv.eenheid}` : ''}` : ''} — plan: ${mv.planNaam}`);
    }
    lines.push('');
  }

  // Onderzoeksvereisten
  if (result.onderzoeksVereisten.length > 0) {
    lines.push('## VEREISTE ONDERZOEKEN');
    for (const onderzoek of result.onderzoeksVereisten) {
      lines.push(`### ${onderzoek.type} ${onderzoek.verplicht ? '(VERPLICHT)' : '(aanbevolen)'}`);
      lines.push(`Vanwege: ${onderzoek.naam}`);
      lines.push(`Toelichting: ${onderzoek.toelichting}`);
      if (onderzoek.trigger) lines.push(`Trigger: ${onderzoek.trigger}`);
      lines.push('');
    }
  }

  // KLIC-melding
  if (result.klicMeldingVereist) {
    lines.push('## KLIC-MELDING VERPLICHT');
    lines.push('⚠️ Bij graafwerkzaamheden (>20cm diepte) is een KLIC-melding VERPLICHT!');
    lines.push('');
  }

  // Samenvatting adviesinstanties
  if (result.adviesInstanties.length > 0) {
    lines.push('## BENODIGDE ADVIEZEN');
    for (const instantie of result.adviesInstanties) {
      lines.push(`- ${instantie}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============ COORDINATE CONVERSION ============

function wgs84ToRd(lat: number, lng: number): { x: number; y: number } {
  const X0 = 155000.0;
  const Y0 = 463000.0;
  const PHI0 = 52.15517440;
  const LAM0 = 5.38720621;

  const dPhi = 0.36 * (lat - PHI0);
  const dLam = 0.36 * (lng - LAM0);

  const x = X0 + 
    190094.945 * dLam +
    -11832.228 * dPhi * dLam +
    -114.221 * dPhi * dPhi * dLam +
    -32.391 * dLam * dLam * dLam +
    -0.705 * dPhi +
    -2.340 * dPhi * dLam * dLam +
    -0.608 * dPhi * dPhi * dPhi * dLam +
    -0.008 * dLam * dLam +
    0.148 * dPhi * dPhi * dLam * dLam;

  const y = Y0 +
    309056.544 * dPhi +
    3638.893 * dLam * dLam +
    73.077 * dPhi * dPhi +
    -157.984 * dPhi * dLam * dLam +
    59.788 * dPhi * dPhi * dPhi +
    0.433 * dLam +
    -6.439 * dPhi * dPhi * dLam +
    -0.032 * dPhi * dLam +
    0.092 * dLam * dLam * dLam * dLam +
    -0.054 * dPhi * dPhi * dLam * dLam;

  return { x: Math.round(x), y: Math.round(y) };
}
