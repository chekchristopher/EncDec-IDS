import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

import { createApiRouter } from '../api.js';
import { getJwtSecret } from '../auth.js';
import { getInitialDatabaseState } from '../../db/seed.js';
import {
  AUTHORITATIVE_EXAM_BANK,
  EXAM_QUESTIONS_COUNT,
  EXAM_DURATION_SECONDS,
  EXAM_DURATION_MS,
  EXAM_PASS_THRESHOLD_PERCENT,
} from '../../data/examQuestionBank.js';

async function startExamTestServer() {
  const dbState = getInitialDatabaseState();
  dbState.billingConfig = {
    subscriptionRequired: false,
    freeAccessActive: false,
    freeAccessExpiresAt: null,
    nowPaymentsUrl: 'https://nowpayments.io/payment/?iid=5955692521',
    nowPaymentsInvoiceId: '5955692521',
    priceUsd: 500,
    billingCycleMonths: 3,
    billingCycleDays: 90,
    updatedAt: new Date().toISOString(),
  };

  dbState.users.push(
    {
      id: 'usr_candidate_a',
      email: 'alice@soc.sec',
      passwordHash: bcryptjs.hashSync('Password123!', 10),
      name: 'Alice Candidate',
      role: 'analyst',
      status: 'active',
      mfaEnabled: false,
      safeBoxEnabled: false,
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr_candidate_b',
      email: 'bob@soc.sec',
      passwordHash: bcryptjs.hashSync('Password123!', 10),
      name: 'Bob Candidate',
      role: 'analyst',
      status: 'active',
      mfaEnabled: false,
      safeBoxEnabled: false,
      subscriptionStatus: 'active',
      createdAt: new Date().toISOString(),
    }
  );

  const secret = getJwtSecret();
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    jwt.verify(token, secret, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user;
      next();
    });
  };

  const adminUser = dbState.users.find((u) => u.role === 'admin')!;
  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
    secret,
    { expiresIn: '1h' }
  );
  const aliceToken = jwt.sign(
    { id: 'usr_candidate_a', email: 'alice@soc.sec', name: 'Alice Candidate', role: 'analyst' },
    secret,
    { expiresIn: '1h' }
  );
  const bobToken = jwt.sign(
    { id: 'usr_candidate_b', email: 'bob@soc.sec', name: 'Bob Candidate', role: 'analyst' },
    secret,
    { expiresIn: '1h' }
  );

  const saveDb = vi.fn();
  const addAuditLog = vi.fn();
  const broadcastWs = vi.fn();
  const activeConnections = new Set<any>();

  const app = express();
  app.use(express.json());
  app.use(
    '/api',
    createApiRouter(dbState, saveDb, addAuditLog, broadcastWs, authenticateToken, activeConnections, '/tmp/nonexistent.json')
  );

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  return { server, baseUrl, dbState, adminToken, aliceToken, bobToken, saveDb, addAuditLog };
}

async function reqJson(
  url: string,
  method: 'GET' | 'POST',
  token: string,
  body?: any,
  extraHeaders: Record<string, string> = {}
) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function completeAllTenChapters(baseUrl: string, token: string) {
  return reqJson(`${baseUrl}/api/workbook/progress`, 'POST', token, {
    chapterIndex: 9,
    paragraphIndex: 2,
    chapterTitle: 'Console Usability, Dual-Theme Engine & Certification',
    readChapters: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  });
}

describe('CE-SOC Anti-Malpractice Certification Exam & 220-Question Bank', () => {
  let activeServer: http.Server | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (activeServer) {
      await new Promise<void>((resolve) => activeServer!.close(() => resolve()));
      activeServer = null;
    }
  });

  it('maintains at least 200 unique tough questions across Chapters 1-10 with valid answers and rationales', () => {
    expect(AUTHORITATIVE_EXAM_BANK.length).toBeGreaterThanOrEqual(200);
    expect(AUTHORITATIVE_EXAM_BANK.length).toBe(220);

    const idSet = new Set<string>();
    const promptSet = new Set<string>();
    const chapterCounts: Record<number, number> = {};
    const answerDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (const q of AUTHORITATIVE_EXAM_BANK) {
      expect(q.id).toBeTruthy();
      expect(idSet.has(q.id)).toBe(false);
      idSet.add(q.id);

      expect(q.question.trim().length).toBeGreaterThan(25);
      expect(promptSet.has(q.question.trim().toLowerCase())).toBe(false);
      promptSet.add(q.question.trim().toLowerCase());

      expect(q.chapterNumber).toBeGreaterThanOrEqual(1);
      expect(q.chapterNumber).toBeLessThanOrEqual(10);
      chapterCounts[q.chapterNumber] = (chapterCounts[q.chapterNumber] || 0) + 1;

      expect(['Hard', 'Advanced']).toContain(q.difficulty);
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options).toHaveLength(4);
      const uniqueOpts = new Set(q.options.map((o) => o.trim().toLowerCase()));
      expect(uniqueOpts.size).toBe(4);

      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      answerDistribution[q.correctIndex] += 1;

      expect(q.explanation.trim().length).toBeGreaterThan(20);
    }

    for (let ch = 1; ch <= 10; ch++) {
      expect(chapterCounts[ch]).toBe(22);
    }
    // Ensure answers are distributed across options A-D
    for (let idx = 0; idx < 4; idx++) {
      expect(answerDistribution[idx]).toBeGreaterThan(25);
    }
  });

  it('restricts 220+ question bank (with answers) to admins with passkey and allows adding custom questions', async () => {
    const { server, baseUrl, adminToken, aliceToken } = await startExamTestServer();
    activeServer = server;

    // Analyst blocked
    const analystRes = await reqJson(`${baseUrl}/api/admin/workbook/question-bank`, 'GET', aliceToken, undefined, {
      'x-secret-passkey': 'VIGIL_ADMIN_77',
    });
    expect(analystRes.status).toBe(403);

    // Admin without passkey blocked
    const noPasskeyRes = await reqJson(`${baseUrl}/api/admin/workbook/question-bank`, 'GET', adminToken);
    expect(noPasskeyRes.status).toBe(403);

    // Admin with passkey sees all 220 questions WITH correctIndex and explanation
    const adminRes = await reqJson(`${baseUrl}/api/admin/workbook/question-bank`, 'GET', adminToken, undefined, {
      'x-secret-passkey': 'VIGIL_ADMIN_77',
    });
    expect(adminRes.status).toBe(200);
    expect(adminRes.data.totalQuestions).toBe(220);
    expect(adminRes.data.questionsPerExam).toBe(EXAM_QUESTIONS_COUNT);
    expect(adminRes.data.durationSeconds).toBe(EXAM_DURATION_SECONDS);
    expect(adminRes.data.passThresholdPercent).toBe(EXAM_PASS_THRESHOLD_PERCENT);
    expect(adminRes.data.questions).toHaveLength(220);
    expect(typeof adminRes.data.questions[0].correctIndex).toBe('number');
    expect(typeof adminRes.data.questions[0].explanation).toBe('string');

    // Admin adds a custom question
    const addRes = await reqJson(
      `${baseUrl}/api/admin/workbook/question-bank`,
      'POST',
      adminToken,
      {
        chapterNumber: 3,
        difficulty: 'Advanced',
        question: 'Which DPI parser invariant prevents integer underflow during malformed IPv4 option length inspection?',
        options: [
          'Enforcing IHL >= 5 (20 bytes) before subtracting header length from total packet length',
          'Disabling TCP checksum validation on loopback interfaces',
          'Setting MTU dynamically to 1280 bytes in user space',
          'Bypassing Layer-4 inspection when DF bit equals zero',
        ],
        correctIndex: 0,
        explanation: 'Enforcing IHL >= 5 prevents negative option-length arithmetic when parsing IPv4 headers.',
      },
      { 'x-secret-passkey': 'VIGIL_ADMIN_77' }
    );
    expect(addRes.status).toBe(201);
    expect(addRes.data.totalQuestions).toBe(221);
    expect(addRes.data.question.isCustom).toBe(true);
  });

  it('enforces 10-chapter prerequisite, prevents client forgery, issues distinct 6-question sets per user, and never leaks answers before submission', async () => {
    const { server, baseUrl, aliceToken, bobToken } = await startExamTestServer();
    activeServer = server;

    // Attempting to start before reading all 10 chapters fails
    const earlyStart = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    expect(earlyStart.status).toBe(403);
    expect(earlyStart.data.code).toBe('WORKBOOK_PREREQUISITES_INCOMPLETE');

    // Attempt to forge quizPassed/completed via POST /workbook/progress is ignored
    const forgeRes = await reqJson(`${baseUrl}/api/workbook/progress`, 'POST', aliceToken, {
      chapterIndex: 9,
      paragraphIndex: 1,
      readChapters: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      quizPassed: true,
      completed: true,
      quizScore: 100,
    });
    expect(forgeRes.status).toBe(200);
    expect(forgeRes.data.progress.quizPassed).toBe(false);
    expect(forgeRes.data.progress.completed).toBe(false);
    expect(forgeRes.data.progress.quizScore).toBe(0);

    // Registering certificate before passing exam is blocked
    const blockedCert = await reqJson(`${baseUrl}/api/certificates/register`, 'POST', aliceToken, {
      certificateId: 'CERT-FORGED-001',
      firstName: 'Alice',
      lastName: 'Candidate',
    });
    expect(blockedCert.status).toBe(403);
    expect(blockedCert.data.code).toBe('CERTIFICATION_REQUIRED');

    // Complete all 10 chapters for Bob as well
    await completeAllTenChapters(baseUrl, bobToken);

    const aliceExam = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    const bobExam = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', bobToken, {});

    expect(aliceExam.status).toBe(200);
    expect(bobExam.status).toBe(200);
    expect(aliceExam.data.questions).toHaveLength(6);
    expect(bobExam.data.questions).toHaveLength(6);
    expect(aliceExam.data.totalSeconds).toBe(600);
    expect(aliceExam.data.passThresholdPercent).toBe(80);

    // Answers & explanations must NEVER be sent to candidates before submit
    for (const q of aliceExam.data.questions) {
      expect(q).not.toHaveProperty('correctIndex');
      expect(q).not.toHaveProperty('explanation');
    }

    // Different candidates receive different question sets
    const aliceIds = aliceExam.data.questions.map((q: any) => q.id).sort();
    const bobIds = bobExam.data.questions.map((q: any) => q.id).sort();
    expect(aliceIds).not.toEqual(bobIds);

    // Reloading/calling /exam/active and /exam/start while active resumes the exact same attempt
    const activeRes = await reqJson(`${baseUrl}/api/workbook/exam/active`, 'GET', aliceToken);
    expect(activeRes.status).toBe(200);
    expect(activeRes.data.active).toBe(true);
    expect(activeRes.data.attemptId).toBe(aliceExam.data.attemptId);
    expect(activeRes.data.questions.map((q: any) => q.id)).toEqual(aliceExam.data.questions.map((q: any) => q.id));
    for (const q of activeRes.data.questions) {
      expect(q).not.toHaveProperty('correctIndex');
      expect(q).not.toHaveProperty('explanation');
    }

    const resumeRes = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.data.resumed).toBe(true);
    expect(resumeRes.data.attemptId).toBe(aliceExam.data.attemptId);
  });

  it('resets entire workbook back to Chapter 1 when candidate scores < 80% (e.g., 4/6 = 67%), then assigns unseen questions on retry', async () => {
    const { server, baseUrl, aliceToken, dbState } = await startExamTestServer();
    activeServer = server;

    await completeAllTenChapters(baseUrl, aliceToken);
    const startRes = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    const questions = startRes.data.questions as Array<{ id: string }>;
    const firstAttemptIds = new Set(questions.map((q) => q.id));

    const bankMap = new Map(AUTHORITATIVE_EXAM_BANK.map((q) => [q.id, q]));
    // Answer 4 correctly and 2 incorrectly => 67% (< 80%)
    const answers: Record<string, number> = {};
    questions.forEach((q, idx) => {
      const realQ = bankMap.get(q.id)!;
      answers[q.id] = idx < 4 ? realQ.correctIndex : (realQ.correctIndex + 1) % 4;
    });

    const submitRes = await reqJson(`${baseUrl}/api/workbook/exam/submit`, 'POST', aliceToken, {
      attemptId: startRes.data.attemptId,
      answers,
    });

    expect(submitRes.status).toBe(200);
    expect(submitRes.data.passed).toBe(false);
    expect(submitRes.data.timedOut).toBe(false);
    expect(submitRes.data.score).toBe(67);
    expect(submitRes.data.correctCount).toBe(4);
    expect(submitRes.data.resetToChapterOne).toBe(true);
    expect(submitRes.data.resetReason).toBe('score_below_80');
    expect(submitRes.data.results).toHaveLength(6);
    expect(typeof submitRes.data.results[0].explanation).toBe('string');

    // Verify full Chapter 1 reset
    expect(submitRes.data.progress.chapterIndex).toBe(0);
    expect(submitRes.data.progress.paragraphIndex).toBe(0);
    expect(submitRes.data.progress.readChapters).toEqual([]);
    expect(submitRes.data.progress.completed).toBe(false);
    expect(submitRes.data.progress.quizPassed).toBe(false);
    expect(submitRes.data.progress.quizScore).toBe(0);
    expect(submitRes.data.progress.lastResetReason).toBe('score_below_80');

    // Subsequent start is locked until reading all 10 chapters again
    const blockedRetry = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    expect(blockedRetry.status).toBe(403);
    expect(blockedRetry.data.code).toBe('WORKBOOK_PREREQUISITES_INCOMPLETE');

    // Re-study Chapters 1-10 and retake exam -> receives fresh unseen questions
    await completeAllTenChapters(baseUrl, aliceToken);
    const secondStart = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    expect(secondStart.status).toBe(200);
    expect(secondStart.data.attemptId).not.toBe(startRes.data.attemptId);
    const secondIds = (secondStart.data.questions as Array<{ id: string }>).map((q) => q.id);
    for (const qid of secondIds) {
      expect(firstAttemptIds.has(qid)).toBe(false);
    }
    expect(dbState.workbookProgress[0].examAttemptsCount).toBe(2);
  });

  it('resets entire workbook back to Chapter 1 when 10-minute timer expires (both on late submit and on timeout/active check)', async () => {
    const { server, baseUrl, aliceToken, bobToken } = await startExamTestServer();
    activeServer = server;

    await completeAllTenChapters(baseUrl, aliceToken);
    await completeAllTenChapters(baseUrl, bobToken);

    const baseTime = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(baseTime);

    const aliceStart = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    const bobStart = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', bobToken, {});
    expect(aliceStart.status).toBe(200);
    expect(bobStart.status).toBe(200);

    // Advance clock past 10 minutes (601 seconds)
    nowSpy.mockReturnValue(baseTime + EXAM_DURATION_MS + 1000);

    // Scenario A (Alice): submits after 10:00 with ALL correct answers -> STILL fails & resets to Chapter 1!
    const bankMap = new Map(AUTHORITATIVE_EXAM_BANK.map((q) => [q.id, q]));
    const allCorrectAnswers: Record<string, number> = {};
    for (const q of aliceStart.data.questions) {
      allCorrectAnswers[q.id] = bankMap.get(q.id)!.correctIndex;
    }

    const lateSubmit = await reqJson(`${baseUrl}/api/workbook/exam/submit`, 'POST', aliceToken, {
      attemptId: aliceStart.data.attemptId,
      answers: allCorrectAnswers,
    });
    expect(lateSubmit.status).toBe(200);
    expect(lateSubmit.data.passed).toBe(false);
    expect(lateSubmit.data.timedOut).toBe(true);
    expect(lateSubmit.data.resetToChapterOne).toBe(true);
    expect(lateSubmit.data.resetReason).toBe('timeout');
    expect(lateSubmit.data.progress.readChapters).toEqual([]);
    expect(lateSubmit.data.progress.chapterIndex).toBe(0);
    expect(lateSubmit.data.progress.quizPassed).toBe(false);

    // Scenario B (Bob): refreshes page / calls GET /exam/active after timer expired -> automatically resets to Chapter 1
    const bobActiveCheck = await reqJson(`${baseUrl}/api/workbook/exam/active`, 'GET', bobToken);
    expect(bobActiveCheck.status).toBe(200);
    expect(bobActiveCheck.data.active).toBe(false);
    expect(bobActiveCheck.data.expired).toBe(true);
    expect(bobActiveCheck.data.resetToChapterOne).toBe(true);
    expect(bobActiveCheck.data.progress.readChapters).toEqual([]);
    expect(bobActiveCheck.data.progress.chapterIndex).toBe(0);

    // Scenario C: Explicit /workbook/exam/timeout also enforces Chapter 1 reset
    nowSpy.mockReturnValue(baseTime + EXAM_DURATION_MS + 2000);
    await completeAllTenChapters(baseUrl, bobToken);
    const bobRestart = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', bobToken, {});
    const timeoutRes = await reqJson(`${baseUrl}/api/workbook/exam/timeout`, 'POST', bobToken, {
      attemptId: bobRestart.data.attemptId,
    });
    expect(timeoutRes.status).toBe(200);
    expect(timeoutRes.data.timedOut).toBe(true);
    expect(timeoutRes.data.resetToChapterOne).toBe(true);
    expect(timeoutRes.data.progress.readChapters).toEqual([]);
    expect(timeoutRes.data.progress.chapterIndex).toBe(0);
  });

  it('passes candidate who scores >= 80% within 10 minutes and unlocks official QR certificate registration', async () => {
    const { server, baseUrl, aliceToken } = await startExamTestServer();
    activeServer = server;

    await completeAllTenChapters(baseUrl, aliceToken);
    const startRes = await reqJson(`${baseUrl}/api/workbook/exam/start`, 'POST', aliceToken, {});
    const questions = startRes.data.questions as Array<{ id: string }>;

    const bankMap = new Map(AUTHORITATIVE_EXAM_BANK.map((q) => [q.id, q]));
    // 5/6 correct = 83% (>= 80% threshold)
    const answers: Record<string, number> = {};
    questions.forEach((q, idx) => {
      const realQ = bankMap.get(q.id)!;
      answers[q.id] = idx < 5 ? realQ.correctIndex : (realQ.correctIndex + 1) % 4;
    });

    const submitRes = await reqJson(`${baseUrl}/api/workbook/exam/submit`, 'POST', aliceToken, {
      attemptId: startRes.data.attemptId,
      answers,
    });

    expect(submitRes.status).toBe(200);
    expect(submitRes.data.passed).toBe(true);
    expect(submitRes.data.timedOut).toBe(false);
    expect(submitRes.data.resetToChapterOne).toBe(false);
    expect(submitRes.data.score).toBe(83);
    expect(submitRes.data.correctCount).toBe(5);
    expect(submitRes.data.progress.quizPassed).toBe(true);
    expect(submitRes.data.progress.completed).toBe(true);
    expect(submitRes.data.certificationStatus.progressPercent).toBe(100);

    // Official certificate registration now succeeds with authoritative score
    const certRes = await reqJson(`${baseUrl}/api/certificates/register`, 'POST', aliceToken, {
      certificateId: 'CERT-ENCDEC-TEST-8301',
      firstName: 'Alice',
      lastName: 'Candidate',
      fullName: 'Alice Candidate',
      quizScore: 100, // Client spoof should be overridden by authoritative 83%
    });
    expect(certRes.status).toBe(200);
    expect(certRes.data.success).toBe(true);
    expect(certRes.data.certificate.quizScore).toBe(83);
    expect(certRes.data.certificate.quizPassed).toBe(true);
    expect(certRes.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
