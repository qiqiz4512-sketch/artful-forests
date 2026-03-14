import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForestStore } from '@/stores/useForestStore';
import { pickTreeIdentityGag } from '@/constants/treeGags';

interface Props {
  agentId: string;
  name: string;
  personality?: string;
  shapeId?: string;
  scale: number;
  hovered: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PERSONALITY_SYMBOL: Record<string, string> = {
  温柔: '♥',
  睿智: '✦',
  顽皮: '♪',
  活泼: '✿',
  社恐: '◦',
  神启: '⚡',
};

const PERSONALITY_COLOR: Record<string, string> = {
  温柔: '#E7849B',
  睿智: '#5D91A6',
  顽皮: '#D98958',
  活泼: '#A5962D',
  社恐: '#8A8A8A',
  神启: '#D4A72C',
};

const PERSONALITY_COLOR_DEEP: Record<string, string> = {
  温柔: '#cf6c85',
  睿智: '#4b7f94',
  顽皮: '#c07142',
  活泼: '#897d22',
  社恐: '#6f6f6f',
  神启: '#bf8d1f',
};

const ICON_EGG = ['♡', '💬', '✶'];

const randomIn = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

const resolveTreeStage = (input: {
  isManual: boolean;
  generation?: number;
  energy?: number;
}) => {
  if (input.isManual) {
    return '次元主理树';
  }

  const generation = input.generation ?? 0;
  const energy = input.energy ?? 50;

  if (generation >= 3 || energy >= 92) return '古树顾问';
  if (generation >= 2 || energy >= 78) return '林间前辈';
  if (generation >= 1 || energy >= 62) return '青年树代表';
  return '新芽见习生';
};

export default function TreeIdentity({ agentId, name, personality, shapeId, scale, hovered }: Props) {
  const activeChat = useForestStore((state) => state.activeChat);
  const agents = useForestStore((state) => state.agents);
  const silenceUntil = useForestStore((state) => state.globalEffects.silenceUntil);
  const self = agents.find((agent) => agent.id === agentId);

  const isSilent = Date.now() < silenceUntil;
  const isTalking = !isSilent && (activeChat?.treeAId === agentId || activeChat?.treeBId === agentId);
  const isRecallingMemory = Boolean(self && Date.now() < (self.memory?.recallingUntil ?? 0));
  const isManual = Boolean(self?.isManual);
  const tone = isManual ? '神启' : personality ?? '温柔';
  const symbol = PERSONALITY_SYMBOL[tone] ?? '·';

  const primary = PERSONALITY_COLOR[tone] ?? '#7aa98d';
  const deep = PERSONALITY_COLOR_DEEP[tone] ?? '#5e8d72';
  const shapeTint = self?.shape?.colorPalette?.accent ?? self?.shape?.colorPalette?.leaves ?? `${primary}88`;
  const stageTitle = resolveTreeStage({
    isManual,
    generation: self?.generation,
    energy: self?.energy,
  });
  const [stageBoost, setStageBoost] = useState(false);
  const prevStageRef = useRef<string | null>(null);

  const displayName = (name || '无名树').replace(/\d+/g, '');
  const [identityGag, setIdentityGag] = useState(() =>
    pickTreeIdentityGag({
      personality: tone,
      shapeId,
      isManual,
      dedupeKey: agentId,
    }),
  );

  useEffect(() => {
    if (!hovered) return;
    setIdentityGag(
      pickTreeIdentityGag({
        personality: tone,
        shapeId,
        isManual,
        dedupeKey: agentId,
      }),
    );
  }, [agentId, hovered, isManual, shapeId, tone]);

  useEffect(() => {
    const prevStage = prevStageRef.current;
    prevStageRef.current = stageTitle;
    if (!prevStage || prevStage === stageTitle) return;

    setStageBoost(true);
    const timer = window.setTimeout(() => setStageBoost(false), 1100);
    return () => window.clearTimeout(timer);
  }, [stageTitle]);

  const cardCompensationScale = clamp(1 / Math.max(scale, 0.01), 0.88, 2.2);
  const egg = useMemo(() => randomIn(ICON_EGG), []);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        bottom: '100%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        paddingBottom: 10,
        minWidth: 110,
      }}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="identity-card"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.86, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              width: 180,
              scale: cardCompensationScale,
              transformOrigin: 'bottom center',
            }}
          >
            <div
              style={{
                position: 'relative',
                borderRadius: 16,
                border: `1px solid ${primary}44`,
                background: `linear-gradient(155deg, rgba(255, 255, 255, 0.74) 12%, ${shapeTint}26 100%)`,
                backdropFilter: 'blur(5px)',
                WebkitBackdropFilter: 'blur(5px)',
                boxShadow: '0 10px 24px rgba(58, 76, 64, 0.14)',
                padding: '10px 12px 8px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-handwritten)',
                    fontWeight: 700,
                    fontSize: 17,
                    lineHeight: 1,
                    color: 'rgba(45, 62, 53, 0.96)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    width: 1,
                    height: 16,
                    background: `${deep}55`,
                    borderRadius: 999,
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1], y: [0, -0.8, 0] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                    color: deep,
                    textShadow: `0 0 10px ${primary}66`,
                  }}
                >
                  {symbol}
                </motion.div>
              </div>

              <motion.div
                animate={stageBoost ? { scale: [1, 1.1, 1], opacity: [0.82, 1, 0.82] } : { scale: 1, opacity: 0.86 }}
                transition={stageBoost ? { duration: 0.86, ease: 'easeInOut' } : { duration: 0.2 }}
                style={{
                  marginTop: 8,
                  textAlign: 'center',
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: 11,
                  lineHeight: 1,
                  color: stageBoost ? `${deep}ee` : `${deep}bb`,
                  letterSpacing: '0.04em',
                  textShadow: stageBoost ? `0 0 8px ${primary}66` : 'none',
                }}
              >
                {stageTitle}
              </motion.div>

              <div
                style={{
                  marginTop: 7,
                  textAlign: 'center',
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: 14,
                  lineHeight: 1.35,
                  color: 'rgba(58, 64, 60, 0.9)',
                }}
              >
                {identityGag}
              </div>

              <div
                style={{
                  marginTop: 6,
                  textAlign: 'center',
                  fontSize: 11,
                  lineHeight: 1,
                  color: 'rgba(72, 86, 78, 0.48)',
                  letterSpacing: '0.08em',
                }}
              >
                {egg}
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: -5,
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: 10,
                  height: 10,
                  background: 'rgba(255, 255, 255, 0.72)',
                  borderRight: `1px solid ${primary}44`,
                  borderBottom: `1px solid ${primary}44`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={
          isRecallingMemory
            ? { rotate: [0, 360], scale: [1, 1.1, 1], opacity: [0.62, 0.98, 0.62] }
            : isTalking
              ? { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }
              : hovered
                ? { opacity: 1, scale: 1.18, y: [0, -1.2, 0] }
                : { opacity: 0.64, scale: 1 }
        }
        transition={
          isRecallingMemory
            ? { duration: 2.6, repeat: Infinity, ease: 'linear' }
            : isTalking
              ? { duration: 1.45, repeat: Infinity, ease: 'easeInOut' }
              : hovered
                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
        }
        style={{
          fontSize: 15,
          lineHeight: 1,
          userSelect: 'none',
          color: hovered ? deep : primary,
          filter: hovered
            ? `drop-shadow(0 0 8px ${primary}99)`
            : `drop-shadow(0 0 4px ${primary}80)`,
          transition: 'color 0.2s, filter 0.2s',
        }}
      >
        {symbol}
      </motion.div>
    </div>
  );
}
