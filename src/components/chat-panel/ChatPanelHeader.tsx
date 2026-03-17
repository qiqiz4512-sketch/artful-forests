import type { PointerEventHandler } from 'react';
import type { MessageChannel } from '@/components/chat-panel/useChatPanelState';

interface ChatPanelHeaderProps {
  messageTypeFilter: MessageChannel;
  activeAgentName: string | null;
  u2aRelationText: string;
  onDragStart: PointerEventHandler<HTMLDivElement>;
  onDragEnd: PointerEventHandler<HTMLDivElement>;
  onSelectFilter: (channel: MessageChannel) => void;
  displayName: (name?: string) => string;
}

const FILTER_OPTIONS: Array<{ key: MessageChannel; label: string }> = [
  { key: 'a2a', label: '森林社交 (A2A)' },
  { key: 'u2a', label: '与树说 (U2A)' },
  { key: 'epic', label: '神启 (Epic)' },
];

export function ChatPanelHeader({
  messageTypeFilter,
  activeAgentName,
  u2aRelationText,
  onDragStart,
  onDragEnd,
  onSelectFilter,
  displayName,
}: ChatPanelHeaderProps) {
  return (
    <div
      className="shrink-0 px-4 pt-4 pb-3"
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
        {FILTER_OPTIONS.map((opt) => {
          const active = messageTypeFilter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelectFilter(opt.key)}
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

      {messageTypeFilter === 'u2a' && (
        <div
          className="mt-2 rounded-2xl px-2.5 py-2"
          style={{
            background: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.55)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontSize: 11, color: 'rgba(57, 88, 111, 0.92)', fontWeight: 600 }}>
            {activeAgentName ? `当前树木：${displayName(activeAgentName)}` : '当前树木：未选中'}
          </div>
          <div style={{ marginTop: 2, fontSize: 10, color: 'rgba(70, 101, 82, 0.82)' }}>{u2aRelationText}</div>
        </div>
      )}
    </div>
  );
}