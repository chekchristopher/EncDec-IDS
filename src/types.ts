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
  customMapsApiKey?: string;
  customMapsApiKeyAddedAt?: string;
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
  status: 'sent' | 'queued' | 'delivered';
}

export interface WorkbookProgress {
  id: string;
  userId: string;
  email: string;
  chapterIndex: number;
  paragraphIndex: number;
  chapterTitle: string;
  readChapters: number[];
  completed: boolean;
  quizScore?: number;
  quizPassed?: boolean;
  lastReadAt: string;
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

// --- ENTERPRISE DETECTION & RESPONSE EXTENSIONS ---

export type KillChainStage = 
  | 'Reconnaissance'
  | 'Initial Access'
  | 'Execution'
  | 'Persistence'
  | 'Privilege Escalation'
  | 'Defense Evasion'
  | 'Credential Access'
  | 'Discovery'
  | 'Lateral Movement'
  | 'Collection'
  | 'Command & Control'
  | 'Exfiltration'
  | 'Impact';

export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  layer: 'network' | 'host' | 'auth' | 'correlation';
  sensor: string; // e.g. 'suricata-01', 'zeek-nsm', 'agent-linux-web01'
  stage: KillChainStage;
  title: string;
  description: string;
  evidence: Record<string, any>;
  mitreTechnique?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface Incident {
  id: string; // e.g. INC-1042
  title: string;
  summary: string;
  status: 'new' | 'investigating' | 'contained' | 'resolved' | 'closed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-100%
  targetHostId?: string;
  targetHostName?: string;
  targetIp?: string;
  attackerIp?: string;
  attackerGeo?: {
    country: string;
    city?: string;
    asn?: string;
    reputation?: string;
  };
  stagesDetected: KillChainStage[];
  firstSeen: string;
  lastSeen: string;
  associatedAlertIds: string[];
  associatedEventIds: string[];
  timeline: IncidentTimelineEvent[];
  recommendedActions: string[];
  assignedAnalyst?: string;
  analystNotes?: string[];
  mitreTechniques: string[];
}

export interface RawSecurityEvent {
  id: string;
  timestamp: string;
  sourceType: 'suricata' | 'zeek' | 'host_agent' | 'syslog' | 'packet_capture';
  sensorId: string;
  hostId?: string;
  sourceIp?: string;
  sourcePort?: number;
  destIp?: string;
  destPort?: number;
  protocol?: string;
  eventType: string; // 'dns_query', 'http_request', 'process_spawn', 'file_modify', 'exploit_detected', 'failed_auth'
  details: Record<string, any>;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  mitre?: {
    tactic: KillChainStage;
    technique: string;
    subtechnique?: string;
  };
}

export interface ActiveResponseAction {
  id: string;
  incidentId?: string;
  actionType: 'block_ip' | 'isolate_host' | 'kill_process' | 'quarantine_file';
  target: string; // IP, Host ID, PID, or filepath
  targetHost?: string;
  reason: string;
  mode: 'manual' | 'approval_required' | 'automatic';
  status: 'pending_approval' | 'executed' | 'rejected' | 'failed';
  requestedBy: string;
  approvedBy?: string;
  timestamp: string;
  executedAt?: string;
  commandExecuted?: string;
  resultOutput?: string;
}

export interface SensorStatus {
  id: string;
  name: string;
  type: 'nids_suricata' | 'nsm_zeek' | 'hids_agent' | 'syslog_collector';
  status: 'online' | 'degraded' | 'offline';
  ipAddress: string;
  hostOs?: string;
  lastHeartbeat: string;
  eventRateSec: number;
  droppedEvents: number;
  rulesetVersion: string;
  uptimeSeconds: number;
}

export interface StoredCertificate {
  certificateId: string;
  userId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  recipientEmail: string;
  courseTitle: string;
  accreditationLevel: string;
  quizScore: number;
  quizPassed: boolean;
  issueDate: string;
  verificationCode: string;
  verifiedAt: string;
  verificationUrl: string;
  qrCodeDataUrl?: string;
  status: 'active' | 'revoked';
  attestationStatement: string;
}

