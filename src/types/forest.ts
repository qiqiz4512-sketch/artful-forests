export type TreePersonality = '温柔' | '睿智' | '顽皮' | '活泼' | '社恐' | '神启';

export enum SocialState {
  IDLE = 'IDLE',
  TALKING = 'TALKING',
  SLEEPING = 'SLEEPING',
}

export type DrawingBrushType = 'watercolor' | 'crayon' | 'pen';

export interface DrawingStroke {
  startPoint: { x: number; y: number };
  points: { x: number; y: number }[];
  color: string;
  brush: DrawingBrushType;
  timestamp: number;
  duration: number;
}

export interface DrawingData {
  timestamp: number;
  strokes: DrawingStroke[];
  width: number;
  height: number;
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
  tag?: string; // 社会标签/称号，如 "脆皮大学生"、"i树人" 等
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
  growthScore: number;
  neighbors: string[];
  isManual: boolean;
  memory: TreeMemory;
  metadata: {
    bio: string;
    lastWords: string;
    chatterbox?: boolean;
    speakingPace?: SpeakingPace;
    drawingData?: DrawingData; // 绘画过程轨迹
    drawingImageData?: string; // 绘画完成后的图像 dataURL
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
  tag?: string;
  personality: string;
  metadata: {
    bio: string;
    lastWords: string;
    chatterbox?: boolean;
    speakingPace?: SpeakingPace;
    drawingData?: DrawingData;
    drawingImageData?: string;
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
  source?: 'auto' | 'user' | 'llm';
  conversationMode?: 'group' | 'direct';
  likes?: number;
  comments?: number;
  isTrending?: boolean;
}

export type SceneInteractionKind = 'energy' | 'prune' | 'memory';
export type SceneInteractionPhase = 'hover' | 'trigger';

export interface SceneInteractionEvent {
  token: number;
  kind: SceneInteractionKind;
  phase: SceneInteractionPhase;
  targetTreeId: string;
  relatedTreeIds: string[];
  createdAt: number;
  source: 'chat-composer';
}

export type SocialWeather = 'sunny' | 'rain' | 'snow' | 'night';
export type NarrativeMode = 'normal' | 'dramatic';
export type SpeakingPace = 'chatterbox' | 'normal' | 'shy';

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
