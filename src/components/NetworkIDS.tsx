/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Activity, Play, Pause, Search, PlusCircle, Filter, 
  Trash2, ShieldAlert, CheckCircle, Wifi, Radio 
} from 'lucide-react';
import { Packet, Rule } from '../types.js';

interface NetworkIDSProps {
  packets: Packet[];
  rules: Rule[];
  onCreateRule: (rule: Partial<Rule>) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
}

export default function NetworkIDS({ 
  packets, 
  rules, 
  onCreateRule, 
  onDeleteRule, 
  onToggleRule 
}: NetworkIDSProps) {
  
  const [isRunning, setIsRunning] = useState(true);
  const [filterProtocol, setFilterProtocol] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Rule Creator States
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<'signature' | 'behavior' | 'anomaly'>('signature');
  const [ruleSeverity, setRuleSeverity] = useState<'critical' | 'high' | 'medium' | 'low' | 'info'>('high');
  const [ruleDef, setRuleDef] = useState('');
  const [ruleMitre, setRuleMitre] = useState('');

  const protocols = ['ALL', 'TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'HTTPS', 'ARP', 'DHCP', 'SMTP', 'FTP', 'SSH', 'SMB'];

  // Handle packet filtering
  const filteredPackets = packets.filter(p => {
    const matchesProtocol = filterProtocol === 'ALL' || p.protocol === filterProtocol;
    const matchesSearch = p.sourceIp.includes(searchQuery) || 
                          p.destIp.includes(searchQuery) || 
                          p.payloadInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.protocol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProtocol && matchesSearch;
  });

  const handleCreateRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !ruleDef) return;

    onCreateRule({
      name: ruleName,
      type: ruleType,
      target: 'network',
      severity: ruleSeverity,
      definition: ruleDef,
      mitreMapping: ruleMitre || undefined
    });

    // Reset fields
    setRuleName('');
    setRuleType('signature');
    setRuleSeverity('high');
    setRuleDef('');
    setRuleMitre('');
    setShowRuleModal(false);
  };

  return (
    <div className="space-y-6" id="network-ids-container">
      
      {/* Network Header panel */}
      <div className="bg-slate-900 border border-white/5 rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Network Threat Analysis & Sniffer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitors and dissects global TCP/UDP packets, detects ARP spoofing, DNS tunnels, and anomalous lateral sweeps.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                isRunning 
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20' 
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              id="toggle-sniffer-btn"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Capture</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Resume Capture</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowRuleModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
              id="create-rule-btn"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create NIDS Rule</span>
            </button>
          </div>
        </div>

        {/* Live Sniffer HUD metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="bg-slate-950 p-3 rounded border border-white/5 font-mono">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Monitored Protocols</p>
            <p className="text-lg font-bold text-white mt-1">12 Standard</p>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-white/5 font-mono">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Capture Engine</p>
            <p className="text-lg font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
              <Wifi className="w-4 h-4 animate-bounce" />
              TLS Mirroring
            </p>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-white/5 font-mono">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Packet Buffer Queue</p>
            <p className="text-lg font-bold text-white mt-1">1,024 Realtime</p>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-white/5 font-mono">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Heuristics Engine</p>
            <p className="text-lg font-bold text-cyan-400 mt-1">IDS Core V4</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time packet sniffer viewer */}
        <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-lg p-6 flex flex-col h-[520px]">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 border-b border-white/5 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Filter:</span>
              {protocols.slice(0, 7).map((proto) => (
                <button
                  key={proto}
                  onClick={() => setFilterProtocol(proto)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                    filterProtocol === proto 
                      ? 'bg-cyan-500 text-slate-950' 
                      : 'bg-slate-950 text-slate-400 border border-white/5 hover:text-white'
                  }`}
                  id={`proto-filter-${proto}`}
                >
                  {proto}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-48 bg-slate-950 border border-white/10 rounded flex items-center px-2 focus-within:border-cyan-500 transition-colors">
              <Search className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
              <input
                type="text"
                placeholder="Search IPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-0 font-mono"
              />
            </div>
          </div>

          {/* Core Table View - Desktop only */}
          <div className="flex-1 overflow-y-auto pr-1 hidden md:block">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead className="bg-slate-950 sticky top-0 z-10 text-[10px] text-slate-500">
                <tr className="border-b border-white/5">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Protocol</th>
                  <th className="py-2.5 px-3 text-right">Src IP:Port</th>
                  <th className="py-2.5 px-3 text-center">Dir</th>
                  <th className="py-2.5 px-3">Dest IP:Port</th>
                  <th className="py-2.5 px-3">Payload Data Stream</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!isRunning && filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      ⏸️ Sniffer capture paused. Resume capture to stream realtime network telemetry.
                    </td>
                  </tr>
                ) : filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      🛸 Packet pipeline quiet. Listening on ingress virtual interfaces...
                    </td>
                  </tr>
                ) : (
                  filteredPackets.map((pkt) => (
                    <tr key={pkt.id} className="hover:bg-cyan-500/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(pkt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-950 border border-white/10 text-cyan-400">
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {pkt.sourceIp}:{pkt.sourcePort || '0'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">
                        ➡️
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {pkt.destIp}:{pkt.destPort || '0'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs" title={pkt.payloadInfo}>
                        {pkt.payloadInfo}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Compact Card View - Mobile only */}
          <div className="flex-1 overflow-y-auto pr-1 block md:hidden space-y-2">
            {!isRunning && filteredPackets.length === 0 ? (
              <p className="py-12 text-center text-slate-500 font-mono text-xs">
                ⏸️ Sniffer capture paused. Resume capture to stream realtime network telemetry.
              </p>
            ) : filteredPackets.length === 0 ? (
              <p className="py-12 text-center text-slate-500 font-mono text-xs">
                🛸 Packet pipeline quiet. Listening on ingress virtual interfaces...
              </p>
            ) : (
              filteredPackets.map((pkt) => (
                <div key={pkt.id} className="p-3 bg-slate-950 border border-white/5 rounded space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{new Date(pkt.timestamp).toLocaleTimeString()}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-905 border border-white/10 text-cyan-400">
                      {pkt.protocol}
                    </span>
                  </div>
                  
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div className="truncate"><span className="text-slate-500">SRC:</span> {pkt.sourceIp}:{pkt.sourcePort || '0'}</div>
                    <div className="truncate"><span className="text-slate-500">DST:</span> {pkt.destIp}:{pkt.destPort || '0'}</div>
                  </div>

                  <div className="p-1.5 bg-slate-900 rounded text-[10px] text-slate-400 truncate" title={pkt.payloadInfo}>
                    {pkt.payloadInfo}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* NIDS Signature and Rule configuration card */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 flex flex-col h-[520px]">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3 justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Signature Rules</h3>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              {rules.filter(r => r.enabled).length} Enabled
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {rules.filter(r => r.target === 'network').map((rule) => (
              <div key={rule.id} className="p-3 bg-slate-950 border border-white/5 rounded space-y-2 relative">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">{rule.name}</p>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 bg-white/[0.02] px-1.5 rounded font-mono border border-white/5">
                      {rule.type}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Delete rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2 bg-slate-900/50 rounded font-mono text-[10px] text-slate-400 border border-white/5 whitespace-pre-wrap">
                  {rule.definition}
                </div>

                {rule.mitreMapping && (
                  <p className="text-[10px] font-mono text-slate-500">MITRE: {rule.mitreMapping}</p>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className={`text-[9px] uppercase font-bold px-1 rounded ${
                    rule.severity === 'critical' ? 'text-red-400 bg-red-950/20' : 'text-amber-400 bg-amber-950/20'
                  }`}>
                    {rule.severity} Severity
                  </span>
                  
                  {/* Toggle enable state button */}
                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      rule.enabled 
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' 
                        : 'bg-slate-900 text-slate-500 border border-white/10'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* modal create rule */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-lg p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4">Create custom Network IDS signature</h3>
            
            <form onSubmit={handleCreateRuleSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Rule Descriptor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Detect Tor Exit Node Communication"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Classification Type</label>
                  <select
                    value={ruleType}
                    onChange={(e: any) => setRuleType(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="signature">Signature Based</option>
                    <option value="behavior">Behavior Based</option>
                    <option value="anomaly">Anomaly Based</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Alert Severity</label>
                  <select
                    value={ruleSeverity}
                    onChange={(e: any) => setRuleSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Rule definition syntax (JSON string format)</label>
                <textarea
                  required
                  rows={3}
                  placeholder={`e.g. { "protocol": "TCP", "destPort": 443, "payloadPattern": "XMRig" }`}
                  value={ruleDef}
                  onChange={(e) => setRuleDef(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">MITRE ATT&CK Mapping tag (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. T1043 (Commonly Used Port)"
                  value={ruleMitre}
                  onChange={(e) => setRuleMitre(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="bg-slate-950 border border-white/10 hover:border-slate-600 text-slate-400 px-4 py-2 rounded text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded text-xs font-bold uppercase"
                >
                  Publish Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
