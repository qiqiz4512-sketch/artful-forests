import { useEffect } from 'react';
import { genVirtualInteractions, PERSONA_MATRIX, PersonaKey } from '@/constants/personaMatrix';
import { NarrativeMode, SocialState, SpeakingPace } from '@/types/forest';
import { useForestStore } from '@/stores/useForestStore';
import { getWorldEcologySocialMood, getWorldEcologyZone, inferWorldWidthFromPositions } from '@/lib/worldEcology';
import { RECENT_TOPIC_CONTINUATION_WINDOW_MS, buildRecentTopicContinuation, calculatePartnerCompatibility, classifySocialEvent, generateSocialChat, getRelationType, isDivineTree, resolveMemoryCue } from '@/lib/treeSociety';

const randomIn = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Echo relay: track last message per tree pair (pairKey → {message, time})
const lastConvByPair = new Map<string, { message: string; time: number }>();

// Last-active timestamp per tree for 捞人 mechanic
const lastActiveByTree = new Map<string, number>();
const nextSpeakerReadyAtByTree = new Map<string, number>();

// Per-tree recent messages dedup — 防止同一棵树在不同对话中重复相似内容
const recentMessagesByTree = new Map<string, string[]>();
const RECENT_MSG_WINDOW = 5;
const DIVINE_RECENT_MSG_WINDOW = 8; // 神启树窗口更大，更严格去重

const isMsgNearDuplicate = (speakerId: string, message: string): boolean => {
  const recent = recentMessagesByTree.get(speakerId) ?? [];
  const prefix = Array.from(message).slice(0, 10).join('');
  return recent.some((m) => Array.from(m).slice(0, 10).join('') === prefix);
};

const recordSpeakerMessage = (speakerId: string, message: string, personality?: string) => {
  const window = personality === '神启' ? DIVINE_RECENT_MSG_WINDOW : RECENT_MSG_WINDOW;
  const recent = recentMessagesByTree.get(speakerId) ?? [];
  recent.unshift(message);
  recentMessagesByTree.set(speakerId, recent.slice(0, window));
};

const SILENCE_RESCUE_MS = 90_000; // 90 seconds idle triggers possible rescue
const DIVINE_SURGE_CHAT_MULTIPLIER = 1.9;
const DIVINE_ADORATION_RANGE = 420;
const DIVINE_SURGE_ADORATION_RANGE = 680;
const DIVINE_ADORATION_NEAREST_FALLBACK = 5;
const DIVINE_SURGE_ADORATION_NEAREST_FALLBACK = 8;
const DIVINE_ADORATION_RECENT_ACTIVITY_MS = 60_000;
const DIVINE_ADORATION_RECENT_ACTIVITY_DAMPING = 0.38;
const DIVINE_ADORATION_STRANGER_BOOST = 1.2;
const DIVINE_ADORATION_FAMILIAR_DAMPING = 0.82;
const CHATTERBOX_STARTER_BOOST = 1.95;
const SHY_NEIGHBOR_STARTER_BOOST = 1.28;
const SHY_NEIGHBOR_PLAYFUL_STARTER_BOOST = 1.14;
const SHY_RECEIVER_LIVELY_BOOST = 1.72;
const SHY_RECEIVER_PLAYFUL_BOOST = 1.36;
const SHY_RECEIVER_RECENT_ACTIVITY_MS = 45_000;
const SHY_RECEIVER_RECENT_ACTIVITY_DAMPING = 0.18;
const SHY_RECEIVER_STRANGER_BOOST = 1.18;
const SHY_RECEIVER_WARMUP_BOOST = 1.08;
const SHY_RECEIVER_FAMILIAR_DAMPING = 0.72;
const SHY_RECEIVER_INTIMACY_SOFT_CAP = 65;
// Lively mode: very short gap between rounds, always feels busy.
const A2A_BASE_DELAY_MS = 500;
const A2A_DELAY_JITTER_MS = 1200;
const A2A_TALKING_DURATION_MS = 2200;
const A2A_TALKING_DURATION_DIVINE_MS = 1500;
const PERSONALITY_TALK_RATE: Record<string, number> = {
  活泼: 1.38,
  顽皮: 1.22,
  调皮: 1.22,
  温柔: 0.95,
  睿智: 1,
  社恐: 0.38,
  // 神启树讲究"神谕珍贵"，发言频率低于普通树
  神启: 0.55,
};

const CROSS_ZONE_BRIDGES = [
  '你带来的气息，和这边的风混在一起了。',
  '原来另一片林子的节奏，是这样的。',
  '听起来像远处的天气也在靠近。',
];

const CHAT_SHORT_MIN = 15;
const HIGH_FREQ_EMOJIS = ['🌿', '✨', '💧', '🍂', '🤣', '😭', '🤔', '⚡', '🌈'];

const getA2ADialoguePolicy = (personality: string) => {
  if (personality === '社恐') {
    return { maxLength: 5, fallback: ['嗯。', '好。', '在。', '收到。', '别急。'] };
  }
  if (personality === '活泼' || personality === '调皮' || personality === '顽皮') {
    return { maxLength: 200, fallback: ['我真的有很多想法想一口气告诉你。', '这件事我越说越觉得有意思。'] };
  }
  return { maxLength: 50, fallback: ['我听明白了，我们继续。', '这件事可以慢慢说。'] };
};

const sanitizeA2AMessage = (message?: string | null) => {
  if (typeof message !== 'string') return '';
  return message
    .replace(/\bundefined\b/gi, '')
    .replace(/\bnull\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const currentSeason = (): 'spring' | 'summer' | 'autumn' | 'winter' => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const compactA2AMessage = (message: string, personality: string) => {
  const policy = getA2ADialoguePolicy(personality);
  const trimmed = sanitizeA2AMessage(message);
  const chars = Array.from(trimmed);

  let out = trimmed || randomIn(policy.fallback);
  if (chars.length > policy.maxLength) {
    const sentences = trimmed.match(/[^。！？!?]+[。！？!?]?/g)?.map((entry) => entry.trim()).filter(Boolean) ?? [];
    let picked = '';
    for (const sentence of sentences) {
      if (Array.from(`${picked}${sentence}`).length > policy.maxLength) break;
      picked += sentence;
    }
    out = picked || randomIn(policy.fallback);
  }

  const shouldEmojiBoost = personality === '活泼' || personality === '调皮' || personality === '顽皮' || personality === '神启';
  const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(out);
  if (policy.maxLength > 5 && (shouldEmojiBoost || Math.random() < 0.65) && !hasEmoji) {
    out = `${out}${randomIn(HIGH_FREQ_EMOJIS)}`;
  }

  if (policy.maxLength > 5 && Array.from(out).length < CHAT_SHORT_MIN) {
    out = `${out}${randomIn(HIGH_FREQ_EMOJIS)}`;
  }

  if (Array.from(out).length > policy.maxLength) {
    const sentences = out.match(/[^。！？!?]+[。！？!?]?/g)?.map((entry) => entry.trim()).filter(Boolean) ?? [];
    let picked = '';
    for (const sentence of sentences) {
      if (Array.from(`${picked}${sentence}`).length > policy.maxLength) break;
      picked += sentence;
    }
    out = picked || randomIn(policy.fallback);
  }

  return out;
};

const RELATION_STORY_BEATS: Record<'partner' | 'family' | 'friend' | 'stranger', string[]> = {
  partner: [
    '我们把这句悄悄话，算作今晚的暗号。',
    '这段风声先记下，明天继续说。',
    '你点头的话，我就当是下一章开头。',
  ],
  family: [
    '这话先收好，回头再提醒你一次。',
    '家里的风会记住我们今天这句。',
    '等天亮了，我们把这件事做完。',
  ],
  friend: [
    '下次见面，我们接着这句往下聊。',
    '这段就当朋友之间的小约定。',
    '这句记在树影里，别忘了来认领。',
  ],
  stranger: [
    '先从这句开始，慢慢就熟了。',
    '今天先聊到这，下次我会更敢开口。',
    '我们先交换一阵风，故事以后再写。',
  ],
};

const MEMORY_STORY_BEATS = {
  continuation: ['这事还没讲完。', '我们把刚才那句接住了。'],
  familiar: ['你看，我们已经聊到同一页了。', '原来你还记得这条线索。'],
};

const RELATION_ARC_LINES = {
  partner: {
    early: ['我们先把默契练熟，再谈远一点的梦。', '先并肩一会儿，答案会慢慢出现。'],
    middle: ['我感觉我们正在把同一页写满。', '这阵风像在催我们继续下一段。'],
    deep: ['这一句算誓言，我们都别食言。', '就算夜深，也请把这份靠近留着。'],
  },
  family: {
    early: ['你先照顾好自己，别逞强。', '我会提醒你，把根收稳。'],
    middle: ['这件事我们一起扛，不急。', '今天这句，家里每棵树都会记得。'],
    deep: ['你往前长，我在后面托着。', '不管你走多远，家都会在。'],
  },
  friend: {
    early: ['先当个点头朋友，也很好。', '今天先聊到这，下次继续。'],
    middle: ['我们好像已经有共同笑点了。', '这段友情，正在悄悄升温。'],
    deep: ['这句话你放心交给我保管。', '有你在，很多难题都变轻了。'],
  },
  stranger: {
    early: ['先互相记住名字，故事就会开始。', '不急，熟悉这件事可以慢慢来。'],
    middle: ['我们好像没那么陌生了。', '这阵风，像是替我们搭了一座桥。'],
    deep: ['原来你已经被我划进“熟人”了。', '今天这句，我想留到下次见面。'],
  },
} as const;

const ADORATION_DETECTION_RANGE = 300;

const pickRelationArcBeat = (
  relation: 'partner' | 'family' | 'friend' | 'stranger',
  intimacy: number,
  mode: NarrativeMode,
) => {
  const stage = intimacy >= 82 ? 'deep' : intimacy >= 46 ? 'middle' : 'early';
  const baseChance = mode === 'dramatic' ? 0.56 : 0.34;
  const intimacyBoost = Math.min(0.22, intimacy / 280);
  if (Math.random() > baseChance + intimacyBoost) return null;
  return randomIn(RELATION_ARC_LINES[relation][stage]);
};

const pickStoryBeat = (
  relation: 'partner' | 'family' | 'friend' | 'stranger',
  intimacy: number,
  weather: 'sunny' | 'rain' | 'snow' | 'night',
  mode: NarrativeMode,
  memoryMode?: 'continuation' | 'familiar',
) => {
  const relationBaseChance = relation === 'stranger' ? 0.2 : relation === 'friend' ? 0.32 : 0.38;
  const intimacyBoost = Math.min(0.22, intimacy / 400);
  const weatherBoost = weather === 'night' ? 0.1 : 0;
  const modeBoost = mode === 'dramatic' ? 0.12 : 0;
  if (Math.random() > relationBaseChance + intimacyBoost + weatherBoost + modeBoost) return null;

  const pool = [...RELATION_STORY_BEATS[relation]];
  if (memoryMode) {
    pool.unshift(...MEMORY_STORY_BEATS[memoryMode]);
  }
  return randomIn(pool);
};

const randomWeighted = <T,>(items: T[], getWeight: (item: T) => number): T => {
  const weighted = items.map((item) => ({ item, weight: Math.max(0.01, getWeight(item)) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * total;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.item;
  }
  return weighted[weighted.length - 1].item;
};

const getStarterWeight = (
  agent: { position: { x: number }; personality?: string; metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace } },
  worldWidth: number,
) => {
  const baseWeight = getWorldEcologySocialMood(agent.position.x, worldWidth).conversationWeight;
  const chatterboxBoost = agent.metadata?.chatterbox ? CHATTERBOX_STARTER_BOOST : 1;
  const personalityRate = PERSONALITY_TALK_RATE[agent.personality ?? ''] ?? 1;
  return baseWeight * chatterboxBoost * personalityRate;
};

const isShyTree = (personality?: string) => personality === '社恐';
const isLivelyTree = (personality?: string) => personality === '活泼';
const isPlayfulTree = (personality?: string) => personality === '调皮' || personality === '顽皮';

export const getStarterSelectionWeight = (
  agent: {
    id: string;
    neighbors: string[];
    position: { x: number };
    personality?: string;
    metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace };
    intimacyMap?: Record<string, number>;
    socialCircle?: { family: string[]; partner: string | null };
  },
  idToAgent: Map<string, { id: string; personality?: string; socialState: SocialState }>,
  worldWidth: number,
) => {
  const baseWeight = getStarterWeight(agent, worldWidth);
  const hasIdleShyNeighbor = agent.neighbors.some((neighborId) => {
    const neighbor = idToAgent.get(neighborId);
    if (!neighbor || neighbor.socialState !== SocialState.IDLE || !isShyTree(neighbor.personality)) return false;
    if (agent.socialCircle?.partner === neighborId) return false;
    if (agent.socialCircle?.family.includes(neighborId)) return false;
    return (agent.intimacyMap?.[neighborId] ?? 0) < SHY_RECEIVER_INTIMACY_SOFT_CAP;
  });

  if (!hasIdleShyNeighbor) return baseWeight;
  if (isLivelyTree(agent.personality)) return baseWeight * SHY_NEIGHBOR_STARTER_BOOST;
  if (isPlayfulTree(agent.personality)) return baseWeight * SHY_NEIGHBOR_PLAYFUL_STARTER_BOOST;
  return baseWeight;
};

export const getReceiverSelectionWeight = (
  sender: {
    personality?: string;
    intimacyMap?: Record<string, number>;
    socialCircle?: { friends: string[]; family: string[]; partner: string | null };
  },
  receiver: { id: string; personality?: string; position: { x: number } },
  worldWidth: number,
  now: number,
  lastActiveAt?: number,
) => {
  let weight = getWorldEcologySocialMood(receiver.position.x, worldWidth).conversationWeight;
  const senderTargetsShyMore = isLivelyTree(sender.personality) || isPlayfulTree(sender.personality);

  if (senderTargetsShyMore && isShyTree(receiver.personality)) {
    weight *= isLivelyTree(sender.personality) ? SHY_RECEIVER_LIVELY_BOOST : SHY_RECEIVER_PLAYFUL_BOOST;

    const intimacy = sender.intimacyMap?.[receiver.id] ?? 0;
    const isPartner = sender.socialCircle?.partner === receiver.id;
    const isFamily = sender.socialCircle?.family.includes(receiver.id) ?? false;
    const isFriend = sender.socialCircle?.friends.includes(receiver.id) ?? intimacy >= 65;

    if (isPartner || isFamily) {
      weight *= SHY_RECEIVER_FAMILIAR_DAMPING * 0.7;
    } else if (!isFriend && intimacy < 30) {
      weight *= SHY_RECEIVER_STRANGER_BOOST;
    } else if (!isFriend && intimacy < SHY_RECEIVER_INTIMACY_SOFT_CAP) {
      weight *= SHY_RECEIVER_WARMUP_BOOST;
    } else {
      weight *= SHY_RECEIVER_FAMILIAR_DAMPING;
    }

    if (typeof lastActiveAt === 'number' && now - lastActiveAt < SHY_RECEIVER_RECENT_ACTIVITY_MS) {
      weight *= SHY_RECEIVER_RECENT_ACTIVITY_DAMPING;
    }
  }

  return weight;
};

export const getDivineAdorationCandidateWeight = (
  candidate: {
    id: string;
    personality?: string;
    position: { x: number; y: number };
    intimacyMap?: Record<string, number>;
    socialCircle?: { friends: string[]; family: string[]; partner: string | null };
    metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace };
  },
  manualTree: {
    id: string;
    position: { x: number; y: number };
  },
  worldWidth: number,
  now: number,
  lastActiveAt?: number,
) => {
  const baseWeight = getStarterWeight(candidate, worldWidth);
  const distance = Math.hypot(candidate.position.x - manualTree.position.x, candidate.position.y - manualTree.position.y);
  const range = DIVINE_SURGE_ADORATION_RANGE;
  const distanceBias = 0.45 + Math.max(0.18, 1 - distance / range);
  const candidateZone = getWorldEcologyZone(candidate.position.x, worldWidth).id;
  const manualZone = getWorldEcologyZone(manualTree.position.x, worldWidth).id;
  const sameZoneBoost = candidateZone === manualZone ? 1.14 : 0.96;
  const intimacy = candidate.intimacyMap?.[manualTree.id] ?? 0;
  const isPartner = candidate.socialCircle?.partner === manualTree.id;
  const isFamily = candidate.socialCircle?.family.includes(manualTree.id) ?? false;
  const isFriend = candidate.socialCircle?.friends.includes(manualTree.id) ?? intimacy >= 65;

  let relationBias = 1;
  if (!isFriend && intimacy < 30) relationBias *= DIVINE_ADORATION_STRANGER_BOOST;
  else if (isPartner || isFamily) relationBias *= DIVINE_ADORATION_FAMILIAR_DAMPING * 0.78;
  else if (isFriend) relationBias *= DIVINE_ADORATION_FAMILIAR_DAMPING;

  let weight = baseWeight * distanceBias * sameZoneBoost * relationBias;

  if (typeof lastActiveAt === 'number' && now - lastActiveAt < DIVINE_ADORATION_RECENT_ACTIVITY_MS) {
    weight *= DIVINE_ADORATION_RECENT_ACTIVITY_DAMPING;
  }

  return weight;
};

const resolveSpeakingPace = (agent: { personality?: string; metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace } }): SpeakingPace => {
  if (agent.metadata?.speakingPace) return agent.metadata.speakingPace;
  if (agent.metadata?.chatterbox) return 'chatterbox';
  if (agent.personality === '社恐') return 'shy';
  return 'normal';
};

const pickSpeakerCooldownMs = (agent: { personality?: string; metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace } }) => {
  // 神启树：发言后沉默14-22s，体现"神谕珍贵"
  if (agent.personality === '神启') return 14000 + Math.random() * 8000;
  const pace = resolveSpeakingPace(agent);
  if (pace === 'chatterbox') return 1000 + Math.random() * 500;
  if (pace === 'normal') return 3500 + Math.random() * 2000;
  return 9000 + Math.random() * 6000;
};

const isSpeakerReady = (agent: { id: string }, now: number) => now >= (nextSpeakerReadyAtByTree.get(agent.id) ?? 0);

const markSpeakerSpoken = (
  agent: { id: string; personality?: string; metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace } },
  now: number,
) => {
  nextSpeakerReadyAtByTree.set(agent.id, now + pickSpeakerCooldownMs(agent));
};

export function useAgentA2A() {
  useEffect(() => {
    let mainTimer: number | null = null;
    let resetTimer: number | null = null;
    let recallResetTimer: number | null = null;

    const schedule = () => {
      const state = useForestStore.getState();
      const agents = state.agents;
      const worldWidth = inferWorldWidthFromPositions(agents.map((agent) => agent.position.x));
      const averageWeight =
        agents.length > 0
          ? agents.reduce((sum, agent) => sum + getWorldEcologySocialMood(agent.position.x, worldWidth).conversationWeight, 0) / agents.length
          : 1;
      const divineSurgeActive = Date.now() < state.globalEffects.divineSurgeUntil;
      const interactionBoost = divineSurgeActive ? DIVINE_SURGE_CHAT_MULTIPLIER : 1;
      const delay = (A2A_BASE_DELAY_MS + Math.random() * A2A_DELAY_JITTER_MS) / (averageWeight * interactionBoost);
      mainTimer = window.setTimeout(runConversation, delay);
    };

    const runConversation = () => {
      const store = useForestStore.getState();
      if (Date.now() < store.globalEffects.silenceUntil) {
        schedule();
        return;
      }

      const now = Date.now();

      const agents = store.agents;
      const worldWidth = inferWorldWidthFromPositions(agents.map((agent) => agent.position.x));
      const idToAgent = new Map(agents.map((agent) => [agent.id, agent]));
      const divineSurgeActive = Date.now() < store.globalEffects.divineSurgeUntil;

      let agentA: (typeof agents)[number] | undefined;
      let agentB: (typeof agents)[number] | undefined;

      // 捞人机制: 活泼/调皮 trees try to rescue long-silent trees (~20% chance)
      const canRescue = Math.random() < (divineSurgeActive ? 0.34 : 0.2);
      if (canRescue && agents.length >= 2) {
        const rescuers = agents.filter(
          (a) => (a.personality === '活泼' || a.personality === '调皮') && a.socialState === SocialState.IDLE && isSpeakerReady(a, now),
        );
        const silentCandidates = agents.filter((a) => {
          if (a.socialState !== SocialState.IDLE) return false;
          const lastActive = lastActiveByTree.get(a.id) ?? 0;
          return Date.now() - lastActive > SILENCE_RESCUE_MS;
        });
        if (rescuers.length > 0 && silentCandidates.length > 0) {
          const rescuer = randomIn(rescuers);
          const target = randomIn(silentCandidates.filter((c) => c.id !== rescuer.id));
          if (target) {
            const profile = PERSONA_MATRIX[rescuer.personality as PersonaKey];
            const rescueLine = profile?.rescueLines.length
              ? randomIn(profile.rescueLines).replace('{name}', target.name.replace(/\d+/g, ''))
              : `家人们，${target.name.replace(/\d+/g, '')}好久没说话了，去捞一下 👀`;
            const { likes, comments } = genVirtualInteractions(rescuer.personality);
            store.addChatHistoryEntry({
              speakerId: rescuer.id,
              listenerId: target.id,
              message: rescueLine,
              type: 'chat',
              source: 'auto',
              likes,
              comments,
              isTrending: false,
            });
            lastActiveByTree.set(rescuer.id, Date.now());
            markSpeakerSpoken(rescuer, now);
            schedule();
            return;
          }
        }
      }

      const manualTree = [...agents].reverse().find((agent) => agent.isManual);
      if (manualTree && manualTree.socialState === SocialState.IDLE) {
        const adorationRange = divineSurgeActive ? DIVINE_SURGE_ADORATION_RANGE : DIVINE_ADORATION_RANGE;
        const nearestFallbackCount = divineSurgeActive ? DIVINE_SURGE_ADORATION_NEAREST_FALLBACK : DIVINE_ADORATION_NEAREST_FALLBACK;
        const adorationCandidates = agents
          .filter((agent) => {
            if (agent.id === manualTree.id || agent.isManual) return false;
            if (agent.socialState !== SocialState.IDLE) return false;
            if (!isSpeakerReady(agent, now)) return false;
            return !isDivineTree(agent);
          })
          .map((agent) => ({
            agent,
            distance: Math.hypot(agent.position.x - manualTree.position.x, agent.position.y - manualTree.position.y),
          }))
          .sort((left, right) => left.distance - right.distance)
          .filter((entry, index) => entry.distance <= adorationRange || index < nearestFallbackCount)
          .map((entry) => entry.agent);

        if (adorationCandidates.length > 0) {
          agentA = randomWeighted(
            adorationCandidates,
            (agent) => getDivineAdorationCandidateWeight(agent, manualTree, worldWidth, now, lastActiveByTree.get(agent.id)),
          );
          agentB = manualTree;
        }
      }

      if (!agentA || !agentB) {
        const starters = agents.filter(
          (agent) => agent.socialState === SocialState.IDLE && agent.neighbors.length > 0 && isSpeakerReady(agent, now),
        );

        if (starters.length === 0) {
          schedule();
          return;
        }

        agentA = randomWeighted(
          starters,
          (agent) => getStarterSelectionWeight(agent, idToAgent, worldWidth),
        );
        const possibleReceivers = agentA.neighbors
          .map((id) => idToAgent.get(id))
          .filter(
            (agent): agent is NonNullable<typeof agent> =>
              Boolean(agent) && agent.socialState === SocialState.IDLE,
          );

        if (possibleReceivers.length === 0) {
          schedule();
          return;
        }

        agentB = randomWeighted(
          possibleReceivers,
          (agent) => getReceiverSelectionWeight(agentA, agent, worldWidth, now, lastActiveByTree.get(agent.id)),
        );
      }
      const zoneA = getWorldEcologyZone(agentA.position.x, worldWidth);
      const zoneB = getWorldEcologyZone(agentB.position.x, worldWidth);
      const relation = getRelationType(agentA, agentB);
      const relationGain = relation === 'partner' ? 4 : relation === 'friend' ? 3 : relation === 'family' ? 2 : 1;
      const divinePair = isDivineTree(agentA) || isDivineTree(agentB);
      const conversationWeather = store.globalEffects.conversationWeather;
      const narrativeMode = store.globalEffects.narrativeMode;
      const intimacyBefore = Math.max(agentA.intimacyMap[agentB.id] ?? 0, agentB.intimacyMap[agentA.id] ?? 0);
      const compatibilityBefore = calculatePartnerCompatibility(agentA, agentB, idToAgent, worldWidth).total;

      store.changeIntimacy(agentA.id, agentB.id, relationGain);

      const refreshed = useForestStore.getState();
      const refreshedMap = new Map(refreshed.agents.map((agent) => [agent.id, agent]));
      const nextA = refreshedMap.get(agentA.id) ?? agentA;
      const nextB = refreshedMap.get(agentB.id) ?? agentB;
      const intimacy = nextA.intimacyMap[nextB.id] ?? 0;
      const compatibilityAfter = calculatePartnerCompatibility(nextA, nextB, refreshedMap, worldWidth);

      const canConfess =
        !divinePair
        && compatibilityAfter.eligibleForPartner;

      if (canConfess && nextA.socialCircle.partner !== nextB.id) {
        store.setPartner(nextA.id, nextB.id);
      }

      // Echo relay: retrieve recent same-pair conversation text
      const pairKey = [nextA.id, nextB.id].sort().join('|');
      const recentConv = lastConvByPair.get(pairKey);
      const echoText =
        recentConv && Date.now() - recentConv.time < RECENT_TOPIC_CONTINUATION_WINDOW_MS
          ? recentConv.message
          : undefined;

      const memoryCue = resolveMemoryCue(nextA, nextB);
      const recentTopic = memoryCue?.topic || (echoText ? (nextB.memory.lastTopic || nextA.memory.lastTopic || '森林') : '');
      const shouldPrioritizeRecentTopic = Boolean(
        memoryCue?.mode === 'continuation'
        || (echoText && recentTopic),
      );
      const baseMessage = shouldPrioritizeRecentTopic
        ? buildRecentTopicContinuation(nextA, nextB, {
            topic: recentTopic || '森林',
            echoText,
            intimacy,
          })
        : generateSocialChat(nextA, nextB, {
            weather: conversationWeather,
            season: currentSeason(),
            intimacy,
            echoText,
          });
      const memoryLead = memoryCue ? `${nextB.name}：${memoryCue.line}` : null;
      const maybeFeedback =
        relation !== 'stranger' && Math.random() < (narrativeMode === 'dramatic' ? 0.68 : 0.52)
          ? (() => {
              const profile = PERSONA_MATRIX[nextB.personality as PersonaKey];
              const fbLine = profile
                ? randomIn([...profile.lines].slice(0, 5))
                : undefined;
              return fbLine ? `${nextB.name}：${fbLine}` : null;
            })()
          : null;

      const stitchedMessage = [memoryLead, baseMessage, maybeFeedback].filter(Boolean).join(' ');
      const storyBeat = pickStoryBeat(relation, intimacy, conversationWeather, narrativeMode, memoryCue?.mode);
      const relationArcBeat = pickRelationArcBeat(relation, intimacy, narrativeMode);
      const zoneTail =
        zoneA.id !== zoneB.id
          ? randomIn(CROSS_ZONE_BRIDGES)
          : Math.random() < (narrativeMode === 'dramatic' ? 0.86 : 0.7)
            ? randomIn(getWorldEcologySocialMood(agentA.position.x, worldWidth).phraseTail)
            : null;
      const shySpeaker = nextA.personality === '社恐';
      const composedMessage = shySpeaker
        ? [stitchedMessage, Math.random() < 0.24 ? storyBeat : null].filter(Boolean).join(' ')
        : [stitchedMessage, relationArcBeat, storyBeat, zoneTail].filter(Boolean).join(' ');
      const rawMessage = canConfess
        ? `家人们他问我愿不愿意！！！${stitchedMessage} 😭✨`
        : divinePair
          ? stitchedMessage
          : composedMessage;
      const message = compactA2AMessage(rawMessage, nextA.personality);

      // 去重：若该发言者最近说过相似内容，跳过本轮（不影响其他树继续聊）
      if (isMsgNearDuplicate(nextA.id, message)) {
        schedule();
        return;
      }

      // Update echo relay record
      lastConvByPair.set(pairKey, { message, time: Date.now() });
      recordSpeakerMessage(nextA.id, message, nextA.personality);

      // Update last-active timestamps
      lastActiveByTree.set(nextA.id, Date.now());
      lastActiveByTree.set(nextB.id, Date.now());
      markSpeakerSpoken(nextA, Date.now());

      const { likes, comments } = genVirtualInteractions(nextA.personality);
      const eventClassification = classifySocialEvent({
        likes,
        comments,
        crossZone: zoneA.id !== zoneB.id,
        intimacyBefore,
        intimacyAfter: intimacy,
        compatibilityBefore,
        compatibilityAfter: compatibilityAfter.total,
        hasDivineTree: divinePair,
        hasRecentTopicEcho: shouldPrioritizeRecentTopic,
      });

      if (isDivineTree(nextA) && !isDivineTree(nextB)) {
        store.setGrowthBoostFor(nextB.id, 1.1);
      }

      store.setSocialStateFor([agentA.id, agentB.id], SocialState.TALKING);
      store.setLastWordsFor([agentA.id, agentB.id], message);
      store.recordDialogueMemory(agentA.id, agentB.id, message);
      if (memoryCue) {
        store.setMemoryRecallingFor([agentB.id], 2800);
        if (recallResetTimer !== null) {
          window.clearTimeout(recallResetTimer);
        }
        recallResetTimer = window.setTimeout(() => {
          useForestStore.getState().setMemoryRecallingFor([agentB.id], 0);
          recallResetTimer = null;
        }, 2800);
      }
      store.setActiveChat({
        treeAId: agentA.id,
        treeBId: agentB.id,
        message,
      });
      store.addChatHistoryEntry({
        speakerId: agentA.id,
        listenerId: agentB.id,
        message,
        type: eventClassification.type,
        source: 'auto',
        likes,
        comments,
        isTrending: eventClassification.isTrending,
      });

      const talkingDuration = divineSurgeActive ? A2A_TALKING_DURATION_DIVINE_MS : A2A_TALKING_DURATION_MS;
      resetTimer = window.setTimeout(() => {
        const current = useForestStore.getState();
        current.setSocialStateFor([agentA.id, agentB.id], SocialState.IDLE);
        const active = useForestStore.getState().activeChat;
        if (active && active.treeAId === agentA.id && active.treeBId === agentB.id) {
          useForestStore.getState().setActiveChat(null);
        }
      }, talkingDuration);

      schedule();
    };

    schedule();

    return () => {
      if (mainTimer !== null) window.clearTimeout(mainTimer);
      if (resetTimer !== null) window.clearTimeout(resetTimer);
      if (recallResetTimer !== null) window.clearTimeout(recallResetTimer);
    };
  }, []);
}
