import { config } from 'dotenv';
config();

const x = 133000;
const y = 517000;
const DSO_API_KEY = process.env.DSO_API_KEY;

console.log('=== DSO API Test v2 ===');
console.log('API Key:', DSO_API_KEY ? DSO_API_KEY.substring(0, 8) + '...' : 'MISSING');

// Test met v2 endpoint
const url = 'https://service.pre.omgevingswet.overheid.nl/publiek/toepasbare-regels/api/toepasbareregelsuitvoerenservices/v2/conclusie';

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

console.log('URL:', url);
console.log('Body:', JSON.stringify(body, null, 2));

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'X-Api-Key': DSO_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

console.log('Status:', response.status);
console.log('Headers:', Object.fromEntries(response.headers));
const text = await response.text();
console.log('Response:', text.substring(0, 2000));
