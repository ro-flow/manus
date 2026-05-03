/**
 * PDOK Service - Nederlandse locatiegegevens
 * 
 * Integreert met de gratis PDOK APIs voor:
 * - BAG (Basisregistratie Adressen en Gebouwen)
 * - Kadaster
 * - Natura 2000
 * - Archeologische zones
 */

import axios from 'axios';

// PDOK API endpoints
const PDOK_LOCATIESERVER = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';
const PDOK_BAG = 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2';
const PDOK_NATURA2000 = 'https://geodata.nationaalgeoregister.nl/natura2000/wfs';
const PDOK_ARCHEOLOGIE = 'https://geodata.nationaalgeoregister.nl/archeologie/wfs';

export interface PDOKAddress {
  weergavenaam: string;
  straatnaam?: string;
  huisnummer?: string;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  gemeentenaam?: string;
  provincienaam?: string;
  centroide_ll?: string; // "POINT(lon lat)"
  centroide_rd?: string; // "POINT(x y)"
  nummeraanduiding_id?: string;
  adresseerbaarobject_id?: string;
}

export interface PDOKLocationResult {
  address: PDOKAddress | null;
  coordinates: {
    lat: number;
    lon: number;
    rdX?: number;
    rdY?: number;
  } | null;
  kadaster: {
    perceelNummer?: string;
    sectie?: string;
    gemeenteCode?: string;
    oppervlakte?: number;
  } | null;
  natura2000: {
    inGebied: boolean;
    gebiedNaam?: string;
  };
  archeologie: {
    inZone: boolean;
    zoneType?: string;
    verwachtingswaarde?: string;
  };
  welstandsniveau?: string;
}

/**
 * Zoek een adres via PDOK Locatieserver
 */
export async function searchAddress(query: string): Promise<PDOKAddress[]> {
  try {
    const response = await axios.get(`${PDOK_LOCATIESERVER}/free`, {
      params: {
        q: query,
        rows: 10,
        fq: 'type:adres',
      },
    });

    if (response.data?.response?.docs) {
      return response.data.response.docs.map((doc: any) => ({
        weergavenaam: doc.weergavenaam,
        straatnaam: doc.straatnaam,
        huisnummer: doc.huisnummer?.toString(),
        huisletter: doc.huisletter,
        huisnummertoevoeging: doc.huisnummertoevoeging,
        postcode: doc.postcode,
        woonplaatsnaam: doc.woonplaatsnaam,
        gemeentenaam: doc.gemeentenaam,
        provincienaam: doc.provincienaam,
        centroide_ll: doc.centroide_ll,
        centroide_rd: doc.centroide_rd,
        nummeraanduiding_id: doc.nummeraanduiding_id,
        adresseerbaarobject_id: doc.adresseerbaarobject_id,
      }));
    }

    return [];
  } catch (error) {
    console.error('[PDOK] Address search failed:', error);
    return [];
  }
}

/**
 * Parse POINT string to coordinates
 */
function parsePoint(pointStr: string): { x: number; y: number } | null {
  const match = pointStr.match(/POINT\(([0-9.]+)\s+([0-9.]+)\)/);
  if (match) {
    return {
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
    };
  }
  return null;
}

/**
 * Check of coördinaten binnen een Natura 2000 gebied liggen
 */
export async function checkNatura2000(lat: number, lon: number): Promise<{ inGebied: boolean; gebiedNaam?: string }> {
  try {
    const response = await axios.get(PDOK_NATURA2000, {
      params: {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: 'natura2000:natura2000',
        outputFormat: 'application/json',
        srsName: 'EPSG:4326',
        cql_filter: `INTERSECTS(geom, POINT(${lon} ${lat}))`,
      },
      timeout: 5000,
    });

    if (response.data?.features?.length > 0) {
      const feature = response.data.features[0];
      return {
        inGebied: true,
        gebiedNaam: feature.properties?.naam || feature.properties?.NAAM,
      };
    }

    return { inGebied: false };
  } catch (error) {
    console.error('[PDOK] Natura 2000 check failed:', error);
    return { inGebied: false };
  }
}

/**
 * Check archeologische verwachtingswaarde
 */
export async function checkArcheologie(lat: number, lon: number): Promise<{ inZone: boolean; zoneType?: string; verwachtingswaarde?: string }> {
  try {
    const response = await axios.get(PDOK_ARCHEOLOGIE, {
      params: {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: 'archeologie:archeologische_monumenten',
        outputFormat: 'application/json',
        srsName: 'EPSG:4326',
        cql_filter: `INTERSECTS(geom, POINT(${lon} ${lat}))`,
      },
      timeout: 5000,
    });

    if (response.data?.features?.length > 0) {
      const feature = response.data.features[0];
      return {
        inZone: true,
        zoneType: feature.properties?.type || 'Archeologisch monument',
        verwachtingswaarde: feature.properties?.verwachtingswaarde,
      };
    }

    return { inZone: false };
  } catch (error) {
    console.error('[PDOK] Archeologie check failed:', error);
    return { inZone: false };
  }
}

/**
 * Haal volledige locatiegegevens op voor een adres
 */
export async function getLocationData(addressQuery: string): Promise<PDOKLocationResult> {
  const result: PDOKLocationResult = {
    address: null,
    coordinates: null,
    kadaster: null,
    natura2000: { inGebied: false },
    archeologie: { inZone: false },
  };

  // Zoek adres
  const addresses = await searchAddress(addressQuery);
  if (addresses.length === 0) {
    return result;
  }

  const address = addresses[0];
  result.address = address;

  // Parse coördinaten
  if (address.centroide_ll) {
    const coords = parsePoint(address.centroide_ll);
    if (coords) {
      result.coordinates = {
        lon: coords.x,
        lat: coords.y,
      };

      // Parse RD coördinaten indien beschikbaar
      if (address.centroide_rd) {
        const rdCoords = parsePoint(address.centroide_rd);
        if (rdCoords) {
          result.coordinates.rdX = rdCoords.x;
          result.coordinates.rdY = rdCoords.y;
        }
      }

      // Check Natura 2000
      result.natura2000 = await checkNatura2000(result.coordinates.lat, result.coordinates.lon);

      // Check Archeologie
      result.archeologie = await checkArcheologie(result.coordinates.lat, result.coordinates.lon);
    }
  }

  return result;
}

/**
 * Haal locatiegegevens op basis van coördinaten
 */
export async function getLocationByCoordinates(lat: number, lon: number): Promise<PDOKLocationResult> {
  const result: PDOKLocationResult = {
    address: null,
    coordinates: { lat, lon },
    kadaster: null,
    natura2000: { inGebied: false },
    archeologie: { inZone: false },
  };

  try {
    // Reverse geocode
    const response = await axios.get(`${PDOK_LOCATIESERVER}/reverse`, {
      params: {
        lat,
        lon,
        rows: 1,
      },
    });

    if (response.data?.response?.docs?.length > 0) {
      const doc = response.data.response.docs[0];
      result.address = {
        weergavenaam: doc.weergavenaam,
        straatnaam: doc.straatnaam,
        huisnummer: doc.huisnummer?.toString(),
        postcode: doc.postcode,
        woonplaatsnaam: doc.woonplaatsnaam,
        gemeentenaam: doc.gemeentenaam,
        provincienaam: doc.provincienaam,
      };
    }

    // Check Natura 2000
    result.natura2000 = await checkNatura2000(lat, lon);

    // Check Archeologie
    result.archeologie = await checkArcheologie(lat, lon);

  } catch (error) {
    console.error('[PDOK] Location by coordinates failed:', error);
  }

  return result;
}

/**
 * Bepaal welstandsniveau op basis van gemeente en locatie
 * Dit is een placeholder - in werkelijkheid zou dit uit de gemeentelijke welstandsnota komen
 */
export function determineWelstandsniveau(gemeenteNaam: string, isInBeschermdGezicht: boolean): string {
  if (isInBeschermdGezicht) {
    return 'Bijzonder';
  }
  
  // Default welstandsniveau
  return 'Regulier';
}
