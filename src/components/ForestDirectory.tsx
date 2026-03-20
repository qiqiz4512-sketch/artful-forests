import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, TreePine, Loader2 } from 'lucide-react';
import { fetchForestDirectory, type ForestDirectoryEntry } from '@/lib/treeProfileRepository';

interface ForestDirectoryProps {
  open: boolean;
  onClose: () => void;
  onSelectOwner: (entry: ForestDirectoryEntry) => void;
  currentOwnerId?: string | null;
}

function getForestName(nickname: string, treeCount: number): string {
  if (treeCount === 0) return `${nickname} 的空白画布`;
  if (treeCount < 3) return `${nickname} 的萌芽林`;
  if (treeCount <= 10) return `${nickname} 的幻想秘境`;
  return `${nickname} 的万物之森`;
}

export default function ForestDirectory({ open, onClose, onSelectOwner, currentOwnerId }: ForestDirectoryProps) {
  const [entries, setEntries] = useState<ForestDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchForestDirectory();
      setEntries(list);
      if (list.length === 0) {
        setError('暂时还没有其他旅者种下树木，稍后再来看看吧。');
      }
    } catch {
      setError('获取森林名录失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="forest-directory-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[150]"
            style={{ background: 'rgba(12, 28, 18, 0.62)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Centering wrapper */}
          <div className="fixed inset-0 z-[151] flex items-center justify-center pointer-events-none">
          {/* Panel */}
          <motion.div
            key="forest-directory-panel"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{
              width: 'min(420px, 92vw)',
              maxHeight: '72vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 22,
              background: 'linear-gradient(160deg, rgba(245,255,248,0.97) 0%, rgba(235,252,242,0.96) 100%)',
              border: '1.5px solid rgba(60,160,100,0.28)',
              boxShadow: '0 24px 64px rgba(12,60,30,0.24), 0 0 0 1px rgba(255,255,255,0.5) inset',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(60,160,100,0.14)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'linear-gradient(145deg,rgba(60,190,110,0.18),rgba(100,210,140,0.12))',
                  border: '1px solid rgba(60,160,100,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={16} color="hsl(152,46%,28%)" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  className="font-ui"
                  style={{ fontSize: 15, fontWeight: 700, color: 'hsl(152,30%,20%)', lineHeight: 1.2 }}
                >
                  奇遇森林
                </div>
                <div style={{ fontSize: 11, color: 'rgba(50,100,70,0.62)', marginTop: 2 }}>
                  探访其他旅者的幻想森林
                </div>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: '1px solid rgba(60,160,100,0.22)',
                  background: 'rgba(255,255,255,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={14} color="hsl(152,20%,40%)" />
              </motion.button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 14px' }}>
              {loading && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '40px 20px',
                    color: 'hsl(152,24%,44%)',
                  }}
                >
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                  <span className="font-ui" style={{ fontSize: 13 }}>正在探寻各地森林…</span>
                </div>
              )}

              {!loading && error && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    color: 'hsl(152,18%,46%)',
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🌿</div>
                  <div className="font-ui">{error}</div>
                </div>
              )}

              {!loading && !error && entries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {entries.map((entry, index) => {
                    const isActive = currentOwnerId === entry.ownerId;
                    const isSelf = entry.isSelf;
                    return (
                      <motion.button
                        key={entry.ownerId}
                        type="button"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.22 }}
                        onClick={() => {
                          if (!isSelf) {
                            onSelectOwner(entry);
                          }
                        }}
                        whileHover={!isSelf ? { x: 3 } : undefined}
                        whileTap={!isSelf ? { scale: 0.97 } : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 11,
                          padding: '11px 14px',
                          borderRadius: 13,
                          border: isActive
                            ? '1.5px solid rgba(60,180,100,0.52)'
                            : isSelf
                            ? '1.5px solid rgba(120,170,140,0.32)'
                            : '1.5px solid rgba(60,160,100,0.18)',
                          background: isActive
                            ? 'linear-gradient(145deg,rgba(180,245,210,0.72),rgba(210,255,230,0.68))'
                            : isSelf
                            ? 'rgba(240,252,245,0.7)'
                            : 'rgba(255,255,255,0.58)',
                          boxShadow: isActive ? '0 4px 14px rgba(36,140,76,0.16)' : 'none',
                          cursor: isSelf ? 'default' : 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: isActive
                              ? 'linear-gradient(145deg,rgba(60,190,100,0.28),rgba(100,220,140,0.22))'
                              : 'linear-gradient(145deg,rgba(180,230,200,0.38),rgba(200,242,218,0.28))',
                            border: `1px solid ${isActive ? 'rgba(60,180,100,0.32)' : 'rgba(100,180,140,0.22)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <TreePine
                            size={18}
                            color={isActive ? 'hsl(152,50%,28%)' : 'hsl(152,32%,40%)'}
                          />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            className="font-ui"
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: isActive ? 'hsl(152,36%,20%)' : 'hsl(152,24%,26%)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getForestName(entry.ownerName, entry.treeCount)}
                            {isSelf && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: 'rgba(60,120,80,0.62)',
                                  background: 'rgba(100,200,140,0.18)',
                                  border: '1px solid rgba(60,160,100,0.22)',
                                  borderRadius: 999,
                                  padding: '1px 7px',
                                  flexShrink: 0,
                                }}
                              >
                                我的
                              </span>
                            )}
                            {isActive && !isSelf && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: 'rgba(36,140,76,0.78)',
                                  background: 'rgba(60,190,110,0.14)',
                                  border: '1px solid rgba(60,180,100,0.28)',
                                  borderRadius: 999,
                                  padding: '1px 7px',
                                  flexShrink: 0,
                                }}
                              >
                                当前
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 11,
                              color: 'rgba(40,100,60,0.56)',
                            }}
                          >
                            🌲 已种植 {entry.treeCount} 棵
                          </div>
                        </div>

                        {/* Arrow */}
                        {!isSelf && (
                          <div
                            style={{
                              fontSize: 14,
                              color: isActive ? 'hsl(152,40%,36%)' : 'rgba(60,140,90,0.4)',
                              flexShrink: 0,
                            }}
                          >
                            →
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '10px 16px 14px',
                borderTop: '1px solid rgba(60,160,100,0.12)',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 11, color: 'rgba(40,100,60,0.44)' }}>
                共 {entries.filter((e) => !e.isSelf).length} 片可探访的森林
              </span>
            </div>
          </motion.div>
          </div>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  );
}
