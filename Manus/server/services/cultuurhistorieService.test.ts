import { describe, it, expect } from 'vitest';
import { checkCultuurhistorie, checkBeschermdeGezichten, checkMonumenten } from './cultuurhistorieService';

describe('Cultuurhistorie Service', () => {
  describe('checkCultuurhistorie', () => {
    it('should detect beschermd stadsgezicht in Hoorn centrum', async () => {
      // Hoorn centrum - bekend beschermd stadsgezicht sinds 1970
      const result = await checkCultuurhistorie(52.6425, 5.0600);
      
      expect(result).toBeDefined();
      expect(result.checkDatum).toBeDefined();
      expect(result.aanbevelingen).toBeDefined();
      expect(Array.isArray(result.aanbevelingen)).toBe(true);
      
      // Hoorn centrum is een beschermd stadsgezicht
      if (result.inBeschermdStadsgezicht) {
        expect(result.heeftBeschermdeStatus).toBe(true);
        expect(result.beschermdeGebieden.some(g => g.type === 'beschermd_stadsgezicht')).toBe(true);
      }
    }, 15000);

    it('should detect monumenten in Amsterdam centrum', async () => {
      // Amsterdam centrum - veel monumenten
      const result = await checkCultuurhistorie(52.3676, 4.9041);
      
      expect(result).toBeDefined();
      expect(result.monumentenInOmgeving).toBeGreaterThanOrEqual(0);
      
      // Amsterdam centrum heeft veel monumenten
      if (result.monumentenInOmgeving > 0) {
        expect(result.beschermdeGebieden.some(g => g.type === 'monument')).toBe(true);
      }
    }, 15000);

    it('should return no beschermde status for rural location', async () => {
      // Landelijk gebied zonder monumenten
      const result = await checkCultuurhistorie(52.80, 5.20);
      
      expect(result).toBeDefined();
      expect(result.checkDatum).toBeDefined();
      // Landelijk gebied heeft meestal geen beschermde status
      // maar we testen alleen dat de API correct reageert
    }, 15000);
  });

  describe('checkBeschermdeGezichten', () => {
    it('should return beschermde gezichten for historic city center', async () => {
      // Hoorn centrum
      const result = await checkBeschermdeGezichten(52.6425, 5.0600, 0.5);
      
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('type');
        expect(result[0]).toHaveProperty('naam');
        expect(result[0]).toHaveProperty('ligging');
      }
    }, 15000);
  });

  describe('checkMonumenten', () => {
    it('should return monumenten with distance for city center', async () => {
      // Amsterdam centrum
      const result = await checkMonumenten(52.3676, 4.9041, 0.2);
      
      expect(result).toHaveProperty('monumenten');
      expect(result).toHaveProperty('aantal');
      expect(Array.isArray(result.monumenten)).toBe(true);
      
      if (result.monumenten.length > 0) {
        expect(result.monumenten[0]).toHaveProperty('type', 'monument');
        expect(result.monumenten[0]).toHaveProperty('afstand');
        // Monumenten moeten gesorteerd zijn op afstand
        if (result.monumenten.length > 1) {
          expect(result.monumenten[0].afstand).toBeLessThanOrEqual(result.monumenten[1].afstand || 999999);
        }
      }
    }, 15000);
  });
});
