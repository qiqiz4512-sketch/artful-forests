import { useEffect, useState, type KeyboardEventHandler, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MessageChannel } from '@/components/chat-panel/useChatPanelState';
import { useForestStore } from '@/stores/useForestStore';

interface ChatComposerProps {
  activeAgentId: string | null;
  activeAgentName: string | null;
  draftMessage: string;
  isSending: boolean;
  messageTypeFilter: MessageChannel;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onSend: (message?: string) => void;
  onClearMention?: () => void;
  displayName: (name?: string) => string;
}

type QuickActionKind = 'energy' | 'prune' | 'memory';

const QUICK_ACTIONS: Array<{
  icon: string;
  label: string;
  kind: QuickActionKind;
  tint: string;
  glow: string;
}> = [
  {
    icon: '⚡',
    label: '能量注入',
    kind: 'energy',
    tint: 'rgba(255, 176, 77, 0.95)',
    glow: '0 0 0 1px rgba(255, 190, 90, 0.28), 0 0 18px rgba(255, 177, 72, 0.32)',
  },
  {
    icon: '✂️',
    label: '修剪',
    kind: 'prune',
    tint: 'rgba(244, 99, 99, 0.95)',
    glow: '0 0 0 1px rgba(244, 122, 122, 0.26), 0 0 16px rgba(219, 88, 88, 0.28)',
  },
  {
    icon: '🧠',
    label: '记忆唤醒',
    kind: 'memory',
    tint: 'rgba(227, 115, 201, 0.95)',
    glow: '0 0 0 1px rgba(232, 145, 214, 0.24), 0 0 18px rgba(218, 122, 198, 0.28)',
  },
];

const buildQuickActionMessage = (label: string, activeAgentName: string, messageTypeFilter: MessageChannel, displayName: (name?: string) => string) => {
  const targetName = displayName(activeAgentName);
  const prefix = messageTypeFilter === 'a2a' ? `@${targetName} ` : '';

  switch (label) {
    case '能量注入':
      return `${prefix}送你一点能量，今天也要继续发光。`;
    case '修剪':
      return `${prefix}帮你轻轻修剪一下枝叶，我们慢慢调整状态。`;
    case '记忆唤醒':
      return `${prefix}还记得我们刚刚聊到哪里吗？`;
    default:
      return `${prefix}`;
  }
};

export function ChatComposer({
  activeAgentId,
  activeAgentName,
  draftMessage,
  isSending,
  messageTypeFilter,
  inputRef,
  onDraftChange,
  onSend,
  onClearMention,
  displayName,
}: ChatComposerProps) {
  const emitSceneInteraction = useForestStore((state) => state.emitSceneInteraction);
  const isInputDisabled = isSending;
  const canSend = !isSending && draftMessage.trim().length > 0 && (messageTypeFilter === 'a2a' || Boolean(activeAgentName));
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [cooldownAction, setCooldownAction] = useState<string | null>(null);
  const [activeBurst, setActiveBurst] = useState<{ label: string; kind: QuickActionKind; token: number } | null>(null);

  useEffect(() => {
    if (!cooldownAction) return;
    const timer = window.setTimeout(() => setCooldownAction(null), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownAction]);

  useEffect(() => {
    if (!activeBurst) return;
    const timer = window.setTimeout(() => {
      setActiveBurst((current) => (current?.token === activeBurst.token ? null : current));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [activeBurst]);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    onSend();
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[number]) => {
    if (!activeAgentId || !activeAgentName || isSending || cooldownAction === action.label) return;
    const nextMessage = buildQuickActionMessage(action.label, activeAgentName, messageTypeFilter, displayName);
    setCooldownAction(action.label);
    setActiveBurst({ label: action.label, kind: action.kind, token: Date.now() });
    emitSceneInteraction(action.kind, 'trigger', activeAgentId);
    onSend(nextMessage);
  };

  const handleQuickActionHover = (action: typeof QUICK_ACTIONS[number]) => {
    setHoveredAction(action.label);
    if (!activeAgentId || isSending || cooldownAction === action.label) return;
    emitSceneInteraction(action.kind, 'hover', activeAgentId);
  };

  const getIconAnimation = (action: typeof QUICK_ACTIONS[number]) => {
    const isHovered = hoveredAction === action.label;
    const isBursting = activeBurst?.label === action.label;
    const transition = { type: 'spring' as const, stiffness: 300, damping: 18 };

    if (isBursting) {
      if (action.kind === 'energy') {
        return {
          animate: { y: [0, -9, 0], rotate: [0, -6, 4, 0], scale: [1, 1.16, 1] },
          transition: { ...transition, duration: 0.52 },
        };
      }
      if (action.kind === 'prune') {
        return {
          animate: { rotate: [0, -22, 10, -8, 0], scale: [1, 0.92, 1.08, 1] },
          transition: { ...transition, duration: 0.46 },
        };
      }
      return {
        animate: { scale: [1, 1.2, 0.96, 1.12, 1], opacity: [1, 0.96, 1] },
        transition: { ...transition, duration: 0.78 },
      };
    }

    if (isHovered) {
      if (action.kind === 'energy') {
        return {
          animate: { rotate: [0, -8, 8, 0], y: [0, -1.5, 0] },
          transition: { duration: 0.9, ease: 'easeInOut' as const, repeat: Infinity },
        };
      }
      if (action.kind === 'prune') {
        return {
          animate: { rotate: [0, -10, 10, 0] },
          transition: { duration: 0.84, ease: 'easeInOut' as const, repeat: Infinity },
        };
      }
      return {
        animate: { scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] },
        transition: { duration: 1, ease: 'easeInOut' as const, repeat: Infinity },
      };
    }

    return {
      animate: { rotate: 0, y: 0, scale: 1, opacity: 1 },
      transition,
    };
  };

  return (
    <div
      className="flex-shrink-0 px-3 pb-3"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.48)',
        background: 'linear-gradient(180deg, rgba(235, 248, 255, 0.5), rgba(217, 236, 253, 0.35))',
      }}
    >
      <div
        style={{
          paddingTop: 7,
          paddingBottom: 5,
          fontSize: 11,
          color: 'rgba(62, 96, 126, 0.88)',
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span>
          {activeAgentName
            ? (messageTypeFilter === 'a2a' ? `当前艾特：@${displayName(activeAgentName)}` : `当前对象：${displayName(activeAgentName)}`)
            : (messageTypeFilter === 'a2a' ? '可点击头像 @某棵树，也可直接发言让整片森林一起回应' : '点击一棵树后可在这里继续对话')}
        </span>
        {messageTypeFilter === 'a2a' && activeAgentName && onClearMention && (
          <button
            type="button"
            onClick={onClearMention}
            disabled={isSending}
            style={{
              flexShrink: 0,
              width: 18,
              height: 18,
              borderRadius: 999,
              border: '1px solid rgba(136, 171, 205, 0.55)',
              background: 'rgba(240, 247, 255, 0.78)',
              color: 'rgba(84, 113, 142, 0.92)',
              fontSize: 11,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSending ? 'not-allowed' : 'pointer',
              opacity: isSending ? 0.6 : 1,
            }}
            title="取消当前 @"
          >
            ×
          </button>
        )}
      </div>
      {activeAgentName && (
        <div className="mb-2 flex items-center gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <motion.button
              key={action.label}
              type="button"
              className="rounded-2xl px-2 py-1 text-[10px]"
              onClick={() => handleQuickAction(action)}
              onHoverStart={() => handleQuickActionHover(action)}
              onHoverEnd={() => setHoveredAction((current) => (current === action.label ? null : current))}
              whileHover={{ scale: 1.05, boxShadow: action.glow }}
              whileTap={{ scale: 0.98 }}
              disabled={isSending || cooldownAction === action.label}
              style={{
                position: 'relative',
                overflow: 'visible',
                border: '1px solid rgba(153, 188, 218, 0.55)',
                background: 'rgba(235, 247, 255, 0.5)',
                color: 'rgba(58, 96, 126, 0.9)',
                lineHeight: 1,
                backdropFilter: 'blur(6px)',
                cursor: isSending || cooldownAction === action.label ? 'not-allowed' : 'pointer',
                opacity: isSending || cooldownAction === action.label ? 0.62 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              title={`${action.label}：直接发送快捷话术`}
            >
              <AnimatePresence>
                {activeBurst?.label === action.label && action.kind === 'energy' && (
                  <motion.span
                    key={`ripple-${activeBurst.token}`}
                    initial={{ scale: 0.2, opacity: 0.42 }}
                    animate={{ scale: 2.3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, duration: 0.62 }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      transform: 'translate(-50%, -50%)',
                      background: 'radial-gradient(circle, rgba(255,214,120,0.48) 0%, rgba(255,191,71,0.22) 52%, rgba(255,191,71,0) 72%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {activeBurst?.label === action.label && action.kind === 'prune' && (
                  <>
                    {[[-14, -8, -22], [-4, -15, -8], [10, -10, 16], [18, -4, 28]].map(([x, y, rotate], index) => (
                      <motion.span
                        key={`leaf-${activeBurst.token}-${index}`}
                        initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.72 }}
                        animate={{ opacity: [0, 1, 0], x, y: [0, y, y + 12], rotate, scale: [0.72, 1, 0.86] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.78, ease: 'easeOut', delay: index * 0.04 }}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          fontSize: 10,
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                        }}
                      >
                        🍃
                      </motion.span>
                    ))}
                  </>
                )}
                {activeBurst?.label === action.label && action.kind === 'memory' && (
                  <motion.span
                    key={`memory-${activeBurst.token}`}
                    initial={{ scale: 0.7, opacity: 0.38 }}
                    animate={{ scale: 2.1, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22, duration: 0.72 }}
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: 999,
                      background: 'radial-gradient(circle, rgba(215,145,235,0.3) 0%, rgba(197,120,226,0.18) 48%, rgba(197,120,226,0) 72%)',
                      filter: 'blur(8px)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>

              <motion.span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}
                animate={getIconAnimation(action).animate}
                transition={getIconAnimation(action).transition}
              >
                <span style={{ color: action.tint }}>{action.icon}</span>
                <span>{action.label}</span>
              </motion.span>
            </motion.button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={draftMessage}
          disabled={isInputDisabled}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={activeAgentName
            ? (messageTypeFilter === 'a2a' ? `在群聊里 @${displayName(activeAgentName)} 说点什么...` : `向 ${displayName(activeAgentName)} 说点什么...`)
            : (messageTypeFilter === 'a2a' ? '不 @任何树也可以直接发言，全部树木都会回应你' : '先点击一棵树激活输入')}
          rows={2}
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 10,
            border: '1px solid rgba(129, 177, 219, 0.5)',
            background: 'rgba(230, 245, 255, 0.62)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
            padding: '7px 10px',
            fontSize: 12,
            lineHeight: 1.4,
            color: 'rgba(41, 71, 99, 0.94)',
            outline: 'none',
            opacity: isInputDisabled ? 0.72 : 1,
            cursor: isInputDisabled ? 'not-allowed' : 'text',
          }}
        />
        <button
          type="button"
          disabled={!canSend}
          style={{
            borderRadius: 10,
            border: '1px solid rgba(113, 164, 212, 0.62)',
            background: 'linear-gradient(160deg, rgba(108, 179, 235, 0.82), rgba(94, 149, 224, 0.88))',
            color: 'rgba(238, 247, 255, 0.96)',
            padding: '7px 11px',
            fontSize: 12,
            lineHeight: 1,
            opacity: canSend ? 1 : 0.5,
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
          onClick={() => onSend()}
          title="发送消息（Enter 发送，Shift+Enter 换行）"
        >
          {isSending ? '回应中...' : '发送'}
        </button>
      </div>
    </div>
  );
}