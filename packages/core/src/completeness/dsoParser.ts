/**
 * packages/core/src/completeness/dsoParser.ts
 *
 * Parseert DSO verzoekXML en labelt documenten met DocType enum.
 * Extraheert activiteiten, percelen, bouwjaar, gebruiksdoel
 * rechtstreeks uit de XML — geen AI nodig voor DSO bestanden.
 *
 * Gebaseerd op DSO verzoekXML formaat (Omgevingsloket v4.0.1)
 */

import type { DocType, Activiteit, IngediendDoc, PerceelInput } from './checkCompleteness.js';

// ============================================================
// DSO ACTIVITEIT ID → INTERN TYPE MAPPING
// ============================================================

const DSO_ACTIVITEIT_MAP: Record<string, Activiteit> = {
  'nl.imow-mnre1034.activiteit.bouwen':                     'bouwen',
  'nl.imow-mnre1034.activiteit.bouwactiviteit':             'bouwen',
  'nl.imow-mnre1034.activiteit.slopen':                     'slopen',
  'nl.imow-mnre1034.activiteit.sloopactiviteit':            'slopen',
  'nl.imow-mnre1034.activiteit.vellen':                     'kappen',
  'nl.imow-mnre1034.activiteit.kapactiviteit':              'kappen',
  'nl.imow-mnre1034.activiteit.milieubelastendeactiviteit': 'milieu',
  'nl.imow-mnre1034.activiteit.milieu':                     'milieu',
  'nl.imow-mnre1034.activiteit.aanleggen':                  'aanleggen',
  'nl.imow-mnre1034.activiteit.aanlegactiviteit':           'aanleggen',
  'nl.imow-mnre1034.activiteit.uitweg':                     'uitweg',
  'nl.imow-mnre1034.activiteit.inritactiviteit':            'uitweg',
  'nl.imow-mnre1034.activiteit.bopa':                       'bopa',
  'nl.imow-mnre1034.activiteit.buitenplansomgevingsplan':   'bopa',
  'nl.imow-mnre1034.activiteit.monument':                   'monument',
  'nl.imow-mnre1034.activiteit.monumentactiviteit':         'monument',
  'nl.imow-mnre1034.activiteit.functiewijziging':           'functiewijziging',
  'nl.imow-mnre1034.activiteit.gebruiksactiviteit':         'functiewijziging',
};

// ============================================================
// BESTANDSNAAM → DOCTYPE MAPPING
// ============================================================

const BESTANDSNAAM_PATRONEN: Array<{ patronen: RegExp[]; type: DocType }> = [
  { patronen: [/situatie.*tekening/i, /situatietekening/i, /situatie.*1.?1000/i, /inrichtingstekening/i, /liggingskaart/i],                 type: 'situatietekening' },
  { patronen: [/plattegrond/i, /plattegronden/i, /doorsnede/i, /vloerplan/i],                                                               type: 'plattegrond' },
  { patronen: [/gevel.*tekening/i, /geveltekening/i, /gevelaanzicht/i, /aanzicht/i, /facade/i],                                             type: 'geveltekening' },
  { patronen: [/constructie.*tekening/i, /constructietekening/i, /constructie.*berekening/i, /constructief/i, /sterkte.*berekening/i],      type: 'constructietekening' },
  { patronen: [/oppervlakte.*berekening/i, /berekening.*oppervlakte/i, /inhoud.*berekening/i, /m2.*berekening/i, /m3.*berekening/i],        type: 'berekening_oppervlakte' },
  { patronen: [/asbest/i, /asbestinventarisatie/i, /sc.?540/i, /asbest.*rapport/i],                                                         type: 'asbestrapport' },
  { patronen: [/sloopveiligheid/i, /sloop.*veiligheid/i, /veiligheidsplan.*sloop/i],                                                        type: 'sloopveiligheidsplan' },
  { patronen: [/akoestisch/i, /akoestiek/i, /geluid.*rapport/i, /geluidsrapport/i, /geluidsmeting/i],                                       type: 'akoestisch_rapport' },
  { patronen: [/ruimtelijke.*onderbouwing/i, /onderbouwing.*ruimtelijk/i, /ro.*onderbouwing/i],                                             type: 'ruimtelijke_onderbouwing' },
  { patronen: [/redengevende.*omschrijving/i, /monumenten.*omschrijving/i, /redengevend/i],                                                 type: 'redengevende_omschrijving' },
  { patronen: [/foto.*rapport/i, /fotorapportage/i, /foto.*verslag/i, /beeldrapport/i],                                                     type: 'fotorapportage' },
  { patronen: [/kap.*motivering/i, /motivering.*kap/i, /kap.*verzoek/i, /velverzoek/i],                                                    type: 'motivering_kapverzoek' },
  { patronen: [/boom.*gegevens/i, /boomsoort/i, /boomopgave/i, /stamomvang/i, /boomdata/i],                                                type: 'boomgegevens' },
  { patronen: [/milieu.*beschrijving/i, /bedrijfsbeschrijving/i, /activiteiten.*beschrijving/i, /milieu.*aanvraag/i],                       type: 'milieubeschrijving' },
  { patronen: [/emissie.*rapport/i, /emissierapport/i, /emissie.*berekening/i, /luchtemissie/i, /wateremissie/i],                          type: 'emissierapport' },
  { patronen: [/afwijking.*motivering/i, /motivering.*afwijking/i, /bopa.*motivering/i],                                                    type: 'motivering_afwijking' },
  { patronen: [/functie.*wijziging/i, /gebruikswijziging/i, /motivering.*gebruik/i],                                                        type: 'motivering_functiewijziging' },
  { patronen: [/technische.*beschrijving/i, /uitweg.*beschrijving/i, /inrit.*beschrijving/i],                                               type: 'technische_beschrijving' },
  { patronen: [/activiteit.*beschrijving/i, /beschrijving.*activiteit/i, /projectbeschrijving/i, /toelichting.*aanvraag/i],                 type: 'beschrijving_activiteit' },
];

export function labeleerDocument(bestandsnaam: string): DocType | null {
  const naam = bestandsnaam.toLowerCase().replace(/[_\-.]/g, ' ');
  for (const { patronen, type } of BESTANDSNAAM_PATRONEN) {
    for (const patroon of patronen) {
      if (patroon.test(naam)) return type;
    }
  }
  return null;
}

export function verwerkDocumenten(bestandsnamen: string[]): IngediendDoc[] {
  const result: IngediendDoc[] = [];
  for (const naam of bestandsnamen) {
    const type = labeleerDocument(naam);
    if (!type) {
      console.warn(`Onbekend documenttype voor bestand: ${naam} — wordt genegeerd in volledigheidscheck`);
      continue;
    }
    result.push({ type, bestandsnaam: naam });
  }
  return result;
}

// ============================================================
// DSO XML PARSER
// ============================================================

export interface DSOParseResultaat {
  percelen: PerceelInput[];
  aanvrager: {
    naam: string | null;
    email: string | null;
    telefoon: string | null;
    adres: string | null;
  };
  aanvraagtype: 'formeel' | 'concept';
  zaaknummer: string | null;
  datumIndiening: string | null;
  gemeente: string | null;
}

export function parseerDSOXml(xmlTekst: string): DSOParseResultaat {
  const resultaat: DSOParseResultaat = {
    percelen: [],
    aanvrager: { naam: null, email: null, telefoon: null, adres: null },
    aanvraagtype: 'formeel',
    zaaknummer: null,
    datumIndiening: null,
    gemeente: null,
  };

  resultaat.zaaknummer =
    extractXmlWaarde(xmlTekst, 'kenmerk') ||
    extractXmlWaarde(xmlTekst, 'zaaknummer') ||
    extractXmlWaarde(xmlTekst, 'referentienummer');

  resultaat.datumIndiening =
    extractXmlWaarde(xmlTekst, 'datumTijdstip') ||
    extractXmlWaarde(xmlTekst, 'datum');

  resultaat.gemeente =
    extractXmlWaarde(xmlTekst, 'gemeente') ||
    extractXmlWaarde(xmlTekst, 'bevoegdGezag') ||
    extractXmlWaarde(xmlTekst, 'behandelendGezag');

  const verzoekType = extractXmlWaarde(xmlTekst, 'verzoekType') || '';
  resultaat.aanvraagtype = verzoekType.toLowerCase().includes('concept') ? 'concept' : 'formeel';

  // NAW — extraheer maar stuur NOOIT naar AI
  resultaat.aanvrager = {
    naam: extractXmlWaarde(xmlTekst, 'naam') || extractXmlWaarde(xmlTekst, 'volledigeNaam'),
    email: extractXmlWaarde(xmlTekst, 'emailadres') || extractXmlWaarde(xmlTekst, 'email'),
    telefoon: extractXmlWaarde(xmlTekst, 'telefoonnummer') || extractXmlWaarde(xmlTekst, 'telefoon'),
    adres: extractXmlWaarde(xmlTekst, 'adres') || extractXmlWaarde(xmlTekst, 'straatnaam'),
  };

  const perceelBlokken =
    extractXmlBlokken(xmlTekst, 'locatie') ||
    extractXmlBlokken(xmlTekst, 'perceel') ||
    [];

  if (perceelBlokken.length === 0) {
    resultaat.percelen = [bouwPerceelVanHoofdaanvraag(xmlTekst)];
  } else {
    resultaat.percelen = perceelBlokken.map((blok, index) =>
      bouwPerceel(blok, xmlTekst, index)
    );
  }

  return resultaat;
}

function bouwPerceelVanHoofdaanvraag(xmlTekst: string): PerceelInput {
  return {
    id: 'perceel-1',
    kadastraleAanduiding:
      extractKadastraalNummer(xmlTekst) ||
      extractXmlWaarde(xmlTekst, 'kadastraleAanduiding') ||
      'Onbekend',
    postcode: extractXmlWaarde(xmlTekst, 'postcode') ?? undefined,
    huisnummer: extractXmlWaarde(xmlTekst, 'huisnummer') ?? undefined,
    huisletter: extractXmlWaarde(xmlTekst, 'huisletter') ?? undefined,
    activiteiten: extractActiviteiten(xmlTekst),
    ingediendeDocs: extractDocumenten(xmlTekst),
    bouwjaar: extractBouwjaar(xmlTekst),
    gebruiksdoel: extractGebruiksdoel(xmlTekst),
    oppervlakte: extractOppervlakte(xmlTekst),
  };
}

function bouwPerceel(perceelXml: string, volledigeXml: string, index: number): PerceelInput {
  const activiteiten =
    extractActiviteiten(perceelXml).length > 0
      ? extractActiviteiten(perceelXml)
      : extractActiviteiten(volledigeXml);

  return {
    id: `perceel-${index + 1}`,
    kadastraleAanduiding:
      extractKadastraalNummer(perceelXml) ||
      extractXmlWaarde(perceelXml, 'kadastraleAanduiding') ||
      `Perceel ${index + 1}`,
    postcode: extractXmlWaarde(perceelXml, 'postcode') ?? undefined,
    huisnummer: extractXmlWaarde(perceelXml, 'huisnummer') ?? undefined,
    activiteiten,
    ingediendeDocs: extractDocumenten(volledigeXml),
    bouwjaar: extractBouwjaar(perceelXml) ?? extractBouwjaar(volledigeXml),
    gebruiksdoel: extractGebruiksdoel(perceelXml).length > 0
      ? extractGebruiksdoel(perceelXml)
      : extractGebruiksdoel(volledigeXml),
    oppervlakte: extractOppervlakte(perceelXml) ?? extractOppervlakte(volledigeXml),
  };
}

function extractActiviteiten(xml: string): Activiteit[] {
  const activiteiten: Activiteit[] = [];
  const gevonden = new Set<Activiteit>();

  const idMatches = xml.matchAll(/<activiteitId[^>]*>([^<]+)<\/activiteitId>/gi);
  for (const match of idMatches) {
    const id = match[1].trim();
    const type = DSO_ACTIVITEIT_MAP[id];
    if (type && !gevonden.has(type)) { activiteiten.push(type); gevonden.add(type); }
  }

  if (activiteiten.length === 0) {
    const naamMatches = xml.matchAll(/<activiteitNaam[^>]*>([^<]+)<\/activiteitNaam>/gi);
    for (const match of naamMatches) {
      const type = mapActiviteitNaam(match[1].trim().toLowerCase());
      if (type && !gevonden.has(type)) { activiteiten.push(type); gevonden.add(type); }
    }
  }

  return activiteiten.length > 0 ? activiteiten : ['overig'];
}

function mapActiviteitNaam(naam: string): Activiteit | null {
  if (/bouw/.test(naam))             return 'bouwen';
  if (/sloop/.test(naam))            return 'slopen';
  if (/kap|vel/.test(naam))          return 'kappen';
  if (/milieu|mba/.test(naam))       return 'milieu';
  if (/aanleg/.test(naam))           return 'aanleggen';
  if (/uitweg|inrit/.test(naam))     return 'uitweg';
  if (/bopa|buitenplan/.test(naam))  return 'bopa';
  if (/monument/.test(naam))         return 'monument';
  if (/functie|gebruik/.test(naam))  return 'functiewijziging';
  return null;
}

function extractDocumenten(xml: string): IngediendDoc[] {
  const bestandsnamen: string[] = [];
  const matches = xml.matchAll(
    /<(?:bestandsnaam|fileName|documentNaam|bijlageNaam)[^>]*>([^<]+)<\/(?:bestandsnaam|fileName|documentNaam|bijlageNaam)>/gi
  );
  for (const match of matches) bestandsnamen.push(match[1].trim());
  return verwerkDocumenten(bestandsnamen);
}

function extractBouwjaar(xml: string): number | null {
  const waarde =
    extractXmlWaarde(xml, 'bouwjaar') ||
    extractXmlWaarde(xml, 'oorspronkelijkBouwjaar') ||
    extractXmlWaarde(xml, 'bouwdatum');
  if (!waarde) return null;
  const jaar = parseInt(waarde.substring(0, 4));
  return isNaN(jaar) ? null : jaar;
}

function extractGebruiksdoel(xml: string): string[] {
  const doelen: string[] = [];
  const matches = xml.matchAll(/<(?:gebruiksdoel|gebruikstype)[^>]*>([^<]+)<\/(?:gebruiksdoel|gebruikstype)>/gi);
  for (const match of matches) doelen.push(match[1].trim());
  return doelen;
}

function extractOppervlakte(xml: string): number | null {
  const waarde =
    extractXmlWaarde(xml, 'oppervlakte') ||
    extractXmlWaarde(xml, 'vloeroppervlakte') ||
    extractXmlWaarde(xml, 'brutoVloeroppervlakte');
  if (!waarde) return null;
  const getal = parseFloat(waarde);
  return isNaN(getal) ? null : getal;
}

function extractKadastraalNummer(xml: string): string | null {
  const patroon = /\b([A-Z]{3,5}\d{0,2})\s+([A-Z])\s+(\d{1,5})\b/;
  const match = xml.match(patroon);
  if (match) return `${match[1]} ${match[2]} ${match[3]}`;

  const gem = extractXmlWaarde(xml, 'kadastraleGemeente');
  if (!gem) return null;
  const sectie = extractXmlWaarde(xml, 'sectie') || '';
  const nr = extractXmlWaarde(xml, 'perceelnummer') || '';
  return `${gem} ${sectie} ${nr}`.trim();
}

function extractXmlWaarde(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractXmlBlokken(xml: string, tag: string): string[] | null {
  const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
  const matches = xml.match(regex);
  return matches && matches.length > 0 ? matches : null;
}
