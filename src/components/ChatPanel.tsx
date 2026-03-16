import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatHistoryEntry, TreeAgent } from '@/types/forest';
import { getPersonaLabel } from '@/constants/personaMatrix';

interface Props {
  messages: ChatHistoryEntry[];
  agents: TreeAgent[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectMessage: (entry: ChatHistoryEntry) => void;
  onFocusTree: (treeId: string) => void;
}

const PERSONALITY_SYMBOL: Record<string, string> = {
  温柔: '♥',
  睿智: '✦',
  顽皮: '♪',
  活泼: '✿',
  社恐: '◦',
  神启: '★',
};

const PERSONALITY_COLOR: Record<string, string> = {
  温柔: '#E7849B',
  睿智: '#5D91A6',
  顽皮: '#D98958',
  活泼: '#A5962D',
  社恐: '#888888',
  神启: '#D4A72C',
};

const formatAgo = (createdAt: number, now: number) => {
  const sec = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (sec < 2) return '刚刚';
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hour = Math.floor(min / 60);
  return `${hour}h`;
};

const formatClock = (createdAt: number) =>
  new Date(createdAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const displayName = (name?: string) => (name ?? '无名树').replace(/\d+/g, '');

const MESSAGE_SPLIT_RE = /\s+(?=[^\s：]{1,8}：)/;
const CONTRAST_RE = /(我要|决定了|打赌|突然|别眨眼|快看|嘿嘿|哈哈|哇|呀呼|其实|原来)/;

const segmentMessage = (message: string) =>
  message
    .split(MESSAGE_SPLIT_RE)
    .map((line) => line.trim())
    .filter(Boolean);

const isEchoLine = (line: string) => /^[^\s：]{1,8}：/.test(line);

const highlightContrast = (line: string) => {
  const matched = line.match(CONTRAST_RE);
  if (!matched || typeof matched.index !== 'number') {
    return { before: line, accent: '', after: '' };
  }
  const start = matched.index;
  const accent = matched[0];
  return {
    before: line.slice(0, start),
    accent,
    after: line.slice(start + accent.length),
  };
};

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const getExpandedPanelWidth = () => {
  if (typeof window === 'undefined') return 312;
  return Math.min(332, Math.max(268, window.innerWidth - 28));
};

const DEFAULT_PANEL_HEIGHT_RATIO = 0.48;
const MIN_PANEL_HEIGHT = 250;
const MAX_PANEL_HEIGHT_RATIO = 0.78;
const PANEL_MARGIN = 8;
const COLLAPSED_WIDTH = 35;
const COLLAPSED_OPACITY = 0.8;
const COLLAPSED_X = 20;
const EXPANDED_OPACITY = 1;
const EXPANDED_X = 0;
const BLUR_EXPANDED = 'blur(12px)';
const BLUR_COLLAPSED = 'blur(4px)';
const SPRING_TRANSITION = { type: 'spring' as const, stiffness: 260, damping: 20 };
const MESSAGE_GROUP_GAP_MS = 6 * 60 * 1000;

type ConversationBubble = {
  speakerId: string;
  message: string;
  entryId: string;
  createdAt: number;
  type?: 'chat' | 'epic' | 'system';
};

type MessageRenderItem =
  | { kind: 'group'; key: string; label: string }
  | { kind: 'conversation'; key: string; treeAId: string; treeBId: string; bubbles: ConversationBubble[] };

const CONV_MERGE_MS = 4 * 60 * 1000;

export default function ChatPanel({
  messages,
  agents,
  collapsed,
  onToggleCollapsed,
  onSelectMessage,
  onFocusTree,
}: Props) {
  const isCollapsed = collapsed;
  const [messageTypeFilter, setMessageTypeFilter] = useState<'all' | 'chat' | 'epic' | 'system'>('all');
  const [now, setNow] = useState(() => Date.now());
  const [visualCollapsed, setVisualCollapsed] = useState(isCollapsed);
  const [showContent, setShowContent] = useState(!isCollapsed);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadSymbol, setUnreadSymbol] = useState<string>('💬');
  const [panelSize, setPanelSize] = useState(() => {
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    const width = getExpandedPanelWidth();
    return {
      width,
      height: Math.round(h * DEFAULT_PANEL_HEIGHT_RATIO),
    };
  });
  const [panelPos, setPanelPos] = useState(() => {
    return {
      x: 12,
      y: 56,
    };
  });
  const latestMessageIdRef = useRef<string | null>(messages[messages.length - 1]?.id ?? null);
  const hasInitializedCollapseStateRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const resizeRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originW: 0,
    originH: 0,
  });

  const stopDragging = () => {
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
  };

  const stopResizing = () => {
    resizeRef.current.active = false;
    resizeRef.current.pointerId = null;
  };

  const onDragEnd = (ev: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current.pointerId !== null && ev.pointerId !== dragRef.current.pointerId) return;
    stopDragging();
  };

  const byId = useMemo(() => {
    return new Map(agents.map((agent) => [agent.id, agent]));
  }, [agents]);
  const manualTreeId = useMemo(() => [...agents].reverse().find((agent) => agent.isManual)?.id ?? null, [agents]);

  const playPanelToggleWhisper = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const duration = 0.1;
      const sampleRate = ctx.sampleRate;
      const length = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envelope = Math.sin(Math.PI * t);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const bandPass = ctx.createBiquadFilter();
      bandPass.type = 'bandpass';
      bandPass.frequency.value = 1800;
      bandPass.Q.value = 0.85;

      const highPass = ctx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 320;

      const gain = ctx.createGain();
      gain.gain.value = 0.0001;

      const nowTime = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, nowTime);
      gain.gain.linearRampToValueAtTime(0.0055, nowTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, nowTime + duration);

      source.connect(bandPass);
      bandPass.connect(highPass);
      highPass.connect(gain);
      gain.connect(ctx.destination);

      source.start(nowTime);
      source.stop(nowTime + duration);
    } catch {
      // Ignore audio errors caused by autoplay or unavailable audio context.
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clampPanelSize = (width: number, height: number, x: number, y: number) => {
    const maxByViewportH = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - y - PANEL_MARGIN);
    const maxH = Math.min(window.innerHeight * MAX_PANEL_HEIGHT_RATIO, maxByViewportH);
    return {
      width: getExpandedPanelWidth(),
      height: Math.min(maxH, Math.max(MIN_PANEL_HEIGHT, height)),
    };
  };

  const clampPanelPos = (x: number, y: number, isCollapsed: boolean, width: number, height: number) => {
    const panelW = isCollapsed ? COLLAPSED_WIDTH : width;
    const panelH = height;
    const minX = PANEL_MARGIN;
    const maxX = Math.max(PANEL_MARGIN, window.innerWidth - panelW - PANEL_MARGIN);
    const minY = PANEL_MARGIN;
    const maxY = Math.max(PANEL_MARGIN, window.innerHeight - panelH - PANEL_MARGIN);
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  };

  useEffect(() => {
    const onPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current.active) return;
      if (dragRef.current.pointerId !== null && ev.pointerId !== dragRef.current.pointerId) return;
      if (ev.buttons === 0) {
        stopDragging();
        return;
      }
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const next = clampPanelPos(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy,
        visualCollapsed,
        panelSize.width,
        panelSize.height,
      );
      setPanelPos(next);
    };

    const onResizePointerMove = (ev: PointerEvent) => {
      if (!resizeRef.current.active) return;
      if (resizeRef.current.pointerId !== null && ev.pointerId !== resizeRef.current.pointerId) return;
      if (ev.buttons === 0) {
        stopResizing();
        return;
      }

      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      const next = clampPanelSize(
        resizeRef.current.originW,
        resizeRef.current.originH + dy,
        panelPos.x,
        panelPos.y,
      );
      setPanelSize(next);
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (dragRef.current.pointerId === ev.pointerId) stopDragging();
      if (resizeRef.current.pointerId === ev.pointerId) stopResizing();
    };

    const onPointerCancel = () => {
      stopDragging();
      stopResizing();
    };

    const onWindowBlur = () => {
      stopDragging();
      stopResizing();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        stopDragging();
        stopResizing();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointermove', onResizePointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointermove', onResizePointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [panelPos.x, panelPos.y, panelSize.height, panelSize.width, visualCollapsed]);

  useEffect(() => {
    const onResize = () => {
      setPanelPos((prev) => {
        const nextSize = clampPanelSize(panelSize.width, panelSize.height, prev.x, prev.y);
        setPanelSize(nextSize);
        return clampPanelPos(prev.x, prev.y, visualCollapsed, nextSize.width, nextSize.height);
      });
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [panelSize.height, panelSize.width, visualCollapsed]);

  const onDragStart = (ev: React.PointerEvent) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    if (resizeRef.current.active) return;
    dragRef.current.active = true;
    dragRef.current.pointerId = ev.pointerId;
    dragRef.current.startX = ev.clientX;
    dragRef.current.startY = ev.clientY;
    dragRef.current.originX = panelPos.x;
    dragRef.current.originY = panelPos.y;
  };

  const onResizeStart = (ev: React.PointerEvent) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (dragRef.current.active) return;
    resizeRef.current.active = true;
    resizeRef.current.pointerId = ev.pointerId;
    resizeRef.current.startX = ev.clientX;
    resizeRef.current.startY = ev.clientY;
    resizeRef.current.originW = panelSize.width;
    resizeRef.current.originH = panelSize.height;
  };

  const visibleMessages = useMemo(() => {
    const filtered = messageTypeFilter === 'all'
      ? messages
      : messages.filter((entry) => (entry.type ?? 'chat') === messageTypeFilter);

    if (!manualTreeId) return filtered;

    return [...filtered].sort((a, b) => {
      const aScore = a.speakerId === manualTreeId ? 1 : 0;
      const bScore = b.speakerId === manualTreeId ? 1 : 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.createdAt - b.createdAt;
    });
  }, [messages, manualTreeId, messageTypeFilter]);

  const messageRenderItems = useMemo<MessageRenderItem[]>(() => {
    const items: MessageRenderItem[] = [];
    let groupAnchor = 0;
    let convPairKey = '';
    let convAnchor = 0;

    visibleMessages.forEach((entry, index) => {
      const shouldCreateGroup =
        index === 0
        || entry.createdAt < groupAnchor
        || entry.createdAt - groupAnchor > MESSAGE_GROUP_GAP_MS;

      if (shouldCreateGroup) {
        groupAnchor = entry.createdAt;
        items.push({
          kind: 'group',
          key: `group-${entry.id}`,
          label: formatClock(entry.createdAt),
        });
      }

      const thisPairKey = [entry.speakerId, entry.listenerId].sort().join('|');
      const lastItem = items[items.length - 1];
      const shouldMerge =
        lastItem?.kind === 'conversation'
        && thisPairKey === convPairKey
        && entry.createdAt - convAnchor < CONV_MERGE_MS;

      if (shouldMerge && lastItem.kind === 'conversation') {
        lastItem.bubbles.push({
          speakerId: entry.speakerId,
          message: entry.message,
          entryId: entry.id,
          createdAt: entry.createdAt,
          type: entry.type,
        });
      } else {
        convPairKey = thisPairKey;
        convAnchor = entry.createdAt;
        items.push({
          kind: 'conversation',
          key: entry.id,
          treeAId: entry.speakerId,
          treeBId: entry.listenerId,
          bubbles: [{
            speakerId: entry.speakerId,
            message: entry.message,
            entryId: entry.id,
            createdAt: entry.createdAt,
            type: entry.type,
          }],
        });
      }
    });

    return items;
  }, [visibleMessages]);

  useEffect(() => {
    if (!listRef.current || isCollapsed) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [isCollapsed, visibleMessages]);

  useEffect(() => {
    if (isCollapsed) {
      if (hasInitializedCollapseStateRef.current) playPanelToggleWhisper();
      setShowContent(false);
      const timer = window.setTimeout(() => setVisualCollapsed(true), 90);
      hasInitializedCollapseStateRef.current = true;
      return () => window.clearTimeout(timer);
    }

    if (hasInitializedCollapseStateRef.current) playPanelToggleWhisper();
    setVisualCollapsed(false);
    setUnreadCount(0);
    const timer = window.setTimeout(() => setShowContent(true), 220);
    hasInitializedCollapseStateRef.current = true;
    return () => window.clearTimeout(timer);
  }, [isCollapsed]);

  useEffect(() => {
    const latestMessageId = messages[messages.length - 1]?.id ?? null;
    if (!latestMessageId) return;
    if (latestMessageIdRef.current === null) {
      latestMessageIdRef.current = latestMessageId;
      return;
    }
    if (latestMessageId !== latestMessageIdRef.current) {
      if (isCollapsed) {
        setUnreadCount((value) => value + 1);
        const latestMessage = messages[messages.length - 1];
        const latestSpeaker = agents.find((agent) => agent.id === latestMessage?.speakerId);
        setUnreadSymbol(PERSONALITY_SYMBOL[latestSpeaker?.personality ?? ''] ?? '💬');
      }
      latestMessageIdRef.current = latestMessageId;
    }
  }, [agents, isCollapsed, messages]);

  return (
    <div
      className="fixed"
      style={{ left: panelPos.x, top: panelPos.y, zIndex: 35 }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheelCapture={(e) => e.stopPropagation()}
    >
      <motion.div
        className="relative"
        initial={false}
        animate={{
          width: visualCollapsed ? COLLAPSED_WIDTH : panelSize.width,
          opacity: visualCollapsed ? COLLAPSED_OPACITY : EXPANDED_OPACITY,
          x: visualCollapsed ? COLLAPSED_X : EXPANDED_X,
          backdropFilter: visualCollapsed ? BLUR_COLLAPSED : BLUR_EXPANDED,
        }}
        transition={SPRING_TRANSITION}
        whileHover={visualCollapsed ? { x: COLLAPSED_X - 5 } : undefined}
        style={{
          height: panelSize.height,
          borderRadius: visualCollapsed ? 26 : 16,
          border: visualCollapsed ? '1px solid rgba(103, 74, 48, 0.72)' : '1px solid rgba(255,255,255,0.55)',
          background: visualCollapsed
            ? 'linear-gradient(180deg, rgba(173,132,92,0.96) 0%, rgba(142,102,66,0.95) 46%, rgba(124,86,56,0.95) 100%)'
            : 'linear-gradient(180deg, rgba(247, 250, 247, 0.78) 0%, rgba(240, 246, 241, 0.72) 100%)',
          boxShadow: visualCollapsed
            ? 'inset 0 1px 0 rgba(255,220,185,0.42), inset 0 -2px 6px rgba(75,50,28,0.34), 0 14px 26px rgba(44,26,14,0.28)'
            : '-10px 0 30px rgba(0,0,0,0.03), 0 16px 30px rgba(12, 42, 25, 0.14)',
          overflow: 'hidden',
          cursor: visualCollapsed ? 'pointer' : 'default',
        }}
        onPointerDown={visualCollapsed ? onDragStart : undefined}
        onPointerUp={visualCollapsed ? onDragEnd : undefined}
        onPointerCancel={visualCollapsed ? onDragEnd : undefined}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={visualCollapsed ? '展开聊天面板' : '收起聊天面板'}
          className="absolute top-4 z-10 flex items-center justify-center"
          style={{
            left: visualCollapsed ? 14 : 0,
            width: visualCollapsed ? 22 : 18,
            height: visualCollapsed ? 22 : 60,
            borderRadius: visualCollapsed ? 0 : '0 999px 999px 0',
            clipPath: visualCollapsed ? 'polygon(50% 0%, 62% 16%, 80% 10%, 74% 30%, 92% 42%, 76% 54%, 82% 76%, 62% 72%, 50% 100%, 38% 72%, 18% 76%, 24% 54%, 8% 42%, 26% 30%, 20% 10%, 38% 16%)' : 'none',
            border: visualCollapsed
              ? '1px solid rgba(160, 80, 34, 0.9)'
              : '1px solid rgba(197, 174, 147, 0.86)',
            borderLeft: visualCollapsed ? undefined : 'none',
            background: visualCollapsed
              ? 'radial-gradient(circle at 35% 28%, rgba(255, 190, 112, 0.95) 0%, rgba(226, 120, 44, 0.96) 52%, rgba(176, 78, 26, 0.96) 100%)'
              : 'linear-gradient(180deg, rgba(228,209,182,0.88) 0%, rgba(208,184,152,0.86) 100%)',
            color: visualCollapsed ? 'rgba(255, 247, 230, 0.96)' : 'rgba(112, 86, 56, 0.9)',
            boxShadow: visualCollapsed
              ? 'inset 0 1px 0 rgba(255, 220, 172, 0.6), 0 4px 10px rgba(92, 42, 16, 0.36)'
              : 'inset 0 1px 0 rgba(255,243,220,0.45), 2px 6px 12px rgba(108, 86, 58, 0.16)',
            fontSize: visualCollapsed ? 10 : 11,
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              transform: visualCollapsed ? 'translateY(-0.5px)' : 'translateX(-0.5px)',
              textShadow: visualCollapsed
                ? '0 1px 2px rgba(95,36,10,0.5)'
                : '0 1px 0 rgba(255,245,230,0.5)',
            }}
          >
            {'⌖'}
          </span>
        </button>

        {visualCollapsed && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'repeating-linear-gradient(175deg, rgba(82,56,34,0.0) 0px, rgba(82,56,34,0.0) 12px, rgba(88,60,38,0.2) 13px, rgba(88,60,38,0.2) 14px)',
                opacity: 0.28,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 11,
                height: 11,
                borderRadius: 999,
                background: 'rgba(74, 47, 28, 0.66)',
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 28,
                height: 34,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 1px 1px rgba(60,42,26,0.35))',
              }}
              title="叶纹标记"
            >
              <svg viewBox="0 0 24 30" width="100%" height="100%" aria-hidden>
                <path
                  d="M12 2 C20 6,22 14,17 21 C14 25,10 27,7 26 C3 24,2 19,4 14 C6 9,9 5,12 2 Z"
                  fill="rgba(205, 238, 199, 0.44)"
                  stroke="rgba(184, 226, 174, 0.66)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 23 C11 18,14 13,16 7"
                  fill="none"
                  stroke="rgba(174, 217, 166, 0.72)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
                <path
                  d="M10 18 L7.6 15.6 M12.4 14.6 L10.1 12.5"
                  fill="none"
                  stroke="rgba(174, 217, 166, 0.58)"
                  strokeWidth="0.95"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </>
        )}

        {visualCollapsed && unreadCount > 0 && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ y: [0, -2, 0], scale: [1, 1.14, 1], opacity: 1 }}
              transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                right: 9,
                top: 24,
                width: 20,
                height: 20,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid rgba(255,255,255,0.74)',
                color: 'hsl(151, 28%, 28%)',
                fontSize: 12,
                lineHeight: '20px',
                textAlign: 'center',
                boxShadow: '0 5px 14px rgba(40, 80, 58, 0.2)',
              }}
              title="森林里有新的悄悄话"
            >
              {unreadSymbol}
            </motion.div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.16, 1], opacity: 1 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                right: 6,
                top: 6,
                minWidth: 14,
                height: 14,
                padding: '0 4px',
                borderRadius: 999,
                background: 'rgba(231, 72, 72, 0.9)',
                color: 'white',
                fontSize: 9,
                lineHeight: '14px',
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(210, 40, 40, 0.45)',
              }}
            >
              {Math.min(unreadCount, 9)}
            </motion.div>
          </>
        )}

        <AnimatePresence initial={false}>
          {showContent && !visualCollapsed && (
            <motion.div
              key="chat-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >

            <div
              className="px-4 pt-4 pb-3"
              onPointerDown={onDragStart}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.45)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.56), rgba(255,255,255,0.36))',
                cursor: 'grab',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: 23,
                  fontWeight: 'normal',
                  lineHeight: 1,
                  color: 'hsl(146, 34%, 24%)',
                  letterSpacing: '1.8px',
                }}
              >
                森林絮语
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: 13,
                  fontWeight: 'normal',
                  color: 'rgba(74, 94, 78, 0.8)',
                  letterSpacing: '1.6px',
                  lineHeight: 1,
                }}
              >
                神谕日记
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'chat', label: '对话' },
                  { key: 'epic', label: '史诗' },
                  { key: 'system', label: '诏令' },
                ].map((opt) => {
                  const active = messageTypeFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMessageTypeFilter(opt.key as 'all' | 'chat' | 'epic' | 'system')}
                      className="px-2.5 py-1 text-[11px]"
                      style={{
                        borderRadius: 999,
                        border: active ? '1px solid rgba(186, 138, 35, 0.6)' : '1px solid rgba(255,255,255,0.5)',
                        background: active ? 'rgba(250, 226, 164, 0.52)' : 'rgba(255,255,255,0.42)',
                        color: active ? 'rgba(118, 82, 24, 0.92)' : 'rgba(72, 84, 70, 0.82)',
                        lineHeight: 1,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              ref={listRef}
              className="overflow-y-auto px-3 py-2"
              style={{
                height: Math.max(120, panelSize.height - 112),
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(70,110,85,0.35) transparent',
              }}
            >
              <AnimatePresence initial={false}>
                {messageRenderItems.map((item) => {
                  if (item.kind === 'group') {
                    return (
                      <motion.div
                        key={item.key}
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
                          {item.label}
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(86, 112, 96, 0.14)' }} />
                      </motion.div>
                    );
                  }

                  // Conversation card
                  const treeA = byId.get(item.treeAId);
                  const treeB = byId.get(item.treeBId);
                  const personalityA = treeA?.personality ?? '温柔';
                  const personalityB = treeB?.personality ?? '温柔';
                  const colorA = PERSONALITY_COLOR[personalityA] ?? '#6a997b';
                  const colorB = PERSONALITY_COLOR[personalityB] ?? '#7a8f5a';
                  const symbolA = PERSONALITY_SYMBOL[personalityA] ?? '·';
                  const symbolB = PERSONALITY_SYMBOL[personalityB] ?? '·';
                  const personaA = getPersonaLabel(personalityA);
                  const personaB = getPersonaLabel(personalityB);
                  const firstBubble = item.bubbles[0];
                  const lastBubble = item.bubbles[item.bubbles.length - 1];
                  // Trending: any bubble is trending
                  const isTrendingConv = item.bubbles.some((b) => {
                    const e = visibleMessages.find((m) => m.id === b.entryId);
                    return Boolean(e?.isTrending);
                  });
                  const isDivineConv = Boolean(
                    manualTreeId && (item.treeAId === manualTreeId || item.treeBId === manualTreeId)
                  );
                  const isEpicConv = firstBubble?.type === 'epic';
                  const isSystemConv = firstBubble?.type === 'system';
                  // Aggregate virtual counts
                  const totalLikes = item.bubbles.reduce((sum, b) => {
                    const e = visibleMessages.find((m) => m.id === b.entryId);
                    return sum + (e?.likes ?? 0);
                  }, 0);
                  const totalComments = item.bubbles.reduce((sum, b) => {
                    const e = visibleMessages.find((m) => m.id === b.entryId);
                    return sum + (e?.comments ?? 0);
                  }, 0);

                  return (
                    <motion.div
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.24, ease: 'easeOut' }}
                      className="w-full mb-3"
                      style={{
                        border: isTrendingConv
                          ? '1px solid rgba(255, 90, 70, 0.42)'
                          : isDivineConv
                            ? '1px solid rgba(212, 167, 44, 0.6)'
                            : '1px solid rgba(255,255,255,0.6)',
                        background: isTrendingConv
                          ? 'linear-gradient(145deg, rgba(255, 240, 238, 0.88), rgba(255, 220, 214, 0.55))'
                          : isDivineConv
                            ? 'linear-gradient(145deg, rgba(255, 245, 204, 0.82), rgba(255, 234, 165, 0.52))'
                            : 'rgba(255,255,255,0.52)',
                        borderRadius: 14,
                        padding: '9px 10px 10px',
                        boxShadow: isTrendingConv
                          ? '0 4px 14px rgba(255, 90, 70, 0.12)'
                          : isDivineConv
                            ? '0 8px 18px rgba(212, 167, 44, 0.2)'
                            : '0 2px 8px rgba(55, 90, 68, 0.05)',
                      }}
                    >
                      {/* Header row: initiator -> receiver flow + badges + time */}
                      <div className="flex items-start justify-between mb-1.5 gap-1.5">
                        <div className="min-w-0 flex-1" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${colorA}44`,
                                background: `${colorA}1f`,
                                color: colorA,
                                fontSize: 10,
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                            >
                              {symbolA}
                            </div>
                            <span
                              className="truncate"
                              style={{
                                color: colorA,
                                fontSize: 11,
                                fontWeight: 700,
                                maxWidth: 78,
                                fontFamily: "'ZCOOL KuaiLe', 'var(--font-handwritten)', cursive",
                              }}
                            >
                              {displayName(treeA?.name)}
                            </span>
                          </div>

                          <motion.span
                            animate={{ x: [0, 2, 0], opacity: [0.55, 0.95, 0.55] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                              color: 'rgba(95, 122, 108, 0.55)',
                              fontSize: 11,
                              letterSpacing: '0.02em',
                              flexShrink: 0,
                              textShadow: '0 0 6px rgba(173, 233, 216, 0.35)',
                            }}
                          >
                            ➔
                          </motion.span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${colorB}44`,
                                background: `${colorB}1f`,
                                color: colorB,
                                fontSize: 10,
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                            >
                              {symbolB}
                            </div>
                            <span
                              className="truncate"
                              style={{
                                color: colorB,
                                fontSize: 11,
                                fontWeight: 700,
                                maxWidth: 78,
                                fontFamily: "'ZCOOL KuaiLe', 'var(--font-handwritten)', cursive",
                              }}
                            >
                              {displayName(treeB?.name)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <div className="flex items-center gap-1">
                            {isTrendingConv && (
                              <span
                                style={{
                                  borderRadius: 999,
                                  padding: '1px 6px',
                                  background: 'rgba(255, 80, 50, 0.14)',
                                  border: '1px solid rgba(255, 80, 50, 0.4)',
                                  color: 'rgba(200, 50, 30, 0.9)',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  lineHeight: 1.35,
                                }}
                              >
                                🔥 热搜
                              </span>
                            )}
                            {(isEpicConv || isSystemConv) && !isTrendingConv && (
                              <span
                                style={{
                                  borderRadius: 999,
                                  padding: '1px 6px',
                                  border: isEpicConv ? '1px solid rgba(182, 137, 55, 0.5)' : '1px solid rgba(116, 116, 116, 0.35)',
                                  background: isEpicConv ? 'rgba(230, 188, 84, 0.2)' : 'rgba(161, 166, 164, 0.18)',
                                  color: isEpicConv ? 'rgba(125, 84, 16, 0.92)' : 'rgba(89, 89, 89, 0.9)',
                                  fontSize: 10,
                                  lineHeight: 1.35,
                                  fontWeight: 600,
                                }}
                              >
                                {isEpicConv ? '史诗' : '诏令'}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'rgba(80,80,80,0.45)' }}>
                            {formatAgo(lastBubble.createdAt, now)}
                          </span>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1.5 mb-1.5"
                        style={{ marginLeft: 1 }}
                      >
                        <span
                          style={{
                            color: colorA,
                            fontSize: 9,
                            opacity: 0.78,
                            background: `${colorA}14`,
                            border: `1px solid ${colorA}28`,
                            borderRadius: 999,
                            padding: '0px 5px',
                            lineHeight: 1.6,
                          }}
                        >
                          {personaA}
                        </span>
                        <span style={{ color: 'rgba(90, 118, 100, 0.55)', fontSize: 9 }}>私聊频道</span>
                        <span
                          style={{
                            color: colorB,
                            fontSize: 9,
                            opacity: 0.78,
                            background: `${colorB}14`,
                            border: `1px solid ${colorB}28`,
                            borderRadius: 999,
                            padding: '0px 5px',
                            lineHeight: 1.6,
                          }}
                        >
                          {personaB}
                        </span>
                      </div>

                      {/* Chat bubbles */}
                      <div style={{ display: 'grid', gap: 5, marginTop: 6 }}>
                        {item.bubbles.map((bubble) => {
                          const isLeft = bubble.speakerId === item.treeAId;
                          const bubbleColor = isLeft ? colorA : colorB;
                          const bubbleSymbol = isLeft ? symbolA : symbolB;
                          const segments = segmentMessage(bubble.message);
                          return (
                            <div
                              key={bubble.entryId}
                              style={{ display: 'flex', justifyContent: isLeft ? 'flex-start' : 'flex-end' }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const found = visibleMessages.find((e) => e.id === bubble.entryId);
                                  if (found) onSelectMessage(found);
                                }}
                                style={{
                                  textAlign: 'left',
                                  maxWidth: '86%',
                                  background: `linear-gradient(160deg, ${bubbleColor}18, rgba(255,255,255,0.45))`,
                                  border: `1px solid ${bubbleColor}2e`,
                                  borderRadius: isLeft ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                                  padding: '6px 9px 7px',
                                  cursor: 'pointer',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'block',
                                    color: bubbleColor,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    marginBottom: 3,
                                    opacity: 0.85,
                                  }}
                                >
                                  {bubbleSymbol}
                                </span>
                                {segments.map((line, idx) => {
                                  const echo = isEchoLine(line);
                                  const highlighted = highlightContrast(line);
                                  return (
                                    <p
                                      key={idx}
                                      style={{
                                        margin: 0,
                                        padding: echo ? '3px 7px' : 0,
                                        borderLeft: echo ? `2px solid ${bubbleColor}66` : 'none',
                                        borderRadius: echo ? 8 : 0,
                                        background: echo ? `${bubbleColor}12` : 'transparent',
                                        color: echo ? 'rgba(63, 89, 73, 0.9)' : 'hsl(150, 22%, 24%)',
                                        fontSize: echo ? 11 : 12,
                                        lineHeight: echo ? 1.5 : 1.62,
                                        fontStyle: echo ? 'italic' : 'normal',
                                        letterSpacing: '0.01em',
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {highlighted.before}
                                      {highlighted.accent ? (
                                        <span
                                          style={{
                                            padding: '0 2px',
                                            borderRadius: 4,
                                            background: `${bubbleColor}1f`,
                                            color: bubbleColor,
                                            fontWeight: 700,
                                          }}
                                        >
                                          {highlighted.accent}
                                        </span>
                                      ) : null}
                                      {highlighted.after}
                                    </p>
                                  );
                                })}
                                <div
                                  style={{
                                    marginTop: 3,
                                    textAlign: 'right',
                                    fontSize: 9,
                                    color: 'rgba(92, 102, 96, 0.6)',
                                    lineHeight: 1,
                                  }}
                                >
                                  {formatAgo(bubble.createdAt, now)}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer: virtual interaction counts */}
                      {(totalLikes > 0 || totalComments > 0) && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginTop: 6,
                            paddingTop: 5,
                            borderTop: '1px solid rgba(80,80,80,0.07)',
                          }}
                        >
                          {totalLikes > 0 && (
                            <span style={{ fontSize: 10, color: 'rgba(180, 60, 80, 0.72)', display: 'flex', alignItems: 'center', gap: 2 }}>
                              ❤️ {totalLikes >= 99 ? '99+' : totalLikes}
                            </span>
                          )}
                          {totalComments > 0 && (
                            <span style={{ fontSize: 10, color: 'rgba(80, 120, 80, 0.65)', display: 'flex', alignItems: 'center', gap: 2 }}>
                              💬 {totalComments >= 99 ? '99+' : totalComments}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {visibleMessages.length === 0 && (
                <div
                  className="h-full flex items-center justify-center"
                  style={{ color: 'rgba(40,70,55,0.55)', fontSize: 12 }}
                >
                  风声还在酝酿第一句悄悄话
                </div>
              )}
            </div>

            <div
              onPointerDown={onResizeStart}
              title="拖拽调整高度"
              className="absolute right-1 bottom-1 h-4 w-4"
              style={{
                cursor: 'ns-resize',
                borderRight: '2px solid rgba(70,110,85,0.55)',
                borderBottom: '2px solid rgba(70,110,85,0.55)',
                borderBottomRightRadius: 6,
              }}
            />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
