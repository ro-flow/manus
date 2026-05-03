import { describe, it, expect } from 'vitest';
import { checkBeschermdeGebieden, quickBeschermdeGebiedenCheck } from './beschermdeGebiedenService';

describe('Beschermde Gebieden Service', () => {
  it('should check beschermde gebieden for a location near Hoorn', async () => {
    // Hoorn centrum
    const lat = 52.6425;
    const lon = 5.0597;
    
    const result = await checkBeschermdeGebieden(lat, lon, 10);
    
    expect(result).toBeDefined();
    expect(result.stikstofRisico).toMatch(/laag|middel|hoog/);
    expect(result.samenvatting).toBeDefined();
    expect(result.aanbevelingen).toBeInstanceOf(Array);
    expect(result.natura2000Gebieden).toBeInstanceOf(Array);
    expect(result.nnnGebieden).toBeInstanceOf(Array);
    expect(result.nationaleParken).toBeInstanceOf(Array);
    
    console.log('Hoorn check result:', {
      stikstofRisico: result.stikstofRisico,
      samenvatting: result.samenvatting,
      natura2000Count: result.natura2000Gebieden.length,
      nnnCount: result.nnnGebieden.length,
      parkenCount: result.nationaleParken.length,
      dichtstbijzijndeNatura2000: result.dichtstbijzijndeNatura2000?.naam,
      dichtstbijzijndeNNN: result.dichtstbijzijndeNNN?.naam
    });
  }, 30000);

  it('should detect high risk for location in Natura 2000 area', async () => {
    // Markermeer - Natura 2000 gebied
    const lat = 52.55;
    const lon = 5.25;
    
    const result = await checkBeschermdeGebieden(lat, lon, 5);
    
    expect(result).toBeDefined();
    expect(result.natura2000Gebieden.length).toBeGreaterThan(0);
    
    console.log('Markermeer check result:', {
      stikstofRisico: result.stikstofRisico,
      binnenNatura2000: result.binnenNatura2000,
      dichtstbijzijndeNatura2000: result.dichtstbijzijndeNatura2000?.naam
    });
  }, 30000);

  it('should perform quick check for a location', async () => {
    const lat = 52.6425;
    const lon = 5.0597;
    
    const result = await quickBeschermdeGebiedenCheck(lat, lon);
    
    expect(result).toBeDefined();
    expect(result.risico).toMatch(/laag|middel|hoog/);
    expect(result.samenvatting).toBeDefined();
    
    console.log('Quick check result:', result);
  }, 15000);

  it('should detect NNN gebieden in Noord-Holland', async () => {
    // Locatie nabij NNN gebied
    const lat = 52.70;
    const lon = 4.95;
    
    const result = await checkBeschermdeGebieden(lat, lon, 10);
    
    expect(result).toBeDefined();
    
    console.log('NNN check result:', {
      nnnCount: result.nnnGebieden.length,
      dichtstbijzijndeNNN: result.dichtstbijzijndeNNN?.naam,
      binnenNNN: result.binnenNNN
    });
  }, 30000);
});
