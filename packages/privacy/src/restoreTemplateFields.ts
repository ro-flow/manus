// AI genereert brieven met placeholders.
// Deze functie vult de NAW-gegevens terug in — uitsluitend binnen Azure, nooit client-side.

export interface AanvragerData {
  naam: string;
  adres?: string;
  postcode?: string;
  woonplaats?: string;
  email?: string;
  telefoon?: string;
}

const PLACEHOLDER_MAP: Array<{ placeholder: string; field: keyof AanvragerData }> = [
  { placeholder: '[AANVRAGER]', field: 'naam' },
  { placeholder: '[ADRES_VERWIJDERD]', field: 'adres' },
  { placeholder: '[EMAIL_VERWIJDERD]', field: 'email' },
  { placeholder: '[TELEFOON_VERWIJDERD]', field: 'telefoon' },
];

export function restoreTemplateFields(template: string, aanvrager: AanvragerData): string {
  let result = template;

  for (const { placeholder, field } of PLACEHOLDER_MAP) {
    const value = aanvrager[field];
    if (value) {
      result = result.replaceAll(placeholder, value);
    }
  }

  // Adresregel samenstellen als postcode + woonplaats aanwezig
  if (aanvrager.postcode && aanvrager.woonplaats) {
    const volledigAdres = [aanvrager.adres, aanvrager.postcode, aanvrager.woonplaats]
      .filter(Boolean)
      .join(', ');
    result = result.replaceAll('[ADRES_VERWIJDERD]', volledigAdres);
  }

  return result;
}
