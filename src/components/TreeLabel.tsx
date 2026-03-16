import { motion } from 'framer-motion';

interface Props {
  text: string;
  personality?: string;
  scale: number;
  hovered: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const personalityTone = (personality?: string) => {
  if (personality === '温柔') return { bg: 'rgba(182, 236, 213, 0.72)', color: 'hsl(151, 35%, 24%)' };
  if (personality === '睿智') return { bg: 'rgba(184, 220, 240, 0.72)', color: 'hsl(201, 38%, 24%)' };
  if (personality === '顽皮') return { bg: 'rgba(255, 228, 188, 0.75)', color: 'hsl(28, 42%, 27%)' };
  if (personality === '社恐') return { bg: 'rgba(218, 214, 242, 0.72)', color: 'hsl(258, 30%, 30%)' };
  return { bg: 'rgba(226, 236, 224, 0.72)', color: 'hsl(150, 14%, 30%)' };
};

export default function TreeLabel({ text, personality, scale, hovered }: Props) {
  const compensationScale = clamp(1 / Math.max(scale, 0.01), 0.85, 2.5);
  const fontSize = 12;
  const badgeSize = 10.5;
  const padX = 10;
  const padY = 6;
  const tone = personalityTone(personality);

  return (
    <motion.div
      className="absolute pointer-events-none whitespace-nowrap"
      style={{
        right: -10,
        bottom: '100%',
        transform: 'translate(100%, -14px)',
        scale: compensationScale,
        transformOrigin: 'right bottom',
        fontSize,
        lineHeight: 1,
        padding: `${padY}px ${padX}px`,
        color: 'hsl(152, 28%, 24%)',
        background: 'rgba(252, 255, 250, 0.78)',
        borderRadius: 10,
        backdropFilter: 'blur(1px)',
      }}
      initial={false}
      animate={hovered ? { opacity: 1, y: [0, -2, 0], x: [0, 1, 0] } : { opacity: 0, y: 2, x: 0 }}
      transition={
        hovered
          ? {
              opacity: { duration: 0.2, ease: 'easeOut' },
              y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
              x: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }
          : { opacity: { duration: 0.2, ease: 'easeOut' }, y: { duration: 0.15 }, x: { duration: 0.15 } }
      }
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M4 8 C12 2, 24 5, 34 4 C44 3, 55 2, 66 4 C77 6, 88 3, 95 8 C98 13, 98 23, 94 28 C86 34, 74 31, 63 32 C52 33, 40 35, 29 32 C18 29, 9 33, 4 28 C1 22, 1 14, 4 8 Z"
          fill="none"
          stroke="rgba(120, 180, 140, 0.55)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="relative flex items-center gap-1.5">
        {personality && (
          <span
            className="font-ui"
            style={{
              fontSize: badgeSize,
              lineHeight: 1,
              padding: '2.5px 6px',
              borderRadius: 999,
              background: tone.bg,
              color: tone.color,
              border: '1px solid rgba(120, 165, 145, 0.32)',
            }}
          >
            {personality}
          </span>
        )}
        <span className="font-ui" style={{ fontWeight: 600 }}>
          {text}
        </span>
      </div>
    </motion.div>
  );
}
