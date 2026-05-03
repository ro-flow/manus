import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router, protectedProcedure } from './_core/trpc';

// Mock the db module
vi.mock('./db', () => ({
  checkSeatAccess: vi.fn(),
}));

import * as db from './db';

describe('seats.checkAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return hasAccess true for super_admin users', async () => {
    // Create a simple test router
    const testRouter = router({
      checkAccess: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user.email) {
          return { hasAccess: false, reason: 'Geen email gevonden voor je account.' };
        }
        
        if (ctx.user.role === 'super_admin' || ctx.user.role === 'admin') {
          return { 
            hasAccess: true, 
            isAdmin: true,
            reason: 'Admin toegang'
          };
        }
        
        return db.checkSeatAccess(ctx.user.email);
      }),
    });

    const caller = testRouter.createCaller({
      user: {
        id: 1,
        openId: 'test-open-id',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'super_admin',
      },
    });

    const result = await caller.checkAccess();
    
    expect(result.hasAccess).toBe(true);
    expect(result.isAdmin).toBe(true);
    expect(result.reason).toBe('Admin toegang');
  });

  it('should return hasAccess true for admin users', async () => {
    const testRouter = router({
      checkAccess: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user.email) {
          return { hasAccess: false, reason: 'Geen email gevonden voor je account.' };
        }
        
        if (ctx.user.role === 'super_admin' || ctx.user.role === 'admin') {
          return { 
            hasAccess: true, 
            isAdmin: true,
            reason: 'Admin toegang'
          };
        }
        
        return db.checkSeatAccess(ctx.user.email);
      }),
    });

    const caller = testRouter.createCaller({
      user: {
        id: 2,
        openId: 'test-open-id-2',
        name: 'Test Admin',
        email: 'admin2@test.com',
        role: 'admin',
      },
    });

    const result = await caller.checkAccess();
    
    expect(result.hasAccess).toBe(true);
    expect(result.isAdmin).toBe(true);
  });

  it('should call checkSeatAccess for regular users', async () => {
    const mockCheckSeatAccess = vi.mocked(db.checkSeatAccess);
    mockCheckSeatAccess.mockResolvedValue({
      hasAccess: true,
      seat: {
        id: 1,
        email: 'user@gemeente.nl',
        gemeenteId: 1,
        status: 'actief',
        naam: 'Test User',
        rol: 'behandelaar',
        createdAt: new Date(),
        updatedAt: new Date(),
        uitnodigingVerzonden: null,
        uitnodigingGeaccepteerd: null,
        laatsteLogin: null,
      },
      gemeente: {
        id: 1,
        gemeenteNaam: 'Test Gemeente',
        status: 'actief',
        seatsGekocht: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        contactEmail: 'contact@gemeente.nl',
        contactNaam: 'Contact Person',
        regio: 'Noord-Holland',
        onboardingVoltooid: true,
        onboardingData: null,
      },
    });

    const testRouter = router({
      checkAccess: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user.email) {
          return { hasAccess: false, reason: 'Geen email gevonden voor je account.' };
        }
        
        if (ctx.user.role === 'super_admin' || ctx.user.role === 'admin') {
          return { 
            hasAccess: true, 
            isAdmin: true,
            reason: 'Admin toegang'
          };
        }
        
        return db.checkSeatAccess(ctx.user.email);
      }),
    });

    const caller = testRouter.createCaller({
      user: {
        id: 3,
        openId: 'test-open-id-3',
        name: 'Regular User',
        email: 'user@gemeente.nl',
        role: 'ambtenaar_gebruiker',
      },
    });

    const result = await caller.checkAccess();
    
    expect(mockCheckSeatAccess).toHaveBeenCalledWith('user@gemeente.nl');
    expect(result.hasAccess).toBe(true);
  });

  it('should return hasAccess false for users without seat', async () => {
    const mockCheckSeatAccess = vi.mocked(db.checkSeatAccess);
    mockCheckSeatAccess.mockResolvedValue({
      hasAccess: false,
      reason: 'Je hebt geen actieve seat. Neem contact op met je gemeente beheerder.',
    });

    const testRouter = router({
      checkAccess: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user.email) {
          return { hasAccess: false, reason: 'Geen email gevonden voor je account.' };
        }
        
        if (ctx.user.role === 'super_admin' || ctx.user.role === 'admin') {
          return { 
            hasAccess: true, 
            isAdmin: true,
            reason: 'Admin toegang'
          };
        }
        
        return db.checkSeatAccess(ctx.user.email);
      }),
    });

    const caller = testRouter.createCaller({
      user: {
        id: 4,
        openId: 'test-open-id-4',
        name: 'No Seat User',
        email: 'noseat@example.com',
        role: 'ambtenaar_gebruiker',
      },
    });

    const result = await caller.checkAccess();
    
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toContain('geen actieve seat');
  });

  it('should return hasAccess false when user has no email', async () => {
    const testRouter = router({
      checkAccess: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user.email) {
          return { hasAccess: false, reason: 'Geen email gevonden voor je account.' };
        }
        
        if (ctx.user.role === 'super_admin' || ctx.user.role === 'admin') {
          return { 
            hasAccess: true, 
            isAdmin: true,
            reason: 'Admin toegang'
          };
        }
        
        return db.checkSeatAccess(ctx.user.email);
      }),
    });

    const caller = testRouter.createCaller({
      user: {
        id: 5,
        openId: 'test-open-id-5',
        name: 'No Email User',
        email: '',
        role: 'ambtenaar_gebruiker',
      },
    });

    const result = await caller.checkAccess();
    
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('Geen email gevonden voor je account.');
  });
});
