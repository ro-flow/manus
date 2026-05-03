import { describe, it, expect } from 'vitest';
import {
  voerBeslisboomUit,
  combineerConclusies,
  isOverrideToegestaan,
  formatBeslisboomVoorAI,
  type BeslisboomInput,
  type BeschermingsRegime,
  type DSOConclusieBasis
} from './vergunningBeslisboomService';

describe('vergunningBeslisboomService', () => {
  describe('voerBeslisboomUit', () => {
    it('geeft vergunningvrij terug als DSO conclusie vergunningvrij is zonder expliciete uitzonderingen', () => {
      const input: BeslisboomInput = {
        activiteit: 'bouwen',
        locatie: {
          coordinates: [133000, 517000],
          gemeente: 'Hoorn'
        },
        beschermingsregimes: [],
        dsoConclusieBasis: {
          conclusie: 'vergunningvrij',
          bron: 'Bbl',
          artikel: '2.27',
          toelichting: 'Bijbehorend bouwwerk voldoet aan voorwaarden'
        }
      };

      const resultaat = voerBeslisboomUit(input);

      expect(resultaat.conclusie).toBe('vergunningvrij');
      expect(resultaat.isOverride).toBe(false);
      expect(resultaat.beschermingsregimesDoorslaggevend).toHaveLength(0);
    });

    it('geeft vergunningplichtig terug als DSO conclusie vergunningplichtig is', () => {
      const input: BeslisboomInput = {
        activiteit: 'bouwen',
        locatie: {
          coordinates: [133000, 517000],
          gemeente: 'Hoorn'
        },
        beschermingsregimes: [],
        dsoConclusieBasis: {
          conclusie: 'vergunningplichtig',
          bron: 'omgevingsplan',
          toelichting: 'Bouwwerk overschrijdt vergunningvrije grenzen'
        }
      };

      const resultaat = voerBeslisboomUit(input);

      expect(resultaat.conclusie).toBe('vergunningplichtig');
      expect(resultaat.isOverride).toBe(false);
    });

    it('geeft vergunningvrij terug met beschermd stadsgezicht als context (geen expliciete uitzondering)', () => {
      const input: BeslisboomInput = {
        activiteit: 'bouwen',
        locatie: {
          coordinates: [133000, 517000],
          gemeente: 'Hoorn'
        },
        beschermingsregimes: [{
          type: 'beschermd_stadsgezicht',
          naam: 'Beschermd stadsgezicht Hoorn',
          bron: 'Erfgoedwet',
          heeftExplicieteUitzondering: false // Geen expliciete uitzondering
        }],
        dsoConclusieBasis: {
          conclusie: 'vergunningvrij',
          bron: 'Bbl',
          artikel: '2.27',
          toelichting: 'Bijbehorend bouwwerk voldoet aan voorwaarden'
        }
      };

      const resultaat = voerBeslisboomUit(input);

      // Conclusie blijft vergunningvrij - beschermd stadsgezicht alleen is geen override
      expect(resultaat.conclusie).toBe('vergunningvrij');
      expect(resultaat.isOverride).toBe(false);
      expect(resultaat.beschermingsregimesContext).toHaveLength(1);
      expect(resultaat.beschermingsregimesContext[0].naam).toBe('Beschermd stadsgezicht Hoorn');
      expect(resultaat.beschermingsregimesDoorslaggevend).toHaveLength(0);
    });

    it('geeft vergunningplichtig terug met rijksmonument (altijd expliciete uitzondering)', () => {
      const input: BeslisboomInput = {
        activiteit: 'verbouwen',
        locatie: {
          coordinates: [133000, 517000],
          gemeente: 'Hoorn'
        },
        beschermingsregimes: [{
          type: 'rijksmonument',
          naam: 'Rijksmonument Grote Oost 1',
          bron: 'Erfgoedwet',
          heeftExplicieteUitzondering: true,
          uitzonderingArtikel: 'Omgevingswet art. 5.1 lid 1 sub b',
          uitzonderingTekst: 'Wijzigen van een rijksmonument is altijd vergunningplichtig'
        }],
        dsoConclusieBasis: {
          conclusie: 'vergunningvrij',
          bron: 'Bbl',
          toelichting: 'Interne verbouwing normaal vergunningvrij'
        }
      };

      const resultaat = voerBeslisboomUit(input);

      // Conclusie wordt vergunningplichtig door rijksmonument override
      expect(resultaat.conclusie).toBe('vergunningplichtig');
      expect(resultaat.isOverride).toBe(true);
      expect(resultaat.overrideBron).toBe('Omgevingswet art. 5.1 lid 1 sub b');
      expect(resultaat.beschermingsregimesDoorslaggevend).toHaveLength(1);
    });

    it('geeft vergunningplichtig terug met waterkering (expliciete uitzondering)', () => {
      const input: BeslisboomInput = {
        activiteit: 'bouwen',
        locatie: {
          coordinates: [133000, 517000],
          gemeente: 'Hoorn'
        },
        beschermingsregimes: [{
          type: 'waterkering',
          naam: 'Primaire waterkering',
          bron: 'Waterwet',
          heeftExplicieteUitzondering: true,
          uitzonderingArtikel: 'Waterwet art. 6.5',
          uitzonderingTekst: 'Activiteiten in/nabij waterkering vereisen watervergunning'
        }],
        dsoConclusieBasis: {
          conclusie: 'vergunningvrij',
          bron: 'Bbl',
          toelichting: 'Bouwwerk voldoet aan vergunningvrije voorwaarden'
        }
      };

      const resultaat = voerBeslisboomUit(input);

      expect(resultaat.conclusie).toBe('vergunningplichtig');
      expect(resultaat.isOverride).toBe(true);
      expect(resultaat.overrideBron).toBe('Waterwet art. 6.5');
    });

    it('combineert meerdere beschermingsregimes correct', () => {
      const input: BeslisboomInput = {
        activiteit: 'bouwen',
        locatie: {
          coordinates: [133000, 517000],
          gemeente: 'Hoorn'
        },
        beschermingsregimes: [
          {
            type: 'beschermd_stadsgezicht',
            naam: 'Beschermd stadsgezicht Hoorn',
            bron: 'Erfgoedwet',
            heeftExplicieteUitzondering: false // Context
          },
          {
            type: 'natura2000',
            naam: 'Markermeer',
            bron: 'Wnb',
            heeftExplicieteUitzondering: false // Context
          },
          {
            type: 'rijksmonument',
            naam: 'Rijksmonument',
            bron: 'Erfgoedwet',
            heeftExplicieteUitzondering: true, // Doorslaggevend
            uitzonderingArtikel: 'Omgevingswet art. 5.1 lid 1 sub b',
            uitzonderingTekst: 'Wijzigen monument vergunningplichtig'
          }
        ],
        dsoConclusieBasis: {
          conclusie: 'vergunningvrij',
          bron: 'Bbl',
          toelichting: 'Normaal vergunningvrij'
        }
      };

      const resultaat = voerBeslisboomUit(input);

      expect(resultaat.conclusie).toBe('vergunningplichtig');
      expect(resultaat.isOverride).toBe(true);
      expect(resultaat.beschermingsregimesContext).toHaveLength(2); // Stadsgezicht + Natura2000
      expect(resultaat.beschermingsregimesDoorslaggevend).toHaveLength(1); // Rijksmonument
    });
  });

  describe('isOverrideToegestaan', () => {
    it('weigert override als regime geen expliciete uitzondering heeft', () => {
      const regime: BeschermingsRegime = {
        type: 'beschermd_stadsgezicht',
        naam: 'Beschermd stadsgezicht',
        bron: 'Erfgoedwet',
        heeftExplicieteUitzondering: false
      };

      const resultaat = isOverrideToegestaan(regime, 'bouwen');

      expect(resultaat.toegestaan).toBe(false);
      expect(resultaat.reden).toContain('onvoldoende');
    });

    it('weigert override als regime geen artikelverwijzing heeft', () => {
      const regime: BeschermingsRegime = {
        type: 'beschermd_stadsgezicht',
        naam: 'Beschermd stadsgezicht',
        bron: 'Erfgoedwet',
        heeftExplicieteUitzondering: true
        // Geen uitzonderingArtikel
      };

      const resultaat = isOverrideToegestaan(regime, 'bouwen');

      expect(resultaat.toegestaan).toBe(false);
      expect(resultaat.reden).toContain('artikelverwijzing');
    });

    it('staat override toe met expliciete uitzondering en artikelverwijzing', () => {
      const regime: BeschermingsRegime = {
        type: 'rijksmonument',
        naam: 'Rijksmonument',
        bron: 'Erfgoedwet',
        heeftExplicieteUitzondering: true,
        uitzonderingArtikel: 'Omgevingswet art. 5.1 lid 1 sub b',
        uitzonderingTekst: 'Wijzigen monument vergunningplichtig'
      };

      const resultaat = isOverrideToegestaan(regime, 'verbouwen');

      expect(resultaat.toegestaan).toBe(true);
      expect(resultaat.reden).toContain('Omgevingswet art. 5.1 lid 1 sub b');
    });
  });

  describe('formatBeslisboomVoorAI', () => {
    it('formatteert beslisboom resultaat correct voor AI context', () => {
      const input: BeslisboomInput = {
        activiteit: 'bouwen',
        locatie: {
          coordinates: [133000, 517000],
          gemeente: 'Hoorn'
        },
        beschermingsregimes: [],
        dsoConclusieBasis: {
          conclusie: 'vergunningvrij',
          bron: 'Bbl',
          artikel: '2.27',
          toelichting: 'Bijbehorend bouwwerk voldoet aan voorwaarden'
        }
      };

      const resultaat = voerBeslisboomUit(input);
      const formatted = formatBeslisboomVoorAI(resultaat);

      expect(formatted).toContain('## Vergunning Beslisboom Analyse');
      expect(formatted).toContain('VERGUNNINGVRIJ');
      expect(formatted).toContain('Doorlopen stappen');
    });
  });

  describe('combineerConclusies', () => {
    it('combineert DSO conclusie met AI analyse correct', () => {
      const dsoConclusieBasis: DSOConclusieBasis = {
        conclusie: 'vergunningvrij',
        bron: 'Bbl',
        artikel: '2.27',
        toelichting: 'Bijbehorend bouwwerk'
      };

      const aiAnalyse = {
        beschermingsregimes: [{
          type: 'beschermd_stadsgezicht' as const,
          naam: 'Beschermd stadsgezicht',
          bron: 'Erfgoedwet',
          heeftExplicieteUitzondering: false
        }]
      };

      const resultaat = combineerConclusies(
        dsoConclusieBasis,
        aiAnalyse,
        'bouwen',
        { coordinates: [133000, 517000], gemeente: 'Hoorn' }
      );

      // Vergunningvrij blijft behouden, stadsgezicht is alleen context
      expect(resultaat.conclusie).toBe('vergunningvrij');
      expect(resultaat.beschermingsregimesContext).toHaveLength(1);
    });
  });
});
