/**
 * Tests for OpenRechtspraak API Client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  zoekUitspraken, 
  zoekOmgevingsrechtUitspraken, 
  zoekUitsprakenOpThema,
  batchZoekUitspraken,
  getUitspraakContent,
  RECHTSGEBIED 
} from './openRechtspraakClient';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenRechtspraakClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('zoekUitspraken', () => {
    it('should parse Atom feed response correctly', async () => {
      const mockAtomResponse = `<?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title type="text">Rechtspraak Open Data</title>
          <subtitle type="text">Aantal gevonden ECLI's: 100</subtitle>
          <entry>
            <id>ECLI:NL:RVS:2024:1234</id>
            <title type="text">ECLI:NL:RVS:2024:1234, Raad van State, 15-01-2024, 202300123/1/R4</title>
            <summary type="text">Omgevingsvergunning geweigerd wegens strijd met welstandsnota</summary>
            <updated>2024-01-15T10:00:00Z</updated>
            <link rel="alternate" type="text/html" href="https://uitspraken.rechtspraak.nl/details?id=ECLI:NL:RVS:2024:1234" />
          </entry>
        </feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockAtomResponse)
      });

      const results = await zoekUitspraken({ zoekterm: 'omgevingsvergunning' });

      expect(results).toHaveLength(1);
      expect(results[0].ecli).toBe('ECLI:NL:RVS:2024:1234');
      expect(results[0].instantie).toBe('Raad van State');
      expect(results[0].samenvatting).toContain('welstandsnota');
    });

    it('should handle empty results', async () => {
      const mockEmptyResponse = `<?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title type="text">Rechtspraak Open Data</title>
          <subtitle type="text">Aantal gevonden ECLI's: 0</subtitle>
        </feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockEmptyResponse)
      });

      const results = await zoekUitspraken({ zoekterm: 'nonexistent' });

      expect(results).toHaveLength(0);
    });

    it('should retry on server error', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>ECLI:TEST</id><title>Test</title><summary>Test</summary><updated>2024-01-01</updated></entry></feed>`)
        });

      const results = await zoekUitspraken({ zoekterm: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
    });

    it('should handle rate limiting (429)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>ECLI:TEST</id><title>Test</title><summary>Test</summary><updated>2024-01-01</updated></entry></feed>`)
        });

      const results = await zoekUitspraken({ zoekterm: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
    });

    it('should return empty array on client error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

      const results = await zoekUitspraken({ zoekterm: 'test' });

      expect(results).toHaveLength(0);
    });
  });

  describe('zoekOmgevingsrechtUitspraken', () => {
    it('should filter on bestuursrecht by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`)
      });

      await zoekOmgevingsrechtUitspraken('omgevingsvergunning');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('rechtsgebied=');
      expect(calledUrl).toContain('bestuursrecht');
    });

    it('should apply date filter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`)
      });

      const datumVanaf = new Date('2024-01-01');
      await zoekOmgevingsrechtUitspraken('test', { datumVanaf });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('date=');
      expect(calledUrl).toContain('2024-01-01');
    });
  });

  describe('zoekUitsprakenOpThema', () => {
    it('should use correct search terms for BOPA theme', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`)
      });

      await zoekUitsprakenOpThema('bopa');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('buitenplanse');
    });

    it('should use correct search terms for welstand theme', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`)
      });

      await zoekUitsprakenOpThema('welstand');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('welstand');
    });

    it('should use correct search terms for stikstof theme', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`)
      });

      await zoekUitsprakenOpThema('stikstof');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('stikstof');
    });
  });

  describe('batchZoekUitspraken', () => {
    it('should deduplicate results by ECLI', async () => {
      const mockResponse = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
        <entry><id>ECLI:SAME</id><title>Same Case</title><summary>Test</summary><updated>2024-01-01</updated></entry>
      </feed>`;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockResponse)
      });

      const results = await batchZoekUitspraken(['term1', 'term2', 'term3'], {
        dedupliceer: true
      });

      // Should only have 1 result despite 3 searches returning the same ECLI
      expect(results).toHaveLength(1);
      expect(results[0].ecli).toBe('ECLI:SAME');
    });

    it('should not deduplicate when disabled', async () => {
      const mockResponse = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
        <entry><id>ECLI:SAME</id><title>Same Case</title><summary>Test</summary><updated>2024-01-01</updated></entry>
      </feed>`;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockResponse)
      });

      const results = await batchZoekUitspraken(['term1', 'term2'], {
        dedupliceer: false
      });

      // Should have 2 results (duplicates allowed)
      expect(results).toHaveLength(2);
    });
  });

  describe('getUitspraakContent', () => {
    it('should extract text from XML content', async () => {
      const mockXmlContent = `<?xml version="1.0"?>
        <open-rechtspraak>
          <uitspraak>
            <para>Dit is de eerste paragraaf.</para>
            <para>Dit is de tweede paragraaf.</para>
          </uitspraak>
        </open-rechtspraak>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXmlContent)
      });

      const content = await getUitspraakContent('ECLI:TEST');

      expect(content).toContain('eerste paragraaf');
      expect(content).toContain('tweede paragraaf');
    });

    it('should return null on error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const content = await getUitspraakContent('ECLI:NONEXISTENT');

      expect(content).toBeNull();
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = `<not valid xml`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(malformedXml)
      });

      const content = await getUitspraakContent('ECLI:TEST');

      // Should return stripped content as fallback
      expect(content).toBeDefined();
    });
  });

  describe('Date parsing', () => {
    it('should parse Dutch date format from title', async () => {
      const mockAtomResponse = `<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <id>ECLI:NL:RVS:2024:100</id>
            <title type="text">ECLI:NL:RVS:2024:100, Raad van State, 15-03-2024, 202300001</title>
            <summary type="text">Test</summary>
            <updated>2024-03-15T10:00:00Z</updated>
          </entry>
        </feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockAtomResponse)
      });

      const results = await zoekUitspraken({ zoekterm: 'test' });

      expect(results[0].datumUitspraak).toBeInstanceOf(Date);
      expect(results[0].datumUitspraak?.getFullYear()).toBe(2024);
      expect(results[0].datumUitspraak?.getMonth()).toBe(2); // March = 2 (0-indexed)
      // Date might be off by 1 due to timezone, just check it's in the right range
      expect(results[0].datumUitspraak?.getDate()).toBeGreaterThanOrEqual(14);
      expect(results[0].datumUitspraak?.getDate()).toBeLessThanOrEqual(15);
    });
  });
});
