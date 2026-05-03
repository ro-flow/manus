// Kernregel: persoonsgegevens gaan NOOIT naar externe AI.
// Bij detectie van NAW in de context wordt de aanroep gecanceld met een fout.

export class PrivacyViolationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string
  ) {
    super(`Privacy-schending gedetecteerd in veld '${field}': ${reason}. AI-aanroep geannuleerd.`);
    this.name = 'PrivacyViolationError';
  }
}

export interface AIContext {
  gemeente?: string;
  gebiedstype?: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  [key: string]: unknown;
}

export interface SanitizedContext {
  gemeente?: string;
  gebiedstype?: string;
  activiteitType?: string;
  activiteitOmschrijving?: string;
  [key: string]: unknown;
}

// Veldnamen die nooit naar AI mogen
const VERBODEN_VELDNAMEN = new Set([
  'naam', 'name', 'voornaam', 'achternaam', 'tussenvoegsel',
  'email', 'emailadres', 'e-mail', 'emailAddress',
  'telefoon', 'telefoonnummer', 'phone', 'mobiel', 'mobile',
  'adres', 'address', 'straat', 'street', 'huisnummer', 'postcode',
  'woonplaats', 'stad', 'city',
  'bsn', 'burgerservicenummer',
  'aanvragernaam', 'aanvrageremail', 'aanvragertelefoon', 'aanvragersadres',
  'contactpersoon', 'contactpersoonEmail',
]);

// Patronen die op NAW wijzen in vrije tekst
const NAW_PATRONEN = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, label: 'e-mailadres' },
  { pattern: /(\+31|0031|0)[1-9][0-9\s\-]{7,}/, label: 'telefoonnummer' },
  { pattern: /\b[0-9]{9}\b/, label: 'mogelijk BSN (9 cijfers)' },
];

export function sanitizeForAI(context: AIContext): SanitizedContext {
  validateNoNAW(context, '');
  // Context is schoon: geef terug als SanitizedContext
  return context as SanitizedContext;
}

function validateNoNAW(obj: Record<string, unknown>, path: string): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;

    // Controleer verboden veldnamen
    if (VERBODEN_VELDNAMEN.has(key.toLowerCase())) {
      if (value !== null && value !== undefined && value !== '') {
        throw new PrivacyViolationError(fullPath, `veld '${key}' bevat mogelijk NAW-gegevens`);
      }
    }

    if (typeof value === 'string' && value.trim()) {
      // Scan vrije tekstvelden op NAW-patronen
      for (const { pattern, label } of NAW_PATRONEN) {
        if (pattern.test(value)) {
          throw new PrivacyViolationError(fullPath, `waarde bevat een ${label}`);
        }
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      validateNoNAW(value as Record<string, unknown>, fullPath);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          validateNoNAW(item as Record<string, unknown>, `${fullPath}[${i}]`);
        } else if (typeof item === 'string') {
          for (const { pattern, label } of NAW_PATRONEN) {
            if (pattern.test(item)) {
              throw new PrivacyViolationError(`${fullPath}[${i}]`, `waarde bevat een ${label}`);
            }
          }
        }
      });
    }
  }
}
