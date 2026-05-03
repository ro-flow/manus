import { describe, it, expect } from 'vitest';
import {
  analyseerGraafwerk,
  vergelijkMetVrijstellingen,
  STANDAARD_VRIJSTELLINGEN,
  type VrijstellingsGrenzen
} from './vrijstellingsService';

describe('vrijstellingsService', () => {
  describe('analyseerGraafwerk', () => {
    it('should detect graafwerk for nieuwbouw', async () => {
      const result = await analyseerGraafwerk(['nieuwbouw']);
      
      expect(result.heeftGraafwerk).toBe(true);
      expect(result.indicatoren).toContain('Nieuwbouw (fundering vereist)');
      expect(result.geschatteGraafdiepteCm).toBeGreaterThan(0);
    });

    it('should detect deep graafwerk for kelder', async () => {
      const result = await analyseerGraafwerk(['nieuwbouw', 'kelder']);
      
      expect(result.heeftGraafwerk).toBe(true);
      expect(result.indicatoren).toContain('Kelder (diepe bodemingreep)');
      expect(result.geschatteGraafdiepteCm).toBeGreaterThanOrEqual(300);
    });

    it('should detect graafwerk for zwembad', async () => {
      const result = await analyseerGraafwerk(['zwembad']);
      
      expect(result.heeftGraafwerk).toBe(true);
      expect(result.indicatoren).toContain('Zwembad (diepe bodemingreep)');
      expect(result.geschatteGraafdiepteCm).toBeGreaterThanOrEqual(200);
    });

    it('should detect graafwerk from project description', async () => {
      const result = await analyseerGraafwerk(
        ['verbouw'],
        'Het project omvat het graven van een bouwput voor de fundering'
      );
      
      expect(result.heeftGraafwerk).toBe(true);
      expect(result.indicatoren.some(i => i.includes('omschrijving'))).toBe(true);
    });

    it('should not detect graafwerk for simple verbouw', async () => {
      const result = await analyseerGraafwerk(['verbouw'], 'Interne verbouwing badkamer');
      
      expect(result.heeftGraafwerk).toBe(false);
      expect(result.indicatoren).toHaveLength(0);
    });

    it('should have high certainty with multiple indicators', async () => {
      const result = await analyseerGraafwerk(
        ['nieuwbouw', 'kelder', 'riolering'],
        'Bouwput graven voor fundering'
      );
      
      expect(result.zekerheid).toBe('hoog');
      expect(result.indicatoren.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('vergelijkMetVrijstellingen', () => {
    const standaardVrijstellingen: VrijstellingsGrenzen = {
      archeologieDiepteCm: 30,
      archeologieOppervlakteM2: 100,
      bron: 'test',
      laatstBijgewerkt: new Date()
    };

    it('should not require onderzoek when no graafwerk', async () => {
      const graafwerk = await analyseerGraafwerk(['verbouw']);
      const result = vergelijkMetVrijstellingen(graafwerk, standaardVrijstellingen);
      
      expect(result.onderzoekVerplicht).toBe(false);
      expect(result.vrijstellingVanToepassing).toBe(true);
    });

    it('should require onderzoek when both thresholds exceeded', async () => {
      // Simuleer een situatie waar beide drempels overschreden zijn
      const graafwerk = {
        heeftGraafwerk: true,
        graafdiepteCm: 150, // > 30cm
        oppervlakteM2: 200, // > 100m²
        diepteBron: 'formulier' as const,
        oppervlakteBron: 'formulier' as const,
        geschatteGraafdiepteCm: 150,
        geschatteOppervlakteM2: 200,
        indicatoren: ['Kelder (diepe bodemingreep)'],
        zekerheid: 'hoog' as const,
        toelichting: 'Test'
      };
      const result = vergelijkMetVrijstellingen(graafwerk, standaardVrijstellingen);
      
      // Beide drempels overschreden
      expect(result.onderzoekVerplicht).toBe(true);
      expect(result.vrijstellingVanToepassing).toBe(false);
    });

    it('should apply vrijstelling when only depth exceeded', async () => {
      // Simuleer een situatie waar alleen diepte overschreden is
      const graafwerk = {
        heeftGraafwerk: true,
        graafdiepteCm: 80, // > 30cm
        oppervlakteM2: 50, // < 100m²
        diepteBron: 'formulier' as const,
        oppervlakteBron: 'formulier' as const,
        geschatteGraafdiepteCm: 80,
        geschatteOppervlakteM2: 50,
        indicatoren: ['Test'],
        zekerheid: 'middel' as const,
        toelichting: 'Test'
      };
      
      const result = vergelijkMetVrijstellingen(graafwerk, standaardVrijstellingen);
      
      expect(result.onderzoekVerplicht).toBe(false);
      expect(result.vrijstellingVanToepassing).toBe(true);
      expect(result.reden).toContain('vrijstelling van toepassing');
    });

    it('should apply vrijstelling when only area exceeded', async () => {
      // Simuleer een situatie waar alleen oppervlakte overschreden is
      const graafwerk = {
        heeftGraafwerk: true,
        graafdiepteCm: 20, // < 30cm
        oppervlakteM2: 150, // > 100m²
        diepteBron: 'formulier' as const,
        oppervlakteBron: 'formulier' as const,
        geschatteGraafdiepteCm: 20,
        geschatteOppervlakteM2: 150,
        indicatoren: ['Test'],
        zekerheid: 'middel' as const,
        toelichting: 'Test'
      };
      
      const result = vergelijkMetVrijstellingen(graafwerk, standaardVrijstellingen);
      
      expect(result.onderzoekVerplicht).toBe(false);
      expect(result.vrijstellingVanToepassing).toBe(true);
      expect(result.reden).toContain('vrijstelling van toepassing');
    });

    it('should use custom gemeente vrijstellingen', async () => {
      const ruimeVrijstellingen: VrijstellingsGrenzen = {
        archeologieDiepteCm: 100, // Ruimere grens
        archeologieOppervlakteM2: 500, // Ruimere grens
        bron: 'gemeente omgevingsplan',
        laatstBijgewerkt: new Date()
      };
      
      const graafwerk = await analyseerGraafwerk(['nieuwbouw']);
      const result = vergelijkMetVrijstellingen(graafwerk, ruimeVrijstellingen);
      
      // Nieuwbouw: 80cm, 80m² - binnen ruimere grenzen
      expect(result.onderzoekVerplicht).toBe(false);
    });
  });

  describe('STANDAARD_VRIJSTELLINGEN', () => {
    it('should have sensible default values', () => {
      expect(STANDAARD_VRIJSTELLINGEN.archeologieDiepteCm).toBe(30);
      expect(STANDAARD_VRIJSTELLINGEN.archeologieOppervlakteM2).toBe(100);
    });
  });
});
