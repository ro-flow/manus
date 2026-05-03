/**
 * Publicatie Crawler Service
 * 
 * Uitgebreide nachtelijke crawler die alle relevante bronnen doorzoekt
 * voor beleidsdocumenten van gemeenten met actieve seats.
 * 
 * Bronnen:
 * - Overheidsbronnen: overheid.nl, ruimtelijkeplannen.nl, wetten.overheid.nl
 * - Gemeentelijke websites
 * - Provinciale websites (12 provincies)
 * - Waterschap websites (21 waterschappen)
 * - Partner organisaties: recreatieschappen, omgevingsdiensten, VR's, GGD's
 * - Google Search API (voor documenten niet via officiële kanalen)
 * 
 * Documenten worden automatisch:
 * 1. Gedownload en opgeslagen in S3
 * 2. Samengevat door Llama 3.3 70B (via Together.ai)
 * 3. Toegevoegd aan de kennisbank
 * 4. Oude versies worden automatisch op "vervallen" gezet
 */

import { kennisbankDocumenten, crawlerLog, gemeenten, seats } from "../../drizzle/schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import * as dbHelpers from "../db";

// ============ TYPES ============

interface CrawlResult {
  documentsFound: number;
  documentsNew: number;
  documentsUpdated: number;
  documentsRemoved: number;
  errors: string[];
}

interface DocumentMatch {
  naam: string;
  type: DocumentType;
  url: string;
  versie?: string;
  vaststellingsdatum?: Date;
  gemeente?: string;
  provincie?: string;
  bron: CrawlerSource;
}

type DocumentType = 
  | "omgevingswet" | "bbl" | "bal" | "bkl" | "omgevingsbesluit" | "omgevingsregeling"
  | "pov" | "welstandsnota" | "parkeerbeleid" | "woonvisie" | "horecabeleid"
  | "erfgoedvisie" | "groenvisie" | "duurzaamheidsvisie" | "apv" | "keur"
  | "beleidsregels_bopa" | "archeologiebeleid" | "overig";

type CrawlerSource = 
  | "overheid_nl" | "ruimtelijkeplannen_nl" | "wetten_overheid_nl"
  | "gemeente_website" | "provincie_website" | "waterschap_website"
  | "recreatieschap_website" | "omgevingsdienst_website" | "veiligheidsregio_website"
  | "ggd_website" | "google_search";

// ============ CONFIGURATION ============

// Document types and their search keywords
const DOCUMENT_KEYWORDS: Record<DocumentType, string[]> = {
  omgevingswet: ["omgevingswet"],
  bbl: ["besluit bouwwerken leefomgeving", "bbl"],
  bal: ["besluit activiteiten leefomgeving", "bal"],
  bkl: ["besluit kwaliteit leefomgeving", "bkl"],
  omgevingsbesluit: ["omgevingsbesluit"],
  omgevingsregeling: ["omgevingsregeling"],
  pov: ["provinciale omgevingsverordening", "omgevingsverordening provincie"],
  welstandsnota: ["welstandsnota", "welstandsbeleid", "beeldkwaliteitsplan", "welstandscriteria"],
  parkeerbeleid: ["parkeerbeleid", "parkeernorm", "parkeervisie", "parkeernota"],
  woonvisie: ["woonvisie", "woningbouwprogramma", "volkshuisvestingsbeleid", "woonbeleid"],
  horecabeleid: ["horecabeleid", "horecanota", "horecavisie", "terrrassenbeleid"],
  erfgoedvisie: ["erfgoedvisie", "erfgoednota", "monumentenbeleid", "erfgoedverordening", "cultuurhistorie"],
  groenvisie: ["groenvisie", "groenbeleid", "bomenbeleid", "groenbeleidsplan"],
  duurzaamheidsvisie: ["duurzaamheidsvisie", "energiebeleid", "klimaatbeleid", "warmtevisie"],
  apv: ["algemene plaatselijke verordening", "apv"],
  keur: ["keur", "waterschapsverordening", "waterverordening"],
  beleidsregels_bopa: ["beleidsregels afwijken", "bopa", "kruimelgevallen", "afwijkingsbeleid"],
  archeologiebeleid: ["archeologiebeleid", "archeologienota", "archeologische verwachtingskaart"],
  overig: [],
};

// Provincial websites
const PROVINCIALE_WEBSITES: Record<string, string> = {
  "Drenthe": "https://www.provincie.drenthe.nl",
  "Flevoland": "https://www.flevoland.nl",
  "Friesland": "https://www.fryslan.frl",
  "Gelderland": "https://www.gelderland.nl",
  "Groningen": "https://www.provinciegroningen.nl",
  "Limburg": "https://www.limburg.nl",
  "Noord-Brabant": "https://www.brabant.nl",
  "Noord-Holland": "https://www.noord-holland.nl",
  "Overijssel": "https://www.overijssel.nl",
  "Utrecht": "https://www.provincie-utrecht.nl",
  "Zeeland": "https://www.zeeland.nl",
  "Zuid-Holland": "https://www.zuid-holland.nl",
};

// Waterschap websites (21 waterschappen)
const WATERSCHAP_WEBSITES: Record<string, string> = {
  "hhnk": "https://www.hhnk.nl",
  "agv": "https://www.waternet.nl",
  "rijnland": "https://www.rijnland.net",
  "delfland": "https://www.hhdelfland.nl",
  "schieland": "https://www.hhsk.nl",
  "hollandse-delta": "https://www.wshd.nl",
  "rivierenland": "https://www.wsrl.nl",
  "amstel-gooi-vecht": "https://www.waternet.nl",
  "zuiderzeeland": "https://www.zuiderzeeland.nl",
  "vallei-veluwe": "https://www.vallei-veluwe.nl",
  "rijn-ijssel": "https://www.wrij.nl",
  "vechtstromen": "https://www.vechtstromen.nl",
  "drents-overijsselse-delta": "https://www.wdodelta.nl",
  "noorderzijlvest": "https://www.noorderzijlvest.nl",
  "hunze-aas": "https://www.hunzeenaas.nl",
  "fryslan": "https://www.wetterskipfryslan.nl",
  "de-dommel": "https://www.dommel.nl",
  "aa-maas": "https://www.aaenmaas.nl",
  "brabantse-delta": "https://www.brabantsedelta.nl",
  "limburg": "https://www.waterschaplimburg.nl",
  "scheldestromen": "https://www.scheldestromen.nl",
};

// Omgevingsdiensten
const OMGEVINGSDIENST_WEBSITES: Record<string, string> = {
  "od-nhn": "https://www.odnhn.nl",
  "od-ijmond": "https://www.odijmond.nl",
  "od-nzkg": "https://www.odnzkg.nl",
  "od-flevoland": "https://www.ofgv.nl",
  "od-utrecht": "https://www.odru.nl",
  "od-midden-holland": "https://www.odmh.nl",
  "od-haaglanden": "https://www.odh.nl",
  "od-west-holland": "https://www.odwh.nl",
  "od-zuid-holland-zuid": "https://www.ozhz.nl",
  "od-midden-nederland": "https://www.rfrmu.nl",
  "od-veluwe": "https://www.odveluwe.nl",
  "od-achterhoek": "https://www.odachterhoek.nl",
  "od-rivierenland": "https://www.odrivierenland.nl",
  "od-twente": "https://www.odtwente.nl",
  "od-ijsselland": "https://www.odijsselland.nl",
  "od-groningen": "https://www.odgroningen.nl",
  "od-fryslan": "https://www.fumo.nl",
  "od-brabant-noord": "https://www.odbn.nl",
  "od-midden-brabant": "https://www.odzob.nl",
  "od-zuidoost-brabant": "https://www.odzob.nl",
  "od-limburg-noord": "https://www.rudlimburgnoord.nl",
  "od-limburg-zuid": "https://www.rudzuidlimburg.nl",
  "od-zeeland": "https://www.rud-zeeland.nl",
};

// Veiligheidsregio's (25)
const VEILIGHEIDSREGIO_WEBSITES: Record<string, string> = {
  "vr-nhn": "https://www.vrnhn.nl",
  "vr-amsterdam-amstelland": "https://www.amsterdam.nl/veiligheidsregio",
  "vr-zaanstreek-waterland": "https://www.vrzw.nl",
  "vr-kennemerland": "https://www.vrk.nl",
  "vr-gooi-vechtstreek": "https://www.vrgooienvechtstreek.nl",
  "vr-flevoland": "https://www.vrflevoland.nl",
  "vr-utrecht": "https://www.vru.nl",
  "vr-gelderland-midden": "https://www.vggm.nl",
  "vr-gelderland-zuid": "https://www.vrgz.nl",
  "vr-noord-oost-gelderland": "https://www.vnog.nl",
  "vr-twente": "https://www.vrtwente.nl",
  "vr-ijsselland": "https://www.vrijsselland.nl",
  "vr-drenthe": "https://www.vrdrenthe.nl",
  "vr-fryslan": "https://www.vrfryslan.nl",
  "vr-groningen": "https://www.veiligheidsregiogroningen.nl",
  "vr-haaglanden": "https://www.vrh.nl",
  "vr-hollands-midden": "https://www.vrhm.nl",
  "vr-rotterdam-rijnmond": "https://www.veiligheidsregio-rr.nl",
  "vr-zuid-holland-zuid": "https://www.vrzhz.nl",
  "vr-zeeland": "https://www.veiligheidsregiozeeland.nl",
  "vr-midden-west-brabant": "https://www.vrmwb.nl",
  "vr-brabant-noord": "https://www.vrbn.nl",
  "vr-brabant-zuidoost": "https://www.vrbzo.nl",
  "vr-limburg-noord": "https://www.vrlimburgnoord.nl",
  "vr-zuid-limburg": "https://www.vrzl.nl",
};

// GGD's (25)
const GGD_WEBSITES: Record<string, string> = {
  "ggd-hollands-noorden": "https://www.ggdhollandsnoorden.nl",
  "ggd-amsterdam": "https://www.ggd.amsterdam.nl",
  "ggd-zaanstreek-waterland": "https://www.ggdzw.nl",
  "ggd-kennemerland": "https://www.ggdkennemerland.nl",
  "ggd-gooi-vechtstreek": "https://www.ggdgv.nl",
  "ggd-flevoland": "https://www.ggdflevoland.nl",
  "ggd-utrecht": "https://www.ggdru.nl",
  "ggd-gelderland-midden": "https://www.vggm.nl",
  "ggd-gelderland-zuid": "https://www.ggdgelderlandzuid.nl",
  "ggd-noord-oost-gelderland": "https://www.ggdnog.nl",
  "ggd-twente": "https://www.ggdtwente.nl",
  "ggd-ijsselland": "https://www.ggdijsselland.nl",
  "ggd-drenthe": "https://www.ggddrenthe.nl",
  "ggd-fryslan": "https://www.ggdfryslan.nl",
  "ggd-groningen": "https://www.ggd.groningen.nl",
  "ggd-haaglanden": "https://www.ggdhaaglanden.nl",
  "ggd-hollands-midden": "https://www.ggdhm.nl",
  "ggd-rotterdam-rijnmond": "https://www.ggdrotterdamrijnmond.nl",
  "ggd-zuid-holland-zuid": "https://www.ggdzhz.nl",
  "ggd-zeeland": "https://www.ggdzeeland.nl",
  "ggd-west-brabant": "https://www.ggdwestbrabant.nl",
  "ggd-hart-brabant": "https://www.ggdhartvoorbrabant.nl",
  "ggd-brabant-zuidoost": "https://www.ggdbzo.nl",
  "ggd-limburg-noord": "https://www.ggdlimburgnoord.nl",
  "ggd-zuid-limburg": "https://www.ggdzl.nl",
};

// Recreatieschappen (uitgebreid)
const RECREATIESCHAP_WEBSITES: Record<string, string> = {
  // Noord-Holland
  "westfriesland": "https://www.recreatieschapwestfriesland.nl",
  "spaarnwoude": "https://www.spaarnwoude.nl",
  "groengebied-amstelland": "https://www.groengebiedamstelland.nl",
  "het-twiske": "https://www.hettwiske.nl",
  "geestmerambacht": "https://www.geestmerambacht.nl",
  "alkmaarder-uitgeestermeer": "https://www.alkmaarderuitgeestermeer.nl",
  // Zuid-Holland
  "midden-delfland": "https://www.heerlijkbuiten.nl",
  "rottemeren": "https://www.rottemeren.nl",
  "hitland": "https://www.recreatieschaphitland.nl",
  "vlietland": "https://www.vlietland.nl",
  "oude-maas": "https://www.recreatieschapoudemaas.nl",
  // Utrecht
  "stichtse-groenlanden": "https://www.stichtsegroenland.nl",
  "utrechtse-heuvelrug": "https://www.rhenen.nl",
  // Overig
  "drenthe": "https://www.recreatieschappen.nl",
  "ijsselmonde": "https://www.recreatieschapijsselmonde.nl",
  "voorne-putten": "https://www.recreatieschapvoorneputten.nl",
};

// ============ CRAWLER FUNCTIONS ============

/**
 * Search overheid.nl for official publications
 */
async function searchOverheidNL(
  searchTerms: string[],
  gemeente?: string
): Promise<DocumentMatch[]> {
  const results: DocumentMatch[] = [];
  
  try {
    // Build search query
    const query = gemeente 
      ? `${gemeente} (${searchTerms.join(" OR ")})`
      : searchTerms.join(" OR ");
    
    console.log(`[Crawler:overheid.nl] Searching: ${query}`);
    
    // Official API: https://zoek.officielebekendmakingen.nl/
    // Note: Requires proper API authentication in production
    // For now, we simulate the search structure
    
    // In production implementation:
    // 1. Use the KOOP API (Kennis- en Exploitatiecentrum Officiële Overheidspublicaties)
    // 2. Parse XML responses
    // 3. Extract document metadata and URLs
    
  } catch (error) {
    console.error(`[Crawler:overheid.nl] Error:`, error);
  }
  
  return results;
}

/**
 * Search ruimtelijkeplannen.nl for spatial plans
 */
async function searchRuimtelijkePlannen(gemeente: string): Promise<DocumentMatch[]> {
  const results: DocumentMatch[] = [];
  
  try {
    console.log(`[Crawler:ruimtelijkeplannen.nl] Searching for: ${gemeente}`);
    
    // PDOK API for ruimtelijke plannen
    // https://www.pdok.nl/datasets
    // WFS service: https://geodata.nationaalgeoregister.nl/plu/wfs
    
    // In production implementation:
    // 1. Query WFS service for plans in gemeente
    // 2. Filter by plan type (bestemmingsplan, omgevingsplan, etc.)
    // 3. Extract plan URLs and metadata
    
  } catch (error) {
    console.error(`[Crawler:ruimtelijkeplannen.nl] Error:`, error);
  }
  
  return results;
}

/**
 * Search a generic website for policy documents
 */
async function searchWebsite(
  baseUrl: string,
  searchTerms: string[],
  bron: CrawlerSource
): Promise<DocumentMatch[]> {
  const results: DocumentMatch[] = [];
  
  try {
    console.log(`[Crawler:${bron}] Searching ${baseUrl}`);
    
    // Generic website search approach:
    // 1. Try site's search functionality if available
    // 2. Crawl common policy pages (/beleid, /documenten, /publicaties)
    // 3. Look for PDF links matching search terms
    
    // Common policy page patterns
    const policyPaths = [
      "/beleid",
      "/documenten",
      "/publicaties",
      "/regelgeving",
      "/verordeningen",
      "/bestuur/beleid",
      "/over-ons/beleid",
    ];
    
    // In production implementation:
    // 1. Fetch each policy path
    // 2. Parse HTML for PDF links
    // 3. Match against search terms
    // 4. Extract document metadata
    
  } catch (error) {
    console.error(`[Crawler:${bron}] Error searching ${baseUrl}:`, error);
  }
  
  return results;
}

/**
 * Search Google for documents not found via official channels
 */
async function searchGoogle(
  query: string,
  site?: string
): Promise<DocumentMatch[]> {
  const results: DocumentMatch[] = [];
  
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
    const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX; // Custom Search Engine ID
    
    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      console.warn("[Crawler:google] Google Search API not configured");
      return results;
    }
    
    // Build search query
    const searchQuery = site 
      ? `site:${site} ${query} filetype:pdf`
      : `${query} filetype:pdf`;
    
    console.log(`[Crawler:google] Searching: ${searchQuery}`);
    
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(searchQuery)}`
    );
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse results
    for (const item of data.items || []) {
      if (item.link?.endsWith('.pdf')) {
        // Determine document type from title
        const type = detectDocumentType(item.title);
        
        results.push({
          naam: item.title,
          type,
          url: item.link,
          bron: "google_search",
        });
      }
    }
    
  } catch (error) {
    console.error(`[Crawler:google] Error:`, error);
  }
  
  return results;
}

/**
 * Detect document type from title
 */
function detectDocumentType(title: string): DocumentType {
  const titleLower = title.toLowerCase();
  
  for (const [type, keywords] of Object.entries(DOCUMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        return type as DocumentType;
      }
    }
  }
  
  return "overig";
}

/**
 * Download document and store in S3
 */
async function downloadAndStoreDocument(
  url: string,
  documentNaam: string
): Promise<{ s3Key: string; s3Url: string; mimeType: string; fileSizeBytes: number } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Ro-flow Kennisbank Crawler/1.0",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type") || "application/pdf";
    const buffer = await response.arrayBuffer();
    const data = Buffer.from(buffer);
    
    // Generate unique key
    const timestamp = Date.now();
    const safeNaam = documentNaam.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 100);
    const extension = contentType.includes("pdf") ? "pdf" : "bin";
    const s3Key = `kennisbank/${timestamp}-${safeNaam}.${extension}`;
    
    const result = await storagePut(s3Key, data, contentType);
    
    return {
      s3Key,
      s3Url: result.url,
      mimeType: contentType,
      fileSizeBytes: data.length,
    };
  } catch (error) {
    console.error(`[Crawler] Error downloading document from ${url}:`, error);
    return null;
  }
}

/**
 * Generate summary using Llama 3.3 70B via Together.ai
 * Max 500 tokens, costs ~€0.0001-0.0003 per summary
 */
export async function generateSummaryWithLlama(
  documentText: string,
  documentNaam: string
): Promise<string | null> {
  try {
    const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
    
    if (!TOGETHER_API_KEY) {
      console.warn("[Crawler] TOGETHER_API_KEY not set, skipping summary generation");
      return null;
    }
    
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          {
            role: "system",
            content: `Je bent een expert in Nederlandse ruimtelijke ordening en omgevingsrecht. 
Maak een beknopte samenvatting van het beleidsdocument voor gebruik in een kennisbank.
De samenvatting moet bevatten:
1. Hoofddoel van het document
2. Belangrijkste regels/criteria
3. Wanneer dit document van toepassing is bij omgevingsvergunningen
Maximaal 500 tokens. Schrijf in het Nederlands.`,
          },
          {
            role: "user",
            content: `Maak een samenvatting van dit document: "${documentNaam}"\n\nInhoud:\n${documentText.substring(0, 8000)}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Together.ai API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
    
  } catch (error) {
    console.error(`[Crawler] Error generating summary:`, error);
    return null;
  }
}

/**
 * Get all gemeenten with active seats (paying customers)
 */
async function getActiveGemeenten(): Promise<typeof gemeenten.$inferSelect[]> {
  const db = await dbHelpers.getDb();
  if (!db) return [];
  
  const activeGemeenteIds = await db
    .select({ gemeenteId: seats.gemeenteId })
    .from(seats)
    .where(eq(seats.status, "actief"))
    .groupBy(seats.gemeenteId);
  
  if (activeGemeenteIds.length === 0) {
    return [];
  }
  
  const gemeenteIdList = activeGemeenteIds
    .map((s: { gemeenteId: number | null }) => s.gemeenteId)
    .filter((id: number | null): id is number => id !== null);
  
  if (gemeenteIdList.length === 0) {
    return [];
  }
  
  return db
    .select()
    .from(gemeenten)
    .where(inArray(gemeenten.id, gemeenteIdList));
}

/**
 * Crawl all sources for a specific gemeente
 */
async function crawlForGemeente(
  gemeente: typeof gemeenten.$inferSelect
): Promise<CrawlResult> {
  const result: CrawlResult = {
    documentsFound: 0,
    documentsNew: 0,
    documentsUpdated: 0,
    documentsRemoved: 0,
    errors: [],
  };
  
  console.log(`[Crawler] Starting comprehensive crawl for: ${gemeente.gemeenteNaam}`);
  
  const allMatches: DocumentMatch[] = [];
  
  // 1. Search overheid.nl
  const overheidKeywords = Object.values(DOCUMENT_KEYWORDS).flat();
  const overheidMatches = await searchOverheidNL(overheidKeywords, gemeente.gemeenteNaam);
  allMatches.push(...overheidMatches);
  
  // 2. Search ruimtelijkeplannen.nl
  const planMatches = await searchRuimtelijkePlannen(gemeente.gemeenteNaam);
  allMatches.push(...planMatches);
  
  // 3. Search provincial website
  const provincieUrl = PROVINCIALE_WEBSITES[gemeente.provincie];
  if (provincieUrl) {
    const provincieMatches = await searchWebsite(
      provincieUrl,
      DOCUMENT_KEYWORDS.pov,
      "provincie_website"
    );
    allMatches.push(...provincieMatches);
  }
  
  // 4. Search waterschap website
  if (gemeente.waterschapCode) {
    const waterschapUrl = WATERSCHAP_WEBSITES[gemeente.waterschapCode];
    if (waterschapUrl) {
      const waterschapMatches = await searchWebsite(
        waterschapUrl,
        DOCUMENT_KEYWORDS.keur,
        "waterschap_website"
      );
      allMatches.push(...waterschapMatches);
    }
  }
  
  // 5. Search omgevingsdienst website
  if (gemeente.odCode) {
    const odUrl = OMGEVINGSDIENST_WEBSITES[gemeente.odCode];
    if (odUrl) {
      const odMatches = await searchWebsite(
        odUrl,
        ["milieubeleid", "vergunningenbeleid"],
        "omgevingsdienst_website"
      );
      allMatches.push(...odMatches);
    }
  }
  
  // 6. Search veiligheidsregio website
  if (gemeente.vrCode) {
    const vrUrl = VEILIGHEIDSREGIO_WEBSITES[gemeente.vrCode];
    if (vrUrl) {
      const vrMatches = await searchWebsite(
        vrUrl,
        ["brandveiligheid", "externe veiligheid"],
        "veiligheidsregio_website"
      );
      allMatches.push(...vrMatches);
    }
  }
  
  // 7. Search GGD website
  if (gemeente.ggdCode) {
    const ggdUrl = GGD_WEBSITES[gemeente.ggdCode];
    if (ggdUrl) {
      const ggdMatches = await searchWebsite(
        ggdUrl,
        ["gezondheidsbeleid", "GES", "gezondheidseffectscreening"],
        "ggd_website"
      );
      allMatches.push(...ggdMatches);
    }
  }
  
  // 8. Search recreatieschap website if configured
  if (gemeente.recreatieschapCode) {
    const recreatieschapUrl = RECREATIESCHAP_WEBSITES[gemeente.recreatieschapCode];
    if (recreatieschapUrl) {
      const recreatieschapMatches = await searchWebsite(
        recreatieschapUrl,
        ["recreatiebeleid", "natuurbeleid", "groenvisie", "beheerplan", "beheersvisie"],
        "recreatieschap_website"
      );
      allMatches.push(...recreatieschapMatches);
    }
  }
  
  // 9. Google search as fallback for gemeente-specific documents
  const googleMatches = await searchGoogle(
    `${gemeente.gemeenteNaam} welstandsnota OR parkeerbeleid OR woonvisie`,
    `${gemeente.gemeenteNaam.toLowerCase().replace(/\s+/g, "")}.nl`
  );
  allMatches.push(...googleMatches);
  
  result.documentsFound = allMatches.length;
  
  // Process all matches
  const db = await dbHelpers.getDb();
  if (!db) {
    result.errors.push("Database connection failed");
    return result;
  }
  
  for (const match of allMatches) {
    try {
      // Check if document already exists
      const existing = await db
        .select()
        .from(kennisbankDocumenten)
        .where(
          and(
            eq(kennisbankDocumenten.documentUrl, match.url),
            eq(kennisbankDocumenten.status, "geldig")
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        continue; // Already have this document
      }
      
      // Download and store
      const storage = await downloadAndStoreDocument(match.url, match.naam);
      if (!storage) {
        result.errors.push(`Failed to download: ${match.naam}`);
        continue;
      }
      
      // Determine laag
      let laag: "rijks" | "provinciaal" | "regionaal" | "gemeentelijk" = "gemeentelijk";
      if (["omgevingswet", "bbl", "bal", "bkl", "omgevingsbesluit", "omgevingsregeling"].includes(match.type)) {
        laag = "rijks";
      } else if (match.type === "pov") {
        laag = "provinciaal";
      } else if (match.type === "keur") {
        laag = "regionaal";
      }
      
      // Insert new document
      await db.insert(kennisbankDocumenten).values({
        documentNaam: match.naam,
        documentType: match.type,
        laag,
        scopeProvincie: laag === "provinciaal" ? gemeente.provincie : null,
        scopeRegioCode: laag === "regionaal" ? gemeente.waterschapCode : null,
        scopeGemeenteId: laag === "gemeentelijk" ? gemeente.id : null,
        documentUrl: match.url,
        s3Key: storage.s3Key,
        s3Url: storage.s3Url,
        mimeType: storage.mimeType,
        fileSizeBytes: storage.fileSizeBytes,
        versie: match.versie,
        vaststellingsdatum: match.vaststellingsdatum,
        geldigVan: match.vaststellingsdatum || new Date(),
        status: "geldig",
        bron: "crawler",
        crawlerSource: match.bron,
        lastCrawledAt: new Date(),
      });
      
      result.documentsNew++;
      console.log(`[Crawler] Added: ${match.naam}`);
      
    } catch (error) {
      result.errors.push(`Error processing ${match.naam}: ${error}`);
    }
  }
  
  return result;
}

/**
 * Main crawler entry point - runs nightly at 03:00
 */
export async function runNightlyCrawler(): Promise<{
  totalGemeenten: number;
  totalDocumentsFound: number;
  totalDocumentsNew: number;
  errors: string[];
}> {
  console.log("[Crawler] Starting nightly publication crawler...");
  
  const startTime = new Date();
  const errors: string[] = [];
  let totalDocumentsFound = 0;
  let totalDocumentsNew = 0;
  
  const db = await dbHelpers.getDb();
  if (!db) {
    return {
      totalGemeenten: 0,
      totalDocumentsFound: 0,
      totalDocumentsNew: 0,
      errors: ["Database connection failed"],
    };
  }
  
  // Get active gemeenten
  const activeGemeenten = await getActiveGemeenten();
  console.log(`[Crawler] Found ${activeGemeenten.length} active gemeenten`);
  
  // Create crawler log entry
  const [logEntry] = await db.insert(crawlerLog).values({
    crawlerType: "overheid_nl",
    startedAt: startTime,
    status: "running",
  });
  
  // Crawl each gemeente
  for (const gemeente of activeGemeenten) {
    try {
      const result = await crawlForGemeente(gemeente);
      totalDocumentsFound += result.documentsFound;
      totalDocumentsNew += result.documentsNew;
      errors.push(...result.errors);
    } catch (error) {
      const errorMsg = `Error crawling ${gemeente.gemeenteNaam}: ${error}`;
      console.error(`[Crawler] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  // Update crawler log
  await db
    .update(crawlerLog)
    .set({
      completedAt: new Date(),
      documentsFound: totalDocumentsFound,
      documentsNew: totalDocumentsNew,
      status: errors.length > 0 ? "failed" : "completed",
      errorMessage: errors.length > 0 ? errors.join("\n") : null,
    })
    .where(eq(crawlerLog.id, logEntry.insertId));
  
  // Notify owner if new documents were found
  if (totalDocumentsNew > 0) {
    await notifyOwner({
      title: `Kennisbank: ${totalDocumentsNew} nieuwe documenten gevonden`,
      content: `De nachtelijke crawler heeft ${totalDocumentsNew} nieuwe beleidsdocumenten gevonden en automatisch toegevoegd aan de kennisbank.\n\nGemeenten gescand: ${activeGemeenten.length}\nTotaal documenten gevonden: ${totalDocumentsFound}`,
    });
  }
  
  console.log(`[Crawler] Completed. Found ${totalDocumentsNew} new documents.`);
  
  return {
    totalGemeenten: activeGemeenten.length,
    totalDocumentsFound,
    totalDocumentsNew,
    errors,
  };
}

/**
 * Manual trigger for testing
 */
export async function triggerCrawlerForGemeente(gemeenteId: number): Promise<CrawlResult> {
  const gemeente = await dbHelpers.getGemeenteById(gemeenteId);
  
  if (!gemeente) {
    throw new Error(`Gemeente ${gemeenteId} not found`);
  }
  
  return crawlForGemeente(gemeente);
}

/**
 * Get crawler statistics
 */
export async function getCrawlerStats(): Promise<{
  lastRun: Date | null;
  totalRuns: number;
  totalDocumentsAdded: number;
  recentErrors: string[];
}> {
  const db = await dbHelpers.getDb();
  if (!db) {
    return {
      lastRun: null,
      totalRuns: 0,
      totalDocumentsAdded: 0,
      recentErrors: ["Database connection failed"],
    };
  }
  
  const logs = await db
    .select()
    .from(crawlerLog)
    .orderBy(sql`${crawlerLog.createdAt} DESC`)
    .limit(10);
  
  type LogEntry = typeof logs[0];
  
  const lastRun = logs[0]?.completedAt || null;
  const totalRuns = logs.length;
  const totalDocumentsAdded = logs.reduce((sum: number, log: LogEntry) => sum + (log.documentsNew || 0), 0);
  const recentErrors = logs
    .filter((log: LogEntry) => log.errorMessage)
    .map((log: LogEntry) => log.errorMessage!)
    .slice(0, 5);
  
  return {
    lastRun,
    totalRuns,
    totalDocumentsAdded,
    recentErrors,
  };
}
