// Provider-agnostische interface zodat Groq later kan worden vervangen
// door Azure OpenAI zonder corelogica te herschrijven.

export interface AIProvider {
  readonly provider: string;
  readonly model: string;
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
}
