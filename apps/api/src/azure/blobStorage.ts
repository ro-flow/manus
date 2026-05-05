import { BlobServiceClient } from '@azure/storage-blob';

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'];
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING omgevingsvariabele is niet ingesteld');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

const PDF_CONTAINER = process.env['AZURE_BLOB_CONTAINER'] ?? 'aanvraag-pdfs';
const GEMEENTE_CONTAINER = 'gemeente-assets';

// ── PDF ───────────────────────────────────────────────────────────────────────

// Upload PDF naar Azure Blob — nooit in database opslaan (AVG)
export async function uploadPDF(
  aanvraagId: string,
  buffer: Buffer,
  bestandsnaam: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(PDF_CONTAINER);
  await containerClient.createIfNotExists();

  const blobName = `aanvragen/${aanvraagId}/${bestandsnaam}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: 'application/pdf' },
  });

  return blockBlobClient.url;
}

// Download PDF uit Azure Blob
export async function downloadPDF(aanvraagId: string): Promise<Buffer> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(PDF_CONTAINER);

  for await (const blob of containerClient.listBlobsFlat({ prefix: `aanvragen/${aanvraagId}/` })) {
    const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
    const downloadResponse = await blockBlobClient.download();
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as unknown as Uint8Array));
    }
    return Buffer.concat(chunks);
  }

  throw new Error(`Geen PDF gevonden voor aanvraag ${aanvraagId}`);
}

// ── Logo ──────────────────────────────────────────────────────────────────────

// Upload gemeente logo — gemeenten/{gemeenteId}/logo.{ext}
export async function uploadLogo(
  gemeenteId: string,
  buffer: Buffer,
  bestandsnaam: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(GEMEENTE_CONTAINER);
  await containerClient.createIfNotExists();

  const ext = bestandsnaam.split('.').pop() ?? 'png';
  const blobName = `gemeenten/${gemeenteId}/logo.${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const contentType = ext === 'svg' ? 'image/svg+xml' : 'image/png';
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

// ── Intern ────────────────────────────────────────────────────────────────────

export async function deleteBlobsVoorAanvraag(aanvraagId: string): Promise<void> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(PDF_CONTAINER);

  for await (const blob of containerClient.listBlobsFlat({ prefix: `aanvragen/${aanvraagId}/` })) {
    await containerClient.deleteBlob(blob.name);
  }
}

// Backward compat — uploadToBlobStorage wordt nog gebruikt in aanvragen.ts
export async function uploadToBlobStorage(
  aanvraagId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<string> {
  return uploadPDF(aanvraagId, buffer, originalFilename);
}
