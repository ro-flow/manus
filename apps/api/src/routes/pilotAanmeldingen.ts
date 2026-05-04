import { Router } from 'express';
import { z } from 'zod';
import { pilotRepository } from '@ro-flow/db';

export const pilotRouter: ReturnType<typeof Router> = Router();

const PilotAanmeldingSchema = z.object({
  gemeente: z.string().min(1).max(100),
  naam: z.string().min(1).max(200),
  functie: z.string().max(200).optional(),
  email: z.string().email(),
  telefoon: z.string().max(50).optional(),
  aanvragenPerJaar: z.string().max(50).optional(),
  toelichting: z.string().max(2000).optional(),
});

pilotRouter.post('/', async (req, res, next) => {
  try {
    const body = PilotAanmeldingSchema.parse(req.body);
    const aanmelding = await pilotRepository.create(body);
    res.status(201).json({ id: aanmelding.id });
  } catch (err) {
    next(err);
  }
});

pilotRouter.get('/', async (_req, res, next) => {
  try {
    const aanmeldingen = await pilotRepository.findAll();
    res.json(aanmeldingen);
  } catch (err) {
    next(err);
  }
});
