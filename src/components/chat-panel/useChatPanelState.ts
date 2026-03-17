import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChatHistoryEntry, TreeAgent } from '@/types/forest';

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const PERSONALITY_SYMBOL: Record<string, string> = {
  温柔: '♥',
  睿智: '✦',
  顽皮: '♪',
  活泼: '✿',
  社恐: '◦',
  神启: '★',
};

const getExpandedPanelWidth = () => {
  if (typeof window === 'undefined') return 312;
  return Math.min(332, Math.max(268, window.innerWidth - 28));
};

const DEFAULT_PANEL_HEIGHT_RATIO = 0.55;
const MIN_PANEL_HEIGHT = 300;
const MAX_PANEL_HEIGHT_RATIO = 0.85;
const PANEL_MARGIN = 8;
const COLLAPSED_WIDTH = 35;
const MESSAGE_GROUP_GAP_MS = 6 * 60 * 1000;

const formatClock = (createdAt: number) =>
  new Date(createdAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const injectAnimationStyles = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'bubble-animations';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes nervousShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-1px); }
      75% { transform: translateX(1px); }
    }
  `;
  document.head.appendChild(style);
};

export type MessageChannel = 'a2a' | 'u2a' | 'epic';

export type FlowRenderItem =
  | { kind: 'group'; key: string; label: string }
  | { kind: 'entry'; key: string; entry: ChatHistoryEntry };

interface UseChatPanelStateArgs {
  messages: ChatHistoryEntry[];
  agents: TreeAgent[];
  collapsed: boolean;
  activeTreeId?: string | null;
  focusInputSignal?: number;
  onSendMessage?: (message: string, targetTreeId: string) => Promise<boolean>;
  onSendSocialMessage?: (message: string, targetTreeId?: string | null) => Promise<boolean>;
}

export function useChatPanelState({
  messages,
  agents,
  collapsed,
  activeTreeId = null,
  focusInputSignal = 0,
  onSendMessage,
  onSendSocialMessage,
}: UseChatPanelStateArgs) {
  const isCollapsed = collapsed;
  const [messageTypeFilter, setMessageTypeFilter] = useState<MessageChannel>('a2a');
  const [now, setNow] = useState(() => Date.now());
  const [visualCollapsed, setVisualCollapsed] = useState(isCollapsed);
  const [showContent, setShowContent] = useState(!isCollapsed);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadSymbol, setUnreadSymbol] = useState<string>('💬');
  const [collapsedLongMessageIds, setCollapsedLongMessageIds] = useState<Set<string>>(() => new Set());
  const [activeLongMessageActionId, setActiveLongMessageActionId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [panelSize, setPanelSize] = useState(() => {
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    const width = getExpandedPanelWidth();
    return {
      width,
      height: Math.round(h * DEFAULT_PANEL_HEIGHT_RATIO),
    };
  });
  const [panelPos, setPanelPos] = useState(() => ({ x: 12, y: 56 }));
  const latestMessageIdRef = useRef<string | null>(messages[messages.length - 1]?.id ?? null);
  const hasInitializedCollapseStateRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messageItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const resizeRef = useRef({
    active: false,
    pointerId: null as number | null,
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

  const onDragEnd = (ev: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current.pointerId !== null && ev.pointerId !== dragRef.current.pointerId) return;
    stopDragging();
  };

  const byId = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const manualTreeId = useMemo(() => [...agents].reverse().find((agent) => agent.isManual)?.id ?? null, [agents]);
  const activeAgentName = activeTreeId ? byId.get(activeTreeId)?.name ?? null : null;
  const activeTree = activeTreeId ? byId.get(activeTreeId) ?? null : null;
  const isSocialTab = messageTypeFilter === 'a2a';

  const isManualTreeConversation = (entry: ChatHistoryEntry) => {
    if (entry.conversationMode === 'group') {
      return false;
    }

    if (entry.conversationMode === 'direct') {
      return true;
    }

    if (!manualTreeId) {
      return entry.source === 'user' || entry.source === 'llm';
    }

    return (
      entry.source === 'user'
      || entry.source === 'llm'
      || entry.speakerId === manualTreeId
      || entry.listenerId === manualTreeId
    );
  };

  const resolveMessageChannel = (entry: ChatHistoryEntry): MessageChannel => {
    if (entry.type === 'epic') return 'epic';
    if (entry.conversationMode === 'group') return 'a2a';
    if (entry.conversationMode === 'direct') return 'u2a';
    // 自动生成的A2A对话（含神启树与其他树的互动）一律显示在森林社交
    if (entry.source === 'auto') return 'a2a';
    if (isManualTreeConversation(entry)) return 'u2a';
    return 'a2a';
  };

  const resolveRelationTag = (treeAId: string, treeBId: string) => {
    const treeA = byId.get(treeAId);
    if (!treeA) return null;
    if (treeA.socialCircle.family.includes(treeBId)) return { icon: '👪', label: '家属' };
    if (treeA.socialCircle.friends.includes(treeBId)) return { icon: '🤝', label: '好友' };
    return null;
  };

  const scrollMessageIntoView = (entryId: string) => {
    const listElement = listRef.current;
    const messageElement = messageItemRefs.current.get(entryId);
    if (!listElement || !messageElement) return;

    window.requestAnimationFrame(() => {
      const listRect = listElement.getBoundingClientRect();
      const messageRect = messageElement.getBoundingClientRect();
      const topOffset = messageRect.top - listRect.top;
      const bottomOffset = messageRect.bottom - listRect.bottom;

      if (topOffset < 8 || bottomOffset > -8) {
        const targetScrollTop = listElement.scrollTop + (messageRect.top - listRect.top) - (listRect.height * 0.28);
        listElement.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      }
    });
  };

  const toggleLongMessage = (entryId: string) => {
    setCollapsedLongMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
    window.setTimeout(() => scrollMessageIntoView(entryId), 40);
  };

  const u2aRelationText = useMemo(() => {
    if (!activeTree) return '先点击一棵树建立私聊关系';
    if (!manualTreeId) return '当前正在和这棵树对话';
    const manualTree = byId.get(manualTreeId);
    if (!manualTree) return '当前正在和这棵树对话';

    const intimacy = Math.max(
      manualTree.intimacyMap[activeTree.id] ?? 0,
      activeTree.intimacyMap[manualTree.id] ?? 0,
    );
    const relation = activeTree.socialCircle.partner === manualTree.id
      ? '亲密伴侣'
      : activeTree.socialCircle.family.includes(manualTree.id)
        ? '家属'
        : activeTree.socialCircle.friends.includes(manualTree.id)
          ? '老友'
          : '新识';
    return `${relation} · 亲密度 ${Math.round(intimacy)}%`;
  }, [activeTree, byId, manualTreeId]);

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

  const handleSend = async (presetMessage?: string) => {
    if (isSending) return;
    const message = (presetMessage ?? draftMessage).trim();
    if (!message) return;
    if (!isSocialTab && !activeTreeId) return;
    
    console.log('[ChatPanel] 正在尝试发送消息到树木:', activeTreeId, '消息内容:', message.slice(0, 50));
    
    setIsSending(true);
    const previousDraft = draftMessage;
    setDraftMessage('');
    try {
      const sender = isSocialTab ? onSendSocialMessage : onSendMessage;
      const targetId = isSocialTab ? activeTreeId : activeTreeId ?? null;
      console.log('[ChatPanel] 调用发送函数，发送模式:', isSocialTab ? 'A2A社交' : 'U2A单聊', '目标:', targetId);
      const sent = await (sender?.(message, targetId) ?? Promise.resolve(false));
      console.log('[ChatPanel] 发送结果:', sent);
      if (sent) {
        console.log('[ChatPanel] 消息发送成功，清空输入框');
      } else {
        setDraftMessage(previousDraft);
        console.log('[ChatPanel] 消息发送返回false，可能存在验证失败或权限问题');
      }
    } catch (error) {
      setDraftMessage(previousDraft);
      console.error('[ChatPanel] 发送过程中出错:', error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (isCollapsed) return;
    if (focusInputSignal <= 0) return;
    const raf = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [focusInputSignal, isCollapsed]);

  const clampPanelSize = (width: number, height: number, y: number) => {
    const maxByViewportH = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - y - PANEL_MARGIN);
    const maxH = Math.min(window.innerHeight * MAX_PANEL_HEIGHT_RATIO, maxByViewportH);
    return {
      width: getExpandedPanelWidth(),
      height: Math.min(maxH, Math.max(MIN_PANEL_HEIGHT, height)),
    };
  };

  const clampPanelPos = (x: number, y: number, nextIsCollapsed: boolean, width: number, height: number) => {
    const panelW = nextIsCollapsed ? COLLAPSED_WIDTH : width;
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

      const dy = ev.clientY - resizeRef.current.startY;
      const next = clampPanelSize(
        resizeRef.current.originW,
        resizeRef.current.originH + dy,
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
  }, [panelPos.y, panelSize.height, panelSize.width, visualCollapsed]);

  useEffect(() => {
    const onResize = () => {
      setPanelPos((prev) => {
        const nextSize = clampPanelSize(panelSize.width, panelSize.height, prev.y);
        setPanelSize(nextSize);
        return clampPanelPos(prev.x, prev.y, visualCollapsed, nextSize.width, nextSize.height);
      });
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [panelSize.height, panelSize.width, visualCollapsed]);

  const onDragStart = (ev: ReactPointerEvent) => {
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

  const onResizeStart = (ev: ReactPointerEvent) => {
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
    const filtered = messages.filter((entry) => resolveMessageChannel(entry) === messageTypeFilter);

    if (!manualTreeId) return filtered;

    return [...filtered].sort((a, b) => {
      const aScore = a.speakerId === manualTreeId ? 1 : 0;
      const bScore = b.speakerId === manualTreeId ? 1 : 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.createdAt - b.createdAt;
    });
  }, [messages, manualTreeId, messageTypeFilter]);

  const flowItems = useMemo<FlowRenderItem[]>(() => {
    const items: FlowRenderItem[] = [];
    let groupAnchor = 0;

    visibleMessages.forEach((entry, index) => {
      const shouldCreateGroup =
        index === 0
        || entry.createdAt < groupAnchor
        || entry.createdAt - groupAnchor > MESSAGE_GROUP_GAP_MS;

      if (shouldCreateGroup) {
        groupAnchor = entry.createdAt;
        items.push({ kind: 'group', key: `group-${entry.id}`, label: formatClock(entry.createdAt) });
      }

      items.push({ kind: 'entry', key: entry.id, entry });
    });

    return items;
  }, [visibleMessages]);

  useEffect(() => {
    if (!listRef.current || isCollapsed) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [isCollapsed, visibleMessages]);

  useEffect(() => {
    injectAnimationStyles();

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

  return {
    activeAgentName,
    activeLongMessageActionId,
    byId,
    collapsedLongMessageIds,
    draftMessage,
    flowItems,
    handleSend,
    inputRef,
    isSending,
    listRef,
    manualTreeId,
    messageItemRefs,
    messageTypeFilter,
    now,
    onDragEnd,
    onDragStart,
    onResizeStart,
    panelPos,
    panelSize,
    resolveMessageChannel,
    resolveRelationTag,
    setActiveLongMessageActionId,
    setDraftMessage,
    setMessageTypeFilter,
    showContent,
    toggleLongMessage,
    u2aRelationText,
    unreadCount,
    unreadSymbol,
    visibleMessages,
    visualCollapsed,
  };
}