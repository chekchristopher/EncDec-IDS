/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Flame, ShieldAlert, Crosshair, Search, CheckCircle2, XCircle, 
  Clock, AlertTriangle, ArrowRight, Server, Terminal, Shield, 
  Play, Download, Eye, ExternalLink, RefreshCw, Cpu, Layers, UserCheck
} from 'lucide-react';
import { Incident, ActiveResponseAction, RawSecurityEvent, SensorStatus } from '../types.js';
import { apiRequest } from '../api.js';
import TacticalReconModal, { ThreatTargetData } from './TacticalReconModal.js';

interface IncidentsWorkspaceProps {
  currentUser: any;
  incidents: Incident[];
  activeResponses: ActiveResponseAction[];
  sensors: SensorStatus[];
  onRefreshData?: () => void;
  onShowAlert?: (msg: string) => void;
}

export default function IncidentsWorkspace({
  currentUser,
  incidents,
  activeResponses,
  sensors,
  onRefreshData,
  onShowAlert
}: IncidentsWorkspaceProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0] || null);
  const [huntingQuery, setHuntingQuery] = useState('');
  const [huntingEvents, setHuntingEvents] = useState<RawSecurityEvent[]>([]);
  const [huntingLoading, setHuntingLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState<string | null>(null);
  const [analystNoteInput, setAnalystNoteInput] = useState('');
  const [showReconModal, setShowReconModal] = useState(false);
  const [reconTarget, setReconTarget] = useState<ThreatTargetData | null>(null);

  const launchIncidentRecon = (inc: Incident) => {
    const targetData: ThreatTargetData = {
      id: inc.id,
      sourceIp: inc.attackerIp || '185.220.101.42',
      country: inc.attackerGeo?.country || 'Germany',
      city: inc.attackerGeo?.city || 'Frankfurt',
      coords: { lat: 50.1109, lng: 8.6821 },
      vector: inc.title,
      severity: inc.severity,
      timestamp: inc.firstSeen,
      targetAsset: inc.targetHostName || inc.targetIp,
      asn: inc.attackerGeo?.asn
    };
    setReconTarget(targetData);
    setShowReconModal(true);
  };

  // Keep selected incident synced
  useEffect(() => {
    if (selectedIncident) {
      const updated = incidents.find(i => i.id === selectedIncident.id);
      if (updated) setSelectedIncident(updated);
    } else if (incidents.length > 0) {
      setSelectedIncident(incidents[0]);
    }
  }, [incidents]);

  // Load raw security events for threat hunting
  const runThreatHunt = async (query = huntingQuery) => {
    setHuntingLoading(true);
    try {
      const events = await apiRequest(`/api/security-events?q=${encodeURIComponent(query)}`);
      setHuntingEvents(events);
    } catch (err: any) {
      console.error('Failed to run threat hunt:', err);
    } finally {
      setHuntingLoading(false);
    }
  };

  useEffect(() => {
    runThreatHunt('');
  }, []);

  // Handle Response Action (Approve / Reject)
  const handleAction = async (actionId: string, type: 'approve' | 'reject') => {
    setActionProcessing(actionId);
    try {
      await apiRequest(`/api/responses/${actionId}/${type}`, 'POST');
      if (onShowAlert) {
        onShowAlert(`Active Response action successfully ${type === 'approve' ? 'executed' : 'rejected'}.`);
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowAlert) onShowAlert(`Action failed: ${err.message}`);
    } finally {
      setActionProcessing(null);
    }
  };

  // Update Incident Status
  const handleUpdateStatus = async (incidentId: string, status: string) => {
    try {
      await apiRequest(`/api/incidents/${incidentId}/status`, 'POST', { status });
      if (onShowAlert) onShowAlert(`Incident ${incidentId} marked as ${status.toUpperCase()}.`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowAlert) onShowAlert(`Failed to update status: ${err.message}`);
    }
  };

  // Add Analyst Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analystNoteInput.trim() || !selectedIncident) return;

    try {
      await apiRequest(`/api/incidents/${selectedIncident.id}/notes`, 'POST', { note: analystNoteInput });
      setAnalystNoteInput('');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowAlert) onShowAlert(`Failed to save note: ${err.message}`);
    }
  };

  // Dispatch an actual real HTTP attack probe across the wire to test the real DPI engine
  const [probingAttack, setProbingAttack] = useState(false);

  const triggerLiveAttackProbe = async () => {
    setProbingAttack(true);
    try {
      const res = await apiRequest('/api/probe/live-attack', 'POST', { vector: 'sqli' });
      if (onShowAlert) {
        onShowAlert(`[Real Ingress Intercepted] ${res.vector} from IP ${res.attackerOriginIp} logged by DPI!`);
      }
      setTimeout(() => {
        if (onRefreshData) onRefreshData();
        runThreatHunt('');
      }, 700);
    } catch (err: any) {
      if (onShowAlert) onShowAlert(`Probe failed: ${err.message}`);
    } finally {
      setProbingAttack(false);
    }
  };

  const pendingResponses = activeResponses.filter(r => r.status === 'pending_approval');

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner: Hybrid SOC Correlation Status & Lab Trigger */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cross-Layer Correlation Fabric Active
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {sensors.filter(s => s.status === 'online').length} Sensors Streaming Telemetry
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Incidents & Threat Hunting Workspace
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time multi-stage attack detection. Correlates Suricata NIDS alerts, Zeek transaction telemetry, and EncDec Host Agent events across sliding temporal windows into prioritized, actionable kill chains.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={triggerLiveAttackProbe}
              disabled={probingAttack}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold transition-all cursor-pointer shadow-lg disabled:opacity-50"
              title="Dispatches an actual live HTTP SQL Injection exploit payload across the network port to verify Deep Packet Inspection interception"
            >
              <Play className={`w-3.5 h-3.5 ${probingAttack ? 'animate-spin' : ''}`} />
              {probingAttack ? 'Dispatching Real HTTP Exploit...' : 'Execute Live Ingress Exploit Probe'}
            </button>

            <a
              href="/scripts/encdec-agent.py"
              download="encdec-agent.py"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs font-semibold transition-all cursor-pointer"
              title="Download real Python HIDS Endpoint Agent for Linux, macOS, or Windows"
            >
              <Download className="w-3.5 h-3.5" />
              Download Host Agent Script
            </a>
          </div>
        </div>

        {/* Real Host Agent Quick Command Bar */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Deploy Real Agent via Terminal:</span>
            <code className="bg-slate-950 px-2 py-1 rounded text-cyan-300 border border-white/10 select-all">
              curl -s https://encdec-ids.onrender.com/scripts/encdec-agent.py | python3
            </code>
          </div>
          <div className="text-[11px] text-slate-500">
            Reports processes, FIM file changes, CPU/RAM, and listening sockets.
          </div>
        </div>
      </div>

      {/* Controlled Active Response Approval Queue */}
      {pendingResponses.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider font-mono">
                Controlled Active Response: {pendingResponses.length} Action{pendingResponses.length > 1 ? 's' : ''} Awaiting Operator Approval
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Zero-Risk Guardrail: Human-in-the-Loop Mode
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingResponses.map((action) => (
              <div key={action.id} className="bg-slate-900/90 border border-white/10 rounded-lg p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
                      {action.actionType.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400">{action.targetHost || 'Perimeter'}</span>
                  </div>
                  <div className="text-xs font-semibold text-white font-mono break-all mb-1">
                    Target: <span className="text-cyan-400">{action.target}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                    {action.reason}
                  </p>
                  {action.commandExecuted && (
                    <div className="bg-slate-950 p-1.5 rounded border border-white/5 font-mono text-[10px] text-slate-400 truncate mb-3">
                      {action.commandExecuted}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleAction(action.id, 'approve')}
                    disabled={actionProcessing === action.id}
                    className="flex-1 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve & Run
                  </button>
                  <button
                    onClick={() => handleAction(action.id, 'reject')}
                    disabled={actionProcessing === action.id}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Incident Selector + Deep Dive Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              Correlated Attack Incidents ({incidents.length})
            </h3>
            <button
              onClick={onRefreshData}
              className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              const isCrit = inc.severity === 'critical';

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-850 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/80 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{inc.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        {inc.confidenceScore}% Conf
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                      inc.status === 'investigating' ? 'bg-amber-500/10 text-amber-400' :
                      inc.status === 'contained' ? 'bg-blue-500/10 text-blue-400' :
                      inc.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {inc.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-white mb-1.5 line-clamp-2">
                    {inc.title}
                  </h4>

                  <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                    {inc.summary}
                  </p>

                  {/* Kill-Chain Stage Progression Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {inc.stagesDetected.map((stg) => (
                      <span
                        key={stg}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-cyan-500/20"
                      >
                        {stg}
                      </span>
                    ))}
                  </div>

                  {/* Attacker Context Footer */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                    <span>Source: <strong className="text-slate-300">{inc.attackerIp}</strong></span>
                    <span>Target: <strong className="text-slate-300">{inc.targetHostName || inc.targetIp}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Dive Investigation & Attack Graph */}
        <div className="lg:col-span-7 space-y-4">
          {selectedIncident ? (
            <div className="bg-slate-900 border border-white/10 rounded-xl p-5 space-y-6">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-cyan-400">{selectedIncident.id}</span>
                    <span className="text-xs text-slate-400">First observed: {new Date(selectedIncident.firstSeen).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {selectedIncident.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">Triage:</span>
                  <select
                    value={selectedIncident.status}
                    onChange={(e) => handleUpdateStatus(selectedIncident.id, e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="new">NEW</option>
                    <option value="investigating">INVESTIGATING</option>
                    <option value="contained">CONTAINED</option>
                    <option value="resolved">RESOLVED</option>
                    <option value="closed">CLOSED</option>
                  </select>
                </div>
              </div>

              {/* Attacker Context & Threat Intel Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-lg border border-white/5 font-mono text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Adversary Source</div>
                    <div className="text-white font-bold">{selectedIncident.attackerIp}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {selectedIncident.attackerGeo?.city}, {selectedIncident.attackerGeo?.country}
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      {selectedIncident.attackerGeo?.asn}
                    </div>
                  </div>
                  <button
                    onClick={() => launchIncidentRecon(selectedIncident)}
                    className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Inspect physical street address and building via Google Maps Satellite & Street View"
                  >
                    <Crosshair className="w-3 h-3 text-cyan-400" />
                    <span>Deep Seek</span>
                  </button>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Target Asset Context</div>
                  <div className="text-cyan-400 font-bold">{selectedIncident.targetHostName || selectedIncident.targetIp}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">IP: {selectedIncident.targetIp}</div>
                  <div className="text-slate-500 text-[10px]">Criticality: Production Tier-1</div>
                </div>
              </div>

              {/* Attack Path Visualizer */}
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Correlated Attack Path (Kill-Chain Progression)
                </h4>

                <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-3 rounded-lg border border-white/5 font-mono text-xs">
                  {selectedIncident.stagesDetected.map((stage, idx) => (
                    <React.Fragment key={stage}>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/30 text-cyan-300 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {stage}
                      </div>
                      {idx < selectedIncident.stagesDetected.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Minute-by-Minute Telemetry Timeline */}
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Correlated Event Timeline ({selectedIncident.timeline?.length || 0} Telemetry Corroborations)
                </h4>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedIncident.timeline?.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-slate-950 border border-white/5 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            entry.layer === 'network' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {entry.layer}
                          </span>
                          <span className="text-slate-400">{entry.sensor}</span>
                        </div>
                        <span className="text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>

                      <div className="font-semibold text-white font-mono mt-0.5">
                        {entry.title}
                      </div>

                      <p className="text-slate-400 text-xs">
                        {entry.description}
                      </p>

                      {entry.evidence && (
                        <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-cyan-300/80 overflow-x-auto border border-white/5 mt-1">
                          {JSON.stringify(entry.evidence)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Containment Actions */}
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Recommended Active Response Actions
                </h4>
                <div className="space-y-1.5">
                  {selectedIncident.recommendedActions?.map((act, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1.5 rounded border border-white/5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyst Investigation Notes */}
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Analyst Log & Chain of Custody
                </h4>

                <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                  {selectedIncident.analystNotes?.map((note, i) => (
                    <div key={i} className="text-xs text-slate-300 font-mono bg-slate-950/80 px-3 py-1.5 rounded border border-white/5">
                      {note}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={analystNoteInput}
                    onChange={(e) => setAnalystNoteInput(e.target.value)}
                    placeholder="Enter case note, containment observation, or evidence hash..."
                    className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono rounded-lg transition-colors cursor-pointer"
                  >
                    Add Note
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-white/10 rounded-xl p-12 text-center text-slate-400 font-mono text-sm">
              Select an incident from the list to inspect correlation evidence and execute active responses.
            </div>
          )}
        </div>
      </div>

      {/* Threat Hunting Terminal */}
      <div className="bg-slate-900 border border-white/10 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Search className="w-4 h-4 text-cyan-400" />
              Live Threat Hunting Search Query Terminal
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Query normalized multi-sensor event pipeline (Suricata, Zeek, EncDec Host Agent, Syslog).
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 max-w-md w-full">
            <input
              type="text"
              value={huntingQuery}
              onChange={(e) => setHuntingQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runThreatHunt()}
              placeholder="Search IP, PID, technique (e.g. T1190), or filename..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => runThreatHunt()}
              disabled={huntingLoading}
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {huntingLoading ? 'Hunting...' : 'Query'}
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Sensor / Type</th>
                <th className="pb-2">Source IP</th>
                <th className="pb-2">Target</th>
                <th className="pb-2">Event / Technique</th>
                <th className="pb-2">Severity</th>
                <th className="pb-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {huntingEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 text-slate-400 text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-white/10 text-cyan-300">
                      {evt.sourceType.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-200">{evt.sourceIp || 'Host Local'}</td>
                  <td className="py-2.5 text-slate-300">{evt.destIp || evt.hostId || 'N/A'}</td>
                  <td className="py-2.5">
                    <div className="text-white font-semibold">{evt.eventType}</div>
                    {evt.mitre && (
                      <div className="text-[10px] text-cyan-400">{evt.mitre.technique} - {evt.mitre.tactic}</div>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      evt.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      evt.severity === 'high' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400 max-w-xs truncate text-[11px]">
                    {evt.details?.signature || evt.details?.commandLine || evt.details?.filePath || JSON.stringify(evt.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tactical Reconnaissance & Deep Seek Modal */}
      <TacticalReconModal
        isOpen={showReconModal}
        onClose={() => setShowReconModal(false)}
        target={reconTarget}
        customApiKey={currentUser?.customMapsApiKey}
      />

    </div>
  );
}
