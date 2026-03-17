import { WORLD_ECOLOGY_ZONES } from '@/lib/worldEcology';
import type { WorldEcologyZone } from '@/lib/worldEcology';

export interface AudioEnvironmentConfig {
  zoneId: string;
  windFrequency: number; // 风声频率，Hz
  windGain: number; // 风声音量
  birdChirpFrequency: number; // 鸟鸣频率
  birdChirpGain: number; // 鸟鸣音量
  ambientDescription: string;
}

/**
 * 根据森林区域返回音频配置
 */
export const getAudioConfigForZone = (zoneId: string): AudioEnvironmentConfig => {
  const zoneConfigs: Record<string, AudioEnvironmentConfig> = {
    'cool-conifer': {
      zoneId: 'cool-conifer',
      windFrequency: 180, // 凌冽风声
      windGain: 0.35,
      birdChirpFrequency: 4200, // 高频鸟鸣
      birdChirpGain: 0.12,
      ambientDescription: '冷杉林带·凌冽风声',
    },
    'mixed-meadow': {
      zoneId: 'mixed-meadow',
      windFrequency: 120, // 温和风声
      windGain: 0.2,
      birdChirpFrequency: 3500, // 中频虫鸣
      birdChirpGain: 0.18,
      ambientDescription: '混交草甸·温和和鸣',
    },
    'blossom-glow': {
      zoneId: 'blossom-glow',
      windFrequency: 85, // 温和微风
      windGain: 0.15,
      birdChirpFrequency: 2800, // 低频鸟叫
      birdChirpGain: 0.22,
      ambientDescription: '花影暖林·虫鸣暖声',
    },
  };

  return zoneConfigs[zoneId] || zoneConfigs['mixed-meadow'];
};

/**
 * 根据位置(0-1)和世界宽度推断zone
 */
export const getZoneIdFromPosition = (x: number, worldWidth: number): string => {
  if (worldWidth <= 0) return 'mixed-meadow';
  const ratio = x / worldWidth;

  for (const zone of WORLD_ECOLOGY_ZONES) {
    if (ratio >= zone.startRatio && ratio < zone.endRatio) {
      return zone.id;
    }
  }

  return 'mixed-meadow';
};

/**
 * 位置映射到立体声pan值 (-1 左, 0 中, 1 右)
 */
export const calculateStereopan = (x: number, worldWidth: number): number => {
  if (worldWidth <= 0) return 0;
  // 拉伸到 [-1, 1] 范围
  return (x / worldWidth) * 2 - 1;
};

/**
 * 根据世界宽度推断推荐宽度
 */
export const getWorldWidthFromAgentCount = (agentCount: number): number => {
  // 每棵树占用约 800px 的横向空间
  return Math.max(1200, agentCount * 800);
};
