/**
 * Tests voor de geconsolideerde beslisboom en kennisbank services
 */

import { describe, it, expect } from 'vitest';
import {
  voerCentraleBeslisboomUit,
  formatCentraleBeslisboomVoorAI,
  type BeslisboomInput,
  type BeschermingsRegime
} from './centraleBeslisboomService';
import {
  haalKennisbankItems,
  formatKennisbankVoorAI,
  type KennisbankQuery,
  type GemeenteContext
} from './gelaagdeKennisbankService';

describe('Centrale Beslisboom Service', () => {
  const basisGemeenteContext: GemeenteContext = {
    gemeenteId: 1,
    gemeenteNaam: 'Hoorn',
    provincie: 'Noord-Holland'
  };

  it('should determine vergunningvrij for small extension without beschermingsregimes', () => {
    const input: BeslisboomInput = {
      activiteiten: ['uitbouwen'],
      functies: { huidig: 'wonen' },
      locatie: { coordinates: [5.06, 52.64], gemeente: 'Hoorn' },
      beschermingsregimes: [],
      projectDetails: { oppervlakteM2: 20 }
    };

    const result = voerCentraleBeslisboomUit(input);

    expect(result.vergunningplicht.conclusie).toBe('vergunningvrij');
    expect(result.vergunningplicht.isOverride).toBe(false);
    expect(result.stappen.length).toBeGreaterThan(0);
  });

  it('should include rijksmonument as doorslaggevend beschermingsregime', () => {
    const rijksmonument: BeschermingsRegime = {
      type: 'rijksmonument',
      naam: 'Rijksmonument Hoofdstraat 1',
      bron: 'Rijksmonumentenregister',
      heeftExplicieteUitzondering: true,
      uitzonderingArtikel: 'Erfgoedwet art. 3.1',
      uitzonderingTekst: 'Wijziging rijksmonument is vergunningplichtig'
    };

    const input: BeslisboomInput = {
      activiteiten: ['verbouwen'],
      functies: { huidig: 'wonen' },
      locatie: { coordinates: [5.06, 52.64], gemeente: 'Hoorn' },
      beschermingsregimes: [rijksmonument],
      projectDetails: { oppervlakteM2: 50 }
    };

    const result = voerCentraleBeslisboomUit(input);

    // Rijksmonument met expliciete uitzondering moet als doorslaggevend worden gecategoriseerd
    expect(result.vergunningplicht.beschermingsregimesDoorslaggevend.length).toBe(1);
    expect(result.vergunningplicht.beschermingsregimesDoorslaggevend[0].type).toBe('rijksmonument');
    expect(result.vergunningplicht.conclusie).not.toBe('vergunningvrij');
  });

  it('should categorize beschermingsregimes as context vs doorslaggevend', () => {
    const natura2000Context: BeschermingsRegime = {
      type: 'natura2000',
      naam: 'Natura 2000 Markermeer',
      bron: 'PDOK',
      heeftExplicieteUitzondering: false // Alleen context
    };

    const monumentDoorslaggevend: BeschermingsRegime = {
      type: 'rijksmonument',
      naam: 'Rijksmonument',
      bron: 'RCE',
      heeftExplicieteUitzondering: true,
      uitzonderingArtikel: 'Erfgoedwet art. 3.1'
    };

    const input: BeslisboomInput = {
      activiteiten: ['verbouwen'],
      functies: { huidig: 'wonen' },
      locatie: { coordinates: [5.06, 52.64], gemeente: 'Hoorn' },
      beschermingsregimes: [natura2000Context, monumentDoorslaggevend]
    };

    const result = voerCentraleBeslisboomUit(input);

    expect(result.vergunningplicht.beschermingsregimesContext.length).toBe(1);
    expect(result.vergunningplicht.beschermingsregimesDoorslaggevend.length).toBe(1);
    expect(result.vergunningplicht.beschermingsregimesContext[0].type).toBe('natura2000');
    expect(result.vergunningplicht.beschermingsregimesDoorslaggevend[0].type).toBe('rijksmonument');
  });

  it('should determine toetsingskaders based on activiteiten', () => {
    const input: BeslisboomInput = {
      activiteiten: ['bouwen', 'kappen'],
      functies: { huidig: 'wonen', nieuw: 'horeca' },
      locatie: { coordinates: [5.06, 52.64], gemeente: 'Hoorn' },
      beschermingsregimes: [],
      projectDetails: { oppervlakteM2: 200 }
    };

    const result = voerCentraleBeslisboomUit(input);

    // Altijd toetsen: Omgevingswet, Bbl, Bal, Bkl, Welstandsnota
    expect(result.toetsingskaders.altijd.length).toBeGreaterThanOrEqual(4);
    
    // Soms toetsen: parkeerbeleid (functiewijziging), horecabeleid, groenbeleid (kappen)
    expect(result.toetsingskaders.soms.some(k => k.naam.includes('Parkeer'))).toBe(true);
    expect(result.toetsingskaders.soms.some(k => k.naam.includes('Horeca'))).toBe(true);
    expect(result.toetsingskaders.soms.some(k => k.naam.includes('Groen'))).toBe(true);
  });

  it('should format beslisboom result for AI context', () => {
    const input: BeslisboomInput = {
      activiteiten: ['bouwen'],
      functies: { huidig: 'wonen' },
      locatie: { coordinates: [5.06, 52.64], gemeente: 'Hoorn' },
      beschermingsregimes: []
    };

    const result = voerCentraleBeslisboomUit(input);
    const formatted = formatCentraleBeslisboomVoorAI(result);

    expect(formatted).toContain('Centrale Beslisboom');
    expect(formatted).toContain('Vergunningplicht');
    expect(formatted).toContain('Toetsingskaders');
    expect(formatted).toContain('Gouden Regel');
  });
});

describe('Gelaagde Kennisbank Service', () => {
  const basisGemeenteContext: GemeenteContext = {
    gemeenteId: 1,
    gemeenteNaam: 'Hoorn',
    provincie: 'Noord-Holland'
  };

  it('should return items when triggers match', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext,
      alleenActief: true,
      activiteiten: ['bouwen'],
      functieNieuw: 'wonen', // Trigger voor bodemonderzoek
      projectDetails: { graafdiepteCm: 50 } // Trigger voor KLIC en archeologie
    };

    const result = await haalKennisbankItems(query);

    // Met deze triggers zouden we items moeten krijgen
    expect(result.totaalAantal).toBeGreaterThan(0);
  });

  it('should filter items by categorie onderzoek', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext,
      categorie: 'onderzoek',
      activiteiten: ['bouwen'],
      functieNieuw: 'wonen', // Trigger voor bodemonderzoek
      dubbelbestemmingen: ['archeologie'], // Trigger voor archeologisch onderzoek
      projectDetails: { graafdiepteCm: 50 } // Trigger voor KLIC
    };

    const result = await haalKennisbankItems(query);

    // Met deze triggers zouden we onderzoeken moeten krijgen
    expect(result.onderzoeken.length).toBeGreaterThan(0);
    // Andere categorieën moeten leeg zijn door filter
    expect(result.adviseurs.length).toBe(0);
    expect(result.toetsingskaders.length).toBe(0);
  });

  it('should match triggers for activiteiten', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext,
      activiteiten: ['bouwen'],
      categorie: 'toetsingskader'
    };

    const result = await haalKennisbankItems(query);

    // Bbl should be included for bouwen
    expect(result.toetsingskaders.some(k => k.naam.includes('Bbl'))).toBe(true);
  });

  it('should match triggers for beschermingsregimes', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext,
      beschermingsregimes: ['rijksmonument'],
      categorie: 'adviseur'
    };

    const result = await haalKennisbankItems(query);

    // RCE should be included for rijksmonument
    expect(result.adviseurs.some(a => a.naam.includes('RCE') || a.naam.includes('Cultureel Erfgoed'))).toBe(true);
  });

  it('should match triggers for graafdiepte', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext,
      projectDetails: { graafdiepteCm: 50 },
      categorie: 'onderzoek'
    };

    const result = await haalKennisbankItems(query);

    // KLIC-melding should be included for graafdiepte > 20cm
    expect(result.onderzoeken.some(o => o.naam.includes('KLIC'))).toBe(true);
  });

  it('should format kennisbank result for AI context', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext,
      activiteiten: ['bouwen']
    };

    const result = await haalKennisbankItems(query);
    const formatted = formatKennisbankVoorAI(result);

    expect(formatted).toContain('Gelaagde Kennisbank');
    expect(formatted).toContain('Toetsingskaders');
    expect(formatted).toContain('Onderzoeken');
  });

  it('should include 5 lagen in perLaag metadata', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext
    };

    const result = await haalKennisbankItems(query);

    expect(result.perLaag).toHaveProperty('basis');
    expect(result.perLaag).toHaveProperty('landelijk');
    expect(result.perLaag).toHaveProperty('provinciaal');
    expect(result.perLaag).toHaveProperty('regionaal');
    expect(result.perLaag).toHaveProperty('gemeentelijk');
  });

  it('should include 4 categorieën in perCategorie metadata', async () => {
    const query: KennisbankQuery = {
      gemeenteContext: basisGemeenteContext
    };

    const result = await haalKennisbankItems(query);

    expect(result.perCategorie).toHaveProperty('adviseur');
    expect(result.perCategorie).toHaveProperty('toetsingskader');
    expect(result.perCategorie).toHaveProperty('onderzoek');
    expect(result.perCategorie).toHaveProperty('beleidsdocument');
  });
});
