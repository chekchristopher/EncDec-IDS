/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Subtitles,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Shield,
  Activity,
  Server,
  Globe,
  Database,
  Mail,
  GraduationCap,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Headphones,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import EncDecLogo from '../EncDecLogo.js';

export interface CommercialScene {
  id: string;
  index: number;
  chapterLabel: string;
  title: string;
  kicker: string;
  narration: string;
  fallbackDurationSec: number;
}

const DEFAULT_SCENES: CommercialScene[] = [
  {
    id: 'opening',
    index: 0,
    chapterLabel: '01 · Threat Reality',
    title: 'Modern Networks Under Relentless Probe',
    kicker: 'THE CHALLENGE',
    narration:
      'Every second, enterprise networks face relentless intrusion attempts—from SQL injection and path traversal to automated secret scraping. Yet most security teams still jump between disconnected sniffers, endpoint consoles, and ticketing tools.',
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
    fallbackDurationSec: 12,
  },
];

const VOICE_OPTIONS = [
  { id: 'Fenrir', label: 'Fenrir · Executive' },
  { id: 'Kore', label: 'Kore · Broadcast' },
  { id: 'Charon', label: 'Charon · Deep' },
  { id: 'Zephyr', label: 'Zephyr · Modern' },
] as const;

type VoiceMode = 'idle' | 'studio' | 'browser-fallback' | 'silent-error';

interface CommercialVideoPlayerProps {
  onEnterConsole: () => void;
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Subtle procedural Web Audio ambient bed that gently underscores the commercial
 * without competing with the voiceover. Fails silently on unsupported environments.
 */
class AmbientScoreEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private running = false;

  start(volume: number, muted: boolean) {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 260;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0;

        this.oscA = this.ctx.createOscillator();
        this.oscA.type = 'sine';
        this.oscA.frequency.value = 65.41; // C2

        this.oscB = this.ctx.createOscillator();
        this.oscB.type = 'triangle';
        this.oscB.frequency.value = 98.0; // G2 fifth

        this.oscA.connect(filter);
        this.oscB.connect(filter);
        filter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.oscA.start();
        this.oscB.start();
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.running = true;
      this.setLevel(volume, muted);
    } catch {
      // AudioContext blocked or unsupported (e.g. jsdom)
    }
  }

  setLevel(volume: number, muted: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const target = !this.running || muted ? 0 : Math.min(0.035, volume * 0.032);
    try {
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
    } catch {
      // ignore
    }
  }

  pulseSceneCue(volume: number, muted: boolean) {
    if (!this.ctx || muted || !this.running) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(523.25, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(Math.min(0.035, volume * 0.03), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.36);
    } catch {
      // ignore
    }
  }

  pause() {
    this.running = false;
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
      } catch {
        // ignore
      }
    }
  }

  dispose() {
    this.running = false;
    try {
      this.oscA?.stop();
      this.oscB?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.oscA = null;
    this.oscB = null;
    this.masterGain = null;
    this.ctx = null;
  }
}

export default function CommercialVideoPlayer({ onEnterConsole }: CommercialVideoPlayerProps) {
  const prefersReducedMotion = useReducedMotion();

  const [scenes, setScenes] = useState<CommercialScene[]>(DEFAULT_SCENES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0); // 0..1 within active scene
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>('Fenrir');
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track real measured durations per scene once studio WAV metadata loads
  const [sceneDurations, setSceneDurations] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEFAULT_SCENES.map((s) => [s.id, s.fallbackDurationSec]))
  );

  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const inflightFetchRef = useRef<Map<string, Promise<string>>>(new Map());
  const ambientRef = useRef<AmbientScoreEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const fallbackClockStartRef = useRef<number>(0);
  const fallbackPausedFractionRef = useRef<number>(0);
  const playSessionTokenRef = useRef<number>(0);

  // Keep latest mutable audio settings for async callbacks
  const mutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  const voiceRef = useRef(selectedVoice);
  const scenesRef = useRef(scenes);

  useEffect(() => {
    mutedRef.current = isMuted;
    volumeRef.current = volume;
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
    ambientRef.current?.setLevel(volume, isMuted);
  }, [isMuted, volume]);

  useEffect(() => {
    voiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  // Fetch authoritative commercial script from backend on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/landing/commercial-script')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data?.scenes || !Array.isArray(data.scenes) || data.scenes.length === 0) {
          return;
        }
        setScenes(data.scenes);
        setSceneDurations((prev) => {
          const next = { ...prev };
          for (const sc of data.scenes as CommercialScene[]) {
            if (!next[sc.id]) next[sc.id] = sc.fallbackDurationSec || 11;
          }
          return next;
        });
      })
      .catch(() => {
        // Use built-in verified DEFAULT_SCENES seamlessly
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const stopAllPlaybackResources = useCallback(() => {
    playSessionTokenRef.current += 1;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    ambientRef.current?.pause();
  }, []);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPlaybackResources();
      ambientRef.current?.dispose();
      audioCacheRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      audioCacheRef.current.clear();
    };
  }, [stopAllPlaybackResources]);

  const fetchVoiceoverAudioUrl = useCallback(async (sceneId: string, voice: string): Promise<string> => {
    const cacheKey = `${sceneId}:${voice}`;
    const cached = audioCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const existingPromise = inflightFetchRef.current.get(cacheKey);
    if (existingPromise) return existingPromise;

    const reqPromise = (async () => {
      const res = await fetch(
        `/api/landing/commercial-voiceover/${encodeURIComponent(sceneId)}?voice=${encodeURIComponent(voice)}`
      );
      if (!res.ok) {
        let message = `Studio voiceover unavailable (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error) message = errJson.error;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Empty audio payload received from voiceover service.');
      }
      const objectUrl = URL.createObjectURL(blob);
      audioCacheRef.current.set(cacheKey, objectUrl);
      return objectUrl;
    })();

    inflightFetchRef.current.set(cacheKey, reqPromise);
    try {
      return await reqPromise;
    } finally {
      inflightFetchRef.current.delete(cacheKey);
    }
  }, []);

  const prefetchNextScene = useCallback(
    (currentIdx: number, voice: string) => {
      const nextScene = scenesRef.current[currentIdx + 1];
      if (!nextScene) return;
      void fetchVoiceoverAudioUrl(nextScene.id, voice).catch(() => {
        // Prefetch errors are handled when the scene actually starts
      });
    },
    [fetchVoiceoverAudioUrl]
  );

  // Core scene playback orchestrator (Audio-synced Studio TTS with clean Browser Speech fallback)
  const playSceneAt = useCallback(
    async (index: number, startFraction = 0) => {
      const currentScenes = scenesRef.current;
      if (index < 0 || index >= currentScenes.length) return;

      stopAllPlaybackResources();
      const token = playSessionTokenRef.current;
      const scene = currentScenes[index];
      const activeVoice = voiceRef.current;

      setActiveIndex(index);
      setSceneProgress(startFraction);
      setHasStarted(true);
      setHasFinished(false);
      setIsPlaying(true);
      setIsBuffering(true);
      setVoiceNotice(null);

      if (!ambientRef.current) {
        ambientRef.current = new AmbientScoreEngine();
      }
      ambientRef.current.start(volumeRef.current, mutedRef.current);
      if (startFraction < 0.05) {
        ambientRef.current.pulseSceneCue(volumeRef.current, mutedRef.current);
      }

      const advanceOrFinish = () => {
        if (playSessionTokenRef.current !== token) return;
        if (index + 1 < scenesRef.current.length) {
          void playSceneAt(index + 1, 0);
        } else {
          stopAllPlaybackResources();
          setSceneProgress(1);
          setIsPlaying(false);
          setIsBuffering(false);
          setHasFinished(true);
        }
      };

      const startFallbackTimeline = (reason: string) => {
        if (playSessionTokenRef.current !== token) return;
        setIsBuffering(false);

        const durationSec = scene.fallbackDurationSec || 11;
        const durationMs = durationSec * 1000;
        fallbackPausedFractionRef.current = startFraction;
        fallbackClockStartRef.current = performance.now() - startFraction * durationMs;

        // Try browser Web Speech API narration so voiceover still speaks while the video plays
        let browserSpeechStarted = false;
        if (
          typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          typeof SpeechSynthesisUtterance !== 'undefined'
        ) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(scene.narration);
            utterance.rate = 0.98;
            utterance.pitch = 0.96;
            utterance.volume = mutedRef.current ? 0 : volumeRef.current;
            window.speechSynthesis.speak(utterance);
            browserSpeechStarted = true;
          } catch {
            browserSpeechStarted = false;
          }
        }

        setVoiceMode(browserSpeechStarted ? 'browser-fallback' : 'silent-error');
        setVoiceNotice(
          browserSpeechStarted
            ? `Using browser speech voiceover (${reason}).`
            : `Visual playback active (${reason}).`
        );

        const tickFallback = (now: number) => {
          if (playSessionTokenRef.current !== token) return;
          const elapsed = now - fallbackClockStartRef.current;
          const fraction = Math.min(1, Math.max(0, elapsed / durationMs));
          setSceneProgress(fraction);
          if (fraction >= 1) {
            advanceOrFinish();
            return;
          }
          rafRef.current = requestAnimationFrame(tickFallback);
        };
        rafRef.current = requestAnimationFrame(tickFallback);
      };

      try {
        const audioUrl = await fetchVoiceoverAudioUrl(scene.id, activeVoice);
        if (playSessionTokenRef.current !== token) return;

        // Pre-fetch the next scene's voiceover in the background for zero-gap transitions
        prefetchNextScene(index, activeVoice);

        const audio = new Audio(audioUrl);
        audio.muted = mutedRef.current;
        audio.volume = volumeRef.current;
        audioRef.current = audio;

        audio.onloadedmetadata = () => {
          if (playSessionTokenRef.current !== token) return;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setSceneDurations((prev) => ({ ...prev, [scene.id]: audio.duration }));
            if (startFraction > 0 && startFraction < 0.98) {
              audio.currentTime = audio.duration * startFraction;
            }
          }
        };

        audio.onended = () => {
          advanceOrFinish();
        };

        audio.onerror = () => {
          startFallbackTimeline('Audio playback error');
        };

        await audio.play();
        if (playSessionTokenRef.current !== token) {
          audio.pause();
          return;
        }

        setIsBuffering(false);
        setVoiceMode('studio');

        const tickAudioSync = () => {
          if (playSessionTokenRef.current !== token || !audioRef.current) return;
          const dur =
            Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0
              ? audioRef.current.duration
              : scene.fallbackDurationSec;
          const frac = Math.min(1, Math.max(0, audioRef.current.currentTime / dur));
          setSceneProgress(frac);
          if (!audioRef.current.paused && !audioRef.current.ended) {
            rafRef.current = requestAnimationFrame(tickAudioSync);
          }
        };
        rafRef.current = requestAnimationFrame(tickAudioSync);
      } catch (err: any) {
        startFallbackTimeline(err?.message || 'Studio voiceover unavailable');
      }
    },
    [fetchVoiceoverAudioUrl, prefetchNextScene, stopAllPlaybackResources]
  );

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      fallbackPausedFractionRef.current = sceneProgress;
      stopAllPlaybackResources();
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    if (hasFinished) {
      void playSceneAt(0, 0);
    } else {
      const resumeFrac = sceneProgress >= 0.98 ? 0 : sceneProgress;
      void playSceneAt(activeIndex, resumeFrac);
    }
  }, [activeIndex, hasFinished, isPlaying, playSceneAt, sceneProgress, stopAllPlaybackResources]);

  const handleSelectScene = useCallback(
    (index: number) => {
      if (index < 0 || index >= scenes.length) return;
      void playSceneAt(index, 0);
    },
    [playSceneAt, scenes.length]
  );

  const handleVoiceChange = useCallback(
    (nextVoice: string) => {
      setSelectedVoice(nextVoice);
      voiceRef.current = nextVoice;
      if (isPlaying) {
        void playSceneAt(activeIndex, 0);
      }
    },
    [activeIndex, isPlaying, playSceneAt]
  );

  const handleToggleFullscreen = useCallback(() => {
    const el = playerStageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  // Total & elapsed runtime calculation across all 6 scenes
  const { totalDurationSec, elapsedSec } = useMemo(() => {
    let total = 0;
    let elapsed = 0;
    scenes.forEach((sc, idx) => {
      const dur = sceneDurations[sc.id] || sc.fallbackDurationSec;
      total += dur;
      if (idx < activeIndex) {
        elapsed += dur;
      } else if (idx === activeIndex) {
        elapsed += dur * sceneProgress;
      }
    });
    return { totalDurationSec: total, elapsedSec: elapsed };
  }, [activeIndex, sceneDurations, sceneProgress, scenes]);

  const activeScene = scenes[activeIndex] || scenes[0];

  // Segment-aware subtitle chunk so long sentences read cleanly like broadcast captions
  const activeSubtitle = useMemo(() => {
    const sentences = activeScene.narration
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length <= 1) return activeScene.narration;
    const idx = Math.min(sentences.length - 1, Math.floor(sceneProgress * sentences.length));
    return sentences[idx];
  }, [activeScene.narration, sceneProgress]);

  return (
    <div className="space-y-5" id="commercial-video-player">
      {/* 16:9 Cinema Stage */}
      <div
        ref={playerStageRef}
        className="encdec-dark-card relative rounded-2xl border border-white/10 bg-slate-950 shadow-[0_36px_90px_-28px_rgba(2,6,23,0.92)] overflow-hidden select-none"
      >
        {/* Main 16:9 Motion Picture Viewport */}
        <div className="relative aspect-video w-full overflow-hidden bg-[#040915]">
          {/* Subtle cinema atmospheric radial lighting & subtle scan grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 35%, rgba(6,182,212,0.14), rgba(2,6,23,0.96) 72%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.35) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Top Broadcast HUD Overlay (Chapter Cue + Voiceover Status) */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-b from-slate-950/90 via-slate-950/45 to-transparent">
            <div className="flex items-center gap-2.5 min-w-0">
              <EncDecLogo size="sm" />
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-cyan-400 truncate">
                  {activeScene.chapterLabel}
                </p>
                <p className="text-xs font-semibold text-white truncate">
                  EncDec IDS — Official Product Film
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 shrink-0">
              {/* Animated voice waveform bars when actively narrating */}
              {isPlaying && !isBuffering && !isMuted && (
                <span
                  aria-label="Voiceover speaking"
                  className="inline-flex items-end gap-[2px] h-3.5"
                >
                  {[0.55, 1, 0.7, 0.9, 0.45].map((h, i) => (
                    <motion.span
                      key={i}
                      className="w-[2px] rounded-full bg-cyan-400"
                      animate={
                        prefersReducedMotion
                          ? { height: `${Math.round(h * 12)}px` }
                          : {
                              height: [
                                `${Math.max(3, Math.round(h * 5))}px`,
                                `${Math.round(h * 14)}px`,
                                `${Math.max(3, Math.round(h * 6))}px`,
                              ],
                            }
                      }
                      transition={{
                        duration: 0.65 + i * 0.08,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </span>
              )}
              <span className="hidden sm:inline text-slate-400">
                {isBuffering
                  ? 'Synthesizing voiceover...'
                  : voiceMode === 'studio'
                    ? `Studio Voice · ${selectedVoice}`
                    : voiceMode === 'browser-fallback'
                      ? 'Browser Speech Voiceover'
                      : 'Voiceover Ready'}
              </span>
            </div>
          </div>

          {/* Animated Commercial Scene Canvas */}
          <div className="relative z-10 h-full w-full flex items-center justify-center px-5 sm:px-10 pt-14 pb-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene.id}
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.01 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-4xl"
              >
                <CommercialSceneVisual
                  sceneId={activeScene.id}
                  scene={activeScene}
                  progress={sceneProgress}
                  isPlaying={isPlaying}
                  reducedMotion={Boolean(prefersReducedMotion)}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Closed Captions (Broadcast Subtitle Strip) */}
          {captionsOn && hasStarted && !hasFinished && (
            <div
              aria-live="polite"
              className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex justify-center"
            >
              <p className="max-w-3xl px-4 py-2 rounded-lg bg-slate-950/88 border border-white/10 text-center text-xs sm:text-sm text-slate-100 leading-relaxed shadow-lg">
                {activeSubtitle}
              </p>
            </div>
          )}

          {/* Buffering Indicator Overlay */}
          {isBuffering && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-xl">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Preparing studio voiceover ({selectedVoice})...</span>
              </div>
            </div>
          )}

          {/* Initial Poster Overlay (Before First Play) */}
          {!hasStarted && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/65 px-6 text-center">
              <button
                type="button"
                onClick={handleTogglePlay}
                id="commercial-poster-play-btn"
                aria-label="Play EncDec IDS commercial video with voiceover"
                className="group flex items-center gap-4 px-7 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm sm:text-base shadow-[0_20px_50px_-12px_rgba(6,182,212,0.55)] transition-transform duration-200 hover:scale-[1.03] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
              >
                <span className="w-10 h-10 rounded-full bg-slate-950/15 flex items-center justify-center">
                  <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
                </span>
                <span className="text-left">
                  <span className="block font-bold leading-tight">Watch Product Commercial</span>
                  <span className="block text-xs font-mono text-slate-900/80 mt-0.5">
                    Narrated Overview · 6 Chapters · {formatTime(totalDurationSec)}
                  </span>
                </span>
              </button>
              <p className="mt-4 text-xs font-mono text-slate-300 flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                <span>Includes studio voiceover narration &amp; synchronized closed captions</span>
              </p>
            </div>
          )}

          {/* End-Slate Action Overlay */}
          {hasFinished && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 px-6 text-center space-y-5">
              <div className="flex items-center gap-3">
                <EncDecLogo size="md" />
                <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  EncDec IDS
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-300 max-w-lg">
                Unified Network DPI, isolated Host IDS fleets, MITRE ATT&amp;CK hunting, Dual-Database audit storage, and CE-SOC certification.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onEnterConsole}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <span>Launch Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectScene(0)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Replay Commercial</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cinema Transport & Audio Control Bar */}
        <div className="border-t border-white/10 bg-slate-900/95 px-4 sm:px-5 py-3 space-y-2.5">
          {/* Segmented 6-Chapter Interactive Scrubber */}
          <div
            role="group"
            aria-label="Commercial timeline chapters"
            className="grid grid-cols-6 gap-1.5"
          >
            {scenes.map((sc, idx) => {
              const fillPct =
                idx < activeIndex
                  ? 100
                  : idx === activeIndex
                    ? Math.round(sceneProgress * 100)
                    : 0;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScene(idx)}
                  aria-label={`Jump to ${sc.chapterLabel}: ${sc.title}`}
                  className="group py-1.5 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
                >
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-100 ${
                        idx === activeIndex ? 'bg-cyan-400' : 'bg-cyan-500/70 group-hover:bg-cyan-400'
                      }`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Primary Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlay}
                id="commercial-play-toggle-btn"
                aria-label={isPlaying ? 'Pause commercial' : 'Play commercial'}
                className="w-9 h-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-slate-950" />
                ) : (
                  <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectScene(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                aria-label="Previous chapter"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-35 transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectScene(Math.min(scenes.length - 1, activeIndex + 1))}
                disabled={activeIndex === scenes.length - 1}
                aria-label="Next chapter"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-35 transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectScene(0)}
                aria-label="Restart commercial"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="ml-1 font-mono text-xs text-slate-300 tabular-nums">
                {formatTime(elapsedSec)} <span className="text-slate-600">/</span>{' '}
                {formatTime(totalDurationSec)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Mute & Volume */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  aria-label={isMuted ? 'Unmute voiceover' : 'Mute voiceover'}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setVolume(next);
                    if (next > 0 && isMuted) setIsMuted(false);
                  }}
                  aria-label="Voiceover volume"
                  className="hidden sm:block w-20 accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Narrator Voice Selector */}
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="sr-only">Narrator Voice</span>
                <select
                  aria-label="Select narrator voice"
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Closed Captions Toggle */}
              <button
                type="button"
                onClick={() => setCaptionsOn((c) => !c)}
                aria-label={captionsOn ? 'Hide closed captions' : 'Show closed captions'}
                aria-pressed={captionsOn}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                  captionsOn
                    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                    : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Subtitles className="w-3.5 h-3.5" />
                <span>CC</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {voiceNotice && (
            <p className="text-[11px] font-mono text-amber-300/90 flex items-center gap-1.5 pt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{voiceNotice}</span>
            </p>
          )}
        </div>
      </div>

      {/* 6-Chapter Storyboard Rail Below Player */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {scenes.map((sc, idx) => {
          const isCurrent = idx === activeIndex;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelectScene(idx)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                isCurrent
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                  : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <p className={`font-mono text-[10px] ${isCurrent ? 'text-cyan-400' : 'text-slate-500'}`}>
                {sc.chapterLabel}
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug line-clamp-2">{sc.title}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * CHOREOGRAPHED 16:9 COMMERCIAL SCENE VISUALS (SYNCED TO VOICEOVER PROGRESS)
 * ========================================================================== */

interface SceneVisualProps {
  sceneId: string;
  scene: CommercialScene;
  progress: number;
  isPlaying: boolean;
  reducedMotion: boolean;
}

function CommercialSceneVisual({
  sceneId,
  scene,
  progress,
  isPlaying,
  reducedMotion,
}: SceneVisualProps) {
  if (sceneId === 'opening') {
    const vectors = [
      { label: 'SQLi UNION SELECT', mitre: 'T1190', threshold: 0.12 },
      { label: 'Path Traversal /etc/passwd', mitre: 'T1083', threshold: 0.34 },
      { label: 'Automated .env Recon', mitre: 'T1595', threshold: 0.56 },
      { label: 'Shell Command Injection', mitre: 'T1059.004', threshold: 0.74 },
    ];

    return (
      <div className="grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-6 space-y-3">
          <p className="font-mono text-xs text-amber-400 tracking-wider">{scene.kicker}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            Fragmented security tools leave blind spots when attacks strike.
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Network probes, host tampering, and incident escalations happen simultaneously—demanding one unified command console.
          </p>
        </div>

        <div className="md:col-span-6 rounded-xl border border-white/10 bg-slate-900/75 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/10 pb-2">
            <span>INBOUND PERIMETER TELEMETRY</span>
            <span className="text-amber-400">HIGH PROBE ACTIVITY</span>
          </div>
          {vectors.map((v, idx) => {
            const lit = progress >= v.threshold || !isPlaying;
            return (
              <motion.div
                key={v.label}
                initial={{ opacity: 0.35, x: reducedMotion ? 0 : 10 }}
                animate={{ opacity: lit ? 1 : 0.35, x: lit ? 0 : 8 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono ${
                  lit
                    ? 'border-amber-500/35 bg-amber-950/25 text-amber-100'
                    : 'border-white/5 bg-slate-950/60 text-slate-500'
                }`}
              >
                <span className="truncate">{v.label}</span>
                <span className="text-[10px] text-amber-400 shrink-0 ml-2">{v.mitre}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  if (sceneId === 'nids-dpi') {
    const protocols = ['TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'HTTPS', 'ARP', 'DHCP', 'SMTP', 'FTP', 'SSH', 'SMB'];
    const activeProtoIdx = Math.floor(progress * protocols.length) % protocols.length;

    return (
      <div className="grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-5 space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-cyan-400">
            <Activity className="w-4 h-4" />
            <span>{scene.kicker}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            12-Protocol Network IDS &amp; Real-Time HTTP DPI
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Signature, behavioral, and anomaly rules inspect every frame and flag exploit payloads the millisecond they cross the wire.
          </p>
        </div>

        <div className="md:col-span-7 rounded-xl border border-cyan-500/25 bg-slate-900/80 p-4 space-y-3.5">
          <div className="grid grid-cols-6 gap-1.5">
            {protocols.map((proto, idx) => {
              const active = idx <= activeProtoIdx;
              return (
                <div
                  key={proto}
                  className={`py-1.5 text-center rounded font-mono text-[11px] border transition-colors ${
                    idx === activeProtoIdx && isPlaying
                      ? 'border-cyan-400 bg-cyan-500/25 text-white font-semibold'
                      : active
                        ? 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300'
                        : 'border-white/5 bg-slate-950/70 text-slate-500'
                  }`}
                >
                  {proto}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-slate-950 border border-white/10 p-3 font-mono text-[11px] space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>DPI GATEWAY INTERCEPT</span>
              <span className="text-emerald-400">ACTIVE</span>
            </div>
            <p className="text-cyan-300 truncate">
              POST /api/probe/live-attack → UNION SELECT credential extraction
            </p>
            <div className="flex items-center justify-between pt-1 text-emerald-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                MITRE T1190 Signature Matched &amp; Logged
              </span>
              <span className="text-slate-400 tabular-nums">{Math.round(progress * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sceneId === 'hids-fleet') {
    const hosts = [
      { name: 'edge-gateway-lnx-01', os: 'Linux', cpu: 18, mem: 42, status: 'Protected' },
      { name: 'ad-controller-win-02', os: 'Windows', cpu: 26, mem: 58, status: 'Protected' },
      { name: 'soc-workstation-mac-03', os: 'macOS', cpu: 14, mem: 37, status: 'Quarantine Ready' },
    ];
    const quarantineEngaged = progress >= 0.55;

    return (
      <div className="grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-5 space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-sky-400">
            <Server className="w-4 h-4" />
            <span>{scene.kicker}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            Isolated Host IDS Fleets Across Linux, Windows &amp; macOS
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Track live process stacks, daemon health, and file integrity—with one-click IP, process, file, or host quarantine.
          </p>
        </div>

        <div className="md:col-span-7 space-y-2.5">
          {hosts.map((host) => (
            <div
              key={host.name}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-white truncate">{host.name}</p>
                <p className="text-[11px] text-slate-400">{host.os} · HIDS Agent</p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums shrink-0">
                <span className="text-cyan-300">CPU {host.cpu}%</span>
                <span className="text-sky-300">MEM {host.mem}%</span>
                <span
                  className={
                    quarantineEngaged && host.os === 'macOS' ? 'text-amber-300' : 'text-emerald-400'
                  }
                >
                  {quarantineEngaged && host.os === 'macOS' ? 'Isolated' : host.status}
                </span>
              </div>
            </div>
          ))}

          <div
            className={`rounded-lg border px-3.5 py-2.5 flex items-center justify-between text-xs font-mono transition-colors ${
              quarantineEngaged
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-white/10 bg-slate-950/70 text-slate-400'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              {quarantineEngaged
                ? 'Remote Quarantine Policy Broadcasted via WebSocket'
                : 'Monitoring Process Trees & File Integrity Logs'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (sceneId === 'mitre-map') {
    const stages = [
      { code: 'T1595', label: 'Reconnaissance' },
      { code: 'T1190', label: 'Initial Access' },
      { code: 'T1059', label: 'Execution' },
      { code: 'T1041', label: 'Containment' },
    ];
    const activeStage = Math.min(stages.length - 1, Math.floor(progress * stages.length));

    return (
      <div className="grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-5 space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-amber-400">
            <Globe className="w-4 h-4" />
            <span>{scene.kicker}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            MITRE ATT&amp;CK Correlation &amp; Geodesic Threat Telemetry
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Fuse Suricata, Zeek, HIDS, and Syslog streams onto an offline-capable D3 TopoJSON world map.
          </p>
        </div>

        <div className="md:col-span-7 rounded-xl border border-white/10 bg-slate-900/80 p-4 space-y-3">
          {/* Stylized Geodesic Telemetry Arcs SVG */}
          <svg
            viewBox="0 0 460 150"
            className="w-full h-32 rounded-lg bg-slate-950 border border-white/10"
            aria-hidden="true"
          >
            <g stroke="rgba(56,189,248,0.14)" strokeWidth="1" fill="none">
              <line x1="0" y1="38" x2="460" y2="38" />
              <line x1="0" y1="75" x2="460" y2="75" />
              <line x1="0" y1="112" x2="460" y2="112" />
              <line x1="115" y1="0" x2="115" y2="150" />
              <line x1="230" y1="0" x2="230" y2="150" />
              <line x1="345" y1="0" x2="345" y2="150" />
            </g>
            {/* Geodesic Attack Trajectories converging on SOC Core */}
            <path
              d="M 55 110 Q 145 20 230 75"
              stroke="#f59e0b"
              strokeWidth="2"
              fill="none"
              strokeDasharray="240"
              strokeDashoffset={Math.max(0, 240 - progress * 340)}
            />
            <path
              d="M 405 105 Q 315 18 230 75"
              stroke="#22d3ee"
              strokeWidth="2"
              fill="none"
              strokeDasharray="240"
              strokeDashoffset={Math.max(0, 240 - progress * 300)}
            />
            <path
              d="M 110 30 Q 170 40 230 75"
              stroke="#38bdf8"
              strokeWidth="1.6"
              fill="none"
              strokeDasharray="160"
              strokeDashoffset={Math.max(0, 160 - progress * 220)}
            />
            <circle cx="55" cy="110" r="4" fill="#f59e0b" />
            <circle cx="405" cy="105" r="4" fill="#22d3ee" />
            <circle cx="110" cy="30" r="3.5" fill="#38bdf8" />
            <circle cx="230" cy="75" r="7" fill="rgba(6,182,212,0.22)" stroke="#22d3ee" strokeWidth="1.5" />
            <circle cx="230" cy="75" r="3" fill="#22d3ee" />
          </svg>

          <div className="grid grid-cols-4 gap-2">
            {stages.map((st, idx) => (
              <div
                key={st.code}
                className={`p-2 rounded-lg border text-center font-mono transition-colors ${
                  idx <= activeStage
                    ? 'border-cyan-500/40 bg-cyan-950/35 text-cyan-200'
                    : 'border-white/5 bg-slate-950/60 text-slate-500'
                }`}
              >
                <p className="text-[10px] text-cyan-400">{st.code}</p>
                <p className="text-[11px] font-sans font-medium truncate mt-0.5">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sceneId === 'dual-db-gmail') {
    return (
      <div className="grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-5 space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-emerald-400">
            <Database className="w-4 h-4" />
            <span>{scene.kicker}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            Dual-Database Persistence &amp; Verified Gmail Operations
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Sync operational telemetry between Cloud Firestore and Microsoft SQL Server while sending authenticated incident alerts and 6-digit OTP resets.
          </p>
        </div>

        <div className="md:col-span-7 grid sm:grid-cols-2 gap-3.5">
          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Database className="w-4 h-4" />
              <span>DUAL PERSISTENCE</span>
            </div>
            <p className="text-sm font-semibold text-white">Firestore + MS SQL Server</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time NoSQL sync paired with relational MSSQL replication and read-only SQL table inspection.
            </p>
            <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-[width] duration-150"
                style={{ width: `${Math.min(100, Math.round(progress * 115))}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Mail className="w-4 h-4" />
              <span>GMAIL DISPATCH</span>
            </div>
            <p className="text-sm font-semibold text-white">OAuth Alerts &amp; 6-Digit OTP</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Login security notices, AI-assisted incident drafts, and Gmail OTP recovery with full audit logging.
            </p>
            <div className="font-mono text-[11px] text-cyan-300 bg-slate-950 border border-white/10 rounded px-2.5 py-1.5">
              OTP VERIFY · 6-DIGIT · TLS/OAUTH
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Final scene: cesoc-cta
  return (
    <div className="text-center max-w-3xl mx-auto space-y-5">
      <div className="inline-flex items-center gap-2 font-mono text-xs text-cyan-400">
        <GraduationCap className="w-4 h-4" />
        <span>CE-SOC CERTIFICATION ACADEMY</span>
      </div>
      <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
        Defend Your Infrastructure. Certify Your Analysts.
      </h3>
      <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto pt-1">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3.5">
          <p className="font-mono text-lg sm:text-xl font-bold text-cyan-400 tabular-nums">10</p>
          <p className="text-[11px] text-slate-300 mt-0.5">Workbook Chapters</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3.5">
          <p className="font-mono text-lg sm:text-xl font-bold text-white tabular-nums">220+</p>
          <p className="text-[11px] text-slate-300 mt-0.5">Randomized Exam Bank</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3.5">
          <p className="font-mono text-lg sm:text-xl font-bold text-emerald-400 tabular-nums">QR</p>
          <p className="text-[11px] text-slate-300 mt-0.5">Public Registry Verify</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2.5 pt-2 text-xs font-mono text-slate-400">
        <Shield className="w-4 h-4 text-cyan-400" />
        <span>ENCDEC IDS · HYBRID INTRUSION DETECTION &amp; SOC COMMAND CONSOLE</span>
      </div>
    </div>
  );
}
