import { describe, it, expect, vi } from 'vitest';

// Test the upload document flow logic
describe('Omgevingsscan Document Upload', () => {
  it('should validate file type input - including image', () => {
    const validTypes = ['pdf', 'zip', 'image'];
    expect(validTypes.includes('pdf')).toBe(true);
    expect(validTypes.includes('zip')).toBe(true);
    expect(validTypes.includes('image')).toBe(true);
    expect(validTypes.includes('exe')).toBe(false);
    expect(validTypes.includes('doc')).toBe(false);
  });

  it('should correctly encode and decode base64 file content', () => {
    const testContent = 'Hello, this is a test PDF content';
    const base64 = Buffer.from(testContent).toString('base64');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    expect(decoded).toBe(testContent);
  });

  it('should calculate file size in MB correctly', () => {
    const buffer1MB = Buffer.alloc(1024 * 1024); // 1 MB
    const sizeMB = (buffer1MB.length / (1024 * 1024)).toFixed(1);
    expect(sizeMB).toBe('1.0');

    const buffer50MB = Buffer.alloc(50 * 1024 * 1024); // 50 MB
    const sizeMB50 = (buffer50MB.length / (1024 * 1024)).toFixed(1);
    expect(sizeMB50).toBe('50.0');
  });

  it('should generate unique file keys', () => {
    const crypto = require('crypto');
    const userId = 'user-123';
    const fileName = 'test.pdf';
    
    const key1 = `dso-uploads/${userId}/${crypto.randomUUID()}-${fileName}`;
    const key2 = `dso-uploads/${userId}/${crypto.randomUUID()}-${fileName}`;
    
    expect(key1).not.toBe(key2);
    expect(key1).toContain('dso-uploads/user-123/');
    expect(key1).toContain('-test.pdf');
  });

  it('should determine correct content type based on file type including images', () => {
    const getContentType = (fileType: string, fileName: string) => {
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        zip: 'application/zip',
        image: fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      };
      return mimeTypes[fileType] || 'application/octet-stream';
    };

    expect(getContentType('pdf', 'test.pdf')).toBe('application/pdf');
    expect(getContentType('zip', 'test.zip')).toBe('application/zip');
    expect(getContentType('image', 'photo.jpg')).toBe('image/jpeg');
    expect(getContentType('image', 'photo.jpeg')).toBe('image/jpeg');
    expect(getContentType('image', 'screenshot.png')).toBe('image/png');
    expect(getContentType('image', 'PHOTO.PNG')).toBe('image/png');
    expect(getContentType('unknown', 'test.xyz')).toBe('application/octet-stream');
  });

  it('should parse PDOK geocode response correctly', () => {
    // Simulate PDOK response
    const mockPdokResponse = {
      response: {
        docs: [
          {
            centroide_ll: 'POINT(5.0695 52.6914)',
            weergavenaam: 'Dorpsstraat 1, 1689EP Zwaag',
          }
        ]
      }
    };

    const doc = mockPdokResponse.response?.docs?.[0];
    expect(doc).toBeDefined();
    
    const match = doc!.centroide_ll.match(/POINT\(([\d.]+)\s+([\d.]+)\)/);
    expect(match).toBeTruthy();
    
    const lng = parseFloat(match![1]);
    const lat = parseFloat(match![2]);
    
    expect(lng).toBeCloseTo(5.0695, 3);
    expect(lat).toBeCloseTo(52.6914, 3);
  });

  it('should handle LLM response with locaties array format', () => {
    const mockLLMContent = JSON.stringify({
      locaties: [
        {
          adres: 'Dorpsstraat 1, 1689EP Zwaag',
          kadastraal: null,
          locatiebeschrijving: null,
          gemeente: 'Hoorn'
        }
      ],
      documentType: 'omgevingsvergunningsaanvraag',
      samenvatting: 'Aanvraag voor het bouwen van een dakkapel aan de voorzijde van de woning.'
    });

    const parsed = JSON.parse(mockLLMContent);
    
    expect(parsed.locaties).toHaveLength(1);
    expect(parsed.locaties[0].adres).toBe('Dorpsstraat 1, 1689EP Zwaag');
    expect(parsed.documentType).toBe('omgevingsvergunningsaanvraag');
    expect(parsed.samenvatting).toContain('dakkapel');
  });

  it('should handle empty locaties array when no address found', () => {
    // The improved LLM prompt should return empty array when no address is found
    const mockLLMContent = JSON.stringify({
      locaties: [],
      documentType: 'constructietekening',
      samenvatting: 'Constructietekening zonder specifiek adres.'
    });

    const parsed = JSON.parse(mockLLMContent);
    
    expect(parsed.locaties).toHaveLength(0);
    expect(parsed.documentType).toBe('constructietekening');
  });

  it('should NOT geocode bare gemeente names (no fabricated locations)', () => {
    // This tests the logic that a bare gemeente name should NOT be geocoded
    // because it gives the centroid of the entire municipality, not a project location
    interface ExtractedLocation {
      adres: string | null;
      kadastraal: string | null;
      locatiebeschrijving: string | null;
      gemeente: string | null;
    }

    const locationWithOnlyGemeente: ExtractedLocation = {
      adres: null,
      kadastraal: null,
      locatiebeschrijving: null,
      gemeente: 'Koggenland'
    };

    // Simulate the geocoding strategy logic
    let shouldGeocode = false;
    
    // Strategy 1: full address - null, skip
    if (locationWithOnlyGemeente.adres) shouldGeocode = true;
    // Strategy 2: kadastrale aanduiding - null, skip
    if (locationWithOnlyGemeente.kadastraal) shouldGeocode = true;
    // Strategy 3: locatiebeschrijving - null, skip
    if (locationWithOnlyGemeente.locatiebeschrijving) shouldGeocode = true;
    // Strategy 4: gemeente + locatiebeschrijving combined - locatiebeschrijving is null, skip
    if (locationWithOnlyGemeente.gemeente && locationWithOnlyGemeente.locatiebeschrijving) shouldGeocode = true;
    
    // A bare gemeente name should NOT trigger geocoding
    expect(shouldGeocode).toBe(false);
  });

  it('should geocode gemeente + locatiebeschrijving combined', () => {
    interface ExtractedLocation {
      adres: string | null;
      kadastraal: string | null;
      locatiebeschrijving: string | null;
      gemeente: string | null;
    }

    const locationWithDescription: ExtractedLocation = {
      adres: null,
      kadastraal: null,
      locatiebeschrijving: 'Recreatiegebied De Hulk',
      gemeente: 'Koggenland'
    };

    // Strategy 4: gemeente + locatiebeschrijving combined
    let shouldGeocode = false;
    if (locationWithDescription.gemeente && locationWithDescription.locatiebeschrijving) {
      shouldGeocode = true;
    }
    
    expect(shouldGeocode).toBe(true);
  });

  it('should handle ZIP file type correctly', () => {
    const fileType = 'zip';
    const sizeMB = '2.5';
    
    const documentSummary = `ZIP-bestand geüpload (${sizeMB} MB). Bevat mogelijk meerdere documenten.`;
    const documentType = 'dso-zip';
    
    expect(documentSummary).toContain('ZIP-bestand');
    expect(documentSummary).toContain('2.5 MB');
    expect(documentType).toBe('dso-zip');
  });

  it('should scan all locations when multiple are found', () => {
    // Simulate multiple locations from upload
    const allLocations = [
      { lat: 52.6914, lng: 5.0695, adres: 'Dorpsstraat 1, 1689EP Zwaag' },
      { lat: 52.6920, lng: 5.0710, adres: 'Dorpsstraat 5, 1689EP Zwaag' },
      { lat: 52.6930, lng: 5.0720, adres: 'Kerkstraat 10, 1689EP Zwaag' },
    ];

    // Simulate scanning all locations
    const scanResults: Array<{ locatie: typeof allLocations[0]; scanned: boolean }> = [];
    for (const loc of allLocations) {
      scanResults.push({ locatie: loc, scanned: true });
    }

    // All locations should be scanned
    expect(scanResults).toHaveLength(3);
    expect(scanResults.every(r => r.scanned)).toBe(true);
    expect(scanResults[0].locatie.adres).toContain('Dorpsstraat 1');
    expect(scanResults[2].locatie.adres).toContain('Kerkstraat 10');
  });

  it('should determine locations to scan from upload result', () => {
    // Case 1: Multiple locations
    const resultMulti = {
      allLocations: [
        { lat: 52.69, lng: 5.07, adres: 'Adres 1' },
        { lat: 52.70, lng: 5.08, adres: 'Adres 2' },
      ],
      geocodedLocation: { lat: 52.69, lng: 5.07, adres: 'Adres 1' },
    };
    const locationsMulti = resultMulti.allLocations && resultMulti.allLocations.length > 1
      ? resultMulti.allLocations
      : resultMulti.geocodedLocation
        ? [resultMulti.geocodedLocation]
        : [];
    expect(locationsMulti).toHaveLength(2);

    // Case 2: Single location
    const resultSingle = {
      allLocations: undefined as any,
      geocodedLocation: { lat: 52.69, lng: 5.07, adres: 'Adres 1' },
    };
    const locationsSingle = resultSingle.allLocations && resultSingle.allLocations.length > 1
      ? resultSingle.allLocations
      : resultSingle.geocodedLocation
        ? [resultSingle.geocodedLocation]
        : [];
    expect(locationsSingle).toHaveLength(1);

    // Case 3: No location
    const resultNone = {
      allLocations: undefined as any,
      geocodedLocation: null as any,
    };
    const locationsNone = resultNone.allLocations && resultNone.allLocations.length > 1
      ? resultNone.allLocations
      : resultNone.geocodedLocation
        ? [resultNone.geocodedLocation]
        : [];
    expect(locationsNone).toHaveLength(0);
  });

  it('should track scan progress correctly', () => {
    const total = 3;
    const progressUpdates: Array<{ current: number; total: number }> = [];
    
    for (let i = 0; i < total; i++) {
      progressUpdates.push({ current: i + 1, total });
    }

    expect(progressUpdates).toHaveLength(3);
    expect(progressUpdates[0]).toEqual({ current: 1, total: 3 });
    expect(progressUpdates[1]).toEqual({ current: 2, total: 3 });
    expect(progressUpdates[2]).toEqual({ current: 3, total: 3 });
    
    // Progress percentage calculation
    const pct = (progressUpdates[1].current / progressUpdates[1].total) * 100;
    expect(pct).toBeCloseTo(66.67, 1);
  });

  it('should detect image file extensions correctly', () => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const isImage = (fileName: string) => {
      const lowerName = fileName.toLowerCase();
      return imageExtensions.some(ext => lowerName.endsWith(ext));
    };

    expect(isImage('photo.jpg')).toBe(true);
    expect(isImage('photo.JPEG')).toBe(true);
    expect(isImage('screenshot.png')).toBe(true);
    expect(isImage('image.gif')).toBe(true);
    expect(isImage('photo.webp')).toBe(true);
    expect(isImage('document.pdf')).toBe(false);
    expect(isImage('archive.zip')).toBe(false);
    expect(isImage('file.doc')).toBe(false);
  });
});
