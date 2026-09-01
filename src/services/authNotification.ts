/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGoogleAccessToken, getCachedGoogleUser } from './googleAuth.js';
import { sendGmailMessage } from './gmailApi.js';
import { apiRequest } from '../api.js';

export interface AuthNotificationOptions {
  email: string;
  name?: string;
  role?: string;
  eventType: 'registration' | 'login';
  ipAddress?: string;
}

/**
 * Dispatches an official EncDec IDS security confirmation email directly to the user's Gmail inbox.
 */
export async function sendDirectAuthEmailToGmail(options: AuthNotificationOptions): Promise<{ delivered: boolean; error?: string }> {
  const { email, name, role = 'analyst', eventType, ipAddress = '127.0.0.1' } = options;
  if (!email) return { delivered: false, error: 'No recipient email provided.' };

  const token = await getGoogleAccessToken();
  const userRole = role.toLowerCase();
  let salutation = 'Dear Operator,';
  if (userRole === 'admin') salutation = 'Dear Admin,';
  else if (userRole === 'analyst') salutation = 'Dear Analyst,';

  const timestamp = new Date().toLocaleString();
  let subject = '';
  let bodyHtml = '';

  if (eventType === 'registration') {
    subject = '[EncDec IDS Security] New Operator Account Confirmation';
    bodyHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 8px; border: 1px solid #1e293b; max-width: 600px; margin: 0 auto;">
        <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #06b6d4; margin: 0; font-size: 20px;">EncDec IDS Security Operations</h2>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Unified Intrusion Detection & Threat Intelligence Platform</p>
        </div>
        <p style="font-size: 15px; font-weight: bold; color: #f8fafc;">${salutation}</p>
        <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">Welcome to <strong>EncDec Intrusion Detection & Threat Intelligence Platform</strong>. Your operator profile has been enrolled into the system.</p>
        
        <div style="background: #1e293b; padding: 16px; border-radius: 6px; border-left: 4px solid #06b6d4; margin: 16px 0;">
          <p style="margin: 4px 0; font-size: 13px;"><strong>Enrolled Identifier:</strong> <span style="color: #f1f5f9;">${email}</span></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Operator Name:</strong> <span style="color: #f1f5f9;">${name || email.split('@')[0]}</span></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Clearance Role:</strong> <span style="color: #38bdf8; font-weight: bold;">${role.toUpperCase()}</span></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Enrollment Time:</strong> <span style="color: #f1f5f9;">${timestamp}</span></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Origin Node IP:</strong> <span style="color: #f1f5f9;">${ipAddress}</span></p>
        </div>

        <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 6px; padding: 12px; margin: 16px 0;">
          <p style="color: #38bdf8; font-size: 13px; margin: 0; font-weight: bold;">🔒 Mandatory Security Step:</p>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Please configure Multi-Factor Authentication (MFA) in your Operator Profile settings immediately to maintain high-tier security clearance.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="color: #64748b; font-size: 11px; margin: 0;">Chukwuemeka Odumegwu Ojukwu University (COOU) • EncDec Cybersecurity Platform</p>
      </div>
    `;
  } else {
    subject = '[EncDec IDS Alert] Successful Gateway Console Login';
    bodyHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 8px; border: 1px solid #1e293b; max-width: 600px; margin: 0 auto;">
        <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #10b981; margin: 0; font-size: 20px;">EncDec SOC Gateway Access Alert</h2>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Automated Security Authentication Telemetry</p>
        </div>
        <p style="font-size: 15px; font-weight: bold; color: #f8fafc;">${salutation}</p>
        <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">A new authentication session to the EncDec SOC Gateway was established for your operator identity.</p>
        
        <div style="background: #1e293b; padding: 16px; border-radius: 6px; border-left: 4px solid #10b981; margin: 16px 0;">
          <p style="margin: 4px 0; font-size: 13px;"><strong>Operator Identity:</strong> <span style="color: #f1f5f9;">${email}</span></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Clearance Role:</strong> <span style="color: #34d399; font-weight: bold;">${role.toUpperCase()}</span></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Session Timestamp:</strong> <span style="color: #f1f5f9;">${timestamp}</span></p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Origin Node IP:</strong> <span style="color: #f1f5f9;">${ipAddress}</span></p>
        </div>

        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 12px; margin: 16px 0;">
          <p style="color: #f87171; font-size: 13px; margin: 0; font-weight: bold;">⚠️ Security Advisory:</p>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">If you did not initiate this authentication, immediately revoke your API credentials and inform the SOC Administrator.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="color: #64748b; font-size: 11px; margin: 0;">EncDec Unified IDS/IPS Security System • Department of Computer Science</p>
      </div>
    `;
  }

  // 1. If Google OAuth token is in client memory, send via direct Gmail REST API
  if (token) {
    try {
      await sendGmailMessage({
        to: email,
        subject,
        body: bodyHtml,
        isHtml: true
      });
      console.log(`[CLIENT GMAIL DIRECT SUCCESS] Dispatched ${eventType} notification to ${email}`);
      return { delivered: true };
    } catch (err: any) {
      console.warn(`[CLIENT GMAIL DIRECT NOTICE] ${err?.message || err}`);
    }
  }

  // 2. Dispatch via backend pipeline (Gmail App Password or SMTP)
  try {
    const res = await apiRequest('/api/email-logs/send', 'POST', {
      recipient: email,
      role,
      type: eventType,
      subject,
      bodyHtml,
      bodyText: `EncDec IDS ${eventType} notification for ${email}`,
      googleAccessToken: token || undefined
    });
    return { delivered: res?.success ?? true };
  } catch (err: any) {
    return { delivered: false, error: err?.message };
  }
}
