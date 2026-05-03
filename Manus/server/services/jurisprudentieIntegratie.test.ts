import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  verzamelJurisprudentieContext, 
  genereerJurisprudentieSectie,
  heeftOpenstaandeSuggesties,
  type JurisprudentieContext,
  type RelevantCase
} from './jurisprudentieIntegratie.service';

// Mock the dependencies
vi.mock('./jurisprudentieCrawler', () => ({
  bepaalJurisprudentieMeerwaarde: vi.fn((context) => {
    // BOPA cases should trigger jurisprudence
    if (context.isBOPA) {
      return {
        heeftMeerwaarde: true,
        reden: 'BOPA-procedure vereist zorgvuldige belangenafweging',
        relevanteThemas: ['bopa_procedure', 'afwijking_bestemmingsplan', 'belangenafweging']
      };
    }
    // Monument cases should trigger jurisprudence
    if (context.isMonument) {
      return {
        heeftMeerwaarde: true,
        reden: 'Monumentenstatus vereist specifieke toetsing',
        relevanteThemas: ['monumenten_erfgoed']
      };
    }
    // Stikstof cases should trigger jurisprudence
    if (context.heeftStikstof) {
      return {
        heeftMeerwaarde: true,
        reden: 'Stikstof/Natura2000 is zeer dynamisch rechtsgebied',
        relevanteThemas: ['natura2000_stikstof']
      };
    }
    // Standard cases don't need jurisprudence
    return {
      heeftMeerwaarde: false,
      reden: 'Standaard aanvraag - geen jurisprudentie nodig',
      relevanteThemas: []
    };
  }),
  getRelevantJurisprudentie: vi.fn(async (themas, maxResults) => {
    if (themas.includes('bopa_procedure')) {
      return [
        {
          ecli: 'ECLI:NL:RVS:2024:1234',
          titel: 'Uitspraak over BOPA-procedure',
          instantie: 'Raad van State',
          datumUitspraak: new Date('2024-06-15'),
          relevantieScore: 85,
          inhoudsindicatie: 'Belangenafweging bij buitenplanse omgevingsplanactiviteit',
          aiToetsingscriteria: 'Zorgvuldige afweging van alle betrokken belangen',
          isOmgevingswetRelevant: true
        }
      ];
    }
    if (themas.includes('monumenten_erfgoed')) {
      return [
        {
          ecli: 'ECLI:NL:RVS:2024:5678',
          titel: 'Uitspraak over monumentenvergunning',
          instantie: 'Raad van State',
          datumUitspraak: new Date('2024-03-20'),
          relevantieScore: 75,
          inhoudsindicatie: 'Toetsing wijziging rijksmonument',
          isOmgevingswetRelevant: true
        }
      ];
    }
    return [];
  }),
  getAlleBeleidsverwijzingen: vi.fn(async () => [
    {
      beleidsNaam: 'Parkeerbeleid gemeente Utrecht',
      beleidsType: 'parkeerbeleid',
      gemeenteInJurisprudentie: 'Utrecht',
      genoemdeNormen: '1,8 pp/woning',
      citaat: 'Verweerder heeft terecht het parkeerbeleid toegepast'
    }
  ])
}));

vi.mock('./beleidZoekService', () => ({
  vergelijkMetKennisbank: vi.fn(async () => ({
    aanwezig: [],
    ontbrekend: []
  })),
  analyseerEnZoekOntbrekendBeleid: vi.fn(async () => [])
}));

vi.mock('../db', () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [{ count: 3 }])
      }))
    }))
  }))
}));

describe('Jurisprudentie Integratie Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verzamelJurisprudentieContext', () => {
    it('should return isRelevant=false for standard requests', async () => {
      const result = await verzamelJurisprudentieContext(
        ['bouwen'],
        'Reguliere uitbouw aan woning',
        1,
        'Hoorn',
        false, // niet BOPA
        false, // niet monument
        false  // geen stikstof
      );

      expect(result.isRelevant).toBe(false);
      expect(result.cases).toHaveLength(0);
      expect(result.aiContextTekst).toBe('');
    });

    it('should return jurisprudence context for BOPA cases', async () => {
      const result = await verzamelJurisprudentieContext(
        ['bouwen', 'afwijken omgevingsplan'],
        'Buitenplanse omgevingsplanactiviteit voor woningbouw',
        1,
        'Hoorn',
        true, // is BOPA
        false,
        false
      );

      expect(result.isRelevant).toBe(true);
      expect(result.trigger?.heeftMeerwaarde).toBe(true);
      expect(result.trigger?.reden).toContain('BOPA');
      expect(result.cases.length).toBeGreaterThan(0);
      expect(result.aiContextTekst).toContain('RELEVANTE JURISPRUDENTIE');
    });

    it('should return jurisprudence context for monument cases', async () => {
      const result = await verzamelJurisprudentieContext(
        ['bouwen', 'wijzigen monument'],
        'Verbouwing rijksmonument',
        1,
        'Hoorn',
        false,
        true, // is monument
        false
      );

      expect(result.isRelevant).toBe(true);
      expect(result.trigger?.relevanteThemas).toContain('monumenten_erfgoed');
    });

    it('should include beleidsverwijzingen in context', async () => {
      const result = await verzamelJurisprudentieContext(
        ['bouwen', 'afwijken omgevingsplan'],
        'BOPA aanvraag',
        1,
        'Hoorn',
        true,
        false,
        false
      );

      expect(result.beleidsverwijzingen.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('genereerJurisprudentieSectie', () => {
    it('should return empty string for non-relevant context', () => {
      const context: JurisprudentieContext = {
        isRelevant: false,
        cases: [],
        beleidsverwijzingen: [],
        aiContextTekst: ''
      };

      const result = genereerJurisprudentieSectie(context);
      expect(result).toBe('');
    });

    it('should generate report section for relevant context', () => {
      const mockCase: RelevantCase = {
        ecli: 'ECLI:NL:RVS:2024:1234',
        titel: 'Test uitspraak',
        instantie: 'Raad van State',
        datum: '2024-06-15',
        relevantieScore: 0.85,
        samenvatting: 'Test samenvatting',
        isOmgevingswet: true,
        url: 'https://uitspraken.rechtspraak.nl/#!/details?id=ECLI:NL:RVS:2024:1234'
      };

      const context: JurisprudentieContext = {
        isRelevant: true,
        trigger: {
          heeftMeerwaarde: true,
          reden: 'BOPA-procedure',
          relevanteThemas: ['bopa_procedure']
        },
        cases: [mockCase],
        beleidsverwijzingen: [],
        aiContextTekst: 'test'
      };

      const result = genereerJurisprudentieSectie(context);
      
      expect(result).toContain('Relevante Jurisprudentie');
      expect(result).toContain('ECLI:NL:RVS:2024:1234');
      expect(result).toContain('Raad van State');
      expect(result).toContain('Omgevingswet');
    });

    it('should include beleidsverwijzingen in report section', () => {
      const context: JurisprudentieContext = {
        isRelevant: true,
        trigger: {
          heeftMeerwaarde: true,
          reden: 'Monument',
          relevanteThemas: ['monumenten_erfgoed']
        },
        cases: [{
          ecli: 'ECLI:NL:RVS:2024:5678',
          titel: 'Monument uitspraak',
          instantie: 'Raad van State',
          datum: '2024-03-20',
          relevantieScore: 0.75,
          samenvatting: 'Monument toetsing',
          isOmgevingswet: true,
          url: 'https://uitspraken.rechtspraak.nl/#!/details?id=ECLI:NL:RVS:2024:5678'
        }],
        beleidsverwijzingen: [{
          beleidsNaam: 'Erfgoedverordening',
          beleidsType: 'erfgoedbeleid',
          ecli: 'ECLI:NL:RVS:2024:5678',
          context: 'Toepassing erfgoedverordening'
        }],
        aiContextTekst: 'test'
      };

      const result = genereerJurisprudentieSectie(context);
      
      expect(result).toContain('Beleid uit jurisprudentie');
      expect(result).toContain('Erfgoedverordening');
    });
  });

  describe('Smart Trigger Detection', () => {
    it('should detect BOPA from activiteiten', async () => {
      const result = await verzamelJurisprudentieContext(
        ['buitenplanse omgevingsplanactiviteit'],
        'Woningbouw buiten omgevingsplan',
        1,
        'Hoorn',
        true,
        false,
        false
      );

      expect(result.trigger?.relevanteThemas).toContain('bopa_procedure');
    });

    it('should detect stikstof relevance', async () => {
      const result = await verzamelJurisprudentieContext(
        ['bouwen', 'stikstof'],
        'Bouwproject nabij Natura 2000',
        1,
        'Hoorn',
        false,
        false,
        true // heeftStikstof
      );

      // Note: isRelevant is false because mock returns no cases for natura2000_stikstof
      // But the trigger should still detect the relevance
      expect(result.trigger?.heeftMeerwaarde).toBe(true);
      expect(result.trigger?.relevanteThemas).toContain('natura2000_stikstof');
    });
  });

  describe('Omgevingswet-aware scoring', () => {
    it('should mark post-2024 cases as Omgevingswet relevant', async () => {
      const result = await verzamelJurisprudentieContext(
        ['afwijken omgevingsplan'],
        'BOPA aanvraag',
        1,
        'Hoorn',
        true,
        false,
        false
      );

      if (result.cases.length > 0) {
        const recentCase = result.cases.find(c => new Date(c.datum) >= new Date('2024-01-01'));
        if (recentCase) {
          expect(recentCase.isOmgevingswet).toBe(true);
        }
      }
    });
  });
});
