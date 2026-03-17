import { useMemo } from 'react';
import { useForestStore } from '@/stores/useForestStore';
import type { TreeAgent } from '@/types/forest';

interface Props {
  agentId: string;
  agentsOverride?: TreeAgent[];
}

/**
 * 展示树的家族树：祖先、亲代、自己以及子代
 */
export default function FamilyTree({ agentId, agentsOverride }: Props) {
  const storeAgents = useForestStore((state) => state.agents);
  const agents = agentsOverride && agentsOverride.length > 0 ? agentsOverride : storeAgents;
  const currentAgent = agents.find((a) => a.id === agentId);

  const familyData = useMemo(() => {
    if (!currentAgent) return null;

    // 查找祖先（父代的父代）
    const getAncestors = (plantParents: string[]): TreeAgent[] => {
      return plantParents
        .map((id) => agents.find((a) => a.id === id))
        .filter((a) => a !== undefined) as TreeAgent[];
    };

    // 查找子代
    const getOffspring = (targetId: string): TreeAgent[] => {
      return agents.filter((a) => a.parents.includes(targetId));
    };

    const parents = getAncestors(currentAgent.parents);
    const grandparents = parents.flatMap((p) => getAncestors(p.parents));
    const children = getOffspring(agentId);
    const siblings = currentAgent.parents.length > 0
      ? getAncestors(currentAgent.parents).flatMap((p) => getOffspring(p.id)).filter((a) => a.id !== agentId)
      : [];

    return {
      current: currentAgent,
      parents,
      grandparents: [...new Set(grandparents)], // 去重
      children,
      siblings,
    };
  }, [currentAgent, agents]);

  if (!familyData) {
    return <div style={{ padding: 20, color: 'rgba(100, 140, 130, 0.6)' }}>树木信息加载中...</div>;
  }

  const PERSONALITY_COLORS: Record<string, string> = {
    温柔: '#E7849B',
    睿智: '#5D91A6',
    顽皮: '#D98958',
    活泼: '#A5962D',
    社恐: '#8A8A8A',
    神启: '#D4A72C',
  };

  const PersonNode = ({ agent, label }: { agent: TreeAgent; label?: string }) => {
    const color = PERSONALITY_COLORS[agent.personality] || '#7aa98d';
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 8,
          borderRadius: 8,
          background: `${color}15`,
          border: `2px solid ${color}66`,
          minWidth: 100,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(45, 62, 53, 0.9)' }}>
          {agent.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {agent.personality}
        </div>
        {label && (
          <div style={{ fontSize: 9, color: 'rgba(100, 140, 130, 0.6)', marginTop: 2 }}>
            {label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 20, background: 'rgba(255, 255, 255, 0.5)', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: 'rgba(45, 62, 53, 0.9)' }}>
        🌳 家族树
      </h3>

      {/* 祖父母代 */}
      {familyData.grandparents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(100, 140, 130, 0.7)',
              marginBottom: 12,
            }}
          >
            👵 祖辈 ({familyData.grandparents.length})
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {familyData.grandparents.map((gp) => (
              <PersonNode key={gp.id} agent={gp} />
            ))}
          </div>
          <div
            style={{
              height: 20,
              borderLeft: '2px solid rgba(100, 140, 130, 0.2)',
              margin: '12px 0 0 50px',
            }}
          />
        </div>
      )}

      {/* 父母代 */}
      {familyData.parents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(100, 140, 130, 0.7)',
              marginBottom: 12,
            }}
          >
            👨‍👩‍👧 亲代 ({familyData.parents.length})
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {familyData.parents.map((p) => (
              <PersonNode key={p.id} agent={p} />
            ))}
          </div>
          <div
            style={{
              height: 20,
              borderTop: '2px solid rgba(100, 140, 130, 0.2)',
              margin: '0 0 12px 0',
            }}
          />
        </div>
      )}

      {/* 自己 */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(100, 140, 130, 0.7)',
            marginBottom: 12,
          }}
        >
          🌱 你
        </div>
        <PersonNode agent={familyData.current} label={`第 ${familyData.current.generation} 代`} />
      </div>

      {/* 兄弟姐妹 */}
      {familyData.siblings.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(100, 140, 130, 0.7)',
              marginBottom: 12,
            }}
          >
            👯 兄弟姐妹 ({familyData.siblings.length})
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {familyData.siblings.map((s) => (
              <PersonNode key={s.id} agent={s} />
            ))}
          </div>
        </div>
      )}

      {/* 子代 */}
      {familyData.children.length > 0 && (
        <div>
          <div
            style={{
              height: 20,
              borderTop: '2px solid rgba(100, 140, 130, 0.2)',
              margin: '0 0 12px 0',
            }}
          />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(100, 140, 130, 0.7)',
              marginBottom: 12,
            }}
          >
            👶 子代 ({familyData.children.length})
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {familyData.children.map((c) => (
              <PersonNode key={c.id} agent={c} />
            ))}
          </div>
        </div>
      )}

      {/* 无亲戚提示 */}
      {familyData.parents.length === 0 &&
        familyData.children.length === 0 &&
        familyData.siblings.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: 'rgba(100, 140, 130, 0.6)',
              fontSize: 13,
            }}
          >
            这是一棵独立的树，还没有家族成员
          </div>
        )}
    </div>
  );
}
