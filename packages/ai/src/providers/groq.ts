import Groq from 'groq-sdk';
import type { AIProvider } from '../types.js';

export class GroqProvider implements AIProvider {
  readonly provider = 'groq';
  readonly model: string;
  private client: Groq;

  constructor(model = 'llama3-8b-8192') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY omgevingsvariabele is niet ingesteld');
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Groq gaf een lege respons');
    return content;
  }
}
