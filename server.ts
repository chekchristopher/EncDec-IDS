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
import { Packet, LiveActivity, AuditLog } from './src/types.js';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

// --- DATABASE STORE & LOCAL PERSISTENCE ---
let dbState: DbSchema = { ...DEFAULT_DB };

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      dbState = JSON.parse(data);
    } else {
      saveDb();
    }
    // Asynchronously synchronize with Firestore
    firestoreSyncService.syncFromFirestore(dbState, () => {
      saveDbToFileOnly();
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
const { router: authRouter, authenticateToken } = createAuthRouter(dbState, saveDb, addAuditLog, broadcastToAllWebsockets);
const apiRouter = createApiRouter(dbState, saveDb, addAuditLog, broadcastToAllWebsockets, authenticateToken, activeConnections, DB_FILE);
const healthRouter = createHealthRouter(() => activeConnections.size);

app.use('/api/auth', authRouter);
app.use('/api/profile', authRouter);
app.use('/api', healthRouter);
app.use('/api', apiRouter);

// --- VITE & STATIC FILE SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[EncDec IDS Gateway] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[EncDec IDS Gateway] Failed to start server:', err);
});
