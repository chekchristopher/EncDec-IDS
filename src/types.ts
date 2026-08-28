/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User System Types
export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  name: string;
  role: string; // 'admin' | 'analyst' | 'operator'
  status: 'active' | 'suspended';
  mfaEnabled: boolean;
  mfaSecret?: string;
  avatarUrl?: string;
  lastNameChangeDate?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  lastActive: string;
}

// Host IDS Types
export interface Host {
  id: string;
  name: string;
  os: 'windows' | 'linux' | 'macos' | 'darwin' | 'other';
  ipAddress: string;
  status: 'online' | 'offline';
  lastSeen: string;
  agentVersion: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  createdAt: string;
}

export interface RunningProcess {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  user: string;
  path: string;
  suspicious: boolean;
}

export interface FileChange {
  timestamp: string;
  filePath: string;
  action: 'created' | 'modified' | 'deleted';
  hash?: string;
  user?: string;
}

export interface ServiceState {
  name: string;
  status: 'running' | 'stopped' | 'disabled';
  displayName: string;
}

export interface LoginSession {
  username: string;
  terminal: string;
  host: string;
  loginTime: string;
}

export interface HostTelemetry {
  hostId: string;
  processes: RunningProcess[];
  fileChanges: FileChange[];
  services: ServiceState[];
  logins: LoginSession[];
  cpu: number;
  memory: number;
  disk: number;
  systemCalls: string[];
  usbConnected: boolean;
  cronJobs: string[];
}

// Network IDS Types
export interface Packet {
  id: string;
  timestamp: string;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'HTTP' | 'HTTPS' | 'ARP' | 'DHCP' | 'SMTP' | 'FTP' | 'SSH' | 'SMB';
  sourceIp: string;
  sourcePort?: number;
  destIp?: string;
  destinationIp?: string;
  destPort?: number;
  length: number;
  payloadInfo?: string;
  payloadSample?: string;
  flags?: string;
  suspicious?: boolean;
  ruleId?: string;
  metadata?: Record<string, any>;
}

// Detection Engine Types
export interface Rule {
  id: string;
  name: string;
  type: 'signature' | 'behavior' | 'anomaly';
  target: 'host' | 'network' | 'application';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  enabled: boolean;
  definition: string; // JSON pattern or rule code
  mitreMapping?: string; // e.g. T1059
  createdAt: string;
  createdBy: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  category: string; // 'Brute Force' | 'Port Scan' | 'Malware' | 'DDoS' | etc.
  source: string; // e.g., Hostname or IP
  target?: string;
  status: 'unhandled' | 'ignored' | 'escalated' | 'resolved';
  ruleId?: string;
  mitreMapping?: string;
}

export interface Threat {
  id: string;
  timestamp: string;
  score: number; // 0-100 risk scoring
  actor?: string;
  vector: string;
  status: 'active' | 'mitigated' | 'under_investigation';
  associatedAlerts: string[]; // Alert IDs
  mitreMapping?: string;
}

// Security Configuration
export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string; // first 8 chars, rest hidden
  role: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
}

// Reports
export interface SecurityReport {
  id: string;
  title: string;
  type: 'PDF' | 'CSV' | 'JSON';
  timeframe: string;
  generatedAt: string;
  generatedBy: string;
  downloadUrl: string;
}

// Live Logging & Audit Trail
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userRole?: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'success' | 'failure';
}

export interface LiveActivity {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userRole?: string;
  action: string; // 'login' | 'started_scan' | etc.
  details: string;
}

export interface ThreatIntelFeed {
  id: string;
  type: 'ip' | 'domain' | 'hash';
  value: string;
  threatType: string;
  source: string;
  confidence: number;
  addedAt: string;
}

export interface MLModel {
  id: string;
  name: string;
  type: 'isolation_forest' | 'autoencoder' | 'kmeans';
  accuracy: number;
  status: 'active' | 'training' | 'idle';
  lastTrained: string;
}

export interface QuarantineItem {
  id: string;
  hostId: string;
  type: 'file' | 'process' | 'ip';
  targetValue: string; // e.g., filepath, pid, or IP
  reason: string;
  isolatedAt: string;
  isolatedBy: string;
}

export interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  recipientName?: string;
  senderEmail?: string;
  senderUserId?: string;
  subject: string;
  bodyText?: string;
  htmlBody?: string;
  previewSnippet?: string;
  eventType?: 'registration' | 'login' | string;
  type?: 'registration' | 'login' | string;
  role?: string;
  status: 'sent' | 'queued' | 'simulated';
}

export interface MssqlConfig {
  server: string;
  port: number;
  database: string;
  authType: 'windows' | 'sql';
  domain?: string;
  user: string;
  password?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  enabled: boolean;
}

export interface DualDatabaseStatus {
  firebase: {
    enabled: boolean;
    connected: boolean;
    projectId?: string;
    databaseId?: string;
    collectionsCount: number;
    lastSynced?: string;
  };
  mssql: {
    enabled: boolean;
    connected: boolean;
    server?: string;
    database?: string;
    authType?: 'windows' | 'sql';
    domain?: string;
    user?: string;
    lastSynced?: string;
    tableCounts: {
      users: number;
      alerts: number;
      auditLogs: number;
      emailLogs: number;
      rules: number;
      hosts: number;
      threatIntel: number;
    };
    error?: string;
  };
}

