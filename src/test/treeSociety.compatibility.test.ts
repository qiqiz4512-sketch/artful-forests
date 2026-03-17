import { describe, expect, it } from 'vitest';
import { SocialState, type TreeAgent } from '@/types/forest';
import { PARTNER_COMPATIBILITY_THRESHOLD, calculatePartnerCompatibility } from '@/lib/treeSociety';

const createAgent = (overrides: Partial<TreeAgent>): TreeAgent => ({
  id: overrides.id ?? 'tree-a',
  name: overrides.name ?? '松师傅',
  position: overrides.position ?? { x: 0, y: 0 },
  scale: overrides.scale ?? 1,
  zIndex: overrides.zIndex ?? 1,
  personality: overrides.personality ?? '温柔',
  energy: overrides.energy ?? 80,
  socialState: overrides.socialState ?? SocialState.IDLE,
  generation: overrides.generation ?? 0,
  parents: overrides.parents ?? [],
  socialCircle: overrides.socialCircle ?? { friends: [], family: [], partner: null },
  intimacyMap: overrides.intimacyMap ?? {},
  growthBoost: overrides.growthBoost ?? 1,
  growthScore: overrides.growthScore ?? 0,
  neighbors: overrides.neighbors ?? [],
  isManual: overrides.isManual ?? false,
  memory: overrides.memory ?? { lastTopic: '', interactionHistory: [], timestamp: 0, recallingUntil: 0 },
  metadata: overrides.metadata ?? { bio: '', lastWords: '' },
  shape: overrides.shape,
  tag: overrides.tag,
});

describe('treeSociety partner compatibility', () => {
  it('marks a high-affinity non-kin pair as eligible', () => {
    const now = Date.now();
    const a = createAgent({
      id: 'tree-a',
      personality: '温柔',
      position: { x: 1200, y: 100 },
      intimacyMap: { 'tree-b': 86 },
      socialCircle: { friends: ['tree-b'], family: [], partner: null },
      neighbors: ['tree-b'],
      memory: {
        lastTopic: '成长',
        interactionHistory: [{ agentId: 'tree-b', personalityImpression: '睿智', lastTopic: '成长', timestamp: now - 60_000 }],
        timestamp: now - 60_000,
        recallingUntil: 0,
      },
    });
    const b = createAgent({
      id: 'tree-b',
      personality: '睿智',
      position: { x: 1320, y: 100 },
      intimacyMap: { 'tree-a': 84 },
      socialCircle: { friends: ['tree-a'], family: [], partner: null },
      neighbors: ['tree-a'],
      memory: {
        lastTopic: '成长',
        interactionHistory: [{ agentId: 'tree-a', personalityImpression: '温柔', lastTopic: '成长', timestamp: now - 45_000 }],
        timestamp: now - 45_000,
        recallingUntil: 0,
      },
    });

    const result = calculatePartnerCompatibility(a, b, new Map([[a.id, a], [b.id, b]]), 5000, now);

    expect(result.hardGatePassed).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(PARTNER_COMPATIBILITY_THRESHOLD);
    expect(result.eligibleForPartner).toBe(true);
  });

  it('blocks blood-related pairs even when their score would otherwise be high', () => {
    const now = Date.now();
    const a = createAgent({
      id: 'tree-a',
      parents: ['root-1'],
      personality: '活泼',
      position: { x: 2600, y: 100 },
      intimacyMap: { 'tree-b': 92 },
      socialCircle: { friends: ['tree-b'], family: ['tree-b'], partner: null },
      neighbors: ['tree-b'],
      memory: {
        lastTopic: '天气',
        interactionHistory: [{ agentId: 'tree-b', personalityImpression: '社恐', lastTopic: '天气', timestamp: now - 30_000 }],
        timestamp: now - 30_000,
        recallingUntil: 0,
      },
    });
    const b = createAgent({
      id: 'tree-b',
      parents: ['root-1'],
      personality: '社恐',
      position: { x: 2680, y: 100 },
      intimacyMap: { 'tree-a': 92 },
      socialCircle: { friends: ['tree-a'], family: ['tree-a'], partner: null },
      neighbors: ['tree-a'],
      memory: {
        lastTopic: '天气',
        interactionHistory: [{ agentId: 'tree-a', personalityImpression: '活泼', lastTopic: '天气', timestamp: now - 30_000 }],
        timestamp: now - 30_000,
        recallingUntil: 0,
      },
    });

    const result = calculatePartnerCompatibility(a, b, new Map([[a.id, a], [b.id, b]]), 5000, now);

    expect(result.total).toBeGreaterThan(0);
    expect(result.hardGatePassed).toBe(false);
    expect(result.eligibleForPartner).toBe(false);
    expect(result.eligibleForBreeding).toBe(false);
  });
});