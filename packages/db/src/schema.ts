import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  pgEnum,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const aanvraagStatusEnum = pgEnum('aanvraag_status', [
  'concept',
  'ingediend',
  'in_behandeling',
  'afgehandeld',
  'geweigerd',
]);

// Aanvragen — bevat GEEN NAW. Alleen inhoudelijke gegevens.
export const aanvragen = pgTable(
  'aanvragen',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gemeente: varchar('gemeente', { length: 100 }).notNull(),
    gebiedstype: varchar('gebiedstype', { length: 100 }),
    activiteitType: varchar('activiteit_type', { length: 200 }),
    activiteitOmschrijving: text('activiteit_omschrijving'),
    status: aanvraagStatusEnum('status').default('concept').notNull(),
    pdfBlobUrl: text('pdf_blob_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    gemeenteIdx: index('aanvragen_gemeente_idx').on(t.gemeente),
  })
);

// Aanvrager PII — NAW-gegevens gescheiden van aanvraagdata.
// In productie: kolommen versleuteld met Azure Key Vault-managed keys.
export const aanvragerPii = pgTable('aanvrager_pii', {
  id: uuid('id').defaultRandom().primaryKey(),
  aanvraagId: uuid('aanvraag_id')
    .references(() => aanvragen.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  naam: text('naam').notNull(),
  email: text('email'),
  telefoon: text('telefoon'),
  adres: text('adres'),
  postcode: varchar('postcode', { length: 10 }),
  woonplaats: varchar('woonplaats', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI Audit Log — elke AI-aanroep wordt gelogd inclusief wat er naar AI ging én wat AI teruggaf.
// sanitizedPayload bevat nooit NAW. privacyBlocked=true als de privacy filter heeft geblokkeerd.
export const aiAuditLog = pgTable(
  'ai_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    aanvraagId: uuid('aanvraag_id').references(() => aanvragen.id, { onDelete: 'set null' }),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }),
    sanitizedPayload: jsonb('sanitized_payload').notNull(),
    aiResponse: text('ai_response'),
    durationMs: varchar('duration_ms', { length: 20 }),
    privacyBlocked: boolean('privacy_blocked').default(false).notNull(),
    errorMessage: text('error_message'),
  },
  (t) => ({
    aanvraagIdx: index('ai_log_aanvraag_idx').on(t.aanvraagId),
    timestampIdx: index('ai_log_timestamp_idx').on(t.timestamp),
  })
);

export type Aanvraag = typeof aanvragen.$inferSelect;
export type NewAanvraag = typeof aanvragen.$inferInsert;
export type AanvragerPii = typeof aanvragerPii.$inferSelect;
export type NewAanvragerPii = typeof aanvragerPii.$inferInsert;
export type AiAuditLogEntry = typeof aiAuditLog.$inferSelect;
export type NewAiAuditLogEntry = typeof aiAuditLog.$inferInsert;
