import { CSSProperties, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { getPersonaLabel } from '@/constants/personaMatrix';
import { ChatHistoryEntry, TreeAgent } from '@/types/forest';
import { TreeAvatarIcon } from './TreeAvatarIcon';

const PERSONALITY_COLOR: Record<string, string> = {
  温柔: '#E7849B',
  睿智: '#5D91A6',
  顽皮: '#D98958',
  活泼: '#A5962D',
  社恐: '#888888',
  神启: '#D4A72C',
};

const MESSAGE_SPLIT_RE = /\s+(?=[^\s：]{1,8}：)/;
const CONTRAST_RE = /(我要|决定了|打赌|突然|别眨眼|快看|嘿嘿|哈哈|哇|呀呼|其实|原来)/;
const CHATTERBOX_COLLAPSE_THRESHOLD = 120;

const displayName = (name?: string) => (name ?? '无名树').replace(/\d+/g, '');

const sanitizeMessageContent = (message?: string | null) => {
  if (typeof message !== 'string') return '';
  return message
    .replace(/\bundefined\b/gi, '')
    .replace(/\bnull\b/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const buildCollapsedPreview = (message: string, maxChars = CHATTERBOX_COLLAPSE_THRESHOLD) => {
  const safeMessage = sanitizeMessageContent(message);
  const chars = Array.from(safeMessage);
  if (chars.length <= maxChars) return safeMessage;

  const sentences = safeMessage.match(/[^。！？!?]+[。！？!?]?/g)?.map((entry) => entry.trim()).filter(Boolean) ?? [];
  let preview = '';
  for (const sentence of sentences) {
    if (Array.from(`${preview}${sentence}`).length > maxChars) break;
    preview += sentence;
  }

  const base = preview || chars.slice(0, maxChars).join('').trim();
  return `${base.replace(/[，、,；;：:]$/, '')}…`;
};

const segmentMessage = (message: string) =>
  sanitizeMessageContent(message)
    .split(/\n+/)
    .flatMap((part) => part.split(MESSAGE_SPLIT_RE))
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

const getPersonalityType = (personality: string): 'anxious' | 'normal' | 'chatterbox' => {
  if (personality === '社恐') return 'anxious';
  if (personality === '活泼' || personality === '顽皮') return 'chatterbox';
  return 'normal';
};

const getAvatarBreathDuration = (personality: string) => {
  if (personality === '顽皮' || personality === '活泼') return 1.9;
  if (personality === '社恐') return 2.7;
  if (personality === '神启') return 2.2;
  return 2.4;
};

const getAvatarFrameStyle = (personality: string, bubbleColor: string): CSSProperties => {
  if (personality === '温柔') {
    return {
      border: `1.5px solid ${bubbleColor}66`,
      background: `radial-gradient(circle at 35% 30%, ${bubbleColor}3b, ${bubbleColor}16 68%)`,
      boxShadow: `0 2px 8px ${bubbleColor}2a, inset 0 0 0 1px rgba(255,255,255,0.34)`,
    };
  }

  if (personality === '睿智') {
    return {
      border: `1px solid ${bubbleColor}6b`,
      background: `radial-gradient(circle at 50% 30%, ${bubbleColor}36, ${bubbleColor}14 72%)`,
      boxShadow: `0 0 0 1px ${bubbleColor}46, inset 0 0 0 1px rgba(255,255,255,0.28), 0 2px 9px ${bubbleColor}30`,
    };
  }

  if (personality === '顽皮' || personality === '调皮') {
    return {
      border: `2px dashed ${bubbleColor}75`,
      background: `radial-gradient(circle at 42% 28%, ${bubbleColor}42, ${bubbleColor}1a 66%)`,
      boxShadow: `0 2px 10px ${bubbleColor}30`,
    };
  }

  if (personality === '活泼') {
    return {
      border: `2px dotted ${bubbleColor}7f`,
      background: `radial-gradient(circle at 50% 30%, ${bubbleColor}3e, ${bubbleColor}18 72%)`,
      boxShadow: `0 2px 10px ${bubbleColor}32`,
    };
  }

  if (personality === '社恐') {
    return {
      border: `1px solid ${bubbleColor}4a`,
      background: `radial-gradient(circle at 45% 30%, ${bubbleColor}27, ${bubbleColor}10 70%)`,
      boxShadow: `0 1px 5px ${bubbleColor}23`,
    };
  }

  if (personality === '神启') {
    return {
      border: `1px solid ${bubbleColor}7e`,
      background: `radial-gradient(circle at 50% 30%, ${bubbleColor}45, ${bubbleColor}1b 72%)`,
      boxShadow: `0 0 12px ${bubbleColor}4d, inset 0 0 0 1px rgba(255, 238, 178, 0.45)`,
    };
  }

  return {
    border: `1px solid ${bubbleColor}44`,
    background: `${bubbleColor}1a`,
    boxShadow: `0 2px 8px ${bubbleColor}2c`,
  };
};

const getBubbleStyle = (text: string, personality: string): CSSProperties => {
  const safeText = sanitizeMessageContent(text);
  const length = Array.from(safeText).length;
  const personalityType = getPersonalityType(personality);

  if (personalityType === 'anxious') {
    return {
      width: 'fit-content',
      minWidth: '50px',
      maxWidth: 'fit-content',
      height: 'auto',
      animation: 'nervousShake 0.4s ease-in-out',
      wordBreak: 'break-word',
      overflowWrap: 'break-word' as const,
      whiteSpace: 'pre-wrap',
    };
  }

  if (personalityType === 'chatterbox') {
    const fontSize = length > 100 ? '0.875rem' : '12px';
    const lineHeight = length > 100 ? 1.7 : 1.58;
    return {
      width: 'fit-content',
      maxWidth: '90%',
      height: 'auto',
      fontSize,
      lineHeight,
      wordBreak: 'break-word',
      overflowWrap: 'break-word' as const,
      whiteSpace: 'pre-wrap',
      backgroundImage: length > 100 ? 'linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.05) 49%, rgba(255,255,255,0.05) 51%, transparent 52%)' : 'none',
      backgroundSize: length > 100 ? '8px 8px' : 'auto',
    };
  }

  return {
    width: 'fit-content',
    maxWidth: '75%',
    height: 'auto',
    wordBreak: 'break-word',
    overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap',
  };
};

const getUserBubbleStyle = (): CSSProperties => ({
  width: 'fit-content',
  maxWidth: '78%',
  height: 'auto',
  wordBreak: 'break-word',
  overflowWrap: 'break-word' as const,
  whiteSpace: 'pre-wrap',
});

const TYPING_PLACEHOLDER = '正在输入';

export interface RelationTag {
  icon: string;
  label: string;
}

interface ChatMessageItemProps {
  entry: ChatHistoryEntry;
  now: number;
  channel: 'a2a' | 'u2a' | 'epic';
  messageTypeFilter: 'a2a' | 'u2a' | 'epic';
  currentUserName?: string | null;
  speaker?: TreeAgent;
  listener?: TreeAgent;
  manualTreeId?: string | null;
  relationTag: RelationTag | null;
  activeLongMessageActionId: string | null;
  onLongMessageActionStateChange: (entryId: string | null) => void;
  isLongMessageCollapsed: boolean;
  onToggleLongMessage: (entryId: string) => void;
  onSelectMessage: (entry: ChatHistoryEntry) => void;
  onFocusTree: (treeId: string) => void;
  onMentionTree?: (treeId: string) => void;
  onDeleteTree?: (treeId: string) => void;
  onRegisterMessageRef: (entryId: string, node: HTMLButtonElement | null) => void;
  formatAgo: (createdAt: number, now: number) => string;
}

export function ChatMessageItem({
  entry,
  now,
  channel,
  messageTypeFilter,
  currentUserName = null,
  speaker,
  listener,
  manualTreeId,
  relationTag,
  activeLongMessageActionId,
  onLongMessageActionStateChange,
  isLongMessageCollapsed,
  onToggleLongMessage,
  onSelectMessage,
  onFocusTree,
  onMentionTree,
  onDeleteTree,
  onRegisterMessageRef,
  formatAgo,
}: ChatMessageItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const personality = speaker?.personality ?? '温柔';
  const bubbleColor = PERSONALITY_COLOR[personality] ?? '#6a997b';
  const personaLabel = getPersonaLabel(personality);
  const isUserGroupMessage = channel === 'a2a' && entry.source === 'user' && entry.conversationMode === 'group';
  const isMe = isUserGroupMessage || (channel === 'u2a' && (entry.source === 'user' || (manualTreeId && entry.speakerId === manualTreeId)));
  const role = isMe ? 'me' : 'agent';
  const resolvedCurrentUserName = currentUserName?.trim() || '我';
  const currentUserAvatarLabel = Array.from(resolvedCurrentUserName).slice(0, 2).join('');
  const isEpic = channel === 'epic';
  const safeMessage = sanitizeMessageContent(entry.message);
  const isChatterbox = !isMe && getPersonalityType(personality) === 'chatterbox';
  const canToggleLongMessage = !isMe && isChatterbox && Array.from(safeMessage).length > CHATTERBOX_COLLAPSE_THRESHOLD;
  const visibleMessage = isLongMessageCollapsed ? buildCollapsedPreview(safeMessage) : safeMessage;
  const bubbleStyle = isMe ? getUserBubbleStyle() : getBubbleStyle(safeMessage, personality);
  const avatarFrameStyle = isMe
    ? {
      border: '1px solid rgba(90, 149, 202, 0.5)',
      background: 'rgba(96, 155, 210, 0.22)',
      boxShadow: 'none',
    }
    : getAvatarFrameStyle(personality, bubbleColor);
  const segments = segmentMessage(visibleMessage);
  const showA2AMetaAboveAvatar = messageTypeFilter === 'a2a' && !isMe;
  const showBubbleHeader = !showA2AMetaAboveAvatar && messageTypeFilter !== 'u2a';
  const mentionTargetName = isUserGroupMessage && listener ? displayName(listener.name) : null;
  const canMentionSpeaker = messageTypeFilter === 'a2a' && !isMe && Boolean(speaker?.id);
  const isDivineSpeaker = !isMe && personality === '神启';

  const avatarNode = (
    <>
      {showA2AMetaAboveAvatar && (
        <span
          style={{
            marginBottom: 3,
            fontSize: 9,
            color: 'rgba(61, 94, 78, 0.84)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {displayName(speaker?.name)} · {personaLabel}
        </span>
      )}
      <div
        className="h-7 w-7 rounded-full overflow-hidden"
        style={{
          border: avatarFrameStyle.border,
          background: avatarFrameStyle.background,
          color: role === 'me' ? 'rgba(63, 107, 156, 0.95)' : bubbleColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          lineHeight: 1,
          boxShadow: avatarFrameStyle.boxShadow,
        }}
      >
        {role === 'me' ? currentUserAvatarLabel : (
          <motion.div
            style={{ width: '100%', height: '100%' }}
            initial={false}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{
              duration: getAvatarBreathDuration(personality),
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <TreeAvatarIcon personality={personality} />
          </motion.div>
        )}
      </div>
    </>
  );

  if (isEpic) {
    const isManualSpeaker = Boolean(manualTreeId && entry.speakerId === manualTreeId);
    return (
      <motion.div
        key={entry.id}
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="mb-3 flex justify-center"
      >
        <div className="w-[94%] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onSelectMessage(entry)}
            className="w-full rounded-2xl px-3 py-3 text-left"
            style={{
              border: '1px solid transparent',
              background:
                'linear-gradient(145deg, rgba(34, 28, 12, 0.65), rgba(58, 43, 14, 0.48)) padding-box, linear-gradient(130deg, rgba(255, 215, 104, 0.95), rgba(198, 140, 38, 0.92), rgba(255, 232, 163, 0.95)) border-box',
              boxShadow: '0 8px 24px rgba(125, 90, 20, 0.24)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span style={{ fontSize: 10, color: 'rgba(255, 232, 178, 0.94)' }}>神启公告</span>
              <span style={{ fontSize: 10, color: 'rgba(255, 227, 162, 0.78)' }}>{formatAgo(entry.createdAt, now)}</span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255, 246, 223, 0.96)', fontSize: 12, lineHeight: 1.6 }}>{entry.message}</p>
          </button>
          {isManualSpeaker && onDeleteTree && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="self-center flex items-center gap-1.5 px-3 py-1"
              style={{
                borderRadius: 999,
                background: 'rgba(80, 160, 100, 0.1)',
                border: '1px solid rgba(80, 160, 100, 0.35)',
                color: 'rgba(60, 130, 80, 0.9)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <Leaf size={12} />
              归还大地
            </button>
          )}
          {/* 二次确认弹窗 */}
          <AnimatePresence>
            {confirmDelete && (
              <>
                <motion.div
                  key="epic-confirm-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 200,
                    background: 'rgba(12, 28, 18, 0.28)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }}
                  onClick={() => setConfirmDelete(false)}
                />
                <motion.div
                  key="epic-confirm-dialog"
                  initial={{ opacity: 0, scale: 0.88, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                  style={{
                    position: 'fixed',
                    left: '50vw',
                    top: '50vh',
                    translateX: '-50%',
                    translateY: '-50%',
                    zIndex: 201,
                    width: 'min(320px, 88vw)',
                    borderRadius: 20,
                    background: 'rgba(235, 252, 242, 0.38)',
                    backdropFilter: 'blur(20px) saturate(1.4)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                    border: '1px solid rgba(255,255,255,0.45)',
                    boxShadow: '0 8px 40px rgba(12,60,30,0.18), 0 0 0 1px rgba(255,255,255,0.28) inset',
                    padding: '28px 24px 22px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🍃</div>
                  <div
                    style={{
                      fontFamily: 'var(--font-handwritten)',
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.92)',
                      lineHeight: 1.75,
                      marginBottom: 20,
                      textShadow: '0 1px 6px rgba(0,0,0,0.25)',
                    }}
                  >
                    这棵树已经完成了它的使命，
                    <br />
                    要让它化作森林的养分，
                    <br />
                    去开启新的奇遇吗？
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      style={{
                        flex: 1,
                        maxWidth: 110,
                        padding: '9px 0',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.38)',
                        color: 'rgba(255,255,255,0.88)',
                        fontSize: 13,
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                      }}
                    >
                      再想想
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTree(entry.speakerId);
                        setConfirmDelete(false);
                      }}
                      style={{
                        flex: 1,
                        maxWidth: 110,
                        padding: '9px 0',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, rgba(80,160,100,0.88), rgba(60,130,80,0.82))',
                        border: '1px solid rgba(60,150,90,0.45)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                      }}
                    >
                      <Leaf size={13} />
                      归还大地
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={entry.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`mb-2 flex ${role === 'me' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex max-w-full items-end gap-2 ${role === 'me' ? 'flex-row-reverse' : 'flex-row'}`}>
        {canMentionSpeaker ? (
          <button
            type="button"
            className="flex shrink-0 flex-col items-center"
            onClick={() => speaker?.id && onMentionTree?.(speaker.id)}
            title={`在森林社交中 @${displayName(speaker?.name)}`}
            style={{ cursor: 'pointer' }}
          >
            {avatarNode}
          </button>
        ) : (
          <div className="flex shrink-0 flex-col items-center">
            {avatarNode}
          </div>
        )}

        <button
          ref={(node) => onRegisterMessageRef(entry.id, node)}
          type="button"
          onMouseEnter={() => canToggleLongMessage && onLongMessageActionStateChange(entry.id)}
          onMouseLeave={() => activeLongMessageActionId === entry.id && onLongMessageActionStateChange(null)}
          onFocus={() => canToggleLongMessage && onLongMessageActionStateChange(entry.id)}
          onBlur={() => activeLongMessageActionId === entry.id && onLongMessageActionStateChange(null)}
          onClick={() => {
            if (!isMe && speaker?.id) {
              onFocusTree(speaker.id);
            } else if (isUserGroupMessage && listener) {
              onFocusTree(listener.id);
            }
            onSelectMessage(entry);
          }}
          className={`h-fit rounded-2xl px-3 py-3 ${role === 'me' ? 'rounded-br-md' : 'rounded-bl-md'}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'left',
            background: role === 'me'
              ? 'linear-gradient(160deg, rgba(99, 160, 218, 0.9), rgba(70, 128, 194, 0.92))'
              : isDivineSpeaker
                ? 'linear-gradient(145deg, rgba(34, 28, 12, 0.78), rgba(60, 46, 10, 0.62))'
                : `linear-gradient(160deg, ${bubbleColor}12, rgba(255,255,255,0.62))`,
            border: role === 'me'
              ? '1px solid rgba(104, 163, 216, 0.7)'
              : isDivineSpeaker
                ? '1px solid rgba(212, 167, 44, 0.68)'
                : `1px solid ${bubbleColor}2a`,
            boxShadow: role === 'me'
              ? '0 6px 14px rgba(55, 105, 154, 0.24), inset 0 1px 0 rgba(190, 225, 255, 0.38)'
              : isDivineSpeaker
                ? '0 4px 16px rgba(212, 167, 44, 0.28), inset 0 0 0 1px rgba(255, 220, 120, 0.22)'
                : '0 3px 10px rgba(60, 86, 71, 0.08)',
            backdropFilter: 'blur(8px)',
            height: 'auto',
            overflow: 'visible',
            ...bubbleStyle,
          }}
        >
          {showBubbleHeader && (
            <div className={`mb-1 flex items-center gap-1 ${role === 'me' ? 'justify-end' : 'justify-start'}`}>
              <span style={{ fontSize: 10, color: role === 'me' ? 'rgba(236, 247, 255, 0.92)' : bubbleColor, fontWeight: 700 }}>
                {role === 'me' ? resolvedCurrentUserName : displayName(speaker?.name)}
              </span>
              {!isMe && (
                <span
                  style={{
                    color: bubbleColor,
                    fontSize: 9,
                    opacity: 0.82,
                    background: `${bubbleColor}14`,
                    border: `1px solid ${bubbleColor}28`,
                    borderRadius: 999,
                    padding: '0 5px',
                    lineHeight: 1.45,
                  }}
                >
                  {personaLabel}
                </span>
              )}
            </div>
          )}

          {mentionTargetName && (
            <div className="mb-1 flex items-center justify-end">
              <span
                style={{
                  fontSize: 9,
                  color: 'rgba(232, 244, 255, 0.94)',
                  background: 'rgba(224, 240, 255, 0.18)',
                  border: '1px solid rgba(212, 234, 255, 0.28)',
                  borderRadius: 999,
                  padding: '0 6px',
                  lineHeight: 1.5,
                }}
              >
                @{mentionTargetName}
              </span>
            </div>
          )}

          {!isMe && messageTypeFilter === 'a2a' && relationTag && (
            <div className="mb-1 flex items-center justify-start">
              <span
                style={{
                  fontSize: 9,
                  color: 'rgba(45, 98, 71, 0.9)',
                  background: 'rgba(219, 248, 231, 0.78)',
                  border: '1px solid rgba(117, 192, 149, 0.46)',
                  borderRadius: 999,
                  padding: '0 5px',
                  lineHeight: 1.45,
                }}
              >
                {relationTag.icon} {relationTag.label}
              </span>
            </div>
          )}

          {(segments.length > 0 ? segments : [visibleMessage || TYPING_PLACEHOLDER]).map((line, idx) => {
            const echo = !isMe && isEchoLine(line);
            const highlighted = !isMe ? highlightContrast(line) : { before: line, accent: '', after: '' };
            const isTypingPlaceholder = !isMe && line === TYPING_PLACEHOLDER;
            return (
              <p
                key={idx}
                className="whitespace-pre-wrap break-words"
                style={{
                  margin: 0,
                  padding: echo ? '2px 6px' : 0,
                  borderLeft: echo ? `2px solid ${bubbleColor}66` : 'none',
                  borderRadius: echo ? 8 : 0,
                  background: echo ? `${bubbleColor}12` : 'transparent',
                  color: isMe ? 'rgba(240, 249, 255, 0.96)' : isDivineSpeaker ? 'rgba(255, 238, 178, 0.94)' : 'hsl(150, 22%, 24%)',
                  fontSize: bubbleStyle.fontSize ?? 12,
                  lineHeight: bubbleStyle.lineHeight ?? 1.58,
                  letterSpacing: '0.01em',
                  wordBreak: 'break-word',
                  whiteSpace: isTypingPlaceholder ? 'nowrap' : 'pre-wrap',
                  overflowWrap: 'break-word' as const,
                  textAlign: role === 'me' ? 'right' : 'left',
                  display: isTypingPlaceholder ? 'flex' : 'block',
                  alignItems: isTypingPlaceholder ? 'center' : undefined,
                  gap: isTypingPlaceholder ? 2 : undefined,
                  minWidth: isTypingPlaceholder ? 76 : undefined,
                }}
              >
                {isTypingPlaceholder ? (
                  <>
                    <span>{TYPING_PLACEHOLDER}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          initial={{ opacity: 0.25, y: 0 }}
                          animate={{ opacity: [0.25, 1, 0.25], y: [0, -1.5, 0] }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: dot * 0.14,
                          }}
                          style={{
                            display: 'inline-block',
                            minWidth: 4,
                            color: bubbleColor,
                            fontWeight: 700,
                          }}
                        >
                          ·
                        </motion.span>
                      ))}
                    </span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </p>
            );
          })}

          {isLongMessageCollapsed && (
            <motion.div
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              aria-hidden="true"
              style={{
                marginTop: -14,
                marginBottom: 2,
                height: 18,
                borderRadius: 10,
                pointerEvents: 'none',
                background: role === 'me'
                  ? 'linear-gradient(180deg, rgba(99, 160, 218, 0), rgba(70, 128, 194, 0.96))'
                  : `linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.92) 55%, ${bubbleColor}18 100%)`,
              }}
            />
          )}

          {canToggleLongMessage && (
            <motion.div
              layout="position"
              style={{
                marginTop: 6,
                display: 'flex',
                justifyContent: role === 'me' ? 'flex-end' : 'flex-start',
              }}
            >
              <motion.span
                role="button"
                tabIndex={0}
                whileHover={{ opacity: 1, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => onLongMessageActionStateChange(entry.id)}
                onHoverEnd={() => onLongMessageActionStateChange(null)}
                onFocus={() => onLongMessageActionStateChange(entry.id)}
                onBlur={() => onLongMessageActionStateChange(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleLongMessage(entry.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleLongMessage(entry.id);
                }}
                style={{
                  fontSize: 10,
                  lineHeight: 1,
                  color: role === 'me' ? 'rgba(232, 244, 255, 0.9)' : bubbleColor,
                  opacity: activeLongMessageActionId === entry.id ? 1 : 0.8,
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 8px',
                  letterSpacing: '0.02em',
                  borderRadius: 999,
                  background: role === 'me'
                    ? (activeLongMessageActionId === entry.id ? 'rgba(224, 240, 255, 0.14)' : 'rgba(224, 240, 255, 0.08)')
                    : (activeLongMessageActionId === entry.id ? `${bubbleColor}18` : `${bubbleColor}0d`),
                  boxShadow: activeLongMessageActionId === entry.id
                    ? 'inset 0 0 0 1px rgba(255,255,255,0.18)'
                    : 'none',
                  outline: 'none',
                  transition: 'opacity 160ms ease, transform 160ms ease',
                }}
              >
                <span style={{ fontSize: 9, opacity: 0.75 }}>{isLongMessageCollapsed ? '∨' : '∧'}</span>
                <span>{isLongMessageCollapsed ? '展开全文' : '收起内容'}</span>
              </motion.span>
            </motion.div>
          )}

          <div
            style={{
              marginTop: 3,
              textAlign: role === 'me' ? 'left' : 'right',
              fontSize: 9,
              color: role === 'me' ? 'rgba(219, 238, 255, 0.84)' : 'rgba(92, 102, 96, 0.6)',
              lineHeight: 1,
            }}
          >
            {formatAgo(entry.createdAt, now)}
          </div>
        </button>
      </div>
    </motion.div>
  );
}