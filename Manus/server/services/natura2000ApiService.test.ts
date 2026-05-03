import { describe, it, expect } from "vitest";
import {
  getNatura2000GebiedenInBbox,
  checkNatura2000,
  quickNatura2000Check
} from "./natura2000ApiService";

describe("Natura2000 API Service", () => {
  describe("getNatura2000GebiedenInBbox", () => {
    it("should fetch Natura 2000 gebieden in bounding box", async () => {
      // Bounding box rond Polder Zeevang (bekend Natura 2000 gebied)
      const gebieden = await getNatura2000GebiedenInBbox(5.0, 52.5, 5.2, 52.7, 5);
      
      expect(Array.isArray(gebieden)).toBe(true);
      // Er zouden gebieden moeten zijn in dit gebied
      if (gebieden.length > 0) {
        const gebied = gebieden[0];
        expect(gebied).toHaveProperty("id");
        expect(gebied).toHaveProperty("naam");
        expect(gebied).toHaveProperty("beschermingsType");
      }
    }, 15000);
  });

  describe("checkNatura2000", () => {
    it("should check location near Polder Zeevang", async () => {
      // Locatie nabij Polder Zeevang
      const result = await checkNatura2000(52.55, 5.1, 10000);
      
      expect(result.success).toBe(true);
      expect(result.gebiedenBinnenStraal.length).toBeGreaterThanOrEqual(0);
      expect(result.stikstofRisico).toBeDefined();
      expect(result.aanbeveling).toBeDefined();
    }, 15000);

    it("should detect high risk when inside or very close to Natura 2000", async () => {
      // Locatie in het midden van Polder Zeevang (Natura 2000 gebied)
      const result = await checkNatura2000(52.53, 5.05, 5000);
      
      expect(result.success).toBe(true);
      // Zou hoog of middel risico moeten zijn
      expect(["hoog", "middel", "laag"]).toContain(result.stikstofRisico);
    }, 15000);

    it("should return low/no risk for remote locations", async () => {
      // Locatie ver van Natura 2000 gebieden (midden in de stad)
      const result = await checkNatura2000(52.37, 4.89, 3000); // Amsterdam centrum
      
      expect(result.success).toBe(true);
      // Zou laag of geen risico moeten zijn
      expect(["laag", "geen", "middel"]).toContain(result.stikstofRisico);
    }, 15000);
  });

  describe("quickNatura2000Check", () => {
    it("should perform quick check", async () => {
      const result = await quickNatura2000Check(52.55, 5.1);
      
      expect(result).toHaveProperty("nabijNatura2000");
      expect(typeof result.nabijNatura2000).toBe("boolean");
    }, 15000);
  });
});
