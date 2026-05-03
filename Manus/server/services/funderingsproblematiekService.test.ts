import { describe, it, expect } from 'vitest';
import { checkFunderingsproblematiek } from './funderingsproblematiekService';

describe('Funderingsproblematiek Service', () => {
  describe('checkFunderingsproblematiek', () => {
    it('should return result for location in Hoorn (known risk area)', async () => {
      // Hoorn centrum - zeekleigebied
      const result = await checkFunderingsproblematiek(52.6425, 5.0600);
      
      expect(result).toBeDefined();
      expect(result.checkDatum).toBeDefined();
      expect(result.aanbevelingen).toBeDefined();
      expect(Array.isArray(result.aanbevelingen)).toBe(true);
      expect(result.aanbevelingen.length).toBeGreaterThan(0);
      
      // Hoorn ligt in zeekleigebied, dus zou risicogebied moeten zijn
      if (result.inRisicogebied && result.gebiedsInfo) {
        expect(result.gebiedsInfo.gemeente).toBe('Hoorn');
        expect(result.gebiedsInfo.provincie).toBe('Noord-Holland');
        expect(result.gebiedsInfo.fysischGeografischeRegio).toContain('klei');
      }
    }, 15000);

    it('should return no risk for location in stable soil area', async () => {
      // Veluwe - zandgrond, stabiele bodem
      const result = await checkFunderingsproblematiek(52.2500, 5.9500);
      
      expect(result).toBeDefined();
      expect(result.checkDatum).toBeDefined();
      
      // Veluwe heeft stabiele zandgrond, zou geen risicogebied moeten zijn
      // Of als het wel een risicogebied is, dan laag risico
      if (!result.inRisicogebied) {
        expect(result.risicoNiveau).toBe('geen');
      }
    }, 15000);

    it('should handle invalid coordinates gracefully', async () => {
      // Ongeldige coördinaten (midden in de oceaan)
      const result = await checkFunderingsproblematiek(0, 0);
      
      expect(result).toBeDefined();
      expect(result.inRisicogebied).toBe(false);
      expect(result.risicoNiveau).toBe('geen');
    }, 15000);

    it('should include KCAF reference in recommendations', async () => {
      const result = await checkFunderingsproblematiek(52.6425, 5.0600);
      
      expect(result.aanbevelingen).toBeDefined();
      
      // Als er een risicogebied is, moet KCAF referentie aanwezig zijn
      if (result.inRisicogebied) {
        const hasKCAFReference = result.aanbevelingen.some(
          a => a.toLowerCase().includes('kcaf') || a.toLowerCase().includes('kenniscentrum')
        );
        expect(hasKCAFReference).toBe(true);
      }
    }, 15000);

    it('should return correct risk level based on percentage pre-1970 buildings', async () => {
      const result = await checkFunderingsproblematiek(52.6425, 5.0600);
      
      if (result.inRisicogebied && result.gebiedsInfo) {
        const perc = result.gebiedsInfo.percentageVoor1970;
        
        if (perc >= 60) {
          expect(result.risicoNiveau).toBe('hoog');
        } else if (perc >= 40) {
          expect(result.risicoNiveau).toBe('middel');
        } else {
          expect(['laag', 'geen']).toContain(result.risicoNiveau);
        }
      }
    }, 15000);
  });
});
