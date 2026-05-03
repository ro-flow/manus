/**
 * Database Backup Service
 * 
 * Exporteert alle tabellen naar JSON en uploadt naar S3.
 * Stuurt notificatie naar eigenaar bij elke backup.
 */

import { getDb } from '../db';
import { storagePut } from '../storage';
import { notifyOwner } from '../_core/notification';
import {
  users, gemeenten, gemeenteRegioLookup, seats,
  beleidsdocumenten, behandelrapportLog, adviseurs,
  geminiCache, subscriptions, payments,
  kennisbankItems, kennisbankRijksWetgeving, kennisbankDocumenten,
  crawlerLog, toetsingsmatrix, rapportFeedback, feedbackPatronen,
  jurisprudentie, jurisprudentieThemas, jurisprudentieToetsingskaderLink,
  jurisprudentieBeleidsverwijzing, beleidSuggestie, jurisprudentieCrawlerLog
} from '../../drizzle/schema';

interface BackupResult {
  success: boolean;
  timestamp: string;
  s3Url?: string;
  s3Key?: string;
  tableCount: number;
  totalRows: number;
  sizeBytes: number;
  error?: string;
  duration: number;
}

// All tables to backup with their names
const TABLES = [
  { name: 'users', table: users },
  { name: 'gemeenten', table: gemeenten },
  { name: 'gemeente_regio_lookup', table: gemeenteRegioLookup },
  { name: 'seats', table: seats },
  { name: 'beleidsdocumenten', table: beleidsdocumenten },
  { name: 'behandelrapport_log', table: behandelrapportLog },
  { name: 'adviseurs', table: adviseurs },
  { name: 'gemini_cache', table: geminiCache },
  { name: 'subscriptions', table: subscriptions },
  { name: 'payments', table: payments },
  { name: 'kennisbank_items', table: kennisbankItems },
  { name: 'kennisbank_rijks_wetgeving', table: kennisbankRijksWetgeving },
  { name: 'kennisbank_documenten', table: kennisbankDocumenten },
  { name: 'crawler_log', table: crawlerLog },
  { name: 'toetsingsmatrix', table: toetsingsmatrix },
  { name: 'rapport_feedback', table: rapportFeedback },
  { name: 'feedback_patronen', table: feedbackPatronen },
  { name: 'jurisprudentie', table: jurisprudentie },
  { name: 'jurisprudentie_themas', table: jurisprudentieThemas },
  { name: 'jurisprudentie_toetsingskader_link', table: jurisprudentieToetsingskaderLink },
  { name: 'jurisprudentie_beleidsverwijzing', table: jurisprudentieBeleidsverwijzing },
  { name: 'beleid_suggestie', table: beleidSuggestie },
  { name: 'jurisprudentie_crawler_log', table: jurisprudentieCrawlerLog },
] as const;

export async function createDatabaseBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Export all tables
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;

    for (const { name, table } of TABLES) {
      try {
        const rows = await db.select().from(table);
        backupData[name] = rows;
        totalRows += rows.length;
      } catch (err: any) {
        // Table might not exist yet, skip it
        console.warn(`[Backup] Skipping table ${name}: ${err.message}`);
        backupData[name] = [];
      }
    }

    // Create backup JSON
    const backupJson = JSON.stringify({
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tableCount: TABLES.length,
        totalRows,
        tables: Object.entries(backupData).map(([name, rows]) => ({
          name,
          rowCount: rows.length,
        })),
      },
      data: backupData,
    }, null, 2);

    const sizeBytes = Buffer.byteLength(backupJson, 'utf-8');

    // Upload to S3
    const s3Key = `backups/db-backup-${timestamp}.json`;
    const { url: s3Url, key } = await storagePut(
      s3Key,
      Buffer.from(backupJson, 'utf-8'),
      'application/json'
    );

    const duration = Date.now() - startTime;

    // Notify owner
    const tablesSummary = Object.entries(backupData)
      .filter(([_, rows]) => rows.length > 0)
      .map(([name, rows]) => `${name}: ${rows.length} rijen`)
      .join('\n');

    await notifyOwner({
      title: `✅ Database Backup Succesvol`,
      content: `Database backup gemaakt op ${new Date().toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}

Totaal: ${totalRows} rijen in ${TABLES.length} tabellen
Bestandsgrootte: ${(sizeBytes / 1024).toFixed(1)} KB
Duur: ${(duration / 1000).toFixed(1)} seconden

Tabellen:
${tablesSummary}

Download: ${s3Url}`,
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      s3Url,
      s3Key: key,
      tableCount: TABLES.length,
      totalRows,
      sizeBytes,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Notify owner of failure
    try {
      await notifyOwner({
        title: `❌ Database Backup Mislukt`,
        content: `De database backup is mislukt op ${new Date().toLocaleDateString('nl-NL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}

Fout: ${error.message}

Controleer de server logs voor meer details.`,
      });
    } catch (notifyErr) {
      console.error('[Backup] Failed to send failure notification:', notifyErr);
    }

    return {
      success: false,
      timestamp: new Date().toISOString(),
      tableCount: 0,
      totalRows: 0,
      sizeBytes: 0,
      error: error.message,
      duration,
    };
  }
}
