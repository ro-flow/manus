import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';

export async function extracteerUitPDF(buffer: Buffer): Promise<string> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT en AZURE_DOCUMENT_INTELLIGENCE_KEY zijn verplicht');
  }

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

  const poller = await client.beginAnalyzeDocument('prebuilt-read', buffer);
  const result = await poller.pollUntilDone();

  if (!result.content) {
    throw new Error('Azure Document Intelligence gaf geen tekstinhoud terug');
  }

  return result.content;
}
