/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldCheck, Cpu, HardDrive, Circle, Search,
  Server, ShieldAlert, Monitor, ArrowUpRight, Ban, Eye, Command 
} from 'lucide-react';
import { Host } from '../types.js';
import { apiRequest } from '../api.js';

interface HostIDSProps {
  hosts: Host[];
  onRegisterHost: (host: Partial<Host>) => void;
  onDeregisterHost: (id: string) => void;
  onQuarantine: (payload: { hostId: string; type: 'file' | 'process' | 'ip'; targetValue: string; reason: string }) => void;
}

export default function HostIDS({ 
  hosts, 
  onRegisterHost, 
  onDeregisterHost,
  onQuarantine
}: HostIDSProps) {
  
  const [selectedHostId, setSelectedHostId] = useState<string>('hst_1');
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Register Host states
  const [showDeployWizard, setShowDeployWizard] = useState(false);
  const [newHostName, setNewHostName] = useState('');
  const [newHostOs, setNewHostOs] = useState<'windows' | 'linux' | 'macos'>('linux');
  const [newHostIp, setNewHostIp] = useState('');

  // Isolation Modal States
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);
  const [quarantineType, setQuarantineType] = useState<'file' | 'process' | 'ip'>('process');
  const [quarantineTarget, setQuarantineTarget] = useState('');
  const [quarantineReason, setQuarantineReason] = useState('');

  // Fetch host telemetry whenever host changes or polling triggers
  useEffect(() => {
    if (!selectedHostId) return;

    const fetchTelemetry = async () => {
      setLoadingTelemetry(true);
      try {
        const data = await apiRequest(`/api/hosts/${selectedHostId}/telemetry`);
        setTelemetry(data);
      } catch (err) {
        console.warn('Failed to load host telemetry', err);
      } finally {
        setLoadingTelemetry(false);
      }
    };

    fetchTelemetry();
    
    // Auto-poll host detail telemetry every 4 seconds to reflect fluctuations
    const interval = setInterval(fetchTelemetry, 4000);
    return () => clearInterval(interval);
  }, [selectedHostId]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostName || !newHostIp) return;

    onRegisterHost({
      name: newHostName,
      os: newHostOs,
      ipAddress: newHostIp
    });

    setNewHostName('');
    setNewHostIp('');
    setShowDeployWizard(false);
  };

  const handleQuarantineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostId || !quarantineTarget || !quarantineReason) return;

    onQuarantine({
      hostId: selectedHostId,
      type: quarantineType,
      targetValue: quarantineTarget,
      reason: quarantineReason
    });

    setQuarantineTarget('');
    setQuarantineReason('');
    setShowQuarantineModal(false);
  };

  const selectedHost = hosts.find(h => h.id === selectedHostId);

  return (
    <div className="space-y-6" id="host-ids-container">
      
      {/* Fleet Overview bar */}
      <div className="bg-slate-900 border border-white/5 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Host-Based intrusion Detection (HIDS) Fleet
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manages FIM integrity, active process schedules, audit logs, login sessions, and USB isolation vectors across standard servers.
          </p>
        </div>
        <button
          onClick={() => setShowDeployWizard(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
          id="deploy-agent-wizard-btn"
        >
          <Command className="w-4 h-4" />
          <span>Deploy Host Agent</span>
        </button>
      </div>

      {/* Fleet Dashboard Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Enrolled Hosts Side rail */}
        <div className="space-y-3 lg:col-span-1">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pl-1">Enrolled Nodes</p>
          <div className="space-y-2">
            {hosts.map((host) => {
              const isSelected = host.id === selectedHostId;
              return (
                <button
                  key={host.id}
                  onClick={() => setSelectedHostId(host.id)}
                  className={`w-full text-left p-4 rounded border transition-all flex justify-between items-center ${
                    isSelected 
                      ? 'bg-cyan-500/10 border-cyan-500/40' 
                      : 'bg-slate-900 border-white/5 hover:border-white/15'
                  }`}
                  id={`host-card-${host.id}`}
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{host.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{host.ipAddress}</p>
                    <span className="inline-block text-[8px] font-mono uppercase tracking-wide text-cyan-400 bg-cyan-950/40 px-1 rounded">
                      {host.os}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      {host.status === 'online' && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        host.status === 'online' ? 'bg-emerald-500' : 'bg-slate-700'
                      }`} />
                    </span>
                    {host.status === 'online' && (
                      <span className="text-[9px] font-mono text-slate-500">{host.cpuUsage}% CPU</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Host Details panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedHost ? (
            <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-6">
              
              {/* Host Identity details header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-1.5 font-mono">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    {selectedHost.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-slate-400 font-mono">
                    <span>IP: <strong className="text-slate-300">{selectedHost.ipAddress}</strong></span>
                    <span className="text-white/10 hidden xs:inline">•</span>
                    <span>OS: <strong className="text-slate-300 uppercase">{selectedHost.os}</strong></span>
                    <span className="text-white/10 hidden xs:inline">•</span>
                    <span>Agent: <strong className="text-slate-300">{selectedHost.agentVersion}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setQuarantineTarget('');
                      setQuarantineType('process');
                      setShowQuarantineModal(true);
                    }}
                    className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    id="host-quarantine-trigger"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Quarantine</span>
                  </button>
                  <button
                    onClick={() => onDeregisterHost(selectedHost.id)}
                    className="bg-slate-950 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded text-xs font-mono cursor-pointer"
                    id="deregister-host-btn"
                  >
                    Deregister
                  </button>
                </div>
              </div>

              {/* Hardware resources live stream metrics */}
              {selectedHost.status === 'online' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded border border-white/5 space-y-1.5 font-mono">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>CPU Core Load</span>
                      <span className="text-cyan-400 font-bold">{selectedHost.cpuUsage}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded overflow-hidden">
                      <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${selectedHost.cpuUsage}%` }} />
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded border border-white/5 space-y-1.5 font-mono">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>System Memory</span>
                      <span className="text-cyan-400 font-bold">{selectedHost.memoryUsage}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded overflow-hidden">
                      <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${selectedHost.memoryUsage}%` }} />
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded border border-white/5 space-y-1.5 font-mono">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Storage Capacity</span>
                      <span className="text-slate-400 font-bold">{selectedHost.diskUsage}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded overflow-hidden">
                      <div className="h-full bg-slate-500 transition-all duration-300" style={{ width: `${selectedHost.diskUsage}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Host Detailed sub logs split */}
              {loadingTelemetry && !telemetry ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  📡 Gathering secure endpoint state...
                </div>
              ) : telemetry ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Processes lists */}
                  <div className="bg-slate-950 rounded border border-white/5 p-4 flex flex-col h-80">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3 border-b border-white/5 pb-2 flex items-center justify-between">
                      <span>Active Processes Tree</span>
                      <span className="text-cyan-400">{telemetry.processes.length} Running</span>
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {telemetry.processes.map((p: any) => (
                        <div key={p.pid} className={`flex justify-between items-center p-2 rounded ${
                          p.suspicious ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-900/50'
                        }`}>
                          <div className="min-w-0">
                            <p className={`font-semibold ${p.suspicious ? 'text-red-400' : 'text-slate-200'}`}>
                              {p.name} <span className="text-slate-500 font-normal">({p.pid})</span>
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{p.path}</p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <span className="text-[10px] text-slate-400">{p.cpu}% CPU</span>
                            {p.suspicious && (
                              <button
                                onClick={() => {
                                  setQuarantineType('process');
                                  setQuarantineTarget(String(p.pid));
                                  setQuarantineReason(`Suspicious process vector detected: ${p.name}`);
                                  setShowQuarantineModal(true);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                                title="Kill process"
                              >
                                <Ban className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File Integrity Modifications (FIM) */}
                  <div className="bg-slate-950 rounded border border-white/5 p-4 flex flex-col h-80">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3 border-b border-white/5 pb-2">
                      File Integrity Monitored (FIM) Logs
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
                      {telemetry.fileChanges.map((f: any, i: number) => (
                        <div key={i} className="p-2 bg-slate-900/50 rounded flex justify-between items-start">
                          <div className="min-w-0">
                            <p className="text-slate-300 truncate" title={f.filePath}>{f.filePath}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Modifier: {f.user}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[9px] font-bold px-1 rounded uppercase ${
                              f.action === 'created' ? 'bg-emerald-950/50 text-emerald-400' : f.action === 'modified' ? 'bg-amber-950/50 text-amber-400' : 'bg-red-950/50 text-red-400'
                            }`}>
                              {f.action}
                            </span>
                            <span className="block text-[9px] text-slate-500 mt-1">{new Date(f.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Services controllers */}
                  <div className="bg-slate-950 rounded border border-white/5 p-4 flex flex-col h-64">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3 border-b border-white/5 pb-2">
                      Host System Services state
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {telemetry.services.map((s: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                          <div>
                            <p className="font-semibold text-slate-200">{s.displayName}</p>
                            <p className="text-[10px] text-slate-500">{s.name}</p>
                          </div>
                          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System calls and telemetry */}
                  <div className="bg-slate-950 rounded border border-white/5 p-4 flex flex-col h-64">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3 border-b border-white/5 pb-2">
                      System Calls & Audit indicators
                    </p>
                    <div className="flex-1 space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                        <div className="p-2 bg-slate-900/50 rounded">
                          <p className="text-slate-500 uppercase text-[9px]">USB Storage</p>
                          <p className="text-emerald-400 font-bold mt-1">SECURE</p>
                        </div>
                        <div className="p-2 bg-slate-900/50 rounded">
                          <p className="text-slate-500 uppercase text-[9px]">Failed Logins (24h)</p>
                          <p className="text-red-400 font-bold mt-1">14 Atts</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400">Captured system calls buffer:</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {telemetry.systemCalls.map((sc: string, i: number) => (
                            <span key={i} className="bg-slate-900 text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-white/5">
                              {sc}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400">Monitored cron/scheduled entries:</p>
                        <div className="bg-slate-900 p-2 rounded text-[10px] text-red-400 border border-red-500/10">
                          {telemetry.cronJobs[0]}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : null}

            </div>
          ) : (
            <div className="bg-slate-900 border border-white/5 rounded-lg p-12 text-center text-slate-500 font-mono text-xs">
              ⚠️ Please enroll or select an active host node from the list side-rail.
            </div>
          )}
        </div>

      </div>

      {/* modal quarantine action */}
      {showQuarantineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-lg p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4">Execute Quarantine Isolation</h3>
            
            <form onSubmit={handleQuarantineSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Isolation Vector Type</label>
                <select
                  value={quarantineType}
                  onChange={(e: any) => setQuarantineType(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="process">Kill Process (PID)</option>
                  <option value="file">Quarantine File (Path)</option>
                  <option value="ip">Block Connection (IP)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Target Value identifier</label>
                <input
                  type="text"
                  required
                  placeholder={quarantineType === 'process' ? 'e.g. 14210' : quarantineType === 'file' ? 'e.g. /tmp/cryptominer-bin' : 'e.g. 198.51.100.42'}
                  value={quarantineTarget}
                  onChange={(e) => setQuarantineTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Security Justification Reason</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Hostile cryptominer binary running without clearance"
                  value={quarantineReason}
                  onChange={(e) => setQuarantineReason(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuarantineModal(false)}
                  className="bg-slate-950 border border-white/10 hover:border-slate-600 text-slate-400 px-4 py-2 rounded text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-bold uppercase"
                >
                  Confirm Isolation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* modal deploy agent wizard */}
      {showDeployWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-lg p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-2">Deploy Host Agent Node</h3>
            <p className="text-xs text-slate-400 mb-4">
              Provision a new secure Linux, Windows or macOS node inside your local environment using our cURL daemon script.
            </p>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Asset Node Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. backend-db-srv"
                    value={newHostName}
                    onChange={(e) => setNewHostName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Target OS</label>
                  <select
                    value={newHostOs}
                    onChange={(e: any) => setNewHostOs(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="linux">Linux Core</option>
                    <option value="windows">Windows Server</option>
                    <option value="macos">macOS Terminal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Direct IP Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.110"
                  value={newHostIp}
                  onChange={(e) => setNewHostIp(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Generated deployment command code */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1">
                  <Command className="w-3.5 h-3.5" />
                  Generated Command (Run on Target)
                </label>
                <div className="bg-slate-950 p-3 rounded border border-white/5 font-mono text-[10px] text-cyan-400/80 break-all select-all">
                  {newHostOs === 'linux' ? (
                    `curl -sSL https://vigil.encdec.ids/install.sh | bash -s -- --token ids_agent_4fa2 --host ${newHostIp || '<IP>'}`
                  ) : newHostOs === 'windows' ? (
                    `iex ((New-Object System.Net.WebClient).DownloadString('https://vigil.encdec.ids/install.ps1')) -Token "ids_agent_4fa2" -Host "${newHostIp || '<IP>'}"`
                  ) : (
                    `curl -fsSL https://vigil.encdec.ids/mac_install.sh | sh -s -- --token ids_agent_4fa2 --host ${newHostIp || '<IP>'}`
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeployWizard(false)}
                  className="bg-slate-950 border border-white/10 hover:border-slate-600 text-slate-400 px-4 py-2 rounded text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded text-xs font-bold uppercase"
                >
                  Verify & Enroll Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
