import { describe, expect, it } from 'vitest';
import { evaluateUserCertificationStatus, TOTAL_WORKBOOK_CHAPTERS } from '../certificationStatus.js';
import type { StoredCertificate } from '../../types.js';

describe('evaluateUserCertificationStatus', () => {
  it('marks brand-new user with no progress and no certificate as uncertified at 0%', () => {
    const status = evaluateUserCertificationStatus({
      userId: 'usr_new',
      userEmail: 'new@example.com',
      progress: null,
      certificates: [],
    });

    expect(status.isCertified).toBe(false);
    expect(status.chaptersCompleted).toBe(0);
    expect(status.totalChapters).toBe(TOTAL_WORKBOOK_CHAPTERS);
    expect(status.progressPercent).toBe(0);
    expect(status.quizPassed).toBe(false);
    expect(status.nextStepLabel).toContain('Start Chapter 1');
  });

  it('tracks partial workbook chapter completion while still uncertified', () => {
    const status = evaluateUserCertificationStatus({
      userId: 'usr_a',
      userEmail: 'a@example.com',
      progress: {
        readChapters: [0, 1, 2, 2, 99, -1],
        quizPassed: false,
        completed: false,
      },
      certificates: [],
    });

    expect(status.isCertified).toBe(false);
    expect(status.chaptersCompleted).toBe(3);
    expect(status.progressPercent).toBe(Math.round((3 / 11) * 100));
    expect(status.nextStepLabel).toContain('7 of 10 chapters');
  });

  it('prompts for Capstone Knowledge Check once all 10 chapters are read without passing the quiz', () => {
    const status = evaluateUserCertificationStatus({
      userId: 'usr_a',
      userEmail: 'a@example.com',
      progress: {
        readChapters: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        quizPassed: false,
        completed: false,
      },
      certificates: [],
    });

    expect(status.isCertified).toBe(false);
    expect(status.chaptersCompleted).toBe(10);
    expect(status.nextStepLabel).toContain('Capstone Knowledge Check');
  });

  it('marks user as certified when they hold an active CE-SOC certificate', () => {
    const cert: StoredCertificate = {
      certificateId: 'CERT-ENCDEC-2026-TEST1',
      userId: 'usr_cert',
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      recipientEmail: 'ada@example.com',
      courseTitle: 'Certified EncDec IDS SOC Specialist (CE-SOC)',
      accreditationLevel: 'Tier-III',
      quizScore: 100,
      quizPassed: true,
      issueDate: 'November 16, 2026',
      verificationCode: 'SHA256: ABC',
      verifiedAt: new Date().toISOString(),
      verificationUrl: 'http://localhost:3000/verify/CERT-ENCDEC-2026-TEST1',
      status: 'active',
      attestationStatement: 'Verified',
    };

    const status = evaluateUserCertificationStatus({
      userId: 'usr_cert',
      userEmail: 'ada@example.com',
      progress: null,
      certificates: [cert],
    });

    expect(status.isCertified).toBe(true);
    expect(status.progressPercent).toBe(100);
    expect(status.certificateId).toBe('CERT-ENCDEC-2026-TEST1');
  });

  it('ignores revoked certificates and certificates belonging to other users', () => {
    const revokedCert: StoredCertificate = {
      certificateId: 'CERT-REVOKED',
      userId: 'usr_a',
      firstName: 'A',
      lastName: 'B',
      fullName: 'A B',
      recipientEmail: 'a@example.com',
      courseTitle: 'CE-SOC',
      accreditationLevel: 'Tier-III',
      quizScore: 90,
      quizPassed: true,
      issueDate: 'November 16, 2026',
      verificationCode: 'SHA256: 123',
      verifiedAt: new Date().toISOString(),
      verificationUrl: 'http://localhost:3000/verify/CERT-REVOKED',
      status: 'revoked',
      attestationStatement: 'Revoked',
    };

    const otherCert: StoredCertificate = {
      ...revokedCert,
      certificateId: 'CERT-OTHER',
      userId: 'usr_other',
      recipientEmail: 'other@example.com',
      status: 'active',
    };

    const status = evaluateUserCertificationStatus({
      userId: 'usr_a',
      userEmail: 'a@example.com',
      progress: null,
      certificates: [revokedCert, otherCert],
    });

    expect(status.isCertified).toBe(false);
  });
});
