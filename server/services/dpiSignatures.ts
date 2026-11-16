/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { KillChainStage } from '../../src/types.js';

export interface AttackSignature {
  category: string;
  regex: RegExp;
  severity: 'critical' | 'high' | 'medium';
  mitre: { tactic: KillChainStage; technique: string };
}

/**
 * Hardened Deep Packet Inspection (DPI) HTTP attack signatures.
 * Avoids false positives on browser User-Agent semicolons, JSON punctuation,
 * or ordinary English words inside authenticated app routes.
 */
export const ATTACK_SIGNATURES: AttackSignature[] = [
  {
    category: 'SQL Injection (SQLi)',
    regex: /(\bUNION\s+(?:ALL\s+)?SELECT\b|\bSELECT\b.+\bFROM\b|\b(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+(?:TABLE|DATABASE)|ALTER\s+TABLE)\b|(?:'|%27)\s*(?:OR|AND)\s+['"\w]+\s*=\s*['"\w]+|\b(?:BENCHMARK|SLEEP)\s*\(\s*\d+\s*\))/i,
    severity: 'critical',
    mitre: { tactic: 'Initial Access', technique: 'T1190' },
  },
  {
    category: 'Cross-Site Scripting (XSS)',
    regex: /(<script\b|javascript:|onerror\s*=|onload\s*=|<iframe\b|<img\b[^>]*\bon\w+\s*=)/i,
    severity: 'high',
    mitre: { tactic: 'Execution', technique: 'T1059.007' },
  },
  {
    category: 'Path Traversal / LFI',
    regex: /(\.\.\/|\.\.\\|\/etc\/(?:passwd|shadow)|win\.ini|boot\.ini)/i,
    severity: 'high',
    mitre: { tactic: 'Defense Evasion', technique: 'T1083' },
  },
  {
    category: 'Reconnaissance / Vulnerability Scanner',
    regex: /(?:^|\/)(?:\.env\b|\.git\b|wp-login\.php|wp-admin\b|phpmyadmin\b|shell\b|cmd\b|actuator\b)/i,
    severity: 'medium',
    mitre: { tactic: 'Reconnaissance', technique: 'T1595' },
  },
  {
    category: 'Command Injection / Reverse Shell',
    regex: /((?:;|\||`|&&)\s*(?:\/bin\/)?(?:curl|wget|bash|sh|nc|ncat|powershell|python|perl)\b|\$\([^)]+\))/i,
    severity: 'critical',
    mitre: { tactic: 'Execution', technique: 'T1059.004' },
  },
];

const USER_AGENT_EXPLOIT_REGEX = /(\$\{jndi:|^\s*\(\)\s*\{)/i;

const BYPASS_DPI_PREFIXES = [
  '/api/auth/',
  '/api/profile/',
  '/api/ingest/',
  '/api/email-logs/',
  '/api/reports/',
  '/api/admin/',
  '/api/billing/',
  '/api/workbook/',
  '/api/certificates/',
  '/api/rules',
  '/api/probe/',
];

export function inspectHttpIngressPayload(params: {
  path: string;
  urlToScan: string;
  bodyString?: string;
  userAgent?: string;
}): AttackSignature | null {
  const { path, urlToScan, bodyString = '', userAgent = '' } = params;

  if (BYPASS_DPI_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return null;
  }

  // Only inspect request path/query + body for injection payloads (never normal browser UA semicolons)
  const payload = `${urlToScan} ${bodyString}`;
  for (const sig of ATTACK_SIGNATURES) {
    if (sig.regex.test(payload)) {
      return sig;
    }
  }

  // Explicitly detect known header exploit signatures (e.g., Log4Shell JNDI / Shellshock)
  if (USER_AGENT_EXPLOIT_REGEX.test(userAgent)) {
    return ATTACK_SIGNATURES[4];
  }

  return null;
}
