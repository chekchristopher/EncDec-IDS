/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Activity,
  Terminal,
  Server,
  Flame,
  GraduationCap,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Globe,
  Play,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TiltStage3D from './TiltStage3D.js';
import ThreatGlobe3D from './ThreatGlobe3D.js';
import type { PublicHealthSnapshot } from './HeroConsolePreview3D.js';

export type ShowcaseTabId = 'dpi' | 'overview' | 'hids' | 'incidents' | 'certification';

interface ProductShowcase3DProps {
  activeTab: ShowcaseTabId;
  onTabChange: (tab: ShowcaseTabId) => void;
  health: PublicHealthSnapshot | null;
  totalCertified: number | null;
  averageScore: number | null;
  onEnterConsole: () => void;
  onProbeActivity?: (mode: 'nominal' | 'inspecting' | 'alert') => void;
}

interface ProbeLogEntry {
  id: string;
  time: string;
  vector: string;
  targetEndpoint: string;
  originIp: string;
  status: 'intercepted' | 'error';
  message: string;
}

const DPI_VECTORS: Array<{
  id: 'sqli' | 'traversal' | 'scanner' | 'xss' | 'cmdi';
  label: string;
  mitre: string;
  summary: string;
}> = [
  {
    id: 'sqli',
    label: 'SQL Injection',
    mitre: 'T1190',
    summary: 'UNION SELECT credential extraction against query parameters',
  },
  {
    id: 'traversal',
    label: 'Directory Traversal',
    mitre: 'T1083',
    summary: 'Local file inclusion attempt targeting /etc/passwd',
  },
  {
    id: 'scanner',
    label: 'Secret Scraper (.env)',
    mitre: 'T1595',
    summary: 'Automated reconnaissance probing for exposed environment files',
  },
  {
    id: 'xss',
    label: 'Cross-Site Scripting',
    mitre: 'T1059',
    summary: 'Injected script payload attempting cookie exfiltration',
  },
  {
    id: 'cmdi',
    label: 'Command Injection',
    mitre: 'T1059.004',
    summary: 'Shell pipe execution targeting /etc/shadow over netcat',
  },
];

const REPRESENTATIVE_NODES = [
  {
    id: 'node-lnx-01',
    name: 'edge-gateway-lnx-01',
    os: 'Linux (Ubuntu Server)',
    ip: '10.24.0.14',
    cpu: 18,
    memory: 41,
    disk: 52,
    agent: 'v4.1.2-agent',
    services: ['encdec-agent (running)', 'sshd (running)'],
    processes: [
      { pid: 1, name: 'systemd', path: '/sbin/init', cpu: '0.1%' },
      { pid: 1204, name: 'sshd', path: '/usr/sbin/sshd', cpu: '0.4%' },
      { pid: 3042, name: 'encdec-hids-agent', path: '/opt/encdec/agent', cpu: '1.4%' },
    ],
    syscalls: ['sys_openat', 'sys_read', 'sys_write', 'sys_socket', 'sys_connect'],
  },
  {
    id: 'node-win-02',
    name: 'ad-controller-win-02',
    os: 'Windows Server',
    ip: '10.24.0.28',
    cpu: 24,
    memory: 56,
    disk: 44,
    agent: 'v4.1.2-agent',
    services: ['encdec-agent (running)', 'WinDefend (running)'],
    processes: [
      { pid: 4, name: 'System', path: 'C:\\Windows\\System32\\ntoskrnl.exe', cpu: '0.2%' },
      { pid: 1088, name: 'svchost.exe', path: 'C:\\Windows\\System32\\svchost.exe', cpu: '0.9%' },
      { pid: 3410, name: 'encdec-hids-agent', path: 'C:\\Program Files\\EncDec\\agent.exe', cpu: '1.8%' },
    ],
    syscalls: ['NtCreateFile', 'NtReadVirtualMemory', 'NtOpenProcess', 'NtDeviceIoControlFile'],
  },
  {
    id: 'node-mac-03',
    name: 'soc-workstation-mac-03',
    os: 'macOS',
    ip: '10.24.1.9',
    cpu: 14,
    memory: 48,
    disk: 39,
    agent: 'v4.1.2-agent',
    services: ['encdec-agent (running)', 'com.apple.endpointsecurity'],
    processes: [
      { pid: 1, name: 'launchd', path: '/sbin/launchd', cpu: '0.1%' },
      { pid: 942, name: 'sshd', path: '/usr/sbin/sshd', cpu: '0.2%' },
      { pid: 2918, name: 'encdec-hids-agent', path: '/opt/encdec/agent', cpu: '1.1%' },
    ],
    syscalls: ['sys_openat', 'sys_execve', 'sys_socket', 'sys_connect'],
  },
];

const MITRE_STAGES = [
  {
    tacticId: 'TA0001',
    tactic: 'Initial Access',
    techniques: ['T1190 Exploit Public-Facing Application', 'T1133 External Remote Services'],
    response: 'block_ip · DPI drop & source isolation',
  },
  {
    tacticId: 'TA0002',
    tactic: 'Execution',
    techniques: ['T1059 Command and Scripting Interpreter', 'T1204 User Execution'],
    response: 'kill_process · PID containment via HIDS',
  },
  {
    tacticId: 'TA0005',
    tactic: 'Defense Evasion',
    techniques: ['T1070 Indicator Removal on Host', 'T1562 Impair Defenses'],
    response: 'quarantine_file · FIM hash verification',
  },
  {
    tacticId: 'TA0010',
    tactic: 'Exfiltration',
    techniques: ['T1048 Exfiltration Over Alternative Protocol', 'T1041 Exfiltration Over C2'],
    response: 'isolate_host · Node egress restriction',
  },
];

const SHOWCASE_TABS: Array<{
  id: ShowcaseTabId;
  label: string;
  modeTag: 'Live Backend' | 'UI Preview';
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dpi', label: 'Live DPI Probe', modeTag: 'Live Backend', icon: Activity },
  { id: 'overview', label: 'SOC Overview', modeTag: 'UI Preview', icon: Globe },
  { id: 'hids', label: 'Host IDS Fleet', modeTag: 'UI Preview', icon: Server },
  { id: 'incidents', label: 'MITRE Hunting', modeTag: 'UI Preview', icon: Flame },
  { id: 'certification', label: 'CE-SOC Verify', modeTag: 'Live Backend', icon: GraduationCap },
];

export default function ProductShowcase3D({
  activeTab,
  onTabChange,
  health,
  totalCertified,
  averageScore,
  onEnterConsole,
  onProbeActivity,
}: ProductShowcase3DProps) {
  // Live DPI Probe state (calls real /api/probe/live-attack)
  const [probeBusy, setProbeBusy] = useState(false);
  const [activeVector, setActiveVector] = useState<string | null>(null);
  const [probeLogs, setProbeLogs] = useState<ProbeLogEntry[]>([]);
  const dpiOutputRef = useRef<HTMLDivElement | null>(null);

  // Representative HIDS selector state
  const [selectedNodeId, setSelectedNodeId] = useState(REPRESENTATIVE_NODES[0].id);
  const selectedNode = REPRESENTATIVE_NODES.find((n) => n.id === selectedNodeId) || REPRESENTATIVE_NODES[0];

  // Representative MITRE stage selection
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);

  // Real Certificate Verification state (calls real /api/certificates/verify/:id)
  const [certQuery, setCertQuery] = useState('CERT-ENCDEC-2026-X892A');
  const [certLoading, setCertLoading] = useState(false);
  const [certResult, setCertResult] = useState<any | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  const runLiveDpiProbe = async (vector: 'sqli' | 'traversal' | 'scanner' | 'xss' | 'cmdi') => {
    if (probeBusy) return;
    setProbeBusy(true);
    setActiveVector(vector);
    onProbeActivity?.('inspecting');

    try {
      const res = await fetch('/api/probe/live-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        onProbeActivity?.('alert');
        setProbeLogs((prev) => [
          {
            id: `prb_${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            vector: data.vector || vector.toUpperCase(),
            targetEndpoint: data.targetEndpoint || '/api/probe/live-attack',
            originIp: data.attackerOriginIp || '185.220.101.42',
            status: 'intercepted',
            message: data.message || 'Dispatched across wire and inspected by DPI engine.',
          },
          ...prev.slice(0, 5),
        ]);
      } else {
        setProbeLogs((prev) => [
          {
            id: `prb_${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            vector: vector.toUpperCase(),
            targetEndpoint: '/api/probe/live-attack',
            originIp: '127.0.0.1',
            status: 'error',
            message: data.error || `Server responded with status ${res.status}`,
          },
          ...prev.slice(0, 5),
        ]);
      }
    } catch (err: any) {
      setProbeLogs((prev) => [
        {
          id: `prb_${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          vector: vector.toUpperCase(),
          targetEndpoint: '/api/probe/live-attack',
          originIp: '127.0.0.1',
          status: 'error',
          message: err?.message || 'Unable to reach DPI probe endpoint.',
        },
        ...prev.slice(0, 5),
      ]);
    } finally {
      setProbeBusy(false);
      if (
        typeof window !== 'undefined' &&
        window.innerWidth < 1024 &&
        dpiOutputRef.current &&
        typeof dpiOutputRef.current.scrollIntoView === 'function'
      ) {
        dpiOutputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      setTimeout(() => onProbeActivity?.('nominal'), 2600);
    }
  };

  const handleVerifyCertificate = async (overrideId?: string) => {
    const idToCheck = (overrideId ?? certQuery).trim();
    if (!idToCheck || certLoading) return;
    if (overrideId) setCertQuery(overrideId);
    setCertLoading(true);
    setCertError(null);
    setCertResult(null);

    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(idToCheck)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.verified && data.certificate) {
        setCertResult(data.certificate);
      } else {
        setCertError(data.error || `No certificate record found for "${idToCheck}".`);
      }
    } catch {
      setCertError('Unable to reach the certificate registry endpoint right now.');
    } finally {
      setCertLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0" id="interactive-product-explorer">
      {/* Clean Segmented Control Bar (all 5 tabs visible in 2-col grid on phones, horizontal row on sm+) */}
      <div
        role="tablist"
        aria-label="EncDec IDS interactive interface views"
        className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-white/10"
      >
        {SHOWCASE_TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLastOdd = idx === SHOWCASE_TABS.length - 1 && SHOWCASE_TABS.length % 2 === 1;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isLastOdd ? 'col-span-2 sm:col-span-1' : ''
              } ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              id={`showcase-tab-${tab.id}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3D Tilted Showcase Frame */}
      <TiltStage3D maxTilt={3} className="w-full min-w-0">
        <div className="rounded-2xl border border-white/10 bg-slate-950 shadow-[0_32px_80px_-24px_rgba(2,6,23,0.85)] overflow-hidden">
          {/* Application Window Frame Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-3 border-b border-white/10 bg-slate-900/80">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-mono text-xs font-semibold text-white truncate">
                EncDec IDS
              </span>
              <span aria-hidden="true" className="text-slate-600">
                /
              </span>
              <span className="font-mono text-xs text-cyan-400 truncate">
                {SHOWCASE_TABS.find((t) => t.id === activeTab)?.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 font-mono">
              <span>
                {SHOWCASE_TABS.find((t) => t.id === activeTab)?.modeTag === 'Live Backend'
                  ? 'Connected to live server endpoint'
                  : 'Representative UI preview'}
              </span>
            </div>
          </div>

          {/* Animated Panel Body */}
          <div className="p-3.5 sm:p-6 lg:p-7 min-h-[340px] sm:min-h-[420px]">
            <AnimatePresence mode="wait">
              {/* TAB 1: LIVE DPI PROBE (REAL /api/probe/live-attack) */}
              {activeTab === 'dpi' && (
                <motion.div
                  key="dpi"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid lg:grid-cols-12 gap-5 sm:gap-6"
                >
                  <div className="lg:col-span-5 min-w-0 space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        Dispatch a Live HTTP Exploit Probe
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                        Trigger a real loopback request through EncDec IDS&apos;s Deep Packet Inspection middleware via{' '}
                        <code className="font-mono text-[11px] sm:text-xs text-cyan-300 break-all">
                          POST /api/probe/live-attack
                        </code>
                        .
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      {DPI_VECTORS.map((vec) => (
                        <button
                          key={vec.id}
                          type="button"
                          disabled={probeBusy}
                          onClick={() => runLiveDpiProbe(vec.id)}
                          className={`w-full text-left px-3.5 sm:px-4 py-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            activeVector === vec.id && probeBusy
                              ? 'border-cyan-400 bg-cyan-500/10 text-white'
                              : 'border-white/10 bg-slate-900/70 hover:border-cyan-500/40 hover:bg-slate-900 text-slate-200'
                          }`}
                          id={`probe-vector-${vec.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-white">
                              <span>{vec.label}</span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="font-mono text-cyan-400 font-normal">{vec.mitre}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 sm:truncate">
                              {vec.summary}
                            </p>
                          </div>
                          <Play className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    ref={dpiOutputRef}
                    className="lg:col-span-7 min-w-0 flex flex-col rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden scroll-mt-20"
                  >
                    <div className="px-3.5 sm:px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-slate-900">
                      <span className="font-mono text-xs text-slate-300 flex items-center gap-2 min-w-0">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">DPI Interception Response Stream</span>
                      </span>
                      {probeLogs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setProbeLogs([])}
                          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="p-4 flex-1 font-mono text-xs space-y-3 overflow-y-auto max-h-[340px]">
                      {probeLogs.length === 0 ? (
                        <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-4 text-slate-400 space-y-2">
                          <Activity className="w-6 h-6 text-cyan-400/70" />
                          <p className="text-sm font-sans text-slate-300 font-medium">
                            Ready to inspect live loopback traffic
                          </p>
                          <p className="text-xs font-sans text-slate-500 max-w-sm">
                            Select any attack vector on the left to send a real HTTP probe through the running EncDec IDS server and view the captured signature details.
                          </p>
                        </div>
                      ) : (
                        probeLogs.map((entry) => (
                          <div
                            key={entry.id}
                            className="p-3.5 rounded-lg border border-white/10 bg-slate-950/90 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span
                                className={
                                  entry.status === 'intercepted'
                                    ? 'text-emerald-400 font-semibold'
                                    : 'text-amber-400 font-semibold'
                                }
                              >
                                {entry.status === 'intercepted'
                                  ? `INTERCEPTED · ${entry.vector}`
                                  : `NOTICE · ${entry.vector}`}
                              </span>
                              <span className="text-slate-500 tabular-nums">{entry.time}</span>
                            </div>
                            <p className="text-slate-300 break-all text-[11px]">
                              Path: <span className="text-cyan-300">{entry.targetEndpoint}</span>
                            </p>
                            <p className="text-slate-400 text-[11px]">
                              Source: {entry.originIp} — {entry.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-3 border-t border-white/10 bg-slate-900/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>Monitored in console: TCP, UDP, ICMP, DNS, HTTP, HTTPS, ARP, DHCP, SMTP, FTP, SSH, SMB</span>
                      <button
                        type="button"
                        onClick={onEnterConsole}
                        className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        Open Network IDS
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: SOC OVERVIEW & GEODESIC MAP PREVIEW */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
                      <p className="text-xs text-slate-400">Live Engine Status</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                        {health?.status === 'ok' ? 'Operational' : health ? 'Degraded' : 'Connecting'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                        {health ? `${Math.max(1, Math.floor(health.uptimeSeconds / 60))}m uptime` : 'GET /api/health'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
                      <p className="text-xs text-slate-400">Cloud Firestore Sync</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-cyan-300">
                        {health?.firestoreAvailable ? 'Connected' : 'Standby'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        MSSQL: {health?.mssqlConnected ? 'Live TDS' : 'Standby Local'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
                      <p className="text-xs text-slate-400">WebSocket Clients</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
                        {health ? health.wsClients : 0}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">Live broadcast channel</p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
                      <p className="text-xs text-slate-400">Certified Analysts</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-sky-300 tabular-nums">
                        {totalCertified !== null ? totalCertified : '—'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                        {averageScore !== null ? `Avg Exam Score: ${averageScore}%` : 'CE-SOC Registry'}
                      </p>
                    </div>
                  </div>

                  {/* Representative TopoJSON Geodesic Visualization matching RealTimeMap.tsx */}
                  <div className="grid lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8 min-w-0 rounded-xl border border-white/10 bg-slate-900/60 p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
                        <span className="text-sm font-semibold text-white">
                          Real-Time 3D Geodesic Incursion Globe
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          Three.js + TopoJSON Telemetry · Preview
                        </span>
                      </div>
                      <ThreatGlobe3D className="w-full h-52 sm:h-60" />
                    </div>

                    <div className="lg:col-span-4 min-w-0 rounded-xl border border-white/10 bg-slate-900/60 p-4 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white">Per-Operator Isolation</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Each signed-in operator views and triages alerts strictly scoped to their own enrolled hosts, with one-click Resolve, Escalate, Ignore, and Gmail Alert actions.
                        </p>
                        <div className="space-y-1.5 font-mono text-[11px] text-slate-300 pt-1">
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Alert Triage</span>
                            <span className="text-right">Resolve / Escalate / Email</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Recon View</span>
                            <span className="text-right">Tactical Geo Modal</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Access Policy</span>
                            <span className="text-right">JWT + RBAC + MFA</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onEnterConsole}
                        className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Sign In to View Your Live Fleet
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: HOST IDS FLEET PREVIEW */}
              {activeTab === 'hids' && (
                <motion.div
                  key="hids"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid lg:grid-cols-12 gap-5 sm:gap-6"
                >
                  <div className="lg:col-span-4 min-w-0 space-y-2.5">
                    <p className="text-xs text-slate-400 font-medium">
                      Select Representative Endpoint
                    </p>
                    {REPRESENTATIVE_NODES.map((node) => {
                      const active = node.id === selectedNode.id;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                            active
                              ? 'border-cyan-400 bg-cyan-500/10 text-white'
                              : 'border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold truncate">
                              {node.name}
                            </span>
                            <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                              Online
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {node.os} · {node.ip}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-8 min-w-0 rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 space-y-4 sm:space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-white/10 pb-3.5">
                      <div className="min-w-0">
                        <h4 className="font-mono text-sm font-semibold text-white truncate">
                          {selectedNode.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 break-words">
                          {selectedNode.os} · IP {selectedNode.ip} · Agent {selectedNode.agent}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] sm:text-xs text-slate-400">
                        Quarantine targets: File · Process · IP
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-slate-950 border border-white/5">
                        <p className="text-[11px] text-slate-400">CPU Load</p>
                        <p className="font-mono text-sm sm:text-base font-semibold text-white mt-0.5 tabular-nums">
                          {selectedNode.cpu}%
                        </p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-lg bg-slate-950 border border-white/5">
                        <p className="text-[11px] text-slate-400">Memory</p>
                        <p className="font-mono text-sm sm:text-base font-semibold text-white mt-0.5 tabular-nums">
                          {selectedNode.memory}%
                        </p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-lg bg-slate-950 border border-white/5">
                        <p className="text-[11px] text-slate-400">Disk</p>
                        <p className="font-mono text-sm sm:text-base font-semibold text-white mt-0.5 tabular-nums">
                          {selectedNode.disk}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-300">
                        Observed Process Stack &amp; System Calls (Sample Schema)
                      </p>
                      {/* Mobile Stacked Process Cards (prevents horizontal table clipping on phones) */}
                      <div className="sm:hidden space-y-2">
                        {selectedNode.processes.map((proc) => (
                          <div
                            key={proc.pid}
                            className="p-3 rounded-lg border border-white/10 bg-slate-950 font-mono text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-cyan-300 font-semibold truncate">{proc.name}</span>
                              <span className="text-slate-300 tabular-nums shrink-0">
                                PID {proc.pid} · {proc.cpu}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 break-all">{proc.path}</p>
                          </div>
                        ))}
                      </div>

                      {/* Desktop & Tablet Process Table */}
                      <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-slate-950">
                        <table className="w-full text-left font-mono text-xs">
                          <thead className="border-b border-white/10 text-slate-400">
                            <tr>
                              <th className="py-2 px-3">PID</th>
                              <th className="py-2 px-3">Process</th>
                              <th className="py-2 px-3">Binary Path</th>
                              <th className="py-2 px-3 text-right">CPU</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {selectedNode.processes.map((proc) => (
                              <tr key={proc.pid}>
                                <td className="py-2 px-3 tabular-nums text-slate-400">{proc.pid}</td>
                                <td className="py-2 px-3 text-cyan-300">{proc.name}</td>
                                <td className="py-2 px-3 text-slate-400">{proc.path}</td>
                                <td className="py-2 px-3 text-right tabular-nums">{proc.cpu}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 break-words">
                        Tracked services: {selectedNode.services.join(' · ')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: INCIDENTS & MITRE ATT&CK HUNTING PREVIEW */}
              {activeTab === 'incidents' && (
                <motion.div
                  key="incidents"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid lg:grid-cols-12 gap-6"
                >
                  <div className="lg:col-span-5 min-w-0 space-y-2.5">
                    <p className="text-xs text-slate-400 font-medium">
                      MITRE ATT&amp;CK Kill Chain Coverage
                    </p>
                    {MITRE_STAGES.map((stage, idx) => (
                      <button
                        key={stage.tacticId}
                        type="button"
                        onClick={() => setSelectedStageIdx(idx)}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                          selectedStageIdx === idx
                            ? 'border-cyan-400 bg-cyan-500/10 text-white'
                            : 'border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-white truncate">{stage.tactic}</span>
                          <span className="font-mono text-cyan-400 shrink-0">{stage.tacticId}</span>
                        </div>
                        <p className="font-mono text-[11px] text-slate-400 mt-1 truncate">
                          {stage.response}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-7 min-w-0 rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between gap-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-cyan-400">
                            {MITRE_STAGES[selectedStageIdx].tacticId}
                          </span>
                          <h4 className="text-base font-semibold text-white mt-0.5">
                            {MITRE_STAGES[selectedStageIdx].tactic} Correlation &amp; Containment
                          </h4>
                        </div>
                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 font-medium">Mapped Techniques</p>
                        {MITRE_STAGES[selectedStageIdx].techniques.map((tech) => (
                          <div
                            key={tech}
                            className="p-3 rounded-lg bg-slate-950 border border-white/5 font-mono text-xs text-slate-200 break-words"
                          >
                            {tech}
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-lg bg-slate-950 border border-white/5 space-y-1.5">
                        <p className="text-xs font-medium text-white">Active Response Playbook</p>
                        <p className="font-mono text-xs text-cyan-300 break-words">
                          {MITRE_STAGES[selectedStageIdx].response}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed pt-1">
                          Inside the Incidents Workspace, analysts hunt raw security events across Suricata, Zeek, HIDS, and Syslog sources, append investigation notes, and approve or reject automated response actions.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onEnterConsole}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Open Incidents Workspace
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: CE-SOC CERTIFICATION & LIVE REGISTRY VERIFIER */}
              {activeTab === 'certification' && (
                <motion.div
                  key="certification"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid lg:grid-cols-12 gap-5 sm:gap-6"
                >
                  <div className="lg:col-span-5 min-w-0 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        CE-SOC Certification &amp; Anti-Malpractice Exam
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                        Operators complete the 10-chapter EncDec Workbook and pass a timed 10-minute examination drawing 6 randomized questions from a 220-question academic bank (80% minimum to pass; failing or exceeding 10:00 resets progress to Chapter 1).
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-3.5 font-mono text-xs text-slate-300">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Workbook Curriculum</span>
                        <span className="text-right">10 Chapters</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Authoritative Bank</span>
                        <span className="tabular-nums text-right">220+ Questions</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Per-Candidate Exam</span>
                        <span className="tabular-nums text-right">6 Random · 10:00 Limit</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Pass Threshold</span>
                        <span className="tabular-nums text-right">80% (Reset on Fail)</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 min-w-0 rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Verify a CE-SOC Certificate (Live Registry)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 break-words">
                        Query <code className="font-mono text-cyan-300">GET /api/certificates/verify/:id</code> directly against the EncDec registry.
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleVerifyCertificate();
                      }}
                      className="flex flex-col sm:flex-row gap-2.5"
                    >
                      <label htmlFor="landing-cert-verify-input" className="sr-only">
                        Certificate ID
                      </label>
                      <input
                        id="landing-cert-verify-input"
                        type="text"
                        value={certQuery}
                        onChange={(e) => setCertQuery(e.target.value)}
                        placeholder="e.g. CERT-ENCDEC-2026-X892A"
                        className="flex-1 min-h-[44px] sm:min-h-0 px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-base sm:text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        disabled={certLoading}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        id="landing-cert-verify-btn"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{certLoading ? 'Checking...' : 'Verify Credential'}</span>
                      </button>
                    </form>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>Example ID formats:</span>
                      {['CERT-ENCDEC-2026-X892A', 'CERT-ENCDEC-2026-W194E'].map((sampleId) => (
                        <button
                          key={sampleId}
                          type="button"
                          onClick={() => handleVerifyCertificate(sampleId)}
                          className="min-h-[36px] inline-flex items-center font-mono text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer"
                        >
                          {sampleId}
                        </button>
                      ))}
                    </div>

                    {certError && (
                      <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/30 text-xs text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{certError}</span>
                      </div>
                    )}

                    {certResult && (
                      <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Verified Active Credential
                          </span>
                          <span className="font-mono text-xs text-white tabular-nums">
                            Score: {certResult.quizScore}%
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {certResult.fullName}
                        </p>
                        <p className="text-xs text-slate-300">
                          {certResult.courseTitle} · Issued {certResult.issueDate}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400 break-all">
                          ID: {certResult.certificateId} · {certResult.verificationCode}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </TiltStage3D>
    </div>
  );
}
