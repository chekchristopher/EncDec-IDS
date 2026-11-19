/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Activity, Globe, Database, GraduationCap, ArrowUpRight } from 'lucide-react';
import CyberDefenseCanvas3D from './CyberDefenseCanvas3D.js';
import TiltStage3D from './TiltStage3D.js';

export interface PublicHealthSnapshot {
  status: string;
  uptimeSeconds: number;
  firestoreAvailable: boolean;
  mssqlConnected: boolean;
  mssqlStatus: string;
  wsClients: number;
  rssMb?: number;
}

interface HeroConsolePreview3DProps {
  health: PublicHealthSnapshot | null;
  totalCertified: number | null;
  scrollFactor: number;
  onExploreInteractive: () => void;
  onEnterConsole: () => void;
}

export default function HeroConsolePreview3D({
  health,
  totalCertified,
  scrollFactor,
  onExploreInteractive,
  onEnterConsole,
}: HeroConsolePreview3DProps) {
  const uptimeMinutes = health ? Math.max(1, Math.floor(health.uptimeSeconds / 60)) : null;

  return (
    <div className="relative w-full min-h-[460px] lg:min-h-[540px] flex items-center justify-center">
      {/* Deep Three.js 3D Geodesic Shield Core Backdrop (isolated canvas container) */}
      <div className="encdec-webgl-viewport absolute inset-0 rounded-2xl overflow-hidden border border-white/10 bg-[#030917]">
        <CyberDefenseCanvas3D scrollFactor={scrollFactor} interactive={true} />
        {/* Subtle vignette scrim to keep overlaid console frame crisp without backdrop-blur over WebGL */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(3, 9, 23, 0.1) 0%, rgba(2, 6, 23, 0.72) 86%)',
          }}
        />
      </div>

      {/* Layered 3D Perspective Product Console Window */}
      <div className="relative z-10 w-full px-4 sm:px-6 py-6 sm:py-8">
        <TiltStage3D maxTilt={4} className="w-full max-w-xl mx-auto">
          <div className="encdec-dark-card rounded-xl border border-cyan-400/25 bg-[#071022]/94 shadow-[0_28px_70px_-15px_rgba(2,6,23,0.9)] overflow-hidden">
            {/* Window Top Bar matching EncDec IDS Console */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#050c1a]">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-xs text-slate-200 truncate">
                  EncDec IDS Command Console
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                Overview · Hybrid HIDS/NIDS
              </span>
            </div>

            {/* Real-Structure SOC Telemetry Grid */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Top 3 KPI Cells (Live engine data + verified platform capabilities) */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-white/10 bg-[#0b162d] p-3">
                  <p className="text-[11px] text-slate-400">Engine State</p>
                  <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-emerald-400 tabular-nums">
                    {health ? (health.status === 'ok' ? 'Operational' : 'Degraded') : 'Checking'}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500 tabular-nums">
                    {uptimeMinutes !== null ? `Uptime ${uptimeMinutes}m` : 'Live /api/health'}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0b162d] p-3">
                  <p className="text-[11px] text-slate-400">DPI Protocols</p>
                  <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-cyan-300 tabular-nums">
                    12 Inspected
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    TCP · UDP · HTTP · SSH
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0b162d] p-3">
                  <p className="text-[11px] text-slate-400">CE-SOC Registry</p>
                  <p className="mt-1 font-mono text-sm sm:text-base font-semibold text-sky-300 tabular-nums">
                    {totalCertified !== null ? `${totalCertified} Certified` : '220 Q Bank'}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    QR Verifiable
                  </p>
                </div>
              </div>

              {/* Representative Live Stream & Persistence Overview */}
              <div className="grid sm:grid-cols-12 gap-3">
                {/* Waveform & Vector Readout */}
                <div className="sm:col-span-7 rounded-lg border border-white/10 bg-[#081224] p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5">
                    <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Packet &amp; Event Pipeline
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">Interface Preview</span>
                  </div>

                  {/* Clean SVG Throughput Bars */}
                  <div className="flex items-end gap-1.5 h-16 pt-2" aria-hidden="true">
                    {[28, 42, 34, 58, 46, 72, 52, 64, 88, 60, 48, 76, 54, 68].map((val, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${val}%`,
                          backgroundColor:
                            val > 80 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(6, 182, 212, 0.65)',
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>Suricata · Zeek · HIDS · Syslog</span>
                    <span className="text-cyan-300">WebSocket Live</span>
                  </div>
                </div>

                {/* Active Architecture Modules */}
                <div className="sm:col-span-5 rounded-lg border border-white/10 bg-[#081224] p-3.5 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        TopoJSON Map
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">D3 Vector</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Cloud Firestore
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400">
                        {health?.firestoreAvailable ? 'Connected' : 'Ready'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        CE-SOC Exam
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">10m · 80%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={onExploreInteractive}
                      className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Interactive Demo
                    </button>
                    <button
                      type="button"
                      onClick={onEnterConsole}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Open Console
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TiltStage3D>
      </div>
    </div>
  );
}
