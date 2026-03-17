interface ChatEmptyStateProps {
  text?: string;
  subtext?: string;
}

export function ChatEmptyState({ text = '风声还在酝酿第一句悄悄话', subtext }: ChatEmptyStateProps) {
  return (
    <div
      className="flex h-full min-h-[120px] items-center justify-center"
      style={{ padding: '0 16px' }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'rgba(40,70,55,0.55)', fontSize: 12 }}>{text}</div>
        {subtext && (
          <div style={{ marginTop: 6, color: 'rgba(128, 95, 36, 0.78)', fontSize: 11, lineHeight: 1.45 }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}