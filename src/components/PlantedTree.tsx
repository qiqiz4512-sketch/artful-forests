import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTreeDepthMetrics } from '@/lib/treeDepth';
import { TreeAgent } from '@/types/forest';
import TreeIdentity from '@/components/TreeIdentity';
import { useForestStore } from '@/stores/useForestStore';

const randomIn = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface Props {
  imageData: string;
  x: number;
  y: number;
  size: number;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  isNew?: boolean;
  growthMode?: 'manual' | 'auto' | 'ambient';
  minY: number;
  maxY: number;
  agentId?: string;
  profile?: Pick<TreeAgent, 'name' | 'personality' | 'metadata' | 'shape' | 'socialCircle' | 'intimacyMap' | 'position' | 'isManual' | 'growthBoost'>;
  highlighted?: boolean;
}

interface IdleAnim {
  animate: Record<string, number[]>;
  transition: { duration: number; repeat: number; ease: string; repeatType?: 'loop' | 'mirror' };
}

const getIdleAnim = (personality?: string, shapeId?: string): IdleAnim | null => {
  if (shapeId) {
    if (/willow/.test(shapeId)) {
      return {
        animate: { rotate: [-1.2, 1.8, -1.2], x: [0, 1.5, 0] },
        transition: { duration: 6.4, repeat: Infinity, ease: 'easeInOut' },
      };
    }

    if (/aspen/.test(shapeId)) {
      return {
        animate: { rotate: [-1.6, 1.6, -1.6], x: [0, 0.8, -0.6, 0] },
        transition: { duration: 2.3, repeat: Infinity, ease: 'easeInOut' },
      };
    }

    if (/oak|chestnut/.test(shapeId)) {
      return {
        animate: { rotate: [-0.8, 0.8, -0.8], y: [0, -1.2, 0] },
        transition: { duration: 7.6, repeat: Infinity, ease: 'easeInOut' },
      };
    }

    if (/bare/.test(shapeId)) {
      return {
        animate: { rotate: [-0.9, 0.9, -0.9], scaleY: [1, 1.012, 1] },
        transition: { duration: 5.4, repeat: Infinity, ease: 'easeInOut' },
      };
    }

    if (/larch/.test(shapeId)) {
      return {
        animate: { y: [0, -2, 0], rotate: [-1.1, 1.1, -1.1] },
        transition: { duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
      };
    }
  }

  switch (personality) {
    case '温柔':
      return {
        animate: { rotate: [-1.5, 1.5, -1.5] },
        transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
      };
    case '睿智':
      return {
        animate: { y: [0, -2.5, 0] },
        transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
      };
    case '活泼':
      return {
        animate: { y: [0, -5, 0], scale: [1, 1.022, 1] },
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      };
    case '顽皮':
      return {
        animate: { rotate: [-2, 2, -2] },
        transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
      };
    case '社恐':
      return {
        animate: { scaleX: [1, 0.982, 1] },
        transition: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
      };
    default:
      return null;
  }
};

const getGrowthSpring = (shapeId?: string) => {
  if (!shapeId) {
    return {
      stiffness: 100,
      damping: 15,
      yDelay: 0,
      opacityDuration: 0.32,
    };
  }

  if (/pine|spruce|fir|cedar|cypress/.test(shapeId)) {
    return {
      stiffness: 88,
      damping: 17,
      yDelay: 0.04,
      opacityDuration: 0.36,
    };
  }

  if (/larch/.test(shapeId)) {
    return {
      stiffness: 94,
      damping: 16,
      yDelay: 0.03,
      opacityDuration: 0.34,
    };
  }

  if (/cherry|sakura|plum|blossom/.test(shapeId)) {
    return {
      stiffness: 116,
      damping: 14,
      yDelay: 0,
      opacityDuration: 0.28,
    };
  }

  if (/palm|willow/.test(shapeId)) {
    return {
      stiffness: 92,
      damping: 18,
      yDelay: 0.06,
      opacityDuration: 0.34,
    };
  }

  if (/bare/.test(shapeId)) {
    return {
      stiffness: 82,
      damping: 19,
      yDelay: 0.07,
      opacityDuration: 0.4,
    };
  }

  if (/oak|elm|beech|chestnut/.test(shapeId)) {
    return {
      stiffness: 90,
      damping: 18,
      yDelay: 0.05,
      opacityDuration: 0.35,
    };
  }

  if (/aspen/.test(shapeId)) {
    return {
      stiffness: 110,
      damping: 14,
      yDelay: 0.01,
      opacityDuration: 0.3,
    };
  }

  return {
    stiffness: 100,
    damping: 15,
    yDelay: 0.02,
    opacityDuration: 0.32,
  };
};

const ADORATION_DETECTION_RANGE = 300;
const USER_NUDGE_BUBBLE_MS = 3200;
const USER_NUDGE_FOLLOWUP_CHANCE = 0.38;
const USER_NUDGE_FOLLOWUP_DELAY_MS = 900;
const USER_NUDGE_LINES_COMMON = [
  '有事吗？',
  '找我干嘛？',
  '先说重点，我叶子要掉了。',
  '你先夸我两句我再听。',
  '又来催更树生故事了？',
  '我在营业，你在偷看。',
];
const USER_NUDGE_LINES_BY_PERSONALITY: Record<string, string[]> = {
  社恐: ['可、可以打字吗…', '我先紧张一下再回答你。'],
  活泼: ['你点我我就当你在打 call！', '来都来了，聊两句呀！'],
  顽皮: ['点我一下，今天好运+1。', '你是不是偷偷最喜欢我？'],
  睿智: ['问题很好，先深呼吸。', '答案在风里，你再问一次。'],
  温柔: ['慢慢说，我在听。', '别急，我会认真回你。'],
  神启: ['凡人，你成功召唤了我。', '请讲，我已开启神谕频道。'],
};
const USER_NUDGE_FOLLOWUP_LINES = [
  '所以呢？',
  '然后？继续说。',
  '重点呢？我在等。',
  '这就是全部情报？',
  '行，我姑且听着。',
];

const pickUserNudgeLine = (personality?: string, isManual?: boolean) => {
  if (isManual) return randomIn(USER_NUDGE_LINES_BY_PERSONALITY['神启']);
  const specific = personality ? USER_NUDGE_LINES_BY_PERSONALITY[personality] ?? [] : [];
  return randomIn([...specific, ...USER_NUDGE_LINES_COMMON]);
};

export default function PlantedTree({ imageData, x, y, size, season = 'spring', isNew, growthMode = 'ambient', minY, maxY, agentId, profile, highlighted = false }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasGrown, setHasGrown] = useState(false);
  const [userNudgeLines, setUserNudgeLines] = useState<string[]>([]);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const growDelayRef = useRef(Math.random() * 0.5);
  const userNudgeTimerRef = useRef<number | null>(null);
  const userNudgeFollowupTimerRef = useRef<number | null>(null);

  const groundY = y + size;
  const depth = getTreeDepthMetrics(groundY, minY, maxY);
  const isAutoGrowth = growthMode === 'auto';
  const shouldGrowIn = hasGrown || Boolean(isNew);
  const entryInitialScale = isAutoGrowth ? 0.2 : 0;
  const entryInitialOpacity = isAutoGrowth ? 0.16 : 0;
  const growthSpring = getGrowthSpring(profile?.shape?.id);
  const agents = useForestStore((state) => state.agents);
  const partnerId = profile?.socialCircle?.partner;
  const partner = agents.find((agent) => agent.id === partnerId);
  const partnerIntimacy = partnerId ? profile?.intimacyMap?.[partnerId] ?? 0 : 0;
  const isDivineManual = Boolean(profile?.isManual);
  const growthBoost = Math.max(1, profile?.growthBoost ?? 1);
  const animationDurationScale = 1 / growthBoost;
  const manualTree = [...agents].reverse().find((agent) => agent.isManual);
  const adorationDistance = manualTree && !isDivineManual
    ? Math.hypot((profile?.position.x ?? x + size * 0.5) - manualTree.position.x, (profile?.position.y ?? y + size) - manualTree.position.y)
    : Number.POSITIVE_INFINITY;
  const isAdoring = adorationDistance <= ADORATION_DETECTION_RANGE;
  const adorationTilt = manualTree && isAdoring
    ? Math.sign(manualTree.position.x - (profile?.position.x ?? x + size * 0.5)) * 6
    : 0;
  const towardPartnerX =
    partner && partnerIntimacy >= 90
      ? Math.sign(partner.position.x - (profile?.position.x ?? x + size * 0.5)) * Math.min(4.5, 1.2 + (partnerIntimacy - 90) * 0.18)
      : 0;
  const hasSyncAffinity = Boolean(partner && towardPartnerX !== 0);
  const effectiveHovered = isHovered;
  const DIALOGUE_LINE_CHARS = 6;
  const userNudgeBubbleText = userNudgeLines.length > 0
    ? userNudgeLines
      .map((line) => {
        const snippet = line.length > 16 ? line.slice(0, 16) + '\u2026' : line;
        const chunks = snippet.match(new RegExp(`.{1,${DIALOGUE_LINE_CHARS}}`, 'g')) ?? [snippet];
        return chunks
          .map((chunk) => chunk.padEnd(DIALOGUE_LINE_CHARS, '\u3000'))
          .join('\n');
      })
      .join('\n')
    : '';
  const hasActiveBubble = userNudgeLines.length > 0;

  const idleAnim = getIdleAnim(profile?.personality, profile?.shape?.id);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasGrown || isNew) return;
    const node = treeRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setHasGrown(true);
          observer.unobserve(entry.target);
          observer.disconnect();
        });
      },
      {
        root: null,
        rootMargin: '0px 100px 0px 100px',
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasGrown, isNew]);

  useEffect(() => () => {
    if (userNudgeTimerRef.current !== null) {
      window.clearTimeout(userNudgeTimerRef.current);
      userNudgeTimerRef.current = null;
    }
    if (userNudgeFollowupTimerRef.current !== null) {
      window.clearTimeout(userNudgeFollowupTimerRef.current);
      userNudgeFollowupTimerRef.current = null;
    }
  }, []);

  const handleUserNudge = () => {
    if (userNudgeTimerRef.current !== null) {
      window.clearTimeout(userNudgeTimerRef.current);
    }
    if (userNudgeFollowupTimerRef.current !== null) {
      window.clearTimeout(userNudgeFollowupTimerRef.current);
    }
    const nextText = pickUserNudgeLine(profile?.personality, profile?.isManual);
    setUserNudgeLines([nextText]);

    if (Math.random() < USER_NUDGE_FOLLOWUP_CHANCE) {
      userNudgeFollowupTimerRef.current = window.setTimeout(() => {
        setUserNudgeLines((prev) => {
          const followup = randomIn(USER_NUDGE_FOLLOWUP_LINES);
          if (prev.length === 0) return [followup];
          if (prev.length >= 2) return prev;
          return [...prev, followup];
        });
        userNudgeFollowupTimerRef.current = null;
      }, USER_NUDGE_FOLLOWUP_DELAY_MS);
    }

    userNudgeTimerRef.current = window.setTimeout(() => {
      setUserNudgeLines([]);
      userNudgeTimerRef.current = null;
    }, USER_NUDGE_BUBBLE_MS);
  };

  return (
    <div
      ref={treeRef}
      className="absolute"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `scale(${depth.perspectiveScale})`,
        transformOrigin: 'bottom center',
        zIndex: hasActiveBubble ? 9000 : depth.zIndex,
      }}
    >
      <motion.div
        layout
        className="relative w-full h-full"
        initial={{ scale: entryInitialScale, opacity: entryInitialOpacity, y: 20 }}
        animate={{
          y: shouldGrowIn ? 0 : 20,
          scale: shouldGrowIn ? 1 : entryInitialScale,
          opacity: shouldGrowIn ? 1 : entryInitialOpacity,
          rotate: effectiveHovered
            ? [0, depth.swayAmplitude, -depth.swayAmplitude, depth.swayAmplitude * 0.45, -depth.swayAmplitude * 0.45, 0]
            : 0,
        }}
        transition={
          shouldGrowIn
            ? {
                scale: {
                  type: 'spring',
                  stiffness: growthSpring.stiffness,
                  damping: growthSpring.damping,
                  delay: growDelayRef.current,
                },
                opacity: {
                  duration: growthSpring.opacityDuration,
                  delay: growDelayRef.current,
                },
                y: {
                  type: 'spring',
                  stiffness: growthSpring.stiffness,
                  damping: growthSpring.damping,
                  delay: growDelayRef.current + growthSpring.yDelay,
                },
                rotate: { duration: depth.swayDuration * animationDurationScale, repeat: effectiveHovered ? Infinity : 0 },
              }
            : { rotate: { duration: depth.swayDuration * animationDurationScale, repeat: effectiveHovered ? Infinity : 0 } }
        }
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleUserNudge}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformOrigin: 'bottom center' }}
            animate={!effectiveHovered && !isAdoring && hasSyncAffinity ? { x: [0, towardPartnerX, 0] } : { x: 0 }}
            transition={!effectiveHovered && !isAdoring && hasSyncAffinity
            ? {
                x: {
                    duration: 2.2 * animationDurationScale,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }
            : { duration: 0.3 }}
        >
          <motion.div
            className="relative w-full h-full"
            style={{ transformOrigin: 'bottom center' }}
            animate={!effectiveHovered && !isAdoring && idleAnim ? idleAnim.animate : {}}
            transition={!effectiveHovered && !isAdoring && idleAnim
              ? {
                  ...idleAnim.transition,
                  duration: idleAnim.transition.duration * animationDurationScale,
                }
              : { duration: 0.3 }}
          >
          {isAdoring && !effectiveHovered ? (
            <>
              <img
                src={imageData}
                alt="planted tree"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{
                  objectPosition: 'bottom center',
                  clipPath: 'inset(58% 0 0 0)',
                  filter: `blur(${depth.blurPx.toFixed(2)}px) saturate(${depth.saturation.toFixed(2)}) drop-shadow(0 ${depth.treeShadowOffsetY.toFixed(1)}px ${depth.treeShadowBlur.toFixed(1)}px rgba(0,0,0,${depth.treeShadowOpacity.toFixed(2)}))`,
                  background: 'transparent',
                }}
              />

              <motion.div
                className="absolute inset-0"
                animate={{ rotate: [0, adorationTilt, 0], x: [0, Math.sign(adorationTilt) * 1.6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '50% 72%' }}
              >
                <img
                  src={imageData}
                  alt="planted tree"
                  className="w-full h-full object-contain pointer-events-none"
                  style={{
                    objectPosition: 'bottom center',
                    clipPath: 'inset(0 0 40% 0)',
                    filter: `blur(${depth.blurPx.toFixed(2)}px) saturate(${depth.saturation.toFixed(2)}) drop-shadow(0 ${depth.treeShadowOffsetY.toFixed(1)}px ${depth.treeShadowBlur.toFixed(1)}px rgba(0,0,0,${depth.treeShadowOpacity.toFixed(2)}))`,
                    background: 'transparent',
                  }}
                />
              </motion.div>
            </>
          ) : (
            <img
              src={imageData}
              alt="planted tree"
              className="w-full h-full object-contain pointer-events-none"
              style={{
                objectPosition: 'bottom center',
                filter: `blur(${depth.blurPx.toFixed(2)}px) saturate(${depth.saturation.toFixed(2)}) drop-shadow(0 ${depth.treeShadowOffsetY.toFixed(1)}px ${depth.treeShadowBlur.toFixed(1)}px rgba(0,0,0,${depth.treeShadowOpacity.toFixed(2)}))`,
                background: 'transparent',
              }}
            />
          )}

            <AnimatePresence>
              {highlighted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: [1, 1.06, 1] }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.7, ease: 'easeOut', repeat: Infinity }}
                  className="absolute inset-[6%] pointer-events-none"
                  style={{
                    borderRadius: '48% 52% 50% 46%',
                    border: '2px solid rgba(255,255,255,0.72)',
                    boxShadow: '0 0 0 4px rgba(162,215,181,0.35), 0 0 18px rgba(98,178,130,0.42)',
                  }}
                />
              )}
            </AnimatePresence>

            {isDivineManual && (
              <motion.div
                className="absolute inset-[4%] pointer-events-none"
                animate={{
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 0 1px rgba(250, 204, 21, 0.5), 0 0 8px rgba(250, 204, 21, 0.42)',
                    '0 0 0 1px rgba(244, 114, 182, 0.44), 0 0 12px rgba(96, 165, 250, 0.38)',
                    '0 0 0 1px rgba(167, 243, 208, 0.46), 0 0 10px rgba(250, 204, 21, 0.48)',
                    '0 0 0 1px rgba(250, 204, 21, 0.5), 0 0 8px rgba(250, 204, 21, 0.42)',
                  ],
                }}
                transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  borderRadius: '52% 48% 50% 46%',
                  border: '1px solid rgba(250, 204, 21, 0.55)',
                  filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.45))',
                }}
              />
            )}
          </motion.div>
        </motion.div>

        {/* Ground shadow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            bottom: -4,
            marginLeft: depth.groundShadowOffsetX,
            width: `${depth.groundShadowWidth.toFixed(0)}%`,
            height: depth.groundShadowHeight,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(0,0,0,${depth.groundShadowOpacity.toFixed(2)}) 0%, transparent 70%)`,
          }}
        />

        <TreeIdentity
          agentId={agentId ?? ''}
          name={profile?.name ?? '无名树'}
          personality={profile?.personality}
          shapeId={profile?.shape?.id}
          scale={depth.perspectiveScale}
          hovered={effectiveHovered}
        />

        {/* 点击树木互动气泡 — 右上方（优先显示） */}
        <AnimatePresence>
          {userNudgeLines.length > 0 && (
            <motion.div
              key={'user-nudge-' + agentId}
              initial={{ opacity: 0, x: 8, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: [0, -1, 0], scale: [1, 1.03, 1] }}
              exit={{ opacity: 0, x: 5, y: 2, scale: 0.92 }}
              transition={{
                opacity: { duration: 0.16, ease: 'easeOut' },
                x: { type: 'spring', stiffness: 280, damping: 24 },
                y: { duration: 1.9, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 0.24, ease: 'easeOut' },
              }}
              className="absolute pointer-events-none"
              style={{
                top: '-4%',
                left: '102%',
                transform: `scale(${depth.phraseCompensationScale.toFixed(2)})`,
                transformOrigin: 'left bottom',
                zIndex: 26,
              }}
            >
              <div
                style={{
                  minWidth: 102,
                  maxWidth: 148,
                  width: `${DIALOGUE_LINE_CHARS}em`,
                  fontFamily: "'ZCOOL KuaiLe', cursive",
                  fontSize: 12,
                  lineHeight: 1.52,
                  letterSpacing: '0.03em',
                  background: 'rgba(252, 255, 253, 0.6)',
                  padding: '6px 11px',
                  borderRadius: '18px',
                  boxShadow: '0 8px 18px rgba(86, 112, 98, 0.16), 0 1px 0 rgba(255,255,255,0.56) inset',
                  color: 'hsl(152, 30%, 24%)',
                  border: '1px solid rgba(186, 206, 194, 0.52)',
                  backdropFilter: 'blur(4px)',
                  whiteSpace: 'pre',
                  position: 'relative',
                }}
              >
                {userNudgeBubbleText}
                <div
                  style={{
                    position: 'absolute',
                    left: -6,
                    top: '74%',
                    transform: 'translateY(-50%) rotate(45deg)',
                    width: 12,
                    height: 12,
                    background: 'rgba(252, 255, 253, 0.6)',
                    borderLeft: '1px solid rgba(186, 206, 194, 0.52)',
                    borderBottom: '1px solid rgba(186, 206, 194, 0.52)',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
