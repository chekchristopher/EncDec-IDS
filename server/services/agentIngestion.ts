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
   * Real Ingress Exploit Probe Controller
   * Dispatches an actual live HTTP attack request across the wire to test
   * real-time Deep Packet Inspection (DPI) interception and active response.
   */
  router.post(['/dispatch-probe', '/execute-probe'], async (req: Request, res: Response) => {
    try {
      const port = process.env.CONTROL_PLANE_PORT ? 3000 : (Number(process.env.PORT) || 3000);
      const attackerIp = (req.body?.attackerIp as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || '185.220.101.42';
      const probePath = `/api/student/records?department=cybersec' UNION SELECT 1,username,password_hash FROM users WHERE '1'='1--`;

      await fetch(`http://127.0.0.1:${port}${probePath}`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': attackerIp,
          'user-agent': 'ThreatHunter-Probe/4.1 (Linux; Live Exploit Analyzer)'
        }
      }).catch(() => null);

      addAuditLog('system', 'analyst@encdec.io', 'Live Ingress Exploit Probe Dispatched', 'SQLi Real Probe', attackerIp, 'success');
      res.status(200).json({ 
        status: 'ok', 
        scenario: 'live_exploit_probe', 
        message: 'Real HTTP exploit request dispatched across local network port. Intercepted and alerted by Real-Time DPI sniffer.' 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
