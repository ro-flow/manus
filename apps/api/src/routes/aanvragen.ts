import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { unzipSync } from 'fflate';
import { aanvraagRepository, aiLogRepository } from '@ro-flow/db';
import { sanitizeForAI, restoreTemplateFields, PrivacyViolationError } from '@ro-flow/privacy';
import { createAIClient } from '@ro-flow/ai';
import {
  bepaalProcedure,
  buildOntvangstbevestigingPrompt,
  berekenTermijnen,
  extractNawFromText,
  sanitizeTextForAI,
  buildExtractiePrompt,
  parseExtractieResponse,
  extractMetadataFromText,
  extractPercelenFromText,
  parseDsoXml,
  parseerDSOXml,
  checkCompleteness,
  buildBriefData,
  detecteerLocaties,
  resolveAlleLocaties,
  toetsBestemmingsplan,
  type PerceelInput,
  type Activiteit,
  type IngediendDoc,
  type ResolvedLocatie,
  type BestemmingsplanToetsResultaat,
} from '@ro-flow/core';

const GELDIGE_ACTIVITEITEN = new Set<Activiteit>([
  'bouwen', 'slopen', 'kappen', 'milieu', 'aanleggen',
  'uitweg', 'bopa', 'monument', 'functiewijziging', 'overig',
]);

function toActiviteit(type: string | null | undefined): Activiteit {
  const lower = (type ?? '').toLowerCase() as Activiteit;
  return GELDIGE_ACTIVITEITEN.has(lower) ? lower : 'overig';
}
import { uploadPDF } from '../azure/blobStorage.js';
import { extracteerUitPDF } from '../azure/documentIntelligence.js';
import { streamBehandelrapportPdf } from '../pdf/behandelrapportPdf.js';

export const aanvragenRouter: ReturnType<typeof Router> = Router();

const ZIP_MIMETYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);

const uploadExtractie = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    const isZip = ZIP_MIMETYPES.has(file.mimetype) || ext.endsWith('.zip');
    const isXml = ['text/xml', 'application/xml'].includes(file.mimetype) || ext.endsWith('.xml');
    const isPdf = file.mimetype === 'application/pdf' || ext.endsWith('.pdf');
    if (isPdf || isXml || isZip) cb(null, true);
    else cb(new Error('Alleen PDF-, XML- of ZIP/DSO-bestanden zijn toegestaan'));
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Alleen PDF-bestanden zijn toegestaan'));
  },
});

function detectBestandstype(mimetype: string, filename: string): 'pdf' | 'xml' | 'zip' {
  const ext = filename.toLowerCase();
  if (ext.endsWith('.zip') || ZIP_MIMETYPES.has(mimetype)) return 'zip';
  if (ext.endsWith('.xml') || ['text/xml', 'application/xml'].includes(mimetype)) return 'xml';
  return 'pdf';
}


function xmlUitZip(buffer: Buffer): string {
  const bestanden = unzipSync(new Uint8Array(buffer));
  const xmlEntry = Object.entries(bestanden).find(
    ([naam]) => naam.toLowerCase().endsWith('.xml') && !naam.includes('__MACOSX')
  );
  if (!xmlEntry) throw new Error('Geen XML gevonden in ZIP-bestand');
  return Buffer.from(xmlEntry[1]).toString('utf-8');
}


const MAANDEN_NL: Record<string, number> = {
  januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
  juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
};

function parseDutchDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})/i);
  if (m) return new Date(Number(m[3]), MAANDEN_NL[m[2].toLowerCase()], Number(m[1]));
  const d = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (d) return new Date(Number(d[3]), Number(d[2]) - 1, Number(d[1]));
  return null;
}

// Validatieschema's
const PerceelSchema = z.object({
  id: z.string(),
  kadastraleAanduiding: z.string(),
  activiteiten: z.array(z.string()),
  ingediendeDocs: z.array(z.object({ type: z.string(), bestandsnaam: z.string() })),
  bouwjaar: z.number().nullable(),
  postcode: z.string().optional(),
  huisnummer: z.string().optional(),
  gebruiksdoel: z.array(z.string()).optional(),
  oppervlakte: z.number().nullable().optional(),
});

const CreateAanvraagSchema = z.object({
  gemeente: z.string().max(100).optional(),
  gebiedstype: z.string().max(100).optional(),
  activiteitType: z.string().max(200).optional(),
  activiteitOmschrijving: z.string().max(5000).optional(),
  aanvraagnummer: z.string().max(50).optional(),
  aanvraagdatum: z.string().max(50).optional(),
  percelen: z.array(PerceelSchema).optional(),
  aanvrager: z
    .object({
      naam: z.string().min(1),
      email: z.string().email().optional(),
      telefoon: z.string().optional(),
      adres: z.string().optional(),
      postcode: z.string().max(10).optional(),
      woonplaats: z.string().max(100).optional(),
    })
    .optional(),
});

// POST /api/aanvragen/extraheer — gegevens uit PDF, DSO-ZIP of XML halen
// PDF  → Groq AI (gesanitized, geen NAW naar AI)
// ZIP/XML → DSO XML parser, volledig zonder AI
aanvragenRouter.post('/extraheer', uploadExtractie.single('bestand'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Geen bestand bijgevoegd' });
      return;
    }

    const type = detectBestandstype(req.file.mimetype, req.file.originalname);

    // ── DSO ZIP of XML: direct parsen, geen AI ────────────────────────────
    if (type === 'zip' || type === 'xml') {
      const xmlString = type === 'zip'
        ? xmlUitZip(req.file.buffer)
        : req.file.buffer.toString('utf-8');

      const resultaat = parseDsoXml(xmlString);
      const dsoResultaat = parseerDSOXml(xmlString);

      return res.json({
        gemeente:               resultaat.gemeente,
        activiteitType:         resultaat.activiteitType,
        activiteitOmschrijving: resultaat.activiteitOmschrijving,
        locatieContext:         resultaat.locatieContext,
        percelen:               dsoResultaat.percelen,
        naw:                    resultaat.naw,
        methode:                'dso_xml',
      });
    }

    // ── PDF: Azure Document Intelligence → gestructureerde tekst → Groq ────
    const rawText = await extracteerUitPDF(req.file.buffer);

    if (!rawText.trim()) {
      res.status(422).json({ error: 'Geen leesbare tekst gevonden in de PDF' });
      return;
    }

    // Debug: log sectie rond 'Specificatie locatie' voor perceelextractie diagnose
    const locDebugIdx = rawText.toLowerCase().indexOf('specificatie locatie');
    const kadDebugIdx = rawText.toLowerCase().indexOf('kadastrale aanduiding');
    const debugIdx = locDebugIdx >= 0 ? locDebugIdx : kadDebugIdx >= 0 ? kadDebugIdx : -1;
    if (debugIdx >= 0) {
      console.log('[perceel debug] Sectie gevonden op positie', debugIdx, '(eerste 600 tekens):');
      console.log(rawText.slice(debugIdx, debugIdx + 600));
    } else {
      console.log('[perceel debug] Geen "Specificatie locatie" of "Kadastrale aanduiding" gevonden in tekst');
      console.log('[perceel debug] Eerste 300 tekens van tekst:', rawText.slice(0, 300));
    }

    // NAW + metadata via regex uit de gestructureerde tekst — nooit naar AI
    const naw = extractNawFromText(rawText);
    const metadata = extractMetadataFromText(rawText);
    const sanitizedText = sanitizeTextForAI(rawText, naw);

    // Groq bepaalt gemeente, activiteitType, omschrijving, locatieContext
    const { systemPrompt, userPrompt } = buildExtractiePrompt(sanitizedText);
    const ai = createAIClient();
    const start = Date.now();
    const aiResponse = await ai.generateText(systemPrompt, userPrompt);

    await aiLogRepository.log({
      provider: ai.provider,
      model: ai.model,
      sanitizedPayload: { bron: 'pdf-extractie', tekstLengte: sanitizedText.length },
      aiResponse,
      durationMs: String(Date.now() - start),
    });

    const aiData = parseExtractieResponse(aiResponse);

    // Percelen extraheren via kadastrale regex
    const perceelAanduidingen = extractPercelenFromText(rawText);
    console.log('[perceel debug] Gevonden aanduidingen:', perceelAanduidingen);
    const activiteitVoorPercelen = toActiviteit(aiData.activiteitType);

    // PDOK locatie resolve — parallel, nooit blokkend
    const locatieInvoeren = detecteerLocaties(rawText, aiData.gemeente ?? undefined);
    let resolvedLocaties: ResolvedLocatie[] = [];
    try {
      resolvedLocaties = await resolveAlleLocaties(locatieInvoeren);
      for (const loc of resolvedLocaties) {
        console.log(`[locatie] methode=${loc.methode} betrouwbaarheid=${loc.betrouwbaarheid} lat=${loc.lat} lon=${loc.lon}${loc.fout ? ` fout=${loc.fout}` : ''}`);
      }
    } catch (err) {
      console.warn('[locatie] PDOK resolve mislukt, ga door zonder coördinaten:', err);
    }

    // Bouw een lookup: kadastraleAanduiding → resolved locatie
    const locatieLookup = new Map<string, ResolvedLocatie>();
    for (const loc of resolvedLocaties) {
      if (loc.invoer.type === 'kadastraal' && loc.kadastraleAanduiding) {
        locatieLookup.set(loc.invoer.origineel, loc);
      }
    }

    const percelenVanPdf: PerceelInput[] | undefined = perceelAanduidingen.length > 0
      ? perceelAanduidingen.map((aanduiding, i) => {
          const loc = locatieLookup.get(aanduiding);
          return {
            id: `pdf-${Date.now()}-${i}`,
            kadastraleAanduiding: loc?.kadastraleAanduiding ?? aanduiding,
            activiteiten: [activiteitVoorPercelen],
            ingediendeDocs: [] as IngediendDoc[],
            bouwjaar: null,
            ...(loc && loc.lat !== 0 ? {
              lat: loc.lat,
              lon: loc.lon,
              rd_x: loc.rd_x,
              rd_y: loc.rd_y,
              locatieMethode: loc.methode,
              locatieBetrouwbaarheid: loc.betrouwbaarheid,
            } : {}),
          };
        })
      : undefined;

    return res.json({
      gemeente:               aiData.gemeente,
      activiteitType:         aiData.activiteitType,
      activiteitOmschrijving: aiData.activiteitOmschrijving,
      locatieContext:         aiData.locatieContext,
      aanvraagnummer:         metadata.aanvraagnummer,
      aanvraagdatum:          metadata.aanvraagdatum,
      percelen:               percelenVanPdf,
      resolvedLocaties:       resolvedLocaties.map(l => ({
        methode: l.methode,
        betrouwbaarheid: l.betrouwbaarheid,
        weergavenaam: l.weergavenaam,
        lat: l.lat,
        lon: l.lon,
        fout: l.fout,
      })),
      naw,
      methode: 'pdf_ai',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/aanvragen — aanvraag aanmaken
// NAW wordt gescheiden opgeslagen van aanvraaginhoud
aanvragenRouter.post('/', async (req, res, next) => {
  try {
    const body = CreateAanvraagSchema.parse(req.body);

    const aanvraag = await aanvraagRepository.create({
      gemeente: body.gemeente ?? 'Onbekend',
      gebiedstype: body.gebiedstype,
      activiteitType: body.activiteitType,
      activiteitOmschrijving: body.activiteitOmschrijving,
      aanvraagnummer: body.aanvraagnummer,
      aanvraagdatum: body.aanvraagdatum,
      percelen: body.percelen ?? null,
    });

    if (body.aanvrager) {
      await aanvraagRepository.savePii(aanvraag.id, body.aanvrager);
    }

    res.status(201).json({
      id: aanvraag.id,
      status: aanvraag.status,
      createdAt: aanvraag.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/aanvragen/:id — aanvraag ophalen (zonder PII)
aanvragenRouter.get('/:id', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }
    res.json(aanvraag);
  } catch (err) {
    next(err);
  }
});

// POST /api/aanvragen/:id/pdf — PDF uploaden naar Azure Blob Storage
// De volledige PDF staat alleen in Azure; backend slaat alleen de blob-URL op
aanvragenRouter.post('/:id/pdf', upload.single('pdf'), async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Geen PDF bijgevoegd' });
      return;
    }

    const blobUrl = await uploadPDF(
      req.params.id,
      req.file.buffer,
      req.file.originalname
    );

    await aanvraagRepository.updatePdfUrl(req.params.id, blobUrl);

    res.json({ blobUrl });
  } catch (err) {
    next(err);
  }
});

// Reconstrueer ResolvedLocatie[] uit opgeslagen percelen (hebben extra lat/lon/rd velden)
function percelenNaarLocaties(percelen: PerceelInput[]): ResolvedLocatie[] {
  const resultaat: ResolvedLocatie[] = [];
  for (const p of percelen) {
    const extra = p as PerceelInput & {
      lat?: number; lon?: number;
      rd_x?: number; rd_y?: number;
      locatieMethode?: string;
      locatieBetrouwbaarheid?: 'hoog' | 'middel' | 'laag';
    };
    if (!extra.lat || extra.lat === 0) continue;
    resultaat.push({
      invoer: { type: 'kadastraal', kadastraleGemeente: '', sectie: '', perceelnummer: '', origineel: p.kadastraleAanduiding },
      lat: extra.lat,
      lon: extra.lon ?? 0,
      rd_x: extra.rd_x,
      rd_y: extra.rd_y,
      kadastraleAanduiding: p.kadastraleAanduiding,
      betrouwbaarheid: extra.locatieBetrouwbaarheid ?? 'laag',
      methode: extra.locatieMethode ?? 'opgeslagen',
    });
  }
  return resultaat;
}

// POST /api/aanvragen/:id/volledigheidscheck
// checkCompleteness + PDOK bestemmingsplantoets parallel uitvoeren
aanvragenRouter.post('/:id/volledigheidscheck', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    const opgeslagenPercelen = aanvraag.percelen as PerceelInput[] | null;
    const perceelInputs: PerceelInput[] = opgeslagenPercelen?.length
      ? opgeslagenPercelen
      : [{
          id: aanvraag.id,
          kadastraleAanduiding: 'Onbekend',
          activiteiten: [toActiviteit(aanvraag.activiteitType)],
          ingediendeDocs: [],
          bouwjaar: null,
        }];

    const resolvedLocaties = percelenNaarLocaties(perceelInputs);

    // Parallel: volledigheidscheck + PDOK bestemmingsplantoets
    const [completenessResultaat, bestemmingsplanResultaten] = await Promise.all([
      Promise.resolve(checkCompleteness(perceelInputs)),
      toetsBestemmingsplan(resolvedLocaties),
    ]);

    // ── BOPA detectie ─────────────────────────────────────────────────────────
    // Op basis van activiteitType of afwijking gesignaleerd in PDOK toets
    const isBopa =
      toActiviteit(aanvraag.activiteitType) === 'bopa' ||
      bestemmingsplanResultaten.some((t) => t.afwijkingGesignaleerd);

    const bopaVereisten = isBopa
      ? [
          { type: 'ruimtelijke_onderbouwing', naam: 'Ruimtelijke onderbouwing', grondslag: 'Art. 5.1 lid 2 Omgevingswet (BOPA)' },
          { type: 'motivering_afwijking', naam: 'Motivering afwijking omgevingsplan', grondslag: 'Art. 8.0a Omgevingsbesluit' },
        ]
      : [];

    // ── Waterstaatsactiviteit detectie ────────────────────────────────────────
    const waterKeywords = ['waterstaats', 'waterkering', 'watergang', 'waterbeheersing', 'rivier', 'kanaal'];
    const heeftWaterstaats = bestemmingsplanResultaten.some((t) =>
      t.gebiedsaanduidingen.some((g) =>
        waterKeywords.some((kw) => g.toLowerCase().includes(kw))
      )
    );

    const aandachtspunten: string[] = [];
    if (heeftWaterstaats) {
      aandachtspunten.push('Waterstaatsactiviteit gesignaleerd op basis van gebiedsaanduidingen. Controleer of een watervergunning vereist is (Waterschapswet / Omgevingswet).');
    }
    if (isBopa) {
      aandachtspunten.push('Activiteit past mogelijk niet binnen het omgevingsplan (BOPA). Uitgebreide procedure kan van toepassing zijn.');
    }

    // ── Analyserapport opslaan in database ────────────────────────────────────
    const analyserapport = {
      tijdstip: new Date().toISOString(),
      bestemmingsplanToets: bestemmingsplanResultaten,
      isBopa,
      heeftWaterstaats,
      aandachtspunten,
    };
    // Fire-and-forget — analyse is niet blokkerend
    aanvraagRepository.updateAnalyserapport(aanvraag.id, analyserapport).catch((err: unknown) => {
      console.warn('[analyserapport] Opslaan mislukt:', err);
    });

    res.json({
      ...completenessResultaat,
      bestemmingsplanToets: bestemmingsplanResultaten as BestemmingsplanToetsResultaat[],
      bopaVereisten,
      aandachtspunten,
      isBopa,
    });
  } catch (err) {
    next(err);
  }
});

const OntvangstbevestigingBodySchema = z.object({
  aanvraagType: z.enum(['formeel', 'concept']).default('formeel'),
});

// POST /api/aanvragen/:id/ontvangstbevestiging — brief genereren (5 varianten)
// Variant A/B: volledig · Variant C/D: onvolledig · Variant E: concept
// AI genereert met placeholders; backend vult NAW in via restoreTemplateFields
aanvragenRouter.post('/:id/ontvangstbevestiging', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    const { aanvraagType } = OntvangstbevestigingBodySchema.parse(req.body);

    // Stap 1 — deterministische volledigheidscheck
    // Gebruik opgeslagen percelen (DSO) of maak één perceel op basis van activiteitType (PDF)
    const opgeslagenPercelen = aanvraag.percelen as PerceelInput[] | null;
    const perceelInputs: PerceelInput[] = opgeslagenPercelen?.length
      ? opgeslagenPercelen
      : [{
          id: aanvraag.id,
          kadastraleAanduiding: 'Onbekend',
          activiteiten: [toActiviteit(aanvraag.activiteitType)],
          ingediendeDocs: [],
          bouwjaar: null,
        }];
    const completenessResultaat = checkCompleteness(perceelInputs);
    const briefData = buildBriefData(completenessResultaat);

    // Locatieomschrijving: gebruik kadastrale nummers, niet het adres van de aanvrager
    // "Onbekend" percelen worden overgeslagen; fallback op locatieContext uit aanvraag
    const percelenMetNummer = perceelInputs.filter(p => p.kadastraleAanduiding !== 'Onbekend');
    const locatieOmschrijving = percelenMetNummer.length > 0
      ? percelenMetNummer.length === 1
        ? `perceel ${percelenMetNummer[0].kadastraleAanduiding}`
        : `de percelen: ${percelenMetNummer.map(p => p.kadastraleAanduiding).join(', ')}`
      : undefined;

    // Stap 2 — procedure + termijnen berekenen
    // Gebruik aanvraagdatum uit PDF als beschikbaar, anders de DB-aanmaakdatum
    const aanvraagDate = parseDutchDate(aanvraag.aanvraagdatum) ?? new Date(aanvraag.createdAt);
    const procedureResultaat = bepaalProcedure(aanvraag.activiteitType);
    const termijnen = berekenTermijnen(
      aanvraagDate,
      procedureResultaat.procedure,
      completenessResultaat.volledig
    );

    // Stap 3 — privacy-check op aanvraagcontext
    const rawContext = {
      gemeente: aanvraag.gemeente,
      gebiedstype: aanvraag.gebiedstype ?? undefined,
      activiteitType: aanvraag.activiteitType ?? undefined,
      activiteitOmschrijving: aanvraag.activiteitOmschrijving ?? undefined,
    };

    let sanitizedContext;
    try {
      sanitizedContext = sanitizeForAI(rawContext);
    } catch (privacyErr) {
      if (privacyErr instanceof PrivacyViolationError) {
        await aiLogRepository.log({
          aanvraagId: aanvraag.id,
          provider: 'none',
          sanitizedPayload: rawContext,
          privacyBlocked: true,
          errorMessage: privacyErr instanceof Error ? privacyErr.message : String(privacyErr),
        });
      }
      throw privacyErr;
    }

    // Stap 4 — prompt bouwen
    const { systemPrompt, userPrompt } = buildOntvangstbevestigingPrompt({
      gemeente: sanitizedContext.gemeente ?? aanvraag.gemeente,
      zaaknummer: aanvraag.aanvraagnummer ?? aanvraag.id,
      ontvangstdatum: termijnen.ontvangstdatum,
      activiteitType: sanitizedContext.activiteitType,
      activiteitOmschrijving: sanitizedContext.activiteitOmschrijving,
      gebiedstype: sanitizedContext.gebiedstype,
      locatieOmschrijving,
      aanvraagType,
      procedureType: procedureResultaat.procedure,
      doorlooptijd: procedureResultaat.doorlooptijd,
      volledig: completenessResultaat.volledig,
      beslistermijnDatum: termijnen.beslistermijnDatum,
      aanvuldeadlineDatum: termijnen.aanvuldeadlineDatum,
      briefData,
    });

    // Stap 5 — AI aanroep
    const ai = createAIClient();
    const start = Date.now();
    const briefMetPlaceholders = await ai.generateText(systemPrompt, userPrompt);
    const durationMs = String(Date.now() - start);

    await aiLogRepository.log({
      aanvraagId: aanvraag.id,
      provider: ai.provider,
      model: ai.model,
      sanitizedPayload: { context: sanitizedContext, briefData, aanvraagType },
      aiResponse: briefMetPlaceholders,
      durationMs,
    });

    // Stap 6 — NAW restore binnen Azure
    const pii = await aanvraagRepository.findPiiByAanvraagId(aanvraag.id);
    console.log(`[brief] PII voor ${aanvraag.id}:`, pii
      ? { naam: pii.naam, heeftAdres: !!pii.adres, heeftEmail: !!pii.email }
      : 'geen PII gevonden');

    // Gemeentenaam zonder prefix "Gemeente " voor gebruik als afdelingnaam
    const gemeenteNaam = aanvraag.gemeente.replace(/^gemeente\s+/i, '');

    const briefVolledig = restoreTemplateFields(
      briefMetPlaceholders,
      {
        naam: pii?.naam ?? undefined,
        email: pii?.email ?? undefined,
        telefoon: pii?.telefoon ?? undefined,
        adres: pii?.adres ?? undefined,
        postcode: pii?.postcode ?? undefined,
        woonplaats: pii?.woonplaats ?? undefined,
      },
      { afdelingNaam: `Team Omgevingsvergunningen ${gemeenteNaam}` }
    );

    res.json({
      brief: briefVolledig,
      procedure: procedureResultaat,
      volledigheid: {
        volledig: completenessResultaat.volledig,
        aantalOntbrekend: completenessResultaat.aantalVerplichtOntbrekendTotaal,
      },
      termijnen,
      variant: aanvraagType === 'concept' ? 'E'
        : completenessResultaat.volledig && procedureResultaat.procedure !== 'uitgebreid' ? 'A'
        : completenessResultaat.volledig ? 'B'
        : procedureResultaat.procedure !== 'uitgebreid' ? 'C' : 'D',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/aanvragen/:id/behandelrapport — intern rapport voor de behandelaar
// Combineert aanvraagdata, volledigheidscheck, bestemmingsplantoets en procedure
// NOOIT NAW-gegevens — uitsluitend inhoudelijke data
aanvragenRouter.get('/:id/behandelrapport', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    const opgeslagenPercelen = aanvraag.percelen as PerceelInput[] | null;
    const perceelInputs: PerceelInput[] = opgeslagenPercelen?.length
      ? opgeslagenPercelen
      : [{
          id: aanvraag.id,
          kadastraleAanduiding: 'Onbekend',
          activiteiten: [toActiviteit(aanvraag.activiteitType)],
          ingediendeDocs: [],
          bouwjaar: null,
        }];

    const aanvraagDate = parseDutchDate(aanvraag.aanvraagdatum) ?? new Date(aanvraag.createdAt);
    const procedureResultaat = bepaalProcedure(aanvraag.activiteitType);

    // Volledigheidscheck + termijnen parallel
    const completenessResultaat = checkCompleteness(perceelInputs);
    const termijnen = berekenTermijnen(
      aanvraagDate,
      procedureResultaat.procedure,
      completenessResultaat.volledig
    );

    // Opgeslagen analyserapport (bestemmingsplantoets + aandachtspunten) uit vorige volledigheidscheck
    const opgeslagenRapport = aanvraag.analyserapport as {
      bestemmingsplanToets?: BestemmingsplanToetsResultaat[];
      isBopa?: boolean;
      heeftWaterstaats?: boolean;
      aandachtspunten?: string[];
      tijdstip?: string;
    } | null;

    // Activiteiten samenvatting per perceel
    const activiteitenSamenvatting = perceelInputs.map((p) => ({
      kadastraleAanduiding: p.kadastraleAanduiding,
      activiteiten: p.activiteiten,
      ingediendeDocs: p.ingediendeDocs.length,
      bouwjaar: p.bouwjaar,
    }));

    // Bronnen
    const geraadpleegdOp = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const bronnen = [
      { naam: 'PDOK Ruimtelijke Plannen (WFS)', url: 'https://service.pdok.nl/rws/ruimtelijkeplannen/wfs/v1_0', geraadpleegd: geraadpleegdOp },
      { naam: 'PDOK Locatieserver', url: 'https://api.pdok.nl/bzk/locatieserver/search/v3_1', geraadpleegd: geraadpleegdOp },
    ];
    if (!opgeslagenRapport?.bestemmingsplanToets?.length) {
      bronnen[0] = { ...bronnen[0], geraadpleegd: 'Niet geraadpleegd — voer eerst een volledigheidscheck uit' };
    }

    res.json({
      intern: true,
      gegenereerd: new Date().toISOString(),
      aanvraag: {
        id: aanvraag.id,
        gemeente: aanvraag.gemeente,
        activiteitType: aanvraag.activiteitType,
        activiteitOmschrijving: aanvraag.activiteitOmschrijving,
        aanvraagnummer: aanvraag.aanvraagnummer,
        aanvraagdatum: aanvraag.aanvraagdatum,
        status: aanvraag.status,
      },
      procedure: {
        ...procedureResultaat,
        termijnen,
      },
      volledigheid: {
        volledig: completenessResultaat.volledig,
        aantalVerplichtOntbrekend: completenessResultaat.aantalVerplichtOntbrekendTotaal,
        percelen: completenessResultaat.percelen,
        samenvatting: completenessResultaat.samenvatting,
      },
      activiteitenSamenvatting,
      bestemmingsplanToets: opgeslagenRapport?.bestemmingsplanToets ?? null,
      isBopa: opgeslagenRapport?.isBopa ?? (toActiviteit(aanvraag.activiteitType) === 'bopa'),
      aandachtspunten: opgeslagenRapport?.aandachtspunten ?? [],
      bronnen,
      voorbehoud:
        'Voorlopige inschatting op basis van ingediende stukken. Kan wijzigen na inhoudelijke beoordeling. ' +
        'De behandelaar blijft verantwoordelijk voor het definitieve oordeel. ' +
        'INTERN gebruik — niet voor aanvrager bestemd.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/aanvragen/:id/behandelrapport/pdf — PDF-versie van het behandelrapport
// Zelfde data als de JSON endpoint, gestreamd als PDF via pdfkit
aanvragenRouter.get('/:id/behandelrapport/pdf', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    const opgeslagenPercelen = aanvraag.percelen as PerceelInput[] | null;
    const perceelInputs: PerceelInput[] = opgeslagenPercelen?.length
      ? opgeslagenPercelen
      : [{
          id: aanvraag.id,
          kadastraleAanduiding: 'Onbekend',
          activiteiten: [toActiviteit(aanvraag.activiteitType)],
          ingediendeDocs: [],
          bouwjaar: null,
        }];

    const procedureResultaat = bepaalProcedure(aanvraag.activiteitType);
    const completenessResultaat = checkCompleteness(perceelInputs);

    const opgeslagenRapport = aanvraag.analyserapport as {
      bestemmingsplanToets?: BestemmingsplanToetsResultaat[];
      isBopa?: boolean;
      aandachtspunten?: string[];
    } | null;

    const activiteitenSamenvatting = perceelInputs.map((p) => ({
      kadastraleAanduiding: p.kadastraleAanduiding,
      activiteiten: p.activiteiten,
      ingediendeDocs: p.ingediendeDocs.length,
      bouwjaar: p.bouwjaar,
    }));

    const geraadpleegdOp = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const bronnen = [
      { naam: 'PDOK Ruimtelijke Plannen (WFS)', geraadpleegd: geraadpleegdOp },
      { naam: 'PDOK Locatieserver', geraadpleegd: geraadpleegdOp },
    ];

    streamBehandelrapportPdf({
      gegenereerd: new Date().toISOString(),
      aanvraag: {
        id: aanvraag.id,
        gemeente: aanvraag.gemeente,
        activiteitType: aanvraag.activiteitType,
        activiteitOmschrijving: aanvraag.activiteitOmschrijving,
        aanvraagnummer: aanvraag.aanvraagnummer,
        aanvraagdatum: aanvraag.aanvraagdatum,
        status: aanvraag.status,
      },
      procedure: {
        procedure: procedureResultaat.procedure,
        doorlooptijd: procedureResultaat.doorlooptijd,
        toelichting: procedureResultaat.toelichting,
      },
      volledigheid: {
        volledig: completenessResultaat.volledig,
        aantalVerplichtOntbrekend: completenessResultaat.aantalVerplichtOntbrekendTotaal,
        samenvatting: completenessResultaat.samenvatting,
      },
      activiteitenSamenvatting,
      bestemmingsplanToets: opgeslagenRapport?.bestemmingsplanToets ?? null,
      isBopa: opgeslagenRapport?.isBopa ?? (toActiviteit(aanvraag.activiteitType) === 'bopa'),
      aandachtspunten: opgeslagenRapport?.aandachtspunten ?? [],
      bronnen,
      voorbehoud:
        'Voorlopige inschatting op basis van ingediende stukken. Kan wijzigen na inhoudelijke beoordeling. ' +
        'De behandelaar blijft verantwoordelijk voor het definitieve oordeel. ' +
        'INTERN gebruik — niet voor aanvrager bestemd.',
    }, res);
  } catch (err) {
    next(err);
  }
});
