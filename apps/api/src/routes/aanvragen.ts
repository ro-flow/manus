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
  buildVolledigheidsCheckPrompt,
  berekenTermijnen,
  extractNawFromText,
  sanitizeTextForAI,
  buildExtractiePrompt,
  parseExtractieResponse,
  parseDsoXml,
  checkCompleteness,
  buildBriefData,
  type PerceelInput,
  type Activiteit,
} from '@ro-flow/core';

const GELDIGE_ACTIVITEITEN = new Set<Activiteit>([
  'bouwen', 'slopen', 'kappen', 'milieu', 'aanleggen',
  'uitweg', 'bopa', 'monument', 'functiewijziging', 'overig',
]);

function toActiviteit(type: string | null | undefined): Activiteit {
  const lower = (type ?? '').toLowerCase() as Activiteit;
  return GELDIGE_ACTIVITEITEN.has(lower) ? lower : 'overig';
}
import { uploadToBlobStorage } from '../azure/blobStorage.js';
import { extracteerUitPDF } from '../azure/documentIntelligence.js';

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


// Validatieschema's
const CreateAanvraagSchema = z.object({
  gemeente: z.string().min(1).max(100),
  gebiedstype: z.string().max(100).optional(),
  activiteitType: z.string().max(200).optional(),
  activiteitOmschrijving: z.string().max(5000).optional(),
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

      return res.json({
        gemeente:               resultaat.gemeente,
        activiteitType:         resultaat.activiteitType,
        activiteitOmschrijving: resultaat.activiteitOmschrijving,
        locatieContext:         resultaat.locatieContext,
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

    // NAW via regex uit de gestructureerde tekst — nooit naar AI
    const naw = extractNawFromText(rawText);
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

    return res.json({
      gemeente:               aiData.gemeente,
      activiteitType:         aiData.activiteitType,
      activiteitOmschrijving: aiData.activiteitOmschrijving,
      locatieContext:         aiData.locatieContext,
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
      gemeente: body.gemeente,
      gebiedstype: body.gebiedstype,
      activiteitType: body.activiteitType,
      activiteitOmschrijving: body.activiteitOmschrijving,
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

    const blobUrl = await uploadToBlobStorage(
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

// POST /api/aanvragen/:id/volledigheidscheck — ontbrekende stukken bepalen
// Stap 1: checkCompleteness (deterministisch, geen AI)
// Stap 2: AI genereert toelichting op basis van de uitkomst — nooit NAW
aanvragenRouter.post('/:id/volledigheidscheck', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    // Stap 1 — deterministische volledigheidscheck (geen AI, geen PII risico)
    const perceelInput: PerceelInput = {
      id: aanvraag.id,
      kadastraleAanduiding: 'Onbekend',
      activiteiten: [toActiviteit(aanvraag.activiteitType)],
      ingediendeDocs: [], // MVP: document-metadata nog niet opgeslagen
      bouwjaar: null,
    };
    const completenessResultaat = checkCompleteness([perceelInput]);
    const briefData = buildBriefData(completenessResultaat);

    // Stap 2 — AI toelichting met gesanitized context + check-uitkomst
    const rawContext = {
      gemeente: aanvraag.gemeente,
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

    const { systemPrompt, userPrompt } = buildVolledigheidsCheckPrompt({
      ...sanitizedContext,
      gemeente: sanitizedContext.gemeente ?? aanvraag.gemeente,
      briefData,
    });

    const ai = createAIClient();
    const start = Date.now();
    const aiToelichting = await ai.generateText(systemPrompt, userPrompt);
    const durationMs = String(Date.now() - start);

    await aiLogRepository.log({
      aanvraagId: aanvraag.id,
      provider: ai.provider,
      model: ai.model,
      sanitizedPayload: { context: sanitizedContext, briefData },
      aiResponse: aiToelichting,
      durationMs,
    });

    res.json({
      ...completenessResultaat,
      aiToelichting,
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
    const perceelInput: PerceelInput = {
      id: aanvraag.id,
      kadastraleAanduiding: 'Onbekend',
      activiteiten: [toActiviteit(aanvraag.activiteitType)],
      ingediendeDocs: [],
      bouwjaar: null,
    };
    const completenessResultaat = checkCompleteness([perceelInput]);
    const briefData = buildBriefData(completenessResultaat);

    // Stap 2 — procedure + termijnen berekenen
    const procedureResultaat = bepaalProcedure(aanvraag.activiteitType);
    const termijnen = berekenTermijnen(
      new Date(aanvraag.createdAt),
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
      zaaknummer: aanvraag.id,
      ontvangstdatum: termijnen.ontvangstdatum,
      activiteitType: sanitizedContext.activiteitType,
      activiteitOmschrijving: sanitizedContext.activiteitOmschrijving,
      gebiedstype: sanitizedContext.gebiedstype,
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
    const briefVolledig = pii
      ? restoreTemplateFields(briefMetPlaceholders, {
          naam: pii.naam,
          email: pii.email ?? undefined,
          telefoon: pii.telefoon ?? undefined,
          adres: pii.adres ?? undefined,
          postcode: pii.postcode ?? undefined,
          woonplaats: pii.woonplaats ?? undefined,
        })
      : briefMetPlaceholders;

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
