import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import bcryptjs from 'bcryptjs';

const capturedEmails: Array<{ to: string; subject: string; text?: string; html?: string; googleAccessToken?: string; preferOAuth?: boolean; fromEmail?: string }> = [];
let mockChannel: 'gmail_app_password' | 'gmail_oauth_api' | 'audit_log_only' = 'gmail_app_password';
let mockGmailConfigured = true;
let mockOAuthExpired = false;

vi.mock('../../services/emailService.js', () => ({
  getGmailAppConfig: () => (mockGmailConfigured ? { email: 'sender@gmail.com', pass: 'abcdefghijklmnop' } : null),
  sendEmail: vi.fn(async (opts: any) => {
    capturedEmails.push({
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      googleAccessToken: opts.googleAccessToken,
      preferOAuth: opts.preferOAuth,
      fromEmail: opts.fromEmail,
    });
    if (mockChannel === 'gmail_oauth_api' && opts.googleAccessToken) {
      return {
        success: true,
        channel: 'gmail_oauth_api',
        messageId: 'oauth-msg-id-123',
        details: `Delivered directly via Gmail OAuth API (${opts.fromEmail}) to ${opts.to}`,
      };
    }
    if (mockChannel === 'audit_log_only') {
      return {
        success: true,
        channel: 'audit_log_only',
        oauthExpired: mockOAuthExpired,
        error: 'Gmail App Password (GMAIL_APP / GMAIL_APP_PASSWORD) is not configured.',
        details: 'Gmail App Password (GMAIL_APP / GMAIL_APP_PASSWORD) is not configured.',
      };
    }
    return {
      success: true,
      channel: 'gmail_app_password',
      messageId: '<test-msg-id@smtp.gmail.com>',
      details: `Delivered directly via Gmail App Password to ${opts.to}`,
    };
  }),
  verifyGmailAppConnection: vi.fn(async () => ({ ok: true, message: 'OK' })),
  verifyGmailOAuthToken: vi.fn(async (token: string) =>
    token && token !== 'invalid'
      ? { ok: true, email: 'chekchris85@gmail.com' }
      : { ok: false, error: 'Invalid OAuth token' }
  ),
}));

import { createAuthRouter } from '../auth.js';
import { getInitialDatabaseState } from '../../db/seed.js';
import {
  setAdminGmailSenderSession,
  getActiveAdminGmailSender,
  getAdminGmailSenderStatus,
  clearAdminGmailSenderSession,
} from '../../services/adminGmailSender.js';

async function startTestServer() {
  const dbState = getInitialDatabaseState();
  dbState.users.push({
    id: 'usr_otp_test',
    email: 'otpuser@gmail.com',
    passwordHash: bcryptjs.hashSync('OldSecret123!', 10),
    name: 'OTP Test Operator',
    role: 'analyst',
    status: 'active',
    mfaEnabled: false,
    safeBoxEnabled: false,
    subscriptionStatus: 'inactive',
    createdAt: new Date().toISOString(),
  });

  const saveDb = vi.fn();
  const addAuditLog = vi.fn();
  const broadcastWs = vi.fn();

  const app = express();
  app.use(express.json());
  const { router: authRouter } = createAuthRouter(dbState, saveDb, addAuditLog, broadcastWs);
  app.use('/api/auth', authRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  return { server, baseUrl, dbState, saveDb, addAuditLog };
}

async function postJson(url: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

describe('Forgot Password Gmail OTP End-to-End Flow', () => {
  let activeServer: http.Server | null = null;

  beforeEach(() => {
    capturedEmails.length = 0;
    mockChannel = 'gmail_app_password';
    mockGmailConfigured = true;
    mockOAuthExpired = false;
    clearAdminGmailSenderSession();
  });

  afterEach(async () => {
    clearAdminGmailSenderSession();
    if (activeServer) {
      await new Promise<void>((resolve) => activeServer!.close(() => resolve()));
      activeServer = null;
    }
  });

  it('rejects OTP dispatch with 503 when Gmail SMTP delivery is unavailable', async () => {
    mockChannel = 'audit_log_only';
    mockGmailConfigured = false;
    const { server, baseUrl, dbState } = await startTestServer();
    activeServer = server;

    const res = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: 'otpuser@gmail.com' });
    expect(res.status).toBe(503);
    expect(res.data.code).toBe('GMAIL_DELIVERY_UNAVAILABLE');
    const user = dbState.users.find((u) => u.email === 'otpuser@gmail.com')!;
    expect(user.passwordResetOtp).toBeUndefined();
  });

  it('enforces full 3-step OTP -> verify -> confirmPassword x2 -> login flow and redacts OTP in audit logs', async () => {
    const { server, baseUrl, dbState } = await startTestServer();
    activeServer = server;

    // Unknown email rejected
    const missingRes = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: 'nobody@gmail.com' });
    expect(missingRes.status).toBe(404);

    // Step 1: Request OTP to Gmail
    const reqOtp = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: 'otpuser@gmail.com' });
    expect(reqOtp.status).toBe(200);
    expect(reqOtp.data.deliveredToGmail).toBe(true);
    expect(capturedEmails).toHaveLength(1);

    const otpMatch = capturedEmails[0].text?.match(/>>> (\d{6}) <<</);
    expect(otpMatch).not.toBeNull();
    const issuedOtp = otpMatch![1];

    // Email audit log must NOT leak plaintext OTP
    expect(dbState.emailLogs[0].previewSnippet).not.toContain(issuedOtp);
    expect(dbState.emailLogs[0].bodyText).not.toContain(issuedOtp);
    expect(dbState.emailLogs[0].htmlBody).not.toContain(issuedOtp);

    // Raw OTP is not stored in plaintext on user record
    const user = dbState.users.find((u) => u.email === 'otpuser@gmail.com')!;
    expect(user.passwordResetOtp?.verified).toBe(false);
    expect(user.passwordResetOtp?.codeHash).not.toContain(issuedOtp);

    // Step bypass blocked: cannot reset password before /verify-reset-code succeeds
    const bypassRes = await postJson(`${baseUrl}/api/auth/reset-password`, {
      email: 'otpuser@gmail.com',
      code: issuedOtp,
      newPassword: 'NewPassword2026!',
      confirmPassword: 'NewPassword2026!',
    });
    expect(bypassRes.status).toBe(400);
    expect(bypassRes.data.error).toMatch(/verify your 6-digit gmail otp/i);

    // Step 2: Wrong OTP attempts lock out after 5 tries
    const wrongOtp = issuedOtp === '111111' ? '222222' : '111111';
    for (let i = 1; i <= 4; i++) {
      const bad = await postJson(`${baseUrl}/api/auth/verify-reset-code`, {
        email: 'otpuser@gmail.com',
        code: wrongOtp,
      });
      expect(bad.status).toBe(400);
      expect(bad.data.attemptsRemaining).toBe(5 - i);
    }
    const lockout = await postJson(`${baseUrl}/api/auth/verify-reset-code`, {
      email: 'otpuser@gmail.com',
      code: wrongOtp,
    });
    expect(lockout.status).toBe(429);
    expect(lockout.data.lockedOut).toBe(true);
    expect(user.passwordResetOtp).toBeUndefined();

    // Resend fresh OTP
    const resendRes = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: 'otpuser@gmail.com' });
    expect(resendRes.status).toBe(200);
    const freshOtp = capturedEmails[1].text!.match(/>>> (\d{6}) <<</)![1];

    // Step 2: Verify valid OTP
    const verifyOk = await postJson(`${baseUrl}/api/auth/verify-reset-code`, {
      email: 'otpuser@gmail.com',
      code: freshOtp,
    });
    expect(verifyOk.status).toBe(200);
    expect(verifyOk.data.verified).toBe(true);

    // Step 3: Mismatched confirmPassword rejected
    const mismatchRes = await postJson(`${baseUrl}/api/auth/reset-password`, {
      email: 'otpuser@gmail.com',
      code: freshOtp,
      newPassword: 'NewPassword2026!',
      confirmPassword: 'WrongConfirm2026!',
    });
    expect(mismatchRes.status).toBe(400);

    // Step 3: Matching newPassword + confirmPassword updates password
    const resetOk = await postJson(`${baseUrl}/api/auth/reset-password`, {
      email: 'otpuser@gmail.com',
      code: freshOtp,
      newPassword: 'NewPassword2026!',
      confirmPassword: 'NewPassword2026!',
    });
    expect(resetOk.status).toBe(200);
    expect(resetOk.data.passwordChanged).toBe(true);
    expect(user.passwordResetOtp).toBeUndefined();

    // Verify old password fails and new password succeeds
    const oldLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: 'otpuser@gmail.com',
      password: 'OldSecret123!',
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: 'otpuser@gmail.com',
      password: 'NewPassword2026!',
    });
    expect(newLogin.status).toBe(200);
    expect(newLogin.data.token).toBeTruthy();

    // Also verify authenticated /change-password works for SettingsScreen
    const changePass = await postJson(
      `${baseUrl}/api/auth/change-password`,
      {
        currentPassword: 'NewPassword2026!',
        newPassword: 'RotatedPassword99!',
      },
      { Authorization: `Bearer ${newLogin.data.token}` }
    );
    expect(changePass.status).toBe(200);
    expect(changePass.data.success).toBe(true);

    const rotatedLogin = await postJson(`${baseUrl}/api/auth/login`, {
      email: 'otpuser@gmail.com',
      password: 'RotatedPassword99!',
    });
    expect(rotatedLogin.status).toBe(200);
  });

  it('uses connected Admin Gmail OAuth account as OTP sender and clears expired session on 401', async () => {
    mockChannel = 'gmail_oauth_api';
    mockGmailConfigured = false;
    setAdminGmailSenderSession({
      accessToken: 'ya29.admin_oauth_token',
      email: 'chekchris85@gmail.com',
      userId: 'usr_1',
    });

    const { server, baseUrl, dbState } = await startTestServer();
    activeServer = server;

    const otpRes = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: 'otpuser@gmail.com' });
    expect(otpRes.status).toBe(200);
    expect(otpRes.data.channel).toBe('gmail_oauth_api');
    expect(capturedEmails[0].preferOAuth).toBe(true);
    expect(capturedEmails[0].googleAccessToken).toBe('ya29.admin_oauth_token');
    expect(capturedEmails[0].fromEmail).toBe('chekchris85@gmail.com');
    expect(dbState.emailLogs[0].senderEmail).toBe('chekchris85@gmail.com');

    // Simulate expired Google OAuth token -> marks expired while retaining lastConnectedEmail for recovery banner
    mockChannel = 'audit_log_only';
    mockOAuthExpired = true;
    const expiredRes = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: 'otpuser@gmail.com' });
    expect(expiredRes.status).toBe(503);
    expect(getActiveAdminGmailSender()).toBeNull();
    expect(getAdminGmailSenderStatus().lastConnectedEmail).toBe('chekchris85@gmail.com');
  });

  it('delivers login notification emails via connected Admin Gmail OAuth sender and auto-activates admin sender on Google login', async () => {
    mockChannel = 'gmail_oauth_api';
    mockGmailConfigured = false;
    setAdminGmailSenderSession({
      accessToken: 'ya29.admin_oauth_token',
      email: 'chekchris85@gmail.com',
      userId: 'usr_1',
    });

    const { server, baseUrl, dbState } = await startTestServer();
    activeServer = server;

    const loginRes = await postJson(`${baseUrl}/api/auth/login`, {
      email: 'otpuser@gmail.com',
      password: 'OldSecret123!',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.data.emailDelivery).toEqual({
      deliveredToGmail: true,
      channel: 'gmail_oauth_api',
    });
    expect(capturedEmails[0].to).toBe('otpuser@gmail.com');
    expect(capturedEmails[0].googleAccessToken).toBe('ya29.admin_oauth_token');
    expect(capturedEmails[0].fromEmail).toBe('chekchris85@gmail.com');
    expect(dbState.emailLogs[0].status).toBe('delivered');

    // Clear active session (simulating server restart), then log in as admin via Google Sign-In
    clearAdminGmailSenderSession();
    const adminGoogleRes = await postJson(`${baseUrl}/api/auth/google`, {
      email: 'chekchris85@gmail.com',
      name: 'Chris Admin',
      googleAccessToken: 'ya29.fresh_admin_google_login_token',
    });
    expect(adminGoogleRes.status).toBe(200);
    expect(adminGoogleRes.data.emailDelivery?.deliveredToGmail).toBe(true);
    expect(getActiveAdminGmailSender()?.accessToken).toBe('ya29.fresh_admin_google_login_token');
    expect(getActiveAdminGmailSender()?.email).toBe('chekchris85@gmail.com');

    // Subsequent standard analyst Google Sign-In uses the auto-activated Admin Gmail Sender
    const analystGoogleRes = await postJson(`${baseUrl}/api/auth/google`, {
      email: 'otpuser@gmail.com',
      name: 'OTP Test Operator',
    });
    expect(analystGoogleRes.status).toBe(200);
    expect(analystGoogleRes.data.emailDelivery?.deliveredToGmail).toBe(true);
    expect(capturedEmails[2].googleAccessToken).toBe('ya29.fresh_admin_google_login_token');
  });
});
