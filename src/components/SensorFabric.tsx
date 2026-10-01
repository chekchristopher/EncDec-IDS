/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, Radio, Activity, Terminal, Shield, CheckCircle2, 
  AlertTriangle, Copy, Check, Download, Play, RefreshCw, BarChart2, Layers
} from 'lucide-react';
import { SensorStatus } from '../types.js';
import { apiRequest } from '../api.js';

interface SensorFabricProps {
  sensors: SensorStatus[];
  onRefreshData?: () => void;
  onShowAlert?: (msg: string) => void;
}

export default function SensorFabric({
  sensors,
  onRefreshData,
  onShowAlert
}: SensorFabricProps) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [mitreData, setMitreData] = useState<any>(null);
  const [loadingMitre, setLoadingMitre] = useState(false);

  useEffect(() => {
    const loadMitre = async () => {
      setLoadingMitre(true);
      try {
        const data = await apiRequest('/api/mitre-coverage');
        setMitreData(data);
      } catch (err) {
        console.error('Failed to load MITRE coverage:', err);
      } finally {
        setLoadingMitre(false);
      }
    };
    loadMitre();
  }, []);

  const agentCommand = `curl -s https://encdec-ids.onrender.com/scripts/encdec-agent.py | python3`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(agentCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
    if (onShowAlert) onShowAlert('Agent curl command copied to clipboard!');
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                EncDec Real-Telemetry Fabric
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Decoupled Ingestion Pipeline
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              Sensor Health & Ingestion Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-world detection requires actual telemetry. EncDec ingests raw Suricata EVE JSON alerts, Zeek protocol-level transaction streams, and native Host Agent telemetry (processes, FIM changes, auth records).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Sensors
            </button>
          </div>
        </div>
      </div>

      {/* Real Host Agent Deployment Bar */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Deploy Real EncDec Host Agent (Linux / macOS / Windows)
            </h3>
          </div>
          <a
            href="/scripts/encdec-agent.py"
            download="encdec-agent.py"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> Download Script
          </a>
        </div>

        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
          Run this single command on any target server. The lightweight agent will automatically register with your SOC console, monitor process spawns, detect unauthorized changes to critical files (<code className="text-cyan-300 font-mono">/etc/shadow</code>, <code className="text-cyan-300 font-mono">/etc/passwd</code>, <code className="text-cyan-300 font-mono">cron</code>), and stream telemetry directly into the correlation engine:
        </p>

        <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-white/10 font-mono text-xs text-cyan-300">
          <span className="text-slate-500 select-none">$</span>
          <span className="flex-1 select-all">{agentCommand}</span>
          <button
            onClick={copyToClipboard}
            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCmd ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Connected Sensors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sensors.map((sensor) => {
          const isOnline = sensor.status === 'online';

          return (
            <div
              key={sensor.id}
              className="bg-slate-900 border border-white/10 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-950 text-cyan-400 border border-cyan-500/20">
                    {sensor.type.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold ${
                    isOnline ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    {sensor.status.toUpperCase()}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white font-mono mb-1">
                  {sensor.name}
                </h4>

                <div className="text-xs text-slate-400 font-mono mb-4">
                  IP: <strong className="text-slate-300">{sensor.ipAddress}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-lg border border-white/5 font-mono text-xs mb-3">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Event Rate</div>
                    <div className="text-white font-bold">{sensor.eventRateSec.toLocaleString()}/s</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Packet Loss</div>
                    <div className="text-emerald-400 font-bold">{sensor.droppedEvents} drops</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Ruleset</div>
                    <div className="text-cyan-400 font-bold truncate">{sensor.rulesetVersion}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Heartbeat</div>
                    <div className="text-slate-300 font-bold">{new Date(sensor.lastHeartbeat).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-2 border-t border-white/5">
                <span>Uptime: {Math.floor(sensor.uptimeSeconds / 3600)}h {Math.floor((sensor.uptimeSeconds % 3600) / 60)}m</span>
                <span className="text-cyan-400">Streaming EVE/JSON</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MITRE ATT&CK Matrix Coverage Breakdown */}
      {mitreData && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                MITRE ATT&CK Enterprise Tactical Matrix Coverage
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Objective telemetry coverage across the adversary lifecycle (Reconnaissance to Impact).
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-slate-400">Overall Coverage Score:</span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {mitreData.overallPercentage}% Validated
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mitreData.tactics?.map((t: any) => {
              const pct = Math.round((t.covered / t.total) * 100);

              return (
                <div key={t.tactic} className="bg-slate-950 p-3.5 rounded-lg border border-white/5 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                    <span className="truncate">{t.tactic}</span>
                    <span className="text-cyan-400">{pct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {t.techniques?.map((tech: string) => (
                      <span key={tech} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-white/5">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ingestion API Endpoint Reference */}
      <div className="bg-slate-900 border border-white/10 rounded-xl p-5 shadow-xl font-mono text-xs">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Ingestion REST & Webhook Endpoints
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
            <div className="text-emerald-400 font-bold mb-1">POST /api/ingest/suricata</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Accepts standard Suricata EVE JSON or newline-delimited stream. Correlates CVEs and exploit signatures.
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
            <div className="text-emerald-400 font-bold mb-1">POST /api/ingest/zeek</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Accepts Zeek connection, DNS, and notice logs for stateful network traffic baselines and stealth sweep detection.
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
            <div className="text-emerald-400 font-bold mb-1">POST /api/ingest/host-agent</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Endpoint for EncDec Agent heartbeat: process trees, FIM changes (/etc/shadow), CPU/RAM, and listening sockets.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
