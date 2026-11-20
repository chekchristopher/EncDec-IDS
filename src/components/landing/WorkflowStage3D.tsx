/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Server, Activity, Flame, GraduationCap, ShieldCheck, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface WorkflowStepItem {
  step: string;
  shortLabel: string;
  title: string;
  body: string;
  meta: string;
  accentText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WORKFLOW_STEPS: WorkflowStepItem[] = [
  {
    step: '01',
    shortLabel: 'Enroll',
    title: 'Authenticate and Enroll Nodes',
    body: 'Sign in with password or Google OAuth, protect your account with MFA and Safe Box passkeys, and register Windows, Linux, or macOS hosts into your isolated fleet.',
    meta: 'JWT · MFA · Safe Box Passkeys · Multi-OS Fleet',
    accentText: 'text-cyan-400',
    icon: Server,
  },
  {
    step: '02',
    shortLabel: 'Inspect',
    title: 'Inspect Network and Host Streams',
    body: 'Monitor 12 standard network protocols through the Network IDS sniffer while HIDS telemetry tracks process stacks, system services, and file integrity changes.',
    meta: '12 Protocols · Suricata · Zeek · FIM Telemetry',
    accentText: 'text-sky-400',
    icon: Activity,
  },
  {
    step: '03',
    shortLabel: 'Contain',
    title: 'Correlate and Contain Incidents',
    body: 'Trace correlated raw events across MITRE ATT&CK kill-chain stages, inspect source coordinates on the TopoJSON map, and approve IP, process, file, or host containment.',
    meta: 'MITRE ATT&CK · TopoJSON Map · Remote Quarantine',
    accentText: 'text-amber-400',
    icon: Flame,
  },
  {
    step: '04',
    shortLabel: 'Certify',
    title: 'Certify Analysts and Audit',
    body: 'Complete the 10-chapter EncDec Workbook, pass the randomized 10-minute CE-SOC exam (80% minimum), issue QR-verifiable certificates, and retain dual-database audit trails.',
    meta: '10 Chapters · 220+ Q Bank · Firestore + MSSQL Audit',
    accentText: 'text-emerald-400',
    icon: GraduationCap,
  },
];

function StageVisual3D({ activeIdx }: { activeIdx: number }) {
  return (
    <div
      className="encdec-dark-card relative rounded-2xl border border-cyan-400/25 bg-[#040c1b] overflow-hidden min-h-[290px] sm:min-h-[360px] flex flex-col justify-between p-5 sm:p-6 shadow-[0_24px_60px_-20px_rgba(2,6,23,0.9)]"
      style={{ perspective: '1100px' }}
    >
      {/* Subtle Blueprint Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(rgba(56,189,248,0.45) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between font-mono text-[11px] text-slate-400">
        <span className="text-cyan-300 font-semibold">
          Stage {WORKFLOW_STEPS[activeIdx].step} · {WORKFLOW_STEPS[activeIdx].shortLabel}
        </span>
        <span>3D Operational Model</span>
      </div>

      {/* Center Morphing 3D Isometric Assembly */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-4">
        <AnimatePresence mode="wait">
          {activeIdx === 0 && (
            <motion.div
              key="stage-0"
              initial={{ opacity: 0, rotateX: 28, rotateY: -20, scale: 0.92 }}
              animate={{ opacity: 1, rotateX: 14, rotateY: -12, scale: 1 }}
              exit={{ opacity: 0, rotateX: -14, scale: 0.92 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm space-y-3"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="mx-auto w-20 h-20 rounded-2xl border border-cyan-400/50 bg-[#081931] flex items-center justify-center shadow-[0_0_35px_rgba(34,211,238,0.28)]">
                <Lock className="w-8 h-8 text-cyan-300" />
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                {[
                  { host: 'Linux', ip: '10.24.0.14' },
                  { host: 'Windows', ip: '10.24.0.28' },
                  { host: 'macOS', ip: '10.24.1.9' },
                ].map((node) => (
                  <div
                    key={node.host}
                    className="rounded-xl border border-cyan-400/30 bg-[#09152b] p-2.5 text-center shadow-lg"
                  >
                    <Server className="w-4 h-4 text-cyan-400 mx-auto" />
                    <p className="mt-1.5 text-xs font-bold text-white">{node.host}</p>
                    <p className="font-mono text-[10px] text-slate-400">{node.ip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeIdx === 1 && (
            <motion.div
              key="stage-1"
              initial={{ opacity: 0, rotateX: 30, scale: 0.92 }}
              animate={{ opacity: 1, rotateX: 16, rotateY: 8, scale: 1 }}
              exit={{ opacity: 0, rotateX: -16, scale: 0.92 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center justify-center w-full max-w-sm"
            >
              {/* Concentric 3D Tilted DPI Inspection Rings */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/55 animate-spin"
                  style={{ animationDuration: '18s' }}
                />
                <div
                  className="absolute inset-4 rounded-full border border-sky-400/60 animate-spin"
                  style={{ animationDuration: '11s', animationDirection: 'reverse' }}
                />
                <div className="relative w-20 h-20 rounded-full border border-cyan-300/60 bg-[#07182f] flex flex-col items-center justify-center shadow-[0_0_32px_rgba(56,189,248,0.3)]">
                  <span className="font-mono text-lg font-bold text-cyan-300 tabular-nums">12</span>
                  <span className="font-mono text-[9px] uppercase text-slate-300">Protocols</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 font-mono text-[10px] text-sky-200">
                {['TCP', 'UDP', 'HTTP', 'DNS', 'SSH', 'SMB'].map((proto) => (
                  <span key={proto} className="px-2 py-0.5 rounded border border-sky-400/30 bg-[#09172d]">
                    {proto}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {activeIdx === 2 && (
            <motion.div
              key="stage-2"
              initial={{ opacity: 0, rotateY: -24, scale: 0.92 }}
              animate={{ opacity: 1, rotateX: 10, rotateY: -8, scale: 1 }}
              exit={{ opacity: 0, rotateY: 20, scale: 0.92 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm space-y-2.5"
            >
              {[
                { id: 'TA0001', label: 'Initial Access · T1190', action: 'block_ip' },
                { id: 'TA0002', label: 'Execution · T1059', action: 'kill_process' },
                { id: 'TA0005', label: 'Defense Evasion · T1070', action: 'quarantine_file' },
              ].map((tactic, i) => (
                <div
                  key={tactic.id}
                  style={{ transform: `translateX(${i * 8}px)` }}
                  className="rounded-xl border border-amber-400/35 bg-[#121626] px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-lg"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-amber-300">{tactic.id}</p>
                    <p className="text-xs font-semibold text-white truncate">{tactic.label}</p>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-300 border border-emerald-400/30 bg-[#081d1c] px-2 py-0.5 rounded shrink-0">
                    {tactic.action}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {activeIdx === 3 && (
            <motion.div
              key="stage-3"
              initial={{ opacity: 0, rotateX: 24, scale: 0.92 }}
              animate={{ opacity: 1, rotateX: 10, rotateY: 10, scale: 1 }}
              exit={{ opacity: 0, rotateX: -20, scale: 0.92 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm rounded-xl border border-emerald-400/45 bg-gradient-to-br from-[#071c26] via-[#09182e] to-[#081326] p-4 shadow-[0_0_40px_rgba(16,185,129,0.22)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-white">CE-SOC CREDENTIAL</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-300">QR VERIFIED</span>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="rounded-lg border border-white/10 bg-[#061120] p-2">
                  <p className="text-sm font-bold text-white tabular-nums">10</p>
                  <p className="text-[9px] text-slate-400">Chapters</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#061120] p-2">
                  <p className="text-sm font-bold text-cyan-300 tabular-nums">10m</p>
                  <p className="text-[9px] text-slate-400">Timed Exam</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#061120] p-2">
                  <p className="text-sm font-bold text-emerald-300 tabular-nums">80%</p>
                  <p className="text-[9px] text-slate-400">Pass Floor</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Metadata Bar */}
      <div className="relative z-10 pt-3 border-t border-white/10 font-mono text-[11px] text-slate-300 flex items-center justify-between gap-2">
        <span className="truncate">{WORKFLOW_STEPS[activeIdx].meta}</span>
        <span className="text-cyan-400 shrink-0 tabular-nums">{activeIdx + 1} / 4</span>
      </div>
    </div>
  );
}

export default function WorkflowStage3D() {
  const [activeIdx, setActiveIdx] = useState(0);
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Sync active stage smoothly as user scrolls through steps on desktop
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idxAttr = Number(entry.target.getAttribute('data-step-idx'));
            if (!Number.isNaN(idxAttr)) {
              setActiveIdx(idxAttr);
            }
          }
        }
      },
      { rootMargin: '-32% 0px -45% 0px', threshold: 0.1 }
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div id="workflow-stage-3d" className="space-y-6">
      {/* Mobile Compact Step Switcher (<lg) */}
      <div className="grid grid-cols-4 gap-1.5 lg:hidden">
        {WORKFLOW_STEPS.map((item, idx) => (
          <button
            key={item.step}
            type="button"
            onClick={() => setActiveIdx(idx)}
            aria-pressed={idx === activeIdx}
            className={`min-h-[44px] rounded-lg border px-2 py-2 font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
              idx === activeIdx
                ? 'border-cyan-400/50 bg-cyan-500/15 text-white'
                : 'border-white/10 bg-slate-900/50 text-slate-400'
            }`}
          >
            {item.step} · {item.shortLabel}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-start">
        {/* Left: 4 Interactive Workflow Steps (all visible on desktop, active detail highlighted) */}
        <div className="lg:col-span-6 space-y-3.5 min-w-0 order-2 lg:order-1">
          {WORKFLOW_STEPS.map((item, idx) => {
            const isActive = idx === activeIdx;
            const Icon = item.icon;
            return (
              <button
                key={item.step}
                ref={(el) => {
                  stepRefs.current[idx] = el;
                }}
                data-step-idx={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-pressed={isActive}
                className={`w-full text-left rounded-xl border p-5 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'border-cyan-400/45 bg-slate-900/80 shadow-[0_12px_32px_-12px_rgba(6,182,212,0.22)]'
                    : 'border-white/10 bg-slate-900/35 hover:border-white/20 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'border-cyan-400/40 bg-cyan-500/12'
                        : 'border-white/10 bg-slate-950/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.accentText}`} />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className={`font-semibold tabular-nums ${item.accentText}`}>
                        {item.step}.
                      </span>
                      <span className="text-slate-400 truncate">{item.meta}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Pinned Sticky 3D Morphing Visual Stage */}
        <div className="lg:col-span-6 min-w-0 order-1 lg:order-2 lg:sticky lg:top-24">
          <StageVisual3D activeIdx={activeIdx} />
        </div>
      </div>
    </div>
  );
}
