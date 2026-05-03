// Stub voor gemeente-proof productie. Activeren door AI_PROVIDER=azure in te stellen.
// Implementatie volgt nadat privacytest en auditlog zijn goedgekeurd.

import type { AIProvider } from '../types.js';

export class AzureOpenAIProvider implements AIProvider {
  readonly provider = 'azure-openai';
  readonly model: string;

  constructor(model = 'gpt-4o') {
    this.model = model;
  }

  async generateText(_systemPrompt: string, _userPrompt: string): Promise<string> {
    throw new Error(
      'Azure OpenAI provider is nog niet geïmplementeerd. ' +
        'Stel AI_PROVIDER=groq in voor de MVP-fase.'
    );
  }
}
