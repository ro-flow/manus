import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("demo router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submit", () => {
    it("should successfully submit a demo request with all fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.demo.submit({
        naam: "Jan de Vries",
        email: "jan@gemeente-test.nl",
        gemeente: "Gemeente Test",
        telefoon: "+31612345678",
        bericht: "Graag een demo voor ons team van 5 personen.",
      });

      expect(result).toEqual({
        success: true,
        message: "Demo aanvraag ontvangen",
      });
    });

    it("should successfully submit a demo request with only required fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.demo.submit({
        naam: "Piet Jansen",
        email: "piet@gemeente-voorbeeld.nl",
        gemeente: "Gemeente Voorbeeld",
      });

      expect(result).toEqual({
        success: true,
        message: "Demo aanvraag ontvangen",
      });
    });

    it("should reject invalid email format", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.demo.submit({
          naam: "Test User",
          email: "invalid-email",
          gemeente: "Test Gemeente",
        })
      ).rejects.toThrow();
    });

    it("should reject empty naam", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.demo.submit({
          naam: "",
          email: "test@test.nl",
          gemeente: "Test Gemeente",
        })
      ).rejects.toThrow();
    });

    it("should reject empty gemeente", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.demo.submit({
          naam: "Test User",
          email: "test@test.nl",
          gemeente: "",
        })
      ).rejects.toThrow();
    });
  });
});
