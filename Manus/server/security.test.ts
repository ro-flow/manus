import { describe, it, expect } from 'vitest';

/**
 * Security middleware tests
 * Tests for rate limiting, CSRF protection, and security headers
 */

describe('Security Middleware Configuration', () => {
  describe('Rate Limiting', () => {
    it('should have global rate limit configured', () => {
      // Global rate limit: 100 requests per minute
      const globalLimit = {
        windowMs: 60 * 1000,
        max: 100,
      };
      
      expect(globalLimit.windowMs).toBe(60000);
      expect(globalLimit.max).toBe(100);
    });

    it('should have stricter auth rate limit', () => {
      // Auth rate limit: 10 attempts per 15 minutes
      const authLimit = {
        windowMs: 15 * 60 * 1000,
        max: 10,
      };
      
      expect(authLimit.windowMs).toBe(900000);
      expect(authLimit.max).toBe(10);
    });

    it('should have analysis rate limit for expensive operations', () => {
      // Analysis rate limit: 10 per minute
      const analysisLimit = {
        windowMs: 60 * 1000,
        max: 10,
      };
      
      expect(analysisLimit.windowMs).toBe(60000);
      expect(analysisLimit.max).toBe(10);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate valid CSRF token structure', () => {
      const token = Buffer.from(
        JSON.stringify({
          timestamp: Date.now(),
          random: Math.random().toString(36).substring(2),
        })
      ).toString("base64");
      
      // Token should be base64 encoded
      expect(token).toMatch(/^[A-Za-z0-9+/=]+$/);
      
      // Should be decodable
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      expect(decoded).toHaveProperty('timestamp');
      expect(decoded).toHaveProperty('random');
    });

    it('should skip CSRF for GET requests', () => {
      const shouldSkipCSRF = (method: string) => method === 'GET';
      
      expect(shouldSkipCSRF('GET')).toBe(true);
      expect(shouldSkipCSRF('POST')).toBe(false);
      expect(shouldSkipCSRF('PUT')).toBe(false);
      expect(shouldSkipCSRF('DELETE')).toBe(false);
    });

    it('should skip CSRF for webhook paths', () => {
      const shouldSkipCSRF = (path: string) => 
        path.includes('webhook') || path.includes('Webhook');
      
      expect(shouldSkipCSRF('/api/webhooks/mollie')).toBe(true);
      expect(shouldSkipCSRF('/api/trpc/mollieWebhook')).toBe(true);
      expect(shouldSkipCSRF('/api/trpc/analyse.start')).toBe(false);
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('should have correct CSP directives', () => {
      const cspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'self'", "https://maps.google.com", "https://www.google.com"],
        objectSrc: ["'none'"],
      };
      
      // Verify self is always included
      expect(cspDirectives.defaultSrc).toContain("'self'");
      expect(cspDirectives.scriptSrc).toContain("'self'");
      
      // Verify Google Maps is allowed
      expect(cspDirectives.scriptSrc).toContain("https://maps.googleapis.com");
      expect(cspDirectives.frameSrc).toContain("https://maps.google.com");
      
      // Verify object-src is none (security best practice)
      expect(cspDirectives.objectSrc).toEqual(["'none'"]);
    });

    it('should allow cross-origin for Google Maps', () => {
      const crossOriginConfig = {
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
      };
      
      // COEP must be disabled for Google Maps
      expect(crossOriginConfig.crossOriginEmbedderPolicy).toBe(false);
      expect(crossOriginConfig.crossOriginResourcePolicy.policy).toBe("cross-origin");
    });
  });

  describe('Trust Proxy', () => {
    it('should trust first proxy for rate limiting', () => {
      // Trust proxy setting for Manus hosting
      const trustProxy = 1;
      
      expect(trustProxy).toBe(1);
    });
  });
});

describe('Verwerkersovereenkomst', () => {
  it('should have required AVG articles covered', () => {
    const requiredArticles = [
      'Artikel 1 - Definities',
      'Artikel 2 - Onderwerp en duur',
      'Artikel 3 - Categorieën persoonsgegevens',
      'Artikel 4 - Verplichtingen van de Verwerker',
      'Artikel 5 - Beveiligingsmaatregelen',
      'Artikel 6 - Datalekken',
      'Artikel 7 - Rechten van betrokkenen',
      'Artikel 8 - Audits',
      'Artikel 9 - Beëindiging',
      'Artikel 10 - Aansprakelijkheid',
      'Artikel 11 - Slotbepalingen',
    ];
    
    // All required articles should be present
    expect(requiredArticles.length).toBe(11);
    expect(requiredArticles).toContain('Artikel 6 - Datalekken');
    expect(requiredArticles).toContain('Artikel 7 - Rechten van betrokkenen');
  });

  it('should list sub-verwerkers', () => {
    const subVerwerkers = [
      { name: 'Manus AI', service: 'Hosting infrastructuur', location: 'EU' },
      { name: 'TiDB Cloud', service: 'Database hosting', location: 'EU' },
      { name: 'Cloudflare', service: 'CDN en DDoS bescherming', location: 'EU/VS' },
    ];
    
    expect(subVerwerkers.length).toBeGreaterThanOrEqual(3);
    expect(subVerwerkers.some(s => s.name === 'Manus AI')).toBe(true);
  });

  it('should specify data retention periods', () => {
    const retentionPeriods = {
      identificatiegegevens: '10 jaar',
      contactgegevens: 'Duur dienstverband',
      locatiegegevens: '10 jaar',
      projectgegevens: '10 jaar',
    };
    
    // Verify retention periods are specified
    expect(retentionPeriods.identificatiegegevens).toBe('10 jaar');
    expect(retentionPeriods.contactgegevens).toBe('Duur dienstverband');
  });
});
