import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';

const FONT = 'Calibri';
const SIZE_NORMAL = 22;   // 11pt in half-points
const SIZE_SMALL  = 20;   // 10pt

function isSubjectLine(line: string): boolean {
  return /^(onderwerp|betreft|kenmerk|zaaknummer):/i.test(line.trim());
}

function parseBriefToParagraphs(tekst: string): Paragraph[] {
  const blokken = tekst.split(/\n\n+/);
  const resultaat: Paragraph[] = [];

  for (const blok of blokken) {
    const regels = blok.split('\n');
    const runs: TextRun[] = [];

    for (let i = 0; i < regels.length; i++) {
      const regel = regels[i];
      const isBold = isSubjectLine(regel);

      if (i > 0) runs.push(new TextRun({ break: 1 }));
      runs.push(new TextRun({
        text: regel,
        font: FONT,
        size: SIZE_NORMAL,
        bold: isBold,
      }));
    }

    if (runs.length > 0) {
      resultaat.push(new Paragraph({
        children: runs,
        spacing: { after: 160 },
      }));
    }
  }

  return resultaat;
}

export async function generateBriefDocx(
  briefTekst: string,
  gemeente: string,
  aanvraagnummer?: string | null,
): Promise<Buffer> {
  const voetnoot = new Paragraph({
    children: [
      new TextRun({
        text: `Dit document is gegenereerd door RO-flow ter ondersteuning van de behandeling door gemeente ${gemeente}.`,
        font: FONT,
        size: SIZE_SMALL,
        color: '888888',
        italics: true,
      }),
    ],
    spacing: { before: 600 },
  });

  const kinderen: Paragraph[] = [
    ...parseBriefToParagraphs(briefTekst),
    voetnoot,
  ];

  const doc = new Document({
    creator: 'RO-flow',
    title: `Ontvangstbevestiging${aanvraagnummer ? ` – ${aanvraagnummer}` : ''} – ${gemeente}`,
    description: 'Gegenereerd door RO-flow',
    sections: [{
      properties: {},
      children: kinderen,
    }],
  });

  return Packer.toBuffer(doc);
}
