import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db functions
vi.mock('./db', () => ({
  getPilotGemeenten: vi.fn(),
  getPilotStats: vi.fn(),
  getPilotDetails: vi.fn(),
  extendPilotTrial: vi.fn(),
  deactivatePilot: vi.fn(),
  getGemeenteById: vi.fn(),
}));

// Mock notification
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import * as db from './db';

describe('Pilot Admin Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPilotGemeenten', () => {
    it('should return list of pilot gemeenten with seat info', async () => {
      const mockGemeenten = [
        {
          id: 1,
          gemeenteNaam: 'Amsterdam',
          provincie: 'Noord-Holland',
          status: 'actief',
          seatsGekocht: 5,
          totalSeats: 5,
          activeSeats: 3,
          trialEndsAt: new Date('2026-08-01'),
          isPilot: true,
        },
        {
          id: 2,
          gemeenteNaam: 'Rotterdam',
          provincie: 'Zuid-Holland',
          status: 'actief',
          seatsGekocht: 3,
          totalSeats: 3,
          activeSeats: 2,
          trialEndsAt: new Date('2026-07-15'),
          isPilot: true,
        },
      ];

      vi.mocked(db.getPilotGemeenten).mockResolvedValue(mockGemeenten);

      const result = await db.getPilotGemeenten();

      expect(result).toHaveLength(2);
      expect(result[0].gemeenteNaam).toBe('Amsterdam');
      expect(result[0].isPilot).toBe(true);
      expect(result[1].totalSeats).toBe(3);
    });

    it('should return empty array when no pilots exist', async () => {
      vi.mocked(db.getPilotGemeenten).mockResolvedValue([]);

      const result = await db.getPilotGemeenten();

      expect(result).toHaveLength(0);
    });
  });

  describe('getPilotStats', () => {
    it('should return correct pilot statistics', async () => {
      const mockStats = {
        totalPilots: 5,
        activePilots: 4,
        expiredPilots: 1,
        totalSeats: 25,
        expiringThisWeek: 1,
      };

      vi.mocked(db.getPilotStats).mockResolvedValue(mockStats);

      const result = await db.getPilotStats();

      expect(result.totalPilots).toBe(5);
      expect(result.activePilots).toBe(4);
      expect(result.expiredPilots).toBe(1);
      expect(result.totalSeats).toBe(25);
      expect(result.expiringThisWeek).toBe(1);
    });
  });

  describe('getPilotDetails', () => {
    it('should return detailed pilot info for a gemeente', async () => {
      const mockDetails = {
        gemeente: {
          id: 1,
          gemeenteNaam: 'Amsterdam',
          provincie: 'Noord-Holland',
          contactBeheerder: 'test@amsterdam.nl',
        },
        seats: [
          { id: 1, email: 'user1@amsterdam.nl', status: 'actief' },
          { id: 2, email: 'user2@amsterdam.nl', status: 'uitgenodigd' },
        ],
        totalSeats: 2,
        activeSeats: 1,
        trialEndsAt: new Date('2026-08-01'),
      };

      vi.mocked(db.getPilotDetails).mockResolvedValue(mockDetails);

      const result = await db.getPilotDetails(1);

      expect(result).not.toBeNull();
      expect(result?.gemeente.gemeenteNaam).toBe('Amsterdam');
      expect(result?.seats).toHaveLength(2);
      expect(result?.activeSeats).toBe(1);
    });

    it('should return null for non-existent gemeente', async () => {
      vi.mocked(db.getPilotDetails).mockResolvedValue(null);

      const result = await db.getPilotDetails(999);

      expect(result).toBeNull();
    });
  });

  describe('extendPilotTrial', () => {
    it('should extend trial for all seats in gemeente', async () => {
      vi.mocked(db.extendPilotTrial).mockResolvedValue({ extended: 5 });

      const result = await db.extendPilotTrial(1, 30);

      expect(result.extended).toBe(5);
      expect(db.extendPilotTrial).toHaveBeenCalledWith(1, 30);
    });

    it('should handle gemeente with no seats', async () => {
      vi.mocked(db.extendPilotTrial).mockResolvedValue({ extended: 0 });

      const result = await db.extendPilotTrial(1, 30);

      expect(result.extended).toBe(0);
    });
  });

  describe('deactivatePilot', () => {
    it('should deactivate all seats and gemeente', async () => {
      vi.mocked(db.deactivatePilot).mockResolvedValue({ success: true });

      const result = await db.deactivatePilot(1);

      expect(result.success).toBe(true);
      expect(db.deactivatePilot).toHaveBeenCalledWith(1);
    });
  });
});
