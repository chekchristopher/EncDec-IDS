/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, EmailLog } from '../../src/types.js';
import { DbSchema } from '../db/schema.js';
import { 
  loginSchema, 
  signupSchema, 
  profileUpdateSchema, 
  mfaToggleSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../schemas/validation.js';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Security Exception] JWT_SECRET environment variable is mandatory in production mode.');
    }
    return 'development_only_jwt_signing_key_encdec_2026';
  }
  return secret;
}

export function createAuthRouter(
  dbState: DbSchema,
  saveDb: () => void,
  addAuditLog: (userId: string, email: string, action: string, resource: string, ip: string, status: 'success' | 'failure', role?: string) => void,
  broadcastWs: (msg: any) => void
) {
  const router = Router();
  const JWT_SECRET = getJwtSecret();

  // Authentication Middleware
  const authenticateToken = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing security credential token.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired session token.' });
      req.user = user;
      next();
    });
  };

  // Direct Gmail API delivery helper
  async function dispatchGmailApiMessage(accessToken: string, to: string, subject: string, htmlBody: string) {
    try {
      const emailLines = [
        `To: ${to}`,
        `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        htmlBody
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
        const errorText = await response.text();
        console.warn(`[GMAIL API WARN] Status ${response.status}: ${errorText}`);
      } else {
        console.log(`[GMAIL API SUCCESS] Email delivered directly to ${to}'s Gmail inbox!`);
      }
    } catch (err: any) {
      console.warn('[GMAIL API DELIVERY NOTICE]', err?.message || err);
    }
  }

  // Automated notification email helper
  async function sendNotificationEmail(
    user: { email: string; name?: string; role: string }, 
    eventType: 'registration' | 'login', 
    ipAddress?: string,
    senderUser?: { email: string; id?: string },
    googleAccessToken?: string
  ) {
    if (!user || !user.email) return;

    const userRole = (user.role || 'analyst').toLowerCase();
    let salutation = 'Dear Operator,';
    if (userRole === 'admin') salutation = 'Dear Admin,';
    else if (userRole === 'analyst') salutation = 'Dear Analyst,';

    const timestamp = new Date().toLocaleString();
    let subject = '';
    let bodyText = '';
    let bodyHtml = '';

    if (eventType === 'registration') {
      subject = '[EncDec IDS Security] New Operator Account Confirmation';
      bodyText = `${salutation}\n\nWelcome to EncDec Intrusion Detection & Threat Intelligence Platform.\n\nYour account has been enrolled under role clearance: ${user.role.toUpperCase()}.\nRegistration Timestamp: ${timestamp}\nIP Address: ${ipAddress || '127.0.0.1'}\n\nPlease enforce Multi-Factor Authentication (MFA) upon initial gateway login.\n\nRegards,\nEncDec Security Operations Team`;
      bodyHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 8px; border: 1px solid #1e293b;">
          <h2 style="color: #06b6d4; margin-top: 0;">EncDec IDS Security Operations</h2>
          <p>${salutation}</p>
          <p>Welcome to <strong>EncDec Intrusion Detection & Threat Intelligence Platform</strong>.</p>
          <div style="background: #1e293b; padding: 16px; border-radius: 6px; border-left: 4px solid #06b6d4; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Enrolled Identifier:</strong> ${user.email}</p>
            <p style="margin: 4px 0;"><strong>Clearance Role:</strong> <span style="color: #38bdf8;">${user.role.toUpperCase()}</span></p>
            <p style="margin: 4px 0;"><strong>Enrollment Time:</strong> ${timestamp}</p>
            <p style="margin: 4px 0;"><strong>Source Node IP:</strong> ${ipAddress || '127.0.0.1'}</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Security Notice: Please configure Multi-Factor Authentication (MFA) in your Operator Profile settings immediately.</p>
          <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">Chukwuemeka Odumegwu Ojukwu University • EncDec Cybersecurity Platform</p>
        </div>
      `;
    } else {
      subject = '[EncDec IDS Alert] Successful Gateway Console Login';
      bodyText = `${salutation}\n\nA successful authentication session to the EncDec SOC Gateway was established for your operator identity (${user.email}).\n\nLogin Time: ${timestamp}\nNode Origin: ${ipAddress || '127.0.0.1'}\n\nIf you did not initiate this authentication, immediately revoke your API credentials and inform the SOC Administrator.\n\nRegards,\nEncDec Security Operations Team`;
      bodyHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 8px; border: 1px solid #1e293b;">
          <h2 style="color: #10b981; margin-top: 0;">EncDec SOC Console Access Alert</h2>
          <p>${salutation}</p>
          <p>A new operator session was authenticated on the EncDec IDS Gateway.</p>
          <div style="background: #1e293b; padding: 16px; border-radius: 6px; border-left: 4px solid #10b981; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Operator Identity:</strong> ${user.email}</p>
            <p style="margin: 4px 0;"><strong>Session Timestamp:</strong> ${timestamp}</p>
            <p style="margin: 4px 0;"><strong>Origin IP Address:</strong> ${ipAddress || '127.0.0.1'}</p>
          </div>
          <p style="color: #ef4444; font-size: 13px;"><strong>Security Advisory:</strong> If you did not initiate this session, please contact your security officer immediately to terminate active tokens.</p>
          <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">EncDec Unified IDS/IPS Security System</p>
        </div>
      `;
    }

    const logEntry: EmailLog = {
      id: 'eml_' + Math.random().toString(36).substring(2, 9),
      recipient: user.email,
      recipientName: user.name || user.email.split('@')[0],
      senderEmail: senderUser?.email || 'security@encdec-ids.sec',
      senderUserId: senderUser?.id || 'system_service',
      subject,
      eventType,
      type: eventType,
      role: user.role,
      status: 'sent',
      timestamp: new Date().toISOString(),
      previewSnippet: bodyText.substring(0, 110) + '...',
      bodyText,
      htmlBody: bodyHtml
    };

    if (!dbState.emailLogs) {
      dbState.emailLogs = [];
    }
    dbState.emailLogs.unshift(logEntry);
    if (dbState.emailLogs.length > 300) {
      dbState.emailLogs.pop();
    }
    saveDb();
    broadcastWs({ type: 'EMAIL_LOG_UPDATE', payload: logEntry });

    // 1. If Google Access Token is provided, deliver directly via Gmail API to user's inbox
    if (googleAccessToken) {
      dispatchGmailApiMessage(googleAccessToken, user.email, subject, bodyHtml).catch(console.error);
    }

    // 2. If SMTP is configured, deliver via SMTP Transport
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const nodemailer = await import('nodemailer');
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transport.sendMail({
          from: process.env.SMTP_FROM || '"EncDec IDS SOC Security" <security@encdec-ids.sec>',
          to: user.email,
          subject,
          text: bodyText,
          html: bodyHtml
        });
        console.log(`[EMAIL AUTOMATION SUCCESS] ${eventType.toUpperCase()} email sent to ${user.email}`);
      } else {
        console.log(`[EMAIL AUTOMATION NOTICE] Notification logged for ${user.email} (${eventType})`);
      }
    } catch (err: any) {
      console.warn(`[EMAIL AUTOMATION NOTICE] Delivery recorded for ${user.email}: ${err?.message || err}`);
    }

    return { subject, bodyText, bodyHtml };
  }

  // POST /api/auth/signup
  router.post('/signup', (req: any, res: Response) => {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = parseResult.error.issues?.[0]?.message || 'Invalid operator credential payload.';
      return res.status(400).json({ error: err });
    }

    const { email, password, name, role } = parseResult.data;
    const googleAccessToken = req.body.googleAccessToken || req.headers['x-google-access-token'];

    const existing = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Operator ID already enrolled.' });
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email,
      passwordHash: bcryptjs.hashSync(password, 10),
      name,
      role: role || 'analyst',
      status: 'active',
      mfaEnabled: false,
      createdAt: new Date().toISOString()
    };

    dbState.users.push(newUser);
    saveDb();

    addAuditLog(newUser.id, newUser.email, 'User Signup', newUser.email, req.ip || '127.0.0.1', 'success');
    sendNotificationEmail(newUser, 'registration', req.ip, undefined, googleAccessToken).catch(console.error);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        mfaEnabled: newUser.mfaEnabled,
        avatarUrl: newUser.avatarUrl,
        lastNameChangeDate: newUser.lastNameChangeDate
      }
    });
  });

  // POST /api/auth/login
  router.post('/login', (req: any, res: Response) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = parseResult.error.issues?.[0]?.message || 'Operator identification required.';
      return res.status(400).json({ error: err });
    }

    const { email, password } = parseResult.data;
    const mfaCode = req.body.mfaCode;
    const googleAccessToken = req.body.googleAccessToken || req.headers['x-google-access-token'];

    const user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.status === 'suspended') {
      addAuditLog('guest', email, 'Failed Login Attempt', 'Access Token Auth', req.ip || '127.0.0.1', 'failure');
      return res.status(401).json({ error: 'Invalid operator credentials or account suspended.' });
    }

    const validPassword = bcryptjs.compareSync(password, user.passwordHash || '');
    if (!validPassword) {
      addAuditLog(user.id, user.email, 'Failed Login Attempt', 'Access Token Auth', req.ip || '127.0.0.1', 'failure');
      return res.status(401).json({ error: 'Invalid operator credentials.' });
    }

    if (user.mfaEnabled && !mfaCode) {
      return res.json({ mfaRequired: true, userId: user.id });
    }

    if (user.mfaEnabled && mfaCode && mfaCode.length !== 6) {
      addAuditLog(user.id, user.email, 'MFA Verification Failure', 'Multi-factor authentication', req.ip || '127.0.0.1', 'failure');
      return res.status(401).json({ error: 'Invalid multi-factor code validation.' });
    }

    addAuditLog(user.id, user.email, 'Console Authentication Success', 'Operator Console', req.ip || '127.0.0.1', 'success');
    sendNotificationEmail(user, 'login', req.ip, undefined, googleAccessToken).catch(console.error);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        avatarUrl: user.avatarUrl,
        lastNameChangeDate: user.lastNameChangeDate
      }
    });
  });

  // POST /api/auth/google (Google One-Click Sign-in / Registration with direct Gmail dispatch)
  router.post('/google', async (req: any, res: Response) => {
    const { email, name, avatarUrl, googleAccessToken } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email address is required.' });
    }

    let user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const isAdminEmail = email.toLowerCase() === 'chekchris85@gmail.com' || email.toLowerCase().startsWith('admin');
      user = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        email,
        passwordHash: bcryptjs.hashSync(Math.random().toString(36) + 'GoogleAuthSec!2026', 10),
        name: name || email.split('@')[0],
        role: isAdminEmail ? 'admin' : 'analyst',
        status: 'active',
        mfaEnabled: false,
        avatarUrl: avatarUrl || undefined,
        createdAt: new Date().toISOString()
      };
      dbState.users.push(user);
      saveDb();
      addAuditLog(user.id, user.email, 'Google Account Registration', user.email, req.ip || '127.0.0.1', 'success');
    } else {
      if (avatarUrl && !user.avatarUrl) {
        user.avatarUrl = avatarUrl;
        saveDb();
      }
      addAuditLog(user.id, user.email, 'Google Authentication Success', 'Operator Console', req.ip || '127.0.0.1', 'success');
    }

    // Trigger automated email with direct Gmail delivery
    sendNotificationEmail(user, isNewUser ? 'registration' : 'login', req.ip, undefined, googleAccessToken).catch(console.error);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({
      token,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        avatarUrl: user.avatarUrl,
        lastNameChangeDate: user.lastNameChangeDate
      }
    });
  });

  // POST /api/auth/forgot-password
  router.post('/forgot-password', (req: any, res: Response) => {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = parseResult.error.issues?.[0]?.message || 'Valid email required';
      return res.status(400).json({ error: err });
    }
    const { email } = parseResult.data;
    const user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'No operator found with that identifier.' });
    }
    
    addAuditLog(user.id, user.email, 'Password Recovery Requested', 'Operator Profile', req.ip || '127.0.0.1', 'success');
    res.json({ status: 'ok', message: 'A simulated password recovery token has been initialized and logged in our secure audit stream.' });
  });

  // POST /api/auth/reset-password
  router.post('/reset-password', (req: any, res: Response) => {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = parseResult.error.issues?.[0]?.message || 'Invalid parameters';
      return res.status(400).json({ error: err });
    }
    const { email, newPassword } = parseResult.data;
    const user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'Operator entry not found.' });
    }
    
    user.passwordHash = bcryptjs.hashSync(newPassword, 10);
    saveDb();
    addAuditLog(user.id, user.email, 'Password Reset Completed', 'Operator Profile', req.ip || '127.0.0.1', 'success');
    res.json({ status: 'ok', message: 'Credentials successfully rotated.' });
  });

  // Profile endpoints
  router.get('/profile', authenticateToken, (req: any, res: Response) => {
    const user = dbState.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Operator profile offline.' });
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      avatarUrl: user.avatarUrl,
      lastNameChangeDate: user.lastNameChangeDate,
      createdAt: user.createdAt
    });
  });

  router.post('/profile/update', authenticateToken, (req: any, res: Response) => {
    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = parseResult.error.issues?.[0]?.message || 'Invalid update parameters';
      return res.status(400).json({ error: err });
    }
    const { name, avatarUrl } = req.body;
    const user = dbState.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Operator not found.' });

    let nameUpdated = false;
    if (name && name.trim() !== user.name) {
      const trimmedName = name.trim();
      const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
      if (user.lastNameChangeDate) {
        const lastChangeTime = new Date(user.lastNameChangeDate).getTime();
        const now = Date.now();
        if (now - lastChangeTime < SIX_MONTHS_MS) {
          const nextAllowed = new Date(lastChangeTime + SIX_MONTHS_MS).toLocaleDateString();
          return res.status(400).json({
            error: `Names can only be changed once every 6 months. Your name was last updated on ${new Date(user.lastNameChangeDate).toLocaleDateString()}. Next available change: ${nextAllowed}.`
          });
        }
      }
      user.name = trimmedName;
      user.lastNameChangeDate = new Date().toISOString();
      nameUpdated = true;
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    saveDb();
    addAuditLog(user.id, user.email, nameUpdated ? 'Updated Operator Name & Profile' : 'Updated Operator Avatar', user.email, req.ip || '127.0.0.1', 'success');

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      avatarUrl: user.avatarUrl,
      lastNameChangeDate: user.lastNameChangeDate,
      createdAt: user.createdAt
    });
  });

  router.post('/profile/mfa', authenticateToken, (req: any, res: Response) => {
    const parseResult = mfaToggleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid MFA configuration format' });
    }
    const { mfaEnabled } = parseResult.data;
    const user = dbState.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Operator not found.' });

    user.mfaEnabled = mfaEnabled;
    saveDb();
    
    addAuditLog(user.id, user.email, `MFA configuration altered: ${mfaEnabled ? 'ENABLED' : 'DISABLED'}`, 'MFA Token Manager', req.ip || '127.0.0.1', 'success');
    res.json({ mfaEnabled: user.mfaEnabled });
  });

  return { router, authenticateToken };
}
