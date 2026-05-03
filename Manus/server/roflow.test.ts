import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock user types
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: string = 'user', gemeenteId?: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: role as any,
    gemeenteId: gemeenteId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("RBAC Middleware", () => {
  it("allows super_admin to access admin routes", async () => {
    const ctx = createMockContext('super_admin');
    const caller = appRouter.createCaller(ctx);
    
    // Should not throw for super_admin
    const result = await caller.gemeente.stats();
    expect(result).toBeDefined();
  });

  it("allows admin to access admin routes", async () => {
    const ctx = createMockContext('admin');
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.gemeente.stats();
    expect(result).toBeDefined();
  });

  it("denies regular user access to admin routes", async () => {
    const ctx = createMockContext('user');
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.gemeente.stats()).rejects.toThrow('Super admin access required');
  });

  it("allows gemeente_beheerder to access beheerder routes", async () => {
    const ctx = createMockContext('gemeente_beheerder', 1);
    const caller = appRouter.createCaller(ctx);
    
    // Should not throw for beheerder
    const result = await caller.seats.listByGemeente({ gemeenteId: 1 });
    expect(result).toBeDefined();
  });

  it("denies ambtenaar_gebruiker access to beheerder routes", async () => {
    const ctx = createMockContext('ambtenaar_gebruiker', 1);
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.seats.listByGemeente({ gemeenteId: 1 })).rejects.toThrow('Beheerder access required');
  });

  it("allows ambtenaar_gebruiker to access behandelaar routes", async () => {
    const ctx = createMockContext('ambtenaar_gebruiker', 1);
    const caller = appRouter.createCaller(ctx);
    
    // Should not throw for behandelaar
    const result = await caller.beleidsdocumenten.listByGemeente({ gemeenteId: 1 });
    expect(result).toBeDefined();
  });
});

describe("Auth Router", () => {
  it("returns user for authenticated request", async () => {
    const ctx = createMockContext('user');
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null for unauthenticated request", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("clears cookie on logout", async () => {
    const ctx = createMockContext('user');
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});

describe("Gemeente Router", () => {
  it("lists gemeenten for public access", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.gemeente.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("searches regio lookup", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.gemeente.searchRegio({ query: "Hoorn" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Adviseurs Router", () => {
  it("lists adviseurs for behandelaar", async () => {
    const ctx = createMockContext('ambtenaar_gebruiker', 1);
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.adviseurs.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies unauthenticated access to adviseurs", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.adviseurs.list()).rejects.toThrow();
  });
});

describe("Behandelrapport Router", () => {
  it("lists rapporten for behandelaar", async () => {
    const ctx = createMockContext('ambtenaar_gebruiker', 1);
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.behandelrapport.listByGemeente({ gemeenteId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies stats access to non-admin", async () => {
    const ctx = createMockContext('ambtenaar_gebruiker', 1);
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.behandelrapport.stats()).rejects.toThrow('Super admin access required');
  });

  it("allows admin to view stats", async () => {
    const ctx = createMockContext('admin');
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.behandelrapport.stats();
    expect(result).toBeDefined();
  });
});
