/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import bcryptjs from 'bcryptjs';
import { DbSchema } from './schema.js';

// Securely derive seed password hashes using environment variables or strong production defaults
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin#2026!SecOps';
const ANALYST_PASSWORD = process.env.ANALYST_PASSWORD || 'Analyst#2026!Tier1';

export function getInitialDatabaseState(): DbSchema {
  return {
    users: [
      {
        id: 'usr_1',
        email: 'chekchris85@gmail.com',
        passwordHash: bcryptjs.hashSync(ADMIN_PASSWORD, 10),
        name: 'Chris Analyst',
        role: 'admin',
        status: 'active',
        mfaEnabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_2',
        email: 'analyst@enterprise.sec',
        passwordHash: bcryptjs.hashSync(ANALYST_PASSWORD, 10),
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
}

export const DEFAULT_DB: DbSchema = getInitialDatabaseState();
