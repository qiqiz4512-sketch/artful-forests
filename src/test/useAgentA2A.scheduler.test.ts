import { describe, expect, it } from 'vitest';
import { SocialState } from '@/types/forest';
import { getDivineAdorationCandidateWeight, getReceiverSelectionWeight, getStarterSelectionWeight } from '@/hooks/useAgentA2A';

describe('useAgentA2A scheduler bias', () => {
  it('boosts lively starters when they have an idle shy neighbor', () => {
    const worldWidth = 5000;
    const livelyStarter = {
      id: 'lively-a',
      neighbors: ['shy-b'],
      position: { x: 3200 },
      personality: '活泼',
      metadata: { chatterbox: false },
      intimacyMap: { 'shy-b': 20 },
      socialCircle: { family: [], partner: null },
    };
    const sameStarterWithoutShy = {
      ...livelyStarter,
      neighbors: ['wise-c'],
      intimacyMap: {},
    };
    const idToAgent = new Map([
      ['shy-b', { id: 'shy-b', personality: '社恐', socialState: SocialState.IDLE }],
      ['wise-c', { id: 'wise-c', personality: '睿智', socialState: SocialState.IDLE }],
    ]);

    const boosted = getStarterSelectionWeight(livelyStarter, idToAgent, worldWidth);
    const baseline = getStarterSelectionWeight(sameStarterWithoutShy, idToAgent, worldWidth);

    expect(boosted).toBeGreaterThan(baseline);
  });

  it('prefers shy receivers for lively trees, but heavily damps recently active shy targets', () => {
    const worldWidth = 5000;
    const now = 1_000_000;
    const livelySender = {
      personality: '活泼',
      intimacyMap: { 'shy-b': 12, 'wise-c': 12 },
      socialCircle: { friends: [], family: [], partner: null },
    };
    const shyReceiver = { id: 'shy-b', personality: '社恐', position: { x: 3200 } };
    const wiseReceiver = { id: 'wise-c', personality: '睿智', position: { x: 3200 } };

    const shyWeight = getReceiverSelectionWeight(livelySender, shyReceiver, worldWidth, now);
    const wiseWeight = getReceiverSelectionWeight(livelySender, wiseReceiver, worldWidth, now);
    const recentlyActiveShyWeight = getReceiverSelectionWeight(livelySender, shyReceiver, worldWidth, now, now - 10_000);

    expect(shyWeight).toBeGreaterThan(wiseWeight);
    expect(recentlyActiveShyWeight).toBeLessThan(wiseWeight);
  });

  it('prefers unfamiliar shy receivers over already-familiar shy receivers', () => {
    const worldWidth = 5000;
    const now = 1_000_000;
    const livelySender = {
      personality: '活泼',
      intimacyMap: { 'shy-new': 18, 'shy-old': 84 },
      socialCircle: { friends: ['shy-old'], family: [], partner: null },
    };
    const shyNew = { id: 'shy-new', personality: '社恐', position: { x: 3200 } };
    const shyOld = { id: 'shy-old', personality: '社恐', position: { x: 3200 } };

    const newWeight = getReceiverSelectionWeight(livelySender, shyNew, worldWidth, now);
    const oldWeight = getReceiverSelectionWeight(livelySender, shyOld, worldWidth, now);

    expect(newWeight).toBeGreaterThan(oldWeight);
  });

  it('gives stronger divine attraction to nearer ordinary trees and damps recently active ones', () => {
    const worldWidth = 5000;
    const now = 1_000_000;
    const manualTree = {
      id: 'manual-tree',
      position: { x: 3000, y: 120 },
    };
    const nearOrdinaryTree = {
      id: 'near-tree',
      personality: '温柔',
      position: { x: 3120, y: 125 },
      intimacyMap: { 'manual-tree': 18 },
      socialCircle: { friends: [], family: [], partner: null },
      metadata: { chatterbox: false },
    };
    const farOrdinaryTree = {
      ...nearOrdinaryTree,
      id: 'far-tree',
      position: { x: 3560, y: 150 },
      intimacyMap: { 'manual-tree': 18 },
    };

    const nearWeight = getDivineAdorationCandidateWeight(nearOrdinaryTree, manualTree, worldWidth, now);
    const farWeight = getDivineAdorationCandidateWeight(farOrdinaryTree, manualTree, worldWidth, now);
    const recentlyActiveNearWeight = getDivineAdorationCandidateWeight(nearOrdinaryTree, manualTree, worldWidth, now, now - 10_000);

    expect(nearWeight).toBeGreaterThan(farWeight);
    expect(recentlyActiveNearWeight).toBeLessThan(nearWeight);
  });
});