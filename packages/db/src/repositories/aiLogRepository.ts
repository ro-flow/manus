import { desc, eq } from 'drizzle-orm';
import { getDb } from '../client.js';
import { aiAuditLog, type AiAuditLogEntry } from '../schema.js';

export interface LogAICallInput {
  aanvraagId?: string;
  provider: string;
  model?: string;
  sanitizedPayload: Record<string, unknown>;
  aiResponse?: string;
  durationMs?: string;
  privacyBlocked?: boolean;
  errorMessage?: string;
}

export const aiLogRepository = {
  async log(input: LogAICallInput): Promise<AiAuditLogEntry> {
    const db = getDb();
    const [row] = await db.insert(aiAuditLog).values(input).returning();
    return row;
  },

  async findByAanvraagId(aanvraagId: string): Promise<AiAuditLogEntry[]> {
    const db = getDb();
    return db
      .select()
      .from(aiAuditLog)
      .where(eq(aiAuditLog.aanvraagId, aanvraagId))
      .orderBy(desc(aiAuditLog.timestamp));
  },

  async findRecent(limit = 50): Promise<AiAuditLogEntry[]> {
    const db = getDb();
    return db
      .select()
      .from(aiAuditLog)
      .orderBy(desc(aiAuditLog.timestamp))
      .limit(limit);
  },
};
