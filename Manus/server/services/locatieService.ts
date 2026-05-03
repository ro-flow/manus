/**
 * Locatie Service - Bepaalt exacte locatie en haalt alle geldende regels op
 * 
 * Flow:
 * 1. PDOK Locatieserver: Adres → Coördinaten (RD en WGS84)
 * 2. Ruimtelijke Plannen API: Coördinaten → Bestemmingsplannen
 * 3. Omgevingsdocument Presenteren API: Coördinaten → Omgevingsplan + Regels
 * 4. DSO Toepasbare Regels API: Vergunningscheck + Bevoegd gezag + Activiteiten
 */

import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";
import { analyseerLocatiePDOK, formatPDOKVoorAI, bepaalRelevantie, type PDOKAnalyseResultaat, type RelevantieContext } from './pdokService';
import { analyseerMilieu, formatMilieuVoorAI, type MilieuAnalyse } from './milieuService';
import { 
  detecteerBestemmingen, 
  formatRuimtelijkePlannenVoorAI, 
  type RuimtelijkePlannenResultaat 
} from './ruimtelijkeplannenService';
import {
  volledigeDSOAnalyse,
  bepaalBevoegdGezag,
  haalActiviteitenOp,
  type Locatie as DSOLocatie,
  type VergunningCheckResultaat,
  type VerzoeksrouteringResultaat,
  type RTRResultaat
} from './dsoApiService';
import {
  bepaalAeriusVereiste,
  formatAeriusVoorAI,
  detecteerActiviteitenVoorAerius,
  type AeriusVereiste
} from './aeriusService';
import {
  bepaalOnderzoeken,
  formatOnderzoekenVoorAI,
  type OnderzoekenResultaat
} from './onderzoekenService';
import {
  haalGebouwInfo,
  formatBagInfoVoorAI,
  type BagGebouwInfo
} from './bagApiService';

// Types
export interface LocatieResult {
  adres: string;
  gemeente: string;
  woonplaats: string;
  postcode?: string;
  coordinaten: {
    rd: { x: number; y: number };
    wgs84: { lat: number; lng: number };
  };
  kadastraalObject?: string;
  perceelOppervlakte?: number;
}

export interface Bestemmingsplan {
  identificatie: string;
  naam: string;
  type: string;
  planstatus: string;
  vaststellingsdatum?: string;
  eindeRechtsgeldigheid?: string;
  isTamPlan: boolean;
  bestemmingen: Bestemming[];
}

export interface Bestemming {
  naam: string;
  hoofdgroep: string;
  artikelNummer?: string;
  regels?: string;
}

export interface OmgevingsplanRegel {
  identificatie: string;
  naam: string;
  type: 'activiteit' | 'gebiedsaanwijzing' | 'omgevingswaarde' | 'omgevingsnorm' | 'functie';
  juridischeStatus: string;
  regeltekst?: string;
  toelichting?: string;
  werkingsgebied?: GeoJSON.Geometry;
}

export interface LocatieAnalyse {
  locatie: LocatieResult;
  bestemmingsplannen: Bestemmingsplan[];
  omgevingsplanRegels: OmgevingsplanRegel[];
  gebiedsaanwijzingen: string[];
  bijzondereGebieden: {
    natura2000: boolean;
    beschermdStadsgezicht: boolean;
    archeologischWaardevol: boolean;
    grondwaterbeschermingsgebied: boolean;
    geluidszone: boolean;
    geurzone: boolean;
  };
  toepasselijkeRegels: string[];
  // DSO Toepasbare Regels API resultaten
  dsoAnalyse?: {
    vergunningCheck?: VergunningCheckResultaat;
    bevoegdGezag?: VerzoeksrouteringResultaat;
    rtrGegevens?: RTRResultaat;
    errors: string[];
  };
  // Ruimtelijke Plannen API resultaten (dubbelbestemmingen)
  ruimtelijkePlannen?: RuimtelijkePlannenResultaat;
  // PDOK gebiedsanalyse (Natura 2000, Monumenten, Beschermd Gezicht)
  pdokAnalyse?: PDOKAnalyseResultaat;
  // Milieuaspecten (geluid, geur, risico, bodem)
  milieuAnalyse?: MilieuAnalyse;
  // AERIUS stikstofberekening vereiste
  aeriusVereiste?: AeriusVereiste;
  // Vereiste onderzoeken
  onderzoekenResultaat?: OnderzoekenResultaat;
  // BAG gebouwgegevens (bouwjaar, oppervlakte, gebruiksdoel)
  bagInfo?: BagGebouwInfo;
}

// PDOK Locatieserver - Gratis geocoding
export async function geocodeAdres(adres: string): Promise<LocatieResult | null> {
  try {
    const url = new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free');
    url.searchParams.set('q', adres);
    url.searchParams.set('rows', '1');
    url.searchParams.set('fq', 'type:(adres OR postcode)');
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('PDOK geocoding failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (!data.response?.docs?.length) {
      console.log('Geen resultaten gevonden voor adres:', adres);
      return null;
    }
    
    const doc = data.response.docs[0];
    
    // Parse centroide_rd (format: "POINT(x y)")
    const rdMatch = doc.centroide_rd?.match(/POINT\((\d+\.?\d*)\s+(\d+\.?\d*)\)/);
    const llMatch = doc.centroide_ll?.match(/POINT\((\d+\.?\d*)\s+(\d+\.?\d*)\)/);
    
    return {
      adres: doc.weergavenaam || adres,
      gemeente: doc.gemeentenaam || '',
      woonplaats: doc.woonplaatsnaam || '',
      postcode: doc.postcode,
      coordinaten: {
        rd: {
          x: rdMatch ? parseFloat(rdMatch[1]) : 0,
          y: rdMatch ? parseFloat(rdMatch[2]) : 0
        },
        wgs84: {
          lng: llMatch ? parseFloat(llMatch[1]) : 0,
          lat: llMatch ? parseFloat(llMatch[2]) : 0
        }
      },
      kadastraalObject: doc.gekoppeld_perceel?.[0],
      perceelOppervlakte: doc.oppervlakte
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Ruimtelijke Plannen API - Bestemmingsplannen per locatie
export async function getBestemmingsplannen(
  x: number, 
  y: number,
  apiKey?: string
): Promise<Bestemmingsplan[]> {
  const key = apiKey || ENV.dsoApiKey;
  if (!key) {
    console.warn('DSO_API_KEY niet geconfigureerd - bestemmingsplannen worden overgeslagen');
    return [];
  }
  
  try {
    // Zoek plannen op basis van RD coördinaten
    const url = new URL('https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/plannen');
    url.searchParams.set('x', x.toString());
    url.searchParams.set('y', y.toString());
    url.searchParams.set('expand', 'bestemmingen');
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': key,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Ruimtelijke Plannen API failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // Filter alleen geldige plannen (met overgangsrecht of TAM)
    return (data._embedded?.plannen || [])
      .filter((plan: any) => {
        // Plannen zonder eindeRechtsgeldigheid of met TAM zijn nog geldig
        return !plan.eindeRechtsgeldigheid || plan.isTamPlan;
      })
      .map((plan: any) => ({
        identificatie: plan.identificatie,
        naam: plan.naam,
        type: plan.typePlan,
        planstatus: plan.planstatus,
        vaststellingsdatum: plan.datum,
        eindeRechtsgeldigheid: plan.eindeRechtsgeldigheid,
        isTamPlan: plan.isTamPlan || false,
        bestemmingen: (plan._embedded?.bestemmingen || []).map((b: any) => ({
          naam: b.naam,
          hoofdgroep: b.hoofdgroep,
          artikelNummer: b.artikelNummer,
          regels: b.regels
        }))
      }));
  } catch (error) {
    console.error('Bestemmingsplannen ophalen error:', error);
    return [];
  }
}

// Omgevingsdocument Presenteren API - Omgevingsplan regels per locatie
export async function getOmgevingsplanRegels(
  x: number,
  y: number,
  apiKey?: string
): Promise<OmgevingsplanRegel[]> {
  const key = apiKey || ENV.dsoApiKey;
  if (!key) {
    console.warn('DSO_API_KEY niet geconfigureerd - omgevingsplan regels worden overgeslagen');
    return [];
  }
  
  try {
    // Zoek regels op basis van RD coördinaten
    const url = new URL('https://service.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/presenteren/v8/regels');
    url.searchParams.set('x', x.toString());
    url.searchParams.set('y', y.toString());
    url.searchParams.set('expand', 'true');
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': key,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Omgevingsdocument Presenteren API failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    return (data._embedded?.regels || []).map((regel: any) => ({
      identificatie: regel.identificatie,
      naam: regel.naam || regel.label,
      type: regel.type || 'activiteit',
      juridischeStatus: regel.juridischeStatus || 'definitief',
      regeltekst: regel.tekst,
      toelichting: regel.toelichting
    }));
  } catch (error) {
    console.error('Omgevingsplan regels ophalen error:', error);
    return [];
  }
}

// Gebiedsaanwijzingen ophalen (Natura2000, beschermd stadsgezicht, etc.)
export async function getGebiedsaanwijzingen(
  x: number,
  y: number,
  apiKey?: string
): Promise<{ type: string; naam: string; bron: string }[]> {
  const key = apiKey || ENV.dsoApiKey;
  if (!key) {
    return [];
  }
  
  try {
    const url = new URL('https://service.omgevingswet.overheid.nl/publiek/omgevingsdocumenten/api/presenteren/v8/gebiedsaanwijzingen');
    url.searchParams.set('x', x.toString());
    url.searchParams.set('y', y.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': key,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    return (data._embedded?.gebiedsaanwijzingen || []).map((ga: any) => ({
      type: ga.type,
      naam: ga.naam || ga.label,
      bron: ga.bron || 'onbekend'
    }));
  } catch (error) {
    console.error('Gebiedsaanwijzingen ophalen error:', error);
    return [];
  }
}

// Hoofdfunctie: Complete locatie analyse
export async function analyseLocatie(
  adres: string,
  activiteiten?: string[] // Optioneel: voor DSO vergunningscheck
): Promise<LocatieAnalyse | null> {
  // Stap 1: Geocode het adres
  const locatie = await geocodeAdres(adres);
  if (!locatie) {
    console.error('Kon adres niet geocoderen:', adres);
    return null;
  }
  
  const { x, y } = locatie.coordinaten.rd;
  const { lat, lng } = locatie.coordinaten.wgs84;
  
  // Stap 2: Haal alle plannen en regels parallel op (inclusief PDOK, Milieu, Ruimtelijke Plannen en BAG)
  // Extract postcode en huisnummer voor BAG API
  const postcodeMatch = locatie.postcode?.match(/^(\d{4}[A-Z]{2})/);
  const huisnummerMatch = locatie.adres.match(/(\d+)/);
  const postcode = postcodeMatch ? postcodeMatch[1] : undefined;
  const huisnummer = huisnummerMatch ? parseInt(huisnummerMatch[1]) : undefined;
  
  const [bestemmingsplannen, omgevingsplanRegels, gebiedsaanwijzingen, pdokAnalyse, milieuAnalyse, ruimtelijkePlannen, bagInfo] = await Promise.all([
    getBestemmingsplannen(x, y),
    getOmgevingsplanRegels(x, y),
    getGebiedsaanwijzingen(x, y),
    analyseerLocatiePDOK(lng, lat, activiteiten), // PDOK: Natura 2000, Monumenten, Beschermd Gezicht
    analyseerMilieu(lat, lng, activiteiten), // Milieu: geluid, geur, risico, bodem
    detecteerBestemmingen(lat, lng), // Ruimtelijke Plannen: dubbelbestemmingen, enkelbestemmingen
    // BAG API: bouwjaar, oppervlakte, gebruiksdoel (alleen als postcode en huisnummer beschikbaar)
    postcode && huisnummer ? haalGebouwInfo(postcode, huisnummer) : Promise.resolve(null)
  ]);
  
  // Stap 3: Bepaal bijzondere gebieden
  const gebiedsTypes = gebiedsaanwijzingen.map(ga => ga.type.toLowerCase());
  const bijzondereGebieden = {
    natura2000: gebiedsTypes.some(t => t.includes('natura') || t.includes('n2000')),
    beschermdStadsgezicht: gebiedsTypes.some(t => t.includes('beschermd') && (t.includes('stads') || t.includes('dorps'))),
    archeologischWaardevol: gebiedsTypes.some(t => t.includes('archeolog')),
    grondwaterbeschermingsgebied: gebiedsTypes.some(t => t.includes('grondwater')),
    geluidszone: gebiedsTypes.some(t => t.includes('geluid')),
    geurzone: gebiedsTypes.some(t => t.includes('geur'))
  };
  
  // Stap 4: Verzamel alle toepasselijke regels
  const toepasselijkeRegels: string[] = [];
  
  // Voeg bestemmingsplan regels toe
  for (const plan of bestemmingsplannen) {
    for (const bestemming of plan.bestemmingen) {
      if (bestemming.regels) {
        toepasselijkeRegels.push(`[${plan.naam}] ${bestemming.naam}: ${bestemming.regels}`);
      }
    }
  }
  
  // Voeg omgevingsplan regels toe
  for (const regel of omgevingsplanRegels) {
    if (regel.regeltekst) {
      toepasselijkeRegels.push(`[Omgevingsplan] ${regel.naam}: ${regel.regeltekst}`);
    }
  }
  
  // Stap 5: DSO Toepasbare Regels API (indien activiteiten opgegeven)
  let dsoAnalyse: LocatieAnalyse['dsoAnalyse'] | undefined;
  
  if (ENV.dsoApiKey && activiteiten && activiteiten.length > 0) {
    console.log('[LocatieService] DSO Toepasbare Regels API aanroepen voor activiteiten:', activiteiten);
    
    // Converteer naar DSO locatie formaat (WGS84 Point)
    const dsoLocatie: DSOLocatie = {
      type: 'Point',
      coordinates: [lng, lat] // GeoJSON: [longitude, latitude]
    };
    
    try {
      const dsoResult = await volledigeDSOAnalyse(activiteiten, dsoLocatie);
      dsoAnalyse = dsoResult;
      
      // Voeg DSO resultaten toe aan toepasselijke regels
      if (dsoResult.vergunningCheck?.conclusies) {
        for (const conclusie of dsoResult.vergunningCheck.conclusies) {
          toepasselijkeRegels.push(`[DSO Conclusie] ${conclusie.type}: ${conclusie.omschrijving}`);
        }
      }
      
      if (dsoResult.bevoegdGezag?.bevoegdGezag) {
        for (const bg of dsoResult.bevoegdGezag.bevoegdGezag) {
          toepasselijkeRegels.push(`[Bevoegd Gezag] ${bg.naam}${bg.afgeleid ? ' (afgeleid)' : ''}`);
        }
      }
      
      if (dsoResult.bevoegdGezag?.behandeldienst) {
        toepasselijkeRegels.push(`[Behandeldienst] ${dsoResult.bevoegdGezag.behandeldienst.naam}`);
      }
      
      console.log('[LocatieService] DSO analyse voltooid:', {
        conclusies: dsoResult.vergunningCheck?.conclusies?.length || 0,
        bevoegdGezag: dsoResult.bevoegdGezag?.bevoegdGezag?.length || 0,
        activiteiten: dsoResult.rtrGegevens?.activiteiten?.length || 0,
        errors: dsoResult.errors
      });
    } catch (error) {
      console.error('[LocatieService] DSO analyse fout:', error);
      dsoAnalyse = {
        errors: [`DSO analyse mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`]
      };
    }
  }
  
  // Update bijzondereGebieden met PDOK resultaten
  if (pdokAnalyse) {
    if (pdokAnalyse.natura2000.binnenGebied || pdokAnalyse.natura2000.dichtstbijzijnde) {
      bijzondereGebieden.natura2000 = pdokAnalyse.natura2000.binnenGebied;
    }
    if (pdokAnalyse.beschermdGezicht.binnenGebied) {
      bijzondereGebieden.beschermdStadsgezicht = true;
    }
  }

  // Bepaal AERIUS vereiste op basis van activiteiten en Natura 2000 afstand
  let aeriusVereiste: AeriusVereiste | undefined;
  if (activiteiten && activiteiten.length > 0) {
    // Converteer afstand van meter naar km
    const afstandMeter = pdokAnalyse?.natura2000.dichtstbijzijnde?.afstandMeter;
    const afstandNatura2000 = afstandMeter ? afstandMeter / 1000 : undefined;
    const natura2000Gebied = pdokAnalyse?.natura2000.dichtstbijzijnde?.naam;
    aeriusVereiste = bepaalAeriusVereiste(
      activiteiten,
      afstandNatura2000,
      natura2000Gebied
    );
  }
  
  // Voeg milieu aandachtspunten toe aan toepasselijke regels
  if (milieuAnalyse) {
    for (const punt of milieuAnalyse.aandachtspuntenInwaarts) {
      toepasselijkeRegels.push(`[Milieu - Inwaarts] ${punt}`);
    }
    for (const punt of milieuAnalyse.aandachtspuntenUitwaarts) {
      toepasselijkeRegels.push(`[Milieu - Uitwaarts] ${punt}`);
    }
    
    // Update bijzondereGebieden met milieu resultaten
    if (milieuAnalyse.stiltegebied) {
      bijzondereGebieden.geluidszone = true;
    }
    if (milieuAnalyse.nabijHoofdweg || milieuAnalyse.nabijSpoorweg || milieuAnalyse.geluidzoneVliegveld) {
      bijzondereGebieden.geluidszone = true;
    }
  }

  // Bepaal alle vereiste onderzoeken op basis van locatie en activiteiten
  // Gebruik BAG bouwjaar als primaire bron, fallback naar PDOK
  const bouwjaar = bagInfo?.pand?.bouwjaar || pdokAnalyse?.bag?.pand?.bouwjaar;
  
  const onderzoekenResultaat = bepaalOnderzoeken(
    activiteiten || [],
    ruimtelijkePlannen,
    pdokAnalyse,
    milieuAnalyse,
    aeriusVereiste,
    {
      bouwjaar,
      heeftGraafwerk: ruimtelijkePlannen?.heeftLeiding || false
    }
  );
  
  return {
    locatie,
    bestemmingsplannen,
    omgevingsplanRegels,
    gebiedsaanwijzingen: gebiedsaanwijzingen.map(ga => `${ga.type}: ${ga.naam}`),
    bijzondereGebieden,
    toepasselijkeRegels,
    dsoAnalyse,
    pdokAnalyse,
    milieuAnalyse,
    ruimtelijkePlannen,
    aeriusVereiste,
    onderzoekenResultaat,
    bagInfo: bagInfo || undefined
  };
}

/**
 * Analyseer een kaartafbeelding om de locatie te bepalen
 * Gebruikt Gemini Vision om herkenbare locatiekenmerken te identificeren
 */
export async function analyseKaartAfbeelding(
  imageUrl: string,
  projectNaam?: string,
  projectOmschrijving?: string
): Promise<{ locatie: string; coordinaten?: { lat: number; lng: number }; confidence: 'hoog' | 'middel' | 'laag'; toelichting: string } | null> {
  try {
    console.log('[LocatieService] Analyseren kaartafbeelding:', imageUrl);
    
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `Je bent een expert in het herkennen van locaties op kaarten in Nederland.
Je analyseert kaartafbeeldingen uit DSO-aanvragen om de exacte locatie te bepalen.

Let op:
- Herken plaatsnamen, straatnamen, waternamen, dijknamen
- Identificeer herkenbare landmarks (havens, bruggen, kerken, stations)
- Let op de vorm van het water, kustlijnen, polders
- Gebruik de schaal en oriëntatie van de kaart
- Als er een polygoon/markering is, beschrijf waar dit zich bevindt

Geef je antwoord in JSON formaat met:
- locatie: beste schatting van de locatie (plaatsnaam, straat of gebied)
- coordinaten: geschatte lat/lng als je zeker bent (anders null)
- confidence: "hoog", "middel" of "laag"
- toelichting: uitleg hoe je tot deze conclusie kwam`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyseer deze kaartafbeelding uit een DSO-aanvraag en bepaal de locatie.

${projectNaam ? `Projectnaam: ${projectNaam}` : ''}
${projectOmschrijving ? `Projectomschrijving: ${projectOmschrijving}` : ''}

Wat is de exacte locatie die op deze kaart is gemarkeerd?`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'kaart_analyse',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              locatie: { type: 'string', description: 'Beste schatting van de locatie' },
              coordinaten: {
                type: ['object', 'null'],
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' }
                },
                required: ['lat', 'lng'],
                additionalProperties: false
              },
              confidence: { type: 'string', enum: ['hoog', 'middel', 'laag'] },
              toelichting: { type: 'string', description: 'Uitleg van de analyse' }
            },
            required: ['locatie', 'coordinaten', 'confidence', 'toelichting'],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      console.error('[LocatieService] Geen response van Vision API');
      return null;
    }
    
    const result = JSON.parse(content);
    console.log('[LocatieService] Kaartanalyse resultaat:', result);
    
    return result;
  } catch (error) {
    console.error('[LocatieService] Kaartanalyse error:', error);
    return null;
  }
}

/**
 * Reverse geocoding: Coördinaten → Adres
 */
export async function reverseGeocode(lat: number, lng: number): Promise<LocatieResult | null> {
  try {
    // Converteer WGS84 naar RD voor PDOK
    // Simpele benadering - voor exacte conversie zou PROJ4 nodig zijn
    const url = new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('rows', '1');
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('PDOK reverse geocoding failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (!data.response?.docs?.length) {
      console.log('Geen resultaten gevonden voor coördinaten:', lat, lng);
      return null;
    }
    
    const doc = data.response.docs[0];
    
    const rdMatch = doc.centroide_rd?.match(/POINT\((\d+\.?\d*)\s+(\d+\.?\d*)\)/);
    
    return {
      adres: doc.weergavenaam || `${lat}, ${lng}`,
      gemeente: doc.gemeentenaam || '',
      woonplaats: doc.woonplaatsnaam || '',
      postcode: doc.postcode,
      coordinaten: {
        rd: {
          x: rdMatch ? parseFloat(rdMatch[1]) : 0,
          y: rdMatch ? parseFloat(rdMatch[2]) : 0
        },
        wgs84: { lat, lng }
      },
      kadastraalObject: doc.gekoppeld_perceel?.[0],
      perceelOppervlakte: doc.oppervlakte
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Analyseer locatie vanuit kaartafbeelding - complete flow
 */
export async function analyseLocatieVanKaart(
  imageUrl: string,
  projectNaam?: string,
  projectOmschrijving?: string
): Promise<LocatieAnalyse | null> {
  // Stap 1: Analyseer de kaartafbeelding met Vision
  const kaartResult = await analyseKaartAfbeelding(imageUrl, projectNaam, projectOmschrijving);
  
  if (!kaartResult) {
    console.error('[LocatieService] Kon kaartafbeelding niet analyseren');
    return null;
  }
  
  console.log('[LocatieService] Kaart geanalyseerd:', kaartResult.locatie, '(confidence:', kaartResult.confidence, ')');
  
  // Stap 2: Probeer de locatie te geocoderen
  let locatie: LocatieResult | null = null;
  
  // Als we coördinaten hebben, gebruik reverse geocoding
  if (kaartResult.coordinaten) {
    locatie = await reverseGeocode(kaartResult.coordinaten.lat, kaartResult.coordinaten.lng);
  }
  
  // Als dat niet lukt, probeer de locatienaam te geocoderen
  if (!locatie && kaartResult.locatie) {
    locatie = await geocodeAdres(kaartResult.locatie);
  }
  
  if (!locatie) {
    console.error('[LocatieService] Kon locatie niet geocoderen na kaartanalyse');
    // Maak een minimale locatie response
    return {
      locatie: {
        adres: kaartResult.locatie,
        gemeente: '',
        woonplaats: '',
        coordinaten: {
          rd: { x: 0, y: 0 },
          wgs84: kaartResult.coordinaten || { lat: 0, lng: 0 }
        }
      },
      bestemmingsplannen: [],
      omgevingsplanRegels: [],
      gebiedsaanwijzingen: [],
      bijzondereGebieden: {
        natura2000: false,
        beschermdStadsgezicht: false,
        archeologischWaardevol: false,
        grondwaterbeschermingsgebied: false,
        geluidszone: false,
        geurzone: false
      },
      toepasselijkeRegels: [`Locatie bepaald via kaartanalyse (${kaartResult.confidence} confidence): ${kaartResult.toelichting}`]
    };
  }
  
  // Stap 3: Haal alle plannen en regels op
  const { x, y } = locatie.coordinaten.rd;
  
  const [bestemmingsplannen, omgevingsplanRegels, gebiedsaanwijzingen] = await Promise.all([
    getBestemmingsplannen(x, y),
    getOmgevingsplanRegels(x, y),
    getGebiedsaanwijzingen(x, y)
  ]);
  
  const gebiedsTypes = gebiedsaanwijzingen.map(ga => ga.type.toLowerCase());
  const bijzondereGebieden = {
    natura2000: gebiedsTypes.some(t => t.includes('natura') || t.includes('n2000')),
    beschermdStadsgezicht: gebiedsTypes.some(t => t.includes('beschermd') && (t.includes('stads') || t.includes('dorps'))),
    archeologischWaardevol: gebiedsTypes.some(t => t.includes('archeolog')),
    grondwaterbeschermingsgebied: gebiedsTypes.some(t => t.includes('grondwater')),
    geluidszone: gebiedsTypes.some(t => t.includes('geluid')),
    geurzone: gebiedsTypes.some(t => t.includes('geur'))
  };
  
  const toepasselijkeRegels: string[] = [
    `Locatie bepaald via kaartanalyse (${kaartResult.confidence} confidence): ${kaartResult.toelichting}`
  ];
  
  for (const plan of bestemmingsplannen) {
    for (const bestemming of plan.bestemmingen) {
      if (bestemming.regels) {
        toepasselijkeRegels.push(`[${plan.naam}] ${bestemming.naam}: ${bestemming.regels}`);
      }
    }
  }
  
  for (const regel of omgevingsplanRegels) {
    if (regel.regeltekst) {
      toepasselijkeRegels.push(`[Omgevingsplan] ${regel.naam}: ${regel.regeltekst}`);
    }
  }
  
  return {
    locatie,
    bestemmingsplannen,
    omgevingsplanRegels,
    gebiedsaanwijzingen: gebiedsaanwijzingen.map(ga => `${ga.type}: ${ga.naam}`),
    bijzondereGebieden,
    toepasselijkeRegels
  };
}

// Helper: Formatteer locatie analyse voor AI context
export function formatLocatieVoorAI(analyse: LocatieAnalyse): string {
  const lines: string[] = [];
  
  lines.push('## STAP 1: EXACTE LOCATIE BEPALING');
  lines.push('');
  lines.push(`**Adres**: ${analyse.locatie.adres}`);
  lines.push(`**Gemeente**: ${analyse.locatie.gemeente}`);
  lines.push(`**Woonplaats**: ${analyse.locatie.woonplaats}`);
  if (analyse.locatie.kadastraalObject) {
    lines.push(`**Kadastraal object**: ${analyse.locatie.kadastraalObject}`);
  }
  lines.push(`**Coördinaten (RD)**: X=${analyse.locatie.coordinaten.rd.x}, Y=${analyse.locatie.coordinaten.rd.y}`);
  lines.push('');
  
  // Bijzondere gebieden
  lines.push('### Bijzondere Gebieden');
  const bijzonder = analyse.bijzondereGebieden;
  if (bijzonder.natura2000) lines.push('- ⚠️ **Natura 2000 gebied** - Habitattoets vereist');
  if (bijzonder.beschermdStadsgezicht) lines.push('- ⚠️ **Beschermd stads-/dorpsgezicht** - Welstandsadvies verplicht');
  if (bijzonder.archeologischWaardevol) lines.push('- ⚠️ **Archeologisch waardevol gebied** - Onderzoek mogelijk vereist');
  if (bijzonder.grondwaterbeschermingsgebied) lines.push('- ⚠️ **Grondwaterbeschermingsgebied** - Extra eisen');
  if (bijzonder.geluidszone) lines.push('- ⚠️ **Geluidszone** - Akoestisch onderzoek mogelijk vereist');
  if (bijzonder.geurzone) lines.push('- ⚠️ **Geurzone** - Geuronderzoek mogelijk vereist');
  if (!Object.values(bijzonder).some(v => v)) {
    lines.push('- Geen bijzondere gebiedsaanwijzingen gevonden');
  }
  lines.push('');
  
  // Bestemmingsplannen
  if (analyse.bestemmingsplannen.length > 0) {
    lines.push('### Geldende Bestemmingsplannen');
    for (const plan of analyse.bestemmingsplannen) {
      lines.push(`**${plan.naam}** (${plan.type})`);
      if (plan.isTamPlan) lines.push('- *TAM-plan (Omgevingswet)*');
      if (plan.planstatus) lines.push(`- Status: ${plan.planstatus}`);
      if (plan.bestemmingen.length > 0) {
        lines.push('- Bestemmingen op deze locatie:');
        for (const b of plan.bestemmingen) {
          lines.push(`  - ${b.naam} (${b.hoofdgroep})`);
        }
      }
    }
    lines.push('');
  }
  
  // Omgevingsplan regels
  if (analyse.omgevingsplanRegels.length > 0) {
    lines.push('### Omgevingsplan Regels');
    for (const regel of analyse.omgevingsplanRegels) {
      lines.push(`- **${regel.naam}** (${regel.type})`);
      if (regel.regeltekst) {
        lines.push(`  ${regel.regeltekst.substring(0, 500)}${regel.regeltekst.length > 500 ? '...' : ''}`);
      }
    }
    lines.push('');
  }
  
  // Gebiedsaanwijzingen
  if (analyse.gebiedsaanwijzingen.length > 0) {
    lines.push('### Gebiedsaanwijzingen');
    for (const ga of analyse.gebiedsaanwijzingen) {
      lines.push(`- ${ga}`);
    }
    lines.push('');
  }
  
  // DSO Toepasbare Regels API resultaten
  if (analyse.dsoAnalyse) {
    lines.push('### DSO Toepasbare Regels API Resultaten');
    lines.push('');
    
    // Vergunningscheck conclusies
    if (analyse.dsoAnalyse.vergunningCheck?.conclusies?.length) {
      lines.push('#### Vergunningscheck Conclusies');
      for (const conclusie of analyse.dsoAnalyse.vergunningCheck.conclusies) {
        const typeLabel = {
          'vergunningplicht': '⚠️ Vergunningplicht',
          'meldingsplicht': '📝 Meldingsplicht',
          'vergunningvrij': '✅ Vergunningvrij',
          'verbod': '🚫 Verbod',
          'onbekend': '❓ Onbekend'
        }[conclusie.type] || conclusie.type;
        
        lines.push(`- **${typeLabel}**: ${conclusie.omschrijving}`);
        if (conclusie.juridischeGrondslag) {
          lines.push(`  - Grondslag: ${conclusie.juridischeGrondslag}`);
        }
        if (conclusie.activiteiten.length > 0) {
          lines.push(`  - Activiteiten: ${conclusie.activiteiten.join(', ')}`);
        }
      }
      lines.push('');
    }
    
    // Indieningsvereisten
    if (analyse.dsoAnalyse.vergunningCheck?.indieningsvereisten?.length) {
      lines.push('#### Indieningsvereisten');
      for (const vereiste of analyse.dsoAnalyse.vergunningCheck.indieningsvereisten) {
        const verplichtLabel = vereiste.verplicht ? '🟢 Verplicht' : '🟡 Optioneel';
        lines.push(`- **${vereiste.naam}** (${verplichtLabel})`);
        if (vereiste.omschrijving) {
          lines.push(`  ${vereiste.omschrijving}`);
        }
      }
      lines.push('');
    }
    
    // Open vragen
    if (analyse.dsoAnalyse.vergunningCheck?.openVragen?.length) {
      lines.push('#### Open Vragen (nog te beantwoorden)');
      for (const vraag of analyse.dsoAnalyse.vergunningCheck.openVragen) {
        lines.push(`- **${vraag.vraagTekst}**`);
        if (vraag.antwoordOpties?.length) {
          lines.push(`  Opties: ${vraag.antwoordOpties.join(' | ')}`);
        }
      }
      lines.push('');
    }
    
    // Bevoegd gezag
    if (analyse.dsoAnalyse.bevoegdGezag?.bevoegdGezag?.length) {
      lines.push('#### Bevoegd Gezag');
      for (const bg of analyse.dsoAnalyse.bevoegdGezag.bevoegdGezag) {
        const afgeleidLabel = bg.afgeleid ? ' (afgeleid)' : '';
        lines.push(`- **${bg.naam}**${afgeleidLabel}`);
      }
      lines.push('');
    }
    
    // Behandeldienst
    if (analyse.dsoAnalyse.bevoegdGezag?.behandeldienst) {
      lines.push('#### Behandeldienst');
      lines.push(`- **${analyse.dsoAnalyse.bevoegdGezag.behandeldienst.naam}**`);
      lines.push('');
    }
    
    // Conceptverzoek
    if (analyse.dsoAnalyse.bevoegdGezag?.conceptverzoekToegestaan !== undefined) {
      lines.push(`**Conceptverzoek toegestaan**: ${analyse.dsoAnalyse.bevoegdGezag.conceptverzoekToegestaan ? 'Ja' : 'Nee'}`);
      lines.push('');
    }
    
    // RTR Activiteiten
    if (analyse.dsoAnalyse.rtrGegevens?.activiteiten?.length) {
      lines.push('#### Beschikbare Activiteiten (RTR)');
      const topActiviteiten = analyse.dsoAnalyse.rtrGegevens.activiteiten.slice(0, 10);
      for (const act of topActiviteiten) {
        lines.push(`- ${act.naam}${act.groep ? ` (${act.groep})` : ''}`);
      }
      if (analyse.dsoAnalyse.rtrGegevens.totaalAantalActiviteiten > 10) {
        lines.push(`- ... en ${analyse.dsoAnalyse.rtrGegevens.totaalAantalActiviteiten - 10} meer`);
      }
      lines.push('');
    }
    
    // Fouten
    if (analyse.dsoAnalyse.errors?.length) {
      lines.push('#### DSO API Meldingen');
      for (const error of analyse.dsoAnalyse.errors) {
        lines.push(`- ⚠️ ${error}`);
      }
      lines.push('');
    }
  }
  
  // PDOK Gebiedsanalyse (Natura 2000, Monumenten, Beschermd Gezicht, BAG)
  if (analyse.pdokAnalyse) {
    // Bepaal relevantie op basis van toepasselijke regels (als proxy voor activiteiten)
    const activiteitenUitRegels = analyse.toepasselijkeRegels
      .filter(r => r.includes('activiteit') || r.includes('functie') || r.includes('verbouw'))
      .slice(0, 5);
    const relevantie = activiteitenUitRegels.length > 0 ? bepaalRelevantie(activiteitenUitRegels) : undefined;
    lines.push(formatPDOKVoorAI(analyse.pdokAnalyse, relevantie));
    lines.push('');
  }
  
  // Milieuaspecten (geluid, geur, risico, bodem)
  if (analyse.milieuAnalyse) {
    lines.push(formatMilieuVoorAI(analyse.milieuAnalyse));
    lines.push('');
  }
  
  // Ruimtelijke Plannen (dubbelbestemmingen, enkelbestemmingen)
  if (analyse.ruimtelijkePlannen) {
    lines.push(formatRuimtelijkePlannenVoorAI(analyse.ruimtelijkePlannen));
    lines.push('');
  }

  // AERIUS stikstofberekening vereiste
  if (analyse.aeriusVereiste) {
    lines.push(formatAeriusVoorAI(analyse.aeriusVereiste));
    lines.push('');
  }

  // Vereiste onderzoeken
  if (analyse.onderzoekenResultaat) {
    lines.push(formatOnderzoekenVoorAI(analyse.onderzoekenResultaat));
    lines.push('');
  }

  // BAG gebouwgegevens (bouwjaar, oppervlakte, gebruiksdoel)
  if (analyse.bagInfo) {
    lines.push(formatBagInfoVoorAI(analyse.bagInfo));
    lines.push('');
  }
  
  return lines.join('\n');
}
