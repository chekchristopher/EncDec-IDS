/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_ADMIN_OAUTH_TTL_MS = 55 * 60 * 1000; // 55 minutes (Google access tokens expire at 60m)
export const AUTO_REFRESH_WINDOW_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

export type AdminGmailRefreshMode = 'auto' | 'manual';

export interface AdminGmailSenderSession {
  accessToken: string;
  email: string;
  connectedByUserId: string;
  connectedAt: string;
  expiresAt: number;
}

export interface AdminGmailSenderStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  expiresAt: number | null;
  remainingMinutes: number;
  refreshMode: AdminGmailRefreshMode;
  autoRefreshWindowMinutes: number;
  lastConnectedEmail: string | null;
  lastAutoRefreshAt: string | null;
  lastAutoRefreshError: string | null;
}

let activeAdminGmailSession: AdminGmailSenderSession | null = null;
let refreshMode: AdminGmailRefreshMode = 'auto';
let lastConnectedEmail: string | null = null;
let lastAutoRefreshAt: string | null = null;
let lastAutoRefreshError: string | null = null;

export function setAdminGmailRefreshMode(
  mode: AdminGmailRefreshMode,
  now: number = Date.now()
): AdminGmailSenderStatus {
  refreshMode = mode === 'manual' ? 'manual' : 'auto';
  if (refreshMode === 'auto') {
    lastAutoRefreshError = null;
  }
  return getAdminGmailSenderStatus(now);
}

export function getAdminGmailRefreshMode(): AdminGmailRefreshMode {
  return refreshMode;
}

export function setAdminGmailLastEmail(
  email: string | null,
  now: number = Date.now()
): AdminGmailSenderStatus {
  const clean = email ? email.trim() : '';
  lastConnectedEmail = clean || null;
  return getAdminGmailSenderStatus(now);
}

export function recordAdminGmailAutoRefreshFailure(
  error: string,
  now: number = Date.now()
): AdminGmailSenderStatus {
  lastAutoRefreshError = (error || 'Silent Gmail refresh requires re-authorization.').trim();
  return getAdminGmailSenderStatus(now);
}

export function clearAdminGmailAutoRefreshFailure(now: number = Date.now()): AdminGmailSenderStatus {
  lastAutoRefreshError = null;
  return getAdminGmailSenderStatus(now);
}

export function setAdminGmailSenderSession(params: {
  accessToken: string;
  email: string;
  userId: string;
  ttlMs?: number;
  now?: number;
  silentRefresh?: boolean;
}): AdminGmailSenderStatus {
  const now = params.now ?? Date.now();
  const ttlMs = params.ttlMs ?? DEFAULT_ADMIN_OAUTH_TTL_MS;
  const cleanEmail = params.email.trim();

  activeAdminGmailSession = {
    accessToken: params.accessToken.trim(),
    email: cleanEmail,
    connectedByUserId: params.userId,
    connectedAt: new Date(now).toISOString(),
    expiresAt: now + ttlMs,
  };

  lastConnectedEmail = cleanEmail;
  lastAutoRefreshError = null;
  if (params.silentRefresh) {
    lastAutoRefreshAt = new Date(now).toISOString();
  }

  return getAdminGmailSenderStatus(now);
}

export function getActiveAdminGmailSender(now: number = Date.now()): AdminGmailSenderSession | null {
  if (!activeAdminGmailSession) return null;
  if (now >= activeAdminGmailSession.expiresAt) {
    activeAdminGmailSession = null;
    return null;
  }
  return activeAdminGmailSession;
}

export function getAdminGmailSenderStatus(now: number = Date.now()): AdminGmailSenderStatus {
  const session = getActiveAdminGmailSender(now);
  const autoRefreshWindowMinutes = Math.round(AUTO_REFRESH_WINDOW_MS / 60000);

  if (!session) {
    return {
      connected: false,
      email: null,
      connectedAt: null,
      expiresAt: null,
      remainingMinutes: 0,
      refreshMode,
      autoRefreshWindowMinutes,
      lastConnectedEmail,
      lastAutoRefreshAt,
      lastAutoRefreshError,
    };
  }

  return {
    connected: true,
    email: session.email,
    connectedAt: session.connectedAt,
    expiresAt: session.expiresAt,
    remainingMinutes: Math.max(1, Math.ceil((session.expiresAt - now) / 60000)),
    refreshMode,
    autoRefreshWindowMinutes,
    lastConnectedEmail,
    lastAutoRefreshAt,
    lastAutoRefreshError,
  };
}

export function markAdminGmailSessionExpired(
  reason: string = 'Admin Gmail OAuth session expired. Reconnect once to resume delivery.',
  now: number = Date.now()
): AdminGmailSenderStatus {
  activeAdminGmailSession = null;
  lastAutoRefreshError = reason;
  return getAdminGmailSenderStatus(now);
}

export function clearAdminGmailSenderSession(options?: { preserveMode?: boolean }): void {
  activeAdminGmailSession = null;
  lastConnectedEmail = null;
  lastAutoRefreshAt = null;
  lastAutoRefreshError = null;
  if (!options?.preserveMode) {
    refreshMode = 'auto';
  }
}
