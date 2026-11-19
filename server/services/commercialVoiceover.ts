/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

export interface CommercialSceneScript {
  id: string;
  index: number;
  chapterLabel: string;
  title: string;
  kicker: string;
  narration: string;
  voiceStyle: string;
  fallbackDurationSec: number;
}

export const ALLOWED_COMMERCIAL_VOICES = ['Fenrir', 'Kore', 'Charon', 'Zephyr', 'Puck'] as const;
export type CommercialVoiceName = (typeof ALLOWED_COMMERCIAL_VOICES)[number];

export const DEFAULT_COMMERCIAL_VOICE: CommercialVoiceName = 'Fenrir';

export const COMMERCIAL_SCENES: CommercialSceneScript[] = [
  {
    id: 'opening',
    index: 0,
    chapterLabel: '01 · Threat Reality',
    title: 'Modern Networks Under Relentless Probe',
    kicker: 'THE CHALLENGE',
    narration:
      'Every second, enterprise networks face relentless intrusion attempts—from SQL injection and path traversal to automated secret scraping. Yet most security teams still jump between disconnected sniffers, endpoint consoles, and ticketing tools.',
    voiceStyle: 'Authoritative, calm cinematic tech commercial narrator, measured pacing with clear articulation',
    fallbackDurationSec: 11,
  },
  {
    id: 'nids-dpi',
    index: 1,
    chapterLabel: '02 · Network DPI',
    title: 'Wire-Level Network IDS & Deep Packet Inspection',
    kicker: 'ENCDEC NETWORK ENGINE',
    narration:
      'Meet EncDec IDS: a unified Hybrid Intrusion Detection and SOC Command Console. Its Network IDS dissects twelve standard protocols in real time, while Deep Packet Inspection flags SQL injection, cross-site scripting, traversal, and command injection the instant traffic hits the wire.',
    voiceStyle: 'Confident, polished enterprise product launch narrator, crisp emphasis on technical clarity',
    fallbackDurationSec: 13,
  },
  {
    id: 'hids-fleet',
    index: 2,
    chapterLabel: '03 · Host IDS',
    title: 'Per-User Isolated Host Fleets & Remote Quarantine',
    kicker: 'ENDPOINT VISIBILITY',
    narration:
      'Beyond the network perimeter, EncDec monitors Linux, Windows, and macOS hosts inside strictly isolated fleets. Inspect active processes, system daemons, and file integrity changes—and quarantine hostile files, processes, or IP addresses in a single click.',
    voiceStyle: 'Clear, authoritative enterprise commercial voiceover, steady broadcast cadence',
    fallbackDurationSec: 12,
  },
  {
    id: 'mitre-map',
    index: 3,
    chapterLabel: '04 · MITRE Hunting',
    title: 'Kill-Chain Correlation & Geodesic Threat Map',
    kicker: 'TACTICAL INCIDENT RESPONSE',
    narration:
      'Correlate raw telemetry from Suricata, Zeek, HIDS agents, and Syslog into structured MITRE ATT&CK kill-chain incidents, and trace inbound threat vectors across an embedded, offline-capable geodesic threat map.',
    voiceStyle: 'Engaging, authoritative broadcast narrator, crisp pacing',
    fallbackDurationSec: 11,
  },
  {
    id: 'dual-db-gmail',
    index: 4,
    chapterLabel: '05 · Dual DB & Gmail',
    title: 'Cloud Firestore + SQL Server & Workspace Dispatch',
    kicker: 'RESILIENT OPERATIONS',
    narration:
      'Every alert, rule update, and audit event synchronizes across Cloud Firestore and Microsoft SQL Server—paired with verified Google Workspace Gmail notifications, AI-assisted incident drafts, and six-digit OTP password recovery.',
    voiceStyle: 'Trustworthy, articulate enterprise technology commercial voiceover',
    fallbackDurationSec: 11,
  },
  {
    id: 'cesoc-cta',
    index: 5,
    chapterLabel: '06 · CE-SOC Academy',
    title: 'Train, Certify & Defend in One Platform',
    kicker: 'ENCDEC IDS',
    narration:
      'Upskill analysts inside the same workspace with the ten-chapter EncDec Workbook, a randomized ten-minute CE-SOC exam drawn from over two hundred twenty academic questions, and QR-verifiable credentials. Launch EncDec IDS today.',
    voiceStyle: 'Inspiring, decisive closing commercial narrator with a confident finish',
    fallbackDurationSec: 12,
  },
];

// Server-side in-memory cache of synthesized WAV buffers keyed by `${sceneId}:${voice}`
const wavCache = new Map<string, Buffer>();
const inFlightSynthesis = new Map<string, Promise<Buffer>>();

export function getCommercialSceneById(sceneId: string): CommercialSceneScript | undefined {
  return COMMERCIAL_SCENES.find((s) => s.id === sceneId);
}

export function normalizeCommercialVoice(rawVoice?: string): CommercialVoiceName {
  if (!rawVoice) return DEFAULT_COMMERCIAL_VOICE;
  const match = ALLOWED_COMMERCIAL_VOICES.find(
    (v) => v.toLowerCase() === rawVoice.trim().toLowerCase()
  );
  return match || DEFAULT_COMMERCIAL_VOICE;
}

export function getCachedCommercialVoiceover(
  sceneId: string,
  voice: CommercialVoiceName
): Buffer | undefined {
  return wavCache.get(`${sceneId}:${voice}`);
}

export function clearCommercialVoiceoverCache(): void {
  wavCache.clear();
  inFlightSynthesis.clear();
}

export async function synthesizeCommercialVoiceover(
  sceneId: string,
  requestedVoice?: string
): Promise<{ wavBuffer: Buffer; voice: CommercialVoiceName; cached: boolean; model: string }> {
  const scene = getCommercialSceneById(sceneId);
  if (!scene) {
    const err: any = new Error(`Unknown commercial scene: ${sceneId}`);
    err.statusCode = 404;
    throw err;
  }

  const voice = normalizeCommercialVoice(requestedVoice);
  const cacheKey = `${scene.id}:${voice}`;
  const model = 'gemini-3.8-flash-lite-tts';

  const existing = wavCache.get(cacheKey);
  if (existing) {
    return { wavBuffer: existing, voice, cached: true, model };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err: any = new Error('GEMINI_API_KEY is not configured on the server for studio TTS voiceover.');
    err.statusCode = 503;
    err.code = 'TTS_UNCONFIGURED';
    throw err;
  }

  // Deduplicate concurrent synthesis requests for the same scene + voice
  const pending = inFlightSynthesis.get(cacheKey);
  if (pending) {
    const wavBuffer = await pending;
    return { wavBuffer, voice, cached: true, model };
  }

  const synthesisTask = (async () => {
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let lastError: any = null;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: scene.narration,
                  speechMetadata: {
                    style: scene.voiceStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        });

        const base64Audio =
          response.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData
            ?.data || response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
          throw new Error('Gemini TTS returned an empty audio response.');
        }

        // Unary Gemini 3.8 TTS returns a complete RIFF WAV file (24kHz, mono, 16-bit)
        const wavBuffer = Buffer.from(base64Audio, 'base64');
        wavCache.set(cacheKey, wavBuffer);
        return wavBuffer;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('fetch');
        if (attempt < maxAttempts && isTransient) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }
        break;
      }
    }

    const wrapped: any = new Error(lastError?.message || 'Failed to synthesize commercial voiceover.');
    wrapped.statusCode = lastError?.status || 502;
    wrapped.code = 'TTS_SYNTHESIS_FAILED';
    throw wrapped;
  })();

  inFlightSynthesis.set(cacheKey, synthesisTask);

  try {
    const wavBuffer = await synthesisTask;
    return { wavBuffer, voice, cached: false, model };
  } finally {
    inFlightSynthesis.delete(cacheKey);
  }
}
