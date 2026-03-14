export type TreePersonality = '温柔' | '睿智' | '顽皮' | '社恐' | '神启';

export enum SocialState {
  IDLE = 'IDLE',
  TALKING = 'TALKING',
  SLEEPING = 'SLEEPING',
}

export interface SocialCircle {
  friends: string[];
  family: string[];
  partner: string | null;
}

export interface AgentInteractionMemory {
  agentId: string;
  personalityImpression: string;
  lastTopic: string;
  timestamp: number;
}

export interface TreeMemory {
  lastTopic: string;
  interactionHistory: AgentInteractionMemory[];
  timestamp: number;
  recallingUntil: number;
}

export interface TreeAgent {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  scale: number;
  zIndex: number;
  personality: string;
  energy: number;
  socialState: SocialState;
  generation: number;
  parents: string[];
  socialCircle: SocialCircle;
  intimacyMap: Record<string, number>;
  growthBoost: number;
  neighbors: string[];
  isManual: boolean;
  memory: TreeMemory;
  metadata: {
    bio: string;
    lastWords: string;
  };
  shape?: {
    id: string;
    svgPathData: string;
    trunkPathData?: string;
    detailPathData?: string;
    colorPalette: {
      trunk: string;
      leaves: string;
      accent?: string;
    };
  };
}

export interface AddTreeInput {
  id: string;
  position: {
    x: number;
    y: number;
  };
  scale: number;
  zIndex: number;
  name: string;
  personality: string;
  metadata: {
    bio: string;
    lastWords: string;
  };
  energy?: number;
  generation?: number;
  parents?: string[];
  socialCircle?: Partial<SocialCircle>;
  intimacyMap?: Record<string, number>;
  growthBoost?: number;
  isManual?: boolean;
  memory?: Partial<TreeMemory>;
  shape?: TreeAgent['shape'];
}

export interface ActiveChat {
  treeAId: string;
  treeBId: string;
  message: string;
}

export interface ChatHistoryEntry {
  id: string;
  speakerId: string;
  listenerId: string;
  message: string;
  createdAt: number;
  type?: 'chat' | 'epic' | 'system';
  likes?: number;
  comments?: number;
  isTrending?: boolean;
}

export type SocialWeather = 'sunny' | 'rain' | 'snow' | 'night';
export type NarrativeMode = 'normal' | 'dramatic';

export interface GlobalSocialEffects {
  silenceUntil: number;
  conversationWeather: SocialWeather;
  narrativeMode: NarrativeMode;
  divineSurgeUntil: number;
}

export interface SceneTreeSnapshot {
  id: string;
  x: number;
  y: number;
  size: number;
  scale: number;
  zIndex: number;
}
