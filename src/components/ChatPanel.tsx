import { motion, AnimatePresence } from 'framer-motion';
import { ChatHistoryEntry, TreeAgent } from '@/types/forest';
import { ChatEmptyState } from '@/components/chat-panel/ChatEmptyState';
import { ChatComposer } from '@/components/chat-panel/ChatComposer';
import { ChatMessageItem } from '@/components/chat-panel/ChatMessageItem';
import { ChatPanelHeader } from '@/components/chat-panel/ChatPanelHeader';
import { ChatTimeGroup } from '@/components/chat-panel/ChatTimeGroup';
import { useChatPanelState } from '@/components/chat-panel/useChatPanelState';

interface Props {
  messages: ChatHistoryEntry[];
  agents: TreeAgent[];
  collapsed: boolean;
  currentUserName?: string | null;
  onToggleCollapsed: () => void;
  onSelectMessage: (entry: ChatHistoryEntry) => void;
  onFocusTree: (treeId: string) => void;
  onClearFocusedTree?: () => void;
  onSendMessage?: (message: string, targetTreeId: string) => Promise<boolean>;
  onSendSocialMessage?: (message: string, targetTreeId?: string | null) => Promise<boolean>;
  activeTreeId?: string | null;
  focusInputSignal?: number;
  showComposer?: boolean;
  onDeleteTree?: (treeId: string) => void;
}

const formatAgo = (createdAt: number, now: number) => {
  const sec = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (sec < 2) return '刚刚';
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hour = Math.floor(min / 60);
  return `${hour}h`;
};

const displayName = (name?: string) => (name ?? '无名树').replace(/\d+/g, '');
const COLLAPSED_WIDTH = 35;
const COLLAPSED_OPACITY = 0.8;
const COLLAPSED_X = 20;
const EXPANDED_OPACITY = 1;
const EXPANDED_X = 0;
const BLUR_EXPANDED = 'blur(12px)';
const BLUR_COLLAPSED = 'blur(4px)';
const SPRING_TRANSITION = { type: 'spring' as const, stiffness: 260, damping: 20 };

export default function ChatPanel({
  messages,
  agents,
  collapsed,
  currentUserName = null,
  onToggleCollapsed,
  onSelectMessage,
  onFocusTree,
  onClearFocusedTree,
  onSendMessage,
  onSendSocialMessage,
  activeTreeId = null,
  focusInputSignal = 0,
  showComposer = true,
  onDeleteTree,
}: Props) {
  const {
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
  } = useChatPanelState({
    messages,
    agents,
    collapsed,
    activeTreeId,
    focusInputSignal,
    onSendMessage,
    onSendSocialMessage,
  });

  const handleMentionTree = (treeId: string) => {
    if (messageTypeFilter !== 'a2a') return;
    const targetName = displayName(byId.get(treeId)?.name);
    const mentionPrefix = `@${targetName} `;

    onFocusTree(treeId);
    setDraftMessage((current) => {
      const trimmed = current.trimStart();
      const body = trimmed.replace(/^@[^\s]+\s+/, '');
      return `${mentionPrefix}${body}`;
    });

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleClearMention = () => {
    if (messageTypeFilter !== 'a2a') return;
    onClearFocusedTree?.();
    setDraftMessage((current) => current.replace(/^@[^\s]+\s+/, ''));
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

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
              className="flex h-full min-h-0 flex-col"
            >

            <ChatPanelHeader
              messageTypeFilter={messageTypeFilter}
              activeAgentName={activeAgentName}
              u2aRelationText={u2aRelationText}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onSelectFilter={setMessageTypeFilter}
              displayName={displayName}
            />

            <div
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(70,110,85,0.35) transparent',
              }}
            >
              <AnimatePresence initial={false}>
                {flowItems.map((item) => {
                  if (item.kind === 'group') {
                    return <ChatTimeGroup key={item.key} label={item.label} />;
                  }

                  const entry = item.entry;
                  const channel = resolveMessageChannel(entry);
                  const speaker = byId.get(entry.speakerId);
                  const listener = byId.get(entry.listenerId);
                  const relationTag = listener ? resolveRelationTag(entry.speakerId, listener.id) : null;

                  return (
                    <ChatMessageItem
                      key={item.key}
                      entry={entry}
                      now={now}
                      channel={channel}
                      messageTypeFilter={messageTypeFilter}
                      currentUserName={currentUserName}
                      speaker={speaker}
                      listener={listener}
                      manualTreeId={manualTreeId}
                      relationTag={relationTag}
                      activeLongMessageActionId={activeLongMessageActionId}
                      onLongMessageActionStateChange={setActiveLongMessageActionId}
                      isLongMessageCollapsed={collapsedLongMessageIds.has(entry.id)}
                      onToggleLongMessage={toggleLongMessage}
                      onSelectMessage={onSelectMessage}
                      onFocusTree={onFocusTree}
                      onMentionTree={handleMentionTree}
                      onDeleteTree={onDeleteTree}
                      onRegisterMessageRef={(entryId, node) => {
                        if (node) {
                          messageItemRefs.current.set(entryId, node);
                          return;
                        }
                        messageItemRefs.current.delete(entryId);
                      }}
                      formatAgo={formatAgo}
                    />
                  );
                })}
              </AnimatePresence>

              {visibleMessages.length === 0 && (
                <ChatEmptyState
                  text={messageTypeFilter === 'epic' ? '神谕尚未落下新的篇章' : undefined}
                  subtext={messageTypeFilter === 'epic' ? '想召来你的神启之树？先去画一棵树，再把它种进森林。' : undefined}
                />
              )}
            </div>

            {showComposer && (
              <ChatComposer
                  activeAgentId={activeTreeId}
                activeAgentName={activeAgentName}
                draftMessage={draftMessage}
                isSending={isSending}
                messageTypeFilter={messageTypeFilter}
                inputRef={inputRef}
                onDraftChange={setDraftMessage}
                onSend={(message) => void handleSend(message)}
                onClearMention={handleClearMention}
                displayName={displayName}
              />
            )}

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
