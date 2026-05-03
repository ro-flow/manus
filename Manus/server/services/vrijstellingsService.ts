/**
 * Vrijstellings Service - Automatisch ophalen en opslaan van vrijstellingsgrenzen
 * 
 * Haalt vrijstellingsgrenzen op uit omgevingsplan regels en slaat deze op
 * in de kennisbank onder de gemeentelaag.
 * 
 * Vrijstellingsgrenzen voor archeologie komen typisch uit:
 * - Omgevingsplan regels (via Ruimtelijkeplannen.nl)
 * - Archeologische beleidskaart
 * - Erfgoedverordening
 */

import { getDb } from '../db';
import { kennisbankItems, gemeenten, type KennisbankItem } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { invokeLLM } from '../_core/llm';
import * as ruimtelijkeplannenApi from './ruimtelijkeplannenApiService';

// Standaard vrijstellingsgrenzen (landelijk gangbaar)
export const STANDAARD_VRIJSTELLINGEN = {
  archeologieDiepteCm: 30,
  archeologieOppervlakteM2: 100,
  archeologieVolumeM3: 30, // Sommige gemeenten gebruiken volume
};

export interface VrijstellingsGrenzen {
  archeologieDiepteCm: number;
  archeologieOppervlakteM2: number;
  archeologieVolumeM3?: number;
  bodemVrijstellingsgebieden?: string[];
  bodemVrijstellingsPostcodes?: string[];
  bron: string;
  laatstBijgewerkt: Date;
}

/**
 * Haal vrijstellingsgrenzen op voor een gemeente
 * Eerst uit database, anders ophalen uit omgevingsplan
 */
export async function haalVrijstellingsGrenzen(
  gemeenteId: number,
  gemeenteNaam: string
): Promise<VrijstellingsGrenzen> {
  // Check of we al vrijstellingsgrenzen hebben in de database
  const db = await getDb();
  if (!db) {
    return {
      archeologieDiepteCm: STANDAARD_VRIJSTELLINGEN.archeologieDiepteCm,
      archeologieOppervlakteM2: STANDAARD_VRIJSTELLINGEN.archeologieOppervlakteM2,
      bron: 'standaard landelijke waarden (database niet beschikbaar)',
      laatstBijgewerkt: new Date()
    };
  }
  
  const bestaand = await db
    .select()
    .from(gemeenten)
    .where(eq(gemeenten.id, gemeenteId))
    .limit(1);

  if (bestaand.length > 0 && bestaand[0].archeologieVrijstellingDiepteCm) {
    return {
      archeologieDiepteCm: bestaand[0].archeologieVrijstellingDiepteCm || STANDAARD_VRIJSTELLINGEN.archeologieDiepteCm,
      archeologieOppervlakteM2: bestaand[0].archeologieVrijstellingOppervlakteM2 || STANDAARD_VRIJSTELLINGEN.archeologieOppervlakteM2,
      bodemVrijstellingsgebieden: bestaand[0].bodemonderzoekVrijstellingGebieden 
        ? JSON.parse(bestaand[0].bodemonderzoekVrijstellingGebieden) 
        : [],
      bodemVrijstellingsPostcodes: bestaand[0].bodemonderzoekVrijstellingPostcodes
        ? JSON.parse(bestaand[0].bodemonderzoekVrijstellingPostcodes)
        : [],
      bron: 'gemeentelijke database (eerder opgehaald)',
      laatstBijgewerkt: bestaand[0].updatedAt || new Date()
    };
  }

  // Anders: probeer op te halen uit omgevingsplan
  return await haalVrijstellingenUitOmgevingsplan(gemeenteId, gemeenteNaam);
}

/**
 * Haal vrijstellingsgrenzen op uit omgevingsplan tekst via AI
 */
async function haalVrijstellingenUitOmgevingsplan(
  gemeenteId: number,
  gemeenteNaam: string,
  gemeenteCode?: string
): Promise<VrijstellingsGrenzen> {
  console.log(`[Vrijstellingen] Ophalen vrijstellingsgrenzen voor ${gemeenteNaam}...`);

  // STAP 1: Probeer eerst de officiële Ruimtelijkeplannen.nl API
  if (gemeenteCode && await ruimtelijkeplannenApi.isApiAvailable()) {
    console.log(`[Vrijstellingen] Probeer officiële API voor gemeente ${gemeenteCode}...`);
    try {
      const apiVrijstellingen = await ruimtelijkeplannenApi.haalOmgevingsplanVrijstellingen(gemeenteCode);
      
      if (apiVrijstellingen?.archeologieVrijstelling) {
        console.log(`[Vrijstellingen] Gevonden via API: ${apiVrijstellingen.archeologieVrijstelling.diepte}cm, ${apiVrijstellingen.archeologieVrijstelling.oppervlakte}m²`);
        
        // Sla op in database
        await slaVrijstellingenOp(gemeenteId, {
          archeologieDiepteCm: apiVrijstellingen.archeologieVrijstelling.diepte,
          archeologieOppervlakteM2: apiVrijstellingen.archeologieVrijstelling.oppervlakte
        });

        return {
          archeologieDiepteCm: apiVrijstellingen.archeologieVrijstelling.diepte,
          archeologieOppervlakteM2: apiVrijstellingen.archeologieVrijstelling.oppervlakte,
          bodemVrijstellingsgebieden: apiVrijstellingen.bodemVrijstellingsgebieden,
          bron: apiVrijstellingen.archeologieVrijstelling.bron,
          laatstBijgewerkt: new Date()
        };
      }
    } catch (apiError) {
      console.warn('[Vrijstellingen] API ophalen mislukt, fallback naar kennisbank:', apiError);
    }
  }

  // STAP 2: Fallback naar kennisbank en AI extractie
  try {
    // Zoek naar bestaande kennisbank items met archeologie regels
    const db = await getDb();
    if (!db) {
      throw new Error('Database niet beschikbaar');
    }
    
    const archeologieItems: KennisbankItem[] = await db
      .select()
      .from(kennisbankItems)
      .where(
        and(
          eq(kennisbankItems.scopeGemeenteId, gemeenteId),
          eq(kennisbankItems.laag, 'gemeentelijk')
        )
      )
      .limit(10);

    // Zoek specifiek naar archeologie gerelateerde items
    const archeologieContext = archeologieItems
      .filter(item => 
        item.naam?.toLowerCase().includes('archeologie') ||
        item.naam?.toLowerCase().includes('erfgoed') ||
        item.samenvatting?.toLowerCase().includes('archeologie')
      )
      .map(item => `${item.naam}: ${item.samenvatting || item.toepassingscriteria || ''}`)
      .join('\n');

    if (archeologieContext) {
      // Gebruik AI om vrijstellingsgrenzen te extraheren
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `Je bent een expert in Nederlandse omgevingsplannen en archeologisch beleid.
Analyseer de gegeven tekst en extraheer de vrijstellingsgrenzen voor archeologisch onderzoek.

Zoek naar:
1. Dieptegrens (in cm) - vaak 30, 40, 50 of 100 cm
2. Oppervlaktegrens (in m²) - vaak 100, 200, 500 of 1000 m²
3. Volumegrens (in m³) - soms 30, 50 of 100 m³

Geef ALLEEN een JSON object terug, geen andere tekst.`
          },
          {
            role: 'user',
            content: `Gemeente: ${gemeenteNaam}

Beschikbare teksten over archeologie:
${archeologieContext || 'Geen specifieke teksten gevonden.'}

Extraheer de vrijstellingsgrenzen. Als je geen specifieke waarden vindt, gebruik dan de standaardwaarden (30cm, 100m²).`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'vrijstellingsgrenzen',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                diepteCm: { type: 'integer', description: 'Vrijstellingsgrens diepte in cm' },
                oppervlakteM2: { type: 'integer', description: 'Vrijstellingsgrens oppervlakte in m²' },
                volumeM3: { type: 'integer', description: 'Vrijstellingsgrens volume in m³ (optioneel)' },
                bron: { type: 'string', description: 'Bron van de informatie' },
                toelichting: { type: 'string', description: 'Eventuele toelichting' }
              },
              required: ['diepteCm', 'oppervlakteM2', 'bron'],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      const extracted = JSON.parse(typeof content === 'string' ? content : '{}');

      // Sla op in database
      await slaVrijstellingenOp(gemeenteId, {
        archeologieDiepteCm: extracted.diepteCm || STANDAARD_VRIJSTELLINGEN.archeologieDiepteCm,
        archeologieOppervlakteM2: extracted.oppervlakteM2 || STANDAARD_VRIJSTELLINGEN.archeologieOppervlakteM2,
        archeologieVolumeM3: extracted.volumeM3
      });

      // Sla ook op in kennisbank
      await slaVrijstellingenInKennisbank(gemeenteId, gemeenteNaam, {
        diepteCm: extracted.diepteCm || STANDAARD_VRIJSTELLINGEN.archeologieDiepteCm,
        oppervlakteM2: extracted.oppervlakteM2 || STANDAARD_VRIJSTELLINGEN.archeologieOppervlakteM2,
        volumeM3: extracted.volumeM3,
        bron: extracted.bron,
        toelichting: extracted.toelichting
      });

      return {
        archeologieDiepteCm: extracted.diepteCm || STANDAARD_VRIJSTELLINGEN.archeologieDiepteCm,
        archeologieOppervlakteM2: extracted.oppervlakteM2 || STANDAARD_VRIJSTELLINGEN.archeologieOppervlakteM2,
        archeologieVolumeM3: extracted.volumeM3,
        bron: extracted.bron || 'AI-extractie uit kennisbank (niet-officieel)',
        laatstBijgewerkt: new Date()
      };
    }
  } catch (error) {
    console.error('[Vrijstellingen] Fout bij ophalen uit omgevingsplan:', error);
  }

  // Fallback naar standaardwaarden
  console.log(`[Vrijstellingen] Gebruik standaardwaarden voor ${gemeenteNaam}`);
  return {
    archeologieDiepteCm: STANDAARD_VRIJSTELLINGEN.archeologieDiepteCm,
    archeologieOppervlakteM2: STANDAARD_VRIJSTELLINGEN.archeologieOppervlakteM2,
    bron: 'standaard landelijke waarden (geen gemeentespecifieke data beschikbaar)',
    laatstBijgewerkt: new Date()
  };
}

/**
 * Sla vrijstellingsgrenzen op in gemeenten tabel
 */
async function slaVrijstellingenOp(
  gemeenteId: number,
  grenzen: {
    archeologieDiepteCm: number;
    archeologieOppervlakteM2: number;
    archeologieVolumeM3?: number;
  }
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(gemeenten)
      .set({
        archeologieVrijstellingDiepteCm: grenzen.archeologieDiepteCm,
        archeologieVrijstellingOppervlakteM2: grenzen.archeologieOppervlakteM2
      })
      .where(eq(gemeenten.id, gemeenteId));
    
    console.log(`[Vrijstellingen] Opgeslagen voor gemeente ${gemeenteId}: ${grenzen.archeologieDiepteCm}cm, ${grenzen.archeologieOppervlakteM2}m²`);
  } catch (error) {
    console.error('[Vrijstellingen] Fout bij opslaan:', error);
  }
}

/**
 * Sla vrijstellingsgrenzen op in kennisbank onder gemeentelaag
 */
async function slaVrijstellingenInKennisbank(
  gemeenteId: number,
  gemeenteNaam: string,
  grenzen: {
    diepteCm: number;
    oppervlakteM2: number;
    volumeM3?: number;
    bron?: string;
    toelichting?: string;
  }
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Check of er al een item bestaat
    const bestaand = await db
      .select()
      .from(kennisbankItems)
      .where(
        and(
          eq(kennisbankItems.scopeGemeenteId, gemeenteId),
          eq(kennisbankItems.naam, 'Archeologische vrijstellingsgrenzen')
        )
      )
      .limit(1);

    const samenvatting = `Vrijstellingsgrenzen voor archeologisch onderzoek in ${gemeenteNaam}:
- Diepte: ≤${grenzen.diepteCm}cm
- Oppervlakte: ≤${grenzen.oppervlakteM2}m²
${grenzen.volumeM3 ? `- Volume: ≤${grenzen.volumeM3}m³` : ''}

Bij bodemingrepen binnen deze grenzen is geen archeologisch onderzoek verplicht.
Bron: ${grenzen.bron || 'omgevingsplan'}`;

    const toepassingscriteria = `Archeologisch onderzoek is NIET verplicht als:
- De graafdiepte ≤${grenzen.diepteCm}cm bedraagt, EN
- De verstoringsoppervlakte ≤${grenzen.oppervlakteM2}m² bedraagt
${grenzen.volumeM3 ? `- OF het verstoringsvolume ≤${grenzen.volumeM3}m³ bedraagt` : ''}

Let op: Deze vrijstelling geldt alleen buiten beschermde archeologische monumenten.`;

    if (bestaand.length > 0) {
      // Update bestaand item
      await db
        .update(kennisbankItems)
        .set({
          samenvatting,
          toepassingscriteria,
          status: 'actief'
        })
        .where(eq(kennisbankItems.id, bestaand[0].id));
    } else {
      // Maak nieuw item
      await db.insert(kennisbankItems).values({
        itemType: 'toetsingskader',
        laag: 'gemeentelijk',
        scopeGemeenteId: gemeenteId,
        naam: 'Archeologische vrijstellingsgrenzen',
        samenvatting,
        toepassingscriteria,
        triggers: JSON.stringify(['archeologie', 'bodemingreep', 'graven', 'fundering']),
        status: 'actief',
        bron: 'ai_gegenereerd'
      });
    }

    console.log(`[Vrijstellingen] Opgeslagen in kennisbank voor ${gemeenteNaam}`);
  } catch (error) {
    console.error('[Vrijstellingen] Fout bij opslaan in kennisbank:', error);
  }
}

/**
 * Analyseer of er gegraven wordt op basis van aanvraag
 */
export interface GraafwerkAnalyse {
  heeftGraafwerk: boolean;
  graafdiepteCm: number;
  oppervlakteM2: number;
  diepteBron: 'formulier' | 'schatting'; // Waar komt de graafdiepte vandaan?
  oppervlakteBron: 'formulier' | 'schatting';
  indicatoren: string[];
  zekerheid: 'hoog' | 'middel' | 'laag';
  toelichting: string;
  // Realiteitscheck: vergelijkt opgegeven waarden met verwachte ranges
  realiteitscheck?: {
    diepteRealistisch: boolean;
    oppervlakteRealistisch: boolean;
    verwachteRangeDiepteCm: { min: number; max: number };
    verwachteRangeOppervlakteM2: { min: number; max: number };
    waarschuwingen: string[];
  };
  // Backwards compatibility
  geschatteGraafdiepteCm: number;
  geschatteOppervlakteM2: number;
}

/**
 * Verwachte graafdiepte ranges per activiteittype (in cm)
 * Gebruikt voor realiteitscheck van opgegeven waarden
 */
export const VERWACHTE_GRAAFDIEPTE_RANGES: Record<string, { diepteMin: number; diepteMax: number; oppMin: number; oppMax: number; label: string }> = {
  kelder: { diepteMin: 200, diepteMax: 500, oppMin: 20, oppMax: 500, label: 'Kelder' },
  parkeergarage: { diepteMin: 250, diepteMax: 800, oppMin: 100, oppMax: 5000, label: 'Ondergrondse parkeergarage' },
  zwembad: { diepteMin: 120, diepteMax: 300, oppMin: 15, oppMax: 200, label: 'Zwembad' },
  nieuwbouw: { diepteMin: 40, diepteMax: 200, oppMin: 20, oppMax: 1000, label: 'Nieuwbouw (fundering)' },
  fundering: { diepteMin: 40, diepteMax: 200, oppMin: 10, oppMax: 500, label: 'Funderingswerkzaamheden' },
  aanbouw: { diepteMin: 30, diepteMax: 120, oppMin: 5, oppMax: 100, label: 'Aanbouw/uitbouw' },
  riolering: { diepteMin: 60, diepteMax: 200, oppMin: 5, oppMax: 100, label: 'Rioleringswerkzaamheden' },
  vijver: { diepteMin: 50, diepteMax: 200, oppMin: 5, oppMax: 100, label: 'Vijver/waterpartij' },
  sloop: { diepteMin: 30, diepteMax: 300, oppMin: 10, oppMax: 500, label: 'Sloop (fundering verwijderen)' },
  dakkapel: { diepteMin: 0, diepteMax: 0, oppMin: 0, oppMax: 0, label: 'Dakkapel (geen graafwerk verwacht)' },
  zonnepanelen: { diepteMin: 0, diepteMax: 0, oppMin: 0, oppMax: 0, label: 'Zonnepanelen (geen graafwerk verwacht)' },
};

/**
 * Opgegeven waarden uit het DSO-aanvraagformulier
 */
export interface FormulierGraafgegevens {
  graafdiepteCm?: number;
  oppervlakteM2?: number;
  diepteM?: number; // Soms in meters opgegeven (bijv. uit aanvraagSamenvatting)
}

export async function analyseerGraafwerk(
  activiteiten: string[],
  projectOmschrijving?: string,
  bouwtype?: string,
  formulierGegevens?: FormulierGraafgegevens
): Promise<GraafwerkAnalyse> {
  // Directe indicatoren voor graafwerk
  const graafIndicatoren: string[] = [];
  
  // Check activiteiten
  const activiteitenLower = activiteiten.map(a => a.toLowerCase()).join(' ');
  
  // Detecteer activiteittype voor verwachte ranges
  let gedetecteerdType: string | null = null;
  
  if (activiteitenLower.includes('kelder')) {
    graafIndicatoren.push('Kelder (diepe bodemingreep)');
    gedetecteerdType = 'kelder';
  }
  if (activiteitenLower.includes('parkeergarage') || activiteitenLower.includes('parkeerkelder')) {
    graafIndicatoren.push('Ondergrondse parkeergarage');
    gedetecteerdType = gedetecteerdType || 'parkeergarage';
  }
  if (activiteitenLower.includes('zwembad')) {
    graafIndicatoren.push('Zwembad (diepe bodemingreep)');
    gedetecteerdType = gedetecteerdType || 'zwembad';
  }
  if (activiteitenLower.includes('nieuwbouw')) {
    graafIndicatoren.push('Nieuwbouw (fundering vereist)');
    gedetecteerdType = gedetecteerdType || 'nieuwbouw';
  }
  if (activiteitenLower.includes('fundering') || activiteitenLower.includes('funderingsherstel')) {
    graafIndicatoren.push('Funderingswerkzaamheden');
    gedetecteerdType = gedetecteerdType || 'fundering';
  }
  if (activiteitenLower.includes('riolering') || activiteitenLower.includes('riool')) {
    graafIndicatoren.push('Rioleringswerkzaamheden');
    gedetecteerdType = gedetecteerdType || 'riolering';
  }
  if (activiteitenLower.includes('vijver') || activiteitenLower.includes('waterpartij')) {
    graafIndicatoren.push('Vijver/waterpartij');
    gedetecteerdType = gedetecteerdType || 'vijver';
  }
  if (activiteitenLower.includes('aanbouw') || activiteitenLower.includes('uitbouw')) {
    graafIndicatoren.push('Aanbouw/uitbouw (fundering)');
    gedetecteerdType = gedetecteerdType || 'aanbouw';
  }
  if (activiteitenLower.includes('sloop')) {
    graafIndicatoren.push('Sloop (mogelijk fundering verwijderen)');
    gedetecteerdType = gedetecteerdType || 'sloop';
  }
  if (activiteitenLower.includes('dakkapel')) {
    gedetecteerdType = gedetecteerdType || 'dakkapel';
  }
  if (activiteitenLower.includes('zonnepaneel') || activiteitenLower.includes('zonnepanelen')) {
    gedetecteerdType = gedetecteerdType || 'zonnepanelen';
  }

  // Check projectomschrijving
  if (projectOmschrijving) {
    const omschrijvingLower = projectOmschrijving.toLowerCase();
    if (omschrijvingLower.includes('graven') || omschrijvingLower.includes('graaf')) {
      graafIndicatoren.push('Graafwerkzaamheden genoemd in omschrijving');
    }
    if (omschrijvingLower.includes('ontgraven') || omschrijvingLower.includes('uitgraven')) {
      graafIndicatoren.push('Ontgraving genoemd in omschrijving');
    }
    if (omschrijvingLower.includes('heipalen') || omschrijvingLower.includes('heien')) {
      graafIndicatoren.push('Heiwerkzaamheden');
    }
    if (omschrijvingLower.includes('bouwput')) {
      graafIndicatoren.push('Bouwput genoemd');
    }
  }

  // STAP 1: Gebruik opgegeven waarden uit DSO-formulier als primaire bron
  let graafdiepteCm = 0;
  let oppervlakteM2 = 0;
  let diepteBron: 'formulier' | 'schatting' = 'schatting';
  let oppervlakteBron: 'formulier' | 'schatting' = 'schatting';

  if (formulierGegevens) {
    // Graafdiepte uit formulier (kan in cm of meters zijn)
    if (formulierGegevens.graafdiepteCm && formulierGegevens.graafdiepteCm > 0) {
      graafdiepteCm = formulierGegevens.graafdiepteCm;
      diepteBron = 'formulier';
      graafIndicatoren.push(`Graafdiepte opgegeven in formulier: ${graafdiepteCm}cm`);
    } else if (formulierGegevens.diepteM && formulierGegevens.diepteM > 0) {
      graafdiepteCm = Math.round(formulierGegevens.diepteM * 100);
      diepteBron = 'formulier';
      graafIndicatoren.push(`Graafdiepte opgegeven in formulier: ${formulierGegevens.diepteM}m (${graafdiepteCm}cm)`);
    }
    
    if (formulierGegevens.oppervlakteM2 && formulierGegevens.oppervlakteM2 > 0) {
      oppervlakteM2 = formulierGegevens.oppervlakteM2;
      oppervlakteBron = 'formulier';
      graafIndicatoren.push(`Verstoringsoppervlakte opgegeven in formulier: ${oppervlakteM2}m²`);
    }
  }

  // STAP 2: Als geen waarden uit formulier, schat op basis van activiteittype (fallback)
  if (graafdiepteCm === 0) {
    if (graafIndicatoren.some(i => i.includes('Kelder') || i.includes('parkeergarage'))) {
      graafdiepteCm = 300;
    } else if (graafIndicatoren.some(i => i.includes('Zwembad'))) {
      graafdiepteCm = 200;
    } else if (graafIndicatoren.some(i => i.includes('Nieuwbouw') || i.includes('fundering'))) {
      graafdiepteCm = 80;
    } else if (graafIndicatoren.some(i => i.includes('Aanbouw') || i.includes('uitbouw'))) {
      graafdiepteCm = 60;
    } else if (graafIndicatoren.some(i => i.includes('Riole'))) {
      graafdiepteCm = 100;
    } else if (graafIndicatoren.some(i => i.includes('Vijver'))) {
      graafdiepteCm = 100;
    } else if (graafIndicatoren.some(i => i.includes('Sloop'))) {
      graafdiepteCm = 50;
    }
  }
  
  if (oppervlakteM2 === 0) {
    if (graafIndicatoren.some(i => i.includes('Kelder') || i.includes('parkeergarage'))) {
      oppervlakteM2 = 100;
    } else if (graafIndicatoren.some(i => i.includes('Zwembad'))) {
      oppervlakteM2 = 50;
    } else if (graafIndicatoren.some(i => i.includes('Nieuwbouw') || i.includes('fundering'))) {
      oppervlakteM2 = 80;
    } else if (graafIndicatoren.some(i => i.includes('Aanbouw') || i.includes('uitbouw'))) {
      oppervlakteM2 = 30;
    } else if (graafIndicatoren.some(i => i.includes('Riole'))) {
      oppervlakteM2 = 20;
    } else if (graafIndicatoren.some(i => i.includes('Vijver'))) {
      oppervlakteM2 = 30;
    } else if (graafIndicatoren.some(i => i.includes('Sloop'))) {
      oppervlakteM2 = 50;
    }
  }

  // STAP 3: Realiteitscheck — vergelijk opgegeven/geschatte waarden met verwachte ranges
  let realiteitscheck: GraafwerkAnalyse['realiteitscheck'] = undefined;
  
  if (gedetecteerdType && VERWACHTE_GRAAFDIEPTE_RANGES[gedetecteerdType]) {
    const range = VERWACHTE_GRAAFDIEPTE_RANGES[gedetecteerdType];
    const waarschuwingen: string[] = [];
    
    // Check diepte realisme
    const diepteRealistisch = graafdiepteCm >= range.diepteMin && graafdiepteCm <= range.diepteMax;
    if (!diepteRealistisch && graafdiepteCm > 0) {
      if (graafdiepteCm < range.diepteMin) {
        waarschuwingen.push(
          `Opgegeven graafdiepte (${graafdiepteCm}cm) is ongewoon laag voor ${range.label}. ` +
          `Verwachte range: ${range.diepteMin}-${range.diepteMax}cm. ` +
          `Controleer of de aanvrager de juiste diepte heeft opgegeven.`
        );
      } else {
        waarschuwingen.push(
          `Opgegeven graafdiepte (${graafdiepteCm}cm) is ongewoon hoog voor ${range.label}. ` +
          `Verwachte range: ${range.diepteMin}-${range.diepteMax}cm. ` +
          `Controleer of de aanvrager de juiste diepte heeft opgegeven.`
        );
      }
    }
    
    // Check oppervlakte realisme
    const oppervlakteRealistisch = oppervlakteM2 >= range.oppMin && oppervlakteM2 <= range.oppMax;
    if (!oppervlakteRealistisch && oppervlakteM2 > 0) {
      if (oppervlakteM2 < range.oppMin) {
        waarschuwingen.push(
          `Opgegeven verstoringsoppervlakte (${oppervlakteM2}m²) is ongewoon klein voor ${range.label}. ` +
          `Verwachte range: ${range.oppMin}-${range.oppMax}m².`
        );
      } else {
        waarschuwingen.push(
          `Opgegeven verstoringsoppervlakte (${oppervlakteM2}m²) is ongewoon groot voor ${range.label}. ` +
          `Verwachte range: ${range.oppMin}-${range.oppMax}m².`
        );
      }
    }
    
    // Check: graafwerk verwacht maar diepte = 0 (bijv. dakkapel met graafdiepte opgegeven)
    if (range.diepteMax === 0 && graafdiepteCm > 0) {
      waarschuwingen.push(
        `Bij ${range.label} wordt normaal geen graafwerk verwacht, maar er is een graafdiepte van ${graafdiepteCm}cm opgegeven. ` +
        `Controleer of dit klopt.`
      );
    }
    
    // Check: geen graafwerk verwacht maar wel opgegeven
    if (range.diepteMax === 0 && graafdiepteCm === 0 && diepteBron === 'formulier') {
      // Alles ok, geen graafwerk verwacht en niet opgegeven
    }
    
    realiteitscheck = {
      diepteRealistisch: diepteRealistisch || graafdiepteCm === 0,
      oppervlakteRealistisch: oppervlakteRealistisch || oppervlakteM2 === 0,
      verwachteRangeDiepteCm: { min: range.diepteMin, max: range.diepteMax },
      verwachteRangeOppervlakteM2: { min: range.oppMin, max: range.oppMax },
      waarschuwingen
    };
  }

  const heeftGraafwerk = graafIndicatoren.length > 0 || graafdiepteCm > 0;
  const zekerheid = diepteBron === 'formulier' ? 'hoog' : 
                    graafIndicatoren.length >= 3 ? 'hoog' : 
                    graafIndicatoren.length >= 1 ? 'middel' : 'laag';

  // Bouw toelichting op
  let toelichting: string;
  if (!heeftGraafwerk) {
    toelichting = 'Geen duidelijke indicatoren voor graafwerk gevonden.';
  } else {
    const bronTekst = diepteBron === 'formulier' 
      ? `Graafdiepte uit aanvraagformulier: ${graafdiepteCm}cm` 
      : `Geschatte graafdiepte: ${graafdiepteCm}cm (op basis van activiteittype)`;
    const oppBronTekst = oppervlakteBron === 'formulier'
      ? `Verstoringsoppervlakte uit formulier: ${oppervlakteM2}m²`
      : `Geschatte verstoringsoppervlakte: ${oppervlakteM2}m²`;
    toelichting = `Graafwerk gedetecteerd op basis van: ${graafIndicatoren.join(', ')}. ${bronTekst}. ${oppBronTekst}.`;
    
    if (realiteitscheck?.waarschuwingen.length) {
      toelichting += ` LET OP: ${realiteitscheck.waarschuwingen.join(' ')}`;
    }
  }

  return {
    heeftGraafwerk,
    graafdiepteCm,
    oppervlakteM2,
    diepteBron,
    oppervlakteBron,
    indicatoren: graafIndicatoren,
    zekerheid,
    toelichting,
    realiteitscheck,
    // Backwards compatibility
    geschatteGraafdiepteCm: graafdiepteCm,
    geschatteOppervlakteM2: oppervlakteM2,
  };
}

/**
 * Consequenties van graafwerk — automatisch bepaald op basis van diepte en oppervlakte
 */
export interface GraafwerkConsequentie {
  type: string;
  verplicht: boolean;
  wettelijkeBasis: string;
  toelichting: string;
  actie: string;
}

/**
 * Bepaal alle consequenties van graafwerk op basis van diepte, oppervlakte en context
 */
export function bepaalGraafwerkConsequenties(
  graafwerk: GraafwerkAnalyse
): GraafwerkConsequentie[] {
  const consequenties: GraafwerkConsequentie[] = [];
  
  if (!graafwerk.heeftGraafwerk || graafwerk.graafdiepteCm === 0) {
    return consequenties;
  }
  
  // 1. KLIC-melding — ALTIJD verplicht bij graafwerk >20cm
  if (graafwerk.graafdiepteCm > 20) {
    consequenties.push({
      type: 'KLIC-melding',
      verplicht: true,
      wettelijkeBasis: 'WIBON (Wet informatie-uitwisseling bovengrondse en ondergrondse netten en netwerken), art. 2 lid 2',
      toelichting: `Bij een graafdiepte van ${graafwerk.graafdiepteCm}cm is een KLIC-melding wettelijk verplicht. ` +
        `De grondroerder moet minimaal 3 werkdagen voor aanvang van de werkzaamheden een KLIC-melding doen bij het Kadaster.`,
      actie: 'Aanvrager informeren dat een KLIC-melding bij het Kadaster vereist is vóór aanvang graafwerkzaamheden.'
    });
  }
  
  // 2. Ontgravingsmelding — bij afvoer van grond (>50m³ als vuistregel, of altijd bij grotere projecten)
  if (graafwerk.oppervlakteM2 > 25 && graafwerk.graafdiepteCm > 50) {
    const geschatVolume = Math.round((graafwerk.graafdiepteCm / 100) * graafwerk.oppervlakteM2);
    consequenties.push({
      type: 'Grondverzet / Ontgravingsmelding',
      verplicht: geschatVolume > 50,
      wettelijkeBasis: 'Besluit bodemkwaliteit, art. 28 en 42 (meldingsplicht grondverzet)',
      toelichting: `Geschat grondverzet: ~${geschatVolume}m³. ` +
        (geschatVolume > 50 
          ? `Bij grondverzet >50m³ is een melding bij het bevoegd gezag verplicht.`
          : `Het geschatte volume ligt onder de 50m³ meldingsgrens, maar bij twijfel is een melding aan te raden.`),
      actie: geschatVolume > 50 
        ? 'Melding grondverzet doen via het Meldpunt bodemkwaliteit vóór aanvang werkzaamheden.'
        : 'Overweeg een melding grondverzet als het werkelijke volume de 50m³ overschrijdt.'
    });
  }
  
  // 3. Mogelijke grondwateronttrekking — bij diepe bouwputten
  if (graafwerk.graafdiepteCm > 150) {
    consequenties.push({
      type: 'Grondwateronttrekking / Bemaling',
      verplicht: false, // Afhankelijk van grondwaterstand ter plaatse
      wettelijkeBasis: 'Waterschapsverordening (per waterschap verschillend), Omgevingswet art. 5.1 lid 2',
      toelichting: `Bij een graafdiepte van ${graafwerk.graafdiepteCm}cm kan bemaling nodig zijn. ` +
        `Of een vergunning/melding bij het waterschap vereist is, hangt af van de lokale grondwaterstand en de duur van de bemaling.`,
      actie: 'Controleer bij het waterschap of een vergunning of melding voor grondwateronttrekking/bemaling nodig is.'
    });
  }
  
  // 4. Bodemonderzoek — bij verdachte locaties (dit wordt elders al gecheckt, maar als aandachtspunt)
  if (graafwerk.graafdiepteCm > 50 && graafwerk.oppervlakteM2 > 50) {
    consequenties.push({
      type: 'Bodemonderzoek',
      verplicht: false, // Verplicht als locatie verdacht is, anders aanbeveling
      wettelijkeBasis: 'Besluit activiteiten leefomgeving (Bal), art. 3.9-3.12',
      toelichting: `Bij bodemingrepen van deze omvang (${graafwerk.graafdiepteCm}cm diep, ${graafwerk.oppervlakteM2}m²) ` +
        `kan een verkennend bodemonderzoek vereist zijn, met name als de locatie een verdachte bodemhistorie heeft.`,
      actie: 'Controleer of een verkennend bodemonderzoek nodig is op basis van de bodemkwaliteitskaart en historisch bodembestand.'
    });
  }
  
  return consequenties;
}

/**
 * Vergelijk graafwerk met vrijstellingsgrenzen
 */
export function vergelijkMetVrijstellingen(
  graafwerk: GraafwerkAnalyse,
  vrijstellingen: VrijstellingsGrenzen
): {
  onderzoekVerplicht: boolean;
  reden: string;
  vrijstellingVanToepassing: boolean;
} {
  if (!graafwerk.heeftGraafwerk) {
    return {
      onderzoekVerplicht: false,
      reden: 'Geen graafwerk gedetecteerd',
      vrijstellingVanToepassing: true
    };
  }

  // Gebruik altijd de werkelijke waarden (formulier of schatting)
  const diepte = graafwerk.graafdiepteCm;
  const oppervlakte = graafwerk.oppervlakteM2;

  const overschrijdtDiepte = diepte > vrijstellingen.archeologieDiepteCm;
  const overschrijdtOppervlakte = oppervlakte > vrijstellingen.archeologieOppervlakteM2;

  // Onderzoek verplicht als BEIDE drempels overschreden
  const onderzoekVerplicht = overschrijdtDiepte && overschrijdtOppervlakte;

  const bronLabel = graafwerk.diepteBron === 'formulier' ? 'opgegeven in formulier' : 'geschat op basis van activiteittype';

  let reden: string;
  if (onderzoekVerplicht) {
    reden = `Graafwerk overschrijdt vrijstellingsgrenzen: diepte ${diepte}cm (${bronLabel}, grens: ${vrijstellingen.archeologieDiepteCm}cm) EN oppervlakte ${oppervlakte}m² (grens: ${vrijstellingen.archeologieOppervlakteM2}m²)`;
  } else if (overschrijdtDiepte) {
    reden = `Diepte overschrijdt grens (${diepte}cm > ${vrijstellingen.archeologieDiepteCm}cm, ${bronLabel}), maar oppervlakte binnen grens (${oppervlakte}m² ≤ ${vrijstellingen.archeologieOppervlakteM2}m²) - vrijstelling van toepassing`;
  } else if (overschrijdtOppervlakte) {
    reden = `Oppervlakte overschrijdt grens (${oppervlakte}m² > ${vrijstellingen.archeologieOppervlakteM2}m²), maar diepte binnen grens (${diepte}cm ≤ ${vrijstellingen.archeologieDiepteCm}cm, ${bronLabel}) - vrijstelling van toepassing`;
  } else {
    reden = `Graafwerk binnen vrijstellingsgrenzen: diepte ${diepte}cm (${bronLabel}, grens: ${vrijstellingen.archeologieDiepteCm}cm), oppervlakte ${oppervlakte}m² (grens: ${vrijstellingen.archeologieOppervlakteM2}m²)`;
  }

  return {
    onderzoekVerplicht,
    reden,
    vrijstellingVanToepassing: !onderzoekVerplicht
  };
}
