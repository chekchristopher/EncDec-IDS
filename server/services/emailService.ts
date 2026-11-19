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
  preferOAuth?: boolean;
}

export interface EmailDispatchResult {
  success: boolean;
  channel: 'gmail_app_password' | 'gmail_oauth_api' | 'smtp' | 'audit_log_only';
  messageId?: string;
  error?: string;
  details?: string;
  oauthExpired?: boolean;
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

function formatGoogleApiError(status: number, rawBody: string): string {
  try {
    const parsed: any = JSON.parse(rawBody);
    const msg = parsed?.error?.message || `HTTP ${status}`;
    const rpcInfo = Array.isArray(parsed?.error?.details)
      ? parsed.error.details.find((d: any) => d?.reason)?.reason
      : undefined;
    const errReason = rpcInfo || parsed?.error?.errors?.[0]?.reason || parsed?.error?.status;
    return errReason ? `Gmail API HTTP ${status} (${errReason}): ${msg}` : `Gmail API HTTP ${status}: ${msg}`;
  } catch {
    const singleLine = rawBody.replace(/\s+/g, ' ').trim().slice(0, 220);
    return `Gmail API HTTP ${status}: ${singleLine || 'Request rejected'}`;
  }
}

/**
 * Verifies a Google OAuth access token against Gmail API and returns the authenticated Gmail address.
 */
export async function verifyGmailOAuthToken(accessToken: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: res.status === 401 || res.status === 403
          ? 'Google token is invalid or missing Gmail permissions. Re-authorize with Gmail access enabled.'
          : formatGoogleApiError(res.status, body),
      };
    }
    const profile: any = await res.json();
    if (!profile?.emailAddress) {
      return { ok: false, error: 'Gmail profile did not return an email address.' };
    }
    return { ok: true, email: profile.emailAddress };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unable to verify Gmail OAuth session.' };
  }
}

/**
 * Transmits an email via Google Gmail API using an OAuth Access Token
 */
async function sendViaGmailApi(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
  fromName?: string,
  fromEmail?: string
): Promise<{ messageId?: string }> {
  const rawBody = htmlBody || textBody || '';
  const base64Body = Buffer.from(rawBody, 'utf-8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n');

  const safeFromName = (fromName || 'EncDec IDS Security').replace(/["\r\n]/g, '').trim() || 'EncDec IDS Security';
  const emailLines = [
    ...(fromEmail ? [`From: "${safeFromName}" <${fromEmail}>`] : []),
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    htmlBody ? 'Content-Type: text/html; charset=UTF-8' : 'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Body
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
    const err: any = new Error(formatGoogleApiError(response.status, errText));
    err.status = response.status;
    throw err;
  }
  const data: any = await response.json().catch(() => ({}));
  return { messageId: data?.id };
}

/**
 * Sends an email using the prioritized direct dispatch pipeline:
 * 1. Direct Gmail OAuth API Delivery (when preferOAuth is true and googleAccessToken is present)
 * 2. Direct Gmail using GMAIL_APP and GMAIL_APP_PASSWORD (Nodemailer Gmail Transport with multi-port fallback)
 * 3. Direct Gmail using OAuth Access Token (fallback if not preferOAuth)
 * 4. Generic SMTP Transport (SMTP_HOST, SMTP_USER, SMTP_PASS)
 * 5. Audit Log recording fallback
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const {
    to,
    subject,
    text = '',
    html = '',
    fromName = 'EncDec IDS Security',
    fromEmail,
    googleAccessToken,
    preferOAuth = false
  } = options;
  const gmailApp = getGmailAppConfig();
  let lastDispatchError: string | undefined;
  let oauthExpired = false;

  const tryOAuthDispatch = async (): Promise<EmailDispatchResult | null> => {
    if (!googleAccessToken) return null;
    try {
      const sent = await sendViaGmailApi(googleAccessToken, to, subject, html, text, fromName, fromEmail);
      console.log(`[GMAIL OAUTH SUCCESS] Transmitted to ${to} (Id: ${sent.messageId || 'n/a'})`);
      return {
        success: true,
        channel: 'gmail_oauth_api',
        messageId: sent.messageId,
        details: `Delivered directly via Gmail OAuth API (${fromEmail || 'Admin Gmail'}) to ${to}`
      };
    } catch (oauthErr: any) {
      if (oauthErr?.status === 401) {
        oauthExpired = true;
        lastDispatchError = 'Admin Gmail OAuth session expired. Reconnect Admin Gmail in Admin Gateway.';
      } else {
        lastDispatchError = oauthErr?.message || lastDispatchError;
      }
      console.log(`[GMAIL OAUTH INFO] OAuth delivery unavailable (${oauthErr?.message || oauthErr}). Falling back cleanly.`);
      return null;
    }
  };

  if (preferOAuth && googleAccessToken) {
    const oauthResult = await tryOAuthDispatch();
    if (oauthResult) return oauthResult;
  }

  // Direct Gmail App Password Delivery
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
      const isAuth535 = String(err465?.message || '').includes('535') || err465?.code === 'EAUTH';
      if (!isAuth535) {
        console.log(`[GMAIL APP (Port 465) Notice] Trying fallback port 587: ${err465?.message || err465}`);
      }
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
      const isAuth535 = String(err587?.message || '').includes('535') || 
                        err587?.code === 'EAUTH' || 
                        String(lastError?.message || '').includes('535');
      lastDispatchError = isAuth535
        ? 'Gmail App Password credentials were rejected by Google (535-5.7.8). Verify GMAIL_APP and your 16-character Google App Password.'
        : `Gmail SMTP delivery failed: ${err587?.message || 'network unavailable'}`;
      if (isAuth535) {
        console.log(`[GMAIL DISPATCH INFO] Gmail App Password credentials not accepted by Google (535-5.7.8). Smoothly falling back to OAuth/Audit Log delivery.`);
      } else {
        console.log(`[GMAIL DISPATCH INFO] Gmail SMTP transport failed (${err587?.message || 'offline'}). Smoothly falling back to OAuth/Audit Log delivery.`);
      }
    }
  }

  // Fallback Gmail OAuth API Delivery (when preferOAuth wasn't set)
  if (!preferOAuth && googleAccessToken) {
    const oauthResult = await tryOAuthDispatch();
    if (oauthResult) return oauthResult;
  }

  // 3. Generic SMTP Transport Delivery
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const rawSmtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpPass = smtpHost.toLowerCase().includes('gmail.com')
    ? rawSmtpPass.replace(/\s+/g, '')
    : rawSmtpPass;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000
      });

      const senderFrom = process.env.SMTP_FROM || `"${fromName}" <${fromEmail || smtpUser}>`;
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
        details: `Delivered via SMTP (${smtpHost})`
      };
    } catch (smtpErr: any) {
      const errMsg = String(smtpErr?.message || smtpErr || '');
      const isAuth535 = errMsg.includes('535') || smtpErr?.code === 'EAUTH';
      lastDispatchError = isAuth535
        ? 'SMTP credentials rejected (535-5.7.8; Gmail requires a 16-character App Password).'
        : `SMTP delivery failed (${errMsg || 'offline'}).`;
      if (isAuth535) {
        console.log('[SMTP DISPATCH INFO] SMTP credentials not accepted (535-5.7.8; Gmail requires a 16-char App Password). Smoothly falling back to Audit Log delivery.');
      } else {
        console.log(`[SMTP DISPATCH INFO] SMTP transport unavailable (${errMsg || 'offline'}). Smoothly falling back to Audit Log delivery.`);
      }
    }
  }

  // 4. Default: Stored in Audit Log
  return {
    success: true,
    channel: 'audit_log_only',
    error: lastDispatchError,
    oauthExpired,
    details: lastDispatchError || 'Gmail App Password (GMAIL_APP / GMAIL_APP_PASSWORD) and SMTP transport are not configured.'
  };
}

