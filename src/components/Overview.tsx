/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, AlertTriangle, Cpu, HardDrive, Cpu as MemoryIcon,
  Bell, ChevronRight, Activity, ShieldAlert, ArrowUpRight 
} from 'lucide-react';
import { Alert, Host, Threat } from '../types.js';

interface OverviewProps {
  metrics: {
    hostsOnline: number;
    hostsTotal: number;
    criticalAlerts: number;
    highAlerts: number;
    globalThreatScore: number;
    totalPacketsSec: number;
  };
  hosts: Host[];
  alerts: Alert[];
  threats: Threat[];
  onEscalate: (id: string) => void;
  onIgnore: (id: string) => void;
  onResolve: (id: string) => void;
  packetCount: number;
}

export default function Overview({ 
  metrics, 
  hosts, 
  alerts, 
  threats, 
  onEscalate,
  onIgnore,
  onResolve,
  packetCount
}: OverviewProps) {
  
  // Severity classes mapping
  const severityColors = {
    critical: 'bg-red-500/10 border-red-500/30 text-red-400 font-bold',
    high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    medium: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    info: 'bg-slate-500/10 border-white/10 text-slate-400',
  };

  const activeThreatLevel = metrics.globalThreatScore > 75 
    ? { text: 'CRITICAL', color: 'text-red-500 shadow-red-500/30' } 
    : metrics.globalThreatScore > 40 
    ? { text: 'ELEVATED', color: 'text-orange-500 shadow-orange-500/30' } 
    : { text: 'NOMINAL', color: 'text-emerald-500 shadow-emerald-500/30' };

  return (
    <div className="space-y-6" id="dashboard-overview-container">
      
      {/* Overview Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* System Health */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ShieldCheck className="w-16 h-16 text-cyan-400" />
          </div>
          <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">System Protection</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-white">Active</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Uptime last 24h</span>
            <span className="text-emerald-400">99.99%</span>
          </div>
        </div>

        {/* Threat Severity level */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-5 relative overflow-hidden">
          <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Active Threat Index</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-bold ${activeThreatLevel.color}`}>{metrics.globalThreatScore}</span>
            <span className="text-[10px] font-mono text-slate-400">/ 100</span>
          </div>
          <div className="mt-4 w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                metrics.globalThreatScore > 75 ? 'bg-red-500' : metrics.globalThreatScore > 40 ? 'bg-orange-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${metrics.globalThreatScore}%` }}
            />
          </div>
        </div>

        {/* Pending Alerts count */}
        <div className={`bg-slate-900 border rounded-lg p-5 transition-colors ${
          metrics.criticalAlerts > 0 ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-white/5'
        }`}>
          <div className="flex justify-between items-start">
            <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Active Alerts</p>
            {metrics.criticalAlerts > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-bold ${metrics.criticalAlerts > 0 ? 'text-red-400' : 'text-white'}`}>
              {alerts.filter(a => a.status === 'unhandled').length}
            </span>
            <span className="text-xs text-slate-500">unresolved</span>
          </div>
          <div className="mt-4 text-[11px] font-mono text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{metrics.criticalAlerts} Critical unhandled</span>
          </div>
        </div>

        {/* Connected Agent Fleet */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-5">
          <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Agent Fleet Nodes</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-white">{metrics.hostsOnline}</span>
            <span className="text-xs text-slate-500">/ {metrics.hostsTotal} Online</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex -space-x-1">
              {hosts.map((h, i) => (
                <div 
                  key={h.id} 
                  title={h.name}
                  className={`w-4 h-4 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold ${
                    h.status === 'online' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {h.os[0].toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-400">Deploy coverage: 98%</span>
          </div>
        </div>

      </section>

      {/* Main Charts area */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Network Traffic SVG Waveform */}
        <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-lg p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Live Packet Ingress Analysis</h3>
              <p className="text-xs text-slate-400 mt-1">Live packets captured: <span className="text-cyan-400 font-mono font-bold">{(packetCount).toLocaleString()}</span></p>
            </div>
            <span className="text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded">
              {metrics.totalPacketsSec} pkt/s
            </span>
          </div>

          {/* Core SVG Live Chart representation */}
          <div className="h-44 w-full relative bg-slate-950 border border-white/5 rounded overflow-hidden flex items-end">
            <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cyberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Dynamic waveform gridlines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              
              {/* Animated area wave */}
              <path 
                d="M 0 120 Q 50 40 100 80 T 200 30 T 300 90 T 400 40 T 500 70 L 500 120 Z" 
                fill="url(#cyberGrad)" 
              />
              <path 
                d="M 0 120 Q 50 40 100 80 T 200 30 T 300 90 T 400 40 T 500 70" 
                fill="none" 
                stroke="#22d3ee" 
                strokeWidth="1.5" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
              <span className="font-mono text-[70px] font-extrabold tracking-widest">ENCRYPTED</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-3">
            <span>T-60s</span>
            <span>T-30s</span>
            <span className="text-cyan-400 font-bold animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Live Feed
            </span>
          </div>
        </div>

        {/* Live Active Threats List */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Threat Intel Vectors</h3>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-44 pr-1">
            {threats.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono text-center py-8">No active complex threat vectors. System Secure.</p>
            ) : (
              threats.map((threat) => (
                <div key={threat.id} className="p-3 bg-slate-950 rounded border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-bold text-red-400">{threat.actor || 'Unknown Actor'}</span>
                    <span className="text-xs font-mono font-bold text-white bg-red-950/50 border border-red-500/30 px-1.5 rounded">
                      Risk Index: {threat.score}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{threat.vector}</p>
                  {threat.mitreMapping && (
                    <div className="text-[9px] font-mono text-slate-500 bg-white/[0.02] inline-block px-1 rounded">
                      MITRE ATT&CK: {threat.mitreMapping}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* Security Alerts and Triage Center */}
      <section className="bg-slate-900 border border-white/5 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Real-time Alert Triage Stream</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {alerts.filter(a => a.status === 'unhandled').length} unhandled alerts pending validation
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Alert Trigger</th>
                <th className="py-2.5 px-4">Vector Classification</th>
                <th className="py-2.5 px-4">Source Asset</th>
                <th className="py-2.5 px-4">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    ✅ No alerts detected on monitored hosts and networks.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase border ${severityColors[alert.severity as keyof typeof severityColors] || ''}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {alert.title}
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-xs truncate" title={alert.description}>
                        {alert.description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400">
                      {alert.category}
                      {alert.mitreMapping && (
                        <span className="block text-[9px] text-slate-500 mt-0.5">MITRE: {alert.mitreMapping}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {alert.source} ➡️ {alert.target || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      {alert.status === 'unhandled' ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onIgnore(alert.id)}
                            className="bg-slate-950 border border-white/10 hover:border-slate-600 text-slate-300 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer"
                            id={`ignore-btn-${alert.id}`}
                          >
                            Ignore
                          </button>
                          <button 
                            onClick={() => onResolve(alert.id)}
                            className="bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer"
                            id={`resolve-btn-${alert.id}`}
                          >
                            Resolve
                          </button>
                          <button 
                            onClick={() => onEscalate(alert.id)}
                            className="bg-red-500 text-white hover:bg-red-600 px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-0.5 cursor-pointer"
                            id={`escalate-btn-${alert.id}`}
                          >
                            <span>Escalate</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono ${
                          alert.status === 'resolved' 
                            ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' 
                            : alert.status === 'ignored'
                            ? 'bg-slate-950 text-slate-500 border border-white/5'
                            : 'bg-red-950/50 text-red-400 border border-red-500/20 animate-pulse'
                        }`}>
                          {alert.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {alerts.length === 0 ? (
            <p className="text-center py-8 text-slate-500 font-mono text-xs">
              ✅ No alerts detected on monitored hosts and networks.
            </p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="p-4 bg-slate-950 rounded-lg border border-white/5 space-y-3" id={`mobile-alert-${alert.id}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold text-white text-xs">{alert.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase border font-mono shrink-0 ${severityColors[alert.severity as keyof typeof severityColors] || ''}`}>
                    {alert.severity}
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 font-mono">{alert.description}</p>
                
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono border-t border-white/5 pt-2">
                  <div>
                    <span className="text-slate-500">Vector:</span> <span className="text-cyan-400">{alert.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Asset:</span> <span className="text-slate-300 truncate max-w-[100px] inline-block align-bottom">{alert.source}</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2 flex justify-end">
                  {alert.status === 'unhandled' ? (
                    <div className="flex gap-2 w-full justify-end">
                      <button 
                        onClick={() => onIgnore(alert.id)}
                        className="flex-1 xs:flex-none text-center bg-slate-900 border border-white/10 hover:border-slate-600 text-slate-300 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold cursor-pointer"
                      >
                        Ignore
                      </button>
                      <button 
                        onClick={() => onResolve(alert.id)}
                        className="flex-1 xs:flex-none text-center bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold cursor-pointer"
                      >
                        Resolve
                      </button>
                      <button 
                        onClick={() => onEscalate(alert.id)}
                        className="flex-1 xs:flex-none text-center bg-red-500 text-white hover:bg-red-600 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <span>Escalate</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded font-mono ${
                      alert.status === 'resolved' 
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' 
                        : alert.status === 'ignored'
                        ? 'bg-slate-950 text-slate-500 border border-white/5'
                        : 'bg-red-950/50 text-red-400 border border-red-500/20'
                    }`}>
                      {alert.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
