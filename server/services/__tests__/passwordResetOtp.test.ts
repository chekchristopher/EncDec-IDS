import { describe, it, expect } from 'vitest';
import {
  OTP_EXPIRY_MS,
  MAX_OTP_ATTEMPTS,
  generateSixDigitOtp,
  createOtpChallenge,
  verifyOtpChallenge,
  canCompletePasswordReset,
  redactOtpFromText,
  buildPasswordResetOtpEmail,
} from '../passwordResetOtp.js';

describe('passwordResetOtp service', () => {
  it('generates 6-digit numeric OTP codes', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateSixDigitOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });

  it('creates salted hashed OTP challenges that do not expose raw OTP in challenge fields', () => {
    const now = 1_700_000_000_000;
    const { code, challenge } = createOtpChallenge('User@Gmail.com', now);
    expect(code).toMatch(/^\d{6}$/);
    expect(challenge.codeHash).not.toContain(code);
    expect(challenge.salt).toHaveLength(32);
    expect(challenge.expiresAt).toBe(now + OTP_EXPIRY_MS);
    expect(challenge.verified).toBe(false);
    expect(challenge.attempts).toBe(0);
  });

  it('verifies matching OTP case-insensitively on email and marks challenge verified', () => {
    const now = 1_700_000_000_000;
    const { code, challenge } = createOtpChallenge('Operator@Gmail.com', now);

    const res = verifyOtpChallenge(challenge, '  operator@gmail.com ', code, now + 5000);
    expect(res.ok).toBe(true);
    expect(res.updatedChallenge?.verified).toBe(true);
    expect(res.updatedChallenge?.verifiedAt).toBe(now + 5000);
  });

  it('rejects expired OTP challenges and signals cleanup', () => {
    const now = 1_700_000_000_000;
    const { code, challenge } = createOtpChallenge('user@gmail.com', now);

    const res = verifyOtpChallenge(challenge, 'user@gmail.com', code, now + OTP_EXPIRY_MS + 1);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('expired');
    expect(res.clearChallenge).toBe(true);
  });

  it('tracks wrong OTP attempts and locks out after MAX_OTP_ATTEMPTS (5)', () => {
    const now = 1_700_000_000_000;
    const { code, challenge } = createOtpChallenge('user@gmail.com', now);
    const wrongCode = code === '123456' ? '654321' : '123456';

    let current = challenge;
    for (let attempt = 1; attempt < MAX_OTP_ATTEMPTS; attempt++) {
      const res = verifyOtpChallenge(current, 'user@gmail.com', wrongCode, now + attempt * 1000);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('mismatch');
      expect(res.attemptsRemaining).toBe(MAX_OTP_ATTEMPTS - attempt);
      expect(res.clearChallenge).toBeUndefined();
      current = res.updatedChallenge!;
    }

    // 5th wrong attempt invalidates the challenge
    const lockout = verifyOtpChallenge(current, 'user@gmail.com', wrongCode, now + 10_000);
    expect(lockout.ok).toBe(false);
    expect(lockout.reason).toBe('locked');
    expect(lockout.attemptsRemaining).toBe(0);
    expect(lockout.clearChallenge).toBe(true);
  });

  it('prevents password reset if OTP was not verified in step 2', () => {
    const now = 1_700_000_000_000;
    const { code, challenge } = createOtpChallenge('user@gmail.com', now);

    const beforeVerify = canCompletePasswordReset(challenge, 'user@gmail.com', code, now + 1000);
    expect(beforeVerify.ok).toBe(false);
    expect(beforeVerify.reason).toBe('not_verified');

    const verifyRes = verifyOtpChallenge(challenge, 'user@gmail.com', code, now + 2000);
    expect(verifyRes.ok).toBe(true);

    const afterVerify = canCompletePasswordReset(verifyRes.updatedChallenge, 'user@gmail.com', code, now + 3000);
    expect(afterVerify.ok).toBe(true);
  });

  it('redacts raw OTP code from audit log snippets and bodies', () => {
    const { textBody, htmlBody } = buildPasswordResetOtpEmail({
      userName: 'Alice',
      email: 'alice@gmail.com',
      code: '482913',
      originIp: '127.0.0.1',
      timestamp: '2026-01-01T00:00:00Z',
    });

    expect(textBody).toContain('482913');
    expect(htmlBody).toContain('482913');

    const redactedText = redactOtpFromText(textBody, '482913');
    const redactedHtml = redactOtpFromText(htmlBody, '482913');
    expect(redactedText).not.toContain('482913');
    expect(redactedText).toContain('******');
    expect(redactedHtml).not.toContain('482913');
    expect(redactedHtml).toContain('******');
  });
});
