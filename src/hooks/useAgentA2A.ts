import { useEffect } from 'react';
import { genVirtualInteractions, PERSONA_MATRIX, PersonaKey } from '@/constants/personaMatrix';
import { NarrativeMode, SocialState, SpeakingPace } from '@/types/forest';
import { useForestStore } from '@/stores/useForestStore';
import { getWorldEcologySocialMood, getWorldEcologyZone, inferWorldWidthFromPositions } from '@/lib/worldEcology';
import { areBloodRelated, generateSocialChat, getRelationType, isAdult, isDivineTree, resolveMemoryCue } from '@/lib/treeSociety';

const randomIn = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Echo relay: track last message per tree pair (pairKey → {message, time})
const lastConvByPair = new Map<string, { message: string; time: number }>();

// Last-active timestamp per tree for 捞人 mechanic
const lastActiveByTree = new Map<string, number>();
const nextSpeakerReadyAtByTree = new Map<string, number>();

const SILENCE_RESCUE_MS = 3 * 60 * 1000; // 3 minutes idle triggers possible rescue
const DIVINE_SURGE_CHAT_MULTIPLIER = 1.9;
const DIVINE_SURGE_ADORATION_RANGE = 560;
const CHATTERBOX_STARTER_BOOST = 1.95;
// Default to carnival mode: faster chat cadence and quicker turn-taking.
const A2A_BASE_DELAY_MS = 2200;
const A2A_DELAY_JITTER_MS = 4200;
const A2A_TALKING_DURATION_MS = 2800;
const A2A_TALKING_DURATION_DIVINE_MS = 1900;
const PERSONALITY_TALK_RATE: Record<string, number> = {
  活泼: 1.38,
  顽皮: 1.22,
  调皮: 1.22,
  温柔: 0.95,
  睿智: 1,
  社恐: 0.38,
  神启: 1.15,
};

const CROSS_ZONE_BRIDGES = [
  '你带来的气息，和这边的风混在一起了。',
  '原来另一片林子的节奏，是这样的。',
  '听起来像远处的天气也在靠近。',
];

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

const resolveSpeakingPace = (agent: { personality?: string; metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace } }): SpeakingPace => {
  if (agent.metadata?.speakingPace) return agent.metadata.speakingPace;
  if (agent.metadata?.chatterbox) return 'chatterbox';
  if (agent.personality === '社恐') return 'shy';
  return 'normal';
};

const pickSpeakerCooldownMs = (agent: { personality?: string; metadata?: { chatterbox?: boolean; speakingPace?: SpeakingPace } }) => {
  const pace = resolveSpeakingPace(agent);
  if (pace === 'chatterbox') return 2000 + Math.random() * 1000;
  if (pace === 'normal') return 10000 + Math.random() * 5000;
  return 22000 + Math.random() * 18000;
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
        const adorationRange = divineSurgeActive ? DIVINE_SURGE_ADORATION_RANGE : ADORATION_DETECTION_RANGE;
        const adorationCandidates = agents.filter((agent) => {
          if (agent.id === manualTree.id || agent.isManual) return false;
          if (agent.socialState !== SocialState.IDLE) return false;
          if (!isSpeakerReady(agent, now)) return false;
          const distance = Math.hypot(agent.position.x - manualTree.position.x, agent.position.y - manualTree.position.y);
          return distance <= adorationRange;
        });

        if (adorationCandidates.length > 0) {
          agentA = randomWeighted(
            adorationCandidates,
            (agent) => getStarterWeight(agent, worldWidth),
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
          (agent) => getStarterWeight(agent, worldWidth),
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
          (agent) => getWorldEcologySocialMood(agent.position.x, worldWidth).conversationWeight,
        );
      }
      const zoneA = getWorldEcologyZone(agentA.position.x, worldWidth);
      const zoneB = getWorldEcologyZone(agentB.position.x, worldWidth);
      const relation = getRelationType(agentA, agentB);
      const relationGain = relation === 'partner' ? 4 : relation === 'friend' ? 3 : relation === 'family' ? 2 : 1;
      const divinePair = isDivineTree(agentA) || isDivineTree(agentB);
      const conversationWeather = store.globalEffects.conversationWeather;
      const narrativeMode = store.globalEffects.narrativeMode;

      store.changeIntimacy(agentA.id, agentB.id, relationGain);

      const refreshed = useForestStore.getState();
      const refreshedMap = new Map(refreshed.agents.map((agent) => [agent.id, agent]));
      const nextA = refreshedMap.get(agentA.id) ?? agentA;
      const nextB = refreshedMap.get(agentB.id) ?? agentB;
      const intimacy = nextA.intimacyMap[nextB.id] ?? 0;

      const canConfess =
        !divinePair
        &&
        intimacy >= 90
        && isAdult(nextA)
        && isAdult(nextB)
        && !areBloodRelated(nextA, nextB, refreshedMap)
        && (!nextA.socialCircle.partner || nextA.socialCircle.partner === nextB.id)
        && (!nextB.socialCircle.partner || nextB.socialCircle.partner === nextA.id);

      if (canConfess && nextA.socialCircle.partner !== nextB.id) {
        store.setPartner(nextA.id, nextB.id);
      }

      // Echo relay: retrieve recent same-pair conversation text
      const pairKey = [nextA.id, nextB.id].sort().join('|');
      const recentConv = lastConvByPair.get(pairKey);
      const echoText =
        recentConv && Date.now() - recentConv.time < 5 * 60 * 1000
          ? recentConv.message
          : undefined;

      const baseMessage = generateSocialChat(nextA, nextB, {
        weather: conversationWeather,
        intimacy,
        echoText,
      });

      const memoryCue = resolveMemoryCue(nextA, nextB);
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
      const message = canConfess
        ? `家人们他问我愿不愿意！！！${stitchedMessage} 😭✨`
        : divinePair
          ? stitchedMessage
          : composedMessage;

      // Update echo relay record
      lastConvByPair.set(pairKey, { message, time: Date.now() });

      // Update last-active timestamps
      lastActiveByTree.set(nextA.id, Date.now());
      lastActiveByTree.set(nextB.id, Date.now());
      markSpeakerSpoken(nextA, Date.now());

      // Trending: manual tree conversations get the trending badge
      const isTrending = nextA.isManual || nextB.isManual;
      const { likes, comments } = genVirtualInteractions(nextA.personality);

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
        type: divinePair ? 'epic' : 'chat',
        likes,
        comments,
        isTrending,
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
