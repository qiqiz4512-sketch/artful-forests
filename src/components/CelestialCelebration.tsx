import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  effect: 'meteor' | 'aurora' | null;
}

const METEOR_COUNT = 11;

export default function CelestialCelebration({ effect }: Props) {
  return (
    <AnimatePresence>
      {effect && (
        <motion.div
          key={effect}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 31 }}
        >
          {effect === 'aurora' && (
            <>
              <motion.div
                initial={{ opacity: 0.18, y: -18 }}
                animate={{ opacity: [0.18, 0.52, 0.28], y: [0, 6, 0] }}
                transition={{ duration: 4.8, ease: 'easeInOut' }}
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(70% 30% at 15% 0%, rgba(34,197,94,0.35), transparent 70%), radial-gradient(70% 35% at 70% 0%, rgba(59,130,246,0.26), transparent 72%), radial-gradient(55% 28% at 42% 6%, rgba(244,114,182,0.2), transparent 76%)',
                  mixBlendMode: 'screen',
                }}
              />
              <motion.div
                initial={{ opacity: 0.16, x: -24 }}
                animate={{ opacity: [0.16, 0.34, 0.2], x: [0, 24, 0] }}
                transition={{ duration: 5.2, ease: 'easeInOut' }}
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(110deg, rgba(167,243,208,0.0) 15%, rgba(167,243,208,0.25) 34%, rgba(125,211,252,0.26) 48%, rgba(244,114,182,0.2) 66%, rgba(167,243,208,0.0) 85%)',
                  filter: 'blur(20px)',
                }}
              />
            </>
          )}

          {effect === 'meteor' && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: METEOR_COUNT }).map((_, i) => {
                const delay = i * 0.22;
                const top = 8 + i * 6;
                return (
                  <motion.div
                    key={`meteor-${i}`}
                    initial={{ opacity: 0, x: -220, y: -120 }}
                    animate={{ opacity: [0, 0.9, 0], x: [0, 820], y: [0, 440] }}
                    transition={{ duration: 1.45, delay, ease: 'easeOut' }}
                    className="absolute"
                    style={{ top: `${top}%`, left: '-16%' }}
                  >
                    <div
                      style={{
                        width: 140,
                        height: 2,
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.95), rgba(147,197,253,0.0))',
                        boxShadow: '0 0 10px rgba(191,219,254,0.66)',
                        transform: 'rotate(28deg)',
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
