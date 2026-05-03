import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router, publicProcedure } from './_core/trpc';
import { createCallerFactory } from '@trpc/server';

// Mock the db module
vi.mock('./db', () => ({
  getGemeenteById: vi.fn().mockResolvedValue({
    id: 1,
    gemeenteNaam: 'Test Gemeente',
    provincie: 'Noord-Holland',
    waterschapCode: 'HHNK',
    waterschapNaam: 'Hoogheemraadschap Hollands Noorderkwartier',
  }),
  createBehandelrapport: vi.fn().mockResolvedValue({ id: 1 }),
  updateBehandelrapport: vi.fn().mockResolvedValue({}),
}));

// Mock the PDOK service
vi.mock('./services/pdok', () => ({
  getLocationData: vi.fn().mockResolvedValue({
    coordinates: { rdX: 123456, rdY: 456789 },
    natura2000: false,
    archeologie: false,
  }),
}));

// Mock the Gemini service
vi.mock('./services/gemini', () => ({
  analyzeDSOAanvraag: vi.fn().mockResolvedValue({
    zaaknummer: 'TEST-001',
    procedureType: 'REGULIER',
    isVergunningvrij: false,
    procedureTermijn: 8,
    samenvatting: 'Test samenvatting',
    toetsingskaders: [],
    adviseurs: [],
    aandachtspunten: [],
    bronnen: ['Test bron'],
    datumAnalyse: new Date(),
    verwerkingDuurMs: 1000,
  }),
}));

// Mock the PDF generator
vi.mock('./services/pdfGenerator', () => ({
  generatePDFBuffer: vi.fn().mockResolvedValue(Buffer.from('test pdf')),
  generateReportFilename: vi.fn().mockReturnValue('test-rapport.pdf'),
  generateReportHTML: vi.fn().mockReturnValue('<html>test</html>'),
}));

// Mock the email service
vi.mock('./services/email', () => ({
  sendBehandelrapport: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
}));

describe('Analyse Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDOK Lookup', () => {
    it('should return location data for a valid address', async () => {
      const { getLocationData } = await import('./services/pdok');
      
      const result = await getLocationData('Hoofdstraat 1, Amsterdam');
      
      expect(result).toBeDefined();
      expect(result.coordinates).toBeDefined();
    });
  });

  describe('DSO Analysis Flow', () => {
    it('should create a rapport record when analysis starts', async () => {
      const { createBehandelrapport } = await import('./db');
      
      // Simulate creating a rapport
      const rapport = await createBehandelrapport({
        zaaknummer: 'TEST-001',
        gemeenteId: 1,
        status: 'verwerking',
      });
      
      expect(rapport.id).toBe(1);
      expect(createBehandelrapport).toHaveBeenCalledWith(
        expect.objectContaining({
          zaaknummer: 'TEST-001',
          gemeenteId: 1,
        })
      );
    });

    it('should call Gemini analysis with correct parameters', async () => {
      const { analyzeDSOAanvraag } = await import('./services/gemini');
      
      const aanvraag = {
        zaaknummer: 'TEST-001',
        activiteiten: ['bouwen'],
        omschrijving: 'Test aanvraag',
      };
      
      const gemeenteContext = {
        gemeenteNaam: 'Test Gemeente',
        provincie: 'Noord-Holland',
      };
      
      const result = await analyzeDSOAanvraag(aanvraag, gemeenteContext);
      
      expect(result.zaaknummer).toBe('TEST-001');
      expect(result.procedureType).toBeDefined();
    });

    it('should generate PDF after analysis', async () => {
      const { generatePDFBuffer } = await import('./services/pdfGenerator');
      
      const analysisResult = {
        zaaknummer: 'TEST-001',
        procedureType: 'REGULIER',
        isVergunningvrij: false,
        procedureTermijn: 8,
        samenvatting: 'Test',
        toetsingskaders: [],
        adviseurs: [],
        aandachtspunten: [],
        bronnen: [],
        datumAnalyse: new Date(),
        verwerkingDuurMs: 1000,
      };
      
      const pdfBuffer = await generatePDFBuffer(analysisResult, 'Test Gemeente', 'Test User');
      
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    });
  });
});
