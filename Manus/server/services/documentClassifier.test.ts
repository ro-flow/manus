import { describe, it, expect } from 'vitest';
import { classificeerDocument, ClassificatieInput } from './documentClassifier';

describe('Document Classifier', () => {
  it('should classify a welstandsnota document correctly', async () => {
    const input: ClassificatieInput = {
      documentNaam: 'Welstandsnota gemeente Hoorn 2024',
      gemeenteNaam: 'Hoorn',
      provincieNaam: 'Noord-Holland',
    };
    
    const result = await classificeerDocument(input);
    
    expect(result).toBeDefined();
    expect(result.laag).toBeDefined();
    expect(result.documentType).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.relevantieTags).toBeInstanceOf(Array);
    expect(result.samenvatting).toBeDefined();
  }, 30000); // 30 seconden timeout voor AI call

  it('should classify a parkeerbeleid document correctly', async () => {
    const input: ClassificatieInput = {
      documentNaam: 'Parkeernormen en parkeerbeleid gemeente Amsterdam',
      gemeenteNaam: 'Amsterdam',
      provincieNaam: 'Noord-Holland',
    };
    
    const result = await classificeerDocument(input);
    
    expect(result).toBeDefined();
    expect(result.documentType).toBe('parkeerbeleid');
    expect(result.laag).toBe('gemeentelijk');
  }, 30000);

  it('should classify a provincial document correctly', async () => {
    const input: ClassificatieInput = {
      documentNaam: 'Provinciale Omgevingsvisie Noord-Holland 2050',
      provincieNaam: 'Noord-Holland',
    };
    
    const result = await classificeerDocument(input);
    
    expect(result).toBeDefined();
    expect(result.laag).toBe('provinciaal');
  }, 30000);

  it('should use fallback when document name is unclear', async () => {
    const input: ClassificatieInput = {
      documentNaam: 'Onbekend document zonder duidelijke keywords',
    };
    
    const result = await classificeerDocument(input);
    
    expect(result).toBeDefined();
    // Fallback geeft altijd een resultaat
    expect(result.laag).toBeDefined();
    expect(result.documentType).toBeDefined();
  }, 30000);

  it('should include motivering for classification choices', async () => {
    const input: ClassificatieInput = {
      documentNaam: 'Erfgoedverordening gemeente Utrecht',
      gemeenteNaam: 'Utrecht',
    };
    
    const result = await classificeerDocument(input);
    
    expect(result.laagMotivering).toBeDefined();
    expect(result.laagMotivering.length).toBeGreaterThan(0);
    expect(result.typeMotivering).toBeDefined();
    expect(result.typeMotivering.length).toBeGreaterThan(0);
  }, 30000);
});
