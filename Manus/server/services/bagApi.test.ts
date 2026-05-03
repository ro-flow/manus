import { describe, it, expect } from 'vitest';
import * as bagApi from './bagApiService';

describe('BAG API Service', () => {
  it('should check if API is available', async () => {
    const available = await bagApi.isApiAvailable();
    console.log('BAG API available:', available);
    expect(available).toBe(true);
  }, 15000);

  it('should search for an address by postcode and huisnummer', async () => {
    // Test met een bekend adres in Amsterdam (Dam 1)
    const adressen = await bagApi.zoekAdres('1012JS', 1);
    console.log(`Found ${adressen.length} addresses for 1012JS 1`);
    
    expect(adressen.length).toBeGreaterThan(0);
    
    if (adressen.length > 0) {
      const adres = adressen[0];
      expect(adres.postcode).toBe('1012JS');
      expect(adres.huisnummer).toBe(1);
      console.log(`Address: ${adres.openbareRuimteNaam} ${adres.huisnummer}, ${adres.woonplaatsNaam}`);
    }
  }, 30000);

  it('should fetch complete building info for an address', async () => {
    // Test met een adres in Hoorn
    const info = await bagApi.haalGebouwInfo('1621BK', 1);
    
    if (!info) {
      console.log('No building info found for 1621BK 1 - skipping detailed checks');
      return;
    }

    console.log('Building info:', JSON.stringify(info, null, 2));
    
    expect(info.adres).toBeDefined();
    expect(info.adres.postcode).toBe('1621BK');
    
    if (info.pand) {
      expect(info.pand.bouwjaar).toBeGreaterThan(0);
      console.log(`Bouwjaar: ${info.pand.bouwjaar}`);
      console.log(`Asbest risico: ${info.isAsbestRisico}`);
      console.log(`Vooroorlogs: ${info.isVoorOorlogsBouwjaar}`);
    }

    if (info.verblijfsobject) {
      expect(info.verblijfsobject.oppervlakte).toBeGreaterThan(0);
      console.log(`Oppervlakte: ${info.verblijfsobject.oppervlakte} m²`);
      console.log(`Gebruiksdoel: ${info.verblijfsobject.gebruiksdoelen.join(', ')}`);
    }
  }, 30000);

  it('should format BAG info for AI context', async () => {
    const info = await bagApi.haalGebouwInfo('1012JS', 1);
    
    if (!info) {
      console.log('No building info found - skipping format test');
      return;
    }

    const formatted = bagApi.formatBagInfoVoorAI(info);
    console.log('Formatted BAG info:\n', formatted);
    
    expect(formatted).toContain('BAG GEBOUWGEGEVENS');
    expect(formatted).toContain('ADRES');
  }, 30000);

  it('should detect asbest risk for pre-1994 buildings', async () => {
    // Test met een oud gebouw (bouwjaar <1994)
    // Centrum Amsterdam heeft veel oude gebouwen
    const info = await bagApi.haalGebouwInfo('1012JS', 1);
    
    if (!info || !info.pand) {
      console.log('No pand info found - skipping asbest test');
      return;
    }

    console.log(`Bouwjaar: ${info.pand.bouwjaar}, Asbest risico: ${info.isAsbestRisico}`);
    
    // Verificeer dat de logica correct is
    if (info.pand.bouwjaar < 1994) {
      expect(info.isAsbestRisico).toBe(true);
    } else {
      expect(info.isAsbestRisico).toBe(false);
    }
  }, 30000);
});
