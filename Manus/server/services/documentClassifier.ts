/**
 * Document Classifier Service
 * 
 * AI-gestuurde classificatie van handmatig geüploade beleidsdocumenten.
 * Analyseert de inhoud en suggereert:
 * - Laag (rijks, provinciaal, regionaal, gemeentelijk)
 * - Type (welstandsnota, parkeerbeleid, erfgoedbeleid, etc.)
 * - Categorie en relevantieTags
 */

import { invokeLLM } from '../_core/llm';

export type DocumentLaag = 'rijks' | 'provinciaal' | 'regionaal' | 'gemeentelijk';
export type DocumentType = 'welstandsnota' | 'parkeerbeleid' | 'erfgoedbeleid' | 'beleidsregels_afwijken' | 'gezondheidsbeleid' | 'groenbeleid' | 'milieubeleid' | 'waterbeleid' | 'verkeerbeleid' | 'overig';

export interface ClassificatieSuggestie {
  laag: DocumentLaag;
  laagMotivering: string;
  documentType: DocumentType;
  typeMotivering: string;
  relevantieTags: string[];
  samenvatting: string;
  toepassingscriteria: string;
  juridischeStatus: 'normstellend' | 'richtinggevend' | 'afwegingskader';
  isBindend: boolean;
  heeftTweezijdigeWerking: boolean;
  confidence: number; // 0-100
}

export interface ClassificatieInput {
  documentNaam: string;
  documentInhoud?: string; // Optioneel: tekst uit PDF/document
  documentUrl?: string;
  gemeenteNaam?: string;
  provincieNaam?: string;
}

/**
 * Classificeer een beleidsdocument met AI
 */
export async function classificeerDocument(input: ClassificatieInput): Promise<ClassificatieSuggestie> {
  const systemPrompt = `Je bent een expert in Nederlandse ruimtelijke ordening en omgevingsrecht.
Je taak is om beleidsdocumenten te classificeren voor de kennisbank van een gemeente.

CLASSIFICATIE CRITERIA:

## Laag bepalen:
- **rijks**: Landelijke wetgeving, AMvB's, ministeriële regelingen (bijv. Besluit bouwwerken leefomgeving, Omgevingswet)
- **provinciaal**: Provinciale verordeningen, omgevingsvisies, instructieregels (bijv. POV Noord-Holland)
- **regionaal**: Beleid van waterschap, veiligheidsregio, omgevingsdienst, GGD, recreatieschap (bijv. Keur Hoogheemraadschap, Recreatieschap West-Friesland)
- **gemeentelijk**: Lokaal beleid, welstandsnota's, bestemmingsplannen (bijv. Welstandsnota gemeente Hoorn)

## Document type bepalen:
- **welstandsnota**: Welstandscriteria, beeldkwaliteitsplannen, welstandsbeleid
- **parkeerbeleid**: Parkeernormen, parkeervisie, CROW-richtlijnen
- **erfgoedbeleid**: Monumentenbeleid, cultuurhistorie, beschermd gezicht
- **beleidsregels_afwijken**: BOPA-beleid, afwijkingsregels, kruimelgevallen
- **gezondheidsbeleid**: GGD-richtlijnen, gezonde leefomgeving, luchtkwaliteit
- **groenbeleid**: Bomenbeleid, groenstructuur, ecologie
- **milieubeleid**: Geluid, geur, bodem, externe veiligheid
- **waterbeleid**: Waterhuishouding, hemelwater, riolering
- **verkeerbeleid**: Mobiliteit, verkeersveiligheid, ontsluiting
- **overig**: Overige beleidsdocumenten

## Juridische status:
- **normstellend**: Bindende regels, direct toetsbaar (bijv. bestemmingsplan)
- **richtinggevend**: Beleidsuitgangspunten, afweegbaar (bijv. welstandsnota)
- **afwegingskader**: Hulpmiddel bij afweging, niet bindend (bijv. handreiking)

## Tweezijdige werking:
- Ja als het document zowel nieuwe als bestaande functies beschermt
- Relevant voor BOPA-aanvragen waar bestaande rechten in het geding kunnen zijn

Geef een confidence score (0-100) gebaseerd op hoe zeker je bent van de classificatie.`;

  const userPrompt = `Classificeer dit beleidsdocument:

**Documentnaam:** ${input.documentNaam}
${input.gemeenteNaam ? `**Gemeente:** ${input.gemeenteNaam}` : ''}
${input.provincieNaam ? `**Provincie:** ${input.provincieNaam}` : ''}
${input.documentUrl ? `**URL:** ${input.documentUrl}` : ''}

${input.documentInhoud ? `**Inhoud (fragment):**
${input.documentInhoud.substring(0, 3000)}...` : ''}

Analyseer de documentnaam${input.documentInhoud ? ' en inhoud' : ''} en geef een classificatie.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'document_classificatie',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              laag: { 
                type: 'string', 
                enum: ['rijks', 'provinciaal', 'regionaal', 'gemeentelijk'] 
              },
              laagMotivering: { 
                type: 'string',
                description: 'Korte uitleg waarom deze laag is gekozen'
              },
              documentType: { 
                type: 'string', 
                enum: ['welstandsnota', 'parkeerbeleid', 'erfgoedbeleid', 'beleidsregels_afwijken', 'gezondheidsbeleid', 'groenbeleid', 'milieubeleid', 'waterbeleid', 'verkeerbeleid', 'overig'] 
              },
              typeMotivering: {
                type: 'string',
                description: 'Korte uitleg waarom dit type is gekozen'
              },
              relevantieTags: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Keywords voor matching (bijv. dakkapel, uitbouw, monument)'
              },
              samenvatting: { 
                type: 'string',
                description: 'Korte samenvatting van het document (max 200 woorden)'
              },
              toepassingscriteria: {
                type: 'string',
                description: 'Wanneer is dit document van toepassing? (bijv. "Bij aanvragen voor dakkapellen in beschermd stadsgezicht")'
              },
              juridischeStatus: { 
                type: 'string', 
                enum: ['normstellend', 'richtinggevend', 'afwegingskader'] 
              },
              isBindend: { type: 'boolean' },
              heeftTweezijdigeWerking: { type: 'boolean' },
              confidence: { 
                type: 'number',
                description: 'Zekerheid van classificatie (0-100)'
              }
            },
            required: [
              'laag', 'laagMotivering', 'documentType', 'typeMotivering',
              'relevantieTags', 'samenvatting', 'toepassingscriteria',
              'juridischeStatus', 'isBindend', 'heeftTweezijdigeWerking', 'confidence'
            ],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error('Geen response van AI');
    }

    // Handle both string and array content types
    const content = typeof messageContent === 'string' 
      ? messageContent 
      : Array.isArray(messageContent) 
        ? messageContent.find(c => c.type === 'text')?.text || ''
        : '';
    
    if (!content) {
      throw new Error('Geen tekst content in response');
    }

    const result = JSON.parse(content) as ClassificatieSuggestie;
    return result;
  } catch (error) {
    console.error('[DocumentClassifier] Error:', error);
    
    // Fallback: basis classificatie op basis van documentnaam
    return fallbackClassificatie(input);
  }
}

/**
 * Fallback classificatie wanneer AI niet beschikbaar is
 */
function fallbackClassificatie(input: ClassificatieInput): ClassificatieSuggestie {
  const naam = input.documentNaam.toLowerCase();
  
  // Bepaal laag op basis van keywords
  let laag: DocumentLaag = 'gemeentelijk';
  let laagMotivering = 'Standaard: gemeentelijk niveau aangenomen';
  
  if (naam.includes('wet') || naam.includes('besluit') || naam.includes('amvb') || naam.includes('ministeri')) {
    laag = 'rijks';
    laagMotivering = 'Bevat "wet", "besluit" of "ministerieel" - rijksniveau';
  } else if (naam.includes('provinc') || naam.includes('pov') || naam.includes('omgevingsvisie')) {
    laag = 'provinciaal';
    laagMotivering = 'Bevat "provinciaal" of "POV" - provinciaal niveau';
  } else if (naam.includes('waterschap') || naam.includes('keur') || naam.includes('veiligheidsregio') || naam.includes('omgevingsdienst') || naam.includes('ggd')) {
    laag = 'regionaal';
    laagMotivering = 'Bevat regionale organisatie naam - regionaal niveau';
  }
  
  // Bepaal type op basis van keywords
  let documentType: DocumentType = 'overig';
  let typeMotivering = 'Geen specifiek type herkend';
  
  if (naam.includes('welstand') || naam.includes('beeldkwaliteit')) {
    documentType = 'welstandsnota';
    typeMotivering = 'Bevat "welstand" of "beeldkwaliteit"';
  } else if (naam.includes('parkeer') || naam.includes('mobiliteit')) {
    documentType = 'parkeerbeleid';
    typeMotivering = 'Bevat "parkeer" of "mobiliteit"';
  } else if (naam.includes('erfgoed') || naam.includes('monument') || naam.includes('cultuurhistor')) {
    documentType = 'erfgoedbeleid';
    typeMotivering = 'Bevat "erfgoed", "monument" of "cultuurhistorie"';
  } else if (naam.includes('afwijk') || naam.includes('bopa') || naam.includes('kruimel')) {
    documentType = 'beleidsregels_afwijken';
    typeMotivering = 'Bevat "afwijken", "BOPA" of "kruimel"';
  } else if (naam.includes('gezond') || naam.includes('ggd') || naam.includes('lucht')) {
    documentType = 'gezondheidsbeleid';
    typeMotivering = 'Bevat "gezondheid", "GGD" of "lucht"';
  } else if (naam.includes('groen') || naam.includes('boom') || naam.includes('ecolog')) {
    documentType = 'groenbeleid';
    typeMotivering = 'Bevat "groen", "boom" of "ecologie"';
  } else if (naam.includes('milieu') || naam.includes('geluid') || naam.includes('geur') || naam.includes('bodem')) {
    documentType = 'milieubeleid';
    typeMotivering = 'Bevat "milieu", "geluid", "geur" of "bodem"';
  } else if (naam.includes('water') || naam.includes('riol') || naam.includes('hemelwater')) {
    documentType = 'waterbeleid';
    typeMotivering = 'Bevat "water", "riool" of "hemelwater"';
  } else if (naam.includes('verkeer') || naam.includes('weg') || naam.includes('fiets')) {
    documentType = 'verkeerbeleid';
    typeMotivering = 'Bevat "verkeer", "weg" of "fiets"';
  }
  
  return {
    laag,
    laagMotivering,
    documentType,
    typeMotivering,
    relevantieTags: [],
    samenvatting: `Document "${input.documentNaam}" - automatische classificatie op basis van documentnaam.`,
    toepassingscriteria: 'Nader te bepalen na handmatige review.',
    juridischeStatus: 'richtinggevend',
    isBindend: false,
    heeftTweezijdigeWerking: false,
    confidence: 30 // Lage confidence voor fallback
  };
}

/**
 * Batch classificatie voor meerdere documenten
 */
export async function classificeerDocumentenBatch(
  documenten: ClassificatieInput[]
): Promise<Map<string, ClassificatieSuggestie>> {
  const results = new Map<string, ClassificatieSuggestie>();
  
  // Verwerk parallel met max 3 concurrent
  const batchSize = 3;
  for (let i = 0; i < documenten.length; i += batchSize) {
    const batch = documenten.slice(i, i + batchSize);
    const promises = batch.map(async (doc) => {
      const result = await classificeerDocument(doc);
      return { naam: doc.documentNaam, result };
    });
    
    const batchResults = await Promise.all(promises);
    for (const { naam, result } of batchResults) {
      results.set(naam, result);
    }
  }
  
  return results;
}
