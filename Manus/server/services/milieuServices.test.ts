/**
 * Tests voor Geluid, Geur en Externe Veiligheid Services
 */

import { describe, it, expect, vi } from 'vitest';

// Mock fetch voor API calls
vi.stubGlobal('fetch', vi.fn());

describe('Geluidszones Service', () => {
  it('should export analyseerGeluidszones function', async () => {
    const { analyseerGeluidszones } = await import('./geluidszonesService');
    expect(typeof analyseerGeluidszones).toBe('function');
  });

  it('should return geluidsanalyse structure with all required fields', async () => {
    const { analyseerGeluidszones } = await import('./geluidszonesService');
    
    // Mock de fetch response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerGeluidszones(52.5, 4.9);
    
    expect(result).toHaveProperty('heeftGeluidsbelasting');
    expect(result).toHaveProperty('wegverkeer');
    expect(result).toHaveProperty('railverkeer');
    expect(result).toHaveProperty('industrie');
    expect(result).toHaveProperty('vliegveld');
    expect(result).toHaveProperty('stiltegebied');
    expect(result).toHaveProperty('overschrijding');
    expect(result).toHaveProperty('aanbevelingen');
    expect(result).toHaveProperty('bronnen');
  });

  it('should have correct wegverkeer structure', async () => {
    const { analyseerGeluidszones } = await import('./geluidszonesService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerGeluidszones(52.5, 4.9);
    
    expect(result.wegverkeer).toHaveProperty('aanwezig');
    expect(result.wegverkeer).toHaveProperty('ldenWaarde');
    // lnightWaarde is optioneel, check alleen aanwezig en ldenWaarde
    expect(typeof result.wegverkeer.aanwezig).toBe('boolean');
  });
});

describe('Geur Service', () => {
  it('should export analyseerGeurbelasting function', async () => {
    const { analyseerGeurbelasting } = await import('./geurService');
    expect(typeof analyseerGeurbelasting).toBe('function');
  });

  it('should return geuranalyse structure with all required fields', async () => {
    const { analyseerGeurbelasting } = await import('./geurService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerGeurbelasting(52.5, 4.9, 'bebouwde_kom');
    
    expect(result).toHaveProperty('heeftGeurbelasting');
    expect(result).toHaveProperty('veehouderij');
    expect(result).toHaveProperty('industrie');
    expect(result).toHaveProperty('aanbevelingen');
    expect(result).toHaveProperty('bronnen');
  });

  it('should have correct veehouderij structure', async () => {
    const { analyseerGeurbelasting } = await import('./geurService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerGeurbelasting(52.5, 4.9, 'bebouwde_kom');
    
    expect(result.veehouderij).toHaveProperty('aanwezig');
    expect(result.veehouderij).toHaveProperty('dichtstbijzijndeAfstand');
    expect(result.veehouderij).toHaveProperty('typeVeehouderij');
    expect(result.veehouderij).toHaveProperty('overschrijdtNorm');
  });

  it('should accept different gebiedstype parameters', async () => {
    const { analyseerGeurbelasting } = await import('./geurService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    // Test met verschillende gebiedstypes
    const resultBebouwd = await analyseerGeurbelasting(52.5, 4.9, 'bebouwde_kom');
    const resultBuiten = await analyseerGeurbelasting(52.5, 4.9, 'buitengebied');
    
    expect(resultBebouwd).toBeDefined();
    expect(resultBuiten).toBeDefined();
  });
});

describe('Externe Veiligheid Service', () => {
  it('should export analyseerExterneVeiligheid function', async () => {
    const { analyseerExterneVeiligheid } = await import('./externeVeiligheidService');
    expect(typeof analyseerExterneVeiligheid).toBe('function');
  });

  it('should return externe veiligheid structure with all required fields', async () => {
    const { analyseerExterneVeiligheid } = await import('./externeVeiligheidService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerExterneVeiligheid(52.5, 4.9);
    
    expect(result).toHaveProperty('heeftRisico');
    expect(result).toHaveProperty('plaatsgebondenRisico');
    expect(result).toHaveProperty('groepsrisico');
    expect(result).toHaveProperty('beviInrichtingen');
    expect(result).toHaveProperty('buisleidingen');
    expect(result).toHaveProperty('aanbevelingen');
    expect(result).toHaveProperty('bronnen');
  });

  it('should have correct plaatsgebondenRisico structure', async () => {
    const { analyseerExterneVeiligheid } = await import('./externeVeiligheidService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerExterneVeiligheid(52.5, 4.9);
    
    expect(result.plaatsgebondenRisico).toHaveProperty('binnenPR10_6');
    expect(result.plaatsgebondenRisico).toHaveProperty('bronType');
    expect(result.plaatsgebondenRisico).toHaveProperty('bronNaam');
    expect(typeof result.plaatsgebondenRisico.binnenPR10_6).toBe('boolean');
  });

  it('should have correct groepsrisico structure', async () => {
    const { analyseerExterneVeiligheid } = await import('./externeVeiligheidService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerExterneVeiligheid(52.5, 4.9);
    
    expect(result.groepsrisico).toHaveProperty('verantwoordingsplicht');
    expect(result.groepsrisico).toHaveProperty('adviesVeiligheidsregio');
    expect(typeof result.groepsrisico.verantwoordingsplicht).toBe('boolean');
    expect(typeof result.groepsrisico.adviesVeiligheidsregio).toBe('boolean');
  });

  it('should return arrays for beviInrichtingen and buisleidingen', async () => {
    const { analyseerExterneVeiligheid } = await import('./externeVeiligheidService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const result = await analyseerExterneVeiligheid(52.5, 4.9);
    
    expect(Array.isArray(result.beviInrichtingen)).toBe(true);
    expect(Array.isArray(result.buisleidingen)).toBe(true);
    expect(Array.isArray(result.aanbevelingen)).toBe(true);
    expect(Array.isArray(result.bronnen)).toBe(true);
  });
});

describe('Integration: All milieu services work together', () => {
  it('should be able to call all three services for the same location', async () => {
    const { analyseerGeluidszones } = await import('./geluidszonesService');
    const { analyseerGeurbelasting } = await import('./geurService');
    const { analyseerExterneVeiligheid } = await import('./externeVeiligheidService');
    
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] })
    });
    
    const lat = 52.3676;
    const lon = 4.9041;
    
    const [geluid, geur, veiligheid] = await Promise.all([
      analyseerGeluidszones(lat, lon),
      analyseerGeurbelasting(lat, lon, 'bebouwde_kom'),
      analyseerExterneVeiligheid(lat, lon)
    ]);
    
    expect(geluid).toBeDefined();
    expect(geur).toBeDefined();
    expect(veiligheid).toBeDefined();
  });
});
