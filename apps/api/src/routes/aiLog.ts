import { Router } from 'express';
import { aiLogRepository } from '@ro-flow/db';

export const aiLogRouter = Router();

// GET /api/ai-log — auditlog van AI-aanroepen (behandelaar/admin)
aiLogRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query['limit'] ?? 50), 200);
    const log = await aiLogRepository.findRecent(limit);
    res.json(log);
  } catch (err) {
    next(err);
  }
});

// GET /api/ai-log/aanvraag/:aanvraagId — log voor specifieke aanvraag
aiLogRouter.get('/aanvraag/:aanvraagId', async (req, res, next) => {
  try {
    const log = await aiLogRepository.findByAanvraagId(req.params.aanvraagId);
    res.json(log);
  } catch (err) {
    next(err);
  }
});
