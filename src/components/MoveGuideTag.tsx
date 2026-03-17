import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoveHorizontal } from 'lucide-react';

const STORAGE_KEY = 'forest.move_guide_dismissed_v4';
const DRAG_THRESHOLD_PX = 60;
// 引导至少稳定显示 8 秒后，用户再拖拽才触发消失
const DISMISS_LISTEN_DELAY_MS = 8000;

/** 检测用户是否已经关闭过引导，确保只显示一次。 */
function hasBeenDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Ignore storage failures.
  }
}

export default function MoveGuideTag() {
  const [visible, setVisible] = useState(() => !hasBeenDismissed());
  const [readyToDismiss, setReadyToDismiss] = useState(false);
  const downXRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  // 等动画完全呈现后才允许被拖拽消除
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setReadyToDismiss(true), DISMISS_LISTEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    markDismissed();
    setVisible(false);
  };

  useEffect(() => {
    if (!readyToDismiss) return;

    const handleDown = (e: PointerEvent | MouseEvent) => {
      downXRef.current = e.clientX;
    };

    const handleMove = (e: PointerEvent | MouseEvent) => {
      if (downXRef.current === null) return;
      const deltaX = Math.abs(e.clientX - downXRef.current);
      if (deltaX >= DRAG_THRESHOLD_PX) {
        dismiss();
      }
    };

    const handleUp = () => {
      downXRef.current = null;
    };

    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('pointerdown', handleDown as (e: Event) => void);
    window.addEventListener('pointermove', handleMove as (e: Event) => void);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('pointerdown', handleDown as (e: Event) => void);
      window.removeEventListener('pointermove', handleMove as (e: Event) => void);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [readyToDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="move-guide-tag"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.4 } }}
          transition={{ delay: 1.5, duration: 0.6, ease: 'easeOut' }}
          style={{ opacity: 0 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            animate={{ x: [-14, 14, -14] }}
            transition={{
              duration: 1.8,
              ease: 'easeInOut',
              repeat: Infinity,
              delay: 2,
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
          >
            <MoveHorizontal size={22} color="white" strokeWidth={1.8} />
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.85)',
                fontFamily: 'var(--font-handwritten, sans-serif)',
                letterSpacing: '0.04em',
              }}
            >
              左右拖拽探索森林
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
