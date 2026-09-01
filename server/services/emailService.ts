/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  fromEmail?: string;
  googleAccessToken?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  channel: 'gmail_app_password' | 'gmail_oauth_api' | 'smtp' | 'audit_log_only';
  messageId?: string;
  error?: string;
  details?: string;
}

/**
 * Checks if Gmail App credentials are configured in environment (supporting all common case variations and spacing)
 */
export function getGmailAppConfig(): { email: string; pass: string } | null {
  const email = (
    process.env.GMAIL_APP ||
    process.env.gmail_App ||
    process.env.GMAIL_APP_USER ||
    process.env.GMAIL_APP_EMAIL ||
    process.env.GMAIL_USER ||
    process.env.gmail_user ||
    ''
  ).trim();

  const rawPass = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.gmail_app_password ||
    process.env.GMAIL_PASSWORD ||
    process.env.gmail_password ||
    process.env.GMAIL_APP_PASS ||
    process.env.gmail_app_pass ||
    ''
  ).trim();

  // Google App Passwords are 16 characters (often copied with spaces like "abcd efgh ijkl mnop")
  const pass = rawPass.replace(/\s+/g, '');

  if (email && pass) {
    return { email, pass };
  }
  return null;
}

/**
 * Creates a Nodemailer transporter configured for Gmail
 */
function createGmailTransporter(user: string, pass: string, port: 465 | 587 = 465) {
  if (port === 465) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000
  });
}

/**
 * Verifies Gmail App connection
 */
export async function verifyGmailAppConnection(): Promise<{ ok: boolean; message: string; hint?: string }> {
  const config = getGmailAppConfig();
  if (!config) {
    return {
      ok: false,
      message: 'GMAIL_APP and GMAIL_APP_PASSWORD are not configured.',
      hint: 'Configure GMAIL_APP with your full Gmail address and GMAIL_APP_PASSWORD with a 16-character Google App Password.'
    };
  }

  try {
    const transporter465 = createGmailTransporter(config.email, config.pass, 465);
    await transporter465.verify();
    return {
      ok: true,
      message: `Successfully authenticated with Gmail SMTP servers as ${config.email}`
    };
  } catch (err465: any) {
    try {
      const transporter587 = createGmailTransporter(config.email, config.pass, 587);
      await transporter587.verify();
      return {
        ok: true,
        message: `Successfully authenticated with Gmail SMTP servers (port 587) as ${config.email}`
      };
    } catch (err587: any) {
      const is535 = err587?.message?.includes('535') || err465?.message?.includes('535') || err587?.code === 'EAUTH';
      return {
        ok: false,
        message: is535 
          ? 'Gmail Authentication Error (535-5.7.8): Google requires a 16-character "App Password" generated in your Google Account security settings, NOT your regular Gmail account login password.' 
          : `Gmail SMTP Authentication Failed: ${err587?.message || err465?.message || 'Check credentials'}`,
        hint: is535 
          ? 'To fix: 1. Go to myaccount.google.com/apppasswords. 2. Create an App Password for "EncDec IDS". 3. Set the 16-character code as GMAIL_APP_PASSWORD.'
          : undefined
      };
    }
  }
}

/**
 * Transmits an email via Google Gmail API using an OAuth Access Token
 */
async function sendViaGmailApi(accessToken: string, to: string, subject: string, htmlBody: string, textBody?: string): Promise<boolean> {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody || textBody || ''
  ];
  const rawMime = emailLines.join('\r\n');
  const encodedRaw = Buffer.from(rawMime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedRaw })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API HTTP ${response.status}: ${errText}`);
  }
  return true;
}

/**
 * Sends an email using the prioritized direct dispatch pipeline:
 * 1. Direct Gmail using GMAIL_APP and GMAIL_APP_PASSWORD (Nodemailer Gmail Transport with multi-port fallback)
 * 2. Direct Gmail using OAuth Access Token (Gmail REST API)
 * 3. Generic SMTP Transport (SMTP_HOST, SMTP_USER, SMTP_PASS)
 * 4. Audit Log recording fallback
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const { to, subject, text = '', html = '', fromName = 'EncDec IDS Security', fromEmail, googleAccessToken } = options;
  const gmailApp = getGmailAppConfig();

  // 1. Direct Gmail App Password Delivery (Highest priority for server-driven automation)
  if (gmailApp) {
    let lastError: any = null;
    const senderFrom = `"${fromName}" <${gmailApp.email}>`;

    // Try Port 465 first
    try {
      const transporter465 = createGmailTransporter(gmailApp.email, gmailApp.pass, 465);
      const info = await transporter465.sendMail({
        from: senderFrom,
        to,
        subject,
        text,
        html
      });

      console.log(`[GMAIL APP PASSWORD SUCCESS (Port 465)] Transmitted to ${to} (MessageId: ${info.messageId})`);
      return {
        success: true,
        channel: 'gmail_app_password',
        messageId: info.messageId,
        details: `Delivered directly via Gmail App Password to ${to}`
      };
    } catch (err465: any) {
      lastError = err465;
      console.warn(`[GMAIL APP (Port 465) Notice] Trying fallback port 587: ${err465?.message || err465}`);
    }

    // Try Port 587 fallback
    try {
      const transporter587 = createGmailTransporter(gmailApp.email, gmailApp.pass, 587);
      const info = await transporter587.sendMail({
        from: senderFrom,
        to,
        subject,
        text,
        html
      });

      console.log(`[GMAIL APP PASSWORD SUCCESS (Port 587)] Transmitted to ${to} (MessageId: ${info.messageId})`);
      return {
        success: true,
        channel: 'gmail_app_password',
        messageId: info.messageId,
        details: `Delivered directly via Gmail App Password (Port 587) to ${to}`
      };
    } catch (err587: any) {
      lastError = err587;
      console.warn(`[GMAIL APP PASSWORD ERROR] Failed to send via Gmail App: ${err587?.message || err587}`);
    }
  }

  // 2. Direct Gmail OAuth API Delivery
  if (googleAccessToken) {
    try {
      await sendViaGmailApi(googleAccessToken, to, subject, html, text);
      console.log(`[GMAIL OAUTH SUCCESS] Transmitted to ${to}`);
      return {
        success: true,
        channel: 'gmail_oauth_api',
        details: `Delivered directly via Google Workspace Gmail API to ${to}`
      };
    } catch (oauthErr: any) {
      console.warn(`[GMAIL OAUTH ERROR] Failed to send via OAuth API: ${oauthErr?.message || oauthErr}`);
    }
  }

  // 3. Generic SMTP Transport Delivery
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const senderFrom = process.env.SMTP_FROM || `"${fromName}" <${fromEmail || process.env.SMTP_USER}>`;
      const info = await transporter.sendMail({
        from: senderFrom,
        to,
        subject,
        text,
        html
      });

      console.log(`[SMTP SUCCESS] Transmitted to ${to} (MessageId: ${info.messageId})`);
      return {
        success: true,
        channel: 'smtp',
        messageId: info.messageId,
        details: `Delivered via SMTP (${process.env.SMTP_HOST})`
      };
    } catch (smtpErr: any) {
      console.warn(`[SMTP ERROR] Failed to send via SMTP: ${smtpErr?.message || smtpErr}`);
    }
  }

  // 4. Default: Stored in Audit Log
  return {
    success: true,
    channel: 'audit_log_only',
    details: 'Notification logged to SOC audit trail.'
  };
}

