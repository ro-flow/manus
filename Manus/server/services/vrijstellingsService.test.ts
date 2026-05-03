import { describe, it, expect, vi } from 'vitest';
import { 
  analyseerGraafwerk, 
  vergelijkMetVrijstellingen, 
  bepaalGraafwerkConsequenties,
  VERWACHTE_GRAAFDIEPTE_RANGES,
  type FormulierGraafgegevens,
  type GraafwerkAnalyse,
  type VrijstellingsGrenzen
} from './vrijstellingsService';

// Mock de database en LLM calls
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue(null)
}));

vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{}' } }]
  })
}));

vi.mock('./ruimtelijkeplannenApiService', () => ({
  isApiAvailable: vi.fn().mockResolvedValue(false),
  haalOmgevingsplanVrijstellingen: vi.fn().mockResolvedValue(null)
}));

describe('analyseerGraafwerk', () => {
  describe('Formuliergegevens als primaire bron', () => {
    it('gebruikt graafdiepte uit formulier wanneer beschikbaar', async () => {
      const formulier: FormulierGraafgegevens = {
        graafdiepteCm: 150,
        oppervlakteM2: 45
      };
      
      const result = await analyseerGraafwerk(
        ['nieuwbouw woning'],
        'Bouw van een woning',
        undefined,
        formulier
      );
      
      expect(result.graafdiepteCm).toBe(150);
      expect(result.oppervlakteM2).toBe(45);
      expect(result.diepteBron).toBe('formulier');
      expect(result.oppervlakteBron).toBe('formulier');
      expect(result.zekerheid).toBe('hoog');
    });

    it('converteert diepte in meters naar centimeters', async () => {
      const formulier: FormulierGraafgegevens = {
        diepteM: 2.5 // 2.5 meter = 250cm
      };
      
      const result = await analyseerGraafwerk(
        ['kelder'],
        undefined,
        undefined,
        formulier
      );
      
      expect(result.graafdiepteCm).toBe(250);
      expect(result.diepteBron).toBe('formulier');
    });

    it('valt terug op schatting als formulier geen waarden heeft', async () => {
      const formulier: FormulierGraafgegevens = {};
      
      const result = await analyseerGraafwerk(
        ['nieuwbouw'],
        undefined,
        undefined,
        formulier
      );
      
      expect(result.graafdiepteCm).toBe(80); // standaard schatting voor nieuwbouw
      expect(result.diepteBron).toBe('schatting');
    });

    it('valt terug op schatting als geen formuliergegevens meegegeven', async () => {
      const result = await analyseerGraafwerk(
        ['riolering aanleggen'],
        undefined,
        undefined,
        undefined
      );
      
      expect(result.graafdiepteCm).toBe(100); // standaard schatting voor riolering
      expect(result.diepteBron).toBe('schatting');
      expect(result.oppervlakteBron).toBe('schatting');
    });
  });

  describe('Realiteitscheck', () => {
    it('markeert onrealistisch lage graafdiepte voor kelder', async () => {
      const formulier: FormulierGraafgegevens = {
        graafdiepteCm: 30, // Veel te ondiep voor een kelder
        oppervlakteM2: 40
      };
      
      const result = await analyseerGraafwerk(
        ['kelder'],
        undefined,
        undefined,
        formulier
      );
      
      expect(result.realiteitscheck).toBeDefined();
      expect(result.realiteitscheck!.diepteRealistisch).toBe(false);
      expect(result.realiteitscheck!.waarschuwingen.length).toBeGreaterThan(0);
      expect(result.realiteitscheck!.waarschuwingen[0]).toContain('ongewoon laag');
      expect(result.realiteitscheck!.verwachteRangeDiepteCm.min).toBe(200);
      expect(result.realiteitscheck!.verwachteRangeDiepteCm.max).toBe(500);
    });

    it('markeert onrealistisch hoge graafdiepte voor aanbouw', async () => {
      const formulier: FormulierGraafgegevens = {
        graafdiepteCm: 500, // Veel te diep voor een aanbouw
        oppervlakteM2: 20
      };
      
      const result = await analyseerGraafwerk(
        ['aanbouw'],
        undefined,
        undefined,
        formulier
      );
      
      expect(result.realiteitscheck).toBeDefined();
      expect(result.realiteitscheck!.diepteRealistisch).toBe(false);
      expect(result.realiteitscheck!.waarschuwingen[0]).toContain('ongewoon hoog');
    });

    it('accepteert realistische waarden zonder waarschuwingen', async () => {
      const formulier: FormulierGraafgegevens = {
        graafdiepteCm: 80,
        oppervlakteM2: 50
      };
      
      const result = await analyseerGraafwerk(
        ['nieuwbouw'],
        undefined,
        undefined,
        formulier
      );
      
      expect(result.realiteitscheck).toBeDefined();
      expect(result.realiteitscheck!.diepteRealistisch).toBe(true);
      expect(result.realiteitscheck!.oppervlakteRealistisch).toBe(true);
      expect(result.realiteitscheck!.waarschuwingen.length).toBe(0);
    });

    it('waarschuwt bij graafwerk voor dakkapel', async () => {
      const formulier: FormulierGraafgegevens = {
        graafdiepteCm: 100 // Onverwacht voor dakkapel
      };
      
      const result = await analyseerGraafwerk(
        ['dakkapel'],
        undefined,
        undefined,
        formulier
      );
      
      expect(result.realiteitscheck).toBeDefined();
      expect(result.realiteitscheck!.waarschuwingen.length).toBeGreaterThan(0);
      expect(result.realiteitscheck!.waarschuwingen[0]).toContain('geen graafwerk verwacht');
    });
  });

  describe('Backwards compatibility', () => {
    it('bevat geschatteGraafdiepteCm en geschatteOppervlakteM2 velden', async () => {
      const result = await analyseerGraafwerk(
        ['nieuwbouw'],
        undefined,
        undefined,
        { graafdiepteCm: 120, oppervlakteM2: 60 }
      );
      
      expect(result.geschatteGraafdiepteCm).toBe(120);
      expect(result.geschatteOppervlakteM2).toBe(60);
      expect(result.geschatteGraafdiepteCm).toBe(result.graafdiepteCm);
      expect(result.geschatteOppervlakteM2).toBe(result.oppervlakteM2);
    });
  });

  describe('Activiteit detectie', () => {
    it('detecteert graafwerk bij nieuwbouw', async () => {
      const result = await analyseerGraafwerk(['nieuwbouw woning'], 'Bouw van een vrijstaande woning');
      expect(result.heeftGraafwerk).toBe(true);
      expect(result.indicatoren).toContain('Nieuwbouw (fundering vereist)');
    });

    it('detecteert geen graafwerk bij dakkapel zonder opgave', async () => {
      const result = await analyseerGraafwerk(['dakkapel plaatsen'], 'Plaatsen van een dakkapel');
      expect(result.heeftGraafwerk).toBe(false);
      expect(result.graafdiepteCm).toBe(0);
    });

    it('detecteert graafwerk uit projectomschrijving', async () => {
      const result = await analyseerGraafwerk(
        ['overig'],
        'Er wordt een bouwput gegraven van 3 meter diep'
      );
      expect(result.heeftGraafwerk).toBe(true);
      expect(result.indicatoren).toContain('Bouwput genoemd');
    });
  });
});

describe('vergelijkMetVrijstellingen', () => {
  const vrijstellingen: VrijstellingsGrenzen = {
    archeologieDiepteCm: 30,
    archeologieOppervlakteM2: 100,
    bron: 'Ruimtelijkeplannen.nl API (officieel)',
    laatstBijgewerkt: new Date()
  };

  it('verplicht onderzoek als beide grenzen overschreden', () => {
    const graafwerk = {
      heeftGraafwerk: true,
      graafdiepteCm: 80,
      oppervlakteM2: 150,
      diepteBron: 'formulier' as const,
      oppervlakteBron: 'formulier' as const,
      indicatoren: ['Nieuwbouw'],
      zekerheid: 'hoog' as const,
      toelichting: '',
      geschatteGraafdiepteCm: 80,
      geschatteOppervlakteM2: 150,
    };
    
    const result = vergelijkMetVrijstellingen(graafwerk, vrijstellingen);
    expect(result.onderzoekVerplicht).toBe(true);
    expect(result.vrijstellingVanToepassing).toBe(false);
  });

  it('vrijstelling als alleen diepte overschreden', () => {
    const graafwerk = {
      heeftGraafwerk: true,
      graafdiepteCm: 80,
      oppervlakteM2: 50, // Binnen grens
      diepteBron: 'formulier' as const,
      oppervlakteBron: 'formulier' as const,
      indicatoren: ['Aanbouw'],
      zekerheid: 'middel' as const,
      toelichting: '',
      geschatteGraafdiepteCm: 80,
      geschatteOppervlakteM2: 50,
    };
    
    const result = vergelijkMetVrijstellingen(graafwerk, vrijstellingen);
    expect(result.onderzoekVerplicht).toBe(false);
    expect(result.vrijstellingVanToepassing).toBe(true);
  });

  it('geen onderzoek als geen graafwerk', () => {
    const graafwerk = {
      heeftGraafwerk: false,
      graafdiepteCm: 0,
      oppervlakteM2: 0,
      diepteBron: 'schatting' as const,
      oppervlakteBron: 'schatting' as const,
      indicatoren: [],
      zekerheid: 'laag' as const,
      toelichting: '',
      geschatteGraafdiepteCm: 0,
      geschatteOppervlakteM2: 0,
    };
    
    const result = vergelijkMetVrijstellingen(graafwerk, vrijstellingen);
    expect(result.onderzoekVerplicht).toBe(false);
  });
});

describe('bepaalGraafwerkConsequenties', () => {
  it('geeft KLIC-melding als verplicht bij graafwerk >20cm', () => {
    const graafwerk: GraafwerkAnalyse = {
      heeftGraafwerk: true,
      graafdiepteCm: 80,
      oppervlakteM2: 30,
      diepteBron: 'formulier',
      oppervlakteBron: 'formulier',
      indicatoren: ['Nieuwbouw'],
      zekerheid: 'hoog',
      toelichting: '',
      geschatteGraafdiepteCm: 80,
      geschatteOppervlakteM2: 30,
    };
    
    const consequenties = bepaalGraafwerkConsequenties(graafwerk);
    const klic = consequenties.find(c => c.type === 'KLIC-melding');
    expect(klic).toBeDefined();
    expect(klic!.verplicht).toBe(true);
    expect(klic!.wettelijkeBasis).toContain('WIBON');
  });

  it('geeft geen KLIC-melding bij ondiepe graafwerk <=20cm', () => {
    const graafwerk: GraafwerkAnalyse = {
      heeftGraafwerk: true,
      graafdiepteCm: 15,
      oppervlakteM2: 10,
      diepteBron: 'formulier',
      oppervlakteBron: 'formulier',
      indicatoren: ['Tuinaanleg'],
      zekerheid: 'hoog',
      toelichting: '',
      geschatteGraafdiepteCm: 15,
      geschatteOppervlakteM2: 10,
    };
    
    const consequenties = bepaalGraafwerkConsequenties(graafwerk);
    const klic = consequenties.find(c => c.type === 'KLIC-melding');
    expect(klic).toBeUndefined();
  });

  it('geeft geen consequenties bij geen graafwerk', () => {
    const graafwerk: GraafwerkAnalyse = {
      heeftGraafwerk: false,
      graafdiepteCm: 0,
      oppervlakteM2: 0,
      diepteBron: 'schatting',
      oppervlakteBron: 'schatting',
      indicatoren: [],
      zekerheid: 'laag',
      toelichting: '',
      geschatteGraafdiepteCm: 0,
      geschatteOppervlakteM2: 0,
    };
    
    const consequenties = bepaalGraafwerkConsequenties(graafwerk);
    expect(consequenties).toHaveLength(0);
  });

  it('geeft grondwateronttrekking als aandachtspunt bij diepe bouwput', () => {
    const graafwerk: GraafwerkAnalyse = {
      heeftGraafwerk: true,
      graafdiepteCm: 300,
      oppervlakteM2: 100,
      diepteBron: 'formulier',
      oppervlakteBron: 'formulier',
      indicatoren: ['Kelder'],
      zekerheid: 'hoog',
      toelichting: '',
      geschatteGraafdiepteCm: 300,
      geschatteOppervlakteM2: 100,
    };
    
    const consequenties = bepaalGraafwerkConsequenties(graafwerk);
    const bemaling = consequenties.find(c => c.type === 'Grondwateronttrekking / Bemaling');
    expect(bemaling).toBeDefined();
    expect(bemaling!.wettelijkeBasis).toContain('Waterschapsverordening');
  });

  it('geeft ontgravingsmelding bij groot grondverzet', () => {
    const graafwerk: GraafwerkAnalyse = {
      heeftGraafwerk: true,
      graafdiepteCm: 200,
      oppervlakteM2: 80,
      diepteBron: 'formulier',
      oppervlakteBron: 'formulier',
      indicatoren: ['Nieuwbouw'],
      zekerheid: 'hoog',
      toelichting: '',
      geschatteGraafdiepteCm: 200,
      geschatteOppervlakteM2: 80,
    };
    
    const consequenties = bepaalGraafwerkConsequenties(graafwerk);
    const grondverzet = consequenties.find(c => c.type === 'Grondverzet / Ontgravingsmelding');
    expect(grondverzet).toBeDefined();
    expect(grondverzet!.verplicht).toBe(true); // 200/100 * 80 = 160m³ > 50m³
    expect(grondverzet!.wettelijkeBasis).toContain('Besluit bodemkwaliteit');
  });

  it('gebruikt formulierwaarden en overschrijft nooit de opgegeven diepte', async () => {
    // Uitbouw met 200cm opgegeven - systeem mag dit NIET overschrijven naar 60cm
    const formulier: FormulierGraafgegevens = {
      graafdiepteCm: 200,
      oppervlakteM2: 30
    };
    
    const result = await analyseerGraafwerk(
      ['uitbouw'],
      undefined,
      undefined,
      formulier
    );
    
    // Formulierwaarde moet leidend zijn
    expect(result.graafdiepteCm).toBe(200);
    expect(result.diepteBron).toBe('formulier');
    // Realiteitscheck mag waarschuwen, maar de waarde niet overschrijven
    expect(result.realiteitscheck?.waarschuwingen.length).toBeGreaterThan(0);
    expect(result.realiteitscheck?.waarschuwingen[0]).toContain('ongewoon hoog');
    
    // Consequenties moeten op basis van 200cm berekend worden, niet 60cm
    const consequenties = bepaalGraafwerkConsequenties(result);
    const klic = consequenties.find(c => c.type === 'KLIC-melding');
    expect(klic).toBeDefined();
    expect(klic!.verplicht).toBe(true);
    // Bij 200cm moet ook grondwateronttrekking als aandachtspunt komen
    const bemaling = consequenties.find(c => c.type === 'Grondwateronttrekking / Bemaling');
    expect(bemaling).toBeDefined();
  });
});

describe('VERWACHTE_GRAAFDIEPTE_RANGES', () => {
  it('bevat ranges voor alle gangbare activiteittypes', () => {
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.kelder).toBeDefined();
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.nieuwbouw).toBeDefined();
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.aanbouw).toBeDefined();
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.dakkapel).toBeDefined();
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.zwembad).toBeDefined();
  });

  it('dakkapel en zonnepanelen hebben 0 graafdiepte', () => {
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.dakkapel.diepteMax).toBe(0);
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.zonnepanelen.diepteMax).toBe(0);
  });

  it('kelder heeft diepere range dan aanbouw', () => {
    expect(VERWACHTE_GRAAFDIEPTE_RANGES.kelder.diepteMin).toBeGreaterThan(
      VERWACHTE_GRAAFDIEPTE_RANGES.aanbouw.diepteMin
    );
  });
});
