import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// Mock the database functions
vi.mock('./db', () => ({
  getSubscriptionByUserId: vi.fn(),
  getPaymentsByUserId: vi.fn(),
  createSubscription: vi.fn(),
  createPayment: vi.fn(),
  updateSubscription: vi.fn(),
  updatePaymentByMollieId: vi.fn(),
  getUserByOpenId: vi.fn(),
  getExpiringTrials: vi.fn(),
}));

// Mock the Mollie service
vi.mock('./services/mollie', () => ({
  createCustomer: vi.fn(),
  createFirstPayment: vi.fn(),
  getPayment: vi.fn(),
  createSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
}));

// Mock the notification service
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(user?: AuthenticatedUser | null): TrpcContext {
  const defaultUser: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "google",
    role: "user",
    gemeenteId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: user === null ? null : (user || defaultUser),
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe('Payment Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscription', () => {
    it('should return null when user has no subscription', async () => {
      const db = await import('./db');
      vi.mocked(db.getSubscriptionByUserId).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.payment.getSubscription();
      expect(result).toBeNull();
    });

    it('should return subscription when user has one', async () => {
      const mockSubscription = {
        id: 1,
        userId: 1,
        mollieCustomerId: 'cst_123',
        mollieSubscriptionId: 'sub_123',
        mollieMandateId: null,
        plan: 'monthly' as const,
        amount: '149.00',
        currency: 'EUR',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'trial' as const,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastPaymentDate: null,
        canceledAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const db = await import('./db');
      vi.mocked(db.getSubscriptionByUserId).mockResolvedValue(mockSubscription);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.payment.getSubscription();
      expect(result).toEqual(mockSubscription);
      expect(result?.status).toBe('trial');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return empty array when no payments', async () => {
      const db = await import('./db');
      vi.mocked(db.getPaymentsByUserId).mockResolvedValue([]);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.payment.getPaymentHistory();
      expect(result).toEqual([]);
    });

    it('should return payment history', async () => {
      const mockPayments = [
        {
          id: 1,
          subscriptionId: 1,
          userId: 1,
          molliePaymentId: 'tr_123',
          mollieCustomerId: 'cst_123',
          amount: '0.01',
          currency: 'EUR',
          description: 'Ro-flow Pro Maandelijks - Proefperiode',
          status: 'paid' as const,
          method: 'creditcard',
          paidAt: new Date(),
          failedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const db = await import('./db');
      vi.mocked(db.getPaymentsByUserId).mockResolvedValue(mockPayments);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.payment.getPaymentHistory();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('paid');
    });
  });

  describe('processWebhook', () => {
    it('should process paid payment and update database', async () => {
      const mollie = await import('./services/mollie');
      const db = await import('./db');

      vi.mocked(mollie.getPayment).mockResolvedValue({
        id: 'tr_123',
        status: 'paid',
        amount: { currency: 'EUR', value: '0.01' },
        method: 'creditcard',
        metadata: {
          userId: '1',
          plan: 'monthly',
          amount: '149',
          startDate: '2026-02-21',
        },
        paidAt: '2026-01-22T12:00:00Z',
        canceledAt: null,
        expiredAt: null,
      });

      vi.mocked(db.getSubscriptionByUserId).mockResolvedValue({
        id: 1,
        userId: 1,
        mollieCustomerId: 'cst_123',
        mollieSubscriptionId: null,
        mollieMandateId: null,
        plan: 'monthly' as const,
        amount: '149.00',
        currency: 'EUR',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'trial' as const,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastPaymentDate: null,
        canceledAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mollie.createSubscription).mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        nextPaymentDate: '2026-02-21',
      });

      vi.mocked(db.updatePaymentByMollieId).mockResolvedValue(undefined);
      vi.mocked(db.updateSubscription).mockResolvedValue(undefined);

      // processWebhook is a public procedure, so no auth needed
      const ctx = createAuthContext(null);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.payment.processWebhook({ paymentId: 'tr_123' });
      expect(result.success).toBe(true);
      expect(db.updatePaymentByMollieId).toHaveBeenCalled();
    });
  });
});


describe('sendTrialReminders', () => {
  it('should send reminders for expiring trials', async () => {
    const db = await import('./db');
    const notification = await import('./_core/notification');

    const mockExpiringTrials = [
      {
        subscription: {
          id: 1,
          userId: 1,
          mollieCustomerId: 'cst_123',
          mollieSubscriptionId: null,
          mollieMandateId: null,
          plan: 'monthly' as const,
          amount: '149.00',
          currency: 'EUR',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          status: 'trial' as const,
          nextBillingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          lastPaymentDate: null,
          canceledAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 1,
          openId: 'test-open-id',
          email: 'test@example.com',
          name: 'Test User',
          loginMethod: 'google',
          role: 'user' as const,
          gemeenteId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
      },
    ];

    vi.mocked(db.getExpiringTrials).mockResolvedValue(mockExpiringTrials);
    vi.mocked(notification.notifyOwner).mockResolvedValue(true);

    const ctx = createAuthContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.payment.sendTrialReminders({ daysBeforeExpiry: 7 });
    
    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(result.results[0].status).toBe('sent');
    expect(notification.notifyOwner).toHaveBeenCalled();
  });

  it('should skip subscriptions without user email', async () => {
    vi.clearAllMocks(); // Clear mocks from previous test
    const db = await import('./db');
    const notification = await import('./_core/notification');

    const mockExpiringTrials = [
      {
        subscription: {
          id: 1,
          userId: 1,
          mollieCustomerId: 'cst_123',
          mollieSubscriptionId: null,
          mollieMandateId: null,
          plan: 'monthly' as const,
          amount: '149.00',
          currency: 'EUR',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'trial' as const,
          nextBillingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          lastPaymentDate: null,
          canceledAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: null, // No user
      },
    ];

    vi.mocked(db.getExpiringTrials).mockResolvedValue(mockExpiringTrials as any);

    const ctx = createAuthContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.payment.sendTrialReminders({ daysBeforeExpiry: 7 });
    
    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
    expect(notification.notifyOwner).not.toHaveBeenCalled();
  });
});
