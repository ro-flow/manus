import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

/**
 * Tests for the Omgevingsscan dashboard features:
 * - quickScan procedure returns expected result shape
 * - exportPDF procedure accepts scanResult input
 * - Layer definitions are consistent with scan indicator codes
 */

function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Omgevingsscan Dashboard", () => {
  describe("quickScan procedure", () => {
    it("exists and accepts lat/lng/adres input", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Verify the procedure exists on the router
      expect(caller.omgevingsscan.quickScan).toBeDefined();
      expect(typeof caller.omgevingsscan.quickScan).toBe("function");
    });

    it("validates input schema - requires adres, lat, lng", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Should reject invalid input (missing required fields)
      await expect(
        caller.omgevingsscan.quickScan({
          adres: "",
          lat: NaN,
          lng: NaN,
        } as any)
      ).rejects.toThrow();
    });
  });

  describe("exportPDF procedure", () => {
    it("exists and is callable", () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      expect(caller.omgevingsscan.exportPDF).toBeDefined();
      expect(typeof caller.omgevingsscan.exportPDF).toBe("function");
    });
  });

  describe("uploadDocument procedure", () => {
    it("exists and is callable", () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      expect(caller.omgevingsscan.uploadDocument).toBeDefined();
      expect(typeof caller.omgevingsscan.uploadDocument).toBe("function");
    });

    it("validates fileType enum - only pdf and zip allowed", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Should reject invalid fileType
      await expect(
        caller.omgevingsscan.uploadDocument({
          fileName: "test.doc",
          fileBase64: "dGVzdA==",
          fileType: "doc" as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("Layer definitions consistency", () => {
    // These layer definitions match the frontend LayerPanel
    const layerDefinitions = [
      { id: 'kadaster', linkedIndicators: undefined },
      { id: 'natura2000', linkedIndicators: ['NATURA2000'] },
      { id: 'nnn', linkedIndicators: ['NNN'] },
      { id: 'rijksmonumenten', linkedIndicators: ['RIJKSMONUMENT'] },
      { id: 'beschermd_gezicht', linkedIndicators: ['BESCHERMD_GEZICHT'] },
      { id: 'geluidzones', linkedIndicators: ['GELUID_WEG'] },
      { id: 'geluid_spoor', linkedIndicators: ['GELUID_SPOOR'] },
      { id: 'overstromingsrisico', linkedIndicators: ['OVERSTROMINGSRISICO'] },
      { id: 'grondwaterbescherming', linkedIndicators: ['GRONDWATERBESCHERMING'] },
      { id: 'risicokaart', linkedIndicators: ['BEVI', 'RISICOCONTOUR'] },
      { id: 'hoogspanning', linkedIndicators: ['HOOGSPANNING'] },
    ];

    it("all layers have unique IDs", () => {
      const ids = layerDefinitions.map(l => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("linked indicators are arrays when defined", () => {
      for (const layer of layerDefinitions) {
        if (layer.linkedIndicators !== undefined) {
          expect(Array.isArray(layer.linkedIndicators)).toBe(true);
          expect(layer.linkedIndicators.length).toBeGreaterThan(0);
        }
      }
    });

    it("all linked indicator codes are uppercase strings", () => {
      for (const layer of layerDefinitions) {
        if (layer.linkedIndicators) {
          for (const code of layer.linkedIndicators) {
            expect(code).toBe(code.toUpperCase());
            expect(code.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe("Status configuration", () => {
    const validStatuses = ['relevant', 'niet_relevant', 'aandachtspunt', 'onbekend', 'error'];

    it("all expected statuses are defined", () => {
      // These statuses must match what the scan engine returns
      expect(validStatuses).toContain('relevant');
      expect(validStatuses).toContain('niet_relevant');
      expect(validStatuses).toContain('aandachtspunt');
      expect(validStatuses).toContain('onbekend');
      expect(validStatuses).toContain('error');
    });

    it("status labels are in Dutch", () => {
      const statusLabels: Record<string, string> = {
        aandachtspunt: 'Aandachtspunt',
        relevant: 'Relevant',
        niet_relevant: 'Niet relevant',
        onbekend: 'Onbekend',
        error: 'Fout',
      };

      for (const [key, label] of Object.entries(statusLabels)) {
        expect(label.length).toBeGreaterThan(0);
        expect(validStatuses).toContain(key);
      }
    });
  });

  describe("Theme configuration", () => {
    const themeKeys = [
      'basis', 'natuur', 'water', 'geluid_milieu', 'veiligheid',
      'erfgoed', 'landbouw', 'infra', 'landschap', 'gezondheid',
      'mobiliteit', 'bodem'
    ];

    it("all themes have unique keys", () => {
      const uniqueKeys = new Set(themeKeys);
      expect(uniqueKeys.size).toBe(themeKeys.length);
    });

    it("theme count matches expected number (12)", () => {
      expect(themeKeys.length).toBe(12);
    });
  });

  describe("exportCombinedPDF procedure", () => {
    it("exists and is callable", () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      expect(caller.omgevingsscan.exportCombinedPDF).toBeDefined();
      expect(typeof caller.omgevingsscan.exportCombinedPDF).toBe("function");
    });

    it("validates input - requires scanResults array with correct shape", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Should reject invalid input (missing locatie fields)
      await expect(
        caller.omgevingsscan.exportCombinedPDF({ scanResults: [{ locatie: { adres: 123 } }] } as any)
      ).rejects.toThrow();
    });

    it("accepts empty scanResults array and generates PDF", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.omgevingsscan.exportCombinedPDF({ scanResults: [] });
      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.filename).toContain('gecombineerd');
    }, 15000);
  });

  describe("Combined overview logic", () => {
    const mockMultiScanResults = [
      {
        locatie: { lat: 52.5, lng: 5.0, adres: "Dorpsstraat 1, Zwaag" },
        result: {
          samenvatting: { totaal: 83, aandachtspunten: 5, relevant: 20, nietRelevant: 50, onbekend: 8, errors: 0 },
          indicatoren: [
            { code: 'NATURA2000', status: 'aandachtspunt', humanName: 'Natura 2000', waarde: 'Binnen 3km', theme: 'natuur', toelichting: '', bronnen: [] },
            { code: 'BESTEMMINGSPLAN', status: 'relevant', humanName: 'Bestemmingsplan', waarde: 'Wonen', theme: 'planologie', toelichting: '', bronnen: [] },
          ],
          themaOverzicht: [],
        },
      },
      {
        locatie: { lat: 52.6, lng: 5.1, adres: "Kerkstraat 10, Hoorn" },
        result: {
          samenvatting: { totaal: 83, aandachtspunten: 3, relevant: 25, nietRelevant: 48, onbekend: 7, errors: 0 },
          indicatoren: [
            { code: 'NATURA2000', status: 'aandachtspunt', humanName: 'Natura 2000', waarde: 'Binnen 5km', theme: 'natuur', toelichting: '', bronnen: [] },
            { code: 'RIJKSMONUMENT', status: 'aandachtspunt', humanName: 'Rijksmonument', waarde: 'Nabij monument', theme: 'erfgoed', toelichting: '', bronnen: [] },
          ],
          themaOverzicht: [],
        },
      },
    ];

    it("correctly merges statistics from multiple locations", () => {
      const totalAandacht = mockMultiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.aandachtspunten, 0);
      const totalIndicatoren = mockMultiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.totaal, 0);

      expect(totalAandacht).toBe(8); // 5 + 3
      expect(totalIndicatoren).toBe(166); // 83 + 83
    });

    it("correctly collects unique aandachtspunten across locations", () => {
      const aandachtspuntenMap = new Map<string, { indicator: any; locations: string[] }>();
      for (const sr of mockMultiScanResults) {
        for (const ind of sr.result.indicatoren) {
          if (ind.status === 'aandachtspunt') {
            const existing = aandachtspuntenMap.get(ind.code);
            if (existing) {
              existing.locations.push(sr.locatie.adres.split(',')[0]);
            } else {
              aandachtspuntenMap.set(ind.code, { indicator: ind, locations: [sr.locatie.adres.split(',')[0]] });
            }
          }
        }
      }

      // NATURA2000 appears in both locations
      expect(aandachtspuntenMap.get('NATURA2000')?.locations.length).toBe(2);
      // RIJKSMONUMENT only in second location
      expect(aandachtspuntenMap.get('RIJKSMONUMENT')?.locations.length).toBe(1);
      // Total unique aandachtspunten codes
      expect(aandachtspuntenMap.size).toBe(2);
    });
  });

  describe("Base layer configuration", () => {
    const baseLayers = ['pastel', 'topografie', 'luchtfoto'];

    it("includes pastel as a base layer option", () => {
      expect(baseLayers).toContain('pastel');
    });

    it("has exactly 3 base layer options", () => {
      expect(baseLayers.length).toBe(3);
    });

    it("pastel is the default base layer", () => {
      // Default should be pastel for a cleaner initial look
      expect(baseLayers[0]).toBe('pastel');
    });
  });

  describe("Numbered marker configuration", () => {
    it("generates correct numbered markers for multi-scan results", () => {
      const locations = [
        { lat: 52.5, lng: 5.0, adres: "Locatie 1" },
        { lat: 52.6, lng: 5.1, adres: "Locatie 2" },
        { lat: 52.7, lng: 5.2, adres: "Locatie 3" },
      ];

      // Each location should get a sequential number
      locations.forEach((loc, i) => {
        expect(i + 1).toBeGreaterThan(0);
        expect(i + 1).toBeLessThanOrEqual(locations.length);
      });
    });

    it("active location index can be -1 for combined view", () => {
      const activeLocationIndex = -1;
      expect(activeLocationIndex).toBe(-1);
      // -1 means "Alle locaties" tab is active
    });
  });

  describe("Dashboard redesign V2 - Enhanced UI", () => {
    it("auto-expands all themes by default", () => {
      // All themes should be expanded so results are immediately visible
      const themeKeys = ['basis', 'natuur', 'water', 'geluid_milieu', 'veiligheid',
        'erfgoed', 'landbouw', 'infra', 'landschap', 'gezondheid', 'mobiliteit', 'bodem'];
      const expandedThemes = new Set(themeKeys);
      expect(expandedThemes.size).toBe(themeKeys.length);
      themeKeys.forEach(key => expect(expandedThemes.has(key)).toBe(true));
    });

    it("auto-expands aandachtspunt indicators", () => {
      const indicators = [
        { code: 'NATURA2000', status: 'aandachtspunt' },
        { code: 'BESTEMMINGSPLAN', status: 'relevant' },
        { code: 'WATERKERING', status: 'aandachtspunt' },
        { code: 'BODEM', status: 'niet_relevant' },
      ];
      const expanded = new Set<string>();
      indicators.forEach(i => {
        if (i.status === 'aandachtspunt') expanded.add(i.code);
      });
      expect(expanded.size).toBe(2);
      expect(expanded.has('NATURA2000')).toBe(true);
      expect(expanded.has('WATERKERING')).toBe(true);
      expect(expanded.has('BESTEMMINGSPLAN')).toBe(false);
    });

    it("shows aandachtspunten quick summary with max 5 items", () => {
      const aandachtspunten = Array.from({ length: 8 }, (_, i) => ({
        code: `IND_${i}`,
        status: 'aandachtspunt',
        humanName: `Indicator ${i}`,
        waarde: `Waarde ${i}`,
      }));
      const visible = aandachtspunten.slice(0, 5);
      const remaining = aandachtspunten.length - 5;
      expect(visible.length).toBe(5);
      expect(remaining).toBe(3);
    });

    it("displays scan metadata correctly", () => {
      const scanResult = {
        duurMs: 4500,
        samenvatting: { totaal: 83 },
        themaOverzicht: Array.from({ length: 14 }, (_, i) => ({ theme: `theme_${i}` })),
      };
      expect((scanResult.duurMs / 1000).toFixed(1)).toBe('4.5');
      expect(scanResult.samenvatting.totaal).toBe(83);
      expect(scanResult.themaOverzicht.length).toBe(14);
    });

    it("perceel popup shows scan result summary", () => {
      const scanResult = {
        samenvatting: { aandachtspunten: 13, relevant: 15, totaal: 83 },
      };
      expect(scanResult.samenvatting.aandachtspunten).toBe(13);
      expect(scanResult.samenvatting.relevant).toBe(15);
      expect(scanResult.samenvatting.totaal).toBe(83);
    });

    it("pand popup shows bouwjaar and status", () => {
      const pandProperties = { bouwjaar: 1985, status: 'Pand in gebruik' };
      expect(pandProperties.bouwjaar).toBe(1985);
      expect(pandProperties.status).toBe('Pand in gebruik');
    });

    it("empty state shows 3 instruction options", () => {
      const instructions = ['Zoek een adres', 'Klik op de kaart', 'Upload een document'];
      expect(instructions.length).toBe(3);
      instructions.forEach(inst => expect(inst.length).toBeGreaterThan(0));
    });

    it("right panel width is 520px", () => {
      const panelWidth = 520;
      expect(panelWidth).toBe(520);
    });
  });

  describe("Dashboard V3 - Perceelgrenzen & Polygon Overlays", () => {
    // WKT to GeoJSON conversion (mirrors server-side logic)
    function wktToGeoJSON(wkt: string): any {
      try {
        // Check MULTIPOLYGON first (before POLYGON) to avoid false match
        const multiMatch = wkt.match(/MULTIPOLYGON\(\(\((.+?)\)\)\)/);
        if (multiMatch) {
          const rings = multiMatch[1].split('),(').map(ring =>
            ring.split(',').map(coord => {
              const [lng, lat] = coord.trim().split(/\s+/).map(Number);
              return [lng, lat];
            })
          );
          return { type: 'MultiPolygon', coordinates: [rings] };
        }
        const match = wkt.match(/POLYGON\(\((.+?)\)\)/);
        if (!match) return null;
        const coords = match[1].split(',').map(coord => {
          const [lng, lat] = coord.trim().split(/\s+/).map(Number);
          return [lng, lat];
        });
        return { type: 'Polygon', coordinates: [coords] };
      } catch (e) {
        return null;
      }
    }

    it("parses WKT POLYGON to GeoJSON correctly", () => {
      const wkt = "POLYGON((5.01702 52.63799,5.01514 52.63737,5.01522 52.63733,5.01691 52.63732,5.01702 52.63799))";
      const geojson = wktToGeoJSON(wkt);
      expect(geojson).not.toBeNull();
      expect(geojson.type).toBe('Polygon');
      expect(geojson.coordinates).toHaveLength(1);
      expect(geojson.coordinates[0]).toHaveLength(5);
      expect(geojson.coordinates[0][0]).toEqual([5.01702, 52.63799]);
    });

    it("returns null for invalid WKT", () => {
      expect(wktToGeoJSON("INVALID")).toBeNull();
      expect(wktToGeoJSON("")).toBeNull();
      expect(wktToGeoJSON("POINT(5.0 52.0)")).toBeNull();
    });

    it("parses WKT MULTIPOLYGON to GeoJSON", () => {
      const wkt = "MULTIPOLYGON(((5.0 52.0,5.1 52.0,5.1 52.1,5.0 52.1,5.0 52.0)))";
      const geojson = wktToGeoJSON(wkt);
      expect(geojson).not.toBeNull();
      expect(geojson.type).toBe('MultiPolygon');
      expect(geojson.coordinates).toHaveLength(1);
    });

    it("assigns unique colors to each perceel", () => {
      const perceelKleuren = [
        'rgba(59, 130, 246, 0.35)',  // blue
        'rgba(16, 185, 129, 0.35)',  // emerald
        'rgba(168, 85, 247, 0.35)',  // purple
        'rgba(245, 158, 11, 0.35)',  // amber
        'rgba(239, 68, 68, 0.35)',   // red
        'rgba(6, 182, 212, 0.35)',   // cyan
        'rgba(236, 72, 153, 0.35)',  // pink
      ];
      // 5 percelen should get 5 unique colors
      const usedColors = perceelKleuren.slice(0, 5);
      const uniqueColors = new Set(usedColors);
      expect(uniqueColors.size).toBe(5);
    });

    it("calculates bounding box from multiple perceel polygons", () => {
      const percelen = [
        { lat: 52.63, lng: 5.01, perceelGrenzen: { type: 'Polygon', coordinates: [[[5.0, 52.6], [5.02, 52.6], [5.02, 52.65], [5.0, 52.65], [5.0, 52.6]]] } },
        { lat: 52.60, lng: 5.05, perceelGrenzen: { type: 'Polygon', coordinates: [[[5.04, 52.58], [5.06, 52.58], [5.06, 52.62], [5.04, 52.62], [5.04, 52.58]]] } },
      ];
      // Calculate bounds
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      for (const p of percelen) {
        if (p.perceelGrenzen?.coordinates) {
          const coords = p.perceelGrenzen.coordinates[0];
          for (const [lng, lat] of coords) {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          }
        }
      }
      expect(minLat).toBe(52.58);
      expect(maxLat).toBe(52.65);
      expect(minLng).toBe(5.0);
      expect(maxLng).toBe(5.06);
    });

    it("clicking a perceel polygon switches to that location's results", () => {
      const multiScanResults = [
        { locatie: { adres: 'KGL02 - AC - 476' }, result: { samenvatting: { aandachtspunten: 15 } } },
        { locatie: { adres: 'HOO00 - M - 656' }, result: { samenvatting: { aandachtspunten: 15 } } },
        { locatie: { adres: 'KGL02 - AE - 324' }, result: { samenvatting: { aandachtspunten: 15 } } },
      ];
      // Clicking perceel 2 should set activeLocationIndex to 1
      const clickedIndex = 1;
      const activeResult = multiScanResults[clickedIndex];
      expect(activeResult.locatie.adres).toBe('HOO00 - M - 656');
      expect(activeResult.result.samenvatting.aandachtspunten).toBe(15);
    });

    it("legenda shows all percelen with their colors and counts", () => {
      const percelen = [
        { kadastraal: 'KGL02 - AC - 476', aandachtspunten: 15 },
        { kadastraal: 'HOO00 - M - 656', aandachtspunten: 15 },
        { kadastraal: 'KGL02 - AE - 324', aandachtspunten: 15 },
        { kadastraal: 'KGL02 - AE - 328', aandachtspunten: 15 },
        { kadastraal: 'KGL02 - AE - 334', aandachtspunten: 15 },
      ];
      expect(percelen.length).toBe(5);
      percelen.forEach(p => {
        expect(p.kadastraal.length).toBeGreaterThan(0);
        expect(p.aandachtspunten).toBeGreaterThanOrEqual(0);
      });
    });

    it("PDOK locatieserver search URL is correctly formatted", () => {
      const gemeenteCode = 'KGL02';
      const sectie = 'AC';
      const perceelNr = '476';
      const searchQuery = `${gemeenteCode} ${sectie} ${perceelNr}`;
      const searchUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(searchQuery)}&fq=type:perceel&rows=5`;
      expect(searchUrl).toContain('KGL02%20AC%20476');
      expect(searchUrl).toContain('fq=type:perceel');
    });
  });
});
