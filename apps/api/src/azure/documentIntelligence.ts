import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';

export function logAzureDiStatus(): void {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  console.log(`[Azure DI] endpoint: ${endpoint ? endpoint.slice(0, 30) + '...' : 'NIET INGESTELD'}`);
  console.log(`[Azure DI] key: ${key ? key.slice(0, 10) + '...' : 'NIET INGESTELD'}`);
}

export async function extracteerUitPDF(buffer: Buffer): Promise<string> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT en AZURE_DOCUMENT_INTELLIGENCE_KEY zijn verplicht');
  }

  console.log(`[Azure DI] aanroep gestart, bestandsgrootte: ${buffer.length} bytes`);

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
  // prebuilt-document leest ook tabellen en sleutel-waardeparen (beter voor DSO-formulieren)
  const poller = await client.beginAnalyzeDocument('prebuilt-document', buffer);
  const result = await poller.pollUntilDone();

  if (!result.content) {
    throw new Error('Azure Document Intelligence gaf geen tekstinhoud terug');
  }

  // Voeg sleutel-waardeparen toe die niet al in de gewone tekst staan
  let tekst = result.content;
  if (result.keyValuePairs && result.keyValuePairs.length > 0) {
    const kvExtras = result.keyValuePairs
      .filter(kv => kv.key?.content && kv.value?.content)
      .map(kv => `${kv.key.content}\n${kv.value!.content}`)
      .join('\n');
    if (kvExtras) tekst = tekst + '\n\n--- formuliervelden ---\n' + kvExtras;
  }

  console.log(`[Azure DI] response ontvangen, tekst: ${result.content.length} tekens, kv-paren: ${result.keyValuePairs?.length ?? 0}`);
  console.log('[Azure DI] volledige tekst:\n' + tekst);
  return tekst;
}
