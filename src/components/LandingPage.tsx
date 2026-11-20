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
import SpotlightCard from './landing/SpotlightCard.js';
import WorkflowStage3D from './landing/WorkflowStage3D.js';
import ArchitectureStack3D from './landing/ArchitectureStack3D.js';
import CertificateCard3D from './landing/CertificateCard3D.js';

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

export default function LandingPage({ onEnterConsole }: LandingPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [scrollFactor, setScrollFactor] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<ShowcaseTabId>('dpi');
  const [heroAccentMode, setHeroAccentMode] = useState<'nominal' | 'inspecting' | 'alert'>('nominal');
  const [heroPulseTrigger, setHeroPulseTrigger] = useState(0);

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

  // Lock background scroll and allow Escape dismissal when mobile drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

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

  // Use amount: 'some' so tall sections on mobile phones never stay stuck at opacity: 0
  const revealMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 'some' as const },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300 overflow-x-clip"
      id="landing-page-root"
    >
      {/* ===================================================================== */}
      {/* A. THREE-ZONE TOP NAVIGATION BAR (Transparent -> Solid on Scroll)     */}
      {/* ===================================================================== */}
      <header
        id="landing-header"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled || mobileMenuOpen
            ? 'bg-slate-950/95 backdrop-blur-md border-b border-white/10'
            : 'bg-slate-950/75 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none border-b border-white/5 sm:border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-6 lg:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#hero-section"
            className="flex items-center gap-2 sm:gap-2.5 text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 rounded min-h-[44px]"
          >
            <EncDecLogo size="sm" showGlow={false} />
            <span className="font-sans font-bold text-sm sm:text-base tracking-tight">
              EncDec IDS
            </span>
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
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onEnterConsole}
              className="min-h-[40px] sm:min-h-[38px] px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              id="header-console-btn"
            >
              Launch Console
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:text-white cursor-pointer shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Menu Drawer + Tap-Outside Backdrop */}
        {mobileMenuOpen && (
          <>
            <div
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 top-16 bg-black/55 backdrop-blur-[1px] z-40"
            />
            <nav
              aria-label="Mobile navigation"
              className="md:hidden relative z-50 bg-slate-950 border-b border-white/10 px-4 py-4 space-y-1 shadow-2xl max-h-[calc(100dvh-4rem)] overflow-y-auto"
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 active:bg-white/10"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between px-3 min-h-[44px]">
                <span className="text-xs text-slate-400">Appearance</span>
                <ThemeToggle variant="icon" />
              </div>
            </nav>
          </>
        )}
      </header>

      <main className="flex-1 min-w-0">
        {/* =================================================================== */}
        {/* B. CINEMATIC 3D HERO SECTION                                        */}
        {/* =================================================================== */}
        <section
          id="hero-section"
          className="scroll-mt-16 relative pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-24 border-b border-white/5"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-stretch">
              {/* Left Column: Value Proposition & Primary Actions */}
              <div className="lg:col-span-6 min-w-0 flex flex-col justify-center space-y-5 sm:space-y-7">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs font-mono text-cyan-400">
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
                    fontSize: 'clamp(1.85rem, 6.2vw, 3.75rem)',
                    textWrap: 'balance',
                  }}
                >
                  Unified Network &amp; Host Intrusion Detection for Modern SOC Teams
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                  EncDec IDS brings Deep Packet Inspection, multi-platform Host Integrity Monitoring, MITRE ATT&amp;CK incident hunting, dual-database auditing, and timed CE-SOC analyst certification into one operational command console.
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onEnterConsole}
                    className="min-h-[48px] sm:min-h-[44px] px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                    id="hero-launch-btn"
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Launch Operator Console</span>
                  </button>

                  <button
                    type="button"
                    onClick={scrollToCommercial}
                    className="min-h-[48px] sm:min-h-[44px] px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/15 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    id="hero-watch-commercial-btn"
                  >
                    <Play className="w-4 h-4 shrink-0 text-cyan-400 fill-cyan-400" />
                    <span>Watch Commercial</span>
                  </button>
                </div>

                {/* Quiet Verified Metadata Strip (Zero Pills, Tabular Numerals) */}
                <div className="pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Inspected Protocols</p>
                    <p className="mt-1 font-mono text-base sm:text-xl font-semibold text-white tabular-nums">
                      12 Core
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">TCP, UDP, HTTP, DNS, SSH, SMB</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Dual Persistence</p>
                    <p className="mt-1 font-mono text-base sm:text-xl font-semibold text-white">
                      Firestore + SQL
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {health?.firestoreAvailable ? 'Cloud sync active' : 'Local + cloud ready'}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 min-w-0">
                    <p className="text-xs text-slate-400">CE-SOC Exam Bank</p>
                    <p className="mt-1 font-mono text-base sm:text-xl font-semibold text-white tabular-nums">
                      220+ Questions
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {certStats ? `${certStats.totalCertified} certified in registry` : '10-min timed exam'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Three.js 3D Core + Reactive Bottom Command Dock */}
              <div className="lg:col-span-6 min-w-0 flex items-stretch">
                <HeroConsolePreview3D
                  health={health}
                  totalCertified={certStats ? certStats.totalCertified : null}
                  scrollFactor={scrollFactor}
                  externalAccentMode={heroAccentMode}
                  externalPulseTrigger={heroPulseTrigger}
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
          className="scroll-mt-16 py-14 sm:py-20 lg:py-24 border-b border-white/5 bg-slate-900/30"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
            <motion.div
              {...revealMotion}
              className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6"
            >
              <div className="max-w-3xl space-y-2.5 sm:space-y-3">
                <p className="text-xs font-mono text-cyan-400">Official Product Commercial</p>
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  See how EncDec IDS defends networks, hosts, and analysts in 70 seconds
                </h2>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  Press play for a narrated six-chapter commercial walkthrough covering live Deep Packet Inspection, isolated Host IDS fleets, MITRE ATT&amp;CK hunting, dual-database resilience, and CE-SOC certification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => jumpToShowcase('dpi')}
                className="self-start lg:self-auto min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer whitespace-nowrap py-2 sm:py-1"
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
        <section id="platform" className="scroll-mt-16 py-14 sm:py-20 lg:py-28 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
            <motion.div {...revealMotion} className="max-w-3xl space-y-3">
              <p className="text-xs font-mono text-cyan-400">Built for Security Operations</p>
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                One console from wire-level packet inspection to endpoint containment
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Security teams often lose context switching between network sniffers, host agents, ticketing tools, and training platforms. EncDec IDS consolidates real-time telemetry, active containment, audit logs, and analyst certification inside a single web workspace.
              </p>
            </motion.div>

            {/* Asymmetric Bento Row 1 (7 / 5 split) with Cursor-Tracked Specular Spotlight */}
            <div className="grid lg:grid-cols-12 gap-5 sm:gap-6">
              <motion.div {...revealMotion} className="lg:col-span-7 min-w-0">
                <SpotlightCard
                  spotlightColor="rgba(34, 211, 238, 0.17)"
                  className="h-full p-5 sm:p-7 lg:p-8"
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
                </SpotlightCard>
              </motion.div>

              <motion.div {...revealMotion} className="lg:col-span-5 min-w-0">
                <SpotlightCard
                  spotlightColor="rgba(56, 189, 248, 0.17)"
                  className="h-full p-5 sm:p-7 lg:p-8"
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
                </SpotlightCard>
              </motion.div>
            </div>

            {/* Asymmetric Bento Row 2 (5 / 7 split) */}
            <div className="grid lg:grid-cols-12 gap-5 sm:gap-6">
              <motion.div {...revealMotion} className="lg:col-span-5 min-w-0">
                <SpotlightCard
                  spotlightColor="rgba(245, 158, 11, 0.16)"
                  className="h-full p-5 sm:p-7 lg:p-8"
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
                </SpotlightCard>
              </motion.div>

              <motion.div {...revealMotion} className="lg:col-span-7 min-w-0">
                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.16)"
                  className="h-full p-5 sm:p-7 lg:p-8"
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
                </SpotlightCard>
              </motion.div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* D. INTERACTIVE 3D PRODUCT DEMONSTRATION                             */}
        {/* =================================================================== */}
        <section id="interactive-demo" className="scroll-mt-16 py-14 sm:py-20 lg:py-28 border-b border-white/5 bg-slate-900/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
            <motion.div {...revealMotion} className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-mono text-cyan-400">Interactive Product Explorer</p>
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Explore the EncDec IDS workspace and test live backend endpoints
                </h2>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  Switch between core interface screens below. Tabs marked Live Backend execute real requests against this running server; UI Preview tabs illustrate authenticated views using representative data.
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterConsole}
                className="self-start lg:self-auto min-h-[44px] px-5 py-2.5 rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
              onProbeActivity={(mode) => {
                setHeroAccentMode(mode);
                if (mode === 'alert' || mode === 'inspecting') {
                  setHeroPulseTrigger((p) => p + 1);
                }
              }}
            />
          </div>
        </section>

        {/* =================================================================== */}
        {/* E. HOW IT WORKS (SCROLL-DRIVEN 3D OPERATOR JOURNEY)                 */}
        {/* =================================================================== */}
        <section id="workflow" className="scroll-mt-16 py-14 sm:py-20 lg:py-28 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
            <motion.div {...revealMotion} className="max-w-2xl space-y-3">
              <p className="text-xs font-mono text-cyan-400">Operational Workflow</p>
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                From enrollment to verified incident containment in four steps
              </h2>
            </motion.div>

            <WorkflowStage3D />
          </div>
        </section>

        {/* =================================================================== */}
        {/* F. EXPLODED 3D ISOMETRIC ARCHITECTURE STACK                         */}
        {/* =================================================================== */}
        <section id="architecture" className="scroll-mt-16 py-14 sm:py-20 lg:py-28 border-b border-white/5 bg-slate-900/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
            <motion.div {...revealMotion} className="max-w-3xl space-y-3">
              <p className="text-xs font-mono text-cyan-400">Verified System Architecture</p>
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Transparent full-stack engineering without black-box claims
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Every layer in the interactive 3D stack below maps directly to active server routes, persistence adapters, and React command modules inside EncDec IDS.
              </p>
            </motion.div>

            <ArchitectureStack3D health={health} />
          </div>
        </section>

        {/* =================================================================== */}
        {/* G. HOLOGRAPHIC 3D CE-SOC CERTIFICATION & FINAL CALL TO ACTION       */}
        {/* =================================================================== */}
        <section id="certification" className="scroll-mt-16 py-14 sm:py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...revealMotion}
              className="rounded-2xl border border-cyan-500/25 bg-slate-900/70 p-6 sm:p-10 lg:p-12 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center"
            >
              <div className="lg:col-span-7 min-w-0 space-y-4 sm:space-y-5">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>EncDec Academy · CE-SOC Program</span>
                </div>
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Ready to monitor your infrastructure and certify your analysts?
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  Enter the EncDec IDS Console to enroll your first host, inspect live traffic, and work through all 10 chapters of the EncDec Workbook toward a QR-verified Certified EncDec IDS SOC Specialist (CE-SOC) credential.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onEnterConsole}
                    className="min-h-[48px] sm:min-h-[44px] px-5 sm:px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    id="final-cta-console-btn"
                  >
                    <span>Launch Operator Console</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToShowcase('certification')}
                    className="min-h-[48px] sm:min-h-[44px] px-5 sm:px-6 py-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-white/15 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Globe className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>Verify a Certificate ID</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 min-w-0">
                <CertificateCard3D
                  totalCertified={certStats ? certStats.totalCertified : null}
                  averageScore={certStats ? certStats.averageScore : null}
                  onVerifyClick={() => jumpToShowcase('certification')}
                />
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ===================================================================== */}
      {/* H. QUIET FOOTER                                                       */}
      {/* ===================================================================== */}
      <footer className="border-t border-white/10 bg-slate-950" id="landing-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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
            className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center min-h-[40px] hover:text-white transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={onEnterConsole}
              className="inline-flex items-center min-h-[40px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer whitespace-nowrap"
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
