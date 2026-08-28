# EncDec IDS — Unified Enterprise & Academic Intrusion Detection System

**EncDec IDS** is a next-generation, high-performance Network & Host Intrusion Detection System (IDS/IPS) and Security Operations Center (SOC) dashboard. Designed with dual database synchronization (Google Cloud Firestore + Microsoft SQL Server via TDS/Windows Auth) and real-time deep packet inspection (DPI) heuristics mapped directly to the **MITRE ATT&CK®** framework.

---

## ⚡ Architecture Overview

```
                          ┌────────────────────────┐
                          │   React 18 + Tailwind  │
                          │   SOC Operator Portal  │
                          └───────────┬────────────┘
                                      │ (REST / WebSocket)
                                      ▼
                          ┌────────────────────────┐
                          │ Express API Gateway    │
                          │ (Zod + JWT + RBAC)     │
                          └─────┬────────────┬─────┘
                                │            │
           ┌────────────────────┴──┐      ┌──┴─────────────────────┐
           ▼                       ▼      ▼                        ▼
┌──────────────────────┐ ┌──────────────┐ ┌────────────────┐ ┌────────────────┐
│ Cloud Firestore Sync │ │ Local Store  │ │ MSSQL Driver   │ │ Gemini AI Core │
│ (Realtime Documents) │ │ (db.json)    │ │ (TDS / Windows)│ │ (Deep Triage)  │
└──────────────────────┘ └──────────────┘ └────────────────┘ └────────────────┘
```

### Key Modules
- **Real-Time DPI Packet Dissector**: Simulates and inspects OSI Layer 2–7 network packets with protocol classification, anomaly detection, and automated threat scoring.
- **Rule Engine**: Snort & Suricata-compatible rule synthesizer supporting signature-based, anomaly-based, and heuristic detection vectors.
- **Dual Database Sync**: Seamless real-time replication between local state, Google Cloud Firestore, and enterprise Microsoft SQL Server.
- **Threat Sandbox**: Interactive cyber attack injection and mitigation harness for security training and live validation.
- **Role-Based Access Control (RBAC)**: Fine-grained security clearances (`admin`, `analyst`, `auditor`, `operator`, `guest`) with cryptographic gateway verification and tamper-evident audit logging.
- **Automated Quarantine & Containment**: Host agent process termination, IP ban enforcement, and network socket isolation.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- (Optional) Docker & Docker Compose

### 1. Installation
```bash
# Clone the repository and install dependencies
git clone https://github.com/encdec/encdec-ids.git
cd encdec-ids
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Configure your secrets in `.env`:
```env
JWT_SECRET="your-strong-random-jwt-secret-key"
ADMIN_PASSWORD="Admin#2026!SecOps"
ANALYST_PASSWORD="Analyst#2026!Tier1"
APP_URL="http://localhost:3000"
```

### 3. Development Server
Start both the Express API gateway and Vite client on port 3000:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Running Tests
```bash
# Run unit and integration tests with Vitest
npm test

# Run tests in watch mode
npm run test:watch
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🐳 Docker Deployment

### Using Docker Compose
```bash
docker-compose up -d --build
```

### Standalone Docker Build
```bash
docker build -t encdec-ids:latest .
docker run -p 3000:3000 --env-file .env encdec-ids:latest
```

---

## 🛡️ Security Clearance Levels

| Role | Access Scope | Description |
| :--- | :--- | :--- |
| **Admin** | Full Clearance (Root) | User management, rule compilation, DB synchronization, global quarantine, audit logs |
| **Analyst** | SOC Triage (Tier 1/2) | Threat investigation, incident escalation, report generation, host telemetry |
| **Auditor** | Compliance & Logs | Read-only access to audit logs, compliance reports, and rule sets |
| **Guest** | Interactive Demo | Read-only simulation sandbox and overview dashboards |

---

## 📜 MITRE ATT&CK Matrix Mapping

EncDec IDS maps live detections directly to MITRE ATT&CK techniques:
- **T1190**: Exploit Public-Facing Application (SQLi, Webshells)
- **T1110**: Brute Force & Credential Stuffing
- **T1046**: Network Service Discovery & Port Sweeps
- **T1498**: Network Denial of Service (SYN / UDP Floods)
- **T1059**: Command and Scripting Interpreter (Reverse Shells)

---

## 📄 License & Attribution
Licensed under the Apache 2.0 License. Designed for Chukwuemeka Odumegwu Ojukwu University (COOU) Cybersecurity & Enterprise SOC Operations.
