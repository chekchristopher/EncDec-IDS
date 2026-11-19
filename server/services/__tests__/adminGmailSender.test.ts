import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_ADMIN_OAUTH_TTL_MS,
  setAdminGmailSenderSession,
  getActiveAdminGmailSender,
  getAdminGmailSenderStatus,
  clearAdminGmailSenderSession,
  setAdminGmailRefreshMode,
  getAdminGmailRefreshMode,
  recordAdminGmailAutoRefreshFailure,
} from '../adminGmailSender.js';

describe('adminGmailSender in-memory session store', () => {
  beforeEach(() => {
    clearAdminGmailSenderSession();
  });

  it('starts disconnected in automatic mode', () => {
    expect(getActiveAdminGmailSender()).toBeNull();
    expect(getAdminGmailRefreshMode()).toBe('auto');
    expect(getAdminGmailSenderStatus()).toEqual({
      connected: false,
      email: null,
      connectedAt: null,
      expiresAt: null,
      remainingMinutes: 0,
      refreshMode: 'auto',
      autoRefreshWindowMinutes: 5,
      lastConnectedEmail: null,
      lastAutoRefreshAt: null,
      lastAutoRefreshError: null,
    });
  });

  it('stores active session, records lastConnectedEmail, and masks accessToken in status', () => {
    const now = 1_700_000_000_000;
    const status = setAdminGmailSenderSession({
      accessToken: 'ya29.secret_token_123',
      email: 'chekchris85@gmail.com',
      userId: 'usr_1',
      now,
    });

    expect(status.connected).toBe(true);
    expect(status.email).toBe('chekchris85@gmail.com');
    expect(status.lastConnectedEmail).toBe('chekchris85@gmail.com');
    expect(status.lastAutoRefreshAt).toBeNull();
    expect(status.remainingMinutes).toBe(55);
    expect((status as any).accessToken).toBeUndefined();

    const active = getActiveAdminGmailSender(now + 10_000);
    expect(active?.accessToken).toBe('ya29.secret_token_123');
    expect(active?.email).toBe('chekchris85@gmail.com');
  });

  it('tracks silent auto-refresh timestamps and clears prior errors', () => {
    const now = 1_700_000_000_000;
    recordAdminGmailAutoRefreshFailure('Google requires interactive consent.', now);
    expect(getAdminGmailSenderStatus(now).lastAutoRefreshError).toBe('Google requires interactive consent.');

    const refreshed = setAdminGmailSenderSession({
      accessToken: 'ya29.renewed_token_456',
      email: 'chekchris85@gmail.com',
      userId: 'usr_1',
      now: now + 60_000,
      silentRefresh: true,
    });

    expect(refreshed.connected).toBe(true);
    expect(refreshed.lastAutoRefreshError).toBeNull();
    expect(refreshed.lastAutoRefreshAt).toBe(new Date(now + 60_000).toISOString());
  });

  it('switches cleanly between automatic and manual refresh modes and preserves mode on disconnect', () => {
    setAdminGmailSenderSession({
      accessToken: 'ya29.secret_token_123',
      email: 'chekchris85@gmail.com',
      userId: 'usr_1',
    });

    const manualStatus = setAdminGmailRefreshMode('manual');
    expect(manualStatus.refreshMode).toBe('manual');
    expect(getAdminGmailRefreshMode()).toBe('manual');

    clearAdminGmailSenderSession({ preserveMode: true });
    const afterDisconnect = getAdminGmailSenderStatus();
    expect(afterDisconnect.connected).toBe(false);
    expect(afterDisconnect.lastConnectedEmail).toBeNull();
    expect(afterDisconnect.refreshMode).toBe('manual');
  });

  it('auto-expires session after TTL while retaining lastConnectedEmail for silent recovery', () => {
    const now = 1_700_000_000_000;
    setAdminGmailSenderSession({
      accessToken: 'ya29.secret_token_123',
      email: 'chekchris85@gmail.com',
      userId: 'usr_1',
      now,
    });

    const expiredAt = now + DEFAULT_ADMIN_OAUTH_TTL_MS + 1;
    expect(getActiveAdminGmailSender(expiredAt)).toBeNull();
    const status = getAdminGmailSenderStatus(expiredAt);
    expect(status.connected).toBe(false);
    expect(status.lastConnectedEmail).toBe('chekchris85@gmail.com');
  });
});
