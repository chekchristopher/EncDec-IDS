/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DbSchema } from '../db/schema.js';
import { 
  RawSecurityEvent, Incident, IncidentTimelineEvent, 
  KillChainStage, ActiveResponseAction, SensorStatus, Alert 
} from '../../src/types.js';

// Threat Intel database lookup helper
export function enrichIp(ip: string, dbState: DbSchema): {
  reputation: string;
  isThreatIntelMatch: boolean;
  threatType?: string;
  country: string;
  city: string;
  asn: string;
} {
  // Check against internal Threat Intel Feeds
  const feedMatch = dbState.threatIntel.find(f => f.type === 'ip' && f.value === ip);
  
  // Deterministic geo & ASN lookup based on IP range / threat intelligence enrichment
  let country = 'Unknown';
  let city = 'External Subnet';
  let asn = 'AS-Transit Gateway';
  let reputation = 'Benign / Unclassified';

  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.') || ip.startsWith('127.')) {
    country = 'Internal Enterprise Network';
    city = 'Local Subnet';
    asn = 'RFC1918 Private';
    reputation = 'Internal Asset';
  } else if (ip.startsWith('185.220.') || ip.startsWith('198.51.') || ip.startsWith('103.') || ip.startsWith('45.')) {
    country = 'Germany';
    city = 'Frankfurt';
    asn = 'AS24940 Hetzner Online GmbH';
    reputation = 'Suspicious / Tor Exit Node (Score: 92/100)';
  } else if (ip.startsWith('105.112.') || ip.startsWith('197.210.') || ip.startsWith('102.89.')) {
    country = 'Nigeria';
    city = 'Lagos / Anambra';
    asn = 'AS37108 MTN Nigeria';
    reputation = 'Regional Traffic';
  } else {
    country = 'United States';
    city = 'Ashburn';
    asn = 'AS14618 Amazon.com';
    reputation = 'Cloud Infrastructure';
  }

  if (feedMatch) {
    reputation = `Known Threat: ${feedMatch.threatType} (${feedMatch.source}, Conf: ${feedMatch.confidence}%)`;
  }

  return {
    reputation,
    isThreatIntelMatch: !!feedMatch,
    threatType: feedMatch?.threatType,
    country,
    city,
    asn
  };
}

export class CorrelationEngine {
  constructor(
    private dbState: DbSchema,
    private saveDb: () => void,
    private broadcastWs: (msg: any) => void,
    private addAuditLog: (userId: string, email: string, action: string, resource: string, ip: string, status: 'success' | 'failure', role?: string) => void
  ) {}

  /**
   * Ingest a normalized security event from any sensor (Suricata, Zeek, EncDec Host Agent, Syslog)
   */
  public async processEvent(event: RawSecurityEvent): Promise<{
    event: RawSecurityEvent;
    correlatedIncident?: Incident;
    alertCreated?: Alert;
  }> {
    // 1. Store event in securityEvents collection (capped at 1000 items)
    this.dbState.securityEvents.unshift(event);
    if (this.dbState.securityEvents.length > 1000) {
      this.dbState.securityEvents.pop();
    }

    // 2. Update sensor heartbeat and stats
    this.updateSensorHeartbeat(event.sensorId, event.sourceType);

    // 3. Determine if an Alert should be created
    let createdAlert: Alert | undefined;
    if (event.severity === 'critical' || event.severity === 'high' || event.details?.suspicious) {
      createdAlert = {
        id: 'alt_' + Math.random().toString(36).substring(2, 9),
        timestamp: event.timestamp,
        severity: event.severity === 'critical' ? 'critical' : 'high',
        title: `${event.sourceType.toUpperCase()}: ${event.eventType.replace(/_/g, ' ').toUpperCase()}`,
        description: event.details?.signature || event.details?.commandLine || JSON.stringify(event.details),
        category: event.mitre?.tactic || 'Intrusion Detection',
        source: event.sourceIp || event.hostId || event.sensorId,
        target: event.destIp || event.hostId,
        status: 'unhandled',
        mitreMapping: event.mitre ? `${event.mitre.technique} (${event.mitre.tactic})` : undefined
      };

      this.dbState.alerts.unshift(createdAlert);
      if (this.dbState.alerts.length > 300) this.dbState.alerts.pop();
    }

    // 4. Run Cross-Layer Correlation
    const correlatedIncident = this.correlate(event, createdAlert);

    // 5. Persist and Broadcast
    this.saveDb();

    this.broadcastWs({
      type: 'SECURITY_EVENT',
      payload: event
    });

    if (createdAlert) {
      this.broadcastWs({
        type: 'ALERTS_UPDATE',
        payload: this.dbState.alerts
      });
    }

    if (correlatedIncident) {
      this.broadcastWs({
        type: 'INCIDENTS_UPDATE',
        payload: this.dbState.incidents
      });
      this.broadcastWs({
        type: 'INCIDENT_ALERT',
        payload: correlatedIncident
      });
    }

    return { event, correlatedIncident, alertCreated: createdAlert };
  }

  /**
   * Multi-stage attack correlator
   * Correlates host events and network events within a 10-minute sliding window
   */
  private correlate(event: RawSecurityEvent, alert?: Alert): Incident | undefined {
    // Only correlate suspicious, high, or critical events
    if (event.severity === 'low' || event.severity === 'info') {
      return undefined;
    }

    const now = new Date(event.timestamp).getTime();
    const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    // Find any existing active incident targeting the same host or attacker IP
    let incident = this.dbState.incidents.find(inc => {
      if (inc.status === 'resolved' || inc.status === 'closed') return false;
      const incLastSeen = new Date(inc.lastSeen).getTime();
      if (now - incLastSeen > WINDOW_MS) return false;

      // Correlate by target host, target IP, or attacker IP
      const matchHost = event.hostId && inc.targetHostId === event.hostId;
      const matchTargetIp = event.destIp && inc.targetIp === event.destIp;
      const matchAttackerIp = event.sourceIp && inc.attackerIp === event.sourceIp;

      return matchHost || matchTargetIp || matchAttackerIp;
    });

    const stage: KillChainStage = event.mitre?.tactic || this.deduceStage(event);
    const timelineEntry: IncidentTimelineEvent = {
      id: 'tml_' + Math.random().toString(36).substring(2, 9),
      timestamp: event.timestamp,
      layer: event.sourceType === 'host_agent' ? 'host' : 'network',
      sensor: event.sensorId,
      stage,
      title: `${event.sourceType.toUpperCase()} - ${event.eventType.replace(/_/g, ' ')}`,
      description: event.details?.signature || event.details?.commandLine || event.details?.filePath || 'Telemetry trigger',
      evidence: event.details,
      mitreTechnique: event.mitre?.technique,
      severity: event.severity
    };

    if (incident) {
      // Append to existing incident
      incident.lastSeen = event.timestamp;
      if (!incident.stagesDetected.includes(stage)) {
        incident.stagesDetected.push(stage);
      }
      if (event.mitre?.technique && !incident.mitreTechniques.includes(event.mitre.technique)) {
        incident.mitreTechniques.push(event.mitre.technique);
      }
      if (!incident.associatedEventIds.includes(event.id)) {
        incident.associatedEventIds.push(event.id);
      }
      if (alert && !incident.associatedAlertIds.includes(alert.id)) {
        incident.associatedAlertIds.push(alert.id);
      }

      incident.timeline.push(timelineEntry);

      // Recalculate confidence score based on multi-sensor corroboration
      const distinctSensors = new Set(incident.timeline.map(t => t.sensor)).size;
      const distinctLayers = new Set(incident.timeline.map(t => t.layer)).size;
      let calculatedConfidence = 70 + (incident.stagesDetected.length * 5) + (distinctLayers > 1 ? 15 : 0);
      incident.confidenceScore = Math.min(99, calculatedConfidence);

      if (incident.stagesDetected.length >= 3) {
        incident.severity = 'critical';
      }

      // Check if we need to suggest containment actions
      this.generateRecommendedResponse(incident, event);

      return incident;
    } else if (event.severity === 'critical' || (alert && alert.severity === 'critical')) {
      // Create a brand new Correlated Incident
      const attackerIp = event.sourceIp || '185.220.101.42';
      const enrich = enrichIp(attackerIp, this.dbState);

      const targetHost = this.dbState.hosts.find(h => h.id === event.hostId || h.ipAddress === event.destIp);

      const newIncId = 'INC-' + (1000 + this.dbState.incidents.length + 1);
      const newIncident: Incident = {
        id: newIncId,
        title: `Correlated Security Incident on ${targetHost?.name || event.destIp || 'Monitored Asset'}`,
        summary: `Multi-stage attack pattern initiated from ${attackerIp} targeting ${targetHost?.name || event.destIp || 'Host'}. Initial trigger: ${event.eventType}.`,
        status: 'new',
        severity: event.severity === 'critical' ? 'critical' : 'high',
        confidenceScore: 82,
        targetHostId: targetHost?.id || event.hostId,
        targetHostName: targetHost?.name || event.destIp,
        targetIp: event.destIp || targetHost?.ipAddress,
        attackerIp,
        attackerGeo: {
          country: enrich.country,
          city: enrich.city,
          asn: enrich.asn,
          reputation: enrich.reputation
        },
        stagesDetected: [stage],
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        associatedAlertIds: alert ? [alert.id] : [],
        associatedEventIds: [event.id],
        timeline: [timelineEntry],
        mitreTechniques: event.mitre?.technique ? [event.mitre.technique] : [],
        recommendedActions: [
          `Inspect logs on ${targetHost?.name || 'target host'} around ${event.timestamp}`,
          `Verify reputation of external source ${attackerIp}`
        ],
        analystNotes: [
          `Incident automatically synthesized by EncDec Cross-Layer Correlator at ${new Date().toISOString()}.`
        ]
      };

      this.generateRecommendedResponse(newIncident, event);
      this.dbState.incidents.unshift(newIncident);
      return newIncident;
    }

    return undefined;
  }

  private deduceStage(event: RawSecurityEvent): KillChainStage {
    const t = event.eventType.toLowerCase();
    if (t.includes('scan') || t.includes('recon') || t.includes('probe')) return 'Reconnaissance';
    if (t.includes('exploit') || t.includes('sqli') || t.includes('rce') || t.includes('brute') || t.includes('auth')) return 'Initial Access';
    if (t.includes('process') || t.includes('exec') || t.includes('shell')) return 'Execution';
    if (t.includes('cron') || t.includes('persistence') || t.includes('startup') || t.includes('service_install')) return 'Persistence';
    if (t.includes('c2') || t.includes('beacon') || t.includes('tunnel')) return 'Command & Control';
    if (t.includes('exfil') || t.includes('data_upload')) return 'Exfiltration';
    return 'Execution';
  }

  private generateRecommendedResponse(incident: Incident, event: RawSecurityEvent) {
    if (!this.dbState.activeResponses) {
      this.dbState.activeResponses = [];
    }

    // Auto-recommend IP block if attacker IP is known and not already in response queue
    if (incident.attackerIp && !this.dbState.activeResponses.some(r => r.target === incident.attackerIp && r.status === 'pending_approval')) {
      const respAction: ActiveResponseAction = {
        id: 'act_resp_' + Math.random().toString(36).substring(2, 9),
        incidentId: incident.id,
        actionType: 'block_ip',
        target: incident.attackerIp,
        reason: `Correlated attack source for incident ${incident.id}`,
        mode: 'approval_required',
        status: 'pending_approval',
        requestedBy: 'Correlation Engine (Automated)',
        timestamp: new Date().toISOString(),
        commandExecuted: `iptables -I INPUT -s ${incident.attackerIp} -j DROP && ufw deny from ${incident.attackerIp}`
      };
      this.dbState.activeResponses.unshift(respAction);
      this.broadcastWs({ type: 'ACTIVE_RESPONSES_UPDATE', payload: this.dbState.activeResponses });
    }

    // Auto-recommend process termination if rogue shell PID is spotted
    if (event.details?.pid && event.sourceType === 'host_agent' && (event.details?.suspicious || event.details?.processName?.includes('sh'))) {
      const pidStr = String(event.details.pid);
      if (!this.dbState.activeResponses.some(r => r.target === pidStr && r.status === 'pending_approval')) {
        const killAction: ActiveResponseAction = {
          id: 'act_resp_' + Math.random().toString(36).substring(2, 9),
          incidentId: incident.id,
          actionType: 'kill_process',
          target: pidStr,
          targetHost: incident.targetHostName,
          reason: `Rogue process PID ${pidStr} (${event.details?.processName || 'unknown'}) identified during ${incident.id}`,
          mode: 'approval_required',
          status: 'pending_approval',
          requestedBy: 'Correlation Engine (Automated)',
          timestamp: new Date().toISOString(),
          commandExecuted: `kill -9 ${pidStr}`
        };
        this.dbState.activeResponses.unshift(killAction);
        this.broadcastWs({ type: 'ACTIVE_RESPONSES_UPDATE', payload: this.dbState.activeResponses });
      }
    }
  }

  private updateSensorHeartbeat(sensorId: string, sourceType: string) {
    let sensor = this.dbState.sensors.find(s => s.id === sensorId || s.name === sensorId);
    if (!sensor) {
      let sensorType: SensorStatus['type'] = 'hids_agent';
      if (sourceType === 'suricata') sensorType = 'nids_suricata';
      else if (sourceType === 'zeek') sensorType = 'nsm_zeek';
      else if (sourceType === 'syslog') sensorType = 'syslog_collector';

      sensor = {
        id: sensorId,
        name: sensorId,
        type: sensorType,
        status: 'online',
        ipAddress: '127.0.0.1',
        lastHeartbeat: new Date().toISOString(),
        eventRateSec: 1,
        droppedEvents: 0,
        rulesetVersion: 'v2026.10',
        uptimeSeconds: 60
      };
      this.dbState.sensors.push(sensor);
    } else {
      sensor.status = 'online';
      sensor.lastHeartbeat = new Date().toISOString();
      sensor.eventRateSec = (sensor.eventRateSec || 0) + 1;
    }
  }
}
