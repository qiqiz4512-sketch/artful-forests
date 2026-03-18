import { useState, useCallback, useRef, useEffect, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeatherType } from '@/components/Particles';
import { useTimeTheme, type TimeMode, type TimeTheme } from '@/hooks/useTimeTheme';
import ParallaxBackground from '@/components/ParallaxBackground';
import Particles from '@/components/Particles';
import SeedButton from '@/components/SeedButton';
import DrawingPanel from '@/components/DrawingPanel';
import WindChime from '@/components/WindChime';
import SummerTemporalEffects from '@/components/SummerTemporalEffects';
import WinterSeasonEffects from '@/components/WinterSeasonEffects';
import BirdSeedFlyover from '@/components/BirdSeedFlyover';
import TreePerchedBirds from '@/components/TreePerchedBirds';
import PlantedTree from '@/components/PlantedTree';
import PlantingGhost from '@/components/PlantingGhost';
import AgentLink from '@/components/AgentLink';
import ChatPanel from '@/components/ChatPanel';
import BgmMushroom from '@/components/BgmMushroom';
import MoveGuideTag from '@/components/MoveGuideTag';
import { useBgmAudio } from '@/components/BgmAudioProvider';
import { toast } from '@/hooks/use-toast';
import TreeSpeciesPanel from '@/components/TreeSpeciesPanel';
import CelestialCelebration from '@/components/CelestialCelebration';
import ForestLoginModal from '@/components/ForestLoginModal';
import { getTreeDepthMetrics } from '@/lib/treeDepth';
import { useForestStore } from '@/stores/useForestStore';
import { ChatHistoryEntry, SceneInteractionEvent, SceneTreeSnapshot, SocialState } from '@/types/forest';
import { useAgentA2A } from '@/hooks/useAgentA2A';
import { useForestEcology } from '@/hooks/useForestEcology';
import { useAutoPlanting, renderTreeShapeToDataUrl } from '@/hooks/useAutoPlanting';
import { generateRandomProfile } from '@/lib/agentProfile';
import { generateClusteredTrees } from '@/lib/forestClusters';
import { fetchAllTreeProfiles, saveConversationMessage, saveRelationshipEvent, saveTreeChatHighlight, saveTreeGrowthEvent, upsertTreeEngagementEvent, upsertTreeProfile, deleteTreeProfile } from '@/lib/treeProfileRepository';
import {
  buildSecondMeAuthorizeUrl,
  clearSecondMeCallbackParams,
  clearSecondMeSession,
  consumeSecondMeState,
  createSecondMeState,
  loadSecondMeSession,
  readSecondMeCallbackParams,
  saveSecondMeSession,
} from '@/lib/secondmeAuth';
import { inferPersonalityFromTags } from '@/lib/secondmePersonalityMapping';
import { supabase } from '@/lib/supabase';
import { getAgentGrowthStage } from '@/lib/treeGrowth';
import { buildRecentU2AHistory, buildTreePersonaSystemMessage, type TreeRuntimeHistoryMessage } from '@/lib/treePersonaRuntime';
import { getWorldEcologyAtmosphere, getWorldEcologyZone, pickShapeByWorldEcology } from '@/lib/worldEcology';

// BGM 自动播放拦截 Toast 组件
function BgmAutoplayBlockedToast() {
  const bgmAudio = useBgmAudio();
  useEffect(() => {
    if (!bgmAudio?.isAutoplayBlocked) return;
    const t = toast({
      title: '🌿 森林之声正在等待唤醒',
      description: '点击森林任意处，唤醒自然之声',
      duration: 8000,
    });
    return () => {
      t.dismiss();
    };
  }, [bgmAudio?.isAutoplayBlocked]);
  return null;
}

interface TreeData {
  id: string;
  imageData: string;
  x: number;
  y: number;
  size: number;
  spawnType: 'manual' | 'auto' | 'ambient';
}

const MIN_CAMERA_ZOOM = 1;
const MAX_CAMERA_ZOOM = 1.28;
const CAMERA_WHEEL_ZOOM_STEP = 0.045;
const WORLD_WIDTH_MIN = 5000;
const WORLD_WIDTH_MULTIPLIER = 5;
const TREE_CULL_BUFFER = 360;
const WORLD_EDGE_HINT_DISTANCE = 420;
const USER_IDLE_THRESHOLD_MS = 120000;
const GUARDIAN_MESSAGE_COOLDOWN_MS = 180000;
const GUARDIAN_MESSAGE = '我一直在看着这片森林，也在等你。';
const FOREST_BGM_AUDIO_URL = '/assets/forest-bgm.mp3';
const FOREST_BGM_ICON_URL = '/assets/bgm-mushroom.png';
const SUPABASE_ANON_PLACEHOLDER = 'your-anon-key';
const SECONDME_OAUTH_AUTHORIZE_URL = import.meta.env.VITE_SECONDME_OAUTH_AUTHORIZE_URL?.trim() ?? 'https://go.second.me/oauth/';
const SECONDME_REDIRECT_URI = import.meta.env.VITE_SECONDME_REDIRECT_URI?.trim() ?? `${window.location.origin}/`;
const SECONDME_RESPONSE_TYPE = import.meta.env.VITE_SECONDME_RESPONSE_TYPE?.trim() ?? 'code';
const SECONDME_SCOPE = import.meta.env.VITE_SECONDME_SCOPE?.trim() ?? 'user.info chat';
const SECONDME_CLIENT_ID = import.meta.env.VITE_SECONDME_CLIENT_ID?.trim() ?? '';
const SECONDME_API_BASE_URL = import.meta.env.VITE_SECONDME_API_BASE_URL?.trim() ?? 'https://api.mindverse.com/gate/lab';
const SECONDME_DEV_EXCHANGE_PATH = '/api/secondme/oauth/exchange';
const SECONDME_CHAT_TIMEOUT_MS = 18000;
const SECONDME_STREAM_MODEL = 'google_ai_studio/gemini-2.0-flash';
const SECONDME_TREE_SESSION_STORAGE_KEY = 'secondme.chat.sessions.byTree';
const FOREST_CHAT_USER_ID = '__forest_user__';
const TREE_SHAKE_MULTI_CLICK_WINDOW_MS = 1600;
const TREE_SHAKE_TRIGGER_COUNT = 2;
const TREE_SHAKE_PROMPT_COOLDOWN_MS = 2200;

const TIME_LABEL_BY_THEME: Record<string, string> = {
  dawn: '晨',
  day: '昼',
  dusk: '暮',
  night: '夜',
};

const PERSONALITY_TIMEOUT_REPLY: Record<string, string[]> = {
  温柔: ['森林里的风太大了，我没听清，能再说一遍吗？', '刚刚那阵风把字叶吹散了，你愿意慢慢再说一次吗？'],
  睿智: ['森林里的风太大了，我没听清，能再说一遍吗？', '我捕捉到一半线索，剩下的请你再说一次。'],
  顽皮: ['森林里的风太大了，我没听清，能再说一遍吗？', '风把答案偷走了，再给我一次机会？'],
  活泼: ['森林里的风太大了，我没听清，能再说一遍吗？', '等等等等，风声太吵了，你再喊我一次！'],
  社恐: ['森林里的风太大了，我没听清，能再说一遍吗？', '对不起，我刚刚有点慌，你能慢一点说吗？'],
  神启: ['森林里的风太大了，我没听清，能再说一遍吗？', '天幕扰动，神谕断线，请再唤我一次。'],
};

type SoftMemoryItem = {
  id?: number;
  factObject?: string;
  factContent?: string;
  updateTime?: number;
};

type TreeLlmPayload = {
  userInput: string;
  treeName: string;
  treePersonality: string;
  forestSeason: string;
  forestTime: string;
  softMemorySnippets: string[];
  systemPrompt: string;
  historyMessages: TreeRuntimeHistoryMessage[];
};

type TreeChatSessionMap = Record<string, string>;

const resolveTreeSessionStorageKey = (userId?: string | null) => {
  if (!userId) return SECONDME_TREE_SESSION_STORAGE_KEY;
  return `${SECONDME_TREE_SESSION_STORAGE_KEY}:${userId}`;
};

const loadTreeChatSessions = (userId?: string | null): TreeChatSessionMap => {
  if (typeof window === 'undefined') return {};
  try {
    const scopedKey = resolveTreeSessionStorageKey(userId);
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw) as TreeChatSessionMap;
      if (parsed && typeof parsed === 'object') return parsed;
    }

    // Backward compatibility: migrate old single-key storage to user-scoped key.
    if (userId) {
      const legacyRaw = localStorage.getItem(SECONDME_TREE_SESSION_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw) as TreeChatSessionMap;
        if (legacyParsed && typeof legacyParsed === 'object') {
          localStorage.setItem(scopedKey, JSON.stringify(legacyParsed));
          return legacyParsed;
        }
      }
    }

    if (!raw) return {};
    const parsed = JSON.parse(raw) as TreeChatSessionMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const saveTreeChatSessions = (sessions: TreeChatSessionMap, userId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(resolveTreeSessionStorageKey(userId), JSON.stringify(sessions));
  } catch {
    // Ignore storage quota and private-mode write failures.
  }
};

// ── Owner ID persistence (survives session expiry) ────────────────────────────
const FOREST_LAST_OWNER_ID_KEY = 'forest.last_owner_id';

const persistOwnerId = (ownerId: string | null) => {
  if (!ownerId) return;
  try { localStorage.setItem(FOREST_LAST_OWNER_ID_KEY, ownerId); } catch { /* quota */ }
};

const loadLastKnownOwnerId = (): string | null => {
  try { return localStorage.getItem(FOREST_LAST_OWNER_ID_KEY); } catch { return null; }
};

// ── Manual tree persistence ──────────────────────────────────────────────────
const FOREST_MANUAL_TREES_KEY = 'forest.manual_trees';
const resolveManualTreesStorageKey = (userId?: string | null) =>
  userId ? `${FOREST_MANUAL_TREES_KEY}:${userId}` : FOREST_MANUAL_TREES_KEY;

interface PersistedManualTreeEntry {
  id: string;
  imageData: string;
  x: number;        // TreeData.x  (worldX - size/2)
  y: number;        // TreeData.y  (worldY - size)
  size: number;
  worldX: number;   // agent.position.x
  worldY: number;   // agent.position.y
  name: string;
  tag?: string;
  personality: string;
  bio: string;
  lastWords: string;
  energy: number;
  generation: number;
  parents: string[];
  socialCircle: { friends: string[]; family: string[]; partner: string | null };
  intimacyMap: Record<string, number>;
  shape?: import('@/types/forest').TreeAgent['shape'];
}

const loadManualTrees = (userId?: string | null): PersistedManualTreeEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(resolveManualTreesStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as PersistedManualTreeEntry[];
    }
    // Fallback: try last known owner ID when current session is expired
    if (!userId) {
      const lastOwnerId = loadLastKnownOwnerId();
      if (lastOwnerId) {
        const fallbackRaw = localStorage.getItem(resolveManualTreesStorageKey(lastOwnerId));
        if (fallbackRaw) {
          const fallbackParsed = JSON.parse(fallbackRaw);
          if (Array.isArray(fallbackParsed)) return fallbackParsed as PersistedManualTreeEntry[];
        }
      }
    }
    return [];
  } catch {
    return [];
  }
};

const saveManualTrees = (entries: PersistedManualTreeEntry[], userId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(resolveManualTreesStorageKey(userId), JSON.stringify(entries));
    if (userId) persistOwnerId(userId);
  } catch {
    // Ignore storage quota and private-mode write failures.
  }
};

// ── Chat history persistence ─────────────────────────────────────────────────
const FOREST_CHAT_HISTORY_KEY = 'forest.chat_history';
const resolveChatHistoryStorageKey = (userId?: string | null) =>
  userId ? `${FOREST_CHAT_HISTORY_KEY}:${userId}` : FOREST_CHAT_HISTORY_KEY;

const loadChatHistory = (userId?: string | null): ChatHistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(resolveChatHistoryStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ChatHistoryEntry[];
    }
    if (!userId) {
      const lastOwnerId = loadLastKnownOwnerId();
      if (lastOwnerId) {
        const fallbackRaw = localStorage.getItem(resolveChatHistoryStorageKey(lastOwnerId));
        if (fallbackRaw) {
          const fallbackParsed = JSON.parse(fallbackRaw);
          if (Array.isArray(fallbackParsed)) return fallbackParsed as ChatHistoryEntry[];
        }
      }
    }
    return [];
  } catch {
    return [];
  }
};

const saveChatHistory = (entries: ChatHistoryEntry[], userId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(resolveChatHistoryStorageKey(userId), JSON.stringify(entries));
    if (userId) persistOwnerId(userId);
  } catch {
    // Ignore storage quota and private-mode write failures.
  }
};
// ─────────────────────────────────────────────────────────────────────────────

const toReadableForestTime = (theme: TimeMode | string) => TIME_LABEL_BY_THEME[theme] ?? String(theme);

const pickTimeoutReply = (personality: string) => {
  const pool = PERSONALITY_TIMEOUT_REPLY[personality] ?? PERSONALITY_TIMEOUT_REPLY['温柔'];
  return pool[Math.floor(Math.random() * pool.length)];
};

const createMessageId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

type TypewriterState = {
  text: string;
  queue: string[];
  done: boolean;
  timerId: number | null;
  waiters: Array<(value: string) => void>;
};

type DialoguePolicy = {
  maxLength: number;
  toneInstruction: string;
  localReplies: string[];
};

const getDialoguePolicy = (personality: string): DialoguePolicy => {
  if (personality === '社恐') {
    return {
      maxLength: 5,
      toneInstruction: '回复极短，只说 1 句，1-5 个字，不要展开解释。',
      localReplies: ['嗯。', '好。', '在。', '收到。', '别急。'],
    };
  }

  if (personality === '活泼' || personality === '顽皮' || personality === '调皮') {
    return {
      maxLength: 200,
      toneInstruction: '回复可以较长，但必须是一段完整、语义通顺的话，禁止输出被截断的半句话、undefined 或 null。',
      localReplies: [
        '你这句话我接得可认真了，我刚刚顺着风想了好几圈，感觉这事不只是在聊天，像是在给今天的森林补一层会发光的注脚。你要是愿意，我可以沿着这个念头继续陪你往下说。',
        '我已经把你的话抱进枝叶里了，说真的，这个问题越想越有意思。它不只是眼前这一件小事，还连着情绪、天气和我们此刻的关系，所以我想慢一点、完整一点地回应你。',
      ],
    };
  }

  return {
    maxLength: 50,
    toneInstruction: '回复控制在 1-2 个完整句子内，语义完整，不要被截断。',
    localReplies: [
      '我听见你了，这句话我会认真收好。',
      '你的意思我明白了，我在这里陪你接着聊。',
      '这件事我先替你记下，我们慢慢说。',
    ],
  };
};

const sanitizeDialogueText = (message?: string | null) => {
  if (typeof message !== 'string') return '';
  return message
    .replace(/\bundefined\b/gi, '')
    .replace(/\bnull\b/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
};

const fitDialogueToPolicy = (message: string, personality: string) => {
  const policy = getDialoguePolicy(personality);
  const clean = sanitizeDialogueText(message);
  const fallback = policy.localReplies[Math.floor(Math.random() * policy.localReplies.length)];
  if (!clean) return fallback;

  const chars = Array.from(clean);
  if (chars.length <= policy.maxLength) return clean;

  const sentences = clean.match(/[^。！？!?]+[。！？!?]?/g)?.map((entry) => entry.trim()).filter(Boolean) ?? [];
  let picked = '';
  for (const sentence of sentences) {
    if (Array.from(`${picked}${sentence}`).length > policy.maxLength) break;
    picked += sentence;
  }

  if (picked) return picked;
  if (policy.maxLength <= 5) return fallback;

  let clipped = chars.slice(0, policy.maxLength).join('').trim();
  const softBreaks = ['。', '！', '？', '，', '、', ',', '；', ';', '：', ':'];
  const lastBreak = Math.max(...softBreaks.map((token) => clipped.lastIndexOf(token)));
  if (lastBreak >= Math.max(0, clipped.length - 12)) {
    clipped = clipped.slice(0, lastBreak + 1).trim();
  }
  if (!/[。！？!?]$/.test(clipped)) {
    clipped = `${clipped.replace(/[，、,；;：:]$/, '')}。`;
  }
  return clipped;
};

function mapAuthErrorMessage(message: string): string {
  const source = message.toLowerCase();

  if (source.includes('invalid login credentials')) return '账号或密码不正确，请重试';
  if (source.includes('email not confirmed')) return '邮箱尚未验证，请先完成邮箱验证';
  if (source.includes('user already registered')) return '该邮箱已注册，请直接登录';
  if (source.includes('password should be at least')) return '密码至少需要 6 位';
  if (source.includes('email address') && source.includes('invalid')) return '邮箱格式不正确';
  if (source.includes('email rate limit exceeded') || source.includes('over_email_send_rate_limit')) return '邮件发送触发限流，请稍后再试或直接登录';
  if (source.includes('invalid state')) return 'SecondMe 登录状态校验失败，请重试';
  if (source.includes('redirect uri')) return 'SecondMe 回调地址不匹配，请检查 VITE_SECONDME_REDIRECT_URI';
  if (source.includes('failed to fetch') || source.includes('cors')) return '登录回调请求被拦截，请检查本地开发代理或 Supabase Edge Function 部署';
  if (source.includes('network')) return '网络异常，请稍后重试';

  return message;
}

type SeasonMode = 'spring' | 'summer' | 'autumn' | 'winter' | 'auto';
type ResolvedSeason = Exclude<SeasonMode, 'auto'>;
type WeatherMode = WeatherType | 'auto';

const seasonOptions: Array<{ value: SeasonMode; label: string; icon: string }> = [
  { value: 'auto',   label: '自动', icon: '🌀' },
  { value: 'spring', label: '春',   icon: '🌱' },
  { value: 'summer', label: '夏',   icon: '☀️' },
  { value: 'autumn', label: '秋',   icon: '🍁' },
  { value: 'winter', label: '冬',   icon: '❄️' },
];

const weatherOptions: Array<{ value: WeatherMode; label: string; icon: string }> = [
  { value: 'auto',  label: '自动', icon: '🌀' },
  { value: 'sunny', label: '晴', icon: '☀️' },
  { value: 'rain',  label: '雨', icon: '🌧️' },
  { value: 'snow',  label: '雪', icon: '❄️' },
];

const timeOptions: Array<{ value: TimeMode; label: string; icon: string }> = [
  { value: 'auto',  label: '自动', icon: '🕰️' },
  { value: 'dawn',  label: '晨',   icon: '🌅' },
  { value: 'day',   label: '昼',   icon: '🌤️' },
  { value: 'dusk',  label: '暮',   icon: '🌇' },
  { value: 'night', label: '夜',   icon: '🌙' },
];

const chipBaseStyle: CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(165, 140, 120, 0.35)',
  padding: '4px 9px',
  fontSize: 12,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  color: 'hsl(28, 24%, 28%)',
};

const resolveSeason = (season: SeasonMode): ResolvedSeason => {
  if (season !== 'auto') return season;
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const resolveWeather = (weather: WeatherMode, season: ResolvedSeason, timeTheme: TimeTheme): WeatherType => {
  if (weather !== 'auto') return weather;
  if (season === 'winter') return 'snow';

  const hour = new Date().getHours();
  const daySeed = new Date().getDate();
  const slot = daySeed + Math.floor(hour / 3);

  if (season === 'spring') return slot % 4 === 0 ? 'rain' : 'sunny';
  if (season === 'summer') return timeTheme === 'dusk' && slot % 5 === 0 ? 'rain' : 'sunny';
  return slot % 5 === 0 ? 'rain' : 'sunny';
};

const seasonLayerFilterMap: Record<ResolvedSeason, string> = {
  spring: 'saturate(1.08) hue-rotate(-4deg) brightness(1.02)',
  summer: 'saturate(1.14) hue-rotate(2deg) brightness(1.03)',
  autumn: 'saturate(1.06) hue-rotate(-16deg) brightness(0.99)',
  winter: 'saturate(0.9) hue-rotate(8deg) brightness(1.01)',
};

const timeHintMap: Record<TimeMode, string> = {
  auto: '自动跟随系统时间',
  dawn: '晨光柔和，适合清新配色',
  day: '白日明亮，画面更通透',
  dusk: '黄昏偏暖，氛围更柔软',
  night: '夜景偏深，萤火更明显',
};

const seasonHintMap: Record<SeasonMode, string> = {
  auto: '自动按当前日期季节播种',
  spring: '春季偏花树与嫩绿树',
  summer: '夏季偏饱满绿冠树',
  autumn: '秋季偏金黄与红枫树',
  winter: '冬季偏松柏与冰雪树',
};

const weatherHintMap: Record<WeatherMode, string> = {
  auto: '自动按当前季节与时段变化',
  sunny: '阳光粒子，整体更轻快',
  rain: '雨滴粒子，空气更湿润',
  snow: '雪花粒子，氛围更安静',
};

function createLegacySampleTreeImage(index: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const treeColors = ['#81C784', '#66BB6A', '#A5D6A7', '#4CAF50', '#388E3C'];
  const trunkColor = '#A1887F';

  // Trunk
  ctx.fillStyle = trunkColor;
  ctx.fillRect(42, 70, 16, 50);

  // Canopy (watercolor-ish blobs)
  ctx.globalAlpha = 0.6;
  const c = treeColors[index % treeColors.length];
  for (let j = 0; j < 8; j++) {
    ctx.beginPath();
    ctx.fillStyle = c;
    ctx.arc(
      50 + (Math.random() - 0.5) * 40,
      40 + (Math.random() - 0.5) * 35,
      12 + Math.random() * 15,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return canvas.toDataURL();
}

export default function Index() {
  const [username, setUsername] = useState<string | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [ssoSubmitting, setSsoSubmitting] = useState(false);
  const [loginErrorPulse, setLoginErrorPulse] = useState(0);
  const [loginPulse, setLoginPulse] = useState(0);
  const [season, setSeason] = useState<SeasonMode>('auto');
  const [timeMode, setTimeMode] = useState<TimeMode>('auto');
  const { theme, colors } = useTimeTheme(timeMode);
  const syncAgentsFromScene = useForestStore((state) => state.syncAgentsFromScene);
  const refreshNeighbors = useForestStore((state) => state.refreshNeighbors);
  const addTree = useForestStore((state) => state.addTree);
  const removeTree = useForestStore((state) => state.removeTree);
  const triggerGlobalSilence = useForestStore((state) => state.triggerGlobalSilence);
  const triggerDivineSurge = useForestStore((state) => state.triggerDivineSurge);
  const setConversationWeather = useForestStore((state) => state.setConversationWeather);
  const activeDialogueAgentId = useForestStore((state) => state.activeDialogueAgentId);
  const setActiveDialogueAgent = useForestStore((state) => state.setActiveDialogueAgent);
  const agents = useForestStore((state) => state.agents);
  const chatHistory = useForestStore((state) => state.chatHistory);
  const sceneInteractionEvent = useForestStore((state) => state.sceneInteractionEvent);
  useAgentA2A();

  const [drawingOpen, setDrawingOpen] = useState(false);
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [plantingImage, setPlantingImage] = useState<string | null>(null);
  const [plantingDrawingData, setPlantingDrawingData] = useState<any>(null); // DrawingData
  const [plantingTreeName, setPlantingTreeName] = useState<string>('');
  const [plantingPersonality, setPlantingPersonality] = useState<string>('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollX, setScrollX] = useState(0);
  const [newTreeId, setNewTreeId] = useState<string | null>(null);
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('auto');
  const [cameraZoom, setCameraZoom] = useState(1);
  const [openPopover, setOpenPopover] = useState<'season' | 'weather' | 'time' | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [focusedTreeId, setFocusedTreeId] = useState<string | null>(null);
  const [chatInputFocusSignal, setChatInputFocusSignal] = useState(0);
  const [treeShakePromptSignalById, setTreeShakePromptSignalById] = useState<Record<string, number>>({});
  const [seedDrift, setSeedDrift] = useState<{ id: string; glyph: '🍃' | '🪶'; fromY: number; toY: number } | null>(null);
  const [celestialEffect, setCelestialEffect] = useState<'meteor' | 'aurora' | null>(null);
  const [divineBloom, setDivineBloom] = useState<{ id: string; x: number; y: number } | null>(null);
  const [treeNotice, setTreeNotice] = useState<{ id: string; text: string; sub: string; emoji: string; treeId?: string; variant?: 'default' | 'divine' } | null>(null);
  const [authCelebration, setAuthCelebration] = useState<{ id: string; title: string; sub: string; emoji: string; variant?: 'default' | 'divine' } | null>(null);
  const resolvedSeason = resolveSeason(season);
  const resolvedWeather = resolveWeather(weatherMode, resolvedSeason, theme);
  const seasonButtonOption = seasonOptions.find((option) => option.value === (season === 'auto' ? resolvedSeason : season))!;
  const weatherButtonOption = weatherOptions.find((option) => option.value === (weatherMode === 'auto' ? resolvedWeather : weatherMode))!;
  const timeButtonOption = timeOptions.find((option) => option.value === (timeMode === 'auto' ? theme : timeMode))!;
  const isSummerDawn = resolvedSeason === 'summer' && theme === 'dawn';
  const isSummerDusk = resolvedSeason === 'summer' && theme === 'dusk';
  const isSpringSeason = resolvedSeason === 'spring';
  const isWinterSeason = resolvedSeason === 'winter';
  const treeLayerFilter = `${seasonLayerFilterMap[resolvedSeason]} ${isSummerDawn ? 'drop-shadow(0 0 8px rgba(255, 232, 168, 0.56)) drop-shadow(0 0 20px rgba(255, 239, 200, 0.4))' : ''} ${isWinterSeason ? 'brightness(0.95) saturate(0.82) hue-rotate(6deg)' : ''}`.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef(0);
  const scrollStart = useRef(0);
  const scrollXRef = useRef(0);
  const focusAnimRef = useRef<number | null>(null);
  const currentSessionOwnerRef = useRef<string | null>(loadSecondMeSession()?.user?.userId ?? null);
  const llmSessionByTreeRef = useRef<TreeChatSessionMap>(loadTreeChatSessions(currentSessionOwnerRef.current));
  const llmInFlightByTreeRef = useRef<Record<string, boolean>>({});
  const typewriterStateByEntryRef = useRef<Record<string, TypewriterState>>({});
  const impatientTreeClickRef = useRef<Record<string, { count: number; lastClickAt: number; lastTriggeredAt: number }>>({});
  const treeNoticeTimerRef = useRef<number | null>(null);
  const authCelebrationTimerRef = useRef<number | null>(null);
  const persistedChatSnapshotRef = useRef<Map<string, string>>(new Map());
  const persistedTreeSnapshotRef = useRef<Map<string, string>>(new Map());
  const relationshipSnapshotRef = useRef<Map<string, { friends: string[]; partner: string | null; parents: string[]; intimacyMap: Record<string, number> }>>(new Map());
  const lastUserActionAtRef = useRef(Date.now());
  const lastGuardianMessageAtRef = useRef(0);
  const growthStageByTreeRef = useRef<Record<string, ReturnType<typeof getAgentGrowthStage>>>({});
  const remoteRestoreOwnerRef = useRef<string | null>(null);
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const worldWidth = Math.max(WORLD_WIDTH_MIN, viewportWidth * WORLD_WIDTH_MULTIPLIER);
  const scrollMin = -Math.max(0, worldWidth - viewportWidth);
  const scrollMax = 0;
  const clampScrollX = useCallback(
    (value: number) => Math.max(scrollMin, Math.min(scrollMax, value)),
    [scrollMax, scrollMin],
  );
  const visibleWorldStartX = Math.max(0, Math.min(worldWidth, -scrollX));
  const visibleWorldEndX = Math.max(0, Math.min(worldWidth, visibleWorldStartX + viewportWidth));
  const visibleWorldCenterX = (visibleWorldStartX + visibleWorldEndX) * 0.5;
  const leftEdgeHintOpacity = Math.max(0, 1 - visibleWorldStartX / WORLD_EDGE_HINT_DISTANCE);
  const rightEdgeDistance = Math.max(0, worldWidth - visibleWorldEndX);
  const rightEdgeHintOpacity = Math.max(0, 1 - rightEdgeDistance / WORLD_EDGE_HINT_DISTANCE);
  const activeEcologyZone = getWorldEcologyZone(visibleWorldCenterX, worldWidth);
  const activeEcologyAtmosphere = getWorldEcologyAtmosphere(visibleWorldCenterX, worldWidth);
  const minPlantY = viewportHeight * 0.55;
  const maxPlantY = viewportHeight * 0.85;
  const authLocked = authInitializing || !username;
  const hasAnonKeyConfigured = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) && import.meta.env.VITE_SUPABASE_ANON_KEY !== SUPABASE_ANON_PLACEHOLDER;
  const hasSecondMeClientConfigured = Boolean(SECONDME_CLIENT_ID);
  const hasSecondMeAuthorizeUrlConfigured = Boolean(SECONDME_OAUTH_AUTHORIZE_URL);
  const hasSecondMeRedirectUriConfigured = Boolean(SECONDME_REDIRECT_URI);
  const authConfigErrorMessage = !hasAnonKeyConfigured
    ? 'Supabase 未配置：请在 .env 设置 VITE_SUPABASE_ANON_KEY'
    : (!hasSecondMeClientConfigured
      ? 'SecondMe 登录未配置：请设置 VITE_SECONDME_CLIENT_ID'
      : (!hasSecondMeAuthorizeUrlConfigured
        ? 'SecondMe 登录未配置：请设置 VITE_SECONDME_OAUTH_AUTHORIZE_URL'
        : (!hasSecondMeRedirectUriConfigured
          ? 'SecondMe 登录未配置：请设置 VITE_SECONDME_REDIRECT_URI'
          : '')));
  const { emissionRateMultiplier } = useForestEcology();
  
  const showTreeNotice = useCallback((text: string, sub: string, emoji: string, durationMs = 3200, treeId?: string, variant: 'default' | 'divine' = 'default') => {
    if (treeNoticeTimerRef.current !== null) {
      window.clearTimeout(treeNoticeTimerRef.current);
    }
    setTreeNotice({ id: `${Date.now()}`, text, sub, emoji, treeId, variant });
    treeNoticeTimerRef.current = window.setTimeout(() => {
      setTreeNotice(null);
      treeNoticeTimerRef.current = null;
    }, durationMs);
  }, []);

  const showAuthCelebration = useCallback((title: string, sub: string, emoji: string, durationMs = 2400, variant: 'default' | 'divine' = 'default') => {
    if (authCelebrationTimerRef.current !== null) {
      window.clearTimeout(authCelebrationTimerRef.current);
    }
    setAuthCelebration({ id: `${Date.now()}`, title, sub, emoji, variant });
    authCelebrationTimerRef.current = window.setTimeout(() => {
      setAuthCelebration(null);
      authCelebrationTimerRef.current = null;
    }, durationMs);
  }, []);

  const showAuthError = useCallback((rawMessage: string) => {
    setLoginError(mapAuthErrorMessage(rawMessage));
    setLoginErrorPulse((prev) => prev + 1);
  }, []);

  const ensureTypewriterState = useCallback((entryId: string): TypewriterState => {
    const existing = typewriterStateByEntryRef.current[entryId];
    if (existing) return existing;
    const nextState: TypewriterState = {
      text: '',
      queue: [],
      done: false,
      timerId: null,
      waiters: [],
    };
    typewriterStateByEntryRef.current[entryId] = nextState;
    return nextState;
  }, []);

  const startTypewriter = useCallback((entryId: string) => {
    const state = ensureTypewriterState(entryId);
    if (state.timerId !== null) return;

    state.timerId = window.setInterval(() => {
      const latest = typewriterStateByEntryRef.current[entryId];
      if (!latest) return;

      if (latest.queue.length > 0) {
        const emitCount = Math.min(2, latest.queue.length);
        const nextChunk = latest.queue.splice(0, emitCount).join('');
        latest.text += nextChunk;
        useForestStore.getState().updateChatHistoryEntryMessage(entryId, latest.text);
      }

      if (latest.queue.length === 0 && latest.done) {
        if (latest.timerId !== null) {
          window.clearInterval(latest.timerId);
          latest.timerId = null;
        }
        const resolvedText = latest.text;
        latest.waiters.forEach((resolve) => resolve(resolvedText));
        delete typewriterStateByEntryRef.current[entryId];
      }
    }, 22);
  }, [ensureTypewriterState]);

  const pushTypewriterChunk = useCallback((entryId: string, chunk: string) => {
    if (!chunk) return;
    const state = ensureTypewriterState(entryId);
    state.queue.push(...Array.from(chunk));
    startTypewriter(entryId);
  }, [ensureTypewriterState, startTypewriter]);

  const completeTypewriterEntry = useCallback(async (entryId: string) => {
    const state = ensureTypewriterState(entryId);
    state.done = true;
    startTypewriter(entryId);

    if (state.timerId === null && state.queue.length === 0) {
      return state.text;
    }

    return new Promise<string>((resolve) => {
      const latest = ensureTypewriterState(entryId);
      latest.waiters.push(resolve);
    });
  }, [ensureTypewriterState, startTypewriter]);

  const flushTypewriterImmediately = useCallback((entryId: string, finalText: string) => {
    const state = typewriterStateByEntryRef.current[entryId];
    if (state?.timerId !== null) {
      window.clearInterval(state.timerId);
    }
    if (state) {
      state.waiters.forEach((resolve) => resolve(finalText));
      delete typewriterStateByEntryRef.current[entryId];
    }
    useForestStore.getState().updateChatHistoryEntryMessage(entryId, finalText);
  }, []);

  // 恢复被挂起的 AudioContext（浏览器自动播放限制）
  useEffect(() => {
    const restoreAudioEnvironments = () => {
      try {
        // 恢复所有存活的 Web Audio API 上下文
        if (typeof window !== 'undefined') {
          // 收集所有注册的实例
          const potentialContexts: AudioContext[] = [];
          
          if (Array.isArray((window as any).__audioInstances)) {
            potentialContexts.push(...((window as any).__audioInstances as AudioContext[]));
          }
          
          // 逐个检查并恢复
          for (const ctx of potentialContexts) {
            if (ctx && typeof ctx.resume === 'function' && ctx.state === 'suspended') {
              void ctx.resume().catch(() => {
                // 忽略恢复失败
              });
            }
          }
        }
      } catch (e) {
        // 忽略任何错误
      }
    };

    // 在任何用户交互时恢复 AudioContext
    const handleUserInteraction = () => {
      restoreAudioEnvironments();
    };

    // 绑定关键交互事件（non-passive 以确保捕获）
    document.addEventListener('click', handleUserInteraction, false);
    document.addEventListener('touchstart', handleUserInteraction, false);
    document.addEventListener('keydown', handleUserInteraction, false);
    document.addEventListener('mousedown', handleUserInteraction, false);
    window.addEventListener('focus', handleUserInteraction, false);

    // 初始化时也尝试一次
    setTimeout(() => restoreAudioEnvironments(), 100);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('mousedown', handleUserInteraction);
      window.removeEventListener('focus', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (chatHistory.length === 0) return;
    const latest = chatHistory[chatHistory.length - 1];
    if (!latest?.id || !latest.message?.trim()) return;

    const previousMessage = persistedChatSnapshotRef.current.get(latest.id);
    if (previousMessage === latest.message) return;
    persistedChatSnapshotRef.current.set(latest.id, latest.message);

    // Sync chat history to localStorage
    const ownerId = loadSecondMeSession()?.user?.userId ?? loadLastKnownOwnerId();
    saveChatHistory(chatHistory, ownerId);

    const partnerName = agents.find((agent) => agent.id === latest.listenerId)?.name;
    void saveTreeChatHighlight(latest, partnerName);
    if ((latest.likes ?? 0) > 0 || (latest.comments ?? 0) > 0 || latest.isTrending) {
      void upsertTreeEngagementEvent(latest);
    }
  }, [agents, chatHistory]);

  useEffect(() => {
    const treeById = new Map(trees.map((tree) => [tree.id, tree]));
    const manualAgents = agents.filter((agent) => agent.isManual);
    for (const agent of manualAgents) {
      const renderedTree = treeById.get(agent.id);
      const sceneState = renderedTree
        ? {
            renderSize: renderedTree.size,
            positionX: agent.position.x,
            positionY: agent.position.y,
            spawnType: renderedTree.spawnType,
          }
        : {
            positionX: agent.position.x,
            positionY: agent.position.y,
          };
      const snapshot = JSON.stringify({
        name: agent.name,
        personality: agent.personality,
        energy: agent.energy,
        generation: agent.generation,
        growthScore: agent.growthScore,
        parents: agent.parents,
        socialCircle: agent.socialCircle,
        intimacyMap: agent.intimacyMap,
        bio: agent.metadata.bio,
        lastWords: agent.metadata.lastWords,
        sceneState,
      });
      if (persistedTreeSnapshotRef.current.get(agent.id) === snapshot) continue;
      persistedTreeSnapshotRef.current.set(agent.id, snapshot);
      void upsertTreeProfile(agent, { sceneState });
    }

    // Sync manual tree state changes to localStorage
    if (manualAgents.length > 0) {
      const ownerId = loadSecondMeSession()?.user?.userId ?? loadLastKnownOwnerId();
      const existingLocal = loadManualTrees(ownerId);
      const localById = new Map(existingLocal.map((e) => [e.id, e]));
      let changed = false;
      for (const agent of manualAgents) {
        const existing = localById.get(agent.id);
        if (!existing) continue; // not yet in localStorage (will be added at plant time)
        const renderedTree = treeById.get(agent.id);
        const updatedEntry: PersistedManualTreeEntry = {
          ...existing,
          worldX: agent.position.x,
          worldY: agent.position.y,
          name: agent.name,
          tag: agent.tag,
          personality: agent.personality,
          bio: agent.metadata.bio,
          lastWords: agent.metadata.lastWords,
          energy: agent.energy,
          generation: agent.generation,
          parents: agent.parents,
          socialCircle: agent.socialCircle,
          intimacyMap: agent.intimacyMap,
          shape: agent.shape,
          size: renderedTree?.size ?? existing.size,
          x: renderedTree ? agent.position.x - renderedTree.size / 2 : existing.x,
          y: renderedTree ? agent.position.y - renderedTree.size : existing.y,
        };
        const prev = JSON.stringify(existing);
        const next = JSON.stringify(updatedEntry);
        if (prev !== next) {
          localById.set(agent.id, updatedEntry);
          changed = true;
        }
      }
      if (changed) {
        saveManualTrees([...localById.values()], ownerId);
      }
    }
  }, [agents, trees]);

  useEffect(() => {
    if (agents.length === 0) return;

    const nextSnapshot = new Map(
      agents.map((agent) => [
        agent.id,
        {
          friends: [...agent.socialCircle.friends].sort(),
          partner: agent.socialCircle.partner ?? null,
          parents: [...agent.parents].sort(),
          intimacyMap: { ...agent.intimacyMap },
        },
      ]),
    );

    if (relationshipSnapshotRef.current.size === 0) {
      relationshipSnapshotRef.current = nextSnapshot;
      return;
    }

    for (const agent of agents) {
      const prev = relationshipSnapshotRef.current.get(agent.id);
      if (!prev) continue;

      const newFriends = agent.socialCircle.friends.filter((id) => !prev.friends.includes(id));
      for (const friendId of newFriends) {
        const friendName = agents.find((candidate) => candidate.id === friendId)?.name ?? '树友';
        void saveRelationshipEvent({
          treeId: agent.id,
          relatedTreeId: friendId,
          eventType: 'friend_added',
          eventLabel: '结识新朋友',
          detail: {
            friendName,
            intimacy: agent.intimacyMap[friendId] ?? 0,
          },
        });
      }

      if (agent.socialCircle.partner !== prev.partner) {
        if (agent.socialCircle.partner) {
          const partnerName = agents.find((candidate) => candidate.id === agent.socialCircle.partner)?.name ?? '伴侣';
          void saveRelationshipEvent({
            treeId: agent.id,
            relatedTreeId: agent.socialCircle.partner,
            eventType: 'partner_bound',
            eventLabel: '缔结伴侣关系',
            detail: { partnerName },
          });
        } else if (prev.partner) {
          const formerPartnerName = agents.find((candidate) => candidate.id === prev.partner)?.name ?? '伴侣';
          void saveRelationshipEvent({
            treeId: agent.id,
            relatedTreeId: prev.partner,
            eventType: 'partner_cleared',
            eventLabel: '伴侣关系结束',
            detail: { formerPartnerName },
          });
        }
      }

      const newParents = agent.parents.filter((id) => !prev.parents.includes(id));
      for (const parentId of newParents) {
        const parentName = agents.find((candidate) => candidate.id === parentId)?.name ?? '家族成员';
        void saveRelationshipEvent({
          treeId: agent.id,
          relatedTreeId: parentId,
          eventType: 'parent_added',
          eventLabel: '家族关系登记',
          detail: { parentName },
        });
      }

      for (const [relatedTreeId, intimacy] of Object.entries(agent.intimacyMap)) {
        const prevIntimacy = prev.intimacyMap[relatedTreeId] ?? 0;
        if (prevIntimacy < 85 && intimacy >= 85) {
          const relatedName = agents.find((candidate) => candidate.id === relatedTreeId)?.name ?? '树友';
          void saveRelationshipEvent({
            treeId: agent.id,
            relatedTreeId,
            eventType: 'intimacy_milestone',
            eventLabel: '亲密度突破 85%',
            detail: { relatedName, intimacy },
          });
        }
      }
    }

    relationshipSnapshotRef.current = nextSnapshot;
  }, [agents]);

  const exchangeSecondMeCode = useCallback(async (code: string) => {
    if (import.meta.env.DEV) {
      const response = await fetch(SECONDME_DEV_EXCHANGE_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: SECONDME_REDIRECT_URI,
          clientId: SECONDME_CLIENT_ID,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.details?.message ?? payload?.message ?? payload?.error ?? 'SecondMe 本地代理换 token 失败');
      }

      return payload;
    }

    const { data, error } = await supabase.functions.invoke('secondme-oauth-exchange', {
      body: {
        code,
        redirectUri: SECONDME_REDIRECT_URI,
        clientId: SECONDME_CLIENT_ID,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }, []);

  useEffect(() => {
    let active = true;

    const syncUser = async () => {
      if (authConfigErrorMessage) {
        if (!active) return;
        setUsername(null);
        setLoginModalOpen(true);
        setAuthInitializing(false);
        return;
      }

      const callback = readSecondMeCallbackParams();
      if (callback.error) {
        clearSecondMeCallbackParams();
        if (!active) return;
        showAuthError(callback.errorDescription ?? callback.error);
        setUsername(null);
        setLoginModalOpen(true);
        setAuthInitializing(false);
        return;
      }

      if (callback.code) {
        const expectedState = consumeSecondMeState();
        if (!callback.state || !expectedState || callback.state !== expectedState) {
          clearSecondMeCallbackParams();
          if (!active) return;
          showAuthError('invalid state');
          setUsername(null);
          setLoginModalOpen(true);
          setAuthInitializing(false);
          return;
        }

        setSsoSubmitting(true);
        setLoginError('');

        clearSecondMeCallbackParams();
        if (!active) return;

        let data: Awaited<ReturnType<typeof exchangeSecondMeCode>> | null = null;
        try {
          data = await exchangeSecondMeCode(callback.code);
        } catch (error) {
          showAuthError(error instanceof Error ? error.message : 'SecondMe 登录失败');
          setUsername(null);
          setLoginModalOpen(true);
          setAuthInitializing(false);
          setSsoSubmitting(false);
          return;
        }

        if (!data?.accessToken) {
          showAuthError('SecondMe token 交换失败，请检查 Client ID / Client Secret / redirect_uri');
          setUsername(null);
          setLoginModalOpen(true);
          setAuthInitializing(false);
          setSsoSubmitting(false);
          return;
        }

        const session = saveSecondMeSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: Number(data.expiresIn ?? 0),
          scope: data.scope,
          user: data.user ?? null,
        });

        if (session.user?.userId) persistOwnerId(session.user.userId);
        const finalName = session.user?.name ?? session.user?.route ?? session.user?.email ?? '森林旅人';
        setUsername(finalName);
        setLoginModalOpen(false);
        setAuthInitializing(false);
        setSsoSubmitting(false);
        setLoginPulse((prev) => prev + 1);
        showAuthCelebration(`欢迎回来，${finalName}`, `已激活 SecondMe 通行证`, '🎐', 2600);
        return;
      }

      const session = loadSecondMeSession();
      if (!active) return;

      if (!session) {
        setUsername(null);
        setLoginModalOpen(true);
        setAuthInitializing(false);
        return;
      }

      if (session.user?.userId) persistOwnerId(session.user.userId);
      const finalName = session.user?.name ?? session.user?.route ?? session.user?.email ?? '森林旅人';
      setUsername(finalName);
      setLoginModalOpen(false);
      setAuthInitializing(false);
    };

    void syncUser();

    return () => {
      active = false;
    };
  }, [SECONDME_CLIENT_ID, authConfigErrorMessage, showAuthCelebration, showAuthError, showTreeNotice]);

  useEffect(() => {
    if (authLocked) {
      setLoginModalOpen(true);
    }
  }, [authLocked]);

  useEffect(() => {
    const currentSession = loadSecondMeSession();
    const ownerId = currentSession?.user?.userId ?? null;
    currentSessionOwnerRef.current = ownerId;
    llmSessionByTreeRef.current = loadTreeChatSessions(ownerId);
  }, [username]);

  const handleLoginEntry = useCallback(async (): Promise<'login-success' | 'logout' | 'noop'> => {
    if (ssoSubmitting) return 'noop';

    if (username) {
      clearSecondMeSession();
      setUsername(null);
      setLoginModalOpen(true);
      showTreeNotice('已退出登录', '你的森林身份已暂时离线', '👋', 2200);
      return 'logout';
    }

    setLoginError('');
    setLoginModalOpen(true);
    return 'noop';
  }, [showAuthError, showTreeNotice, ssoSubmitting, username]);

  const handleSecondMeSso = useCallback(async () => {
    if (ssoSubmitting) return;

    if (authConfigErrorMessage) {
      showAuthError(authConfigErrorMessage);
      return;
    }

    // 检测 origin 不匹配：当前页面 origin 与 redirect_uri origin 不一致时，
    // OAuth 回调后 sessionStorage 会因 origin 不同而读取失败，导致 state 校验错误
    try {
      const redirectOrigin = new URL(SECONDME_REDIRECT_URI).origin;
      if (window.location.origin !== redirectOrigin) {
        showAuthError(
          `当前访问地址 (${window.location.origin}) 与回调地址不一致，请改用 ${redirectOrigin} 打开本页后重试`
        );
        return;
      }
    } catch {
      // SECONDME_REDIRECT_URI 解析失败时忽略，继续流程
    }

    setSsoSubmitting(true);
    setLoginError('');

    try {
      const state = createSecondMeState();
      const authorizeUrl = buildSecondMeAuthorizeUrl({
        authorizeUrl: SECONDME_OAUTH_AUTHORIZE_URL,
        clientId: SECONDME_CLIENT_ID,
        redirectUri: SECONDME_REDIRECT_URI,
        responseType: SECONDME_RESPONSE_TYPE,
        scope: SECONDME_SCOPE,
        state,
      });

      window.location.assign(authorizeUrl);
    } finally {
      setSsoSubmitting(false);
    }
  }, [authConfigErrorMessage, showAuthError, ssoSubmitting]);

  const handleCancelLogin = useCallback(() => {
    if (authLocked) return;
    setLoginModalOpen(false);
    setLoginError('');
  }, [authLocked]);

  const {
    isAutoPlanting,
    startAutoPlanting,
    stopAutoPlanting,
  } = useAutoPlanting({
    autoPlantInterval: 15,
    autoStart: true,
    minYRatio: 0.55,
    maxYRatio: 0.85,
    minXRatio: 0,
    maxXRatio: 1,
    worldWidth,
    visibleSpawnProbability: 0.8,
    visibleRange: { startX: visibleWorldStartX, endX: visibleWorldEndX },
    season,
    onTreeAdded: (payload) => {
      setTrees((prev) => [
        ...prev,
        {
          id: payload.id,
          imageData: payload.imageData,
          x: payload.x - payload.size / 2,
          y: payload.y - payload.size,
          size: payload.size,
          spawnType: 'auto',
        },
      ]);
      setNewTreeId(payload.id);
      window.setTimeout(() => setNewTreeId((current) => (current === payload.id ? null : current)), 1200);

      if (payload.source === 'birth') {
        showTreeNotice(
          `${payload.profile.name} 发芽了`,
          `性格：${payload.profile.personality} · 新生代幼苗`,
          '🌿',
          10_000,
          payload.id,
        );
      } else {
        showTreeNotice(
          `${payload.profile.name} 飘落此地`,
          `性格：${payload.profile.personality} · 随风而来`,
          '🍃',
          10_000,
          payload.id,
        );
      }

      if (payload.source === 'external') {
        const driftId = `seed-drift-${payload.id}`;
        setSeedDrift({
          id: driftId,
          glyph: Math.random() < 0.5 ? '🍃' : '🪶',
          fromY: 42 + Math.random() * 110,
          toY: 180 + Math.random() * 180,
        });
        window.setTimeout(() => {
          setSeedDrift((current) => (current?.id === driftId ? null : current));
        }, 1900);
      }
    },
  });

  useEffect(() => {
    const nextWeather: WeatherType | 'night' = theme === 'night' ? 'night' : resolvedWeather;
    setConversationWeather(nextWeather);
  }, [resolvedWeather, setConversationWeather, theme]);

  useEffect(() => {
    scrollXRef.current = scrollX;
  }, [scrollX]);

  useEffect(() => {
    return () => {
      if (focusAnimRef.current !== null) {
        window.cancelAnimationFrame(focusAnimRef.current);
      }
      if (treeNoticeTimerRef.current !== null) {
        window.clearTimeout(treeNoticeTimerRef.current);
      }
      if (authCelebrationTimerRef.current !== null) {
        window.clearTimeout(authCelebrationTimerRef.current);
      }
      Object.values(typewriterStateByEntryRef.current).forEach((state) => {
        if (state.timerId !== null) {
          window.clearInterval(state.timerId);
        }
      });
      typewriterStateByEntryRef.current = {};
    };
  }, []);

  useEffect(() => {
    const prevStages = growthStageByTreeRef.current;
    const nextStages: Record<string, ReturnType<typeof getAgentGrowthStage>> = {};

    for (const agent of agents) {
      const stage = getAgentGrowthStage(agent);
      nextStages[agent.id] = stage;

      const prev = prevStages[agent.id];
      if (!prev || prev === stage) continue;

      setCelestialEffect(Math.random() < 0.5 ? 'meteor' : 'aurora');
      window.setTimeout(() => setCelestialEffect(null), 4000);

      const stageLabel = stage === 'GreatTree' ? '古树' : stage === 'YoungTree' ? '青年树' : '幼苗';
      void saveTreeGrowthEvent({
        treeId: agent.id,
        stage,
        growthScore: agent.growthScore,
        summary: `${agent.name.replace(/\d+/g, '')} 进化为${stageLabel}`,
        detail: {
          stageLabel,
          previousStage: prev,
          nextStage: stage,
        },
      });
      showTreeNotice(
        `${agent.name.replace(/\d+/g, '')} 进化了`,
        `成长阶段已提升为 ${stageLabel}`,
        '✨',
        2800,
        agent.id,
      );
    }

    growthStageByTreeRef.current = nextStages;
  }, [agents, showTreeNotice]);

  // Horizontal drag-to-scroll
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (plantingImage) return;
    if (focusAnimRef.current !== null) {
      window.cancelAnimationFrame(focusAnimRef.current);
      focusAnimRef.current = null;
    }
    isDragging.current = true;
    dragStart.current = e.clientX;
    scrollStart.current = scrollX;
  }, [scrollX, plantingImage]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current) * 0.6; // damping
    setScrollX(clampScrollX(scrollStart.current + dx));
  }, [clampScrollX]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (drawingOpen || plantingImage) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? CAMERA_WHEEL_ZOOM_STEP : -CAMERA_WHEEL_ZOOM_STEP;
    setCameraZoom((z) => Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, z + delta)));
  }, [drawingOpen, plantingImage]);

  const focusTreeById = useCallback((treeId: string) => {
    const target = trees.find((tree) => tree.id === treeId);
    if (!target) return;
    setActiveDialogueAgent(treeId);
    setChatInputFocusSignal((value) => value + 1);

    const screenCenterX = window.innerWidth * 0.5;
    const targetCenterX = target.x + target.size / 2;
    const nextScrollX = clampScrollX(screenCenterX - targetCenterX);

    if (focusAnimRef.current !== null) {
      window.cancelAnimationFrame(focusAnimRef.current);
      focusAnimRef.current = null;
    }

    const from = scrollXRef.current;
    const to = nextScrollX;
    const duration = 520;
    const startAt = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - startAt;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const current = from + (to - from) * eased;
      setScrollX(current);

      if (progress < 1) {
        focusAnimRef.current = window.requestAnimationFrame(tick);
      } else {
        focusAnimRef.current = null;
      }
    };

    focusAnimRef.current = window.requestAnimationFrame(tick);

    setFocusedTreeId(treeId);
    window.setTimeout(() => {
      setFocusedTreeId((current) => (current === treeId ? null : current));
    }, 1800);
  }, [clampScrollX, setActiveDialogueAgent, trees]);

  const handleTreeActivate = useCallback((treeId: string) => {
    const targetAgent = agents.find((agent) => agent.id === treeId);
    const isAwaitingReply = Boolean(
      targetAgent
      && activeDialogueAgentId === treeId
      && (llmInFlightByTreeRef.current[treeId] || targetAgent.socialState === SocialState.TALKING),
    );

    if (isAwaitingReply) {
      const now = Date.now();
      const prev = impatientTreeClickRef.current[treeId] ?? {
        count: 0,
        lastClickAt: 0,
        lastTriggeredAt: 0,
      };
      const nextCount = now - prev.lastClickAt <= TREE_SHAKE_MULTI_CLICK_WINDOW_MS ? prev.count + 1 : 1;
      const canTrigger = nextCount >= TREE_SHAKE_TRIGGER_COUNT && now - prev.lastTriggeredAt >= TREE_SHAKE_PROMPT_COOLDOWN_MS;

      impatientTreeClickRef.current[treeId] = {
        count: canTrigger ? 0 : nextCount,
        lastClickAt: now,
        lastTriggeredAt: canTrigger ? now : prev.lastTriggeredAt,
      };

      if (canTrigger) {
        setTreeShakePromptSignalById((current) => ({
          ...current,
          [treeId]: (current[treeId] ?? 0) + 1,
        }));
      }
    } else {
      impatientTreeClickRef.current[treeId] = {
        count: 0,
        lastClickAt: 0,
        lastTriggeredAt: 0,
      };
    }

    setActiveDialogueAgent(treeId);
    setChatInputFocusSignal((value) => value + 1);
    setFocusedTreeId(treeId);
    window.setTimeout(() => {
      setFocusedTreeId((current) => (current === treeId ? null : current));
    }, 1800);
    if (chatCollapsed) {
      setChatCollapsed(false);
    }
  }, [activeDialogueAgentId, agents, chatCollapsed, setActiveDialogueAgent]);

  const handleDeleteTree = useCallback((treeId: string) => {
    // Remove from local trees state
    setTrees((current) => current.filter((tree) => tree.id !== treeId));
    // Remove from forest store
    removeTree(treeId);
    // Remove from localStorage
    const ownerId = loadSecondMeSession()?.user?.userId ?? null;
    const existing = loadManualTrees(ownerId);
    saveManualTrees(existing.filter((entry) => entry.id !== treeId), ownerId);
    // Remove from Supabase (best-effort)
    void deleteTreeProfile(treeId);
    // Clear active state if this was the focused/active tree
    if (activeDialogueAgentId === treeId) setActiveDialogueAgent(null);
    setFocusedTreeId((current) => current === treeId ? null : current);
  }, [activeDialogueAgentId, removeTree, setActiveDialogueAgent]);

  const fetchSoftMemorySnippets = useCallback(async (accessToken: string, keyword: string): Promise<string[]> => {
    const query = new URLSearchParams({
      pageNo: '1',
      pageSize: '5',
      keyword: keyword.slice(0, 20),
    });

    try {
      const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/softmemory?${query.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.code !== 0) return [];

      const list = (payload?.data?.list ?? []) as SoftMemoryItem[];
      return list
        .slice(0, 3)
        .map((item) => `${item.factObject ?? '记忆'}：${item.factContent ?? ''}`.trim())
        .filter((entry) => entry.length > 0);
    } catch {
      return [];
    }
  }, []);

  const streamSecondMeChat = useCallback(async (args: {
    accessToken: string;
    sessionOwnerUserId: string | null;
    payload: TreeLlmPayload;
    targetTreeId: string;
    onDeltaChunk: (deltaChunk: string) => void;
  }) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SECONDME_CHAT_TIMEOUT_MS);
    const previousSessionId = llmSessionByTreeRef.current[args.targetTreeId];

    try {
      const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/chat/stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: args.payload.userInput,
          messages: [
            { role: 'system', content: args.payload.systemPrompt },
            ...args.payload.historyMessages,
            { role: 'user', content: args.payload.userInput },
          ],
          model: SECONDME_STREAM_MODEL,
          sessionId: previousSessionId,
          systemPrompt: args.payload.systemPrompt,
          context: {
            treePersonality: args.payload.treePersonality,
            forestSeason: args.payload.forestSeason,
            forestTime: args.payload.forestTime,
            softMemorySnippets: args.payload.softMemorySnippets,
            historyMessages: args.payload.historyMessages,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('secondme_stream_failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = '';
      let accumulated = '';

      const processChunk = (chunk: string) => {
        const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) return false;

        let eventName = 'data';
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
            continue;
          }
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const dataText = dataLines.join('');
        if (!dataText) return false;
        if (dataText === '[DONE]') return true;

        if (eventName === 'session') {
          const sessionPayload = JSON.parse(dataText) as { sessionId?: string };
          if (sessionPayload.sessionId) {
            llmSessionByTreeRef.current[args.targetTreeId] = sessionPayload.sessionId;
            saveTreeChatSessions(llmSessionByTreeRef.current, args.sessionOwnerUserId);
          }
          return false;
        }

        const payload = JSON.parse(dataText) as {
          choices?: Array<{ delta?: { content?: string } }>;
          delta?: { content?: string };
          content?: string;
        };
        const deltaText = payload.choices?.[0]?.delta?.content ?? payload.delta?.content ?? payload.content ?? '';
        if (!deltaText) return false;

        accumulated += deltaText;
        args.onDeltaChunk(deltaText);
        return false;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });
        const frames = buffered.split('\n\n');
        buffered = frames.pop() ?? '';

        for (const frame of frames) {
          const ended = processChunk(frame);
          if (ended) {
            return accumulated;
          }
        }
      }

      if (buffered.trim()) {
        processChunk(buffered);
      }

      return accumulated;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  const handleSendMessageToTree = useCallback(async (message: string, targetTreeId: string): Promise<boolean> => {
    const content = message.trim();
    console.log('[SendMessage/U2A] 开始处理私聊消息，目标树ID:', targetTreeId, '消息长度:', content.length);
    if (!content || !targetTreeId) {
      console.log('[SendMessage/U2A] 内容或目标树ID为空，返回false');
      return false;
    }

    if (llmInFlightByTreeRef.current[targetTreeId]) {
      console.log('[SendMessage/U2A] 该树已有LLM请求在进行中，返回false');
      return false;
    }

    const store = useForestStore.getState();
    const session = loadSecondMeSession();
    const sessionOwnerUserId = session?.user?.userId ?? null;
    console.log('[SendMessage/U2A] 已加载会话，AccessToken存在:', !!session?.accessToken, 'UserID:', sessionOwnerUserId);
    
    if (currentSessionOwnerRef.current !== sessionOwnerUserId) {
      currentSessionOwnerRef.current = sessionOwnerUserId;
      llmSessionByTreeRef.current = loadTreeChatSessions(sessionOwnerUserId);
      console.log('[SendMessage/U2A] 会话用户已更新');
    }
    const manualTree = [...store.agents].reverse().find((agent) => agent.isManual);
    const targetTree = store.agents.find((agent) => agent.id === targetTreeId);
    if (!targetTree) {
      console.log('[SendMessage/U2A] 目标树不存在，返回false');
      return false;
    }

    console.log('[SendMessage/U2A] 找到目标树:', targetTree.name, '，开始记录消息');
    store.setActiveDialogueAgent(targetTreeId);

    const userSpeakerId = manualTree?.id ?? FOREST_CHAT_USER_ID;
    const userListenerId = targetTree.id;
    const userMessage = content;

    const userEntryId = createMessageId('user');
    const userEntryCreatedAt = Date.now();
    store.addChatHistoryEntry({
      id: userEntryId,
      createdAt: userEntryCreatedAt,
      speakerId: userSpeakerId,
      listenerId: userListenerId,
      message: userMessage,
      type: 'chat',
      source: 'user',
      conversationMode: 'direct',
    });
    console.log('[SendMessage/U2A] 用户消息已记录到本地，ID:', userEntryId);
    
    void saveConversationMessage({
      chatEntryId: userEntryId,
      speakerTreeId: userSpeakerId,
      listenerTreeId: userListenerId,
      message: userMessage,
      sourceType: 'user',
      conversationMode: 'direct',
      createdAt: userEntryCreatedAt,
    });
    if (manualTree) {
      store.recordDialogueMemory(manualTree.id, targetTree.id, content);
      store.setLastWordsFor([manualTree.id], content);
    }
    store.setActiveChat({
      treeAId: manualTree?.id ?? targetTree.id,
      treeBId: targetTree.id,
      message: userMessage,
    });

    if (!session?.accessToken) {
      const notice = '请先完成 SecondMe 登录，再和树进行 AI 对话。';
      console.log('[SendMessage/U2A] 认证或树设置失败:', notice);
      showTreeNotice('AI 对话未就绪', notice, '🌱', 2400);
      // ✅ 修复：消息已经被本地记录，所以返回true让输入框清空
      return true;
    }

    llmInFlightByTreeRef.current[targetTreeId] = true;
    impatientTreeClickRef.current[targetTreeId] = {
      count: 0,
      lastClickAt: 0,
      lastTriggeredAt: 0,
    };
    store.setSocialStateFor([targetTree.id], SocialState.TALKING);

    const replyEntryId = createMessageId('llm');
    const replyEntryCreatedAt = Date.now();
    store.addChatHistoryEntry({
      id: replyEntryId,
      createdAt: replyEntryCreatedAt,
      speakerId: targetTree.id,
      listenerId: manualTree?.id ?? FOREST_CHAT_USER_ID,
      message: '',
      type: 'chat',
      source: 'llm',
      conversationMode: 'direct',
    });
    console.log('[SendMessage/U2A] 已创建LLM回复占位符，ID:', replyEntryId);

    try {
      console.log('[SendMessage/U2A] 开始获取软记忆和历史消息');
      const softMemorySnippets = await fetchSoftMemorySnippets(
        session.accessToken,
        `${targetTree.name} ${content}`,
      );
      console.log('[SendMessage/U2A] 获取软记忆成功，数量:', softMemorySnippets.length);
      
      const historyMessages = buildRecentU2AHistory({
        history: store.chatHistory,
        targetTreeId: targetTree.id,
        userSpeakerId: manualTree?.id ?? FOREST_CHAT_USER_ID,
        limit: 5,
        excludeEntryId: userEntryId,
      });
      console.log('[SendMessage/U2A] 获取历史消息成功，数量:', historyMessages.length);

      const llmPayload: TreeLlmPayload = {
        userInput: content,
        treeName: targetTree.name,
        treePersonality: targetTree.personality,
        forestSeason: resolvedSeason,
        forestTime: toReadableForestTime(theme),
        softMemorySnippets,
        historyMessages,
        systemPrompt: buildTreePersonaSystemMessage({
          tree: targetTree,
          forestSeason: resolvedSeason,
          forestTime: toReadableForestTime(theme),
          softMemorySnippets,
          historyMessages,
        }),
      };

      console.log('[SendMessage/U2A] 开始调用 SecondMe Chat API，端点: /api/secondme/chat/stream');
      let finalReply = await streamSecondMeChat({
        accessToken: session.accessToken,
        sessionOwnerUserId,
        payload: llmPayload,
        targetTreeId,
        onDeltaChunk: (nextText) => {
          pushTypewriterChunk(replyEntryId, nextText);
        },
      });
      console.log('[SendMessage/U2A] SecondMe Chat API 返回结果，长度:', finalReply?.length ?? 0);

      const typedReply = await completeTypewriterEntry(replyEntryId);
      finalReply = fitDialogueToPolicy(typedReply || finalReply, targetTree.personality);
      if (!finalReply) {
        finalReply = pickTimeoutReply(targetTree.personality);
        console.log('[SendMessage/U2A] 回复为空，使用超时默认回复');
      }
      flushTypewriterImmediately(replyEntryId, finalReply);

      void saveConversationMessage({
        chatEntryId: replyEntryId,
        speakerTreeId: targetTree.id,
        listenerTreeId: manualTree?.id ?? FOREST_CHAT_USER_ID,
        message: finalReply,
        sourceType: 'llm',
        conversationMode: 'direct',
        createdAt: replyEntryCreatedAt,
      });

      if (manualTree) {
        store.recordDialogueMemory(targetTree.id, manualTree.id, finalReply);
      }
      store.setLastWordsFor([targetTree.id], finalReply);
      store.setActiveChat({
        treeAId: targetTree.id,
        treeBId: manualTree?.id ?? targetTree.id,
        message: finalReply,
      });
      console.log('[SendMessage/U2A] LLM对话完成成功');
      return true;
    } catch (error) {
      console.error('[SendMessage/U2A] API调用或处理出错:', error instanceof Error ? error.message : String(error));
      const failureText = '森林信道短暂中断，请再和我说一次。';
      flushTypewriterImmediately(replyEntryId, failureText);
      void saveConversationMessage({
        chatEntryId: replyEntryId,
        speakerTreeId: targetTree.id,
        listenerTreeId: manualTree?.id ?? FOREST_CHAT_USER_ID,
        message: failureText,
        sourceType: 'system',
        conversationMode: 'direct',
        createdAt: replyEntryCreatedAt,
      });
      store.setLastWordsFor([targetTree.id], failureText);
      store.setActiveChat({
        treeAId: targetTree.id,
        treeBId: manualTree?.id ?? targetTree.id,
        message: failureText,
      });
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[SendMessage/U2A] 请求被超时中止');
        return true;
      }
      return true;
    } finally {
      const latest = useForestStore.getState();
      latest.setSocialStateFor([targetTree.id], SocialState.IDLE);
      llmInFlightByTreeRef.current[targetTreeId] = false;
      console.log('[SendMessage/U2A] 清理发送状态');
    }
  }, [completeTypewriterEntry, fetchSoftMemorySnippets, flushTypewriterImmediately, pushTypewriterChunk, resolvedSeason, showTreeNotice, streamSecondMeChat, theme]);

  const handleSendSocialMessage = useCallback(async (message: string, targetTreeId?: string | null): Promise<boolean> => {
    const content = message.trim();
    if (!content) return false;

    const store = useForestStore.getState();
    const session = loadSecondMeSession();
    const sessionOwnerUserId = session?.user?.userId ?? null;
    if (currentSessionOwnerRef.current !== sessionOwnerUserId) {
      currentSessionOwnerRef.current = sessionOwnerUserId;
      llmSessionByTreeRef.current = loadTreeChatSessions(sessionOwnerUserId);
    }

    const manualTree = [...store.agents].reverse().find((agent) => agent.isManual);
    const hasLeadingMention = /^@[^\s]+\s+/.test(content);
    const normalizedContent = content.replace(/^@[^\s]+\s+/, '').trim() || content;
    const mentionedTarget = hasLeadingMention && targetTreeId
      ? store.agents.find((agent) => agent.id === targetTreeId)
      : null;
    const userSpeakerId = manualTree?.id ?? FOREST_CHAT_USER_ID;

    if (!userSpeakerId) return false;

    const userEntryId = createMessageId('group-user');
    const userEntryCreatedAt = Date.now();
    store.addChatHistoryEntry({
      id: userEntryId,
      createdAt: userEntryCreatedAt,
      speakerId: userSpeakerId,
      listenerId: mentionedTarget?.id ?? '__forest_group__',
      message: content,
      type: 'chat',
      source: 'user',
      conversationMode: 'group',
    });

    if (mentionedTarget && userSpeakerId !== mentionedTarget.id) {
      void saveConversationMessage({
        chatEntryId: userEntryId,
        speakerTreeId: userSpeakerId,
        listenerTreeId: mentionedTarget.id,
        message: content,
        sourceType: 'user',
        conversationMode: 'group',
        createdAt: userEntryCreatedAt,
      });
    }

    if (manualTree) {
      store.setLastWordsFor([manualTree.id], normalizedContent);
      if (mentionedTarget) {
        store.recordDialogueMemory(manualTree.id, mentionedTarget.id, normalizedContent);
      }
    }

    const requestGroupReplyFromTree = async (targetTree: typeof store.agents[number]) => {
      if (llmInFlightByTreeRef.current[targetTree.id]) {
        return;
      }

      store.setActiveDialogueAgent(targetTree.id);
      store.setActiveChat({
        treeAId: manualTree?.id ?? targetTree.id,
        treeBId: targetTree.id,
        message: content,
      });

      llmInFlightByTreeRef.current[targetTree.id] = true;
      impatientTreeClickRef.current[targetTree.id] = {
        count: 0,
        lastClickAt: 0,
        lastTriggeredAt: 0,
      };
      store.setSocialStateFor([targetTree.id], SocialState.TALKING);

      const replyEntryId = createMessageId('group-llm');
      const replyEntryCreatedAt = Date.now();
      store.addChatHistoryEntry({
        id: replyEntryId,
        createdAt: replyEntryCreatedAt,
        speakerId: targetTree.id,
        listenerId: manualTree?.id ?? FOREST_CHAT_USER_ID,
        message: '',
        type: 'chat',
        source: 'llm',
        conversationMode: 'group',
      });

      try {
        const softMemorySnippets = await fetchSoftMemorySnippets(
          session.accessToken,
          `${targetTree.name} ${normalizedContent}`,
        );
        const historyMessages = buildRecentU2AHistory({
          history: store.chatHistory,
          targetTreeId: targetTree.id,
          userSpeakerId: manualTree?.id ?? FOREST_CHAT_USER_ID,
          limit: 5,
          excludeEntryId: userEntryId,
        });

        const llmPayload: TreeLlmPayload = {
          userInput: normalizedContent,
          treeName: targetTree.name,
          treePersonality: targetTree.personality,
          forestSeason: resolvedSeason,
          forestTime: toReadableForestTime(theme),
          softMemorySnippets,
          historyMessages,
          systemPrompt: buildTreePersonaSystemMessage({
            tree: targetTree,
            forestSeason: resolvedSeason,
            forestTime: toReadableForestTime(theme),
            softMemorySnippets,
            historyMessages,
          }),
        };

        let finalReply = await streamSecondMeChat({
          accessToken: session.accessToken,
          sessionOwnerUserId,
          payload: llmPayload,
          targetTreeId: targetTree.id,
          onDeltaChunk: (nextText) => {
            pushTypewriterChunk(replyEntryId, nextText);
          },
        });

        const typedReply = await completeTypewriterEntry(replyEntryId);
        finalReply = fitDialogueToPolicy(typedReply || finalReply, targetTree.personality);
        if (!finalReply) {
          finalReply = pickTimeoutReply(targetTree.personality);
        }
        flushTypewriterImmediately(replyEntryId, finalReply);

        void saveConversationMessage({
          chatEntryId: replyEntryId,
          speakerTreeId: targetTree.id,
          listenerTreeId: manualTree?.id ?? FOREST_CHAT_USER_ID,
          message: finalReply,
          sourceType: 'llm',
          conversationMode: 'group',
          createdAt: replyEntryCreatedAt,
        });

        if (manualTree) {
          store.recordDialogueMemory(targetTree.id, manualTree.id, finalReply);
        }
        store.setLastWordsFor([targetTree.id], finalReply);
        store.setActiveChat({
          treeAId: targetTree.id,
          treeBId: manualTree?.id ?? targetTree.id,
          message: finalReply,
        });
      } catch (error) {
        const failureText = '森林信道短暂中断，请再和我说一次。';
        flushTypewriterImmediately(replyEntryId, failureText);
        void saveConversationMessage({
          chatEntryId: replyEntryId,
          speakerTreeId: targetTree.id,
          listenerTreeId: manualTree?.id ?? FOREST_CHAT_USER_ID,
          message: failureText,
          sourceType: 'system',
          conversationMode: 'group',
          createdAt: replyEntryCreatedAt,
        });
        store.setLastWordsFor([targetTree.id], failureText);
        store.setActiveChat({
          treeAId: targetTree.id,
          treeBId: manualTree?.id ?? targetTree.id,
          message: failureText,
        });
      } finally {
        const latest = useForestStore.getState();
        latest.setSocialStateFor([targetTree.id], SocialState.IDLE);
        llmInFlightByTreeRef.current[targetTree.id] = false;
      }
    };

    if (mentionedTarget) {
      const targetTree = mentionedTarget;
      if (!session?.accessToken) {
        const notice = '请先完成 SecondMe 登录，再使用 @树名 进行 AI 对话。';
        showTreeNotice('AI 对话未就绪', notice, '🌱', 2400);
        return true;
      }

      await requestGroupReplyFromTree(targetTree);
      return true;
    }

    if (!session?.accessToken) {
      showTreeNotice('AI 对话未就绪', '请先完成 SecondMe 登录，群聊树木才能自动回应。', '🌱', 2400);
      return true;
    }

    const availableTargets = store.agents.filter((agent) => !agent.isManual && !llmInFlightByTreeRef.current[agent.id]);
    const prioritizedTargets: typeof availableTargets = [];
    const seenIds = new Set<string>();

    const pushTarget = (agent?: (typeof availableTargets)[number]) => {
      if (!agent || seenIds.has(agent.id)) return;
      seenIds.add(agent.id);
      prioritizedTargets.push(agent);
    };

    pushTarget(targetTreeId ? store.agents.find((agent) => agent.id === targetTreeId && !agent.isManual) : undefined);

    const shuffledRemainder = availableTargets
      .filter((agent) => !seenIds.has(agent.id))
      .sort(() => Math.random() - 0.5);

    shuffledRemainder.forEach((agent) => pushTarget(agent));

    const replyTargets = prioritizedTargets.slice(0, Math.min(2, prioritizedTargets.length));

    if (replyTargets.length === 0) {
      showTreeNotice('森林暂时安静', '现在没有空闲树接话，稍后再喊一声。', '🌲', 2200);
      return true;
    }

    await Promise.allSettled(replyTargets.map((targetTree) => requestGroupReplyFromTree(targetTree)));
    return true;
  }, [completeTypewriterEntry, fetchSoftMemorySnippets, flushTypewriterImmediately, pushTypewriterChunk, resolvedSeason, showTreeNotice, streamSecondMeChat, theme]);

  const handleSelectChatMessage = useCallback((entry: ChatHistoryEntry) => {
    focusTreeById(entry.speakerId);
  }, [focusTreeById]);

  // Handle planting
  const handlePlant = useCallback((imageData: string, drawingData: any, treeName: string, personality: string) => {
    if (!username) {
      setLoginModalOpen(true);
      showTreeNotice('请先使用 SecondMe 登录', '登录后才可以播种你的树', '🔐', 2600);
      return;
    }
    setDrawingOpen(false);
    setPlantingImage(imageData);
    setPlantingDrawingData(drawingData);
    setPlantingTreeName(treeName);
    setPlantingPersonality(personality);
  }, [showTreeNotice, username]);

  const playManualFirstHeartbeat = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      void ctx.resume();

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      master.connect(ctx.destination);

      const wind = ctx.createOscillator();
      wind.type = 'sine';
      wind.frequency.setValueAtTime(880, now);
      wind.frequency.exponentialRampToValueAtTime(660, now + 0.42);
      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.0001, now);
      windGain.gain.exponentialRampToValueAtTime(0.34, now + 0.02);
      windGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      wind.connect(windGain);
      windGain.connect(master);

      const drop = ctx.createOscillator();
      drop.type = 'triangle';
      drop.frequency.setValueAtTime(540, now + 0.08);
      drop.frequency.exponentialRampToValueAtTime(420, now + 0.34);
      const dropGain = ctx.createGain();
      dropGain.gain.setValueAtTime(0.0001, now + 0.06);
      dropGain.gain.exponentialRampToValueAtTime(0.26, now + 0.1);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      drop.connect(dropGain);
      dropGain.connect(master);

      wind.start(now);
      drop.start(now + 0.06);
      wind.stop(now + 0.7);
      drop.stop(now + 0.52);

      window.setTimeout(() => {
        void ctx.close();
      }, 1200);
    } catch {}
  }, []);

  const handlePlace = useCallback((x: number, y: number) => {
    if (!plantingImage) return;
    if (!username) {
      setLoginModalOpen(true);
      setPlantingImage(null);
      setPlantingDrawingData(null);
      setPlantingTreeName('');
      setPlantingPersonality('');
      showTreeNotice('请先使用 SecondMe 登录', '登录后才能把树种进森林', '🔐', 2600);
      return;
    }
    const h = window.innerHeight;
    // Clamp to lower portion (grass area)
    const clampedY = Math.max(h * 0.55, Math.min(h * 0.85, y));
    const size = 78 + Math.random() * 52;
    const id = Date.now().toString();
    const worldX = x - size / 2 - scrollX + size / 2;
    const divineShape = pickShapeByWorldEcology(worldX, worldWidth);

    // 优先使用用户自定义性格，否则回退到 SecondMe 推断
    const finalPersonality = plantingPersonality || (() => {
      const secondmeSession = loadSecondMeSession();
      const userTags = secondmeSession?.user?.tags;
      return inferPersonalityFromTags(userTags) || '神启';
    })();
    
    const finalName = plantingTreeName.trim() || '无名新芽';

    const finalTag = (() => {
      const TAG_LIBRARY: Record<string, string[]> = {
        温柔: ['佛系养生博主', '长期主义者', '云端漂泊者', '慢生活倡导人'],
        睿智: ['清醒老巨人', '深度思考者', '哲学观察员', '根系智者'],
        顽皮: ['脆皮大学生', '尊嘟假嘟', '全林最野的崽', '麻烦制造机器', '快乐捣蛋鬼'],
        活泼: ['社牛树', '热情加速器', '林间活力家', '显眼包大户'],
        社恐: ['i树人', '咸鱼树', '别点我报警了', '沉默是金爱好者', '独处治愈师'],
        神启: ['甲方爸爸的树', '这个树很City', '神性肃静', '宇宙选中的树', '创世见证者'],
      };
      const tags = TAG_LIBRARY[finalPersonality] || TAG_LIBRARY['温柔'];
      return tags[Math.floor(Math.random() * tags.length)];
    })();

    try {
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 523.25;
      gain.gain.setValueAtTime(0.15, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 1.5);
    } catch {}

    setTrees((prev) => [...prev, {
      id,
      imageData: plantingImage,
      x: x - size / 2 - scrollX,
      y: clampedY - size,
      size,
      spawnType: 'manual',
    }]);

    const treeBio = plantingPersonality
      ? `拥有${finalPersonality}的灵魂，由造物主亲手绘就，并以「${finalName}」之名种入这片森林。`
      : '由造物主亲手种下，能感知整片森林的呼吸与远方的年轮。';

    addTree({
      id,
      position: { x: worldX, y: clampedY },
      scale: 1,
      zIndex: Math.floor(clampedY),
      name: finalName,
      tag: finalTag,
      personality: finalPersonality,
      metadata: {
        bio: treeBio,
        lastWords: '愿你们都在风里长成自己。',
        drawingImageData: plantingImage,
        drawingData: plantingDrawingData,
      },
      energy: 100,
      generation: 0,
      parents: [],
      socialCircle: { friends: [], family: [], partner: null },
      intimacyMap: {},
      growthBoost: 1,
      isManual: true,
      shape: divineShape,
    });

    // Persist to localStorage so the tree survives page refresh.
    const ownerId = loadSecondMeSession()?.user?.userId ?? null;
    const existingStored = loadManualTrees(ownerId);
    const newEntry: PersistedManualTreeEntry = {
      id,
      imageData: plantingImage!,
      x: x - size / 2 - scrollX,
      y: clampedY - size,
      size,
      worldX,
      worldY: clampedY,
      name: finalName,
      tag: finalTag,
      personality: finalPersonality,
      bio: treeBio,
      lastWords: '愿你们都在风里长成自己。',
      energy: 100,
      generation: 0,
      parents: [],
      socialCircle: { friends: [], family: [], partner: null },
      intimacyMap: {},
      shape: divineShape,
    };
    saveManualTrees([...existingStored.filter((e) => e.id !== id), newEntry], ownerId);

    window.setTimeout(() => {
      const plantedAgent = useForestStore.getState().agents.find((agent) => agent.id === id);
      if (plantedAgent) {
        void upsertTreeProfile(plantedAgent);
      }
    }, 0);

    triggerGlobalSilence(3000, '造物主降下了新的生命，万物静听。', id);
    triggerDivineSurge(10_000);
  playManualFirstHeartbeat();
    setDivineBloom({ id, x, y: clampedY });
    window.setTimeout(() => setDivineBloom((current) => (current?.id === id ? null : current)), 1400);
    setCelestialEffect(Math.random() < 0.5 ? 'meteor' : 'aurora');
    window.setTimeout(() => setCelestialEffect(null), 10_000);
    showTreeNotice(`${finalPersonality}之树降临`, `「${finalName}」已种入森林`, '✨', 10_000, id, 'divine');

    setNewTreeId(id);
    setPlantingImage(null);
    setPlantingDrawingData(null);
    setPlantingTreeName('');
    setPlantingPersonality('');
    setTimeout(() => setNewTreeId(null), 3500);
  }, [addTree, plantingImage, plantingDrawingData, plantingTreeName, plantingPersonality, playManualFirstHeartbeat, scrollX, showTreeNotice, triggerDivineSurge, triggerGlobalSilence, username, worldWidth]);

  // Restore manually-planted trees from localStorage on mount.
  // This runs before the sample-trees effect so the sample-trees merge won't overwrite them.
  useEffect(() => {
    const ownerId = loadSecondMeSession()?.user?.userId ?? null;
    const stored = loadManualTrees(ownerId);
    if (stored.length === 0) return;

    const { addTree: storeAddTree } = useForestStore.getState();
    const restored: TreeData[] = stored.map((entry) => {
      storeAddTree({
        id: entry.id,
        position: { x: entry.worldX, y: entry.worldY },
        scale: 1,
        zIndex: Math.floor(entry.worldY),
        name: entry.name,
        tag: entry.tag,
        personality: entry.personality,
        metadata: {
          bio: entry.bio,
          lastWords: entry.lastWords,
          drawingImageData: entry.imageData,
        },
        energy: entry.energy,
        generation: entry.generation,
        parents: entry.parents,
        socialCircle: entry.socialCircle,
        intimacyMap: entry.intimacyMap,
        isManual: true,
        shape: entry.shape,
      });
      return {
        id: entry.id,
        imageData: entry.imageData,
        x: entry.x,
        y: entry.y,
        size: entry.size,
        spawnType: 'manual' as const,
      };
    });

    setTrees((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newOnes = restored.filter((t) => !existingIds.has(t.id));
      return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore chat history from localStorage on mount.
  useEffect(() => {
    const ownerId = loadSecondMeSession()?.user?.userId ?? null;
    const storedChat = loadChatHistory(ownerId);
    if (storedChat.length === 0) return;

    const { addChatHistoryEntry } = useForestStore.getState();
    for (const entry of storedChat) {
      addChatHistoryEntry(entry);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authInitializing || !username) return;

    const ownerId = loadSecondMeSession()?.user?.userId ?? null;
    if (!ownerId || remoteRestoreOwnerRef.current === ownerId) return;
    remoteRestoreOwnerRef.current = ownerId;

    let cancelled = false;

    const restoreRemoteTrees = async () => {
      const profiles = await fetchAllTreeProfiles();
      if (cancelled || profiles.length === 0) return;

      const existingAgentIds = new Set(useForestStore.getState().agents.map((agent) => agent.id));
      const { addTree: storeAddTree } = useForestStore.getState();
      const restoredEntries: PersistedManualTreeEntry[] = [];
      const restoredTrees: TreeData[] = [];

      for (const profile of profiles) {
        if (!profile.isManual || !profile.drawingImageData || existingAgentIds.has(profile.treeId)) continue;

        const sceneState = (profile.metadata.sceneState ?? {}) as Record<string, unknown>;
        const renderSize = Number(sceneState.renderSize ?? 0);
        const positionX = Number(sceneState.positionX ?? 0);
        const positionY = Number(sceneState.positionY ?? 0);
        if (!Number.isFinite(renderSize) || renderSize <= 0) continue;
        if (!Number.isFinite(positionX) || !Number.isFinite(positionY)) continue;

        const tag = typeof profile.metadata.tag === 'string' ? profile.metadata.tag : undefined;

        storeAddTree({
          id: profile.treeId,
          position: { x: positionX, y: positionY },
          scale: 1,
          zIndex: Math.floor(positionY),
          name: profile.name,
          tag,
          personality: profile.personality,
          metadata: {
            bio: profile.bio,
            lastWords: profile.lastWords,
            drawingImageData: profile.drawingImageData,
            drawingData: profile.drawingData as any,
          },
          energy: profile.energy,
          generation: profile.generation,
          parents: profile.parents,
          socialCircle: profile.socialCircle as any,
          intimacyMap: profile.intimacyMap,
          isManual: true,
        });

        existingAgentIds.add(profile.treeId);
        restoredTrees.push({
          id: profile.treeId,
          imageData: profile.drawingImageData,
          x: positionX - renderSize / 2,
          y: positionY - renderSize,
          size: renderSize,
          spawnType: 'manual',
        });
        restoredEntries.push({
          id: profile.treeId,
          imageData: profile.drawingImageData,
          x: positionX - renderSize / 2,
          y: positionY - renderSize,
          size: renderSize,
          worldX: positionX,
          worldY: positionY,
          name: profile.name,
          tag,
          personality: profile.personality,
          bio: profile.bio,
          lastWords: profile.lastWords,
          energy: profile.energy,
          generation: profile.generation,
          parents: profile.parents,
          socialCircle: profile.socialCircle as { friends: string[]; family: string[]; partner: string | null },
          intimacyMap: profile.intimacyMap,
        });
      }

      if (cancelled || restoredTrees.length === 0) return;

      setTrees((prev) => {
        const existingTreeIds = new Set(prev.map((tree) => tree.id));
        const additions = restoredTrees.filter((tree) => !existingTreeIds.has(tree.id));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });

      const localEntries = loadManualTrees(ownerId);
      saveManualTrees(
        [
          ...localEntries.filter((entry) => !restoredEntries.some((restored) => restored.id === entry.id)),
          ...restoredEntries,
        ],
        ownerId,
      );
    };

    void restoreRemoteTrees();

    return () => {
      cancelled = true;
    };
  }, [authInitializing, username]);

  // Initial sample trees: clustered groves + legacy anchor trees
  useEffect(() => {
    const w = worldWidth;
    const h = window.innerHeight;

    const densityBase = 20 / Math.max(1, viewportWidth);
    const TOTAL_INITIAL_TREES = Math.max(24, Math.min(120, Math.round(w * densityBase)));
    const LEGACY_ANCHOR_COUNT = Math.max(5, Math.round(TOTAL_INITIAL_TREES * 0.2));
    const CLUSTERED_COUNT = Math.max(0, TOTAL_INITIAL_TREES - LEGACY_ANCHOR_COUNT);

    const placements = generateClusteredTrees(CLUSTERED_COUNT, w, h, minPlantY, maxPlantY);
    const { addTree } = useForestStore.getState();

    const clusteredTrees: TreeData[] = placements.map((p, i) => {
      const id = `sample-${i}`;
      const imageData = renderTreeShapeToDataUrl(p.shape);
      const profile = generateRandomProfile({ x: p.cx, worldWidth: w });

      addTree({
        id,
        position: { x: p.cx, y: p.cy },
        scale: 1,
        zIndex: Math.floor(p.cy),
        name: profile.name,
        tag: profile.tag,
        personality: profile.personality,
        metadata: profile.metadata,
        energy: Math.floor(40 + Math.random() * 50),
        shape: p.shape,
      });

      return {
        id,
        imageData,
        x: p.cx - p.size / 2,
        y: p.cy - p.size,
        size: p.size,
        spawnType: 'ambient' as const,
      };
    });

    // Generate 6 divine trees in special positions
    const DIVINE_TREE_COUNT = 6;
    const divineTrees: TreeData[] = Array.from({ length: DIVINE_TREE_COUNT }, (_, i) => {
      const angle = (i / DIVINE_TREE_COUNT) * Math.PI * 2;
      const radius = w * 0.20; // Radius from center
      const centerX = w * 0.5;
      const centerY = h * 0.65;
      
      const size = 94 + Math.random() * 32;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.6; // Ellipse shape
      
      const id = `divine-${i}`;
      const fallbackShape = pickShapeByWorldEcology(x, w);
      const imageData = renderTreeShapeToDataUrl(fallbackShape);
      const profile = generateRandomProfile({ x, worldWidth: w, forcedPersonality: '神启' });

      addTree({
        id,
        position: { x, y },
        scale: 1,
        zIndex: Math.floor(y),
        name: profile.name,
        tag: profile.tag,
        personality: profile.personality,
        metadata: profile.metadata,
        energy: Math.floor(70 + Math.random() * 30), // Divine trees have higher energy
        shape: fallbackShape,
      });

      return {
        id,
        imageData,
        x: x - size / 2,
        y: y - size,
        size,
        spawnType: 'ambient',
      };
    });

    // Reintroduce the original few trees as foreground anchors.
    const legacyAnchorTrees: TreeData[] = Array.from({ length: LEGACY_ANCHOR_COUNT }, (_, i) => {
      const size = 82 + Math.random() * 29;
      const segment = w / (LEGACY_ANCHOR_COUNT + 1);
      const x = segment * (i + 1) + (Math.random() - 0.5) * segment * 0.35;
      const y = h * 0.6 + Math.random() * (h * 0.12);
      const id = `legacy-${i}`;
      const imageData = createLegacySampleTreeImage(i);
      const profile = generateRandomProfile({ x, worldWidth: w });
      const fallbackShape = pickShapeByWorldEcology(x, w);

      addTree({
        id,
        position: { x, y },
        scale: 1,
        zIndex: Math.floor(y),
        name: profile.name,
        tag: profile.tag,
        personality: profile.personality,
        metadata: profile.metadata,
        energy: Math.floor(40 + Math.random() * 50),
        shape: fallbackShape,
      });

      return {
        id,
        imageData,
        x: x - size / 2,
        y: y - size,
        size,
        spawnType: 'ambient',
      };
    });

    const sampleTrees = [...clusteredTrees, ...divineTrees, ...legacyAnchorTrees];

    // Merge with any already-restored manual trees instead of replacing them.
    setTrees((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newSamples = sampleTrees.filter((t) => !existingIds.has(t.id));
      return [...prev, ...newSamples];
    });
  }, [maxPlantY, minPlantY, viewportWidth, worldWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleTrees = useMemo(() => {
    return trees.filter((tree) => {
      const screenX = tree.x + scrollX;
      const right = screenX + tree.size;
      const left = screenX;
      return right >= -TREE_CULL_BUFFER && left <= viewportWidth + TREE_CULL_BUFFER;
    });
  }, [scrollX, trees, viewportWidth]);
  const visibleAgentTrees = useMemo(() => {
    const byTreeId = new Map(visibleTrees.map((tree) => [tree.id, tree]));
    return agents
      .map((agent) => {
        const tree = byTreeId.get(agent.id);
        if (!tree) return null;
        return { tree, profile: agent };
      })
      .filter((entry): entry is { tree: TreeData; profile: (typeof agents)[number] } => Boolean(entry));
  }, [agents, visibleTrees]);
  const sceneInteractionOrigin = useMemo(() => {
    if (!sceneInteractionEvent) return null;
    const targetTree = trees.find((tree) => tree.id === sceneInteractionEvent.targetTreeId);
    if (!targetTree) return null;
    return {
      x: targetTree.x + targetTree.size * 0.5 + scrollX,
      y: targetTree.y + targetTree.size * 0.34,
    };
  }, [sceneInteractionEvent, scrollX, trees]);
  const sceneInteractionPersonality = useMemo(() => {
    if (!sceneInteractionEvent) return null;
    return agents.find((agent) => agent.id === sceneInteractionEvent.targetTreeId)?.personality ?? null;
  }, [agents, sceneInteractionEvent]);
  const visibleTreeIds = useMemo(() => visibleTrees.map((tree) => tree.id), [visibleTrees]);

  useEffect(() => {
    const snapshots: SceneTreeSnapshot[] = trees.map((tree) => {
      const depth = getTreeDepthMetrics(tree.y + tree.size, minPlantY, maxPlantY);
      return {
        id: tree.id,
        x: tree.x + tree.size / 2,
        y: tree.y,
        size: tree.size,
        scale: depth.perspectiveScale,
        zIndex: depth.zIndex,
      };
    });

    syncAgentsFromScene(snapshots);
    refreshNeighbors(200);
  }, [maxPlantY, minPlantY, refreshNeighbors, syncAgentsFromScene, trees]);

  useEffect(() => {
    const markActive = () => {
      lastUserActionAtRef.current = Date.now();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'touchstart',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true });
    });

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastUserActionAtRef.current < USER_IDLE_THRESHOLD_MS) return;
      if (now - lastGuardianMessageAtRef.current < GUARDIAN_MESSAGE_COOLDOWN_MS) return;

      const store = useForestStore.getState();
      const manualTree = [...store.agents].reverse().find((agent) => agent.isManual);
      if (!manualTree) return;

      store.addChatHistoryEntry({
        speakerId: manualTree.id,
        listenerId: manualTree.id,
        message: GUARDIAN_MESSAGE,
        type: 'system',
        source: 'auto',
      });

      if (!store.activeChat) {
        store.setActiveChat({
          treeAId: manualTree.id,
          treeBId: manualTree.id,
          message: GUARDIAN_MESSAGE,
        });

        window.setTimeout(() => {
          const current = useForestStore.getState();
          const active = current.activeChat;
          if (
            active
            && active.treeAId === manualTree.id
            && active.treeBId === manualTree.id
            && active.message === GUARDIAN_MESSAGE
          ) {
            current.setActiveChat(null);
          }
        }, 4000);
      }

      lastGuardianMessageAtRef.current = now;
    }, 5000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden select-none ${resolvedSeason === 'summer' ? `summer-mode summer-${theme}-mode` : ''} ${isSummerDusk ? 'summer-dusk-shadow-mode' : ''} ${isWinterSeason ? `winter-mode winter-${theme}-mode` : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      style={{ cursor: plantingImage ? 'none' : isDragging.current ? 'grabbing' : 'grab' }}
    >
      {/* Watercolor wash entry */}
      <div className="watercolor-wash fixed inset-0" style={{ zIndex: -1 }} />

      <SummerTemporalEffects season={resolvedSeason} theme={theme} />
      <WinterSeasonEffects season={resolvedSeason} weather={resolvedWeather} />
      <BirdSeedFlyover season={resolvedSeason} />

      {/* World edge hints */}
      <AnimatePresence>
        {leftEdgeHintOpacity > 0.02 && (
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: leftEdgeHintOpacity, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed left-0 top-0 bottom-0 pointer-events-none z-20 flex items-center"
          >
            <div
              style={{
                width: 112,
                height: '100%',
                background: 'linear-gradient(90deg, rgba(255,248,241,0.66), rgba(255,248,241,0.18), transparent)',
              }}
            />
            <div
              style={{
                marginLeft: -54,
                padding: '10px 12px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.32)',
                border: '1px solid rgba(255,255,255,0.45)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 10px 24px rgba(72,58,48,0.08)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: 24,
                  color: 'hsl(148, 28%, 24%)',
                  lineHeight: 1,
                }}
              >
                森林起点
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(58,64,54,0.68)' }}>
                这里是最初的风声
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rightEdgeHintOpacity > 0.02 && (
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: rightEdgeHintOpacity, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed right-0 top-0 bottom-0 pointer-events-none z-20 flex items-center justify-end"
          >
            <div
              style={{
                marginRight: -54,
                padding: '10px 12px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.32)',
                border: '1px solid rgba(255,255,255,0.45)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 10px 24px rgba(72,58,48,0.08)',
                textAlign: 'right',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-handwritten)',
                  fontSize: 24,
                  color: 'hsl(148, 28%, 24%)',
                  lineHeight: 1,
                }}
              >
                远方林境
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(58,64,54,0.68)' }}>
                世界在这里暂时收束
              </div>
            </div>
            <div
              style={{
                width: 112,
                height: '100%',
                background: 'linear-gradient(270deg, rgba(255,248,241,0.66), rgba(255,248,241,0.18), transparent)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {treeNotice && (
          <motion.button
            key={treeNotice.id}
            type="button"
            onClick={() => {
              if (!treeNotice.treeId) return;
              focusTreeById(treeNotice.treeId);
              setTreeNotice(null);
            }}
            initial={{ opacity: 0, y: -18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="fixed"
            style={{
              top: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 210,
              maxWidth: 360,
              borderRadius: 15,
              padding: '9px 14px 10px',
              border: treeNotice.variant === 'divine'
                ? '1px solid rgba(210, 181, 112, 0.56)'
                : '1px solid rgba(122, 164, 136, 0.42)',
              background: treeNotice.variant === 'divine'
                ? 'linear-gradient(145deg, rgba(255, 248, 226, 0.92), rgba(250, 237, 198, 0.86))'
                : 'rgba(255, 255, 255, 0.74)',
              backdropFilter: 'blur(12px)',
              boxShadow: treeNotice.variant === 'divine'
                ? '0 10px 28px rgba(146, 112, 38, 0.18), 0 0 0 1px rgba(255, 246, 214, 0.26) inset'
                : '0 8px 24px rgba(44, 78, 58, 0.14)',
              cursor: treeNotice.treeId ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{treeNotice.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: treeNotice.variant === 'divine' ? 'hsl(38, 42%, 24%)' : 'hsl(146, 30%, 24%)',
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {treeNotice.text}
              </div>
              <div
                style={{
                  marginTop: 2,
                  color: treeNotice.variant === 'divine' ? 'rgba(117, 93, 48, 0.82)' : 'rgba(68, 92, 78, 0.76)',
                  fontSize: 11,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {treeNotice.sub}
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {seedDrift && (
          <motion.div
            key={seedDrift.id}
            initial={{ opacity: 0, x: -48, y: seedDrift.fromY, rotate: -22, scale: 0.9 }}
            animate={{ opacity: [0, 0.88, 0.82, 0], x: [0, 220, 460, 680], y: [seedDrift.fromY, seedDrift.toY * 0.55, seedDrift.toY, seedDrift.toY + 36], rotate: [-16, 6, -8, 14], scale: [0.92, 1.02, 1, 0.96] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.85, ease: 'easeOut' }}
            className="fixed left-6 top-0 pointer-events-none z-32"
            style={{
              fontSize: 28,
              filter: 'drop-shadow(0 6px 10px rgba(40, 58, 42, 0.2))',
            }}
          >
            {seedDrift.glyph}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {divineBloom && (
          <motion.div
            key={divineBloom.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed pointer-events-none z-32"
            style={{ left: divineBloom.x, top: divineBloom.y, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              initial={{ opacity: 0.85, scale: 0.35 }}
              animate={{ opacity: 0, scale: 2.4 }}
              transition={{ duration: 1.15, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: -34,
                borderRadius: '999px',
                border: '1.5px solid rgba(242, 206, 120, 0.72)',
                boxShadow: '0 0 24px rgba(252, 211, 77, 0.42)',
              }}
            />
            <motion.div
              initial={{ opacity: 0.9, scale: 0.4 }}
              animate={{ opacity: 0, scale: 1.8 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: -18,
                borderRadius: '999px',
                background: 'radial-gradient(circle, rgba(250, 239, 190, 0.88) 0%, rgba(245, 208, 92, 0.42) 42%, rgba(255,255,255,0) 72%)',
                filter: 'blur(2px)',
              }}
            />
            {Array.from({ length: 10 }).map((_, index) => {
              const angle = (Math.PI * 2 * index) / 10;
              const offsetX = Math.cos(angle) * 44;
              const offsetY = Math.sin(angle) * 30;
              return (
                <motion.div
                  key={`divine-bloom-${index}`}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 1, 0], x: [0, offsetX], y: [0, offsetY], scale: [0.3, 1, 0.4] }}
                  transition={{ duration: 1.05, ease: 'easeOut', delay: index * 0.02 }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: index % 2 === 0 ? 8 : 5,
                    height: index % 2 === 0 ? 8 : 5,
                    borderRadius: '999px',
                    background: index % 2 === 0 ? 'rgba(252, 211, 77, 0.96)' : 'rgba(255, 247, 214, 0.95)',
                    boxShadow: '0 0 10px rgba(252, 211, 77, 0.55)',
                  }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <CelestialCelebration effect={celestialEffect} />

      {/* Camera-scaled scene layers */}
      <div
        className="absolute"
        style={{
          width: `${(100 / cameraZoom).toFixed(4)}%`,
          height: `${(100 / cameraZoom).toFixed(4)}%`,
          left: `${(50 * (1 - 1 / cameraZoom)).toFixed(4)}%`,
          top: `${(50 * (1 - 1 / cameraZoom)).toFixed(4)}%`,
          transform: `scale(${cameraZoom})`,
          transformOrigin: '50% 50%',
          zIndex: 1,
        }}
      >
        {/* Parallax Background */}
        <ParallaxBackground
          theme={theme}
          colors={colors}
          season={resolvedSeason}
          weather={resolvedWeather}
          scrollX={scrollX}
          cameraZoom={cameraZoom}
          atmosphere={activeEcologyAtmosphere}
        />

        {/* Trees layer */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 10,
            transform: `translateX(${scrollX}px)`,
            filter: treeLayerFilter,
            transition: 'filter 300ms ease',
          }}
        >
          {visibleAgentTrees.map(({ tree, profile }) => {
            return (
              <PlantedTree
                key={tree.id}
                imageData={tree.imageData}
                x={tree.x}
                y={tree.y}
                size={tree.size}
                season={resolvedSeason}
                isNew={tree.id === newTreeId}
                growthMode={tree.id === newTreeId ? tree.spawnType : 'ambient'}
                minY={minPlantY}
                maxY={maxPlantY}
                agentId={tree.id}
                profile={profile}
                highlighted={focusedTreeId === tree.id}
                active={activeDialogueAgentId === tree.id}
                isAwaitingReply={activeDialogueAgentId === tree.id && profile.socialState === SocialState.TALKING}
                shakePromptSignal={treeShakePromptSignalById[tree.id] ?? 0}
                onTreeClick={handleTreeActivate}
                onDeleteTree={profile.isManual ? handleDeleteTree : undefined}
              />
            );
          })}

          <TreePerchedBirds season={resolvedSeason} trees={visibleTrees} interactionEvent={sceneInteractionEvent} />

          <AgentLink
            agents={agents}
            visibleTreeIds={visibleTreeIds}
          />
        </div>

        {/* Particles */}
        <Particles
          colors={colors}
          weather={resolvedWeather}
          season={resolvedSeason}
          emissionRateMultiplier={emissionRateMultiplier}
          atmosphere={activeEcologyAtmosphere}
          interactionEvent={sceneInteractionEvent}
          interactionOrigin={sceneInteractionOrigin}
          interactionPersonality={sceneInteractionPersonality}
        />
      </div>

      <motion.div
        key={activeEcologyZone.id}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-20 right-16 sm:right-20 z-30 pointer-events-none"
        style={{
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(255,250,244,0.42)',
          border: '1px solid rgba(255,255,255,0.4)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 10px 24px rgba(64, 54, 44, 0.08)',
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(72,68,60,0.48)' }}>
          Ecology Zone
        </div>
        <div style={{ marginTop: 2, fontFamily: 'var(--font-handwritten)', fontSize: 24, lineHeight: 1, color: 'hsl(28, 24%, 26%)' }}>
          {activeEcologyZone.label}
        </div>
      </motion.div>

      {/* Backdrop to close popovers */}
      {openPopover && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 38 }}
          onClick={() => setOpenPopover(null)}
        />
      )}

      {/* Season / Weather / Time picker buttons */}
      <div className="fixed top-4 left-4 sm:left-8 z-40 flex items-start gap-2">

        {/* 鈹€鈹€ Season 鈹€鈹€ */}
        <div style={{ position: 'relative' }}>
          <motion.button
            type="button"
            onClick={() => setOpenPopover(p => p === 'season' ? null : 'season')}
            whileTap={{ scale: 0.95 }}
            className="font-ui text-xs flex items-center gap-1.5"
            style={{
              borderRadius: 999,
              background: openPopover === 'season'
                ? 'linear-gradient(145deg,rgba(255,231,210,0.98),rgba(255,248,229,0.98))'
                : 'linear-gradient(155deg,rgba(255,248,240,0.88),rgba(255,255,255,0.80))',
              border: '1.5px solid rgba(165,140,120,0.38)',
              backdropFilter: 'blur(7px)',
              boxShadow: '0 4px 14px rgba(91,58,36,0.10)',
              padding: '7px 13px',
              color: 'hsl(28,28%,26%)',
            }}
          >
            <span>{seasonButtonOption.icon}</span>
            <span>{seasonButtonOption.label}</span>
          </motion.button>
          <AnimatePresence>
            {openPopover === 'season' && (
              <motion.div
                key="season-popover"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50,
                  background: 'linear-gradient(155deg,rgba(255,248,235,0.97),rgba(255,255,248,0.93))',
                  border: '1px solid rgba(165,140,120,0.3)',
                  borderRadius: 16, padding: '10px 12px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 12px 30px rgba(91,58,36,0.14)',
                  minWidth: 200,
                }}
              >
                <div className="font-ui text-[10px] mb-2" style={{ color: 'hsl(28,18%,46%)' }}>
                  {seasonHintMap[season]}{season === 'auto' ? ` · 当前 ${seasonButtonOption.label}` : ''}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {seasonOptions.map(opt => {
                    const active = season === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSeason(opt.value); setOpenPopover(null); }}
                        whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}
                        className="font-ui text-xs flex items-center gap-1"
                        style={{
                          borderRadius: 999,
                          border: '1px solid rgba(165,140,120,0.35)',
                          padding: '5px 10px',
                          background: active
                            ? 'linear-gradient(145deg,rgba(255,231,210,0.96),rgba(255,248,229,0.98))'
                            : 'rgba(255,255,255,0.65)',
                          boxShadow: active ? '0 3px 10px rgba(120,80,40,0.18)' : 'none',
                          color: 'hsl(28,28%,28%)',
                        }}
                      >
                        <span>{opt.icon}</span><span>{opt.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 鈹€鈹€鈹€ Weather 鈹€鈹€鈹€ */}
        <div style={{ position: 'relative' }}>
          <motion.button
            type="button"
            onClick={() => setOpenPopover(p => p === 'weather' ? null : 'weather')}
            whileTap={{ scale: 0.95 }}
            className="font-ui text-xs flex items-center gap-1.5"
            style={{
              borderRadius: 999,
              background: openPopover === 'weather'
                ? 'linear-gradient(145deg,rgba(212,245,255,0.98),rgba(240,252,255,0.98))'
                : 'linear-gradient(155deg,rgba(235,248,255,0.88),rgba(255,255,255,0.80))',
              border: '1.5px solid rgba(100,160,185,0.38)',
              backdropFilter: 'blur(7px)',
              boxShadow: '0 4px 14px rgba(36,91,120,0.10)',
              padding: '7px 13px',
              color: 'hsl(205,28%,26%)',
            }}
          >
            <span>{weatherButtonOption.icon}</span>
            <span>{weatherButtonOption.label}</span>
          </motion.button>
          <AnimatePresence>
            {openPopover === 'weather' && (
              <motion.div
                key="weather-popover"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50,
                  background: 'linear-gradient(155deg,rgba(235,248,255,0.97),rgba(255,255,255,0.93))',
                  border: '1px solid rgba(100,160,185,0.3)',
                  borderRadius: 16, padding: '10px 12px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 12px 30px rgba(36,91,120,0.14)',
                  minWidth: 160,
                }}
              >
                <div className="font-ui text-[10px] mb-2" style={{ color: 'hsl(205,18%,46%)' }}>
                  {weatherHintMap[weatherMode]}{weatherMode === 'auto' ? ` · 当前 ${weatherButtonOption.label}` : ''}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {weatherOptions.map(opt => {
                    const active = weatherMode === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => { setWeatherMode(opt.value); setOpenPopover(null); }}
                        whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}
                        className="font-ui text-xs flex items-center gap-1"
                        style={{
                          borderRadius: 999,
                          border: '1px solid rgba(100,160,185,0.35)',
                          padding: '5px 10px',
                          background: active
                            ? 'linear-gradient(145deg,rgba(212,245,255,0.96),rgba(240,252,255,0.98))'
                            : 'rgba(255,255,255,0.65)',
                          boxShadow: active ? '0 3px 10px rgba(66,130,160,0.18)' : 'none',
                          color: 'hsl(205,26%,28%)',
                        }}
                      >
                        <span>{opt.icon}</span><span>{opt.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 鈹€鈹€ Time 鈹€鈹€ */}
        <div style={{ position: 'relative' }}>
          <motion.button
            type="button"
            onClick={() => setOpenPopover(p => p === 'time' ? null : 'time')}
            whileTap={{ scale: 0.95 }}
            className="font-ui text-xs flex items-center gap-1.5"
            style={{
              borderRadius: 999,
              background: openPopover === 'time'
                ? 'linear-gradient(145deg,rgba(223,233,255,0.98),rgba(241,247,255,0.98))'
                : 'linear-gradient(155deg,rgba(238,243,255,0.88),rgba(255,255,255,0.80))',
              border: '1.5px solid rgba(100,115,175,0.38)',
              backdropFilter: 'blur(7px)',
              boxShadow: '0 4px 14px rgba(70,85,160,0.10)',
              padding: '7px 13px',
              color: 'hsl(232,28%,28%)',
            }}
          >
            <span>{timeButtonOption.icon}</span>
            <span>{timeButtonOption.label}</span>
          </motion.button>
          <AnimatePresence>
            {openPopover === 'time' && (
              <motion.div
                key="time-popover"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50,
                  background: 'linear-gradient(155deg,rgba(242,244,255,0.97),rgba(255,255,255,0.93))',
                  border: '1px solid rgba(100,115,175,0.3)',
                  borderRadius: 16, padding: '10px 12px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 12px 30px rgba(70,85,160,0.14)',
                  minWidth: 210,
                }}
              >
                <div className="font-ui text-[10px] mb-2" style={{ color: 'hsl(232,18%,46%)' }}>
                  {timeHintMap[timeMode]}{timeMode === 'auto' ? ` · 当前 ${timeButtonOption.label}` : ''}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {timeOptions.map(opt => {
                    const active = timeMode === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => { setTimeMode(opt.value); setOpenPopover(null); }}
                        whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}
                        className="font-ui text-xs flex items-center gap-1"
                        style={{
                          borderRadius: 999,
                          border: '1px solid rgba(100,115,175,0.35)',
                          padding: '5px 10px',
                          background: active
                            ? 'linear-gradient(145deg,rgba(223,233,255,0.96),rgba(241,247,255,0.98))'
                            : 'rgba(255,255,255,0.65)',
                          boxShadow: active ? '0 3px 10px rgba(86,103,171,0.18)' : 'none',
                          color: 'hsl(232,24%,28%)',
                        }}
                      >
                        <span>{opt.icon}</span><span>{opt.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Planting ghost */}
      {plantingImage && (
        <PlantingGhost
          imageData={plantingImage}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          onPlace={handlePlace}
          minY={minPlantY}
          maxY={maxPlantY}
        />
      )}

      <MoveGuideTag />

      <ChatPanel
        messages={chatHistory}
        agents={agents}
        collapsed={chatCollapsed}
        currentUserName={username}
        onToggleCollapsed={() => setChatCollapsed((v) => !v)}
        onSelectMessage={handleSelectChatMessage}
        onFocusTree={focusTreeById}
        onClearFocusedTree={() => setActiveDialogueAgent(null)}
        onSendMessage={handleSendMessageToTree}
        onSendSocialMessage={handleSendSocialMessage}
        activeTreeId={activeDialogueAgentId}
        focusInputSignal={chatInputFocusSignal}
        showComposer
        onDeleteTree={handleDeleteTree}
      />

      {/* <BgmAutoplayBlockedToast /> */}

      <BgmMushroom
        audioUrl={FOREST_BGM_AUDIO_URL}
        iconUrl={FOREST_BGM_ICON_URL}
        variant={isWinterSeason ? 'winter' : 'default'}
        enableSpringBirds={isSpringSeason}
        autoPlay
      />

      <TreeSpeciesPanel
        agents={agents}
        visibleTreeIds={visibleTreeIds}
        activeZoneLabel={activeEcologyZone.label}
        onDeleteTree={handleDeleteTree}
      />

      <AnimatePresence>
        {authCelebration && (
          <motion.div
            key={authCelebration.id}
            initial={{ opacity: 0, scale: 0.76, y: -24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -16 }}
            transition={{ duration: 0.32, ease: [0.2, 0.9, 0.2, 1] }}
            className="fixed top-16 left-1/2 -translate-x-1/2 pointer-events-none z-[110]"
          >
            <div
              style={{
                borderRadius: 18,
                background: authCelebration.variant === 'divine'
                  ? 'linear-gradient(145deg, rgba(255, 248, 226, 0.92), rgba(250, 237, 198, 0.9))'
                  : 'linear-gradient(145deg, rgba(246, 255, 248, 0.86), rgba(237, 252, 241, 0.92))',
                border: authCelebration.variant === 'divine'
                  ? '1px solid rgba(210, 181, 112, 0.58)'
                  : '1px solid rgba(133, 176, 142, 0.5)',
                boxShadow: authCelebration.variant === 'divine'
                  ? '0 10px 28px rgba(146, 112, 38, 0.18)'
                  : '0 10px 28px rgba(18, 58, 27, 0.2)',
                backdropFilter: 'blur(9px)',
                padding: '10px 16px 11px',
                minWidth: 220,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{authCelebration.emoji}</span>
                <span style={{ fontSize: 16, color: authCelebration.variant === 'divine' ? 'hsl(38, 42%, 24%)' : 'hsl(136, 30%, 24%)' }}>{authCelebration.title}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: authCelebration.variant === 'divine' ? 'rgba(117, 93, 48, 0.82)' : 'rgba(37, 76, 45, 0.76)' }}>
                {authCelebration.sub}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {authLocked && (
        <div
          className="fixed inset-0 z-[120]"
          style={{ background: 'transparent' }}
          aria-hidden="true"
        />
      )}

      <ForestLoginModal
        open={loginModalOpen}
        ssoLabel="使用 SecondMe 单点登录"
        ssoSubmitting={ssoSubmitting}
        ssoDisabled={Boolean(authConfigErrorMessage)}
        errorMessage={loginError || authConfigErrorMessage}
        errorPulse={loginErrorPulse}
        onSsoSubmit={handleSecondMeSso}
        onCancel={handleCancelLogin}
        forceAuth={authLocked}
      />

      {/* Wind Chime */}
      <WindChime username={username} onAuthAction={handleLoginEntry} loginPulse={loginPulse} interactionEvent={sceneInteractionEvent} />

      {/* Seed Button */}
      <SeedButton
        onClick={() => {
          if (!username) {
            setLoginModalOpen(true);
            showTreeNotice('请先使用 SecondMe 登录', '登录后才可以开始播种', '🔐', 2600);
            return;
          }
          setDrawingOpen(!drawingOpen);
        }}
        isOpen={drawingOpen}
      />

      {/* Drawing Panel */}
      <DrawingPanel
        isOpen={drawingOpen}
        onClose={() => setDrawingOpen(false)}
        onPlant={handlePlant}
      />
    </div>
  );
}
