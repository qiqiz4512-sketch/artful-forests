import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { TreeAgent } from '@/types/forest';
import { getTreeSpeciesLabel } from '@/lib/treeSpecies';

interface Props {
  agents: TreeAgent[];
  visibleTreeIds: string[];
  activeZoneLabel: string;
  onDeleteTree?: (treeId: string) => void;
  showLeafPulse?: boolean;
  onCollectionOpen?: () => void;
}

interface SpeciesEntry {
  label: string;
  total: number;
  visible: number;
}

export default function TreeSpeciesPanel({ agents, visibleTreeIds, activeZoneLabel, onDeleteTree, showLeafPulse = false, onCollectionOpen }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<'species' | 'divine'>('species');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleExpand = () => {
    setCollapsed(false);
    onCollectionOpen?.();
  };

  useEffect(() => {
    if (collapsed) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setCollapsed(true);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [collapsed]);

  const speciesEntries = useMemo(() => {
    const visibleIdSet = new Set(visibleTreeIds);
    const counts = new Map<string, SpeciesEntry>();

    agents.forEach((agent) => {
      const label = getTreeSpeciesLabel(agent.shape?.id);
      const current = counts.get(label) ?? { label, total: 0, visible: 0 };
      current.total += 1;
      if (visibleIdSet.has(agent.id)) current.visible += 1;
      counts.set(label, current);
    });

    return [...counts.values()].sort((a, b) => {
      if (b.visible !== a.visible) return b.visible - a.visible;
      if (b.total !== a.total) return b.total - a.total;
      return a.label.localeCompare(b.label, 'zh-CN');
    });
  }, [agents, visibleTreeIds]);

  const visibleSpeciesCount = speciesEntries.filter((entry) => entry.visible > 0).length;
  const totalTreeCount = agents.length;
  const topEntries = speciesEntries.slice(0, 8);
  const manualAgents = useMemo(() => agents.filter((a) => a.isManual), [agents]);
  const displayName = (name?: string) => (name ?? '无名树').replace(/\d+/g, '');

  return (
    <div
      ref={panelRef}
      className="fixed left-4 sm:left-8 bottom-20 z-40"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheelCapture={(e) => e.stopPropagation()}
    >
      <AnimatePresence initial={false} mode="wait">
        {collapsed ? (
          <motion.button
            key="species-collapsed"
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={handleExpand}
            style={{
              borderRadius: 999,
              padding: '9px 12px',
              background: 'rgba(255,250,244,0.72)',
              border: showLeafPulse
                ? '1px solid rgba(80, 160, 100, 0.7)'
                : '1px solid rgba(255,255,255,0.56)',
              backdropFilter: 'blur(8px)',
              boxShadow: showLeafPulse
                ? '0 12px 26px rgba(40, 44, 36, 0.12), 0 0 0 0 rgba(80,160,100,0.5)'
                : '0 12px 26px rgba(40, 44, 36, 0.12)',
              color: 'hsl(138, 24%, 24%)',
              fontSize: 12,
              position: 'relative',
            }}
          >
            {showLeafPulse && (
              <motion.span
                style={{
                  position: 'absolute',
                  inset: -1,
                  borderRadius: 999,
                  border: '1.5px solid rgba(80,160,100,0.6)',
                  pointerEvents: 'none',
                }}
                animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            图鉴 {totalTreeCount}棵（{speciesEntries.length}种）
            {showLeafPulse && (
              <motion.span
                style={{ display: 'inline-flex', marginLeft: 5, verticalAlign: 'middle', color: 'rgba(60,130,80,0.9)' }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              >
                <Leaf size={11} />
              </motion.span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="species-open"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              width: 244,
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.58)',
              background: 'linear-gradient(180deg, rgba(255,250,244,0.84), rgba(255,255,255,0.68))',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 18px 38px rgba(28, 40, 30, 0.14)',
              overflow: 'hidden',
            }}
          >
            <div
              className="flex items-start justify-between gap-3"
              style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.46)',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-handwritten)',
                    fontSize: 24,
                    lineHeight: 1,
                    color: 'hsl(145, 30%, 24%)',
                  }}
                >
                  树种图鉴
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(72, 74, 68, 0.72)' }}>
                  当前区域：{activeZoneLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.54)',
                  background: 'rgba(255,255,255,0.6)',
                  color: 'hsl(145, 20%, 28%)',
                  fontSize: 11,
                }}
              >
                −
              </button>
            </div>

            {/* 标签切换 */}
            <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.46)', padding: '0 14px' }}>
              {(['species', 'divine'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    fontSize: 11,
                    fontWeight: activeTab === tab ? 700 : 400,
                    color: activeTab === tab
                      ? (tab === 'divine' ? 'rgba(163, 112, 22, 0.96)' : 'hsl(145, 30%, 24%)')
                      : 'rgba(90, 90, 80, 0.6)',
                    borderBottom: activeTab === tab
                      ? `2px solid ${tab === 'divine' ? 'rgba(198, 140, 38, 0.8)' : 'rgba(80, 150, 100, 0.7)'}`
                      : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                >
                  {tab === 'species' ? '树种' : `神启 (${manualAgents.length})`}
                </button>
              ))}
            </div>

            <div style={{ padding: '10px 14px 12px' }}>
              {activeTab === 'species' ? (
                <>
                  <div className="flex gap-2" style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.54)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(86,84,78,0.6)' }}>
                        可见树种
                      </div>
                      <div style={{ marginTop: 2, fontSize: 18, color: 'hsl(145, 24%, 26%)' }}>
                        {visibleSpeciesCount}
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.54)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(86,84,78,0.6)' }}>
                        树木总数
                      </div>
                      <div style={{ marginTop: 2, fontSize: 18, color: 'hsl(28, 26%, 28%)' }}>
                        {totalTreeCount}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {topEntries.map((entry) => (
                      <div
                        key={entry.label}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto',
                          alignItems: 'center',
                          gap: 8,
                          borderRadius: 12,
                          background: entry.visible > 0 ? 'rgba(235, 247, 237, 0.72)' : 'rgba(255,255,255,0.42)',
                          border: '1px solid rgba(255,255,255,0.5)',
                          padding: '7px 9px',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'hsl(142, 18%, 24%)' }}>{entry.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(70, 82, 68, 0.76)' }}>视野 {entry.visible}</div>
                        <div style={{ fontSize: 10, color: 'rgba(88, 82, 70, 0.72)' }}>总计 {entry.total}</div>
                      </div>
                    ))}

                    {topEntries.length === 0 && (
                      <div style={{ fontSize: 12, color: 'rgba(70, 82, 68, 0.76)' }}>还没有树种记录。</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  {manualAgents.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'rgba(140, 100, 40, 0.72)', textAlign: 'center', padding: '12px 0' }}>
                      还没有神启之树。
                      <br />
                      <span style={{ fontSize: 10, opacity: 0.7 }}>画一棵树，把它种进森林吧。</span>
                    </div>
                  ) : (
                    manualAgents.map((agent) => (
                      <div
                        key={agent.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, rgba(253, 246, 220, 0.8), rgba(255, 248, 230, 0.6))',
                          border: '1px solid rgba(198, 140, 38, 0.28)',
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'rgba(212, 167, 44, 0.18)',
                          border: '1px solid rgba(198, 140, 38, 0.42)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          flexShrink: 0,
                        }}>★</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'hsl(30, 38%, 24%)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {agent.tag || displayName(agent.name) || agent.name || '无名树'}
                          </div>
                          {agent.tag && displayName(agent.name) && (
                            <div style={{ fontSize: 10, color: 'rgba(140, 100, 40, 0.7)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {displayName(agent.name)}
                            </div>
                          )}
                        </div>
                        {onDeleteTree && (
                          <button
                            type="button"
                            title="归还大地"
                            onClick={() => setConfirmRemoveId(agent.id)}
                            style={{
                              flexShrink: 0,
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: 'rgba(80, 160, 100, 0.1)',
                              border: '1px solid rgba(80, 160, 100, 0.35)',
                              color: 'rgba(60, 130, 80, 0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Leaf size={13} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 温和移除确认弹窗 */}
      <AnimatePresence>
        {confirmRemoveId !== null && (
          <>
            <motion.div
              key="confirm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                background: 'rgba(12, 28, 18, 0.28)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
              onClick={() => setConfirmRemoveId(null)}
            />
            <motion.div
              key="confirm-dialog"
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
                  onClick={() => setConfirmRemoveId(null)}
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
                    if (onDeleteTree) onDeleteTree(confirmRemoveId);
                    setConfirmRemoveId(null);
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
  );
}