// Inschatting welke omgevingsvergunningprocedure van toepassing is.

export type ProcedureType =
  | 'regulier'          // Reguliere procedure: max. 8 weken
  | 'uitgebreid'        // Uitgebreide procedure: max. 26 weken
  | 'vergunningvrij'    // Geen vergunning nodig
  | 'meldingsplichtig'; // Melding vereist, geen vergunning

export interface ProcedureResultaat {
  procedure: ProcedureType;
  doorlooptijd: string;
  toelichting: string;
}

// Activiteiten die altijd uitgebreide procedure vereisen
const UITGEBREIDE_PROCEDURE_ACTIVITEITEN = [
  'milieu', 'natura2000', 'rijksmonument', 'beschermd stads', 'beschermd dorps',
  'stedelijk vernieuwingsproject', 'buitenplanse afwijking',
];

// Activiteiten die vergunningvrij kunnen zijn
const VERGUNNINGVRIJ_ACTIVITEITEN = [
  'dakkapel achterkant', 'kozijn vervangen', 'tuinmuur', 'erfafscheiding achtertuin',
  'zonnepanelen dak', 'kleine aanbouw', 'carport achtertuin',
];

export function bepaalProcedure(activiteitType?: string | null): ProcedureResultaat {
  const type = (activiteitType ?? '').toLowerCase();

  if (VERGUNNINGVRIJ_ACTIVITEITEN.some((a) => type.includes(a))) {
    return {
      procedure: 'vergunningvrij',
      doorlooptijd: 'Niet van toepassing',
      toelichting: 'Deze activiteit is vergunningvrij onder het Bbl. Raadpleeg altijd de gemeente voor definitieve bevestiging.',
    };
  }

  if (UITGEBREIDE_PROCEDURE_ACTIVITEITEN.some((a) => type.includes(a))) {
    return {
      procedure: 'uitgebreid',
      doorlooptijd: 'Maximaal 26 weken (verlengbaar met 6 weken)',
      toelichting: 'Voor deze activiteit geldt de uitgebreide procedure van de Wet algemene bepalingen omgevingsrecht.',
    };
  }

  return {
    procedure: 'regulier',
    doorlooptijd: 'Maximaal 8 weken (verlengbaar met 6 weken)',
    toelichting: 'Voor deze activiteit geldt de reguliere procedure.',
  };
}
