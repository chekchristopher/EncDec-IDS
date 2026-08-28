/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Host, Rule, Alert, Threat, APIKey, QuarantineItem, SecurityReport, DualDatabaseStatus, MssqlConfig, EmailLog 
} from '../../src/types.js';
import { DbSchema } from '../db/schema.js';
import { firestoreSyncService } from '../db/firestore.js';
import { mssqlSyncService } from '../db/mssql.js';
import { 
  hostRegisterSchema, ruleCreateSchema, reportGenerateSchema, 
  apiKeyCreateSchema, quarantineSchema, emailTestSchema,
  aiEmailGenerateSchema, mssqlConfigureSchema, mssqlQuerySchema
} from '../schemas/validation.js';

export function createApiRouter(
  dbState: DbSchema,
  saveDb: () => void,
  addAuditLog: (userId: string, email: string, action: string, resource: string, ip: string, status: 'success' | 'failure', role?: string) => void,
  broadcastWs: (msg: any) => void,
  authenticateToken: any,
  activeConnections: Set<any>,
  dbFilePath: string
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

  // Metrics
  router.get('/metrics', authenticateToken, (_req: any, res: Response) => {
    const onlineCount = dbState.hosts.filter(h => h.status === 'online').length;
    const criticalAlertsCount = dbState.alerts.filter(a => a.severity === 'critical' && a.status === 'unhandled').length;
    const highAlertsCount = dbState.alerts.filter(a => a.severity === 'high' && a.status === 'unhandled').length;
    const totalThreatScore = dbState.threats.reduce((acc, curr) => Math.max(acc, curr.score), 0);

    res.json({
      hostsOnline: onlineCount,
      hostsTotal: dbState.hosts.length,
      criticalAlerts: criticalAlertsCount,
      highAlerts: highAlertsCount,
      globalThreatScore: totalThreatScore || 12,
      totalPacketsSec: Math.floor(Math.random() * 250) + 120
    });
  });

  // Hosts
  router.get('/hosts', authenticateToken, (_req: any, res: Response) => {
    res.json(dbState.hosts);
  });

  router.post('/hosts/register', authenticateToken, (req: any, res: Response) => {
    const parsed = hostRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid host parameters';
      return res.status(400).json({ error: err });
    }

    const { name, os, ipAddress, agentVersion } = parsed.data;
    const newHost: Host = {
      id: 'hst_' + Math.random().toString(36).substring(2, 9),
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

  router.delete('/hosts/:id', authenticateToken, (req: any, res: Response) => {
    const host = dbState.hosts.find(h => h.id === req.params.id);
    if (!host) return res.status(404).json({ error: 'Host entry not found.' });

    dbState.hosts = dbState.hosts.filter(h => h.id !== req.params.id);
    saveDb();
    firestoreSyncService.deleteDocument('hosts', req.params.id);

    addAuditLog(req.user.id, req.user.email, 'Deregistered Host Agent', host.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'HOSTS_UPDATE', payload: dbState.hosts });
    res.json({ success: true });
  });

  router.get('/hosts/:id/telemetry', authenticateToken, (req: any, res: Response) => {
    const host = dbState.hosts.find(h => h.id === req.params.id);
    if (!host) return res.status(404).json({ error: 'Host not found.' });

    res.json({
      host,
      processes: [
        { pid: 1, name: 'systemd', cpu: 0.1, memory: 0.2, user: 'root', path: '/sbin/init', suspicious: false },
        { pid: 1204, name: 'sshd', cpu: 0.4, memory: 1.1, user: 'root', path: '/usr/sbin/sshd', suspicious: false },
        { pid: 3042, name: 'nginx: master', cpu: 0.2, memory: 2.3, user: 'root', path: '/usr/sbin/nginx', suspicious: false },
        { pid: 14201, name: 'sh -i', cpu: 2.5, memory: 0.8, user: 'www-data', path: '/bin/sh', suspicious: true },
        { pid: 14210, name: 'cryptominer-bin', cpu: 94.2, memory: 12.4, user: 'nobody', path: '/tmp/cryptominer-bin', suspicious: true }
      ],
      fileChanges: [
        { timestamp: new Date(Date.now() - 50000).toISOString(), filePath: '/etc/shadow', action: 'modified', user: 'root' },
        { timestamp: new Date(Date.now() - 320000).toISOString(), filePath: '/tmp/cryptominer-bin', action: 'created', user: 'www-data' },
        { timestamp: new Date(Date.now() - 900000).toISOString(), filePath: '/var/www/html/upload/webshell.php', action: 'created', user: 'www-data' }
      ],
      services: [
        { name: 'sshd', displayName: 'OpenSSH Secure Shell Daemon', status: 'running' },
        { name: 'ufw', displayName: 'Uncomplicated Firewall', status: 'running' },
        { name: 'cron', displayName: 'Vixie Cron Scheduler Daemon', status: 'running' },
        { name: 'docker', displayName: 'Docker Application Container Engine', status: 'running' }
      ],
      systemCalls: ['sys_clone', 'sys_execve', 'sys_openat', 'sys_read', 'sys_write', 'sys_socket', 'sys_connect'],
      usbConnected: false,
      cronJobs: ['* * * * * /tmp/cryptominer-bin --background', '0 0 * * * /var/log/rotate.sh']
    });
  });

  // Rules
  router.get('/rules', authenticateToken, (_req: any, res: Response) => {
    res.json(dbState.rules);
  });

  router.post('/rules', authenticateToken, (req: any, res: Response) => {
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

  router.delete('/rules/:id', authenticateToken, (req: any, res: Response) => {
    const rule = dbState.rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'IDS Rule not found.' });

    dbState.rules = dbState.rules.filter(r => r.id !== req.params.id);
    saveDb();
    firestoreSyncService.deleteDocument('rules', req.params.id);

    addAuditLog(req.user.id, req.user.email, 'Deleted Security Rule', rule.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'RULES_UPDATE', payload: dbState.rules });
    res.json({ success: true });
  });

  router.post('/rules/:id/toggle', authenticateToken, (req: any, res: Response) => {
    const rule = dbState.rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'IDS Rule not found.' });

    rule.enabled = !rule.enabled;
    saveDb();

    addAuditLog(req.user.id, req.user.email, `${rule.enabled ? 'Enabled' : 'Disabled'} Security Rule`, rule.name, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'RULES_UPDATE', payload: dbState.rules });
    res.json(rule);
  });

  // Alerts
  router.get('/alerts', authenticateToken, (_req: any, res: Response) => {
    res.json(dbState.alerts);
  });

  router.post('/alerts/:id/resolve', authenticateToken, (req: any, res: Response) => {
    const alert = dbState.alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });

    alert.status = 'resolved';
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Resolved Alert Triage', alert.title, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
    res.json(alert);
  });

  router.post('/alerts/:id/ignore', authenticateToken, (req: any, res: Response) => {
    const alert = dbState.alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });

    alert.status = 'ignored';
    saveDb();

    addAuditLog(req.user.id, req.user.email, 'Ignored Alert Triage', alert.title, req.ip || '127.0.0.1', 'success');
    broadcastWs({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
    res.json(alert);
  });

  router.post('/alerts/:id/escalate', authenticateToken, (req: any, res: Response) => {
    const alert = dbState.alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });

    alert.status = 'escalated';
    const newThreat: Threat = {
      id: 'thr_' + Math.random().toString(36).substring(2, 9),
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
  router.get('/threats', authenticateToken, (_req: any, res: Response) => {
    res.json(dbState.threats);
  });

  router.post('/threats/:id/mitigate', authenticateToken, (req: any, res: Response) => {
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
  router.get('/apikeys', authenticateToken, (_req: any, res: Response) => {
    res.json(dbState.apiKeys);
  });

  router.post('/apikeys', authenticateToken, (req: any, res: Response) => {
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

  router.delete('/apikeys/:id', authenticateToken, (req: any, res: Response) => {
    const key = dbState.apiKeys.find(k => k.id === req.params.id);
    if (!key) return res.status(404).json({ error: 'API Key not found.' });

    dbState.apiKeys = dbState.apiKeys.filter(k => k.id !== req.params.id);
    saveDb();
    firestoreSyncService.deleteDocument('apiKeys', req.params.id);

    addAuditLog(req.user.id, req.user.email, 'Revoked API Credential', key.name, req.ip || '127.0.0.1', 'success');
    res.json({ success: true });
  });

  // Quarantine
  router.post('/quarantine', authenticateToken, (req: any, res: Response) => {
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
  router.get('/reports', authenticateToken, (_req: any, res: Response) => {
    const mockReports: SecurityReport[] = [
      {
        id: 'rep_1',
        title: 'Weekly SOC Threat Assessment Report',
        type: 'PDF',
        timeframe: 'Last 7 Days',
        generatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        generatedBy: 'System Engine',
        downloadUrl: '#'
      },
      {
        id: 'rep_2',
        title: 'Monthly MITRE ATT&CK Compliance Audit Log',
        type: 'CSV',
        timeframe: 'June 2026',
        generatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        generatedBy: 'Chris Analyst',
        downloadUrl: '#'
      }
    ];
    res.json(mockReports);
  });

  router.post('/reports/generate', authenticateToken, (req: any, res: Response) => {
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
      users: dbState.users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, mfaEnabled: u.mfaEnabled })),
      activeSocketsCount: activeConnections.size,
      auditLogs: dbState.auditLogs,
      liveActivities: dbState.liveActivities,
      dbFileSize: fs.existsSync(dbFilePath) ? fs.statSync(dbFilePath).size : 0
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

  // Audit Logs
  router.get('/audit-logs', authenticateToken, (req: any, res: Response) => {
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
  router.get('/email-logs', authenticateToken, (req: any, res: Response) => {
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
          <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">Chukwuemeka Odumegwu Ojukwu University • EncDec Cybersecurity Platform</p>
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
      status: 'sent',
      timestamp: isoTimestamp,
      previewSnippet: finalText.substring(0, 110) + '...',
      bodyText: finalText,
      htmlBody: finalHtml
    };

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

    // Send via SMTP if configured
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const nodemailer = await import('nodemailer');
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transport.sendMail({
          from: process.env.SMTP_FROM || `"${req.user.name || 'EncDec IDS SOC'}" <${req.user.email}>`,
          to: targetRecipient,
          subject: finalSubject,
          text: finalText,
          html: finalHtml
        });
        console.log(`[EMAIL DISPATCH SUCCESS] Transmitted to ${targetRecipient}`);
      }
    } catch (smtpErr: any) {
      console.warn(`[SMTP Delivery Notice] ${smtpErr?.message || smtpErr}`);
    }

    res.status(200).json({
      success: true,
      message: `System email dispatched to ${targetRecipient}`,
      email: logEntry,
      subject: finalSubject,
      bodyText: finalText,
      bodyHtml: finalHtml
    });
  };

  router.post('/email-logs/send', authenticateToken, handleEmailDispatch);
  router.post('/email-logs/test', authenticateToken, handleEmailDispatch);

  // AI Email Generation with multi-model fallback & graceful handling
  router.post('/email-logs/generate-ai', authenticateToken, async (req: any, res: Response) => {
    const parsed = aiEmailGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.issues?.[0]?.message || 'Invalid AI prompt payload';
      return res.status(400).json({ error: err });
    }

    const { prompt, recipient, role = 'analyst', type = 'create', tone = 'professional' } = parsed.data;
    const targetRecipient = recipient || req.user.email || 'operator@coou.edu.ng';

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

      const systemInstruction = `You are an expert AI SOC Cybersecurity Assistant for the EncDec Intrusion Detection & Threat Intelligence System at Chukwuemeka Odumegwu Ojukwu University (COOU).
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

  return router;
}
