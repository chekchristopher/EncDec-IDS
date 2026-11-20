/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Radio, ShieldAlert, Database, Mail, Layers } from 'lucide-react';
import type { PublicHealthSnapshot } from './HeroConsolePreview3D.js';

interface ArchitectureLayerItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  details: string;
  accentHex: string;
  borderClass: string;
  textClass: string;
  specs: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const LAYERS: ArchitectureLayerItem[] = [
  {
    id: 'gateway',
    code: '01',
    title: 'Realtime Gateway & Telemetry Bus',
    summary: 'Express API · WebSocket Broadcast · RBAC',
    details:
      'Delivers authenticated REST endpoints, live WebSocket alert pushes, per-user host/alert isolation, and role-based access control across Analyst, Auditor, and Admin tiers.',
    accentHex: '#22d3ee',
    borderClass: 'border-cyan-400/50',
    textClass: 'text-cyan-300',
    specs: ['JWT + MFA + Safe Box Passkeys', 'Live WebSocket Alert Channel', 'Per-Operator Data Isolation'],
    icon: Radio,
  },
  {
    id: 'dpi',
    code: '02',
    title: 'Hybrid Sensor Fabric & DPI Engine',
    summary: 'Suricata · Zeek · HIDS Agents · Syslog',
    details:
      'Ingests structured telemetry via /api/ingest and evaluates inbound HTTP traffic against live Deep Packet Inspection signatures for SQLi, traversal, XSS, reconnaissance, and command injection.',
    accentHex: '#38bdf8',
    borderClass: 'border-sky-400/50',
    textClass: 'text-sky-300',
    specs: ['12 Inspected Network Protocols', 'Declarative MITRE Rule Engine', 'Remote File / PID / IP Quarantine'],
    icon: ShieldAlert,
  },
  {
    id: 'persistence',
    code: '03',
    title: 'Dual-Database Persistence',
    summary: 'Cloud Firestore + Microsoft SQL Server',
    details:
      'Combines Cloud Firestore synchronization with configurable Microsoft SQL Server (MSSQL) relational storage and read-only SELECT table inspection inside the Dual DB Console.',
    accentHex: '#10b981',
    borderClass: 'border-emerald-400/50',
    textClass: 'text-emerald-300',
    specs: ['Cloud Firestore Live Sync', 'MSSQL TDS Connector', 'Read-Only SQL Inspection Console'],
    icon: Database,
  },
  {
    id: 'workspace',
    code: '04',
    title: 'Google Workspace Security Dispatch',
    summary: 'Gmail OAuth · App Password · OTP Recovery',
    details:
      'Dispatches login security notices, incident escalation bulletins, AI-assisted incident drafts, and 6-digit Gmail OTP codes for self-service password resets.',
    accentHex: '#f59e0b',
    borderClass: 'border-amber-400/50',
    textClass: 'text-amber-300',
    specs: ['Verified Login Security Notices', '6-Digit Gmail OTP Reset Flow', 'Admin Sender Audit Logs'],
    icon: Mail,
  },
];

interface ArchitectureStack3DProps {
  health: PublicHealthSnapshot | null;
}

export default function ArchitectureStack3D({ health }: ArchitectureStack3DProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeLayer = LAYERS[activeIndex];
  const ActiveIcon = activeLayer.icon;

  return (
    <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center" id="architecture-stack-3d">
      {/* Left: Exploded 3D Isometric Stack (Desktop 3D plates + Mobile tactile layer selector) */}
      <div className="lg:col-span-6 min-w-0">
        {/* Desktop & Tablet True Isometric 3D Plate Visualizer */}
        <div className="encdec-dark-card hidden sm:flex relative h-[390px] rounded-2xl border border-white/10 bg-[#040b18] overflow-hidden items-center justify-center p-6">
          {/* Subtle grid backdrop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(56,189,248,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.14) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />

          {/* Vertical glowing telemetry bus spine connecting the 4 isometric layers */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-12 bottom-12 w-px -translate-x-1/2 bg-gradient-to-b from-cyan-400/70 via-emerald-400/55 to-amber-400/65"
          />

          {/* 3D Perspective Stage */}
          <div
            className="relative w-[290px] h-[290px]"
            style={{ perspective: '1100px' }}
          >
            {LAYERS.map((layer, idx) => {
              const isSelected = idx === activeIndex;
              const Icon = layer.icon;
              // Base vertical stack position (top layer 0 to bottom layer 3)
              const baseY = -88 + idx * 58;
              // Explode selected layer slightly upward & forward while gently spreading neighbors
              const offsetY = isSelected ? baseY - 12 : idx > activeIndex ? baseY + 12 : baseY - 2;
              const zIndex = LAYERS.length - idx + (isSelected ? 10 : 0);

              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  aria-pressed={isSelected}
                  style={{
                    zIndex,
                    transform: `translateY(${offsetY}px) rotateX(56deg) rotateZ(-36deg) ${
                      isSelected ? 'scale(1.05)' : 'scale(0.98)'
                    }`,
                    boxShadow: isSelected
                      ? `0 22px 45px -10px rgba(2, 6, 23, 0.92), 0 0 28px -4px ${layer.accentHex}55`
                      : '0 14px 28px -10px rgba(2, 6, 23, 0.85)',
                  }}
                  className={`absolute inset-x-4 top-1/2 -mt-[78px] h-[156px] rounded-xl border p-4 text-left transition-all duration-300 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    isSelected
                      ? `${layer.borderClass} bg-[#0b1830]/96`
                      : 'border-white/15 bg-[#071124]/82 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 shrink-0 ${layer.textClass}`} />
                      <span className="font-mono text-xs font-bold text-white">
                        L{layer.code}
                      </span>
                    </div>
                    <span
                      className="font-mono text-[10px] uppercase tracking-wider"
                      style={{ color: layer.accentHex }}
                    >
                      {isSelected ? 'Active' : 'Inspect'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-white leading-snug">
                    {layer.title}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400 truncate">
                    {layer.summary}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hover or click a layer to explode stack</span>
            </span>
            <span className="text-cyan-300">Layer {activeLayer.code} / 04</span>
          </div>
        </div>

        {/* Compact Mobile Layer Selector (<sm) */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {LAYERS.map((layer, idx) => {
            const isSelected = idx === activeIndex;
            const Icon = layer.icon;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-pressed={isSelected}
                className={`min-h-[56px] rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? `${layer.borderClass} bg-cyan-500/12 text-white`
                    : 'border-white/10 bg-slate-950/90 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${layer.textClass}`} />
                  <span className={layer.textClass}>{layer.code}.</span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-snug line-clamp-2">
                  {layer.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Synchronized Verified Layer Specification Card */}
      <div className="lg:col-span-6 min-w-0 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
                <ActiveIcon className="w-4 h-4 shrink-0" />
                <span>Layer {activeLayer.code} of 04</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {activeLayer.code}. {activeLayer.title}
              </h3>
            </div>
          </div>

          <p className="font-mono text-xs text-cyan-400 break-words">{activeLayer.summary}</p>
          <p className="text-sm text-slate-300 leading-relaxed">{activeLayer.details}</p>

          <div className="grid sm:grid-cols-3 gap-2.5 pt-4 border-t border-white/10">
            {activeLayer.specs.map((spec) => (
              <div
                key={spec}
                className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5 text-xs text-slate-200 font-medium"
              >
                {spec}
              </div>
            ))}
          </div>

          {/* Live Health Tie-In Bar */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-400">
            <span>
              Runtime Verification:{' '}
              <span className="text-emerald-400">
                {health?.status === 'ok' ? 'Express + WS Live' : 'Ready'}
              </span>
            </span>
            <span>
              Firestore: {health?.firestoreAvailable ? 'Connected' : 'Ready'} · MSSQL:{' '}
              {health?.mssqlConnected ? 'TDS Live' : 'Standby'}
            </span>
          </div>
        </div>

        {/* Desktop Quick Layer Index Buttons */}
        <div className="hidden sm:grid grid-cols-4 gap-2">
          {LAYERS.map((layer, idx) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`min-h-[42px] px-3 py-2 rounded-lg border text-left font-mono text-[11px] transition-colors cursor-pointer ${
                idx === activeIndex
                  ? 'border-cyan-400/50 bg-cyan-500/12 text-white'
                  : 'border-white/10 bg-slate-900/40 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-cyan-400 font-semibold">{layer.code}</span>{' '}
              <span className="truncate block text-[10px] mt-0.5">{layer.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
