/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  ArrowRight,
  Menu,
  X,
  Activity,
  Server,
  Globe,
  Database,
  Mail,
  GraduationCap,
  Flame,
  Lock,
  Check,
  Terminal,
  Play,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import EncDecLogo from './EncDecLogo.js';
import ThemeToggle from './ThemeToggle.jsx';
import HeroConsolePreview3D, { type PublicHealthSnapshot } from './landing/HeroConsolePreview3D.js';
import ProductShowcase3D, { type ShowcaseTabId } from './landing/ProductShowcase3D.js';
import CommercialVideoPlayer from './landing/CommercialVideoPlayer.js';

interface LandingPageProps {
  onEnterConsole: () => void;
}

const NAV_LINKS = [
  { label: 'Commercial', href: '#product-commercial' },
  { label: 'Platform', href: '#platform' },
  { label: 'Interactive Demo', href: '#interactive-demo' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Certification', href: '#certification' },
];

const OPERATOR_WORKFLOW = [
  {
    step: '01',
    title: 'Authenticate and Enroll Nodes',
    body: 'Sign in with password or Google OAuth, protect your account with MFA and Safe Box passkeys, and register Windows, Linux, or macOS hosts into your isolated fleet.',
  },
  {
    step: '02',
    title: 'Inspect Network and Host Streams',
    body: 'Monitor 12 standard network protocols through the Network IDS sniffer while HIDS telemetry tracks process stacks, system services, and file integrity changes.',
  },
  {
    step: '03',
    title: 'Correlate and Contain Incidents',
    body: 'Trace correlated raw events across MITRE ATT&CK kill-chain stages, inspect source coordinates on the TopoJSON map, and approve IP, process, file, or host containment.',
  },
  {
    step: '04',
    title: 'Certify Analysts and Audit',
    body: 'Complete the 10-chapter EncDec Workbook, pass the randomized 10-minute CE-SOC exam (80% minimum), issue QR-verifiable certificates, and retain dual-database audit trails.',
  },
];

const ARCHITECTURE_LAYERS = [
  {
    title: 'Realtime Gateway & Telemetry Bus',
    summary: 'Express API and WebSocket broadcast server',
    details:
      'Delivers authenticated REST endpoints, live WebSocket alert pushes, per-user host/alert isolation, and role-based access control across Analyst, Auditor, and Admin tiers.',
  },
  {
    title: 'Hybrid Sensor Fabric & DPI Engine',
    summary: 'Suricata · Zeek · HIDS Agents · Syslog',
    details:
      'Ingests structured telemetry via /api/ingest and evaluates inbound HTTP traffic against live Deep Packet Inspection signatures for SQLi, traversal, XSS, reconnaissance, and command injection.',
  },
  {
    title: 'Dual-Database Persistence',
    summary: 'Cloud Firestore + Microsoft SQL Server',
    details:
      'Combines Cloud Firestore synchronization with configurable Microsoft SQL Server (MSSQL) relational storage and read-only SELECT table inspection inside the Dual DB Console.',
  },
  {
    title: 'Google Workspace Security Dispatch',
    summary: 'Gmail OAuth · App Password · OTP Recovery',
    details:
      'Dispatches login security notices, incident escalation bulletins, AI-assisted incident drafts, and 6-digit Gmail OTP codes for self-service password resets.',
  },
];

export default function LandingPage({ onEnterConsole }: LandingPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [scrollFactor, setScrollFactor] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<ShowcaseTabId>('dpi');

  // Verified live public data from running EncDec IDS backend
  const [health, setHealth] = useState<PublicHealthSnapshot | null>(null);
  const [certStats, setCertStats] = useState<{ totalCertified: number; averageScore: number } | null>(null);

  useEffect(() => {
    let active = true;

    const loadPublicTelemetry = async () => {
      try {
        const [healthRes, certRes] = await Promise.all([
          fetch('/api/health').then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch('/api/certificates/stats').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (!active) return;

        if (healthRes) {
          setHealth({
            status: healthRes.status || 'ok',
            uptimeSeconds: Number(healthRes.uptimeSeconds || 0),
            firestoreAvailable: Boolean(healthRes.services?.firestore?.available),
            mssqlConnected: Boolean(healthRes.services?.mssql?.connected),
            mssqlStatus: String(healthRes.services?.mssql?.status || 'standby_local_mode'),
            wsClients: Number(healthRes.services?.websocket?.activeClients || 0),
            rssMb: healthRes.memory?.rssMb,
          });
        }

        if (certRes && typeof certRes.totalCertified === 'number') {
          setCertStats({
            totalCertified: certRes.totalCertified,
            averageScore: Number(certRes.averageScore || 0),
          });
        }
      } catch {
        // Leave graceful null state
      }
    };

    loadPublicTelemetry();
    const timer = window.setInterval(loadPublicTelemetry, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 24);
      const maxHeroScroll = Math.max(window.innerHeight, 600);
      setScrollFactor(Math.min(1, y / maxHeroScroll));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const jumpToShowcase = (tab: ShowcaseTabId) => {
    setActiveShowcaseTab(tab);
    setMobileMenuOpen(false);
    const el = document.getElementById('interactive-demo');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const scrollToCommercial = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('product-commercial');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const revealMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300 overflow-x-hidden"
      id="landing-page-root"
    >
      {/* ===================================================================== */}
      {/* A. THREE-ZONE TOP NAVIGATION BAR (Transparent -> Solid on Scroll)     */}
      {/* ===================================================================== */}
      <header
        id="landing-header"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-slate-950/92 backdrop-blur-md border-b border-white/10'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#hero-section"
            className="flex items-center gap-2.5 text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
          >
            <EncDecLogo size="sm" showGlow={false} />
            <span className="font-sans font-bold text-base tracking-tight">EncDec IDS</span>
          </a>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary landing navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-4 hover:underline decoration-cyan-400/70 focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Single Primary Conversion Action (+ mobile drawer toggle on <md) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onEnterConsole}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              id="header-console-btn"
            >
              Launch Console
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-white/10 px-4 py-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between px-3">
              <span className="text-xs text-slate-400">Appearance</span>
              <ThemeToggle variant="icon" />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* =================================================================== */}
        {/* B. CINEMATIC 3D HERO SECTION                                        */}
        {/* =================================================================== */}
        <section
          id="hero-section"
          className="relative pt-28 pb-16 lg:pt-32 lg:pb-24 border-b border-white/5"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              {/* Left Column: Value Proposition & Primary Actions */}
              <div className="lg:col-span-6 flex flex-col justify-center space-y-7">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
                  <span>Hybrid NIDS &amp; HIDS</span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span>TopoJSON Geodesic Telemetry</span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span>CE-SOC Certification</span>
                </div>

                <h1
                  className="font-bold text-white tracking-tight leading-[1.08]"
                  style={{
                    fontSize: 'clamp(2.25rem, 4.1vw, 3.75rem)',
                    textWrap: 'balance',
                  }}
                >
                  Unified Network &amp; Host Intrusion Detection for Modern SOC Teams
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                  EncDec IDS brings Deep Packet Inspection, multi-platform Host Integrity Monitoring, MITRE ATT&amp;CK incident hunting, dual-database auditing, and timed CE-SOC analyst certification into one operational command console.
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                  <button
                    type="button"
                    onClick={onEnterConsole}
                    className="px-6 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                    id="hero-launch-btn"
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Launch Operator Console</span>
                  </button>

                  <button
                    type="button"
                    onClick={scrollToCommercial}
                    className="px-6 py-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/15 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    id="hero-watch-commercial-btn"
                  >
                    <Play className="w-4 h-4 shrink-0 text-cyan-400 fill-cyan-400" />
                    <span>Watch Commercial</span>
                  </button>
                </div>

                {/* Quiet Verified Metadata Strip (Zero Pills, Tabular Numerals) */}
                <div className="pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <div>
                    <p className="text-xs text-slate-400">Inspected Protocols</p>
                    <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                      12 Core
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">TCP, UDP, HTTP, DNS, SSH, SMB</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Dual Persistence</p>
                    <p className="mt-1 font-mono text-xl font-semibold text-white">
                      Firestore + SQL
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {health?.firestoreAvailable ? 'Cloud sync active' : 'Local + cloud ready'}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-slate-400">CE-SOC Exam Bank</p>
                    <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                      220+ Questions
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {certStats ? `${certStats.totalCertified} certified in registry` : '10-min timed exam'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Three.js 3D Core + Perspective Console */}
              <div className="lg:col-span-6 flex items-stretch">
                <HeroConsolePreview3D
                  health={health}
                  totalCertified={certStats ? certStats.totalCertified : null}
                  scrollFactor={scrollFactor}
                  onExploreInteractive={() => jumpToShowcase('overview')}
                  onEnterConsole={onEnterConsole}
                />
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* B2. NARRATED PRODUCT COMMERCIAL VIDEO SECTION                       */}
        {/* =================================================================== */}
        <section
          id="product-commercial"
          className="py-18 lg:py-24 border-b border-white/5 bg-slate-900/30"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <motion.div
              {...revealMotion}
              className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
            >
              <div className="max-w-3xl space-y-3">
                <p className="text-xs font-mono text-cyan-400">Official Product Commercial</p>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  See how EncDec IDS defends networks, hosts, and analysts in 70 seconds
                </h2>
                <p className="text-base text-slate-400 leading-relaxed">
                  Press play for a narrated six-chapter commercial walkthrough covering live Deep Packet Inspection, isolated Host IDS fleets, MITRE ATT&amp;CK hunting, dual-database resilience, and CE-SOC certification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => jumpToShowcase('dpi')}
                className="self-start lg:self-auto inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer whitespace-nowrap"
              >
                <Terminal className="w-4 h-4" />
                <span>Jump to Live DPI Sandbox</span>
              </button>
            </motion.div>

            <CommercialVideoPlayer onEnterConsole={onEnterConsole} />
          </div>
        </section>

        {/* =================================================================== */}
        {/* C. PRODUCT INTRODUCTION & ASYMMETRIC CAPABILITIES BENTO             */}
        {/* =================================================================== */}
        <section id="platform" className="py-20 lg:py-28 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <motion.div {...revealMotion} className="max-w-3xl space-y-3">
              <p className="text-xs font-mono text-cyan-400">Built for Security Operations</p>
              <h2
                className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                One console from wire-level packet inspection to endpoint containment
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                Security teams often lose context switching between network sniffers, host agents, ticketing tools, and training platforms. EncDec IDS consolidates real-time telemetry, active containment, audit logs, and analyst certification inside a single web workspace.
              </p>
            </motion.div>

            {/* Asymmetric Bento Row 1 (7 / 5 split) */}
            <div className="grid lg:grid-cols-12 gap-6">
              <motion.article
                {...revealMotion}
                className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/50 p-7 sm:p-8 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <Activity className="w-4 h-4 shrink-0" />
                    <span>Network IDS &amp; Deep Packet Inspection</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Live protocol dissection with declarative MITRE rules
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Inspect TCP, UDP, ICMP, DNS, HTTP, HTTPS, ARP, DHCP, SMTP, FTP, SSH, and SMB frames in the live Network IDS sniffer. Author signature, behavioral, or anomaly rules tied directly to MITRE ATT&amp;CK technique identifiers and toggle enforcement in real time.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 pt-5 border-t border-white/10 text-xs">
                  <div>
                    <p className="font-semibold text-white">HTTP DPI Middleware</p>
                    <p className="text-slate-400 mt-1">Flags SQLi, XSS, path traversal, .env sweeps, and shell injection.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Rule Management</p>
                    <p className="text-slate-400 mt-1">Create, pause, resume, or remove rules with audit log attribution.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Sensor Ingestion</p>
                    <p className="text-slate-400 mt-1">Accepts Suricata, Zeek, HIDS agent, and Syslog telemetry streams.</p>
                  </div>
                </div>
              </motion.article>

              <motion.article
                {...revealMotion}
                className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/50 p-7 sm:p-8 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                    <Server className="w-4 h-4 shrink-0" />
                    <span>Host IDS &amp; Remote Quarantine</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Per-user isolated endpoint fleets
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Enroll Windows, Linux, and macOS hosts with strict operator ownership isolation. Inspect running processes, system services, file integrity events, and isolate hostile files, processes, or IP addresses.
                  </p>
                </div>

                <ul className="space-y-2.5 pt-5 border-t border-white/10 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>CPU, memory, disk, and service daemon telemetry</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Failed login tracking and flagged file change logs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Quarantine records persisted and broadcast over WebSockets</span>
                  </li>
                </ul>
              </motion.article>
            </div>

            {/* Asymmetric Bento Row 2 (5 / 7 split) */}
            <div className="grid lg:grid-cols-12 gap-6">
              <motion.article
                {...revealMotion}
                className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/50 p-7 sm:p-8 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                    <Flame className="w-4 h-4 shrink-0" />
                    <span>Incidents &amp; Geodesic Telemetry</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Kill-chain hunting &amp; D3 TopoJSON threat arcs
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Correlate raw events into multi-stage incidents, visualize inbound threat origins on an embedded offline-capable D3 TopoJSON world map, and launch tactical reconnaissance inspections.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => jumpToShowcase('incidents')}
                  className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <span>Inspect MITRE ATT&amp;CK workflow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.article>

              <motion.article
                {...revealMotion}
                className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/50 p-7 sm:p-8 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <Database className="w-4 h-4 shrink-0" />
                    <span>Dual Persistence &amp; Workspace Dispatch</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Cloud Firestore + MSSQL with verified Gmail operations
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Replicate operational state across Cloud Firestore and Microsoft SQL Server with read-only SQL inspection. Dispatch login alerts, incident bulletins, and 6-digit password reset OTPs directly through Google Workspace Gmail OAuth or App Password transport.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-white/10 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Authenticated Gmail Dispatch</p>
                      <p className="text-slate-400 mt-0.5">
                        Supports AI-drafted incident advisories, Admin OAuth sender management, and full email audit logs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Role-Scoped Audit Trail</p>
                      <p className="text-slate-400 mt-0.5">
                        Tracks logins, rule updates, quarantine actions, and administrative operations with CSV/JSON/PDF reports.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* D. INTERACTIVE 3D PRODUCT DEMONSTRATION                             */}
        {/* =================================================================== */}
        <section id="interactive-demo" className="py-20 lg:py-28 border-b border-white/5 bg-slate-900/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <motion.div {...revealMotion} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-mono text-cyan-400">Interactive Product Explorer</p>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Explore the EncDec IDS workspace and test live backend endpoints
                </h2>
                <p className="text-base text-slate-400 leading-relaxed">
                  Switch between core interface screens below. Tabs marked Live Backend execute real requests against this running server; UI Preview tabs illustrate authenticated views using representative data.
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterConsole}
                className="self-start lg:self-auto px-5 py-2.5 rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Open Full Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            <ProductShowcase3D
              activeTab={activeShowcaseTab}
              onTabChange={setActiveShowcaseTab}
              health={health}
              totalCertified={certStats ? certStats.totalCertified : null}
              averageScore={certStats ? certStats.averageScore : null}
              onEnterConsole={onEnterConsole}
            />
          </div>
        </section>

        {/* =================================================================== */}
        {/* E. HOW IT WORKS (4-STEP OPERATOR JOURNEY)                           */}
        {/* =================================================================== */}
        <section id="workflow" className="py-20 lg:py-28 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <motion.div {...revealMotion} className="max-w-2xl space-y-3">
              <p className="text-xs font-mono text-cyan-400">Operational Workflow</p>
              <h2
                className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                From enrollment to verified incident containment in four steps
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {OPERATOR_WORKFLOW.map((item) => (
                <motion.div
                  key={item.step}
                  {...revealMotion}
                  className="rounded-xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <span className="font-mono text-sm font-semibold text-cyan-400 tabular-nums">
                      {item.step}.
                    </span>
                    <h3 className="text-base font-bold text-white">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* F. VERIFIED TECHNICAL ARCHITECTURE                                  */}
        {/* =================================================================== */}
        <section id="architecture" className="py-20 lg:py-28 border-b border-white/5 bg-slate-900/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <motion.div {...revealMotion} className="max-w-3xl space-y-3">
              <p className="text-xs font-mono text-cyan-400">Verified System Architecture</p>
              <h2
                className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Transparent full-stack engineering without black-box claims
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                Every capability below maps directly to active server routes, persistence adapters, and React command modules inside EncDec IDS.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {ARCHITECTURE_LAYERS.map((layer, index) => (
                <motion.div
                  key={layer.title}
                  {...revealMotion}
                  className="rounded-xl border border-white/10 bg-slate-950/90 p-6 sm:p-7 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-white">
                      {String(index + 1).padStart(2, '0')}. {layer.title}
                    </h3>
                  </div>
                  <p className="font-mono text-xs text-cyan-400">{layer.summary}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{layer.details}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* G. CE-SOC CERTIFICATION & FINAL CALL TO ACTION                      */}
        {/* =================================================================== */}
        <section id="certification" className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...revealMotion}
              className="rounded-2xl border border-cyan-500/25 bg-slate-900/70 p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center"
            >
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>EncDec Academy · CE-SOC Program</span>
                </div>
                <h2
                  className="text-2xl sm:text-4xl font-bold text-white tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Ready to monitor your infrastructure and certify your analysts?
                </h2>
                <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
                  Enter the EncDec IDS Console to enroll your first host, inspect live traffic, and work through all 10 chapters of the EncDec Workbook toward a QR-verified Certified EncDec IDS SOC Specialist (CE-SOC) credential.
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
                <button
                  type="button"
                  onClick={onEnterConsole}
                  className="px-6 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  id="final-cta-console-btn"
                >
                  <span>Launch Operator Console</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => jumpToShowcase('certification')}
                  className="px-6 py-3.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-white/15 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Globe className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>Verify a Certificate ID</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ===================================================================== */}
      {/* H. QUIET FOOTER                                                       */}
      {/* ===================================================================== */}
      <footer className="border-t border-white/10 bg-slate-950" id="landing-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <EncDecLogo size="sm" />
            <div>
              <p className="text-sm font-bold text-white">EncDec IDS</p>
              <p className="text-xs text-slate-400">
                Hybrid Intrusion Detection System &amp; CE-SOC Platform
              </p>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={onEnterConsole}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer whitespace-nowrap"
            >
              Sign In
            </button>
          </nav>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <ThemeToggle variant="icon" />
            <span className="font-mono whitespace-nowrap">© {new Date().getFullYear()} EncDec IDS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
