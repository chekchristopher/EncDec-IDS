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
      "3. Dual Database Redundancy: EncDec maintains synchronization across Google Cloud Firestore (for instant sub-millisecond cloud streaming and WebSocket distribution) and Microsoft SQL Server (for immutable ACID-compliant relational enterprise auditing)."
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
        ["Threat Intel Layer", "MITRE & CVE Radar", "Global IOCs & Attack Vectors", "Automated TTP Cross-Mapping"],
        ["Persistence Layer", "Dual Firestore + MSSQL", "Audit Logs, Alerts, Rules", "Real-Time Sync + Relational Integrity"]
      ]
    }
  },
  {
    chapter: "Chapter 2",
    title: "SOC Overview Dashboard & Executive Telemetry",
    summary: "Step-by-step operational guide for the primary Security Operations Center (SOC) command screen.",
    content: [
      "The SOC Overview serves as the tactical command hub for security analysts. It consolidates real-time metrics, live threat level indicators, and incoming alert streams.",
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
    summary: "Operating the live Deep Packet Inspection (DPI) sniffer, rule engine, and packet simulation matrix.",
    content: [
      "The Network IDS module intercepts, parses, and analyzes packets passing through monitored interfaces (e.g., eth0, wlan0, virtual bridge adapters).",
      "1. Deep Packet Inspection (DPI): The sniffer reconstructs protocols across layers: Ethernet (L2), IPv4/IPv6 (L3), TCP/UDP/ICMP (L4), and Application protocols such as HTTP, DNS, SSH, and TLS (L7).",
      "2. Signature Detection Engine: Employs Snort/Suricata-compatible rule sets (SIDs 100001 - 100008). Incoming payloads are pattern-matched against known malicious strings, shellcode signatures, and SQL injection vectors.",
      "3. Live Sniffer Controls: Analysts can Start/Stop packet capture, toggle Deep Inspection mode, and filter streams by Protocol (ALL, TCP, UDP, ICMP, DNS, HTTP) or Threat Level.",
      "4. Attack Simulation Suite: For training and validation, the console includes built-in realistic traffic generators:",
      "   - SYN Flood: Simulates rapid half-open TCP handshakes targeting port 80/443 to test DoS mitigation.",
      "   - TCP Port Scan: Simulates sequential reconnaissance scans (e.g., Nmap SYN stealth scans) across ports 21-8080.",
      "   - HTTP Layer-7 Flood: Generates high-frequency GET/POST traffic targeting backend web portals.",
      "   - DNS Cache Poisoning: Emulates spoofed DNS response packets with invalid transaction IDs."
    ],
    keyTakeaways: [
      "Deep Packet Inspection unpacks raw hex payloads to detect hidden shellcode and evasion techniques.",
      "Signature rules can be customized, enabled, or disabled on the fly without restarting the service.",
      "Simulation tools allow SOC teams to verify alert pipelines under controlled conditions."
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
    title: "Google Workspace & Gmail Security Dispatch",
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
    chapter: "Chapter 7",
    title: "Dual Database Architecture (Firestore + MSSQL)",
    summary: "Understanding the hybrid NoSQL + Relational persistence tier and failover mechanisms.",
    content: [
      "EncDec IDS implements a resilient Dual-Database Architecture designed for high-availability enterprise environments.",
      "1. Google Cloud Firestore: Serves as the primary real-time stream layer. Alerts, metrics, and rule updates are broadcast instantaneously to all connected analyst dashboards via Firestore WebSocket listeners.",
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
    chapter: "Chapter 8",
    title: "Compliance, Auditing & Executive Reports",
    summary: "Generating audit-ready compliance documentation aligned with ISO 27001, NIST SP 800-53, and PCI-DSS.",
    content: [
      "The Reports & Auditing suite empowers organizations to demonstrate continuous compliance with major regulatory standards.",
      "1. SOC Audit Trail: Records every user interaction, configuration change, detection rule edit, and escalation action with timestamp, user ID, IP address, and cryptographic signature.",
      "2. Automated Report Generation: Generate executive summaries, technical incident assessments, and network compliance audits in PDF, CSV, or JSON formats.",
      "3. Regulatory Framework Alignment:",
      "   - ISO/IEC 27001: Annex A.12.4 (Logging and Monitoring).",
      "   - NIST SP 800-53: Control Families AU (Audit and Accountability) & SI (System and Information Integrity).",
      "   - PCI-DSS 4.0: Requirement 10 (Log and Monitor All Access) & Requirement 11 (Test Security Regularly).",
      "4. PDF Export: Generates professional, multi-page vector PDF documents containing executive overviews, metric visualizers, incident chronologies, and compliance attestations."
    ],
    keyTakeaways: [
      "Immutable audit trails satisfy external auditors and forensic requirements.",
      "One-click multi-format exports simplify weekly and monthly SOC reporting.",
      "Built-in compliance mapping ties every intrusion rule to specific ISO/NIST controls."
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
  doc.rect(0, 0, pageWidth, 110, 'F');

  // Decorative Accent Bar
  doc.setFillColor(...deepCyan);
  doc.rect(0, 110, pageWidth, 3, 'F');

  // Sub-bar
  doc.setFillColor(...accentBlue);
  doc.rect(margin, 35, 4, 45, 'F');

  // Document Title Header
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL SECURITY DOCUMENTATION & OPERATIONS MANUAL', margin + 8, 42);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('EncDec IDS Workbook', margin + 8, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(203, 213, 225);
  doc.text('Comprehensive Operational Guide to the Hybrid Intrusion Detection Platform', margin + 8, 66);

  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Network IDS (DPI) • Host IDS (FIM & Syslogs) • Threat Intel • Gmail Dispatch • Dual Database', margin + 8, 76);

  // Metadata Card on Cover
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(margin, 125, contentWidth, 55, 3, 3, 'FD');

  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SYSTEM SPECIFICATIONS & PUBLICATION METADATA', margin + 6, 135);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slateText);

  const metaCols = [
    { label: 'Platform:', value: 'EncDec Hybrid IDS Security Console' },
    { label: 'Edition:', value: 'Enterprise Multi-Node Defense Suite v2.4' },
    { label: 'Classification:', value: 'Internal Operations & SOC Technical Guide' },
    { label: 'Published Date:', value: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
    { label: 'Persistence:', value: 'Cloud Firestore + Microsoft SQL Server 2022' },
    { label: 'Compliance Scope:', value: 'ISO/IEC 27001, NIST SP 800-53, PCI-DSS v4.0' }
  ];

  metaCols.forEach((m, idx) => {
    const colX = margin + 6 + (idx % 2) * (contentWidth / 2);
    const colY = 144 + Math.floor(idx / 2) * 10;
    doc.setFont('helvetica', 'bold');
    doc.text(m.label, colX, colY);
    doc.setFont('helvetica', 'normal');
    doc.text(m.value, colX + 32, colY);
  });

  // Table of Contents Preview Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 188, contentWidth, 85, 3, 3, 'FD');

  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TABLE OF CONTENTS (WORKBOOK CURRICULUM)', margin + 6, 198);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateText);

  WORKBOOK_DATA.forEach((sec, idx) => {
    const tocX = margin + 6 + (idx >= 4 ? contentWidth / 2 : 0);
    const tocY = 207 + (idx % 4) * 16;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...deepCyan);
    doc.text(`${sec.chapter}: `, tocX, tocY);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkNavy);
    doc.text(sec.title, tocX + 20, tocY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedText);
    const truncSummary = sec.summary.length > 55 ? sec.summary.substring(0, 52) + '...' : sec.summary;
    doc.text(truncSummary, tocX + 6, tocY + 5);
  });

  // Footer Cover Page
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text('Confidential & Proprietary • EncDec Hybrid Intrusion Detection System', margin, 287);
  doc.text('Page 1 of 9', pageWidth - margin - 18, 287);

  // ==========================================
  // CHAPTER PAGES (PAGES 2 TO 9)
  // ==========================================

  WORKBOOK_DATA.forEach((sec, secIdx) => {
    doc.addPage();
    const currentPage = secIdx + 2;

    // Header Running Banner
    doc.setFillColor(...darkNavy);
    doc.rect(0, 0, pageWidth, 18, 'F');

    doc.setFillColor(...deepCyan);
    doc.rect(0, 18, pageWidth, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ENCDEC IDS WORKBOOK — OFFICIAL OPERATIONAL MANUAL', margin, 12);

    doc.setTextColor(...deepCyan);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sec.chapter}: ${sec.title}`, pageWidth - margin - doc.getTextWidth(`${sec.chapter}: ${sec.title}`), 12);

    let currentY = 28;

    // Chapter Title Heading
    doc.setTextColor(...deepCyan);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(sec.chapter.toUpperCase(), margin, currentY);
    currentY += 7;

    doc.setTextColor(...darkNavy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(sec.title, margin, currentY);
    currentY += 7;

    // Executive Summary Box
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderGrey);
    doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'FD');

    doc.setFillColor(...deepCyan);
    doc.rect(margin, currentY, 2.5, 18, 'F');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...slateText);
    const summaryLines = doc.splitTextToSize(sec.summary, contentWidth - 8);
    doc.text(summaryLines, margin + 6, currentY + 6);
    currentY += 24;

    // Main Explanatory Content Paragraphs
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slateText);

    sec.content.forEach((paragraph) => {
      const splitParas = doc.splitTextToSize(paragraph, contentWidth);
      
      // Highlight numbered bullet points
      if (/^\d+\./.test(paragraph)) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkNavy);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slateText);
      }

      doc.text(splitParas, margin, currentY);
      currentY += splitParas.length * 4.5 + 2;
    });

    currentY += 4;

    // Table Section if Present
    if (sec.tables) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...darkNavy);
      doc.text('REFERENCE MATRIX & TECHNICAL SPECIFICATIONS', margin, currentY);
      currentY += 5;

      const headers = sec.tables.headers;
      const rows = sec.tables.rows;
      const colW = contentWidth / headers.length;

      // Table Header Row
      doc.setFillColor(...slateDark);
      doc.rect(margin, currentY, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);

      headers.forEach((h, hIdx) => {
        doc.text(h, margin + hIdx * colW + 3, currentY + 5);
      });
      currentY += 7;

      // Table Data Rows
      rows.forEach((r, rIdx) => {
        doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
        doc.rect(margin, currentY, contentWidth, 6.5, 'F');
        doc.setDrawColor(...borderGrey);
        doc.line(margin, currentY + 6.5, margin + contentWidth, currentY + 6.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...slateText);

        r.forEach((cell, cIdx) => {
          doc.text(cell, margin + cIdx * colW + 3, currentY + 4.5);
        });

        currentY += 6.5;
      });

      currentY += 6;
    }

    // Key Takeaways & Operator Checklist Card
    const takeawayCardHeight = 36;
    doc.setFillColor(240, 253, 250); // soft cyan/emerald tint
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(margin, currentY, contentWidth, takeawayCardHeight, 2, 2, 'FD');

    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('OPERATIONAL BEST PRACTICES & KEY TAKEAWAYS', margin + 5, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(19, 78, 74);

    sec.keyTakeaways.forEach((k, kIdx) => {
      const kLines = doc.splitTextToSize(`• ${k}`, contentWidth - 10);
      doc.text(kLines, margin + 5, currentY + 14 + kIdx * 6.5);
    });

    // Running Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.setDrawColor(...borderGrey);
    doc.line(margin, 282, pageWidth - margin, 282);
    doc.text('EncDec Hybrid IDS Security Operations Workbook • Published for SOC Operations', margin, 287);
    doc.text(`Page ${currentPage} of 9`, pageWidth - margin - 18, 287);
  });

  // Trigger Save/Download
  doc.save('EncDec_IDS_Workbook_Operational_Guide.pdf');
}
