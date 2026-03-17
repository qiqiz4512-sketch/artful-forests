import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SceneInteractionEvent } from '@/types/forest';

type AuthActionResult = 'login-success' | 'logout' | 'noop';

interface Props {
  username: string | null;
  onAuthAction: () => Promise<AuthActionResult>;
  loginPulse?: number;
  interactionEvent?: SceneInteractionEvent | null;
}

const CHIME_AUDIO_URL = 'assets/chime.mp3';

const truncate = (s: string, max = 10) => {
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : s;
};

export default function WindChime({ username, onAuthAction, loginPulse = 0, interactionEvent = null }: Props) {
  const [ringing, setRinging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [interactionGlow, setInteractionGlow] = useState<'energy' | 'prune' | 'memory' | null>(null);
  const previousPulseRef = useRef(loginPulse);
  const menuRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chimeBufferRef = useRef<AudioBuffer | null>(null);
  const chimeBufferPromiseRef = useRef<Promise<AudioBuffer> | null>(null);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      
      // 注册到全局实例列表，便于页面级别的 AudioContext 恢复
      if (typeof window !== 'undefined') {
        if (!Array.isArray((window as any).__audioInstances)) {
          (window as any).__audioInstances = [];
        }
        ((window as any).__audioInstances as AudioContext[]).push(audioContextRef.current);
      }
    }

    const ctx = audioContextRef.current;
    // 立即尝试恢复被挂起的 AudioContext
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // 忽略恢复失败，可能是权限或其他浏览器限制
      });
    }

    return ctx;
  }, []);

  const loadChimeBuffer = useCallback(async () => {
    if (chimeBufferRef.current) {
      return chimeBufferRef.current;
    }

    if (!chimeBufferPromiseRef.current) {
      chimeBufferPromiseRef.current = (async () => {
        const actx = ensureAudioContext();
        const response = await fetch(CHIME_AUDIO_URL);
        if (!response.ok) {
          throw new Error('Failed to load chime audio');
        }

        const audioData = await response.arrayBuffer();
        const buffer = await actx.decodeAudioData(audioData.slice(0));
        chimeBufferRef.current = buffer;
        return buffer;
      })().finally(() => {
        chimeBufferPromiseRef.current = null;
      });
    }

    return chimeBufferPromiseRef.current;
  }, [ensureAudioContext]);

  const playSynthChime = useCallback(() => {
    const actx = ensureAudioContext();
    void actx.resume();

    const playNote = (freq: number, time: number, dur: number) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.045, time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(time);
      osc.stop(time + dur);
    };

    // Restore the original calm wind-chime phrase with a slower, wistful cadence.
    const notes = [523.25, 659.25, 783.99, 880, 783.99, 659.25, 523.25, 392, 440, 523.25, 659.25, 587.33];
    const now = actx.currentTime;
    notes.forEach((note, i) => playNote(note, now + i * 0.34, 0.95));
  }, [ensureAudioContext]);

  const playBufferedChime = useCallback(async () => {
    const actx = ensureAudioContext();
    await actx.resume();

    const buffer = await loadChimeBuffer();
    const source = actx.createBufferSource();
    const gain = actx.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.85;
    source.connect(gain);
    gain.connect(actx.destination);
    source.start();
  }, [ensureAudioContext, loadChimeBuffer]);

  const playChime = useCallback(async () => {
    setRinging(true);
    try {
      await playBufferedChime();
      window.setTimeout(() => setRinging(false), 980);
      return;
    } catch {
      playSynthChime();
      window.setTimeout(() => setRinging(false), 3200);
    }
  }, [playBufferedChime, playSynthChime]);

  const handleClick = async () => {
    if (username) {
      setMenuOpen((prev) => !prev);
      return;
    }
    const result = await onAuthAction();
    if (result === 'login-success') {
      void playChime();
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await onAuthAction();
  };

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (loginPulse <= previousPulseRef.current) return;
    previousPulseRef.current = loginPulse;
    void playChime();
  }, [loginPulse, playChime]);

  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;
      if (!audioContext) {
        return;
      }

      void audioContext.close();
      audioContextRef.current = null;
      chimeBufferRef.current = null;
      chimeBufferPromiseRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!interactionEvent) return;
    setInteractionGlow(interactionEvent.kind);
    setRinging(true);
    const timer = window.setTimeout(() => {
      setInteractionGlow((current) => (current === interactionEvent.kind ? null : current));
      setRinging(false);
    }, interactionEvent.phase === 'hover' ? 600 : 1400);
    return () => window.clearTimeout(timer);
  }, [interactionEvent]);

  const glowStyle = interactionGlow === 'energy'
    ? 'radial-gradient(circle, rgba(255, 218, 138, 0.58) 0%, rgba(255, 188, 84, 0.2) 56%, rgba(255, 188, 84, 0) 78%)'
    : interactionGlow === 'prune'
      ? 'radial-gradient(circle, rgba(173, 228, 162, 0.48) 0%, rgba(114, 182, 101, 0.18) 56%, rgba(114, 182, 101, 0) 78%)'
      : interactionGlow === 'memory'
        ? 'radial-gradient(circle, rgba(216, 175, 248, 0.52) 0%, rgba(183, 132, 236, 0.2) 56%, rgba(183, 132, 236, 0) 78%)'
        : null;

  return (
    <div ref={menuRef} className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40">
      {/* Tooltip — only when not logged in */}
      <AnimatePresence>
        {hovered && !username && !menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.94 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              right: 'calc(100% + 8px)',
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.36)',
              background: 'rgba(233, 246, 243, 0.42)',
              backdropFilter: 'blur(8px)',
              padding: '6px 10px',
              fontSize: 12,
              color: 'hsl(160, 18%, 26%)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 10px 24px rgba(33, 70, 62, 0.15)',
            }}
          >
            认领这片林子
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personal-center dropdown — only when logged in */}
      <AnimatePresence>
        {menuOpen && username && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              minWidth: 140,
              borderRadius: 14,
              border: '1px solid rgba(200, 230, 220, 0.5)',
              background: 'rgba(244, 252, 248, 0.92)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 12px 32px rgba(33, 70, 62, 0.16)',
              overflow: 'hidden',
            }}
          >
            {/* Username header */}
            <div
              style={{
                padding: '10px 14px 8px',
                borderBottom: '1px solid rgba(180, 220, 205, 0.4)',
                fontSize: 13,
                fontWeight: 600,
                color: 'hsl(155, 20%, 22%)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 15 }}>🌿</span>
              <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username}
              </span>
            </div>
            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 14px',
                fontSize: 12,
                color: 'hsl(10, 40%, 40%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,90,60,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              退出登录
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="px-1 h-8 flex flex-row items-center justify-center gap-0.5 whitespace-nowrap"
        style={{
          background: username
            ? 'rgba(210, 240, 228, 0.55)'
            : 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(6px)',
          borderRadius: 999,
          border: username ? '1px solid rgba(140, 200, 170, 0.45)' : 'none',
          color: 'hsl(28, 30%, 24%)',
          boxShadow: '0 4px 12px rgba(33, 46, 44, 0.08)',
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        animate={interactionGlow
          ? {
              rotate: [0, -5, 4, -3, 0],
              y: [0, -1.5, 0],
              boxShadow: [
                '0 4px 12px rgba(33, 46, 44, 0.08)',
                interactionGlow === 'energy'
                  ? '0 8px 22px rgba(255, 190, 84, 0.22)'
                  : interactionGlow === 'prune'
                    ? '0 8px 22px rgba(106, 180, 104, 0.18)'
                    : '0 8px 22px rgba(188, 130, 236, 0.2)',
                '0 4px 12px rgba(33, 46, 44, 0.08)',
              ],
            }
          : { rotate: 0, y: 0 }}
        transition={interactionGlow ? { duration: 1, ease: 'easeInOut' } : { duration: 0.2 }}
        aria-label={username ? '个人中心' : '登录入口'}
      >
        <AnimatePresence>
          {glowStyle && (
            <motion.span
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: [0.12, 0.42, 0.12], scale: [0.72, 1.08, 1] }}
              exit={{ opacity: 0, scale: 1.14 }}
              transition={{ duration: interactionEvent?.phase === 'hover' ? 0.6 : 1.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: 999,
                background: glowStyle,
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>
        <span className={`text-base ${hovered ? 'wind-chime-swing' : ''} ${ringing ? 'wind-chime-spin' : ''}`}>
          🎐
        </span>
        <span
          style={{
            fontSize: 12,
            lineHeight: 1.1,
            textAlign: 'left',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            maxWidth: 88,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {username ? truncate(username) : '登录'}
        </span>
      </motion.button>
    </div>
  );
}
