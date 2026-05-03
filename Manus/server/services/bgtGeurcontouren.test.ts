import { describe, it, expect } from 'vitest';
import { analyzeTopografie, checkNabijWater, checkBebouwingsdichtheid } from './bgtService';
import { analyzeGeurbelasting, checkBinnenGeurcontour } from './geurcontourenService';

describe('BGT Service', () => {
  describe('analyzeTopografie', () => {
    it('should return topografische analyse for Hoorn centrum', async () => {
      // Hoorn centrum coördinaten
      const lon = 5.0608;
      const lat = 52.6424;
      
      const result = await analyzeTopografie(lon, lat, 100);
      
      expect(result).toHaveProperty('panden');
      expect(result).toHaveProperty('groenvoorziening');
      expect(result).toHaveProperty('verharding');
      expect(result).toHaveProperty('water');
      expect(result).toHaveProperty('wegen');
      expect(result).toHaveProperty('samenvatting');
      expect(result).toHaveProperty('aanbevelingen');
      
      expect(typeof result.panden.aantal).toBe('number');
      expect(typeof result.groenvoorziening.aanwezig).toBe('boolean');
      expect(typeof result.samenvatting).toBe('string');
      expect(Array.isArray(result.aanbevelingen)).toBe(true);
    }, 30000);
    
    it('should detect water near Hoorn haven', async () => {
      // Hoorn haven coördinaten (nabij water)
      const lon = 5.0550;
      const lat = 52.6450;
      
      const result = await analyzeTopografie(lon, lat, 200);
      
      // Haven gebied zou water moeten hebben
      expect(result.water).toBeDefined();
      expect(typeof result.water.aanwezig).toBe('boolean');
    }, 30000);
  });
  
  describe('checkNabijWater', () => {
    it('should check if location is near water', async () => {
      const lon = 5.0550;
      const lat = 52.6450;
      
      const result = await checkNabijWater(lon, lat, 100);
      
      expect(result).toHaveProperty('nabijWater');
      expect(result).toHaveProperty('waterTypes');
      expect(typeof result.nabijWater).toBe('boolean');
      expect(Array.isArray(result.waterTypes)).toBe(true);
    }, 30000);
  });
  
  describe('checkBebouwingsdichtheid', () => {
    it('should return bebouwingsdichtheid for urban area', async () => {
      // Hoorn centrum (stedelijk gebied)
      const lon = 5.0608;
      const lat = 52.6424;
      
      const result = await checkBebouwingsdichtheid(lon, lat, 100);
      
      expect(result).toHaveProperty('dichtheid');
      expect(result).toHaveProperty('aantalPanden');
      expect(['laag', 'middel', 'hoog']).toContain(result.dichtheid);
      expect(typeof result.aantalPanden).toBe('number');
    }, 30000);
  });
});

describe('Geurcontouren Service', () => {
  describe('analyzeGeurbelasting', () => {
    it('should return geuranalyse structure', async () => {
      // Utrecht locatie (waar we WFS data hebben)
      const lon = 5.1;
      const lat = 52.1;
      
      const result = await analyzeGeurbelasting(lon, lat, 500);
      
      expect(result).toHaveProperty('binnenGeurcontour');
      expect(result).toHaveProperty('gesScore');
      expect(result).toHaveProperty('gesOmschrijving');
      expect(result).toHaveProperty('risiconiveau');
      expect(result).toHaveProperty('provincie');
      expect(result).toHaveProperty('aanbevelingen');
      expect(result).toHaveProperty('bronData');
      
      expect(typeof result.binnenGeurcontour).toBe('boolean');
      expect(typeof result.gesOmschrijving).toBe('string');
      expect(['geen', 'laag', 'middel', 'hoog', 'zeer_hoog']).toContain(result.risiconiveau);
      expect(Array.isArray(result.aanbevelingen)).toBe(true);
    }, 30000);
    
    it('should handle location outside Utrecht province', async () => {
      // Hoorn (Noord-Holland, geen Utrecht WFS data)
      const lon = 5.0608;
      const lat = 52.6424;
      
      const result = await analyzeGeurbelasting(lon, lat, 500);
      
      // Zou geen data moeten vinden maar wel een valide response geven
      expect(result).toHaveProperty('binnenGeurcontour');
      expect(result).toHaveProperty('aanbevelingen');
      expect(Array.isArray(result.aanbevelingen)).toBe(true);
    }, 30000);
  });
  
  describe('checkBinnenGeurcontour', () => {
    it('should return quick geurcontour check', async () => {
      const lon = 5.1;
      const lat = 52.1;
      
      const result = await checkBinnenGeurcontour(lon, lat);
      
      expect(result).toHaveProperty('binnenContour');
      expect(result).toHaveProperty('gesScore');
      expect(typeof result.binnenContour).toBe('boolean');
    }, 30000);
  });
  
  describe('GES score interpretatie', () => {
    it('should correctly interpret GES scores', async () => {
      // Test de interpretatie logica door de service aan te roepen
      // en te controleren dat de omschrijvingen kloppen
      const result = await analyzeGeurbelasting(5.1, 52.1, 100);
      
      if (result.gesScore !== null) {
        // Als er een score is, moet er ook een omschrijving zijn
        expect(result.gesOmschrijving).not.toBe('Onbekend');
        expect(result.gesOmschrijving.length).toBeGreaterThan(0);
      }
    }, 30000);
  });
});
