/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import type { ExamQuestion, SanitizedExamQuestion } from '../../src/types.js';
import { EXAM_BANK_PART_1 } from './examBankPart1.js';
import { EXAM_BANK_PART_2 } from './examBankPart2.js';

export const EXAM_QUESTIONS_COUNT = 6;
export const EXAM_DURATION_SECONDS = 10 * 60; // 600 seconds (10 minutes strict)
export const EXAM_DURATION_MS = EXAM_DURATION_SECONDS * 1000;
export const EXAM_PASS_THRESHOLD_PERCENT = 80;

function rebalanceQuestionOptions(q: ExamQuestion, index: number): ExamQuestion {
  // Deterministic non-linear Latin-square target pattern ensuring an exact 25% split across A/B/C/D
  const patterns: [number, number, number, number][] = [
    [2, 0, 3, 1],
    [1, 3, 0, 2],
    [3, 1, 2, 0],
    [0, 2, 1, 3],
  ];
  const pattern = patterns[Math.floor(index / 4) % patterns.length];
  const targetIndex = pattern[index % 4];
  const shift = (targetIndex - q.correctIndex + 4) % 4;

  const rotated: [string, string, string, string] = ['', '', '', ''];
  for (let i = 0; i < 4; i++) {
    rotated[(i + shift) % 4] = q.options[i];
  }

  return {
    ...q,
    options: rotated,
    correctIndex: targetIndex,
  };
}

export const AUTHORITATIVE_EXAM_BANK: ExamQuestion[] = [
  ...EXAM_BANK_PART_1,
  ...EXAM_BANK_PART_2,
].map((q, idx) => rebalanceQuestionOptions(q, idx));

export function getMergedExamBank(customQuestions?: ExamQuestion[]): ExamQuestion[] {
  if (!Array.isArray(customQuestions) || customQuestions.length === 0) {
    return AUTHORITATIVE_EXAM_BANK;
  }
  const seenIds = new Set(AUTHORITATIVE_EXAM_BANK.map((q) => q.id));
  const uniqueCustom = customQuestions.filter((q) => q && q.id && !seenIds.has(q.id));
  return [...AUTHORITATIVE_EXAM_BANK, ...uniqueCustom];
}

export function cryptoShuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function sanitizeQuestionForCandidate(q: ExamQuestion): SanitizedExamQuestion {
  return {
    id: q.id,
    chapterNumber: q.chapterNumber,
    topic: q.topic,
    difficulty: q.difficulty,
    question: q.question,
    options: [...q.options] as [string, string, string, string],
    ...(q.isCustom ? { isCustom: true } : {}),
  };
}

/**
 * Selects `count` distinct tough questions for a candidate:
 * 1. Prioritizes questions NOT yet seen by this candidate (`seenIds`).
 * 2. Diversifies across chapters so the 6 questions cover broad curriculum mastery.
 * 3. Avoids repeating the exact sorted question-ID signature issued to recent users.
 */
export function selectUniqueExamQuestions(params: {
  bank: ExamQuestion[];
  seenIds?: string[];
  count?: number;
  recentGlobalSets?: string[][];
}): ExamQuestion[] {
  const {
    bank,
    seenIds = [],
    count = EXAM_QUESTIONS_COUNT,
    recentGlobalSets = [],
  } = params;

  const targetCount = Math.min(count, bank.length);
  const seenSet = new Set(seenIds);
  const recentSignatures = new Set(
    recentGlobalSets.map((ids) => [...ids].sort().join('|'))
  );

  // Build candidate pool prioritizing unseen questions; fall back cleanly if user cycled nearly all 220+ questions
  const unseenPool = bank.filter((q) => !seenSet.has(q.id));
  const basePool = unseenPool.length >= targetCount ? unseenPool : bank;

  // Retry up to 12 times if by coincidence we hit an exact recent signature
  for (let attempt = 0; attempt < 12; attempt++) {
    const shuffled = cryptoShuffle(basePool);
    const picked: ExamQuestion[] = [];
    const usedIds = new Set<string>();
    const usedChapters = new Set<number>();

    // Pass 1: pick tough/diverse-chapter questions (preferring distinct chapters first)
    for (const q of shuffled) {
      if (picked.length >= targetCount) break;
      if (!usedChapters.has(q.chapterNumber) && !usedIds.has(q.id)) {
        picked.push(q);
        usedIds.add(q.id);
        usedChapters.add(q.chapterNumber);
      }
    }

    // Pass 2: fill any remaining slots from shuffled unseenPool (if chapters < targetCount)
    for (const q of shuffled) {
      if (picked.length >= targetCount) break;
      if (!usedIds.has(q.id)) {
        picked.push(q);
        usedIds.add(q.id);
      }
    }

    // Pass 3: if basePool was somehow smaller than targetCount, pull from full bank
    if (picked.length < targetCount) {
      for (const q of cryptoShuffle(bank)) {
        if (picked.length >= targetCount) break;
        if (!usedIds.has(q.id)) {
          picked.push(q);
          usedIds.add(q.id);
        }
      }
    }

    const signature = picked.map((q) => q.id).sort().join('|');
    if (!recentSignatures.has(signature) || attempt === 11) {
      return cryptoShuffle(picked);
    }
  }

  return cryptoShuffle(basePool).slice(0, targetCount);
}
