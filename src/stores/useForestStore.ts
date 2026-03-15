import { create } from 'zustand';
import { ActiveChat, AddTreeInput, ChatHistoryEntry, GlobalSocialEffects, NarrativeMode, SceneTreeSnapshot, SocialState, SocialWeather, SpeakingPace, TreeAgent } from '@/types/forest';
import { generateRandomProfile } from '@/lib/agentProfile';
import { getWorldEcologySocialMood, inferWorldWidthFromPositions } from '@/lib/worldEcology';

const CHAT_HISTORY_LIMIT = 120;
const DEFAULT_WORLD_WIDTH = 5000;
const CHATTERBOX_RATIO = 0.4;
const NORMAL_RATIO = 0.45;

interface ForestStoreState {
  agents: TreeAgent[];
  activeChat: ActiveChat | null;
  chatHistory: ChatHistoryEntry[];
  globalEffects: GlobalSocialEffects;
  addTree: (tree: AddTreeInput) => void;
  changeIntimacy: (aId: string, bId: string, delta: number) => void;
  setGrowthBoostFor: (id: string, boost: number) => void;
  setPartner: (aId: string, bId: string | null) => void;
  registerBirthFamily: (childId: string, parentIds: string[]) => void;
  syncAgentsFromScene: (trees: SceneTreeSnapshot[]) => void;
  refreshNeighbors: (radius?: number) => void;
  setSocialStateFor: (ids: string[], state: SocialState) => void;
  setLastWordsFor: (ids: string[], lastWords: string) => void;
  setActiveChat: (chat: ActiveChat | null) => void;
  addChatHistoryEntry: (entry: Omit<ChatHistoryEntry, 'id' | 'createdAt'> & Partial<Pick<ChatHistoryEntry, 'type'>>) => void;
  triggerGlobalSilence: (durationMs: number, message: string, sourceTreeId?: string) => void;
  triggerDivineSurge: (durationMs: number) => void;
  setConversationWeather: (weather: SocialWeather) => void;
  setNarrativeMode: (mode: NarrativeMode) => void;
  recordDialogueMemory: (aId: string, bId: string, message: string, now?: number) => void;
  setMemoryRecallingFor: (ids: string[], durationMs: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const ensureUnique = (items: string[]) => [...new Set(items.filter(Boolean))];
const INTERACTION_MEMORY_LIMIT = 3;

const hashToUnit = (seed: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

const resolveSpeakingPace = (
  metadata: { speakingPace?: SpeakingPace; chatterbox?: boolean },
  seed: string,
): SpeakingPace => {
  if (metadata.speakingPace) return metadata.speakingPace;
  if (metadata.chatterbox) return 'chatterbox';
  const roll = hashToUnit(seed);
  if (roll < CHATTERBOX_RATIO) return 'chatterbox';
  if (roll < CHATTERBOX_RATIO + NORMAL_RATIO) return 'normal';
  return 'shy';
};

const normalizeAgentMetadata = (
  metadata: { bio: string; lastWords: string; chatterbox?: boolean; speakingPace?: SpeakingPace },
  seed: string,
) => {
  const speakingPace = resolveSpeakingPace(metadata, seed);
  return {
    ...metadata,
    speakingPace,
    chatterbox: speakingPace === 'chatterbox' ? true : Boolean(metadata.chatterbox),
  };
};

const createInitialMemory = () => ({
  lastTopic: '',
  interactionHistory: [],
  timestamp: 0,
  recallingUntil: 0,
});

const inferMemoryTopic = (message: string): string => {
  const normalized = message.toLowerCase();
  if (/喝水|口渴|露水|渴/.test(normalized)) return '喝水';
  if (/月亮|晚安|睡|夜/.test(normalized)) return '夜晚';
  if (/阳光|太阳|天气|雨|雪|风/.test(normalized)) return '天气';
  if (/孤独|安静|害羞|紧张/.test(normalized)) return '孤独';
  if (/长大|成长|根|年轮|发芽/.test(normalized)) return '成长';
  return '森林';
};

const createHistoryEntry = (
  input: Omit<ChatHistoryEntry, 'id' | 'createdAt'> & Partial<Pick<ChatHistoryEntry, 'type'>>,
): ChatHistoryEntry => ({
  id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
  speakerId: input.speakerId,
  listenerId: input.listenerId,
  message: input.message,
  createdAt: Date.now(),
  type: input.type ?? 'chat',
  likes: input.likes,
  comments: input.comments,
  isTrending: input.isTrending,
});

const withNeighbors = (agents: TreeAgent[], radius = 200): TreeAgent[] => {
  const worldWidth = inferWorldWidthFromPositions(agents.map((agent) => agent.position.x));
  return agents.map((agent) => {
    const agentRadius = Math.max(
      radius,
      getWorldEcologySocialMood(agent.position.x, worldWidth).neighborRadius,
    );
    const neighbors = agents
      .filter((other) => other.id !== agent.id)
      .filter((other) => {
        if (agent.isManual || other.isManual) return true;
        const dx = other.position.x - agent.position.x;
        const dy = other.position.y - agent.position.y;
        const otherRadius = Math.max(
          radius,
          getWorldEcologySocialMood(other.position.x, worldWidth).neighborRadius,
        );
        const effectiveRadius = Math.max(agentRadius, otherRadius);
        return dx * dx + dy * dy <= effectiveRadius * effectiveRadius;
      })
      .map((other) => other.id);

    return {
      ...agent,
      neighbors,
    };
  });
};

export const useForestStore = create<ForestStoreState>((set, get) => ({
  agents: [],
  activeChat: null,
  chatHistory: [],
  globalEffects: {
    silenceUntil: 0,
    conversationWeather: 'sunny',
    narrativeMode: 'dramatic',
    divineSurgeUntil: 0,
  },
  addTree: (tree) => {
    const nextAgent: TreeAgent = {
      id: tree.id,
      name: tree.name,
      position: tree.position,
      scale: tree.scale,
      zIndex: tree.zIndex,
      personality: tree.personality,
      energy: tree.energy ?? Math.floor(35 + Math.random() * 55),
      socialState: SocialState.IDLE,
      generation: tree.generation ?? 0,
      parents: ensureUnique(tree.parents ?? []),
      socialCircle: {
        friends: ensureUnique(tree.socialCircle?.friends ?? []),
        family: ensureUnique(tree.socialCircle?.family ?? tree.parents ?? []),
        partner: tree.socialCircle?.partner ?? null,
      },
      intimacyMap: tree.intimacyMap ?? {},
      growthBoost: tree.growthBoost ?? 1,
      neighbors: [],
      isManual: Boolean(tree.isManual),
      memory: {
        ...createInitialMemory(),
        ...tree.memory,
        interactionHistory: tree.memory?.interactionHistory ?? [],
      },
      metadata: normalizeAgentMetadata(tree.metadata, tree.id),
      shape: tree.shape,
    };

    set((state) => {
      const existingManualTrees = state.agents.filter((agent) => agent.isManual);
      const initialTargets = nextAgent.isManual ? state.agents : existingManualTrees;

      const seededAgent = {
        ...nextAgent,
        intimacyMap: {
          ...nextAgent.intimacyMap,
          ...Object.fromEntries(initialTargets.map((agent) => [agent.id, 100])),
        },
      };

      const syncedAgents = state.agents.map((agent) => {
        if (!seededAgent.isManual && !agent.isManual) return agent;
        return {
          ...agent,
          intimacyMap: {
            ...agent.intimacyMap,
            [seededAgent.id]: 100,
          },
        };
      });

      return {
        agents: withNeighbors([...syncedAgents, seededAgent]),
      };
    });
  },
  changeIntimacy: (aId, bId, delta) => {
    if (!aId || !bId || aId === bId) return;
    let shouldRecordEpic = false;
    let epicSourceId = '';
    let epicTargetId = '';

    set((state) => {
      const currentA = state.agents.find((agent) => agent.id === aId);
      const currentB = state.agents.find((agent) => agent.id === bId);
      const isManualPair = Boolean(currentA?.isManual || currentB?.isManual);
      if (currentA?.isManual || currentB?.isManual) {
        const source = currentA?.isManual ? currentA : currentB;
        const target = source?.id === aId ? currentB : currentA;
        if (source && target) {
          const alreadyEpic = state.chatHistory.some((entry) =>
            entry.type === 'epic'
            && ((entry.speakerId === source.id && entry.listenerId === target.id)
            || (entry.speakerId === target.id && entry.listenerId === source.id)),
          );
          if (delta > 0 && !alreadyEpic) {
            shouldRecordEpic = true;
            epicSourceId = source.id;
            epicTargetId = target.id;
          }
        }
      }

      const next = state.agents.map((agent) => {
        if (agent.id !== aId && agent.id !== bId) return agent;
        const targetId = agent.id === aId ? bId : aId;
        const current = agent.intimacyMap[targetId] ?? 0;
        const nextIntimacy = isManualPair ? 100 : clamp(current + delta, 0, 100);
        const nextFriends =
          nextIntimacy >= 65
            ? ensureUnique([...agent.socialCircle.friends, targetId])
            : agent.socialCircle.friends.filter((id) => id !== targetId);

        return {
          ...agent,
          intimacyMap: {
            ...agent.intimacyMap,
            [targetId]: nextIntimacy,
          },
          socialCircle: {
            ...agent.socialCircle,
            friends: nextFriends,
          },
        };
      });
      return { agents: next };
    });

    if (shouldRecordEpic) {
      get().addChatHistoryEntry({
        speakerId: epicSourceId,
        listenerId: epicTargetId,
        message: '【森林史诗】神启之树与新的灵魂完成了命运连结。',
        type: 'epic',
      });
    }
  },
  setGrowthBoostFor: (id, boost) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id
          ? {
              ...agent,
              growthBoost: Math.max(agent.growthBoost, boost),
            }
          : agent,
      ),
    }));
  },
  setPartner: (aId, bId) => {
    if (!aId) return;
    set((state) => ({
      agents: state.agents.map((agent) => {
        if (agent.id === aId) {
          return {
            ...agent,
            socialCircle: {
              ...agent.socialCircle,
              partner: bId,
            },
          };
        }
        if (bId && agent.id === bId) {
          return {
            ...agent,
            socialCircle: {
              ...agent.socialCircle,
              partner: aId,
            },
          };
        }
        if (!bId && agent.socialCircle.partner === aId) {
          return {
            ...agent,
            socialCircle: {
              ...agent.socialCircle,
              partner: null,
            },
          };
        }
        return agent;
      }),
    }));
  },
  registerBirthFamily: (childId, parentIds) => {
    const parentSet = new Set(ensureUnique(parentIds));
    if (!childId || parentSet.size === 0) return;

    set((state) => ({
      agents: state.agents.map((agent) => {
        if (agent.id === childId) {
          return {
            ...agent,
            parents: ensureUnique([...agent.parents, ...parentSet]),
            socialCircle: {
              ...agent.socialCircle,
              family: ensureUnique([...agent.socialCircle.family, ...parentSet]),
            },
            intimacyMap: {
              ...agent.intimacyMap,
              ...Object.fromEntries([...parentSet].map((id) => [id, Math.max(agent.intimacyMap[id] ?? 0, 88)])),
            },
          };
        }

        if (parentSet.has(agent.id)) {
          return {
            ...agent,
            socialCircle: {
              ...agent.socialCircle,
              family: ensureUnique([...agent.socialCircle.family, childId, ...[...parentSet].filter((id) => id !== agent.id)]),
            },
            intimacyMap: {
              ...agent.intimacyMap,
              [childId]: Math.max(agent.intimacyMap[childId] ?? 0, 90),
            },
          };
        }

        return agent;
      }),
    }));
  },
  syncAgentsFromScene: (trees) => {
    const prevMap = new Map(get().agents.map((agent) => [agent.id, agent]));
    const inferredWorldWidth = Math.max(
      DEFAULT_WORLD_WIDTH,
      inferWorldWidthFromPositions(trees.map((tree) => tree.x)),
    );

    const nextAgents = trees.map((tree) => {
      const prev = prevMap.get(tree.id);
      const profile = prev
        ? {
            name: prev.name,
            personality: prev.personality,
            metadata: prev.metadata,
          }
        : generateRandomProfile({ x: tree.x, worldWidth: inferredWorldWidth });

      return {
        id: tree.id,
        name: profile.name,
        position: { x: tree.x, y: tree.y + tree.size },
        scale: tree.scale,
        zIndex: tree.zIndex,
        personality: profile.personality,
        energy: prev?.energy ?? Math.floor(35 + Math.random() * 55),
        socialState: prev?.socialState ?? SocialState.IDLE,
        generation: prev?.generation ?? 0,
        parents: prev?.parents ?? [],
        socialCircle: prev?.socialCircle ?? { friends: [], family: [], partner: null },
        intimacyMap: prev?.intimacyMap ?? {},
        growthBoost: prev?.growthBoost ?? 1,
        neighbors: prev?.neighbors ?? [],
        isManual: prev?.isManual ?? false,
        memory: prev?.memory ?? createInitialMemory(),
        metadata: normalizeAgentMetadata(profile.metadata, tree.id),
        shape: prev?.shape,
      } satisfies TreeAgent;
    });

    const sceneIdSet = new Set(trees.map((tree) => tree.id));
    const offSceneAgents = get().agents
      .filter((agent) => !sceneIdSet.has(agent.id))
      .map((agent) => ({
        ...agent,
        metadata: normalizeAgentMetadata(agent.metadata, agent.id),
      }));

    set({ agents: withNeighbors([...nextAgents, ...offSceneAgents]) });
  },
  refreshNeighbors: (radius = 200) => {
    set({ agents: withNeighbors(get().agents, radius) });
  },
  setSocialStateFor: (ids, state) => {
    const idSet = new Set(ids);
    set({
      agents: get().agents.map((agent) =>
        idSet.has(agent.id)
          ? {
              ...agent,
              socialState: state,
              energy:
                state === SocialState.TALKING
                  ? Math.max(0, agent.energy - 2)
                  : Math.min(100, agent.energy + 1),
            }
          : agent,
      ),
    });
  },
  setLastWordsFor: (ids, lastWords) => {
    const idSet = new Set(ids);
    set({
      agents: get().agents.map((agent) =>
        idSet.has(agent.id)
          ? {
              ...agent,
              metadata: {
                ...agent.metadata,
                lastWords,
              },
            }
          : agent,
      ),
    });
  },
  setActiveChat: (chat) => {
    if (!chat) {
      set({ activeChat: null });
      return;
    }

    const entry = createHistoryEntry({
      speakerId: chat.treeAId,
      listenerId: chat.treeBId,
      message: chat.message,
      type: 'chat',
    });

    set((state) => ({
      activeChat: chat,
      chatHistory: [...state.chatHistory, entry].slice(-CHAT_HISTORY_LIMIT),
    }));
  },
  addChatHistoryEntry: (entry) => {
    const next = createHistoryEntry(entry);
    set((state) => ({
      chatHistory: [...state.chatHistory, next].slice(-CHAT_HISTORY_LIMIT),
    }));
  },
  triggerGlobalSilence: (durationMs, message, sourceTreeId) => {
    const until = Date.now() + Math.max(0, durationMs);
    const sourceId = sourceTreeId ?? [...get().agents].reverse().find((agent) => agent.isManual)?.id;
    if (sourceId) {
      get().addChatHistoryEntry({
        speakerId: sourceId,
        listenerId: sourceId,
        message,
        type: 'system',
      });
    }

    set((state) => ({
      globalEffects: {
        ...state.globalEffects,
        silenceUntil: until,
      },
      activeChat: null,
      agents: state.agents.map((agent) =>
        agent.socialState === SocialState.TALKING
          ? {
              ...agent,
              socialState: SocialState.IDLE,
            }
          : agent,
      ),
    }));
  },
  triggerDivineSurge: (durationMs) => {
    const until = Date.now() + Math.max(0, durationMs);
    set((state) => ({
      globalEffects: {
        ...state.globalEffects,
        divineSurgeUntil: until,
      },
    }));
  },
  setConversationWeather: (weather) => {
    set((state) => ({
      globalEffects: {
        ...state.globalEffects,
        conversationWeather: weather,
      },
    }));
  },
  setNarrativeMode: (mode) => {
    set((state) => ({
      globalEffects: {
        ...state.globalEffects,
        narrativeMode: mode,
      },
    }));
  },
  recordDialogueMemory: (aId, bId, message, now = Date.now()) => {
    if (!aId || !bId || aId === bId) return;
    const topic = inferMemoryTopic(message);
    set((state) => ({
      agents: state.agents.map((agent) => {
        if (agent.id !== aId && agent.id !== bId) return agent;
        const targetId = agent.id === aId ? bId : aId;
        const target = state.agents.find((entry) => entry.id === targetId);
        if (!target) return agent;

        const prevHistory = agent.memory?.interactionHistory ?? [];
        const nextHistory = [
          {
            agentId: target.id,
            personalityImpression: target.personality,
            lastTopic: topic,
            timestamp: now,
          },
          ...prevHistory.filter((item) => item.agentId !== target.id),
        ].slice(0, INTERACTION_MEMORY_LIMIT);

        return {
          ...agent,
          memory: {
            ...(agent.memory ?? createInitialMemory()),
            lastTopic: topic,
            interactionHistory: nextHistory,
            timestamp: now,
          },
        };
      }),
    }));
  },
  setMemoryRecallingFor: (ids, durationMs) => {
    const until = Date.now() + Math.max(0, durationMs);
    const idSet = new Set(ids);
    set((state) => ({
      agents: state.agents.map((agent) =>
        idSet.has(agent.id)
          ? {
              ...agent,
              memory: {
                ...(agent.memory ?? createInitialMemory()),
                recallingUntil: until,
              },
            }
          : agent,
      ),
    }));
  },
}));
