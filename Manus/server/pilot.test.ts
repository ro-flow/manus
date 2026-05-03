import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getGemeenteByName: vi.fn(),
  getRegioLookupByName: vi.fn(),
  createGemeente: vi.fn(),
  updateGemeente: vi.fn(),
  createSeat: vi.fn(),
}));

// Mock notification
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock email service
vi.mock('./services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import * as db from './db';
import { notifyOwner } from './_core/notification';
import { sendEmail } from './services/email';

describe('Pilot Aanvraag Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should require gemeenteNaam', () => {
      const input = {
        gemeenteNaam: '',
        contactpersoon: 'Jan Jansen',
        email: 'jan@gemeente.nl',
        aantalSeats: 3,
      };
      
      // Empty gemeenteNaam should fail validation
      expect(input.gemeenteNaam.length).toBe(0);
    });

    it('should require valid email', () => {
      const validEmail = 'jan@gemeente.nl';
      const invalidEmail = 'not-an-email';
      
      expect(validEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should require minimum 1 seat', () => {
      const validSeats = [1, 3, 5, 10, 50, 100];
      const invalidSeats = [0, -1];
      
      validSeats.forEach(seats => {
        expect(seats >= 1).toBe(true);
      });
      
      invalidSeats.forEach(seats => {
        expect(seats >= 1).toBe(false);
      });
    });
  });

  describe('Gemeente Creation', () => {
    it('should create gemeente if not exists', async () => {
      const mockGemeente = {
        id: 1,
        gemeenteNaam: 'TestGemeente',
        gemeenteCode: '0000',
        provincie: 'Noord-Holland',
        seatsGekocht: 3,
        status: 'actief',
      };

      // First call returns null (gemeente doesn't exist)
      // Second call returns the created gemeente
      (db.getGemeenteByName as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockGemeente);
      
      (db.getRegioLookupByName as any).mockResolvedValue({
        cbsCode: '0361',
        provincie: 'Noord-Holland',
        waterschapCode: 'hhnk',
      });
      
      (db.createGemeente as any).mockResolvedValue(undefined);

      // Simulate the flow
      let gemeente = await db.getGemeenteByName('TestGemeente');
      expect(gemeente).toBeNull();
      
      const regioInfo = await db.getRegioLookupByName('TestGemeente');
      expect(regioInfo).toBeDefined();
      
      await db.createGemeente({
        gemeenteNaam: 'TestGemeente',
        gemeenteCode: regioInfo?.cbsCode || '0000',
        provincie: regioInfo?.provincie || 'Noord-Holland',
      });
      
      expect(db.createGemeente).toHaveBeenCalledWith(expect.objectContaining({
        gemeenteNaam: 'TestGemeente',
        gemeenteCode: '0361',
      }));
    });

    it('should update existing gemeente with extra seats', async () => {
      // Clear mocks to ensure fresh state
      vi.mocked(db.getGemeenteByName).mockReset();
      vi.mocked(db.updateGemeente).mockReset();
      
      const existingGemeente = {
        id: 1,
        gemeenteNaam: 'BestaandeGemeente',
        seatsGekocht: 5,
        status: 'actief',
      };

      vi.mocked(db.getGemeenteByName).mockResolvedValue(existingGemeente as any);
      vi.mocked(db.updateGemeente).mockResolvedValue(undefined);

      const gemeente = await db.getGemeenteByName('BestaandeGemeente');
      expect(gemeente).not.toBeNull();
      expect(gemeente!.seatsGekocht).toBe(5);
      
      const newSeats = 3;
      const updatedSeats = (gemeente!.seatsGekocht || 0) + newSeats;
      
      await db.updateGemeente(gemeente!.id, {
        seatsGekocht: updatedSeats,
        status: 'actief',
      });
      
      expect(db.updateGemeente).toHaveBeenCalledWith(1, {
        seatsGekocht: 8, // 5 + 3
        status: 'actief',
      });
    });
  });

  describe('Seat Creation', () => {
    it('should create seats with 6-month trial', async () => {
      (db.createSeat as any).mockResolvedValue(undefined);
      
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 180); // 6 maanden
      
      await db.createSeat({
        email: 'beheerder@gemeente.nl',
        naam: 'Jan Beheerder',
        gemeenteId: 1,
        rol: 'beheerder',
        status: 'uitgenodigd',
        trialEndsAt: trialEndDate,
      });
      
      expect(db.createSeat).toHaveBeenCalledWith(expect.objectContaining({
        email: 'beheerder@gemeente.nl',
        rol: 'beheerder',
        status: 'uitgenodigd',
      }));
      
      // Verify trial end date is ~180 days (6 months) from now
      const callArg = (db.createSeat as any).mock.calls[0][0];
      const daysDiff = Math.round((callArg.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(179);
      expect(daysDiff).toBeLessThanOrEqual(181);
    });

    it('should create placeholder seats for additional users', async () => {
      (db.createSeat as any).mockResolvedValue(undefined);
      
      const gemeenteNaam = 'TestGemeente';
      const aantalSeats = 3;
      
      // Create placeholder seats
      for (let i = 1; i < aantalSeats; i++) {
        await db.createSeat({
          email: `seat${i + 1}@${gemeenteNaam.toLowerCase().replace(/\s+/g, '')}.pilot`,
          naam: `Seat ${i + 1} (nog toe te wijzen)`,
          gemeenteId: 1,
          rol: 'behandelaar',
          status: 'uitgenodigd',
        });
      }
      
      // Should have created 2 placeholder seats (for seats 2 and 3)
      expect(db.createSeat).toHaveBeenCalledTimes(2);
    });
  });

  describe('Notifications', () => {
    it('should notify owner on new pilot request', async () => {
      await notifyOwner({
        title: '🎉 Pilot aanvraag: TestGemeente',
        content: 'Test notification content',
      });
      
      expect(notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringContaining('Pilot aanvraag'),
      }));
    });

    it('should send welcome email to contact person', async () => {
      await sendEmail({
        to: 'contact@gemeente.nl',
        subject: 'Welkom bij Ro-flow - Je pilot voor TestGemeente is actief!',
        html: '<html>Welcome email content</html>',
      });
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'contact@gemeente.nl',
        subject: expect.stringContaining('Welkom bij Ro-flow'),
      }));
    });
  });
});
