import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Read CSV file
const csvContent = readFileSync('/home/ubuntu/upload/Beleidsdocumenten-Gridview(1).csv', 'utf-8');

// Parse CSV
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

// Generate SQL statements
const statements = [];

for (const row of records) {
  // Skip empty rows
  if (!row.Document_Naam || row.Document_Naam.trim() === '') continue;
  
  const documentNaam = row.Document_Naam.replace(/'/g, "''");
  const documentType = mapDocumentType(row.Document_Type);
  const gemeente = row.Gemeente?.trim() || null;
  const url = row.URL?.trim() || null;
  const relevantieTags = row.Relevantie_Tags?.trim() || null;
  const altijdOphalen = row.Altijd_Ophalen === 'checked' || row.Altijd_Ophalen === 'true';
  const laatstGecontroleerd = row.Laatst_Gecontroleerd?.trim() || null;
  
  // We'll need to look up gemeenteId - for now use a subquery or NULL
  const gemeenteIdQuery = gemeente 
    ? `(SELECT id FROM gemeenten WHERE gemeenteNaam = '${gemeente.replace(/'/g, "''")}' LIMIT 1)`
    : 'NULL';
  
  const sql = `INSERT INTO beleidsdocumenten (documentNaam, documentType, gemeenteId, url, relevantieTags, altijdOphalen) VALUES ('${documentNaam}', '${documentType}', COALESCE(${gemeenteIdQuery}, 1), ${url ? `'${url.replace(/'/g, "''")}'` : 'NULL'}, ${relevantieTags ? `'${relevantieTags.replace(/'/g, "''")}'` : 'NULL'}, ${altijdOphalen ? 1 : 0});`;
  
  statements.push(sql);
}

function mapDocumentType(type) {
  const mapping = {
    'welstandsnota': 'welstandsnota',
    'parkeerbeleid': 'parkeerbeleid',
    'erfgoedbeleid': 'erfgoedbeleid',
    'beleidsregels_afwijken': 'beleidsregels_afwijken',
  };
  return mapping[type?.toLowerCase()] || 'overig';
}

console.log('-- Beleidsdocumenten migration');
console.log('-- Generated from CSV');
console.log('');
statements.forEach(s => console.log(s));
console.log('');
console.log(`-- Total: ${statements.length} documents`);
