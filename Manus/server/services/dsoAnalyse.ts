/**
 * DSO Analyse Service
 * 
 * Verwerkt DSO-ZIP bestanden en voert AI-analyse uit met:
 * - Gemini Vision voor tekeningen
 * - PDOK voor GIS data (BAG, Kadaster, Natura2000)
 * - LLM voor juridische analyse
 */

import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { beleidsdocumenten, gemeenten, behandelrapportLog } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Types
export interface DSOFile {
  name: string;
  type: string;
  content: string; // Base64 encoded
  size: number;
}

export interface DSOAnalyseInput {
  files: DSOFile[];
  gemeenteId: number;
  userId: number;
  zaaknummer?: string;
}

export interface PDOKLocatieData {
  adres: string;
  postcode: string;
  woonplaats: string;
  gemeente: string;
  rdX: number;
  rdY: number;
  kadastraalNummer?: string;
  oppervlakte?: number;
  bouwjaar?: number;
  gebruiksdoel?: string;
}

export interface AnalyseResultaat {
  id: number;
  zaaknummer: string;
  status: "verwerking" | "verzonden" | "mislukt";
  
  // Locatie
  locatie?: PDOKLocatieData;
  
  // Procedure bepaling
  procedureType: "VERGUNNINGVRIJ" | "REGULIER" | "BOPA_REGULIER" | "BOPA_UITGEBREID";
  isVergunningvrij: boolean;
  
  // Analyse resultaten
  volledigheid: {
    score: number; // 0-100
    ontbrekendeStukken: string[];
    aanwezigeStukken: string[];
  };
  
  juridischeAnalyse: {
    omgevingsplanCheck: string;
    welstandsadvies: string;
    monumentenCheck: string;
    naturaCheck: string;
    archeologieCheck: string;
  };
  
  adviseurs: {
    naam: string;
    reden: string;
    termijn: string;
  }[];
  
  samenvatting: string;
  aanbevelingen: string[];
  
  // Metadata
  verwerkingDuurSec: number;
  bronnen: string[];
}

/**
 * Hoofdfunctie voor DSO analyse
 */
export async function analyseerDSOZip(input: DSOAnalyseInput): Promise<AnalyseResultaat> {
  const startTime = Date.now();
  const zaaknummer = input.zaaknummer || `RO-${Date.now()}`;
  const db = await getDb();
  if (!db) throw new Error('Database niet beschikbaar');
  
  // 1. Maak log entry aan
  const [logEntry] = await db.insert(behandelrapportLog).values({
    zaaknummer,
    gemeenteId: input.gemeenteId,
    status: "verwerking",
  }).$returningId();
  
  try {
    // 2. Categoriseer bestanden
    const categorizedFiles = categoriseerBestanden(input.files);
    
    // 3. Haal locatie data op via PDOK (als adres beschikbaar)
    let locatieData: PDOKLocatieData | undefined;
    const aanvraagFormulier = categorizedFiles.formulieren[0];
    if (aanvraagFormulier) {
      const adresInfo = await extractAdresUitFormulier(aanvraagFormulier);
      if (adresInfo) {
        locatieData = await haalPDOKData(adresInfo);
      }
    }
    
    // 4. Analyseer tekeningen met Gemini Vision
    const tekeningenAnalyse = await analyseerTekeningen(categorizedFiles.tekeningen);
    
    // 5. Haal relevante beleidsdocumenten op
    const beleidsDocs = await haalBeleidsdocumenten(input.gemeenteId);
    
    // 6. Voer juridische analyse uit
    const juridischeAnalyse = await voerJuridischeAnalyseUit({
      locatie: locatieData,
      tekeningen: tekeningenAnalyse,
      beleidsdocumenten: beleidsDocs,
      gemeenteId: input.gemeenteId,
    });
    
    // 7. Bepaal procedure type
    const procedureType = bepaalProcedureType(juridischeAnalyse);
    
    // 8. Check volledigheid
    const volledigheid = checkVolledigheid(categorizedFiles, procedureType);
    
    // 9. Bepaal benodigde adviseurs
    const adviseurs = bepaalAdviseurs(juridischeAnalyse, locatieData);
    
    // 10. Genereer samenvatting
    const samenvatting = await genereerSamenvatting({
      procedureType,
      volledigheid,
      juridischeAnalyse,
      adviseurs,
    });
    
    const verwerkingDuur = (Date.now() - startTime) / 1000;
    
    // 11. Update log entry
    await db.update(behandelrapportLog)
      .set({
        status: "verzonden",
        procedureType,
        isVergunningvrij: procedureType === "VERGUNNINGVRIJ",
        adres: locatieData?.adres,
        kadastraalNummer: locatieData?.kadastraalNummer,
        rdX: locatieData?.rdX?.toString(),
        rdY: locatieData?.rdY?.toString(),
        verwerkingDuurSec: verwerkingDuur.toString(),
        rapportData: {
          volledigheid,
          juridischeAnalyse,
          adviseurs,
          samenvatting,
        },
      })
      .where(eq(behandelrapportLog.id, logEntry.id));
    
    return {
      id: logEntry.id,
      zaaknummer,
      status: "verzonden",
      locatie: locatieData,
      procedureType,
      isVergunningvrij: procedureType === "VERGUNNINGVRIJ",
      volledigheid,
      juridischeAnalyse,
      adviseurs,
      samenvatting: samenvatting.tekst,
      aanbevelingen: samenvatting.aanbevelingen,
      verwerkingDuurSec: verwerkingDuur,
      bronnen: beleidsDocs.map((d: any) => d.documentNaam),
    };
    
  } catch (error) {
    // Update log met fout status
    await db.update(behandelrapportLog)
      .set({ status: "mislukt" })
      .where(eq(behandelrapportLog.id, logEntry.id));
    
    throw error;
  }
}

/**
 * Categoriseer bestanden op type
 */
function categoriseerBestanden(files: DSOFile[]) {
  const result = {
    formulieren: [] as DSOFile[],
    tekeningen: [] as DSOFile[],
    bijlagen: [] as DSOFile[],
    fotos: [] as DSOFile[],
  };
  
  for (const file of files) {
    const ext = file.name.toLowerCase().split('.').pop();
    const name = file.name.toLowerCase();
    
    if (ext === 'pdf' && (name.includes('aanvraag') || name.includes('formulier'))) {
      result.formulieren.push(file);
    } else if (['dwg', 'dxf', 'pdf'].includes(ext || '') && 
               (name.includes('tekening') || name.includes('plattegrond') || 
                name.includes('geveltekening') || name.includes('situatie'))) {
      result.tekeningen.push(file);
    } else if (['jpg', 'jpeg', 'png'].includes(ext || '')) {
      result.fotos.push(file);
    } else {
      result.bijlagen.push(file);
    }
  }
  
  return result;
}

/**
 * Extract adres uit aanvraagformulier
 */
async function extractAdresUitFormulier(file: DSOFile): Promise<string | null> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Je bent een expert in het lezen van omgevingsvergunning aanvragen. Extraheer het adres van de bouwlocatie uit het document. Geef alleen het adres terug in het formaat: straat huisnummer, postcode plaats. Als je geen adres kunt vinden, antwoord dan met 'GEEN_ADRES'."
        },
        {
          role: "user",
          content: [
            {
              type: "file_url",
              file_url: {
                url: `data:application/pdf;base64,${file.content}`,
                mime_type: "application/pdf"
              }
            },
            {
              type: "text",
              text: "Wat is het adres van de bouwlocatie in dit aanvraagformulier?"
            }
          ]
        }
      ]
    });
    
    const adresContent = response.choices[0]?.message?.content;
    const adres = typeof adresContent === 'string' ? adresContent : '';
    if (adres && adres !== 'GEEN_ADRES') {
      return adres;
    }
    return null;
  } catch (error) {
    console.error("Fout bij adres extractie:", error);
    return null;
  }
}

/**
 * Haal PDOK data op voor een adres
 */
async function haalPDOKData(adres: string): Promise<PDOKLocatieData | undefined> {
  try {
    // PDOK Locatieserver API
    const searchUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(adres)}&rows=1`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.response?.docs?.[0]) {
      return undefined;
    }
    
    const doc = searchData.response.docs[0];
    
    // Parse centroid for RD coordinates
    let rdX = 0, rdY = 0;
    if (doc.centroide_rd) {
      const match = doc.centroide_rd.match(/POINT\((\d+\.?\d*)\s+(\d+\.?\d*)\)/);
      if (match) {
        rdX = parseFloat(match[1]);
        rdY = parseFloat(match[2]);
      }
    }
    
    return {
      adres: doc.weergavenaam || adres,
      postcode: doc.postcode || "",
      woonplaats: doc.woonplaatsnaam || "",
      gemeente: doc.gemeentenaam || "",
      rdX,
      rdY,
      kadastraalNummer: doc.gekoppeld_perceel?.[0],
    };
  } catch (error) {
    console.error("PDOK fout:", error);
    return undefined;
  }
}

/**
 * Analyseer tekeningen met Gemini Vision
 */
async function analyseerTekeningen(tekeningen: DSOFile[]): Promise<string> {
  if (tekeningen.length === 0) {
    return "Geen tekeningen gevonden in de aanvraag.";
  }
  
  try {
    const tekeningContent = tekeningen.slice(0, 3).map(t => ({
      type: "file_url" as const,
      file_url: {
        url: `data:application/pdf;base64,${t.content}`,
        mime_type: "application/pdf" as const
      }
    }));
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Je bent een expert bouwkundig tekenaar en vergunningverlener. Analyseer de bouwtekeningen en geef een samenvatting van:
1. Type bouwwerk (aanbouw, dakkapel, nieuwbouw, etc.)
2. Afmetingen (hoogte, breedte, diepte)
3. Materialen (indien zichtbaar)
4. Positie ten opzichte van erfgrenzen
5. Eventuele bijzonderheden of aandachtspunten

Wees beknopt maar volledig.`
        },
        {
          role: "user",
          content: [
            ...tekeningContent,
            {
              type: "text",
              text: "Analyseer deze bouwtekeningen voor een omgevingsvergunning aanvraag."
            }
          ]
        }
      ]
    });
    
    const analyseContent = response.choices[0]?.message?.content;
    return typeof analyseContent === 'string' ? analyseContent : "Analyse niet beschikbaar.";
  } catch (error) {
    console.error("Tekeningen analyse fout:", error);
    return "Fout bij analyseren van tekeningen.";
  }
}

/**
 * Haal beleidsdocumenten op voor gemeente
 */
async function haalBeleidsdocumenten(gemeenteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(beleidsdocumenten)
    .where(eq(beleidsdocumenten.gemeenteId, gemeenteId));
}

/**
 * Voer juridische analyse uit
 */
async function voerJuridischeAnalyseUit(params: {
  locatie?: PDOKLocatieData;
  tekeningen: string;
  beleidsdocumenten: any[];
  gemeenteId: number;
}) {
  const { locatie, tekeningen, beleidsdocumenten: docs } = params;
  
  // Bouw context met beleidsdocumenten
  const beleidsContext = docs.map((d: any) => 
    `- ${d.documentNaam} (${d.documentType}): ${d.url || 'Geen URL'}`
  ).join('\n');
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Je bent een expert omgevingsrecht jurist en vergunningverlener bij een Nederlandse gemeente. 
        
Analyseer de aanvraag en geef een juridische beoordeling op de volgende punten:
1. Omgevingsplan check - past de aanvraag binnen het omgevingsplan?
2. Welstandsadvies - voldoet het aan redelijke eisen van welstand?
3. Monumenten check - is er sprake van een monument of beschermd gezicht?
4. Natura 2000 check - zijn er effecten op Natura 2000 gebieden?
5. Archeologie check - is archeologisch onderzoek nodig?

Beschikbare beleidsdocumenten:
${beleidsContext}

Geef per punt een korte beoordeling (1-2 zinnen) en een conclusie (AKKOORD, AANDACHT, of AFWIJZEN).`
      },
      {
        role: "user",
        content: `Locatie: ${locatie?.adres || 'Onbekend'}
Gemeente: ${locatie?.gemeente || 'Onbekend'}
Kadaster: ${locatie?.kadastraalNummer || 'Onbekend'}

Tekeningen analyse:
${tekeningen}

Geef je juridische analyse in JSON formaat:
{
  "omgevingsplanCheck": "beoordeling",
  "welstandsadvies": "beoordeling",
  "monumentenCheck": "beoordeling",
  "naturaCheck": "beoordeling",
  "archeologieCheck": "beoordeling"
}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "juridische_analyse",
        strict: true,
        schema: {
          type: "object",
          properties: {
            omgevingsplanCheck: { type: "string" },
            welstandsadvies: { type: "string" },
            monumentenCheck: { type: "string" },
            naturaCheck: { type: "string" },
            archeologieCheck: { type: "string" }
          },
          required: ["omgevingsplanCheck", "welstandsadvies", "monumentenCheck", "naturaCheck", "archeologieCheck"],
          additionalProperties: false
        }
      }
    }
  });
  
  try {
    const jsonContent = response.choices[0]?.message?.content;
    return JSON.parse(typeof jsonContent === 'string' ? jsonContent : "{}");
  } catch {
    return {
      omgevingsplanCheck: "Analyse niet beschikbaar",
      welstandsadvies: "Analyse niet beschikbaar",
      monumentenCheck: "Analyse niet beschikbaar",
      naturaCheck: "Analyse niet beschikbaar",
      archeologieCheck: "Analyse niet beschikbaar"
    };
  }
}

/**
 * Bepaal procedure type op basis van analyse
 */
function bepaalProcedureType(analyse: any): "VERGUNNINGVRIJ" | "REGULIER" | "BOPA_REGULIER" | "BOPA_UITGEBREID" {
  // Simpele logica - kan uitgebreid worden
  const checks = [
    analyse.omgevingsplanCheck,
    analyse.welstandsadvies,
    analyse.monumentenCheck,
    analyse.naturaCheck,
    analyse.archeologieCheck
  ].join(' ').toLowerCase();
  
  if (checks.includes('vergunningvrij')) {
    return "VERGUNNINGVRIJ";
  }
  if (checks.includes('afwijken') || checks.includes('bopa')) {
    if (checks.includes('uitgebreid') || checks.includes('mer') || checks.includes('natura')) {
      return "BOPA_UITGEBREID";
    }
    return "BOPA_REGULIER";
  }
  return "REGULIER";
}

/**
 * Check volledigheid van de aanvraag
 */
function checkVolledigheid(files: ReturnType<typeof categoriseerBestanden>, procedureType: string) {
  const vereist = {
    "VERGUNNINGVRIJ": ["aanvraagformulier"],
    "REGULIER": ["aanvraagformulier", "situatietekening", "plattegronden", "geveltekeningen", "doorsneden"],
    "BOPA_REGULIER": ["aanvraagformulier", "situatietekening", "plattegronden", "geveltekeningen", "doorsneden", "ruimtelijke onderbouwing"],
    "BOPA_UITGEBREID": ["aanvraagformulier", "situatietekening", "plattegronden", "geveltekeningen", "doorsneden", "ruimtelijke onderbouwing", "milieueffectrapportage"]
  };
  
  const required = vereist[procedureType as keyof typeof vereist] || vereist.REGULIER;
  const aanwezig: string[] = [];
  const ontbrekend: string[] = [];
  
  // Check formulieren
  if (files.formulieren.length > 0) {
    aanwezig.push("aanvraagformulier");
  } else {
    ontbrekend.push("aanvraagformulier");
  }
  
  // Check tekeningen
  const tekeningNamen = files.tekeningen.map(t => t.name.toLowerCase());
  
  if (tekeningNamen.some(n => n.includes('situatie'))) {
    aanwezig.push("situatietekening");
  } else if (required.includes("situatietekening")) {
    ontbrekend.push("situatietekening");
  }
  
  if (tekeningNamen.some(n => n.includes('plattegrond') || n.includes('begane'))) {
    aanwezig.push("plattegronden");
  } else if (required.includes("plattegronden")) {
    ontbrekend.push("plattegronden");
  }
  
  if (tekeningNamen.some(n => n.includes('gevel'))) {
    aanwezig.push("geveltekeningen");
  } else if (required.includes("geveltekeningen")) {
    ontbrekend.push("geveltekeningen");
  }
  
  if (tekeningNamen.some(n => n.includes('doorsnede') || n.includes('doorsneden'))) {
    aanwezig.push("doorsneden");
  } else if (required.includes("doorsneden")) {
    ontbrekend.push("doorsneden");
  }
  
  const score = Math.round((aanwezig.length / required.length) * 100);
  
  return {
    score,
    ontbrekendeStukken: ontbrekend,
    aanwezigeStukken: aanwezig
  };
}

/**
 * Bepaal benodigde adviseurs
 */
function bepaalAdviseurs(analyse: any, locatie?: PDOKLocatieData) {
  const adviseurs: { naam: string; reden: string; termijn: string }[] = [];
  
  if (analyse.welstandsadvies?.toLowerCase().includes('aandacht') || 
      analyse.welstandsadvies?.toLowerCase().includes('advies')) {
    adviseurs.push({
      naam: "Welstandscommissie",
      reden: "Welstandstoets vereist",
      termijn: "4 weken"
    });
  }
  
  if (analyse.monumentenCheck?.toLowerCase().includes('monument') ||
      analyse.monumentenCheck?.toLowerCase().includes('beschermd')) {
    adviseurs.push({
      naam: "Monumentencommissie",
      reden: "Monument of beschermd gezicht",
      termijn: "6 weken"
    });
  }
  
  if (analyse.naturaCheck?.toLowerCase().includes('natura') ||
      analyse.naturaCheck?.toLowerCase().includes('stikstof')) {
    adviseurs.push({
      naam: "Omgevingsdienst",
      reden: "Natura 2000 / stikstof beoordeling",
      termijn: "8 weken"
    });
  }
  
  return adviseurs;
}

/**
 * Genereer samenvatting
 */
async function genereerSamenvatting(params: {
  procedureType: string;
  volledigheid: any;
  juridischeAnalyse: any;
  adviseurs: any[];
}) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "Je bent een ervaren vergunningverlener. Schrijf een beknopte, professionele samenvatting van de analyse voor de behandelend ambtenaar. Gebruik duidelijke taal en geef concrete aanbevelingen."
      },
      {
        role: "user",
        content: `Procedure type: ${params.procedureType}
Volledigheid: ${params.volledigheid.score}%
Ontbrekende stukken: ${params.volledigheid.ontbrekendeStukken.join(', ') || 'Geen'}
Juridische analyse: ${JSON.stringify(params.juridischeAnalyse)}
Benodigde adviseurs: ${params.adviseurs.map(a => a.naam).join(', ') || 'Geen'}

Geef een samenvatting (max 3 alinea's) en 3-5 concrete aanbevelingen.`
      }
    ]
  });
  
  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '';
  
  // Parse aanbevelingen uit de tekst
  const aanbevelingen = contentStr
    .split('\n')
    .filter((line: string) => line.match(/^[\d\-\*\.]\s/))
    .map((line: string) => line.replace(/^[\d\-\*\.]\s*/, '').trim())
    .slice(0, 5);
  
  return {
    tekst: contentStr,
    aanbevelingen: aanbevelingen.length > 0 ? aanbevelingen : [
      "Controleer de volledigheid van de aanvraag",
      "Vraag ontbrekende stukken op indien nodig",
      "Plan de benodigde adviezen in"
    ]
  };
}
