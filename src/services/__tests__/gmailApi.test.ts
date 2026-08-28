import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gmailApi from '../gmailApi.js';
import * as googleAuth from '../googleAuth.js';

describe('Gmail API Service Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles profile retrieval when token is valid', async () => {
    vi.spyOn(googleAuth, 'getGoogleAccessToken').mockResolvedValue('mock-token-xyz');
    
    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        emailAddress: 'operator@coou.edu.ng',
        messagesTotal: 450,
        threadsTotal: 120,
        historyId: '984712'
      })
    });
    global.fetch = mockFetch;

    const profile = await gmailApi.getGmailProfile();
    expect(profile.emailAddress).toBe('operator@coou.edu.ng');
    expect(profile.messagesTotal).toBe(450);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
  });

  it('throws informative error if OAuth token is missing', async () => {
    vi.spyOn(googleAuth, 'getGoogleAccessToken').mockResolvedValue(null);

    await expect(gmailApi.getGmailProfile()).rejects.toThrow('No Google Access Token available');
  });

  it('formats RFC-2822 email payload and sends message', async () => {
    vi.spyOn(googleAuth, 'getGoogleAccessToken').mockResolvedValue('mock-token-xyz');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg_984120',
        threadId: 'th_4120'
      })
    });
    global.fetch = mockFetch;

    const res = await gmailApi.sendGmailMessage({
      to: 'soc-lead@coou.edu.ng',
      subject: '[P1 Alert] DDoS Mitigation Initiated',
      body: 'High volume HTTP flood mitigated on gateway.'
    });

    expect(res.id).toBe('msg_984120');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
