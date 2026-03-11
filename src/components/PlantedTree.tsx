import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  imageData: string;
  x: number;
  y: number;
  size: number;
  isNew?: boolean;
}

const PHRASES = [
  '风很温柔',
  '慢慢长大吧',
  '今天也辛苦了',
  '你做得很好',
  '深呼吸，放轻松',
  '一切都会好的',
  '阳光正好',
  '谢谢你来看我',
  '你是独一无二的',
  '世界因你而美好',
  '每一天都是新的开始',
  '愿你被温柔以待',
];

export default function PlantedTree({ imageData, x, y, size, isNew }: Props) {
  const [showPhrase, setShowPhrase] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    const p = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    setPhrase(p);
    setShowPhrase(true);
    setTimeout(() => setShowPhrase(false), 3000);
  };

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        transformOrigin: 'bottom center',
      }}
      initial={isNew ? { scale: 0.05, opacity: 0 } : { scale: 1, opacity: 1 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: isHovered ? [0, 2, -2, 1, -1, 0] : 0,
      }}
      transition={
        isNew
          ? { duration: 3, ease: [0.22, 1, 0.36, 1] }
          : { rotate: { duration: 2, repeat: isHovered ? Infinity : 0 } }
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <img
        src={imageData}
        alt="planted tree"
        className="w-full h-full object-contain pointer-events-none"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      />

      <AnimatePresence>
        {showPhrase && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap font-handwriting text-lg pointer-events-none"
            style={{
              background: 'rgba(255,252,245,0.9)',
              padding: '6px 14px',
              borderRadius: '8px 12px 10px 14px',
              boxShadow: '2px 3px 10px rgba(0,0,0,0.08)',
              color: 'hsl(152, 30%, 25%)',
              border: '1px solid rgba(180,170,150,0.2)',
            }}
          >
            {phrase}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
