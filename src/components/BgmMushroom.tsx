import { useCallback, useEffect, useRef, useState } from 'react';

interface BgmMushroomProps {
  audioUrl?: string;
  iconUrl?: string;
  variant?: 'default' | 'winter';
  enableSpringBirds?: boolean;
  autoPlay?: boolean;
  targetVolume?: number;
  fadeInDurationMs?: number;
  fadeOutDurationMs?: number;
}

const DEFAULT_TARGET_VOLUME = 0.35;
const DEFAULT_FADE_IN_MS = 1200;
const DEFAULT_FADE_OUT_MS = 800;

export default function BgmMushroom({
  audioUrl = '',
  iconUrl = '/assets/bgm-mushroom.png',
  variant = 'default',
  enableSpringBirds = false,
  autoPlay = false,
  targetVolume = DEFAULT_TARGET_VOLUME,
  fadeInDurationMs = DEFAULT_FADE_IN_MS,
  fadeOutDurationMs = DEFAULT_FADE_OUT_MS,
}: BgmMushroomProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [iconAvailable, setIconAvailable] = useState(true);
  const [iceCrackPulse, setIceCrackPulse] = useState(0);
  const [awaitingAutoResume, setAwaitingAutoResume] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const birdLoopTimerRef = useRef<number | null>(null);
  const hasAttemptedAutoPlayRef = useRef(false);

  const playIceCrack = useCallback(() => {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const now = ctx.currentTime;

    const ping = (freq: number, delay: number, dur: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.38, now + delay + dur * 0.2);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.74, now + delay + dur);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    };

    ping(1200, 0, 0.14, 0.06);
    ping(1840, 0.04, 0.12, 0.04);
    ping(980, 0.08, 0.16, 0.035);

    window.setTimeout(() => {
      void ctx.close();
    }, 520);
  }, []);

  const playBirdChirp = useCallback(() => {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const now = ctx.currentTime;

    const chirp = (baseFreq: number, delay: number, dur: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + delay + dur * 0.42);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.86, now + delay + dur);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.015);
    };

    const base = 1650 + Math.random() * 520;
    chirp(base, 0, 0.09, 0.035);
    chirp(base * 1.06, 0.095, 0.09, 0.028);

    if (Math.random() > 0.6) {
      chirp(base * 0.92, 0.22, 0.08, 0.022);
    }

    window.setTimeout(() => {
      void ctx.close();
    }, 680);
  }, []);

  const clearBirdLoopTimer = useCallback(() => {
    if (birdLoopTimerRef.current !== null) {
      window.clearTimeout(birdLoopTimerRef.current);
      birdLoopTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIconAvailable(true);
  }, [iconUrl]);

  useEffect(() => {
    if (!audioUrl) {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    return () => {
      if (fadeRafRef.current !== null) {
        window.cancelAnimationFrame(fadeRafRef.current);
      }
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const fadeVolume = useCallback((nextVolume: number, durationMs: number, onDone?: () => void) => {
    const audio = audioRef.current;
    if (!audio) {
      onDone?.();
      return;
    }

    if (fadeRafRef.current !== null) {
      window.cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }

    const start = performance.now();
    const from = audio.volume;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / Math.max(1, durationMs));
      audio.volume = from + (nextVolume - from) * progress;

      if (progress < 1) {
        fadeRafRef.current = window.requestAnimationFrame(step);
      } else {
        fadeRafRef.current = null;
        onDone?.();
      }
    };

    fadeRafRef.current = window.requestAnimationFrame(step);
  }, []);

  const startPlayback = useCallback(async (triggeredByAutoPlay = false) => {
    const audio = audioRef.current;

    setIsPlaying(true);
    if (variant === 'winter') {
      setIceCrackPulse((v) => v + 1);
      playIceCrack();
    }

    if (!audio) {
      return;
    }

    try {
      audio.volume = 0;
      await audio.play();
      fadeVolume(Math.max(0, Math.min(1, targetVolume)), fadeInDurationMs);
      setAwaitingAutoResume(false);
    } catch {
      if (triggeredByAutoPlay) {
        setIsPlaying(false);
        setAwaitingAutoResume(true);
      }
    }
  }, [fadeInDurationMs, fadeVolume, playIceCrack, targetVolume, variant]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    setIsPlaying(false);
    setAwaitingAutoResume(false);

    if (!audio) {
      return;
    }

    fadeVolume(0, fadeOutDurationMs, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, [fadeOutDurationMs, fadeVolume]);

  const handleToggle = useCallback(async () => {
    if (!isPlaying) {
      await startPlayback(false);
      return;
    }

    stopPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);

  useEffect(() => {
    if (!autoPlay || hasAttemptedAutoPlayRef.current) {
      return;
    }

    hasAttemptedAutoPlayRef.current = true;
    void startPlayback(true);
  }, [autoPlay, startPlayback]);

  useEffect(() => {
    if (!awaitingAutoResume) {
      return;
    }

    const resumePlayback = () => {
      setAwaitingAutoResume(false);
      void startPlayback(false);
    };

    window.addEventListener('pointerdown', resumePlayback, { once: true });
    window.addEventListener('keydown', resumePlayback, { once: true });

    return () => {
      window.removeEventListener('pointerdown', resumePlayback);
      window.removeEventListener('keydown', resumePlayback);
    };
  }, [awaitingAutoResume, startPlayback]);

  useEffect(() => {
    if (!isPlaying || !enableSpringBirds) {
      clearBirdLoopTimer();
      return;
    }

    let cancelled = false;

    const queueNextChirp = () => {
      if (cancelled) {
        return;
      }

      const delayMs = 2600 + Math.random() * 4200;
      birdLoopTimerRef.current = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        playBirdChirp();
        queueNextChirp();
      }, delayMs);
    };

    queueNextChirp();

    return () => {
      cancelled = true;
      clearBirdLoopTimer();
    };
  }, [clearBirdLoopTimer, enableSpringBirds, isPlaying, playBirdChirp]);

  return (
    <div className="fixed left-4 bottom-20 sm:left-6 sm:bottom-24 z-40">
      <div className="relative">
        {awaitingAutoResume && (
          <div className="bgm-autoplay-hint" role="status" aria-live="polite">
            森林在等你轻轻唤醒
          </div>
        )}

        {isPlaying && (
          <>
            <div className="bgm-note-orbit" aria-hidden="true">
              <span className="bgm-note-bounce bgm-note-bounce-1">♪</span>
              <span className="bgm-note-bounce bgm-note-bounce-2">♫</span>
              <span className="bgm-note-bounce bgm-note-bounce-3">♩</span>
              <span className="bgm-note-bounce bgm-note-bounce-4">♪</span>
              <span className="bgm-note-bounce bgm-note-bounce-5">♬</span>
            </div>

            <div className="bgm-note-layer" aria-hidden="true">
              <span className="bgm-note bgm-note-1">♪</span>
              <span className="bgm-note bgm-note-2">♫</span>
              <span className="bgm-note bgm-note-3">♩</span>
            </div>
          </>
        )}

        {isHovered && !awaitingAutoResume && (
          <div className="bgm-tooltip" role="status" aria-live="polite">
            听听森林的声音？
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleToggle()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          className={`bgm-mushroom ${isPlaying ? 'bgm-mushroom--playing' : ''} ${variant === 'winter' ? 'bgm-pinecone' : ''} ${variant === 'winter' && iceCrackPulse > 0 ? 'bgm-pinecone-crack' : ''}`}
          aria-label={isPlaying ? '暂停森林背景音乐' : '播放森林背景音乐'}
          title={isPlaying ? '暂停森林背景音乐' : '播放森林背景音乐'}
        >
          {iconAvailable ? (
            <img
              src={iconUrl}
              alt="蘑菇音乐按钮"
              className="bgm-mushroom-icon"
              draggable={false}
              onError={() => setIconAvailable(false)}
            />
          ) : (
            <>
              {variant === 'winter' ? (
                <>
                  <span className="bgm-pinecone-core" />
                  <span className="bgm-pinecone-scale bgm-pinecone-scale-1" />
                  <span className="bgm-pinecone-scale bgm-pinecone-scale-2" />
                  <span className="bgm-pinecone-scale bgm-pinecone-scale-3" />
                  <span className="bgm-pinecone-frost" />
                </>
              ) : (
                <>
                  <span className="bgm-mushroom-cap" />
                  <span className="bgm-mushroom-spot bgm-mushroom-spot--1" />
                  <span className="bgm-mushroom-spot bgm-mushroom-spot--2" />
                  <span className="bgm-mushroom-spot bgm-mushroom-spot--3" />
                  <span className="bgm-mushroom-stem" />
                  <span className="bgm-mushroom-shadow" />
                </>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
