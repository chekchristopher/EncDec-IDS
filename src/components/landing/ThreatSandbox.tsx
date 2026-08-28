import React from 'react';
import { 
  Terminal, ShieldCheck, Cpu, Database, 
  Play, RotateCcw, AlertTriangle, Layers, Lock
} from 'lucide-react';

interface ThreatSandboxProps {
  sandboxAttackType: string;
  setSandboxAttackType: (val: string) => void;
  sandboxRunning: boolean;
  sandboxLogs: string[];
  sandboxDetections: number;
  sandboxMitigated: number;
  sandboxSpeed: number;
  setSandboxSpeed: (val: number) => void;
  runAttackSandbox: () => void;
  resetSandbox: () => void;
  sandboxTarget: string;
  setSandboxTarget: (val: string) => void;
}

export default function ThreatSandbox({
  sandboxAttackType,
  setSandboxAttackType,
  sandboxRunning,
  sandboxLogs,
  sandboxDetections,
  sandboxMitigated,
  sandboxSpeed,
  setSandboxSpeed,
  runAttackSandbox,
  resetSandbox,
  sandboxTarget,
  setSandboxTarget
}: ThreatSandboxProps) {
  return (
    <div id="threat-sandbox-container" className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Live Threat Simulation & Anomaly Sandbox</h3>
          </div>
          <p className="text-xs text-slate-400">
            Inject realistic cyber attacks into the Deep Packet Inspection (DPI) & Heuristic classifier to evaluate real-time response.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500 mr-2">Target:</span>
            <input 
              type="text" 
              value={sandboxTarget}
              onChange={(e) => setSandboxTarget(e.target.value)}
              className="bg-transparent text-cyan-400 font-mono focus:outline-none w-36"
              placeholder="target host"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-run-sandbox"
              onClick={runAttackSandbox}
              disabled={sandboxRunning}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                sandboxRunning 
                  ? 'bg-amber-600/50 cursor-not-allowed text-amber-200' 
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-950/50'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${sandboxRunning ? 'animate-spin' : ''}`} />
              {sandboxRunning ? 'Simulating Vector...' : 'Execute Vector'}
            </button>

            <button
              id="btn-reset-sandbox"
              onClick={resetSandbox}
              disabled={sandboxRunning}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Clear Logs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Vector Selector & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2 grid grid-cols-2 gap-2">
          {[
            { id: 'syn_flood', label: 'SYN Packet Flood', sub: 'Layer 4 DoS', color: 'border-red-500/30 hover:border-red-500/60' },
            { id: 'credential_stuffing', label: 'Credential Stuffing', sub: 'Layer 7 Brute Force', color: 'border-amber-500/30 hover:border-amber-500/60' },
            { id: 'port_sweep', label: 'TCP Stealth Sweep', sub: 'Reconnaissance Scan', color: 'border-purple-500/30 hover:border-purple-500/60' },
            { id: 'sql_injection', label: 'Blind SQL Injection', sub: 'OWASP Top 10 Web', color: 'border-cyan-500/30 hover:border-cyan-500/60' }
          ].map(vec => (
            <button
              key={vec.id}
              onClick={() => setSandboxAttackType(vec.id)}
              className={`p-3 rounded-lg text-left border transition-all ${
                sandboxAttackType === vec.id 
                  ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-950/40' 
                  : `bg-slate-950/60 ${vec.color} text-slate-400`
              }`}
            >
              <div className="text-xs font-semibold text-white">{vec.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{vec.sub}</div>
            </button>
          ))}
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">IDS Detection Events</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">{sandboxDetections}</span>
            <span className="text-[10px] text-amber-500/80">alarms triggered</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, sandboxDetections * 10)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">Mitigated / Quarantined</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{sandboxMitigated}</span>
            <span className="text-[10px] text-emerald-500/80">threats blocked</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, sandboxMitigated * 12)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="bg-black/90 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {sandboxLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
            Select an attack vector and click 'Execute Vector' to observe live packet dissection and classification.
          </div>
        ) : (
          sandboxLogs.map((log, i) => (
            <div 
              key={i} 
              className={`leading-relaxed ${
                log.includes('[CRITICAL]') || log.includes('[BLOCKED]') || log.includes('ATTACK')
                  ? 'text-red-400 font-medium'
                  : log.includes('[DETECTED]') || log.includes('WARNING')
                  ? 'text-amber-300'
                  : log.includes('[MITIGATED]') || log.includes('SUCCESS')
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
