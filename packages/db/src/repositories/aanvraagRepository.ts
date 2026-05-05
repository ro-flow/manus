import { eq } from 'drizzle-orm';
import { getDb } from '../client.js';
import {
  aanvragen,
  aanvragerPii,
  type Aanvraag,
  type AanvragerPii,
} from '../schema.js';

export interface CreateAanvraagInput {
  gemeente: string;
  gebiedstype?: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  aanvraagnummer?: string;
  aanvraagdatum?: string;
  percelen?: unknown;
}

export interface SavePiiInput {
  naam: string;
  email?: string;
  telefoon?: string;
  adres?: string;
  postcode?: string;
  woonplaats?: string;
}

export const aanvraagRepository = {
  async create(input: CreateAanvraagInput): Promise<Aanvraag> {
    const db = getDb();
    const [row] = await db.insert(aanvragen).values(input).returning();
    return row;
  },

  async findById(id: string): Promise<Aanvraag | null> {
    const db = getDb();
    const [row] = await db.select().from(aanvragen).where(eq(aanvragen.id, id));
    return row ?? null;
  },

  async updatePdfUrl(id: string, pdfBlobUrl: string): Promise<void> {
    const db = getDb();
    await db
      .update(aanvragen)
      .set({ pdfBlobUrl, updatedAt: new Date() })
      .where(eq(aanvragen.id, id));
  },

  async updateStatus(id: string, status: Aanvraag['status']): Promise<void> {
    const db = getDb();
    await db
      .update(aanvragen)
      .set({ status, updatedAt: new Date() })
      .where(eq(aanvragen.id, id));
  },

  async savePii(aanvraagId: string, input: SavePiiInput): Promise<AanvragerPii> {
    const db = getDb();
    const [row] = await db
      .insert(aanvragerPii)
      .values({ aanvraagId, ...input })
      .returning();
    return row;
  },

  async findPiiByAanvraagId(aanvraagId: string): Promise<AanvragerPii | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(aanvragerPii)
      .where(eq(aanvragerPii.aanvraagId, aanvraagId));
    return row ?? null;
  },
};
