/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SafeBoxValidationResult {
  valid: boolean;
  tokenCount: number;
  hasNumber: boolean;
  hasAlphabet: boolean;
  hasSign: boolean;
  hasEmoji: boolean;
  errors: string[];
}

/**
 * Splits a string into user-perceived grapheme clusters so that multi-codepoint
 * emojis (e.g. 🔐, 🛡️, 🔥) each count as exactly 1 token.
 */
export function splitGraphemes(value: string): string[] {
  if (!value) return [];
  const IntlAny = Intl as any;
  if (typeof IntlAny !== 'undefined' && typeof IntlAny.Segmenter === 'function') {
    const segmenter = new IntlAny.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value), (s: any) => s.segment);
  }
  return Array.from(value);
}

/**
 * Validates the separate 6-token mixed Admin Safe Box passkey.
 * Accepts any characters chosen by the user with no restriction on specific
 * characters, while requiring exactly 6 tokens containing at least:
 * - 1 number
 * - 1 alphabet letter
 * - 1 sign / symbol
 * - 1 emoji
 */
export function validateSafeBoxPasskey(rawInput: string): SafeBoxValidationResult {
  const input = typeof rawInput === 'string' ? rawInput : '';
  const graphemes = splitGraphemes(input);
  const tokenCount = graphemes.length;

  const hasNumber = /\p{Nd}/u.test(input);
  const hasAlphabet = /\p{L}/u.test(input);
  const hasEmoji = /\p{Extended_Pictographic}/u.test(input);

  // Strip emojis and invisible joiners/variation selectors before checking for signs/symbols
  // so an emoji alone doesn't double-count as the required sign.
  const withoutEmojis = input.replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '');
  const hasSign = /[\p{P}\p{S}]/u.test(withoutEmojis);

  const errors: string[] = [];
  if (tokenCount !== 6) {
    errors.push(`Must be exactly 6 tokens (currently ${tokenCount}).`);
  }
  if (!hasNumber) {
    errors.push('Must include at least one number (0-9).');
  }
  if (!hasAlphabet) {
    errors.push('Must include at least one alphabet letter.');
  }
  if (!hasSign) {
    errors.push('Must include at least one sign/symbol (e.g. ! @ # $ % *).');
  }
  if (!hasEmoji) {
    errors.push('Must include at least one emoji (e.g. 🔐 🛡️ 🔥).');
  }

  return {
    valid: tokenCount === 6 && hasNumber && hasAlphabet && hasSign && hasEmoji,
    tokenCount,
    hasNumber,
    hasAlphabet,
    hasSign,
    hasEmoji,
    errors,
  };
}
