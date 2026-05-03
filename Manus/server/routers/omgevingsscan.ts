/**
 * Omgevingsscan Router
 * tRPC procedures for the Omgevingsscan module
 */

import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { uitvoerenOmgevingsscan, genereerAINarratief, type ScanLocatie, type ScanResultaat } from "../services/omgevingsscanEngine";
import { INDICATOR_CATALOG, INDICATOR_THEMES, getIndicatorsByTheme } from "../../shared/indicatorCatalog";
import { generateOmgevingsscanPDF, generateOmgevingsscanFilename, generateCombinedOmgevingsscanPDF } from "../services/omgevingsscanPdfGenerator";
import { storagePut } from "../storage";
import crypto from "crypto";

// ============ OMGEVINGSSCAN ROUTER ============

export const omgevingsscanRouter = router({
  // Get indicator catalog (public - for landing page)
  getIndicatorCatalog: publicProcedure.query(() => {
    return {
      indicators: INDICATOR_CATALOG.map(i => ({
        code: i.code,
        theme: i.theme,
        humanName: i.humanName,
        description: i.description,
        sourceType: i.sourceType,
      })),
      themes: INDICATOR_THEMES,
      totalCount: INDICATOR_CATALOG.length,
    };
  }),

  // Get indicators by theme (public)
  getIndicatorsByTheme: publicProcedure
    .input(z.object({ theme: z.string() }))
    .query(({ input }) => {
      return getIndicatorsByTheme(input.theme);
    }),

  // Create a new scan dossier
  createDossier: protectedProcedure
    .input(z.object({
      projectNaam: z.string().optional(),
      adres: z.string(),
      lat: z.number(),
      lng: z.number(),
      gemeente: z.string().optional(),
      postcode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dossierId = crypto.randomUUID();
      
      // Get user's gemeente (optional for super_admin)
      const userGemeenteId = ctx.user.gemeenteId || 0;

      const dossier = await db.createScanDossier({
        dossierId,
        gemeenteId: userGemeenteId,
        userId: ctx.user.id,
        projectNaam: input.projectNaam || `Scan ${input.adres}`,
        status: 'CREATED',
      });

      if (!dossier) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Kon dossier niet aanmaken' });
      }

      // Save location
      await db.saveScanLocation({
        dossierId,
        lat: String(input.lat),
        lon: String(input.lng),
        addressText: input.adres,
        postcode: input.postcode,
        woonplaats: input.gemeente,
      });

      return { dossierId, status: 'CREATED' };
    }),

  // Run the full omgevingsscan for a dossier
  runScan: protectedProcedure
    .input(z.object({ dossierId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dossier = await db.getScanDossier(input.dossierId);
      if (!dossier) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dossier niet gevonden' });
      }

      // Get location
      const location = await db.getScanLocation(input.dossierId);
      if (!location || !location.lat || !location.lon) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Locatie niet beschikbaar' });
      }

      // Update status
      await db.updateScanDossierStatus(input.dossierId, 'SCANNING');

      try {
        // Run the scan
        const scanLocatie: ScanLocatie = {
          adres: location.addressText || 'Onbekend adres',
          lat: parseFloat(String(location.lat)),
          lng: parseFloat(String(location.lon)),
          gemeente: location.woonplaats || undefined,
          postcode: location.postcode || undefined,
        };

        const resultaat = await uitvoerenOmgevingsscan(scanLocatie);

        // Save indicator results to database
        const indicatorRows = resultaat.indicatoren.map(ind => ({
          dossierId: input.dossierId,
          code: ind.code,
          theme: ind.theme,
          humanName: ind.humanName,
          intersection: ind.status === 'relevant' || ind.status === 'aandachtspunt',
          distanceM: ind.afstandM ? String(ind.afstandM) : null,
          status: ind.status === 'aandachtspunt' ? 'PRESENT' as const : 
                  ind.status === 'relevant' ? 'NEAR' as const :
                  ind.status === 'niet_relevant' ? 'NONE' as const : 'UNKNOWN' as const,
          featuresJson: ind.rawData || null,
          notes: ind.toelichting,
          narrative: null,
          relevanceScore: ind.status === 'aandachtspunt' ? 100 : (ind.status === 'relevant' ? 50 : 0),
          isPriority: ind.status === 'aandachtspunt',
        }));

        await db.saveScanIndicatorResults(input.dossierId, indicatorRows as any);
        await db.updateScanDossierStatus(input.dossierId, 'SCANNED');

        return {
          dossierId: input.dossierId,
          status: 'SCANNED',
          samenvatting: resultaat.samenvatting,
          duurMs: resultaat.duurMs,
          themaOverzicht: resultaat.themaOverzicht.map(t => ({
            theme: t.theme,
            label: t.label,
            color: t.color,
            heeftAandachtspunten: t.heeftAandachtspunten,
            aantalIndicatoren: t.indicatoren.length,
          })),
        };
      } catch (error) {
        console.error('[OmgevingsscanRouter] Scan failed:', error);
        await db.updateScanDossierStatus(input.dossierId, 'ERROR', String(error));
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Scan mislukt' });
      }
    }),

  // Quick scan - create dossier + run scan in one step
  quickScan: protectedProcedure
    .input(z.object({
      adres: z.string(),
      lat: z.number(),
      lng: z.number(),
      gemeente: z.string().optional(),
      postcode: z.string().optional(),
      activiteitType: z.string().optional(),
      documentSamenvatting: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dossierId = crypto.randomUUID();
      
      const userGemeenteId = ctx.user.gemeenteId || 0;

      // Create dossier
      await db.createScanDossier({
        dossierId,
        gemeenteId: userGemeenteId,
        userId: ctx.user.id,
        projectNaam: `Scan ${input.adres}`,
        status: 'SCANNING',
      });

      // Save location
      await db.saveScanLocation({
        dossierId,
        lat: String(input.lat),
        lon: String(input.lng),
        addressText: input.adres,
        postcode: input.postcode,
        woonplaats: input.gemeente,
      });

      // Run scan
      const scanLocatie: ScanLocatie = {
        adres: input.adres,
        lat: input.lat,
        lng: input.lng,
        gemeente: input.gemeente,
        postcode: input.postcode,
        activiteitType: (input.activiteitType as any) || undefined,
        documentSamenvatting: input.documentSamenvatting || undefined,
      };

      const resultaat = await uitvoerenOmgevingsscan(scanLocatie);

      // Save results
      const indicatorRows = resultaat.indicatoren.map(ind => ({
        dossierId,
        code: ind.code,
        theme: ind.theme,
        humanName: ind.humanName,
        intersection: ind.status === 'relevant' || ind.status === 'aandachtspunt',
        distanceM: ind.afstandM ? String(ind.afstandM) : null,
        status: ind.status === 'aandachtspunt' ? 'PRESENT' as const : 
                ind.status === 'relevant' ? 'NEAR' as const :
                ind.status === 'niet_relevant' ? 'NONE' as const : 'UNKNOWN' as const,
        featuresJson: ind.rawData || null,
        notes: ind.toelichting,
        narrative: null,
        relevanceScore: ind.status === 'aandachtspunt' ? 100 : (ind.status === 'relevant' ? 50 : 0),
        isPriority: ind.status === 'aandachtspunt',
      }));

      await db.saveScanIndicatorResults(dossierId, indicatorRows as any);
      await db.updateScanDossierStatus(dossierId, 'SCANNED');

      return {
        dossierId,
        resultaat: {
          locatie: resultaat.locatie,
          timestamp: resultaat.timestamp,
          duurMs: resultaat.duurMs,
          indicatoren: resultaat.indicatoren,
          samenvatting: resultaat.samenvatting,
          themaOverzicht: resultaat.themaOverzicht,
          geoFeatures: resultaat.geoFeatures || [],
        },
      };
    }),

  // Get scan results for a dossier
  getScanResults: protectedProcedure
    .input(z.object({ dossierId: z.string() }))
    .query(async ({ input }) => {
      const dossier = await db.getScanDossier(input.dossierId);
      if (!dossier) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dossier niet gevonden' });
      }

      const location = await db.getScanLocation(input.dossierId);
      const indicators = await db.getScanIndicatorResults(input.dossierId);
      const exports = await db.getScanExports(input.dossierId);

      return {
        dossier,
        location,
        indicators,
        exports,
      };
    }),

  // List dossiers for current user's gemeente
  listDossiers: protectedProcedure.query(async ({ ctx }) => {
    const userGemeenteId = ctx.user.gemeenteId;
    if (!userGemeenteId) return [];
    return db.getScanDossiersForGemeente(userGemeenteId);
  }),

  // Generate AI narrative for scan results
  generateNarrative: protectedProcedure
    .input(z.object({ dossierId: z.string() }))
    .mutation(async ({ input }) => {
      const dossier = await db.getScanDossier(input.dossierId);
      if (!dossier) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dossier niet gevonden' });
      }

      const location = await db.getScanLocation(input.dossierId);
      const indicators = await db.getScanIndicatorResults(input.dossierId);

      // Convert DB results back to engine format for narrative generation
      const scanResultaat: ScanResultaat = {
        locatie: {
          adres: location?.addressText || 'Onbekend',
          lat: parseFloat(String(location?.lat || 0)),
          lng: parseFloat(String(location?.lon || 0)),
          gemeente: location?.woonplaats || undefined,
        },
        timestamp: dossier.createdAt.toISOString(),
        duurMs: 0,
        indicatoren: indicators.map(ind => ({
          code: ind.code,
          theme: ind.theme || '',
          humanName: ind.humanName || '',
          status: ind.status === 'PRESENT' ? 'aandachtspunt' as const :
                  ind.status === 'NEAR' ? 'relevant' as const :
                  ind.status === 'NONE' ? 'niet_relevant' as const : 'onbekend' as const,
          waarde: ind.notes || '',
          toelichting: ind.notes || '',
          bronnen: [],
        })),
        samenvatting: {
          totaal: indicators.length,
          relevant: indicators.filter(i => i.status === 'NEAR').length,
          aandachtspunten: indicators.filter(i => i.status === 'PRESENT').length,
          nietRelevant: indicators.filter(i => i.status === 'NONE').length,
          onbekend: indicators.filter(i => i.status === 'UNKNOWN').length,
          errors: 0,
        },
        themaOverzicht: [],
      };

      await db.updateScanDossierStatus(input.dossierId, 'LLM_PROCESSING');
      const narratief = await genereerAINarratief(scanResultaat);
      await db.updateScanDossierStatus(input.dossierId, 'LLM_DONE');

      return { narratief };
    }),

  // Public scan (no auth required, for demo/landing page)
  publicQuickScan: publicProcedure
    .input(z.object({
      adres: z.string(),
      lat: z.number(),
      lng: z.number(),
    }))
    .mutation(async ({ input }) => {
      const scanLocatie: ScanLocatie = {
        adres: input.adres,
        lat: input.lat,
        lng: input.lng,
      };

      const resultaat = await uitvoerenOmgevingsscan(scanLocatie);
      return {
        locatie: resultaat.locatie,
        timestamp: resultaat.timestamp,
        duurMs: resultaat.duurMs,
        samenvatting: resultaat.samenvatting,
        // Only return summary for public scan, not full details
        themaOverzicht: resultaat.themaOverzicht.map(t => ({
          theme: t.theme,
          label: t.label,
          color: t.color,
          heeftAandachtspunten: t.heeftAandachtspunten,
          aantalIndicatoren: t.indicatoren.length,
          aandachtspunten: t.indicatoren.filter(i => i.status === 'aandachtspunt').length,
        })),
      };
    }),

  // Upload and analyze a DSO document (PDF or ZIP)
  uploadDocument: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileBase64: z.string(), // base64 encoded file content
      fileType: z.enum(['pdf', 'zip', 'image']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const fileBuffer = Buffer.from(input.fileBase64, 'base64');
      const sizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(1);

      // 1. Upload to S3 for permanent storage
      const fileKey = `dso-uploads/${ctx.user.id}/${crypto.randomUUID()}-${input.fileName}`;
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        zip: 'application/zip',
        image: input.fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      };
      const contentType = mimeTypes[input.fileType] || 'application/octet-stream';
      const { url: fileUrl } = await storagePut(fileKey, fileBuffer, contentType);

      // ---- Helper: multi-strategy PDOK geocoding ----
      async function pdokGeocode(query: string, filterType?: string): Promise<{ lat: number; lng: number; adres: string } | null> {
        try {
          // Step 1: suggest
          let suggestUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(query)}&rows=1`;
          if (filterType) suggestUrl += `&fq=type:${filterType}`;
          const suggestRes = await fetch(suggestUrl);
          const suggestData = await suggestRes.json();
          const suggestDoc = suggestData.response?.docs?.[0];
          if (!suggestDoc?.id) return null;

          // Step 2: lookup for full details (centroide_ll)
          const lookupUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${encodeURIComponent(suggestDoc.id)}`;
          const lookupRes = await fetch(lookupUrl);
          const lookupData = await lookupRes.json();
          const lookupDoc = lookupData.response?.docs?.[0];
          if (!lookupDoc?.centroide_ll) return null;

          const match = lookupDoc.centroide_ll.match(/POINT\(([\d.]+)\s+([\d.]+)\)/);
          if (!match) return null;
          return {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2]),
            adres: lookupDoc.weergavenaam || query,
          };
        } catch (err) {
          console.error(`[UploadDocument] PDOK geocode fout (${query}):`, err);
          return null;
        }
      }

      // ---- Helper: Haal perceelgrenzen op via PDOK Kadaster WFS ----
      // Parse WKT POLYGON to GeoJSON geometry
      function wktToGeoJSON(wkt: string): any {
        try {
          // Check MULTIPOLYGON first to avoid false match on POLYGON regex
          const multiMatch = wkt.match(/MULTIPOLYGON\(\(\((.+?)\)\)\)/);
          if (multiMatch) {
            const rings = multiMatch[1].split('),(').map(ring =>
              ring.split(',').map(coord => {
                const [lng, lat] = coord.trim().split(/\s+/).map(Number);
                return [lng, lat];
              })
            );
            return { type: 'MultiPolygon', coordinates: [rings] };
          }
          const match = wkt.match(/POLYGON\(\((.+?)\)\)/);
          if (!match) return null;
          const coords = match[1].split(',').map(coord => {
            const [lng, lat] = coord.trim().split(/\s+/).map(Number);
            return [lng, lat];
          });
          return { type: 'Polygon', coordinates: [coords] };
        } catch (e) {
          console.error('[WKT] Parse error:', e);
          return null;
        }
      }

      async function getPerceelGrenzen(kadastraalCode: string): Promise<any | null> {
        try {
          // Parse kadastrale code: "HOO00 - M - 656" or "KGL02 - AE - 324"
          const parts = kadastraalCode.replace(/\s*-\s*/g, ' ').trim().split(/\s+/);
          if (parts.length < 3) return null;
          const gemeenteCode = parts[0];
          const sectie = parts[1];
          const perceelNr = parts[2];
          
          // Use PDOK Locatieserver to find the perceel
          const searchQuery = `${gemeenteCode} ${sectie} ${perceelNr}`;
          const searchUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(searchQuery)}&fq=type:perceel&rows=5`;
          
          console.log(`[UploadDocument] Locatieserver perceel query: ${searchQuery}`);
          const searchRes = await fetch(searchUrl);
          if (!searchRes.ok) {
            console.error(`[UploadDocument] Locatieserver HTTP ${searchRes.status}`);
            return null;
          }
          const searchData = await searchRes.json();
          const docs = searchData.response?.docs || [];
          
          // Find the exact match based on gemeentecode, sectie and perceelnummer
          const exactMatch = docs.find((d: any) => {
            const name = d.weergavenaam || '';
            return name.includes(`(${gemeenteCode})`) && name.includes(` ${sectie} `) && name.includes(` ${perceelNr}`);
          }) || docs[0];
          
          if (!exactMatch) {
            console.log(`[UploadDocument] Geen perceel gevonden voor ${kadastraalCode}`);
            return null;
          }
          
          // Get geometry via lookup endpoint
          const lookupUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${exactMatch.id}&fl=*`;
          const lookupRes = await fetch(lookupUrl);
          if (!lookupRes.ok) {
            console.error(`[UploadDocument] Lookup HTTP ${lookupRes.status}`);
            return null;
          }
          const lookupData = await lookupRes.json();
          const lookupDoc = lookupData.response?.docs?.[0];
          
          if (!lookupDoc?.geometrie_ll) {
            console.log(`[UploadDocument] Geen geometrie voor ${kadastraalCode}`);
            // Return centroid as fallback
            const centroid = exactMatch.centroide_ll;
            if (centroid) {
              const coordMatch = centroid.match(/POINT\(([\d.]+)\s+([\d.]+)\)/);
              if (coordMatch) {
                return {
                  geometry: null,
                  centroid: { lng: parseFloat(coordMatch[1]), lat: parseFloat(coordMatch[2]) },
                  kadastraalCode,
                  gemeenteCode,
                  sectie,
                  perceelNr,
                  weergavenaam: exactMatch.weergavenaam,
                };
              }
            }
            return null;
          }
          
          // Convert WKT to GeoJSON
          const geometry = wktToGeoJSON(lookupDoc.geometrie_ll);
          if (!geometry) {
            console.log(`[UploadDocument] WKT parse failed for ${kadastraalCode}`);
            return null;
          }
          
          // Extract centroid
          let centroidLat = 0, centroidLng = 0;
          const centroidWkt = lookupDoc.centroide_ll || exactMatch.centroide_ll;
          if (centroidWkt) {
            const cm = centroidWkt.match(/POINT\(([\d.]+)\s+([\d.]+)\)/);
            if (cm) {
              centroidLng = parseFloat(cm[1]);
              centroidLat = parseFloat(cm[2]);
            }
          }
          
          console.log(`[UploadDocument] Perceelgeometrie gevonden: ${exactMatch.weergavenaam} (${geometry.type})`);
          
          return {
            geometry,
            centroid: { lat: centroidLat, lng: centroidLng },
            properties: {
              kadastraleGemeentenaam: lookupDoc.kadastrale_gemeentenaam,
              kadastraleGrootte: lookupDoc.kadastrale_grootte,
              kadastraleSectie: lookupDoc.kadastrale_sectie,
              perceelnummer: lookupDoc.perceelnummer,
            },
            kadastraalCode,
            gemeenteCode,
            sectie,
            perceelNr,
            weergavenaam: exactMatch.weergavenaam,
          };
        } catch (err) {
          console.error(`[UploadDocument] Perceel fout (${kadastraalCode}):`, err);
          return null;
        }
      }

      // 2. Analyze document with LLM to extract address and document info
      let documentSummary = '';
      let documentType = 'onbekend';
      let activiteitType: string = 'onbekend';
      interface ExtractedLocation {
        adres: string | null;
        kadastraal: string | null;
        locatiebeschrijving: string | null;
        gemeente: string | null;
      }
      let extractedLocations: ExtractedLocation[] = [];

      if (input.fileType === 'pdf' || input.fileType === 'image') {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Je bent een expert in het lezen van omgevingsvergunning-documenten (Omgevingswet). Analyseer het document of de afbeelding.

KRITIEKE REGELS:
- Extraheer ALLEEN informatie die je LETTERLIJK in het document kunt lezen.
- VERZIN GEEN locaties, adressen, kadastrale aanduidingen of gemeentenamen die niet expliciet in het document staan.
- Als er geen adres of locatie in het document staat, geef dan een LEGE locaties array [].
- Bij twijfel: liever niets invullen dan iets verzinnen.

BELANGRIJK - KADASTRALE PERCELEN:
- Als het document meerdere kadastrale percelen vermeldt (bijv. in "Specificatie locatie" of "Locatie" sectie), maak dan voor ELK perceel een apart item in de locaties array.
- Kadastrale aanduidingen hebben het formaat: "GEMEENTECODE - SECTIE - NUMMER" (bijv. "HOO00 - M - 656", "KGL02 - AE - 324")
- Het hoofdperceel (bij "Kadastraal perceelnummer") en alle extra percelen (bij "Specificatie locatie") moeten ALLEMAAL als aparte items worden opgenomen.

Voor elke locatie, zoek naar:
- Straatnaam + huisnummer + postcode + plaats (het aanvraagadres)
- Kadastrale aanduiding per perceel — ELKE kadastrale aanduiding als apart item
- Locatiebeschrijving — alleen als er geen straatnaam is maar wel een duidelijke locatieomschrijving

Extraheer ook:
- Het type document (aanvraagformulier, situatietekening, constructietekening, rapport, ruimtelijke onderbouwing, foto, etc.)
- De ACTIVITEIT waarvoor vergunning wordt aangevraagd. Kies EXACT één van deze waarden:
  bouwen, slopen, kappen, milieu, aanleggen, functiewijziging, reclame, uitrit, brandveilig_gebruik, onbekend
  Toelichting: bouwen=nieuwbouw/verbouw/aanbouw/dakkapel/schuur, slopen=sloopmelding/sloopvergunning, kappen=bomenkap/velvergunning, milieu=milieumelding/milieuvergunning/IPPC, aanleggen=grondwerk/ophogen/dempen/graven, functiewijziging=gebruikswijziging/bestemmingswijziging, reclame=reclame-uiting, uitrit=inrit/uitrit, brandveilig_gebruik=gebruiksmelding/brandveiligheid
- Een korte samenvatting van de inhoud (max 3 zinnen)
- De gemeente waarin het project valt (alleen als expliciet vermeld)
- De projectnaam of aanvraagnaam (indien vermeld)
- De aanvrager/opdrachtgever (indien vermeld)

Antwoord ALTIJD in exact dit JSON formaat:
{"locaties": [{"adres": "straat+nr+postcode+plaats" of null, "kadastraal": "GEMEENTECODE - SECTIE - NUMMER" of null, "locatiebeschrijving": "beschrijving" of null, "gemeente": "gemeentenaam" of null}], "documentType": "type", "activiteitType": "bouwen|slopen|kappen|milieu|aanleggen|functiewijziging|reclame|uitrit|brandveilig_gebruik|onbekend", "samenvatting": "korte samenvatting", "projectNaam": "naam" of null, "aanvrager": "naam" of null}`
              },
              {
                role: "user",
                content: input.fileType === 'image'
                  ? [
                      {
                        type: "image_url" as const,
                        image_url: {
                          url: fileUrl,
                          detail: "high" as const
                        }
                      },
                      {
                        type: "text" as const,
                        text: "Analyseer deze afbeelding. Extraheer ALLEEN informatie die je letterlijk kunt lezen. Verzin niets."
                      }
                    ]
                  : [
                      {
                        type: "file_url" as const,
                        file_url: {
                          url: fileUrl,
                          mime_type: "application/pdf" as const
                        }
                      },
                      {
                        type: "text" as const,
                        text: "Analyseer dit document. Extraheer ALLEEN informatie die je letterlijk kunt lezen. Verzin niets."
                      }
                    ]
              }
            ],
            response_format: {
              type: "json_schema" as const,
              json_schema: {
                name: "document_analyse",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    locaties: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          adres: { type: ["string", "null"], description: "Straatnaam + huisnummer + postcode + plaats" },
                          kadastraal: { type: ["string", "null"], description: "Kadastrale aanduiding in formaat GEMEENTECODE - SECTIE - NUMMER" },
                          locatiebeschrijving: { type: ["string", "null"], description: "Locatiebeschrijving of toponiem" },
                          gemeente: { type: ["string", "null"], description: "Gemeente" }
                        },
                        required: ["adres", "kadastraal", "locatiebeschrijving", "gemeente"],
                        additionalProperties: false
                      }
                    },
                    documentType: { type: "string", description: "Type document" },
                    activiteitType: { type: "string", enum: ["bouwen", "slopen", "kappen", "milieu", "aanleggen", "functiewijziging", "reclame", "uitrit", "brandveilig_gebruik", "onbekend"], description: "Activiteittype waarvoor vergunning wordt aangevraagd" },
                    samenvatting: { type: "string", description: "Korte samenvatting" },
                    projectNaam: { type: ["string", "null"], description: "Projectnaam of aanvraagnaam" },
                    aanvrager: { type: ["string", "null"], description: "Aanvrager of opdrachtgever" }
                  },
                  required: ["locaties", "documentType", "activiteitType", "samenvatting", "projectNaam", "aanvrager"],
                  additionalProperties: false
                }
              }
            }
          });

          const content = response.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
            extractedLocations = parsed.locaties || [];
            documentType = parsed.documentType || 'onbekend';
            activiteitType = parsed.activiteitType || 'onbekend';
            documentSummary = parsed.samenvatting || '';
            // Append kadastrale info to summary
            for (const loc of extractedLocations) {
              if (loc.kadastraal && !documentSummary.includes(loc.kadastraal)) {
                documentSummary += ` Kadastraal: ${loc.kadastraal}.`;
              }
            }
            const gemeente = extractedLocations[0]?.gemeente;
            if (gemeente && !documentSummary.includes(gemeente)) {
              documentSummary += ` Gemeente: ${gemeente}.`;
            }
          }
        } catch (err) {
          console.error('[UploadDocument] LLM analyse fout:', err);
          documentSummary = 'Document kon niet automatisch worden geanalyseerd.';
        }
      } else {
        // ZIP: just store, no LLM analysis for now
        documentSummary = `ZIP-bestand geüpload (${sizeMB} MB). Bevat mogelijk meerdere documenten.`;
        documentType = 'dso-zip';
      }

      // 3. Multi-strategy geocoding for each extracted location
      interface GeocodedLoc { lat: number; lng: number; adres: string; kadastraal?: string; perceelGrenzen?: any }
      const geocodedLocations: GeocodedLoc[] = [];

      for (const loc of extractedLocations) {
        let result: GeocodedLoc | null = null;

        // Strategy 1: Try full address (straat + nr + postcode + plaats)
        if (!result && loc.adres) {
          result = await pdokGeocode(loc.adres);
        }

        // Strategy 2: Try kadastrale aanduiding with perceel filter
        if (!result && loc.kadastraal) {
          result = await pdokGeocode(loc.kadastraal, 'perceel');
        }

        // Strategy 3: Try locatiebeschrijving + gemeente
        if (!result && loc.locatiebeschrijving) {
          const searchTerm = loc.gemeente
            ? `${loc.locatiebeschrijving} ${loc.gemeente}`
            : loc.locatiebeschrijving;
          result = await pdokGeocode(searchTerm);
        }

        // Strategy 4: Try gemeente + locatiebeschrijving combined (bare gemeente is not useful)
        if (!result && loc.gemeente && loc.locatiebeschrijving) {
          result = await pdokGeocode(`${loc.locatiebeschrijving}, ${loc.gemeente}`);
        }

        if (result) {
          // Attach kadastrale code for reference
          if (loc.kadastraal) {
            result.kadastraal = loc.kadastraal;
          }
          geocodedLocations.push(result);
        }
      }

      // 4. Fetch perceelgrenzen (polygon boundaries) for all kadastrale percelen
      const percelenMetGrenzen: Array<{
        lat: number; lng: number; adres: string; kadastraal: string;
        perceelGrenzen: any; gemeente?: string;
      }> = [];

      for (const loc of extractedLocations) {
        if (loc.kadastraal) {
          const grenzen = await getPerceelGrenzen(loc.kadastraal);
          // Find the matching geocoded location or use the grenzen centroid
          const matchedGeo = geocodedLocations.find(g => g.kadastraal === loc.kadastraal);
          
          if (grenzen) {
            // Calculate centroid from geometry or use centroid from API
            let lat = matchedGeo?.lat || grenzen.centroid?.lat || 0;
            let lng = matchedGeo?.lng || grenzen.centroid?.lng || 0;
            
            if (!matchedGeo && !grenzen.centroid && grenzen.geometry) {
              // Simple centroid from polygon coordinates
              const coords = grenzen.geometry.type === 'MultiPolygon'
                ? grenzen.geometry.coordinates[0][0]
                : grenzen.geometry.coordinates[0];
              if (coords && coords.length > 0) {
                const sumLng = coords.reduce((s: number, c: number[]) => s + c[0], 0);
                const sumLat = coords.reduce((s: number, c: number[]) => s + c[1], 0);
                lng = sumLng / coords.length;
                lat = sumLat / coords.length;
              }
            }
            
            percelenMetGrenzen.push({
              lat,
              lng,
              adres: matchedGeo?.adres || loc.kadastraal,
              kadastraal: loc.kadastraal,
              perceelGrenzen: grenzen.geometry,
              gemeente: loc.gemeente || undefined,
            });
          } else if (matchedGeo) {
            // No boundary found but we have a point
            percelenMetGrenzen.push({
              lat: matchedGeo.lat,
              lng: matchedGeo.lng,
              adres: matchedGeo.adres,
              kadastraal: loc.kadastraal,
              perceelGrenzen: null,
              gemeente: loc.gemeente || undefined,
            });
          }
        }
      }

      // Primary location = first geocoded result
      const geocodedLocation = geocodedLocations[0] || (percelenMetGrenzen[0] ? { lat: percelenMetGrenzen[0].lat, lng: percelenMetGrenzen[0].lng, adres: percelenMetGrenzen[0].adres } : null);
      const extractedAddress = extractedLocations[0]?.adres
        || extractedLocations[0]?.kadastraal
        || extractedLocations[0]?.locatiebeschrijving
        || extractedLocations[0]?.gemeente
        || null;

      return {
        fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        sizeMB: parseFloat(sizeMB),
        documentType,
        activiteitType,
        documentSummary,
        extractedAddress,
        geocodedLocation,
        // All geocoded locations for multi-location support
        allLocations: geocodedLocations.length > 1 ? geocodedLocations : undefined,
        // Percelen met grenzen (GeoJSON polygonen) voor kaartweergave
        percelen: percelenMetGrenzen.length > 0 ? percelenMetGrenzen : undefined,
      };
    }),

  // Export scan results as PDF
  exportPDF: protectedProcedure
    .input(z.object({
      // Accepteer directe scan resultaten (voor quickScan zonder dossier)
      scanResult: z.any().optional(),
      dossierId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      let resultaat: any;

      if (input.scanResult) {
        // Directe resultaten meegegeven
        resultaat = input.scanResult;
      } else if (input.dossierId) {
        // Haal resultaten op uit database
        const dossier = await db.getScanDossier(input.dossierId);
        if (!dossier) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dossier niet gevonden' });

        const location = await db.getScanLocation(input.dossierId);
        const indicators = await db.getScanIndicatorResults(input.dossierId);

        resultaat = {
          locatie: {
            adres: location?.addressText || 'Onbekend',
            lat: parseFloat(String(location?.lat || 0)),
            lng: parseFloat(String(location?.lon || 0)),
            gemeente: location?.woonplaats || undefined,
            postcode: location?.postcode || undefined,
          },
          timestamp: dossier.createdAt.toISOString(),
          duurMs: 0,
          indicatoren: indicators.map(ind => ({
            code: ind.code,
            theme: ind.theme || '',
            humanName: ind.humanName || '',
            status: ind.status === 'PRESENT' ? 'aandachtspunt' :
                    ind.status === 'NEAR' ? 'relevant' :
                    ind.status === 'NONE' ? 'niet_relevant' : 'onbekend',
            waarde: ind.notes || '',
            toelichting: ind.notes || '',
            bronnen: [],
          })),
          samenvatting: {
            totaal: indicators.length,
            relevant: indicators.filter(i => i.status === 'NEAR').length,
            aandachtspunten: indicators.filter(i => i.status === 'PRESENT').length,
            nietRelevant: indicators.filter(i => i.status === 'NONE').length,
            onbekend: indicators.filter(i => i.status === 'UNKNOWN').length,
            errors: 0,
          },
          themaOverzicht: [],
        };
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Geef scanResult of dossierId mee' });
      }

      // Genereer AI narratief als dat nog niet aanwezig is
      if (!resultaat.aiNarratief) {
        try {
          const narratief = await genereerAINarratief(resultaat);
          resultaat.aiNarratief = narratief;
        } catch (e) {
          console.warn('[ExportPDF] AI narratief generatie overgeslagen:', (e as Error).message);
        }
      }

      // Genereer PDF
      const pdfBuffer = await generateOmgevingsscanPDF(resultaat);
      const filename = generateOmgevingsscanFilename(resultaat.locatie?.adres || 'scan');
      const isPdf = pdfBuffer[0] === 0x25; // %PDF signature

      // Upload naar S3
      const fileKey = `omgevingsscan-exports/${crypto.randomUUID()}-${filename}`;
      const { url } = await storagePut(
        fileKey,
        pdfBuffer,
        isPdf ? 'application/pdf' : 'text/html'
      );

      return {
        url,
        filename: isPdf ? filename : filename.replace('.pdf', '.html'),
        size: pdfBuffer.length,
        format: isPdf ? 'pdf' : 'html',
      };
    }),

  // Export combined scan results for multiple locations as PDF
  exportCombinedPDF: protectedProcedure
    .input(z.object({
      scanResults: z.array(z.object({
        locatie: z.object({
          adres: z.string(),
          lat: z.number(),
          lng: z.number(),
        }),
        result: z.any(),
      })),
    }))
    .mutation(async ({ input }) => {
      const pdfBuffer = await generateCombinedOmgevingsscanPDF(input.scanResults);
      const filename = `omgevingsscan_gecombineerd_${new Date().toISOString().split('T')[0]}.pdf`;
      const isPdf = pdfBuffer[0] === 0x25;

      const fileKey = `omgevingsscan-exports/${crypto.randomUUID()}-${filename}`;
      const { url } = await storagePut(
        fileKey,
        pdfBuffer,
        isPdf ? 'application/pdf' : 'text/html'
      );

      return {
        url,
        filename: isPdf ? filename : filename.replace('.pdf', '.html'),
        size: pdfBuffer.length,
        format: isPdf ? 'pdf' : 'html',
      };
    }),

  // Get WMS/WFS layer URLs for the map (public)
  getMapLayers: publicProcedure.query(() => {
    return {
      baseLayers: [
        {
          id: 'luchtfoto',
          name: 'Luchtfoto',
          type: 'WMTS' as const,
          url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0',
          layer: 'Actueel_orthoHR',
          visible: true,
        },
        {
          id: 'topografie',
          name: 'Topografie (BRT)',
          type: 'WMTS' as const,
          url: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0',
          layer: 'standaard',
          visible: false,
        },
      ],
      overlayLayers: [
        {
          id: 'kadaster',
          name: 'Kadastrale percelen',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/kadaster/kadastralekaart/wms/v5_0',
          layer: 'Perceel',
          visible: true,
          opacity: 0.5,
        },
        {
          id: 'bestemmingsplan',
          name: 'Bestemmingsplannen',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/pbl/windturbines/wms/v1_0',
          layer: 'windturbines',
          visible: false,
          opacity: 0.5,
        },
        {
          id: 'natura2000',
          name: 'Natura 2000',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/rvo/natura2000/wms/v1_0',
          layer: 'natura2000',
          visible: false,
          opacity: 0.4,
        },
        {
          id: 'nnn',
          name: 'Natuurnetwerk Nederland',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/provincies/nnn/wms/v1_0',
          layer: 'nnn',
          visible: false,
          opacity: 0.4,
        },
        {
          id: 'rijksmonumenten',
          name: 'Rijksmonumenten',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/rce/rijksmonumenten/wms/v1_0',
          layer: 'rijksmonumenten_punt',
          visible: false,
          opacity: 0.7,
        },
        {
          id: 'beschermd_gezicht',
          name: 'Beschermde gezichten',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/rce/beschermdestadsdorpsgezichten/wms/v1_0',
          layer: 'beschermdestadsdorpsgezichten',
          visible: false,
          opacity: 0.4,
        },
        {
          id: 'bodemkwaliteit',
          name: 'Bodemkwaliteit',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/rivm/bodemkwaliteit/wms/v1_0',
          layer: 'bodemkwaliteit',
          visible: false,
          opacity: 0.5,
        },
        {
          id: 'overstromingsrisico',
          name: 'Overstromingsrisico',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/rws/overstromingsrisico/wms/v1_0',
          layer: 'overstromingsrisico',
          visible: false,
          opacity: 0.4,
        },
        {
          id: 'geluidzones',
          name: 'Geluidzones',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/rivm/geluid/wms/v1_0',
          layer: 'geluid_weg',
          visible: false,
          opacity: 0.4,
        },
        {
          id: 'gewaspercelen',
          name: 'Gewaspercelen (BRP)',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/rvo/brpgewaspercelen/wms/v1_0',
          layer: 'brpgewaspercelen',
          visible: false,
          opacity: 0.4,
        },
        {
          id: 'grondwaterbescherming',
          name: 'Grondwaterbescherming',
          type: 'WMS' as const,
          url: 'https://service.pdok.nl/provincies/grondwaterbeschermingsgebieden/wms/v1_0',
          layer: 'grondwaterbeschermingsgebied',
          visible: false,
          opacity: 0.4,
        },
      ],
    };
  }),
});
