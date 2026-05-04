import { getDb } from '../client.js';
import { pilotAanmeldingen } from '../schema.js';
import type { NewPilotAanmelding } from '../schema.js';

export const pilotRepository = {
  async create(input: NewPilotAanmelding) {
    const db = getDb();
    const [entry] = await db.insert(pilotAanmeldingen).values(input).returning();
    return entry;
  },
  async findAll() {
    const db = getDb();
    return db.select().from(pilotAanmeldingen).orderBy(pilotAanmeldingen.createdAt);
  },
};
