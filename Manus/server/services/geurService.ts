/**
 * Geur Service
 * 
 * Analyseert geurbelasting van veehouderijen en industrie
 * Integreert met PDOK Geurcontouren en provinciale data
 */

export interface GeurResult {
  heeftGeurbelasting: boolean;
  veehouderij: {
    aanwezig: boolean;
    aantalBedrijvenNabij: number;
    dichtstbijzijndeAfstand: number | null; // meters
    typeVeehouderij: string | null;
    geurbelastingOu: number | null; // odour units per m³
    overschrijdtNorm: boolean;
    norm: number; // ou/m³
  };
  industrie: {
    aanwezig: boolean;
    binnenGeurcontour: boolean;
    bedrijfNaam: string | null;
    afstandTotContour: number | null;
  };
  rioolwaterzuivering: {
    aanwezig: boolean;
    afstand: number | null;
    naamInstallatie: string | null;
  };
  afvalverwerking: {
    aanwezig: boolean;
    afstand: number | null;
    typeVerwerking: string | null;
  };
  grenswaarden: {
    wonenBuitengebied: number; // 14 ou/m³
    wonenBebouwdeKom: number; // 3 ou/m³
    kantoor: number; // 5 ou/m³
  };
  aanbevelingen: string[];
  bronnen: string[];
}

// Veehouderij types en hun geurproductie
const VEEHOUDERIJ_GEUR_FACTOREN: Record<string, { geurPerDier: number; typischAantal: number }> = {
  varkens: { geurPerDier: 23, typischAantal: 500 },
  kippen_leghennen: { geurPerDier: 0.24, typischAantal: 50000 },
  kippen_vleeskuikens: { geurPerDier: 0.15, typischAantal: 80000 },
  rundvee_melkkoeien: { geurPerDier: 8.6, typischAantal: 100 },
  rundvee_vleesvee: { geurPerDier: 6.7, typischAantal: 200 },
  geiten: { geurPerDier: 5.5, typischAantal: 500 },
  nertsen: { geurPerDier: 4.5, typischAantal: 5000 },
};

// Minimale afstanden per veehouderijtype (meters)
const MINIMALE_AFSTANDEN: Record<string, { bebouwdeKom: number; buitengebied: number }> = {
  varkens: { bebouwdeKom: 250, buitengebied: 100 },
  kippen_leghennen: { bebouwdeKom: 200, buitengebied: 75 },
  kippen_vleeskuikens: { bebouwdeKom: 200, buitengebied: 75 },
  rundvee_melkkoeien: { bebouwdeKom: 100, buitengebied: 50 },
  rundvee_vleesvee: { bebouwdeKom: 100, buitengebied: 50 },
  geiten: { bebouwdeKom: 150, buitengebied: 75 },
  nertsen: { bebouwdeKom: 300, buitengebied: 150 },
};

/**
 * Bereken geurbelasting op basis van afstand en emissiefactor
 * Vereenvoudigd model gebaseerd op V-stacks verspreidingsmodel
 */
function berekenGeurbelasting(
  geurEmissie: number, // ou/s
  afstand: number // meters
): number {
  if (afstand <= 0) return 0;
  
  // Vereenvoudigd verspreidingsmodel
  // Geurbelasting neemt af met afstand²
  const verspreidingsfactor = 0.5; // Afhankelijk van windrichting en stabiliteit
  const geurbelasting = (geurEmissie * verspreidingsfactor) / (Math.PI * afstand * afstand);
  
  // Converteer naar ou/m³ (98-percentiel)
  return Math.round(geurbelasting * 1000) / 1000;
}

/**
 * Bepaal of geurbelasting de norm overschrijdt
 */
function overschrijdtNorm(
  geurbelasting: number,
  locatieType: 'bebouwde_kom' | 'buitengebied'
): { overschrijdt: boolean; norm: number } {
  const normen = {
    bebouwde_kom: 3, // ou/m³
    buitengebied: 14 // ou/m³
  };
  
  const norm = normen[locatieType];
  return {
    overschrijdt: geurbelasting > norm,
    norm
  };
}

/**
 * Schat geurbelasting van veehouderij op basis van type en afstand
 */
function schatVeehouderijGeur(
  typeVeehouderij: string,
  afstand: number,
  aantalDieren?: number
): number | null {
  const factor = VEEHOUDERIJ_GEUR_FACTOREN[typeVeehouderij];
  if (!factor) return null;
  
  const aantal = aantalDieren || factor.typischAantal;
  const totaleGeurEmissie = factor.geurPerDier * aantal;
  
  return berekenGeurbelasting(totaleGeurEmissie, afstand);
}

/**
 * Analyseer geurbelasting voor een locatie
 */
export async function analyseerGeurbelasting(
  lat: number,
  lon: number,
  locatieType: 'bebouwde_kom' | 'buitengebied' = 'bebouwde_kom',
  nabijheidData?: {
    veehouderijen?: Array<{
      type: string;
      afstand: number;
      aantalDieren?: number;
    }>;
    industrieGeurcontour?: {
      binnenContour: boolean;
      bedrijfNaam?: string;
      afstand?: number;
    };
    rioolwaterzuivering?: {
      afstand: number;
      naam?: string;
    };
    afvalverwerking?: {
      afstand: number;
      type?: string;
    };
  }
): Promise<GeurResult> {
  const bronnen: string[] = [];
  const aanbevelingen: string[] = [];
  
  // Analyseer veehouderijen
  let dichtstbijzijndeVeehouderij: {
    type: string;
    afstand: number;
    geurbelasting: number;
  } | null = null;
  
  let aantalVeehouderijNabij = 0;
  
  if (nabijheidData?.veehouderijen && nabijheidData.veehouderijen.length > 0) {
    bronnen.push('BVB (Bestand Veehouderij Bedrijven)');
    
    for (const veehouderij of nabijheidData.veehouderijen) {
      const geur = schatVeehouderijGeur(
        veehouderij.type,
        veehouderij.afstand,
        veehouderij.aantalDieren
      );
      
      if (veehouderij.afstand < 500) {
        aantalVeehouderijNabij++;
      }
      
      if (geur !== null && (!dichtstbijzijndeVeehouderij || veehouderij.afstand < dichtstbijzijndeVeehouderij.afstand)) {
        dichtstbijzijndeVeehouderij = {
          type: veehouderij.type,
          afstand: veehouderij.afstand,
          geurbelasting: geur
        };
      }
    }
  }
  
  // Bepaal norm overschrijding
  const normCheck = dichtstbijzijndeVeehouderij 
    ? overschrijdtNorm(dichtstbijzijndeVeehouderij.geurbelasting, locatieType)
    : { overschrijdt: false, norm: locatieType === 'bebouwde_kom' ? 3 : 14 };
  
  // Genereer aanbevelingen
  if (dichtstbijzijndeVeehouderij) {
    const minimaleAfstand = MINIMALE_AFSTANDEN[dichtstbijzijndeVeehouderij.type];
    const vereistAfstand = locatieType === 'bebouwde_kom' 
      ? minimaleAfstand?.bebouwdeKom 
      : minimaleAfstand?.buitengebied;
    
    if (vereistAfstand && dichtstbijzijndeVeehouderij.afstand < vereistAfstand) {
      aanbevelingen.push(
        `Afstand tot ${dichtstbijzijndeVeehouderij.type} veehouderij (${dichtstbijzijndeVeehouderij.afstand}m) is kleiner dan de minimale afstand (${vereistAfstand}m). Geuronderzoek vereist.`
      );
    }
    
    if (normCheck.overschrijdt) {
      aanbevelingen.push(
        `Berekende geurbelasting (${dichtstbijzijndeVeehouderij.geurbelasting} ou/m³) overschrijdt de norm (${normCheck.norm} ou/m³). Uitgebreid geuronderzoek noodzakelijk.`
      );
    }
  }
  
  if (nabijheidData?.industrieGeurcontour?.binnenContour) {
    aanbevelingen.push(
      `Locatie ligt binnen geurcontour van ${nabijheidData.industrieGeurcontour.bedrijfNaam || 'industrieel bedrijf'}. Raadpleeg de milieuvergunning van het bedrijf.`
    );
    bronnen.push('Provinciale geurcontouren industrie');
  }
  
  if (nabijheidData?.rioolwaterzuivering && nabijheidData.rioolwaterzuivering.afstand < 400) {
    aanbevelingen.push(
      `Rioolwaterzuiveringsinstallatie op ${nabijheidData.rioolwaterzuivering.afstand}m afstand. Geurhinder mogelijk bij bepaalde windrichtingen.`
    );
  }
  
  if (nabijheidData?.afvalverwerking && nabijheidData.afvalverwerking.afstand < 500) {
    aanbevelingen.push(
      `Afvalverwerkingsinstallatie (${nabijheidData.afvalverwerking.type || 'type onbekend'}) op ${nabijheidData.afvalverwerking.afstand}m afstand. Controleer geurvergunning.`
    );
  }
  
  // Standaard aanbeveling als er veehouderijen in de buurt zijn
  if (aantalVeehouderijNabij > 0 && aanbevelingen.length === 0) {
    aanbevelingen.push(
      'Er bevinden zich veehouderijen in de omgeving. Controleer of een geuronderzoek noodzakelijk is conform de Wet geurhinder en veehouderij.'
    );
  }
  
  const heeftGeurbelasting = 
    (dichtstbijzijndeVeehouderij !== null && dichtstbijzijndeVeehouderij.geurbelasting > 0.5) ||
    (nabijheidData?.industrieGeurcontour?.binnenContour === true) ||
    (nabijheidData?.rioolwaterzuivering !== undefined && nabijheidData.rioolwaterzuivering.afstand < 400) ||
    (nabijheidData?.afvalverwerking !== undefined && nabijheidData.afvalverwerking.afstand < 500);
  
  return {
    heeftGeurbelasting,
    veehouderij: {
      aanwezig: dichtstbijzijndeVeehouderij !== null,
      aantalBedrijvenNabij: aantalVeehouderijNabij,
      dichtstbijzijndeAfstand: dichtstbijzijndeVeehouderij?.afstand || null,
      typeVeehouderij: dichtstbijzijndeVeehouderij?.type || null,
      geurbelastingOu: dichtstbijzijndeVeehouderij?.geurbelasting || null,
      overschrijdtNorm: normCheck.overschrijdt,
      norm: normCheck.norm
    },
    industrie: {
      aanwezig: nabijheidData?.industrieGeurcontour !== undefined,
      binnenGeurcontour: nabijheidData?.industrieGeurcontour?.binnenContour || false,
      bedrijfNaam: nabijheidData?.industrieGeurcontour?.bedrijfNaam || null,
      afstandTotContour: nabijheidData?.industrieGeurcontour?.afstand || null
    },
    rioolwaterzuivering: {
      aanwezig: nabijheidData?.rioolwaterzuivering !== undefined,
      afstand: nabijheidData?.rioolwaterzuivering?.afstand || null,
      naamInstallatie: nabijheidData?.rioolwaterzuivering?.naam || null
    },
    afvalverwerking: {
      aanwezig: nabijheidData?.afvalverwerking !== undefined,
      afstand: nabijheidData?.afvalverwerking?.afstand || null,
      typeVerwerking: nabijheidData?.afvalverwerking?.type || null
    },
    grenswaarden: {
      wonenBuitengebied: 14,
      wonenBebouwdeKom: 3,
      kantoor: 5
    },
    aanbevelingen,
    bronnen
  };
}
