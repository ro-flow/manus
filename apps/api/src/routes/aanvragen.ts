import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { aanvraagRepository, aiLogRepository } from '@ro-flow/db';
import { sanitizeForAI, restoreTemplateFields, PrivacyViolationError } from '@ro-flow/privacy';
import { createAIClient } from '@ro-flow/ai';
import {
  checkVolledigheid,
  bepaalProcedure,
  buildOntvangstbevestigingPrompt,
  buildVolledigheidsCheckPrompt,
} from '@ro-flow/core';
import { uploadToBlobStorage } from '../azure/blobStorage.js';

export const aanvragenRouter: ReturnType<typeof Router> = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Alleen PDF-bestanden zijn toegestaan'));
    }
  },
});

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
// AI krijgt alleen geschoonde context — nooit NAW
aanvragenRouter.post('/:id/volledigheidscheck', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    const rawContext = {
      gemeente: aanvraag.gemeente,
      gebiedstype: aanvraag.gebiedstype ?? undefined,
      activiteitType: aanvraag.activiteitType ?? undefined,
      activiteitOmschrijving: aanvraag.activiteitOmschrijving ?? undefined,
    };

    // Privacy-check — bij NAW-detectie wordt de blokkering gelogd en de aanroep geannuleerd
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
    });
    const ai = createAIClient();
    const start = Date.now();

    const aiToelichting = await ai.generateText(systemPrompt, userPrompt);
    const durationMs = String(Date.now() - start);

    await aiLogRepository.log({
      aanvraagId: aanvraag.id,
      provider: ai.provider,
      model: ai.model,
      sanitizedPayload: { systemPrompt, context: sanitizedContext },
      aiResponse: aiToelichting,
      durationMs,
    });

    const resultaat = checkVolledigheid(
      {
        activiteitType: aanvraag.activiteitType,
        activiteitOmschrijving: aanvraag.activiteitOmschrijving,
      },
      aiToelichting
    );

    res.json(resultaat);
  } catch (err) {
    next(err);
  }
});

// POST /api/aanvragen/:id/ontvangstbevestiging — conceptbrief genereren
// AI genereert tekst met placeholders; backend vult NAW in na ontvangst
aanvragenRouter.post('/:id/ontvangstbevestiging', async (req, res, next) => {
  try {
    const aanvraag = await aanvraagRepository.findById(req.params.id);
    if (!aanvraag) {
      res.status(404).json({ error: 'Aanvraag niet gevonden' });
      return;
    }

    const rawContext = {
      gemeente: aanvraag.gemeente,
      activiteitType: aanvraag.activiteitType ?? undefined,
      activiteitOmschrijving: aanvraag.activiteitOmschrijving ?? undefined,
    };

    // Privacy-check — bij NAW-detectie wordt de blokkering gelogd en de aanroep geannuleerd
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

    const procedureResultaat = bepaalProcedure(aanvraag.activiteitType);
    const { systemPrompt, userPrompt } = buildOntvangstbevestigingPrompt({
      ...sanitizedContext,
      gemeente: sanitizedContext.gemeente ?? aanvraag.gemeente,
      procedureType: procedureResultaat.procedure,
      doorlooptijd: procedureResultaat.doorlooptijd,
    });

    const ai = createAIClient();
    const start = Date.now();

    const briefMetPlaceholders = await ai.generateText(systemPrompt, userPrompt);
    const durationMs = String(Date.now() - start);

    await aiLogRepository.log({
      aanvraagId: aanvraag.id,
      provider: ai.provider,
      model: ai.model,
      sanitizedPayload: { systemPrompt, context: sanitizedContext },
      aiResponse: briefMetPlaceholders,
      durationMs,
    });

    // NAW ophalen uit beveiligde opslag en placeholders vervangen — alles binnen Azure
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
    });
  } catch (err) {
    next(err);
  }
});
