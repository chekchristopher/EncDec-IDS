/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import QRCode from 'qrcode';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Host, Rule, Alert, Threat, APIKey, QuarantineItem, SecurityReport, DualDatabaseStatus, MssqlConfig, EmailLog, StoredCertificate, PaymentRecord, WorkbookProgress, ExamQuestion, ExamQuestionResult
} from '../../src/types.js';
import { DbSchema } from '../db/schema.js';
import { firestoreSyncService } from '../db/firestore.js';
import { mssqlSyncService } from '../db/mssql.js';
import { sendEmail, getGmailAppConfig, verifyGmailAppConnection, verifyGmailOAuthToken } from '../services/emailService.js';
import {
  setAdminGmailSenderSession,
  getAdminGmailSenderStatus,
  getActiveAdminGmailSender,
  clearAdminGmailSenderSession,
  markAdminGmailSessionExpired,
  setAdminGmailRefreshMode,
  getAdminGmailRefreshMode,
  recordAdminGmailAutoRefreshFailure,
} from '../services/adminGmailSender.js';
import { 
  hostRegisterSchema, ruleCreateSchema, reportGenerateSchema, 
  apiKeyCreateSchema, quarantineSchema, emailTestSchema,
  aiEmailGenerateSchema, mssqlConfigureSchema, mssqlQuerySchema,
  verifyPaymentSubmissionSchema, adminGrantSubscriptionSchema,
  adminBillingToggleSchema, adminFreeAccessSchema,
  adminGmailRefreshModeSchema,
  workbookExamSubmitSchema, workbookExamTimeoutSchema, adminExamQuestionCreateSchema
} from '../schemas/validation.js';
import {
  EXAM_QUESTIONS_COUNT,
  EXAM_DURATION_SECONDS,
  EXAM_DURATION_MS,
  EXAM_PASS_THRESHOLD_PERCENT,
  getMergedExamBank,
  selectUniqueExamQuestions,
  sanitizeQuestionForCandidate,
} from '../data/examQuestionBank.js';
import {
  COMMERCIAL_SCENES,
  ALLOWED_COMMERCIAL_VOICES,
  DEFAULT_COMMERCIAL_VOICE,
  synthesizeCommercialVoiceover,
} from '../services/commercialVoiceover.js';
import {
  evaluateSubscriptionAccess,
  DEFAULT_BILLING_CONFIG,
  NOWPAYMENTS_PAYMENT_URL,
  NOWPAYMENTS_INVOICE_ID,
  SUBSCRIPTION_PRICE_USD,
  SUBSCRIPTION_CYCLE_MONTHS,
  SUBSCRIPTION_CYCLE_DAYS,
} from '../../src/utils/subscription.js';
import {
  verifyNowPaymentsIpnSignature,
  validateNowPaymentsPayload,
  findConflictingPaymentRecord,
  verifyPaymentWithNowPaymentsApi,
} from '../services/nowPaymentsService.js';
import {
  filterHostsForUser,
  isHostOwnedByUser,
  filterAlertsForUser,
  filterThreatsForUser,
  isAlertOwnedByUser,
} from '../../src/utils/hostOwnership.js';
import { evaluateUserCertificationStatus } from '../../src/utils/certificationStatus.js';

export function createApiRouter(
  dbState: DbSchema,
  saveDb: () => void,
  addAuditLog: (userId: string, email: string, action: string, resource: string, ip: string, status: 'success' | 'failure', role?: string) => void,
  broadcastWs: (msg: any) => void,
  authenticateToken: any,
  activeConnections: Set<any>,
  dbFilePath: string,
  correlationEngine?: any
) {
  const router = Router();

  const requireRole = (roles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied: Insufficient operator clearance role.' });
      }
      next();
    };
  };

  const getUserCertificationStatus = (userId: string, userEmail?: string) => {
    const emailLower = (userEmail || '').trim().toLowerCase();
    const progress = (dbState.workbookProgress || []).find(
      (p) => p.userId === userId || (emailLower && p.email?.toLowerCase() === emailLower)
    ) || null;
    return evaluateUserCertificationStatus({
      userId,
      userEmail,
      progress,
      certificates: dbState.certificates || [],
    });
  };

  const getNormalizedBillingConfig = () => {
    if (!dbState.billingConfig) {
      dbState.billingConfig = { ...DEFAULT_BILLING_CONFIG, updatedAt: new Date().toISOString() };
    }
    return {
      ...DEFAULT_BILLING_CONFIG,
      ...dbState.billingConfig,
      nowPaymentsUrl: NOWPAYMENTS_PAYMENT_URL,
      nowPaymentsInvoiceId: NOWPAYMENTS_INVOICE_ID,
      priceUsd: SUBSCRIPTION_PRICE_USD,
      billingCycleMonths: SUBSCRIPTION_CYCLE_MONTHS,
      billingCycleDays: SUBSCRIPTION_CYCLE_DAYS,
    };
  };

  const requireActiveSubscription = (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const dbUser = dbState.users.find((u) => u.id === req.user.id) || req.user;
    const cfg = getNormalizedBillingConfig();
    const access = evaluateSubscriptionAccess(dbUser, cfg);
    if (!access.hasAccess) {
      return res.status(402).json({
        error: `Subscription required ($${SUBSCRIPTION_PRICE_USD} / ${SUBSCRIPTION_CYCLE_MONTHS} months via NOWPayments) to access the EncDec IDS dashboard.`,
        code: 'SUBSCRIPTION_REQUIRED',
        access,
        billingConfig: cfg,
      });
    }
    next();
  };

  const grantSubscriptionDaysToUser = (
    targetUser: any,
    months: number,
    provider: 'nowpayments' | 'admin',
    actorEmail: string,
    reference?: string,
    notes?: string,
    extraFields?: Partial<PaymentRecord>
  ): PaymentRecord => {
    const nowMs = Date.now();
    const existingExpMs = targetUser.subscriptionExpiresAt ? Date.parse(targetUser.subscriptionExpiresAt) : NaN;
    const baseMs = !Number.isNaN(existingExpMs) && existingExpMs > nowMs ? existingExpMs : nowMs;
    const addDays = Math.max(1, months) * 30;
    const newExpiresAt = new Date(baseMs + addDays * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date(nowMs).toISOString();

    const paymentId = 'pay_' + crypto.randomBytes(6).toString('hex');
    const paymentRecord: PaymentRecord = {
      id: paymentId,
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: targetUser.name,
      amountUsd: SUBSCRIPTION_PRICE_USD,
      billingCycleMonths: months,
      provider,
      invoiceId: NOWPAYMENTS_INVOICE_ID,
      paymentReference: reference || (provider === 'admin' ? `ADMIN-GRANT-${paymentId.toUpperCase()}` : undefined),
      status: provider === 'admin' ? 'granted_by_admin' : 'confirmed',
      createdAt: nowIso,
      confirmedAt: nowIso,
      confirmedBy: actorEmail,
      notes: notes || (provider === 'admin' ? `Granted ${months}-month subscription by administrator` : `Confirmed NOWPayments subscription (${months} months)`),
      ...extraFields,
    };

    targetUser.subscriptionStatus = 'active';
    targetUser.subscriptionExpiresAt = newExpiresAt;
    targetUser.subscriptionGrantedBy = actorEmail;
    targetUser.subscriptionUpdatedAt = nowIso;
    targetUser.lastPaymentId = paymentId;

    if (!Array.isArray(dbState.payments)) {
      dbState.payments = [];
    }
    dbState.payments.unshift(paymentRecord);
    return paymentRecord;
  };

  // Metrics
  router.get('/metrics', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const userHosts = filterHostsForUser(dbState.hosts, req.user?.id);
    const userAlerts = filterAlertsForUser(dbState.alerts, userHosts, req.user?.id);
    const userThreats = filterThreatsForUser(dbState.threats, userHosts, userAlerts, req.user?.id);
    const onlineCount = userHosts.filter(h => h.status === 'online').length;
    const criticalAlertsCount = userAlerts.filter(a => a.severity === 'critical' && a.status === 'unhandled').length;
    const highAlertsCount = userAlerts.filter(a => a.severity === 'high' && a.status === 'unhandled').length;
    const totalThreatScore = userThreats.reduce((acc, curr) => Math.max(acc, curr.score), 0);

    res.json({
      hostsOnline: onlineCount,
      hostsTotal: userHosts.length,
      criticalAlerts: criticalAlertsCount,
      highAlerts: highAlertsCount,
      globalThreatScore: totalThreatScore || 0,
      totalPacketsSec: userHosts.length > 0 && dbState.securityEvents.length > 0 ? Math.max(1, Math.min(dbState.securityEvents.length, 45)) : 0
    });
  });

  // Hosts (strictly isolated per user — each user sees & manages only their own enrolled nodes)
  router.get('/hosts', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    res.json(filterHostsForUser(dbState.hosts, req.user?.id));
  });

  router.post('/hosts/register', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const parsed = hostRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid host parameters';
      return res.status(400).json({ error: err });
    }

    const { name, os, ipAddress, agentVersion } = parsed.data;
    const newHost: Host = {
      id: 'hst_' + Math.random().toString(36).substring(2, 9),
      ownerId: req.user.id,
      ownerEmail: req.user.email,
      name,
      os,
      ipAddress,
      status: 'online',
      lastSeen: new Date().toISOString(),
      agentVersion: agentVersion || 'v4.1.2-agent',
      cpuUsage: 10,
      memoryUsage: 20,
      diskUsage: 35,
      createdAt: new Date().toISOString()
    };

    dbState.hosts.push(newHost);
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Registered Host Agent', newHost.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'HOSTS_UPDATE', payload: dbState.hosts });
    res.status(201).json(newHost);
  });

  router.delete('/hosts/:id', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const host = dbState.hosts.find(h => h.id === req.params.id);
    if (!host) return res.status(404).json({ error: 'Host entry not found.' });
    if (!isHostOwnedByUser(host, req.user?.id)) {
      return res.status(403).json({ error: 'Access denied: You can only deregister your own enrolled nodes.' });
    }

    dbState.hosts = dbState.hosts.filter(h => h.id !== req.params.id);
    saveDb();
    firestoreSyncService.deleteDocument('hosts', req.params.id);

    addAuditLog(req.user.id, req.user.email, 'Deregistered Host Agent', host.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'HOSTS_UPDATE', payload: dbState.hosts });
    res.json({ success: true });
  });

  router.get('/hosts/:id/telemetry', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const host = dbState.hosts.find(h => h.id === req.params.id);
    if (!host) return res.status(404).json({ error: 'Host not found.' });
    if (!isHostOwnedByUser(host, req.user?.id)) {
      return res.status(403).json({ error: 'Access denied: This node belongs to another user.' });
    }

    const hostAlerts = dbState.alerts.filter(
      a =>
        a.id.startsWith('alt_real_') &&
        ((a.target || '').toLowerCase().includes(host.name.toLowerCase()) ||
          (a.target || '').toLowerCase().includes(host.ipAddress.toLowerCase()))
    );

    const failedLogins24h = hostAlerts.filter(
      a =>
        (a.category || '').toLowerCase().includes('auth') ||
        (a.category || '').toLowerCase().includes('brute') ||
        (a.title || '').toLowerCase().includes('login')
    ).length;

    const realFileChanges = hostAlerts.slice(0, 10).map(a => ({
      timestamp: a.timestamp,
      filePath: `${a.target || host.name} [${a.category}]`,
      action: a.status === 'resolved' ? 'verified' : 'flagged',
      user: a.source || 'network-ingress'
    }));

    res.json({
      host,
      failedLogins24h,
      processes: [
        { pid: 1, name: host.os === 'windows' ? 'System' : 'systemd', cpu: 0.1, memory: 0.2, user: 'system', path: host.os === 'windows' ? 'C:\\Windows\\System32\\ntoskrnl.exe' : '/sbin/init', suspicious: false },
        { pid: 1204, name: host.os === 'windows' ? 'svchost.exe' : 'sshd', cpu: 0.4, memory: 1.1, user: 'system', path: host.os === 'windows' ? 'C:\\Windows\\System32\\svchost.exe' : '/usr/sbin/sshd', suspicious: false },
        { pid: 3042, name: 'encdec-hids-agent', cpu: +(host.cpuUsage * 0.08).toFixed(1), memory: +(host.memoryUsage * 0.05).toFixed(1), user: 'encdec', path: '/opt/encdec/agent', suspicious: false }
      ],
      fileChanges: realFileChanges,
      services: [
        { name: 'encdec-agent', displayName: 'EncDec HIDS Telemetry Agent', status: host.status === 'online' ? 'running' : 'stopped' },
        { name: host.os === 'windows' ? 'WinDefend' : 'sshd', displayName: host.os === 'windows' ? 'Windows Defender Firewall' : 'OpenSSH Secure Shell Daemon', status: host.status === 'online' ? 'running' : 'stopped' }
      ],
      systemCalls: ['sys_openat', 'sys_read', 'sys_write', 'sys_socket', 'sys_connect'],
      usbConnected: false,
      cronJobs: []
    });
  });

  // Rules
  router.get('/rules', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    res.json(dbState.rules);
  });

  router.post('/rules', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const parsed = ruleCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid rule definition';
      return res.status(400).json({ error: err });
    }

    const { name, type, target, severity, definition, mitreMapping } = parsed.data;
    const newRule: Rule = {
      id: 'rul_' + Math.random().toString(36).substring(2, 9),
      name,
      type,
      target,
      severity,
      enabled: true,
      definition,
      mitreMapping: mitreMapping || 'T1190',
      createdAt: new Date().toISOString(),
      createdBy: req.user.email
    };

    dbState.rules.push(newRule);
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Created Security Rule', newRule.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'RULES_UPDATE', payload: dbState.rules });
    res.status(201).json(newRule);
  });

  router.delete('/rules/:id', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const rule = dbState.rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'IDS Rule not found.' });

    dbState.rules = dbState.rules.filter(r => r.id !== req.params.id);
    saveDb();
    firestoreSyncService.deleteDocument('rules', req.params.id);

    addAuditLog(req.user.id, req.user.email, 'Deleted Security Rule', rule.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'RULES_UPDATE', payload: dbState.rules });
    res.json({ success: true });
  });

  router.post('/rules/:id/toggle', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const rule = dbState.rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'IDS Rule not found.' });

    rule.enabled = !rule.enabled;
    saveDb();

    addAuditLog(req.user.id, req.user.email, `${rule.enabled ? 'Enabled' : 'Disabled'} Security Rule`, rule.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'RULES_UPDATE', payload: dbState.rules });
    res.json(rule);
  });

  // Alerts (strictly isolated to user's own enrolled nodes — empty until user enrolls a node)
  router.get('/alerts', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const userHosts = filterHostsForUser(dbState.hosts, req.user?.id);
    res.json(filterAlertsForUser(dbState.alerts, userHosts, req.user?.id));
  });

  router.post('/alerts/:id/resolve', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const alert = dbState.alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });
    const userHosts = filterHostsForUser(dbState.hosts, req.user?.id);
    if (!isAlertOwnedByUser(alert, userHosts, req.user?.id)) {
      return res.status(403).json({ error: 'Access denied: Alert belongs to another user or unowned host.' });
    }

    alert.status = 'resolved';
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Resolved Alert Triage', alert.title, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
    res.json(alert);
  });

  router.post('/alerts/:id/ignore', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const alert = dbState.alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });
    const userHosts = filterHostsForUser(dbState.hosts, req.user?.id);
    if (!isAlertOwnedByUser(alert, userHosts, req.user?.id)) {
      return res.status(403).json({ error: 'Access denied: Alert belongs to another user or unowned host.' });
    }

    alert.status = 'ignored';
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Ignored Alert Triage', alert.title, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
    res.json(alert);
  });

  router.post('/alerts/:id/escalate', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const alert = dbState.alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });
    const userHosts = filterHostsForUser(dbState.hosts, req.user?.id);
    if (!isAlertOwnedByUser(alert, userHosts, req.user?.id)) {
      return res.status(403).json({ error: 'Access denied: Alert belongs to another user or unowned host.' });
    }

    alert.status = 'escalated';
    const newThreat: Threat = {
      id: 'thr_' + Math.random().toString(36).substring(2, 9),
      ownerId: req.user.id,
      timestamp: new Date().toISOString(),
      score: alert.severity === 'critical' ? 95 : alert.severity === 'high' ? 80 : 50,
      actor: 'Detected Intrusive Pivot',
      vector: alert.category,
      status: 'active',
      associatedAlerts: [alert.id],
      mitreMapping: alert.mitreMapping
    };
    dbState.threats.unshift(newThreat);
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Escalated Threat Incident', alert.title, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'THREATS_UPDATE', payload: dbState.threats });
    broadcastWs({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
    res.json(alert);
  });

  // Threats
  router.get('/threats', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const userHosts = filterHostsForUser(dbState.hosts, req.user?.id);
    const userAlerts = filterAlertsForUser(dbState.alerts, userHosts, req.user?.id);
    res.json(filterThreatsForUser(dbState.threats, userHosts, userAlerts, req.user?.id));
  });

  router.post('/threats/:id/mitigate', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const threat = dbState.threats.find(t => t.id === req.params.id);
    if (!threat) return res.status(404).json({ error: 'Threat entry not found.' });

    threat.status = 'mitigated';
    threat.score = 0;
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Neutralized Threat Incident', threat.vector, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'THREATS_UPDATE', payload: dbState.threats });
    res.json(threat);
  });

  // API Keys
  router.get('/apikeys', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    res.json(dbState.apiKeys);
  });

  router.post('/apikeys', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const parsed = apiKeyCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid API key parameters';
      return res.status(400).json({ error: err });
    }

    const { name, role, expiresDays } = parsed.data;
    const plainKey = 'ids_sec_key_' + Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, 16);
    const newKey: APIKey = {
      id: 'key_' + Math.random().toString(36).substring(2, 9),
      name,
      keyPrefix: plainKey.substring(0, 12) + '...',
      role: role || 'agent',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresDays * 86400000).toISOString()
    };

    dbState.apiKeys.push(newKey);
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Generated Secure API Key', name, req.ip || '127.0.0.1', 'success');
    res.status(201).json({ ...newKey, plainTextKey: plainKey });
  });

  router.delete('/apikeys/:id', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const key = dbState.apiKeys.find(k => k.id === req.params.id);
    if (!key) return res.status(404).json({ error: 'API Key not found.' });

    dbState.apiKeys = dbState.apiKeys.filter(k => k.id !== req.params.id);
    saveDb();
    firestoreSyncService.deleteDocument('apiKeys', req.params.id);

    addAuditLog(req.user.id, req.user.email, 'Revoked API Credential', key.name, req.ip || '127.0.0.1', 'success');
    res.json({ success: true });
  });

  // Quarantine
  router.post('/quarantine', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const { hostId, type, targetValue, reason } = req.body;
    if (!hostId || !type || !targetValue || !reason) {
      return res.status(400).json({ error: 'Quarantine payload requirements incomplete.' });
    }

    const newItem: QuarantineItem = {
      id: 'qtn_' + Math.random().toString(36).substring(2, 9),
      hostId,
      type,
      targetValue,
      reason,
      isolatedAt: new Date().toISOString(),
      isolatedBy: req.user.email
    };

    dbState.quarantine.push(newItem);
    saveDb();

    addAuditLog(req.user.id, req.user.email, `Isolated hostile vector (${type})`, `${targetValue} on host ${hostId}`, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'QUARANTINE_UPDATE', payload: dbState.quarantine });
    res.status(201).json(newItem);
  });

  // Reports
  router.get('/reports', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    const storedReports = (dbState as any).reports || [];
    res.json(storedReports);
  });

  router.post('/reports/generate', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const parsed = reportGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid report parameters';
      return res.status(400).json({ error: err });
    }
    const { title, type, timeframe } = parsed.data;

    addAuditLog(req.user.id, req.user.email, `Triggered ${type} Security Report Generation`, title, req.ip || '127.0.0.1', 'success');
    
    const newReport: SecurityReport = {
      id: 'rep_' + Math.random().toString(36).substring(2, 9),
      title,
      type,
      timeframe: timeframe || 'Custom Range',
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.email,
      downloadUrl: '#'
    };

    (dbState as any).reports = (dbState as any).reports || [];
    (dbState as any).reports.unshift(newReport);
    saveDb();

    res.status(201).json(newReport);
  });

  // Admin Portal & Protected routes
  router.get('/admin/system-stats', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') {
      addAuditLog(req.user.id, req.user.email, 'Unauthorized Gate Entry Attempt', 'Isolated Admin Portal', req.ip || '127.0.0.1', 'failure');
      return res.status(403).json({ error: 'Isolated Admin Access Denied: Invalid cryptographic gateway passkey.' });
    }

    res.json({
      users: dbState.users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        mfaEnabled: u.mfaEnabled,
        subscriptionStatus: u.subscriptionStatus || (u.role === 'admin' ? 'active' : 'inactive'),
        subscriptionExpiresAt: u.subscriptionExpiresAt || null,
        subscriptionGrantedBy: u.subscriptionGrantedBy || null,
        subscriptionUpdatedAt: u.subscriptionUpdatedAt || null,
        lastPaymentId: u.lastPaymentId || null,
        certificationStatus: getUserCertificationStatus(u.id, u.email),
      })),
      billingConfig: getNormalizedBillingConfig(),
      payments: dbState.payments || [],
      activeSocketsCount: activeConnections.size,
      auditLogs: dbState.auditLogs,
      liveActivities: dbState.liveActivities,
      dbFileSize: fs.existsSync(dbFilePath) ? fs.statSync(dbFilePath).size : 0
    });
  });

  // Notify uncertified users via live in-app alert + email to complete the EncDec Workbook
  router.post('/admin/users/notify-uncertified', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') {
      return res.status(403).json({ error: 'Gateway Passkey Invalid.' });
    }

    const targetUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    const activeUsers = (dbState.users || []).filter(u => u && u.status !== 'suspended');
    const uncertifiedTargets = activeUsers
      .map(u => ({ user: u, certStatus: getUserCertificationStatus(u.id, u.email) }))
      .filter(({ user, certStatus }) => {
        if (certStatus.isCertified) return false;
        if (targetUserId && user.id !== targetUserId) return false;
        return true;
      });

    if (uncertifiedTargets.length === 0) {
      return res.json({
        success: true,
        notifiedCount: 0,
        message: targetUserId
          ? 'Selected operator is already certified or inactive.'
          : 'All active operators are already certified EncDec Analysts.',
      });
    }

    const emailResults: string[] = [];
    for (const { user, certStatus } of uncertifiedTargets) {
      const reminderText = `Scale through the EncDec Workbook (${certStatus.chaptersCompleted}/${certStatus.totalChapters} chapters completed) and pass the Capstone Knowledge Check (≥ 80%) to become a Certified EncDec Analyst (CE-SOC).`;

      broadcastWs({
        type: 'CERTIFICATION_REMINDER',
        payload: {
          userId: user.id,
          message: reminderText,
          certificationStatus: certStatus,
          sentBy: req.user.email,
          timestamp: new Date().toISOString(),
        },
      });

      const subject = '[EncDec Academy] Complete Your EncDec Workbook to Become a Certified Analyst (CE-SOC)';
      const bodyText = `Hello ${user.name || 'Operator'},\n\nYou are currently ${certStatus.chaptersCompleted} of ${certStatus.totalChapters} chapters through the EncDec Workbook.\n\nNext step: ${certStatus.nextStepLabel}\n\nOpen the EncDec Workbook module in your EncDec IDS console, complete all 10 chapters, and pass the Capstone Knowledge Check (≥ 80%) to receive your official Certified EncDec IDS SOC Specialist (CE-SOC) credential and verifiable QR certificate.\n\n— EncDec Threat Research Lab`;

      const dispatchResult = await sendEmail({
        to: user.email,
        subject,
        text: bodyText,
        html: `<p>Hello <strong>${user.name || 'Operator'}</strong>,</p><p>You have completed <strong>${certStatus.chaptersCompleted} of ${certStatus.totalChapters} chapters</strong> in the EncDec Workbook (${certStatus.progressPercent}% complete).</p><p><strong>Next step:</strong> ${certStatus.nextStepLabel}</p><p>Log in to EncDec IDS, open the <strong>EncDec Workbook</strong>, scale through all 10 chapters, and pass the Capstone Knowledge Check (&ge; 80%) to become a <strong>Certified EncDec Analyst (CE-SOC)</strong>.</p>`,
      }).catch(() => ({ success: false, channel: 'audit_log_only' as const }));

      emailResults.push(dispatchResult.channel);

      if (!dbState.emailLogs) dbState.emailLogs = [];
      dbState.emailLogs.unshift({
        id: 'eml_' + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        recipient: user.email,
        recipientName: user.name,
        senderEmail: req.user.email,
        role: user.role || 'analyst',
        subject,
        bodyText,
        status: dispatchResult.success ? 'sent' : 'queued',
      });
      if (dbState.emailLogs.length > 200) dbState.emailLogs.pop();
    }

    saveDb();
    addAuditLog(
      req.user.id,
      req.user.email,
      'Notified Uncertified Operators for Workbook Certification',
      `${uncertifiedTargets.length} uncertified user(s)`,
      req.ip || '127.0.0.1',
      'success'
    );

    res.json({
      success: true,
      notifiedCount: uncertifiedTargets.length,
      channels: Array.from(new Set(emailResults)),
      message: `Notified ${uncertifiedTargets.length} uncertified operator(s) to complete the EncDec Workbook.`,
    });
  });

  router.post('/admin/users/:id/suspend', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const user = dbState.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Operator record not found.' });

    user.status = 'suspended';
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Suspended User Node', user.email, req.ip || '127.0.0.1', 'success');
    res.json({ success: true, user });
  });

  router.post('/admin/users/:id/unsuspend', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const user = dbState.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Operator record not found.' });

    user.status = 'active';
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Activated Suspended User Node', user.email, req.ip || '127.0.0.1', 'success');
    res.json({ success: true, user });
  });

  router.post('/admin/users/:id/role', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const { role } = req.body;
    const user = dbState.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Operator record not found.' });

    user.role = role;
    saveDb();

    addAuditLog(req.user.id, req.user.email, `Altered Clearance Level to ${role.toUpperCase()}`, user.email, req.ip || '127.0.0.1', 'success');
    res.json({ success: true, user });
  });

  router.delete('/admin/users/:id', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const user = dbState.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Operator record not found.' });

    dbState.users = dbState.users.filter(u => u.id !== req.params.id);
    saveDb();
    firestoreSyncService.deleteDocument('users', req.params.id);

    addAuditLog(req.user.id, req.user.email, 'Purged Operator Profile', user.email, req.ip || '127.0.0.1', 'success');
    res.json({ success: true });
  });

  // Admin Gmail OTP Sender Governance (allows Admin to authorize their Gmail account via OAuth instead of an App Password)
  router.get('/admin/gmail-sender/status', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const gmailApp = getGmailAppConfig();
    res.json({
      ...getAdminGmailSenderStatus(),
      gmailAppConfigured: Boolean(gmailApp),
      gmailAppEmail: gmailApp ? gmailApp.email : null,
    });
  });

  // Lightweight heartbeat for background auto-refresh manager (admin JWT only, no secrets returned)
  router.get('/admin/gmail-sender/heartbeat', authenticateToken, requireRole(['admin']), (_req: any, res: Response) => {
    const gmailApp = getGmailAppConfig();
    res.json({
      ...getAdminGmailSenderStatus(),
      gmailAppConfigured: Boolean(gmailApp),
      gmailAppEmail: gmailApp ? gmailApp.email : null,
    });
  });

  // Switch between Automatic and Manual session refresh mode (persisted in DB)
  router.post('/admin/gmail-sender/mode', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const parsed = adminGmailRefreshModeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid refresh mode.' });
    }

    const mode = parsed.data.refreshMode;
    dbState.adminGmailRefreshMode = mode;
    const status = setAdminGmailRefreshMode(mode);
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      `Set Admin Gmail Session Refresh Mode to ${mode.toUpperCase()}`,
      'Admin Gmail OTP Sender',
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'ADMIN_GMAIL_SENDER_UPDATE', payload: status });

    res.json({
      success: true,
      status,
      message:
        mode === 'auto'
          ? 'Automatic refresh enabled — Admin Gmail OTP session will renew silently before expiration.'
          : 'Manual refresh enabled — click Refresh Admin Gmail Session whenever the session expires.',
    });
  });

  router.post('/admin/gmail-sender/connect', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const accessToken = String(req.body?.googleAccessToken || req.headers['x-google-access-token'] || '').trim();
    if (!accessToken) {
      return res.status(400).json({ error: 'Google OAuth access token is required. Sign in with Google and grant Gmail permissions.' });
    }

    const verification = await verifyGmailOAuthToken(accessToken);
    if (!verification.ok || !verification.email) {
      return res.status(401).json({ error: verification.error || 'Could not verify Admin Gmail permissions.' });
    }

    const silentRefresh = Boolean(req.body?.silentRefresh);
    const status = setAdminGmailSenderSession({
      accessToken,
      email: verification.email,
      userId: req.user.id,
      silentRefresh,
    });
    dbState.adminGmailLastEmail = verification.email;
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Connected Admin Gmail OTP Sender', verification.email, req.ip || '127.0.0.1', 'success', req.user.role);
    broadcastWs({ type: 'ADMIN_GMAIL_SENDER_UPDATE', payload: status });

    res.json({
      success: true,
      status,
      message: `Admin Gmail (${verification.email}) is now active for sending Forgot Password OTP emails (~${status.remainingMinutes} min session).`
    });
  });

  // Background silent refresh endpoint (admin JWT only, requires refreshMode === 'auto')
  router.post('/admin/gmail-sender/auto-refresh', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    if (getAdminGmailRefreshMode() !== 'auto') {
      return res.status(409).json({
        error: 'Admin Gmail session refresh mode is currently set to Manual.',
        status: getAdminGmailSenderStatus(),
      });
    }

    const accessToken = String(req.body?.googleAccessToken || req.headers['x-google-access-token'] || '').trim();
    if (!accessToken) {
      return res.status(400).json({ error: 'Google OAuth access token is required for automatic refresh.' });
    }

    const verification = await verifyGmailOAuthToken(accessToken);
    if (!verification.ok || !verification.email) {
      const errMsg = verification.error || 'Google silent token verification failed.';
      const status = recordAdminGmailAutoRefreshFailure(errMsg);
      broadcastWs({ type: 'ADMIN_GMAIL_SENDER_UPDATE', payload: status });
      return res.status(401).json({ error: errMsg, status });
    }

    const currentStatus = getAdminGmailSenderStatus();
    if (
      currentStatus.lastConnectedEmail &&
      currentStatus.lastConnectedEmail.toLowerCase() !== verification.email.toLowerCase()
    ) {
      const mismatchMsg = `Silent refresh returned ${verification.email}, which does not match configured sender ${currentStatus.lastConnectedEmail}. Please reconnect manually.`;
      const status = recordAdminGmailAutoRefreshFailure(mismatchMsg);
      broadcastWs({ type: 'ADMIN_GMAIL_SENDER_UPDATE', payload: status });
      return res.status(409).json({ error: mismatchMsg, status });
    }

    const status = setAdminGmailSenderSession({
      accessToken,
      email: verification.email,
      userId: req.user.id,
      silentRefresh: true,
    });
    dbState.adminGmailLastEmail = verification.email;
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      'Auto-Refreshed Admin Gmail OTP Sender',
      verification.email,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'ADMIN_GMAIL_SENDER_UPDATE', payload: status });

    res.json({
      success: true,
      status,
      message: `Admin Gmail (${verification.email}) automatically refreshed (~${status.remainingMinutes} min remaining).`,
    });
  });

  // Record when browser silent refresh requires interactive re-authorization
  router.post('/admin/gmail-sender/auto-refresh-error', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const errText = String(req.body?.error || 'Google requires interactive sign-in to renew the Gmail session.').slice(0, 300);
    const status = recordAdminGmailAutoRefreshFailure(errText);
    broadcastWs({ type: 'ADMIN_GMAIL_SENDER_UPDATE', payload: status });
    res.json({ success: true, status });
  });

  router.post('/admin/gmail-sender/disconnect', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    clearAdminGmailSenderSession({ preserveMode: true });
    dbState.adminGmailLastEmail = null;
    saveDb();
    const status = getAdminGmailSenderStatus();
    addAuditLog(req.user.id, req.user.email, 'Disconnected Admin Gmail OTP Sender', 'Admin Gateway', req.ip || '127.0.0.1', 'success', req.user.role);
    broadcastWs({ type: 'ADMIN_GMAIL_SENDER_UPDATE', payload: status });

    res.json({
      success: true,
      status,
      message: 'Admin Gmail OTP sender disconnected.'
    });
  });

  // Audit Logs
  router.get('/audit-logs', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const allLogs = dbState.auditLogs || [];
    if (req.user.role === 'admin') {
      return res.json(allLogs);
    }

    const adminEmails = new Set(
      dbState.users.filter(u => u.role === 'admin').map(u => (u.email || '').toLowerCase())
    );
    const adminIds = new Set(dbState.users.filter(u => u.role === 'admin').map(u => u.id));

    const filteredLogs = allLogs.filter(log => {
      if (log.userRole === 'admin') return false;
      const logEmail = (log.userEmail || '').toLowerCase();
      if (adminEmails.has(logEmail) || logEmail.startsWith('admin') || logEmail.includes('admin@')) {
        return false;
      }
      if (log.userId && adminIds.has(log.userId)) return false;

      const privilegedActions = [
        'altered clearance', 'purged operator', 'suspended user', 'activated suspended',
        'updated sql server', 'forced dual-database', 'isolated admin portal', 'unauthorized gate entry'
      ];
      if (privilegedActions.some(act => (log.action || '').toLowerCase().includes(act))) {
        return false;
      }
      return true;
    });

    res.json(filteredLogs);
  });

  // Email Logs
  router.get('/email-logs', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const allEmails = dbState.emailLogs || [];
    if (req.user.role === 'admin') {
      return res.json(allEmails);
    }

    const userEmail = (req.user.email || '').toLowerCase();
    const userId = req.user.id;

    const scopedEmails = allEmails.filter(email => {
      const isRecipient = (email.recipient || '').toLowerCase() === userEmail;
      const isSender = (email.senderEmail || '').toLowerCase() === userEmail || (email.senderUserId && email.senderUserId === userId);
      return isRecipient || isSender;
    });

    res.json(scopedEmails);
  });

  // System Email Dispatch Handler
  const handleEmailDispatch = async (req: any, res: Response) => {
    const parsed = emailTestSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid email dispatch payload';
      return res.status(400).json({ error: err });
    }

    const { recipient, to, role, type, subject: customSubject, body: customBody, bodyText: customBodyText, bodyHtml: customBodyHtml } = parsed.data;
    const targetRecipient = (recipient || to || req.user.email || '').trim();
    if (!targetRecipient) {
      return res.status(400).json({ error: 'Valid recipient email required' });
    }

    const targetRole = role || 'analyst';
    const eventType = type || 'login';
    const timestamp = new Date().toLocaleString();
    const isoTimestamp = new Date().toISOString();

    let salutation = 'Dear Operator,';
    if (targetRole === 'admin') salutation = 'Dear Admin,';
    else if (targetRole === 'analyst') salutation = 'Dear Analyst,';
    else if (targetRole === 'auditor') salutation = 'Dear Auditor,';

    let finalSubject = customSubject || '';
    let finalText = customBodyText || customBody || '';
    let finalHtml = customBodyHtml || '';

    if (!finalSubject) {
      if (eventType === 'registration') {
        finalSubject = '[EncDec IDS Security] New Operator Account Confirmation';
      } else if (eventType === 'incident') {
        finalSubject = '[EncDec IDS Alert] High Severity Incident Triage Notification';
      } else if (eventType === 'create') {
        finalSubject = '[EncDec IDS Operations] Security Intelligence Bulletin';
      } else {
        finalSubject = '[EncDec IDS Alert] Security Gateway Dispatch Notification';
      }
    }

    if (!finalText) {
      if (eventType === 'registration') {
        finalText = `Welcome to EncDec Intrusion Detection & Threat Intelligence Platform.\n\nYour account has been enrolled under role clearance: ${targetRole.toUpperCase()}.\nRegistration Timestamp: ${timestamp}\nIP Address: ${req.ip || '127.0.0.1'}\n\nPlease enforce Multi-Factor Authentication (MFA) upon initial gateway login.\n\nRegards,\nEncDec Security Operations Team`;
      } else if (eventType === 'incident') {
        finalText = `ATTENTION: A high-priority intrusion or anomaly was detected in the SOC monitor stream.\n\nTarget Recipient: ${targetRecipient}\nEvent Timestamp: ${timestamp}\nNode Origin: ${req.ip || '127.0.0.1'}\n\nPlease log into the EncDec SOC console immediately to inspect network telemetry.\n\nRegards,\nEncDec Security Operations Team`;
      } else if (eventType === 'create') {
        finalText = `This is a custom operational dispatch from the EncDec SOC Console.\n\nPlease review system activity and maintain operational vigilance.`;
      } else {
        finalText = `A security gateway notification has been dispatched for your operator identity (${targetRecipient}).\n\nNotification Timestamp: ${timestamp}\nNode Origin: ${req.ip || '127.0.0.1'}\nRole Clearance: ${targetRole.toUpperCase()}\n\nRegards,\nEncDec Security Operations Team`;
      }
    }

    if (!finalHtml) {
      finalHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 8px; border: 1px solid #1e293b; max-width: 600px;">
          <div style="display: flex; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #06b6d4; margin: 0; font-size: 20px;">EncDec IDS Security Operations</h2>
          </div>
          <p style="font-size: 15px; font-weight: bold; color: #38bdf8; margin-top: 0;">${salutation}</p>
          <div style="font-size: 14px; line-height: 1.6; color: #e2e8f0; margin-bottom: 20px; white-space: pre-wrap;">${finalText.replace(/\n/g, '<br/>')}</div>
          <div style="background: #1e293b; padding: 14px; border-radius: 6px; border-left: 4px solid #06b6d4; margin: 16px 0; font-size: 13px;">
            <p style="margin: 4px 0;"><strong>Recipient:</strong> ${targetRecipient}</p>
            <p style="margin: 4px 0;"><strong>Assigned Role:</strong> <span style="color: #38bdf8;">${targetRole.toUpperCase()}</span></p>
            <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${timestamp}</p>
            <p style="margin: 4px 0;"><strong>Origin Node:</strong> ${req.ip || '127.0.0.1'}</p>
            <p style="margin: 4px 0;"><strong>Sender Clearance:</strong> <span style="color: #34d399;">${(req.user.role || 'OPERATOR').toUpperCase()}</span></p>
          </div>
          <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">EncDec Autonomous Hybrid IDS • Enterprise Cyber Defense Platform</p>
        </div>
      `;
    }

    const logEntry: EmailLog = {
      id: 'eml_' + Math.random().toString(36).substring(2, 9),
      recipient: targetRecipient,
      recipientName: targetRecipient.split('@')[0],
      senderEmail: req.user.email,
      senderUserId: req.user.id,
      subject: finalSubject,
      eventType,
      type: eventType,
      role: targetRole,
      status: 'queued',
      timestamp: isoTimestamp,
      previewSnippet: finalText.substring(0, 110) + '...',
      bodyText: finalText,
      htmlBody: finalHtml
    };

    // Send via prioritized email pipeline (User OAuth, connected Admin Gmail OAuth, Gmail App Password, SMTP)
    const googleAccessToken = req.body.googleAccessToken || req.headers['x-google-access-token'];
    const adminSender = getActiveAdminGmailSender();
    const initialToken = googleAccessToken || adminSender?.accessToken;
    const usingAdminInitially = !googleAccessToken && Boolean(adminSender);
    let dispatchResult: any = { success: true, channel: 'audit_log_only' };
    
    try {
      dispatchResult = await sendEmail({
        to: targetRecipient,
        subject: finalSubject,
        text: finalText,
        html: finalHtml,
        fromName: req.user.name || 'EncDec IDS SOC Security',
        fromEmail: usingAdminInitially ? adminSender?.email : req.user.email,
        googleAccessToken: initialToken,
        preferOAuth: Boolean(initialToken),
      });

      if (
        dispatchResult.channel === 'audit_log_only' &&
        adminSender?.accessToken &&
        googleAccessToken &&
        adminSender.accessToken !== googleAccessToken
      ) {
        dispatchResult = await sendEmail({
          to: targetRecipient,
          subject: finalSubject,
          text: finalText,
          html: finalHtml,
          fromName: 'EncDec IDS SOC Security',
          fromEmail: adminSender.email,
          googleAccessToken: adminSender.accessToken,
          preferOAuth: true,
        });
        if (dispatchResult.channel === 'gmail_oauth_api') {
          logEntry.senderEmail = adminSender.email;
          logEntry.senderUserId = adminSender.connectedByUserId;
        }
      } else if (usingAdminInitially && adminSender && dispatchResult.channel === 'gmail_oauth_api') {
        logEntry.senderEmail = adminSender.email;
        logEntry.senderUserId = adminSender.connectedByUserId;
      }

      if (dispatchResult.oauthExpired && (!googleAccessToken || usingAdminInitially)) {
        markAdminGmailSessionExpired('Admin Gmail OAuth session expired. Reconnect Admin Gmail to resume delivery.');
      }
    } catch (err: any) {
      console.warn(`[EMAIL DISPATCH NOTICE] ${err?.message || err}`);
      dispatchResult = { success: false, channel: 'audit_log_only', error: err?.message };
    }

    const deliveredToGmail =
      dispatchResult.channel === 'gmail_oauth_api' ||
      dispatchResult.channel === 'gmail_app_password' ||
      dispatchResult.channel === 'smtp';

    logEntry.status = deliveredToGmail ? 'delivered' : 'queued';

    if (!dbState.emailLogs) {
      dbState.emailLogs = [];
    }
    dbState.emailLogs.unshift(logEntry);
    if (dbState.emailLogs.length > 300) {
      dbState.emailLogs.pop();
    }
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Dispatched System Email', `${targetRecipient} [${targetRole.toUpperCase()}]`, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'EMAIL_LOG_UPDATE', payload: logEntry });

    const channelDescriptions: Record<string, string> = {
      gmail_app_password: '✅ Delivered directly to Gmail inbox via Gmail App Password.',
      gmail_oauth_api: '✅ Delivered directly to Gmail inbox via Google Workspace OAuth.',
      smtp: '✅ Delivered via SMTP Relay Server.',
      audit_log_only: 'ℹ️ Recorded in SOC Audit Trail (no active Gmail sender session yet).'
    };

    res.status(200).json({
      success: true,
      deliveredToGmail,
      message: channelDescriptions[dispatchResult.channel] || `System email dispatched to ${targetRecipient}`,
      channel: dispatchResult.channel,
      deliveryDetails: dispatchResult.details,
      email: logEntry,
      subject: finalSubject,
      bodyText: finalText,
      bodyHtml: finalHtml
    });
  };

  router.get('/email-logs/config-status', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    const gmailApp = getGmailAppConfig();
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    
    res.json({
      gmailAppConfigured: Boolean(gmailApp),
      gmailAppUser: gmailApp ? gmailApp.email.replace(/(?<=.{3}).(?=.*@)/g, '*') : null,
      smtpConfigured: hasSmtp,
      smtpHost: process.env.SMTP_HOST || null
    });
  });

  router.post('/email-logs/verify-gmail', authenticateToken, requireActiveSubscription, async (_req: any, res: Response) => {
    const verification = await verifyGmailAppConnection();
    res.json(verification);
  });

  router.post('/email-logs/send', authenticateToken, requireActiveSubscription, handleEmailDispatch);
  router.post('/email-logs/test', authenticateToken, requireActiveSubscription, handleEmailDispatch);

  // AI Email Generation with multi-model fallback & graceful handling
  router.post('/email-logs/generate-ai', authenticateToken, requireActiveSubscription, async (req: any, res: Response) => {
    const parsed = aiEmailGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid AI prompt payload';
      return res.status(400).json({ error: err });
    }

    const { prompt, recipient, role = 'analyst', type = 'create', tone = 'professional' } = parsed.data;
    const targetRecipient = recipient || req.user.email || 'operator@enterprise.sec';

    let subject = '';
    let body = '';
    let modelUsed = '';

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `You are an expert AI SOC Cybersecurity Assistant for the EncDec Autonomous Hybrid IDS & Threat Defense Platform.
Your job is to draft concise, professional, cyber-resilient security emails for security operators, administrators, analysts, and incident responders.
Tone: ${tone}.
Recipient: ${targetRecipient} (Role: ${role.toUpperCase()}).
Email category: ${type.toUpperCase()}.

Generate a high-quality email draft. Do NOT include generic greetings like "Dear Admin," or footer signatures in the body, as the platform's header/footer templating engine automatically formats and attaches them. Focus on the core message body (clear actionable facts, incident notes, instructions, or advisories).
Respond with a JSON object conforming to this schema:
{
  "subject": "Concise Subject Line",
  "body": "Clear informative body text"
}`;

      // Try multiple models in order if one experiences high demand (503) or transient unavailability
      const candidateModels = ['gemini-2.5-flash', 'gemini-3.7-flash'];

      for (const modelName of candidateModels) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: modelName,
            contents: `Draft a SOC security email based on this operator instruction: "${prompt}".`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, description: 'The concise, professional email subject line' },
                  body: { type: Type.STRING, description: 'The email body text without salutation/signature' }
                },
                required: ['subject', 'body']
              }
            }
          });

          const responseText = aiResponse.text?.trim() || '{}';
          try {
            const parsedJson = JSON.parse(responseText);
            if (parsedJson.subject && parsedJson.body) {
              subject = parsedJson.subject;
              body = parsedJson.body;
              modelUsed = modelName;
              break; // Success!
            }
          } catch {
            if (responseText && responseText !== '{}') {
              subject = `[EncDec IDS Advisory] ${prompt.substring(0, 45)}...`;
              body = responseText;
              modelUsed = modelName;
              break;
            }
          }
        } catch (modelErr: any) {
          console.warn(`[AI Drafter] Model ${modelName} notice: ${modelErr?.message || modelErr}. Trying fallback...`);
        }
      }
    }

    // High-fidelity fallback heuristic if AI API is unavailable or experiencing temporary high demand
    if (!body) {
      const pLower = prompt.toLowerCase();
      if (pLower.includes('isolate') || pLower.includes('threat') || pLower.includes('incident') || pLower.includes('attack') || pLower.includes('smb') || pLower.includes('scan')) {
        subject = `[EncDec IDS Alert] High-Priority Threat Containment & Node Isolation Directive`;
        body = `A critical anomaly matching the following parameters has been recorded in the active SOC telemetry stream:\n\n"${prompt}"\n\nREQUIRED ACTION:\n1. Immediately review egress socket activity and process hashes on flagged endpoints.\n2. Enforce local perimeter firewall containment.\n3. Report node remediation status back to the SOC security dispatch console.`;
      } else if (pLower.includes('mfa') || pLower.includes('password') || pLower.includes('auth') || pLower.includes('key') || pLower.includes('token')) {
        subject = `[EncDec IDS Security] Mandatory Authentication Policy & Credential Rotation`;
        body = `In accordance with university cybersecurity governance directives regarding:\n\n"${prompt}"\n\nAll operators with ${role.toUpperCase()} clearance must update credentials and confirm active enrollment of Hardware / TOTP Multi-Factor Authentication within 24 hours.`;
      } else if (pLower.includes('register') || pLower.includes('welcome') || pLower.includes('onboard') || pLower.includes('account') || pLower.includes('clearance')) {
        subject = `[EncDec IDS Gateway] Security Operator Clearance & Gateway Access Notice`;
        body = `Your operator identity has been provisioned on the EncDec IDS Platform with ${role.toUpperCase()} clearance.\n\nOnboarding Notes:\n"${prompt}"\n\nPlease authenticate via the EncDec Gateway, configure your cryptographic passkeys, and review the live network telemetry stream.`;
      } else if (pLower.includes('sync') || pLower.includes('database') || pLower.includes('audit') || pLower.includes('mssql') || pLower.includes('firestore')) {
        subject = `[EncDec IDS Systems] Database Synchronization & Dual-Replication Status`;
        body = `System verification bulletin regarding dual-database replication:\n\n"${prompt}"\n\nBoth MSSQL and Firebase Firestore persistence layers are operating within compliance tolerances. No manual intervention is required at this time.`;
      } else {
        subject = `[EncDec IDS Advisory] SOC Security Intelligence Dispatch`;
        body = `This is an official security bulletin from the EncDec SOC Operations Console regarding:\n\n"${prompt}"\n\nPlease review network telemetry graphs, inspect alert logs, and maintain operational compliance.`;
      }
    }

    res.json({
      success: true,
      subject,
      body,
      role,
      type,
      modelUsed: modelUsed || 'heuristic-engine'
    });
  });

  // Database Management
  router.get('/database/status', authenticateToken, requireRole(['admin']), async (_req: any, res: Response) => {
    const tableCounts = {
      users: dbState.users.length,
      alerts: dbState.alerts.length,
      auditLogs: dbState.auditLogs.length,
      emailLogs: (dbState.emailLogs || []).length,
      rules: dbState.rules.length,
      hosts: dbState.hosts.length,
      threatIntel: dbState.threatIntel.length
    };

    const status: DualDatabaseStatus = {
      firebase: {
        enabled: firestoreSyncService.isConnected,
        connected: firestoreSyncService.isConnected,
        projectId: 'ai-studio-encdecids-bc136ca4-82a5-408e-ae8f-57533ab6060c',
        databaseId: '(default)',
        collectionsCount: 12,
        lastSynced: new Date().toISOString()
      },
      mssql: {
        enabled: mssqlSyncService.config.enabled,
        connected: mssqlSyncService.isConnected,
        server: mssqlSyncService.config.server,
        database: mssqlSyncService.config.database,
        authType: mssqlSyncService.config.authType,
        domain: mssqlSyncService.config.domain,
        user: mssqlSyncService.config.user,
        lastSynced: mssqlSyncService.getLastSynced || undefined,
        tableCounts,
        error: mssqlSyncService.getLastError || undefined
      }
    };

    res.json({ status, config: { ...mssqlSyncService.config, password: mssqlSyncService.config.password ? '••••••••' : '' } });
  });

  router.post('/database/mssql/configure', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    const parsed = mssqlConfigureSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid MSSQL configuration';
      return res.status(400).json({ error: err });
    }

    const cfg = parsed.data as MssqlConfig;
    const result = await mssqlSyncService.init(cfg);
    if (result.success && cfg.enabled) {
      await mssqlSyncService.syncAll(dbState);
    }

    addAuditLog(req.user.id, req.user.email, 'Updated SQL Server Database Configuration', `${cfg.server}/${cfg.database}`, req.ip || '127.0.0.1', 'success');

    res.json({
      success: true,
      connected: mssqlSyncService.isConnected,
      error: mssqlSyncService.getLastError,
      config: { ...mssqlSyncService.config, password: mssqlSyncService.config.password ? '••••••••' : '' }
    });
  });

  router.post('/database/mssql/test-connection', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    const parsed = mssqlConfigureSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid connection parameters';
      return res.status(400).json({ error: err });
    }

    const result = await mssqlSyncService.init(parsed.data as MssqlConfig);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }
    res.json({ success: true, message: 'Successfully connected to Microsoft SQL Server' });
  });

  router.post('/database/mssql/reset-standby', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    mssqlSyncService.resetToStandby();
    addAuditLog(req.user.id, req.user.email, 'Reset SQL Server to Standby / Pure Cloud Mode', 'MSSQL Engine', req.ip || '127.0.0.1', 'success');
    res.json({
      success: true,
      connected: false,
      error: null,
      message: 'SQL Server returned to Standby mode. EncDec IDS is running with Cloud Firestore & local persistence.'
    });
  });

  router.post('/database/mssql/sync-now', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    try {
      firestoreSyncService.triggerSync(dbState);
      if (mssqlSyncService.isConnected) {
        await mssqlSyncService.syncAll(dbState);
      }

      addAuditLog(req.user.id, req.user.email, 'Forced Dual-Database Synchronization (Firebase + SQL Server)', 'Dual Database Sync Engine', req.ip || '127.0.0.1', 'success');

      res.json({
        success: true,
        message: 'Dual-database synchronization cycle completed successfully.',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/database/mssql/query', authenticateToken, requireRole(['admin']), async (req: any, res: Response) => {
    const parsed = mssqlQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'SQL query string required' });
    }

    const { query } = parsed.data;
    const trimmed = query.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('EXEC SP_HELP') && !trimmed.startsWith('EXEC SP_COLUMNS')) {
      return res.status(403).json({ error: 'Only read-only inspection queries (SELECT) are permitted in this console.' });
    }

    if (mssqlSyncService.isConnected) {
      try {
        const rows = await mssqlSyncService.executeQuery(query);
        return res.json({
          source: 'Microsoft SQL Server (Live TDS)',
          rows,
          count: rows.length,
          columns: rows.length > 0 ? Object.keys(rows[0]) : []
        });
      } catch (err: any) {
        return res.status(400).json({ error: `SQL Server execution error: ${err.message}` });
      }
    }

    // Fallback to local table inspection
    let fallbackRows: any[] = [];
    if (trimmed.includes('ALERT') || trimmed.includes('SECURITYALERTS')) {
      fallbackRows = dbState.alerts;
    } else if (trimmed.includes('AUDIT')) {
      fallbackRows = dbState.auditLogs;
    } else if (trimmed.includes('USER')) {
      fallbackRows = dbState.users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, mfaEnabled: u.mfaEnabled }));
    } else if (trimmed.includes('HOST')) {
      fallbackRows = dbState.hosts;
    } else {
      fallbackRows = dbState.rules;
    }

    res.json({
      source: 'EncDec Local Data Engine (Fallback Mirror)',
      rows: fallbackRows.slice(0, 50),
      count: fallbackRows.length,
      columns: fallbackRows.length > 0 ? Object.keys(fallbackRows[0]) : []
    });
  });

  // --- ENTERPRISE INCIDENT MANAGEMENT ---
  router.get('/incidents', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    res.json(dbState.incidents || []);
  });

  router.get('/incidents/:id', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const inc = (dbState.incidents || []).find(i => i.id === req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incident not found' });
    res.json(inc);
  });

  router.post('/incidents/:id/status', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const inc = (dbState.incidents || []).find(i => i.id === req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incident not found' });

    const { status } = req.body;
    if (!['new', 'investigating', 'contained', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid incident status' });
    }

    inc.status = status;
    saveDb();

    addAuditLog(req.user.id, req.user.email, `Updated Incident Status to ${status.toUpperCase()}`, inc.id, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'INCIDENTS_UPDATE', payload: dbState.incidents });
    res.json(inc);
  });

  router.post('/incidents/:id/notes', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const inc = (dbState.incidents || []).find(i => i.id === req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incident not found' });

    const { note } = req.body;
    if (!note || typeof note !== 'string') {
      return res.status(400).json({ error: 'Note content is required' });
    }

    if (!inc.analystNotes) inc.analystNotes = [];
    const formattedNote = `[${new Date().toISOString()} - ${req.user.name || req.user.email}]: ${note}`;
    inc.analystNotes.push(formattedNote);
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Added Incident Analyst Note', inc.id, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'INCIDENTS_UPDATE', payload: dbState.incidents });
    res.json(inc);
  });

  // --- CONTROLLED ACTIVE RESPONSE ---
  router.get('/responses', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    res.json(dbState.activeResponses || []);
  });

  router.post('/responses/:id/approve', authenticateToken, requireActiveSubscription, requireRole(['admin', 'operator']), (req: any, res: Response) => {
    const resp = (dbState.activeResponses || []).find(r => r.id === req.params.id);
    if (!resp) return res.status(404).json({ error: 'Response action not found' });

    resp.status = 'executed';
    resp.approvedBy = req.user.email;
    resp.executedAt = new Date().toISOString();
    resp.resultOutput = `Action ${resp.actionType.toUpperCase()} executed successfully. Verified by kernel firewall / process manager.`;

    // If IP block, add to quarantine if not present
    if (resp.actionType === 'block_ip') {
      dbState.quarantine.push({
        id: 'q_' + Math.random().toString(36).substring(2, 7),
        hostId: 'perimeter-firewall',
        type: 'ip',
        targetValue: resp.target,
        reason: resp.reason,
        isolatedAt: new Date().toISOString(),
        isolatedBy: req.user.email
      });
    }

    saveDb();
    addAuditLog(req.user.id, req.user.email, `Approved & Executed Active Response [${resp.actionType.toUpperCase()}]`, resp.target, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'ACTIVE_RESPONSES_UPDATE', payload: dbState.activeResponses });
    broadcastWs({ type: 'QUARANTINE_UPDATE', payload: dbState.quarantine });
    res.json(resp);
  });

  router.post('/responses/:id/reject', authenticateToken, requireActiveSubscription, requireRole(['admin', 'operator']), (req: any, res: Response) => {
    const resp = (dbState.activeResponses || []).find(r => r.id === req.params.id);
    if (!resp) return res.status(404).json({ error: 'Response action not found' });

    resp.status = 'rejected';
    resp.approvedBy = req.user.email;
    resp.executedAt = new Date().toISOString();
    resp.resultOutput = 'Action rejected by SOC analyst.';

    saveDb();
    addAuditLog(req.user.id, req.user.email, `Rejected Active Response [${resp.actionType.toUpperCase()}]`, resp.target, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'ACTIVE_RESPONSES_UPDATE', payload: dbState.activeResponses });
    res.json(resp);
  });

  // --- SENSORS & HEALTH ---
  router.get('/sensors', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    res.json(dbState.sensors || []);
  });

  // --- RAW SECURITY EVENTS STREAM (THREAT HUNTING) ---
  router.get('/security-events', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const q = (req.query.q as string || '').toLowerCase();
    const seen = new Set<string>();
    let events = (dbState.securityEvents || []).filter(e => {
      if (!e || !e.id || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    if (q) {
      events = events.filter(e => 
        (e.sourceIp && e.sourceIp.includes(q)) ||
        (e.destIp && e.destIp.includes(q)) ||
        (e.eventType && e.eventType.toLowerCase().includes(q)) ||
        (e.mitre?.technique && e.mitre.technique.toLowerCase().includes(q)) ||
        (e.details && JSON.stringify(e.details).toLowerCase().includes(q))
      );
    }
    res.json(events.slice(0, 100));
  });

  // --- THREAT INTELLIGENCE ENRICHMENT ---
  router.post('/enrich-ip', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address required' });

    // Internal lookup
    const feed = (dbState.threatIntel || []).find(f => f.type === 'ip' && f.value === ip);
    let reputation = 'Benign / Unclassified';
    let threatScore = 15;
    let country = 'United States';
    let city = 'Ashburn';
    let asn = 'AS14618 Amazon.com';

    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('127.')) {
      country = 'Local Subnet';
      city = 'Internal Subnet';
      asn = 'RFC1918 Private';
      threatScore = 0;
      reputation = 'Internal Asset';
    } else if (ip.startsWith('185.220.') || ip.startsWith('198.51.')) {
      country = 'Germany';
      city = 'Frankfurt';
      asn = 'AS24940 Hetzner Online GmbH';
      threatScore = 94;
      reputation = 'Known Tor Exit / Malicious Scanner';
    } else if (ip.startsWith('105.112.') || ip.startsWith('197.210.')) {
      country = 'Nigeria';
      city = 'Lagos';
      asn = 'AS37108 MTN Nigeria';
      threatScore = 20;
      reputation = 'Regional ISP';
    }

    if (feed) {
      threatScore = feed.confidence || 90;
      reputation = `Threat Intel Match: ${feed.threatType} (${feed.source})`;
    }

    res.json({
      ip,
      country,
      city,
      asn,
      threatScore,
      reputation,
      isKnownThreat: threatScore >= 70,
      feedMatch: feed || null
    });
  });

  // --- MITRE ATT&CK COVERAGE MATRIX ---
  router.get('/mitre-coverage', authenticateToken, requireActiveSubscription, (_req: any, res: Response) => {
    const tactics = [
      { tactic: 'Reconnaissance', techniques: ['T1046', 'T1595', 'T1592'], covered: 2, total: 3 },
      { tactic: 'Initial Access', techniques: ['T1190', 'T1133', 'T1566'], covered: 3, total: 3 },
      { tactic: 'Execution', techniques: ['T1059', 'T1059.004', 'T1204'], covered: 3, total: 3 },
      { tactic: 'Persistence', techniques: ['T1053', 'T1053.003', 'T1098'], covered: 2, total: 3 },
      { tactic: 'Privilege Escalation', techniques: ['T1068', 'T1548', 'T1547'], covered: 2, total: 3 },
      { tactic: 'Defense Evasion', techniques: ['T1070', 'T1036', 'T1562'], covered: 2, total: 3 },
      { tactic: 'Credential Access', techniques: ['T1110', 'T1110.001', 'T1003'], covered: 3, total: 3 },
      { tactic: 'Discovery', techniques: ['T1082', 'T1083', 'T1087'], covered: 2, total: 3 },
      { tactic: 'Lateral Movement', techniques: ['T1021', 'T1570', 'T1550'], covered: 2, total: 3 },
      { tactic: 'Collection', techniques: ['T1005', 'T1114', 'T1039'], covered: 1, total: 3 },
      { tactic: 'Command & Control', techniques: ['T1071', 'T1572', 'T1090'], covered: 3, total: 3 },
      { tactic: 'Exfiltration', techniques: ['T1041', 'T1048', 'T1567'], covered: 2, total: 3 },
      { tactic: 'Impact', techniques: ['T1485', 'T1486', 'T1498'], covered: 2, total: 3 },
    ];

    const totalCovered = tactics.reduce((acc, t) => acc + t.covered, 0);
    const totalPossible = tactics.reduce((acc, t) => acc + t.total, 0);
    const overallPercentage = Math.round((totalCovered / totalPossible) * 100);

    res.json({
      overallPercentage,
      totalTactics: tactics.length,
      tactics
    });
  });

  // --- WORKBOOK READING, ANTI-MALPRACTICE TIMED EXAM & CERTIFICATION ---
  const TOTAL_CHAPTERS_COUNT = 10;
  const recentIssuedQuestionSets: string[][] = [];

  const getExamBank = (): ExamQuestion[] => {
    return getMergedExamBank(dbState.customExamQuestions);
  };

  const findWorkbookProgressRecord = (userId: string, userEmail?: string): WorkbookProgress | null => {
    if (!dbState.workbookProgress) {
      dbState.workbookProgress = [];
    }
    const emailLower = (userEmail || '').trim().toLowerCase();
    return (
      dbState.workbookProgress.find(
        (p) => p.userId === userId || (emailLower && p.email && p.email.toLowerCase() === emailLower)
      ) || null
    );
  };

  const getOrCreateWorkbookProgress = (userId: string, userEmail: string): WorkbookProgress => {
    let record = findWorkbookProgressRecord(userId, userEmail);
    if (!record) {
      record = {
        id: `wp_${userId}`,
        userId,
        email: userEmail,
        chapterIndex: 0,
        paragraphIndex: 0,
        chapterTitle: 'System Architecture & Core Philosophy',
        readChapters: [],
        completed: false,
        quizScore: 0,
        quizPassed: false,
        lastReadAt: new Date().toISOString(),
        activeExam: null,
        seenQuestionIds: [],
        lastResetReason: null,
        lastResetAt: null,
        lastExamScore: null,
        examAttemptsCount: 0,
      };
      dbState.workbookProgress!.push(record);
    }
    return record;
  };

  const recordSeenQuestionIds = (record: WorkbookProgress, questionIds: string[], totalBankSize: number) => {
    const existing = Array.isArray(record.seenQuestionIds) ? [...record.seenQuestionIds] : [];
    for (const qId of questionIds) {
      if (!existing.includes(qId)) {
        existing.push(qId);
      }
    }
    // Keep at most totalBankSize - EXAM_QUESTIONS_COUNT so candidate rotates cleanly through entire 220+ pool
    const maxHistory = Math.max(0, totalBankSize - EXAM_QUESTIONS_COUNT);
    record.seenQuestionIds = existing.length > maxHistory ? existing.slice(existing.length - maxHistory) : existing;
  };

  const resetWorkbookToChapterOne = (
    record: WorkbookProgress,
    reason: 'timeout' | 'score_below_80',
    lastScore: number | null
  ) => {
    const nowIso = new Date().toISOString();
    record.chapterIndex = 0;
    record.paragraphIndex = 0;
    record.chapterTitle = 'System Architecture & Core Philosophy';
    record.readChapters = [];
    record.completed = false;
    record.quizPassed = false;
    record.quizScore = 0;
    record.activeExam = null;
    record.lastResetReason = reason;
    record.lastResetAt = nowIso;
    record.lastExamScore = lastScore;
    record.lastReadAt = nowIso;
  };

  const sanitizeProgressForClient = (record: WorkbookProgress | null) => {
    if (!record) return null;
    const { activeExam, ...rest } = record;
    return {
      ...rest,
      hasActiveExam: Boolean(activeExam),
      activeExamMeta: activeExam
        ? {
            attemptId: activeExam.attemptId,
            startedAt: activeExam.startedAt,
            expiresAt: activeExam.expiresAt,
            totalSeconds: activeExam.totalSeconds,
            remainingSeconds: Math.max(0, Math.ceil((activeExam.expiresAt - Date.now()) / 1000)),
          }
        : null,
    };
  };

  const enforceActiveExamExpiration = (
    record: WorkbookProgress | null,
    user: { id: string; email: string; role?: string },
    ipAddress: string
  ): { expired: boolean; reason?: 'timeout' } => {
    if (!record?.activeExam) {
      return { expired: false };
    }
    if (Date.now() <= record.activeExam.expiresAt) {
      return { expired: false };
    }

    const bank = getExamBank();
    recordSeenQuestionIds(record, record.activeExam.questionIds || [], bank.length);
    resetWorkbookToChapterOne(record, 'timeout', 0);
    saveDb();

    addAuditLog(
      user.id,
      user.email,
      'Certification Exam Timed Out (>10m) — Workbook Reset to Chapter 1',
      'CE-SOC Examination Policy Enforcement',
      ipAddress,
      'failure',
      user.role
    );

    const certificationStatus = getUserCertificationStatus(user.id, user.email);
    broadcastWs({
      type: 'CERTIFICATION_STATUS_UPDATE',
      payload: {
        userId: user.id,
        certificationStatus,
      },
    });

    return { expired: true, reason: 'timeout' };
  };

  // Admin Question Bank Governance Endpoints (200+ tough questions with answers)
  router.get('/admin/workbook/question-bank', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const bank = getExamBank();
    const chapterCounts: Record<number, number> = {};
    for (let ch = 1; ch <= TOTAL_CHAPTERS_COUNT; ch++) chapterCounts[ch] = 0;
    for (const q of bank) {
      chapterCounts[q.chapterNumber] = (chapterCounts[q.chapterNumber] || 0) + 1;
    }

    res.json({
      success: true,
      totalQuestions: bank.length,
      builtInCount: bank.filter((q) => !q.isCustom).length,
      customCount: bank.filter((q) => Boolean(q.isCustom)).length,
      questionsPerExam: EXAM_QUESTIONS_COUNT,
      durationSeconds: EXAM_DURATION_SECONDS,
      passThresholdPercent: EXAM_PASS_THRESHOLD_PERCENT,
      chapterBreakdown: chapterCounts,
      questions: bank,
    });
  });

  router.post('/admin/workbook/question-bank', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const parsed = adminExamQuestionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid exam question payload.' });
    }

    if (!Array.isArray(dbState.customExamQuestions)) {
      dbState.customExamQuestions = [];
    }

    const chapterTitles: Record<number, string> = {
      1: 'Chapter 1: System Architecture & Core Philosophy',
      2: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
      3: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
      4: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
      5: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
      6: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
      7: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
      8: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
      9: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
      10: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    };

    const nextNum = dbState.customExamQuestions.length + 1;
    const newQuestion: ExamQuestion = {
      id: `Q-CUSTOM-${String(nextNum).padStart(3, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      chapterNumber: parsed.data.chapterNumber,
      topic: chapterTitles[parsed.data.chapterNumber] || `Chapter ${parsed.data.chapterNumber}`,
      difficulty: parsed.data.difficulty,
      question: parsed.data.question,
      options: [
        parsed.data.options[0],
        parsed.data.options[1],
        parsed.data.options[2],
        parsed.data.options[3],
      ],
      correctIndex: parsed.data.correctIndex,
      explanation: parsed.data.explanation,
      isCustom: true,
    };

    dbState.customExamQuestions.unshift(newQuestion);
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      'Added Custom Certification Exam Question',
      `${newQuestion.id} (Chapter ${newQuestion.chapterNumber})`,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );

    const bank = getExamBank();
    res.status(201).json({
      success: true,
      question: newQuestion,
      totalQuestions: bank.length,
    });
  });

  router.get('/workbook/certification-status', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const record = findWorkbookProgressRecord(req.user.id, req.user.email);
    enforceActiveExamExpiration(record, req.user, req.ip || '127.0.0.1');
    const certificationStatus = getUserCertificationStatus(req.user.id, req.user.email);
    res.json({
      success: true,
      certificationStatus,
    });
  });

  router.get('/workbook/progress', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const progress = findWorkbookProgressRecord(req.user.id, req.user.email);
    const expiryCheck = enforceActiveExamExpiration(progress, req.user, req.ip || '127.0.0.1');

    res.json({
      progress: sanitizeProgressForClient(progress),
      examTimedOutReset: expiryCheck.expired,
      certificationStatus: getUserCertificationStatus(req.user.id, req.user.email),
    });
  });

  router.post('/workbook/progress', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    if (!dbState.workbookProgress) {
      dbState.workbookProgress = [];
    }

    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();
    const {
      chapterIndex,
      paragraphIndex,
      chapterTitle,
      readChapters,
    } = req.body || {};

    const existingIdx = dbState.workbookProgress.findIndex(
      (p) => p.userId === userId || (p.email && p.email.toLowerCase() === userEmail)
    );
    const prevRecord = existingIdx >= 0 ? dbState.workbookProgress[existingIdx] : null;

    if (prevRecord) {
      const expiryCheck = enforceActiveExamExpiration(prevRecord, req.user, req.ip || '127.0.0.1');
      if (expiryCheck.expired) {
        return res.json({
          success: true,
          examTimedOutReset: true,
          progress: sanitizeProgressForClient(prevRecord),
          certificationStatus: getUserCertificationStatus(userId, req.user.email),
        });
      }
    }

    const safeChapterIndex =
      typeof chapterIndex === 'number'
        ? Math.min(TOTAL_CHAPTERS_COUNT - 1, Math.max(0, Math.floor(chapterIndex)))
        : 0;
    const safeParagraphIndex =
      typeof paragraphIndex === 'number' ? Math.max(0, Math.floor(paragraphIndex)) : 0;

    const validChapterSet = new Set<number>();
    if (Array.isArray(readChapters)) {
      for (const ch of readChapters) {
        if (typeof ch === 'number' && Number.isInteger(ch) && ch >= 0 && ch < TOTAL_CHAPTERS_COUNT) {
          validChapterSet.add(ch);
        }
      }
    }
    const safeReadChapters = Array.from(validChapterSet).sort((a, b) => a - b);

    // Server-authoritative certification guard: client cannot self-grant quizPassed/completed here
    const authoritativeQuizPassed = prevRecord?.quizPassed ?? false;
    const authoritativeQuizScore = prevRecord?.quizScore ?? 0;
    const authoritativeCompleted = Boolean((prevRecord?.completed ?? false) && authoritativeQuizPassed);

    const record: WorkbookProgress = {
      id: prevRecord ? prevRecord.id : `wp_${userId}`,
      userId,
      email: req.user.email,
      chapterIndex: safeChapterIndex,
      paragraphIndex: safeParagraphIndex,
      chapterTitle: chapterTitle || `Chapter ${safeChapterIndex + 1}`,
      readChapters: safeReadChapters,
      completed: authoritativeCompleted,
      quizScore: authoritativeQuizScore,
      quizPassed: authoritativeQuizPassed,
      lastReadAt: new Date().toISOString(),
      activeExam: prevRecord?.activeExam ?? null,
      seenQuestionIds: prevRecord?.seenQuestionIds ?? [],
      lastResetReason: prevRecord?.lastResetReason ?? null,
      lastResetAt: prevRecord?.lastResetAt ?? null,
      lastExamScore: prevRecord?.lastExamScore ?? null,
      examAttemptsCount: prevRecord?.examAttemptsCount ?? 0,
    };

    if (existingIdx >= 0) {
      dbState.workbookProgress[existingIdx] = record;
    } else {
      dbState.workbookProgress.push(record);
    }

    saveDb();

    const certificationStatus = getUserCertificationStatus(userId, req.user.email);
    broadcastWs({
      type: 'CERTIFICATION_STATUS_UPDATE',
      payload: {
        userId,
        certificationStatus,
      },
    });

    res.json({
      success: true,
      progress: sanitizeProgressForClient(record),
      certificationStatus,
    });
  });

  // Check if user currently has an active timed exam (or if an unexpired/expired session exists)
  router.get('/workbook/exam/active', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const record = findWorkbookProgressRecord(req.user.id, req.user.email);
    const expiryCheck = enforceActiveExamExpiration(record, req.user, req.ip || '127.0.0.1');

    if (expiryCheck.expired) {
      return res.json({
        active: false,
        expired: true,
        resetToChapterOne: true,
        resetReason: 'timeout',
        progress: sanitizeProgressForClient(record),
        certificationStatus: getUserCertificationStatus(req.user.id, req.user.email),
      });
    }

    if (!record?.activeExam) {
      return res.json({
        active: false,
        expired: false,
        progress: sanitizeProgressForClient(record),
        certificationStatus: getUserCertificationStatus(req.user.id, req.user.email),
      });
    }

    const bank = getExamBank();
    const bankMap = new Map(bank.map((q) => [q.id, q]));
    const questions = record.activeExam.questionIds
      .map((id) => bankMap.get(id))
      .filter((q): q is ExamQuestion => Boolean(q))
      .map(sanitizeQuestionForCandidate);

    const serverNowMs = Date.now();
    const remainingSeconds = Math.max(0, Math.ceil((record.activeExam.expiresAt - serverNowMs) / 1000));

    res.json({
      active: true,
      expired: false,
      attemptId: record.activeExam.attemptId,
      startedAt: record.activeExam.startedAt,
      expiresAt: record.activeExam.expiresAt,
      serverNowMs,
      remainingSeconds,
      totalSeconds: record.activeExam.totalSeconds || EXAM_DURATION_SECONDS,
      questions,
    });
  });

  // Start or resume a unique randomized 6-question timed exam (10 minutes)
  router.post('/workbook/exam/start', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const record = getOrCreateWorkbookProgress(req.user.id, req.user.email);

    // If an old session already expired, enforce full reset to Chapter 1 first
    const expiryCheck = enforceActiveExamExpiration(record, req.user, req.ip || '127.0.0.1');
    if (expiryCheck.expired) {
      return res.status(409).json({
        error: 'Your previous 10-minute examination timer expired. All workbook progress has been reset to Chapter 1. Please re-study Chapters 1–10 before re-attempting.',
        code: 'EXAM_TIMED_OUT_RESET',
        resetToChapterOne: true,
        progress: sanitizeProgressForClient(record),
        certificationStatus: getUserCertificationStatus(req.user.id, req.user.email),
      });
    }

    const validChapters = new Set(
      (record.readChapters || []).filter((ch) => typeof ch === 'number' && Number.isInteger(ch) && ch >= 0 && ch < TOTAL_CHAPTERS_COUNT)
    );

    if (validChapters.size < TOTAL_CHAPTERS_COUNT) {
      return res.status(403).json({
        error: `Prerequisite incomplete: Please read all 10 workbook chapters (${validChapters.size}/${TOTAL_CHAPTERS_COUNT} completed) before starting the timed certification exam.`,
        code: 'WORKBOOK_PREREQUISITES_INCOMPLETE',
        chaptersCompleted: validChapters.size,
        totalChapters: TOTAL_CHAPTERS_COUNT,
      });
    }

    const bank = getExamBank();
    const bankMap = new Map(bank.map((q) => [q.id, q]));

    // Resume existing unexpired attempt with exact same questions & deadline (prevents refresh cheating)
    if (record.activeExam && Date.now() <= record.activeExam.expiresAt) {
      const resumedQuestions = record.activeExam.questionIds
        .map((id) => bankMap.get(id))
        .filter((q): q is ExamQuestion => Boolean(q));

      if (resumedQuestions.length === EXAM_QUESTIONS_COUNT) {
        const serverNowMs = Date.now();
        return res.json({
          success: true,
          resumed: true,
          attemptId: record.activeExam.attemptId,
          startedAt: record.activeExam.startedAt,
          expiresAt: record.activeExam.expiresAt,
          serverNowMs,
          remainingSeconds: Math.max(0, Math.ceil((record.activeExam.expiresAt - serverNowMs) / 1000)),
          totalSeconds: record.activeExam.totalSeconds || EXAM_DURATION_SECONDS,
          passThresholdPercent: EXAM_PASS_THRESHOLD_PERCENT,
          bankTotalCount: bank.length,
          questions: resumedQuestions.map(sanitizeQuestionForCandidate),
        });
      }
    }

    // Select 6 unique tough questions avoiding this user's previously seen questions and recent global sets
    const selectedQuestions = selectUniqueExamQuestions({
      bank,
      seenIds: record.seenQuestionIds || [],
      count: EXAM_QUESTIONS_COUNT,
      recentGlobalSets: recentIssuedQuestionSets,
    });

    const selectedIds = selectedQuestions.map((q) => q.id);
    recentIssuedQuestionSets.push(selectedIds);
    if (recentIssuedQuestionSets.length > 25) {
      recentIssuedQuestionSets.shift();
    }

    const startedAt = Date.now();
    const expiresAt = startedAt + EXAM_DURATION_MS;
    const attemptId = `exam_${crypto.randomBytes(8).toString('hex')}`;

    record.activeExam = {
      attemptId,
      questionIds: selectedIds,
      startedAt,
      expiresAt,
      totalSeconds: EXAM_DURATION_SECONDS,
    };
    record.examAttemptsCount = (record.examAttemptsCount || 0) + 1;
    recordSeenQuestionIds(record, selectedIds, bank.length);
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      'Started Timed CE-SOC Certification Exam',
      `Attempt ${attemptId} (6 unique questions, 10m limit)`,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );

    res.json({
      success: true,
      resumed: false,
      attemptId,
      startedAt,
      expiresAt,
      serverNowMs: startedAt,
      remainingSeconds: EXAM_DURATION_SECONDS,
      totalSeconds: EXAM_DURATION_SECONDS,
      passThresholdPercent: EXAM_PASS_THRESHOLD_PERCENT,
      bankTotalCount: bank.length,
      questions: selectedQuestions.map(sanitizeQuestionForCandidate),
    });
  });

  // Grade timed exam attempt; enforce strict <80% and >10m reset back to Chapter 1
  router.post('/workbook/exam/submit', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const parsed = workbookExamSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid exam submission.' });
    }

    const record = findWorkbookProgressRecord(req.user.id, req.user.email);
    if (!record || !record.activeExam) {
      return res.status(400).json({
        error: 'No active examination session found. Your attempt may have already expired and reset to Chapter 1.',
        code: 'NO_ACTIVE_EXAM',
      });
    }

    if (record.activeExam.attemptId !== parsed.data.attemptId) {
      return res.status(409).json({
        error: 'Submitted Attempt ID does not match your current active examination session.',
        code: 'ATTEMPT_MISMATCH',
      });
    }

    const nowMs = Date.now();
    const timedOut = nowMs > record.activeExam.expiresAt;

    const bank = getExamBank();
    const bankMap = new Map(bank.map((q) => [q.id, q]));
    const assignedQuestions = record.activeExam.questionIds
      .map((id) => bankMap.get(id))
      .filter((q): q is ExamQuestion => Boolean(q));

    if (assignedQuestions.length === 0) {
      return res.status(500).json({ error: 'Exam questions could not be resolved from bank.' });
    }

    let correctCount = 0;
    const results: ExamQuestionResult[] = assignedQuestions.map((q) => {
      const rawAns = parsed.data.answers[q.id];
      const selectedIndex = typeof rawAns === 'number' && Number.isInteger(rawAns) ? rawAns : null;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q.id,
        chapterNumber: q.chapterNumber,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        options: [...q.options] as [string, string, string, string],
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const calculatedScore = Math.round((correctCount / assignedQuestions.length) * 100);
    const passed = !timedOut && calculatedScore >= EXAM_PASS_THRESHOLD_PERCENT;

    recordSeenQuestionIds(record, record.activeExam.questionIds, bank.length);

    if (!passed) {
      const resetReason: 'timeout' | 'score_below_80' = timedOut ? 'timeout' : 'score_below_80';
      resetWorkbookToChapterOne(record, resetReason, calculatedScore);
      saveDb();

      addAuditLog(
        req.user.id,
        req.user.email,
        timedOut
          ? 'Certification Exam Expired on Submit — Workbook Reset to Chapter 1'
          : `Certification Exam Failed (${calculatedScore}% < 80%) — Workbook Reset to Chapter 1`,
        `Attempt ${parsed.data.attemptId}: ${correctCount}/${assignedQuestions.length} correct (${calculatedScore}%)`,
        req.ip || '127.0.0.1',
        'failure',
        req.user.role
      );

      const certificationStatus = getUserCertificationStatus(req.user.id, req.user.email);
      broadcastWs({
        type: 'CERTIFICATION_STATUS_UPDATE',
        payload: {
          userId: req.user.id,
          certificationStatus,
        },
      });

      return res.json({
        success: true,
        passed: false,
        timedOut,
        resetToChapterOne: true,
        resetReason,
        score: calculatedScore,
        correctCount,
        totalQuestions: assignedQuestions.length,
        passThresholdPercent: EXAM_PASS_THRESHOLD_PERCENT,
        results,
        progress: sanitizeProgressForClient(record),
        certificationStatus,
      });
    }

    // Passed >= 80% within the 10-minute window!
    record.quizPassed = true;
    record.quizScore = calculatedScore;
    record.completed = true;
    record.activeExam = null;
    record.lastResetReason = null;
    record.lastExamScore = calculatedScore;
    record.lastReadAt = new Date().toISOString();
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      'Workbook Certification Completed',
      `Certified EncDec IDS SOC Specialist (CE-SOC) • Score: ${calculatedScore}%`,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );

    const certificationStatus = getUserCertificationStatus(req.user.id, req.user.email);
    broadcastWs({
      type: 'CERTIFICATION_STATUS_UPDATE',
      payload: {
        userId: req.user.id,
        certificationStatus,
      },
    });

    res.json({
      success: true,
      passed: true,
      timedOut: false,
      resetToChapterOne: false,
      score: calculatedScore,
      correctCount,
      totalQuestions: assignedQuestions.length,
      passThresholdPercent: EXAM_PASS_THRESHOLD_PERCENT,
      results,
      progress: sanitizeProgressForClient(record),
      certificationStatus,
    });
  });

  // Explicit timeout trigger when countdown hits 00:00 — resets entire workbook back to Chapter 1
  router.post('/workbook/exam/timeout', authenticateToken, requireActiveSubscription, (req: any, res: Response) => {
    const parsed = workbookExamTimeoutSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid timeout payload.' });
    }

    const record = findWorkbookProgressRecord(req.user.id, req.user.email);
    if (!record) {
      return res.json({
        success: true,
        timedOut: true,
        resetToChapterOne: true,
        resetReason: 'timeout',
        progress: null,
        certificationStatus: getUserCertificationStatus(req.user.id, req.user.email),
      });
    }

    if (record.activeExam) {
      const bank = getExamBank();
      recordSeenQuestionIds(record, record.activeExam.questionIds || [], bank.length);
    }

    resetWorkbookToChapterOne(record, 'timeout', 0);
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      'Certification Exam Timer Expired (10:00) — Workbook Reset to Chapter 1',
      parsed.data.attemptId ? `Attempt ${parsed.data.attemptId}` : '10-minute deadline elapsed',
      req.ip || '127.0.0.1',
      'failure',
      req.user.role
    );

    const certificationStatus = getUserCertificationStatus(req.user.id, req.user.email);
    broadcastWs({
      type: 'CERTIFICATION_STATUS_UPDATE',
      payload: {
        userId: req.user.id,
        certificationStatus,
      },
    });

    res.json({
      success: true,
      timedOut: true,
      resetToChapterOne: true,
      resetReason: 'timeout',
      progress: sanitizeProgressForClient(record),
      certificationStatus,
    });
  });

  // --- CERTIFICATE REGISTRATION & QR CODE VERIFICATION ---
  // POST /api/certificates/register (Saves certificate in database and generates high-res verification QR code)
  router.post('/certificates/register', authenticateToken, requireActiveSubscription, async (req: any, res: Response) => {
    try {
      const {
        certificateId,
        firstName,
        middleName,
        lastName,
        fullName,
        recipientEmail,
        courseTitle,
        accreditationLevel,
        quizScore,
        quizPassed,
        issueDate,
        verificationCode
      } = req.body;

      if (!certificateId) {
        return res.status(400).json({ error: 'Certificate ID is required' });
      }

      // Enforce authoritative certification eligibility before registering an official certificate
      const userProgress = findWorkbookProgressRecord(req.user.id, req.user.email);
      const existingCert = (dbState.certificates || []).find(
        (c) =>
          c.status !== 'revoked' &&
          (c.userId === req.user.id || (req.user.email && c.recipientEmail?.toLowerCase() === req.user.email.toLowerCase()))
      );
      if (req.user?.role !== 'admin' && !userProgress?.quizPassed && !existingCert) {
        return res.status(403).json({
          error: 'You must complete all 10 workbook chapters and pass the 10-minute certification exam (>= 80%) before generating an official CE-SOC certificate.',
          code: 'CERTIFICATION_REQUIRED',
        });
      }

      const authoritativeScore =
        typeof userProgress?.quizScore === 'number' && userProgress.quizScore >= EXAM_PASS_THRESHOLD_PERCENT
          ? userProgress.quizScore
          : typeof quizScore === 'number'
          ? quizScore
          : 100;

      const safeFirstName = (firstName || 'Security').trim();
      const safeMiddleName = (middleName || '').trim();
      const safeLastName = (lastName || 'Analyst').trim();
      const safeFullName = (fullName || [safeFirstName, safeMiddleName, safeLastName].filter(Boolean).join(' ')).trim();

      // Resolve base URL for verification QR code
      const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const baseUrl = process.env.APP_URL || `${proto}://${host}`;
      const verificationUrl = `${baseUrl}/verify/${encodeURIComponent(certificateId)}`;

      // Generate crisp QR code data URL (High error correction for reliable phone scanning)
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 320,
        color: {
          dark: '#081224',
          light: '#ffffff'
        }
      });

      const uniqueAttestation = "This analyst is a certified EncDec Autonomous SOC Defense Analyst (CE-SOC), verified in real-time by the EncDec Threat Research Lab. This candidate has successfully demonstrated certified operational mastery across Deep Packet Inspection (DPI), File Integrity Monitoring (FIM), TopoJSON Geodesic Incursion Telemetry, and Autonomous Incident Containment.";

      const certDoc: StoredCertificate = {
        certificateId,
        userId: req.user?.id || 'usr_candidate',
        firstName: safeFirstName,
        middleName: safeMiddleName || undefined,
        lastName: safeLastName,
        fullName: safeFullName,
        recipientEmail: (recipientEmail || req.user?.email || 'operator@enterprise.sec').trim(),
        courseTitle: courseTitle || 'Certified EncDec IDS SOC Specialist (CE-SOC)',
        accreditationLevel: accreditationLevel || 'Tier-III Cyber Operations • Comprehensive Defense Mastery',
        quizScore: authoritativeScore,
        quizPassed: req.user?.role === 'admin' ? (quizPassed !== undefined ? !!quizPassed : true) : true,
        issueDate: issueDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        verificationCode: verificationCode || `SHA256: ${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase(),
        verifiedAt: new Date().toISOString(),
        verificationUrl,
        qrCodeDataUrl,
        status: 'active',
        attestationStatement: uniqueAttestation
      };

      if (!dbState.certificates) {
        dbState.certificates = [];
      }

      const existingIdx = dbState.certificates.findIndex(c => c.certificateId === certificateId);
      if (existingIdx >= 0) {
        dbState.certificates[existingIdx] = certDoc;
      } else {
        dbState.certificates.push(certDoc);
      }

      saveDb();

      addAuditLog(
        req.user?.id || 'usr_candidate',
        certDoc.recipientEmail,
        'Certificate Credential Registered & QR Generated',
        `Credential ID: ${certificateId}`,
        req.ip || '127.0.0.1',
        'success',
        req.user?.role || 'analyst'
      );

      const certificationStatus = getUserCertificationStatus(req.user?.id || 'usr_candidate', certDoc.recipientEmail);
      if (req.user?.id) {
        broadcastWs({
          type: 'CERTIFICATION_STATUS_UPDATE',
          payload: {
            userId: req.user.id,
            certificationStatus,
          },
        });
      }

      res.json({
        success: true,
        certificate: certDoc,
        verificationUrl,
        qrCodeDataUrl,
        certificationStatus,
      });
    } catch (err: any) {
      console.error('[Certificate Registration Error]:', err);
      res.status(500).json({ error: err.message || 'Failed to register certificate' });
    }
  });

  // GET /api/certificates (Retrieve all certificates and monthly statistics)
  router.get('/certificates', (req: any, res: Response) => {
    const certs = dbState.certificates || [];
    
    // Calculate monthly issuance stats for the bar chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    // Group certificates by month
    const monthlyMap: Record<string, number> = {};
    // Initialize past 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap[key] = 0;
    }

    certs.forEach(c => {
      try {
        const d = new Date(c.issueDate || c.verifiedAt || Date.now());
        if (!isNaN(d.getTime())) {
          const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          monthlyMap[key] = (monthlyMap[key] || 0) + 1;
        }
      } catch {
        // fallback
      }
    });

    const monthlyStats = Object.entries(monthlyMap).map(([month, count]) => ({
      month,
      count
    }));

    res.json({
      success: true,
      totalCertified: certs.length,
      certificates: certs,
      monthlyStats
    });
  });

  // GET /api/certificates/stats (Public summary for dashboard overview and reports)
  router.get('/certificates/stats', (req: any, res: Response) => {
    const certs = dbState.certificates || [];
    const totalCertified = certs.length;
    const averageScore = totalCertified > 0 
      ? Math.round(certs.reduce((acc, c) => acc + (c.quizScore || 0), 0) / totalCertified) 
      : 100;

    res.json({
      success: true,
      totalCertified,
      averageScore
    });
  });

  // GET /api/certificates/verify/:id (Public validation endpoint for employers scanning QR code or admins searching)
  router.get('/certificates/verify/:id', (req: any, res: Response) => {
    const certId = (req.params.id || '').trim();
    if (!certId) {
      return res.status(400).json({ success: false, error: 'Certificate ID is required' });
    }

    const certificates = dbState.certificates || [];
    let cert = certificates.find(c => c.certificateId.toLowerCase() === certId.toLowerCase());

    // Also allow searching by partial match or verificationCode hash
    if (!cert) {
      cert = certificates.find(c => 
        (c.verificationCode && c.verificationCode.toLowerCase().includes(certId.toLowerCase())) ||
        (c.fullName && c.fullName.toLowerCase() === certId.toLowerCase())
      );
    }

    if (!cert) {
      return res.status(404).json({
        success: false,
        error: `Certificate ID "${certId}" was not found in the official EncDec IDS Registry.`
      });
    }

    res.json({
      success: true,
      verified: true,
      certificate: cert
    });
  });

  // =========================================================================
  // NOWPAYMENTS SUBSCRIPTION & ADMIN PAYWALL GOVERNANCE ROUTES
  // =========================================================================

  // User Billing Status (exempt from requireActiveSubscription so locked users can subscribe)
  router.get('/billing/status', authenticateToken, (req: any, res: Response) => {
    const dbUser = dbState.users.find((u) => u.id === req.user.id) || req.user;
    const cfg = getNormalizedBillingConfig();
    const access = evaluateSubscriptionAccess(dbUser, cfg);
    const userPayments = (dbState.payments || []).filter((p) => p.userId === dbUser.id);

    res.json({
      billingConfig: cfg,
      verificationMode: {
        liveApiConfigured: Boolean((process.env.NOWPAYMENTS_API_KEY || '').trim()),
        ipnConfigured: Boolean((process.env.NOWPAYMENTS_IPN_SECRET || '').trim()),
      },
      userSubscription: {
        subscriptionStatus: dbUser.subscriptionStatus || (dbUser.role === 'admin' ? 'active' : 'inactive'),
        subscriptionExpiresAt: dbUser.subscriptionExpiresAt || null,
        subscriptionGrantedBy: dbUser.subscriptionGrantedBy || null,
        subscriptionUpdatedAt: dbUser.subscriptionUpdatedAt || null,
        lastPaymentId: dbUser.lastPaymentId || null,
      },
      access,
      payments: userPayments,
    });
  });

  // Initialize NOWPayments checkout session
  router.post('/billing/checkout/init', authenticateToken, (req: any, res: Response) => {
    const dbUser = dbState.users.find((u) => u.id === req.user.id) || req.user;
    const orderId = `ENCDEC-${dbUser.id}-${Date.now()}`;
    const cfg = getNormalizedBillingConfig();

    addAuditLog(
      dbUser.id,
      dbUser.email,
      'Initiated NOWPayments Checkout ($500 / 3 Months)',
      `Invoice ${cfg.nowPaymentsInvoiceId} (${orderId})`,
      req.ip || '127.0.0.1',
      'success',
      dbUser.role
    );

    res.json({
      success: true,
      paymentUrl: NOWPAYMENTS_PAYMENT_URL,
      invoiceId: NOWPAYMENTS_INVOICE_ID,
      amountUsd: SUBSCRIPTION_PRICE_USD,
      billingCycleMonths: SUBSCRIPTION_CYCLE_MONTHS,
      billingCycleDays: SUBSCRIPTION_CYCLE_DAYS,
      orderId,
    });
  });

  // Submit / verify NOWPayments payment reference
  router.post('/billing/verify-payment', authenticateToken, async (req: any, res: Response) => {
    const parsed = verifyPaymentSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid payment reference.' });
    }

    const dbUser = dbState.users.find((u) => u.id === req.user.id);
    if (!dbUser) {
      return res.status(404).json({ error: 'Operator account not found.' });
    }

    const { paymentReference, notes } = parsed.data;
    const cleanRef = paymentReference.trim();
    const nowIso = new Date().toISOString();

    if (!Array.isArray(dbState.payments)) {
      dbState.payments = [];
    }

    // 1. Replay/Duplicate check — never allow an already-confirmed or another user's pending payment reference to be reused
    const conflicting = findConflictingPaymentRecord(dbState.payments, cleanRef, dbUser.id);
    if (conflicting) {
      return res.status(409).json({
        verified: false,
        error: 'This NOWPayments payment reference has already been verified or claimed.',
      });
    }

    // 2. Live verification against NOWPayments API when NOWPAYMENTS_API_KEY is configured
    const nowPaymentsApiKey = (process.env.NOWPAYMENTS_API_KEY || '').trim();
    let observedNpStatus: string | undefined;

    if (nowPaymentsApiKey) {
      const npResult = await verifyPaymentWithNowPaymentsApi(cleanRef, nowPaymentsApiKey);
      observedNpStatus = npResult.paymentStatus;

      if (npResult.outcome === 'verified' && npResult.paymentData) {
        const canonicalPaymentId = npResult.paymentData.payment_id
          ? String(npResult.paymentData.payment_id)
          : cleanRef;

        const canonicalConflict = findConflictingPaymentRecord(dbState.payments, canonicalPaymentId, dbUser.id);
        if (canonicalConflict) {
          return res.status(409).json({
            verified: false,
            error: `NOWPayments Payment ID ${canonicalPaymentId} has already been redeemed.`,
          });
        }

        // Mark any earlier pending entry by this user for this ref as superseded/confirmed cleanly
        dbState.payments = dbState.payments.filter(
          (p) =>
            !(
              p.userId === dbUser.id &&
              p.status === 'pending_verification' &&
              ((p.paymentReference || '').toLowerCase() === cleanRef.toLowerCase() ||
                (p.paymentReference || '').toLowerCase() === canonicalPaymentId.toLowerCase())
            )
        );

        const paidAmt = Number(npResult.paymentData.actually_paid || npResult.paymentData.pay_amount || 0);
        const paymentRecord = grantSubscriptionDaysToUser(
          dbUser,
          SUBSCRIPTION_CYCLE_MONTHS,
          'nowpayments',
          'nowpayments-api',
          canonicalPaymentId,
          notes ||
            `Verified in NOWPayments (${npResult.paymentStatus?.toUpperCase()} — ${
              npResult.paymentData.pay_currency ? `${paidAmt} ${String(npResult.paymentData.pay_currency).toUpperCase()}` : '$500 USD'
            })`,
          {
            verifiedByNowPayments: true,
            nowPaymentsStatus: npResult.paymentStatus,
            payCurrency: npResult.paymentData.pay_currency ? String(npResult.paymentData.pay_currency).toUpperCase() : undefined,
            payAmount: Number.isFinite(paidAmt) && paidAmt > 0 ? paidAmt : undefined,
          }
        );

        saveDb();
        addAuditLog(
          dbUser.id,
          dbUser.email,
          'NOWPayments Subscription Verified & Confirmed',
          `Payment ${canonicalPaymentId} ($${SUBSCRIPTION_PRICE_USD} / 3 Mo)`,
          req.ip || '127.0.0.1',
          'success',
          dbUser.role
        );
        broadcastWs({ type: 'BILLING_UPDATE', payload: { userId: dbUser.id, billingConfig: getNormalizedBillingConfig() } });

        return res.json({
          verified: true,
          verifiedByNowPayments: true,
          status: 'confirmed',
          nowPaymentsStatus: npResult.paymentStatus,
          paymentRecord,
          access: evaluateSubscriptionAccess(dbUser, getNormalizedBillingConfig()),
          message: 'Payment successful! Verified in NOWPayments — your 3-month dashboard access is now active.',
        });
      }

      if (npResult.outcome === 'not_found' || npResult.outcome === 'rejected') {
        addAuditLog(
          dbUser.id,
          dbUser.email,
          'NOWPayments Verification Rejected',
          `Ref: ${cleanRef} (${npResult.reason})`,
          req.ip || '127.0.0.1',
          'failure',
          dbUser.role
        );
        return res.status(400).json({
          verified: false,
          verifiedByNowPayments: false,
          status: 'rejected',
          nowPaymentsStatus: npResult.paymentStatus,
          error: npResult.reason,
        });
      }
    }

    // 3. Not yet confirmed by NOWPayments (still confirming/waiting, API key unset, or API unreachable) — NEVER claim payment successful!
    const existingPending = dbState.payments.find(
      (p) =>
        p.userId === dbUser.id &&
        p.status === 'pending_verification' &&
        (p.paymentReference || '').toLowerCase() === cleanRef.toLowerCase()
    );

    if (existingPending) {
      existingPending.notes = notes || existingPending.notes;
      existingPending.verifiedByNowPayments = false;
      existingPending.nowPaymentsStatus = observedNpStatus || existingPending.nowPaymentsStatus || 'awaiting_verification';
      saveDb();
      return res.json({
        verified: false,
        verifiedByNowPayments: false,
        status: 'pending_verification',
        nowPaymentsStatus: existingPending.nowPaymentsStatus,
        paymentRecord: existingPending,
        access: evaluateSubscriptionAccess(dbUser, getNormalizedBillingConfig()),
        message: observedNpStatus
          ? `NOWPayments status is "${observedNpStatus}". Payment is NOT verified complete yet — dashboard remains locked until confirmed.`
          : 'Your reference is still awaiting NOWPayments verification or administrator approval. Payment is not yet confirmed.',
      });
    }

    const pendingRecord: PaymentRecord = {
      id: 'pay_' + crypto.randomBytes(6).toString('hex'),
      userId: dbUser.id,
      userEmail: dbUser.email,
      userName: dbUser.name,
      amountUsd: SUBSCRIPTION_PRICE_USD,
      billingCycleMonths: SUBSCRIPTION_CYCLE_MONTHS,
      provider: 'nowpayments',
      invoiceId: NOWPAYMENTS_INVOICE_ID,
      paymentReference: cleanRef,
      status: 'pending_verification',
      verifiedByNowPayments: false,
      nowPaymentsStatus: observedNpStatus || 'awaiting_verification',
      createdAt: nowIso,
      notes: notes || 'Submitted by operator — awaiting NOWPayments verification',
    };

    dbState.payments.unshift(pendingRecord);
    dbUser.lastPaymentId = pendingRecord.id;
    saveDb();

    addAuditLog(
      dbUser.id,
      dbUser.email,
      'Submitted NOWPayments Reference (Unverified)',
      `Ref: ${cleanRef} ($${SUBSCRIPTION_PRICE_USD} / 3 Mo)`,
      req.ip || '127.0.0.1',
      'success',
      dbUser.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { userId: dbUser.id, pendingPaymentId: pendingRecord.id } });

    res.json({
      verified: false,
      verifiedByNowPayments: false,
      status: 'pending_verification',
      nowPaymentsStatus: pendingRecord.nowPaymentsStatus,
      paymentRecord: pendingRecord,
      access: evaluateSubscriptionAccess(dbUser, getNormalizedBillingConfig()),
      message: observedNpStatus
        ? `NOWPayments reports status "${observedNpStatus}". Payment is not yet complete — access unlocks only after NOWPayments confirms the payment.`
        : 'Payment reference recorded (unverified). Dashboard stays locked until verified in NOWPayments or approved by an administrator.',
    });
  });

  // Public NOWPayments IPN Webhook (requires valid HMAC-SHA512 signature or live NOWPayments API confirmation)
  router.post('/billing/nowpayments/ipn', async (req: Request, res: Response) => {
    const ipnSecret = (process.env.NOWPAYMENTS_IPN_SECRET || '').trim();
    const nowPaymentsApiKey = (process.env.NOWPAYMENTS_API_KEY || '').trim();
    const payload = req.body || {};

    if (!ipnSecret && !nowPaymentsApiKey) {
      return res.status(503).json({
        error: 'NOWPayments webhook verification is not configured (missing NOWPAYMENTS_IPN_SECRET and NOWPAYMENTS_API_KEY).',
      });
    }

    if (ipnSecret) {
      const signature = String(req.headers['x-nowpayments-sig'] || '');
      if (!verifyNowPaymentsIpnSignature(payload, signature, ipnSecret)) {
        return res.status(403).json({ error: 'Invalid NOWPayments IPN signature.' });
      }
    }

    const paymentIdStr = payload.payment_id ? String(payload.payment_id).trim() : '';
    let verifiedPayload = payload;

    // If IPN secret wasn't configured (or to double-check via NOWPayments API), query NOWPayments directly
    if (!ipnSecret && nowPaymentsApiKey) {
      if (!paymentIdStr) {
        return res.status(400).json({ error: 'payment_id is required for NOWPayments API verification.' });
      }
      const apiCheck = await verifyPaymentWithNowPaymentsApi(paymentIdStr, nowPaymentsApiKey);
      if (apiCheck.outcome !== 'verified' || !apiCheck.paymentData) {
        return res.status(apiCheck.outcome === 'pending' ? 202 : 403).json({
          received: true,
          verified: false,
          reason: apiCheck.reason,
        });
      }
      verifiedPayload = apiCheck.paymentData;
    }

    const validation = validateNowPaymentsPayload(verifiedPayload);
    if (validation.outcome !== 'verified') {
      return res.status(validation.outcome === 'pending' ? 200 : 400).json({
        received: true,
        verified: false,
        status: validation.paymentStatus,
        reason: validation.reason,
      });
    }

    const canonicalId = verifiedPayload.payment_id ? String(verifiedPayload.payment_id).trim() : paymentIdStr;
    const orderIdStr = verifiedPayload.order_id ? String(verifiedPayload.order_id) : '';
    const payerEmail = verifiedPayload.payer_email ? String(verifiedPayload.payer_email).toLowerCase() : '';

    // Prevent double-granting the same NOWPayments payment_id via replay IPN
    if (canonicalId && Array.isArray(dbState.payments)) {
      const alreadyConfirmed = dbState.payments.find(
        (p) =>
          (p.paymentReference || '').trim().toLowerCase() === canonicalId.toLowerCase() &&
          (p.status === 'confirmed' || p.status === 'granted_by_admin')
      );
      if (alreadyConfirmed) {
        return res.json({ received: true, alreadyProcessed: true });
      }
    }

    let targetUser =
      (payerEmail ? dbState.users.find((u) => (u.email || '').toLowerCase() === payerEmail) : undefined) ||
      (orderIdStr ? dbState.users.find((u) => orderIdStr.includes(u.id)) : undefined);

    if (!targetUser && canonicalId && Array.isArray(dbState.payments)) {
      const matchedPayment = dbState.payments.find(
        (p) => (p.paymentReference || '').trim().toLowerCase() === canonicalId.toLowerCase()
      );
      if (matchedPayment) {
        targetUser = dbState.users.find((u) => u.id === matchedPayment.userId);
      }
    }

    if (targetUser) {
      const paidAmt = Number(verifiedPayload.actually_paid || verifiedPayload.pay_amount || 0);
      const record = grantSubscriptionDaysToUser(
        targetUser,
        SUBSCRIPTION_CYCLE_MONTHS,
        'nowpayments',
        'nowpayments-ipn',
        canonicalId || orderIdStr || undefined,
        `Verified via NOWPayments IPN (${validation.paymentStatus?.toUpperCase()})`,
        {
          verifiedByNowPayments: true,
          nowPaymentsStatus: validation.paymentStatus,
          payCurrency: verifiedPayload.pay_currency ? String(verifiedPayload.pay_currency).toUpperCase() : undefined,
          payAmount: Number.isFinite(paidAmt) && paidAmt > 0 ? paidAmt : undefined,
        }
      );

      if (Array.isArray(dbState.payments)) {
        dbState.payments = dbState.payments.filter(
          (p) =>
            !(
              p.userId === targetUser!.id &&
              p.status === 'pending_verification' &&
              (!canonicalId || (p.paymentReference || '').trim().toLowerCase() === canonicalId.toLowerCase())
            )
        );
      }

      saveDb();
      addAuditLog(
        targetUser.id,
        targetUser.email,
        'NOWPayments IPN Verified Subscription',
        `Payment ${record.paymentReference || record.id}`,
        req.ip || '127.0.0.1',
        'success',
        targetUser.role
      );
      broadcastWs({ type: 'BILLING_UPDATE', payload: { userId: targetUser.id, billingConfig: getNormalizedBillingConfig() } });
    }

    res.json({ received: true, verified: true });
  });

  // --- ADMIN BILLING & SUBSCRIPTION GOVERNANCE ROUTES ---

  router.get('/admin/billing', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const cfg = getNormalizedBillingConfig();
    res.json({
      billingConfig: cfg,
      payments: dbState.payments || [],
      users: dbState.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        mfaEnabled: u.mfaEnabled,
        subscriptionStatus: u.subscriptionStatus || (u.role === 'admin' ? 'active' : 'inactive'),
        subscriptionExpiresAt: u.subscriptionExpiresAt || null,
        subscriptionGrantedBy: u.subscriptionGrantedBy || null,
        subscriptionUpdatedAt: u.subscriptionUpdatedAt || null,
        lastPaymentId: u.lastPaymentId || null,
        access: evaluateSubscriptionAccess(u, cfg),
      })),
    });
  });

  router.post('/admin/billing/toggle-paywall', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const parsed = adminBillingToggleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid paywall toggle payload.' });
    }

    const cfg = getNormalizedBillingConfig();
    cfg.subscriptionRequired = parsed.data.subscriptionRequired;
    cfg.updatedAt = new Date().toISOString();
    cfg.updatedBy = req.user.email;
    dbState.billingConfig = cfg;
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      `${cfg.subscriptionRequired ? 'Enabled' : 'Disabled'} Global Subscription Paywall`,
      `NOWPayments ($${SUBSCRIPTION_PRICE_USD} / 3 Mo)`,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { billingConfig: cfg } });
    res.json({ success: true, billingConfig: cfg });
  });

  // Admin Telemetry direct toggle for EncDec IDS Subscription ON / OFF (authenticated admin role)
  router.post('/admin/telemetry/subscription', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const parsed = adminBillingToggleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid subscription toggle payload.' });
    }

    const cfg = getNormalizedBillingConfig();
    cfg.subscriptionRequired = parsed.data.subscriptionRequired;
    cfg.updatedAt = new Date().toISOString();
    cfg.updatedBy = req.user.email;
    dbState.billingConfig = cfg;
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      cfg.subscriptionRequired
        ? 'Enabled EncDec IDS Subscription (Licensed Users Only)'
        : 'Disabled EncDec IDS Subscription (Free Access for All Users)',
      `Admin Telemetry Control ($${SUBSCRIPTION_PRICE_USD} / 3 Mo)`,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { billingConfig: cfg } });
    res.json({ success: true, billingConfig: cfg });
  });

  router.post('/admin/billing/free-access', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const parsed = adminFreeAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid free access configuration.' });
    }

    const cfg = getNormalizedBillingConfig();
    const { enabled, durationValue, durationUnit, durationLabel } = parsed.data;
    const nowMs = Date.now();

    if (enabled) {
      const value = durationValue && durationValue > 0 ? durationValue : 24;
      const unit = durationUnit || 'hours';
      const unitMsMap: Record<string, number> = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        months: 30 * 24 * 60 * 60 * 1000,
      };
      const durationMs = value * (unitMsMap[unit] || unitMsMap.hours);
      const expiresAt = new Date(nowMs + durationMs).toISOString();
      const label = durationLabel || `${value} ${unit}`;

      cfg.freeAccessActive = true;
      cfg.freeAccessExpiresAt = expiresAt;
      cfg.freeAccessDurationLabel = label;
      cfg.updatedAt = new Date(nowMs).toISOString();
      cfg.updatedBy = req.user.email;
      dbState.billingConfig = cfg;
      saveDb();

      addAuditLog(
        req.user.id,
        req.user.email,
        'Activated Timed Global Free Access',
        `Duration: ${label} (until ${expiresAt})`,
        req.ip || '127.0.0.1',
        'success',
        req.user.role
      );
      broadcastWs({ type: 'BILLING_UPDATE', payload: { billingConfig: cfg } });
      return res.json({ success: true, billingConfig: cfg });
    }

    cfg.freeAccessActive = false;
    cfg.freeAccessExpiresAt = null;
    cfg.freeAccessDurationLabel = undefined;
    cfg.updatedAt = new Date(nowMs).toISOString();
    cfg.updatedBy = req.user.email;
    dbState.billingConfig = cfg;
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      'Ended Timed Global Free Access',
      'Subscription Paywall Restored',
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { billingConfig: cfg } });
    res.json({ success: true, billingConfig: cfg });
  });

  router.post('/admin/users/:id/subscription/grant', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const parsed = adminGrantSubscriptionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid subscription grant payload.' });
    }

    const targetUser = dbState.users.find((u) => u.id === req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Operator record not found.' });

    const months = parsed.data.months || SUBSCRIPTION_CYCLE_MONTHS;
    const paymentRecord = grantSubscriptionDaysToUser(
      targetUser,
      months,
      'admin',
      req.user.email,
      undefined,
      parsed.data.notes
    );

    if (Array.isArray(dbState.payments)) {
      dbState.payments.forEach((p) => {
        if (p.userId === targetUser.id && p.status === 'pending_verification') {
          p.status = 'confirmed';
          p.confirmedAt = new Date().toISOString();
          p.confirmedBy = req.user.email;
        }
      });
    }

    saveDb();
    addAuditLog(
      req.user.id,
      req.user.email,
      `Granted ${months}-Month Subscription`,
      targetUser.email,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { userId: targetUser.id, billingConfig: getNormalizedBillingConfig() } });

    res.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        status: targetUser.status,
        subscriptionStatus: targetUser.subscriptionStatus,
        subscriptionExpiresAt: targetUser.subscriptionExpiresAt,
        subscriptionGrantedBy: targetUser.subscriptionGrantedBy,
        subscriptionUpdatedAt: targetUser.subscriptionUpdatedAt,
      },
      paymentRecord,
    });
  });

  router.post('/admin/users/:id/subscription/revoke', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const targetUser = dbState.users.find((u) => u.id === req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Operator record not found.' });

    const nowIso = new Date().toISOString();
    targetUser.subscriptionStatus = 'revoked';
    targetUser.subscriptionExpiresAt = nowIso;
    targetUser.subscriptionGrantedBy = req.user.email;
    targetUser.subscriptionUpdatedAt = nowIso;

    if (!Array.isArray(dbState.payments)) {
      dbState.payments = [];
    }
    const revokeRecord: PaymentRecord = {
      id: 'pay_' + crypto.randomBytes(6).toString('hex'),
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: targetUser.name,
      amountUsd: 0,
      billingCycleMonths: 0,
      provider: 'admin',
      invoiceId: NOWPAYMENTS_INVOICE_ID,
      status: 'revoked',
      createdAt: nowIso,
      confirmedAt: nowIso,
      confirmedBy: req.user.email,
      notes: 'Subscription revoked by administrator',
    };
    dbState.payments.unshift(revokeRecord);
    saveDb();

    addAuditLog(
      req.user.id,
      req.user.email,
      'Revoked User Subscription',
      targetUser.email,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { userId: targetUser.id, billingConfig: getNormalizedBillingConfig() } });

    res.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        status: targetUser.status,
        subscriptionStatus: targetUser.subscriptionStatus,
        subscriptionExpiresAt: targetUser.subscriptionExpiresAt,
        subscriptionGrantedBy: targetUser.subscriptionGrantedBy,
        subscriptionUpdatedAt: targetUser.subscriptionUpdatedAt,
      },
    });
  });

  router.post('/admin/payments/:paymentId/approve', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const payment = (dbState.payments || []).find((p) => p.id === req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    const targetUser = dbState.users.find((u) => u.id === payment.userId);
    if (!targetUser) return res.status(404).json({ error: 'Associated operator account not found.' });

    const nowIso = new Date().toISOString();
    payment.status = 'confirmed';
    payment.confirmedAt = nowIso;
    payment.confirmedBy = req.user.email;

    const months = payment.billingCycleMonths || SUBSCRIPTION_CYCLE_MONTHS;
    const nowMs = Date.now();
    const existingExpMs = targetUser.subscriptionExpiresAt ? Date.parse(targetUser.subscriptionExpiresAt) : NaN;
    const baseMs = !Number.isNaN(existingExpMs) && existingExpMs > nowMs ? existingExpMs : nowMs;
    const newExpiresAt = new Date(baseMs + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    targetUser.subscriptionStatus = 'active';
    targetUser.subscriptionExpiresAt = newExpiresAt;
    targetUser.subscriptionGrantedBy = req.user.email;
    targetUser.subscriptionUpdatedAt = nowIso;
    targetUser.lastPaymentId = payment.id;

    saveDb();
    addAuditLog(
      req.user.id,
      req.user.email,
      'Approved NOWPayments Subscription',
      `${targetUser.email} (Ref: ${payment.paymentReference || payment.id})`,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { userId: targetUser.id, billingConfig: getNormalizedBillingConfig() } });

    res.json({ success: true, payment, subscriptionExpiresAt: newExpiresAt });
  });

  router.post('/admin/payments/:paymentId/reject', authenticateToken, requireRole(['admin']), (req: any, res: Response) => {
    const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
    if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

    const payment = (dbState.payments || []).find((p) => p.id === req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    payment.status = 'rejected';
    payment.confirmedAt = new Date().toISOString();
    payment.confirmedBy = req.user.email;
    if (req.body?.reason) {
      payment.notes = String(req.body.reason);
    }

    saveDb();
    addAuditLog(
      req.user.id,
      req.user.email,
      'Rejected NOWPayments Submission',
      `${payment.userEmail} (Ref: ${payment.paymentReference || payment.id})`,
      req.ip || '127.0.0.1',
      'success',
      req.user.role
    );
    broadcastWs({ type: 'BILLING_UPDATE', payload: { userId: payment.userId, billingConfig: getNormalizedBillingConfig() } });

    res.json({ success: true, payment });
  });

  // =========================================================================
  // PUBLIC LANDING COMMERCIAL SCRIPT & STUDIO VOICEOVER (GEMINI 3.8 TTS)
  // =========================================================================

  router.get('/landing/commercial-script', (_req: Request, res: Response) => {
    res.json({
      success: true,
      scenes: COMMERCIAL_SCENES,
      voices: ALLOWED_COMMERCIAL_VOICES,
      defaultVoice: DEFAULT_COMMERCIAL_VOICE,
      studioTtsConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  router.get('/landing/commercial-voiceover/:sceneId', async (req: Request, res: Response) => {
    const sceneId = String(req.params.sceneId || '').trim();
    const requestedVoice = typeof req.query.voice === 'string' ? req.query.voice : undefined;

    try {
      const { wavBuffer, voice, cached, model } = await synthesizeCommercialVoiceover(
        sceneId,
        requestedVoice
      );
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', String(wavBuffer.length));
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Voice-Name', voice);
      res.setHeader('X-TTS-Model', model);
      res.setHeader('X-TTS-Cache', cached ? 'HIT' : 'MISS');
      return res.status(200).send(wavBuffer);
    } catch (err: any) {
      const status = typeof err?.statusCode === 'number' ? err.statusCode : 502;
      return res.status(status).json({
        success: false,
        code: err?.code || 'TTS_ERROR',
        error: err?.message || 'Unable to synthesize studio voiceover audio.',
      });
    }
  });

  return router;
}
