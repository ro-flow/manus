import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyseerLocatiePDOK, formatPDOKVoorAI } from './pdokService';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PDOK Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('analyseerLocatiePDOK', () => {
    it('should return empty results when no features found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ features: [] })
      });

      const result = await analyseerLocatiePDOK(5.0, 52.0);

      expect(result.natura2000.binnenGebied).toBe(false);
      expect(result.natura2000.dichtstbijzijnde).toBeNull();
      expect(result.monumenten.isRijksmonument).toBe(false);
      expect(result.beschermdGezicht.binnenGebied).toBe(false);
    });

    it('should detect Natura 2000 gebied', async () => {
      mockFetch
        // Natura 2000 response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: [{
              properties: { naam: 'Veluwe', sitecode: 'NL2003000' },
              geometry: { type: 'Polygon', coordinates: [] }
            }]
          })
        })
        // Monumenten response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] })
        })
        // Beschermd gezicht response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] })
        });

      const result = await analyseerLocatiePDOK(5.8, 52.1);

      expect(result.natura2000.dichtstbijzijnde).not.toBeNull();
      expect(result.natura2000.dichtstbijzijnde?.naam).toBe('Veluwe');
      expect(result.natura2000.dichtstbijzijnde?.code).toBe('NL2003000');
    });

    it('should detect Rijksmonument', async () => {
      mockFetch
        // Natura 2000 response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] })
        })
        // Monumenten response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: [{
              properties: {
                naam: 'Rijksmuseum',
                rijksmonumentnummer: '12345',
                omschrijving: 'Nationaal museum'
              },
              geometry: { type: 'Point', coordinates: [4.885, 52.360] }
            }]
          })
        })
        // Beschermd gezicht response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] })
        });

      const result = await analyseerLocatiePDOK(4.885, 52.360);

      expect(result.monumenten.isRijksmonument).toBe(true);
      expect(result.monumenten.monument?.naam).toBe('Rijksmuseum');
      expect(result.monumenten.monument?.rijksmonumentnummer).toBe('12345');
    });

    it('should detect Beschermd Stadsgezicht', async () => {
      mockFetch
        // Natura 2000 response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] })
        })
        // Monumenten response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] })
        })
        // Beschermd gezicht response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: [{
              properties: {
                naam: 'Binnenstad Amsterdam',
                code: 'BSG001',
                type: 'Stadsgezicht'
              },
              geometry: { type: 'Polygon', coordinates: [] }
            }]
          })
        });

      const result = await analyseerLocatiePDOK(4.9, 52.37);

      expect(result.beschermdGezicht.binnenGebied).toBe(true);
      expect(result.beschermdGezicht.gezicht?.naam).toBe('Binnenstad Amsterdam');
      expect(result.beschermdGezicht.gezicht?.type).toBe('stads');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await analyseerLocatiePDOK(5.0, 52.0);

      // Should return empty results, not throw
      expect(result.natura2000.binnenGebied).toBe(false);
      expect(result.monumenten.isRijksmonument).toBe(false);
      expect(result.beschermdGezicht.binnenGebied).toBe(false);
    });
  });

  describe('formatPDOKVoorAI', () => {
    it('should format Natura 2000 warning correctly', () => {
      const result = formatPDOKVoorAI({
        natura2000: {
          binnenGebied: true,
          dichtstbijzijnde: { naam: 'Veluwe', code: 'NL2003000', afstandMeter: 0 },
          gebiedenBinnen5km: []
        },
        monumenten: {
          isRijksmonument: false,
          monument: null,
          monumentenInOmgeving: []
        },
        beschermdGezicht: {
          binnenGebied: false,
          gezicht: null
        }
      });

      expect(result).toContain('LOCATIE LIGT BINNEN NATURA 2000 GEBIED');
      expect(result).toContain('Veluwe');
      expect(result).toContain('AERIUS');
    });

    it('should format Rijksmonument warning correctly', () => {
      const result = formatPDOKVoorAI({
        natura2000: {
          binnenGebied: false,
          dichtstbijzijnde: null,
          gebiedenBinnen5km: []
        },
        monumenten: {
          isRijksmonument: true,
          monument: { naam: 'Oude Kerk', rijksmonumentnummer: '12345', type: 'rijksmonument', afstandMeter: 0 },
          monumentenInOmgeving: []
        },
        beschermdGezicht: {
          binnenGebied: false,
          gezicht: null
        }
      });

      expect(result).toContain('RIJKSMONUMENT');
      expect(result).toContain('Oude Kerk');
      expect(result).toContain('12345');
      expect(result).toContain('Monumentenvergunning');
    });

    it('should format Beschermd Gezicht warning correctly', () => {
      const result = formatPDOKVoorAI({
        natura2000: {
          binnenGebied: false,
          dichtstbijzijnde: null,
          gebiedenBinnen5km: []
        },
        monumenten: {
          isRijksmonument: false,
          monument: null,
          monumentenInOmgeving: []
        },
        beschermdGezicht: {
          binnenGebied: true,
          gezicht: { naam: 'Centrum Delft', code: 'D001', type: 'stads', binnenGebied: true }
        }
      });

      expect(result).toContain('BESCHERMD STADSGEZICHT');
      expect(result).toContain('Centrum Delft');
      expect(result).toContain('welstandseisen');
    });

    it('should show nearby Natura 2000 warning', () => {
      const result = formatPDOKVoorAI({
        natura2000: {
          binnenGebied: false,
          dichtstbijzijnde: { naam: 'Markermeer', code: 'NL123', afstandMeter: 1500 },
          gebiedenBinnen5km: [{ naam: 'Markermeer', code: 'NL123', afstandMeter: 1500 }]
        },
        monumenten: {
          isRijksmonument: false,
          monument: null,
          monumentenInOmgeving: []
        },
        beschermdGezicht: {
          binnenGebied: false,
          gezicht: null
        }
      });

      expect(result).toContain('Markermeer');
      expect(result).toContain('1500m');
      expect(result).toContain('AERIUS');
    });
  });
});
