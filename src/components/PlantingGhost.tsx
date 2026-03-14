import { motion } from 'framer-motion';
import { getTreeDepthMetrics } from '@/lib/treeDepth';

interface Props {
  imageData: string;
  mouseX: number;
  mouseY: number;
  onPlace: (x: number, y: number) => void;
  minY: number;
  maxY: number;
}

export default function PlantingGhost({ imageData, mouseX, mouseY, onPlace, minY, maxY }: Props) {
  const depth = getTreeDepthMetrics(mouseY, minY, maxY);

  return (
    <div
      className="fixed inset-0 z-20 cursor-pointer"
      onClick={() => onPlace(mouseX, depth.clampedY)}
      style={{ cursor: 'none' }}
    >
      {/* Hint text */}
      <motion.div
        className="fixed top-8 left-1/2 -translate-x-1/2 font-ui text-sm pointer-events-none"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(255,252,245,0.85)',
          padding: '8px 20px',
          borderRadius: '8px 12px 10px 14px',
          color: 'hsl(152, 30%, 25%)',
          boxShadow: '2px 3px 10px rgba(0,0,0,0.08)',
        }}
      >
        点击草地，种下它 🌱
      </motion.div>

      {/* Ghost tree following cursor */}
      <motion.img
        src={imageData}
        className="fixed pointer-events-none"
        style={{
          left: mouseX - 40,
          top: depth.clampedY - 60,
          width: 80,
          height: 80,
          objectPosition: 'bottom center',
          transform: `scale(${depth.perspectiveScale})`,
          transformOrigin: 'bottom center',
          filter: `blur(${depth.blurPx.toFixed(2)}px) saturate(${depth.saturation.toFixed(2)}) drop-shadow(${depth.ghostShadowOffsetX.toFixed(1)}px ${depth.ghostShadowOffsetY.toFixed(1)}px ${depth.ghostShadowBlur.toFixed(1)}px rgba(129, 199, 132, ${depth.ghostShadowOpacity.toFixed(2)}))`,
          opacity: 0.7,
        }}
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
    </div>
  );
}
