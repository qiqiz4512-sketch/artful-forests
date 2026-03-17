import { describe, expect, it } from 'vitest';
import { SocialState, type TreeAgent } from '@/types/forest';
import { buildRecentTopicContinuation, classifySocialEvent, resolveMemoryCue } from '@/lib/treeSociety';

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

describe('treeSociety memory continuation', () => {
  it('returns continuation cue within 5 minutes', () => {
    const now = Date.now();
    const sender = createAgent({ id: 'tree-a', name: '柳摆子' });
    const receiver = createAgent({
      id: 'tree-b',
      name: '银杏先知',
      personality: '睿智',
      memory: {
        lastTopic: '天气',
        interactionHistory: [],
        timestamp: now - 60_000,
        recallingUntil: 0,
      },
    });

    const cue = resolveMemoryCue(sender, receiver, now);

    expect(cue?.mode).toBe('continuation');
    expect(cue?.topic).toBe('天气');
    expect(cue?.line).toContain('天气');
  });

  it('builds recent-topic reply around previous topic', () => {
    const sender = createAgent({
      id: 'tree-a',
      personality: '活泼',
      intimacyMap: { 'tree-b': 72 },
      socialCircle: { friends: ['tree-b'], family: [], partner: null },
    });
    const receiver = createAgent({ id: 'tree-b' });

    const message = buildRecentTopicContinuation(sender, receiver, {
      topic: '成长',
      echoText: '我们刚才还在聊成长和发芽',
      intimacy: 72,
    });

    expect(message).toContain('成长');
  });

  it('marks recent-topic continuation as trending when other heat signals are present', () => {
    const classification = classifySocialEvent({
      likes: 4,
      comments: 2,
      crossZone: true,
      intimacyBefore: 60,
      intimacyAfter: 64,
      hasDivineTree: false,
      hasRecentTopicEcho: true,
    });

    expect(classification.heat).toBeGreaterThanOrEqual(45);
    expect(classification.isTrending).toBe(true);
    expect(classification.type).toBe('chat');
  });
});