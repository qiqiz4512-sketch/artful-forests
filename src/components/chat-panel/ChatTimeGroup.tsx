import { motion } from 'framer-motion';

interface ChatTimeGroupProps {
  label: string;
}

export function ChatTimeGroup({ label }: ChatTimeGroupProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '8px 4px 6px',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'rgba(86, 112, 96, 0.14)' }} />
      <span
        style={{
          fontSize: 10,
          color: 'rgba(74, 92, 80, 0.72)',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(86, 112, 96, 0.14)' }} />
    </motion.div>
  );
}