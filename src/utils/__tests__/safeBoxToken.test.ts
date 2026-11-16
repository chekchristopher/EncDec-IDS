/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { splitGraphemes, validateSafeBoxPasskey } from '../safeBoxToken.js';

describe('safeBoxToken validation', () => {
  it('counts multi-codepoint emojis as a single grapheme token', () => {
    expect(splitGraphemes('En1!🔐9')).toHaveLength(6);
    expect(splitGraphemes('A1!🛡️b')).toHaveLength(5);
    expect(splitGraphemes('En1!🛡️9')).toHaveLength(6);
  });

  it('accepts arbitrary 6-token mixed passkeys containing number, alphabet, sign, and emoji', () => {
    const validCases = [
      'En1!🔐9',
      'A1@🛡️b2',
      'Z9#🔥k$',
      '7q*⚡m2', // missing? wait 7,q,*,⚡,m,2 -> has number(7,2), alphabet(q,m), sign(*), emoji(⚡) -> valid!
      '👍a1!b2',
    ];

    for (const candidate of validCases) {
      const res = validateSafeBoxPasskey(candidate);
      expect(res.valid).toBe(true);
      expect(res.tokenCount).toBe(6);
      expect(res.hasNumber).toBe(true);
      expect(res.hasAlphabet).toBe(true);
      expect(res.hasSign).toBe(true);
      expect(res.hasEmoji).toBe(true);
      expect(res.errors).toHaveLength(0);
    }
  });

  it('rejects passkeys whose grapheme token count is not 6', () => {
    const shortRes = validateSafeBoxPasskey('A1!🔐b');
    expect(shortRes.valid).toBe(false);
    expect(shortRes.tokenCount).toBe(5);

    const longRes = validateSafeBoxPasskey('En1!🔐9x');
    expect(longRes.valid).toBe(false);
    expect(longRes.tokenCount).toBe(7);
  });

  it('rejects numeric MFA codes like 123456', () => {
    const res = validateSafeBoxPasskey('123456');
    expect(res.valid).toBe(false);
    expect(res.hasNumber).toBe(true);
    expect(res.hasAlphabet).toBe(false);
    expect(res.hasSign).toBe(false);
    expect(res.hasEmoji).toBe(false);
  });

  it('does not double-count an emoji as a sign/symbol', () => {
    const res = validateSafeBoxPasskey('A1b2🔐🔥');
    expect(res.valid).toBe(false);
    expect(res.tokenCount).toBe(6);
    expect(res.hasNumber).toBe(true);
    expect(res.hasAlphabet).toBe(true);
    expect(res.hasEmoji).toBe(true);
    expect(res.hasSign).toBe(false);
  });

  it('rejects missing number, missing alphabet, or missing emoji', () => {
    const noNum = validateSafeBoxPasskey('Abc!🔐d');
    expect(noNum.valid).toBe(false);
    expect(noNum.hasNumber).toBe(false);

    const noAlpha = validateSafeBoxPasskey('123!🔐9');
    expect(noAlpha.valid).toBe(false);
    expect(noAlpha.hasAlphabet).toBe(false);

    const noEmoji = validateSafeBoxPasskey('Ab1!@#');
    expect(noEmoji.valid).toBe(false);
    expect(noEmoji.hasEmoji).toBe(false);
  });
});
