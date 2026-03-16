import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreeAgent } from '@/types/forest';
import { getTreeSpeciesLabel } from '@/lib/treeSpecies';

interface Props {
  agents: TreeAgent[];
  visibleTreeIds: string[];
  activeZoneLabel: string;
}

interface SpeciesEntry {
  label: string;
  total: number;
  visible: number;
}

export default function TreeSpeciesPanel({ agents, visibleTreeIds, activeZoneLabel }: Props) {
  const [collapsed, setCollapsed] = useState(true);

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

  return (
    <div
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
            onClick={() => setCollapsed(false)}
            style={{
              borderRadius: 999,
              padding: '9px 12px',
              background: 'rgba(255,250,244,0.72)',
              border: '1px solid rgba(255,255,255,0.56)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 12px 26px rgba(40, 44, 36, 0.12)',
              color: 'hsl(138, 24%, 24%)',
              fontSize: 12,
            }}
          >
            图鉴 {totalTreeCount}棵（{speciesEntries.length}种）
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

            <div style={{ padding: '10px 14px 12px' }}>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}