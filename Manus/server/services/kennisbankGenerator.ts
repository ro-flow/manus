/**
 * Kennisbank Generator Service - Gelaagde Structuur
 * 
 * AI-gestuurde automatische vulling van de kennisbank met hergebruik per laag:
 * - Rijks: Gedeeld door alle gemeenten
 * - Provinciaal: Gedeeld per provincie
 * - Regionaal: Gedeeld per regio-code (waterschap, VR, OD, GGD)
 * - Gemeentelijk: Uniek per gemeente
 */

import { invokeLLM } from '../_core/llm';

// Types voor gelaagde kennisbank
export type KennisbankLaag = 'rijks' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
export type ItemType = 'adviseur' | 'beleidsdocument' | 'toetsingskader';

export interface GelaagdKennisbankItem {
  id?: number;
  itemType: ItemType;
  laag: KennisbankLaag;
  
  // Scope identifiers
  scopeProvincie?: string;
  scopeRegioCode?: string;
  scopeGemeenteId?: number;
  
  // Content
  naam: string;
  samenvatting?: string;
  toepassingscriteria?: string;
  triggers?: string[];
  
  // Adviseur-specifiek
  adviseurType?: 'intern' | 'extern';
  adviseurCategorie?: string;
  adviseurTermijnWeken?: number;
  adviseurGrondslag?: string;
  adviseurIsVerplicht?: boolean;
  adviseurContactEmail?: string;
  
  // Document-specifiek
  documentType?: string;
  documentUrl?: string;
  documentZoekterm?: string;
  relevantieTags?: string;
  
  // Toetsingskader-specifiek
  toetsingskaderBeschrijving?: string;
  
  // Status
  status: 'concept' | 'actief' | 'inactief';
  bron: 'ai_gegenereerd' | 'handmatig' | 'import';
}

export interface GemeenteContext {
  gemeenteId: number;
  gemeenteNaam: string;
  provincie: string;
  waterschapCode?: string;
  waterschapNaam?: string;
  vrCode?: string;
  vrNaam?: string;
  odCode?: string;
  odNaam?: string;
  ggdCode?: string;
  ggdNaam?: string;
}

export interface AdviseurSuggestie {
  naam: string;
  type: 'intern' | 'extern';
  categorie: string;
  triggers: string[];
  termijnWeken: number;
  grondslag: string;
  contactInfo?: string;
  isVerplicht: boolean;
  // Nieuwe velden voor gelaagde structuur
  laag: KennisbankLaag;
  scopeCode?: string; // regioCode voor regionaal, provincieNaam voor provinciaal
  samenvatting?: string;
  toepassingscriteria?: string;
}

export interface BeleidsdocumentSuggestie {
  naam: string;
  type: 'welstandsnota' | 'parkeerbeleid' | 'erfgoedbeleid' | 'beleidsregels_afwijken' | 'gezondheidsbeleid' | 'groenbeleid' | 'overig';
  beschrijving: string;
  zoekterm: string;
  relevantieTags: string[];
  // Nieuwe velden voor gelaagde structuur
  laag: KennisbankLaag;
  scopeCode?: string;
  toepassingscriteria?: string;
}

/**
 * Genereer kennisbank items voor een gemeente met AI
 * Items worden automatisch gecategoriseerd naar de juiste laag
 */
export async function generateKennisbankForGemeente(
  gemeente: GemeenteContext
): Promise<{
  adviseurs: AdviseurSuggestie[];
  beleidsdocumenten: BeleidsdocumentSuggestie[];
}> {
  
  const systemPrompt = `Je bent een expert in Nederlandse omgevingsvergunningen en de Omgevingswet.
Je taak is om de kennisbank te vullen voor een specifieke gemeente.

BELANGRIJK - GELAAGDE STRUCTUUR:
Items moeten worden gecategoriseerd naar de juiste laag voor hergebruik:

1. REGIONAAL (laag: "regionaal") - Gedeeld door alle gemeenten in dezelfde regio:
   - Waterschap adviseurs (bijv. HHNK voor alle West-Friese gemeenten)
   - Veiligheidsregio adviseurs (bijv. VR NHN)
   - Omgevingsdienst adviseurs (bijv. OD NHN)
   - GGD adviseurs (bijv. GGD Hollands Noorden)
   - Recreatieschap adviseurs indien van toepassing
   - Gebruik de regioCode als scopeCode (bijv. "hhnk", "vr-nhn")

2. PROVINCIAAL (laag: "provinciaal") - Gedeeld door alle gemeenten in dezelfde provincie:
   - Provinciale adviseurs (bijv. Provincie Noord-Holland, Team Ruimtelijke Ordening)
   - Provinciale Omgevingsverordening
   - Gebruik de provincienaam als scopeCode

3. GEMEENTELIJK (laag: "gemeentelijk") - Uniek per gemeente:
   - Interne gemeentelijke adviseurs (welstand, verkeer, archeologie)
   - Gemeentelijke beleidsdocumenten (welstandsnota, parkeerbeleid)
   - Lokale beleidsregels

VOOR ELKE ADVISEUR, geef:
- samenvatting: Korte beschrijving van de rol (max 100 woorden)
- toepassingscriteria: Wanneer moet deze adviseur worden geraadpleegd?
- triggers: Specifieke situaties/keywords die advies triggeren

VOOR ELK DOCUMENT, geef:
- beschrijving: Wat regelt dit document?
- toepassingscriteria: Bij welke aanvragen is dit relevant?
- relevantieTags: Keywords voor matching`;

  const userPrompt = `Genereer kennisbank items voor:

Gemeente: ${gemeente.gemeenteNaam} (ID: ${gemeente.gemeenteId})
Provincie: ${gemeente.provincie}
Waterschap: ${gemeente.waterschapNaam || 'Onbekend'} (code: ${gemeente.waterschapCode || 'onbekend'})
Veiligheidsregio: ${gemeente.vrNaam || 'Onbekend'} (code: ${gemeente.vrCode || 'onbekend'})
Omgevingsdienst: ${gemeente.odNaam || 'Onbekend'} (code: ${gemeente.odCode || 'onbekend'})
GGD: ${gemeente.ggdNaam || 'Onbekend'} (code: ${gemeente.ggdCode || 'onbekend'})

Genereer:

1. ADVISEURS (minimaal 12):
   - 4+ REGIONALE adviseurs (waterschap, VR, OD, GGD, recreatieschap)
   - 1-2 PROVINCIALE adviseurs
   - 5+ GEMEENTELIJKE adviseurs (welstand, verkeer, archeologie, bodem, etc.)

2. BELEIDSDOCUMENTEN (minimaal 8):
   - 1-2 PROVINCIALE documenten
   - 6+ GEMEENTELIJKE documenten (welstandsnota, parkeerbeleid, erfgoedbeleid, etc.)

Zorg dat elke adviseur en document een duidelijke samenvatting en toepassingscriteria heeft.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'kennisbank_gelaagd',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              adviseurs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    naam: { type: 'string' },
                    type: { type: 'string', enum: ['intern', 'extern'] },
                    categorie: { type: 'string' },
                    laag: { type: 'string', enum: ['regionaal', 'provinciaal', 'gemeentelijk'] },
                    scopeCode: { type: 'string', description: 'regioCode voor regionaal, provincieNaam voor provinciaal, leeg voor gemeentelijk' },
                    samenvatting: { type: 'string', description: 'Korte beschrijving van de rol (max 100 woorden)' },
                    toepassingscriteria: { type: 'string', description: 'Wanneer moet deze adviseur worden geraadpleegd?' },
                    triggers: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Specifieke situaties/keywords die advies triggeren'
                    },
                    termijnWeken: { type: 'integer' },
                    grondslag: { type: 'string' },
                    contactInfo: { type: 'string' },
                    isVerplicht: { type: 'boolean' },
                  },
                  required: ['naam', 'type', 'categorie', 'laag', 'scopeCode', 'samenvatting', 'toepassingscriteria', 'triggers', 'termijnWeken', 'grondslag', 'isVerplicht'],
                  additionalProperties: false,
                },
              },
              beleidsdocumenten: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    naam: { type: 'string' },
                    type: { 
                      type: 'string', 
                      enum: ['welstandsnota', 'parkeerbeleid', 'erfgoedbeleid', 'beleidsregels_afwijken', 'gezondheidsbeleid', 'groenbeleid', 'overig'] 
                    },
                    laag: { type: 'string', enum: ['provinciaal', 'gemeentelijk'] },
                    scopeCode: { type: 'string' },
                    beschrijving: { type: 'string' },
                    toepassingscriteria: { type: 'string', description: 'Bij welke aanvragen is dit relevant?' },
                    zoekterm: { type: 'string', description: 'Zoekterm om dit document online te vinden' },
                    relevantieTags: { 
                      type: 'array', 
                      items: { type: 'string' } 
                    },
                  },
                  required: ['naam', 'type', 'laag', 'scopeCode', 'beschrijving', 'toepassingscriteria', 'zoekterm', 'relevantieTags'],
                  additionalProperties: false,
                },
              },
            },
            required: ['adviseurs', 'beleidsdocumenten'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Geen response van AI');
    }

    const result = JSON.parse(content);
    
    console.log(`[KennisbankGenerator] Generated ${result.adviseurs.length} adviseurs and ${result.beleidsdocumenten.length} documents for ${gemeente.gemeenteNaam}`);

    return {
      adviseurs: result.adviseurs,
      beleidsdocumenten: result.beleidsdocumenten,
    };
  } catch (error) {
    console.error('[KennisbankGenerator] Error:', error);
    throw error;
  }
}

/**
 * Check of een regionaal item al bestaat voor een bepaalde regio-code
 */
export function checkRegionaalItemExists(
  existingItems: GelaagdKennisbankItem[],
  naam: string,
  regioCode: string
): boolean {
  return existingItems.some(
    item => item.laag === 'regionaal' && 
            item.scopeRegioCode === regioCode && 
            item.naam.toLowerCase() === naam.toLowerCase()
  );
}

/**
 * Check of een provinciaal item al bestaat voor een bepaalde provincie
 */
export function checkProvinciaalItemExists(
  existingItems: GelaagdKennisbankItem[],
  naam: string,
  provincie: string
): boolean {
  return existingItems.some(
    item => item.laag === 'provinciaal' && 
            item.scopeProvincie === provincie && 
            item.naam.toLowerCase() === naam.toLowerCase()
  );
}

/**
 * Haal alle kennisbank items op die van toepassing zijn voor een gemeente
 * Dit combineert rijks, provinciaal, regionaal en gemeentelijk
 */
export function getKennisbankForGemeente(
  allItems: GelaagdKennisbankItem[],
  gemeente: GemeenteContext
): GelaagdKennisbankItem[] {
  return allItems.filter(item => {
    // Rijks items gelden voor iedereen
    if (item.laag === 'rijks') return true;
    
    // Provinciaal items gelden voor gemeenten in die provincie
    if (item.laag === 'provinciaal') {
      return item.scopeProvincie === gemeente.provincie;
    }
    
    // Regionaal items gelden voor gemeenten met dezelfde regio-code
    if (item.laag === 'regionaal') {
      const regioCodes = [
        gemeente.waterschapCode,
        gemeente.vrCode,
        gemeente.odCode,
        gemeente.ggdCode,
      ].filter(Boolean);
      return regioCodes.includes(item.scopeRegioCode || '');
    }
    
    // Gemeentelijk items gelden alleen voor die gemeente
    if (item.laag === 'gemeentelijk') {
      return item.scopeGemeenteId === gemeente.gemeenteId;
    }
    
    return false;
  });
}

/**
 * Converteer AI suggestie naar database item
 */
export function adviseurSuggestieToDbItem(
  suggestie: AdviseurSuggestie,
  gemeente: GemeenteContext
): Omit<GelaagdKennisbankItem, 'id'> {
  return {
    itemType: 'adviseur',
    laag: suggestie.laag,
    scopeProvincie: suggestie.laag === 'provinciaal' ? gemeente.provincie : undefined,
    scopeRegioCode: suggestie.laag === 'regionaal' ? suggestie.scopeCode : undefined,
    scopeGemeenteId: suggestie.laag === 'gemeentelijk' ? gemeente.gemeenteId : undefined,
    naam: suggestie.naam,
    samenvatting: suggestie.samenvatting,
    toepassingscriteria: suggestie.toepassingscriteria,
    triggers: suggestie.triggers,
    adviseurType: suggestie.type,
    adviseurCategorie: suggestie.categorie,
    adviseurTermijnWeken: suggestie.termijnWeken,
    adviseurGrondslag: suggestie.grondslag,
    adviseurIsVerplicht: suggestie.isVerplicht,
    adviseurContactEmail: suggestie.contactInfo,
    status: 'concept',
    bron: 'ai_gegenereerd',
  };
}

/**
 * Converteer document suggestie naar database item
 */
export function documentSuggestieToDbItem(
  suggestie: BeleidsdocumentSuggestie,
  gemeente: GemeenteContext
): Omit<GelaagdKennisbankItem, 'id'> {
  return {
    itemType: 'beleidsdocument',
    laag: suggestie.laag,
    scopeProvincie: suggestie.laag === 'provinciaal' ? gemeente.provincie : undefined,
    scopeRegioCode: undefined, // Documenten zijn niet regionaal
    scopeGemeenteId: suggestie.laag === 'gemeentelijk' ? gemeente.gemeenteId : undefined,
    naam: suggestie.naam,
    samenvatting: suggestie.beschrijving,
    toepassingscriteria: suggestie.toepassingscriteria,
    triggers: suggestie.relevantieTags,
    documentType: suggestie.type,
    documentZoekterm: suggestie.zoekterm,
    relevantieTags: suggestie.relevantieTags.join(', '),
    status: 'concept',
    bron: 'ai_gegenereerd',
  };
}

/**
 * Statistieken over kennisbank dekking per laag
 */
export interface KennisbankStats {
  totaal: number;
  perLaag: {
    rijks: number;
    provinciaal: number;
    regionaal: number;
    gemeentelijk: number;
  };
  perType: {
    adviseur: number;
    beleidsdocument: number;
    toetsingskader: number;
  };
  hergebruikPotentieel: {
    regionaleItems: number;
    provincialeItems: number;
    gemeentenDieProfiteren: number;
  };
}

export function calculateKennisbankStats(
  items: GelaagdKennisbankItem[],
  gemeenteCount: number
): KennisbankStats {
  const regionaleItems = items.filter(i => i.laag === 'regionaal').length;
  const provincialeItems = items.filter(i => i.laag === 'provinciaal').length;
  
  return {
    totaal: items.length,
    perLaag: {
      rijks: items.filter(i => i.laag === 'rijks').length,
      provinciaal: provincialeItems,
      regionaal: regionaleItems,
      gemeentelijk: items.filter(i => i.laag === 'gemeentelijk').length,
    },
    perType: {
      adviseur: items.filter(i => i.itemType === 'adviseur').length,
      beleidsdocument: items.filter(i => i.itemType === 'beleidsdocument').length,
      toetsingskader: items.filter(i => i.itemType === 'toetsingskader').length,
    },
    hergebruikPotentieel: {
      regionaleItems,
      provincialeItems,
      gemeentenDieProfiteren: gemeenteCount,
    },
  };
}
