import { motion } from 'framer-motion';

interface Props {
  onClick: () => void;
  isOpen: boolean;
}

export default function SeedButton({ onClick, isOpen }: Props) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 flex items-center justify-center seed-ripple"
      style={{
        background: 'linear-gradient(135deg, hsl(122, 38%, 63%), hsl(122, 38%, 55%))',
        borderRadius: '50%',
        boxShadow: '0 4px 15px rgba(129, 199, 132, 0.4)',
        border: '2px solid rgba(255,255,255,0.3)',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={isOpen ? { rotate: 45 } : { rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <span className="text-2xl">{isOpen ? '✕' : '🌱'}</span>
    </motion.button>
  );
}
