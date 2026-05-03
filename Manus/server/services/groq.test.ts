import { describe, it, expect } from 'vitest';
import { testGroqConnection } from './llamaSummarizer';

describe('Groq API Integration', () => {
  it('validates Groq API key by testing connection', async () => {
    const result = await testGroqConnection();
    
    console.log('Groq connection test result:', result);
    
    // The test should succeed if GROQ_API_KEY is configured correctly
    if (process.env.GROQ_API_KEY) {
      expect(result.success).toBe(true);
      expect(result.model).toBeDefined();
      console.log('Groq model:', result.model);
    } else {
      // If no key is configured, it should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('GROQ_API_KEY');
    }
  }, 30000); // 30 second timeout for API call
});
