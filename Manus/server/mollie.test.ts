import { describe, expect, it } from "vitest";
import createMollieClient from '@mollie/api-client';

describe("Mollie API Integration", () => {
  it("validates Mollie API key by fetching payment methods", async () => {
    const apiKey = process.env.MOLLIE_API_KEY;
    
    // Skip test if no API key is configured
    if (!apiKey) {
      console.log("Skipping Mollie test: MOLLIE_API_KEY not configured");
      return;
    }
    
    const client = createMollieClient({ apiKey });
    
    // Try to fetch payment methods - this validates the API key
    const methods = await client.methods.list();
    
    // Should return an array of payment methods
    expect(Array.isArray(methods)).toBe(true);
    
    // iDEAL should be available for Dutch accounts
    const methodIds = methods.map(m => m.id);
    console.log("Available payment methods:", methodIds);
    
    // At minimum, some methods should be returned
    expect(methods.length).toBeGreaterThan(0);
  });
});
