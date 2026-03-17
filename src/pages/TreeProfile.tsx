import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForestStore } from '@/stores/useForestStore';
import PersonalityRadar from '@/components/PersonalityRadar';
import FamilyTree from '@/components/FamilyTree';
import { fetchAllTreeProfiles, fetchTreeChatHighlights, fetchTreeEngagementEvents, fetchTreeGrowthEvents, fetchTreeProfile, fetchTreeRelationshipEvents, type PersistedTreeChatHighlight, type PersistedTreeEngagementEvent, type PersistedTreeGrowthEvent, type PersistedTreeProfile, type PersistedTreeRelationshipEvent } from '@/lib/treeProfileRepository';
import type { TreeAgent } from '@/types/forest';

interface ChatLog {
  partnerName: string;
  partnerPersonality?: string;
  message: string;
  likes: number;
  timestamp: number;
}

interface BiographyEvent {
  id: string;
  category: 'profile' | 'relationship' | 'growth' | 'engagement' | 'highlight';
  icon: string;
  title: string;
  description: string;
  timestamp: number;
  accentColor: string;
  chips: string[];
}

export default function TreeProfile() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();

  const agents = useForestStore((state) => state.agents);
  const chatHistory = useForestStore((state) => state.chatHistory);
  const [remoteProfile, setRemoteProfile] = useState<PersistedTreeProfile | null>(null);
  const [remoteHighlights, setRemoteHighlights] = useState<PersistedTreeChatHighlight[]>([]);
  const [remoteFamilyProfiles, setRemoteFamilyProfiles] = useState<PersistedTreeProfile[]>([]);
  const [remoteRelationshipEvents, setRemoteRelationshipEvents] = useState<PersistedTreeRelationshipEvent[]>([]);
  const [remoteEngagementEvents, setRemoteEngagementEvents] = useState<PersistedTreeEngagementEvent[]>([]);
  const [remoteGrowthEvents, setRemoteGrowthEvents] = useState<PersistedTreeGrowthEvent[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  const localAgent = useMemo(() => agents.find((a) => a.id === treeId), [agents, treeId]);

  useEffect(() => {
    if (!treeId) return;
    let mounted = true;

    const loadRemote = async () => {
      setLoadingRemote(true);
      const [profile, highlights, familyProfiles, relationshipEvents, engagementEvents, growthEvents] = await Promise.all([
        fetchTreeProfile(treeId),
        fetchTreeChatHighlights(treeId, 30),
        fetchAllTreeProfiles(),
        fetchTreeRelationshipEvents(treeId, 30),
        fetchTreeEngagementEvents(treeId, 30),
        fetchTreeGrowthEvents(treeId, 30),
      ]);
      if (!mounted) return;
      setRemoteProfile(profile);
      setRemoteHighlights(highlights);
      setRemoteFamilyProfiles(familyProfiles);
      setRemoteRelationshipEvents(relationshipEvents);
      setRemoteEngagementEvents(engagementEvents);
      setRemoteGrowthEvents(growthEvents);
      setLoadingRemote(false);
    };

    void loadRemote();
    return () => {
      mounted = false;
    };
  }, [treeId]);

  const agent = useMemo(() => {
    if (localAgent) return localAgent;
    if (!remoteProfile || !treeId) return null;
    return {
      id: treeId,
      name: remoteProfile.name,
      personality: remoteProfile.personality,
      energy: remoteProfile.energy,
      generation: remoteProfile.generation,
      isManual: remoteProfile.isManual,
      parents: remoteProfile.parents,
      growthScore: remoteProfile.growthScore,
      intimacyMap: remoteProfile.intimacyMap,
      metadata: {
        bio: remoteProfile.bio,
        lastWords: remoteProfile.lastWords,
        ...(remoteProfile.metadata ?? {}),
      },
      position: { x: 0, y: 0 },
      scale: 1,
      zIndex: 0,
      socialState: 'IDLE',
      socialCircle: {
        friends: Array.isArray((remoteProfile.socialCircle as { friends?: string[] }).friends)
          ? ((remoteProfile.socialCircle as { friends?: string[] }).friends ?? [])
          : [],
        family: Array.isArray((remoteProfile.socialCircle as { family?: string[] }).family)
          ? ((remoteProfile.socialCircle as { family?: string[] }).family ?? [])
          : [],
        partner: typeof (remoteProfile.socialCircle as { partner?: string | null }).partner === 'string'
          ? (remoteProfile.socialCircle as { partner?: string | null }).partner ?? null
          : null,
      },
      neighbors: [],
      memory: { lastTopic: '', interactionHistory: [], timestamp: 0, recallingUntil: 0 },
    } as unknown as TreeAgent;
  }, [localAgent, remoteProfile, treeId]);

  const fallbackFamilyAgents = useMemo(() => {
    if (remoteFamilyProfiles.length === 0) return [];
    return remoteFamilyProfiles.map((profile) => ({
      id: profile.treeId,
      name: profile.name,
      personality: profile.personality,
      energy: profile.energy,
      generation: profile.generation,
      isManual: profile.isManual,
      parents: profile.parents,
      growthScore: profile.growthScore,
      intimacyMap: profile.intimacyMap,
      metadata: {
        bio: profile.bio,
        lastWords: profile.lastWords,
        ...(profile.metadata ?? {}),
      },
      position: { x: 0, y: 0 },
      scale: 1,
      zIndex: 0,
      socialState: 'IDLE',
      socialCircle: {
        friends: Array.isArray((profile.socialCircle as { friends?: string[] }).friends)
          ? ((profile.socialCircle as { friends?: string[] }).friends ?? [])
          : [],
        family: Array.isArray((profile.socialCircle as { family?: string[] }).family)
          ? ((profile.socialCircle as { family?: string[] }).family ?? [])
          : [],
        partner: typeof (profile.socialCircle as { partner?: string | null }).partner === 'string'
          ? (profile.socialCircle as { partner?: string | null }).partner ?? null
          : null,
      },
      neighbors: [],
      memory: { lastTopic: '', interactionHistory: [], timestamp: 0, recallingUntil: 0 },
    } as unknown as TreeAgent));
  }, [remoteFamilyProfiles]);

  const chatLogs = useMemo(() => {
    if (!agent) return [];

    const localLogs: ChatLog[] = chatHistory
      .filter((entry) => entry.speakerId === agent.id)
      .map((entry) => {
        const partner = agents.find((a) => a.id === entry.listenerId);
        return {
          partnerName: partner?.name ?? '未知树友',
          partnerPersonality: partner?.personality,
          message: entry.message,
          likes: entry.likes || 0,
          timestamp: entry.createdAt,
        };
      });

    if (localLogs.length > 0) {
      return localLogs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
    }

    return remoteHighlights.map((entry) => ({
      partnerName: entry.partnerName ?? '未知树友',
      partnerPersonality: undefined,
      message: entry.message,
      likes: entry.likes,
      timestamp: entry.createdAt,
    }));
  }, [agent, chatHistory, agents, remoteHighlights]);

  const stats = useMemo(() => {
    if (!agent) return { totalLikes: 0, totalChats: 0, totalLove: 0 };

    const localLikes = chatHistory
      .filter((e) => e.speakerId === agent.id)
      .reduce((sum, e) => sum + (e.likes || 0), 0);
    const remoteLikes = remoteEngagementEvents.length > 0
      ? remoteEngagementEvents.reduce((sum, item) => sum + (item.likes ?? 0), 0)
      : remoteHighlights.reduce((sum, item) => sum + (item.likes ?? 0), 0);

    const localChats = chatHistory.filter((e) => e.speakerId === agent.id).length;
    const remoteChats = remoteHighlights.length;

    const totalLikes = localLikes > 0 ? localLikes : remoteLikes;
    const totalChats = localChats > 0 ? localChats : remoteChats;

    const totalLove = Math.round(
      Object.values(agent.intimacyMap).reduce((sum, val) => sum + val, 0) / 10,
    );

    return { totalLikes, totalChats, totalLove };
  }, [agent, chatHistory, remoteEngagementEvents, remoteHighlights]);

  const biographyEvents = useMemo<BiographyEvent[]>(() => {
    if (!agent) return [];

    const relationshipEvents = remoteRelationshipEvents.map((event) => {
      const detailName = typeof event.detail.friendName === 'string'
        ? event.detail.friendName
        : typeof event.detail.partnerName === 'string'
          ? event.detail.partnerName
          : typeof event.detail.parentName === 'string'
            ? event.detail.parentName
            : typeof event.detail.relatedName === 'string'
              ? event.detail.relatedName
              : null;
      const intimacy = typeof event.detail.intimacy === 'number'
        ? `亲密度 ${Math.round(event.detail.intimacy)}%`
        : null;

      return {
        id: `relationship-${event.id}`,
        category: 'relationship' as const,
        icon: '🕰️',
        title: event.eventLabel,
        description: detailName ? `关联对象：${detailName}` : '森林社交关系发生变化',
        timestamp: event.createdAt,
        accentColor: 'rgba(119, 190, 146, 0.9)',
        chips: [event.eventType, intimacy].filter(Boolean) as string[],
      };
    });

    const growthEvents = remoteGrowthEvents.map((event) => {
      const stageLabel = typeof event.detail.stageLabel === 'string' ? event.detail.stageLabel : event.stage;
      const previousStage = typeof event.detail.previousStageLabel === 'string'
        ? event.detail.previousStageLabel
        : typeof event.detail.previousStage === 'string'
          ? event.detail.previousStage
          : null;

      return {
        id: `growth-${event.id}`,
        category: 'growth' as const,
        icon: '🌱',
        title: event.summary,
        description: previousStage
          ? `从 ${previousStage} 进化到 ${stageLabel}`
          : `成长阶段来到 ${stageLabel}`,
        timestamp: event.createdAt,
        accentColor: 'rgba(132, 219, 141, 0.95)',
        chips: [stageLabel, `成长 ${Math.round(event.growthScore)}`],
      };
    });

    const engagementEvents = remoteEngagementEvents.map((event) => ({
      id: `engagement-${event.id}`,
      category: 'engagement' as const,
      icon: event.isTrending ? '🔥' : '✨',
      title: event.isTrending ? '热度飙升' : '互动沉淀',
      description: event.summary,
      timestamp: event.createdAt,
      accentColor: event.isTrending ? 'rgba(255, 136, 88, 0.92)' : 'rgba(140, 177, 255, 0.92)',
      chips: [
        `👍 ${event.likes}`,
        `💬 ${event.comments}`,
        event.isTrending ? '热搜' : null,
        event.source ? `来源 ${event.source}` : null,
      ].filter(Boolean) as string[],
    }));

    const highlightEvents = remoteHighlights.length > 0
      ? remoteHighlights.map((entry) => ({
          id: `highlight-${entry.chatEntryId}`,
          category: 'highlight' as const,
          icon: '💬',
          title: entry.partnerName ? `与 ${entry.partnerName} 的一段对话` : '一段被收藏的对话',
          description: entry.message,
          timestamp: entry.createdAt,
          accentColor: 'rgba(111, 169, 137, 0.88)',
          chips: [
            `👍 ${entry.likes}`,
            `💬 ${entry.comments}`,
            entry.type ? `类型 ${entry.type}` : null,
          ].filter(Boolean) as string[],
        }))
      : chatLogs.map((log, index) => ({
          id: `highlight-local-${index}-${log.timestamp}`,
          category: 'highlight' as const,
          icon: '💬',
          title: `与 ${log.partnerName} 的一段对话`,
          description: log.message,
          timestamp: log.timestamp,
          accentColor: 'rgba(111, 169, 137, 0.88)',
          chips: [`👍 ${log.likes}`, '本地会话'],
        }));

    const profileEvent: BiographyEvent[] = remoteProfile
      ? [{
          id: `profile-${remoteProfile.treeId}`,
          category: 'profile',
          icon: '🌲',
          title: '档案快照已归档',
          description: remoteProfile.bio || `${remoteProfile.name} 的森林档案已同步到世界观档案馆`,
          timestamp: new Date(remoteProfile.updatedAt).getTime(),
          accentColor: 'rgba(122, 169, 141, 0.86)',
          chips: [remoteProfile.personality, `第 ${remoteProfile.generation} 代`],
        }]
      : [];

    return [
      ...relationshipEvents,
      ...growthEvents,
      ...engagementEvents,
      ...highlightEvents,
      ...profileEvent,
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 40);
  }, [agent, chatLogs, remoteEngagementEvents, remoteGrowthEvents, remoteHighlights, remoteProfile, remoteRelationshipEvents]);

  if (!agent) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafaf8',
          fontSize: 16,
          color: 'rgba(100, 140, 130, 0.7)',
          fontFamily: 'var(--font-handwritten)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌲</div>
          <div>{loadingRemote ? '正在载入档案...' : '树木未找到...'}</div>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              background: '#81c784',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'var(--font-handwritten)',
              fontWeight: 600,
            }}
          >
            返回森林
          </button>
        </div>
      </div>
    );
  }

  const PERSONALITY_COLORS: Record<string, string> = {
    温柔: '#E7849B',
    睿智: '#5D91A6',
    顽皮: '#D98958',
    活泼: '#A5962D',
    社恐: '#8A8A8A',
    神启: '#D4A72C',
  };

  const PERSONALITY_SYMBOL: Record<string, string> = {
    温柔: '♥',
    睿智: '✦',
    顽皮: '♪',
    活泼: '✿',
    社恐: '◦',
    神启: '⚡',
  };

  const color = PERSONALITY_COLORS[agent.personality] || '#7aa98d';
  const symbol = PERSONALITY_SYMBOL[agent.personality] || '·';

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      {/* 顶部导航 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          background: 'white',
          borderBottom: '1px solid rgba(100, 140, 130, 0.1)',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: 'rgba(100, 140, 130, 0.1)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(45, 62, 53, 0.9)', fontFamily: 'var(--font-handwritten)' }}>
            {agent.name}的档案
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '24px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}
      >
        {/* 左侧：基本信息 + 性格雷达 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* 树的头像区域 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                fontSize: 80,
                lineHeight: 1,
                marginBottom: 12,
              }}
            >
              🌲
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'rgba(45, 62, 53, 0.9)',
                fontFamily: 'var(--font-handwritten)',
                marginBottom: 8,
              }}
            >
              {agent.name}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: 'var(--font-handwritten)',
              }}
            >
              <span>{symbol}</span>
              {agent.personality}
            </div>
          </div>

          {/* 基本信息卡片 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: 12,
                background: `${color}15`,
                borderRadius: 8,
                textAlign: 'center',
                border: `1px solid ${color}33`,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(100, 140, 130, 0.7)', marginBottom: 6 }}>
                能量
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color,
                  fontFamily: 'var(--font-handwritten)',
                }}
              >
                {agent.energy}
              </div>
            </div>
            <div
              style={{
                padding: 12,
                background: `${color}15`,
                borderRadius: 8,
                textAlign: 'center',
                border: `1px solid ${color}33`,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(100, 140, 130, 0.7)', marginBottom: 6 }}>
                代数
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color,
                  fontFamily: 'var(--font-handwritten)',
                }}
              >
                {agent.generation}
              </div>
            </div>
            <div
              style={{
                padding: 12,
                background: `${color}15`,
                borderRadius: 8,
                textAlign: 'center',
                border: `1px solid ${color}33`,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(100, 140, 130, 0.7)', marginBottom: 6 }}>
                总对话
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color,
                  fontFamily: 'var(--font-handwritten)',
                }}
              >
                {stats.totalChats}
              </div>
            </div>
            <div
              style={{
                padding: 12,
                background: `${color}15`,
                borderRadius: 8,
                textAlign: 'center',
                border: `1px solid ${color}33`,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(100, 140, 130, 0.7)', marginBottom: 6 }}>
                获赞数
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color,
                  fontFamily: 'var(--font-handwritten)',
                }}
              >
                {stats.totalLikes}
              </div>
            </div>
          </div>

          {/* 个人简介 */}
          <div
            style={{
              padding: 12,
              background: `${color}08`,
              borderRadius: 8,
              border: `1px solid ${color}22`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(100, 140, 130, 0.8)',
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              简介
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: 'rgba(45, 62, 53, 0.8)',
                fontFamily: 'var(--font-handwritten)',
              }}
            >
              {agent.metadata.bio}
            </div>
          </div>
        </motion.div>

        {/* 中间：性格雷达 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <PersonalityRadar personality={agent.personality} primaryTraits={{}} size={220} />
        </motion.div>

        {/* 右侧：家族树 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            gridColumn: 'span 1',
          }}
        >
          <FamilyTree
            agentId={agent.id}
            agentsOverride={localAgent ? undefined : fallbackFamilyAgents}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 20px 24px',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: 'rgba(45, 62, 53, 0.9)', fontFamily: 'var(--font-handwritten)' }}>
            📖 树木传记
          </h3>

          <div style={{ marginBottom: 16, fontSize: 12, lineHeight: 1.6, color: 'rgba(92, 112, 101, 0.8)' }}>
            把关系变化、成长跃迁、互动热度和高光对话混排成一条时间叙事线，刷新后也能继续讲清这棵树经历了什么。
          </div>

          {biographyEvents.length === 0 ? (
            <div style={{ padding: 12, color: 'rgba(100, 140, 130, 0.6)', textAlign: 'center' }}>
              暂无传记记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {biographyEvents.map((event) => {
                return (
                  <div
                    key={event.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: `${event.accentColor.replace(/0\.[0-9]+\)/, '0.08)')}`,
                      border: `1px solid ${event.accentColor.replace(/0\.[0-9]+\)/, '0.22)')}`,
                      borderLeft: `4px solid ${event.accentColor}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{event.icon}</span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(45, 62, 53, 0.9)', fontFamily: 'var(--font-handwritten)' }}>
                          {event.title}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(100, 140, 130, 0.62)' }}>
                        {new Date(event.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(61, 92, 73, 0.82)', lineHeight: 1.6 }}>
                      {event.description}
                    </div>
                    {event.chips.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {event.chips.map((chip) => (
                          <span
                            key={`${event.id}-${chip}`}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              color: 'rgba(61, 92, 73, 0.78)',
                              background: 'rgba(255,255,255,0.72)',
                              border: '1px solid rgba(61, 92, 73, 0.12)',
                            }}
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* 底部：对话历史 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 20px 40px',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: 'rgba(45, 62, 53, 0.9)', fontFamily: 'var(--font-handwritten)' }}>
            💬 精彩对话
          </h3>

          {chatLogs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'rgba(100, 140, 130, 0.6)' }}>
              暂无对话记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatLogs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: 12,
                    background: 'rgba(129, 199, 132, 0.05)',
                    borderLeft: `4px solid ${PERSONALITY_COLORS[log.partnerPersonality ?? ''] || '#7aa98d'}`,
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: PERSONALITY_COLORS[log.partnerPersonality ?? ''] || '#7aa98d',
                      marginBottom: 6,
                      fontFamily: 'var(--font-handwritten)',
                    }}
                  >
                    → {log.partnerName}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'rgba(45, 62, 53, 0.8)',
                      marginBottom: 8,
                      fontFamily: 'var(--font-handwritten)',
                    }}
                  >
                    "{log.message}"
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(100, 140, 130, 0.6)',
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    <span>👍 {log.likes}</span>
                    <span>{new Date(log.timestamp).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const PERSONALITY_COLORS: Record<string, string> = {
  温柔: '#E7849B',
  睿智: '#5D91A6',
  顽皮: '#D98958',
  活泼: '#A5962D',
  社恐: '#8A8A8A',
  神启: '#D4A72C',
};
