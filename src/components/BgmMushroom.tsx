import { useCallback, useEffect, useRef, useState } from 'react';
import { useBgmAudio } from '@/components/BgmAudioProvider';

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
const INITIAL_AUTOPLAY_RETRY_MS = 240;
const MAX_AUTOPLAY_RETRY_ATTEMPTS = 12;

const prepareInlineAudioPlayback = (audio: HTMLAudioElement) => {
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
};

/** 尝试通过创建并立即 resume 一个 AudioContext 来解锁浏览器音频权限 */
const tryResumeAudioContext = () => {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  try {
    const ctx = new AudioCtor();
    // 尝试恢复，catch任何NotAllowedError
    void ctx.resume().catch(() => {});
    window.setTimeout(() => void ctx.close().catch(() => {}), 1500);
  } catch {
    // 忽略不支持的环境或者被浏览器拦截的情况
  }
};

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
  const bgmAudio = useBgmAudio();
  const setIsAutoplayBlocked = bgmAudio?.setIsAutoplayBlocked;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [iconAvailable, setIconAvailable] = useState(true);
  const [iceCrackPulse, setIceCrackPulse] = useState(0);
  const [awaitingAutoResume, setAwaitingAutoResume] = useState(false);
  const [bootMuted, setBootMuted] = useState(autoPlay);

  // 将本地拦截状态同步到全局 BgmAudioContext，供 Index.tsx 读取
  useEffect(() => {
    setIsAutoplayBlocked?.(awaitingAutoResume);
  }, [awaitingAutoResume, setIsAutoplayBlocked]);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const birdLoopTimerRef = useRef<number | null>(null);
  const autoResumeTimerRef = useRef<number | null>(null);
  const autoResumeAttemptRef = useRef(0);
  const hasAttemptedAutoPlayRef = useRef(false);
  const audioRef = bgmAudio?.audioRef ?? localAudioRef;

  const clearAutoResumeTimer = useCallback(() => {
    if (autoResumeTimerRef.current !== null) {
      window.clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
  }, []);

  const playIceCrack = useCallback(() => {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    try {
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
    } catch (error) {
      // AudioContext 创建失败或被拦截（如NotAllowedError）
      // 忽略错误继续执行
    }
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
    if (bgmAudio || !audioUrl) {
      return;
    }

    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.loop = true;
    audio.muted = autoPlay;
    audio.defaultMuted = autoPlay;
    audio.volume = 0;
    prepareInlineAudioPlayback(audio);
    localAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      localAudioRef.current = null;
    };
  }, [audioUrl, autoPlay, bgmAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.loop = true;
    audio.preload = 'auto';
    prepareInlineAudioPlayback(audio);
    audio.muted = bootMuted;
    audio.defaultMuted = bootMuted;
  }, [audioRef, bootMuted]);

  useEffect(() => {
    setBootMuted(autoPlay);
    hasAttemptedAutoPlayRef.current = false;
  }, [autoPlay, audioUrl]);

  useEffect(() => {
    return () => {
      if (fadeRafRef.current !== null) {
        window.cancelAnimationFrame(fadeRafRef.current);
      }

      clearAutoResumeTimer();

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audioRef, clearAutoResumeTimer]);

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

  const fadeToAudiblePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setBootMuted(false);
    audio.muted = false;
    audio.defaultMuted = false;
    audio.volume = 0;
    prepareInlineAudioPlayback(audio);

    if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load();
    }

    // 如果音频已经在播放（muted autoplay 成功），无需再调用 play()。
    // 重复调用 play() 时浏览器会以当前 muted=false 状态重新评估自动播放策略，
    // 可能 reject —— 直接跳过即可，此时 muted=false 已起效，淡入音量即可。
    if (audio.paused) {
      await audio.play();
    }

    autoResumeAttemptRef.current = 0;
    fadeVolume(Math.max(0, Math.min(1, targetVolume)), fadeInDurationMs);
    setAwaitingAutoResume(false);
  }, [fadeInDurationMs, fadeVolume, targetVolume]);

  const queueAutoResumeAttempt = useCallback((delayMs = INITIAL_AUTOPLAY_RETRY_MS) => {
    clearAutoResumeTimer();
    autoResumeTimerRef.current = window.setTimeout(() => {
      autoResumeTimerRef.current = null;
      const audio = audioRef.current;
      if (!audio || audio.paused || !audio.muted) {
        return;
      }

      void (async () => {
        try {
          await fadeToAudiblePlayback();
        } catch {
          autoResumeAttemptRef.current += 1;
          if (autoResumeAttemptRef.current >= MAX_AUTOPLAY_RETRY_ATTEMPTS) {
            setAwaitingAutoResume(true);
            return;
          }

          queueAutoResumeAttempt(Math.min(1800, INITIAL_AUTOPLAY_RETRY_MS * (autoResumeAttemptRef.current + 1)));
        }
      })();
    }, delayMs);
  }, [audioRef, clearAutoResumeTimer, fadeToAudiblePlayback]);

  const startPlayback = useCallback(async (triggeredByAutoPlay = false) => {
    const audio = audioRef.current;

    clearAutoResumeTimer();
    autoResumeAttemptRef.current = 0;

    setIsPlaying(true);
    if (variant === 'winter') {
      setIceCrackPulse((v) => v + 1);
      playIceCrack();
    }

    if (!audio) {
      return;
    }

    try {
      if (triggeredByAutoPlay) {
        // 静音启动策略：浏览器允许 muted autoplay；
        // 一旦 play() 成功（audio 已在播放），立即解除静音——
        // 此时不触发新的 play() 请求，浏览器不会再次拦截。
        audio.muted = true;
        audio.defaultMuted = true;
        audio.volume = 0;
        prepareInlineAudioPlayback(audio);
        if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
          audio.load();
        }
        await audio.play(); // muted 播放，浏览器几乎总是放行
        // 已在播放中：直接解除静音并淡入，不会触发新拦截
        setBootMuted(false);
        audio.muted = false;
        audio.defaultMuted = false;
        setAwaitingAutoResume(false);
        autoResumeAttemptRef.current = 0;
        fadeVolume(Math.max(0, Math.min(1, targetVolume)), fadeInDurationMs);
        return;
      }

      await fadeToAudiblePlayback();
    } catch {
      audio.muted = false;
      setIsPlaying(false);
      // 无论是 autoPlay 路径还是用户手势路径，播放失败时都回到等待用户交互状态
      setAwaitingAutoResume(true);
    }
  }, [audioRef, clearAutoResumeTimer, fadeInDurationMs, fadeToAudiblePlayback, fadeVolume, playIceCrack, targetVolume, variant]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    clearAutoResumeTimer();
    autoResumeAttemptRef.current = 0;
    setIsPlaying(false);
    setAwaitingAutoResume(false);
    setBootMuted(false);

    if (!audio) {
      return;
    }

    fadeVolume(0, fadeOutDurationMs, () => {
      audio.muted = false;
      audio.pause();
      audio.currentTime = 0;
    });
  }, [audioRef, clearAutoResumeTimer, fadeOutDurationMs, fadeVolume]);

  const handleUnlockLayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      void fadeToAudiblePlayback();
      return;
    }

    setAwaitingAutoResume(false);
    void startPlayback(false);
  }, [fadeToAudiblePlayback, startPlayback]);

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

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    hasAttemptedAutoPlayRef.current = true;

    // BgmAudioProvider 已经在更早阶段以静音模式启动了播放。
    // 若 audio 已在播放（muted），直接进入解禁+淡入流程，无需再 play()。
    // 若尚未播放（Provider 静音尝试失败），走 startPlayback(true) 兜底。
    const autoPlayTimer = window.setTimeout(() => {
      if (!audio.paused) {
        // 已在静音播放中——直接解禁并设定 isPlaying
        setIsPlaying(true);
        void fadeToAudiblePlayback().catch(() => {
          setIsPlaying(false);
          setAwaitingAutoResume(true);
        });
      } else {
        void startPlayback(true);
      }
    }, 150); // 充分延迟给 Provider 的 play() 完成

    return () => {
      window.clearTimeout(autoPlayTimer);
    };
  }, [autoPlay, audioRef, fadeToAudiblePlayback, startPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const tryPromoteMutedPlayback = () => {
      if (audio.paused || !audio.muted) {
        return;
      }

      queueAutoResumeAttempt(120);
    };

    audio.addEventListener('play', tryPromoteMutedPlayback);
    audio.addEventListener('canplay', tryPromoteMutedPlayback);
    audio.addEventListener('canplaythrough', tryPromoteMutedPlayback);
    audio.addEventListener('loadeddata', tryPromoteMutedPlayback);

    return () => {
      audio.removeEventListener('play', tryPromoteMutedPlayback);
      audio.removeEventListener('canplay', tryPromoteMutedPlayback);
      audio.removeEventListener('canplaythrough', tryPromoteMutedPlayback);
      audio.removeEventListener('loadeddata', tryPromoteMutedPlayback);
    };
  }, [audioRef, queueAutoResumeAttempt]);

  useEffect(() => {
    if (!awaitingAutoResume) {
      return;
    }

    let resumed = false;
    const resumePlayback = () => {
      if (resumed) {
        return;
      }
      resumed = true;
      // 注意：不在这里调用 tryResumeAudioContext() —— 它会消耗浏览器的 user activation token，
      // 导致后续 audio.play() 被浏览器拦截。
      // 也不在这里提前调用 setAwaitingAutoResume(false)，等 fadeToAudiblePlayback 成功后再设。
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        void fadeToAudiblePlayback().catch(() => {
          resumed = false; // 允许重试
        });
        return;
      }

      void startPlayback(false).catch(() => {
        resumed = false; // 允许重试
      });
    };

    const listenerOptions = { capture: true };

    // 只监听真正的用户手势事件（Chrome/Safari 认可的 user activation triggers）。
    // mousemove / pointermove / scroll / wheel 不属于 user activation，
    // 一旦触发会消耗掉 awaitingAutoResume 状态却无法让 audio.play() 成功。
    window.addEventListener('pointerdown', resumePlayback, listenerOptions);
    window.addEventListener('keydown', resumePlayback, listenerOptions);
    window.addEventListener('touchstart', resumePlayback, listenerOptions);
    window.addEventListener('touchmove', resumePlayback, listenerOptions);
    window.addEventListener('click', resumePlayback, listenerOptions);

    return () => {
      window.removeEventListener('pointerdown', resumePlayback, listenerOptions);
      window.removeEventListener('keydown', resumePlayback, listenerOptions);
      window.removeEventListener('touchstart', resumePlayback, listenerOptions);
      window.removeEventListener('touchmove', resumePlayback, listenerOptions);
      window.removeEventListener('click', resumePlayback, listenerOptions);
    };
  }, [awaitingAutoResume, fadeToAudiblePlayback, startPlayback]);

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

  // 在任何用户交互时尝试恢复播放
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const attemptAutoPlayRestore = () => {
      if (audio.paused && !audio.muted) {
        void audio.play().catch(() => {
          // 忽略播放失败
        });
      }
    };

    // 绑定用户交互事件
    document.addEventListener('click', attemptAutoPlayRestore, false);
    document.addEventListener('touchstart', attemptAutoPlayRestore, false);
    document.addEventListener('keydown', attemptAutoPlayRestore, false);

    return () => {
      document.removeEventListener('click', attemptAutoPlayRestore);
      document.removeEventListener('touchstart', attemptAutoPlayRestore);
      document.removeEventListener('keydown', attemptAutoPlayRestore);
    };
  }, [audioRef]);

  return (
    <div className="fixed left-4 bottom-20 sm:left-6 sm:bottom-24 z-40">
      <div className="relative">
        {awaitingAutoResume && (
          <button
            type="button"
            className="bgm-unlock-layer"
            aria-label="轻触页面进入森林并开启背景音乐"
            onPointerDown={() => handleUnlockLayer()}
            onClick={() => handleUnlockLayer()}
            onKeyDown={() => handleUnlockLayer()}
          />
        )}

        {audioUrl && (
          !bgmAudio && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="auto"
              autoPlay={autoPlay}
              loop
              muted={bootMuted}
              playsInline
              className="hidden"
              aria-hidden="true"
            />
          )
        )}

        {awaitingAutoResume && (
          <div className="bgm-autoplay-hint" role="status" aria-live="polite">
            点击森林任意处，唤醒自然之声
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
          className={`bgm-mushroom ${isPlaying ? 'bgm-mushroom--playing' : ''} ${awaitingAutoResume ? 'bgm-mushroom--blocked' : ''} ${variant === 'winter' ? 'bgm-pinecone' : ''} ${variant === 'winter' && iceCrackPulse > 0 ? 'bgm-pinecone-crack' : ''}`}
          aria-label={isPlaying ? '暂停森林背景音乐' : '播放森林背景音乐'}
          title={isPlaying ? '暂停森林背景音乐' : '播放森林背景音乐'}
        >
          {awaitingAutoResume && (
            <span className="bgm-blocked-badge" aria-hidden="true">点击唤醒</span>
          )}
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
