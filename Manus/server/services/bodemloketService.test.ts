import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bevraagBodemloket, type BodemloketResultaat } from './bodemloketService';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('bodemloketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bevraagBodemloket', () => {
    it('should return omgevingsdienst info when found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            attributes: {
              AUTHORITY_DBK: 1594096,
              AUTHORITY_CD: null,
              AUTHORITY_NM: 'Omgevingsdienst Noordzeekanaalgebied',
              WEBSITE_BLN: 'J',
              DOSSIER_BLN: 'N',
              DISPLAY_CD: 'JN',
              WEBSITE_URL: 'https://odnzkg.nazca4u.nl/rapportage/viewerLookUp/Geolocator.aspx',
            },
          }],
        }),
      });

      const result = await bevraagBodemloket(52.3676, 4.9041); // Amsterdam

      expect(result.gevonden).toBe(true);
      expect(result.omgevingsdienstNaam).toBe('Omgevingsdienst Noordzeekanaalgebied');
      expect(result.omgevingsdienstUrl).toBe('https://odnzkg.nazca4u.nl/rapportage/viewerLookUp/Geolocator.aspx');
      expect(result.websiteBeschikbaar).toBe(true);
      expect(result.dossierBeschikbaar).toBe(false);
      expect(result.aanbeveling).toContain('Omgevingsdienst Noordzeekanaalgebied');
      expect(result.bron).toBe('Bodemloket (Rijkswaterstaat)');
    });

    it('should return dossier info when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            attributes: {
              AUTHORITY_DBK: 1594122,
              AUTHORITY_NM: 'DCMR Milieudienst Rijnmond',
              WEBSITE_BLN: 'J',
              DOSSIER_BLN: 'J',
              WEBSITE_URL: 'https://dcmr.gisinternet.nl/',
            },
          }],
        }),
      });

      const result = await bevraagBodemloket(51.9225, 4.4792); // Rotterdam

      expect(result.gevonden).toBe(true);
      expect(result.omgevingsdienstNaam).toBe('DCMR Milieudienst Rijnmond');
      expect(result.dossierBeschikbaar).toBe(true);
      expect(result.aanbeveling).toContain('dossiergegevens beschikbaar');
    });

    it('should handle no features found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [],
        }),
      });

      const result = await bevraagBodemloket(52.0, 5.0);

      expect(result.gevonden).toBe(false);
      expect(result.omgevingsdienstNaam).toBeNull();
      expect(result.omgevingsdienstUrl).toBeNull();
      expect(result.aanbeveling).toContain('bodemloket.nl');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await bevraagBodemloket(52.3676, 4.9041);

      expect(result.gevonden).toBe(false);
      expect(result.aanbeveling).toContain('niet bereikbaar');
      expect(result.bron).toContain('niet bereikbaar');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await bevraagBodemloket(52.3676, 4.9041);

      expect(result.gevonden).toBe(false);
      expect(result.aanbeveling).toContain('niet bereikbaar');
    });

    it('should handle API error response in JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: { message: 'Invalid query parameters' },
        }),
      });

      const result = await bevraagBodemloket(52.3676, 4.9041);

      expect(result.gevonden).toBe(false);
      expect(result.aanbeveling).toContain('niet bereikbaar');
    });

    it('should handle omgevingsdienst without website', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{
            attributes: {
              AUTHORITY_DBK: 123,
              AUTHORITY_NM: 'Omgevingsdienst Test',
              WEBSITE_BLN: 'N',
              DOSSIER_BLN: 'N',
              WEBSITE_URL: null,
            },
          }],
        }),
      });

      const result = await bevraagBodemloket(52.0, 5.0);

      expect(result.gevonden).toBe(true);
      expect(result.omgevingsdienstNaam).toBe('Omgevingsdienst Test');
      expect(result.websiteBeschikbaar).toBe(false);
      expect(result.aanbeveling).toContain('Neem contact op met');
    });

    it('should use correct RD coordinates in API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      });

      await bevraagBodemloket(52.3676, 4.9041);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('esriGeometryEnvelope');
      expect(url).toContain('inSR=28992');
      expect(url).toContain('esriSpatialRelIntersects');
      expect(url).toContain('f=json');
    });
  });
});
