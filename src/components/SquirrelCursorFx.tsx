import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface BiteEffect {
  id: number;
  x: number;
  y: number;
}

interface CrumbParticle {
  id: number;
  dx: number;
  dy: number;
  size: number;
  rotate: number;
}

interface FrostParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
}

const EFFECT_LIFETIME_MS = 560;
const CRUMB_PARTICLES: CrumbParticle[] = [
  { id: 1, dx: 16, dy: -10, size: 10, rotate: -16 },
  { id: 2, dx: 20, dy: -2, size: 8, rotate: 12 },
  { id: 3, dx: 14, dy: 8, size: 9, rotate: -8 },
  { id: 4, dx: 24, dy: 6, size: 7, rotate: 18 },
  { id: 5, dx: 10, dy: -14, size: 7, rotate: -20 },
];

const isDrawingModeActive = () => (
  typeof document !== 'undefined' && document.body.classList.contains('drawing-mode-active')
);

export default function SquirrelCursorFx() {
  const [effects, setEffects] = useState<BiteEffect[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [frostTrail, setFrostTrail] = useState<FrostParticle[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (isDrawingModeActive()) return;

      setIsHolding(true);
      setPointerPos({ x: event.clientX, y: event.clientY });

      const id = Date.now() + Math.floor(Math.random() * 10000);
      const next: BiteEffect = {
        id,
        x: event.clientX,
        y: event.clientY,
      };

      setEffects((current) => [...current, next]);

      const timerId = window.setTimeout(() => {
        setEffects((current) => current.filter((item) => item.id !== id));
      }, EFFECT_LIFETIME_MS);

      timersRef.current.push(timerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (isDrawingModeActive()) return;

      setPointerPos({ x: event.clientX, y: event.clientY });

      if (!document.body.classList.contains('winter-mode')) return;

      const id = Date.now() + Math.floor(Math.random() * 10000);
      const next: FrostParticle = {
        id,
        x: event.clientX,
        y: event.clientY,
        dx: (Math.random() - 0.5) * 22,
        dy: -8 - Math.random() * 14,
        size: 4 + Math.random() * 7,
      };

      setFrostTrail((current) => [...current.slice(-28), next]);
      const timerId = window.setTimeout(() => {
        setFrostTrail((current) => current.filter((item) => item.id !== id));
      }, 520);
      timersRef.current.push(timerId);
    };

    const onPointerUp = () => {
      setIsHolding(false);
    };

    const onWindowBlur = () => {
      setIsHolding(false);
    };

    const onDrawingModeChange: EventListener = () => {
      if (!isDrawingModeActive()) return;
      setIsHolding(false);
      setEffects([]);
      setFrostTrail([]);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('drawing-mode-change', onDrawingModeChange);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('drawing-mode-change', onDrawingModeChange);
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = [];
    };
  }, []);

  if (isDrawingModeActive()) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      <AnimatePresence>
        {isHolding && (
          <motion.div
            key="holding-eat"
            className="absolute flex items-center gap-0.5"
            style={{
              left: pointerPos.x,
              top: pointerPos.y,
              transform: 'translate(-48%, -56%)',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            <motion.span
              style={{ fontSize: 22, lineHeight: 1 }}
              animate={{
                x: [0, 2, 0],
                y: [0, -1, 0],
                rotate: [0, -9, 0],
              }}
              transition={{ duration: 0.34, ease: 'easeInOut', repeat: Infinity }}
            >
              🐿️
            </motion.span>
            <motion.span
              style={{ fontSize: 18, lineHeight: 1 }}
              animate={{
                scale: [1, 0.8, 1],
                rotate: [0, 12, 0],
              }}
              transition={{ duration: 0.34, ease: 'easeInOut', repeat: Infinity }}
            >
              🌰
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {frostTrail.map((p) => (
          <motion.span
            key={`frost-${p.id}`}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              background: 'radial-gradient(circle at 35% 35%, rgba(210, 238, 255, 0.92), rgba(176, 221, 246, 0.35) 60%, rgba(176, 221, 246, 0) 100%)',
              boxShadow: '0 0 8px rgba(173, 223, 255, 0.42)',
            }}
            initial={{ opacity: 0.78, x: 0, y: 0, scale: 0.55 }}
            animate={{ opacity: 0, x: p.dx, y: p.dy, scale: 1.22 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {effects.map((effect) => (
          <motion.div
            key={effect.id}
            className="absolute flex items-center gap-0.5"
            style={{ left: effect.x, top: effect.y, transform: 'translate(-50%, -50%)' }}
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.82, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {CRUMB_PARTICLES.map((crumb) => (
              <motion.span
                key={`${effect.id}-${crumb.id}`}
                className="absolute"
                style={{
                  left: 18,
                  top: 1,
                  fontSize: crumb.size,
                  lineHeight: 1,
                  opacity: 0.9,
                }}
                initial={{ x: 0, y: 0, scale: 0.8, rotate: 0, opacity: 0.86 }}
                animate={{
                  x: crumb.dx,
                  y: crumb.dy,
                  scale: [0.82, 1, 0.7],
                  rotate: crumb.rotate,
                  opacity: [0.85, 0.7, 0],
                }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              >
                •
              </motion.span>
            ))}

            <motion.span
              style={{ fontSize: 22, lineHeight: 1 }}
              animate={{
                x: [0, 2, 0, 2, 0],
                rotate: [0, -7, 0, -8, 0],
              }}
              transition={{ duration: 0.48, ease: 'easeInOut' }}
            >
              🐿️
            </motion.span>
            <motion.span
              style={{ fontSize: 18, lineHeight: 1 }}
              animate={{
                scale: [1, 0.82, 1, 0.8, 1],
                rotate: [0, 10, 0, 12, 0],
              }}
              transition={{ duration: 0.48, ease: 'easeInOut' }}
            >
              🌰
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
