import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTimeTheme } from '@/hooks/useTimeTheme';
import { cn } from '@/lib/utils';

const SPEECH_BUBBLE_EXIT_MS = 5000;

interface SpeechBubbleProps {
  messages: string[];
  className?: string;
  style?: CSSProperties;
}

export default function SpeechBubble({ messages, className, style }: SpeechBubbleProps) {
  const { theme } = useTimeTheme();
  const [visibleMessage, setVisibleMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const latestMessage = useMemo(() => {
    const normalizedMessages = messages
      .map((message) => message.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return normalizedMessages[normalizedMessages.length - 1] ?? '';
  }, [messages]);

  useEffect(() => {
    if (!latestMessage) {
      setIsVisible(false);
      return;
    }

    setVisibleMessage(latestMessage);
    setIsVisible(true);

    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, SPEECH_BUBBLE_EXIT_MS);

    return () => window.clearTimeout(timer);
  }, [latestMessage]);

  const isDarkTheme = theme === 'night';
  const bubbleStyle: CSSProperties = isDarkTheme
    ? {
        backgroundColor: 'rgba(22, 32, 24, 0.9)',
        color: '#F3F7F3',
        borderColor: 'rgba(255, 255, 255, 0.34)',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        color: '#2D4030',
        borderColor: 'rgba(45, 64, 48, 0.26)',
      };
  const arrowStyle: CSSProperties = isDarkTheme
    ? {
        backgroundColor: 'rgba(22, 32, 24, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.34)',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'rgba(45, 64, 48, 0.26)',
      };
  const bubbleClassName = cn(
    'relative max-w-[220px] rounded-[15px] border p-3 px-4 font-bold leading-tight antialiased backdrop-blur-md shadow-[0_12px_24px_rgba(88,98,112,0.16)]',
  );
  const arrowClassName = cn(
    'absolute left-1/2 bottom-[-7px] h-3 w-3 -translate-x-1/2 rotate-45 border-l border-b',
  );

  return (
    <AnimatePresence mode="wait">
      {isVisible && visibleMessage && (
        <motion.div
          key={visibleMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={cn('pointer-events-none', className)}
          style={style}
        >
          <div className={bubbleClassName} style={bubbleStyle}>
            <div className="whitespace-pre-wrap break-words">{visibleMessage}</div>
            <div className={arrowClassName} style={arrowStyle} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}