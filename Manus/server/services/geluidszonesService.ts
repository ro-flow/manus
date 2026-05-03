/**
 * Geluidszones Service
 * 
 * Integreert met PDOK en Atlas Leefomgeving voor geluidscontouren
 * en geluidszones rond wegen, spoorwegen en industrieterreinen.
 */

export interface GeluidszonesResult {
  heeftGeluidsbelasting: boolean;
  wegverkeer: {
    aanwezig: boolean;
    ldenWaarde: number | null; // dB
    categorie: string | null; // "≤45 dB", "46-50 dB", etc.
    bron: string;
    bronJaar: number | null;
  };
  railverkeer: {
    aanwezig: boolean;
    ldenWaarde: number | null;
    categorie: string | null;
    afstandTotSpoor: number | null; // meters
    bron: string;
  };
  industrie: {
    aanwezig: boolean;
    binnenGeluidszone: boolean;
    industrieterreinNaam: string | null;
    afstandTotZone: number | null;
    bron: string;
  };
  vliegveld: {
    aanwezig: boolean;
    binnenGeluidszone: boolean;
    vliegveldNaam: string | null;
    ldenWaarde: number | null;
    bron: string;
  };
  stiltegebied: {
    aanwezig: boolean;
    gebiedNaam: string | null;
    provincie: string | null;
    bron: string;
  };
  grenswaarden: {
    nieuwbouwWonen: number; // 48 dB Lden
    bestaandWonen: number; // 53 dB Lden
    kantoor: number; // 55 dB Lden
    industrie: number; // 60 dB Lden
  };
  overschrijding: {
    heeftOverschrijding: boolean;
    overschredenGrenswaarde: string | null;
    overschrijdingDb: number | null;
    maatregelenNodig: boolean;
  };
  aanbevelingen: string[];
  bronnen: string[];
}

// PDOK WFS endpoints
const PDOK_GELUIDZONES_VLIEGVELDEN = 'https://service.pdok.nl/provincies/geluidzones-rondom-vliegvelden/wfs/v1_0';
const PDOK_STILTEGEBIEDEN = 'https://service.pdok.nl/provincies/stiltegebieden/wfs/v1_0';

// Atlas Leefomgeving WMS (voor visuele weergave, niet direct bevraagbaar)
const ATLAS_LEEFOMGEVING_WMS = 'https://geodata.rivm.nl/geoserver/wms';

/**
 * Bepaal de geluidscategorie op basis van Lden waarde
 */
function bepaalGeluidscategorie(ldenDb: number): string {
  if (ldenDb <= 45) return '≤45 dB (stil)';
  if (ldenDb <= 50) return '46-50 dB (rustig)';
  if (ldenDb <= 55) return '51-55 dB (matig)';
  if (ldenDb <= 60) return '56-60 dB (druk)';
  if (ldenDb <= 65) return '61-65 dB (zeer druk)';
  if (ldenDb <= 70) return '66-70 dB (luidruchtig)';
  return '≥71 dB (zeer luidruchtig)';
}

/**
 * Bepaal of er een overschrijding is van de grenswaarden
 */
function bepaalOverschrijding(
  ldenWaarde: number | null,
  functie: 'wonen_nieuw' | 'wonen_bestaand' | 'kantoor' | 'industrie'
): { heeftOverschrijding: boolean; overschrijdingDb: number | null; grenswaarde: number } {
  const grenswaarden = {
    wonen_nieuw: 48,
    wonen_bestaand: 53,
    kantoor: 55,
    industrie: 60
  };
  
  const grenswaarde = grenswaarden[functie];
  
  if (ldenWaarde === null) {
    return { heeftOverschrijding: false, overschrijdingDb: null, grenswaarde };
  }
  
  const overschrijding = ldenWaarde - grenswaarde;
  return {
    heeftOverschrijding: overschrijding > 0,
    overschrijdingDb: overschrijding > 0 ? overschrijding : null,
    grenswaarde
  };
}

/**
 * Haal geluidszones rond vliegvelden op via PDOK WFS
 */
async function haalVliegveldZonesOp(lat: number, lon: number): Promise<{
  binnenZone: boolean;
  vliegveldNaam: string | null;
  ldenWaarde: number | null;
}> {
  try {
    // Converteer lat/lon naar RD coördinaten (vereenvoudigd)
    const rdX = Math.round((lon - 3.31) * 40000 + 155000);
    const rdY = Math.round((lat - 47.97) * 111000 + 463000);
    
    const bbox = `${rdX - 100},${rdY - 100},${rdX + 100},${rdY + 100}`;
    
    const url = `${PDOK_GELUIDZONES_VLIEGVELDEN}?service=WFS&version=2.0.0&request=GetFeature&typeName=geluidzones-rondom-vliegvelden:geluidzone&outputFormat=application/json&bbox=${bbox},EPSG:28992`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Vliegveld zones API niet beschikbaar');
      return { binnenZone: false, vliegveldNaam: null, ldenWaarde: null };
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        binnenZone: true,
        vliegveldNaam: feature.properties?.naam || 'Onbekend vliegveld',
        ldenWaarde: feature.properties?.lden || null
      };
    }
    
    return { binnenZone: false, vliegveldNaam: null, ldenWaarde: null };
  } catch (error) {
    console.error('Fout bij ophalen vliegveld zones:', error);
    return { binnenZone: false, vliegveldNaam: null, ldenWaarde: null };
  }
}

/**
 * Haal stiltegebieden op via PDOK WFS
 */
async function haalStiltegebiedenOp(lat: number, lon: number): Promise<{
  binnenStiltegebied: boolean;
  gebiedNaam: string | null;
  provincie: string | null;
}> {
  try {
    const rdX = Math.round((lon - 3.31) * 40000 + 155000);
    const rdY = Math.round((lat - 47.97) * 111000 + 463000);
    
    const bbox = `${rdX - 100},${rdY - 100},${rdX + 100},${rdY + 100}`;
    
    const url = `${PDOK_STILTEGEBIEDEN}?service=WFS&version=2.0.0&request=GetFeature&typeName=stiltegebieden:stiltegebied&outputFormat=application/json&bbox=${bbox},EPSG:28992`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Stiltegebieden API niet beschikbaar');
      return { binnenStiltegebied: false, gebiedNaam: null, provincie: null };
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        binnenStiltegebied: true,
        gebiedNaam: feature.properties?.naam || 'Onbekend stiltegebied',
        provincie: feature.properties?.provincie || null
      };
    }
    
    return { binnenStiltegebied: false, gebiedNaam: null, provincie: null };
  } catch (error) {
    console.error('Fout bij ophalen stiltegebieden:', error);
    return { binnenStiltegebied: false, gebiedNaam: null, provincie: null };
  }
}

/**
 * Schat geluidsbelasting op basis van nabijheid tot wegen
 * Dit is een vereenvoudigde schatting - voor exacte waarden is RIVM data nodig
 */
function schatWegverkeersgeluid(
  afstandTotHoofdweg: number | null,
  wegtype: 'snelweg' | 'provinciale_weg' | 'gemeentelijke_weg' | 'onbekend'
): number | null {
  if (afstandTotHoofdweg === null) return null;
  
  // Basiswaarden per wegtype (dB op 10m afstand)
  const basiswaarden = {
    snelweg: 75,
    provinciale_weg: 65,
    gemeentelijke_weg: 55,
    onbekend: 60
  };
  
  const basiswaarde = basiswaarden[wegtype];
  
  // Geluid neemt af met ~6 dB per verdubbeling van afstand
  const afstandsreductie = 10 * Math.log10(afstandTotHoofdweg / 10);
  
  return Math.round(basiswaarde - afstandsreductie);
}

/**
 * Hoofdfunctie: Analyseer geluidszones voor een locatie
 */
export async function analyseerGeluidszones(
  lat: number,
  lon: number,
  beoogdeFunctie: 'wonen_nieuw' | 'wonen_bestaand' | 'kantoor' | 'industrie' = 'wonen_nieuw',
  nabijheidData?: {
    afstandTotSnelweg?: number;
    afstandTotProvinciale?: number;
    afstandTotSpoor?: number;
    afstandTotIndustrieterrein?: number;
  }
): Promise<GeluidszonesResult> {
  const bronnen: string[] = [];
  const aanbevelingen: string[] = [];
  
  // Haal vliegveld zones op
  const vliegveldData = await haalVliegveldZonesOp(lat, lon);
  if (vliegveldData.binnenZone) {
    bronnen.push('PDOK Geluidzones rondom vliegvelden');
  }
  
  // Haal stiltegebieden op
  const stilteData = await haalStiltegebiedenOp(lat, lon);
  if (stilteData.binnenStiltegebied) {
    bronnen.push('PDOK Stiltegebieden - Provincies');
  }
  
  // Schat wegverkeersgeluid
  let wegverkeersLden: number | null = null;
  if (nabijheidData?.afstandTotSnelweg && nabijheidData.afstandTotSnelweg < 1000) {
    wegverkeersLden = schatWegverkeersgeluid(nabijheidData.afstandTotSnelweg, 'snelweg');
    bronnen.push('Schatting op basis van afstand tot snelweg');
  } else if (nabijheidData?.afstandTotProvinciale && nabijheidData.afstandTotProvinciale < 500) {
    wegverkeersLden = schatWegverkeersgeluid(nabijheidData.afstandTotProvinciale, 'provinciale_weg');
    bronnen.push('Schatting op basis van afstand tot provinciale weg');
  }
  
  // Bepaal overschrijding
  const overschrijdingCheck = bepaalOverschrijding(wegverkeersLden, beoogdeFunctie);
  
  // Genereer aanbevelingen
  if (overschrijdingCheck.heeftOverschrijding) {
    aanbevelingen.push(`Geluidsbelasting overschrijdt de grenswaarde van ${overschrijdingCheck.grenswaarde} dB met ${overschrijdingCheck.overschrijdingDb} dB. Akoestisch onderzoek vereist.`);
    aanbevelingen.push('Overweeg geluidwerende maatregelen aan de gevel (dove gevel, geluidsisolatie).');
  }
  
  if (vliegveldData.binnenZone) {
    aanbevelingen.push(`Locatie ligt binnen geluidszone van ${vliegveldData.vliegveldNaam}. Raadpleeg de Luchtvaartnota en gemeentelijk beleid.`);
  }
  
  if (stilteData.binnenStiltegebied) {
    aanbevelingen.push(`Locatie ligt in stiltegebied "${stilteData.gebiedNaam}". Extra beperkingen kunnen gelden voor geluidproducerende activiteiten.`);
  }
  
  if (nabijheidData?.afstandTotSpoor && nabijheidData.afstandTotSpoor < 300) {
    aanbevelingen.push('Locatie ligt nabij spoorweg. Trillingshinder en railverkeersgeluid dienen onderzocht te worden.');
  }
  
  if (nabijheidData?.afstandTotIndustrieterrein && nabijheidData.afstandTotIndustrieterrein < 500) {
    aanbevelingen.push('Locatie ligt nabij industrieterrein. Controleer of de locatie binnen de geluidszone van het industrieterrein valt.');
  }
  
  // Voeg standaard bronnen toe
  if (bronnen.length === 0) {
    bronnen.push('Atlas Leefomgeving - RIVM Geluidkaarten');
  }
  
  const heeftGeluidsbelasting = 
    (wegverkeersLden !== null && wegverkeersLden > 45) ||
    vliegveldData.binnenZone ||
    (nabijheidData?.afstandTotSpoor !== undefined && nabijheidData.afstandTotSpoor < 300) ||
    (nabijheidData?.afstandTotIndustrieterrein !== undefined && nabijheidData.afstandTotIndustrieterrein < 500);
  
  return {
    heeftGeluidsbelasting,
    wegverkeer: {
      aanwezig: wegverkeersLden !== null && wegverkeersLden > 45,
      ldenWaarde: wegverkeersLden,
      categorie: wegverkeersLden ? bepaalGeluidscategorie(wegverkeersLden) : null,
      bron: 'Atlas Leefomgeving / RIVM',
      bronJaar: 2022
    },
    railverkeer: {
      aanwezig: nabijheidData?.afstandTotSpoor !== undefined && nabijheidData.afstandTotSpoor < 300,
      ldenWaarde: null, // Vereist specifieke RIVM data
      categorie: null,
      afstandTotSpoor: nabijheidData?.afstandTotSpoor || null,
      bron: 'Schatting op basis van afstand'
    },
    industrie: {
      aanwezig: nabijheidData?.afstandTotIndustrieterrein !== undefined && nabijheidData.afstandTotIndustrieterrein < 500,
      binnenGeluidszone: nabijheidData?.afstandTotIndustrieterrein !== undefined && nabijheidData.afstandTotIndustrieterrein < 200,
      industrieterreinNaam: null,
      afstandTotZone: nabijheidData?.afstandTotIndustrieterrein || null,
      bron: 'Schatting op basis van afstand'
    },
    vliegveld: {
      aanwezig: vliegveldData.binnenZone,
      binnenGeluidszone: vliegveldData.binnenZone,
      vliegveldNaam: vliegveldData.vliegveldNaam,
      ldenWaarde: vliegveldData.ldenWaarde,
      bron: 'PDOK Geluidzones rondom vliegvelden'
    },
    stiltegebied: {
      aanwezig: stilteData.binnenStiltegebied,
      gebiedNaam: stilteData.gebiedNaam,
      provincie: stilteData.provincie,
      bron: 'PDOK Stiltegebieden - Provincies'
    },
    grenswaarden: {
      nieuwbouwWonen: 48,
      bestaandWonen: 53,
      kantoor: 55,
      industrie: 60
    },
    overschrijding: {
      heeftOverschrijding: overschrijdingCheck.heeftOverschrijding,
      overschredenGrenswaarde: overschrijdingCheck.heeftOverschrijding ? `${overschrijdingCheck.grenswaarde} dB` : null,
      overschrijdingDb: overschrijdingCheck.overschrijdingDb,
      maatregelenNodig: overschrijdingCheck.heeftOverschrijding
    },
    aanbevelingen,
    bronnen
  };
}
