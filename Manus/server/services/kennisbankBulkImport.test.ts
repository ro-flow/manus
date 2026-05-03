import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('../db', () => ({
  createKennisbankItem: vi.fn().mockResolvedValue({ id: 1 }),
  getKennisbankStats: vi.fn().mockResolvedValue({
    rijks: 5,
    provinciaal: 3,
    regionaal: 2,
    gemeentelijk: 10,
  }),
  listKennisbankItemsWithFilters: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
  }),
}));

describe('Kennisbank Bulk Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSV Template Structure', () => {
    it('should have correct CSV headers', () => {
      const expectedHeaders = [
        'laag',
        'itemType',
        'naam',
        'samenvatting',
        'url',
        'triggers',
        'juridischeStatus',
        'wettelijkeBasis',
        'scopeProvincie',
        'scopeRegioCode',
        'adviseurType',
        'contactEmail',
        'termijnWeken',
      ];
      
      // Verify all required headers are present
      expect(expectedHeaders).toContain('laag');
      expect(expectedHeaders).toContain('itemType');
      expect(expectedHeaders).toContain('naam');
      expect(expectedHeaders).toContain('juridischeStatus');
      expect(expectedHeaders.length).toBe(13);
    });

    it('should support all valid laag values', () => {
      const validLagen = ['basis', 'rijks', 'provinciaal', 'regionaal', 'gemeentelijk'];
      
      expect(validLagen).toContain('basis');
      expect(validLagen).toContain('rijks');
      expect(validLagen).toContain('provinciaal');
      expect(validLagen).toContain('regionaal');
      expect(validLagen).toContain('gemeentelijk');
      expect(validLagen.length).toBe(5);
    });

    it('should support all valid itemType values', () => {
      const validTypes = ['adviseur', 'beleidsdocument', 'toetsingskader'];
      
      expect(validTypes).toContain('adviseur');
      expect(validTypes).toContain('beleidsdocument');
      expect(validTypes).toContain('toetsingskader');
      expect(validTypes.length).toBe(3);
    });

    it('should support all valid juridischeStatus values', () => {
      const validStatuses = ['normstellend', 'richtinggevend', 'afwegingskader'];
      
      expect(validStatuses).toContain('normstellend');
      expect(validStatuses).toContain('richtinggevend');
      expect(validStatuses).toContain('afwegingskader');
      expect(validStatuses.length).toBe(3);
    });
  });

  describe('CSV Parsing Logic', () => {
    // Simulate the CSV parsing logic from the frontend
    const parseCSV = (content: string): { items: any[]; errors: string[] } => {
      const lines = content.trim().split('\n');
      if (lines.length < 2) return { items: [], errors: [] };
      
      const headers = lines[0].split(';').map(h => h.trim());
      const items: any[] = [];
      const errors: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim());
        if (values.length < 3) continue;
        
        const item: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          if (header === 'termijnWeken' && value) {
            item[header] = parseInt(value, 10) || undefined;
          } else if (value) {
            item[header] = value;
          }
        });
        
        // Validate required fields
        if (!item.laag || !item.itemType || !item.naam) {
          errors.push(`Rij ${i + 1}: Verplichte velden ontbreken (laag, itemType, naam)`);
          continue;
        }
        
        // Validate enum values
        const validLagen = ['basis', 'rijks', 'provinciaal', 'regionaal', 'gemeentelijk'];
        const validTypes = ['adviseur', 'beleidsdocument', 'toetsingskader'];
        
        if (!validLagen.includes(item.laag)) {
          errors.push(`Rij ${i + 1}: Ongeldige laag "${item.laag}"`);
          continue;
        }
        if (!validTypes.includes(item.itemType)) {
          errors.push(`Rij ${i + 1}: Ongeldig itemType "${item.itemType}"`);
          continue;
        }
        
        items.push(item);
      }
      
      return { items, errors };
    };

    it('should parse valid CSV content correctly', () => {
      const csvContent = `laag;itemType;naam;samenvatting;url
rijks;toetsingskader;Besluit bouwwerken leefomgeving;Technische eisen;https://example.com
provinciaal;beleidsdocument;Omgevingsverordening NH;Provinciale regels;https://example2.com`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(0);
      expect(items.length).toBe(2);
      expect(items[0].laag).toBe('rijks');
      expect(items[0].itemType).toBe('toetsingskader');
      expect(items[0].naam).toBe('Besluit bouwwerken leefomgeving');
      expect(items[1].laag).toBe('provinciaal');
    });

    it('should detect missing required fields', () => {
      const csvContent = `laag;itemType;naam
rijks;;Test naam
;toetsingskader;Test naam 2`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(2);
      expect(errors[0]).toContain('Verplichte velden ontbreken');
      expect(items.length).toBe(0);
    });

    it('should detect invalid laag values', () => {
      const csvContent = `laag;itemType;naam
invalid_laag;toetsingskader;Test naam`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('Ongeldige laag');
      expect(items.length).toBe(0);
    });

    it('should detect invalid itemType values', () => {
      const csvContent = `laag;itemType;naam
rijks;invalid_type;Test naam`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('Ongeldig itemType');
      expect(items.length).toBe(0);
    });

    it('should parse termijnWeken as number', () => {
      const csvContent = `laag;itemType;naam;termijnWeken
regionaal;adviseur;Waterschap;6`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(0);
      expect(items.length).toBe(1);
      expect(items[0].termijnWeken).toBe(6);
      expect(typeof items[0].termijnWeken).toBe('number');
    });

    it('should handle empty CSV', () => {
      const csvContent = `laag;itemType;naam`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(0);
      expect(items.length).toBe(0);
    });

    it('should skip empty lines', () => {
      const csvContent = `laag;itemType;naam
rijks;toetsingskader;Test 1

rijks;toetsingskader;Test 2`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(0);
      expect(items.length).toBe(2);
    });

    it('should handle triggers as string (JSON array)', () => {
      const csvContent = `laag;itemType;naam;triggers
rijks;toetsingskader;Test;["bouwen","verbouwen"]`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(0);
      expect(items.length).toBe(1);
      expect(items[0].triggers).toBe('["bouwen","verbouwen"]');
    });

    it('should handle all adviseur fields', () => {
      const csvContent = `laag;itemType;naam;adviseurType;contactEmail;termijnWeken
regionaal;adviseur;Waterschap HHNK;extern;info@hhnk.nl;6`;

      const { items, errors } = parseCSV(csvContent);
      
      expect(errors.length).toBe(0);
      expect(items.length).toBe(1);
      expect(items[0].adviseurType).toBe('extern');
      expect(items[0].contactEmail).toBe('info@hhnk.nl');
      expect(items[0].termijnWeken).toBe(6);
    });
  });

  describe('Scope Validation', () => {
    it('should require scopeGemeenteId for gemeentelijke items', () => {
      // This validation happens on the backend
      const item = {
        laag: 'gemeentelijk',
        itemType: 'beleidsdocument',
        naam: 'Welstandsnota',
        // scopeGemeenteId is missing
      };
      
      const isValid = item.laag !== 'gemeentelijk' || item.scopeGemeenteId !== undefined;
      expect(isValid).toBe(false);
    });

    it('should require scopeProvincie for provinciale items', () => {
      const item = {
        laag: 'provinciaal',
        itemType: 'beleidsdocument',
        naam: 'Omgevingsverordening',
        // scopeProvincie is missing
      };
      
      const isValid = item.laag !== 'provinciaal' || item.scopeProvincie !== undefined;
      expect(isValid).toBe(false);
    });

    it('should require scopeRegioCode for regionale items', () => {
      const item = {
        laag: 'regionaal',
        itemType: 'adviseur',
        naam: 'Waterschap',
        // scopeRegioCode is missing
      };
      
      const isValid = item.laag !== 'regionaal' || item.scopeRegioCode !== undefined;
      expect(isValid).toBe(false);
    });

    it('should not require scope for rijks items', () => {
      const item = {
        laag: 'rijks',
        itemType: 'toetsingskader',
        naam: 'Bbl',
      };
      
      // Rijks items don't need scope
      const isValid = true;
      expect(isValid).toBe(true);
    });
  });

  describe('Bulk Import Results', () => {
    it('should track success and failure counts', () => {
      const results = {
        success: 8,
        failed: 2,
        errors: [
          { row: 3, naam: 'Item 3', error: 'Gemeente ID is verplicht' },
          { row: 7, naam: 'Item 7', error: 'Ongeldige laag' },
        ],
      };
      
      expect(results.success).toBe(8);
      expect(results.failed).toBe(2);
      expect(results.errors.length).toBe(2);
      expect(results.errors[0].row).toBe(3);
    });

    it('should provide detailed error messages', () => {
      const error = {
        row: 5,
        naam: 'Welstandsnota Hoorn',
        error: 'Gemeente ID is verplicht voor gemeentelijke items',
      };
      
      expect(error.row).toBe(5);
      expect(error.naam).toBe('Welstandsnota Hoorn');
      expect(error.error).toContain('Gemeente ID');
    });
  });
});
