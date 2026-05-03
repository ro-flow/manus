/**
 * Externe Veiligheid Service
 * 
 * Analyseert risicocontouren (PR/GR) voor:
 * - Bevi-inrichtingen (gevaarlijke stoffen)
 * - Buisleidingen (gas, olie, chemie)
 * - Transportroutes (weg, spoor, water)
 * - LPG-tankstations
 * 
 * Integreert met REV (Register Externe Veiligheid) via PDOK
 */

export interface ExterneVeiligheidResult {
  heeftRisico: boolean;
  plaatsgebondenRisico: {
    binnenPR10_6: boolean; // Binnen 10⁻⁶ contour (grenswaarde)
    binnenPR10_5: boolean; // Binnen 10⁻⁵ contour (verhoogd risico)
    afstandTotPR10_6: number | null; // meters
    bronType: string | null;
    bronNaam: string | null;
  };
  groepsrisico: {
    relevantVoorGR: boolean;
    invloedsgebiedAfstand: number | null;
    verantwoordingsplicht: boolean;
    adviesVeiligheidsregio: boolean;
  };
  beviInrichtingen: Array<{
    naam: string;
    type: string;
    afstand: number;
    risicoCategorie: string;
    prContour: number; // meters
  }>;
  buisleidingen: Array<{
    type: 'aardgas' | 'olie' | 'chemie' | 'overig';
    beheerder: string | null;
    afstand: number;
    druk: number | null; // bar
    diameter: number | null; // mm
    invloedsgebied: number; // meters
  }>;
  transportroutes: {
    weg: {
      aanwezig: boolean;
      routeNaam: string | null;
      afstand: number | null;
      prContour: number | null;
    };
    spoor: {
      aanwezig: boolean;
      trajectNaam: string | null;
      afstand: number | null;
      prContour: number | null;
    };
    water: {
      aanwezig: boolean;
      vaarwegNaam: string | null;
      afstand: number | null;
      prContour: number | null;
    };
  };
  lpgTankstations: Array<{
    naam: string;
    afstand: number;
    doorzet: 'klein' | 'middel' | 'groot';
    prContour: number;
  }>;
  grenswaarden: {
    pr10_6_kwetsbaarObject: string;
    pr10_6_beperktKwetsbaarObject: string;
    groepsrisicoOrientatiewaarde: string;
  };
  aanbevelingen: string[];
  bronnen: string[];
}

// REV API endpoint (PDOK)
const REV_API_BASE = 'https://service.pdok.nl/rws/rev/wfs/v1_0';

// Standaard PR-contouren per type inrichting (meters)
const STANDAARD_PR_CONTOUREN: Record<string, number> = {
  lpg_klein: 45, // <1000 m³/jaar
  lpg_middel: 110, // 1000-1500 m³/jaar
  lpg_groot: 150, // >1500 m³/jaar
  ammoniakkoeling: 200,
  chlooropslag: 300,
  lpg_opslag: 80,
  propaan_opslag: 50,
  benzine_opslag: 25,
};

// Invloedsgebieden buisleidingen (meters)
const BUISLEIDING_INVLOEDSGEBIEDEN: Record<string, (diameter: number, druk: number) => number> = {
  aardgas: (diameter, druk) => Math.round(0.5 * Math.sqrt(diameter * druk)),
  olie: () => 45,
  chemie: (diameter) => Math.round(1.5 * diameter / 10),
  overig: () => 30,
};

/**
 * Bepaal of een object kwetsbaar of beperkt kwetsbaar is
 */
function bepaalKwetsbaarheid(
  functie: string
): 'kwetsbaar' | 'beperkt_kwetsbaar' | 'niet_kwetsbaar' {
  const kwetsbaareFuncties = [
    'wonen', 'ziekenhuis', 'school', 'kinderdagverblijf', 'verzorgingshuis',
    'gevangenis', 'hotel', 'camping', 'recreatie'
  ];
  
  const beperktKwetsbaareFuncties = [
    'kantoor', 'winkel', 'horeca', 'sport', 'industrie_klein'
  ];
  
  const functieLower = functie.toLowerCase();
  
  if (kwetsbaareFuncties.some(f => functieLower.includes(f))) {
    return 'kwetsbaar';
  }
  
  if (beperktKwetsbaareFuncties.some(f => functieLower.includes(f))) {
    return 'beperkt_kwetsbaar';
  }
  
  return 'niet_kwetsbaar';
}

/**
 * Haal Bevi-inrichtingen op via REV API
 */
async function haalBeviInrichtingenOp(lat: number, lon: number, straal: number = 1000): Promise<Array<{
  naam: string;
  type: string;
  afstand: number;
  prContour: number;
}>> {
  try {
    // Converteer naar RD coördinaten
    const rdX = Math.round((lon - 3.31) * 40000 + 155000);
    const rdY = Math.round((lat - 47.97) * 111000 + 463000);
    
    const bbox = `${rdX - straal},${rdY - straal},${rdX + straal},${rdY + straal}`;
    
    const url = `${REV_API_BASE}?service=WFS&version=2.0.0&request=GetFeature&typeName=rev:productiefaciliteit&outputFormat=application/json&bbox=${bbox},EPSG:28992`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('REV API niet beschikbaar');
      return [];
    }
    
    const data = await response.json();
    
    if (!data.features) return [];
    
    return data.features.map((feature: any) => {
      const coords = feature.geometry?.coordinates;
      let afstand = straal;
      
      if (coords) {
        const dx = coords[0] - rdX;
        const dy = coords[1] - rdY;
        afstand = Math.round(Math.sqrt(dx * dx + dy * dy));
      }
      
      return {
        naam: feature.properties?.naam || 'Onbekende inrichting',
        type: feature.properties?.type || 'Bevi-inrichting',
        afstand,
        prContour: feature.properties?.pr_contour || 100
      };
    });
  } catch (error) {
    console.error('Fout bij ophalen Bevi-inrichtingen:', error);
    return [];
  }
}

/**
 * Haal buisleidingen op via REV API
 */
async function haalBuisleidingenOp(lat: number, lon: number, straal: number = 500): Promise<Array<{
  type: 'aardgas' | 'olie' | 'chemie' | 'overig';
  beheerder: string | null;
  afstand: number;
  druk: number | null;
  diameter: number | null;
  invloedsgebied: number;
}>> {
  try {
    const rdX = Math.round((lon - 3.31) * 40000 + 155000);
    const rdY = Math.round((lat - 47.97) * 111000 + 463000);
    
    const bbox = `${rdX - straal},${rdY - straal},${rdX + straal},${rdY + straal}`;
    
    const url = `${REV_API_BASE}?service=WFS&version=2.0.0&request=GetFeature&typeName=rev:buisleiding&outputFormat=application/json&bbox=${bbox},EPSG:28992`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('REV Buisleidingen API niet beschikbaar');
      return [];
    }
    
    const data = await response.json();
    
    if (!data.features) return [];
    
    return data.features.map((feature: any) => {
      const props = feature.properties || {};
      const type = (props.stofcategorie || 'overig').toLowerCase() as 'aardgas' | 'olie' | 'chemie' | 'overig';
      const diameter = props.diameter || 500;
      const druk = props.druk || 40;
      
      const invloedsgebiedFn = BUISLEIDING_INVLOEDSGEBIEDEN[type] || BUISLEIDING_INVLOEDSGEBIEDEN.overig;
      
      return {
        type,
        beheerder: props.beheerder || null,
        afstand: props.afstand || 100, // Geschatte afstand
        druk,
        diameter,
        invloedsgebied: invloedsgebiedFn(diameter, druk)
      };
    });
  } catch (error) {
    console.error('Fout bij ophalen buisleidingen:', error);
    return [];
  }
}

/**
 * Analyseer externe veiligheid voor een locatie
 */
export async function analyseerExterneVeiligheid(
  lat: number,
  lon: number,
  beoogdeFunctie: string = 'wonen',
  nabijheidData?: {
    afstandTotSnelweg?: number;
    afstandTotSpoor?: number;
    afstandTotVaarweg?: number;
    lpgStations?: Array<{
      naam: string;
      afstand: number;
      doorzet: 'klein' | 'middel' | 'groot';
    }>;
  }
): Promise<ExterneVeiligheidResult> {
  const bronnen: string[] = [];
  const aanbevelingen: string[] = [];
  
  // Bepaal kwetsbaarheid van het object
  const kwetsbaarheid = bepaalKwetsbaarheid(beoogdeFunctie);
  
  // Haal Bevi-inrichtingen op
  const beviInrichtingen = await haalBeviInrichtingenOp(lat, lon);
  if (beviInrichtingen.length > 0) {
    bronnen.push('REV - Register Externe Veiligheid (PDOK)');
  }
  
  // Haal buisleidingen op
  const buisleidingen = await haalBuisleidingenOp(lat, lon);
  if (buisleidingen.length > 0 && !bronnen.includes('REV - Register Externe Veiligheid (PDOK)')) {
    bronnen.push('REV - Register Externe Veiligheid (PDOK)');
  }
  
  // Verwerk LPG-tankstations
  const lpgTankstations = (nabijheidData?.lpgStations || []).map(station => ({
    ...station,
    prContour: STANDAARD_PR_CONTOUREN[`lpg_${station.doorzet}`] || 110
  }));
  
  // Bepaal PR 10⁻⁶ status
  let binnenPR10_6 = false;
  let binnenPR10_5 = false;
  let dichtstbijzijndeBron: { type: string; naam: string; afstand: number } | null = null;
  
  // Check Bevi-inrichtingen
  for (const inrichting of beviInrichtingen) {
    if (inrichting.afstand < inrichting.prContour) {
      binnenPR10_6 = true;
      if (!dichtstbijzijndeBron || inrichting.afstand < dichtstbijzijndeBron.afstand) {
        dichtstbijzijndeBron = {
          type: 'Bevi-inrichting',
          naam: inrichting.naam,
          afstand: inrichting.afstand
        };
      }
    }
    if (inrichting.afstand < inrichting.prContour * 0.5) {
      binnenPR10_5 = true;
    }
  }
  
  // Check LPG-tankstations
  for (const station of lpgTankstations) {
    if (station.afstand < station.prContour) {
      binnenPR10_6 = true;
      if (!dichtstbijzijndeBron || station.afstand < dichtstbijzijndeBron.afstand) {
        dichtstbijzijndeBron = {
          type: 'LPG-tankstation',
          naam: station.naam,
          afstand: station.afstand
        };
      }
    }
  }
  
  // Check buisleidingen
  for (const leiding of buisleidingen) {
    if (leiding.afstand < leiding.invloedsgebied) {
      if (!dichtstbijzijndeBron || leiding.afstand < dichtstbijzijndeBron.afstand) {
        dichtstbijzijndeBron = {
          type: `Buisleiding (${leiding.type})`,
          naam: leiding.beheerder || 'Onbekende beheerder',
          afstand: leiding.afstand
        };
      }
    }
  }
  
  // Bepaal groepsrisico relevantie
  const maxInvloedsgebied = Math.max(
    ...beviInrichtingen.map(i => i.prContour * 3),
    ...buisleidingen.map(b => b.invloedsgebied),
    ...lpgTankstations.map(l => l.prContour * 2),
    0
  );
  
  const relevantVoorGR = maxInvloedsgebied > 0;
  const verantwoordingsplicht = relevantVoorGR && kwetsbaarheid !== 'niet_kwetsbaar';
  
  // Genereer aanbevelingen
  if (binnenPR10_6 && kwetsbaarheid === 'kwetsbaar') {
    aanbevelingen.push(
      `KRITIEK: Locatie ligt binnen PR 10⁻⁶ contour van ${dichtstbijzijndeBron?.naam}. Kwetsbare objecten zijn hier NIET toegestaan (art. 5.12 Bkl).`
    );
  } else if (binnenPR10_6 && kwetsbaarheid === 'beperkt_kwetsbaar') {
    aanbevelingen.push(
      `WAARSCHUWING: Locatie ligt binnen PR 10⁻⁶ contour. Voor beperkt kwetsbare objecten geldt een richtwaarde. Onderbouwing vereist.`
    );
  }
  
  if (verantwoordingsplicht) {
    aanbevelingen.push(
      'Verantwoordingsplicht groepsrisico is van toepassing. Advies Veiligheidsregio vereist (art. 5.14 Bkl).'
    );
  }
  
  if (buisleidingen.length > 0) {
    aanbevelingen.push(
      'Buisleiding(en) in de nabijheid. Controleer belemmeringenstrook en graafverbod. KLIC-melding verplicht bij graafwerkzaamheden.'
    );
    bronnen.push('KLIC (Kadaster)');
  }
  
  // Transportroutes
  const transportroutes = {
    weg: {
      aanwezig: nabijheidData?.afstandTotSnelweg !== undefined && nabijheidData.afstandTotSnelweg < 200,
      routeNaam: nabijheidData?.afstandTotSnelweg !== undefined ? 'Rijksweg (route gevaarlijke stoffen)' : null,
      afstand: nabijheidData?.afstandTotSnelweg || null,
      prContour: 30 // Standaard voor basisnet weg
    },
    spoor: {
      aanwezig: nabijheidData?.afstandTotSpoor !== undefined && nabijheidData.afstandTotSpoor < 200,
      trajectNaam: nabijheidData?.afstandTotSpoor !== undefined ? 'Spoortraject (basisnet)' : null,
      afstand: nabijheidData?.afstandTotSpoor || null,
      prContour: 30 // Standaard voor basisnet spoor
    },
    water: {
      aanwezig: nabijheidData?.afstandTotVaarweg !== undefined && nabijheidData.afstandTotVaarweg < 200,
      vaarwegNaam: nabijheidData?.afstandTotVaarweg !== undefined ? 'Vaarweg (basisnet)' : null,
      afstand: nabijheidData?.afstandTotVaarweg || null,
      prContour: 25 // Standaard voor basisnet water
    }
  };
  
  if (transportroutes.weg.aanwezig || transportroutes.spoor.aanwezig || transportroutes.water.aanwezig) {
    aanbevelingen.push(
      'Locatie ligt nabij Basisnet transportroute. Controleer plasbrandaandachtsgebied (PAG) en veiligheidszone.'
    );
    bronnen.push('Basisnet (I&W)');
  }
  
  const heeftRisico = binnenPR10_6 || binnenPR10_5 || verantwoordingsplicht || 
    buisleidingen.some(b => b.afstand < b.invloedsgebied);
  
  return {
    heeftRisico,
    plaatsgebondenRisico: {
      binnenPR10_6,
      binnenPR10_5,
      afstandTotPR10_6: dichtstbijzijndeBron?.afstand || null,
      bronType: dichtstbijzijndeBron?.type || null,
      bronNaam: dichtstbijzijndeBron?.naam || null
    },
    groepsrisico: {
      relevantVoorGR,
      invloedsgebiedAfstand: maxInvloedsgebied > 0 ? maxInvloedsgebied : null,
      verantwoordingsplicht,
      adviesVeiligheidsregio: verantwoordingsplicht
    },
    beviInrichtingen: beviInrichtingen.map(i => ({
      ...i,
      risicoCategorie: i.afstand < i.prContour ? 'HOOG' : 'MIDDEL'
    })),
    buisleidingen,
    transportroutes,
    lpgTankstations,
    grenswaarden: {
      pr10_6_kwetsbaarObject: 'Grenswaarde: niet toegestaan binnen PR 10⁻⁶ contour',
      pr10_6_beperktKwetsbaarObject: 'Richtwaarde: onderbouwing vereist binnen PR 10⁻⁶ contour',
      groepsrisicoOrientatiewaarde: 'Oriëntatiewaarde: verantwoordingsplicht bij overschrijding'
    },
    aanbevelingen,
    bronnen
  };
}
