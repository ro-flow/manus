import { BlobServiceClient } from '@azure/storage-blob';

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING omgevingsvariabele is niet ingesteld');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER ?? 'aanvraag-pdfs';

export async function uploadToBlobStorage(
  aanvraagId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);

  await containerClient.createIfNotExists();

  const ext = originalFilename.split('.').pop() ?? 'pdf';
  const blobName = `${aanvraagId}/${Date.now()}.${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: 'application/pdf' },
  });

  return blockBlobClient.url;
}

export async function deleteBlobForAanvraag(aanvraagId: string): Promise<void> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);

  for await (const blob of containerClient.listBlobsFlat({ prefix: `${aanvraagId}/` })) {
    await containerClient.deleteBlob(blob.name);
  }
}
