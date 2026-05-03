import { describe, it, expect } from 'vitest';

describe('API Keys Validation', () => {
  it('validates DSO API key by fetching API status', async () => {
    const apiKey = process.env.DSO_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    
    // Test DSO Productieomgeving API - gebruik de status/health endpoint
    // De DSO API gebruikt de key als X-Api-Key header
    const response = await fetch('https://service.pre.omgevingswet.overheid.nl/publiek/omgevingsdocument/api/presenteren/v7/regelteksten', {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey!,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // We verwachten een 200 of 400 (bad request zonder parameters), maar geen 401/403
    // Een 401 of 403 zou betekenen dat de API key ongeldig is
    console.log('DSO API response status:', response.status);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  }, 30000);

  it('validates Ruimtelijkeplannen API key by fetching plans', async () => {
    const apiKey = process.env.RUIMTELIJKEPLANNEN_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    
    // Test Ruimtelijkeplannen.nl API - officiële endpoint via Informatiehuis Ruimte
    // De API key wordt als X-Api-Key header meegegeven
    const response = await fetch(
      `https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/plannen?beleidsmatigVerantwoordelijkeOverheid.code=0405`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey!,
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Ruimtelijkeplannen API response status:', response.status);
    
    // Een 401 of 403 zou betekenen dat de API key ongeldig is
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    
    // Als de key geldig is, verwachten we een 200 met resultaten
    if (response.status === 200) {
      const data = await response.json();
      console.log('Ruimtelijkeplannen API returned', data._embedded?.plannen?.length || 0, 'plans');
      expect(data).toBeDefined();
      expect(data._embedded?.plannen?.length).toBeGreaterThan(0);
    }
  }, 30000);
});
