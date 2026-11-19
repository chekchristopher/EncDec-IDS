// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext.js';
import LandingPage from '../LandingPage.js';

function setupBrowserShims() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as any).IntersectionObserver = MockIntersectionObserver;

  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as any).ResizeObserver = MockResizeObserver;

  // Ensure WebGL getContext returns null in jsdom so CyberDefenseCanvas3D exercises its graceful SVG fallback
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as any;
}

describe('LandingPage 3D Public Experience', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    setupBrowserShims();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/health') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            uptimeSeconds: 3665,
            memory: { rssMb: 94 },
            services: {
              firestore: { available: true },
              mssql: { connected: false, status: 'standby_local_mode' },
              websocket: { activeClients: 3 },
            },
          }),
        } as Response;
      }

      if (url === '/api/certificates/stats') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            totalCertified: 14,
            averageScore: 91,
          }),
        } as Response;
      }

      if (url === '/api/probe/live-attack' && init?.method === 'POST') {
        const parsed = JSON.parse(String(init.body || '{}'));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            vector: String(parsed.vector || 'sqli').toUpperCase(),
            targetEndpoint: '/api/probe/trap?q=1%27%20UNION%20SELECT',
            attackerOriginIp: '185.220.101.42',
            message: 'Real loopback SQLi exploit packet intercepted by DPI middleware.',
          }),
        } as Response;
      }

      if (url.startsWith('/api/certificates/verify/')) {
        const certId = decodeURIComponent(url.replace('/api/certificates/verify/', ''));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            verified: true,
            certificate: {
              certificateId: certId,
              fullName: 'Elena Rostova',
              courseTitle: 'Certified EncDec SOC Analyst (CE-SOC)',
              quizScore: 96,
              issueDate: '2026-03-14',
              verificationCode: 'VRF-9821-ENCDEC',
            },
          }),
        } as Response;
      }

      if (url === '/api/landing/commercial-script') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            studioTtsConfigured: true,
            defaultVoice: 'Fenrir',
            voices: ['Fenrir', 'Kore', 'Charon', 'Zephyr', 'Puck'],
          }),
        } as Response;
      }

      if (url.startsWith('/api/landing/commercial-voiceover/')) {
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'audio/wav' }),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock);
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-wav-url');
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-wav-url');
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    }

    class MockAudio {
      src: string;
      muted = false;
      volume = 1;
      duration = 10;
      currentTime = 0;
      paused = false;
      ended = false;
      onloadedmetadata: (() => void) | null = null;
      onended: (() => void) | null = null;
      ontimeupdate: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(src: string) {
        this.src = src;
      }
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn().mockImplementation(() => {
        this.paused = true;
      });
    }
    vi.stubGlobal('Audio', MockAudio as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders hero, navigation, WebGL fallback, and hydrates only verified public endpoints', async () => {
    const onEnterConsole = vi.fn();

    render(
      <ThemeProvider>
        <LandingPage onEnterConsole={onEnterConsole} />
      </ThemeProvider>
    );

    // Brand and headline presence
    expect(screen.getAllByText('EncDec IDS').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { level: 1 })
    ).toBeTruthy();

    // Hydrates live public health and certification metrics without hitting authenticated endpoints
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/health');
      expect(fetchMock).toHaveBeenCalledWith('/api/certificates/stats');
    });

    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls).not.toContain('/api/alerts');
    expect(calledUrls).not.toContain('/api/metrics');

    // Primary CTA triggers onEnterConsole callback
    const launchButtons = screen.getAllByRole('button', { name: /launch console/i });
    expect(launchButtons.length).toBeGreaterThan(0);
    fireEvent.click(launchButtons[0]);
    expect(onEnterConsole).toHaveBeenCalledTimes(1);
  });

  it('switches interactive 3D showcase tabs and executes live DPI probe and certificate lookup', async () => {
    const onEnterConsole = vi.fn();

    render(
      <ThemeProvider>
        <LandingPage onEnterConsole={onEnterConsole} />
      </ThemeProvider>
    );

    // Dispatch a real SQL Injection probe on the default Live DPI Probe tab
    const sqliButton = screen.getByRole('button', { name: /SQL Injection/i });
    fireEvent.click(sqliButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/probe/live-attack',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ vector: 'sqli' }),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Real loopback SQLi exploit packet intercepted by DPI middleware/i)
      ).toBeTruthy();
    });

    // Switch through Representative UI Preview tabs
    fireEvent.click(screen.getByRole('tab', { name: /SOC Overview/i }));
    await waitFor(() => {
      expect(screen.getByText(/Representative UI preview/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Host IDS Fleet/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/edge-gateway-lnx-01/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('tab', { name: /MITRE Hunting/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Initial Access/i).length).toBeGreaterThan(0);
    });

    // Switch to CE-SOC Verify tab and verify certificate ID against live registry endpoint
    fireEvent.click(screen.getByRole('tab', { name: /CE-SOC Verify/i }));
    const verifyButton = await screen.findByRole('button', { name: /Verify Credential/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/certificates/verify/CERT-ENCDEC-2026-X892A'
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Elena Rostova/i)).toBeTruthy();
    });
  });

  it('plays the narrated product commercial, requests studio TTS voiceover, and switches chapters', async () => {
    const onEnterConsole = vi.fn();

    render(
      <ThemeProvider>
        <LandingPage onEnterConsole={onEnterConsole} />
      </ThemeProvider>
    );

    const playPosterBtn = screen.getByRole('button', {
      name: /Play EncDec IDS commercial video with voiceover/i,
    });
    fireEvent.click(playPosterBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/landing/commercial-voiceover/opening?voice=Fenrir'
      );
    });

    // Prefetches next scene voiceover automatically
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/landing/commercial-voiceover/nids-dpi?voice=Fenrir'
      );
    });

    // Closed captions show active narration text
    await waitFor(() => {
      expect(
        screen.getByText(/Every second, enterprise networks face relentless intrusion attempts/i)
      ).toBeTruthy();
    });

    // Jump directly to Chapter 6 (CE-SOC Academy)
    fireEvent.click(screen.getByRole('button', { name: /Jump to 06 · CE-SOC Academy/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/landing/commercial-voiceover/cesoc-cta?voice=Fenrir'
      );
    });
  });
});
