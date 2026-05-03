/**
 * Bodemloket Service
 * 
 * Bevraagt de Bodemloket ArcGIS REST API om te bepalen welke omgevingsdienst
 * bevoegd is voor bodemkwaliteit op een gegeven locatie.
 * 
 * API: https://gis.gdngeoservices.nl/standalone/rest/services/blk_gdn/lks_blk_rd_v1/MapServer
 * 
 * Layers:
 * - 0: WBB_locaties (Wet Bodembescherming locaties) - niet publiek beschikbaar via REST
 * - 1: Beschikbaarheid_gegevens (welke omgevingsdienst is bevoegd)
 * - 2: Bevoegd_gezag (bevoegd gezag per gemeente)
 */

const BODEMLOKET_BASE_URL = 'https://gis.gdngeoservices.nl/standalone/rest/services/blk_gdn/lks_blk_rd_v1/MapServer';

// Layer IDs
const BESCHIKBAARHEID_LAYER = 1;

export interface BodemloketResultaat {
  /** Of er een bevoegde omgevingsdienst gevonden is */
  gevonden: boolean;
  /** Naam van de bevoegde omgevingsdienst */
  omgevingsdienstNaam: string | null;
  /** URL naar de website van de omgevingsdienst voor bodemgegevens */
  omgevingsdienstUrl: string | null;
  /** Of er een website beschikbaar is met bodemgegevens */
  websiteBeschikbaar: boolean;
  /** Of er dossiergegevens beschikbaar zijn */
  dossierBeschikbaar: boolean;
  /** Aanbeveling voor het rapport */
  aanbeveling: string;
  /** Bron van de informatie */
  bron: string;
}

/**
 * Converteer WGS84 (lat/lng) naar Rijksdriehoek (RD New / EPSG:28992)
 * Benaderende conversie - voldoende nauwkeurig voor onze doeleinden
 */
function wgs84ToRd(lat: number, lng: number): { x: number; y: number } {
  // Referentiepunt Amersfoort
  const refLat = 52.15517440;
  const refLng = 5.38720621;
  const refX = 155000;
  const refY = 463000;

  const dLat = 0.36 * (lat - refLat);
  const dLng = 0.36 * (lng - refLng);

  const x = refX
    + (190094.945 * dLng)
    + (-11832.228 * dLat * dLng)
    + (-114.221 * dLat * dLat * dLng)
    + (0.3 * dLng * dLng * dLng);

  const y = refY
    + (309056.544 * dLat)
    + (3638.893 * dLng * dLng)
    + (73.077 * dLat * dLng * dLng)
    + (-157.984 * dLat * dLat * dLat)
    + (59.788 * dLat * dLat * dLng);

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Bevraag de Bodemloket API voor een specifieke locatie
 * 
 * @param lat - Latitude (WGS84)
 * @param lng - Longitude (WGS84)
 * @returns BodemloketResultaat met informatie over de bevoegde omgevingsdienst
 */
export async function bevraagBodemloket(lat: number, lng: number): Promise<BodemloketResultaat> {
  try {
    // Converteer naar RD coördinaten
    const rd = wgs84ToRd(lat, lng);
    
    // Maak een klein envelope rond het punt (50m buffer)
    const buffer = 50;
    const minX = rd.x - buffer;
    const minY = rd.y - buffer;
    const maxX = rd.x + buffer;
    const maxY = rd.y + buffer;

    const url = `${BODEMLOKET_BASE_URL}/${BESCHIKBAARHEID_LAYER}/query?` +
      `geometry=${minX},${minY},${maxX},${maxY}` +
      `&geometryType=esriGeometryEnvelope` +
      `&inSR=28992` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=*` +
      `&f=json`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 seconden timeout
    });

    if (!response.ok) {
      throw new Error(`Bodemloket API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      features?: Array<{
        attributes: {
          AUTHORITY_DBK?: number;
          AUTHORITY_CD?: string | null;
          AUTHORITY_NM?: string;
          WEBSITE_BLN?: string;
          DOSSIER_BLN?: string;
          DISPLAY_CD?: string;
          WEBSITE_URL?: string;
        };
      }>;
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`Bodemloket API error: ${data.error.message}`);
    }

    const features = data.features || [];

    if (features.length === 0) {
      return {
        gevonden: false,
        omgevingsdienstNaam: null,
        omgevingsdienstUrl: null,
        websiteBeschikbaar: false,
        dossierBeschikbaar: false,
        aanbeveling: 'Raadpleeg het Bodemloket (www.bodemloket.nl) voor informatie over de bodemkwaliteit op deze locatie.',
        bron: 'Bodemloket (geen gegevens beschikbaar voor deze locatie)',
      };
    }

    const feature = features[0].attributes;
    const omgevingsdienstNaam = feature.AUTHORITY_NM || null;
    const websiteUrl = feature.WEBSITE_URL || null;
    const websiteBeschikbaar = feature.WEBSITE_BLN === 'J';
    const dossierBeschikbaar = feature.DOSSIER_BLN === 'J';

    // Bouw aanbeveling op
    let aanbeveling = '';
    if (websiteBeschikbaar && websiteUrl) {
      aanbeveling = `Raadpleeg de bodemgegevens bij ${omgevingsdienstNaam} via ${websiteUrl} voor informatie over de bodemkwaliteit op deze locatie.`;
    } else if (omgevingsdienstNaam) {
      aanbeveling = `Neem contact op met ${omgevingsdienstNaam} voor informatie over de bodemkwaliteit op deze locatie.`;
    } else {
      aanbeveling = 'Raadpleeg het Bodemloket (www.bodemloket.nl) voor informatie over de bodemkwaliteit op deze locatie.';
    }

    if (dossierBeschikbaar) {
      aanbeveling += ' Er zijn dossiergegevens beschikbaar bij het bevoegd gezag.';
    }

    return {
      gevonden: true,
      omgevingsdienstNaam,
      omgevingsdienstUrl: websiteUrl,
      websiteBeschikbaar,
      dossierBeschikbaar,
      aanbeveling,
      bron: 'Bodemloket (Rijkswaterstaat)',
    };
  } catch (error) {
    console.error('[BodemloketService] Fout bij bevragen Bodemloket:', error);
    
    return {
      gevonden: false,
      omgevingsdienstNaam: null,
      omgevingsdienstUrl: null,
      websiteBeschikbaar: false,
      dossierBeschikbaar: false,
      aanbeveling: 'Het Bodemloket was niet bereikbaar. Raadpleeg www.bodemloket.nl handmatig voor bodemkwaliteitsgegevens.',
      bron: 'Bodemloket (niet bereikbaar)',
    };
  }
}
