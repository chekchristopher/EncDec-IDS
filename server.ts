/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DbSchema } from './server/db/schema.js';
import { DEFAULT_DB } from './server/db/seed.js';
import { firestoreSyncService } from './server/db/firestore.js';
import { mssqlSyncService } from './server/db/mssql.js';
import { createAuthRouter } from './server/routes/auth.js';
import { createApiRouter } from './server/routes/api.js';
import { createHealthRouter } from './server/routes/health.js';
import { CorrelationEngine } from './server/services/correlationEngine.js';
import { createIngestRouter } from './server/services/agentIngestion.js';
import { Packet, LiveActivity, AuditLog } from './src/types.js';

const PORT = 3000;
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
      dbState.securityEvents = (parsed.securityEvents && parsed.securityEvents.length > 0) ? parsed.securityEvents : DEFAULT_DB.securityEvents;
      dbState.activeResponses = (parsed.activeResponses && parsed.activeResponses.length > 0) ? parsed.activeResponses : DEFAULT_DB.activeResponses;
      dbState.certificates = (parsed.certificates && parsed.certificates.length > 0) ? parsed.certificates : (DEFAULT_DB.certificates || []);
      if (dbState.certificates && Array.isArray(dbState.certificates)) {
        dbState.certificates = dbState.certificates.map(cert => ({
          ...cert,
          attestationStatement: (cert.attestationStatement || '').replace(/ and Chukwuemeka Odumegwu Ojukwu University \(COOU\)/gi, '')
        }));
      }
    } else {
      saveDb();
    }
    // Asynchronously synchronize with Firestore
    firestoreSyncService.syncFromFirestore(dbState, () => {
      if (dbState.certificates && Array.isArray(dbState.certificates)) {
        dbState.certificates = dbState.certificates.map(cert => ({
          ...cert,
          attestationStatement: (cert.attestationStatement || '').replace(/ and Chukwuemeka Odumegwu Ojukwu University \(COOU\)/gi, '')
        }));
      }
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

wss.on('connection', (ws: WebSocket) => {
  activeConnections.add(ws);
  
  // Initial state transmission
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: {
      hosts: dbState.hosts,
      alerts: dbState.alerts,
      threats: dbState.threats,
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

// Live Packet Traffic Simulation Engine
let packetCount = 14201042;
setInterval(() => {
  packetCount += Math.floor(Math.random() * 5) + 1;
  const protocols: Packet['protocol'][] = ['TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'HTTPS', 'ARP', 'SMTP', 'SSH', 'SMB'];
  const proto = protocols[Math.floor(Math.random() * protocols.length)];
  const sourceIps = ['105.112.18.42', '197.210.8.104', '41.190.2.15', '102.89.22.81', '105.112.92.3'];
  const destIps = ['104.24.12.83', '104.24.12.83', '104.24.12.83', '104.24.12.83', '104.24.12.83'];
  
  const packet: Packet = {
    id: 'pkt_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    sourceIp: sourceIps[Math.floor(Math.random() * sourceIps.length)],
    destIp: destIps[Math.floor(Math.random() * destIps.length)],
    destinationIp: destIps[Math.floor(Math.random() * destIps.length)],
    protocol: proto,
    length: Math.floor(Math.random() * 1400) + 64,
    flags: ['SYN', 'ACK', 'FIN', 'PSH'][Math.floor(Math.random() * 4)],
    payloadInfo: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()} 0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
    payloadSample: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()} 0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
    suspicious: Math.random() < 0.08,
    ruleId: Math.random() < 0.08 ? dbState.rules[0]?.id : undefined
  };

  broadcastToAllWebsockets({
    type: 'PACKET',
    payload: {
      packet,
      totalPacketCount: packetCount,
      ratePerSec: Math.floor(Math.random() * 250) + 120
    }
  });
}, 1200);

// --- ROUTER MOUNTING ---
const correlationEngine = new CorrelationEngine(dbState, saveDb, broadcastToAllWebsockets, addAuditLog);
const { router: authRouter, authenticateToken } = createAuthRouter(dbState, saveDb, addAuditLog, broadcastToAllWebsockets);
const apiRouter = createApiRouter(dbState, saveDb, addAuditLog, broadcastToAllWebsockets, authenticateToken, activeConnections, DB_FILE, correlationEngine);
const ingestRouter = createIngestRouter(dbState, saveDb, correlationEngine, broadcastToAllWebsockets, addAuditLog);
const healthRouter = createHealthRouter(() => activeConnections.size);

app.use('/api/auth', authRouter);
app.use('/api/profile', authRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api', healthRouter);
app.use('/api', apiRouter);

// --- PUBLIC CERTIFICATE VERIFICATION PAGE (FOR EMPLOYER QR SCANNING) ---
app.get(['/verify', '/verify/:certId'], (req, res, next) => {
  const certId = (req.params.certId || (req.query.id as string) || (req.query.certId as string) || '').trim();

  // If request wants JSON, hand over to next or send JSON
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return next();
  }

  const certificates = dbState.certificates || [];
  let cert = certificates.find(c => c.certificateId.toLowerCase() === certId.toLowerCase());

  // Support sample candidate verification
  if (!cert && (certId.includes('SAMPLE') || certId.includes('TEST'))) {
    cert = {
      certificateId: certId || 'CERT-ENCDEC-SAMPLE-2026',
      firstName: 'Alexandra',
      middleName: 'Claire',
      lastName: 'Vance',
      fullName: 'Alexandra Claire Vance',
      recipientEmail: 'alex.vance@enterprise.sec',
      courseTitle: 'Certified EncDec IDS SOC Specialist (CE-SOC)',
      accreditationLevel: 'Tier-III Cyber Operations • Comprehensive Defense Mastery',
      quizScore: 100,
      quizPassed: true,
      issueDate: 'October 1, 2026',
      verificationCode: 'SHA256: 7F83B1657FF1FC53B92DC18148A1D65DFC2D4B1FA3D677284ADDD200126D9069',
      verifiedAt: new Date().toISOString(),
      verificationUrl: `${req.protocol}://${req.get('host')}/verify/${certId}`,
      status: 'active',
      attestationStatement: 'This analyst is a certified EncDec Autonomous SOC Defense Analyst (CE-SOC), verified in real-time by the EncDec Threat Research Lab. This candidate has successfully demonstrated certified operational mastery across Deep Packet Inspection (DPI), File Integrity Monitoring (FIM), TopoJSON Geodesic Incursion Telemetry, and Autonomous Incident Containment.'
    };
  }

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
