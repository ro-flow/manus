/**
 * DSO API Service
 * 
 * Integreert met de DSO (Digitaal Stelsel Omgevingswet) API's voor:
 * - Uitvoeren services (vergunningscheck, indieningsvereisten)
 * - Verzoeksroutering (bevoegd gezag, behandeldienst)
 * - RTR raadplegen (activiteiten, werkzaamheden)
 * - Catalogus (begrippen en definities)
 */

import { ENV } from '../_core/env';

// Base URLs - Productieomgeving (met API key uit email)
// De API key 51944ec7-54fb-4949-9bd5-35d85df98dc3 is voor de productieomgeving
const DSO_BASE_URL = 'https://service.omgevingswet.overheid.nl/publiek';
const DSO_PRE_BASE_URL = 'https://service.pre.omgevingswet.overheid.nl/publiek';

// API Endpoints
const ENDPOINTS = {
  uitvoerenServices: '/toepasbare-regels/api/toepasbareregelsuitvoerenservices/v3',
  verzoeksroutering: '/toepasbare-regels/api/verzoeksroutering/v2',
  rtrGegevens: '/toepasbare-regels/api/rtrgegevens/v2',
  catalogus: '/stelselcatalogus/api/v1',
  omgevingsdocumentPresenteren: '/omgevingsdocument/api/presenteren/v7',
  ruimtelijkePlannen: '/ruimtelijkeplannen/api/opvragen/v4',
};

// Types
interface DSOApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface Locatie {
  type: 'Point' | 'Polygon';
  coordinates: number[] | number[][];
}

interface Activiteit {
  identificatie: string;
  naam: string;
  omschrijving?: string;
  groep?: string;
  bovenliggendeActiviteit?: string;
  juridischeStatus?: string;
}

interface Werkzaamheid {
  identificatie: string;
  naam: string;
  omschrijving?: string;
  gekoppeldeActiviteiten?: string[];
}

interface BevoegdGezag {
  naam: string;
  oin: string;
  afgeleid?: boolean;
}

interface Behandeldienst {
  naam: string;
  oin: string;
}

interface Conclusie {
  type: 'vergunningplicht' | 'meldingsplicht' | 'vergunningvrij' | 'verbod' | 'onbekend';
  omschrijving: string;
  activiteiten: string[];
  juridischeGrondslag?: string;
}

interface Indieningsvereiste {
  naam: string;
  omschrijving: string;
  verplicht: boolean;
  documentType?: string;
}

interface VergunningCheckResultaat {
  conclusies: Conclusie[];
  indieningsvereisten: Indieningsvereiste[];
  openVragen?: {
    vraagId: string;
    vraagTekst: string;
    antwoordOpties?: string[];
  }[];
}

interface VerzoeksrouteringResultaat {
  bevoegdGezag: BevoegdGezag[];
  behandeldienst?: Behandeldienst;
  conceptverzoekToegestaan?: boolean;
}

interface RTRResultaat {
  activiteiten: Activiteit[];
  werkzaamheden: Werkzaamheid[];
  totaalAantalActiviteiten: number;
  totaalAantalWerkzaamheden: number;
}

interface CatalogusBegrip {
  term: string;
  definitie: string;
  bron?: string;
  toelichting?: string;
}

// Helper function for API calls
async function dsoApiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: object,
  usePreProduction: boolean = false
): Promise<DSOApiResponse<T>> {
  const baseUrl = usePreProduction ? DSO_PRE_BASE_URL : DSO_BASE_URL;
  const url = `${baseUrl}${endpoint}`;
  
  const apiKey = ENV.dsoApiKey;
  if (!apiKey) {
    return {
      success: false,
      error: 'DSO API key niet geconfigureerd. Vraag een key aan via developer.omgevingswet.overheid.nl'
    };
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/hal+json',
        'X-Api-Key': apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `DSO API error (${response.status}): ${errorText}`
      };
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: `DSO API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Uitvoeren Services API
 * Bepaalt conclusie (vergunningplicht/meldingsplicht/vergunningvrij) en indieningsvereisten
 */
export async function bepaalVergunningCheck(
  activiteiten: string[],
  locatie: Locatie,
  antwoorden?: Record<string, string>
): Promise<DSOApiResponse<VergunningCheckResultaat>> {
  // Conclusie bepalen
  const conclusieBody = {
    functioneleStructuurRefs: activiteiten,
    locatie: {
      geometrie: {
        type: locatie.type,
        coordinates: locatie.coordinates
      }
    },
    antwoorden: antwoorden || {}
  };

  const conclusieResponse = await dsoApiCall<any>(
    `${ENDPOINTS.uitvoerenServices}/conclusie/_bepalen`,
    'POST',
    conclusieBody
  );

  if (!conclusieResponse.success) {
    return conclusieResponse as DSOApiResponse<VergunningCheckResultaat>;
  }

  // Indieningsvereisten bepalen
  const indieningsBody = {
    functioneleStructuurRefs: activiteiten,
    locatie: {
      geometrie: {
        type: locatie.type,
        coordinates: locatie.coordinates
      }
    },
    antwoorden: antwoorden || {}
  };

  const indieningsResponse = await dsoApiCall<any>(
    `${ENDPOINTS.uitvoerenServices}/indieningsvereisten/_bepalen`,
    'POST',
    indieningsBody
  );

  // Parse responses
  const conclusies: Conclusie[] = [];
  const indieningsvereisten: Indieningsvereiste[] = [];
  const openVragen: { vraagId: string; vraagTekst: string; antwoordOpties?: string[] }[] = [];

  // Parse conclusies
  if (conclusieResponse.data?.uitkomsten) {
    for (const uitkomst of conclusieResponse.data.uitkomsten) {
      let type: Conclusie['type'] = 'onbekend';
      if (uitkomst.conclusie?.toLowerCase().includes('vergunning')) {
        type = 'vergunningplicht';
      } else if (uitkomst.conclusie?.toLowerCase().includes('melding')) {
        type = 'meldingsplicht';
      } else if (uitkomst.conclusie?.toLowerCase().includes('vrij')) {
        type = 'vergunningvrij';
      } else if (uitkomst.conclusie?.toLowerCase().includes('verbod')) {
        type = 'verbod';
      }

      conclusies.push({
        type,
        omschrijving: uitkomst.conclusie || uitkomst.omschrijving || '',
        activiteiten: uitkomst.activiteiten || [],
        juridischeGrondslag: uitkomst.juridischeGrondslag
      });
    }
  }

  // Parse open vragen
  if (conclusieResponse.data?.vragen) {
    for (const vraag of conclusieResponse.data.vragen) {
      openVragen.push({
        vraagId: vraag.id || vraag.vraagId,
        vraagTekst: vraag.tekst || vraag.vraagTekst,
        antwoordOpties: vraag.antwoordOpties?.map((a: any) => a.tekst || a)
      });
    }
  }

  // Parse indieningsvereisten
  if (indieningsResponse.success && indieningsResponse.data?.indieningsvereisten) {
    for (const vereiste of indieningsResponse.data.indieningsvereisten) {
      indieningsvereisten.push({
        naam: vereiste.naam || vereiste.label,
        omschrijving: vereiste.omschrijving || vereiste.toelichting || '',
        verplicht: vereiste.verplicht !== false,
        documentType: vereiste.documentType
      });
    }
  }

  return {
    success: true,
    data: {
      conclusies,
      indieningsvereisten,
      openVragen: openVragen.length > 0 ? openVragen : undefined
    }
  };
}

/**
 * Verzoeksroutering API
 * Bepaalt bevoegd gezag en behandeldienst
 */
export async function bepaalBevoegdGezag(
  activiteiten: string[],
  locatie: Locatie
): Promise<DSOApiResponse<VerzoeksrouteringResultaat>> {
  const body = {
    functioneleStructuurRefs: activiteiten,
    locatie: {
      geometrie: {
        type: locatie.type,
        coordinates: locatie.coordinates
      }
    }
  };

  // Bevoegd gezag bepalen
  const bgResponse = await dsoApiCall<any>(
    `${ENDPOINTS.verzoeksroutering}/bevoegdgezag/_bepalen`,
    'POST',
    body
  );

  if (!bgResponse.success) {
    return bgResponse as DSOApiResponse<VerzoeksrouteringResultaat>;
  }

  const bevoegdGezag: BevoegdGezag[] = [];
  let behandeldienst: Behandeldienst | undefined;
  let conceptverzoekToegestaan: boolean | undefined;

  // Parse bevoegd gezag
  if (bgResponse.data?.verzoeken) {
    for (const verzoek of bgResponse.data.verzoeken) {
      if (verzoek.bevoegdGezagen) {
        for (const bg of verzoek.bevoegdGezagen) {
          bevoegdGezag.push({
            naam: bg.naam,
            oin: bg.oin,
            afgeleid: bg.afgeleid === true
          });
        }
      }
    }
  }

  // Behandeldienst bepalen (als er een bevoegd gezag is)
  if (bevoegdGezag.length > 0) {
    const afgeleideGezag = bevoegdGezag.find(bg => bg.afgeleid) || bevoegdGezag[0];
    
    const bdBody = {
      bevoegdGezagOin: afgeleideGezag.oin,
      functioneleStructuurRefs: activiteiten,
      locatie: {
        geometrie: {
          type: locatie.type,
          coordinates: locatie.coordinates
        }
      }
    };

    const bdResponse = await dsoApiCall<any>(
      `${ENDPOINTS.verzoeksroutering}/behandeldienst/_bepalen`,
      'POST',
      bdBody
    );

    if (bdResponse.success && bdResponse.data?.behandeldienst) {
      behandeldienst = {
        naam: bdResponse.data.behandeldienst.naam,
        oin: bdResponse.data.behandeldienst.oin
      };
    }

    // Conceptverzoek bepalen
    const cvBody = {
      bevoegdGezagOin: afgeleideGezag.oin,
      functioneleStructuurRefs: activiteiten
    };

    const cvResponse = await dsoApiCall<any>(
      `${ENDPOINTS.verzoeksroutering}/conceptverzoek/_bepalen`,
      'POST',
      cvBody
    );

    if (cvResponse.success) {
      conceptverzoekToegestaan = cvResponse.data?.conceptverzoekToegestaan === true;
    }
  }

  return {
    success: true,
    data: {
      bevoegdGezag,
      behandeldienst,
      conceptverzoekToegestaan
    }
  };
}

/**
 * RTR Raadplegen API
 * Haalt activiteiten en werkzaamheden op
 */
export async function haalActiviteitenOp(
  datum?: string,
  zoekCriteria?: {
    locatie?: Locatie;
    bevoegdGezagOin?: string;
    zoekTerm?: string;
  }
): Promise<DSOApiResponse<RTRResultaat>> {
  const vandaag = datum || new Date().toISOString().split('T')[0];
  
  // Activiteiten ophalen
  let activiteitenResponse: DSOApiResponse<any>;
  
  if (zoekCriteria) {
    const zoekBody: any = {
      datum: vandaag
    };
    
    if (zoekCriteria.locatie) {
      zoekBody.locatie = {
        geometrie: {
          type: zoekCriteria.locatie.type,
          coordinates: zoekCriteria.locatie.coordinates
        }
      };
    }
    
    if (zoekCriteria.bevoegdGezagOin) {
      zoekBody.bevoegdGezagOin = zoekCriteria.bevoegdGezagOin;
    }
    
    if (zoekCriteria.zoekTerm) {
      zoekBody.zoekTerm = zoekCriteria.zoekTerm;
    }

    activiteitenResponse = await dsoApiCall<any>(
      `${ENDPOINTS.rtrGegevens}/activiteiten/_zoek`,
      'POST',
      zoekBody
    );
  } else {
    activiteitenResponse = await dsoApiCall<any>(
      `${ENDPOINTS.rtrGegevens}/activiteiten?datum=${vandaag}&pageSize=100`,
      'GET'
    );
  }

  if (!activiteitenResponse.success) {
    return activiteitenResponse as DSOApiResponse<RTRResultaat>;
  }

  // Werkzaamheden ophalen
  const werkzaamhedenResponse = await dsoApiCall<any>(
    `${ENDPOINTS.rtrGegevens}/werkzaamheden?datum=${vandaag}&pageSize=100`,
    'GET'
  );

  const activiteiten: Activiteit[] = [];
  const werkzaamheden: Werkzaamheid[] = [];

  // Parse activiteiten
  if (activiteitenResponse.data?._embedded?.activiteiten) {
    for (const act of activiteitenResponse.data._embedded.activiteiten) {
      activiteiten.push({
        identificatie: act.identificatie || act.urn,
        naam: act.naam,
        omschrijving: act.omschrijving,
        groep: act.groep?.naam,
        bovenliggendeActiviteit: act.bovenliggendeActiviteit?.identificatie,
        juridischeStatus: act.juridischeStatus
      });
    }
  }

  // Parse werkzaamheden
  if (werkzaamhedenResponse.success && werkzaamhedenResponse.data?._embedded?.werkzaamheden) {
    for (const werk of werkzaamhedenResponse.data._embedded.werkzaamheden) {
      werkzaamheden.push({
        identificatie: werk.identificatie || werk.urn,
        naam: werk.naam,
        omschrijving: werk.omschrijving,
        gekoppeldeActiviteiten: werk.gekoppeldeActiviteiten?.map((a: any) => a.identificatie)
      });
    }
  }

  return {
    success: true,
    data: {
      activiteiten,
      werkzaamheden,
      totaalAantalActiviteiten: activiteitenResponse.data?.page?.totalElements || activiteiten.length,
      totaalAantalWerkzaamheden: werkzaamhedenResponse.data?.page?.totalElements || werkzaamheden.length
    }
  };
}

/**
 * Catalogus API
 * Haalt begrippen en definities op
 */
export async function zoekBegrip(
  zoekTerm: string
): Promise<DSOApiResponse<CatalogusBegrip[]>> {
  const response = await dsoApiCall<any>(
    `${ENDPOINTS.catalogus}/begrippen?zoek=${encodeURIComponent(zoekTerm)}`,
    'GET'
  );

  if (!response.success) {
    return response as DSOApiResponse<CatalogusBegrip[]>;
  }

  const begrippen: CatalogusBegrip[] = [];

  if (response.data?._embedded?.begrippen) {
    for (const begrip of response.data._embedded.begrippen) {
      begrippen.push({
        term: begrip.term || begrip.naam,
        definitie: begrip.definitie || begrip.omschrijving,
        bron: begrip.bron,
        toelichting: begrip.toelichting
      });
    }
  }

  return { success: true, data: begrippen };
}

/**
 * Toepasbare Regels ophalen voor een locatie
 * Haalt de geldende toepasbare regels op voor een specifieke locatie
 */
export async function haalToepasbareRegels(
  locatie: Locatie,
  activiteiten?: string[]
): Promise<DSOApiResponse<{
  regels: {
    identificatie: string;
    naam: string;
    type: string;
    conclusie?: string;
    juridischeGrondslag?: string;
    toelichting?: string;
  }[];
  totaal: number;
}>> {
  const body: any = {
    locatie: {
      geometrie: {
        type: locatie.type,
        coordinates: locatie.coordinates
      }
    }
  };

  if (activiteiten && activiteiten.length > 0) {
    body.functioneleStructuurRefs = activiteiten;
  }

  const response = await dsoApiCall<any>(
    `${ENDPOINTS.uitvoerenServices}/toepasbareregels/_zoek`,
    'POST',
    body
  );

  if (!response.success) {
    return response as DSOApiResponse<{ regels: any[]; totaal: number }>;
  }

  const regels: {
    identificatie: string;
    naam: string;
    type: string;
    conclusie?: string;
    juridischeGrondslag?: string;
    toelichting?: string;
  }[] = [];

  if (response.data?._embedded?.toepasbareRegels) {
    for (const regel of response.data._embedded.toepasbareRegels) {
      regels.push({
        identificatie: regel.identificatie || regel.urn,
        naam: regel.naam || regel.label,
        type: regel.type || 'onbekend',
        conclusie: regel.conclusie,
        juridischeGrondslag: regel.juridischeGrondslag,
        toelichting: regel.toelichting
      });
    }
  }

  return {
    success: true,
    data: {
      regels,
      totaal: response.data?.page?.totalElements || regels.length
    }
  };
}

/**
 * Gecombineerde analyse functie
 * Voert alle relevante DSO API calls uit voor een complete analyse
 */
export async function volledigeDSOAnalyse(
  activiteiten: string[],
  locatie: Locatie
): Promise<{
  vergunningCheck?: VergunningCheckResultaat;
  bevoegdGezag?: VerzoeksrouteringResultaat;
  rtrGegevens?: RTRResultaat;
  errors: string[];
}> {
  const errors: string[] = [];
  let vergunningCheck: VergunningCheckResultaat | undefined;
  let bevoegdGezag: VerzoeksrouteringResultaat | undefined;
  let rtrGegevens: RTRResultaat | undefined;

  // Parallel API calls
  const [vcResult, bgResult, rtrResult] = await Promise.all([
    bepaalVergunningCheck(activiteiten, locatie),
    bepaalBevoegdGezag(activiteiten, locatie),
    haalActiviteitenOp(undefined, { locatie })
  ]);

  if (vcResult.success) {
    vergunningCheck = vcResult.data;
  } else {
    errors.push(`Vergunningcheck: ${vcResult.error}`);
  }

  if (bgResult.success) {
    bevoegdGezag = bgResult.data;
  } else {
    errors.push(`Bevoegd gezag: ${bgResult.error}`);
  }

  if (rtrResult.success) {
    rtrGegevens = rtrResult.data;
  } else {
    errors.push(`RTR gegevens: ${rtrResult.error}`);
  }

  return {
    vergunningCheck,
    bevoegdGezag,
    rtrGegevens,
    errors
  };
}

// Export types
export type {
  Locatie,
  Activiteit,
  Werkzaamheid,
  BevoegdGezag,
  Behandeldienst,
  Conclusie,
  Indieningsvereiste,
  VergunningCheckResultaat,
  VerzoeksrouteringResultaat,
  RTRResultaat,
  CatalogusBegrip
};
