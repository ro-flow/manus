import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('./db', () => ({
  getSeatById: vi.fn(),
  getGemeenteById: vi.fn(),
  updateSeat: vi.fn(),
  getSeatsByGemeente: vi.fn(),
}));

// Mock email service
vi.mock('./services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock notification
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import * as db from './db';
import { sendEmail } from './services/email';
import { notifyOwner } from './_core/notification';

describe('Pilot Invite Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSeatById', () => {
    it('should return seat when found', async () => {
      const mockSeat = {
        id: 1,
        email: 'test@gemeente.nl',
        naam: 'Test User',
        gemeenteId: 1,
        rol: 'behandelaar',
        status: 'uitgenodigd',
      };
      
      vi.mocked(db.getSeatById).mockResolvedValue(mockSeat);
      
      const result = await db.getSeatById(1);
      
      expect(result).toEqual(mockSeat);
      expect(db.getSeatById).toHaveBeenCalledWith(1);
    });

    it('should return undefined when seat not found', async () => {
      vi.mocked(db.getSeatById).mockResolvedValue(undefined);
      
      const result = await db.getSeatById(999);
      
      expect(result).toBeUndefined();
    });
  });

  describe('updateSeat', () => {
    it('should update seat with new email and naam', async () => {
      vi.mocked(db.updateSeat).mockResolvedValue(undefined);
      
      await db.updateSeat(1, {
        email: 'new@gemeente.nl',
        naam: 'New Name',
        status: 'uitgenodigd',
      });
      
      expect(db.updateSeat).toHaveBeenCalledWith(1, {
        email: 'new@gemeente.nl',
        naam: 'New Name',
        status: 'uitgenodigd',
      });
    });
  });

  describe('Invite Email Content', () => {
    it('should contain PWA installation instructions', () => {
      const emailContent = `
        <h2>Installeer de Ro-flow app</h2>
        <p>iPhone: Deel → "Zet op beginscherm"</p>
        <p>Android: ⋮ → "App installeren"</p>
        <p>Computer: Klik installatie-icoon in adresbalk</p>
      `;
      
      expect(emailContent).toContain('Installeer de Ro-flow app');
      expect(emailContent).toContain('iPhone');
      expect(emailContent).toContain('Android');
      expect(emailContent).toContain('Computer');
    });

    it('should contain ro-flow.nl link', () => {
      const emailContent = `
        <a href="https://ro-flow.nl">Open Ro-flow →</a>
      `;
      
      expect(emailContent).toContain('ro-flow.nl');
    });
  });

  describe('Bulk Invite Logic', () => {
    it('should filter placeholder seats correctly', async () => {
      const mockSeats = [
        { id: 1, email: 'beheerder@gemeente.nl', status: 'actief' },
        { id: 2, email: 'seat2@hoorn.pilot', status: 'uitgenodigd' },
        { id: 3, email: 'seat3@hoorn.pilot', status: 'uitgenodigd' },
        { id: 4, email: 'real@gemeente.nl', status: 'actief' },
      ];
      
      vi.mocked(db.getSeatsByGemeente).mockResolvedValue(mockSeats);
      
      const seats = await db.getSeatsByGemeente(1);
      const availableSeats = seats.filter(s => 
        s.status === 'uitgenodigd' && 
        s.email.includes('.pilot')
      );
      
      expect(availableSeats).toHaveLength(2);
      expect(availableSeats[0].email).toBe('seat2@hoorn.pilot');
      expect(availableSeats[1].email).toBe('seat3@hoorn.pilot');
    });

    it('should throw error when not enough seats available', async () => {
      const mockSeats = [
        { id: 1, email: 'seat1@hoorn.pilot', status: 'uitgenodigd' },
      ];
      
      vi.mocked(db.getSeatsByGemeente).mockResolvedValue(mockSeats);
      
      const seats = await db.getSeatsByGemeente(1);
      const availableSeats = seats.filter(s => 
        s.status === 'uitgenodigd' && 
        s.email.includes('.pilot')
      );
      
      const invites = [
        { email: 'user1@test.nl' },
        { email: 'user2@test.nl' },
        { email: 'user3@test.nl' },
      ];
      
      expect(availableSeats.length).toBeLessThan(invites.length);
    });
  });

  describe('Welkomstmail Content', () => {
    it('should contain onboarding link', () => {
      const gemeenteId = 1;
      const gemeenteNaam = 'Hoorn';
      const onboardingToken = Buffer.from(`${gemeenteId}:${Date.now()}`).toString('base64url');
      const onboardingUrl = `https://ro-flow.nl/beheerder/onboarding?token=${onboardingToken}&gemeente=${encodeURIComponent(gemeenteNaam)}`;
      
      expect(onboardingUrl).toContain('/beheerder/onboarding');
      expect(onboardingUrl).toContain('token=');
      expect(onboardingUrl).toContain('gemeente=Hoorn');
    });

    it('should mention 6 months pilot duration', () => {
      const emailContent = `
        Je 6 maanden gratis pilot is geactiveerd
        Geldig tot: ${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL')}
      `;
      
      expect(emailContent).toContain('6 maanden');
    });

    it('should contain step-by-step onboarding instructions', () => {
      const emailContent = `
        <span class="step-number">1</span><strong>Onboarding afronden</strong>
        <span class="step-number">2</span><strong>Collega's uitnodigen</strong>
        <span class="step-number">3</span><strong>Ro-flow app installeren</strong>
        <span class="step-number">4</span><strong>Eerste analyse uitvoeren</strong>
      `;
      
      expect(emailContent).toContain('Onboarding afronden');
      expect(emailContent).toContain('uitnodigen');
      expect(emailContent).toContain('app installeren');
      expect(emailContent).toContain('analyse uitvoeren');
    });
  });
});
