import { describe, it, expect } from "vitest";

const AERIUS_API_KEY = process.env.AERIUS_API_KEY;
const AERIUS_BASE_URL = "https://connect.aerius.nl/api/v8";

describe("AERIUS API Key Validation", () => {
  it("should have AERIUS_API_KEY environment variable set", () => {
    expect(AERIUS_API_KEY).toBeDefined();
    expect(AERIUS_API_KEY).not.toBe("");
  });

  it("should validate the API key with AERIUS Connect", async () => {
    if (!AERIUS_API_KEY) {
      throw new Error("AERIUS_API_KEY is not set");
    }

    const response = await fetch(`${AERIUS_BASE_URL}/user/validateApiKey`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "api-key": AERIUS_API_KEY,
      },
    });

    // AERIUS returns 200 for valid API key, 401/403 for invalid
    // A 200 response means the key is valid
    expect(response.status).toBe(200);
    
    // The response body might be empty for a valid key
    // Just checking status 200 is sufficient for validation
  });

  it("should get AERIUS Calculator version info", async () => {
    const response = await fetch(`${AERIUS_BASE_URL}/info/version`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    // Should return version information
    expect(data).toBeDefined();
  }, 15000);
});
