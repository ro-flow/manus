/**
 * Email Service - Resend integratie
 * 
 * Verstuurt behandelrapporten als PDF attachment naar behandelaars.
 */

import axios from 'axios';
import { ENV } from '../_core/env';

interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Verstuur een email via Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn('[Email] RESEND_API_KEY not configured, email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: 'Ro-flow <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
        })),
      },
      {
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Email] Sent to ${options.to}, messageId: ${response.data.id}`);
    return { success: true, messageId: response.data.id };
    
  } catch (error: any) {
    console.error('[Email] Failed to send:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

/**
 * Verstuur behandelrapport naar behandelaar
 */
export async function sendBehandelrapport(
  behandelaarEmail: string,
  behandelaarNaam: string,
  zaaknummer: string,
  gemeenteNaam: string,
  pdfBuffer: Buffer,
  pdfFilename: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #007AFF 0%, #0055FF 100%);
      color: white;
      padding: 24px;
      border-radius: 12px 12px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 24px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 12px 12px;
    }
    .highlight-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">Ro-flow</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">AI Behandelassistent</p>
  </div>
  
  <div class="content">
    <p>Beste ${behandelaarNaam},</p>
    
    <p>Hierbij ontvangt u het behandelrapport voor de volgende aanvraag:</p>
    
    <div class="highlight-box">
      <strong>Zaaknummer:</strong> ${zaaknummer}<br>
      <strong>Gemeente:</strong> ${gemeenteNaam}<br>
      <strong>Datum:</strong> ${new Date().toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </div>
    
    <p>Het volledige behandelrapport is als PDF bijgevoegd bij deze email. 
    Het rapport bevat:</p>
    
    <ul>
      <li>Procedure bepaling (vergunningvrij/regulier/BOPA)</li>
      <li>Relevante toetsingskaders per laag</li>
      <li>Te raadplegen adviseurs met termijnen</li>
      <li>Aandachtspunten voor de behandeling</li>
    </ul>
    
    <p>Heeft u vragen over dit rapport? Neem dan contact op met uw beheerder.</p>
    
    <p>Met vriendelijke groet,<br>
    <strong>Ro-flow AI Behandelassistent</strong></p>
  </div>
  
  <div class="footer">
    <p>Dit is een automatisch gegenereerd bericht van Ro-flow.</p>
    <p>© ${new Date().getFullYear()} Ro-flow - Alle rechten voorbehouden</p>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: behandelaarEmail,
    subject: `Behandelrapport ${zaaknummer} - ${gemeenteNaam}`,
    html,
    attachments: [{
      filename: pdfFilename,
      content: pdfBuffer.toString('base64'),
      contentType: 'application/pdf',
    }],
  });
}

/**
 * Verstuur uitnodiging voor nieuwe seat
 */
export async function sendSeatInvitation(
  email: string,
  naam: string,
  gemeenteNaam: string,
  invitedBy: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #007AFF 0%, #0055FF 100%);
      color: white;
      padding: 24px;
      border-radius: 12px 12px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 24px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 12px 12px;
    }
    .cta-button {
      display: inline-block;
      background: #007AFF;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">Ro-flow</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">AI Behandelassistent</p>
  </div>
  
  <div class="content">
    <p>Beste ${naam || 'collega'},</p>
    
    <p>U bent uitgenodigd door ${invitedBy} om Ro-flow te gebruiken voor ${gemeenteNaam}.</p>
    
    <p>Met Ro-flow kunt u DSO-aanvragen in seconden analyseren en automatisch 
    behandelrapporten genereren met juridische toetsing en adviseurslijsten.</p>
    
    <p style="text-align: center;">
      <a href="#" class="cta-button">Activeer uw account</a>
    </p>
    
    <p>Heeft u vragen? Neem contact op met uw beheerder.</p>
    
    <p>Met vriendelijke groet,<br>
    <strong>Het Ro-flow Team</strong></p>
  </div>
  
  <div class="footer">
    <p>Dit is een automatisch gegenereerd bericht van Ro-flow.</p>
    <p>© ${new Date().getFullYear()} Ro-flow - Alle rechten voorbehouden</p>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: email,
    subject: `Uitnodiging voor Ro-flow - ${gemeenteNaam}`,
    html,
  });
}
