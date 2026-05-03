/**
 * Funderingsproblematiek API Service
 * 
 * Integreert met de PDOK Indicatieve Aandachtsgebieden Funderingsproblematiek API
 * om te checken of een locatie in een risicogebied voor funderingsproblemen ligt.
 * 
 * API: https://api.pdok.nl/rvo/indicatieve-aandachtsgebieden-funderingsproblematiek/ogc/v1/
 * Geen API-key vereist (open data)
 */

const PDOK_FUNDERING_BASE_URL = 'https://api.pdok.nl/rvo/indicatieve-aandachtsgebieden-funderingsproblematiek/ogc/v1';
const COLLECTION_NAME = 'indgebfunderingsproblematiek';

export interface FunderingsgebiedInfo {
  postcodegebied: string;
  gemeente: string;
  woonplaats: string;
  provincie: string;
  
  // Bodemgesteldheid
  fysischGeografischeRegio: string;  // bijv. "Zeekleigebied", "Veengebied"
  percentageFGR: number;  // percentage van postcode in deze regio
  
  // Funderingsrisico
  legendaKlasse: string;  // bijv. "Kwetsbaar gebied - 0-20 %"
  aantalPanden: number;
  aantalVoor1970: number;
  percentageVoor1970: number;
  
  // Popup tekst met uitleg
  uitlegTekst: string;
  
  // Bron
  websiteKCAF: string;
}

export interface FunderingsCheckResult {
  inRisicogebied: boolean;
  risicoNiveau: 'geen' | 'laag' | 'middel' | 'hoog';
  gebiedsInfo: FunderingsgebiedInfo | null;
  aanbevelingen: string[];
  checkDatum: string;
}

/**
 * Bepaal risiconiveau op basis van legenda klasse en percentage woningen voor 1970
 */
function bepaalRisicoNiveau(legendaKlasse: string, percentageVoor1970: number): 'geen' | 'laag' | 'middel' | 'hoog' {
  // Legenda klassen:
  // - "Kwetsbaar gebied - 0-20 %"
  // - "Kwetsbaar gebied - 20-40 %"
  // - "Kwetsbaar gebied - 40-60 %"
  // - "Kwetsbaar gebied - 60-80 %"
  // - "Kwetsbaar gebied - 80-100 %"
  
  if (!legendaKlasse.toLowerCase().includes('kwetsbaar')) {
    return 'geen';
  }
  
  if (percentageVoor1970 >= 60) {
    return 'hoog';
  } else if (percentageVoor1970 >= 40) {
    return 'middel';
  } else if (percentageVoor1970 >= 20) {
    return 'laag';
  } else {
    return 'laag';  // Kwetsbaar gebied maar weinig oude panden
  }
}

/**
 * Genereer aanbevelingen op basis van risiconiveau en gebiedsinfo
 */
function genereerAanbevelingen(
  risicoNiveau: 'geen' | 'laag' | 'middel' | 'hoog',
  gebiedsInfo: FunderingsgebiedInfo | null
): string[] {
  const aanbevelingen: string[] = [];
  
  if (risicoNiveau === 'geen') {
    return ['Geen specifieke aandachtspunten voor fundering op basis van gebiedskenmerken.'];
  }
  
  // Basis aanbeveling voor alle risicogebieden
  aanbevelingen.push(
    'Deze locatie ligt in een gebied met potentieel funderingsrisico. ' +
    'Adviseer aanvrager om de staat van de fundering te (laten) onderzoeken.'
  );
  
  if (gebiedsInfo) {
    // Specifieke aanbevelingen op basis van bodemtype
    const fgr = gebiedsInfo.fysischGeografischeRegio.toLowerCase();
    
    if (fgr.includes('veen')) {
      aanbevelingen.push(
        'Let op: Veengebied. Veenbodem is gevoelig voor inklinking en oxidatie. ' +
        'Bij grondwerkzaamheden extra aandacht voor grondwaterstand en bodemdaling.'
      );
    } else if (fgr.includes('zeeklei') || fgr.includes('rivierklei')) {
      aanbevelingen.push(
        'Let op: Kleigebied. Kleibodem kan zettingsgevoelig zijn. ' +
        'Bij nieuwbouw of uitbreiding constructief advies aanbevolen.'
      );
    }
    
    // Aanbeveling bij hoog percentage oude panden
    if (gebiedsInfo.percentageVoor1970 >= 40) {
      aanbevelingen.push(
        `In dit postcodegebied is ${gebiedsInfo.percentageVoor1970}% van de panden gebouwd voor 1970. ` +
        'Houten paalfunderingen uit die periode kunnen aangetast zijn door paalrot of bacteriële aantasting.'
      );
    }
  }
  
  // Aanbeveling voor hoog risico
  if (risicoNiveau === 'hoog') {
    aanbevelingen.push(
      'HOOG RISICO: Sterk aanbevolen om funderingsonderzoek als voorwaarde op te nemen ' +
      'voordat vergunning wordt verleend voor verbouwing of uitbreiding.'
    );
  }
  
  // Verwijs naar KCAF
  aanbevelingen.push(
    'Meer informatie: Kenniscentrum Aanpak Funderingsproblematiek (www.kcaf.nl)'
  );
  
  return aanbevelingen;
}

/**
 * Check of een locatie in een funderingsproblematiek risicogebied ligt
 * 
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @returns FunderingsCheckResult met risicoinfo en aanbevelingen
 */
export async function checkFunderingsproblematiek(
  lat: number,
  lon: number
): Promise<FunderingsCheckResult> {
  const checkDatum = new Date().toISOString();
  
  try {
    // Maak een kleine bbox rond het punt (ongeveer 100m)
    const delta = 0.001;  // ~100m
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    
    const url = `${PDOK_FUNDERING_BASE_URL}/collections/${COLLECTION_NAME}/items?bbox=${bbox}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/geo+json'
      }
    });
    
    if (!response.ok) {
      console.error(`Funderingsproblematiek API error: ${response.status}`);
      return {
        inRisicogebied: false,
        risicoNiveau: 'geen',
        gebiedsInfo: null,
        aanbevelingen: ['Funderingscheck kon niet worden uitgevoerd (API niet beschikbaar).'],
        checkDatum
      };
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      // Geen risicogebied gevonden op deze locatie
      return {
        inRisicogebied: false,
        risicoNiveau: 'geen',
        gebiedsInfo: null,
        aanbevelingen: ['Locatie ligt niet in een indicatief aandachtsgebied voor funderingsproblematiek.'],
        checkDatum
      };
    }
    
    // Parse de feature properties
    const feature = data.features[0];
    const props = feature.properties;
    
    const gebiedsInfo: FunderingsgebiedInfo = {
      postcodegebied: props.pc6 || 'Onbekend',
      gemeente: props.gemeente || 'Onbekend',
      woonplaats: props.woonplaats || 'Onbekend',
      provincie: props.provincie || 'Onbekend',
      fysischGeografischeRegio: props.fgr || 'Onbekend',
      percentageFGR: parseInt(props.perc_fgr) || 0,
      legendaKlasse: props.legenda || 'Onbekend',
      aantalPanden: parseInt(props.n_bag) || 0,
      aantalVoor1970: parseInt(props.nvoor1970) || 0,
      percentageVoor1970: parseInt(props.percvoor1970) || 0,
      uitlegTekst: props.popuptext || '',
      websiteKCAF: props.website || 'https://www.kcaf.nl'
    };
    
    const risicoNiveau = bepaalRisicoNiveau(
      gebiedsInfo.legendaKlasse,
      gebiedsInfo.percentageVoor1970
    );
    
    const aanbevelingen = genereerAanbevelingen(risicoNiveau, gebiedsInfo);
    
    return {
      inRisicogebied: true,
      risicoNiveau,
      gebiedsInfo,
      aanbevelingen,
      checkDatum
    };
    
  } catch (error) {
    console.error('Funderingsproblematiek check error:', error);
    return {
      inRisicogebied: false,
      risicoNiveau: 'geen',
      gebiedsInfo: null,
      aanbevelingen: ['Funderingscheck kon niet worden uitgevoerd (technische fout).'],
      checkDatum
    };
  }
}

/**
 * Check funderingsproblematiek voor meerdere locaties (batch)
 */
export async function checkFunderingsproblematiekBatch(
  locaties: Array<{ lat: number; lon: number; label?: string }>
): Promise<Array<FunderingsCheckResult & { label?: string }>> {
  const results = await Promise.all(
    locaties.map(async (loc) => {
      const result = await checkFunderingsproblematiek(loc.lat, loc.lon);
      return { ...result, label: loc.label };
    })
  );
  return results;
}
