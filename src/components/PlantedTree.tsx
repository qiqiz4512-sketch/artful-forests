import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTreeDepthMetrics } from '@/lib/treeDepth';
import { SceneInteractionKind, SocialState, TreeAgent } from '@/types/forest';
import TreeIdentity from '@/components/TreeIdentity';
import { useForestStore } from '@/stores/useForestStore';
import { getAgentGrowthStage, getTreeAssetPath } from '@/lib/treeGrowth';
import {
  getSceneReplyBubbleLayout,
  getSceneReplyBubbleMotion,
  getSceneReplyBubblePalette,
  getSceneReplyBubbleDuration,
  getTreeShakeMotion,
  USER_NUDGE_BUBBLE_MS,
  USER_NUDGE_FOLLOWUP_CHANCE,
  USER_NUDGE_FOLLOWUP_DELAY_MS,
  pickTreeShakeReply,
  pickUserNudgeFollowup,
  pickUserNudgeLine,
} from '@/constants/treeInteractionLines';

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
  profile?: Pick<TreeAgent, 'name' | 'tag' | 'personality' | 'metadata' | 'shape' | 'socialCircle' | 'intimacyMap' | 'position' | 'isManual' | 'growthBoost' | 'socialState' | 'growthScore' | 'memory'>;
  highlighted?: boolean;
  active?: boolean;
  onTreeClick?: (agentId: string) => void;
  shakePromptSignal?: number;
  isAwaitingReply?: boolean;
}

const TREE_SHAKE_BUBBLE_MS = 2400;
const TREE_SHAKE_LEAF_FALL_MS = 1180;
const TREE_SHAKE_FEEDBACK_MS = 1500;
const TREE_SHAKE_JOLT_MS = 420;
const QUICK_ACTION_HOVER_MS = 560;
const QUICK_ACTION_ENERGY_MS = 1400;
const QUICK_ACTION_PRUNE_MS = 1200;
const QUICK_ACTION_MEMORY_MS = 2600;
const TREE_SHAKE_LEAF_PARTICLES = [
  { left: '18%', top: '18%', driftX: -22, dropY: 56, rotate: -120, color: 'rgba(154, 205, 122, 0.92)', size: 10 },
  { left: '28%', top: '10%', driftX: -10, dropY: 72, rotate: 140, color: 'rgba(192, 224, 126, 0.95)', size: 12 },
  { left: '41%', top: '15%', driftX: 8, dropY: 78, rotate: -180, color: 'rgba(112, 181, 99, 0.92)', size: 9 },
  { left: '56%', top: '9%', driftX: 26, dropY: 68, rotate: 160, color: 'rgba(173, 214, 96, 0.9)', size: 11 },
  { left: '66%', top: '20%', driftX: 18, dropY: 82, rotate: -150, color: 'rgba(145, 196, 104, 0.88)', size: 10 },
  { left: '74%', top: '14%', driftX: 30, dropY: 60, rotate: 130, color: 'rgba(194, 229, 134, 0.92)', size: 8 },
];
const TREE_SHAKE_LEAF_PARTICLES_COOL = [
  { left: '16%', top: '18%', driftX: -24, dropY: 58, rotate: -130, color: 'rgba(158, 198, 224, 0.94)', size: 10 },
  { left: '26%', top: '11%', driftX: -12, dropY: 74, rotate: 138, color: 'rgba(175, 214, 236, 0.92)', size: 12 },
  { left: '41%', top: '15%', driftX: 7, dropY: 80, rotate: -176, color: 'rgba(134, 173, 211, 0.92)', size: 9 },
  { left: '56%', top: '9%', driftX: 24, dropY: 70, rotate: 164, color: 'rgba(162, 205, 228, 0.9)', size: 11 },
  { left: '66%', top: '19%', driftX: 18, dropY: 84, rotate: -146, color: 'rgba(124, 165, 198, 0.9)', size: 10 },
  { left: '76%', top: '14%', driftX: 28, dropY: 62, rotate: 128, color: 'rgba(189, 222, 240, 0.92)', size: 8 },
];

const buildMemoryRecallText = (profile?: Props['profile']) => {
  const lastTopic = profile?.memory?.lastTopic?.trim();
  const latestBond = profile?.memory?.interactionHistory?.[0];
  const displayName = (profile?.name ?? '这棵树').replace(/\d+/g, '');

  if (latestBond?.lastTopic && latestBond.lastTopic !== lastTopic) {
    return `${displayName}想起了和${latestBond.personalityImpression}树聊过的${latestBond.lastTopic}。`;
  }

  if (lastTopic) {
    return `${displayName}的树心闪了一下，关于${lastTopic}的记忆被轻轻唤醒。`;
  }

  return `${displayName}的年轮轻轻发亮，像是想起了一段还没说完的森林往事。`;
};

const getInteractionGlow = (kind: SceneInteractionKind) => {
  switch (kind) {
    case 'energy':
      return {
        border: 'rgba(255, 214, 122, 0.76)',
        fill: 'radial-gradient(circle, rgba(255, 220, 145, 0.28) 0%, rgba(255, 196, 92, 0.14) 45%, rgba(255, 196, 92, 0) 72%)',
        shadow: '0 0 20px rgba(255, 198, 92, 0.42)',
      };
    case 'prune':
      return {
        border: 'rgba(144, 207, 138, 0.72)',
        fill: 'radial-gradient(circle, rgba(177, 232, 162, 0.22) 0%, rgba(132, 195, 116, 0.12) 44%, rgba(132, 195, 116, 0) 74%)',
        shadow: '0 0 18px rgba(118, 181, 108, 0.36)',
      };
    case 'memory':
      return {
        border: 'rgba(212, 154, 240, 0.76)',
        fill: 'radial-gradient(circle, rgba(214, 154, 240, 0.24) 0%, rgba(173, 115, 230, 0.13) 44%, rgba(173, 115, 230, 0) 74%)',
        shadow: '0 0 20px rgba(184, 128, 236, 0.4)',
      };
  }
};

const amplifyShakeMotion = (motion: ReturnType<typeof getTreeShakeMotion>, factor: number) => ({
  x: motion.x.map((value) => value * factor),
  rotate: motion.rotate.map((value) => value * factor),
  scale: motion.scale.map((value, index) => (index === 0 || index === motion.scale.length - 1 ? value : 1 + ((value - 1) * Math.max(1, factor * 0.72)))),
  durationMs: Math.round(motion.durationMs * 1.08),
});

interface IdleAnim {
  animate: Record<string, number[]>;
  transition: { duration: number; repeat: number; ease: 'easeInOut'; repeatType?: 'loop' | 'mirror' };
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
export default function PlantedTree({ imageData, x, y, size, season = 'spring', isNew, growthMode = 'ambient', minY, maxY, agentId, profile, highlighted = false, active = false, onTreeClick, shakePromptSignal = 0, isAwaitingReply = false }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasGrown, setHasGrown] = useState(false);
  const [userNudgeLines, setUserNudgeLines] = useState<string[]>([]);
  const [preferDynamicAsset, setPreferDynamicAsset] = useState(true);
  const [stageBurst, setStageBurst] = useState(false);
  const [receivePulse, setReceivePulse] = useState(false);
  const [priorityBubbleText, setPriorityBubbleText] = useState('');
  const [latestReplyBubbleText, setLatestReplyBubbleText] = useState('');
  const [leafBurstToken, setLeafBurstToken] = useState<number | null>(null);
  const [cooldownHaloToken, setCooldownHaloToken] = useState<number | null>(null);
  const [shakeJoltToken, setShakeJoltToken] = useState<number | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const growDelayRef = useRef(Math.random() * 0.5);
  const userNudgeTimerRef = useRef<number | null>(null);
  const userNudgeFollowupTimerRef = useRef<number | null>(null);
  const priorityBubbleTimerRef = useRef<number | null>(null);
  const leafBurstTimerRef = useRef<number | null>(null);
  const cooldownHaloTimerRef = useRef<number | null>(null);
  const shakeJoltTimerRef = useRef<number | null>(null);
  const latestReplyBubbleTimerRef = useRef<number | null>(null);
  const latestReplyBubbleKeyRef = useRef('');
  const prevGrowthStageRef = useRef(getAgentGrowthStage(profile ?? null));
  const receivePulseTimerRef = useRef<number | null>(null);
  const prevReceiveChatKeyRef = useRef('');
  const quickHoverTimerRef = useRef<number | null>(null);
  const quickTriggerTimerRef = useRef<number | null>(null);
  const stageBurstTimerRef = useRef<number | null>(null);
  const [sceneHoverKind, setSceneHoverKind] = useState<SceneInteractionKind | null>(null);
  const [sceneHoverToken, setSceneHoverToken] = useState<number | null>(null);
  const [sceneTriggerKind, setSceneTriggerKind] = useState<SceneInteractionKind | null>(null);
  const [sceneTriggerToken, setSceneTriggerToken] = useState<number | null>(null);

  const groundY = y + size;
  const depth = getTreeDepthMetrics(groundY, minY, maxY);
  const isAutoGrowth = growthMode === 'auto';
  const shouldGrowIn = hasGrown || Boolean(isNew);
  const entryInitialScale = isAutoGrowth ? 0.2 : 0;
  const entryInitialOpacity = isAutoGrowth ? 0.16 : 0;
  const growthSpring = getGrowthSpring(profile?.shape?.id);
  const agents = useForestStore((state) => state.agents);
  const activeChat = useForestStore((state) => state.activeChat);
  const chatHistory = useForestStore((state) => state.chatHistory);
  const sceneInteractionEvent = useForestStore((state) => state.sceneInteractionEvent);
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
  const growthStage = getAgentGrowthStage(profile ?? null);
  const isTyping = profile?.socialState === SocialState.TALKING;
  const isChatParticipant = Boolean(agentId && activeChat && (activeChat.treeAId === agentId || activeChat.treeBId === agentId));
  const shakeMotion = getTreeShakeMotion(profile?.personality, profile?.isManual);
  const latestTreeReplyEntry = useMemo(() => {
    if (!agentId) return null;
    for (let index = chatHistory.length - 1; index >= 0; index -= 1) {
      const entry = chatHistory[index];
      if (entry.speakerId !== agentId) continue;
      if (entry.source === 'user' || entry.type === 'system') continue;
      if (!entry.message.trim()) continue;
      return entry;
    }
    return null;
  }, [agentId, chatHistory]);
  const latestReplyBubbleDurationMs = latestTreeReplyEntry
    ? getSceneReplyBubbleDuration({
        personality: profile?.personality,
        isManual: profile?.isManual,
        source: latestTreeReplyEntry.source,
        type: latestTreeReplyEntry.type,
        message: latestTreeReplyEntry.message,
      })
    : 0;
  const latestReplyBubbleLayout = getSceneReplyBubbleLayout({
    durationMs: latestReplyBubbleDurationMs,
    message: latestReplyBubbleText || latestTreeReplyEntry?.message,
  });
  const latestReplyBubbleMotion = getSceneReplyBubbleMotion({
    personality: profile?.personality,
    isManual: profile?.isManual,
  });
  const latestReplyBubblePalette = getSceneReplyBubblePalette({
    personality: profile?.personality,
    isManual: profile?.isManual,
  });
  const latestReplyPreviewText = useMemo(() => {
    const rawText = latestReplyBubbleText.trim();
    if (!rawText) return '';
    return rawText;
  }, [latestReplyBubbleLayout.previewChars, latestReplyBubbleText]);
  const treeImageSrc = preferDynamicAsset
    ? getTreeAssetPath({ personality: profile?.personality, growthStage })
    : imageData;
  const userNudgeBubbleText = userNudgeLines.length > 0
    ? userNudgeLines
      .map((line) => {
        return line;
      })
      .join('\n')
    : '';
  const crownBubbleText = priorityBubbleText || latestReplyBubbleText || userNudgeBubbleText;
  const hasActiveBubble = Boolean(crownBubbleText);
  const isLatestReplyBubble = !priorityBubbleText && Boolean(latestReplyBubbleText);
  const isCompactBubble = !priorityBubbleText && !latestReplyBubbleText && Boolean(userNudgeBubbleText);
  const isReceivingMessage = Boolean(agentId && manualTree && activeChat?.treeAId === manualTree.id && activeChat?.treeBId === agentId);
  const interactionKind = sceneTriggerKind ?? sceneHoverKind;
  const interactionGlow = interactionKind ? getInteractionGlow(interactionKind) : null;
  const memoryRecallActive = sceneTriggerKind === 'memory' && Boolean(sceneTriggerToken);
  const isChatterbox = Boolean(profile?.metadata?.chatterbox);
  const isSociallyAnxious = profile?.personality === '社恐';
  const shakeMotionForRender = sceneTriggerKind === 'prune' && isSociallyAnxious
    ? amplifyShakeMotion(shakeMotion, 2.15)
    : shakeMotion;
  const pruneLeafParticles = sceneTriggerKind === 'prune' && isSociallyAnxious
    ? TREE_SHAKE_LEAF_PARTICLES_COOL
    : TREE_SHAKE_LEAF_PARTICLES;

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

  useEffect(() => {
    setPreferDynamicAsset(true);
  }, [growthStage, imageData, profile?.personality]);

  useEffect(() => {
    const prev = prevGrowthStageRef.current;
    prevGrowthStageRef.current = growthStage;
    if (!prev || prev === growthStage) return;
    setStageBurst(true);
    const timer = window.setTimeout(() => setStageBurst(false), 900);
    return () => window.clearTimeout(timer);
  }, [growthStage]);

  useEffect(() => () => {
    if (userNudgeTimerRef.current !== null) {
      window.clearTimeout(userNudgeTimerRef.current);
      userNudgeTimerRef.current = null;
    }
    if (userNudgeFollowupTimerRef.current !== null) {
      window.clearTimeout(userNudgeFollowupTimerRef.current);
      userNudgeFollowupTimerRef.current = null;
    }
    if (receivePulseTimerRef.current !== null) {
      window.clearTimeout(receivePulseTimerRef.current);
      receivePulseTimerRef.current = null;
    }
    if (priorityBubbleTimerRef.current !== null) {
      window.clearTimeout(priorityBubbleTimerRef.current);
      priorityBubbleTimerRef.current = null;
    }
    if (leafBurstTimerRef.current !== null) {
      window.clearTimeout(leafBurstTimerRef.current);
      leafBurstTimerRef.current = null;
    }
    if (cooldownHaloTimerRef.current !== null) {
      window.clearTimeout(cooldownHaloTimerRef.current);
      cooldownHaloTimerRef.current = null;
    }
    if (shakeJoltTimerRef.current !== null) {
      window.clearTimeout(shakeJoltTimerRef.current);
      shakeJoltTimerRef.current = null;
    }
    if (latestReplyBubbleTimerRef.current !== null) {
      window.clearTimeout(latestReplyBubbleTimerRef.current);
      latestReplyBubbleTimerRef.current = null;
    }
    if (quickHoverTimerRef.current !== null) {
      window.clearTimeout(quickHoverTimerRef.current);
      quickHoverTimerRef.current = null;
    }
    if (quickTriggerTimerRef.current !== null) {
      window.clearTimeout(quickTriggerTimerRef.current);
      quickTriggerTimerRef.current = null;
    }
    if (stageBurstTimerRef.current !== null) {
      window.clearTimeout(stageBurstTimerRef.current);
      stageBurstTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!agentId || !sceneInteractionEvent || sceneInteractionEvent.targetTreeId !== agentId) return;

    if (sceneInteractionEvent.phase === 'hover') {
      setSceneHoverKind(sceneInteractionEvent.kind);
      setSceneHoverToken(sceneInteractionEvent.token);
      if (quickHoverTimerRef.current !== null) {
        window.clearTimeout(quickHoverTimerRef.current);
      }
      quickHoverTimerRef.current = window.setTimeout(() => {
        setSceneHoverKind(null);
        setSceneHoverToken(null);
        quickHoverTimerRef.current = null;
      }, QUICK_ACTION_HOVER_MS);
      return;
    }

    setSceneTriggerKind(sceneInteractionEvent.kind);
    setSceneTriggerToken(sceneInteractionEvent.token);

    if (quickTriggerTimerRef.current !== null) {
      window.clearTimeout(quickTriggerTimerRef.current);
    }

    if (sceneInteractionEvent.kind === 'energy') {
      setStageBurst(true);
      if (stageBurstTimerRef.current !== null) {
        window.clearTimeout(stageBurstTimerRef.current);
      }
      stageBurstTimerRef.current = window.setTimeout(() => {
        setStageBurst(false);
        stageBurstTimerRef.current = null;
      }, 900);

      setReceivePulse(true);
      if (receivePulseTimerRef.current !== null) {
        window.clearTimeout(receivePulseTimerRef.current);
      }
      receivePulseTimerRef.current = window.setTimeout(() => {
        setReceivePulse(false);
        receivePulseTimerRef.current = null;
      }, 480);

      setCooldownHaloToken(sceneInteractionEvent.token);
      if (cooldownHaloTimerRef.current !== null) {
        window.clearTimeout(cooldownHaloTimerRef.current);
      }
      cooldownHaloTimerRef.current = window.setTimeout(() => {
        setCooldownHaloToken(null);
        cooldownHaloTimerRef.current = null;
      }, QUICK_ACTION_ENERGY_MS);
    }

    if (sceneInteractionEvent.kind === 'prune') {
      setLeafBurstToken(sceneInteractionEvent.token);
      if (leafBurstTimerRef.current !== null) {
        window.clearTimeout(leafBurstTimerRef.current);
      }
      leafBurstTimerRef.current = window.setTimeout(() => {
        setLeafBurstToken(null);
        leafBurstTimerRef.current = null;
      }, TREE_SHAKE_LEAF_FALL_MS);

      setShakeJoltToken(sceneInteractionEvent.token + 100);
      if (shakeJoltTimerRef.current !== null) {
        window.clearTimeout(shakeJoltTimerRef.current);
      }
      shakeJoltTimerRef.current = window.setTimeout(() => {
        setShakeJoltToken(null);
        shakeJoltTimerRef.current = null;
      }, TREE_SHAKE_JOLT_MS);
    }

    if (sceneInteractionEvent.kind === 'memory') {
      setPriorityBubbleText(buildMemoryRecallText(profile));
      if (priorityBubbleTimerRef.current !== null) {
        window.clearTimeout(priorityBubbleTimerRef.current);
      }
      priorityBubbleTimerRef.current = window.setTimeout(() => {
        setPriorityBubbleText('');
        priorityBubbleTimerRef.current = null;
      }, QUICK_ACTION_MEMORY_MS);
    }

    const duration = sceneInteractionEvent.kind === 'memory'
      ? QUICK_ACTION_MEMORY_MS
      : sceneInteractionEvent.kind === 'prune'
        ? QUICK_ACTION_PRUNE_MS
        : QUICK_ACTION_ENERGY_MS;

    quickTriggerTimerRef.current = window.setTimeout(() => {
      setSceneTriggerKind(null);
      setSceneTriggerToken(null);
      quickTriggerTimerRef.current = null;
    }, duration);
  }, [agentId, profile, sceneInteractionEvent]);

  useEffect(() => {
    if (!latestTreeReplyEntry) return;
    if (Date.now() - latestTreeReplyEntry.createdAt > latestReplyBubbleDurationMs) return;

    const nextKey = `${latestTreeReplyEntry.id}:${latestTreeReplyEntry.message}`;
    if (latestReplyBubbleKeyRef.current === nextKey) return;
    latestReplyBubbleKeyRef.current = nextKey;

    if (latestReplyBubbleTimerRef.current !== null) {
      window.clearTimeout(latestReplyBubbleTimerRef.current);
    }

    setLatestReplyBubbleText(
      latestTreeReplyEntry.message
        .replace(/\s+/g, ' ')
        .trim(),
    );

    latestReplyBubbleTimerRef.current = window.setTimeout(() => {
      setLatestReplyBubbleText('');
      latestReplyBubbleTimerRef.current = null;
    }, latestReplyBubbleDurationMs);
  }, [latestReplyBubbleDurationMs, latestTreeReplyEntry]);

  useEffect(() => {
    if (!shakePromptSignal) return;

    if (userNudgeTimerRef.current !== null) {
      window.clearTimeout(userNudgeTimerRef.current);
      userNudgeTimerRef.current = null;
    }
    if (userNudgeFollowupTimerRef.current !== null) {
      window.clearTimeout(userNudgeFollowupTimerRef.current);
      userNudgeFollowupTimerRef.current = null;
    }
    if (priorityBubbleTimerRef.current !== null) {
      window.clearTimeout(priorityBubbleTimerRef.current);
    }
    if (leafBurstTimerRef.current !== null) {
      window.clearTimeout(leafBurstTimerRef.current);
    }
    if (cooldownHaloTimerRef.current !== null) {
      window.clearTimeout(cooldownHaloTimerRef.current);
    }
    if (shakeJoltTimerRef.current !== null) {
      window.clearTimeout(shakeJoltTimerRef.current);
    }

    setUserNudgeLines([]);
    setPriorityBubbleText(pickTreeShakeReply(profile?.personality, profile?.isManual));
    setLeafBurstToken(Date.now() + shakePromptSignal);
    setCooldownHaloToken(Date.now() + shakePromptSignal * 10);
    setShakeJoltToken(Date.now() + shakePromptSignal * 100);

    priorityBubbleTimerRef.current = window.setTimeout(() => {
      setPriorityBubbleText('');
      priorityBubbleTimerRef.current = null;
    }, TREE_SHAKE_BUBBLE_MS);

    leafBurstTimerRef.current = window.setTimeout(() => {
      setLeafBurstToken(null);
      leafBurstTimerRef.current = null;
    }, TREE_SHAKE_LEAF_FALL_MS);

    cooldownHaloTimerRef.current = window.setTimeout(() => {
      setCooldownHaloToken(null);
      cooldownHaloTimerRef.current = null;
    }, TREE_SHAKE_FEEDBACK_MS);

    shakeJoltTimerRef.current = window.setTimeout(() => {
      setShakeJoltToken(null);
      shakeJoltTimerRef.current = null;
    }, TREE_SHAKE_JOLT_MS);
  }, [profile?.isManual, profile?.personality, shakePromptSignal]);

  useEffect(() => {
    if (!isReceivingMessage || !activeChat) return;
    const chatKey = `${activeChat.treeAId}|${activeChat.treeBId}|${activeChat.message}`;
    if (prevReceiveChatKeyRef.current === chatKey) return;
    prevReceiveChatKeyRef.current = chatKey;
    setReceivePulse(true);
    if (receivePulseTimerRef.current !== null) {
      window.clearTimeout(receivePulseTimerRef.current);
    }
    receivePulseTimerRef.current = window.setTimeout(() => {
      setReceivePulse(false);
      receivePulseTimerRef.current = null;
    }, 420);
  }, [activeChat, isReceivingMessage]);

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
          const followup = pickUserNudgeFollowup();
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

  const handleTreeClick = () => {
    if (!isAwaitingReply) {
      handleUserNudge();
    }
    if (agentId) onTreeClick?.(agentId);
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
        onClick={handleTreeClick}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformOrigin: 'bottom center' }}
          animate={
            shakeJoltToken !== null
              ? { x: shakeMotionForRender.x, rotate: shakeMotionForRender.rotate, scale: shakeMotionForRender.scale }
              : receivePulse
              ? { scale: [1, 1.01, 1], x: [0, -1.8, 1.8, -1.1, 1.1, 0], rotate: [0, -0.9, 0.9, -0.5, 0.5, 0] }
              : stageBurst
              ? { scale: [1, 1.14, 1.02, 1], x: !effectiveHovered && !isAdoring && hasSyncAffinity ? [0, towardPartnerX, 0] : 0 }
              : (isTyping
                ? { scale: [1, 1.02, 1], x: !effectiveHovered && !isAdoring && hasSyncAffinity ? [0, towardPartnerX, 0] : 0 }
                : (!effectiveHovered && !isAdoring && hasSyncAffinity ? { x: [0, towardPartnerX, 0] } : { x: 0, scale: 1 }))
          }
          transition={shakeJoltToken !== null
            ? {
                x: { duration: shakeMotionForRender.durationMs / 1000, ease: 'easeOut' },
                rotate: { duration: shakeMotionForRender.durationMs / 1000, ease: 'easeOut' },
                scale: { duration: shakeMotionForRender.durationMs / 1000, ease: 'easeOut' },
              }
            : receivePulse
            ? {
                scale: { duration: 0.36, ease: 'easeOut' },
                x: { duration: 0.36, ease: 'easeOut' },
                rotate: { duration: 0.36, ease: 'easeOut' },
              }
            : !effectiveHovered && !isAdoring && hasSyncAffinity
            ? {
                x: {
                  duration: 2.2 * animationDurationScale,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
                scale: stageBurst
                  ? { duration: 0.9, ease: 'easeOut' }
                  : isTyping
                    ? { duration: 1.25, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2, ease: 'easeOut' },
              }
            : {
                scale: stageBurst
                  ? { duration: 0.9, ease: 'easeOut' }
                  : isTyping
                    ? { duration: 1.25, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.22, ease: 'easeOut' },
                duration: 0.3,
              }}
        >
          <AnimatePresence>
            {interactionGlow && (
              <motion.div
                key={`scene-interaction-${interactionKind}-${sceneTriggerToken ?? sceneHoverToken}`}
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: sceneTriggerKind ? [0.22, 0.58, 0.18] : [0.12, 0.26, 0.12], scale: sceneTriggerKind ? [0.86, 1.06, 1.12] : [0.92, 1.02, 0.98] }}
                exit={{ opacity: 0, scale: 1.12 }}
                transition={{ duration: sceneTriggerKind ? 1.15 : 0.56, ease: 'easeOut' }}
                className="absolute inset-[8%] pointer-events-none"
                style={{
                  borderRadius: '50%',
                  border: `1.5px solid ${interactionGlow.border}`,
                  background: interactionGlow.fill,
                  boxShadow: interactionGlow.shadow,
                  top: '2%',
                  bottom: '22%',
                }}
              />
            )}

            {sceneTriggerKind === 'energy' && sceneTriggerToken !== null && (
              <>
                {[0, 1].map((index) => (
                  <motion.div
                    key={`energy-spiral-${sceneTriggerToken}-${index}`}
                    initial={{ opacity: 0, rotate: index === 0 ? -24 : 18, scale: 0.72 }}
                    animate={{ opacity: [0, 0.5, 0], rotate: index === 0 ? [0, 96] : [0, -96], scale: [0.72, 1.08, 1.2] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2 + index * 0.08, ease: 'easeOut' }}
                    className="absolute pointer-events-none"
                    style={{
                      inset: index === 0 ? '10% 18% 20% 18%' : '15% 22% 25% 22%',
                      borderRadius: '50%',
                      border: index === 0 ? '1.5px solid rgba(255, 224, 146, 0.68)' : '1px dashed rgba(255, 247, 214, 0.62)',
                      boxShadow: '0 0 16px rgba(255, 208, 112, 0.34)',
                    }}
                  />
                ))}
                {isChatterbox && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[
                      { left: '30%', top: '6%', driftX: -10, driftY: -24, size: 8 },
                      { left: '39%', top: '3%', driftX: -5, driftY: -30, size: 10 },
                      { left: '48%', top: '2%', driftX: 0, driftY: -34, size: 9 },
                      { left: '58%', top: '4%', driftX: 8, driftY: -28, size: 7 },
                      { left: '66%', top: '8%', driftX: 14, driftY: -22, size: 8 },
                    ].map((bubble, index) => (
                      <motion.span
                        key={`chatter-bubble-${sceneTriggerToken}-${index}`}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.72 }}
                        animate={{ opacity: [0, 0.9, 0], x: [0, bubble.driftX], y: [0, bubble.driftY], scale: [0.72, 1.08, 0.92] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.95 + index * 0.08, ease: 'easeOut', delay: index * 0.04 }}
                        style={{
                          position: 'absolute',
                          left: bubble.left,
                          top: bubble.top,
                          width: bubble.size,
                          height: bubble.size,
                          borderRadius: '50%',
                          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.96) 0%, rgba(211, 239, 255, 0.88) 48%, rgba(165, 217, 248, 0.55) 74%, rgba(165, 217, 248, 0.12) 100%)',
                          boxShadow: '0 0 10px rgba(188, 229, 255, 0.42)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {sceneTriggerKind === 'memory' && sceneTriggerToken !== null && (
              <motion.div
                key={`memory-mist-${sceneTriggerToken}`}
                initial={{ opacity: 0, scale: 0.78 }}
                animate={{ opacity: [0.12, 0.42, 0], scale: [0.78, 1.08, 1.18] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="absolute inset-[6%] pointer-events-none"
                style={{
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(219, 172, 248, 0.28) 0%, rgba(187, 138, 240, 0.18) 34%, rgba(187, 138, 240, 0.08) 54%, rgba(187, 138, 240, 0) 76%)',
                  filter: 'blur(12px)',
                }}
              />
            )}

            {leafBurstToken !== null && (
              <motion.div
                key={`leaf-burst-${leafBurstToken}`}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none overflow-visible"
              >
                {pruneLeafParticles.map((particle, index) => (
                  <motion.span
                    key={`${leafBurstToken}-${index}`}
                    initial={{ opacity: 0, x: 0, y: -6, rotate: 0, scale: 0.76 }}
                    animate={{
                      opacity: [0, 0.96, 0.92, 0],
                      x: [0, particle.driftX * 0.38, particle.driftX],
                      y: [0, particle.dropY * 0.4, particle.dropY],
                      rotate: [0, particle.rotate * 0.45, particle.rotate],
                      scale: [0.76, 1.04, 0.82],
                    }}
                    transition={{
                      duration: 1 + index * 0.06,
                      ease: 'easeIn',
                      delay: index * 0.04,
                    }}
                    style={{
                      position: 'absolute',
                      left: particle.left,
                      top: particle.top,
                      width: particle.size,
                      height: particle.size * 0.72,
                      borderRadius: '70% 0 70% 0',
                      background: particle.color,
                      boxShadow: isSociallyAnxious ? '0 0 8px rgba(116, 168, 201, 0.28)' : '0 0 6px rgba(90, 128, 72, 0.18)',
                      filter: 'saturate(1.08)',
                    }}
                  />
                ))}
              </motion.div>
            )}

            {stageBurst && (
              <motion.div
                initial={{ opacity: 0.86, scale: 0.45 }}
                animate={{ opacity: 0, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.78, ease: 'easeOut' }}
                className="absolute inset-[6%] pointer-events-none"
                style={{
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(147,226,255,0.58) 0%, rgba(162,241,212,0.26) 48%, rgba(255,255,255,0) 74%)',
                  filter: 'blur(2px)',
                }}
              />
            )}

            {cooldownHaloToken !== null && (
              <motion.div
                key={`cooldown-halo-${cooldownHaloToken}`}
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: [0.18, 0.5, 0], scale: [0.72, 1.05, 1.24] }}
                exit={{ opacity: 0 }}
                transition={{ duration: TREE_SHAKE_FEEDBACK_MS / 1000, ease: 'easeOut' }}
                className="absolute inset-[10%] pointer-events-none"
                style={{
                  borderRadius: '50%',
                  border: '1.5px solid rgba(236, 255, 184, 0.72)',
                  boxShadow: '0 0 14px rgba(221, 245, 152, 0.34), inset 0 0 18px rgba(255,255,255,0.12)',
                  background: 'radial-gradient(circle, rgba(252,255,214,0.18) 0%, rgba(231,255,176,0.08) 42%, rgba(255,255,255,0) 72%)',
                  top: '4%',
                  bottom: '34%',
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isTyping && (
              <div className="absolute inset-0 pointer-events-none">
                {[0, 1, 2, 3].map((idx) => (
                  <motion.span
                    key={`note-${idx}`}
                    initial={{ opacity: 0, y: 8, x: 0, scale: 0.8 }}
                    animate={{
                      opacity: [0, 0.7, 0],
                      y: [-2 - idx * 2, -20 - idx * 5],
                      x: [0, idx % 2 === 0 ? -6 : 7],
                      scale: [0.8, 1.05, 0.9],
                    }}
                    transition={{ duration: 1.45 + idx * 0.16, repeat: Infinity, delay: idx * 0.18, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      left: `${45 + idx * 3}%`,
                      top: `${10 + idx}%`,
                      color: 'rgba(164, 226, 255, 0.72)',
                      fontSize: 11 + (idx % 2),
                      textShadow: '0 0 8px rgba(123, 208, 255, 0.52)',
                    }}
                  >
                    {idx % 2 === 0 ? '♪' : '♫'}
                  </motion.span>
                ))}
              </div>
            )}
          </AnimatePresence>

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
                src={treeImageSrc}
                alt="planted tree"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                onError={() => setPreferDynamicAsset(false)}
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
                  src={treeImageSrc}
                  alt="planted tree"
                  className="w-full h-full object-contain pointer-events-none"
                  onError={() => setPreferDynamicAsset(false)}
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
              src={treeImageSrc}
              alt="planted tree"
              className="w-full h-full object-contain pointer-events-none"
              onError={() => setPreferDynamicAsset(false)}
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

            {active && (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                animate={{ opacity: [0.56, 0.9, 0.56], scale: [1, 1.08, 1] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  bottom: '-5.5%',
                  width: '68%',
                  height: '13%',
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(127, 223, 255, 0.55) 0%, rgba(116, 187, 255, 0.2) 54%, rgba(116, 187, 255, 0) 78%)',
                  boxShadow: '0 0 22px rgba(124, 206, 255, 0.45)',
                }}
              />
            )}

            {sceneTriggerKind === 'energy' && sceneTriggerToken !== null && (
              <motion.div
                key={`energy-ground-${sceneTriggerToken}`}
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                initial={{ opacity: 0.18, scale: 0.84 }}
                animate={{ opacity: [0.26, 0.72, 0], scale: [0.84, 1.16, 1.28] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.18, ease: 'easeOut' }}
                style={{
                  bottom: '-5%',
                  width: '76%',
                  height: '16%',
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(255, 220, 146, 0.72) 0%, rgba(255, 196, 92, 0.24) 52%, rgba(255, 196, 92, 0) 80%)',
                  boxShadow: '0 0 26px rgba(255, 204, 112, 0.38)',
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
          tag={profile?.tag}
          personality={profile?.personality}
          shapeId={profile?.shape?.id}
          scale={depth.perspectiveScale}
          hovered={effectiveHovered}
          interactionPulseKind={sceneTriggerKind === 'prune' ? 'prune' : null}
          interactionPulseToken={sceneTriggerKind === 'prune' ? sceneTriggerToken : null}
        />

        {/* 树冠对白：当前树完整对话，其他树缩略气泡 */}
        <AnimatePresence>
          {hasActiveBubble && (
            <motion.div
              key={`${agentId}-${active ? 'full' : 'compact'}`}
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{
                opacity: isLatestReplyBubble ? latestReplyBubbleMotion.opacity : [0.42, 1],
                y: isLatestReplyBubble ? latestReplyBubbleMotion.y : [0, -2, 0],
                x: [0, 1.5, 0],
                scale: isLatestReplyBubble ? latestReplyBubbleMotion.scale : [1, 1.02, 1],
              }}
              exit={{ opacity: 0, y: 6, scale: 0.95, filter: 'blur(2px)' }}
              transition={{
                opacity: isLatestReplyBubble
                  ? {
                      duration: latestReplyBubbleMotion.opacityDuration,
                      times: latestReplyBubbleMotion.opacityTimes,
                      ease: 'easeInOut',
                    }
                  : { duration: 0.2, ease: 'easeOut' },
                y: { duration: 1.85, repeat: Infinity, ease: 'easeInOut' },
                x: { duration: 2.1, repeat: Infinity, ease: 'easeInOut' },
                scale: {
                  duration: isLatestReplyBubble ? latestReplyBubbleMotion.scaleDuration : 0.24,
                  ease: 'easeOut',
                },
                filter: { duration: 0.28, ease: 'easeOut' },
              }}
              className="absolute pointer-events-none"
              style={{
                top: isCompactBubble ? '-2%' : '-12%',
                left: '50%',
                transform: `translateX(-50%) scale(${depth.phraseCompensationScale.toFixed(2)})`,
                transformOrigin: 'center bottom',
                zIndex: 26,
              }}
            >
              <motion.div
                animate={memoryRecallActive
                  ? { opacity: [0.3, 1], filter: ['blur(12px)', 'blur(0px)'], scale: [0.96, 1.02, 1] }
                  : { opacity: 1, filter: 'blur(0px)', scale: 1 }}
                transition={memoryRecallActive ? { duration: 0.52, ease: 'easeOut' } : { duration: 0.2 }}
                style={{
                  minWidth: isCompactBubble ? 76 : 148,
                  maxWidth: isCompactBubble ? 112 : (isLatestReplyBubble ? latestReplyBubbleLayout.maxWidth : 220),
                  fontFamily: "'ZCOOL KuaiLe', cursive",
                  fontSize: isCompactBubble ? 10.5 : 12,
                  lineHeight: isCompactBubble ? 1.25 : 1.42,
                  letterSpacing: '0.03em',
                  background: isLatestReplyBubble ? latestReplyBubblePalette.background : 'linear-gradient(160deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.28))',
                  padding: isCompactBubble ? '5px 10px' : '12px',
                  borderRadius: isCompactBubble ? '12px' : '15px',
                  boxShadow: isCompactBubble
                    ? '0 8px 18px rgba(88, 98, 112, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.32), inset 0 -1px 0 rgba(255, 255, 255, 0.12)'
                    : (isLatestReplyBubble ? latestReplyBubblePalette.boxShadow : '0 14px 28px rgba(88, 98, 112, 0.11), inset 0 1px 0 rgba(255, 255, 255, 0.34), inset 0 -1px 0 rgba(255, 255, 255, 0.12)'),
                  color: isLatestReplyBubble ? latestReplyBubblePalette.textColor : '#2D4030',
                  border: isLatestReplyBubble ? latestReplyBubblePalette.border : '1px solid rgba(255, 255, 255, 0.24)',
                  backdropFilter: 'blur(18px) saturate(155%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(155%)',
                  position: 'relative',
                }}
              >
                <motion.div
                  key={crownBubbleText}
                  initial={{ opacity: isLatestReplyBubble ? 0 : 1, y: isLatestReplyBubble ? 2 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: isLatestReplyBubble ? 0.3 : 0.14, ease: 'easeOut' }}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {isLatestReplyBubble ? latestReplyPreviewText : crownBubbleText}
                </motion.div>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: -7,
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: isCompactBubble ? 10 : 12,
                    height: isCompactBubble ? 10 : 12,
                    background: isLatestReplyBubble ? latestReplyBubblePalette.tailBackground : 'linear-gradient(160deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.28))',
                    borderLeft: isLatestReplyBubble ? `1px solid ${latestReplyBubblePalette.tailBorder}` : '1px solid rgba(255, 255, 255, 0.24)',
                    borderBottom: isLatestReplyBubble ? `1px solid ${latestReplyBubblePalette.tailBorder}` : '1px solid rgba(255, 255, 255, 0.24)',
                    backdropFilter: 'blur(18px) saturate(155%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(155%)',
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
