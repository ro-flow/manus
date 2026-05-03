import { config } from 'dotenv';
config();

// Hoorn centrum coördinaten (RD)
const x = 133000;
const y = 517000;

const DSO_API_KEY = process.env.DSO_API_KEY;

// Correcte endpoints uit ontwikkelaarsportaal
const PRE_BASE = 'https://service.pre.omgevingswet.overheid.nl';
const PROD_BASE = 'https://service.omgevingswet.overheid.nl';

console.log('=== DSO API Test ===');
console.log('API Key beschikbaar:', !!DSO_API_KEY);
console.log('Locatie: Hoorn centrum (RD:', x, ',', y, ')');
console.log('');

// Test 1: Uitvoeren Services - Conclusie bepalen (vergunningcheck)
async function testConclusie() {
  console.log('--- Test 1: Conclusie bepalen (Vergunningcheck) ---');
  
  // Gebruik PRE omgeving
  const url = `${PRE_BASE}/publiek/toepasbare-regels/api/toepasbareregelsuitvoerenservices/v3/conclusie`;
  
  const body = {
    locatie: {
      geometrie: {
        type: 'Point',
        coordinates: [x, y]
      }
    },
    functioneleStructuurRefs: [
      'nl.imow-mnre1034.activiteit.BouwactiviteitOmgevingsplanactiviteit'
    ]
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': DSO_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    console.log('URL:', url);
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 1500));
  } catch (e) {
    console.log('Fout:', e.message);
  }
  console.log('');
}

// Test 2: Verzoeksroutering - Bevoegd gezag bepalen
async function testBevoegdGezag() {
  console.log('--- Test 2: Verzoeksroutering (Bevoegd Gezag) ---');
  
  const url = `${PRE_BASE}/publiek/verzoek/api/verzoeksroutering/v1/bepaal`;
  
  const body = {
    locatie: {
      geometrie: {
        type: 'Point',
        coordinates: [x, y]
      }
    },
    activiteiten: ['nl.imow-mnre1034.activiteit.BouwactiviteitOmgevingsplanactiviteit']
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': DSO_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    console.log('URL:', url);
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 1500));
  } catch (e) {
    console.log('Fout:', e.message);
  }
  console.log('');
}

// Test 3: Indieningsvereisten bepalen
async function testIndieningsvereisten() {
  console.log('--- Test 3: Indieningsvereisten bepalen ---');
  
  const url = `${PRE_BASE}/publiek/toepasbare-regels/api/toepasbareregelsuitvoerenservices/v3/indieningsvereisten`;
  
  const body = {
    locatie: {
      geometrie: {
        type: 'Point',
        coordinates: [x, y]
      }
    },
    functioneleStructuurRefs: [
      'nl.imow-mnre1034.activiteit.BouwactiviteitOmgevingsplanactiviteit'
    ]
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': DSO_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    console.log('URL:', url);
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 1500));
  } catch (e) {
    console.log('Fout:', e.message);
  }
}

// Run tests
await testConclusie();
await testBevoegdGezag();
await testIndieningsvereisten();

console.log('=== Test voltooid ===');
