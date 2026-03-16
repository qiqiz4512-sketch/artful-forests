import { PRESET_TREE_SHAPES, type TreeShapePreset } from '@/constants/treeShapes';

export interface WorldEcologyZone {
  id: 'cool-conifer' | 'mixed-meadow' | 'blossom-glow';
  label: string;
  startRatio: number;
  endRatio: number;
  shapeIds: string[];
}

export interface WorldEcologyAtmosphere {
  skyOverlay: string;
  glowColor: string;
  mountainTint: string;
  hillTint: string;
  grassTint: string;
  rainTint: string;
  particleHues: number[];
  fireflyHue: number;
}

export interface WorldEcologySocialMood {
  conversationWeight: number;
  emissionBoost: number;
  fluteFrequency: number;
  neighborRadius: number;
  phraseTail: string[];
}

export const WORLD_ECOLOGY_ZONES: WorldEcologyZone[] = [
  {
    id: 'cool-conifer',
    label: '冷杉林带',
    startRatio: 0,
    endRatio: 0.28,
    shapeIds: [
      'pine-classic',
      'spruce-dark',
      'fir-slim',
      'larch-gold',
      'teardrop-cedar',
      'cedar-layered',
      'cedar-blue',
      'cypress-column',
      'cedar-mint',
      'birch-white',
      'birch-bare-silver',
    ],
  },
  {
    id: 'mixed-meadow',
    label: '混交草甸',
    startRatio: 0.28,
    endRatio: 0.64,
    shapeIds: [
      'round-lime',
      'olive-rounded',
      'pear-soft',
      'apple-fruit',
      'oak-broad',
      'oak-bare-winter',
      'elm-vase',
      'weeping-willow',
      'canopy-bubble',
      'moss-round',
      'ginkgo-fan',
      'yellow-poplar',
      'aspen-quiver',
      'maple-bare-ember',
    ],
  },
  {
    id: 'blossom-glow',
    label: '花影暖林',
    startRatio: 0.64,
    endRatio: 1,
    shapeIds: [
      'cherry-blossom',
      'sakura-cloud',
      'plum-pink',
      'blossom-white',
      'birch-white',
      'autumn-round',
      'red-maple-star',
      'maple-wide',
      'maple-crimson',
      'orange-watercolor',
      'beech-copper',
      'chestnut-amber',
      'aspen-quiver',
      'maple-bare-ember',
    ],
  },
];

const WORLD_ECOLOGY_ATMOSPHERE: Record<WorldEcologyZone['id'], WorldEcologyAtmosphere> = {
  'cool-conifer': {
    skyOverlay: 'rgba(126, 184, 190, 0.16)',
    glowColor: 'rgba(171, 227, 220, 0.18)',
    mountainTint: 'rgba(80, 132, 128, 0.16)',
    hillTint: 'rgba(70, 132, 110, 0.14)',
    grassTint: 'rgba(88, 148, 120, 0.12)',
    rainTint: 'rgba(118, 142, 162, 0.08)',
    particleHues: [332, 342, 350],
    fireflyHue: 160,
  },
  'mixed-meadow': {
    skyOverlay: 'rgba(238, 220, 154, 0.12)',
    glowColor: 'rgba(246, 234, 184, 0.16)',
    mountainTint: 'rgba(152, 168, 110, 0.14)',
    hillTint: 'rgba(120, 160, 102, 0.12)',
    grassTint: 'rgba(168, 186, 102, 0.12)',
    rainTint: 'rgba(118, 142, 162, 0.08)',
    particleHues: [332, 342, 350],
    fireflyHue: 64,
  },
  'blossom-glow': {
    skyOverlay: 'rgba(255, 210, 214, 0.16)',
    glowColor: 'rgba(255, 226, 198, 0.18)',
    mountainTint: 'rgba(214, 154, 136, 0.16)',
    hillTint: 'rgba(196, 132, 112, 0.14)',
    grassTint: 'rgba(214, 162, 118, 0.12)',
    rainTint: 'rgba(118, 142, 162, 0.08)',
    particleHues: [332, 342, 350],
    fireflyHue: 28,
  },
};

const WORLD_ECOLOGY_SOCIAL_MOOD: Record<WorldEcologyZone['id'], WorldEcologySocialMood> = {
  'cool-conifer': {
    conversationWeight: 0.84,
    emissionBoost: 0.92,
    fluteFrequency: 740,
    neighborRadius: 176,
    phraseTail: ['针叶的气息让话也慢了下来。', '冷风穿过枝隙，连沉默都很清亮。'],
  },
  'mixed-meadow': {
    conversationWeight: 1,
    emissionBoost: 1.05,
    fluteFrequency: 880,
    neighborRadius: 212,
    phraseTail: ['草香在脚边散开，语气也变得松软。', '风从草甸掠过，连句子都更圆润了。'],
  },
  'blossom-glow': {
    conversationWeight: 1.24,
    emissionBoost: 1.18,
    fluteFrequency: 988,
    neighborRadius: 248,
    phraseTail: ['花影把这句话也染得亮了一点。', '暖风卷着花粉，笑意很容易传开。'],
  },
};
const WORLD_ECOLOGY_HABITAT_LINES: Record<WorldEcologyZone['id'], string[]> = {
  'cool-conifer': [
    '住在偏冷的针叶风口，习惯把呼吸放得很轻。',
    '脚下常有松针和薄雾，喜欢和少数邻居慢慢熟悉。',
  ],
  'mixed-meadow': [
    '长在草甸和阔叶树交界处，最擅长接住路过的风。',
    '身边总有混合的草香和树影，很会和不同性格的树相处。',
  ],
  'blossom-glow': [
    '住在暖色花影里，连枝叶都更容易记住彼此的名字。',
    '花粉和晚霞常一起停在树冠上，说话也会不自觉明亮一些。',
  ],
};

const randomIn = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function getWorldEcologyZone(x: number, worldWidth: number): WorldEcologyZone {
  const width = Math.max(1, worldWidth);
  const ratio = Math.max(0, Math.min(0.9999, x / width));
  return (
    WORLD_ECOLOGY_ZONES.find((zone) => ratio >= zone.startRatio && ratio < zone.endRatio) ??
    WORLD_ECOLOGY_ZONES[WORLD_ECOLOGY_ZONES.length - 1]
  );
}

export function getWorldEcologyAtmosphere(x: number, worldWidth: number): WorldEcologyAtmosphere {
  const zone = getWorldEcologyZone(x, worldWidth);
  return WORLD_ECOLOGY_ATMOSPHERE[zone.id];
}

export function getWorldEcologySocialMood(x: number, worldWidth: number): WorldEcologySocialMood {
  const zone = getWorldEcologyZone(x, worldWidth);
  return WORLD_ECOLOGY_SOCIAL_MOOD[zone.id];
}

export function getWorldEcologyHabitatLine(x: number, worldWidth: number): string {
  const zone = getWorldEcologyZone(x, worldWidth);
  return randomIn(WORLD_ECOLOGY_HABITAT_LINES[zone.id]);
}

export function inferWorldWidthFromPositions(xs: number[]): number {
  if (xs.length === 0) return 5000;
  const maxX = Math.max(...xs);
  return Math.max(5000, maxX + 400);
}

export function pickShapeByWorldEcology(
  x: number,
  worldWidth: number,
  preferredShapeIds: string[] = [],
): TreeShapePreset {
  const zone = getWorldEcologyZone(x, worldWidth);
  const preferred = new Set(preferredShapeIds);
  const zoned = new Set(zone.shapeIds);
  const weighted: TreeShapePreset[] = [];

  PRESET_TREE_SHAPES.forEach((shape) => {
    const inPreferred = preferred.has(shape.id);
    const inZone = zoned.has(shape.id);
    const weight = inPreferred && inZone ? 8 : inZone ? 5 : inPreferred ? 3 : 1;
    for (let i = 0; i < weight; i++) weighted.push(shape);
  });

  return randomIn(weighted);
}
