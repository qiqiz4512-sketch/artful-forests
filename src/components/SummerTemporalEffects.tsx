import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimeTheme } from '@/hooks/useTimeTheme';

type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

interface Props {
  season: SeasonType;
  theme: TimeTheme;
}

interface Firefly {
  id: number;
  left: number;
  bottom: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
}

export default function SummerTemporalEffects({ season, theme }: Props) {
  const isSummer = season === 'summer';
  const isSummerDay = isSummer && theme === 'day';
  const isSummerNight = isSummer && theme === 'night';

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const fireflies = useMemo<Firefly[]>(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: 4 + Math.random() * 92,
      bottom: 3 + Math.random() * 24,
      size: 4 + Math.random() * 4,
      delay: Math.random() * 2.8,
      duration: 3.2 + Math.random() * 3.8,
      driftX: (Math.random() - 0.5) * 120,
    }));
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (audioUnlocked) return;

    const unlock = () => {
      setAudioUnlocked(true);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audioUnlocked]);

  useEffect(() => {
    if (!isSummerDay || !audioUnlocked) return;

    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtor();
    }

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const playCicada = () => {
      const now = ctx.currentTime;
      const chirpCount = 5;

      for (let i = 0; i < chirpCount; i++) {
        const t0 = now + i * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3600, t0);
        osc.frequency.exponentialRampToValueAtTime(5200, t0 + 0.045);
        osc.frequency.exponentialRampToValueAtTime(3000, t0 + 0.09);

        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.02, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.1);
      }
    };

    playCicada();
    const timer = window.setInterval(() => {
      playCicada();
    }, 3800);

    return () => {
      window.clearInterval(timer);
    };
  }, [audioUnlocked, isSummerDay]);

  return (
    <>
      {isSummerDay && (
        <div className="summer-light-beams" aria-hidden="true">
          <span className="summer-light-beam beam-1" />
          <span className="summer-light-beam beam-2" />
          <span className="summer-light-beam beam-3" />
        </div>
      )}

      {isSummerNight && (
        <div className="summer-fireflies" aria-hidden="true">
          {fireflies.map((f) => (
            <span
              key={f.id}
              className="summer-firefly"
              style={{
                left: `${f.left}%`,
                bottom: `${f.bottom}%`,
                width: `${f.size}px`,
                height: `${f.size}px`,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.duration}s`,
                ['--drift-x' as string]: `${f.driftX}px`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
