/**
 * Tests for Seed Omgevingswet Jurisprudentie
 */
import { describe, it, expect } from 'vitest';
import { 
  GECUREERDE_UITSPRAKEN, 
  CATEGORIE_THEMA_MAP, 
  CATEGORIE_TOETSINGSKADER_MAP,
  getGecureerdeJurisprudentieStats 
} from './seedOmgevingswetJurisprudentie';

describe('Seed Omgevingswet Jurisprudentie', () => {
  describe('GECUREERDE_UITSPRAKEN', () => {
    it('should have at least 40 curated cases', () => {
      expect(GECUREERDE_UITSPRAKEN.length).toBeGreaterThanOrEqual(40);
    });

    it('should have valid ECLI format for all cases', () => {
      for (const uitspraak of GECUREERDE_UITSPRAKEN) {
        expect(uitspraak.ecli).toMatch(/^ECLI:NL:[A-Z]+:\d{4}:\d+$/);
      }
    });

    it('should have valid date format for all cases', () => {
      for (const uitspraak of GECUREERDE_UITSPRAKEN) {
        const date = new Date(uitspraak.datum);
        expect(date.toString()).not.toBe('Invalid Date');
      }
    });

    it('should have a category for all cases', () => {
      const validCategories = Object.keys(CATEGORIE_THEMA_MAP);
      for (const uitspraak of GECUREERDE_UITSPRAKEN) {
        expect(validCategories).toContain(uitspraak.categorie);
      }
    });

    it('should include cases from Raad van State', () => {
      const rvsUitspraken = GECUREERDE_UITSPRAKEN.filter(u => u.instantie === 'Raad van State');
      expect(rvsUitspraken.length).toBeGreaterThan(5);
    });

    it('should include cases from multiple rechtbanken', () => {
      const rechtbanken = new Set(
        GECUREERDE_UITSPRAKEN
          .filter(u => u.instantie.startsWith('Rechtbank'))
          .map(u => u.instantie)
      );
      expect(rechtbanken.size).toBeGreaterThan(5);
    });
  });

  describe('CATEGORIE_THEMA_MAP', () => {
    it('should map all categories to valid themas', () => {
      const validThemas = [
        "omgevingsvergunning_bouwen",
        "omgevingsvergunning_milieu",
        "bestemmingsplan_wijziging",
        "afwijking_bestemmingsplan",
        "bopa_procedure",
        "welstandstoets",
        "monumenten_erfgoed",
        "natura2000_stikstof",
        "geluidhinder",
        "parkeren",
        "handhaving",
        "planschade",
        "ladder_duurzame_verstedelijking",
        "kruimelgevallenregeling",
        "belangenafweging",
        "motiveringsgebrek",
        "zorgvuldigheid",
        "overig"
      ];

      for (const [categorie, themas] of Object.entries(CATEGORIE_THEMA_MAP)) {
        expect(themas.length).toBeGreaterThan(0);
        for (const thema of themas) {
          expect(validThemas).toContain(thema);
        }
      }
    });

    it('should have BOPA category mapped to bopa_procedure', () => {
      expect(CATEGORIE_THEMA_MAP.bopa).toContain('bopa_procedure');
    });

    it('should have ETFAL category mapped to belangenafweging', () => {
      expect(CATEGORIE_THEMA_MAP.etfal).toContain('belangenafweging');
    });
  });

  describe('CATEGORIE_TOETSINGSKADER_MAP', () => {
    it('should have toetsingskaders for all categories', () => {
      const categories = Object.keys(CATEGORIE_THEMA_MAP);
      for (const cat of categories) {
        expect(CATEGORIE_TOETSINGSKADER_MAP[cat]).toBeDefined();
        expect(CATEGORIE_TOETSINGSKADER_MAP[cat].length).toBeGreaterThan(0);
      }
    });

    it('should have ETFAL toetsingskader for etfal category', () => {
      expect(CATEGORIE_TOETSINGSKADER_MAP.etfal).toContain('ETFAL');
    });

    it('should have Participatie toetsingskader for participatie category', () => {
      expect(CATEGORIE_TOETSINGSKADER_MAP.participatie).toContain('Participatie');
    });
  });

  describe('getGecureerdeJurisprudentieStats', () => {
    it('should return correct total count', async () => {
      const stats = await getGecureerdeJurisprudentieStats();
      expect(stats.totaalGecureerd).toBe(GECUREERDE_UITSPRAKEN.length);
    });

    it('should count cases per category', async () => {
      const stats = await getGecureerdeJurisprudentieStats();
      
      // Check that all categories are represented
      expect(Object.keys(stats.perCategorie).length).toBeGreaterThan(5);
      
      // Check that BOPA has multiple cases
      expect(stats.perCategorie.bopa).toBeGreaterThan(3);
    });

    it('should count cases per instantie', async () => {
      const stats = await getGecureerdeJurisprudentieStats();
      
      // Check that Raad van State is represented
      expect(stats.perInstantie['Raad van State']).toBeGreaterThan(0);
    });
  });

  describe('Coverage by theme', () => {
    it('should have BOPA cases', () => {
      const bopaCount = GECUREERDE_UITSPRAKEN.filter(u => u.categorie === 'bopa').length;
      expect(bopaCount).toBeGreaterThanOrEqual(5);
    });

    it('should have ETFAL cases', () => {
      const etfalCount = GECUREERDE_UITSPRAKEN.filter(u => u.categorie === 'etfal').length;
      expect(etfalCount).toBeGreaterThanOrEqual(5);
    });

    it('should have participatie cases', () => {
      const participatieCount = GECUREERDE_UITSPRAKEN.filter(u => u.categorie === 'participatie').length;
      expect(participatieCount).toBeGreaterThanOrEqual(5);
    });

    it('should have omgevingsplan cases', () => {
      const omgevingsplanCount = GECUREERDE_UITSPRAKEN.filter(u => u.categorie === 'omgevingsplan').length;
      expect(omgevingsplanCount).toBeGreaterThanOrEqual(4);
    });

    it('should have handhaving cases', () => {
      const handhavingCount = GECUREERDE_UITSPRAKEN.filter(u => u.categorie === 'handhaving').length;
      expect(handhavingCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Date coverage', () => {
    it('should have cases from 2024', () => {
      const cases2024 = GECUREERDE_UITSPRAKEN.filter(u => u.datum.startsWith('2024'));
      expect(cases2024.length).toBeGreaterThan(0);
    });

    it('should have cases from 2025', () => {
      const cases2025 = GECUREERDE_UITSPRAKEN.filter(u => u.datum.startsWith('2025'));
      expect(cases2025.length).toBeGreaterThan(0);
    });

    it('should have recent cases (after Omgevingswet)', () => {
      const omgevingswetStart = new Date('2024-01-01');
      const recentCases = GECUREERDE_UITSPRAKEN.filter(u => new Date(u.datum) >= omgevingswetStart);
      expect(recentCases.length).toBe(GECUREERDE_UITSPRAKEN.length); // All should be post-Ow
    });
  });
});
