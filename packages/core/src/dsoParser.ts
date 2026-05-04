// DSO/OLO XML parser — runs without AI.
// Activiteiten en locatie komen rechtstreeks uit de XML-structuur van het Omgevingsloket.
// NAW wordt hier ook geëxtraheerd (geen AI betrokken).

import type { NawExtractie } from './extractie.js';

export interface DsoExtractieResultaat {
  gemeente?: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  locatieContext?: string;
  naw: NawExtractie;
  methode: 'dso_xml';
}

// Probeert meerdere tag-varianten en geeft de eerste niet-lege match terug.
// Handelt zowel <Tag>waarde</Tag> als <ns:Tag>waarde</ns:Tag> af.
function tag(xml: string, ...names: string[]): string | undefined {
  for (const name of names) {
    const re = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${name}[^>]*>([^<]{1,500})<\\/(?:[a-zA-Z0-9_]+:)?${name}>`, 'i');
    const m = xml.match(re);
    const val = m?.[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (val && val.length > 0) return val;
  }
  return undefined;
}

// Normaliseert OLO activiteitstype naar onze interne waarden
const ACTIVITEIT_MAP: Record<string, string> = {
  bouwen:    'bouwen',  verbouwen: 'bouwen',  oprichten:  'bouwen',
  slopen:    'slopen',  sloop:     'slopen',
  kappen:    'kappen',  vellen:    'kappen',  rooien: 'kappen',
  uitweg:    'uitweg',  inrit:     'uitweg',
  reclame:   'reclame', reclamebord: 'reclame',
  milieu:    'milieu',  milieubelastende: 'milieu',
  afwijken:  'afwijken bestemmingsplan',
  bestemmingsplan: 'afwijken bestemmingsplan',
};

function normaliseerActiviteit(raw?: string): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(ACTIVITEIT_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw.length < 80 ? raw : undefined;
}

export function parseDsoXml(xml: string): DsoExtractieResultaat {
  // Gemeente
  const gemeente = tag(xml,
    'GemeenteNaam', 'gemeenteNaam', 'Gemeente', 'gemeente',
    'municipalityName', 'NaamGemeente', 'bevoegdGezag'
  );

  // Activiteitstype — probeer zowel typeaanduiding als vrije tekst
  const rawActiviteit = tag(xml,
    'TypeActiviteit', 'typeActiviteit', 'activiteittype', 'ActiviteitType',
    'Activiteit', 'activiteit', 'NaamActiviteit', 'activiteitNaam',
    'ActivityType', 'toestemming', 'vergunningsoort'
  );
  const activiteitType = normaliseerActiviteit(rawActiviteit);

  // Omschrijving
  const activiteitOmschrijving = tag(xml,
    'Omschrijving', 'omschrijving', 'Beschrijving', 'beschrijving',
    'ActiviteitOmschrijving', 'projectOmschrijving', 'toelichting',
    'description', 'ProjectBeschrijving'
  );

  // Locatiecontext (geen NAW)
  const locatieContext = tag(xml,
    'LocatieOmschrijving', 'locatieOmschrijving', 'locatieomschrijving',
    'adresAanvraag', 'Locatie', 'projectLocatie', 'Perceelgegevens',
    'kadastralePlaatsaanduiding'
  );

  // NAW — volledig client-side, nooit naar AI
  const naam = tag(xml,
    'NaamAanvrager', 'naamAanvrager', 'Naam', 'naam', 'aanvragerNaam',
    'ContactNaam', 'contactNaam', 'GemachtigdeNaam'
  );
  const email = tag(xml,
    'EmailAanvrager', 'emailAanvrager', 'Email', 'email',
    'EmailAdres', 'emailadres', 'ContactEmail'
  );
  const telefoon = tag(xml,
    'TelefoonAanvrager', 'telefoonAanvrager', 'Telefoon', 'telefoon',
    'Telefoonnummer', 'telefoonnummer', 'ContactTelefoon', 'TelefonummerAanvrager'
  );
  const adres = tag(xml,
    'AdresAanvrager', 'adresAanvrager', 'Straat', 'straat',
    'StraatnaamHuisnummer', 'straatHuisnummer', 'Adres', 'adres'
  );
  const postcode = tag(xml, 'Postcode', 'postcode', 'PostcodeAanvrager');
  const woonplaats = tag(xml,
    'WoonplaatsAanvrager', 'woonplaatsAanvrager', 'Woonplaats', 'woonplaats',
    'Plaatsnaam', 'plaatsnaam', 'Stad', 'stad'
  );

  return {
    gemeente,
    activiteitType,
    activiteitOmschrijving,
    locatieContext,
    naw: { naam, email, telefoon, adres, postcode, woonplaats },
    methode: 'dso_xml',
  };
}
