import { describe, it, expect } from 'vitest';
import { sendEmail } from './services/email';

describe('Email Integration Test', () => {
  it('should successfully send a test email via Resend', async () => {
    const result = await sendEmail({
      to: 'delivered@resend.dev', // Resend test address that always succeeds
      subject: 'Ro-flow Email Test - Pilot Welkomstmail',
      html: `
        <h1>Test Email</h1>
        <p>Dit is een test van de Ro-flow email service.</p>
        <p>Als je dit ontvangt, werkt de Resend integratie correct.</p>
      `,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.error).toBeUndefined();
  });
});
