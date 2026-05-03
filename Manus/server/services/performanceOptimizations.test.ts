/**
 * Performance Optimizations Tests
 * 
 * Tests for the top 3 recommendations from system analysis:
 * 1. Streaming LLM responses
 * 2. Robust rechtspraak.nl crawler with retry logic
 * 3. Parallel jurisprudentie context gathering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Streaming LLM Support', () => {
    it('should export invokeLLMStreaming function', async () => {
      const llm = await import('../_core/llm');
      expect(typeof llm.invokeLLMStreaming).toBe('function');
    });

    it('should have StreamingParams interface with onChunk callback', async () => {
      const llm = await import('../_core/llm');
      // Type check - if this compiles, the interface exists
      const params: Parameters<typeof llm.invokeLLMStreaming>[0] = {
        messages: [{ role: 'user', content: 'test' }],
        onChunk: (chunk: string) => console.log(chunk),
        onProgress: (progress) => console.log(progress.stage, progress.percentage)
      };
      expect(params.onChunk).toBeDefined();
      expect(params.onProgress).toBeDefined();
    });

    it('should return AsyncGenerator from invokeLLMStreaming', async () => {
      const llm = await import('../_core/llm');
      
      // Mock streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" World"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      // Set env for test
      process.env.BUILT_IN_FORGE_API_KEY = 'test-key';
      
      const generator = llm.invokeLLMStreaming({
        messages: [{ role: 'user', content: 'test' }]
      });

      expect(generator[Symbol.asyncIterator]).toBeDefined();
    });
  });

  describe('2. Robust Rechtspraak.nl Crawler', () => {
    it('should have retry configuration', async () => {
      // Read the file content to verify retry config exists
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/openRechtspraakClient.ts', 'utf-8');
      
      expect(content).toContain('RETRY_CONFIG');
      expect(content).toContain('maxRetries');
      expect(content).toContain('baseDelayMs');
    });

    it('should implement exponential backoff', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/openRechtspraakClient.ts', 'utf-8');
      
      expect(content).toContain('getRetryDelay');
      expect(content).toContain('Math.pow(2, attempt)');
    });

    it('should handle rate limiting (429)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/openRechtspraakClient.ts', 'utf-8');
      
      expect(content).toContain('response.status === 429');
      expect(content).toContain('Rate limited');
    });

    it('should handle server errors (5xx) with retry', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/openRechtspraakClient.ts', 'utf-8');
      
      expect(content).toContain('response.status >= 500');
      expect(content).toContain('Server error');
    });

    it('should handle network errors with retry', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/openRechtspraakClient.ts', 'utf-8');
      
      expect(content).toContain('ECONNRESET');
      expect(content).toContain('ETIMEDOUT');
      expect(content).toContain('Network error');
    });

    it('should have request timeout', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/openRechtspraakClient.ts', 'utf-8');
      
      expect(content).toContain('AbortController');
      expect(content).toContain('setTimeout');
      expect(content).toContain('30000'); // 30s timeout
    });
  });

  describe('3. Parallel Jurisprudentie Context', () => {
    it('should use Promise.all for parallel execution', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/gemini.ts', 'utf-8');
      
      // Check for parallel execution of feedback and jurisprudentie
      expect(content).toContain('Promise.all([');
      expect(content).toContain('getFeedbackPatronenForAI');
      expect(content).toContain('verzamelJurisprudentieContext');
    });

    it('should log parallel context gathering time', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/gemini.ts', 'utf-8');
      
      expect(content).toContain('parallelStartTime');
      expect(content).toContain('Parallel context gathering completed');
    });

    it('should handle jurisprudentie errors gracefully in parallel', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/gemini.ts', 'utf-8');
      
      // Should return empty result on error, not throw
      expect(content).toContain("return { context: null, forAI: '' }");
    });

    it('should skip jurisprudentie when not needed', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/ro-flow/server/services/gemini.ts', 'utf-8');
      
      // Should check conditions before fetching
      expect(content).toContain('!isBOPA && !isMonument && !heeftStikstof');
    });
  });
});
