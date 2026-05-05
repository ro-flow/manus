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

  // Groq / AI provider rate limit → 503 met duidelijke melding
  if (err instanceof Error && (
    err.message.includes('rate_limit_exceeded') ||
    err.message.includes('Rate limit') ||
    err.message.includes('tokens per day')
  )) {
    console.warn('[AI rate limit]', err.message.slice(0, 200));
    res.status(503).json({
      error: 'ai_rate_limit',
      message: 'De AI-service heeft de dagelijkse limiet bereikt. Probeer het over 30 minuten opnieuw.',
    });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Er is een interne fout opgetreden.',
  });
};
