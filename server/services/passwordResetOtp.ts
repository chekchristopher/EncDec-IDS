/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { PasswordResetOtpChallenge } from '../../src/types.js';

export const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_OTP_ATTEMPTS = 5;

export function normalizeResetEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function generateSixDigitOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtpCode(email: string, code: string, salt: string): string {
  const normalized = normalizeResetEmail(email);
  const cleanCode = String(code || '').trim();
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalized}:${cleanCode}`)
    .digest('hex');
}

function safeEqualHex(hexA: string, hexB: string): boolean {
  if (!hexA || !hexB || hexA.length !== hexB.length) return false;
  try {
    const bufA = Buffer.from(hexA, 'hex');
    const bufB = Buffer.from(hexB, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function createOtpChallenge(
  email: string,
  now: number = Date.now()
): { code: string; challenge: PasswordResetOtpChallenge } {
  const code = generateSixDigitOtp();
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = hashOtpCode(email, code, salt);

  return {
    code,
    challenge: {
      codeHash,
      salt,
      expiresAt: now + OTP_EXPIRY_MS,
      verified: false,
      attempts: 0,
      requestedAt: new Date(now).toISOString(),
    },
  };
}

export interface VerifyOtpResult {
  ok: boolean;
  reason?: 'missing' | 'expired' | 'locked' | 'mismatch';
  message: string;
  attemptsRemaining?: number;
  clearChallenge?: boolean;
  updatedChallenge?: PasswordResetOtpChallenge;
}

export function verifyOtpChallenge(
  challenge: PasswordResetOtpChallenge | undefined,
  email: string,
  submittedCode: string,
  now: number = Date.now()
): VerifyOtpResult {
  if (!challenge) {
    return {
      ok: false,
      reason: 'missing',
      message: 'No active OTP verification request was found. Please request a new 6-digit OTP to your Gmail.',
    };
  }

  if (now > challenge.expiresAt) {
    return {
      ok: false,
      reason: 'expired',
      clearChallenge: true,
      message: 'Your 6-digit OTP has expired. Please request a new OTP to your Gmail.',
    };
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    return {
      ok: false,
      reason: 'locked',
      clearChallenge: true,
      message: 'Too many incorrect OTP attempts. For security, this OTP has been invalidated. Please request a new OTP.',
    };
  }

  const cleanCode = String(submittedCode || '').trim();
  const candidateHash = hashOtpCode(email, cleanCode, challenge.salt);
  const matches = safeEqualHex(candidateHash, challenge.codeHash);

  if (!matches) {
    const nextAttempts = challenge.attempts + 1;
    const attemptsRemaining = Math.max(0, MAX_OTP_ATTEMPTS - nextAttempts);

    if (attemptsRemaining === 0) {
      return {
        ok: false,
        reason: 'locked',
        attemptsRemaining: 0,
        clearChallenge: true,
        message: 'Too many incorrect OTP attempts (5/5). For security, this OTP has been invalidated. Please request a new OTP.',
      };
    }

    return {
      ok: false,
      reason: 'mismatch',
      attemptsRemaining,
      updatedChallenge: {
        ...challenge,
        attempts: nextAttempts,
      },
      message: `Incorrect 6-digit OTP code. Please check your Gmail inbox (${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining).`,
    };
  }

  return {
    ok: true,
    updatedChallenge: {
      ...challenge,
      verified: true,
      verifiedAt: now,
    },
    message: 'OTP verified successfully. Please enter and confirm your new password.',
  };
}

export interface ResetEligibilityResult {
  ok: boolean;
  reason?: 'missing' | 'expired' | 'not_verified' | 'mismatch';
  clearChallenge?: boolean;
  message?: string;
}

export function canCompletePasswordReset(
  challenge: PasswordResetOtpChallenge | undefined,
  email: string,
  submittedCode: string,
  now: number = Date.now()
): ResetEligibilityResult {
  if (!challenge) {
    return {
      ok: false,
      reason: 'missing',
      message: 'Password reset session was not found. Please request a new OTP to your Gmail.',
    };
  }

  if (now > challenge.expiresAt) {
    return {
      ok: false,
      reason: 'expired',
      clearChallenge: true,
      message: 'Your OTP verification window has expired. Please request a new 6-digit OTP.',
    };
  }

  if (!challenge.verified) {
    return {
      ok: false,
      reason: 'not_verified',
      message: 'Please verify your 6-digit Gmail OTP before setting a new password.',
    };
  }

  const candidateHash = hashOtpCode(email, submittedCode, challenge.salt);
  if (!safeEqualHex(candidateHash, challenge.codeHash)) {
    return {
      ok: false,
      reason: 'mismatch',
      message: 'OTP verification mismatch. Please re-verify your 6-digit Gmail code.',
    };
  }

  return { ok: true };
}

export function redactOtpFromText(content: string, code: string): string {
  if (!content || !code) return content;
  return content.split(code).join('******');
}

export function buildPasswordResetOtpEmail(params: {
  userName: string;
  email: string;
  code: string;
  originIp: string;
  timestamp: string;
}) {
  const { userName, email, code, originIp, timestamp } = params;
  const subject = '[EncDec IDS] Your 6-Digit Password Reset OTP Code';

  const textBody =
    `Hello ${userName},\n\n` +
    `A password reset request was initiated for your EncDec IDS operator account (${email}).\n\n` +
    `Your 6-digit verification OTP is:\n\n` +
    `   >>> ${code} <<<\n\n` +
    `This OTP expires in 15 minutes and can only be used once. Enter this OTP into the EncDec IDS software to proceed with creating your new password.\n\n` +
    `If you did not initiate this request, you can safely ignore this email—your current password has not been changed.\n\n` +
    `Timestamp: ${timestamp}\n` +
    `Origin IP: ${originIp}\n\n` +
    `Regards,\nEncDec Security Operations Team`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 8px; border: 1px solid #1e293b; max-width: 540px; margin: 0 auto;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #06b6d4; margin: 0; font-size: 20px;">EncDec IDS Security Gateway</h2>
        <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">ONE-TIME PASSWORD (OTP) IDENTITY VERIFICATION</p>
      </div>
      <p style="font-size: 14px; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">We received a request to reset the password for your EncDec IDS account (<strong>${email}</strong>).</p>
      <p style="font-size: 13px; color: #94a3b8;">Enter this 6-digit OTP in the software to verify it is you:</p>

      <div style="background: #1e293b; border: 2px solid #06b6d4; padding: 18px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">${code}</span>
      </div>

      <div style="background: #1e293b; border-left: 3px solid #f59e0b; padding: 10px 14px; margin: 16px 0; font-size: 12px; color: #cbd5e1;">
        <p style="margin: 0;"><strong>Validity:</strong> 15 minutes (single use, max 5 attempts)</p>
        <p style="margin: 4px 0 0 0;"><strong>Request Time:</strong> ${timestamp}</p>
        <p style="margin: 4px 0 0 0;"><strong>Origin IP:</strong> ${originIp}</p>
      </div>

      <p style="color: #94a3b8; font-size: 12px;">If you did not request a password reset, ignore this message or notify your SOC Administrator.</p>
      <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">EncDec Autonomous Hybrid IDS • Enterprise Cyber Defense Platform</p>
    </div>
  `;

  return { subject, textBody, htmlBody };
}

export function buildPasswordChangedEmail(params: {
  userName: string;
  email: string;
  originIp: string;
  timestamp: string;
}) {
  const { userName, email, originIp, timestamp } = params;
  const subject = '[EncDec IDS Security] Your Password Was Changed';

  const textBody =
    `Hello ${userName},\n\n` +
    `Your EncDec IDS password for (${email}) was successfully changed after Gmail OTP verification.\n\n` +
    `Change Timestamp: ${timestamp}\n` +
    `Origin IP: ${originIp}\n\n` +
    `If you did not authorize this change, immediately notify your SOC Administrator.\n\n` +
    `Regards,\nEncDec Security Operations Team`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 8px; border: 1px solid #1e293b; max-width: 540px; margin: 0 auto;">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #10b981; margin: 0; font-size: 20px;">EncDec IDS Password Updated</h2>
        <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">SECURITY CREDENTIAL CHANGE CONFIRMATION</p>
      </div>
      <p style="font-size: 14px; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">The password for your EncDec IDS operator account (<strong>${email}</strong>) has been changed following Gmail OTP verification.</p>
      <div style="background: #1e293b; border-left: 3px solid #10b981; padding: 10px 14px; margin: 16px 0; font-size: 12px; color: #cbd5e1;">
        <p style="margin: 0;"><strong>Changed At:</strong> ${timestamp}</p>
        <p style="margin: 4px 0 0 0;"><strong>Origin IP:</strong> ${originIp}</p>
      </div>
      <p style="color: #f87171; font-size: 12px;">If you did not make this change, contact your SOC Administrator immediately.</p>
      <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">EncDec Autonomous Hybrid IDS • Enterprise Cyber Defense Platform</p>
    </div>
  `;

  return { subject, textBody, htmlBody };
}
