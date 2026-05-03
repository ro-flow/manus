/**
 * AERIUS Connect API Service
 * 
 * Service voor het uitvoeren van stikstofberekeningen via de AERIUS Connect API.
 * Ondersteunt OwN2000 (Omgevingswet Natura 2000) berekeningen.
 * 
 * API Documentatie: https://connect.aerius.nl/api/swagger-ui/index.html
 */

const AERIUS_API_KEY = process.env.AERIUS_API_KEY;
const AERIUS_BASE_URL = "https://connect.aerius.nl/api/v8";

// Types voor AERIUS API responses
export interface AeriusVersionInfo {
  version: string;
  releaseDate?: string;
  [key: string]: unknown;
}

export interface AeriusJobStatus {
  jobKey: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress?: number;
  message?: string;
  resultUrl?: string;
  [key: string]: unknown;
}

export interface AeriusCalculationResult {
  jobKey: string;
  status: string;
  depositions?: AeriusDeposition[];
  warnings?: string[];
  errors?: string[];
  [key: string]: unknown;
}

export interface AeriusDeposition {
  receptorId: string;
  receptorName?: string;
  habitatType?: string;
  deposition: number; // mol/ha/jaar
  criticalLoad?: number;
  exceedance?: number;
  [key: string]: unknown;
}

export interface AeriusNatura2000Area {
  code: string;
  name: string;
  distance?: number; // km
  [key: string]: unknown;
}

// Helper functie voor API requests
async function aeriusRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!AERIUS_API_KEY) {
    throw new Error("AERIUS_API_KEY is not configured");
  }

  const url = `${AERIUS_BASE_URL}${endpoint}`;
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "api-key": AERIUS_API_KEY,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AERIUS API error (${response.status}): ${errorText}`);
  }

  // Some endpoints return empty body
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Valideer de API-key
 */
export async function validateApiKey(): Promise<boolean> {
  try {
    await aeriusRequest("/user/validateApiKey", { method: "GET" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Haal AERIUS Calculator versie informatie op
 */
export async function getVersionInfo(): Promise<AeriusVersionInfo> {
  return aeriusRequest<AeriusVersionInfo>("/info/version", { method: "GET" });
}

/**
 * Haal systeem informatie op
 */
export async function getSystemInfo(locale: string = "nl"): Promise<Record<string, unknown>> {
  return aeriusRequest<Record<string, unknown>>(`/system-info/${locale}`, { method: "GET" });
}

/**
 * Haal alle jobs op voor de huidige gebruiker
 */
export async function getJobs(): Promise<AeriusJobStatus[]> {
  return aeriusRequest<AeriusJobStatus[]>("/jobs", { method: "GET" });
}

/**
 * Haal status van een specifieke job op
 */
export async function getJobStatus(jobKey: string): Promise<AeriusJobStatus> {
  return aeriusRequest<AeriusJobStatus>(`/jobs/${jobKey}`, { method: "GET" });
}

/**
 * Annuleer een job
 */
export async function cancelJob(jobKey: string): Promise<void> {
  await aeriusRequest(`/jobs/${jobKey}/cancel`, { method: "POST" });
}

/**
 * Verwijder een job
 */
export async function deleteJob(jobKey: string): Promise<void> {
  await aeriusRequest(`/jobs/${jobKey}`, { method: "DELETE" });
}

/**
 * Wacht tot een job is voltooid
 */
export async function waitForJob(
  jobKey: string,
  maxWaitMs: number = 300000, // 5 minuten default
  pollIntervalMs: number = 2000
): Promise<AeriusJobStatus> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await getJobStatus(jobKey);
    
    if (status.status === "COMPLETED" || status.status === "FAILED" || status.status === "CANCELLED") {
      return status;
    }
    
    // Wacht voor volgende poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  throw new Error(`Job ${jobKey} did not complete within ${maxWaitMs}ms`);
}

/**
 * Bepaal of een locatie binnen of nabij een Natura 2000 gebied ligt
 * Dit is een voortoets check - bepaalt of AERIUS berekening nodig is
 */
export async function checkNatura2000Proximity(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<{
  withinNatura2000: boolean;
  nearbyAreas: AeriusNatura2000Area[];
  requiresCalculation: boolean;
  message: string;
}> {
  // Note: AERIUS Connect heeft geen directe proximity check endpoint
  // Dit zou via de receptor sets of een externe Natura 2000 API moeten
  // Voor nu retourneren we een indicatie gebaseerd op algemene regels
  
  // In de praktijk zou je hier de PDOK Natura2000 API kunnen gebruiken
  // of de receptor sets van AERIUS om te bepalen of berekening nodig is
  
  return {
    withinNatura2000: false,
    nearbyAreas: [],
    requiresCalculation: true, // Altijd true voor nu - veilige default
    message: "Stikstofberekening aanbevolen voor activiteiten met emissies. Gebruik AERIUS Calculator voor exacte depositieberekening.",
  };
}

/**
 * Bepaal of een activiteit stikstofemissies kan veroorzaken
 */
export function activityMayHaveNitrogenEmissions(
  activiteiten: string[]
): {
  hasEmissions: boolean;
  emissionSources: string[];
  recommendation: string;
} {
  // Activiteiten die typisch stikstofemissies veroorzaken
  const emissionActivities: Record<string, string> = {
    "bouwen": "Bouwverkeer en materieel",
    "slopen": "Sloopverkeer en materieel",
    "veehouderij": "Veestapel emissies",
    "landbouw": "Landbouwmachines en bemesting",
    "industrie": "Industriële processen",
    "verkeer": "Verkeersaantrekkende werking",
    "parkeren": "Verkeersaantrekkende werking",
    "horeca": "Keukenemissies en verkeer",
    "logistiek": "Vrachtverkeer",
    "distributie": "Vrachtverkeer",
    "evenement": "Tijdelijk verkeer",
    "recreatie": "Bezoekerverkeer",
    "wonen": "Verkeersaantrekkende werking (bij grotere projecten)",
    "kantoor": "Verkeersaantrekkende werking",
  };

  const foundSources: string[] = [];
  
  for (const activiteit of activiteiten) {
    const lowerActiviteit = activiteit.toLowerCase();
    for (const [key, source] of Object.entries(emissionActivities)) {
      if (lowerActiviteit.includes(key)) {
        if (!foundSources.includes(source)) {
          foundSources.push(source);
        }
      }
    }
  }

  const hasEmissions = foundSources.length > 0;
  
  return {
    hasEmissions,
    emissionSources: foundSources,
    recommendation: hasEmissions
      ? `Stikstofberekening vereist vanwege: ${foundSources.join(", ")}. Voer AERIUS Calculator berekening uit.`
      : "Geen significante stikstofemissies verwacht. AERIUS berekening waarschijnlijk niet nodig.",
  };
}

/**
 * Genereer een stikstof voortoets samenvatting voor het behandelrapport
 * Synchrone versie - gebruikt alleen activiteiten analyse
 */
export function generateNitrogenPreAssessment(
  activiteiten: string[],
  locatie: { lat: number; lng: number; adres: string }
): {
  requiresCalculation: boolean;
  riskLevel: "laag" | "middel" | "hoog";
  summary: string;
  recommendations: string[];
  emissionSources: string[];
  natura2000Check?: {
    binnenGebied: boolean;
    afstandMeter?: number;
    dichtstbijzijndeGebied?: string;
  };
} {
  const emissionCheck = activityMayHaveNitrogenEmissions(activiteiten);
  
  // Bepaal risiconiveau
  let riskLevel: "laag" | "middel" | "hoog" = "laag";
  if (emissionCheck.emissionSources.length >= 3) {
    riskLevel = "hoog";
  } else if (emissionCheck.emissionSources.length >= 1) {
    riskLevel = "middel";
  }

  const recommendations: string[] = [];
  
  if (emissionCheck.hasEmissions) {
    recommendations.push("Voer een AERIUS Calculator berekening uit");
    recommendations.push("Bepaal de stikstofdepositie op nabijgelegen Natura 2000 gebieden");
    
    if (riskLevel === "hoog") {
      recommendations.push("Overweeg mitigerende maatregelen zoals elektrisch materieel");
      recommendations.push("Onderzoek mogelijkheden voor intern of extern salderen");
    }
  } else {
    recommendations.push("AERIUS berekening waarschijnlijk niet nodig");
    recommendations.push("Documenteer onderbouwing waarom geen significante emissies verwacht worden");
  }

  const summary = emissionCheck.hasEmissions
    ? `De aangevraagde activiteiten kunnen stikstofemissies veroorzaken (${emissionCheck.emissionSources.join(", ")}). Een AERIUS berekening is nodig om de depositie op Natura 2000 gebieden te bepalen.`
    : "Op basis van de aangevraagde activiteiten worden geen significante stikstofemissies verwacht. Een AERIUS berekening is waarschijnlijk niet nodig, maar dit moet worden onderbouwd in de aanvraag.";

  return {
    requiresCalculation: emissionCheck.hasEmissions,
    riskLevel,
    summary,
    recommendations,
    emissionSources: emissionCheck.emissionSources,
  };
}

/**
 * Genereer een uitgebreide stikstof voortoets met Natura 2000 check
 * Async versie - haalt ook Natura 2000 afstand op via PDOK API
 */
export async function generateNitrogenPreAssessmentWithNatura2000(
  activiteiten: string[],
  locatie: { lat: number; lng: number; adres: string }
): Promise<{
  requiresCalculation: boolean;
  riskLevel: "laag" | "middel" | "hoog";
  summary: string;
  recommendations: string[];
  emissionSources: string[];
  natura2000Check: {
    success: boolean;
    binnenGebied: boolean;
    afstandMeter?: number;
    dichtstbijzijndeGebied?: string;
    gebiedenBinnenStraal: Array<{ naam: string; afstandMeter?: number }>;
    stikstofRisico: 'geen' | 'laag' | 'middel' | 'hoog';
    aanbeveling: string;
  };
  beschermdeGebiedenCheck?: {
    binnenNNN: boolean;
    binnenNationaalPark: boolean;
    dichtstbijzijndeNNN?: { naam: string; afstandMeter?: number };
    dichtstbijzijndeNationaalPark?: { naam: string; afstandMeter?: number };
    nnnGebiedenCount: number;
    nationaleParkenCount: number;
    aanbevelingen: string[];
  };
}> {
  // Import dynamisch om circulaire dependencies te voorkomen
  const { checkNatura2000 } = await import('./natura2000ApiService');
  const { checkBeschermdeGebieden } = await import('./beschermdeGebiedenService');
  
  const emissionCheck = activityMayHaveNitrogenEmissions(activiteiten);
  
  // Voer Natura 2000 en beschermde gebieden checks parallel uit
  const [natura2000Result, beschermdeGebiedenResult] = await Promise.all([
    checkNatura2000(locatie.lat, locatie.lng, 10000),
    checkBeschermdeGebieden(locatie.lat, locatie.lng, 10)
  ]);
  
  // Combineer risico's: hoogste van emissie risico en Natura 2000 nabijheid
  let riskLevel: "laag" | "middel" | "hoog" = "laag";
  
  // Emissie risico
  if (emissionCheck.emissionSources.length >= 3) {
    riskLevel = "hoog";
  } else if (emissionCheck.emissionSources.length >= 1) {
    riskLevel = "middel";
  }
  
  // Natura 2000 risico kan het verhogen
  if (natura2000Result.stikstofRisico === 'hoog') {
    riskLevel = "hoog";
  } else if (natura2000Result.stikstofRisico === 'middel' && riskLevel === 'laag') {
    riskLevel = "middel";
  }
  
  // Bepaal of berekening nodig is
  const requiresCalculation = emissionCheck.hasEmissions && 
    (natura2000Result.stikstofRisico !== 'geen');

  const recommendations: string[] = [];
  
  if (requiresCalculation) {
    recommendations.push("Voer een AERIUS Calculator berekening uit");
    
    if (natura2000Result.dichtstbijzijndeGebied) {
      recommendations.push(`Bereken depositie op ${natura2000Result.dichtstbijzijndeGebied.naam}`);
    }
    
    if (riskLevel === "hoog") {
      recommendations.push("Overweeg mitigerende maatregelen zoals elektrisch materieel");
      recommendations.push("Onderzoek mogelijkheden voor intern of extern salderen");
    }
    
    if (natura2000Result.binnenGebied) {
      recommendations.push("Neem contact op met de provincie voor een voortoets");
    }
  } else if (emissionCheck.hasEmissions) {
    recommendations.push("AERIUS berekening aanbevolen maar niet strikt noodzakelijk");
    recommendations.push("Documenteer onderbouwing in de aanvraag");
  } else {
    recommendations.push("AERIUS berekening waarschijnlijk niet nodig");
    recommendations.push("Documenteer onderbouwing waarom geen significante emissies verwacht worden");
  }

  // Genereer samenvatting
  let summary = '';
  
  if (natura2000Result.binnenGebied) {
    summary = `De locatie ligt BINNEN Natura 2000 gebied "${natura2000Result.dichtstbijzijndeGebied?.naam}". `;
  } else if (natura2000Result.afstandTotDichtstbijzijnde !== undefined) {
    const afstandKm = (natura2000Result.afstandTotDichtstbijzijnde / 1000).toFixed(1);
    summary = `De locatie ligt op ${afstandKm}km van Natura 2000 gebied "${natura2000Result.dichtstbijzijndeGebied?.naam}". `;
  }
  
  if (emissionCheck.hasEmissions) {
    summary += `De activiteiten kunnen stikstofemissies veroorzaken (${emissionCheck.emissionSources.join(", ")}). `;
    if (requiresCalculation) {
      summary += "Een AERIUS berekening is vereist.";
    } else {
      summary += "Een AERIUS berekening wordt aanbevolen.";
    }
  } else {
    summary += "Geen significante stikstofemissies verwacht op basis van de activiteiten.";
  }

  // Voeg NNN en Nationale Parken aanbevelingen toe
  if (beschermdeGebiedenResult.binnenNNN) {
    recommendations.push('Locatie ligt BINNEN het Natuurnetwerk Nederland (NNN). Toets aan provinciaal natuurbeleid vereist.');
    riskLevel = 'hoog';
  } else if (beschermdeGebiedenResult.dichtstbijzijndeNNN && beschermdeGebiedenResult.dichtstbijzijndeNNN.afstandMeter && beschermdeGebiedenResult.dichtstbijzijndeNNN.afstandMeter < 1000) {
    recommendations.push(`NNN-gebied op ${beschermdeGebiedenResult.dichtstbijzijndeNNN.afstandMeter}m afstand. Check externe werking op natuurwaarden.`);
  }
  
  if (beschermdeGebiedenResult.binnenNationaalPark) {
    recommendations.push('Locatie ligt BINNEN een Nationaal Park. Extra aandacht voor landschappelijke inpassing vereist.');
  }

  return {
    requiresCalculation,
    riskLevel,
    summary,
    recommendations,
    emissionSources: emissionCheck.emissionSources,
    natura2000Check: {
      success: natura2000Result.success,
      binnenGebied: natura2000Result.binnenGebied,
      afstandMeter: natura2000Result.afstandTotDichtstbijzijnde,
      dichtstbijzijndeGebied: natura2000Result.dichtstbijzijndeGebied?.naam,
      gebiedenBinnenStraal: natura2000Result.gebiedenBinnenStraal.map(g => ({
        naam: g.naam,
        afstandMeter: g.afstandMeter
      })),
      stikstofRisico: natura2000Result.stikstofRisico,
      aanbeveling: natura2000Result.aanbeveling
    },
    beschermdeGebiedenCheck: {
      binnenNNN: beschermdeGebiedenResult.binnenNNN,
      binnenNationaalPark: beschermdeGebiedenResult.binnenNationaalPark,
      dichtstbijzijndeNNN: beschermdeGebiedenResult.dichtstbijzijndeNNN ? {
        naam: beschermdeGebiedenResult.dichtstbijzijndeNNN.naam,
        afstandMeter: beschermdeGebiedenResult.dichtstbijzijndeNNN.afstandMeter
      } : undefined,
      dichtstbijzijndeNationaalPark: beschermdeGebiedenResult.dichtstbijzijndeNationaalPark ? {
        naam: beschermdeGebiedenResult.dichtstbijzijndeNationaalPark.naam,
        afstandMeter: beschermdeGebiedenResult.dichtstbijzijndeNationaalPark.afstandMeter
      } : undefined,
      nnnGebiedenCount: beschermdeGebiedenResult.nnnGebieden.length,
      nationaleParkenCount: beschermdeGebiedenResult.nationaleParken.length,
      aanbevelingen: beschermdeGebiedenResult.aanbevelingen
    }
  };
}

// Export alle functies
export const aeriusApi = {
  validateApiKey,
  getVersionInfo,
  getSystemInfo,
  getJobs,
  getJobStatus,
  cancelJob,
  deleteJob,
  waitForJob,
  checkNatura2000Proximity,
  activityMayHaveNitrogenEmissions,
  generateNitrogenPreAssessment,
  generateNitrogenPreAssessmentWithNatura2000,
};

export default aeriusApi;
