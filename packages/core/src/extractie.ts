// Extraction logic for PDF/DSO parsing.
// NAW extraction runs in-process via regex — NEVER sent to AI.
// AI only receives sanitized content (gemeente, activiteit, locatiecontext).

export interface NawExtractie {
  naam?: string;
  email?: string;
  telefoon?: string;
  adres?: string;
  postcode?: string;
  woonplaats?: string;
}

export interface AiExtractie {
  gemeente?: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  locatieContext?: string;
}

export interface PdfExtractieResultaat extends AiExtractie {
  naw: NawExtractie;
}

const ACTIVITEIT_TYPES = [
  'bouwen', 'slopen', 'kappen', 'uitweg', 'reclame',
  'milieu', 'afwijken bestemmingsplan', 'anders',
];

// Label-stop pattern: stops at next known field label, newline, or end of string.
// This prevents one field's regex from swallowing subsequent fields when the text
// is on a single line (e.g. after XML tag stripping).
const LABEL_STOP = /(?=\s*(?:naam|adres|straat|postcode|woonplaats|plaats|e-?mail|telefoon|tel\.|gemeente|activiteit|\n|\r|$))/i;

// Regex-based NAW extraction — backend only, result never forwarded to AI
export function extractNawFromText(text: string): NawExtractie {
  const result: NawExtractie = {};

  // Email — standalone is reliable enough
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0].trim();

  // Dutch phone: 06-xxxxxxxx, 0xx-xxxxxxx, +31 variants
  const telMatch = text.match(
    /(?:(?:telefoon(?:nummer)?|tel\.?|mobiel)\s*:?\s*)?((?:\+31|00\s?31|0)[\s.-]?[1-9][\d\s.-]{7,10})/i
  );
  if (telMatch) result.telefoon = telMatch[1].replace(/\s+/g, ' ').trim();

  // Dutch postcode: 1234 AB  (label-based preferred, else standalone)
  const postcodeLabeled = text.match(/postcode\s*:\s*([1-9]\d{3}\s?[A-Z]{2})\b/i);
  const postcodeStandalone = text.match(/\b([1-9]\d{3}\s[A-Z]{2})\b/);
  const postcodeMatch = postcodeLabeled ?? postcodeStandalone;
  if (postcodeMatch) result.postcode = postcodeMatch[1].trim();

  // Name — stops before any next known label
  const naamRe = new RegExp(
    String.raw`(?:naam\s+aanvrager|naam\s+indiener|naam\s+gemachtigde|naam\s*:|aanvrager\s*:)\s*` +
    String.raw`([A-Za-zÀ-ÿ\s'.,-]{2,60})` +
    LABEL_STOP.source,
    'i'
  );
  const naamMatch = text.match(naamRe);
  if (naamMatch) {
    const kandidaat = naamMatch[1].trim().replace(/\s+/g, ' ');
    if (kandidaat.length > 2 && !kandidaat.includes('@') && !/^\d/.test(kandidaat)) {
      result.naam = kandidaat;
    }
  }

  // Address — stop before next label
  const adresRe = new RegExp(
    String.raw`(?:straat\s+en\s+huisnummer|straat\s*:|adres\s*:|woonadres\s*:|postadres\s*:)\s*` +
    String.raw`([^\n\r]{5,60})` +
    LABEL_STOP.source,
    'i'
  );
  const adresMatch = text.match(adresRe);
  if (adresMatch) result.adres = adresMatch[1].trim().replace(/\s+/g, ' ');

  // Woonplaats — stop before next label
  const plaatsRe = new RegExp(
    String.raw`(?:woonplaats|plaats)\s*:\s*` +
    String.raw`([A-Za-zÀ-ÿ\s'-]{2,40})` +
    LABEL_STOP.source,
    'i'
  );
  const plaatsMatch = text.match(plaatsRe);
  if (plaatsMatch) result.woonplaats = plaatsMatch[1].trim().replace(/\s+/g, ' ');

  return result;
}

// Replace extracted NAW values + residual patterns with placeholders before AI call
export function sanitizeTextForAI(text: string, naw: NawExtractie): string {
  let s = text;

  if (naw.naam) s = s.replaceAll(naw.naam, '[NAAM]');
  if (naw.adres) s = s.replaceAll(naw.adres, '[ADRES]');
  if (naw.email) s = s.replaceAll(naw.email, '[EMAIL]');
  if (naw.telefoon) s = s.replaceAll(naw.telefoon, '[TELEFOON]');
  if (naw.postcode) s = s.replaceAll(naw.postcode, '[POSTCODE]');
  if (naw.woonplaats) s = s.replaceAll(naw.woonplaats, '[WOONPLAATS]');

  // Belt-and-suspenders: strip any remaining emails and phone patterns
  s = s.replace(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  s = s.replace(/(?:\+31|0031|0)[\s.-]?[1-9][\d\s.-]{7,9}/g, '[TELEFOON]');

  return s;
}

export function buildExtractiePrompt(sanitizedText: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt =
    `Je bent een specialist in Nederlandse omgevingsvergunningaanvragen. ` +
    `Extraheer de gevraagde velden en geef UITSLUITEND een geldig JSON object terug. ` +
    `Placeholders zoals [NAAM] en [ADRES] zijn privacyfilters — neem ze NOOIT over in je antwoord. ` +
    `Gebruik null als een veld niet te bepalen is.`;

  const userPrompt =
    `Extraheer uit deze aanvraagtekst:\n\n` +
    `${sanitizedText.slice(0, 8000)}\n\n` +
    `Geef terug als JSON (geen uitleg, geen markdown code blocks):\n` +
    `{\n` +
    `  "gemeente": "naam van de gemeente waaraan de vergunning wordt aangevraagd, of null",\n` +
    `  "activiteitType": "één van: ${ACTIVITEIT_TYPES.join(', ')} — of null",\n` +
    `  "activiteitOmschrijving": "wat de aanvrager wil doen, max 300 tekens, of null",\n` +
    `  "locatieContext": "locatie-omschrijving zonder persoonsgegevens, max 150 tekens, of null"\n` +
    `}`;

  return { systemPrompt, userPrompt };
}

export function parseExtractieResponse(response: string): AiExtractie {
  const cleaned = response
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      gemeente: typeof parsed.gemeente === 'string' ? parsed.gemeente : undefined,
      activiteitType: typeof parsed.activiteitType === 'string' ? parsed.activiteitType : undefined,
      activiteitOmschrijving: typeof parsed.activiteitOmschrijving === 'string' ? parsed.activiteitOmschrijving : undefined,
      locatieContext: typeof parsed.locatieContext === 'string' ? parsed.locatieContext : undefined,
    };
  } catch {
    return {};
  }
}
