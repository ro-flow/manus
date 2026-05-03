/**
 * Tests voor de PDF Generator Service
 */
import { describe, it, expect, vi } from 'vitest';
import { generateReportHTML, generateReportFilename } from './pdfGenerator';
import type { AnalysisResult } from './gemini';

// Mock AnalysisResult voor testen
const mockAnalysisResult: Partial<AnalysisResult> = {
  aanvraagSamenvatting: {
    bouwactiviteitType: 'uitbreiding',
    omschrijving: 'Bouwen van een uitbouw van 12m² aan de achterzijde',
    oppervlakteM2: 12,
    hoogteM: 3,
    breedteM: 4,
    diepteM: 3,
    locatieOpPerceel: 'achterzijde',
    beoogdGebruik: 'woonruimte',
    afmetingenBron: 'tekening'
  },
  toetsingskaders: [
    {
      naam: 'Omgevingsplan Hoorn',
      laag: 'gemeentelijk',
      relevant: true,
      toelichting: 'Toetsing aan omgevingsplan',
      juridischeStatus: 'normstellend',
      isBindend: true,
      isConcreetGenoeg: true
    }
  ],
  beleidsHierarchie: [
    {
      naam: 'Omgevingswet',
      laag: 'landelijk',
      relevant: true,
      toelichting: 'Landelijke regelgeving'
    }
  ],
  adviseurs: [],
  uitgeslotenBeleid: [],
  aandachtspunten: [],
  datumAnalyse: new Date('2026-01-28'),
  bronnen: ['Ruimtelijkeplannen.nl', 'BAG', 'PDOK'],
  omgevingsplanToets: {
    planNaam: 'Omgevingsplan Hoorn',
    planStatus: 'vastgesteld',
    geldendeBestemming: 'Wonen',
    toegestaanGebruik: ['wonen', 'aan-huis-verbonden beroep'],
    bouwregels: {
      maxBouwhoogte: '10 meter',
      maxGoothoogte: '6 meter',
      maxBebouwingspercentage: '60%'
    },
    passenBinnenBestemming: true,
    afwijkingNodig: false,
    relevantePlanregels: [
      {
        artikel: 'Artikel 4.2.1',
        inhoud: 'Maximale bouwhoogte hoofdgebouw',
        conclusie: 'voldoet',
        bronUrl: 'https://www.ruimtelijkeplannen.nl/viewer/view?planidn=NL.IMRO.0405.BPHoorn-VA01',
        planId: 'NL.IMRO.0405.BPHoorn-VA01'
      },
      {
        artikel: 'Artikel 4.2.2',
        inhoud: 'Maximale goothoogte',
        conclusie: 'voldoet'
      }
    ],
    dubbelbestemmingen: [
      {
        naam: 'Waarde - Archeologie',
        type: 'archeologie',
        artikelNummer: 'Artikel 12',
        adviesInstantie: 'Gemeentelijk archeoloog',
        aandachtspunten: ['Onderzoeksplicht bij bodemingreep > 30cm', 'Advies archeoloog vereist']
      }
    ]
  },
  locatieAnalyse: {
    adres: 'Grote Noord 7, 1621 KE Hoorn',
    kadastraalObject: 'HRN02-A-1234',
    omgevingsplanGebied: 'Binnenstad',
    bestemmingHuidig: 'Wonen',
    bijzondereGebieden: ['Beschermd stadsgezicht']
  },
  procedureBepaling: {
    isBinnenplans: true,
    isBOPA: false,
    isVergunningvrij: false,
    procedureType: 'REGULIER',
    procedureTermijn: 8,
    motivering: 'Reguliere procedure van toepassing'
  },
  activiteitenAnalyse: {
    expliciet: ['bouwen'],
    impliciet: [],
    totaal: ['bouwen']
  },
  graafwerkAnalyse: {
    heeftGraafwerk: true,
    graafdiepteCm: 60,
    oppervlakteM2: 12,
    diepteBron: 'schatting',
    oppervlakteBron: 'schatting',
    geschatteGraafdiepteCm: 60,
    geschatteOppervlakteM2: 12,
    indicatoren: ['Aanbouw/uitbouw (fundering)'],
    zekerheid: 'middel',
    toelichting: 'Graafwerk gedetecteerd voor fundering uitbouw',
    vrijstellingsCheck: {
      onderzoekVerplicht: false,
      reden: 'Graafwerk binnen vrijstellingsgrenzen',
      vrijstellingVanToepassing: true,
      vrijstellingsgrenzen: {
        diepteCm: 30,
        oppervlakteM2: 100,
        bron: 'Omgevingsplan Hoorn'
      }
    }
  }
};

describe('generateReportHTML', () => {
  it('should generate HTML with aanvraag samenvatting', () => {
    const html = generateReportHTML(
      mockAnalysisResult as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );
    
    expect(html).toContain('De Aanvraag');
    expect(html).toContain('uitbouw');
    expect(html).toContain('12 m²'); // Oppervlakte
  });

  it('should generate HTML with omgevingsplan toets', () => {
    const html = generateReportHTML(
      mockAnalysisResult as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );
    
    expect(html).toContain('Toets aan het Omgevingsplan');
    expect(html).toContain('Omgevingsplan Hoorn');
    expect(html).toContain('Wonen');
    expect(html).toContain('10 meter');
  });

  it('should include clickable links in planregels table', () => {
    const html = generateReportHTML(
      mockAnalysisResult as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );
    
    // Check for link to ruimtelijkeplannen.nl
    expect(html).toContain('ruimtelijkeplannen.nl');
    expect(html).toContain('NL.IMRO.0405.BPHoorn-VA01');
    expect(html).toContain('target="_blank"');
  });

  it('should include dubbelbestemmingen section', () => {
    const html = generateReportHTML(
      mockAnalysisResult as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );
    
    expect(html).toContain('Dubbelbestemmingen');
    expect(html).toContain('Waarde - Archeologie');
    expect(html).toContain('Gemeentelijk archeoloog');
  });

  it('should include vrijstellingscheck with comparison table', () => {
    const html = generateReportHTML(
      mockAnalysisResult as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );
    
    expect(html).toContain('Archeologische vrijstellingscheck');
    expect(html).toContain('Vrijstelling van toepassing');
    expect(html).toContain('60 cm'); // geschatte graafdiepte
    expect(html).toContain('≤ 30 cm'); // vrijstellingsgrens
  });

  it('should include graafwerk analyse', () => {
    const html = generateReportHTML(
      mockAnalysisResult as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );
    
    expect(html).toContain('Graafwerk Analyse');
    expect(html).toContain('Graafwerk gedetecteerd');
    expect(html).toContain('Aanbouw/uitbouw (fundering)');
  });
});

describe('generateReportHTML - haalbaarheidsschatting', () => {
  it('should include haalbaarheidsschatting section when present', () => {
    const resultWithHaalbaarheid = {
      ...mockAnalysisResult,
      haalbaarheidsschatting: {
        conclusie: 'haalbaar_met_voorwaarden' as const,
        score: 72,
        toelichting: 'De aanvraag is haalbaar mits aan de voorwaarden wordt voldaan.',
        positieveFactoren: ['Past binnen bestemmingsplan', 'Geen Natura 2000 nabijheid'],
        risicofactoren: ['Beschermd stadsgezicht', 'Welstandstoets vereist'],
        voorwaarden: ['Positief welstandsadvies vereist', 'Archeologisch onderzoek uitvoeren'],
        aanbevelingen: ['Dien welstandstekeningen in', 'Neem contact op met gemeentelijk archeoloog'],
      },
    };

    const html = generateReportHTML(
      resultWithHaalbaarheid as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );

    expect(html).toContain('Haalbaarheidsschatting');
    expect(html).toContain('HAALBAAR MET VOORWAARDEN');
    expect(html).toContain('72/100');
    expect(html).toContain('De aanvraag is haalbaar mits aan de voorwaarden wordt voldaan.');
    expect(html).toContain('Past binnen bestemmingsplan');
    expect(html).toContain('Beschermd stadsgezicht');
    expect(html).toContain('Positief welstandsadvies vereist');
    expect(html).toContain('Dien welstandstekeningen in');
  });

  it('should show correct styling for haalbaar conclusie', () => {
    const resultHaalbaar = {
      ...mockAnalysisResult,
      haalbaarheidsschatting: {
        conclusie: 'haalbaar' as const,
        score: 90,
        toelichting: 'De aanvraag voldoet aan alle eisen.',
        positieveFactoren: ['Voldoet aan bestemmingsplan'],
        risicofactoren: [],
        aanbevelingen: ['Geen aanvullende acties nodig'],
      },
    };

    const html = generateReportHTML(
      resultHaalbaar as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );

    expect(html).toContain('HAALBAAR');
    expect(html).toContain('90/100');
    expect(html).toContain('#dcfce7'); // green background
    expect(html).toContain('#22c55e'); // green border
  });

  it('should show correct styling for niet_haalbaar conclusie', () => {
    const resultNietHaalbaar = {
      ...mockAnalysisResult,
      haalbaarheidsschatting: {
        conclusie: 'niet_haalbaar' as const,
        score: 10,
        toelichting: 'De aanvraag is in strijd met het bestemmingsplan.',
        positieveFactoren: [],
        risicofactoren: ['Strijdig met bestemmingsplan', 'Geen afwijkingsmogelijkheid'],
        aanbevelingen: ['Overleg met gemeente over alternatieven'],
      },
    };

    const html = generateReportHTML(
      resultNietHaalbaar as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );

    expect(html).toContain('NIET HAALBAAR');
    expect(html).toContain('10/100');
    expect(html).toContain('#fee2e2'); // red background
    expect(html).toContain('#dc2626'); // red border
  });

  it('should not include haalbaarheidsschatting section when absent', () => {
    const html = generateReportHTML(
      mockAnalysisResult as AnalysisResult,
      'Hoorn',
      'Test Behandelaar'
    );

    expect(html).not.toContain('Haalbaarheidsschatting');
  });
});

describe('generateReportFilename', () => {
  it('should generate valid filename with zaaknummer', () => {
    const filename = generateReportFilename('Z-2024-001234');
    
    expect(filename).toContain('Z-2024-001234');
    expect(filename).toContain('.pdf');
    expect(filename).toMatch(/behandelrapport_.*_\d{4}-\d{2}-\d{2}\.pdf$/); // Filename format
  });

  it('should sanitize special characters in zaaknummer', () => {
    const filename = generateReportFilename('Z/2024\\001234');
    
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('\\');
    expect(filename).toContain('Z_2024_001234');
  });
});
