/**
 * Database Restore Script voor Ro-flow
 * 
 * Gebruik:
 *   node scripts/restore-db.mjs <backup-url-of-pad>
 * 
 * Voorbeeld:
 *   node scripts/restore-db.mjs https://d2xsxph8kpxj0f.cloudfront.net/.../backups/db-backup-2026-02-28.json
 *   node scripts/restore-db.mjs ./backup.json
 * 
 * Vereisten:
 *   - DATABASE_URL environment variable moet gezet zijn
 *   - Database tabellen moeten al bestaan (via drizzle migraties)
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

// ============ CONFIGURATIE ============

// Tabellen in de juiste volgorde (foreign keys respecteren)
// Eerst tabellen zonder dependencies, dan tabellen met dependencies
const TABLE_INSERT_ORDER = [
  'users',
  'gemeenten',
  'gemeente_regio_lookup',
  'seats',
  'beleidsdocumenten',
  'adviseurs',
  'gemini_cache',
  'subscriptions',
  'payments',
  'kennisbank_items',
  'kennisbank_rijks_wetgeving',
  'kennisbank_documenten',
  'crawler_log',
  'toetsingsmatrix',
  'behandelrapport_log',
  'rapport_feedback',
  'feedback_patronen',
  'jurisprudentie',
  'jurisprudentie_themas',
  'jurisprudentie_toetsingskader_link',
  'jurisprudentie_beleidsverwijzing',
  'beleid_suggestie',
  'jurisprudentie_crawler_log',
];

// ============ HELPERS ============

function formatValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
  // String - escape quotes
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function convertDateStrings(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const [key, val] of Object.entries(result)) {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      result[key] = new Date(val);
    }
  }
  return result;
}

// ============ MAIN ============

async function main() {
  const backupSource = process.argv[2];
  
  if (!backupSource) {
    console.error('❌ Gebruik: node scripts/restore-db.mjs <backup-url-of-pad>');
    console.error('   Voorbeeld: node scripts/restore-db.mjs ./backup.json');
    console.error('   Voorbeeld: node scripts/restore-db.mjs https://example.com/backup.json');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is niet gezet');
    process.exit(1);
  }

  // Laad backup data
  console.log(`📥 Backup laden van: ${backupSource}`);
  let backupJson;
  
  if (backupSource.startsWith('http://') || backupSource.startsWith('https://')) {
    const response = await fetch(backupSource);
    if (!response.ok) {
      console.error(`❌ Kan backup niet downloaden: ${response.status} ${response.statusText}`);
      process.exit(1);
    }
    backupJson = await response.json();
  } else {
    try {
      const fileContent = readFileSync(backupSource, 'utf-8');
      backupJson = JSON.parse(fileContent);
    } catch (err) {
      console.error(`❌ Kan backup bestand niet lezen: ${err.message}`);
      process.exit(1);
    }
  }

  // Valideer backup
  if (!backupJson.metadata || !backupJson.data) {
    console.error('❌ Ongeldig backup formaat: metadata of data ontbreekt');
    process.exit(1);
  }

  console.log(`\n📊 Backup informatie:`);
  console.log(`   Datum: ${backupJson.metadata.timestamp}`);
  console.log(`   Tabellen: ${backupJson.metadata.tableCount}`);
  console.log(`   Totaal rijen: ${backupJson.metadata.totalRows}`);
  console.log('');

  // Verbind met database
  console.log('🔌 Verbinden met database...');
  const connection = await createConnection(databaseUrl);
  
  try {
    // Disable foreign key checks voor restore
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    let totalInserted = 0;
    let tablesRestored = 0;
    let tablesSkipped = 0;
    let errors = [];

    for (const tableName of TABLE_INSERT_ORDER) {
      const rows = backupJson.data[tableName];
      
      if (!rows || rows.length === 0) {
        console.log(`   ⏭️  ${tableName}: geen data (overgeslagen)`);
        tablesSkipped++;
        continue;
      }

      try {
        // Leeg de tabel eerst
        await connection.execute(`DELETE FROM \`${tableName}\``);
        
        // Insert rijen in batches van 50
        const batchSize = 50;
        let inserted = 0;
        
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const convertedRow = convertDateStrings(row);
            const columns = Object.keys(convertedRow);
            const values = columns.map(col => formatValue(convertedRow[col]));
            
            const sql = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${values.join(', ')})`;
            
            try {
              await connection.execute(sql);
              inserted++;
            } catch (insertErr) {
              // Skip duplicate key errors (data might already exist)
              if (insertErr.code !== 'ER_DUP_ENTRY') {
                throw insertErr;
              }
            }
          }
        }
        
        console.log(`   ✅ ${tableName}: ${inserted} rijen hersteld`);
        totalInserted += inserted;
        tablesRestored++;
      } catch (err) {
        console.error(`   ❌ ${tableName}: FOUT - ${err.message}`);
        errors.push({ table: tableName, error: err.message });
      }
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Samenvatting
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESTORE SAMENVATTING');
    console.log('='.repeat(50));
    console.log(`   Tabellen hersteld: ${tablesRestored}`);
    console.log(`   Tabellen overgeslagen: ${tablesSkipped}`);
    console.log(`   Totaal rijen ingevoegd: ${totalInserted}`);
    
    if (errors.length > 0) {
      console.log(`\n   ⚠️  ${errors.length} fouten:`);
      for (const { table, error } of errors) {
        console.log(`      - ${table}: ${error}`);
      }
    } else {
      console.log('\n   🎉 Restore succesvol afgerond!');
    }

  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('❌ Onverwachte fout:', err);
  process.exit(1);
});
