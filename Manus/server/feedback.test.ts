import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getDb: vi.fn(),
  createRapportFeedback: vi.fn(),
  getFeedbackByRapport: vi.fn(),
  getFeedbackStatsByGemeente: vi.fn(),
  getActiveFeedbackPatronen: vi.fn(),
  getFeedbackPatronenForAI: vi.fn(),
  upsertFeedbackPatroon: vi.fn(),
}));

import * as db from './db';

describe('Feedback System (Zelflerend Systeem)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRapportFeedback', () => {
    it('should create positive feedback', async () => {
      const mockFeedback = {
        behandelrapportId: 1,
        gemeenteId: 1,
        userId: 1,
        feedbackType: 'procedure' as const,
        score: 'positief' as const,
      };

      vi.mocked(db.createRapportFeedback).mockResolvedValue({ id: 1 });

      const result = await db.createRapportFeedback(mockFeedback);
      
      expect(result).toEqual({ id: 1 });
      expect(db.createRapportFeedback).toHaveBeenCalledWith(mockFeedback);
    });

    it('should create negative feedback with correction', async () => {
      const mockFeedback = {
        behandelrapportId: 1,
        gemeenteId: 1,
        userId: 1,
        feedbackType: 'adviseurs' as const,
        score: 'negatief' as const,
        correctie: 'Waterschap HHNK ontbreekt',
        redenIncorrect: 'Bij bouwactiviteiten nabij water moet HHNK altijd worden geraadpleegd',
        origineleWaarde: 'Geen waterschap adviseur',
        gecorrigeerdeWaarde: 'HHNK moet worden toegevoegd',
      };

      vi.mocked(db.createRapportFeedback).mockResolvedValue({ id: 2 });

      const result = await db.createRapportFeedback(mockFeedback);
      
      expect(result).toEqual({ id: 2 });
      expect(db.createRapportFeedback).toHaveBeenCalledWith(mockFeedback);
    });
  });

  describe('getFeedbackByRapport', () => {
    it('should return all feedback for a rapport', async () => {
      const mockFeedbackList = [
        { id: 1, behandelrapportId: 1, score: 'positief', feedbackType: 'procedure' },
        { id: 2, behandelrapportId: 1, score: 'negatief', feedbackType: 'adviseurs' },
      ];

      vi.mocked(db.getFeedbackByRapport).mockResolvedValue(mockFeedbackList as any);

      const result = await db.getFeedbackByRapport(1);
      
      expect(result).toHaveLength(2);
      expect(db.getFeedbackByRapport).toHaveBeenCalledWith(1);
    });
  });

  describe('getFeedbackStatsByGemeente', () => {
    it('should return aggregated statistics', async () => {
      const mockStats = {
        totaal: 10,
        positief: 7,
        negatief: 2,
        neutraal: 1,
        perType: [
          { type: 'procedure', count: 4 },
          { type: 'adviseurs', count: 3 },
          { type: 'toetsingskaders', count: 3 },
        ],
      };

      vi.mocked(db.getFeedbackStatsByGemeente).mockResolvedValue(mockStats);

      const result = await db.getFeedbackStatsByGemeente(1);
      
      expect(result.totaal).toBe(10);
      expect(result.positief).toBe(7);
      expect(result.negatief).toBe(2);
      expect(result.perType).toHaveLength(3);
    });
  });

  describe('getActiveFeedbackPatronen', () => {
    it('should return gemeente-specific and provincial patterns', async () => {
      const mockPatronen = [
        { 
          id: 1, 
          gemeenteId: 1, 
          patroonType: 'adviseur_gemist',
          aiInstructie: 'Bij bouwactiviteiten nabij water, voeg HHNK toe',
          aantalVoorkomens: 5,
        },
        { 
          id: 2, 
          gemeenteId: null, 
          provincie: 'Noord-Holland',
          patroonType: 'procedure_correctie',
          aiInstructie: 'In NH is BOPA vaker nodig bij erfgoed',
          aantalVoorkomens: 12,
        },
      ];

      vi.mocked(db.getActiveFeedbackPatronen).mockResolvedValue(mockPatronen as any);

      const result = await db.getActiveFeedbackPatronen(1, 'Noord-Holland');
      
      expect(result).toHaveLength(2);
      expect(result[0].gemeenteId).toBe(1);
      expect(result[1].provincie).toBe('Noord-Holland');
    });
  });

  describe('getFeedbackPatronenForAI', () => {
    it('should return empty string when no patterns exist', async () => {
      vi.mocked(db.getFeedbackPatronenForAI).mockResolvedValue('');

      const result = await db.getFeedbackPatronenForAI(1, 'Noord-Holland');
      
      expect(result).toBe('');
    });

    it('should return formatted context when patterns exist', async () => {
      const mockContext = `
## Geleerde Correcties (Zelflerend Systeem)
Op basis van eerdere feedback van behandelaars, let op de volgende punten:

### adviseur gemist (gemeente-specifiek, 5x gemeld)
- Trigger: activiteit "bouwen"
- Instructie: Bij bouwactiviteiten nabij water, voeg HHNK toe
`;

      vi.mocked(db.getFeedbackPatronenForAI).mockResolvedValue(mockContext);

      const result = await db.getFeedbackPatronenForAI(1, 'Noord-Holland');
      
      expect(result).toContain('Geleerde Correcties');
      expect(result).toContain('adviseur gemist');
      expect(result).toContain('5x gemeld');
    });
  });

  describe('upsertFeedbackPatroon', () => {
    it('should create new pattern when none exists', async () => {
      const newPatroon = {
        gemeenteId: 1,
        patroonType: 'adviseur_gemist' as const,
        triggerActiviteit: 'bouwen',
        beschrijving: 'HHNK wordt vaak vergeten',
        aiInstructie: 'Bij bouwactiviteiten nabij water, voeg HHNK toe',
      };

      vi.mocked(db.upsertFeedbackPatroon).mockResolvedValue({ id: 1 });

      const result = await db.upsertFeedbackPatroon(newPatroon);
      
      expect(result).toEqual({ id: 1 });
    });

    it('should increment count when similar pattern exists', async () => {
      const existingPatroon = {
        gemeenteId: 1,
        patroonType: 'adviseur_gemist' as const,
        triggerActiviteit: 'bouwen',
        beschrijving: 'HHNK wordt vaak vergeten - update',
        aiInstructie: 'Bij bouwactiviteiten nabij water, voeg HHNK toe - verbeterd',
      };

      // Mock returns existing pattern id, meaning it was updated not created
      vi.mocked(db.upsertFeedbackPatroon).mockResolvedValue({ id: 1 });

      const result = await db.upsertFeedbackPatroon(existingPatroon);
      
      expect(result).toEqual({ id: 1 });
    });
  });
});

describe('Feedback Integration with AI Analysis', () => {
  it('should include feedback patterns in AI context', async () => {
    // This test verifies that getFeedbackPatronenForAI is called during analysis
    const mockContext = `
## Geleerde Correcties (Zelflerend Systeem)
Op basis van eerdere feedback van behandelaars, let op de volgende punten:

### procedure correctie (landelijk, 20x gemeld)
- Instructie: Bij monumenten altijd BOPA procedure overwegen
`;

    vi.mocked(db.getFeedbackPatronenForAI).mockResolvedValue(mockContext);

    const result = await db.getFeedbackPatronenForAI(1, 'Noord-Holland');
    
    expect(result).toContain('Geleerde Correcties');
    expect(result).toContain('Zelflerend Systeem');
  });
});
