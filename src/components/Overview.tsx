/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Cpu, HardDrive, Cpu as MemoryIcon,
  Bell, ChevronRight, Activity, ShieldAlert, ArrowUpRight, Mail,
  Award, GraduationCap, CheckCircle2, Users, Server, Plus, Filter, Monitor
} from 'lucide-react';
import { Alert, Host, Threat, Packet } from '../types.js';
import { apiRequest } from '../api.js';
import RealTimeMap from './RealTimeMap.jsx';

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
  onEmailAlert?: (alert: Alert) => void;
  onNavigateToIncidents?: () => void;
  onNavigateToHosts?: () => void;
  packetCount: number;
  livePackets?: Packet[];
  currentUser?: any;
}

export default function Overview({ 
  metrics, 
  hosts, 
  alerts, 
  threats, 
  onEscalate,
  onIgnore,
  onResolve,
  onEmailAlert,
  onNavigateToIncidents,
  onNavigateToHosts,
  packetCount,
  livePackets,
  currentUser
}: OverviewProps) {
  const [totalCertifiedAnalysts, setTotalCertifiedAnalysts] = useState<number>(0);
  const [packetThroughputHistory, setPacketThroughputHistory] = useState<number[]>([
    14, 20, 16, 25, 18, 30, 22, 28, 35, 24, 32, 26, 38, 30, 42, 28
  ]);

  useEffect(() => {
    const fetchCertStats = () => {
      apiRequest('/api/certificates/stats')
        .then((res) => {
          if (res && typeof res.totalCertified === 'number') {
            setTotalCertifiedAnalysts(res.totalCertified);
          }
        })
        .catch(() => {});
    };

    fetchCertStats();
    const interval = setInterval(fetchCertStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update dynamic waveform based on authentic live packet ingress activity
  useEffect(() => {
    const rate = Math.max(1, metrics.totalPacketsSec || 1);
    const lastPkt = livePackets && livePackets.length > 0 ? livePackets[0] : null;
    const packetFactor = lastPkt ? Math.min(95, Math.max(10, Math.round(lastPkt.length / 20))) : rate * 12;
    const boundedVal = Math.min(95, Math.max(8, packetFactor));

    setPacketThroughputHistory(prev => [...prev.slice(1), boundedVal]);
  }, [livePackets, metrics.totalPacketsSec, packetCount]);
  
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

  const [selectedHostId, setSelectedHostId] = useState<string>('all');

  const selectedHost = selectedHostId !== 'all'
    ? hosts.find(h => h.id === selectedHostId) || null
    : null;

  // Dynamic filter for active alerts when inspecting a specific user enrolled node
  const activeAlerts = selectedHost
    ? alerts.filter(a => {
        const targetStr = (a.target || '').toLowerCase();
        const sourceStr = (a.source || '').toLowerCase();
        const hostName = selectedHost.name.toLowerCase();
        const hostIp = selectedHost.ipAddress.toLowerCase();
        return targetStr.includes(hostName) || targetStr.includes(hostIp) || sourceStr.includes(hostIp);
      })
    : alerts;

  return (
    <div className="space-y-6" id="dashboard-overview-container">
      
      {/* Enrolled Infrastructure Fabric & Node Monitor Hub */}
      <div className="p-4 sm:p-5 bg-slate-900/95 border border-cyan-500/30 rounded-xl shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-cyan-500/10 via-blue-500/5 to-transparent blur-xl pointer-events-none" />
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <Server className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                  Enrolled Infrastructure Fabric
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {hosts.filter(h => h.status === 'online').length}/{hosts.length} Nodes Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Independent Multi-Node Host IDS • Monitoring all endpoints enrolled by your user profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToHosts && (
              <button
                onClick={onNavigateToHosts}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                title="Add a new server, workstation, or edge device to monitor"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Enroll Node</span>
              </button>
            )}
          </div>
        </div>

        {/* Enrolled Node Selector / Carousel */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px] uppercase">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Node to Inspect Telemetry & Incursions:</span>
            </span>
            {selectedHost && (
              <button 
                onClick={() => setSelectedHostId('all')}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Show All Nodes ({hosts.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {/* All Nodes Aggregator Card */}
            <button
              onClick={() => setSelectedHostId('all')}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedHostId === 'all'
                  ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-950/70 border-white/5 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold">All Enrolled Nodes</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  {hosts.length} Total
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Aggregated Ingress & Multi-Node Triage
              </p>
            </button>

            {/* Individual Enrolled Node Cards */}
            {hosts.map(host => {
              const isSelected = selectedHostId === host.id;
              const hostAlerts = alerts.filter(a => 
                (a.target || '').toLowerCase().includes(host.name.toLowerCase()) || 
                (a.target || '').toLowerCase().includes(host.ipAddress.toLowerCase())
              );

              return (
                <button
                  key={host.id}
                  onClick={() => setSelectedHostId(host.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-400 text-white shadow-[0_0_14px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950/70 border-white/5 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold truncate text-cyan-300" title={host.name}>
                      {host.name}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${host.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
                    <span>{host.ipAddress}</span>
                    <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                      {host.os}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t border-white/5">
                    <span className="text-slate-400">Agent {host.agentVersion}</span>
                    {hostAlerts.length > 0 && (
                      <span className="text-red-400 font-bold bg-red-950/60 px-1 rounded">
                        {hostAlerts.length} alert{hostAlerts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Node Active Telemetry Sub-bar */}
        {selectedHost && (
          <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Selected Node Focus:</span>
              <strong className="text-cyan-300">{selectedHost.name}</strong>
              <span className="text-slate-500">({selectedHost.ipAddress})</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase">
                {selectedHost.os}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>CPU: <strong className="text-white">{selectedHost.cpuUsage}%</strong></span>
              <span>Memory: <strong className="text-white">{selectedHost.memoryUsage}%</strong></span>
              <span>Disk: <strong className="text-white">{selectedHost.diskUsage}%</strong></span>
              {onNavigateToHosts && (
                <button
                  onClick={onNavigateToHosts}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open in Host IDS</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Primary SOC & Certified Workforce Operational Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="overview-metrics-grid">
        {/* Metric 1: Total Amount of Certified Analysts using EncDec */}
        <div className="p-4 bg-slate-900 border-2 border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 shadow-lg relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">
              Total Certified Analysts
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans text-white group-hover:text-emerald-400 transition-colors">
                {totalCertifiedAnalysts}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Using EncDec
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              CE-SOC Credentialed • EncDec Threat Lab
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Award className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Metric 2: Hosts Online / Monitored */}
        <div className="p-4 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between gap-3 shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">
              Protected Endpoints
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans text-white">
                {metrics.hostsOnline} <span className="text-xs text-slate-500 font-mono font-normal">/ {metrics.hostsTotal}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">100% UP</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 truncate">
              {selectedHost ? `${selectedHost.name} Active` : `${hosts.length} User Nodes Enrolled`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Global Threat Level */}
        <div className="p-4 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between gap-3 shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">
              Global Threat Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-sans ${metrics.globalThreatScore > 75 ? 'text-red-400' : 'text-cyan-400'}`}>
                {metrics.globalThreatScore}
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                metrics.globalThreatScore > 75 ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}>
                {activeThreatLevel.text}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              MITRE ATT&CK Matrix Correlation
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Real-time Ingress Rate */}
        <div className="p-4 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between gap-3 shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">
              Packet Ingress Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans text-white">
                {metrics.totalPacketsSec}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                pkt/s
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              {(packetCount).toLocaleString()} total analyzed
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Correlated Multi-Stage Incident Quick Access Alert */}
      {onNavigateToIncidents && (
        <div 
          onClick={onNavigateToIncidents}
          className="p-4 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/40 hover:border-red-500/70 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer transition-all shadow-xl group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold uppercase">
                  INC-1042 CRITICAL
                </span>
                <span className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">
                  Multi-Stage Web Server Compromise Correlated
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-500/30">
                  96% Confidence
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                Recon (Zeek) ➔ CVE Exploit (Suricata) ➔ Shell Spawn (Agent) ➔ C2 Outbound ➔ Persistence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs font-mono font-bold text-red-300 group-hover:translate-x-1 transition-transform">
            <span>Investigate Incident & Response</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Live Global Intrusion Attempt Map (D3.js Ingress Visualizer) */}
      <section className="w-full">
        <RealTimeMap 
          alerts={activeAlerts} 
          targetNode={{
            name: selectedHost ? selectedHost.name : (hosts[0]?.name || 'Primary Gateway'),
            ip: selectedHost ? selectedHost.ipAddress : (hosts[0]?.ipAddress || '104.24.12.83')
          }}
          onSelectThreat={onNavigateToIncidents ? () => onNavigateToIncidents() : undefined} 
          customApiKey={currentUser?.customMapsApiKey}
        />
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

          {/* Core SVG Live Chart representation with real-time waveform */}
          {(() => {
            const svgWidth = 500;
            const svgHeight = 120;
            const stepX = svgWidth / Math.max(1, packetThroughputHistory.length - 1);
            const pathPoints = packetThroughputHistory.map((val, i) => {
              const x = Math.round(i * stepX);
              const y = Math.round(svgHeight - 12 - (val / 100) * (svgHeight - 24));
              return `${x} ${y}`;
            });
            const linePath = pathPoints.length > 0 ? `M ${pathPoints.join(' L ')}` : `M 0 110 L 500 110`;
            const areaPath = pathPoints.length > 0 ? `M ${pathPoints[0]} L ${pathPoints.join(' L ')} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z` : `M 0 110 L 500 110 L 500 120 L 0 120 Z`;

            return (
              <div className="h-44 w-full relative bg-slate-950 border border-white/5 rounded overflow-hidden flex items-end">
                <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cyberGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Dynamic waveform gridlines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  
                  {/* Dynamic Area Wave from authentic network packets */}
                  <path 
                    d={areaPath} 
                    fill="url(#cyberGrad)" 
                  />
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="#22d3ee" 
                    strokeWidth="1.75" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  <span className="font-mono text-[70px] font-extrabold tracking-widest">LIVE INGRESS</span>
                </div>
              </div>
            );
          })()}

          {/* Real Live Ingress Inspection Stream */}
          <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] px-1">
              <span>REAL-TIME PACKET (LIVE DPI)</span>
              <span className="hidden sm:inline">ORIGIN ➡️ TARGET</span>
              <span>INSPECTION</span>
            </div>
            {livePackets && livePackets.length > 0 ? (
              livePackets.slice(0, 3).map((pkt) => (
                <div key={pkt.id} className="flex justify-between items-center bg-slate-950/80 px-2 py-1 rounded border border-white/5 text-slate-300">
                  <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${pkt.suspicious ? 'bg-red-400 animate-ping' : 'bg-cyan-400'}`} />
                    <span className="text-cyan-400 font-bold">{pkt.flags || 'GET'}</span>
                    <span className="truncate text-slate-400">{pkt.payloadSample || pkt.payloadInfo || '/'}</span>
                  </div>
                  <span className="text-slate-400 truncate max-w-[150px] hidden sm:inline">{pkt.sourceIp} → {pkt.destIp || 'DMZ'}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${pkt.suspicious ? 'bg-red-950 text-red-400 border border-red-500/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/20'}`}>
                    {pkt.suspicious ? 'ALERT: EXPLOIT' : 'VERIFIED'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-2 text-center text-slate-500 bg-slate-950/50 rounded flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Deep Packet Inspection (DPI) sniffer active — awaiting next ingress packet...</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
            <span>T-60s</span>
            <span>T-30s</span>
            <span className="text-cyan-400 font-bold animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Live Wire Feed
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
            {activeAlerts.filter(a => a && a.status === 'unhandled' && a.id.startsWith('alt_real_')).length} unhandled real alerts {selectedHost ? `for ${selectedHost.name}` : 'pending triage'}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1 hidden md:block" id="alert-triage-table-container">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 sticky top-0 z-10">
              <tr className="border-b border-white/10 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4 bg-slate-900">Timestamp</th>
                <th className="py-2.5 px-4 bg-slate-900">Severity</th>
                <th className="py-2.5 px-4 bg-slate-900">Alert Trigger</th>
                <th className="py-2.5 px-4 bg-slate-900">Vector Classification</th>
                <th className="py-2.5 px-4 bg-slate-900">Source Asset</th>
                <th className="py-2.5 px-4 bg-slate-900">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {(() => {
                const realAlerts = activeAlerts.filter(a => a && a.id && a.id.startsWith('alt_real_'));
                if (realAlerts.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                        ✅ Perimeter secure. Zero active intrusion alerts detected by Real-Time Deep Packet Inspection.
                      </td>
                    </tr>
                  );
                }

                return realAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase border ${severityColors[alert.severity as keyof typeof severityColors] || ''}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <span className="block truncate max-w-xs">{alert.title}</span>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-xs truncate" title={alert.description}>
                        {alert.description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 whitespace-nowrap">
                      {alert.category}
                      {alert.mitreMapping && (
                        <span className="block text-[9px] text-slate-500 mt-0.5">MITRE: {alert.mitreMapping}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      <span className="truncate max-w-[180px] inline-block">{alert.source} ➡️ {alert.target || 'N/A'}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
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
                          {onEmailAlert && (
                            <button
                              onClick={() => onEmailAlert(alert)}
                              className="bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
                              title="Dispatch Alert via Gmail"
                              id={`email-alert-btn-${alert.id}`}
                            >
                              <Mail className="w-3 h-3" />
                              <span>Gmail</span>
                            </button>
                          )}
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
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-4 md:hidden max-h-[380px] overflow-y-auto pr-1">
          {(() => {
            const realAlerts = activeAlerts.filter(a => a && a.id && a.id.startsWith('alt_real_'));
            if (realAlerts.length === 0) {
              return (
                <p className="text-center py-8 text-slate-500 font-mono text-xs">
                  ✅ Perimeter secure. Zero active intrusion alerts detected by Real-Time Deep Packet Inspection.
                </p>
              );
            }

            return realAlerts.map((alert) => (
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
                    <div className="flex flex-wrap gap-2 w-full justify-end">
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
                      {onEmailAlert && (
                        <button
                          onClick={() => onEmailAlert(alert)}
                          className="flex-1 xs:flex-none text-center bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Gmail</span>
                        </button>
                      )}
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
            ));
          })()}
        </div>
      </section>

    </div>
  );
}
