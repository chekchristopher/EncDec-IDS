/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';

export interface WorkbookSection {
  title: string;
  chapter: string;
  summary: string;
  content: string[];
  keyTakeaways: string[];
  tables?: {
    headers: string[];
    rows: string[][];
  };
}

export const WORKBOOK_DATA: WorkbookSection[] = [
  {
    chapter: "Chapter 1",
    title: "System Architecture & Core Philosophy",
    summary: "Comprehensive introduction to the EncDec Hybrid Intrusion Detection System (NIDS + HIDS), explaining dual-engine inspection, encryption/decryption state isolation, and zero-trust verification.",
    content: [
      "The EncDec Hybrid Intrusion Detection System (IDS) is an enterprise-grade defense platform unifying Deep Packet Inspection (DPI) at the network perimeter with Kernel-level File Integrity Monitoring (FIM) and Process Auditing at the host level.",
      "1. Hybrid Protection Model: Traditional standalone NIDS lacks context regarding endpoint process lineage, while standalone HIDS cannot inspect high-throughput ingress gateway packets. EncDec bridges this gap by cross-correlating network flow anomalies with endpoint process state changes in real time.",
      "2. Cryptographic State Isolation: Core telemetry channels utilize end-to-end symmetric encryption (AES-256-GCM) with ephemeral session keys for cross-node communication. Raw payload inspection operates in isolated cryptographic sandboxes to prevent memory inspection attacks.",
      "3. Dual Database Redundancy: EncDec maintains continuous synchronization across Google Cloud Firestore (for instant sub-millisecond cloud streaming and WebSocket distribution) and Microsoft SQL Server (for immutable ACID-compliant relational enterprise auditing).",
      "4. Distributed Sensor Fabric Integration: Ingests normalized telemetry from Suricata NIDS, Zeek NSM, Endpoint eBPF Host Agents, and central Syslog parsers to form an impervious detection fabric."
    ],
    keyTakeaways: [
      "Perimeter Network IDS and Endpoint Host IDS run synchronously under a unified threat engine.",
      "Zero-Trust Architecture: every packet, process, and syscall is authenticated and scored.",
      "Fault-Tolerant Persistence: seamless automated failover between Cloud Firestore and local/MSSQL storage."
    ],
    tables: {
      headers: ["Defense Layer", "Engine Component", "Primary Telemetry", "Detection Mechanism"],
      rows: [
        ["Network Layer (NIDS)", "Packet Sniffer & DPI", "TCP, UDP, ICMP, DNS, HTTP", "Signature & Heuristic Rate Limits"],
        ["Host Layer (HIDS)", "FIM & Process Monitor", "Syslogs, Hashes, Syscalls", "SHA-256 Diffing & Rogue Daemon Scans"],
        ["Incursion Geo-Radar", "TopoJSON & D3 Engine", "Bézier Trajectories & Arcs", "Real-Time Geodesic Attack Tracing"],
        ["Sensor Fabric", "Suricata + Zeek + eBPF", "Packet Flows & System Calls", "Multi-Stage Correlated Triaging"],
        ["Persistence Layer", "Dual Firestore + MSSQL", "Audit Logs, Alerts, Rules", "Real-Time Sync + Relational Integrity"]
      ]
    }
  },
  {
    chapter: "Chapter 2",
    title: "SOC Overview Dashboard & Executive Telemetry",
    summary: "Step-by-step operational guide for the primary Security Operations Center (SOC) command screen.",
    content: [
      "The SOC Overview serves as the tactical command hub for security analysts. It consolidates real-time metrics, live threat level indicators, dynamic TopoJSON maps, and incoming alert streams.",
      "1. Threat Level Index: Dynamically calculated score (0 to 100) based on weighted active alerts, anomalous packet volume, and unhandled critical intrusions. Colors shift from Nominal Cyan (0-25) to Guarded Amber (26-60), High Orange (61-80), and Critical Crimson (81-100).",
      "2. Live Network & Host Telemetry Gauges: Real-time visualizers display Total Ingress Packets, Active Monitored Hosts, Detected Anomalies, and Rule Engine Compliance.",
      "3. Active Incidents Management: Each alert row provides rich metadata (Timestamp, Source IP/Host, Threat Category, Severity).",
      "4. Action Handlers: Analysts can triage alerts with one click:",
      "   - Escalate: Transmits the alert to senior incident response and flags priority in the audit log.",
      "   - Ignore / False Positive: Suppresses the alert from active triage while preserving it in logs for audit compliance.",
      "   - Resolve: Marks containment complete after mitigation actions.",
      "   - Gmail Dispatch: Pre-populates an official RFC 2822 incident notification for instant dispatch via connected Google Workspace."
    ],
    keyTakeaways: [
      "The Threat Level Index updates automatically as network packets and host events are evaluated.",
      "Every operator action (Escalate, Ignore, Resolve) generates an immutable, timestamped audit log.",
      "Direct Gmail dispatch allows instant communication with node owners during active incidents."
    ]
  },
  {
    chapter: "Chapter 3",
    title: "Network IDS (NIDS) Operations & Packet Sniffer",
    summary: "Operating the live Deep Packet Inspection (DPI) sniffer, rule engine, and real-time packet matrix.",
    content: [
      "The Network IDS module intercepts, parses, and analyzes packets passing through monitored interfaces (e.g., eth0, wlan0, virtual bridge adapters).",
      "1. Deep Packet Inspection (DPI): The sniffer reconstructs protocols across layers: Ethernet (L2), IPv4/IPv6 (L3), TCP/UDP/ICMP (L4), and Application protocols such as HTTP, DNS, SSH, and TLS (L7).",
      "2. Signature Detection Engine: Employs Snort/Suricata-compatible rule sets (SIDs 100001 - 100008). Incoming payloads are pattern-matched against known malicious strings, shellcode signatures, and SQL injection vectors.",
      "3. Live Sniffer Controls: Analysts can Start/Stop packet capture, toggle Deep Inspection mode, and filter streams by Protocol (ALL, TCP, UDP, ICMP, DNS, HTTP) or Threat Level.",
      "4. Exploit Verification Suite: For operational testing and penetration verification, the console includes live attack probe evaluators:",
      "   - SYN Flood: Intercepts rapid half-open TCP handshakes targeting port 80/443 to test DoS mitigation.",
      "   - TCP Port Scan: Intercepts sequential reconnaissance scans (e.g., Nmap SYN stealth scans) across ports 21-8080.",
      "   - HTTP Layer-7 Flood: Intercepts high-frequency GET/POST traffic targeting backend web portals.",
      "   - DNS Cache Poisoning: Detects spoofed DNS response packets with invalid transaction IDs."
    ],
    keyTakeaways: [
      "Deep Packet Inspection unpacks raw hex payloads to detect hidden shellcode and evasion techniques.",
      "Signature rules can be customized, enabled, or disabled on the fly without restarting the service.",
      "Exploit verification tools allow SOC teams to confirm active firewall and DPI pipeline defenses under live conditions."
    ],
    tables: {
      headers: ["Rule SID", "Rule Name", "Target Protocol", "Default Action", "Severity"],
      rows: [
        ["SID 100001", "SYN Flood DoS Anomaly", "TCP", "ALERT & LOG", "CRITICAL"],
        ["SID 100002", "Sequential Port Sweep Recon", "TCP / UDP", "ALERT & RATE-LIMIT", "HIGH"],
        ["SID 100003", "HTTP SQL Injection Pattern", "HTTP (L7)", "ALERT & BLOCK", "CRITICAL"],
        ["SID 100004", "DNS Transaction ID Spoofing", "DNS (UDP 53)", "ALERT & DROP", "MEDIUM"],
        ["SID 100005", "ICMP Ping of Death / Smurf", "ICMP", "ALERT & THROTTLE", "HIGH"],
        ["SID 100006", "Outbound Suspicious Beacon", "TCP (L7)", "ALERT & ISOLATE", "CRITICAL"]
      ]
    }
  },
  {
    chapter: "Chapter 4",
    title: "Host IDS (HIDS) & Endpoint Security",
    summary: "Monitoring server fleet integrity, detecting file tamper events, and auditing process execution.",
    content: [
      "The Host IDS module oversees all registered servers, workstations, and cloud gateways within your organization's infrastructure.",
      "1. Fleet Registry: Tracks OS distribution (Ubuntu Linux 22.04 LTS, Windows Server 2022, Debian, macOS Enterprise), IP addresses, kernel versions, and live agent connectivity heartbeats.",
      "2. File Integrity Monitoring (FIM): Computes cryptographic SHA-256 hashes of critical system directories (`/etc/passwd`, `/etc/shadow`, `/bin/systemd`, `C:\\Windows\\System32\\drivers\\etc\\hosts`). Any unauthorized file modification, deletion, or permission change triggers an instant high-severity FIM alert.",
      "3. Process & Daemon Auditing: Continuously inspects active PID trees, CPU/RAM utilization, and executable binaries against known baseline allowlists. Flagged anomalies include unmapped child processes spawned by web servers (e.g. `www-data` executing `/bin/bash` or `curl`).",
      "4. Syslog & Auth Stream: Real-time parsing of Linux `/var/log/auth.log` and Windows Security Event Logs to detect failed SSH logins, brute-force dictionary attacks, and unauthorized `sudo` privilege escalations."
    ],
    keyTakeaways: [
      "FIM detects zero-day ransomware and rootkits before payload execution finishes.",
      "Automatic baseline hashing creates an immutable benchmark for all system executables.",
      "Syslog ingestion flags suspicious authentication attempts in sub-second intervals."
    ]
  },
  {
    chapter: "Chapter 5",
    title: "Threat Intelligence & MITRE ATT&CK Matrix",
    summary: "Utilizing global threat feeds, CVE vulnerability scoring, and MITRE mapping for adversary emulation.",
    content: [
      "The Threat Intelligence module provides contextual intelligence to transform raw alert telemetry into actionable adversary attribution.",
      "1. MITRE ATT&CK Mapping: All detected anomalies are cross-referenced with standardized MITRE tactics and techniques (e.g., T1110.001 Password Guessing, T1046 Network Service Discovery, T1059 Command & Scripting Interpreter, T1498 Network Denial of Service).",
      "2. CVE Vulnerability Radar: Ingests National Vulnerability Database (NVD) entries, displaying Common Vulnerability Scoring System (CVSS v3) scores, published exploit vectors, and recommended patches for detected running software versions.",
      "3. Malicious IP & Domain Reputation: Automatically queries global IOC databases to score inbound connection attempts against known botnets, command-and-control (C2) servers, and Tor exit nodes.",
      "4. Threat Search Tool: Analysts can enter any IPv4/IPv6 address, domain name, or MD5/SHA-256 hash to inspect reputation history, attack origin telemetry, and historical incident associations."
    ],
    keyTakeaways: [
      "MITRE ATT&CK classification streamlines post-incident forensics and board reporting.",
      "CVSS vulnerability metrics help prioritize security patching schedules.",
      "Reputation scoring filters out high-confidence malicious IPs before deeper manual investigation."
    ]
  },
  {
    chapter: "Chapter 6",
    title: "Real-Time TopoJSON Geodesic Incursion Telemetry",
    summary: "NEW UPGRADE: In-depth guide to D3.js and TopoJSON geographic attack projection engine, Bézier trajectory curves, and real-time incursion telemetry.",
    content: [
      "The newly upgraded software introduces a dedicated TopoJSON and D3.js Geographic Projection Engine (`RealTimeMap.tsx`) providing interactive worldwide visibility into active incursion vectors targeting the protected infrastructure.",
      "1. Geographic Projection & Topology Rendering: Utilizes `topojson-client` to decode world continents and country boundaries into mathematical geometries rendered through `d3.geoNaturalEarth1()` and `d3.geoPath()`. Includes bundled offline topologies for zero-dependency rendering in isolated SOC environments.",
      "2. Dynamic Incursion Projectiles: Attack trajectories are calculated using Quadratic Bézier curves (`M sx sy Q mx my tx ty`). Smooth D3 transition loops animate glowing projectile particles along the geodesic path from source IPs directly to the destination infrastructure (e.g., enrolled user nodes).",
      "3. Origin Concentric Radar Rings: Pulsing SVG markers signal origin threat hotspots across the globe (e.g., Frankfurt, Ashburn, Moscow, Beijing, London, São Paulo). Rings expand and fade rhythmically based on attack severity.",
      "4. Target Node Shielding & Radar Sweep: The defended infrastructure node is anchored with an animated rotating radar sweep ring, cyber glow filter, and destination ripple shockwave triggered whenever an incursion projectile arrives.",
      "5. Dynamic Alerts Prop Synchronization: The map component accepts the live `alerts` array. Whenever new Suricata, Zeek, or Host anomalies are ingested, origin coordinates are resolved immediately and animated onto the map."
    ],
    keyTakeaways: [
      "D3.js and TopoJSON provide GPU-accelerated, zero-dependency global attack vector visualization.",
      "Geodesic arcs and particle transitions offer immediate spatial awareness during distributed brute-force or DDoS surges.",
      "Synchronized directly with the incoming alerts telemetry stream for zero-latency operator awareness."
    ]
  },
  {
    chapter: "Chapter 7",
    title: "Distributed Sensor Fabric & Autonomous Containment",
    summary: "NEW UPGRADE: Deploying the distributed sensor mesh, correlating multi-stage incidents, and executing automated active responses.",
    content: [
      "Modern cyber attacks span multiple stages and infrastructure components. The upgraded EncDec IDS features an integrated Sensor Fabric and Incident Correlation Engine.",
      "1. Multi-Sensor Architecture: Unifies four discrete telemetry collection agents: Suricata NIDS (perimeter packet inspection), Zeek NSM (network protocol behavioral analysis), Endpoint eBPF Host Agents (kernel process lifecycle tracking), and Central Syslog (authentication and daemon events).",
      "2. Correlated Incidents Workspace: Rather than isolating individual alerts, the engine groups related events into parent Incidents (e.g., `INC-1042: Multi-Stage Incursion & Lateral Traversal`). Tracks the entire kill-chain progression from initial access to privilege escalation and data exfiltration attempts.",
      "3. Automated Active Response Engine: When threat confidence thresholds are satisfied, the system can autonomously execute defense countermeasures without operator delay:",
      "   - IP Null-Routing: Dynamically updates gateway border tables to drop hostile subnet traffic.",
      "   - Process Termination: Dispatches instant `SIGKILL` orders to rogue daemons spawned by web services.",
      "   - Endpoint Isolation: Revokes network interface routing for compromised hosts while preserving an encrypted forensics channel.",
      "4. Operator Override & Containment Safety: All autonomous containment actions can be inspected, approved, or rolled back with one click by authorized administrators."
    ],
    keyTakeaways: [
      "Cross-sensor telemetry eliminates blind spots across network perimeter and endpoint kernels.",
      "Correlated multi-stage incidents reduce alert fatigue by up to 85% compared to raw alert logs.",
      "Automated containment triggers defend critical infrastructure in sub-second execution windows."
    ]
  },
  {
    chapter: "Chapter 8",
    title: "Dual Database Architecture (Firestore + MSSQL)",
    summary: "Understanding the hybrid NoSQL + Relational persistence tier, circuit breakers, and automatic cloud failover.",
    content: [
      "EncDec IDS implements a resilient Dual-Database Architecture engineered for zero data loss and uninterrupted high-availability.",
      "1. Google Cloud Firestore: Serves as the primary real-time stream layer (`ai-studio-encdecids-bc136ca4-82a5-408e-ae8f-57533ab6060c`). Alerts, metrics, and rule updates are broadcast instantaneously to all connected analyst dashboards via Firestore WebSocket listeners.",
      "2. Microsoft SQL Server (MSSQL): Serves as the enterprise relational data store. Schema tables (`EncDec_SecurityAlerts`, `EncDec_AuditLogs`, `EncDec_EmailLogs`, `EncDec_Users`, `EncDec_Rules`, `EncDec_Hosts`) ensure strict relational integrity, indexed queries, and compliance archiving.",
      "3. Circuit Breaker & Automatic Fallback: In the event of cloud quota limits or network partitions, the backend server seamlessly transitions writes to local persistent storage and MSSQL without dropping incoming alerts.",
      "4. Dual Database Console: Administrators can inspect live connection statuses, view record counts across all tables, execute manual syncs, and test database health with one click."
    ],
    keyTakeaways: [
      "Real-time UI responsiveness powered by Cloud Firestore.",
      "Enterprise audit compliance and structured reporting powered by Microsoft SQL Server.",
      "Intelligent circuit breakers prevent service interruption during cloud quota events."
    ]
  },
  {
    chapter: "Chapter 9",
    title: "Google Workspace & RFC 2822 Gmail Security Dispatch",
    summary: "Configuring and executing authorized incident dispatch workflows via connected Google Workspace.",
    content: [
      "EncDec IDS features native integration with Google Workspace, allowing SOC operators to communicate directly with internal teams, node administrators, and executive leadership via verified Gmail OAuth 2.0 channels.",
      "1. OAuth 2.0 Authorization: Secure client-side sign-in grants scoped permissions (`mail.google.com`, `gmail.send`, `gmail.readonly`) without exposing credentials or storing tokens on disk.",
      "2. Security Inbox & Filter: View incoming security bulletins, vendor advisories, and system notifications with dedicated 'Security Alerts' filters.",
      "3. Incident Dispatch Templates: Pre-configured RFC-compliant notification templates populate essential incident fields automatically (Severity, MITRE TTP, Origin IP, Recommended Mitigation Steps).",
      "4. Safety Safeguards: Destructive operations (sending email, trashing messages, disconnecting accounts) require explicit two-step user confirmation dialogs in accordance with Google Workspace Security best practices."
    ],
    keyTakeaways: [
      "OAuth 2.0 client-side authentication ensures zero secret leakage in transit.",
      "Incident templates reduce mean-time-to-notify (MTTN) during critical cyber events.",
      "Every dispatched notification is cross-recorded into the EncDec SOC Audit Trail."
    ]
  },
  {
    chapter: "Chapter 10",
    title: "Console Usability, Dual-Theme Engine & Certification",
    summary: "NEW UPGRADE: Operating the light/dark theme engine, WCAG AA compliance features, and earning the Certified EncDec IDS SOC Specialist (CE-SOC) credential.",
    content: [
      "The latest software upgrade introduces comprehensive human-factors enhancements and the in-system Professional Certification Protocol.",
      "1. Dual-Theme Engine (Light & Dark Mode): Allows operators to seamlessly toggle between the high-contrast Dark SOC Command theme and the bright, clean Light Mode. Integrated directly into the Global Header, Sidebar, Landing Page, and Settings.",
      "2. WCAG AA Accessibility: Ensures strict contrast ratios (4.5:1 text, 3:1 graphical elements), keyboard accessibility (`focus-visible` rings), and responsive layouts tailored to high-stress incident triaging.",
      "3. In-System Certification Protocol: Operators who study the complete curriculum from Chapter 1 through Chapter 10 directly within the interactive workbook software earn the official **Certified EncDec IDS SOC Specialist (CE-SOC)** professional credential.",
      "4. Automated Certificate Issuance: Progress is tracked interactively as each chapter is studied. Upon reaching 100% completion within the system, a cryptographically signed, personalized Certificate of Operational Mastery is generated and awarded automatically.",
      "5. Offline Study vs. Online Certification: Operators retain the choice to download the complete 10-chapter workbook as a PDF for offline reading at any time. However, official digital certificate issuance and verification requires completing the curriculum within the live platform."
    ],
    keyTakeaways: [
      "Effortless theme toggling provides optimal visual comfort across day and night operational shifts.",
      "Completing the 10 chapters within the platform unlocks the official Certified EncDec IDS SOC Specialist certificate.",
      "Offline PDF export ensures training materials remain accessible even without an active internet connection."
    ]
  }
];

/**
 * Generates and downloads the complete, professional "EncDec IDS Workbook" PDF.
 */
export function generateWorkbookPdf(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Color Palette
  const darkNavy = [8, 14, 26] as const;
  const deepCyan = [6, 182, 212] as const;
  const accentBlue = [14, 165, 233] as const;
  const slateDark = [30, 41, 59] as const;
  const slateText = [51, 65, 85] as const;
  const mutedText = [100, 116, 139] as const;
  const cardBg = [248, 250, 252] as const;
  const borderGrey = [226, 232, 240] as const;

  // ==========================================
  // COVER PAGE (PAGE 1)
  // ==========================================
  
  // Background Header Block
  doc.setFillColor(...darkNavy);
  doc.rect(0, 0, pageWidth, 115, 'F');

  // Decorative Accent Bar
  doc.setFillColor(...deepCyan);
  doc.rect(0, 115, pageWidth, 3, 'F');

  // Sub-bar
  doc.setFillColor(...accentBlue);
  doc.rect(margin, 35, 4, 48, 'F');

  // Document Title Header
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL SECURITY DOCUMENTATION & OPERATIONS MANUAL [UPGRADED MASTER EDITION]', margin + 8, 42);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('EncDec IDS Workbook', margin + 8, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(203, 213, 225);
  doc.text('Comprehensive Operational Guide to the Upgraded Hybrid Intrusion Detection Platform', margin + 8, 64);

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('NIDS DPI • HIDS FIM • TopoJSON Incursions • Sensor Fabric • Dual DB • Light/Dark Mode • Certification', margin + 8, 74);

  // Metadata Card on Cover
  doc.setFillColor(...slateDark);
  doc.roundedRect(margin, 126, contentWidth, 38, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212);
  doc.text('CURRICULUM SPECIFICATIONS & METADATA', margin + 6, 134);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text('• System Version: EncDec IDS v4.2.0 Enterprise Hybrid Engine', margin + 6, 142);
  doc.text('• Monitored Scope: Enrolled Multi-Node Infrastructure Fabric', margin + 6, 149);
  doc.text('• Certification Award: Certified EncDec IDS SOC Specialist (CE-SOC) (Earned upon system completion)', margin + 6, 156);

  // Table of Contents Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkNavy);
  doc.text('MASTER CURRICULUM TABLE OF CONTENTS (10 CHAPTERS)', margin, 175);

  let tocY = 183;
  WORKBOOK_DATA.forEach((sec, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...deepCyan);
    doc.text(`${sec.chapter}:`, margin, tocY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    doc.text(sec.title, margin + 22, tocY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedText);
    doc.text(`Page ${idx + 2}`, pageWidth - margin - 15, tocY, { align: 'right' });

    // Dotted leader line
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1, 2], 0);
    doc.line(margin + 24 + doc.getTextWidth(sec.title) + 2, tocY - 1, pageWidth - margin - 22, tocY - 1);
    doc.setLineDashPattern([], 0);

    tocY += 7.8;
  });

  // Notice about In-System Certification
  doc.setFillColor(236, 254, 255);
  doc.setDrawColor(165, 243, 252);
  doc.roundedRect(margin, 264, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(8, 145, 178);
  doc.text('★ OFFLINE READING VS. IN-SYSTEM PROFESSIONAL CERTIFICATION', margin + 5, 270);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(14, 116, 144);
  doc.text('You can study this downloaded workbook offline at your convenience. Official certification and credentials are automatically', margin + 5, 275);
  doc.text('conferred when you complete the 10-chapter curriculum directly inside the EncDec IDS software platform.', margin + 5, 279);

  // ==========================================
  // CHAPTER PAGES (PAGES 2 - 11)
  // ==========================================
  const totalPages = WORKBOOK_DATA.length + 1;

  WORKBOOK_DATA.forEach((sec, idx) => {
    doc.addPage();
    const currentPage = idx + 2;
    let currentY = margin;

    // Running Header
    doc.setFillColor(...slateDark);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ENCDEC IDS OPERATIONS MANUAL & CERTIFICATION CURRICULUM', margin, 8);
    doc.setTextColor(6, 182, 212);
    doc.text(`${sec.chapter} OF 10`, pageWidth - margin - 18, 8);

    currentY = 22;

    // Chapter Number Pill
    doc.setFillColor(...deepCyan);
    doc.roundedRect(margin, currentY, 24, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(sec.chapter.toUpperCase(), margin + 3.5, currentY + 4.2);
    currentY += 10;

    // Section Title
    doc.setTextColor(...darkNavy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(sec.title, margin, currentY);
    currentY += 7;

    // Executive Summary Box
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderGrey);
    doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'FD');

    doc.setFillColor(...deepCyan);
    doc.rect(margin, currentY, 2.5, 18, 'F');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...slateText);
    const summaryLines = doc.splitTextToSize(sec.summary, contentWidth - 8);
    doc.text(summaryLines, margin + 6, currentY + 5.5);
    currentY += 23;

    // Main Explanatory Content Paragraphs
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...slateText);

    sec.content.forEach((paragraph) => {
      const splitParas = doc.splitTextToSize(paragraph, contentWidth);
      
      if (/^\d+\./.test(paragraph)) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkNavy);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slateText);
      }

      doc.text(splitParas, margin, currentY);
      currentY += splitParas.length * 4.2 + 2;
    });

    currentY += 3;

    // Table Section if Present
    if (sec.tables) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...darkNavy);
      doc.text('REFERENCE MATRIX & TECHNICAL SPECIFICATIONS', margin, currentY);
      currentY += 4.5;

      const headers = sec.tables.headers;
      const rows = sec.tables.rows;
      const colW = contentWidth / headers.length;

      // Table Header Row
      doc.setFillColor(...slateDark);
      doc.rect(margin, currentY, contentWidth, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);

      headers.forEach((h, hIdx) => {
        doc.text(h, margin + hIdx * colW + 3, currentY + 4.5);
      });
      currentY += 6.5;

      // Table Data Rows
      rows.forEach((r, rIdx) => {
        doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
        doc.rect(margin, currentY, contentWidth, 5.8, 'F');
        doc.setDrawColor(...borderGrey);
        doc.line(margin, currentY + 5.8, margin + contentWidth, currentY + 5.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(...slateText);

        r.forEach((cell, cIdx) => {
          doc.text(cell, margin + cIdx * colW + 3, currentY + 4);
        });

        currentY += 5.8;
      });

      currentY += 4;
    }

    // Key Takeaways & Operator Checklist Card
    const takeawayCardHeight = 30;
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(margin, currentY, contentWidth, takeawayCardHeight, 2, 2, 'FD');

    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('OPERATIONAL BEST PRACTICES & KEY TAKEAWAYS', margin + 5, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(19, 78, 74);

    sec.keyTakeaways.forEach((k, kIdx) => {
      const kLines = doc.splitTextToSize(`• ${k}`, contentWidth - 10);
      doc.text(kLines, margin + 5, currentY + 12 + kIdx * 5.5);
    });

    // Running Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedText);
    doc.setDrawColor(...borderGrey);
    doc.line(margin, 282, pageWidth - margin, 282);
    doc.text('EncDec Hybrid IDS Security Operations Workbook • Published for SOC Operations', margin, 287);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin - 22, 287);
  });

  // Trigger Save/Download
  doc.save('EncDec_IDS_Upgraded_Master_Workbook.pdf');
}
