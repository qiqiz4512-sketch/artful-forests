import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTreeDepthMetrics } from '@/lib/treeDepth';
import { TreeAgent } from '@/types/forest';
import TreeIdentity from '@/components/TreeIdentity';
import { getTreeSpeciesPhrases } from '@/lib/treeSpecies';
import { useForestStore } from '@/stores/useForestStore';

interface Props {
  imageData: string;
  x: number;
  y: number;
  size: number;
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

export default function PlantedTree({ imageData, x, y, size, isNew, growthMode = 'ambient', minY, maxY, agentId, profile, highlighted = false }: Props) {
  const [showPhrase, setShowPhrase] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [hasGrown, setHasGrown] = useState(false);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const growDelayRef = useRef(Math.random() * 0.5);

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

  const handleClick = () => {
    const speciesPhrases = getTreeSpeciesPhrases(profile?.shape?.id);
    const p = speciesPhrases[Math.floor(Math.random() * speciesPhrases.length)];
    setPhrase(p);
    setShowPhrase(true);
    setTimeout(() => setShowPhrase(false), 3000);
  };

  return (
    <div
      ref={treeRef}
      className="absolute cursor-pointer"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `scale(${depth.perspectiveScale})`,
        transformOrigin: 'bottom center',
        zIndex: depth.zIndex,
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
          rotate: isHovered
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
                rotate: { duration: depth.swayDuration * animationDurationScale, repeat: isHovered ? Infinity : 0 },
              }
            : { rotate: { duration: depth.swayDuration * animationDurationScale, repeat: isHovered ? Infinity : 0 } }
        }
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformOrigin: 'bottom center' }}
            animate={!isHovered && !isAdoring && hasSyncAffinity ? { x: [0, towardPartnerX, 0] } : { x: 0 }}
            transition={!isHovered && !isAdoring && hasSyncAffinity
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
            animate={!isHovered && !isAdoring && idleAnim ? idleAnim.animate : {}}
            transition={!isHovered && !isAdoring && idleAnim
              ? {
                  ...idleAnim.transition,
                  duration: idleAnim.transition.duration * animationDurationScale,
                }
              : { duration: 0.3 }}
          >
          {isAdoring && !isHovered ? (
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
          hovered={isHovered}
        />

        <AnimatePresence>
          {showPhrase && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: -10, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="absolute left-1/2 whitespace-nowrap font-handwriting text-lg pointer-events-none"
              style={{
                top: depth.phraseTop,
                transform: `translateX(-50%) scale(${depth.phraseCompensationScale.toFixed(2)})`,
                background: 'rgba(255,252,245,0.9)',
                padding: '6px 14px',
                borderRadius: '8px 12px 10px 14px',
                boxShadow: `2px 3px 10px rgba(0,0,0,${depth.phraseShadowOpacity.toFixed(2)})`,
                color: 'hsl(152, 30%, 25%)',
                border: '1px solid rgba(180,170,150,0.2)',
                zIndex: 2,
              }}
            >
              {phrase}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
