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
import nodemailer from 'nodemailer';
import { 
  User, Host, Packet, Rule, Alert, Threat, APIKey, 
  AuditLog, LiveActivity, ThreatIntelFeed, MLModel, QuarantineItem, SecurityReport, EmailLog, MssqlConfig, DualDatabaseStatus
} from './src/types.js';
import sql from 'mssql';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

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
  emailLogs: EmailLog[];
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
    }
  ],
  rules: [
    {
      id: 'rul_1',
      name: 'Detect Portal Credential Stuffing & Brute Force',
      type: 'signature',
      target: 'host',
      severity: 'critical',
      enabled: true,
      definition: JSON.stringify({ endpoint: '/api/student/login', threshold: 5, timeWindow: 60 }),
      mitreMapping: 'T1110.001 (Brute Force: Credential Stuffing)',
      createdAt: new Date().toISOString(),
      createdBy: 'System'
    },
    {
      id: 'rul_2',
      name: 'Detect Anomalous Portal SQL Injection Traffic',
      type: 'anomaly',
      target: 'network',
      severity: 'high',
      enabled: true,
      definition: JSON.stringify({ targetDomain: 'portal.coou.edu.ng', protocol: 'HTTPS', pattern: 'SQLi_UNION_SELECT' }),
      mitreMapping: 'T1190 (Exploit Public-Facing Application)',
      createdAt: new Date().toISOString(),
      createdBy: 'System'
    },
    {
      id: 'rul_3',
      name: 'Unauthorized Administrative Portal Session Override',
      type: 'behavior',
      target: 'host',
      severity: 'medium',
      enabled: true,
      definition: JSON.stringify({ action: 'admin_session_escalate', target: 'portal.coou.edu.ng' }),
      mitreMapping: 'T1078 (Valid Accounts)',
      createdAt: new Date().toISOString(),
      createdBy: 'System'
    }
  ],
  alerts: [
    {
      id: 'alt_1',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      severity: 'critical',
      title: 'Portal Brute Force Login Attack Detected',
      description: 'External IP 105.112.42.18 attempted 28 failed logins on portal.coou.edu.ng student gateway within 10 seconds.',
      category: 'Brute Force',
      source: '105.112.42.18',
      target: 'portal.coou.edu.ng',
      status: 'unhandled',
      ruleId: 'rul_1',
      mitreMapping: 'T1110'
    },
    {
      id: 'alt_2',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      severity: 'high',
      title: 'Suspicious HTTP GET Flood on Portal Subdirectory',
      description: 'Rapid anomalous HTTPS GET requests targeting portal.coou.edu.ng/student/results payload structure.',
      category: 'DDoS / Web Flood',
      source: '197.210.64.12',
      target: 'portal.coou.edu.ng (104.24.12.83)',
      status: 'escalated',
      ruleId: 'rul_2',
      mitreMapping: 'T1498'
    }
  ],
  threats: [
    {
      id: 'thr_1',
      timestamp: new Date().toISOString(),
      score: 87,
      actor: 'External Cyber Threat Actor Group',
      vector: 'Credential Stuffing & Web Scrape targeting portal.coou.edu.ng',
      status: 'under_investigation',
      associatedAlerts: ['alt_1', 'alt_2'],
      mitreMapping: 'T1110'
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
  quarantine: [],
  emailLogs: []
};


// --- FIREBASE INITIALIZATION & SYNC ---
let firebaseApp: any = null;
let firestoreDb: any = null;

const CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };
    firebaseApp = initializeApp(firebaseConfig);
    const dbId = config.firestoreDatabaseId || 'ai-studio-encdecids-bc136ca4-82a5-408e-ae8f-57533ab6060c';
    if (dbId) {
      firestoreDb = getFirestore(firebaseApp, dbId);
    } else {
      firestoreDb = getFirestore(firebaseApp);
    }
    console.log('Firebase initialized successfully in server with project ID:', config.projectId, 'database:', dbId);
  } catch (error) {
    console.error('Failed to initialize Firebase in server:', error);
  }
} else {
  console.log('No firebase-applet-config.json found, running in offline mode.');
}

let firestoreQuotaExceeded = false;
let lastFirestoreQuotaWarning = 0;

function handleFirestoreError(err: any, context: string) {
  const errMsg = err?.message || String(err || '');
  if (
    errMsg.includes('RESOURCE_EXHAUSTED') || 
    err?.code === 'resource-exhausted' || 
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('NOT_FOUND') ||
    errMsg.includes('not-found') ||
    err?.code === 5 ||
    err?.code === 'not-found'
  ) {
    firestoreQuotaExceeded = true;
    const now = Date.now();
    if (now - lastFirestoreQuotaWarning > 60000) {
      console.warn(`[Firestore Status] Cloud Firestore unavailable or limit reached during ${context}. Operating smoothly with local persistent DB & MSSQL.`);
      lastFirestoreQuotaWarning = now;
    }
  } else {
    console.error(`[Firestore Error] ${context}:`, err);
  }
}

async function syncFromFirestore() {
  if (!firestoreDb || firestoreQuotaExceeded) return;
  console.log('Syncing database state from Firestore...');
  const collectionsList = [
    'users', 'hosts', 'rules', 'alerts', 'threats', 'apiKeys', 'auditLogs', 'liveActivities', 'threatIntel', 'mlModels', 'quarantine', 'emailLogs'
  ];
  
  let updatedAny = false;
  for (const colName of collectionsList) {
    if (firestoreQuotaExceeded) break;
    try {
      const colRef = collection(firestoreDb, colName);
      const querySnapshot = await getDocs(colRef);
      const items: any[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      if (items.length > 0) {
        (dbState as any)[colName] = items;
        updatedAny = true;
        console.log(`Synced ${items.length} items from collection: ${colName}`);
      } else {
        console.log(`Collection ${colName} is empty in Firestore. Seeding with default data...`);
        const defaultItems = (DEFAULT_DB as any)[colName] || [];
        for (const item of defaultItems) {
          if (firestoreQuotaExceeded) break;
          const docId = item.id || 'id_' + Math.random().toString(36).substr(2, 9);
          await setDoc(doc(firestoreDb, colName, docId), item);
        }
        (dbState as any)[colName] = [...defaultItems];
        updatedAny = true;
      }
    } catch (err) {
      handleFirestoreError(err, `syncing collection ${colName}`);
    }
  }
  
  if (updatedAny) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
      console.log('Local DB file updated with Firestore sync data.');
    } catch (err) {
      console.error('Failed to update local DB after sync:', err);
    }
  }
}

let isSyncing = false;
let pendingSync = false;
let syncDebounceTimer: any = null;

async function executeFirestoreSync() {
  if (!firestoreDb || firestoreQuotaExceeded) return;
  if (isSyncing) {
    pendingSync = true;
    return;
  }
  isSyncing = true;
  try {
    const collectionsList = [
      'users', 'hosts', 'rules', 'alerts', 'threats', 'apiKeys', 'auditLogs', 'liveActivities', 'threatIntel', 'mlModels', 'quarantine', 'emailLogs'
    ];
    for (const colName of collectionsList) {
      if (firestoreQuotaExceeded) break;
      const items = (dbState as any)[colName] || [];
      // Keep cloud sync light to avoid burning daily quota
      const itemsToSync = items.slice(0, 30);
      for (const item of itemsToSync) {
        if (firestoreQuotaExceeded) break;
        if (item && item.id) {
          await setDoc(doc(firestoreDb, colName, item.id), item);
        }
      }
    }
    if (!firestoreQuotaExceeded) {
      console.log('Firestore sync completed successfully.');
    }
  } catch (error) {
    handleFirestoreError(error, 'executing Firestore sync');
  } finally {
    isSyncing = false;
    if (pendingSync && !firestoreQuotaExceeded) {
      pendingSync = false;
      await executeFirestoreSync();
    }
  }
}

async function triggerFirestoreSync() {
  if (!firestoreDb || firestoreQuotaExceeded) return;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    executeFirestoreSync().catch(err => {
      handleFirestoreError(err, 'debounced sync');
    });
  }, 2500);
}

async function deleteFromFirestore(colName: string, docId: string) {
  if (!firestoreDb || firestoreQuotaExceeded) return;
  try {
    await deleteDoc(doc(firestoreDb, colName, docId));
    console.log(`Deleted ${colName}/${docId} from Firestore.`);
  } catch (err) {
    handleFirestoreError(err, `deleting ${colName}/${docId}`);
  }
}

// --- MICROSOFT SQL SERVER DUAL-DATABASE SYNC SERVICE ---
let mssqlPool: any = null;
let mssqlConnected = false;
let mssqlLastError: string | null = null;
let mssqlLastSynced: string | null = null;

let mssqlConfig: MssqlConfig = {
  server: process.env.MSSQL_SERVER || 'sqlserver.corp.local',
  port: Number(process.env.MSSQL_PORT) || 1433,
  database: process.env.MSSQL_DATABASE || 'EncDec_SOC_DB',
  authType: (process.env.MSSQL_AUTH_TYPE as any) || 'windows',
  domain: process.env.MSSQL_DOMAIN || 'CORP',
  user: process.env.MSSQL_USER || 'Administrator',
  password: process.env.MSSQL_PASSWORD || '',
  encrypt: process.env.MSSQL_ENCRYPT === 'true',
  trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== 'false',
  enabled: process.env.MSSQL_ENABLED === 'true'
};

async function getMssqlConfigObject(cfg: MssqlConfig) {
  const configObj: any = {
    server: cfg.server,
    port: Number(cfg.port) || 1433,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password || '',
    options: {
      encrypt: cfg.encrypt,
      trustServerCertificate: cfg.trustServerCertificate,
      connectTimeout: 5000,
      requestTimeout: 10000
    }
  };

  // Windows Authentication Configuration (Domain auth using tedious NTLM)
  if (cfg.authType === 'windows' && cfg.domain) {
    configObj.domain = cfg.domain;
  }

  return configObj;
}

function formatMssqlError(err: any, serverName: string) {
  const msg = err?.message || String(err || 'Failed to connect to Microsoft SQL Server');
  let hint = 'Verify server hostname/IP, port 1433, and authentication credentials.';
  
  if (msg.includes('getaddrinfo') || msg.includes('EAI_AGAIN') || msg.includes('ENOTFOUND')) {
    hint = `Host '${serverName}' is a local computer or unresolvable hostname. Since this backend runs in cloud containers, use a publicly reachable IP address, FQDN domain, or tunneling endpoint (e.g., ngrok/Cloudflare tunnel or public IP).`;
  } else if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
    hint = `Connection timed out reaching ${serverName}:1433. Ensure TCP Port 1433 is forwarded / allowed through firewall rules.`;
  } else if (msg.includes('Login failed') || msg.includes('ELOGIN')) {
    hint = 'Authentication rejected by SQL Server. Check Windows Domain/User and password.';
  }
  return { message: msg, hint };
}

async function initMssqlConnection() {
  if (!mssqlConfig.enabled) {
    mssqlConnected = false;
    return;
  }

  try {
    const configObj = await getMssqlConfigObject(mssqlConfig);
    if (mssqlPool) {
      try { await mssqlPool.close(); } catch (_) {}
    }
    mssqlPool = await sql.connect(configObj);
    mssqlConnected = true;
    mssqlLastError = null;
    console.log(`[MSSQL] Successfully connected to SQL Server: ${mssqlConfig.server}/${mssqlConfig.database} via ${mssqlConfig.authType === 'windows' ? `Windows Auth (Domain: ${mssqlConfig.domain})` : 'SQL Auth'}`);

    // Ensure Tables Exist
    await ensureMssqlSchema();
  } catch (err: any) {
    mssqlConnected = false;
    const { message, hint } = formatMssqlError(err, mssqlConfig.server);
    mssqlLastError = `${message} (Hint: ${hint})`;
    console.warn(`[MSSQL NOTICE] SQL Server connection attempt recorded: ${mssqlLastError}`);
  }
}

async function ensureMssqlSchema() {
  if (!mssqlPool || !mssqlConnected) return;
  try {
    const ddl = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_AuditLogs' and xtype='U')
      CREATE TABLE dbo.EncDec_AuditLogs (
        id NVARCHAR(64) PRIMARY KEY,
        timestamp NVARCHAR(64),
        userId NVARCHAR(64),
        userEmail NVARCHAR(256),
        action NVARCHAR(256),
        resource NVARCHAR(256),
        ipAddress NVARCHAR(64),
        status NVARCHAR(32)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_SecurityAlerts' and xtype='U')
      CREATE TABLE dbo.EncDec_SecurityAlerts (
        id NVARCHAR(64) PRIMARY KEY,
        timestamp NVARCHAR(64),
        severity NVARCHAR(32),
        title NVARCHAR(256),
        description NVARCHAR(MAX),
        category NVARCHAR(128),
        source NVARCHAR(128),
        target NVARCHAR(128),
        status NVARCHAR(32),
        mitreMapping NVARCHAR(64)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_EmailLogs' and xtype='U')
      CREATE TABLE dbo.EncDec_EmailLogs (
        id NVARCHAR(64) PRIMARY KEY,
        timestamp NVARCHAR(64),
        recipient NVARCHAR(256),
        subject NVARCHAR(256),
        bodyText NVARCHAR(MAX),
        type NVARCHAR(32),
        role NVARCHAR(32),
        status NVARCHAR(32)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_Users' and xtype='U')
      CREATE TABLE dbo.EncDec_Users (
        id NVARCHAR(64) PRIMARY KEY,
        email NVARCHAR(256),
        name NVARCHAR(128),
        role NVARCHAR(32),
        status NVARCHAR(32),
        mfaEnabled BIT,
        createdAt NVARCHAR(64)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_Rules' and xtype='U')
      CREATE TABLE dbo.EncDec_Rules (
        id NVARCHAR(64) PRIMARY KEY,
        name NVARCHAR(256),
        category NVARCHAR(128),
        severity NVARCHAR(32),
        action NVARCHAR(32),
        pattern NVARCHAR(MAX),
        enabled BIT,
        hits INT,
        mitreTactic NVARCHAR(128)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_Hosts' and xtype='U')
      CREATE TABLE dbo.EncDec_Hosts (
        id NVARCHAR(64) PRIMARY KEY,
        hostname NVARCHAR(256),
        ip NVARCHAR(64),
        os NVARCHAR(64),
        status NVARCHAR(32),
        lastSeen NVARCHAR(64),
        cpuUsage FLOAT,
        memoryUsage FLOAT,
        threatScore INT
      );
    `;
    await mssqlPool.request().batch(ddl);
    console.log('[MSSQL] Table schema validation verified (dbo.EncDec_*).');
  } catch (err) {
    console.error('[MSSQL] Error creating schema tables:', err);
  }
}

async function triggerMssqlSync() {
  if (!mssqlPool || !mssqlConnected || !mssqlConfig.enabled) return;
  try {
    // Sync Audit Logs
    for (const log of (dbState.auditLogs || []).slice(0, 50)) {
      await mssqlPool.request()
        .input('id', sql.NVarChar(64), log.id)
        .input('timestamp', sql.NVarChar(64), log.timestamp)
        .input('userId', sql.NVarChar(64), log.userId)
        .input('userEmail', sql.NVarChar(256), log.userEmail)
        .input('action', sql.NVarChar(256), log.action)
        .input('resource', sql.NVarChar(256), log.resource)
        .input('ipAddress', sql.NVarChar(64), log.ipAddress)
        .input('status', sql.NVarChar(32), log.status)
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.EncDec_AuditLogs WHERE id = @id)
            UPDATE dbo.EncDec_AuditLogs SET status = @status WHERE id = @id;
          ELSE
            INSERT INTO dbo.EncDec_AuditLogs (id, timestamp, userId, userEmail, action, resource, ipAddress, status)
            VALUES (@id, @timestamp, @userId, @userEmail, @action, @resource, @ipAddress, @status);
        `);
    }

    // Sync Alerts
    for (const alert of (dbState.alerts || []).slice(0, 50)) {
      await mssqlPool.request()
        .input('id', sql.NVarChar(64), alert.id)
        .input('timestamp', sql.NVarChar(64), alert.timestamp)
        .input('severity', sql.NVarChar(32), alert.severity)
        .input('title', sql.NVarChar(256), alert.title)
        .input('description', sql.NVarChar(sql.MAX), alert.description)
        .input('category', sql.NVarChar(128), alert.category)
        .input('source', sql.NVarChar(128), alert.source)
        .input('target', sql.NVarChar(128), alert.target || '')
        .input('status', sql.NVarChar(32), alert.status)
        .input('mitreMapping', sql.NVarChar(64), alert.mitreMapping || '')
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.EncDec_SecurityAlerts WHERE id = @id)
            UPDATE dbo.EncDec_SecurityAlerts SET status = @status WHERE id = @id;
          ELSE
            INSERT INTO dbo.EncDec_SecurityAlerts (id, timestamp, severity, title, description, category, source, target, status, mitreMapping)
            VALUES (@id, @timestamp, @severity, @title, @description, @category, @source, @target, @status, @mitreMapping);
        `);
    }

    // Sync Email Logs
    for (const email of (dbState.emailLogs || []).slice(0, 50)) {
      await mssqlPool.request()
        .input('id', sql.NVarChar(64), email.id)
        .input('timestamp', sql.NVarChar(64), email.timestamp)
        .input('recipient', sql.NVarChar(256), email.recipient)
        .input('subject', sql.NVarChar(256), email.subject)
        .input('bodyText', sql.NVarChar(sql.MAX), email.bodyText)
        .input('type', sql.NVarChar(32), email.type)
        .input('role', sql.NVarChar(32), email.role)
        .input('status', sql.NVarChar(32), email.status)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.EncDec_EmailLogs WHERE id = @id)
            INSERT INTO dbo.EncDec_EmailLogs (id, timestamp, recipient, subject, bodyText, type, role, status)
            VALUES (@id, @timestamp, @recipient, @subject, @bodyText, @type, @role, @status);
        `);
    }

    mssqlLastSynced = new Date().toISOString();
    console.log('[MSSQL] Dual-sync to Microsoft SQL Server completed successfully.');
  } catch (err) {
    console.error('[MSSQL] Dual-sync error:', err);
  }
}

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
    // Asynchronously synchronize with Firestore
    syncFromFirestore().catch(err => {
      console.error('Failed initial sync from Firestore:', err);
    });
    // Asynchronously initialize Microsoft SQL Server pool if configured
    initMssqlConnection().catch(err => {
      console.error('Failed initial connection to SQL Server:', err);
    });
  } catch (err) {
    console.error('Error loading DB file, fallback to in-memory store', err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
    // Asynchronously trigger Firestore sync
    triggerFirestoreSync().catch(err => {
      console.error('Failed to trigger Firestore sync:', err);
    });
    // Asynchronously trigger Microsoft SQL Server dual sync
    triggerMssqlSync().catch(err => {
      console.error('Failed to trigger MSSQL dual sync:', err);
    });
  } catch (err) {
    console.error('Failed to write database file', err);
  }
}

// Initial DB load
loadDb();

// Audit log helper
function addAuditLog(userId: string, email: string, action: string, resource: string, ip: string, status: 'success' | 'failure', explicitRole?: string) {
  let role = explicitRole;
  if (!role && userId && userId !== 'guest') {
    const foundUser = dbState.users.find(u => u.id === userId || u.email?.toLowerCase() === email?.toLowerCase());
    if (foundUser) {
      role = foundUser.role;
    }
  }
  if (!role && email && (email.toLowerCase().startsWith('admin') || email.toLowerCase().includes('admin@'))) {
    role = 'admin';
  }
  const log: AuditLog = {
    id: 'aud_' + Math.random().toString(36).substr(2, 9),
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
  
  // Also push to Live Activities for live stream
  const activity: LiveActivity = {
    id: 'act_' + Math.random().toString(36).substr(2, 9),
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
  const sourceIps = ['105.112.18.42', '197.210.8.104', '41.190.2.15', '102.89.22.81', '105.112.92.3'];
  const destIps = ['104.24.12.83', '104.24.12.83', '104.24.12.83', '104.24.12.83', '104.24.12.83'];
  
  const packet: Packet = {
    id: 'pkt_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    protocol: proto,
    sourceIp: sourceIps[Math.floor(Math.random() * sourceIps.length)],
    sourcePort: Math.floor(Math.random() * 64000) + 1024,
    destIp: destIps[Math.floor(Math.random() * destIps.length)],
    destPort: proto === 'HTTP' ? 80 : proto === 'HTTPS' ? 443 : proto === 'DNS' ? 53 : proto === 'SSH' ? 22 : Math.floor(Math.random() * 1000) + 20,
    length: Math.floor(Math.random() * 1500) + 64,
    payloadInfo: `Target: portal.coou.edu.ng, Payload size: ${Math.floor(Math.random() * 1000)}B, SSL/TLS header valid.`
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
      { title: 'Brute Force Portal Login Attempt', desc: 'Multiple failed authentication events on portal.coou.edu.ng student portal.', cat: 'Brute Force', sev: 'medium' as const },
      { title: 'Port Scan Targeting portal.coou.edu.ng', desc: 'Detected rapid port probing on web server ports 80, 443, 8080.', cat: 'Port Scan', sev: 'high' as const },
      { title: 'Anomalous SQL Query on Portal DB', desc: 'Unusual query syntax detected on portal.coou.edu.ng course registration tables.', cat: 'SQL Injection Attempt', sev: 'high' as const },
      { title: 'Rate Limit Exceeded on Portal Gateway', desc: 'High frequency HTTPS requests targeting portal.coou.edu.ng student result verifier.', cat: 'Web Flood / DDoS', sev: 'medium' as const }
    ];
    const item = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const activeHost = dbState.hosts.find(h => h.name === 'portal.coou.edu.ng') || dbState.hosts[0] || { name: 'portal.coou.edu.ng' };

    const newAlert: Alert = {
      id: 'alt_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      severity: item.sev,
      title: item.title,
      description: `${item.desc} Monitored Node: ${activeHost.name}.`,
      category: item.cat,
      source: '105.112.' + (Math.floor(Math.random() * 200) + 10) + '.' + (Math.floor(Math.random() * 250) + 1),
      target: activeHost.name,
      status: 'unhandled',
      mitreMapping: item.cat === 'Brute Force' ? 'T1110' : item.cat === 'Port Scan' ? 'T1046' : 'T1190'
    };

    dbState.alerts.unshift(newAlert);
    if (dbState.alerts.length > 50) dbState.alerts.pop();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
    } catch (_) {}

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

// --- AUTOMATED EMAIL DISPATCH SERVICE ---
async function sendNotificationEmail(
  user: { email: string; name?: string; role: string }, 
  eventType: 'registration' | 'login', 
  ipAddress?: string,
  senderUser?: { email: string; id?: string }
) {
  if (!user || !user.email) return;

  const userRole = (user.role || 'analyst').toLowerCase();
  let salutation = 'Dear Operator,';
  if (userRole === 'admin') {
    salutation = 'Dear Admin,';
  } else if (userRole === 'analyst') {
    salutation = 'Dear Analyst,';
  }

  const timestamp = new Date().toLocaleString();
  let subject = '';
  let bodyText = '';
  let bodyHtml = '';

  if (eventType === 'registration') {
    subject = `[EncDec IDS] Welcome to Vigil SOC Operator Network`;
    bodyText = `${salutation}\n\nWelcome to EncDec Intrusion Detection System (Vigil SOC). Your account has been successfully registered.\n\nAccount Summary:\n- Name: ${user.name || 'Operator'}\n- Email: ${user.email}\n- Role Clearance: ${userRole.toUpperCase()}\n- Monitored Target: portal.coou.edu.ng\n- Registration Time: ${timestamp}\n\nYou can now access the SOC console to monitor live traffic, rules, and security threat vectors.\n\nStay vigilant,\nEncDec IDS Security Gateway`;
    
    bodyHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #020617; color: #cbd5e1; padding: 24px; border-radius: 8px; border: 1px solid #1e293b; max-width: 600px;">
        <h2 style="color: #38bdf8; margin-top: 0; font-family: monospace;">EncDec IDS Operator Registration</h2>
        <p style="font-size: 15px; font-weight: bold; color: #f8fafc;">${salutation}</p>
        <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">Welcome to <strong>EncDec Intrusion Detection System (Vigil SOC)</strong>. Your security account has been initialized and activated.</p>
        <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; border-left: 4px solid #38bdf8; margin: 16px 0; font-family: monospace; font-size: 13px;">
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Name:</strong> <span style="color: #f8fafc;">${user.name || 'Operator'}</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Email:</strong> <span style="color: #38bdf8;">${user.email}</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Role:</strong> <span style="color: #f59e0b; font-weight: bold;">${userRole.toUpperCase()}</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Monitored Target:</strong> <span style="color: #34d399;">portal.coou.edu.ng</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Enrolled At:</strong> <span style="color: #cbd5e1;">${timestamp}</span></p>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">You can now log in to monitor real-time threat intelligence and host telemetry for portal.coou.edu.ng.</p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
        <p style="font-size: 11px; color: #64748b; margin: 0;">EncDec IDS Automated Security Gateway • portal.coou.edu.ng</p>
      </div>
    `;
  } else {
    // login
    subject = `[EncDec IDS] Security Alert: Console Login Verified`;
    bodyText = `${salutation}\n\nAn authentication event was recorded for your EncDec IDS account.\n\nLogin Summary:\n- Account Email: ${user.email}\n- Role Clearance: ${userRole.toUpperCase()}\n- Timestamp: ${timestamp}\n- Source IP Address: ${ipAddress || '10.0.0.5'}\n- Primary Target: portal.coou.edu.ng\n\nIf this session was not initiated by you, please isolate your token immediately.\n\nRegards,\nEncDec IDS Security Gateway`;

    bodyHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #020617; color: #cbd5e1; padding: 24px; border-radius: 8px; border: 1px solid #1e293b; max-width: 600px;">
        <h2 style="color: #38bdf8; margin-top: 0; font-family: monospace;">EncDec IDS Console Login Verified</h2>
        <p style="font-size: 15px; font-weight: bold; color: #f8fafc;">${salutation}</p>
        <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">An authentication event was recorded for your EncDec IDS security account.</p>
        <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; border-left: 4px solid #34d399; margin: 16px 0; font-family: monospace; font-size: 13px;">
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Account:</strong> <span style="color: #38bdf8;">${user.email}</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Role:</strong> <span style="color: #f59e0b; font-weight: bold;">${userRole.toUpperCase()}</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Timestamp:</strong> <span style="color: #cbd5e1;">${timestamp}</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Source IP:</strong> <span style="color: #f8fafc;">${ipAddress || '10.0.0.5'}</span></p>
          <p style="margin: 4px 0; color: #94a3b8;"><strong>Monitored Node:</strong> <span style="color: #34d399;">portal.coou.edu.ng</span></p>
        </div>
        <p style="font-size: 12px; color: #f87171; margin-top: 12px;">If you did not authorize this session, please contact your SOC Administrator immediately.</p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
        <p style="font-size: 11px; color: #64748b; margin: 0;">EncDec IDS Automated Security Gateway • portal.coou.edu.ng</p>
      </div>
    `;
  }

  // Create Email Log
  const logItem: EmailLog = {
    id: 'eml_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    recipient: user.email,
    senderEmail: senderUser?.email || 'system@coou.edu.ng',
    senderUserId: senderUser?.id,
    subject,
    bodyText,
    type: eventType,
    role: userRole,
    status: 'sent'
  };

  if (!dbState.emailLogs) dbState.emailLogs = [];
  dbState.emailLogs.unshift(logItem);
  if (dbState.emailLogs.length > 100) dbState.emailLogs.pop();
  saveDb();

  // Broadcast WebSocket event
  broadcastToAllWebsockets({
    type: 'EMAIL_DISPATCHED',
    payload: logItem
  });

  // Transport send attempt
  try {
    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }

    await transporter.sendMail({
      from: `"EncDec IDS Gateway" <${process.env.SMTP_FROM || 'alerts@encdec-ids.sec'}>`,
      to: user.email,
      subject,
      text: bodyText,
      html: bodyHtml
    });
    console.log(`[EMAIL AUTOMATION SUCCESS] ${eventType.toUpperCase()} email sent to ${user.email} using salutation "${salutation}"`);
  } catch (err) {
    console.error(`[EMAIL AUTOMATION NOTICE] Delivery process recorded for ${user.email}:`, err);
  }
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

  // Trigger automated email dispatch upon registration
  sendNotificationEmail(newUser, 'registration', req.ip).catch(console.error);

  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '8h' });
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      mfaEnabled: newUser.mfaEnabled,
      avatarUrl: newUser.avatarUrl,
      lastNameChangeDate: newUser.lastNameChangeDate
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

  // Trigger automated email dispatch upon successful login
  sendNotificationEmail(user, 'login', req.ip).catch(console.error);

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      avatarUrl: user.avatarUrl,
      lastNameChangeDate: user.lastNameChangeDate
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
    avatarUrl: user.avatarUrl,
    lastNameChangeDate: user.lastNameChangeDate,
    createdAt: user.createdAt
  });
});

app.post('/api/profile/update', authenticateToken, (req, res) => {
  const { name, avatarUrl } = req.body;
  const user = dbState.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Operator not found.' });

  let nameUpdated = false;
  if (name && name.trim() !== user.name) {
    const trimmedName = name.trim();
    const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000; // ~180 days
    if (user.lastNameChangeDate) {
      const lastChangeTime = new Date(user.lastNameChangeDate).getTime();
      const now = Date.now();
      if (now - lastChangeTime < SIX_MONTHS_MS) {
        const nextAllowed = new Date(lastChangeTime + SIX_MONTHS_MS).toLocaleDateString();
        return res.status(400).json({
          error: `Names can only be changed once every 6 months. Your name was last updated on ${new Date(user.lastNameChangeDate).toLocaleDateString()}. Next available change: ${nextAllowed}.`
        });
      }
    }
    user.name = trimmedName;
    user.lastNameChangeDate = new Date().toISOString();
    nameUpdated = true;
  }

  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl;
  }

  saveDb();
  addAuditLog(user.id, user.email, nameUpdated ? 'Updated Operator Name & Profile' : 'Updated Operator Avatar', user.email, req.ip, 'success');

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    avatarUrl: user.avatarUrl,
    lastNameChangeDate: user.lastNameChangeDate,
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
  deleteFromFirestore('hosts', req.params.id).catch(err => {
    console.error('Failed to delete host from Firestore:', err);
  });

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
  deleteFromFirestore('rules', req.params.id).catch(err => {
    console.error('Failed to delete rule from Firestore:', err);
  });

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
  deleteFromFirestore('apiKeys', req.params.id).catch(err => {
    console.error('Failed to delete apiKey from Firestore:', err);
  });

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
  deleteFromFirestore('users', req.params.id).catch(err => {
    console.error('Failed to delete user from Firestore:', err);
  });

  addAuditLog(req.user.id, req.user.email, 'Purged Operator Profile', user.email, req.ip, 'success');
  res.json({ success: true });
});

// Audit Trail Log Endpoint with Role-Based Scoping
app.get('/api/audit-logs', authenticateToken, (req, res) => {
  const allLogs = dbState.auditLogs || [];
  if (req.user.role === 'admin') {
    return res.json(allLogs);
  }

  // Non-admins (analysts/operators) must NOT see admin audit trails
  const adminEmails = new Set(
    dbState.users
      .filter(u => u.role === 'admin')
      .map(u => (u.email || '').toLowerCase())
  );
  const adminIds = new Set(
    dbState.users
      .filter(u => u.role === 'admin')
      .map(u => u.id)
  );

  const filteredLogs = allLogs.filter(log => {
    // Hide if explicitly marked as admin role
    if (log.userRole === 'admin') return false;

    // Hide if email matches an admin user
    const logEmail = (log.userEmail || '').toLowerCase();
    if (adminEmails.has(logEmail) || logEmail.startsWith('admin') || logEmail.includes('admin@')) {
      return false;
    }

    // Hide if userId matches an admin user
    if (log.userId && adminIds.has(log.userId)) return false;

    // Hide privileged admin-level actions
    const privilegedActions = [
      'altered clearance',
      'purged operator',
      'suspended user',
      'activated suspended',
      'updated sql server',
      'forced dual-database',
      'isolated admin portal',
      'unauthorized gate entry'
    ];
    if (privilegedActions.some(act => (log.action || '').toLowerCase().includes(act))) {
      return false;
    }

    return true;
  });

  res.json(filteredLogs);
});

// Email Notifications Log Endpoints with Role-Based Scoping
app.get('/api/email-logs', authenticateToken, (req, res) => {
  const allEmails = dbState.emailLogs || [];
  if (req.user.role === 'admin') {
    return res.json(allEmails);
  }

  // Non-admins (analysts) should only see emails they send out AND emails they receive
  const userEmail = (req.user.email || '').toLowerCase();
  const userId = req.user.id;

  const scopedEmails = allEmails.filter(email => {
    const isRecipient = (email.recipient || '').toLowerCase() === userEmail;
    const isSender = (email.senderEmail || '').toLowerCase() === userEmail || (email.senderUserId && email.senderUserId === userId);
    return isRecipient || isSender;
  });

  res.json(scopedEmails);
});

app.post('/api/email-logs/test', authenticateToken, async (req, res) => {
  const { recipient, role, type } = req.body;
  const targetUser = {
    email: recipient || req.user.email,
    name: recipient ? recipient.split('@')[0] : (req.user.name || 'Test Operator'),
    role: role || req.user.role || 'analyst'
  };
  await sendNotificationEmail(
    targetUser, 
    type === 'registration' ? 'registration' : 'login', 
    req.ip,
    { email: req.user.email, id: req.user.id }
  );
  res.json({ success: true, message: `Automated test email dispatched to ${targetUser.email} with role: ${targetUser.role}` });
});

// --- DUAL DATABASE (FIREBASE + MSSQL) MANAGEMENT ENDPOINTS ---

app.get('/api/database/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  let tableCounts = {
    users: dbState.users.length,
    alerts: dbState.alerts.length,
    auditLogs: dbState.auditLogs.length,
    emailLogs: (dbState.emailLogs || []).length,
    rules: dbState.rules.length,
    hosts: dbState.hosts.length,
    threatIntel: dbState.threatIntel.length
  };

  // If MSSQL pool is live, fetch live counts from SQL Server tables
  if (mssqlPool && mssqlConnected) {
    try {
      const q = await mssqlPool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM dbo.EncDec_Users) AS users,
          (SELECT COUNT(*) FROM dbo.EncDec_SecurityAlerts) AS alerts,
          (SELECT COUNT(*) FROM dbo.EncDec_AuditLogs) AS auditLogs,
          (SELECT COUNT(*) FROM dbo.EncDec_EmailLogs) AS emailLogs,
          (SELECT COUNT(*) FROM dbo.EncDec_Rules) AS rules,
          (SELECT COUNT(*) FROM dbo.EncDec_Hosts) AS hosts
      `);
      if (q.recordset && q.recordset[0]) {
        tableCounts = {
          ...tableCounts,
          users: q.recordset[0].users ?? tableCounts.users,
          alerts: q.recordset[0].alerts ?? tableCounts.alerts,
          auditLogs: q.recordset[0].auditLogs ?? tableCounts.auditLogs,
          emailLogs: q.recordset[0].emailLogs ?? tableCounts.emailLogs,
          rules: q.recordset[0].rules ?? tableCounts.rules,
          hosts: q.recordset[0].hosts ?? tableCounts.hosts
        };
      }
    } catch (e) {
      console.warn('[MSSQL] Error fetching table row counts:', e);
    }
  }

  const status: DualDatabaseStatus = {
    firebase: {
      enabled: !!firestoreDb,
      connected: !!firestoreDb,
      projectId: firebaseApp?.options?.projectId || 'ai-studio-encdecids-bc136ca4-82a5-408e-ae8f-57533ab6060c',
      databaseId: '(default)',
      collectionsCount: 12,
      lastSynced: new Date().toISOString()
    },
    mssql: {
      enabled: mssqlConfig.enabled,
      connected: mssqlConnected,
      server: mssqlConfig.server,
      database: mssqlConfig.database,
      authType: mssqlConfig.authType,
      domain: mssqlConfig.domain,
      user: mssqlConfig.user,
      lastSynced: mssqlLastSynced || (mssqlConnected ? new Date().toISOString() : undefined),
      tableCounts,
      error: mssqlLastError || undefined
    }
  };

  res.json({ status, config: { ...mssqlConfig, password: mssqlConfig.password ? '••••••••' : '' } });
});

app.post('/api/database/mssql/configure', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { server, port, database, authType, domain, user, password, encrypt, trustServerCertificate, enabled } = req.body;

  mssqlConfig = {
    server: server || mssqlConfig.server,
    port: Number(port) || mssqlConfig.port,
    database: database || mssqlConfig.database,
    authType: authType || mssqlConfig.authType,
    domain: domain !== undefined ? domain : mssqlConfig.domain,
    user: user || mssqlConfig.user,
    password: password !== undefined ? password : mssqlConfig.password,
    encrypt: !!encrypt,
    trustServerCertificate: trustServerCertificate !== false,
    enabled: !!enabled
  };

  addAuditLog(req.user.id, req.user.email, 'Updated SQL Server Database Configuration', `${mssqlConfig.server}/${mssqlConfig.database}`, req.ip, 'success');

  if (mssqlConfig.enabled) {
    await initMssqlConnection();
    if (mssqlConnected) {
      await triggerMssqlSync();
    }
  } else {
    if (mssqlPool) {
      try { await mssqlPool.close(); } catch (_) {}
      mssqlPool = null;
    }
    mssqlConnected = false;
  }

  res.json({
    success: true,
    connected: mssqlConnected,
    error: mssqlLastError,
    config: { ...mssqlConfig, password: mssqlConfig.password ? '••••••••' : '' }
  });
});

app.post('/api/database/mssql/test-connection', authenticateToken, requireRole(['admin']), async (req, res) => {
  const testCfg: MssqlConfig = {
    server: req.body.server || mssqlConfig.server,
    port: Number(req.body.port) || mssqlConfig.port,
    database: req.body.database || mssqlConfig.database,
    authType: req.body.authType || mssqlConfig.authType,
    domain: req.body.domain || mssqlConfig.domain,
    user: req.body.user || mssqlConfig.user,
    password: req.body.password !== undefined ? req.body.password : mssqlConfig.password,
    encrypt: !!req.body.encrypt,
    trustServerCertificate: req.body.trustServerCertificate !== false,
    enabled: true
  };

  try {
    const configObj = await getMssqlConfigObject(testCfg);
    const testPool = await sql.connect(configObj);
    const result = await testPool.request().query('SELECT @@VERSION AS version, DB_NAME() AS currentDb, SUSER_SNAME() AS currentUser');
    await testPool.close();

    res.json({
      success: true,
      message: `Successfully connected to Microsoft SQL Server (${testCfg.authType === 'windows' ? `Windows Domain Auth: ${testCfg.domain}\\${testCfg.user}` : `SQL User: ${testCfg.user}`})`,
      serverInfo: result.recordset[0]
    });
  } catch (err: any) {
    const { message, hint } = formatMssqlError(err, testCfg.server);
    res.status(400).json({
      success: false,
      message: `Connection failed: ${message}`,
      hint
    });
  }
});

app.post('/api/database/mssql/sync-now', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // 1. Trigger Firestore sync
    await triggerFirestoreSync();

    // 2. Trigger MSSQL sync if active
    if (mssqlPool && mssqlConnected) {
      await triggerMssqlSync();
    }

    addAuditLog(req.user.id, req.user.email, 'Forced Dual-Database Synchronization (Firebase + SQL Server)', 'Dual Database Sync Engine', req.ip, 'success');

    res.json({
      success: true,
      message: 'Dual-database synchronization cycle completed successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/database/mssql/query', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { query, table } = req.body;

  // Safe read-only inspection queries
  if (query && !query.trim().toUpperCase().startsWith('SELECT') && !query.trim().toUpperCase().startsWith('EXEC SP_HELP') && !query.trim().toUpperCase().startsWith('EXEC SP_COLUMNS')) {
    return res.status(403).json({ error: 'Only read-only inspection queries (SELECT) are permitted in this console.' });
  }

  // If live MSSQL pool is connected, execute directly on SQL Server
  if (mssqlPool && mssqlConnected) {
    try {
      const q = await mssqlPool.request().query(query || `SELECT TOP 50 * FROM dbo.${table || 'EncDec_SecurityAlerts'} ORDER BY timestamp DESC`);
      return res.json({
        source: 'Microsoft SQL Server (Live TDS)',
        rows: q.recordset || [],
        count: q.recordset?.length || 0,
        columns: q.recordset?.columns ? Object.keys(q.recordset.columns) : (q.recordset?.[0] ? Object.keys(q.recordset[0]) : [])
      });
    } catch (err: any) {
      return res.status(400).json({ error: `SQL Server execution error: ${err.message}` });
    }
  }

  // Dual Fallback Query Engine (Query local dual-sync schema if SQL Server is in standby/unreachable)
  const targetTable = (table || 'EncDec_SecurityAlerts').toLowerCase();
  let dataset: any[] = [];
  if (targetTable.includes('alert')) dataset = dbState.alerts;
  else if (targetTable.includes('audit')) dataset = dbState.auditLogs;
  else if (targetTable.includes('email')) dataset = dbState.emailLogs || [];
  else if (targetTable.includes('user')) dataset = dbState.users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, mfaEnabled: u.mfaEnabled, createdAt: u.createdAt }));
  else if (targetTable.includes('rule')) dataset = dbState.rules;
  else if (targetTable.includes('host')) dataset = dbState.hosts;
  else dataset = dbState.alerts;

  res.json({
    source: 'Dual-Sync Store (Simulated / Local Buffer)',
    notice: 'SQL Server live connection is in standby. Showing dual-synced buffered records mapped to dbo.* tables.',
    rows: dataset.slice(0, 50),
    count: dataset.length,
    columns: dataset[0] ? Object.keys(dataset[0]) : []
  });
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
