import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { PrivacyViolationError } from '@ro-flow/privacy';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof PrivacyViolationError) {
    console.error('[PRIVACY] AI-aanroep geblokkeerd:', err.message);
    res.status(422).json({
      error: 'privacy_violation',
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      issues: err.issues,
    });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Er is een interne fout opgetreden.',
  });
};
