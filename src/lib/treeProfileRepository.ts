import { loadSecondMeSession } from '@/lib/secondmeAuth';
import { supabase } from '@/lib/supabase';
import type { ChatHistoryEntry, TreeAgent } from '@/types/forest';

export interface PersistedTreeProfile {
  treeId: string;
  name: string;
  personality: string;
  generation: number;
  energy: number;
  isManual: boolean;
  parents: string[];
  bio: string;
  lastWords: string;
  growthScore: number;
  intimacyMap: Record<string, number>;
  socialCircle: Record<string, unknown>;
  drawingImageData: string | null;
  drawingData: unknown;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface PersistedTreeChatHighlight {
  chatEntryId: string;
  treeId: string;
  partnerTreeId: string | null;
  partnerName: string | null;
  message: string;
  likes: number;
  comments: number;
  source: string | null;
  type: string | null;
  createdAt: number;
}

export interface PersistedTreeRelationshipEvent {
  id: string;
  treeId: string;
  relatedTreeId: string | null;
  eventType: string;
  eventLabel: string;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface PersistedTreeEngagementEvent {
  id: string;
  chatEntryId: string;
  treeId: string;
  relatedTreeId: string | null;
  summary: string;
  likes: number;
  comments: number;
  isTrending: boolean;
  source: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedTreeGrowthEvent {
  id: string;
  treeId: string;
  stage: string;
  growthScore: number;
  summary: string;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface PersistedConversationMessage {
  id: string;
  chatEntryId: string;
  speakerTreeId: string;
  listenerTreeId: string;
  message: string;
  sourceType: 'user' | 'llm' | 'system';
  conversationMode: 'direct' | 'group';
  createdAt: number;
}

const TREE_PROFILES_FUNCTION_NAME = 'secondme-tree-profiles';

type TreeSceneState = {
  renderSize?: number;
  positionX?: number;
  positionY?: number;
  spawnType?: string;
};

type TreeProfilesFunctionEnvelope<T> = {
  data: T;
  error?: string;
  message?: string;
};

const getCurrentSecondMeAccessToken = (): string | null => {
  const token = loadSecondMeSession()?.accessToken?.trim();
  return token ? token : null;
};

const invokeTreeProfilesFunction = async <T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T | null> => {
  const accessToken = getCurrentSecondMeAccessToken();
  if (!accessToken) {
    console.warn(`[treeProfileRepository] Skipping ${action}: no SecondMe access token (session missing or expired). Data saved to localStorage as fallback.`);
    return null;
  }

  const { data, error } = await supabase.functions.invoke(TREE_PROFILES_FUNCTION_NAME, {
    body: {
      action,
      payload,
    },
    headers: {
      'x-secondme-access-token': accessToken,
    },
  });

  if (error) {
    console.warn(`[${action}] invoke failed:`, error.message);
    return null;
  }

  const envelope = data as TreeProfilesFunctionEnvelope<T> | null;
  if (envelope && typeof envelope === 'object' && 'error' in envelope && envelope.error) {
    console.warn(`[${action}] edge function failed:`, envelope.message ?? envelope.error);
    return null;
  }

  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.data;
  }

  return (data ?? null) as T | null;
};

const toProfilePayload = (agent: TreeAgent, sceneState?: TreeSceneState) => ({
  tree_id: agent.id,
  name: agent.name,
  personality: agent.personality,
  generation: agent.generation,
  energy: agent.energy,
  is_manual: agent.isManual,
  parents: agent.parents,
  bio: agent.metadata.bio,
  last_words: agent.metadata.lastWords,
  growth_score: agent.growthScore,
  intimacy_map: agent.intimacyMap,
  social_circle: agent.socialCircle,
  drawing_image_data: agent.metadata.drawingImageData ?? null,
  drawing_data: agent.metadata.drawingData ?? null,
  metadata: {
    ...agent.metadata,
    tag: agent.tag ?? null,
    sceneState: sceneState ?? (agent.metadata as Record<string, unknown>).sceneState ?? null,
  },
});

const mapProfileRow = (data: any): PersistedTreeProfile => ({
  treeId: data.tree_id,
  name: data.name,
  personality: data.personality,
  generation: data.generation,
  energy: data.energy,
  isManual: data.is_manual,
  parents: Array.isArray(data.parents) ? (data.parents as string[]) : [],
  bio: data.bio ?? '',
  lastWords: data.last_words ?? '',
  growthScore: Number(data.growth_score ?? 0),
  intimacyMap: (data.intimacy_map ?? {}) as Record<string, number>,
  socialCircle: (data.social_circle ?? {}) as Record<string, unknown>,
  drawingImageData: data.drawing_image_data,
  drawingData: data.drawing_data,
  metadata: (data.metadata ?? {}) as Record<string, unknown>,
  updatedAt: data.updated_at,
});

export const upsertTreeProfile = async (
  agent: TreeAgent,
  options?: { sceneState?: TreeSceneState },
): Promise<void> => {
  await invokeTreeProfilesFunction<boolean>('upsertTreeProfile', toProfilePayload(agent, options?.sceneState));
};

export const fetchTreeProfile = async (treeId: string): Promise<PersistedTreeProfile | null> => {
  const data = await invokeTreeProfilesFunction<any>('fetchTreeProfile', { treeId });
  if (!data) return null;
  return mapProfileRow(data);
};

export const fetchAllTreeProfiles = async (): Promise<PersistedTreeProfile[]> => {
  const data = await invokeTreeProfilesFunction<any[]>('fetchAllTreeProfiles');
  return (data ?? []).map((row) => mapProfileRow(row));
};

export const saveTreeChatHighlight = async (entry: ChatHistoryEntry, partnerName?: string): Promise<void> => {
  const payload = {
    chat_entry_id: entry.id,
    tree_id: entry.speakerId,
    partner_tree_id: entry.listenerId,
    partner_name: partnerName ?? null,
    message: entry.message,
    likes: entry.likes ?? 0,
    comments: entry.comments ?? 0,
    source: entry.source ?? null,
    type: entry.type ?? null,
    created_at: new Date(entry.createdAt).toISOString(),
  };

  await invokeTreeProfilesFunction<boolean>('saveTreeChatHighlight', payload);
};

export const saveConversationMessage = async (input: {
  chatEntryId: string;
  speakerTreeId: string;
  listenerTreeId: string;
  message: string;
  sourceType: 'user' | 'llm' | 'system';
  conversationMode?: 'direct' | 'group';
  createdAt?: number;
}): Promise<void> => {
  const payload = {
    chat_entry_id: input.chatEntryId,
    speaker_tree_id: input.speakerTreeId,
    listener_tree_id: input.listenerTreeId,
    message: input.message,
    source_type: input.sourceType,
    conversation_mode: input.conversationMode ?? 'direct',
    created_at: new Date(input.createdAt ?? Date.now()).toISOString(),
  };

  await invokeTreeProfilesFunction<boolean>('saveConversationMessage', payload);
};

export const fetchRecentConversationMessages = async (
  limit = 30,
  sourceType?: 'user' | 'llm' | 'system',
): Promise<PersistedConversationMessage[]> => {
  const data = await invokeTreeProfilesFunction<any[]>('fetchRecentConversationMessages', {
    limit,
    sourceType,
  });
  return (data ?? []).map((row) => ({
    id: row.id,
    chatEntryId: row.chat_entry_id,
    speakerTreeId: row.speaker_tree_id,
    listenerTreeId: row.listener_tree_id,
    message: row.message,
    sourceType: row.source_type,
    conversationMode: row.conversation_mode,
    createdAt: new Date(row.created_at).getTime(),
  }));
};

export const fetchTreeChatHighlights = async (
  treeId: string,
  limit = 30,
): Promise<PersistedTreeChatHighlight[]> => {
  const data = await invokeTreeProfilesFunction<any[]>('fetchTreeChatHighlights', {
    treeId,
    limit,
  });
  return (data ?? []).map((row) => ({
    chatEntryId: row.chat_entry_id,
    treeId: row.tree_id,
    partnerTreeId: row.partner_tree_id,
    partnerName: row.partner_name,
    message: row.message,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    source: row.source,
    type: row.type,
    createdAt: new Date(row.created_at).getTime(),
  }));
};

export const saveRelationshipEvent = async (input: {
  treeId: string;
  relatedTreeId?: string | null;
  eventType: string;
  eventLabel: string;
  detail?: Record<string, unknown>;
  createdAt?: number;
}): Promise<void> => {
  const payload = {
    tree_id: input.treeId,
    related_tree_id: input.relatedTreeId ?? null,
    event_type: input.eventType,
    event_label: input.eventLabel,
    detail: input.detail ?? {},
    created_at: new Date(input.createdAt ?? Date.now()).toISOString(),
  };

  await invokeTreeProfilesFunction<boolean>('saveRelationshipEvent', payload);
};

export const fetchTreeRelationshipEvents = async (
  treeId: string,
  limit = 30,
): Promise<PersistedTreeRelationshipEvent[]> => {
  const data = await invokeTreeProfilesFunction<any[]>('fetchTreeRelationshipEvents', {
    treeId,
    limit,
  });
  return (data ?? []).map((row) => ({
    id: row.id,
    treeId: row.tree_id,
    relatedTreeId: row.related_tree_id,
    eventType: row.event_type,
    eventLabel: row.event_label,
    detail: (row.detail ?? {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at).getTime(),
  }));
};

export const upsertTreeEngagementEvent = async (entry: ChatHistoryEntry): Promise<void> => {
  const summaryBase = entry.message.trim();
  const summary = summaryBase.length > 56 ? `${summaryBase.slice(0, 56)}…` : summaryBase;

  const payload = {
    chat_entry_id: entry.id,
    tree_id: entry.speakerId,
    related_tree_id: entry.listenerId,
    summary,
    likes: entry.likes ?? 0,
    comments: entry.comments ?? 0,
    is_trending: Boolean(entry.isTrending),
    source: entry.source ?? null,
    created_at: new Date(entry.createdAt).toISOString(),
  };

  await invokeTreeProfilesFunction<boolean>('upsertTreeEngagementEvent', payload);
};

export const fetchTreeEngagementEvents = async (
  treeId: string,
  limit = 30,
): Promise<PersistedTreeEngagementEvent[]> => {
  const data = await invokeTreeProfilesFunction<any[]>('fetchTreeEngagementEvents', {
    treeId,
    limit,
  });
  return (data ?? []).map((row) => ({
    id: row.id,
    chatEntryId: row.chat_entry_id,
    treeId: row.tree_id,
    relatedTreeId: row.related_tree_id,
    summary: row.summary,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    isTrending: Boolean(row.is_trending),
    source: row.source,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }));
};

export const saveTreeGrowthEvent = async (input: {
  treeId: string;
  stage: string;
  growthScore: number;
  summary: string;
  detail?: Record<string, unknown>;
  createdAt?: number;
}): Promise<void> => {
  const payload = {
    tree_id: input.treeId,
    stage: input.stage,
    growth_score: input.growthScore,
    summary: input.summary,
    detail: input.detail ?? {},
    created_at: new Date(input.createdAt ?? Date.now()).toISOString(),
  };

  await invokeTreeProfilesFunction<boolean>('saveTreeGrowthEvent', payload);
};

export const fetchTreeGrowthEvents = async (
  treeId: string,
  limit = 30,
): Promise<PersistedTreeGrowthEvent[]> => {
  const data = await invokeTreeProfilesFunction<any[]>('fetchTreeGrowthEvents', {
    treeId,
    limit,
  });
  return (data ?? []).map((row) => ({
    id: row.id,
    treeId: row.tree_id,
    stage: row.stage,
    growthScore: Number(row.growth_score ?? 0),
    summary: row.summary,
    detail: (row.detail ?? {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at).getTime(),
  }));
};
