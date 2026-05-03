import { describe, it, expect } from "vitest";
import {
  validateApiKey,
  getVersionInfo,
  activityMayHaveNitrogenEmissions,
  generateNitrogenPreAssessment,
} from "./aeriusApiService";

describe("AERIUS API Service", () => {
  describe("API Connection", () => {
  it("should validate the API key successfully", async () => {
    const isValid = await validateApiKey();
    expect(isValid).toBe(true);
  }, 15000);

    it("should get version info from AERIUS", async () => {
      const versionInfo = await getVersionInfo();
      expect(versionInfo).toBeDefined();
    }, 15000);
  });

  describe("Nitrogen Emission Detection", () => {
    it("should detect emissions for construction activities", () => {
      const result = activityMayHaveNitrogenEmissions(["bouwen van een woning"]);
      expect(result.hasEmissions).toBe(true);
      expect(result.emissionSources).toContain("Bouwverkeer en materieel");
    });

    it("should detect emissions for demolition activities", () => {
      const result = activityMayHaveNitrogenEmissions(["slopen van een schuur"]);
      expect(result.hasEmissions).toBe(true);
      expect(result.emissionSources).toContain("Sloopverkeer en materieel");
    });

    it("should detect emissions for agricultural activities", () => {
      const result = activityMayHaveNitrogenEmissions(["veehouderij uitbreiden"]);
      expect(result.hasEmissions).toBe(true);
      expect(result.emissionSources).toContain("Veestapel emissies");
    });

    it("should detect emissions for traffic-generating activities", () => {
      const result = activityMayHaveNitrogenEmissions(["parkeren op terrein"]);
      expect(result.hasEmissions).toBe(true);
      expect(result.emissionSources).toContain("Verkeersaantrekkende werking");
    });

    it("should detect multiple emission sources", () => {
      const result = activityMayHaveNitrogenEmissions([
        "bouwen van woningen",
        "parkeergarage",
        "horeca",
      ]);
      expect(result.hasEmissions).toBe(true);
      expect(result.emissionSources.length).toBeGreaterThanOrEqual(2);
    });

    it("should not detect emissions for non-emitting activities", () => {
      const result = activityMayHaveNitrogenEmissions(["plaatsen van een dakkapel"]);
      expect(result.hasEmissions).toBe(false);
      expect(result.emissionSources).toHaveLength(0);
    });
  });

  describe("Nitrogen Pre-Assessment", () => {
    it("should generate high risk assessment for multiple emission sources", () => {
      const result = generateNitrogenPreAssessment(
        ["bouwen", "parkeren", "horeca", "logistiek"],
        { lat: 52.6324, lng: 5.0669, adres: "Hoorn" }
      );
      expect(result.requiresCalculation).toBe(true);
      expect(result.riskLevel).toBe("hoog");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should generate medium risk assessment for single emission source", () => {
      const result = generateNitrogenPreAssessment(
        ["bouwen van een woning"],
        { lat: 52.6324, lng: 5.0669, adres: "Hoorn" }
      );
      expect(result.requiresCalculation).toBe(true);
      expect(result.riskLevel).toBe("middel");
    });

    it("should generate low risk assessment for non-emitting activities", () => {
      const result = generateNitrogenPreAssessment(
        ["plaatsen van zonnepanelen"],
        { lat: 52.6324, lng: 5.0669, adres: "Hoorn" }
      );
      expect(result.requiresCalculation).toBe(false);
      expect(result.riskLevel).toBe("laag");
    });

    it("should include AERIUS recommendation for emitting activities", () => {
      const result = generateNitrogenPreAssessment(
        ["bouwen"],
        { lat: 52.6324, lng: 5.0669, adres: "Hoorn" }
      );
      expect(result.recommendations.some(r => r.includes("AERIUS"))).toBe(true);
    });
  });
});
