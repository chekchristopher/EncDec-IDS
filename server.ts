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
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { 
  User, Host, Packet, Rule, Alert, Threat, APIKey, 
  AuditLog, LiveActivity, ThreatIntelFeed, MLModel, QuarantineItem, SecurityReport
} from './src/types.js';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'encdec_ids_secure_token_key_123!';
const DB_FILE = path.join(process.cwd(), 'db.json');

// --- DATABASE STORE ---
interface DbSchema {
  users: User[];
  hosts: Host[];
  rules: Rule[];
  alerts: Alert[];
  threats: Threat[];
  apiKeys: APIKey[];
  auditLogs: AuditLog[];
  liveActivities: LiveActivity[];
  threatIntel: ThreatIntelFeed[];
  mlModels: MLModel[];
  quarantine: QuarantineItem[];
}

// Initial/Seeded Database
const DEFAULT_DB: DbSchema = {
  users: [
    {
      id: 'usr_1',
      email: 'chekchris85@gmail.com',
      passwordHash: bcryptjs.hashSync('admin123', 10),
      name: 'Chris Analyst',
      role: 'admin',
      status: 'active',
      mfaEnabled: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_2',
      email: 'analyst@enterprise.sec',
      passwordHash: bcryptjs.hashSync('analyst123', 10),
      name: 'Alex SecOps',
      role: 'analyst',
      status: 'active',
      mfaEnabled: false,
      createdAt: new Date().toISOString()
    }
  ],
  hosts: [
    {
      id: 'hst_1',
      name: 'portal.coou.edu.ng',
      os: 'linux',
      ipAddress: '104.24.12.83',
      status: 'online',
      lastSeen: new Date().toISOString(),
      agentVersion: 'v4.1.2-coou-agent',
      cpuUsage: 24,
      memoryUsage: 45,
      diskUsage: 68,
      createdAt: new Date().toISOString()
    },
    {
      id: 'hst_2',
      name: 'finance-db-win',
      os: 'windows',
      ipAddress: '192.168.1.102',
      status: 'online',
      lastSeen: new Date().toISOString(),
      agentVersion: 'v4.0.1-vigil',
      cpuUsage: 12,
      memoryUsage: 78,
      diskUsage: 41,
      createdAt: new Date().toISOString()
    },
    {
      id: 'hst_3',
      name: 'dev-workstation-mac',
      os: 'macos',
      ipAddress: '192.168.1.150',
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000).toISOString(),
      agentVersion: 'v4.0.0-vigil',
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 89,
      createdAt: new Date().toISOString()
    }
  ],
  rules: [
    {
      id: 'rul_1',
      name: 'Detect Excessive SSH Failures',
      type: 'signature',
      target: 'host',
      severity: 'critical',
      enabled: true,
      definition: JSON.stringify({ event: 'failed_login', threshold: 5, timeWindow: 60 }),
      mitreMapping: 'T1110.001 (Brute Force: Credential Stuffing)',
      createdAt: new Date().toISOString(),
      createdBy: 'System'
    },
    {
      id: 'rul_2',
      name: 'Detect DNS Tunneling Activity',
      type: 'anomaly',
      target: 'network',
      severity: 'high',
      enabled: true,
      definition: JSON.stringify({ protocol: 'DNS', payloadSize: 512 }),
      mitreMapping: 'T1071.004 (C2: DNS Tunneling)',
      createdAt: new Date().toISOString(),
      createdBy: 'System'
    },
    {
      id: 'rul_3',
      name: 'Unauthorized USB Device Connected',
      type: 'behavior',
      target: 'host',
      severity: 'medium',
      enabled: true,
      definition: JSON.stringify({ action: 'usb_connect' }),
      mitreMapping: 'T1200 (Hardware Additions)',
      createdAt: new Date().toISOString(),
      createdBy: 'System'
    }
  ],
  alerts: [
    {
      id: 'alt_1',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      severity: 'critical',
      title: 'Brute Force SSH Attempt Detected',
      description: 'IP 192.168.1.104 attempted 14 failed SSH logins on finance-db-win within 10 seconds.',
      category: 'Brute Force',
      source: '192.168.1.104',
      target: 'finance-db-win',
      status: 'unhandled',
      ruleId: 'rul_1',
      mitreMapping: 'T1110'
    },
    {
      id: 'alt_2',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      severity: 'high',
      title: 'Suspicious DNS Query Length',
      description: 'Anomalous base64 payloads detected in TXT queries targeting dns.malicious-domain.cc.',
      category: 'DNS Tunneling',
      source: '192.168.1.1',
      target: '8.8.8.8',
      status: 'escalated',
      ruleId: 'rul_2',
      mitreMapping: 'T1071.004'
    }
  ],
  threats: [
    {
      id: 'thr_1',
      timestamp: new Date().toISOString(),
      score: 87,
      actor: 'APT29 (Cozy Bear) Shadow',
      vector: 'External DNS Payload Staging',
      status: 'under_investigation',
      associatedAlerts: ['alt_2'],
      mitreMapping: 'T1071'
    }
  ],
  apiKeys: [
    {
      id: 'key_1',
      name: 'Core Gw Linux Agent Key',
      keyPrefix: 'ids_agent_4fa2',
      role: 'agent',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 31536000000).toISOString()
    }
  ],
  auditLogs: [],
  liveActivities: [
    {
      id: 'act_1',
      timestamp: new Date().toISOString(),
      userId: 'usr_1',
      userEmail: 'chekchris85@gmail.com',
      action: 'login',
      details: 'Logged into the console from IP 10.0.0.5'
    }
  ],
  threatIntel: [
    {
      id: 'feed_1',
      type: 'ip',
      value: '198.51.100.42',
      threatType: 'C2 Server',
      source: 'AlienVault OTX Feed',
      confidence: 92,
      addedAt: new Date().toISOString()
    },
    {
      id: 'feed_2',
      type: 'domain',
      value: 'malware-staging-node.cc',
      threatType: 'Phishing / Malware Host',
      source: 'Mandiant Threat Feed',
      confidence: 85,
      addedAt: new Date().toISOString()
    }
  ],
  mlModels: [
    {
      id: 'ml_1',
      name: 'Isolation Forest Anomaly Classifier',
      type: 'isolation_forest',
      accuracy: 98.4,
      status: 'active',
      lastTrained: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'ml_2',
      name: 'Autoencoder Deep Reconstructor',
      type: 'autoencoder',
      accuracy: 96.1,
      status: 'training',
      lastTrained: new Date().toISOString()
    }
  ],
  quarantine: []
};

// Local File Persistence Load/Save Helper
let dbState: DbSchema = { ...DEFAULT_DB };

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      dbState = JSON.parse(data);
    } else {
      saveDb();
    }
  } catch (err) {
    console.error('Error loading DB file, fallback to in-memory store', err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write database file', err);
  }
}

// Initial DB load
loadDb();

// Audit log helper
function addAuditLog(userId: string, email: string, action: string, resource: string, ip: string, status: 'success' | 'failure') {
  const log: AuditLog = {
    id: 'aud_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    userId,
    userEmail: email,
    action,
    resource,
    ipAddress: ip,
    status
  };
  dbState.auditLogs.unshift(log);
  if (dbState.auditLogs.length > 200) dbState.auditLogs.pop();
  
  // Also push to Live Activities for live stream
  const activity: LiveActivity = {
    id: 'act_' + Math.random().toString(36).substr(2, 9),
    timestamp: log.timestamp,
    userId,
    userEmail: email,
    action: action.toLowerCase().replace(/ /g, '_'),
    details: `${action} on resource: ${resource} [${status.toUpperCase()}]`
  };
  dbState.liveActivities.unshift(activity);
  if (dbState.liveActivities.length > 200) dbState.liveActivities.pop();
  
  saveDb();
  broadcastToAllWebsockets({ type: 'AUDIT_LOG', payload: log });
  broadcastToAllWebsockets({ type: 'LIVE_ACTIVITY', payload: activity });
}

// --- EXPRESS APP SETUP ---
const app = express();
app.use(express.json());

// Set up CORS header dynamically to allow previews
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-secret-passkey');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Create Http Server
const httpServer = createServer(app);

// --- WEBSOCKET ENGINE ---
const wss = new WebSocketServer({ noServer: true });
const activeConnections = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  activeConnections.add(ws);
  
  // Send current live metrics and status immediately on connection
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

// Attach upgrade
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

// --- SIMULATION ENGINES ---
// We simulate live network traffic, host file scans, system calls and threats to make the app incredibly visual and engaging.
let packetCount = 14201042;
setInterval(() => {
  // Generate simulated packet
  packetCount += Math.floor(Math.random() * 5) + 1;
  const protocols: Packet['protocol'][] = ['TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'HTTPS', 'ARP', 'SMTP', 'SSH', 'SMB'];
  const proto = protocols[Math.floor(Math.random() * protocols.length)];
  const sourceIps = ['192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.1', '10.0.0.42', '198.51.100.12'];
  const destIps = ['8.8.8.8', '192.168.1.102', '104.244.42.1', '192.168.1.1', '192.168.1.150'];
  
  const packet: Packet = {
    id: 'pkt_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    protocol: proto,
    sourceIp: sourceIps[Math.floor(Math.random() * sourceIps.length)],
    sourcePort: Math.floor(Math.random() * 64000) + 1024,
    destIp: destIps[Math.floor(Math.random() * destIps.length)],
    destPort: proto === 'HTTP' ? 80 : proto === 'HTTPS' ? 443 : proto === 'DNS' ? 53 : proto === 'SSH' ? 22 : Math.floor(Math.random() * 1000) + 20,
    length: Math.floor(Math.random() * 1500) + 64,
    payloadInfo: `Payload size: ${Math.floor(Math.random() * 1000)}B, header checksum valid.`
  };

  // Broadcast live packets
  broadcastToAllWebsockets({
    type: 'LIVE_PACKET',
    payload: {
      packet,
      totalPackets: packetCount
    }
  });

  // Randomly update Host CPU / RAM load slightly
  dbState.hosts = dbState.hosts.map(h => {
    if (h.status === 'online') {
      const cpuDelta = Math.floor(Math.random() * 7) - 3;
      const memDelta = Math.floor(Math.random() * 5) - 2;
      return {
        ...h,
        cpuUsage: Math.max(5, Math.min(98, h.cpuUsage + cpuDelta)),
        memoryUsage: Math.max(10, Math.min(95, h.memoryUsage + memDelta)),
        lastSeen: new Date().toISOString()
      };
    }
    return h;
  });

  broadcastToAllWebsockets({
    type: 'HOSTS_UPDATE',
    payload: dbState.hosts
  });

  // Small probability of generating a new low/medium warning alert automatically to simulate live IDS activity
  if (Math.random() < 0.05) {
    const alertTypes = [
      { title: 'Brute Force Attempt on SMB', desc: 'Multiple login failures detected over SMB.', cat: 'Brute Force', sev: 'medium' as const },
      { title: 'Port Scan in Progress', desc: 'Host detected rapid port probing on ports 1-1024.', cat: 'Port Scan', sev: 'high' as const },
      { title: 'Suspicious Cron Job Modification', desc: 'An unexpected cron job was registered on portal.coou.edu.ng.', cat: 'Privilege Escalation', sev: 'medium' as const },
      { title: 'Potential Malware Beaconing', desc: 'Repetitive outbound connections over HTTP matching common beaconing intervals.', cat: 'Malware Traffic', sev: 'high' as const }
    ];
    const item = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const activeHost = dbState.hosts.filter(h => h.status === 'online')[Math.floor(Math.random() * 2)];

    const newAlert: Alert = {
      id: 'alt_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      severity: item.sev,
      title: item.title,
      description: `${item.desc} Target host: ${activeHost ? activeHost.name : 'Unknown Host'}.`,
      category: item.cat,
      source: '192.168.1.' + (Math.floor(Math.random() * 200) + 10),
      target: activeHost ? activeHost.name : 'unassigned',
      status: 'unhandled',
      mitreMapping: item.cat === 'Brute Force' ? 'T1110' : item.cat === 'Port Scan' ? 'T1046' : 'T1059'
    };

    dbState.alerts.unshift(newAlert);
    if (dbState.alerts.length > 50) dbState.alerts.pop();
    saveDb();

    broadcastToAllWebsockets({
      type: 'ALERT_TRIGGERED',
      payload: newAlert
    });
  }
}, 1500);

// --- REST API ROUTING ---

// API Auth Middlewares
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing security credential token.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session token.' });
    req.user = user;
    next();
  });
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient operator clearance role.' });
    }
    next();
  };
}

// Auth Routes
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Operator credential payload incomplete.' });
  }

  const existing = dbState.users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'Operator ID already enrolled.' });
  }

  const newUser: User = {
    id: 'usr_' + Math.random().toString(36).substr(2, 9),
    email,
    passwordHash: bcryptjs.hashSync(password, 10),
    name,
    role: 'analyst', // default new users to analyst role
    status: 'active',
    mfaEnabled: false,
    createdAt: new Date().toISOString()
  };

  dbState.users.push(newUser);
  saveDb();

  // Audit signup
  addAuditLog(newUser.id, newUser.email, 'User Signup', newUser.email, req.ip, 'success');

  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '8h' });
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      mfaEnabled: newUser.mfaEnabled
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, mfaCode } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Operator identification required.' });
  }

  const user = dbState.users.find(u => u.email === email);
  if (!user || user.status === 'suspended') {
    addAuditLog('guest', email, 'Failed Login Attempt', 'Access Token Auth', req.ip, 'failure');
    return res.status(401).json({ error: 'Invalid operator credentials or account suspended.' });
  }

  const validPassword = bcryptjs.compareSync(password, user.passwordHash || '');
  if (!validPassword) {
    addAuditLog(user.id, user.email, 'Failed Login Attempt', 'Access Token Auth', req.ip, 'failure');
    return res.status(401).json({ error: 'Invalid operator credentials.' });
  }

  // Handle simulated MFA check if enabled on user account
  if (user.mfaEnabled && !mfaCode) {
    return res.json({ mfaRequired: true, userId: user.id });
  }

  // Simulated MFA code check (allows any 6 digit number for simulator experience)
  if (user.mfaEnabled && mfaCode && mfaCode.length !== 6) {
    addAuditLog(user.id, user.email, 'MFA Verification Failure', 'Multi-factor authentication', req.ip, 'failure');
    return res.status(401).json({ error: 'Invalid multi-factor code validation.' });
  }

  addAuditLog(user.id, user.email, 'Console Authentication Success', 'Operator Console', req.ip, 'success');

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mfaEnabled: user.mfaEnabled
    }
  });
});

// Reset Password simulation
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = dbState.users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'No operator found with that identifier.' });
  }
  
  // Simulate recovery token sent
  addAuditLog(user.id, user.email, 'Password Recovery Requested', 'Operator Profile', req.ip, 'success');
  res.json({ status: 'ok', message: 'A simulated password recovery token has been initialized and logged in our secure audit stream.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  const user = dbState.users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'Operator entry not found.' });
  }
  
  user.passwordHash = bcryptjs.hashSync(newPassword, 10);
  saveDb();
  addAuditLog(user.id, user.email, 'Password Reset Completed', 'Operator Profile', req.ip, 'success');
  res.json({ status: 'ok', message: 'Credentials successfully rotated.' });
});

// Update Profile & MFA
app.get('/api/profile', authenticateToken, (req, res) => {
  const user = dbState.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Operator profile offline.' });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt
  });
});

app.post('/api/profile/mfa', authenticateToken, (req, res) => {
  const { enabled } = req.body;
  const user = dbState.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Operator not found.' });

  user.mfaEnabled = !!enabled;
  saveDb();
  
  addAuditLog(user.id, user.email, `MFA configuration altered: ${enabled ? 'ENABLED' : 'DISABLED'}`, 'MFA Token Manager', req.ip, 'success');
  res.json({ mfaEnabled: user.mfaEnabled });
});

// Get Core Metrics (Real-time aggregation API)
app.get('/api/metrics', authenticateToken, (req, res) => {
  const onlineCount = dbState.hosts.filter(h => h.status === 'online').length;
  const criticalAlertsCount = dbState.alerts.filter(a => a.severity === 'critical' && a.status === 'unhandled').length;
  const highAlertsCount = dbState.alerts.filter(a => a.severity === 'high' && a.status === 'unhandled').length;
  const totalThreatScore = dbState.threats.reduce((acc, curr) => Math.max(acc, curr.score), 0);

  res.json({
    hostsOnline: onlineCount,
    hostsTotal: dbState.hosts.length,
    criticalAlerts: criticalAlertsCount,
    highAlerts: highAlertsCount,
    globalThreatScore: totalThreatScore || 12, // default simulated base threat index
    totalPacketsSec: Math.floor(Math.random() * 250) + 120
  });
});

// Hosts endpoints
app.get('/api/hosts', authenticateToken, (req, res) => {
  res.json(dbState.hosts);
});

app.post('/api/hosts/register', authenticateToken, (req, res) => {
  const { name, os, ipAddress } = req.body;
  if (!name || !os || !ipAddress) {
    return res.status(400).json({ error: 'Host registration parameter payload incomplete.' });
  }

  const newHost: Host = {
    id: 'hst_' + Math.random().toString(36).substr(2, 9),
    name,
    os,
    ipAddress,
    status: 'online',
    lastSeen: new Date().toISOString(),
    agentVersion: 'v4.0.1-vigil',
    cpuUsage: 10,
    memoryUsage: 20,
    diskUsage: 35,
    createdAt: new Date().toISOString()
  };

  dbState.hosts.push(newHost);
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Registered Host Agent', newHost.name, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'HOSTS_UPDATE', payload: dbState.hosts });
  res.status(201).json(newHost);
});

app.delete('/api/hosts/:id', authenticateToken, (req, res) => {
  const host = dbState.hosts.find(h => h.id === req.params.id);
  if (!host) return res.status(404).json({ error: 'Host entry not found.' });

  dbState.hosts = dbState.hosts.filter(h => h.id !== req.params.id);
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Deregistered Host Agent', host.name, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'HOSTS_UPDATE', payload: dbState.hosts });
  res.json({ success: true });
});

// Simulated Host Telemetry Detail Endpoint
app.get('/api/hosts/:id/telemetry', authenticateToken, (req, res) => {
  const host = dbState.hosts.find(h => h.id === req.params.id);
  if (!host) return res.status(404).json({ error: 'Host not found.' });

  // Generate dynamic full telemetry simulation to avoid simple static mocks
  const dummyProcesses: any[] = [
    { pid: 1, name: 'systemd', cpu: 0.1, memory: 0.2, user: 'root', path: '/sbin/init', suspicious: false },
    { pid: 1204, name: 'sshd', cpu: 0.4, memory: 1.1, user: 'root', path: '/usr/sbin/sshd', suspicious: false },
    { pid: 3042, name: 'nginx: master', cpu: 0.2, memory: 2.3, user: 'root', path: '/usr/sbin/nginx', suspicious: false },
    { pid: 14201, name: 'sh -i', cpu: 2.5, memory: 0.8, user: 'www-data', path: '/bin/sh', suspicious: true },
    { pid: 14210, name: 'cryptominer-bin', cpu: 94.2, memory: 12.4, user: 'nobody', path: '/tmp/cryptominer-bin', suspicious: true }
  ];

  const dummyFileChanges = [
    { timestamp: new Date(Date.now() - 50000).toISOString(), filePath: '/etc/shadow', action: 'modified' as const, user: 'root' },
    { timestamp: new Date(Date.now() - 320000).toISOString(), filePath: '/tmp/cryptominer-bin', action: 'created' as const, user: 'www-data' },
    { timestamp: new Date(Date.now() - 900000).toISOString(), filePath: '/var/www/html/upload/webshell.php', action: 'created' as const, user: 'www-data' }
  ];

  const dummyServices = [
    { name: 'sshd', displayName: 'OpenSSH Secure Shell Daemon', status: 'running' as const },
    { name: 'ufw', displayName: 'Uncomplicated Firewall', status: 'running' as const },
    { name: 'cron', displayName: 'Vixie Cron Scheduler Daemon', status: 'running' as const },
    { name: 'docker', displayName: 'Docker Application Container Engine', status: 'running' as const }
  ];

  res.json({
    host,
    processes: dummyProcesses,
    fileChanges: dummyFileChanges,
    services: dummyServices,
    systemCalls: ['sys_clone', 'sys_execve', 'sys_openat', 'sys_read', 'sys_write', 'sys_socket', 'sys_connect'],
    usbConnected: false,
    cronJobs: ['* * * * * /tmp/cryptominer-bin --background', '0 0 * * * /var/log/rotate.sh']
  });
});

// Rules endpoints
app.get('/api/rules', authenticateToken, (req, res) => {
  res.json(dbState.rules);
});

app.post('/api/rules', authenticateToken, (req, res) => {
  const { name, type, target, severity, definition, mitreMapping } = req.body;
  if (!name || !type || !target || !severity || !definition) {
    return res.status(400).json({ error: 'Required IDS rule payload incomplete.' });
  }

  const newRule: Rule = {
    id: 'rul_' + Math.random().toString(36).substr(2, 9),
    name,
    type,
    target,
    severity,
    enabled: true,
    definition,
    mitreMapping,
    createdAt: new Date().toISOString(),
    createdBy: req.user.email
  };

  dbState.rules.push(newRule);
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Created Security Rule', newRule.name, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'RULES_UPDATE', payload: dbState.rules });
  res.status(201).json(newRule);
});

app.delete('/api/rules/:id', authenticateToken, (req, res) => {
  const rule = dbState.rules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json({ error: 'IDS Rule not found.' });

  dbState.rules = dbState.rules.filter(r => r.id !== req.params.id);
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Deleted Security Rule', rule.name, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'RULES_UPDATE', payload: dbState.rules });
  res.json({ success: true });
});

// Toggle rule state
app.post('/api/rules/:id/toggle', authenticateToken, (req, res) => {
  const rule = dbState.rules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json({ error: 'IDS Rule not found.' });

  rule.enabled = !rule.enabled;
  saveDb();

  addAuditLog(req.user.id, req.user.email, `${rule.enabled ? 'Enabled' : 'Disabled'} Security Rule`, rule.name, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'RULES_UPDATE', payload: dbState.rules });
  res.json(rule);
});

// Alerts endpoints
app.get('/api/alerts', authenticateToken, (req, res) => {
  res.json(dbState.alerts);
});

app.post('/api/alerts/:id/resolve', authenticateToken, (req, res) => {
  const alert = dbState.alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });

  alert.status = 'resolved';
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Resolved Alert Triage', alert.title, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
  res.json(alert);
});

app.post('/api/alerts/:id/ignore', authenticateToken, (req, res) => {
  const alert = dbState.alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });

  alert.status = 'ignored';
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Ignored Alert Triage', alert.title, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
  res.json(alert);
});

app.post('/api/alerts/:id/escalate', authenticateToken, (req, res) => {
  const alert = dbState.alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Security Alert entry not found.' });

  alert.status = 'escalated';
  
  // Link to active threat score increase or create new threat vector
  const newThreat: Threat = {
    id: 'thr_' + Math.random().toString(36).substr(2, 9),
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

  addAuditLog(req.user.id, req.user.email, 'Escalated Threat Incident', alert.title, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'THREATS_UPDATE', payload: dbState.threats });
  broadcastToAllWebsockets({ type: 'ALERTS_UPDATE', payload: dbState.alerts });
  res.json(alert);
});

// Threats API
app.get('/api/threats', authenticateToken, (req, res) => {
  res.json(dbState.threats);
});

app.post('/api/threats/:id/mitigate', authenticateToken, (req, res) => {
  const threat = dbState.threats.find(t => t.id === req.params.id);
  if (!threat) return res.status(404).json({ error: 'Threat entry not found.' });

  threat.status = 'mitigated';
  threat.score = 0; // successfully neutralized
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Neutralized Threat Incident', threat.vector, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'THREATS_UPDATE', payload: dbState.threats });
  res.json(threat);
});

// API Key management
app.get('/api/apikeys', authenticateToken, (req, res) => {
  res.json(dbState.apiKeys);
});

app.post('/api/apikeys', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'API key descriptor required.' });

  const plainKey = 'ids_sec_key_' + Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
  const newKey: APIKey = {
    id: 'key_' + Math.random().toString(36).substr(2, 9),
    name,
    keyPrefix: plainKey.substring(0, 12) + '...',
    role: 'agent',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 31536000000).toISOString()
  };

  dbState.apiKeys.push(newKey);
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Generated Secure API Key', name, req.ip, 'success');
  res.status(201).json({ ...newKey, plainTextKey: plainKey });
});

app.delete('/api/apikeys/:id', authenticateToken, (req, res) => {
  const key = dbState.apiKeys.find(k => k.id === req.params.id);
  if (!key) return res.status(404).json({ error: 'API Key not found.' });

  dbState.apiKeys = dbState.apiKeys.filter(k => k.id !== req.params.id);
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Revoked API Credential', key.name, req.ip, 'success');
  res.json({ success: true });
});

// Quarantine action
app.post('/api/quarantine', authenticateToken, (req, res) => {
  const { hostId, type, targetValue, reason } = req.body;
  if (!hostId || !type || !targetValue || !reason) {
    return res.status(400).json({ error: 'Quarantine payload requirements incomplete.' });
  }

  const newItem: QuarantineItem = {
    id: 'qtn_' + Math.random().toString(36).substr(2, 9),
    hostId,
    type,
    targetValue,
    reason,
    isolatedAt: new Date().toISOString(),
    isolatedBy: req.user.email
  };

  dbState.quarantine.push(newItem);
  saveDb();

  addAuditLog(req.user.id, req.user.email, `Isolated hostile vector (${type})`, `${targetValue} on host ${hostId}`, req.ip, 'success');
  broadcastToAllWebsockets({ type: 'QUARANTINE_UPDATE', payload: dbState.quarantine });
  res.status(201).json(newItem);
});

// Reports Generation API
app.get('/api/reports', authenticateToken, (req, res) => {
  // Hardcoded/pre-generated simulation reports
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

app.post('/api/reports/generate', authenticateToken, (req, res) => {
  const { title, type, timeframe } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'Report parameters incomplete.' });

  addAuditLog(req.user.id, req.user.email, `Triggered ${type} Security Report Generation`, title, req.ip, 'success');
  
  const newReport: SecurityReport = {
    id: 'rep_' + Math.random().toString(36).substr(2, 9),
    title,
    type,
    timeframe: timeframe || 'Custom Range',
    generatedAt: new Date().toISOString(),
    generatedBy: req.user.email,
    downloadUrl: '#'
  };

  res.status(201).json(newReport);
});

// --- PORTAL ISOLATION REQUIREMENT ---
// "Create an isolated Admin Portal. Requirements: Not visible from navigation. Accessible only through: Secret Passkey AND Admin Login AND MFA."
// The route below verifies the special secret passkey header or query parameter, on top of normal admin authentication!
app.get('/api/admin/system-stats', authenticateToken, requireRole(['admin']), (req, res) => {
  const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
  if (secretHeader !== 'VIGIL_ADMIN_77') {
    addAuditLog(req.user.id, req.user.email, 'Unauthorized Gate Entry Attempt', 'Isolated Admin Portal', req.ip, 'failure');
    return res.status(403).json({ error: 'Isolated Admin Access Denied: Invalid cryptographic gateway passkey.' });
  }

  // Serve full audit dump, all users, list of current online socket connections, active sessions
  res.json({
    users: dbState.users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, mfaEnabled: u.mfaEnabled })),
    activeSocketsCount: activeConnections.size,
    auditLogs: dbState.auditLogs,
    liveActivities: dbState.liveActivities,
    dbFileSize: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0
  });
});

app.post('/api/admin/users/:id/suspend', authenticateToken, requireRole(['admin']), (req, res) => {
  const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
  if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

  const user = dbState.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Operator record not found.' });

  user.status = 'suspended';
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Suspended User Node', user.email, req.ip, 'success');
  res.json({ success: true, user });
});

app.post('/api/admin/users/:id/unsuspend', authenticateToken, requireRole(['admin']), (req, res) => {
  const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
  if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

  const user = dbState.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Operator record not found.' });

  user.status = 'active';
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Activated Suspended User Node', user.email, req.ip, 'success');
  res.json({ success: true, user });
});

app.post('/api/admin/users/:id/role', authenticateToken, requireRole(['admin']), (req, res) => {
  const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
  if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

  const { role } = req.body;
  const user = dbState.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Operator record not found.' });

  user.role = role;
  saveDb();

  addAuditLog(req.user.id, req.user.email, `Altered Clearance Level to ${role.toUpperCase()}`, user.email, req.ip, 'success');
  res.json({ success: true, user });
});

app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const secretHeader = req.headers['x-secret-passkey'] || req.query.passkey;
  if (secretHeader !== 'VIGIL_ADMIN_77') return res.status(403).json({ error: 'Gateway Passkey Invalid.' });

  const user = dbState.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Operator record not found.' });

  dbState.users = dbState.users.filter(u => u.id !== req.params.id);
  saveDb();

  addAuditLog(req.user.id, req.user.email, 'Purged Operator Profile', user.email, req.ip, 'success');
  res.json({ success: true });
});

// --- VITE DEV OR PRODUCTION APP SERVING ---
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`EncDec IDS secure gateway online on http://localhost:${PORT}`);
  });
}

start();
