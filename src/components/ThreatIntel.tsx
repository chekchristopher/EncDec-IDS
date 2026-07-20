/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, ShieldCheck, Database, HelpCircle, 
  Settings2, RefreshCw, Eye, Globe 
} from 'lucide-react';
import { ThreatIntelFeed, MLModel } from '../types.js';

interface ThreatIntelProps {
  threatIntel: ThreatIntelFeed[];
  mlModels: MLModel[];
  onTrainModel: (id: string) => void;
}

export default function ThreatIntel({ threatIntel, mlModels, onTrainModel }: ThreatIntelProps) {
  const [activeTab, setActiveTab] = useState<'ioc' | 'ml'>('ioc');

  return (
    <div className="space-y-6" id="threat-intel-container">
      
      {/* Header Panel */}
      <div className="bg-slate-900 border border-white/5 rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              Advanced Threat Intelligence & Machine Learning
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Synchronizes active IOC blocklists (IP, Domain, MD5 Hash) with global threat research, powered by local unsupervised anomaly models.
            </p>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-white/5 flex gap-1 w-full md:w-auto justify-center">
            <button
              onClick={() => setActiveTab('ioc')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer flex-1 md:flex-none text-center ${
                activeTab === 'ioc' 
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.2)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              IOC feeds
            </button>
            <button
              onClick={() => setActiveTab('ml')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer flex-1 md:flex-none text-center ${
                activeTab === 'ml' 
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.2)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ML Classifiers
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'ioc' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* IOC Stream lists */}
          <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-lg p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Indicators of Compromise (IOC) Blocklist
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Confidence rating ≥ 80%</span>
            </div>

            {/* Desktop IOC Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Value</th>
                    <th className="py-2 px-3">Classification / Intent</th>
                    <th className="py-2 px-3">Confidence</th>
                    <th className="py-2 px-3">Feed Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {threatIntel.map((ioc) => (
                    <tr key={ioc.id} className="hover:bg-white/[0.01]">
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-950 text-cyan-400 border border-white/5">
                          {ioc.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">{ioc.value}</td>
                      <td className="py-3 px-3 text-red-400">{ioc.threatType}</td>
                      <td className="py-3 px-3 font-bold">{ioc.confidence}%</td>
                      <td className="py-3 px-3 text-slate-400">{ioc.source}</td>
                    </tr>
                  ))}
                  <tr className="hover:bg-white/[0.01]">
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-950 text-cyan-400 border border-white/5">
                        hash
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">e5e054f0ee0434b9cf4f82662faee567</td>
                    <td className="py-3 px-3 text-red-400">LockBit Ransomware V3 payload</td>
                    <td className="py-3 px-3 font-bold">99%</td>
                    <td className="py-3 px-3 text-slate-400">CISA Advisory Logs</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile IOC Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {threatIntel.map((ioc) => (
                <div key={ioc.id} className="p-3 bg-slate-950 border border-white/5 rounded space-y-2 text-xs font-mono" id={`mobile-ioc-${ioc.id}`}>
                  <div className="flex justify-between items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-900 text-cyan-400 border border-white/5">
                      {ioc.type}
                    </span>
                    <span className="text-red-400 font-semibold text-right truncate max-w-[150px]">{ioc.threatType}</span>
                  </div>
                  <p className="font-semibold text-white break-all">{ioc.value}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-white/5 pt-1.5">
                    <span>Source: {ioc.source}</span>
                    <span className="font-bold text-white">Confidence: {ioc.confidence}%</span>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-slate-950 border border-white/5 rounded space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-900 text-cyan-400 border border-white/5">
                    hash
                  </span>
                  <span className="text-red-400 font-semibold text-right truncate max-w-[150px]">LockBit Ransomware V3</span>
                </div>
                <p className="font-semibold text-white break-all">e5e054f0ee0434b9cf4f82662faee567</p>
                <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-white/5 pt-1.5">
                  <span>Source: CISA Advisory Logs</span>
                  <span className="font-bold text-white">Confidence: 99%</span>
                </div>
              </div>
            </div>

          </div>

          {/* Intel feeds status metrics */}
          <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide pb-2 border-b border-white/5">
                Threat Feeds Synced
              </h3>
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-white/5">
                  <span className="text-xs font-mono text-slate-300">AlienVault OTX API</span>
                  <span className="text-xs text-emerald-400 font-mono font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-white/5">
                  <span className="text-xs font-mono text-slate-300">CISA US-CERT Ingest</span>
                  <span className="text-xs text-emerald-400 font-mono font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-white/5">
                  <span className="text-xs font-mono text-slate-300">Mandiant Adv. Feed</span>
                  <span className="text-xs text-amber-400 font-mono font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Rate-Limit
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/50 rounded border border-white/5 space-y-2">
              <p className="text-xs font-bold text-white font-mono uppercase">Vigil Threat Analyzer Note</p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                Threat database contains 14,204 active rules. Simulated host packet sniffer utilizes active caches to analyze payloads live.
              </p>
            </div>
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ML Models configuration panels */}
          <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-lg p-6 space-y-6">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Machine Learning Anomaly Detectors
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mlModels.map((model) => (
                <div key={model.id} className="p-4 bg-slate-950 border border-white/5 rounded space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{model.name}</h4>
                      <span className="text-[9px] uppercase font-mono text-slate-400 bg-white/[0.02] px-1 rounded">
                        Algorithm: {model.type}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 rounded ${
                      model.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                    }`}>
                      {model.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                    <span>Classification Accuracy:</span>
                    <span className="text-white font-bold">{model.accuracy}%</span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 pt-1">
                    Last training cycle: {new Date(model.lastTrained).toLocaleDateString()}
                  </div>

                  <button
                    onClick={() => onTrainModel(model.id)}
                    disabled={model.status === 'training'}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-300 disabled:text-slate-500 border border-white/10 py-2 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${model.status === 'training' ? 'animate-spin' : ''}`} />
                    <span>{model.status === 'training' ? 'Training Classifier...' : 'Retrain Classifier'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide border-b border-white/5 pb-2">
              Unsupervised Heuristics
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Our autoencoder reconstructions monitor the standard packet length deviations and system calls to catch Zero-Day pivots without static rules.
            </p>
            <div className="p-3 bg-slate-950 rounded border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Telemetry Threshold</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">Isolation Forest threshold (p &lt; 0.05)</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
