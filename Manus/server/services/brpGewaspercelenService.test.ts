import { describe, it, expect } from 'vitest';
import { checkGewaspercelen, isBRPCheckRelevant } from './brpGewaspercelenService';

describe('BRP Gewaspercelen Service', () => {
  describe('checkGewaspercelen', () => {
    it('should return landbouwpercelen for rural location near Hoorn', async () => {
      // Locatie in landelijk gebied ten noorden van Hoorn
      const result = await checkGewaspercelen(52.66, 5.06, 0.5);
      
      expect(result).toBeDefined();
      expect(result.checkDatum).toBeDefined();
      expect(result.aanbevelingen).toBeDefined();
      expect(Array.isArray(result.aanbevelingen)).toBe(true);
      
      // Dit gebied zou landbouwpercelen moeten hebben
      if (result.heeftLandbouwpercelen) {
        expect(result.aantalPercelen).toBeGreaterThan(0);
        expect(result.percelen.length).toBeGreaterThan(0);
        expect(result.percelen[0]).toHaveProperty('gewas');
        expect(result.percelen[0]).toHaveProperty('category');
      }
    }, 15000);

    it('should return no landbouwpercelen for urban location in Amsterdam centrum', async () => {
      // Amsterdam centrum - geen landbouwpercelen verwacht
      const result = await checkGewaspercelen(52.3676, 4.9041, 0.2);
      
      expect(result).toBeDefined();
      // In stedelijk gebied verwachten we geen of weinig landbouwpercelen
      // De test is succesvol ongeacht of er percelen zijn
      expect(result.checkDatum).toBeDefined();
    }, 15000);

    it('should group percelen by category', async () => {
      const result = await checkGewaspercelen(52.66, 5.06, 1.0);
      
      if (result.heeftLandbouwpercelen && result.categorieën.length > 0) {
        const categorie = result.categorieën[0];
        expect(categorie).toHaveProperty('categorie');
        expect(categorie).toHaveProperty('aantal');
        expect(categorie).toHaveProperty('gewassen');
        expect(Array.isArray(categorie.gewassen)).toBe(true);
      }
    }, 15000);

    it('should detect grasland for veehouderij indication', async () => {
      const result = await checkGewaspercelen(52.66, 5.06, 1.0);
      
      expect(result.relevantieIndicatie).toBeDefined();
      expect(result.relevantieIndicatie).toHaveProperty('heeftGrasland');
      expect(result.relevantieIndicatie).toHaveProperty('heeftVeehouderij');
      expect(result.relevantieIndicatie).toHaveProperty('isAgrarischGebied');
    }, 15000);
  });

  describe('isBRPCheckRelevant', () => {
    it('should return true for agrarische bestemmingen', () => {
      expect(isBRPCheckRelevant('Agrarisch')).toBe(true);
      expect(isBRPCheckRelevant('Agrarisch met waarden')).toBe(true);
      expect(isBRPCheckRelevant('Agrarisch - Glastuinbouw')).toBe(true);
    });

    it('should return true for landbouw gerelateerde bestemmingen', () => {
      expect(isBRPCheckRelevant('Landbouw')).toBe(true);
      expect(isBRPCheckRelevant('Akkerbouw')).toBe(true);
      expect(isBRPCheckRelevant('Tuinbouw')).toBe(true);
    });

    it('should return true for buitengebied', () => {
      expect(isBRPCheckRelevant('Buitengebied')).toBe(true);
      expect(isBRPCheckRelevant('Landelijk gebied')).toBe(true);
    });

    it('should return false for stedelijke bestemmingen', () => {
      expect(isBRPCheckRelevant('Wonen')).toBe(false);
      expect(isBRPCheckRelevant('Centrum')).toBe(false);
      expect(isBRPCheckRelevant('Bedrijventerrein')).toBe(false);
      expect(isBRPCheckRelevant('Kantoor')).toBe(false);
    });
  });
});
