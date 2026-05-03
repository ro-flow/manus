import { describe, it, expect } from 'vitest';
import {
  bepaalIndieningsvereisten,
  controleerVolledigheid,
  formatIndieningsvereistenVoorAI,
  genereerChecklist
} from './indieningsvereistenService';

describe('indieningsvereistenService', () => {
  describe('bepaalIndieningsvereisten', () => {
    it('should always include algemene vereisten', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      
      const algemeneIds = vereisten
        .filter(v => v.categorie === 'algemeen')
        .map(v => v.id);
      
      expect(algemeneIds).toContain('aanvraagformulier');
      expect(algemeneIds).toContain('situatietekening');
      expect(algemeneIds).toContain('kadastrale_gegevens');
    });

    it('should include bouwvereisten for nieuwbouw', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      
      const bouwIds = vereisten
        .filter(v => v.categorie === 'bouwactiviteit')
        .map(v => v.id);
      
      expect(bouwIds).toContain('plattegronden');
      expect(bouwIds).toContain('doorsneden');
      expect(bouwIds).toContain('geveltekeningen');
      expect(bouwIds).toContain('energieprestatieberekening');
    });

    it('should include sloopvereisten for sloop', () => {
      const vereisten = bepaalIndieningsvereisten(['sloop']);
      
      const sloopIds = vereisten
        .filter(v => v.categorie === 'sloopactiviteit')
        .map(v => v.id);
      
      expect(sloopIds).toContain('sloopmelding');
      expect(sloopIds).toContain('asbestinventarisatierapport');
    });

    it('should skip asbestinventarisatie for buildings after 1994', () => {
      const vereisten = bepaalIndieningsvereisten(['sloop'], { bouwjaar: 2000 });
      
      const sloopIds = vereisten
        .filter(v => v.categorie === 'sloopactiviteit')
        .map(v => v.id);
      
      expect(sloopIds).toContain('sloopmelding');
      expect(sloopIds).not.toContain('asbestinventarisatierapport');
    });

    it('should include monumentvereisten for monuments', () => {
      const vereisten = bepaalIndieningsvereisten(['verbouw'], { isMonument: true });
      
      const monumentIds = vereisten
        .filter(v => v.categorie === 'monumentenactiviteit')
        .map(v => v.id);
      
      expect(monumentIds).toContain('bouwhistorisch_rapport');
      expect(monumentIds).toContain('foto_documentatie');
    });

    it('should include natuurvereisten for Natura 2000', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw'], { nabijNatura2000: true });
      
      const natuurIds = vereisten
        .filter(v => v.categorie === 'natuuractiviteit')
        .map(v => v.id);
      
      expect(natuurIds).toContain('quickscan_flora_fauna');
      expect(natuurIds).toContain('aerius_berekening');
    });

    it('should include BOPA vereisten for afwijking', () => {
      const vereisten = bepaalIndieningsvereisten(['buitenplanse omgevingsplanactiviteit'], { isBOPA: true });
      
      const bopaIds = vereisten
        .filter(v => v.categorie === 'afwijkactiviteit')
        .map(v => v.id);
      
      expect(bopaIds).toContain('ruimtelijke_onderbouwing');
    });
  });

  describe('controleerVolledigheid', () => {
    it('should mark as incomplete when required docs are missing', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      const resultaat = controleerVolledigheid(vereisten, []);
      
      expect(resultaat.volledig).toBe(false);
      expect(resultaat.aantalOntbreekt).toBeGreaterThan(0);
      expect(resultaat.ontbrekendeDocumenten.length).toBeGreaterThan(0);
    });

    it('should mark as complete when all required docs are present', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      const verplichteIds = vereisten
        .filter(v => v.verplicht)
        .map(v => v.id);
      
      const resultaat = controleerVolledigheid(vereisten, verplichteIds);
      
      expect(resultaat.volledig).toBe(true);
      expect(resultaat.aantalOntbreekt).toBe(0);
    });

    it('should correctly count aanwezig vs ontbreekt', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      const ingediend = ['aanvraagformulier', 'situatietekening'];
      
      const resultaat = controleerVolledigheid(vereisten, ingediend);
      
      expect(resultaat.aantalAanwezig).toBe(2);
      expect(resultaat.aantalVerplicht).toBeGreaterThan(2);
    });
  });

  describe('formatIndieningsvereistenVoorAI', () => {
    it('should format incomplete result correctly', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      const resultaat = controleerVolledigheid(vereisten, []);
      const formatted = formatIndieningsvereistenVoorAI(resultaat);
      
      expect(formatted).toContain('AANVRAAG ONVOLLEDIG');
      expect(formatted).toContain('ONTBREKENDE VERPLICHTE DOCUMENTEN');
    });

    it('should format complete result correctly', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      const verplichteIds = vereisten.filter(v => v.verplicht).map(v => v.id);
      const resultaat = controleerVolledigheid(vereisten, verplichteIds);
      const formatted = formatIndieningsvereistenVoorAI(resultaat);
      
      expect(formatted).toContain('AANVRAAG VOLLEDIG');
    });
  });

  describe('genereerChecklist', () => {
    it('should generate checklist with all vereisten', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      const checklist = genereerChecklist(vereisten);
      
      expect(checklist).toContain('Indieningsvereisten Checklist');
      expect(checklist).toContain('Algemene vereisten');
      expect(checklist).toContain('Bouwactiviteit');
      expect(checklist).toContain('(VERPLICHT)');
    });

    it('should include wettelijke basis in checklist', () => {
      const vereisten = bepaalIndieningsvereisten(['nieuwbouw']);
      const checklist = genereerChecklist(vereisten);
      
      expect(checklist).toContain('Grondslag:');
      expect(checklist).toContain('Omgevingsregeling');
    });
  });
});
