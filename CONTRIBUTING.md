# Contributing to EncDec IDS

Thank you for your interest in contributing to the **EncDec IDS** project! We welcome community contributions, bug reports, and pull requests.

---

## 🛠️ Development Setup

1. Fork and clone the repository.
2. Ensure you have Node.js 18+ installed.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and configure local variables.
5. Start development mode:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing & Validation

Before submitting a Pull Request, make sure all tests, linter checks, and builds pass:

```bash
# Run Type Checker / Linter
npm run lint

# Run Vitest Suite
npm test

# Verify Production Build
npm run build
```

---

## 📝 Code Style & Guidelines

- **TypeScript**: Strict typing required across both backend (`/server/`) and frontend (`/src/`).
- **Input Validation**: All new API endpoints must declare and validate input with Zod schemas in `server/schemas/validation.ts`.
- **Modular Components**: Keep React components modular and under 400 lines of code.
- **Icons**: Use only `lucide-react` icons.
- **Security**: Never hardcode credentials, passwords, or API keys in source files.

---

## 🔒 Security Vulnerability Reporting

If you identify a potential security vulnerability, please email **security@encdec-ids.sec** or open a private advisory instead of creating a public issue.
