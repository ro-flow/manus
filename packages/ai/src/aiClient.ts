import type { AIProvider } from './types.js';
import { GroqProvider } from './providers/groq.js';
import { AzureOpenAIProvider } from './providers/azureOpenAI.js';

export function createAIClient(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? 'groq';

  switch (providerName) {
    case 'groq':
      return new GroqProvider(process.env.GROQ_MODEL);
    case 'azure-openai':
      return new AzureOpenAIProvider(process.env.AZURE_OPENAI_MODEL);
    default:
      throw new Error(`Onbekende AI_PROVIDER: '${providerName}'. Gebruik 'groq' of 'azure-openai'.`);
  }
}
