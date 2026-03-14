import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESET_TREE_SHAPES } from '@/constants/treeShapes';
import { generateRandomProfile } from '@/lib/agentProfile';
import { useForestStore } from '@/stores/useForestStore';
import { pickShapeByWorldEcology } from '@/lib/worldEcology';
import { TreeShapePreset } from '@/constants/treeShapes';
import { TreeProfile } from '@/lib/agentProfile';
import { areBloodRelated, buildChildShape, clamp, isAdult, normalizePersonality } from '@/lib/treeSociety';
import { TreeAgent } from '@/types/forest';

export interface AutoPlantedTreePayload {
  id: string;
  x: number;
  y: number;
  size: number;
  profile: TreeProfile;
  shape: TreeShapePreset;
  imageData: string;
  source: 'birth' | 'external';
}

interface UseAutoPlantingOptions {
  autoPlantInterval?: number;
  autoStart?: boolean;
  minYRatio?: number;
  maxYRatio?: number;
  minXRatio?: number;
  maxXRatio?: number;
  worldWidth?: number;
  visibleSpawnProbability?: number;
  visibleRange?: {
    startX: number;
    endX: number;
  };
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'auto';
  onTreeAdded?: (payload: AutoPlantedTreePayload) => void;
}

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);
const GLOBAL_BIRTH_COOLDOWN_MS = 75_000;
const PAIR_BIRTH_COOLDOWN_MS = 150_000;
const EXTERNAL_SEED_COOLDOWN_MS = 40_000;

const seasonPreferredShapeIds: Record<'spring' | 'summer' | 'autumn' | 'winter', string[]> = {
  spring: ['cherry-blossom', 'sakura-cloud', 'blossom-white', 'pear-soft', 'canopy-bubble'],
  summer: ['olive-rounded', 'apple-fruit', 'round-lime', 'canopy-bubble', 'oak-broad', 'elm-vase', 'palm-tropical', 'moss-round', 'cedar-blue'],
  autumn: ['autumn-round', 'maple-wide', 'red-maple-star', 'orange-watercolor', 'yellow-poplar', 'ginkgo-fan', 'maple-crimson', 'beech-copper', 'chestnut-amber', 'aspen-quiver'],
  winter: ['pine-classic', 'spruce-dark', 'fir-slim', 'cedar-layered', 'cypress-column', 'birch-white', 'birch-bare-silver', 'oak-bare-winter', 'maple-bare-ember', 'larch-gold'],
};

const getSeasonFromDate = (date: Date): 'spring' | 'summer' | 'autumn' | 'winter' => {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

export const renderTreeShapeToDataUrl = (shape: TreeShapePreset): string => {
  const accentFill = shape.colorPalette.accent ?? shape.colorPalette.leaves;
  const trunkMarkup = shape.trunkPathData
    ? `<path d="${shape.trunkPathData}" fill="${shape.colorPalette.trunk}" stroke="rgba(38,28,18,0.26)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`
    : `<rect x="100" y="152" width="20" height="84" rx="8" fill="${shape.colorPalette.trunk}" stroke="rgba(38,28,18,0.26)" stroke-width="2" />`;
  const detailMarkup = shape.detailPathData
    ? `<path d="${shape.detailPathData}" fill="none" stroke="rgba(36,56,28,0.45)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="260" viewBox="0 0 220 260">
    <defs>
      <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.18)" />
      </filter>
      <filter id="paperNoise" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="3" result="noise" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.08" />
        </feComponentTransfer>
      </filter>
    </defs>
    ${trunkMarkup}
    <path d="${shape.svgPathData}" fill="${shape.colorPalette.leaves}" filter="url(#softShadow)" />
    <path d="${shape.svgPathData}" fill="${accentFill}" opacity="0.26" transform="translate(7 -5) scale(0.93)" />
    <path d="${shape.svgPathData}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    ${detailMarkup}
    <path d="${shape.svgPathData}" fill="white" filter="url(#paperNoise)" opacity="0.16" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export function useAutoPlanting(options: UseAutoPlantingOptions = {}) {
  const {
    autoPlantInterval = 3,
    autoStart = false,
    minYRatio = 0.55,
    maxYRatio = 0.85,
    minXRatio = 0.08,
    maxXRatio = 0.92,
    worldWidth,
    visibleSpawnProbability = 0.8,
    visibleRange,
    season = 'auto',
    onTreeAdded,
  } = options;

  const addTree = useForestStore((state) => state.addTree);
  const timerRef = useRef<number | null>(null);
  const lastBirthAtRef = useRef(0);
  const lastExternalSeedAtRef = useRef(0);
  const pairBirthAtRef = useRef<Record<string, number>>({});
  const [isAutoPlanting, setIsAutoPlanting] = useState(false);

  const getPairKey = useCallback((aId: string, bId: string) => {
    return [aId, bId].sort().join('::');
  }, []);

  const createTreeVisualPayload = useCallback((
    payload: {
      id: string;
      x: number;
      y: number;
      size: number;
      profile: TreeProfile;
      shape: TreeShapePreset;
      source: 'birth' | 'external';
    },
  ) => {
    onTreeAdded?.({
      ...payload,
      imageData: renderTreeShapeToDataUrl(payload.shape),
    });
  }, [onTreeAdded]);

  const spawnExternalSeed = useCallback((w: number, h: number) => {
    const profile = generateRandomProfile({ x: randomInRange(0, w), worldWidth: w });
    const shape = PRESET_TREE_SHAPES[Math.floor(Math.random() * PRESET_TREE_SHAPES.length)];

    const boundedVisibleStart = visibleRange ? Math.max(0, Math.min(w, visibleRange.startX)) : 0;
    const boundedVisibleEnd = visibleRange ? Math.max(0, Math.min(w, visibleRange.endX)) : 0;
    const hasVisible = boundedVisibleEnd - boundedVisibleStart > 80;

    const x = hasVisible && Math.random() < visibleSpawnProbability
      ? randomInRange(boundedVisibleStart, boundedVisibleEnd)
      : randomInRange(w * minXRatio, w * maxXRatio);
    const y = randomInRange(h * minYRatio, h * maxYRatio);
    const size = randomInRange(76, 116);
    const scale = randomInRange(0.48, 1.12);
    const id = `seed-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    addTree({
      id,
      position: { x, y },
      scale,
      zIndex: Math.floor(y),
      name: profile.name,
      personality: profile.personality,
      metadata: {
        ...profile.metadata,
        lastWords: '一阵微风裹着羽毛，把我带到了这里。',
      },
      energy: Math.floor(randomInRange(42, 90)),
      generation: 0,
      parents: [],
      socialCircle: { friends: [], family: [], partner: null },
      intimacyMap: {},
      shape,
    });

    useForestStore.getState().setActiveChat({
      treeAId: id,
      treeBId: id,
      message: Math.random() < 0.5 ? '一片羽毛掠过，落下了一颗新种子。' : '落叶旋转着停下，一棵陌生小树悄悄发芽。',
    });

    lastExternalSeedAtRef.current = Date.now();

    createTreeVisualPayload({ id, x, y, size, profile, shape, source: 'external' });
  }, [addTree, createTreeVisualPayload, maxXRatio, maxYRatio, minXRatio, minYRatio, visibleRange, visibleSpawnProbability]);

  const tryBreeding = useCallback((agents: TreeAgent[], w: number, h: number): boolean => {
    const now = Date.now();
    if (now - lastBirthAtRef.current < GLOBAL_BIRTH_COOLDOWN_MS) {
      return false;
    }

    const idToAgent = new Map(agents.map((agent) => [agent.id, agent]));
    const candidates: Array<{ a: TreeAgent; b: TreeAgent; intimacy: number }> = [];

    agents.forEach((a) => {
      a.neighbors.forEach((neighborId) => {
        const b = idToAgent.get(neighborId);
        if (!b || a.id >= b.id) return;
        const intimacy = Math.min(a.intimacyMap[b.id] ?? 0, b.intimacyMap[a.id] ?? 0);
        if (intimacy < 90) return;
        if (!isAdult(a) || !isAdult(b)) return;
        if (areBloodRelated(a, b, idToAgent)) return;

        const partnerMatch =
          (!a.socialCircle.partner || a.socialCircle.partner === b.id)
          && (!b.socialCircle.partner || b.socialCircle.partner === a.id);
        if (!partnerMatch) return;

        const pairKey = getPairKey(a.id, b.id);
        const lastPairBirthAt = pairBirthAtRef.current[pairKey] ?? 0;
        if (now - lastPairBirthAt < PAIR_BIRTH_COOLDOWN_MS) return;

        candidates.push({ a, b, intimacy });
      });
    });

    if (candidates.length === 0) return false;

    const pair = candidates[Math.floor(Math.random() * candidates.length)];
    const x = clamp((pair.a.position.x + pair.b.position.x) * 0.5 + randomInRange(-24, 24), 0, w);
    const y = clamp((pair.a.position.y + pair.b.position.y) * 0.5 + randomInRange(-8, 10), h * minYRatio, h * maxYRatio);

    const randomProfile = generateRandomProfile({ x, worldWidth: w });
    const inheritedPersonality = Math.random() < 0.5
      ? normalizePersonality(Math.random() < 0.5 ? pair.a.personality : pair.b.personality)
      : randomProfile.personality;
    const shape = buildChildShape(pair.a, pair.b, x, w);
    const generation = Math.max(pair.a.generation, pair.b.generation) + 1;
    const id = `sapling-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const size = randomInRange(56, 78);
    const scale = randomInRange(0.38, 0.66);
    const inheritedNameRoot = `${pair.a.name.replace(/\d+/g, '').slice(0, 1)}${pair.b.name.replace(/\d+/g, '').slice(0, 1)}`;
    const profile: TreeProfile = {
      name: `${inheritedNameRoot || randomProfile.name.slice(0, 2)}芽${Math.floor(10 + Math.random() * 90)}`,
      personality: inheritedPersonality,
      metadata: {
        bio: `第${generation}代幼苗，由${pair.a.name.replace(/\d+/g, '')}与${pair.b.name.replace(/\d+/g, '')}共同孕育。`,
        lastWords: '我会带着父母的叶色，慢慢长大。',
      },
    };

    addTree({
      id,
      position: { x, y },
      scale,
      zIndex: Math.floor(y),
      name: profile.name,
      personality: profile.personality,
      metadata: profile.metadata,
      energy: Math.floor(randomInRange(34, 58)),
      generation,
      parents: [pair.a.id, pair.b.id],
      socialCircle: { family: [pair.a.id, pair.b.id], friends: [], partner: null },
      intimacyMap: { [pair.a.id]: 88, [pair.b.id]: 88 },
      shape,
    });

    const store = useForestStore.getState();
    store.setPartner(pair.a.id, pair.b.id);
    store.registerBirthFamily(id, [pair.a.id, pair.b.id]);
    store.changeIntimacy(pair.a.id, pair.b.id, 2);
    store.setActiveChat({
      treeAId: pair.a.id,
      treeBId: pair.b.id,
      message: `告白成功，我们一起迎来了第${generation}代小树苗。`,
    });

    const pairKey = getPairKey(pair.a.id, pair.b.id);
    pairBirthAtRef.current[pairKey] = now;
    lastBirthAtRef.current = now;

    createTreeVisualPayload({ id, x, y, size, profile, shape, source: 'birth' });
    return true;
  }, [addTree, createTreeVisualPayload, getPairKey, maxYRatio, minYRatio]);

  const runSocietyCycle = useCallback(() => {
    if (typeof window === 'undefined') return;

    const viewportW = window.innerWidth;
    const w = Math.max(viewportW, worldWidth ?? viewportW);
    const h = window.innerHeight;
    const selectedSeason = season === 'auto' ? getSeasonFromDate(new Date()) : season;
    const agents = useForestStore.getState().agents;
    const boostedBreedingAgents = agents.map((agent) => {
      const intimacyBias = Object.values(agent.intimacyMap).some((value) => value >= 90);
      if (!intimacyBias) return agent;
      return {
        ...agent,
        shape: agent.shape ?? pickShapeByWorldEcology(agent.position.x, w, seasonPreferredShapeIds[selectedSeason]),
      };
    });

    const bred = tryBreeding(boostedBreedingAgents, w, h);
    if (bred) return;

    const now = Date.now();
    const sinceExternalSeed = now - lastExternalSeedAtRef.current;
    if (sinceExternalSeed < EXTERNAL_SEED_COOLDOWN_MS) return;

    const lowPopulationBoost = agents.length < 18 ? 0.3 : 0;
    if (Math.random() < 0.45 + lowPopulationBoost) {
      spawnExternalSeed(w, h);
    }
  }, [
    maxXRatio,
    maxYRatio,
    minXRatio,
    minYRatio,
    season,
    worldWidth,
    spawnExternalSeed,
    tryBreeding,
  ]);

  const stopAutoPlanting = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAutoPlanting(false);
  }, []);

  const startAutoPlanting = useCallback(() => {
    if (timerRef.current !== null) return;
    setIsAutoPlanting(true);
    runSocietyCycle();
    timerRef.current = window.setInterval(runSocietyCycle, autoPlantInterval * 1000);
  }, [autoPlantInterval, runSocietyCycle]);

  useEffect(() => {
    if (!autoStart) return;
    startAutoPlanting();
  }, [autoStart, startAutoPlanting]);

  useEffect(() => {
    return () => stopAutoPlanting();
  }, [stopAutoPlanting]);

  return {
    isAutoPlanting,
    startAutoPlanting,
    stopAutoPlanting,
  };
}
