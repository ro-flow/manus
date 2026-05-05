// AI genereert brieven met placeholders.
// Deze functie vult NAW-gegevens en gemeente-context terug in — uitsluitend binnen Azure, nooit client-side.

export interface AanvragerData {
  naam?: string;
  adres?: string;
  postcode?: string;
  woonplaats?: string;
  email?: string;
  telefoon?: string;
}

export interface BriefContext {
  afdelingNaam?: string; // TODO: ophalen uit gemeente_instellingen tabel
}

export function restoreTemplateFields(
  template: string,
  aanvrager: AanvragerData,
  context: BriefContext = {}
): string {
  let result = template;

  // NAW placeholders
  if (aanvrager.naam) {
    result = result.replaceAll('[AANVRAGER]', aanvrager.naam);
  }
  if (aanvrager.email) {
    result = result.replaceAll('[EMAIL_VERWIJDERD]', aanvrager.email);
  }
  if (aanvrager.telefoon) {
    result = result.replaceAll('[TELEFOON_VERWIJDERD]', aanvrager.telefoon);
  }

  // Adresregel: volledig adres als postcode + woonplaats beschikbaar, anders enkel straat
  if (aanvrager.postcode && aanvrager.woonplaats) {
    const volledigAdres = [aanvrager.adres, aanvrager.postcode, aanvrager.woonplaats]
      .filter(Boolean)
      .join(', ');
    result = result.replaceAll('[ADRES_VERWIJDERD]', volledigAdres);
  } else if (aanvrager.adres) {
    result = result.replaceAll('[ADRES_VERWIJDERD]', aanvrager.adres);
  }

  // Afdeling naam — MVP default, later per gemeente instelbaar
  const afdeling = context.afdelingNaam ?? 'Team Omgevingsvergunningen';
  result = result.replaceAll('[AFDELING_NAAM]', afdeling);

  // Resterende onvervangen placeholders → herkenbaar signaal voor behandelaar
  result = result.replaceAll('[AANVRAGER]', '«naam aanvrager»');
  result = result.replaceAll('[ADRES_VERWIJDERD]', '«adres aanvrager»');
  result = result.replaceAll('[EMAIL_VERWIJDERD]', '«e-mail aanvrager»');
  result = result.replaceAll('[TELEFOON_VERWIJDERD]', '«telefoon aanvrager»');

  return result;
}
