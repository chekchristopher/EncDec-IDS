/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StoredCertificate, UserCertificationStatus } from '../types.js';

export const TOTAL_WORKBOOK_CHAPTERS = 10;

export interface WorkbookProgressLike {
  readChapters?: number[];
  completed?: boolean;
  quizPassed?: boolean;
  quizScore?: number;
}

export function evaluateUserCertificationStatus(params: {
  userId?: string | null;
  userEmail?: string | null;
  progress?: WorkbookProgressLike | null;
  certificates?: StoredCertificate[] | null;
  totalChapters?: number;
}): UserCertificationStatus {
  const {
    userId,
    userEmail,
    progress = null,
    certificates = [],
    totalChapters = TOTAL_WORKBOOK_CHAPTERS,
  } = params;

  const normalizedEmail = (userEmail || '').trim().toLowerCase();

  const matchingCert = (certificates || []).find((cert) => {
    if (!cert || cert.status === 'revoked') return false;
    if (userId && cert.userId && cert.userId === userId) return true;
    if (normalizedEmail && cert.recipientEmail && cert.recipientEmail.trim().toLowerCase() === normalizedEmail) {
      return true;
    }
    return false;
  });

  const validReadSet = new Set<number>();
  if (Array.isArray(progress?.readChapters)) {
    for (const ch of progress.readChapters) {
      if (typeof ch === 'number' && Number.isInteger(ch) && ch >= 0 && ch < totalChapters) {
        validReadSet.add(ch);
      }
    }
  }

  const chaptersCompleted = matchingCert
    ? totalChapters
    : Math.min(totalChapters, validReadSet.size);
  const quizPassed = Boolean(matchingCert || progress?.quizPassed);
  const quizScore = typeof matchingCert?.quizScore === 'number'
    ? matchingCert.quizScore
    : typeof progress?.quizScore === 'number'
    ? progress.quizScore
    : 0;

  const isCertified = Boolean(matchingCert || (progress?.completed && progress?.quizPassed));

  const progressPercent = isCertified
    ? 100
    : Math.min(
        99,
        Math.round(((chaptersCompleted + (quizPassed ? 1 : 0)) / (totalChapters + 1)) * 100)
      );

  let nextStepLabel = 'Certified EncDec Analyst (CE-SOC)';
  if (!isCertified) {
    if (chaptersCompleted === 0) {
      nextStepLabel = `Start Chapter 1 of ${totalChapters} in the EncDec Workbook`;
    } else if (chaptersCompleted < totalChapters) {
      nextStepLabel = `Complete remaining ${totalChapters - chaptersCompleted} of ${totalChapters} chapters & Capstone Quiz`;
    } else {
      nextStepLabel = 'Pass the Capstone Knowledge Check (≥ 80%) to earn your CE-SOC certificate';
    }
  }

  return {
    isCertified,
    chaptersCompleted,
    totalChapters,
    quizPassed,
    quizScore,
    progressPercent,
    certificateId: matchingCert?.certificateId,
    nextStepLabel,
  };
}
