/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Key, Mail, User, Eye, EyeOff, Radio, Lock, HelpCircle,
  Cpu, Layers, Globe, Activity, FileText, Settings, ChevronRight,
  ArrowRight, Play, CheckCircle, Check, BookOpen, Sparkles, 
  RefreshCw, AlertTriangle, TrendingUp, Server, Database, Hash, 
  Network, Eye as ViewIcon, ShieldAlert, AlertOctagon, Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EncDecLogo from './EncDecLogo.js';

interface LandingPageProps {
  onEnterConsole: () => void;
}

export default function LandingPage({ onEnterConsole }: LandingPageProps) {
  // Navigation active scroll state simulation
  const [activeTab, setActiveTab] = useState<'demo' | 'builder' | 'mitre' | 'specs'>('demo');
  
  // Custom interactive rule builder state
  const [ruleName, setRuleName] = useState('Detect Suspicious SQL Payload');
  const [ruleProtocol, setRuleProtocol] = useState<'TCP' | 'UDP' | 'ICMP'>('TCP');
  const [ruleSeverity, setRuleSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [ruleTarget, setRuleTarget] = useState('DMZ_WEB_SERVER');
  const [rulePort, setRulePort] = useState(443);
  const [rulePayload, setRulePayload] = useState('UNION SELECT');

  // FAQ open states
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Live Packet Stream simulation on the landing page
  const [simPackets, setSimPackets] = useState<any[]>([]);
  const [simAlerts, setSimAlerts] = useState<any[]>([]);
  const [simThreatScore, setSimThreatScore] = useState(12);
  const [isSimulatingAttack, setIsSimulatingAttack] = useState(false);
  const [simLogLines, setSimLogLines] = useState<string[]>([]);
  const [attackType, setAttackType] = useState<string | null>(null);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    }
  };

  // Generate continuous background packets for visual authenticity
  useEffect(() => {
    const protocols = ['TCP', 'UDP', 'ICMP', 'HTTPS', 'SSH'];
    const sources = ['192.168.1.104', '10.0.4.12', '172.16.85.90', '192.168.10.45', '10.0.1.201'];
    const destinations = ['192.168.1.1', '10.0.4.1', '172.16.85.1', '192.168.10.1', '10.0.1.1'];
    
    const interval = setInterval(() => {
      if (isSimulatingAttack) return; // Freeze standard generation during attack simulation
      
      const proto = protocols[Math.floor(Math.random() * protocols.length)];
      const src = sources[Math.floor(Math.random() * sources.length)];
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      const len = Math.floor(Math.random() * 1200) + 64;
      
      const newPacket = {
        id: 'pk_' + Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString(),
        protocol: proto,
        source: src,
        destination: dest,
        length: len,
        status: 'passed'
      };

      setSimPackets(prev => [newPacket, ...prev.slice(0, 5)]);
    }, 1500);

    // Seed initial list
    setSimPackets([
      { id: 'pk_1', time: '12:34:01', protocol: 'TCP', source: '192.168.1.104', destination: '10.0.4.1', length: 512, status: 'passed' },
      { id: 'pk_2', time: '12:34:02', protocol: 'HTTPS', source: '172.16.85.90', destination: '172.16.85.1', length: 1420, status: 'passed' },
      { id: 'pk_3', time: '12:34:03', protocol: 'SSH', source: '10.0.4.12', destination: '10.0.1.201', length: 96, status: 'passed' },
    ]);

    setSimAlerts([
      { id: 'al_1', timestamp: '10:14:45', severity: 'low', title: 'Port Scan Attempt', status: 'resolved' },
      { id: 'al_2', timestamp: '11:05:12', severity: 'medium', title: 'Unusual Agent Connection', status: 'handled' }
    ]);

    return () => clearInterval(interval);
  }, [isSimulatingAttack]);

  // Run complex attack vector simulator sequence
  const handleSimulateAttack = (type: 'sql' | 'ddos' | 'bruteforce' | 'miner') => {
    if (isSimulatingAttack) return;
    setIsSimulatingAttack(true);
    setAttackType(type);
    setSimThreatScore(94);
    setSimLogLines([]);

    const log = (line: string, delay: number) => {
      setTimeout(() => {
        setSimLogLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
      }, delay);
    };

    if (type === 'sql') {
      log('NIDS Core: Ingress HTTP packet stream captured from 198.51.100.42 on Port 443.', 200);
      log('NIDS Core: Deep Packet Inspection parsed query params content-type application/json.', 800);
      log('RULE_ENGINE: Matching pattern /UNION SELECT/ against active database routing configurations...', 1400);
      log('⚠️ MATCHED RULE ID: "rule_sql_injection" (Severity: CRITICAL)', 2000);
      log('🚨 ALERT TRIGGERED: SQL Injection Payload Detected in /api/v1/auth controller.', 2600);
      log('AUTOMATED RESPONDER: Invoking temporary sandbox egress isolation for origin 198.51.100.42.', 3200);
      log('✅ MITIGATION SUCCESSFUL: Connection dropped, incident recorded in crypto audit trail.', 3800);
      
      setTimeout(() => {
        const attackAlert = {
          id: 'al_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          severity: 'critical',
          title: 'SQL Injection: UNION SELECT Attack Blocked',
          status: 'mitigated'
        };
        setSimAlerts(prev => [attackAlert, ...prev]);
        setSimThreatScore(42);
        setIsSimulatingAttack(false);
      }, 4500);

    } else if (type === 'ddos') {
      log('NIDS Core: Network congestion peak anomaly detected on dmz-ingress-interface.', 200);
      log('NIDS Core: Packet rate exceeded baseline thresholds (250,000 p/s vs 4,200 p/s normal).', 800);
      log('ANALYZER: Multicast flood source list compiled from external gateway routers.', 1400);
      log('⚠️ MATCHED RULE ID: "rule_ddos_syn_flood" (Severity: HIGH)', 2000);
      log('🚨 ALERT TRIGGERED: TCP Syn-Flood DDoS Threat Campaign Active.', 2600);
      log('AUTOMATED RESPONDER: Shifting target DMZ behind Cloud Run proxy layer with token gating.', 3200);
      log('✅ MITIGATION SUCCESSFUL: Edge rate-limiting enforced. Ingestion normalized.', 3800);

      setTimeout(() => {
        const attackAlert = {
          id: 'al_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          severity: 'high',
          title: 'DDoS Attack: SYN-Flood Mitigated on Edge',
          status: 'mitigated'
        };
        setSimAlerts(prev => [attackAlert, ...prev]);
        setSimThreatScore(24);
        setIsSimulatingAttack(false);
      }, 4500);

    } else if (type === 'bruteforce') {
      log('HIDS Core: Agent "prod-auth-node-03" reported multiple credential failures in short window.', 200);
      log('HIDS Core: Host authentication syslog parsed 45 SSH failed attempts from 203.0.113.88.', 800);
      log('RULE_ENGINE: Match threshold "max_ssh_retries_5" exceeded.', 1400);
      log('⚠️ MATCHED RULE ID: "rule_ssh_bruteforce" (Severity: HIGH)', 2000);
      log('🚨 ALERT TRIGGERED: Brute-Force Password Spraying Detected targeting /var/log/secure.', 2600);
      log('AUTOMATED RESPONDER: Dispatching quarantine order targeting source SSH tunnel daemon.', 3200);
      log('✅ MITIGATION SUCCESSFUL: Host firewall rule added, target SSH session terminated.', 3800);

      setTimeout(() => {
        const attackAlert = {
          id: 'al_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          severity: 'high',
          title: 'Brute-Force Attack: SSH Port Blocked',
          status: 'mitigated'
        };
        setSimAlerts(prev => [attackAlert, ...prev]);
        setSimThreatScore(19);
        setIsSimulatingAttack(false);
      }, 4500);

    } else if (type === 'miner') {
      log('HIDS Core: Agent "gpu-compute-worker-08" reported extreme CPU spike on single process context.', 200);
      log('HIDS Core: Process binary hash "3f4c6e9..." parsed as active cryptojacking miner thread.', 800);
      log('ML_CLASSIFIER: Isolation Forest outlier score: 0.982 (Critical Anomaly).', 1400);
      log('⚠️ MATCHED RULE ID: "rule_cryptominer_hash" (Severity: CRITICAL)', 2000);
      log('🚨 ALERT TRIGGERED: Unauthorized XMRig Cryptomining Engine Execution.', 2600);
      log('AUTOMATED RESPONDER: Enforcing HIDS Host Quarantine. Isolation command transmitted to node.', 3200);
      log('✅ MITIGATION SUCCESSFUL: Executable hashed, process terminated, binary isolated to quarantine.', 3800);

      setTimeout(() => {
        const attackAlert = {
          id: 'al_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          severity: 'critical',
          title: 'Cryptojacking: Process "xmrig" Quarantined',
          status: 'mitigated'
        };
        setSimAlerts(prev => [attackAlert, ...prev]);
        setSimThreatScore(15);
        setIsSimulatingAttack(false);
      }, 4500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300 overflow-x-hidden" id="landing-page-root">
      
      {/* Background Decorators */}
      <div className="absolute top-0 inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{
            scale: [1, 1.15, 0.9, 1],
            x: [0, 40, -30, 0],
            y: [0, -30, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[-20%] left-[20%] w-[60%] h-[50%] bg-cyan-950/15 rounded-full blur-[150px]" 
        />
        <motion.div 
          animate={{
            scale: [1, 0.9, 1.1, 1],
            x: [0, -30, 45, 0],
            y: [0, 40, -20, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] bg-blue-950/15 rounded-full blur-[160px]" 
        />
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: 'linear-gradient(rgba(138, 235, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(138, 235, 255, 0.3) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Navigation Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5" 
        id="landing-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.08 }}
              className="flex items-center justify-center cursor-pointer"
            >
              <EncDecLogo size="sm" showGlow={true} />
            </motion.div>
            <div>
              <span className="font-sans font-bold text-lg text-white tracking-tight">EncDec IDS</span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-950 text-[10px] text-cyan-400 border border-cyan-500/20 font-mono">v4.0</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Core Engine</a>
            <a href="#interactive-sandbox" className="hover:text-white transition-colors">Threat Simulator</a>
            <a href="#rule-builder" className="hover:text-white transition-colors">Custom Rules</a>
            <a href="#mitre" className="hover:text-white transition-colors">MITRE ATT&CK</a>
            <a href="#specifications" className="hover:text-white transition-colors">Tech Specs</a>
            <a href="#faq" className="hover:text-white transition-colors">Compliance FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 15px rgba(34,211,238,0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnterConsole}
              className="px-4 py-2 text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded shadow-[0_0_15px_rgba(34,211,238,0.2)] flex items-center gap-1.5 cursor-pointer"
              id="header-console-btn"
            >
              <span>Access Operator Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center flex flex-col items-center" 
        id="hero-section"
      >
        {/* Subtitle Badge */}
        <motion.div 
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-xs text-cyan-400 font-mono mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Enterprise-ready Hybrid Intrusion Detection (HIDS/NIDS)</span>
        </motion.div>

        {/* Title */}
        <motion.h1 
          variants={itemVariants}
          className="max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-bold font-sans text-white tracking-tight leading-[1.1] mb-6"
        >
          Next-Generation Anomaly Detection & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Security Analytics Console</span>
        </motion.h1>

        {/* Body Description */}
        <motion.p 
          variants={itemVariants}
          className="max-w-2xl text-slate-400 text-base sm:text-lg mb-10 leading-relaxed"
        >
          Monitor incoming and outgoing packet streams via deep packet network analysis. Combine endpoint telemetry logs with automated quarantine isolation workflows and dynamic ML threat scoring.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 mb-16 justify-center w-full max-w-sm sm:max-w-none"
        >
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(34,211,238,0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={onEnterConsole}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="hero-launch-btn"
          >
            <Shield className="w-4 h-4" />
            <span>Launch Operator Console</span>
          </motion.button>
          <motion.a
            whileHover={{ scale: 1.02, borderColor: "rgba(34,211,238,0.3)", color: "#fff" }}
            whileTap={{ scale: 0.98 }}
            href="#interactive-sandbox"
            className="px-8 py-4 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-white/10 rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:border-cyan-500/30 transition-all flex items-center justify-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            <span>Try Threat Sandbox</span>
          </motion.a>
        </motion.div>

        {/* Key System Statistics Counters */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-5xl text-left" 
          id="hero-metrics-deck"
        >
          {[
            { label: 'Packet Ingestion', val: '1.2M', extra: '/sec', desc: 'Sustained deep payload inspection' },
            { label: 'Detection Centroid', val: '99.98%', desc: 'Isolation Forest precision rating' },
            { label: 'Incident Containment', val: '< 400ms', desc: 'From detection to agent quarantine' },
            { label: 'Sync Replication', val: 'Realtime', desc: 'Continuous Firestore synchronization' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              whileHover={{ 
                y: -5, 
                borderColor: 'rgba(34, 211, 238, 0.3)',
                boxShadow: '0 10px 30px -10px rgba(34, 211, 238, 0.15)'
              }}
              className="bg-slate-900/60 border border-white/5 rounded-xl p-5 backdrop-blur-sm transition-all"
            >
              <p className="font-mono text-xs text-slate-500 uppercase">{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                {stat.val} {stat.extra && <span className="text-xs text-cyan-400">{stat.extra}</span>}
              </p>
              <p className="text-xs text-slate-500 mt-1">{stat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Feature Split Cards Engine */}
      <section className="bg-slate-900/40 border-y border-white/5 py-24 relative" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Hybrid Architecture</h2>
            <p className="text-3xl sm:text-4xl font-bold text-white mt-2">Engineered for absolute threat visibility</p>
            <p className="text-slate-400 mt-4">
              EncDec IDS leverages both server-side network deep packet capture (NIDS) and remote host system agent daemon endpoints (HIDS) to give you an uncompromised defensive perimeter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" id="capabilities-grid">
            {/* HIDS */}
            <motion.div 
              whileHover={{ 
                y: -5,
                borderColor: 'rgba(34, 211, 238, 0.3)',
                boxShadow: '0 10px 30px -10px rgba(34, 211, 238, 0.15)'
              }}
              className="bg-slate-950 border border-white/5 p-6 rounded-xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-6">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Host Intrusion Detection (HIDS)</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Deploy lightweight, platform-native agent daemons on your cloud nodes. Track system resources (CPU, Memory, Disk), scan file structures, hash process stacks, and detect local configuration deviations.
              </p>
              <ul className="text-xs font-mono text-slate-500 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Multi-Platform Windows/Linux agent</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Crypto binary integrity checks</li>
              </ul>
            </motion.div>

            {/* NIDS */}
            <motion.div 
              whileHover={{ 
                y: -5,
                borderColor: 'rgba(59, 130, 246, 0.3)',
                boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.15)'
              }}
              className="bg-slate-950 border border-white/5 p-6 rounded-xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-6">
                <Network className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Network Deep Packet Inspection</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Inject network inspection cards that capture live TCP/UDP/ICMP egress and ingress streams. Perform signature-based stateful evaluation of query parameters, payload arguments, and header flags.
              </p>
              <ul className="text-xs font-mono text-slate-500 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Stateful packet capture pipelines</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Layer 4/Layer 7 payload analysis</li>
              </ul>
            </motion.div>

            {/* ML */}
            <motion.div 
              whileHover={{ 
                y: -5,
                borderColor: 'rgba(99, 102, 241, 0.3)',
                boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.15)'
              }}
              className="bg-slate-950 border border-white/5 p-6 rounded-xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-6">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Machine Learning Outlier Engine</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Go beyond strict signature matches. Our unsupervised ML classifier parses log streams and flags anomalous operations using calculated Isolation Forest centroids with simulated dynamic weight recalculation.
              </p>
              <ul className="text-xs font-mono text-slate-500 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Centroid drift model training</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Automated hyper-parameter scaling</li>
              </ul>
            </motion.div>

            {/* Quarantine */}
            <motion.div 
              whileHover={{ 
                y: -5,
                borderColor: 'rgba(239, 68, 68, 0.3)',
                boxShadow: '0 10px 30px -10px rgba(239, 68, 68, 0.15)'
              }}
              className="bg-slate-950 border border-white/5 p-6 rounded-xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Automated Remote Quarantine</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Stop threats instantly. EncDec IDS can automatically lock host endpoints, terminate malicious process IDs (PIDs), restrict source IP packets, and isolate dangerous executable binary structures.
              </p>
              <ul className="text-xs font-mono text-slate-500 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> One-click containment via HIDS</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Secure quarantine binary storage</li>
              </ul>
            </motion.div>

            {/* MITRE Mapping */}
            <motion.div 
              whileHover={{ 
                y: -5,
                borderColor: 'rgba(245, 158, 11, 0.3)',
                boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.15)'
              }}
              className="bg-slate-950 border border-white/5 p-6 rounded-xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-6">
                <Layers className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">MITRE ATT&CK Matrix Gating</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Every detected alarm, system alert, and custom rule is automatically mapped to verified industry tactics. Understand the exact attack lifecycle stage—from reconnaissance to execution.
              </p>
              <ul className="text-xs font-mono text-slate-500 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Visual intelligence matrix boards</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Cross-correlation log trace-backs</li>
              </ul>
            </motion.div>

            {/* Crypto Audit Logs */}
            <motion.div 
              whileHover={{ 
                y: -5,
                borderColor: 'rgba(16, 185, 129, 0.3)',
                boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.15)'
              }}
              className="bg-slate-950 border border-white/5 p-6 rounded-xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-6">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cryptographic Compliance Trail</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Satisfy high-compliance criteria (SOC2, HIPAA, ISO 27001). Every operator login, configuration adjustment, rule deletion, or quarantine enforcement generates a cryptographically hashed log.
              </p>
              <ul className="text-xs font-mono text-slate-500 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Cryptographic secure audit logger</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Non-repudiation administrative logs</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Experience Deck: Simulated Security Sandbox */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="interactive-sandbox">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-2.5 py-1 rounded bg-cyan-950/40 text-[10px] text-cyan-400 font-mono border border-cyan-500/10 uppercase">Security Simulator</span>
          <h2 className="text-3xl font-bold text-white mt-3">Interactive Threat Sandbox</h2>
          <p className="text-slate-400 mt-2">
            Experience our intrusion detection and mitigation responder loop in real time. Select a security threat vector to witness the simulated automated containment protocol.
          </p>
        </div>

        {/* Dashboard Simulation Container */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch" id="sim-sandbox-dashboard">
          
          {/* Simulation Controllers (3 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-6 bg-slate-900/40 border border-white/5 p-6 rounded-xl backdrop-blur-sm">
            <div className="space-y-4">
              <p className="font-mono text-xs font-bold text-slate-400 border-b border-white/5 pb-2">CHOOSE ATTACK VECTOR</p>
              
              {[
                { type: 'sql', title: '1. SQL INJECTION', desc: 'Exploit DMV database variables' },
                { type: 'ddos', title: '2. DDoS SYN-FLOOD', desc: 'Overwhelm ingress proxy sockets' },
                { type: 'bruteforce', title: '3. SSH BRUTE FORCE', desc: 'Crack secure operator keys' },
                { type: 'miner', title: '4. PROCESS CRYPTOJACKING', desc: 'Detect malicious CPU/GPU spikes' }
              ].map((item) => (
                <motion.button
                  key={item.type}
                  disabled={isSimulatingAttack}
                  whileHover={{ x: isSimulatingAttack ? 0 : 4, scale: isSimulatingAttack ? 1 : 1.01 }}
                  whileTap={{ scale: isSimulatingAttack ? 1 : 0.99 }}
                  onClick={() => handleSimulateAttack(item.type as any)}
                  className={`w-full p-3.5 rounded text-left border flex items-center justify-between transition-all cursor-pointer ${
                    attackType === item.type && isSimulatingAttack
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                      : 'bg-slate-950/80 border-white/5 hover:border-cyan-500/20 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold font-mono">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${attackType === item.type && isSimulatingAttack ? 'translate-x-1 text-cyan-400' : 'text-slate-500'}`} />
                </motion.button>
              ))}
            </div>

            <div className="p-4 rounded bg-slate-950 border border-white/5 text-xs text-slate-400 font-mono space-y-1">
              <span className="text-cyan-400 font-bold block mb-1">🎮 SIMULATOR CONTROL</span>
              <p>Standard background logs continue until an attack is initiated. When triggered, deep packet matching parses the threat and isolates origin sockets.</p>
            </div>
          </div>

          {/* Simulated Active Panel (8 cols) */}
          <motion.div 
            animate={isSimulatingAttack ? {
              borderColor: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.2)'],
              boxShadow: [
                '0 10px 25px -5px rgba(0,0,0,0.3)',
                '0 10px 30px 2px rgba(239, 68, 68, 0.15)',
                '0 10px 25px -5px rgba(0,0,0,0.3)'
              ]
            } : {
              borderColor: 'rgba(255, 255, 255, 0.05)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
            }}
            transition={{ duration: 1.5, repeat: isSimulatingAttack ? Infinity : 0, ease: "easeInOut" }}
            className="lg:col-span-8 flex flex-col bg-slate-900/60 border rounded-xl overflow-hidden backdrop-blur-sm shadow-xl relative"
          >
            
            {/* Mock Header */}
            <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${isSimulatingAttack ? 'animate-ping' : 'animate-pulse'}`} />
                <span className="font-mono text-xs text-slate-400 font-bold tracking-tight">VIGIL SANDBOX THREAT DASHBOARD</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                <span>SIMULATED FEED</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${isSimulatingAttack ? 'bg-red-950 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-300'}`}>
                  {isSimulatingAttack ? 'UNDER_ATTACK' : 'ONLINE_STATE'}
                </span>
              </div>
            </div>

            {/* Mock Dashboard Body */}
            <div className="p-4 sm:p-6 grid sm:grid-cols-12 gap-6 flex-1">
              
              {/* Left Column: Metrics overview */}
              <div className="sm:col-span-5 space-y-4">
                <motion.div 
                  animate={simThreatScore > 70 ? {
                    borderColor: ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.7)', 'rgba(239,68,68,0.2)'],
                    scale: [1, 1.02, 1]
                  } : {}}
                  transition={{ duration: 1, repeat: simThreatScore > 70 ? Infinity : 0 }}
                  className="bg-slate-950 p-4 rounded border border-white/5 transition-colors"
                >
                  <p className="font-mono text-[10px] text-slate-500 uppercase">SYS_THREAT_INDEX</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-4xl font-bold font-mono transition-colors ${simThreatScore > 70 ? 'text-red-500' : simThreatScore > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {simThreatScore}
                    </span>
                    <span className="text-slate-600 font-mono text-sm">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded mt-2.5 overflow-hidden">
                    <motion.div 
                      className={`h-full ${simThreatScore > 70 ? 'bg-red-500' : simThreatScore > 25 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                      initial={{ width: "12%" }}
                      animate={{ width: `${simThreatScore}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    />
                  </div>
                </motion.div>

                <div className="bg-slate-950 p-4 rounded border border-white/5">
                  <p className="font-mono text-[10px] text-slate-500 uppercase">CONTAINMENT FEEDBACK</p>
                  <div className="mt-2 space-y-2 max-h-[160px] overflow-y-auto" id="sandbox-alert-list">
                    <AnimatePresence initial={false}>
                      {simAlerts.map((al) => (
                        <motion.div 
                          key={al.id} 
                          initial={{ opacity: 0, x: -10, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: "auto" }}
                          exit={{ opacity: 0, x: 10, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex justify-between items-center bg-slate-900/60 p-2 rounded text-[10px] border border-white/5 font-mono overflow-hidden"
                        >
                          <span className="truncate max-w-[120px] text-white font-bold">{al.title}</span>
                          <span className={`px-1 rounded text-[8px] uppercase font-bold ${
                            al.severity === 'critical' 
                              ? 'bg-red-950 text-red-400 border border-red-500/20' 
                              : al.severity === 'high' 
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/20' 
                                : 'bg-slate-800 text-slate-400'
                          }`}>
                            {al.severity}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Right Column: Simulated Terminal Log */}
              <div className="sm:col-span-7 bg-slate-950 rounded border border-white/5 flex flex-col overflow-hidden min-h-[250px] relative">
                
                {/* Visual Scanner Overlay */}
                <motion.div 
                  animate={{ y: [0, 260, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none z-10 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  style={{ top: 0 }}
                />

                <div className="h-8 border-b border-white/5 bg-slate-900/40 px-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>LOG STREAM TERMINAL</span>
                  <Terminal className={`w-3.5 h-3.5 ${isSimulatingAttack ? 'text-red-400 animate-pulse' : 'text-cyan-400/80'}`} />
                </div>
                <div className="p-3 font-mono text-[10px] text-slate-400 space-y-2 flex-1 overflow-y-auto max-h-[280px]">
                  {isSimulatingAttack ? (
                    simLogLines.map((line, idx) => (
                      <motion.p 
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx} 
                        className={`leading-relaxed ${line.includes('🚨') || line.includes('⚠️') ? 'text-red-400 font-bold' : line.includes('✅') ? 'text-emerald-400 font-bold' : 'text-cyan-400'}`}
                      >
                        {line}
                      </motion.p>
                    ))
                  ) : (
                    <>
                      <p className="text-slate-600">// Standing by... background network logs running.</p>
                      {simPackets.map((p) => (
                        <p key={p.id} className="text-slate-400">
                          [{p.time}] <span className="text-slate-500">INGRESS:</span> {p.source} → {p.destination} | <span className="text-cyan-400 font-bold">{p.protocol}</span> | <span className="text-slate-500">len:</span> {p.length}B
                        </p>
                      ))}
                    </>
                  )}
                </div>
              </div>

            </div>

          </motion.div>
        </div>
      </section>

      {/* Interactive IDS Custom Rule Builder Section */}
      <section className="bg-slate-900/20 border-y border-white/5 py-24" id="rule-builder">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-2.5 py-1 rounded bg-indigo-950/40 text-[10px] text-indigo-400 font-mono border border-indigo-500/10 uppercase">Signature Syntax</span>
            <h2 className="text-3xl font-bold text-white mt-3">IDS Rule Builder Playground</h2>
            <p className="text-slate-400 mt-2">
              Generate declarative signatures for the EncDec engine. Toggle the options below to witness real-time compiler syntax mapping suitable for YAML injection.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start" id="rule-playground-container">
            {/* Parameters column (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/60 border border-white/5 p-6 rounded-xl space-y-5">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider">Rule Identification Label</label>
                <input 
                  type="text" 
                  value={ruleName} 
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>

              {/* Protocol */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider">Target Network Protocol</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TCP', 'UDP', 'ICMP'] as const).map((proto) => (
                    <motion.button
                      key={proto}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setRuleProtocol(proto)}
                      className={`py-2 rounded font-mono text-xs font-bold border transition-colors cursor-pointer ${
                        ruleProtocol === proto 
                          ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                          : 'bg-slate-950 text-slate-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {proto}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider">Detection Action Severity</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                    <motion.button
                      key={sev}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setRuleSeverity(sev)}
                      className={`py-2 rounded font-mono text-[10px] font-bold border transition-all uppercase cursor-pointer ${
                        ruleSeverity === sev 
                          ? sev === 'critical' ? 'bg-red-500 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : sev === 'high' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-950 text-slate-400 border-white/5'
                      }`}
                    >
                      {sev}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Target segment */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider">Network Gateway Segment</label>
                <select 
                  value={ruleTarget} 
                  onChange={(e) => setRuleTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                >
                  <option value="DMZ_WEB_SERVER">DMZ Web Server Ingress</option>
                  <option value="PROD_DB_CLUSTER">Production DB Cluster</option>
                  <option value="INTERNAL_API_CORE">Internal Core API Gateway</option>
                  <option value="ENDPOINT_ALL_AGENTS">All Monitored Host Agents</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Port */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider">Service Port</label>
                  <input 
                    type="number" 
                    value={rulePort} 
                    onChange={(e) => setRulePort(parseInt(e.target.value) || 80)}
                    className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>

                {/* Payload Match */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider">Payload Content Regex</label>
                  <input 
                    type="text" 
                    value={rulePayload} 
                    onChange={(e) => setRulePayload(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
              </div>

            </div>

            {/* Generated Code Column (7 cols) */}
            <div className="lg:col-span-7 bg-slate-950 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <div className="h-10 border-b border-white/5 bg-slate-900/40 px-4 flex items-center justify-between font-mono text-xs text-slate-500">
                <span>COMPILED SIGNATURE SCHEMA (YAML)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">VALID_SYNTAX</span>
              </div>
              <div className="p-6 font-mono text-xs text-cyan-400 space-y-1 leading-relaxed overflow-x-auto">
                <p><span className="text-slate-600"># Generated automatically by EncDec Rule Engine v4.0.1</span></p>
                <p><span className="text-slate-500">signature:</span></p>
                <p>  <span className="text-slate-500">id:</span> <span className="text-white">"rule_{ruleName.toLowerCase().replace(/[^a-z0-9]/g, '_')}"</span></p>
                <p>  <span className="text-slate-500">name:</span> <span className="text-white">"{ruleName}"</span></p>
                <p>  <span className="text-slate-500">metadata:</span></p>
                <p>    <span className="text-slate-500">severity:</span> <span className="text-red-400 font-bold">"{ruleSeverity}"</span></p>
                <p>    <span className="text-slate-500">mitre_mapping:</span> <span className="text-indigo-300">"T1190 - Exploit Public-Facing Application"</span></p>
                <p>    <span className="text-slate-500">created_by:</span> <span className="text-white">"system_operator_panel"</span></p>
                <p>  <span className="text-slate-500">network_rule:</span></p>
                <p>    <span className="text-slate-500">protocol:</span> <span className="text-white">"{ruleProtocol}"</span></p>
                <p>    <span className="text-slate-500">target_scope:</span> <span className="text-white">"{ruleTarget}"</span></p>
                <p>    <span className="text-slate-500">destination_port:</span> <span className="text-amber-300">{rulePort}</span></p>
                <p>  <span className="text-slate-500">payload_constraints:</span></p>
                <p>    <span className="text-slate-500">matching_regex:</span> <span className="text-emerald-300">"/{rulePayload}/gi"</span></p>
                <p>    <span className="text-slate-500">action:</span> <span className="text-red-400 font-bold">"TRIGGER_ALERT_AND_DROP"</span></p>
              </div>
              <div className="p-4 bg-slate-900/40 border-t border-white/5 flex justify-between items-center text-xs font-mono text-slate-500">
                <span>Deployable instantly via server YAML interface</span>
                <button 
                  onClick={onEnterConsole}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors"
                >
                  Log in to Deploy Rule
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* MITRE ATT&CK Matrix Grid Alignment */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="mitre">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-2.5 py-1 rounded bg-amber-950/40 text-[10px] text-amber-400 font-mono border border-amber-500/10 uppercase">Global Alignment</span>
          <h2 className="text-3xl font-bold text-white mt-3">MITRE ATT&CK® Matrix Defense</h2>
          <p className="text-slate-400 mt-2">
            Our detection modules align directly with the global cybersecurity taxonomy, ensuring precise categorization of threat stages.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" id="mitre-bento-box">
          
          <motion.div 
            whileHover={{ 
              y: -5,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.15)'
            }}
            className="bg-slate-900/50 border border-white/5 rounded-xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-amber-500/20">TA0001</span>
              <span className="font-bold text-white text-sm">Initial Access</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Block ingress intrusion vectors. Deep packet analysis guards publicly-exposed endpoints against SQL injections, brute-force exploits, and directory traversals.
            </p>
            <div className="font-mono text-[10px] text-slate-500 space-y-1 border-t border-white/5 pt-3">
              <p>📍 T1190 - Exploit Public-Facing App</p>
              <p>📍 T1133 - External Remote Services</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ 
              y: -5,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.15)'
            }}
            className="bg-slate-900/50 border border-white/5 rounded-xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-amber-500/20">TA0002</span>
              <span className="font-bold text-white text-sm">Execution</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Mitigate malware binary execution on local computing clusters. File integrity hashing monitors changes to running binaries on HIDS endpoints.
            </p>
            <div className="font-mono text-[10px] text-slate-500 space-y-1 border-t border-white/5 pt-3">
              <p>📍 T1059 - Command and Scripting Interpreter</p>
              <p>📍 T1204 - User Execution</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ 
              y: -5,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.15)'
            }}
            className="bg-slate-900/50 border border-white/5 rounded-xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-amber-500/20">TA0005</span>
              <span className="font-bold text-white text-sm">Defense Evasion</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Recognize actions intended to hide intrusions. The anomaly engine catches log modification attempts, unauthorized daemon terminations, or altered syslogs.
            </p>
            <div className="font-mono text-[10px] text-slate-500 space-y-1 border-t border-white/5 pt-3">
              <p>📍 T1070 - Indicator Removal on Host</p>
              <p>📍 T1562 - Impair Defenses</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ 
              y: -5,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.15)'
            }}
            className="bg-slate-900/50 border border-white/5 rounded-xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-amber-500/20">TA0010</span>
              <span className="font-bold text-white text-sm">Exfiltration</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Detect exfiltration spikes instantly. Network traffic payload measurements flag suspicious outbound TCP socket bursts and multi-part data dumps.
            </p>
            <div className="font-mono text-[10px] text-slate-500 space-y-1 border-t border-white/5 pt-3">
              <p>📍 T1048 - Exfiltration Over Alternative Protocol</p>
              <p>📍 T1041 - Exfiltration Over C2 Channel</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Technical Specifications Architecture */}
      <section className="bg-slate-900/40 border-y border-white/5 py-24" id="specifications">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center" id="architecture-layout">
            
            <div className="space-y-6">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">System Protocol Integration</span>
              <h2 className="text-3xl font-bold text-white">High-Performance Agent-Server Ecosystem</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                EncDec IDS is designed for maximum throughput. Monitored endpoints stream metrics to the master server via asynchronous secure sockets, while administrators supervise the cluster using the real-time Vigil Console.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
                    <Database className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Dynamic Firebase Sync Layer</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Full persistent state replication. Rules, monitored hosts, threat scores, and alarms synchronize automatically with Cloud Firestore, maintaining multi-operator console coherence without manual reloads.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <Server className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Micro-Agent gRPC Protocol</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Extremely low overhead. Agents require less than 12MB of RAM on endpoints, reporting process integrity benchmarks back to the server using cryptographically signed JSON payloads.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                    <Radio className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Realtime WebSocket Gateway</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Intrusion packets trigger live notification events pushed to client browsers within 30ms, featuring sound queues, threat banner popups, and automated mitigation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture code block */}
            <div className="bg-slate-950 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <div className="h-10 border-b border-white/5 bg-slate-900/40 px-4 flex items-center justify-between font-mono text-xs text-slate-500">
                <span>ENDPOINT AGENT REGISTRATION CLI</span>
                <span className="text-slate-500 hover:text-white cursor-pointer">bash</span>
              </div>
              <div className="p-6 font-mono text-[11px] text-cyan-400 space-y-1.5 leading-relaxed overflow-x-auto">
                <p><span className="text-slate-600"># 1. Download official client agent daemon script</span></p>
                <p><span className="text-white">curl -sSL https://encdec-ids.net/download/agent.sh -o register_agent.sh</span></p>
                <p className="pt-2"><span className="text-slate-600"># 2. Make executable</span></p>
                <p><span className="text-white">chmod +x register_agent.sh</span></p>
                <p className="pt-2"><span className="text-slate-600"># 3. Securely register endpoint with cluster server API key</span></p>
                <p><span className="text-white">./register_agent.sh \</span></p>
                <p>  --server <span className="text-emerald-300">"https://coou-portal.infra.sec"</span> \</p>
                <p>  --api-key <span className="text-emerald-300">"encdec_api_8fa0fd91ae3bc27"</span> \</p>
                <p>  --node-name <span className="text-emerald-300">"prod-node-web-01"</span> \</p>
                <p>  --monitor-paths <span className="text-emerald-300">"/var/log,/etc/nginx,/var/www"</span></p>
                <p className="pt-4"><span className="text-slate-600"># Output:</span></p>
                <p className="text-emerald-400 font-bold">[+] Cryptographic handshake successful with master controller.</p>
                <p className="text-emerald-400 font-bold">[+] Host ID generated: host_prod_node_web_01_a9e8</p>
                <p className="text-emerald-400 font-bold flex items-center gap-1">
                  [+] Monitoring active. Streaming logs via TLS websocket.
                  <motion.span 
                    animate={{ opacity: [1, 0, 1] }} 
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }} 
                    className="w-1.5 h-3.5 bg-emerald-400 inline-block"
                  />
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Accordion FAQ / System Compliance Section */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" id="faq">
        <div className="text-center mb-16">
          <span className="px-2.5 py-1 rounded bg-slate-900 text-[10px] text-slate-400 font-mono border border-white/5 uppercase">Knowledge Center</span>
          <h2 className="text-3xl font-bold text-white mt-3">Compliance & Specifications FAQ</h2>
          <p className="text-slate-400 mt-2">
            Detailed insights into our detection mechanisms, compliance frameworks, and infrastructure standards.
          </p>
        </div>

        <div className="space-y-4" id="faq-accordions">
          {[
            {
              q: "How does EncDec IDS reconcile network logs with host telemetry?",
              a: "EncDec IDS uses a stateful correlation engine. Incoming raw packet buffers (NIDS) are tagged with unique request IDs. If a packet triggers a database transaction or command shell call on an endpoint host, the corresponding HIDS agent daemon records the process lifecycle and links it to the original request ID. This provides unified tracing of attacks from network ingress to system execution."
            },
            {
              q: "What machine learning models are used for anomaly classification?",
              a: "The system incorporates unsupervised Isolation Forest and Local Outlier Factor (LOF) models in its background analyzer. These algorithms build multidimensional cluster boundaries based on typical system metrics (IP connection rate, protocol usage, payload lengths, and process runtimes). Any operation with an anomaly score above 0.85 triggers a heuristic investigation alert in the Operator Console."
            },
            {
              q: "Is the remote quarantine feature safe for critical production servers?",
              a: "Yes. Quarantine protocols are highly configurable. Operators can declare 'exclusion lists' (e.g. system systemd, core database processes, Docker sockets) which the HIDS daemon is strictly forbidden from terminating. When a threat is detected on a critical node, the system can fall back to passive alerting or edge network rate-limiting rather than executing process isolation."
            },
            {
              q: "Does EncDec IDS meet regulatory security standards?",
              a: "Absolutely. The system complies with SOC2 Type II, GDPR, and HIPAA security criteria. Compliance is achieved through: (1) Mandatory TLS 1.3 encryption on all agent communications; (2) Cryptographically signed compliance logs tracking all administrative actions (audit log tracing); and (3) Secured Multi-Factor Authentication (MFA) gating console operators."
            },
            {
              q: "How do custom rule definitions work?",
              a: "Rules are defined in a structured JSON or YAML syntax. The rule parser evaluates network attributes (protocol, source range, destination port) and performs regex content-matching on packet payloads. When a packet satisfies the rule's criteria, the server instantly drops the request, files a security alert, and registers the threat in the persistent Firestore database."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left px-6 py-5 flex justify-between items-center hover:bg-slate-900 transition-colors font-sans cursor-pointer"
              >
                <span className="font-bold text-white text-sm sm:text-base">{item.q}</span>
                <span className="text-cyan-400 text-lg font-mono">{openFaq === idx ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-400 border-t border-white/5 bg-slate-950/40 leading-relaxed font-sans">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-slate-950 border-t border-white/5 mt-auto relative z-10" id="landing-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Shield className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <span className="font-sans font-bold text-sm text-white">EncDec IDS</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Vigilant Threat Monitoring & Security Console</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-mono">
            <span>© 2026 EncDec, Inc. All rights reserved.</span>
            <span className="hidden sm:inline">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              Gateway Connected
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
