import type { TreeAgent } from '@/types/forest';

export type GrowthStage = 'Seedling' | 'YoungTree' | 'GreatTree';

export const getGrowthStage = (growthScore: number): GrowthStage => {
  if (growthScore <= 10) return 'Seedling';
  if (growthScore <= 50) return 'YoungTree';
  return 'GreatTree';
};

export const scoreFromDialogue = (message: string): number => {
  const normalized = message.trim();
  if (!normalized) return 1;
  // Blend message count and text length so both short and long talks can grow trees.
  return Math.max(1, Math.ceil(normalized.length / 16));
};

const STAGE_ASSET_SUFFIX: Record<GrowthStage, string> = {
  Seedling: 'seedling',
  YoungTree: 'young-tree',
  GreatTree: 'great-tree',
};

const PERSONALITY_ASSET_KEY: Record<string, string> = {
  温柔: 'gentle',
  睿智: 'sage',
  顽皮: 'playful',
  活泼: 'lively',
  社恐: 'shy',
  神启: 'divine',
};

export const getTreeAssetPath = (input: {
  personality?: string;
  growthStage: GrowthStage;
}) => {
  const personalityKey = PERSONALITY_ASSET_KEY[input.personality ?? ''] ?? 'gentle';
  return `/assets/trees/${personalityKey}_${STAGE_ASSET_SUFFIX[input.growthStage]}.png`;
};

export const getAgentGrowthStage = (agent?: Pick<TreeAgent, 'growthScore'> | null): GrowthStage => {
  return getGrowthStage(agent?.growthScore ?? 0);
};
