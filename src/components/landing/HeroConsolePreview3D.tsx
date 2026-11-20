/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap, ArrowUpRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import CyberDefenseCanvas3D from './CyberDefenseCanvas3D.js';

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
  externalAccentMode?: 'nominal' | 'inspecting' | 'alert';
  externalPulseTrigger?: number;
  onExploreInteractive: () => void;
  onEnterConsole: () => void;
}

const HERO_PROBE_VECTORS: Array<{
  id: 'sqli' | 'traversal' | 'scanner' | 'xss' | 'cmdi';
  label: string;
  mitre: string;
}> = [
  { id: 'sqli', label: 'SQL Injection', mitre: 'T1190' },
  { id: 'traversal', label: 'Path Traversal', mitre: 'T1083' },
  { id: 'scanner', label: 'Secret Sweep', mitre: 'T1595' },
  { id: 'xss', label: 'XSS Payload', mitre: 'T1059' },
  { id: 'cmdi', label: 'Command Injection', mitre: 'T1059.004' },
];

export default function HeroConsolePreview3D({
  health,
  totalCertified,
  scrollFactor,
  externalAccentMode = 'nominal',
  externalPulseTrigger = 0,
  onExploreInteractive,
  onEnterConsole,
}: HeroConsolePreview3DProps) {
  const [localAccent, setLocalAccent] = useState<'nominal' | 'inspecting' | 'alert'>('nominal');
  const [localPulse, setLocalPulse] = useState(0);
  const [probeBusy, setProbeBusy] = useState(false);
  const [vectorIndex, setVectorIndex] = useState(0);
  const [lastIntercept, setLastIntercept] = useState<{
    vector: string;
    mitre: string;
    endpoint: string;
    ok: boolean;
  } | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  const uptimeMinutes = health ? Math.max(1, Math.floor(health.uptimeSeconds / 60)) : null;
  const activeAccent = localAccent !== 'nominal' ? localAccent : externalAccentMode;
  const combinedPulse = localPulse + externalPulseTrigger;

  const triggerHeroLiveDpi = async () => {
    if (probeBusy) return;
    const chosen = HERO_PROBE_VECTORS[vectorIndex % HERO_PROBE_VECTORS.length];
    setVectorIndex((idx) => (idx + 1) % HERO_PROBE_VECTORS.length);
    setProbeBusy(true);
    setLocalAccent('inspecting');
    setLocalPulse((p) => p + 1);

    try {
      const res = await fetch('/api/probe/live-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector: chosen.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setLocalAccent('alert');
        setLocalPulse((p) => p + 1);
        setLastIntercept({
          vector: `${data.vector || chosen.label}`,
          mitre: chosen.mitre,
          endpoint: String(data.targetEndpoint || '/api/probe/live-attack'),
          ok: true,
        });
      } else {
        setLastIntercept({
          vector: chosen.label,
          mitre: chosen.mitre,
          endpoint: `HTTP ${res.status}`,
          ok: false,
        });
      }
    } catch {
      setLastIntercept({
        vector: chosen.label,
        mitre: chosen.mitre,
        endpoint: 'Probe endpoint unavailable',
        ok: false,
      });
    } finally {
      setProbeBusy(false);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => {
        setLocalAccent('nominal');
      }, 3200);
    }
  };

  return (
    <div className="encdec-dark-card relative w-full min-w-0 min-h-[410px] sm:min-h-[490px] lg:min-h-[555px] rounded-2xl overflow-hidden border border-cyan-400/20 bg-[#030917] shadow-[0_28px_70px_-20px_rgba(2,6,23,0.9)] flex flex-col justify-between">
      {/* Unobstructed Full-Bleed Three.js 3D Geodesic Defense Core */}
      <div className="encdec-webgl-viewport absolute inset-0">
        <CyberDefenseCanvas3D
          scrollFactor={scrollFactor}
          interactive={true}
          accentMode={activeAccent}
          pulseTrigger={combinedPulse}
        />
        {/* Gentle edge vignette so top/bottom HUD docks stay crisp without backdrop-blur over WebGL */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(3,9,23,0.72) 0%, rgba(3,9,23,0.02) 22%, rgba(3,9,23,0.02) 64%, rgba(3,9,23,0.92) 100%)',
          }}
        />
      </div>

      {/* Minimal Top Corner Telemetry Header (Zero Center Occlusion) */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3.5 sm:px-5 py-3 border-b border-white/10 bg-[#050c1a]/88">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono text-[11px] sm:text-xs text-slate-100 truncate">
            EncDec IDS · 3D Geodesic Core
          </span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[10px] sm:text-[11px] shrink-0">
          <span
            className={
              activeAccent === 'alert'
                ? 'text-amber-300 font-semibold'
                : activeAccent === 'inspecting'
                ? 'text-emerald-300 font-semibold'
                : health?.status === 'ok'
                ? 'text-emerald-400'
                : 'text-slate-400'
            }
          >
            {activeAccent === 'alert'
              ? 'Threat Intercepted'
              : activeAccent === 'inspecting'
              ? 'Inspecting Wire'
              : health
              ? health.status === 'ok'
                ? 'Engine Operational'
                : 'Engine Degraded'
              : 'Live Telemetry'}
          </span>
          {uptimeMinutes !== null && (
            <span className="hidden sm:inline text-slate-400 tabular-nums">
              · {uptimeMinutes}m
            </span>
          )}
        </div>
      </div>

      {/* Center Stage intentionally open so 3D core, titanium vanes, pulses & shockwaves shine */}
      <div className="relative z-10 flex-1 pointer-events-none" aria-hidden="true" />

      {/* Sleek Bottom Command Dock (Solid/Translucent Dark Surface — Zero Backdrop-Blur over WebGL) */}
      <div className="relative z-10 border-t border-cyan-400/20 bg-[#050c1a]/94 px-3.5 sm:px-5 py-3.5 space-y-3">
        {/* Live Intercept Banner (appears after clicking Test Live DPI) */}
        {lastIntercept && (
          <div
            className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px] ${
              lastIntercept.ok
                ? 'border-amber-400/35 bg-[#121623] text-amber-100'
                : 'border-red-400/30 bg-[#1a0f18] text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {lastIntercept.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              <span className="truncate">
                <span className="font-semibold text-white">{lastIntercept.vector}</span>{' '}
                <span className="text-slate-400">({lastIntercept.mitre})</span>{' '}
                <span className="text-cyan-300 hidden sm:inline">→ {lastIntercept.endpoint}</span>
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider shrink-0">
              {lastIntercept.ok ? 'Intercepted' : 'Error'}
            </span>
          </div>
        )}

        {/* Compact Verified Telemetry Strip */}
        <div className="grid grid-cols-3 gap-2 text-left">
          <div className="rounded-lg border border-white/10 bg-[#0b162d] px-2.5 py-2 min-w-0">
            <p className="text-[10px] text-slate-400 truncate">DPI Engine</p>
            <p className="font-mono text-xs sm:text-sm font-semibold text-cyan-300 tabular-nums truncate">
              12 Protocols
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0b162d] px-2.5 py-2 min-w-0">
            <p className="text-[10px] text-slate-400 truncate">Persistence</p>
            <p className="font-mono text-xs sm:text-sm font-semibold text-emerald-400 truncate">
              {health?.firestoreAvailable ? 'Firestore Live' : 'Dual DB Ready'}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0b162d] px-2.5 py-2 min-w-0">
            <p className="text-[10px] text-slate-400 truncate">CE-SOC</p>
            <p className="font-mono text-xs sm:text-sm font-semibold text-sky-300 tabular-nums truncate">
              {totalCertified !== null ? `${totalCertified} Certified` : '220+ Q Bank'}
            </p>
          </div>
        </div>

        {/* Action Row: One-Click Live DPI Trigger + Quick Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={triggerHeroLiveDpi}
            disabled={probeBusy}
            id="hero-test-dpi-btn"
            className="min-h-[42px] sm:min-h-[38px] px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>{probeBusy ? 'Inspecting Packet...' : 'Test Live DPI'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExploreInteractive}
              className="min-h-[40px] sm:min-h-0 px-1 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Interactive Demo
            </button>
            <button
              type="button"
              onClick={onEnterConsole}
              className="min-h-[40px] sm:min-h-0 px-1 py-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Open Console</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
