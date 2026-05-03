import express from 'express';
import { aanvragenRouter } from './routes/aanvragen.js';
import { healthRouter } from './routes/health.js';
import { aiLogRouter } from './routes/aiLog.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/aanvragen', aanvragenRouter);
app.use('/api/ai-log', aiLogRouter);

// Centrale foutafhandeling — inclusief PrivacyViolationError
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Ro-flow API gestart op poort ${PORT}`);
  console.log(`AI provider: ${process.env.AI_PROVIDER ?? 'groq'}`);
});

export default app;
