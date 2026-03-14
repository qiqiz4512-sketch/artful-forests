import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function WindChime() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a simple ambient audio context with oscillators
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) {
      // Use AudioContext for ambient piano-like tones
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const actx = new AudioCtx();
      
      const playNote = (freq: number, time: number, dur: number) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(time);
        osc.stop(time + dur);
      };

      const notes = [523.25, 659.25, 783.99, 880, 783.99, 659.25, 523.25, 392, 440, 523.25, 659.25, 587.33];
      let t = actx.currentTime;
      const loop = () => {
        notes.forEach((n, i) => {
          playNote(n, t + i * 1.2, 2);
        });
        t += notes.length * 1.2;
        if (playing) setTimeout(loop, notes.length * 1200);
      };
      loop();
      
      // Store context for cleanup
      (audioRef as any).current = { pause: () => actx.close() };
      setPlaying(true);
      return;
    }

    if (playing) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  };

  return (
    <motion.button
      onClick={toggleMusic}
      className="fixed top-6 right-6 z-40 w-11 h-11 flex items-center justify-center"
      style={{
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(8px)',
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.3)',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className={`text-lg ${playing ? 'wind-chime-spin' : ''}`}>
        🎐
      </span>
    </motion.button>
  );
}
