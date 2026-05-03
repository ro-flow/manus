import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
const { fetchAtlasLeefomgevingData } = await import('./atlasLeefomgevingService');

describe('atlasLeefomgevingService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should fetch all environmental data layers in parallel', async () => {
    // Mock all 11 WMS queries with different values
    const mockResponses = [
      // Geluid
      { features: [{ properties: { GRAY_INDEX: 55 } }] },  // lden alle
      { features: [{ properties: { GRAY_INDEX: 48 } }] },  // lden weg
      { features: [{ properties: { GRAY_INDEX: 40 } }] },  // lnight weg
      { features: [{ properties: { GRAY_INDEX: 35 } }] },  // lden trein
      { features: [{ properties: { GRAY_INDEX: 0 } }] },   // lden industrie (0 = no data)
      { features: [{ properties: { GRAY_INDEX: 0 } }] },   // lden wind (0 = no data)
      // Luchtkwaliteit
      { features: [{ properties: { GRAY_INDEX: 12.5 } }] }, // NO2
      { features: [{ properties: { GRAY_INDEX: 18.3 } }] }, // PM10
      { features: [{ properties: { GRAY_INDEX: 9.7 } }] },  // PM2.5
      // Overstroming
      { features: [{ properties: { GRAY_INDEX: 1 } }] },    // overstromingskans
      // Lichtemissie
      { features: [{ properties: { GRAY_INDEX: 250 } }] },  // lichtemissie
    ];

    mockFetch.mockImplementation(() => {
      const idx = mockFetch.mock.calls.length - 1;
      const responseData = mockResponses[idx] || { features: [] };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responseData),
      });
    });

    const result = await fetchAtlasLeefomgevingData(50.78, 5.69);

    // Should have made 11 WMS requests
    expect(mockFetch).toHaveBeenCalledTimes(11);

    // Verify geluid data
    expect(result.geluid.ldenAlleBronnen).toBe(55);
    expect(result.geluid.ldenWegverkeer).toBe(48);
    expect(result.geluid.lnightWegverkeer).toBe(40);
    expect(result.geluid.ldenTreinverkeer).toBe(35);
    expect(result.geluid.ldenIndustrie).toBe(0);
    expect(result.geluid.ldenWindturbines).toBe(0);

    // Verify luchtkwaliteit data (rounded to 1 decimal)
    expect(result.luchtkwaliteit.no2).toBe(12.5);
    expect(result.luchtkwaliteit.pm10).toBe(18.3);
    expect(result.luchtkwaliteit.pm25).toBe(9.7);
    expect(result.luchtkwaliteit.jaar).toBe('2023');

    // Verify overstroming
    expect(result.overstromingskans).toBe(1);

    // Verify lichtemissie
    expect(result.lichtemissie).toBe(250);
  });

  it('should handle empty features gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    const result = await fetchAtlasLeefomgevingData(52.37, 4.89);

    expect(result.geluid.ldenAlleBronnen).toBeNull();
    expect(result.geluid.ldenWegverkeer).toBeNull();
    expect(result.luchtkwaliteit.no2).toBeNull();
    expect(result.luchtkwaliteit.pm10).toBeNull();
    expect(result.luchtkwaliteit.pm25).toBeNull();
    expect(result.overstromingskans).toBeNull();
    expect(result.lichtemissie).toBeNull();
  });

  it('should handle HTTP errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await fetchAtlasLeefomgevingData(52.37, 4.89);

    expect(result.geluid.ldenAlleBronnen).toBeNull();
    expect(result.luchtkwaliteit.no2).toBeNull();
    expect(result.overstromingskans).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNRESET'));

    const result = await fetchAtlasLeefomgevingData(52.37, 4.89);

    expect(result.geluid.ldenAlleBronnen).toBeNull();
    expect(result.luchtkwaliteit.no2).toBeNull();
    expect(result.overstromingskans).toBeNull();
  });

  it('should use correct WMS URL format with EPSG:28992', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    await fetchAtlasLeefomgevingData(50.78, 5.69);

    // Verify the first call uses the correct WMS format
    const firstCallUrl = mockFetch.mock.calls[0][0] as string;
    expect(firstCallUrl).toContain('data.rivm.nl/geo/alo/wms');
    expect(firstCallUrl).toContain('service=WMS');
    expect(firstCallUrl).toContain('request=GetFeatureInfo');
    expect(firstCallUrl).toContain('crs=EPSG:28992');
    expect(firstCallUrl).toContain('info_format=application/json');
  });

  it('should round luchtkwaliteit values to 1 decimal', async () => {
    const mockResponses = Array(11).fill(null).map((_, i) => {
      if (i === 6) return { features: [{ properties: { GRAY_INDEX: 12.456 } }] }; // NO2
      if (i === 7) return { features: [{ properties: { GRAY_INDEX: 18.789 } }] }; // PM10
      if (i === 8) return { features: [{ properties: { GRAY_INDEX: 9.123 } }] };  // PM2.5
      return { features: [] };
    });

    mockFetch.mockImplementation(() => {
      const idx = mockFetch.mock.calls.length - 1;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses[idx] || { features: [] }),
      });
    });

    const result = await fetchAtlasLeefomgevingData(50.78, 5.69);

    expect(result.luchtkwaliteit.no2).toBe(12.5);
    expect(result.luchtkwaliteit.pm10).toBe(18.8);
    expect(result.luchtkwaliteit.pm25).toBe(9.1);
  });
});
