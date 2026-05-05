import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { BestemmingsplanToetsResultaat } from '@ro-flow/core';

const ML = 60, MR = 60, MT = 50, MB = 60;
const PW = 595.28;
const PH = 841.89;
const CW = PW - ML - MR;

const C = {
  blue:     '#1e3a5f',
  red:      '#c53030',
  orange:   '#c05621',
  green:    '#276749',
  grayBg:   '#f8fafc',
  grayLine: '#e2e8f0',
  text:     '#1a202c',
  muted:    '#4a5568',
};

function procedureLabel(p: string): string {
  const m: Record<string, string> = {
    regulier:            'Reguliere procedure',
    uitgebreid:          'Uitgebreide procedure',
    vergunningvrij:      'Vergunningvrij',
    meldingsplichtig:    'Meldingsplichtig',
    regulier_8weken:     'Regulier (8 weken)',
    regulier_12weken:    'Regulier (12 weken)',
    bopa_regulier:       'BOPA — Regulier',
    bopa_uitgebreid:     'BOPA — Uitgebreid',
    uitgebreid_verplicht:'Uitgebreid (verplicht)',
  };
  return m[p] ?? p;
}

export interface BehandelrapportPdfData {
  gegenereerd: string;
  aanvraag: {
    id: string;
    gemeente: string;
    activiteitType?: string | null;
    activiteitOmschrijving?: string | null;
    aanvraagnummer?: string | null;
    aanvraagdatum?: string | null;
    status: string;
  };
  procedure: { procedure: string; doorlooptijd: string; toelichting: string };
  volledigheid: {
    volledig: boolean;
    aantalVerplichtOntbrekend: number;
    samenvatting: string;
  };
  activiteitenSamenvatting: {
    kadastraleAanduiding: string;
    activiteiten: string[];
    ingediendeDocs: number;
    bouwjaar?: string | number | null;
  }[];
  bestemmingsplanToets: BestemmingsplanToetsResultaat[] | null;
  isBopa: boolean;
  aandachtspunten: string[];
  bronnen: { naam: string; geraadpleegd: string }[];
  voorbehoud: string;
}

function needsNewPage(doc: PDFKit.PDFDocument, h: number): void {
  if (doc.y + h > PH - MB) doc.addPage();
}

function hr(doc: PDFKit.PDFDocument): void {
  doc.rect(ML, doc.y + 10, CW, 0.5).fill(C.grayLine);
  doc.y = doc.y + 18;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  needsNewPage(doc, 30);
  hr(doc);
  doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
    .text(title.toUpperCase(), ML, doc.y, { width: CW, characterSpacing: 0.7 });
  doc.moveDown(0.4);
}

export function streamBehandelrapportPdf(data: BehandelrapportPdfData, res: Response): void {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MT, bottom: MB, left: ML, right: MR },
    bufferPages: false,
  });

  const bestandsnaam = `behandelrapport-${data.aanvraag.gemeente
    .replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${data.aanvraag.id.slice(0, 8)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${bestandsnaam}"`);
  doc.pipe(res);

  // ── HEADER ────────────────────────────────────────────────────────────────
  const hdrH = 68;
  const hdrY = MT - 15;
  doc.rect(ML - 10, hdrY, CW + 20, hdrH).fill(C.blue);

  // INTERN badge (red)
  doc.rect(ML + CW - 82, hdrY + 10, 82, 22).fill(C.red);
  doc.fontSize(8).fillColor('white').font('Helvetica-Bold')
    .text('INTERN', ML + CW - 82, hdrY + 16, { width: 82, align: 'center', lineBreak: false });

  // Title
  doc.fontSize(20).fillColor('white').font('Helvetica-Bold')
    .text('BEHANDELRAPPORT', ML, hdrY + 12, { lineBreak: false });
  doc.fontSize(7.5).fillColor('#bee3f8').font('Helvetica')
    .text('Niet voor aanvrager bestemd', ML, hdrY + 38, { lineBreak: false });

  doc.y = hdrY + hdrH + 14;

  // ── METADATA ──────────────────────────────────────────────────────────────
  doc.fontSize(15).fillColor(C.text).font('Helvetica-Bold').text(data.aanvraag.gemeente);
  doc.fontSize(10).fillColor(C.muted).font('Helvetica')
    .text(data.aanvraag.activiteitType ?? 'Omgevingsvergunning');

  const meta: string[] = [];
  if (data.aanvraag.aanvraagnummer) meta.push(`Nr. ${data.aanvraag.aanvraagnummer}`);
  if (data.aanvraag.aanvraagdatum) meta.push(`Datum aanvraag: ${data.aanvraag.aanvraagdatum}`);
  meta.push(`Rapport gegenereerd: ${new Date(data.gegenereerd).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`);
  doc.fontSize(8).fillColor(C.muted).text(meta.join('  ·  '));

  doc.moveDown(0.8);

  // ── CONCLUSIESTRIP ────────────────────────────────────────────────────────
  const bxW = (CW - 8) / 3;
  const bxH = 54;
  const bxY = doc.y;

  function drawBox(
    x: number, label: string, value: string,
    valueColor: string, bg: string,
  ): void {
    doc.rect(x, bxY, bxW, bxH).fill(bg);
    doc.fontSize(7).fillColor(C.muted).font('Helvetica')
      .text(label, x + 8, bxY + 8, { width: bxW - 16, lineBreak: false });
    doc.fontSize(10).fillColor(valueColor).font('Helvetica-Bold')
      .text(value, x + 8, bxY + 24, { width: bxW - 16 });
  }

  drawBox(ML,              'PROCEDURE',   procedureLabel(data.procedure.procedure), C.blue, C.grayBg);
  drawBox(ML + bxW + 4,    'DOORLOOPTIJD', data.procedure.doorlooptijd,              C.text, C.grayBg);

  const vLabel = data.volledigheid.volledig
    ? 'Volledig'
    : `${data.volledigheid.aantalVerplichtOntbrekend} stuk(ken) ontbreekt`;
  const vColor = data.volledigheid.volledig ? C.green : C.red;
  const vBg    = data.volledigheid.volledig ? '#f0fff4' : '#fff5f5';
  drawBox(ML + (bxW + 4) * 2, 'VOLLEDIGHEID', vLabel, vColor, vBg);

  doc.y = bxY + bxH + 14;

  // ── BOPA ──────────────────────────────────────────────────────────────────
  if (data.isBopa) {
    needsNewPage(doc, 52);
    const bY = doc.y;
    const bH = 46;
    doc.rect(ML,     bY, CW, bH).fill('#fffaf0');
    doc.rect(ML,     bY,  4, bH).fill(C.orange);
    doc.fontSize(9).fillColor(C.orange).font('Helvetica-Bold')
      .text('BOPA — Buitenplanse Omgevingsplanactiviteit', ML + 12, bY + 8, { width: CW - 20, lineBreak: false });
    doc.fontSize(8).fillColor(C.muted).font('Helvetica')
      .text(
        'Activiteit wijkt af van het omgevingsplan. Beoordeel of reguliere of uitgebreide procedure ' +
        'van toepassing is (art. 16.62 / 16.65 Omgevingswet).',
        ML + 12, bY + 24, { width: CW - 20 },
      );
    doc.y = bY + bH + 12;
  }

  // ── AANDACHTSPUNTEN ───────────────────────────────────────────────────────
  if (data.aandachtspunten.length > 0) {
    sectionTitle(doc, 'Aandachtspunten');
    for (let i = 0; i < data.aandachtspunten.length; i++) {
      needsNewPage(doc, 30);
      const ptY = doc.y;
      doc.fontSize(9).fillColor(C.orange).font('Helvetica-Bold')
        .text(`${i + 1}.`, ML, ptY, { width: 18, lineBreak: false });
      doc.fontSize(9).fillColor(C.text).font('Helvetica')
        .text(data.aandachtspunten[i], ML + 20, ptY, { width: CW - 20 });
      doc.moveDown(0.3);
    }
  }

  // ── PROCEDURE TOELICHTING ─────────────────────────────────────────────────
  sectionTitle(doc, 'Procedure-inschatting');
  needsNewPage(doc, 40);
  doc.fontSize(8.5).fillColor(C.text).font('Helvetica')
    .text(data.procedure.toelichting, { width: CW });

  // ── BESTEMMINGSPLANTOETS ──────────────────────────────────────────────────
  if (data.bestemmingsplanToets && data.bestemmingsplanToets.length > 0) {
    sectionTitle(doc, 'Bestemmingsplantoets per perceel');
    for (const t of data.bestemmingsplanToets) {
      needsNewPage(doc, 55);
      const rY = doc.y;

      const sColor = !t.pdokBereikbaar ? C.muted : t.afwijkingGesignaleerd ? C.orange : C.green;
      const sLabel = !t.pdokBereikbaar
        ? 'PDOK niet bereikbaar'
        : t.afwijkingGesignaleerd ? 'Afwijking gesignaleerd' : 'Past binnen plan';

      doc.fontSize(9).fillColor(C.text).font('Helvetica-Bold')
        .text(t.kadastraleAanduiding, ML, rY, { width: CW * 0.55, lineBreak: false });
      doc.fontSize(8.5).fillColor(sColor).font('Helvetica-Bold')
        .text(sLabel, ML + CW * 0.55, rY, { width: CW * 0.45, align: 'right', lineBreak: false });
      doc.y = rY + 14;

      const details: string[] = [];
      if (t.bestemmingsplan) details.push(`${t.bestemmingsplan.naam} · vastgesteld ${t.bestemmingsplan.vastgesteld}`);
      if (t.enkelbestemming.length > 0) details.push(`Bestemming: ${t.enkelbestemming.join(', ')}`);
      if (t.dubbelbestemming.length > 0) details.push(`Dubbelbestemming: ${t.dubbelbestemming.join(', ')}`);
      if (t.gebiedsaanduidingen.length > 0) details.push(`Gebiedsaanduidingen: ${t.gebiedsaanduidingen.join(', ')}`);

      for (const d of details) {
        doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
          .text(d, ML, doc.y, { width: CW });
      }
      if (t.afwijkingToelichting) {
        doc.fontSize(7.5).fillColor(C.orange).font('Helvetica-Oblique')
          .text(t.afwijkingToelichting, ML, doc.y, { width: CW });
      }

      doc.rect(ML, doc.y + 6, CW, 0.5).fill(C.grayLine);
      doc.y = doc.y + 14;
    }
  }

  // ── ACTIVITEITEN PER PERCEEL ──────────────────────────────────────────────
  if (data.activiteitenSamenvatting.length > 0) {
    sectionTitle(doc, 'Activiteiten per perceel');
    for (const a of data.activiteitenSamenvatting) {
      needsNewPage(doc, 30);
      doc.fontSize(9).fillColor(C.text).font('Helvetica-Bold')
        .text(a.kadastraleAanduiding, { width: CW });
      if (a.activiteiten.length > 0) {
        doc.fontSize(8).fillColor(C.muted).font('Helvetica')
          .text(a.activiteiten.join(', '), { width: CW });
      }
      if (a.ingediendeDocs > 0) {
        doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
          .text(`${a.ingediendeDocs} document(en) ingediend`, { width: CW });
      }
      doc.moveDown(0.4);
    }
  }

  // ── VOLLEDIGHEID SAMENVATTING ─────────────────────────────────────────────
  sectionTitle(doc, 'Volledigheid');
  needsNewPage(doc, 30);
  doc.fontSize(8.5).fillColor(C.text).font('Helvetica')
    .text(data.volledigheid.samenvatting, { width: CW });

  // ── BRONNEN ───────────────────────────────────────────────────────────────
  if (data.bronnen.length > 0) {
    sectionTitle(doc, 'Geraadpleegde bronnen');
    for (const b of data.bronnen) {
      needsNewPage(doc, 18);
      const bY = doc.y;
      doc.fontSize(8).fillColor(C.text).font('Helvetica')
        .text(b.naam, ML, bY, { width: CW * 0.65, lineBreak: false });
      doc.fontSize(8).fillColor(C.muted).font('Helvetica')
        .text(b.geraadpleegd, ML + CW * 0.65, bY, { width: CW * 0.35, align: 'right', lineBreak: false });
      doc.y = bY + 16;
    }
  }

  // ── VOORBEHOUD ────────────────────────────────────────────────────────────
  doc.moveDown(1);
  needsNewPage(doc, 50);
  doc.rect(ML, doc.y, CW, 0.5).fill(C.grayLine);
  doc.y = doc.y + 10;
  doc.fontSize(7.5).fillColor(C.muted).font('Helvetica-Oblique')
    .text(data.voorbehoud, { width: CW });

  doc.end();
}
