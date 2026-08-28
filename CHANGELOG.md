# Changelog

All notable changes to the EncDec IDS project are documented in this file.

## [2.1.0] - 2026-08-28
### Added
- Modular server architecture refactored into distinct database (`server/db/`), routing (`server/routes/`), and validation (`server/schemas/`) layers.
- Strict input validation on all HTTP endpoints using Zod.
- Full Vitest testing suite with unit and integration tests for validation, auth, Gmail API, and health monitoring.
- Dockerfile and docker-compose.yml for standardized containerized deployment.
- CI/CD workflow definition (.github/workflows/ci.yml).
- ThreatSandbox and RuleBuilder modular components extracted from LandingPage.

### Security
- Replaced fallback static secrets with required runtime environment variables (`JWT_SECRET`, `ADMIN_PASSWORD`, `ANALYST_PASSWORD`).
- Added robust salt rounds for bcrypt password hashing.
- Hardened role-based access control with gateway passkey protection.

## [2.0.0] - 2026-08-15
### Added
- Dual-database real-time synchronization between Google Cloud Firestore and Microsoft SQL Server (TDS Protocol).
- MITRE ATT&CK Matrix live heatmaps and attack path mapping.
- Interactive Threat Simulation & Anomaly Sandbox.
- Host Agent Fleet Telemetry and file integrity monitoring (FIM).

## [1.0.0] - 2026-06-01
### Initial Release
- Core Deep Packet Inspection (DPI) engine.
- WebSocket-based real-time telemetry streaming.
- Snort/Suricata custom rule builder.
