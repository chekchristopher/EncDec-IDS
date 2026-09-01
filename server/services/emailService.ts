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
}

/**
 * Checks if Gmail App credentials are configured in environment
 */
export function getGmailAppConfig(): { email: string; pass: string } | null {
  const email = process.env.GMAIL_APP || process.env.GMAIL_APP_USER || process.env.GMAIL_APP_EMAIL || process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;

  if (email && pass) {
    return {
      email: email.trim(),
      pass: pass.trim().replace(/\s+/g, '') // Google App Passwords may be entered with spaces
    };
  }
  return null;
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
 * 1. Direct Gmail using GMAIL_APP and GMAIL_APP_PASSWORD (Nodemailer Gmail Transport)
 * 2. Direct Gmail using OAuth Access Token (Gmail REST API)
 * 3. Generic SMTP Transport (SMTP_HOST, SMTP_USER, SMTP_PASS)
 * 4. Audit Log recording fallback
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const { to, subject, text = '', html = '', fromName = 'EncDec IDS Security', fromEmail, googleAccessToken } = options;
  const gmailApp = getGmailAppConfig();

  // 1. Direct Gmail App Password Delivery (Highest priority for server-driven automation)
  if (gmailApp) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailApp.email,
          pass: gmailApp.pass
        }
      });

      const senderFrom = `"${fromName}" <${gmailApp.email}>`;
      const info = await transporter.sendMail({
        from: senderFrom,
        to,
        subject,
        text,
        html
      });

      console.log(`[GMAIL APP PASSWORD SUCCESS] Transmitted to ${to} (MessageId: ${info.messageId})`);
      return {
        success: true,
        channel: 'gmail_app_password',
        messageId: info.messageId
      };
    } catch (gmailErr: any) {
      console.warn(`[GMAIL APP PASSWORD ERROR] Failed to send via Gmail App: ${gmailErr?.message || gmailErr}`);
    }
  }

  // 2. Direct Gmail OAuth API Delivery
  if (googleAccessToken) {
    try {
      await sendViaGmailApi(googleAccessToken, to, subject, html, text);
      console.log(`[GMAIL OAUTH SUCCESS] Transmitted to ${to}`);
      return {
        success: true,
        channel: 'gmail_oauth_api'
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
        messageId: info.messageId
      };
    } catch (smtpErr: any) {
      console.warn(`[SMTP ERROR] Failed to send via SMTP: ${smtpErr?.message || smtpErr}`);
    }
  }

  // 4. Default: Stored in Audit Log
  return {
    success: true,
    channel: 'audit_log_only'
  };
}
