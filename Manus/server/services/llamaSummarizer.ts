/**
 * Llama 3.3 70B Summarizer Service
 * 
 * Genereert samenvattingen van beleidsdocumenten via Groq (primair) of Together.ai (fallback)
 * 
 * Groq: GRATIS tier met 14.400 requests/dag
 * Together.ai: €0.0001-€0.0003 per samenvatting (~€0.15/maand bij 500 documenten)
 * 
 * Dit is een batch-job die alleen draait bij nieuwe documenten.
 */

import { kennisbankDocumenten } from "../../drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
import * as dbHelpers from "../db";

// API configurations
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

// Models
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Groq's Llama 3.3 70B
const TOGETHER_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

const MAX_TOKENS = 500;

interface SummaryResult {
  samenvatting: string;
  toepassingscriteria: string;
  relevanteActiviteiten: string[];
}

/**
 * System prompt for generating policy document summaries
 */
const SYSTEM_PROMPT = `Je bent een expert in Nederlandse ruimtelijke ordening en omgevingsrecht.
Je taak is om beleidsdocumenten samen te vatten voor gebruik in een kennisbank die behandelaars helpt bij omgevingsvergunningen.

Genereer een JSON response met exact deze structuur:
{
  "samenvatting": "Beknopte samenvatting van het document (max 300 woorden)",
  "toepassingscriteria": "Wanneer is dit document van toepassing bij omgevingsvergunningen?",
  "relevanteActiviteiten": ["activiteit1", "activiteit2", ...]
}

De samenvatting moet bevatten:
1. Hoofddoel en scope van het document
2. Belangrijkste regels, criteria of normen
3. Uitzonderingen of bijzondere bepalingen

De toepassingscriteria beschrijven wanneer een behandelaar dit document moet raadplegen.

De relevanteActiviteiten zijn een lijst van activiteiten waarvoor dit document relevant is, zoals:
- "bouwen" (nieuwbouw, verbouw, uitbreiding)
- "slopen" (sloopvergunning)
- "kappen" (bomenkap)
- "uitweg" (inrit/uitrit)
- "reclame" (reclame-uitingen)
- "evenement" (evenementenvergunning)
- "horeca" (horeca-exploitatie)
- "milieu" (milieuactiviteiten)
- "monument" (monumentenwijziging)
- "afwijken_omgevingsplan" (BOPA)

Schrijf in het Nederlands. Wees beknopt maar volledig.`;

/**
 * Extract text from PDF using pdf-parse or similar
 * Note: In production, this would use a proper PDF extraction library
 */
async function extractTextFromPdf(pdfUrl: string): Promise<string | null> {
  try {
    // Fetch the PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // In production, use pdf-parse or similar library
    // For now, we'll return a placeholder that indicates PDF extraction is needed
    // const pdfParse = require('pdf-parse');
    // const data = await pdfParse(Buffer.from(buffer));
    // return data.text;
    
    console.warn("[Summarizer] PDF text extraction not implemented - using placeholder");
    return null;
    
  } catch (error) {
    console.error(`[Summarizer] Error extracting PDF text:`, error);
    return null;
  }
}

/**
 * Generate summary using Groq API (primary - FREE tier)
 */
async function generateSummaryWithGroq(
  documentText: string,
  documentNaam: string,
  documentType: string
): Promise<SummaryResult | null> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    console.warn("[Summarizer] GROQ_API_KEY not configured");
    return null;
  }
  
  try {
    const userPrompt = `Document: "${documentNaam}"
Type: ${documentType}

Inhoud:
${documentText.substring(0, 12000)}

${documentText.length > 12000 ? "[... document is ingekort voor verwerking ...]" : ""}

Genereer de JSON samenvatting:`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.2, // Low temperature for consistent output
        response_format: { type: "json_object" },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from Groq");
    }
    
    // Parse JSON response
    const result = JSON.parse(content);
    
    console.log(`[Summarizer] Generated summary via Groq for: ${documentNaam}`);
    
    return {
      samenvatting: result.samenvatting || "",
      toepassingscriteria: result.toepassingscriteria || "",
      relevanteActiviteiten: result.relevanteActiviteiten || [],
    };
    
  } catch (error) {
    console.error(`[Summarizer] Groq error for ${documentNaam}:`, error);
    return null;
  }
}

/**
 * Generate summary using Together.ai API (fallback)
 */
async function generateSummaryWithTogether(
  documentText: string,
  documentNaam: string,
  documentType: string
): Promise<SummaryResult | null> {
  const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
  
  if (!TOGETHER_API_KEY) {
    console.warn("[Summarizer] TOGETHER_API_KEY not configured");
    return null;
  }
  
  try {
    const userPrompt = `Document: "${documentNaam}"
Type: ${documentType}

Inhoud:
${documentText.substring(0, 12000)}

${documentText.length > 12000 ? "[... document is ingekort voor verwerking ...]" : ""}

Genereer de JSON samenvatting:`;

    const response = await fetch(TOGETHER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TOGETHER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.2, // Low temperature for consistent output
        response_format: { type: "json_object" },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together.ai API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from Together.ai");
    }
    
    // Parse JSON response
    const result = JSON.parse(content);
    
    console.log(`[Summarizer] Generated summary via Together.ai for: ${documentNaam}`);
    
    return {
      samenvatting: result.samenvatting || "",
      toepassingscriteria: result.toepassingscriteria || "",
      relevanteActiviteiten: result.relevanteActiviteiten || [],
    };
    
  } catch (error) {
    console.error(`[Summarizer] Together.ai error for ${documentNaam}:`, error);
    return null;
  }
}

/**
 * Generate summary using Llama 3.3 70B
 * Tries Groq first (free), falls back to Together.ai
 */
export async function generateSummary(
  documentText: string,
  documentNaam: string,
  documentType: string
): Promise<SummaryResult | null> {
  // Try Groq first (FREE tier - 14,400 requests/day)
  const groqResult = await generateSummaryWithGroq(documentText, documentNaam, documentType);
  if (groqResult) {
    return groqResult;
  }
  
  // Fallback to Together.ai
  console.log(`[Summarizer] Groq failed, trying Together.ai for: ${documentNaam}`);
  return generateSummaryWithTogether(documentText, documentNaam, documentType);
}

/**
 * Test Groq API connection
 */
export async function testGroqConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    return { success: false, error: "GROQ_API_KEY not configured" };
  }
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "user", content: "Zeg alleen 'OK' als je dit leest." },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error ${response.status}: ${errorText}` };
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      return { success: true, model: data.model || GROQ_MODEL };
    }
    
    return { success: false, error: "Empty response" };
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Process a single document - generate summary and update database
 */
async function processDocument(
  document: typeof kennisbankDocumenten.$inferSelect
): Promise<boolean> {
  const db = await dbHelpers.getDb();
  if (!db) return false;
  
  console.log(`[Summarizer] Processing: ${document.documentNaam}`);
  
  // Extract text from PDF
  let documentText: string | null = null;
  
  if (document.s3Url) {
    documentText = await extractTextFromPdf(document.s3Url);
  }
  
  if (!documentText) {
    // Fallback: use document name and type for basic summary
    documentText = `Dit is een ${document.documentType} document genaamd "${document.documentNaam}".`;
  }
  
  // Generate summary
  const result = await generateSummary(
    documentText,
    document.documentNaam,
    document.documentType
  );
  
  if (!result) {
    console.error(`[Summarizer] Failed to generate summary for: ${document.documentNaam}`);
    return false;
  }
  
  // Update database
  await db
    .update(kennisbankDocumenten)
    .set({
      samenvatting: result.samenvatting,
      toepassingscriteria: result.toepassingscriteria,
      relevanteActiviteiten: JSON.stringify(result.relevanteActiviteiten),
      samenvattingGeneratedAt: new Date(),
    })
    .where(eq(kennisbankDocumenten.id, document.id));
  
  console.log(`[Summarizer] Summary generated for: ${document.documentNaam}`);
  return true;
}

/**
 * Batch process all documents without summaries
 * This is the main entry point for the batch job
 */
export async function processPendingSummaries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const db = await dbHelpers.getDb();
  if (!db) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: ["Database connection failed"],
    };
  }
  
  console.log("[Summarizer] Starting batch summary generation...");
  
  // Get documents without summaries
  const pendingDocuments = await db
    .select()
    .from(kennisbankDocumenten)
    .where(
      and(
        isNull(kennisbankDocumenten.samenvatting),
        eq(kennisbankDocumenten.status, "geldig")
      )
    )
    .limit(100); // Process max 100 at a time to avoid timeout
  
  console.log(`[Summarizer] Found ${pendingDocuments.length} documents without summaries`);
  
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const document of pendingDocuments) {
    try {
      const success = await processDocument(document);
      if (success) {
        succeeded++;
      } else {
        failed++;
        errors.push(`Failed to process: ${document.documentNaam}`);
      }
      
      // Rate limiting: wait 200ms between requests (Groq allows more requests)
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      failed++;
      errors.push(`Error processing ${document.documentNaam}: ${error}`);
    }
  }
  
  console.log(`[Summarizer] Batch complete. Succeeded: ${succeeded}, Failed: ${failed}`);
  
  return {
    processed: pendingDocuments.length,
    succeeded,
    failed,
    errors,
  };
}

/**
 * Generate summary for a specific document by ID
 */
export async function generateSummaryForDocument(documentId: number): Promise<boolean> {
  const db = await dbHelpers.getDb();
  if (!db) return false;
  
  const [document] = await db
    .select()
    .from(kennisbankDocumenten)
    .where(eq(kennisbankDocumenten.id, documentId))
    .limit(1);
  
  if (!document) {
    console.error(`[Summarizer] Document ${documentId} not found`);
    return false;
  }
  
  return processDocument(document);
}

/**
 * Get summary statistics
 */
export async function getSummaryStats(): Promise<{
  totalDocuments: number;
  withSummary: number;
  withoutSummary: number;
  lastGenerated: Date | null;
}> {
  const db = await dbHelpers.getDb();
  if (!db) {
    return {
      totalDocuments: 0,
      withSummary: 0,
      withoutSummary: 0,
      lastGenerated: null,
    };
  }
  
  const allDocs = await db
    .select()
    .from(kennisbankDocumenten)
    .where(eq(kennisbankDocumenten.status, "geldig"));
  
  const withSummary = allDocs.filter(d => d.samenvatting !== null);
  const withoutSummary = allDocs.filter(d => d.samenvatting === null);
  
  // Find most recent summary generation
  const lastGenerated = withSummary
    .map(d => d.samenvattingGeneratedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
  
  return {
    totalDocuments: allDocs.length,
    withSummary: withSummary.length,
    withoutSummary: withoutSummary.length,
    lastGenerated,
  };
}

/**
 * Estimate cost for pending summaries
 * Groq is FREE, Together.ai costs ~$0.0001-0.0003 per summary
 */
export async function estimateCost(): Promise<{
  pendingCount: number;
  estimatedCostEur: number;
  estimatedCostUsd: number;
  provider: string;
}> {
  const db = await dbHelpers.getDb();
  if (!db) {
    return { pendingCount: 0, estimatedCostEur: 0, estimatedCostUsd: 0, provider: "unknown" };
  }
  
  const pendingDocs = await db
    .select()
    .from(kennisbankDocumenten)
    .where(
      and(
        isNull(kennisbankDocumenten.samenvatting),
        eq(kennisbankDocumenten.status, "geldig")
      )
    );
  
  const pendingCount = pendingDocs.length;
  
  // Check which provider will be used
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasTogether = !!process.env.TOGETHER_API_KEY;
  
  if (hasGroq) {
    // Groq is FREE (14,400 requests/day)
    return {
      pendingCount,
      estimatedCostEur: 0,
      estimatedCostUsd: 0,
      provider: "Groq (gratis)",
    };
  }
  
  if (hasTogether) {
    const avgCostPerSummaryUsd = 0.0002; // Average of $0.0001-$0.0003
    const estimatedCostUsd = pendingCount * avgCostPerSummaryUsd;
    const estimatedCostEur = estimatedCostUsd * 0.92; // Approximate EUR/USD rate
    
    return {
      pendingCount,
      estimatedCostEur: Math.round(estimatedCostEur * 10000) / 10000,
      estimatedCostUsd: Math.round(estimatedCostUsd * 10000) / 10000,
      provider: "Together.ai",
    };
  }
  
  return {
    pendingCount,
    estimatedCostEur: 0,
    estimatedCostUsd: 0,
    provider: "Geen provider geconfigureerd",
  };
}
