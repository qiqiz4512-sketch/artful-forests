import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type AuthActionResult = 'login-success' | 'logout' | 'noop';

interface Props {
  username: string | null;
  onAuthAction: () => Promise<AuthActionResult>;
  loginPulse?: number;
}

const CHIME_AUDIO_URL = 'assets/chime.mp3';

export default function WindChime({ username: _username, onAuthAction, loginPulse = 0 }: Props) {
  const [ringing, setRinging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const previousPulseRef = useRef(loginPulse);

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
    const result = await onAuthAction();
    if (result === 'login-success') {
      void playChime();
    }
  };

  useEffect(() => {
    if (loginPulse <= previousPulseRef.current) return;
    previousPulseRef.current = loginPulse;
    void playChime();
  }, [loginPulse, playChime]);

  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40">
      <AnimatePresence>
        {hovered && (
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

      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="px-1 h-8 flex flex-row items-center justify-center gap-0.5 whitespace-nowrap"
        style={{
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(6px)',
          borderRadius: 999,
          border: 'none',
          color: 'hsl(28, 30%, 24%)',
          boxShadow: '0 4px 12px rgba(33, 46, 44, 0.08)',
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label="登录入口"
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
          }}
        >
          登录
        </span>
      </motion.button>
    </div>
  );
}
