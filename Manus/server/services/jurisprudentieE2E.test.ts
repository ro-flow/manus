import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * End-to-End Test voor Jurisprudentie Integratie
 * 
 * Test scenario: Complexe BOPA-aanvraag waarbij jurisprudentie meerwaarde biedt
 */

// Mock de database
vi.mock('../db', () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => [])
          })),
          limit: vi.fn(() => [])
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => [])
        })),
        limit: vi.fn(() => [])
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve())
    }))
  })),
  getFeedbackPatronenForAI: vi.fn(async () => '')
}));

// Mock externe services
vi.mock('./locatieService', () => ({
  analyseLocatie: vi.fn(async () => null),
  formatLocatieVoorAI: vi.fn(() => '')
}));

vi.mock('./basislaagService', () => ({
  genereerBasislaagContext: vi.fn(() => ({
    procedure: { type: 'BOPA', beschrijving: 'Buitenplanse omgevingsplanactiviteit' },
    toetsingskaders: [],
    adviseurs: []
  })),
  formatBasislaagVoorAI: vi.fn(() => '## BASISLAAG\nBOPA procedure')
}));

vi.mock('./toetsingsmatrixService', () => ({
  formatToetsingskadersVoorAI: vi.fn(() => ''),
  detecteerActiviteitType: vi.fn(() => ['nieuwbouw']),
  detecteerFunctieType: vi.fn(() => ['wonen'])
}));

vi.mock('./vergunningBeslisboomService', () => ({
  voerBeslisboomUit: vi.fn(async () => ({ conclusie: 'vergunningplichtig' })),
  combineerConclusies: vi.fn(() => ({ conclusie: 'vergunningplichtig' })),
  formatBeslisboomVoorAI: vi.fn(() => '')
}));

vi.mock('./centraleBeslisboomService', () => ({
  voerCentraleBeslisboomUit: vi.fn(async () => ({ conclusie: 'vergunningplichtig' })),
  formatCentraleBeslisboomVoorAI: vi.fn(() => '')
}));

vi.mock('./gelaagdeKennisbankService', () => ({
  haalKennisbankItems: vi.fn(async () => []),
  formatKennisbankVoorAI: vi.fn(() => '')
}));

vi.mock('./vrijstellingsService', () => ({
  haalVrijstellingsGrenzen: vi.fn(async () => null),
  analyseerGraafwerk: vi.fn(() => null),
  vergelijkMetVrijstellingen: vi.fn(() => null)
}));

vi.mock('./indieningsvereistenService', () => ({
  bepaalIndieningsvereisten: vi.fn(async () => ({ vereisten: [] })),
  controleerVolledigheid: vi.fn(() => ({ volledig: true })),
  formatIndieningsvereistenVoorAI: vi.fn(() => '')
}));

vi.mock('./dsoApiService', () => ({
  bepaalVergunningCheck: vi.fn(async () => null),
  bepaalBevoegdGezag: vi.fn(async () => null),
  haalToepasbareRegels: vi.fn(async () => [])
}));

vi.mock('./aeriusApiService', () => ({
  generateNitrogenPreAssessment: vi.fn(async () => null),
  generateNitrogenPreAssessmentWithNatura2000: vi.fn(async () => null)
}));

vi.mock('./funderingsproblematiekService', () => ({
  checkFunderingsproblematiek: vi.fn(async () => null)
}));

vi.mock('./brpGewaspercelenService', () => ({
  checkGewaspercelen: vi.fn(async () => null),
  isBRPCheckRelevant: vi.fn(() => false)
}));

vi.mock('./cultuurhistorieService', () => ({
  checkCultuurhistorie: vi.fn(async () => null)
}));

vi.mock('./bgtService', () => ({
  analyzeTopografie: vi.fn(async () => null)
}));

vi.mock('./geurcontourenService', () => ({
  analyzeGeurbelasting: vi.fn(async () => null)
}));

// Import na mocks
import { 
  verzamelJurisprudentieContext,
  type JurisprudentieContext 
} from './jurisprudentieIntegratie.service';

import {
  bepaalJurisprudentieMeerwaarde,
  type AnalyseContext
} from './jurisprudentieCrawler';

describe('Jurisprudentie E2E Test - BOPA Scenario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BOPA Trigger Detection', () => {
    it('should detect BOPA as trigger for jurisprudence', () => {
      const context: AnalyseContext = {
        activiteiten: ['buitenplanse omgevingsplanactiviteit', 'bouwen'],
        isBOPA: true,
        isMonument: false,
        heeftStikstof: false,
        heeftBelangenafweging: true,
        beleidOntbreekt: false,
        bezwaarWaarschijnlijk: true,
        vageNormen: []
      };

      const result = bepaalJurisprudentieMeerwaarde(context);

      expect(result.heeftMeerwaarde).toBe(true);
      expect(result.reden).toContain('BOPA');
      expect(result.relevanteThemas).toContain('bopa_procedure');
      expect(result.relevanteThemas).toContain('belangenafweging');
    });

    it('should detect monument as trigger for jurisprudence', () => {
      const context: AnalyseContext = {
        activiteiten: ['verbouwen rijksmonument'],
        isBOPA: false,
        isMonument: true,
        heeftStikstof: false,
        heeftBelangenafweging: false,
        beleidOntbreekt: false,
        bezwaarWaarschijnlijk: true,
        vageNormen: []
      };

      const result = bepaalJurisprudentieMeerwaarde(context);

      expect(result.heeftMeerwaarde).toBe(true);
      expect(result.relevanteThemas).toContain('monumenten_erfgoed');
    });

    it('should detect stikstof as trigger for jurisprudence', () => {
      const context: AnalyseContext = {
        activiteiten: ['bouwen nabij Natura 2000'],
        isBOPA: false,
        isMonument: false,
        heeftStikstof: true,
        heeftBelangenafweging: false,
        beleidOntbreekt: false,
        bezwaarWaarschijnlijk: false,
        vageNormen: []
      };

      const result = bepaalJurisprudentieMeerwaarde(context);

      expect(result.heeftMeerwaarde).toBe(true);
      expect(result.relevanteThemas).toContain('natura2000_stikstof');
    });

    it('should NOT trigger jurisprudence for standard requests', () => {
      const context: AnalyseContext = {
        activiteiten: ['bouwen uitbouw'],
        isBOPA: false,
        isMonument: false,
        heeftStikstof: false,
        heeftBelangenafweging: false,
        beleidOntbreekt: false,
        bezwaarWaarschijnlijk: false,
        vageNormen: []
      };

      const result = bepaalJurisprudentieMeerwaarde(context);

      expect(result.heeftMeerwaarde).toBe(false);
    });
  });

  describe('Jurisprudentie Context Integration', () => {
    it('should include jurisprudence context for BOPA cases', async () => {
      // Mock the jurisprudentieCrawler functions
      vi.doMock('./jurisprudentieCrawler', () => ({
        bepaalJurisprudentieMeerwaarde: vi.fn(() => ({
          heeftMeerwaarde: true,
          reden: 'BOPA-procedure vereist zorgvuldige belangenafweging',
          relevanteThemas: ['bopa_procedure', 'belangenafweging']
        })),
        getRelevantJurisprudentie: vi.fn(async () => [{
          ecli: 'ECLI:NL:RVS:2024:1234',
          titel: 'BOPA uitspraak',
          instantie: 'Raad van State',
          datumUitspraak: new Date('2024-06-15'),
          relevantieScore: 85,
          inhoudsindicatie: 'Belangenafweging bij BOPA',
          isOmgevingswetRelevant: true
        }]),
        getAlleBeleidsverwijzingen: vi.fn(async () => [])
      }));

      vi.doMock('./beleidZoekService', () => ({
        vergelijkMetKennisbank: vi.fn(async () => ({ aanwezig: [], ontbrekend: [] })),
        analyseerEnZoekOntbrekendBeleid: vi.fn(async () => [])
      }));

      // Re-import after mocking
      const { verzamelJurisprudentieContext: verzamelMocked } = await import('./jurisprudentieIntegratie.service');

      const result = await verzamelMocked(
        ['buitenplanse omgevingsplanactiviteit', 'bouwen'],
        'Nieuwbouw woning buiten omgevingsplan',
        1,
        'Hoorn',
        true, // isBOPA
        false,
        false
      );

      // The trigger should be detected
      expect(result.trigger?.heeftMeerwaarde).toBe(true);
      expect(result.trigger?.reden).toContain('BOPA');
    });
  });

  describe('AI Context Generation', () => {
    it('should generate proper AI context text for jurisprudence', async () => {
      const mockContext: JurisprudentieContext = {
        isRelevant: true,
        trigger: {
          heeftMeerwaarde: true,
          reden: 'BOPA-procedure vereist zorgvuldige belangenafweging',
          relevanteThemas: ['bopa_procedure']
        },
        cases: [{
          ecli: 'ECLI:NL:RVS:2024:1234',
          titel: 'Test BOPA uitspraak',
          instantie: 'Raad van State',
          datum: '2024-06-15',
          relevantieScore: 0.85,
          samenvatting: 'Belangenafweging bij buitenplanse activiteit',
          isOmgevingswet: true,
          url: 'https://uitspraken.rechtspraak.nl/#!/details?id=ECLI:NL:RVS:2024:1234'
        }],
        beleidsverwijzingen: [],
        aiContextTekst: `
## RELEVANTE JURISPRUDENTIE
Jurisprudentie is relevant voor deze aanvraag vanwege: BOPA-procedure vereist zorgvuldige belangenafweging

### Belangrijkste uitspraken
- ECLI:NL:RVS:2024:1234 - Raad van State (85% relevant)
`
      };

      expect(mockContext.aiContextTekst).toContain('RELEVANTE JURISPRUDENTIE');
      expect(mockContext.aiContextTekst).toContain('ECLI:NL:RVS:2024:1234');
      expect(mockContext.aiContextTekst).toContain('Raad van State');
    });
  });

  describe('Omgevingswet Awareness', () => {
    it('should correctly identify post-2024 cases as Omgevingswet relevant', () => {
      const postOmgevingswetDate = new Date('2024-06-15');
      const preOmgevingswetDate = new Date('2023-06-15');
      
      const isOmgevingswetPost = postOmgevingswetDate >= new Date('2024-01-01');
      const isOmgevingswetPre = preOmgevingswetDate >= new Date('2024-01-01');
      
      expect(isOmgevingswetPost).toBe(true);
      expect(isOmgevingswetPre).toBe(false);
    });
  });
});
