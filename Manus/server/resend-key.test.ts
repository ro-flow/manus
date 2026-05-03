import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('Resend API Key Validation', () => {
  it('should have RESEND_API_KEY configured', () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
    expect(key!.startsWith('re_')).toBe(true);
  });

  it('should be able to authenticate with Resend API', async () => {
    const key = process.env.RESEND_API_KEY;
    
    try {
      const response = await axios.get('https://api.resend.com/domains', {
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      });
      
      // If we get a 200, the key is valid
      expect(response.status).toBe(200);
    } catch (error: any) {
      // 401 means invalid key, anything else (like 403) means key is valid but may lack permissions
      if (error.response?.status === 401) {
        throw new Error('RESEND_API_KEY is invalid - received 401 Unauthorized');
      }
      // Other status codes mean the key authenticated successfully
      expect(error.response?.status).not.toBe(401);
    }
  });
});
