import { describe, it, expect } from 'vitest';
import { generateOmgevingsscanHTML, generateOmgevingsscanFilename } from './omgevingsscanPdfGenerator';

const mockScanResult = {
  locatie: {
    adres: 'Dorpsstraat 1, 1689 AA Zwaag',
    lat: 52.6856,
    lng: 5.1761,
    gemeente: 'Hoorn',
    postcode: '1689 AA',
  },
  timestamp: new Date().toISOString(),
  duurMs: 4500,
  indicatoren: [
    {
      code: 'BESTEMMINGSPLAN',
      theme: 'planologie',
      humanName: 'Bestemmingsplan',
      status: 'relevant' as const,
      waarde: 'Wonen',
      toelichting: 'Enkelbestemming: Wonen',
      bronnen: ['Ruimtelijkeplannen.nl'],
    },
    {
      code: 'NATURA2000',
      theme: 'natuur',
      humanName: 'Natura 2000',
      status: 'niet_relevant' as const,
      waarde: 'Geen Natura 2000 binnen 5km',
      toelichting: 'Geen Natura 2000 gebied in de nabijheid.',
      bronnen: ['PDOK'],
    },
    {
      code: 'FUNDERINGSPROBLEMATIEK',
      theme: 'bodem',
      humanName: 'Funderingsproblematiek',
      status: 'aandachtspunt' as const,
      waarde: 'Verhoogd funderingsrisico: veengrond, beneden NAP (-1.8m)',
      toelichting: 'Veengrond is gevoelig voor inklinking.',
      bronnen: ['AHN', 'BRO Bodemkaart', 'KCAF'],
    },
    {
      code: 'GEURZONE',
      theme: 'milieu',
      humanName: 'Geurzone',
      status: 'relevant' as const,
      waarde: 'Agrarische percelen nabij — geurhinder mogelijk',
      toelichting: 'Grasland in de directe omgeving.',
      bronnen: ['PDOK BRP Gewaspercelen'],
    },
  ],
  samenvatting: {
    totaal: 4,
    relevant: 2,
    aandachtspunten: 1,
    nietRelevant: 1,
    onbekend: 0,
    errors: 0,
  },
  themaOverzicht: [
    {
      theme: 'planologie',
      label: 'Planologie',
      color: '#1B4D3E',
      indicatoren: [
        {
          code: 'BESTEMMINGSPLAN',
          theme: 'planologie',
          humanName: 'Bestemmingsplan',
          status: 'relevant' as const,
          waarde: 'Wonen',
          toelichting: 'Enkelbestemming: Wonen',
          bronnen: ['Ruimtelijkeplannen.nl'],
        },
      ],
      heeftAandachtspunten: false,
    },
    {
      theme: 'natuur',
      label: 'Natuur & Ecologie',
      color: '#22c55e',
      indicatoren: [
        {
          code: 'NATURA2000',
          theme: 'natuur',
          humanName: 'Natura 2000',
          status: 'niet_relevant' as const,
          waarde: 'Geen Natura 2000 binnen 5km',
          toelichting: 'Geen Natura 2000 gebied in de nabijheid.',
          bronnen: ['PDOK'],
        },
      ],
      heeftAandachtspunten: false,
    },
    {
      theme: 'bodem',
      label: 'Bodem',
      color: '#8B4513',
      indicatoren: [
        {
          code: 'FUNDERINGSPROBLEMATIEK',
          theme: 'bodem',
          humanName: 'Funderingsproblematiek',
          status: 'aandachtspunt' as const,
          waarde: 'Verhoogd funderingsrisico: veengrond, beneden NAP (-1.8m)',
          toelichting: 'Veengrond is gevoelig voor inklinking.',
          bronnen: ['AHN', 'BRO Bodemkaart', 'KCAF'],
        },
      ],
      heeftAandachtspunten: true,
    },
    {
      theme: 'milieu',
      label: 'Milieu',
      color: '#f59e0b',
      indicatoren: [
        {
          code: 'GEURZONE',
          theme: 'milieu',
          humanName: 'Geurzone',
          status: 'relevant' as const,
          waarde: 'Agrarische percelen nabij — geurhinder mogelijk',
          toelichting: 'Grasland in de directe omgeving.',
          bronnen: ['PDOK BRP Gewaspercelen'],
        },
      ],
      heeftAandachtspunten: false,
    },
  ],
};

describe('Omgevingsscan PDF Generator', () => {
  describe('generateOmgevingsscanHTML', () => {
    it('genereert valide HTML met alle secties', () => {
      const html = generateOmgevingsscanHTML(mockScanResult);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Omgevingsscan Rapport');
      expect(html).toContain('Dorpsstraat 1, 1689 AA Zwaag');
    });

    it('bevat de samenvatting met juiste aantallen', () => {
      const html = generateOmgevingsscanHTML(mockScanResult);
      
      // Aandachtspunten
      expect(html).toContain('>1<');
      // Relevant
      expect(html).toContain('>2<');
      // Niet relevant
      expect(html).toContain('>1<');
    });

    it('toont aandachtspunten overzicht', () => {
      const html = generateOmgevingsscanHTML(mockScanResult);
      
      expect(html).toContain('Aandachtspunten overzicht');
      expect(html).toContain('Funderingsproblematiek');
      expect(html).toContain('Verhoogd funderingsrisico');
    });

    it('bevat alle thema secties', () => {
      const html = generateOmgevingsscanHTML(mockScanResult);
      
      // Planologie indicators now appear in the Planologisch kader section
      expect(html).toContain('Planologisch kader');
      expect(html).toContain('Natuur');
      expect(html).toContain('Bodem');
      expect(html).toContain('Milieu');
    });

    it('bevat indicator details', () => {
      const html = generateOmgevingsscanHTML(mockScanResult);
      
      // Bestemmingsplan is now in the planologisch kader section
      expect(html).toContain('Planologisch kader');
      expect(html).toContain('Natura 2000');
      expect(html).toContain('Geurzone');
      expect(html).toContain('Ruimtelijkeplannen.nl');
    });

    it('bevat de disclaimer', () => {
      const html = generateOmgevingsscanHTML(mockScanResult);
      
      expect(html).toContain('Disclaimer');
      expect(html).toContain('indicatief');
    });

    it('bevat locatie metadata', () => {
      const html = generateOmgevingsscanHTML(mockScanResult);
      
      expect(html).toContain('Hoorn');
      expect(html).toContain('1689 AA');
      expect(html).toContain('52.685600');
    });
  });

  describe('generateOmgevingsscanFilename', () => {
    it('genereert een bestandsnaam met adres en datum', () => {
      const filename = generateOmgevingsscanFilename('Dorpsstraat 1, Zwaag');
      
      expect(filename).toMatch(/^omgevingsscan_Dorpsstraat_1_Zwaag_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('sanitized speciale tekens', () => {
      const filename = generateOmgevingsscanFilename('Straat/Weg #5, Stad!');
      
      expect(filename).not.toContain('/');
      expect(filename).not.toContain('#');
      expect(filename).not.toContain('!');
      expect(filename).toMatch(/\.pdf$/);
    });

    it('beperkt de lengte van het adres', () => {
      const longAdres = 'Een hele lange straatnaam die veel te lang is voor een bestandsnaam en daarom ingekort moet worden';
      const filename = generateOmgevingsscanFilename(longAdres);
      
      // Totale lengte moet redelijk zijn
      expect(filename.length).toBeLessThan(80);
    });
  });
});
