import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type AuthActionResult = 'login-success' | 'logout' | 'noop';

interface Props {
  username: string | null;
  onAuthAction: () => Promise<AuthActionResult>;
  loginPulse?: number;
}

const CHIME_AUDIO_URL = 'assets/chime.mp3';

const truncate = (s: string, max = 10) => {
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : s;
};

export default function WindChime({ username, onAuthAction, loginPulse = 0 }: Props) {
  const [ringing, setRinging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const previousPulseRef = useRef(loginPulse);
  const menuRef = useRef<HTMLDivElement>(null);

  const playSynthChime = useCallback(() => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const actx = new AudioCtx();

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
    window.setTimeout(() => {
      void actx.close();
    }, 5200);
  }, []);

  const playChime = useCallback(async () => {
    setRinging(true);
    try {
      const audio = new Audio(CHIME_AUDIO_URL);
      audio.preload = 'auto';
      audio.volume = 0.85;
      await audio.play();
      window.setTimeout(() => setRinging(false), 980);
      return;
    } catch {
      playSynthChime();
      window.setTimeout(() => setRinging(false), 3200);
    }
  }, [playSynthChime]);

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
        aria-label={username ? '个人中心' : '登录入口'}
      >
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
