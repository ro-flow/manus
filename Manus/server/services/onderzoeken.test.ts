import { describe, it, expect } from 'vitest';
import { 
  bepaalOnderzoeken, 
  formatOnderzoekenVoorAI,
  type OnderzoekenResultaat 
} from './onderzoekenService';
import type { RuimtelijkePlannenResultaat } from './ruimtelijkeplannenService';
import type { PDOKAnalyseResultaat } from './pdokService';
import type { MilieuAnalyse } from './milieuService';
import type { AeriusVereiste } from './aeriusService';

describe('Onderzoeken Service', () => {
  it('should detect archaeological research requirement from dubbelbestemming', () => {
    const ruimtelijkePlannen: RuimtelijkePlannenResultaat = {
      enkelbestemmingen: [],
      dubbelbestemmingen: [{
        type: 'waarde_archeologie',
        naam: 'Waarde - Archeologie',
        planNaam: 'Omgevingsplan Hoorn',
        planId: 'NL.IMRO.0001',
        adviesInstantie: 'Gemeentelijk archeoloog',
        aandachtspunten: ['Archeologisch onderzoek vereist']
      }],
      gebiedsaanduidingen: [],
      plannen: [],
      heeftArcheologie: true,
      heeftWaterkering: false,
      heeftLeiding: false,
      heeftVeiligheidszone: false,
      adviesInstanties: ['Gemeentelijk archeoloog'],
      onderzoeksVereisten: [],
      klicMeldingVereist: false,
      aeriusVereist: false
    };

    const result = bepaalOnderzoeken(['nieuwbouw'], ruimtelijkePlannen);

    expect(result.verplichteOnderzoeken).toContainEqual(
      expect.objectContaining({
        type: 'archeologisch_onderzoek',
        verplicht: true
      })
    );
  });

  it('should detect KLIC-melding requirement from leiding dubbelbestemming', () => {
    const ruimtelijkePlannen: RuimtelijkePlannenResultaat = {
      enkelbestemmingen: [],
      dubbelbestemmingen: [{
        type: 'leiding_gas',
        naam: 'Leiding - Gas',
        planNaam: 'Omgevingsplan Hoorn',
        planId: 'NL.IMRO.0001',
        adviesInstantie: 'Netbeheerder',
        aandachtspunten: ['KLIC-melding verplicht']
      }],
      gebiedsaanduidingen: [],
      plannen: [],
      heeftArcheologie: false,
      heeftWaterkering: false,
      heeftLeiding: true,
      heeftVeiligheidszone: false,
      adviesInstanties: ['Netbeheerder'],
      onderzoeksVereisten: [],
      klicMeldingVereist: true,
      aeriusVereist: false
    };

    const result = bepaalOnderzoeken(['nieuwbouw'], ruimtelijkePlannen);

    expect(result.klicMeldingVereist).toBe(true);
    expect(result.verplichteOnderzoeken).toContainEqual(
      expect.objectContaining({
        type: 'klic_melding',
        verplicht: true
      })
    );
  });

  it('should detect acoustic research requirement from geluidszone', () => {
    const ruimtelijkePlannen: RuimtelijkePlannenResultaat = {
      enkelbestemmingen: [],
      dubbelbestemmingen: [{
        type: 'geluidszone',
        naam: 'Geluidszone - Industrie',
        planNaam: 'Omgevingsplan Hoorn',
        planId: 'NL.IMRO.0001',
        adviesInstantie: 'Omgevingsdienst',
        aandachtspunten: ['Akoestisch onderzoek vereist']
      }],
      gebiedsaanduidingen: [],
      plannen: [],
      heeftArcheologie: false,
      heeftWaterkering: false,
      heeftLeiding: false,
      heeftVeiligheidszone: false,
      adviesInstanties: ['Omgevingsdienst'],
      onderzoeksVereisten: [],
      klicMeldingVereist: false,
      aeriusVereist: false
    };

    const result = bepaalOnderzoeken(['nieuwbouw'], ruimtelijkePlannen);

    expect(result.verplichteOnderzoeken).toContainEqual(
      expect.objectContaining({
        type: 'akoestisch_onderzoek',
        verplicht: true
      })
    );
  });

  it('should detect AERIUS requirement when aeriusVereiste is set', () => {
    const aeriusVereiste: AeriusVereiste = {
      vereist: true,
      reden: 'Nieuwbouw nabij Natura 2000',
      toelichting: 'AERIUS-berekening vereist voor bouwfase',
      bouwfase: true,
      gebruiksfase: false
    };

    const result = bepaalOnderzoeken(['nieuwbouw'], undefined, undefined, undefined, aeriusVereiste);

    expect(result.verplichteOnderzoeken).toContainEqual(
      expect.objectContaining({
        type: 'stikstof_aerius',
        verplicht: true
      })
    );
  });

  it('should detect flora/fauna research near Natura 2000', () => {
    const pdokAnalyse: PDOKAnalyseResultaat = {
      natura2000: {
        binnenGebied: false,
        dichtstbijzijnde: {
          naam: 'Markermeer & IJmeer',
          code: 'NL9803054',
          afstandMeter: 1500
        },
        gebiedenBinnen5km: []
      },
      monumenten: {
        isRijksmonument: false,
        monument: null,
        monumentenInOmgeving: []
      },
      beschermdGezicht: {
        binnenGebied: false,
        gezicht: null
      }
    };

    const result = bepaalOnderzoeken(['nieuwbouw'], undefined, pdokAnalyse);

    expect(result.verplichteOnderzoeken).toContainEqual(
      expect.objectContaining({
        type: 'flora_fauna_onderzoek',
        verplicht: true
      })
    );
  });

  it('should detect bouwhistorisch onderzoek for rijksmonument', () => {
    const pdokAnalyse: PDOKAnalyseResultaat = {
      natura2000: {
        binnenGebied: false,
        dichtstbijzijnde: null,
        gebiedenBinnen5km: []
      },
      monumenten: {
        isRijksmonument: true,
        monument: {
          naam: 'Hoofdtoren',
          rijksmonumentnummer: '12345',
          type: 'rijksmonument',
          afstandMeter: 0
        },
        monumentenInOmgeving: []
      },
      beschermdGezicht: {
        binnenGebied: false,
        gezicht: null
      }
    };

    const result = bepaalOnderzoeken(['verbouw'], undefined, pdokAnalyse);

    expect(result.verplichteOnderzoeken).toContainEqual(
      expect.objectContaining({
        type: 'bouwhistorisch_onderzoek',
        verplicht: true
      })
    );
  });

  it('should detect asbestinventarisatie for buildings before 1994', () => {
    const result = bepaalOnderzoeken(
      ['sloop'], 
      undefined, 
      undefined, 
      undefined, 
      undefined,
      { bouwjaar: 1980 }
    );

    expect(result.verplichteOnderzoeken).toContainEqual(
      expect.objectContaining({
        type: 'asbestinventarisatie',
        verplicht: true
      })
    );
  });

  it('should format onderzoeken for AI context', () => {
    const resultaat: OnderzoekenResultaat = {
      verplichteOnderzoeken: [{
        type: 'archeologisch_onderzoek',
        naam: 'Archeologisch onderzoek',
        verplicht: true,
        reden: 'Dubbelbestemming: Waarde - Archeologie',
        trigger: 'Bodemingreep in archeologisch waardevol gebied',
        toelichting: 'Bureauonderzoek, eventueel gevolgd door booronderzoek',
        instantie: 'Gemeentelijk archeoloog',
        kostenindicatie: '€500-€5.000',
        doorlooptijd: '2-6 weken',
        wettelijkeBasis: 'Erfgoedwet'
      }],
      aanbevolenOnderzoeken: [],
      klicMeldingVereist: true,
      klicToelichting: 'KLIC-melding verplicht bij graafwerk',
      totaalAantalVerplicht: 1,
      totaalAantalAanbevolen: 0
    };

    const formatted = formatOnderzoekenVoorAI(resultaat);

    expect(formatted).toContain('VEREISTE ONDERZOEKEN');
    expect(formatted).toContain('Archeologisch onderzoek');
    expect(formatted).toContain('KLIC-MELDING');
    expect(formatted).toContain('VERPLICHT');
  });

  it('should combine multiple research requirements', () => {
    const ruimtelijkePlannen: RuimtelijkePlannenResultaat = {
      enkelbestemmingen: [],
      dubbelbestemmingen: [
        {
          type: 'waarde_archeologie',
          naam: 'Waarde - Archeologie',
          planNaam: 'Omgevingsplan',
          planId: 'NL.IMRO.0001',
          adviesInstantie: 'Gemeentelijk archeoloog',
          aandachtspunten: []
        },
        {
          type: 'waterstaat_waterkering',
          naam: 'Waterstaat - Waterkering',
          planNaam: 'Omgevingsplan',
          planId: 'NL.IMRO.0001',
          adviesInstantie: 'Waterschap',
          aandachtspunten: []
        }
      ],
      gebiedsaanduidingen: [],
      plannen: [],
      heeftArcheologie: true,
      heeftWaterkering: true,
      heeftLeiding: false,
      heeftVeiligheidszone: false,
      adviesInstanties: ['Gemeentelijk archeoloog', 'Waterschap'],
      onderzoeksVereisten: [],
      klicMeldingVereist: false,
      aeriusVereist: false
    };

    const result = bepaalOnderzoeken(['nieuwbouw'], ruimtelijkePlannen);

    expect(result.totaalAantalVerplicht).toBeGreaterThanOrEqual(2);
    expect(result.verplichteOnderzoeken.map(o => o.type)).toContain('archeologisch_onderzoek');
    expect(result.verplichteOnderzoeken.map(o => o.type)).toContain('watertoets');
  });
});
