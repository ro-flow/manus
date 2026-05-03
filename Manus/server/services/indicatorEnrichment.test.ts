import { describe, it, expect } from 'vitest';
import { enrichIndicators } from './indicatorEnrichment';

describe('indicatorEnrichment', () => {
  it('should add enrichment fields to known indicators', () => {
    const indicators = [
      {
        code: 'NATURA2000',
        theme: 'natuur',
        humanName: 'Natura 2000-gebied',
        status: 'relevant' as const,
        waarde: 'Leenderbos op 4312m',
        toelichting: 'Test toelichting',
        bronnen: ['PDOK'],
      },
    ];

    const enriched = enrichIndicators(indicators as any);
    expect(enriched).toHaveLength(1);
    expect(enriched[0].wettelijkeGrondslag).toBeDefined();
    expect(enriched[0].wettelijkeGrondslag).toContain('Wet natuurbescherming');
    expect(enriched[0].consequenties).toBeDefined();
    expect(enriched[0].suggesties).toBeDefined();
    expect(Array.isArray(enriched[0].suggesties)).toBe(true);
    expect(enriched[0].suggesties!.length).toBeGreaterThan(0);
    expect(enriched[0].relevantieToelichting).toBeDefined();
  });

  it('should handle unknown indicator codes gracefully', () => {
    const indicators = [
      {
        code: 'UNKNOWN_INDICATOR_XYZ',
        theme: 'test',
        humanName: 'Unknown',
        status: 'onbekend' as const,
        waarde: 'Test',
        toelichting: 'Test',
        bronnen: [],
      },
    ];

    const enriched = enrichIndicators(indicators as any);
    expect(enriched).toHaveLength(1);
    // Should not crash, just leave fields undefined
    expect(enriched[0].code).toBe('UNKNOWN_INDICATOR_XYZ');
  });

  it('should enrich multiple indicators at once', () => {
    const indicators = [
      {
        code: 'NATURA2000',
        theme: 'natuur',
        humanName: 'Natura 2000',
        status: 'relevant' as const,
        waarde: 'Test',
        toelichting: 'Test',
        bronnen: [],
      },
      {
        code: 'WATERTOETS',
        theme: 'water',
        humanName: 'Watertoets',
        status: 'aandachtspunt' as const,
        waarde: 'Test',
        toelichting: 'Test',
        bronnen: [],
      },
      {
        code: 'BEVI_INRICHTING',
        theme: 'veiligheid',
        humanName: 'Bevi-inrichting',
        status: 'aandachtspunt' as const,
        waarde: 'Test',
        toelichting: 'Test',
        bronnen: [],
      },
    ];

    const enriched = enrichIndicators(indicators as any);
    expect(enriched).toHaveLength(3);
    
    // All should have enrichment data
    for (const ind of enriched) {
      expect(ind.wettelijkeGrondslag).toBeDefined();
      expect(ind.consequenties).toBeDefined();
      expect(ind.suggesties).toBeDefined();
      expect(ind.relevantieToelichting).toBeDefined();
    }
  });

  it('should preserve original indicator fields', () => {
    const indicators = [
      {
        code: 'GELUIDZONE_SPOOR',
        theme: 'milieu',
        humanName: 'Geluidzone spoor',
        status: 'aandachtspunt' as const,
        waarde: 'Spoorlijn binnen 200m',
        toelichting: 'Original toelichting',
        bronnen: ['PDOK'],
        afstandM: 150,
      },
    ];

    const enriched = enrichIndicators(indicators as any);
    expect(enriched[0].code).toBe('GELUIDZONE_SPOOR');
    expect(enriched[0].humanName).toBe('Geluidzone spoor');
    expect(enriched[0].status).toBe('aandachtspunt');
    expect(enriched[0].waarde).toBe('Spoorlijn binnen 200m');
    expect(enriched[0].toelichting).toBe('Original toelichting');
    expect(enriched[0].bronnen).toEqual(['PDOK']);
    expect(enriched[0].afstandM).toBe(150);
  });

  it('should have enrichment data for all major indicator categories', () => {
    const majorIndicators = [
      'NATURA2000', 'STIKSTOF_AERIUS', 'NNN', 'SOORTENBESCHERMING',
      'WATERKERING', 'WATERTOETS', 'GRONDWATERBESCHERMING',
      'BODEMKWALITEIT', 'FUNDERINGSPROBLEMATIEK', 'ASBEST_RISICO',
      'GELUIDZONE_WEG', 'GELUIDZONE_SPOOR', 'LUCHTKWALITEIT',
      'BEVI_INRICHTING', 'BUISLEIDING', 'RISICOCONTOUR',
      'RIJKSMONUMENT', 'ARCHEOLOGIE', 'VERDRAG_MALTA',
      'GEWASPERCEEL', 'GEURCONTOUR_VEEHOUDERIJ',
      'HOOGSPANNING', 'SPOORWEG', 'KLIC_MELDING',
    ];

    const indicators = majorIndicators.map(code => ({
      code,
      theme: 'test',
      humanName: code,
      status: 'relevant' as const,
      waarde: 'Test',
      toelichting: 'Test',
      bronnen: [],
    }));

    const enriched = enrichIndicators(indicators as any);
    
    for (const ind of enriched) {
      expect(ind.wettelijkeGrondslag).toBeDefined();
      expect(typeof ind.wettelijkeGrondslag).toBe('string');
      expect(ind.wettelijkeGrondslag!.length).toBeGreaterThan(10);
    }
  });

  it('should return suggesties as string array', () => {
    const indicators = [
      {
        code: 'WATERTOETS',
        theme: 'water',
        humanName: 'Watertoets',
        status: 'aandachtspunt' as const,
        waarde: 'Test',
        toelichting: 'Test',
        bronnen: [],
      },
    ];

    const enriched = enrichIndicators(indicators as any);
    expect(Array.isArray(enriched[0].suggesties)).toBe(true);
    for (const s of enriched[0].suggesties!) {
      expect(typeof s).toBe('string');
    }
  });

  it('should not mutate original indicators', () => {
    const original = {
      code: 'NATURA2000',
      theme: 'natuur',
      humanName: 'Natura 2000',
      status: 'relevant' as const,
      waarde: 'Test',
      toelichting: 'Test',
      bronnen: [],
    };

    const indicators = [{ ...original }];
    enrichIndicators(indicators as any);
    
    // Original should not have enrichment fields
    expect((original as any).wettelijkeGrondslag).toBeUndefined();
  });
});
