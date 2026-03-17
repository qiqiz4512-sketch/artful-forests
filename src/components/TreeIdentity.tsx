import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useForestStore } from '@/stores/useForestStore';
import { pickTreeIdentityGag } from '@/constants/treeGags';
import DrawingPlayback from './DrawingPlayback';
import type { DrawingData, SceneInteractionKind } from '@/types/forest';

interface Props {
  agentId: string;
  name: string;
  tag?: string;
  personality?: string;
  shapeId?: string;
  scale: number;
  hovered: boolean;
  interactionPulseKind?: SceneInteractionKind | null;
  interactionPulseToken?: number | null;
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

const PERSONALITY_TAGS: Record<string, string[]> = {
  温柔: ['长期主义者', '佛系养生博主', '慢生活倡导人'],
  睿智: ['清醒老巨人', '长期主义者', '根系智者'],
  顽皮: ['脆皮大学生', '尊嘟假嘟', '全林最野的崽'],
  活泼: ['脆皮大学生', '尊嘟假嘟', '全林最野的崽'],
  社恐: ['i树人', '咸鱼树', '别点我报警了'],
  神启: ['甲方爸爸的树', '这个树很City', '神性肃静'],
};

const ICON_EGG = ['♡', '💬', '✶'];

const randomIn = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const hashSeed = (input: string) => Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);

export default function TreeIdentity({ agentId, name, tag, personality, shapeId, scale, hovered, interactionPulseKind = null, interactionPulseToken = null }: Props) {
  const navigate = useNavigate();
  const activeChat = useForestStore((state) => state.activeChat);
  const agents = useForestStore((state) => state.agents);
  const silenceUntil = useForestStore((state) => state.globalEffects.silenceUntil);
  const self = agents.find((agent) => agent.id === agentId);

  const isSilent = Date.now() < silenceUntil;
  const isTalking = !isSilent && (activeChat?.treeAId === agentId || activeChat?.treeBId === agentId);
  const isRecallingMemory = Boolean(self && Date.now() < (self.memory?.recallingUntil ?? 0));
  const isManual = Boolean(self?.isManual);
  const isChatterbox = Boolean(self?.metadata?.chatterbox);
  const tone = isManual ? '神启' : personality ?? '温柔';
  const symbol = PERSONALITY_SYMBOL[tone] ?? '·';

  const primary = PERSONALITY_COLOR[tone] ?? '#7aa98d';
  const deep = PERSONALITY_COLOR_DEEP[tone] ?? '#5e8d72';
  const shapeTint = self?.shape?.colorPalette?.accent ?? self?.shape?.colorPalette?.leaves ?? `${primary}88`;

  const displayName = name || '无名树';
  const storedTag = tag ?? self?.tag ?? ((self?.metadata as { tag?: string } | undefined)?.tag);
  const displayTag = useMemo(() => {
    if (storedTag?.trim()) return storedTag.trim();
    const tagPool = PERSONALITY_TAGS[tone] ?? PERSONALITY_TAGS['温柔'];
    return tagPool[hashSeed(agentId || displayName) % tagPool.length];
  }, [agentId, displayName, storedTag, tone]);
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

  const cardCompensationScale = clamp(1 / Math.max(scale, 0.01), 0.88, 2.2);
  const egg = useMemo(() => randomIn(ICON_EGG), []);
  const [showPlayback, setShowPlayback] = useState(false);

  const drawingData = useMemo(() => {
    return self?.metadata?.drawingData as DrawingData | undefined;
  }, [self?.metadata?.drawingData]);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '62%',
        bottom: '100%',
        transform: 'translateX(-38%)',
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
            onClick={() => navigate(`/tree/${agentId}`)}
            style={{
              width: 180,
              scale: cardCompensationScale,
              transformOrigin: 'bottom center',
              cursor: 'pointer',
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

              {displayTag && (
                <motion.div
                  animate={isChatterbox ? { y: [0, -1, 0], opacity: [0.85, 1, 0.85] } : { scale: 1, opacity: 0.92 }}
                  transition={isChatterbox ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                  style={{
                    marginTop: 8,
                    textAlign: 'center',
                    fontFamily: 'var(--font-handwritten)',
                    fontSize: 11,
                    lineHeight: 1.2,
                    color: deep,
                    letterSpacing: '0.03em',
                    display: 'block',
                    width: '100%',
                  }}
                >
                  {displayTag}
                </motion.div>
              )}

              {isChatterbox && (
                <motion.div
                  animate={{ y: [0, -0.8, 0], opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    marginTop: 7,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    alignSelf: 'center',
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: `1px solid ${primary}44`,
                    background: 'rgba(248, 255, 248, 0.8)',
                    fontFamily: 'var(--font-handwritten)',
                    fontSize: 11,
                    lineHeight: 1,
                    color: `${deep}dd`,
                    letterSpacing: '0.04em',
                    boxShadow: `0 2px 8px ${primary}26`,
                  }}
                >
                  💬 话痨
                </motion.div>
              )}

              {drawingData && (
                <motion.button
                  onClick={() => setShowPlayback(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    marginTop: isChatterbox ? 6 : 7,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: `1px solid ${primary}66`,
                    background: `${primary}11`,
                    fontFamily: 'var(--font-handwritten)',
                    fontSize: 11,
                    color: deep,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className="hover:bg-opacity-100 hover:shadow-md"
                >
                  🎬 回放绘画
                </motion.button>
              )}

              <div
                style={{
                  marginTop: isChatterbox ? 6 : 7,
                  textAlign: 'center',
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: 12,
                  lineHeight: 1.3,
                  color: 'rgba(72, 82, 76, 0.62)',
                  letterSpacing: '0.01em',
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
          interactionPulseKind === 'prune' && interactionPulseToken
            ? { scale: [1, 1.28, 0.9, 1.12, 1], rotate: [0, -10, 7, -4, 0], opacity: [0.82, 1, 0.9, 1] }
            : isRecallingMemory
            ? { rotate: [0, 360], scale: [1, 1.1, 1], opacity: [0.62, 0.98, 0.62] }
            : isTalking
              ? { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }
              : hovered
                ? { opacity: 1, scale: 1.18, y: [0, -1.2, 0] }
                : { opacity: 0.64, scale: 1 }
        }
        transition={
          interactionPulseKind === 'prune' && interactionPulseToken
            ? { duration: 0.72, ease: 'easeOut' }
            : isRecallingMemory
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

      <AnimatePresence>
        {showPlayback && drawingData && (
          <DrawingPlayback
            drawingData={drawingData}
            onClose={() => setShowPlayback(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
