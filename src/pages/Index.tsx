import { useState, useCallback, useRef, useEffect, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import type { WeatherType } from '@/components/Particles';
import { useTimeTheme, type TimeMode } from '@/hooks/useTimeTheme';
import ParallaxBackground from '@/components/ParallaxBackground';
import Particles from '@/components/Particles';
import SeedButton from '@/components/SeedButton';
import DrawingPanel from '@/components/DrawingPanel';
import WindChime from '@/components/WindChime';
import SummerTemporalEffects from '@/components/SummerTemporalEffects';
import WinterSeasonEffects from '@/components/WinterSeasonEffects';
import PlantedTree from '@/components/PlantedTree';
import PlantingGhost from '@/components/PlantingGhost';
import AgentLink from '@/components/AgentLink';
import ChatPanel from '@/components/ChatPanel';
import BgmMushroom from '@/components/BgmMushroom';
import TreeSpeciesPanel from '@/components/TreeSpeciesPanel';
import CelestialCelebration from '@/components/CelestialCelebration';
import ForestLoginModal, { type ForestAuthMode } from '@/components/ForestLoginModal';
import { getTreeDepthMetrics } from '@/lib/treeDepth';
import { useForestStore } from '@/stores/useForestStore';
import { ChatHistoryEntry, SceneTreeSnapshot } from '@/types/forest';
import { useAgentA2A } from '@/hooks/useAgentA2A';
import { useForestEcology } from '@/hooks/useForestEcology';
import { useAutoPlanting, renderTreeShapeToDataUrl } from '@/hooks/useAutoPlanting';
import { generateRandomProfile } from '@/lib/agentProfile';
import { generateClusteredTrees } from '@/lib/forestClusters';
import { supabase } from '@/lib/supabase';
import { getWorldEcologyAtmosphere, getWorldEcologyZone, pickShapeByWorldEcology } from '@/lib/worldEcology';

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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[\p{L}\p{N}_-]{2,24}$/u;

interface ProfileRow {
  id: string;
  username: string | null;
  email: string | null;
}

type SeasonMode = 'spring' | 'summer' | 'autumn' | 'winter' | 'auto';

const seasonOptions: Array<{ value: SeasonMode; label: string; icon: string }> = [
  { value: 'auto',   label: '自动', icon: '🌀' },
  { value: 'spring', label: '春',   icon: '🌱' },
  { value: 'summer', label: '夏',   icon: '☀️' },
  { value: 'autumn', label: '秋',   icon: '🍁' },
  { value: 'winter', label: '冬',   icon: '❄️' },
];

const weatherOptions: Array<{ value: WeatherType; label: string; icon: string }> = [
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

const resolveSeason = (season: SeasonMode): Exclude<SeasonMode, 'auto'> => {
  if (season !== 'auto') return season;
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const seasonLayerFilterMap: Record<Exclude<SeasonMode, 'auto'>, string> = {
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

const weatherHintMap: Record<WeatherType, string> = {
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
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<ForestAuthMode>('register');
  const [identifierInput, setIdentifierInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [loginErrorPulse, setLoginErrorPulse] = useState(0);
  const [loginPulse, setLoginPulse] = useState(0);
  const [season, setSeason] = useState<SeasonMode>('auto');
  const [timeMode, setTimeMode] = useState<TimeMode>('auto');
  const { theme, colors } = useTimeTheme(timeMode);
  const syncAgentsFromScene = useForestStore((state) => state.syncAgentsFromScene);
  const refreshNeighbors = useForestStore((state) => state.refreshNeighbors);
  const addTree = useForestStore((state) => state.addTree);
  const triggerGlobalSilence = useForestStore((state) => state.triggerGlobalSilence);
  const triggerDivineSurge = useForestStore((state) => state.triggerDivineSurge);
  const setConversationWeather = useForestStore((state) => state.setConversationWeather);
  const agents = useForestStore((state) => state.agents);
  const chatHistory = useForestStore((state) => state.chatHistory);
  useAgentA2A();

  const [drawingOpen, setDrawingOpen] = useState(false);
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [plantingImage, setPlantingImage] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollX, setScrollX] = useState(0);
  const [newTreeId, setNewTreeId] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [cameraZoom, setCameraZoom] = useState(1);
  const [openPopover, setOpenPopover] = useState<'season' | 'weather' | 'time' | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [focusedTreeId, setFocusedTreeId] = useState<string | null>(null);
  const [seedDrift, setSeedDrift] = useState<{ id: string; glyph: '🍃' | '🪶'; fromY: number; toY: number } | null>(null);
  const [celestialEffect, setCelestialEffect] = useState<'meteor' | 'aurora' | null>(null);
  const [treeNotice, setTreeNotice] = useState<{ id: string; text: string; sub: string; emoji: string; treeId?: string } | null>(null);
  const [authCelebration, setAuthCelebration] = useState<{ id: string; title: string; sub: string; emoji: string } | null>(null);
  const resolvedSeason = resolveSeason(season);
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
  const treeNoticeTimerRef = useRef<number | null>(null);
  const authCelebrationTimerRef = useRef<number | null>(null);
  const lastUserActionAtRef = useRef(Date.now());
  const lastGuardianMessageAtRef = useRef(0);
  const prevResolvedSeasonRef = useRef<Exclude<SeasonMode, 'auto'> | null>(null);
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const worldWidth = Math.max(WORLD_WIDTH_MIN, viewportWidth * WORLD_WIDTH_MULTIPLIER);
  const scrollMin = -Math.max(0, worldWidth - viewportWidth) * 2;
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
  const { emissionRateMultiplier } = useForestEcology();
  const showTreeNotice = useCallback((text: string, sub: string, emoji: string, durationMs = 3200, treeId?: string) => {
    if (treeNoticeTimerRef.current !== null) {
      window.clearTimeout(treeNoticeTimerRef.current);
    }
    setTreeNotice({ id: `${Date.now()}`, text, sub, emoji, treeId });
    treeNoticeTimerRef.current = window.setTimeout(() => {
      setTreeNotice(null);
      treeNoticeTimerRef.current = null;
    }, durationMs);
  }, []);

  const showAuthCelebration = useCallback((title: string, sub: string, emoji: string, durationMs = 2400) => {
    if (authCelebrationTimerRef.current !== null) {
      window.clearTimeout(authCelebrationTimerRef.current);
    }
    setAuthCelebration({ id: `${Date.now()}`, title, sub, emoji });
    authCelebrationTimerRef.current = window.setTimeout(() => {
      setAuthCelebration(null);
      authCelebrationTimerRef.current = null;
    }, durationMs);
  }, []);

  const resolveProfileLabel = useCallback(async (user: User | null): Promise<string | null> => {
    if (!user) return null;

    const { data } = await supabase
      .from('profiles')
      .select('username,email')
      .eq('id', user.id)
      .maybeSingle<Pick<ProfileRow, 'username' | 'email'>>();

    const profileUsername = data?.username?.trim();
    if (profileUsername) return profileUsername;

    const metadataUsername = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '';
    if (metadataUsername) return metadataUsername;

    return user.email ?? null;
  }, []);

  useEffect(() => {
    let active = true;

    const syncUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const label = await resolveProfileLabel(data.session?.user ?? null);
      if (!active) return;
      setUsername(label);
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        const label = await resolveProfileLabel(session?.user ?? null);
        if (!active) return;
        setUsername(label);
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [resolveProfileLabel]);

  const handleLoginEntry = useCallback(async (): Promise<'login-success' | 'logout' | 'noop'> => {
    if (authSubmitting) return 'noop';

    if (username) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setLoginError(error.message);
        setLoginErrorPulse((prev) => prev + 1);
        return 'noop';
      }
      setUsername(null);
      showTreeNotice('已退出登录', '你的森林身份已暂时离线', '👋', 2200);
      return 'logout';
    }

    setAuthMode('login');
    setIdentifierInput('');
    setEmailInput('');
    setPasswordInput('');
    setLoginError('');
    setLoginModalOpen(true);
    return 'noop';
  }, [authSubmitting, showTreeNotice, username]);

  const handleSubmitAuth = useCallback(async () => {
    const trimmedIdentifier = identifierInput.trim();
    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPassword = passwordInput.trim();

    if (!trimmedIdentifier) {
      setLoginError(authMode === 'register' ? '请先设置用户名' : '请先输入邮箱或用户名');
      setLoginErrorPulse((prev) => prev + 1);
      return;
    }

    if (!trimmedPassword) {
      setLoginError('请先输入密码');
      setLoginErrorPulse((prev) => prev + 1);
      return;
    }

    if (trimmedPassword.length < 6) {
      setLoginError('密码至少需要 6 位');
      setLoginErrorPulse((prev) => prev + 1);
      return;
    }

    setAuthSubmitting(true);
    setLoginError('');

    try {
      if (authMode === 'register') {
        if (!USERNAME_PATTERN.test(trimmedIdentifier)) {
          setLoginError('用户名需 2-24 位，可用字母、数字、下划线或短横线');
          setLoginErrorPulse((prev) => prev + 1);
          return;
        }

        if (!EMAIL_PATTERN.test(trimmedEmail)) {
          setLoginError('请输入有效邮箱');
          setLoginErrorPulse((prev) => prev + 1);
          return;
        }

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', trimmedIdentifier)
          .maybeSingle<Pick<ProfileRow, 'id'>>();

        if (existingProfile) {
          setLoginError('该用户名已被使用，请换一个');
          setLoginErrorPulse((prev) => prev + 1);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: { username: trimmedIdentifier },
          },
        });

        if (error) {
          setLoginError(error.message);
          setLoginErrorPulse((prev) => prev + 1);
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              username: trimmedIdentifier,
              email: trimmedEmail,
            }, { onConflict: 'id' });

          if (profileError) {
            setLoginError(`账号已创建，但资料写入失败：${profileError.message}`);
            setLoginErrorPulse((prev) => prev + 1);
            return;
          }
        }

        setIdentifierInput('');
        setEmailInput('');
        setPasswordInput('');
        setAuthMode('login');

        if (!data.session) {
          setLoginModalOpen(false);
          showTreeNotice('注册成功', '请前往邮箱确认后再登录', '📮', 3200);
          showAuthCelebration('注册完成', '已发送确认邮件，请完成验证', '🌿');
          return;
        }

        setUsername(trimmedIdentifier);
        setLoginPulse((prev) => prev + 1);
        setLoginModalOpen(false);
        showTreeNotice(`注册成功，${trimmedIdentifier}`, '森林通行证已激活', '🌲', 2800);
        showAuthCelebration('注册完成', `${trimmedIdentifier}，你的森林身份已创建`, '🌿');
        return;
      }

      const isEmailLogin = EMAIL_PATTERN.test(trimmedIdentifier);
      let resolvedEmail = trimmedIdentifier.toLowerCase();

      if (!isEmailLogin) {
        const { data: profileByUsername, error: usernameLookupError } = await supabase
          .from('profiles')
          .select('email,username')
          .ilike('username', trimmedIdentifier)
          .maybeSingle<Pick<ProfileRow, 'email' | 'username'>>();

        if (usernameLookupError) {
          setLoginError(usernameLookupError.message);
          setLoginErrorPulse((prev) => prev + 1);
          return;
        }

        if (!profileByUsername?.email) {
          setLoginError('未找到该用户名，请检查后重试');
          setLoginErrorPulse((prev) => prev + 1);
          return;
        }

        resolvedEmail = profileByUsername.email;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: trimmedPassword,
      });

      if (signInError) {
        setLoginError(signInError.message);
        setLoginErrorPulse((prev) => prev + 1);
        return;
      }

      const profileLabel = await resolveProfileLabel(signInData.user);
      const finalName = profileLabel ?? signInData.user.email ?? '森林旅人';
      setUsername(finalName);
      setIdentifierInput('');
      setEmailInput('');
      setPasswordInput('');
      setLoginPulse((prev) => prev + 1);
      setLoginModalOpen(false);
      showTreeNotice(`欢迎回来，${finalName}`, '登录入口已在右上角激活', '🎐', 2600);
      showAuthCelebration('通行证已激活', `${finalName}，欢迎回到森林`, '🎫');
    } finally {
      setAuthSubmitting(false);
    }
  }, [authMode, emailInput, identifierInput, passwordInput, resolveProfileLabel, showAuthCelebration, showTreeNotice]);

  const handleCancelLogin = useCallback(() => {
    setLoginModalOpen(false);
    setIdentifierInput('');
    setEmailInput('');
    setPasswordInput('');
    setLoginError('');
  }, []);

  const handleIdentifierChange = useCallback((value: string) => {
    setIdentifierInput(value);
    if (loginError) {
      setLoginError('');
    }
  }, [loginError]);

  const handleEmailChange = useCallback((value: string) => {
    setEmailInput(value);
    if (loginError) {
      setLoginError('');
    }
  }, [loginError]);

  const handlePasswordChange = useCallback((value: string) => {
    setPasswordInput(value);
    if (loginError) {
      setLoginError('');
    }
  }, [loginError]);

  const handleSwitchAuthMode = useCallback((mode: ForestAuthMode) => {
    setAuthMode(mode);
    setLoginError('');
    setIdentifierInput('');
    setEmailInput('');
    setPasswordInput('');
  }, []);

  const canSubmitAuth = authMode === 'register'
    ? USERNAME_PATTERN.test(identifierInput.trim()) && EMAIL_PATTERN.test(emailInput.trim().toLowerCase()) && passwordInput.trim().length >= 6
    : identifierInput.trim().length >= 2 && passwordInput.trim().length >= 6;

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
    const nextWeather: WeatherType | 'night' = theme === 'night' ? 'night' : weather;
    setConversationWeather(nextWeather);
  }, [setConversationWeather, theme, weather]);

  useEffect(() => {
    const previousSeason = prevResolvedSeasonRef.current;
    if (resolvedSeason === 'winter' && previousSeason !== 'winter') {
      setWeather('snow');
    }
    prevResolvedSeasonRef.current = resolvedSeason;
  }, [resolvedSeason]);

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
    };
  }, []);

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
  }, [clampScrollX, trees]);

  const handleSelectChatMessage = useCallback((entry: ChatHistoryEntry) => {
    focusTreeById(entry.speakerId);
  }, [focusTreeById]);

  // Handle planting
  const handlePlant = useCallback((imageData: string) => {
    setDrawingOpen(false);
    setPlantingImage(imageData);
  }, []);

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
    const h = window.innerHeight;
    // Clamp to lower portion (grass area)
    const clampedY = Math.max(h * 0.55, Math.min(h * 0.85, y));
    const size = 78 + Math.random() * 52;
    const id = Date.now().toString();
    const worldX = x - size / 2 - scrollX + size / 2;
    const divineShape = pickShapeByWorldEcology(worldX, worldWidth);

    // Play wood chime sound
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

    addTree({
      id,
      position: { x: worldX, y: clampedY },
      scale: 1,
      zIndex: Math.floor(clampedY),
      name: `神启${Math.floor(10 + Math.random() * 90)}`,
      personality: '神启',
      metadata: {
        bio: '由造物主亲手种下，能感知整片森林的呼吸与远方的年轮。',
        lastWords: '愿你们都在风里长成自己。',
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

    triggerGlobalSilence(3000, '造物主降下了新的生命，万物静听。', id);
    triggerDivineSurge(10_000);
    playManualFirstHeartbeat();
    setCelestialEffect(Math.random() < 0.5 ? 'meteor' : 'aurora');
    window.setTimeout(() => setCelestialEffect(null), 10_000);
    showTreeNotice('神启之树降临', '造物主亲手种下，万物肃穆', '⚡', 10_000, id);

    setNewTreeId(id);
    setPlantingImage(null);
    setTimeout(() => setNewTreeId(null), 3500);
  }, [addTree, plantingImage, playManualFirstHeartbeat, scrollX, showTreeNotice, triggerDivineSurge, triggerGlobalSilence, worldWidth]);

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

    const sampleTrees = [...clusteredTrees, ...legacyAnchorTrees];

    setTrees(sampleTrees);
  }, [maxPlantY, minPlantY, viewportWidth, worldWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleTrees = useMemo(() => {
    return trees.filter((tree) => {
      const screenX = tree.x + scrollX;
      const right = screenX + tree.size;
      const left = screenX;
      return right >= -TREE_CULL_BUFFER && left <= viewportWidth + TREE_CULL_BUFFER;
    });
  }, [scrollX, trees, viewportWidth]);
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
      <WinterSeasonEffects season={resolvedSeason} weather={weather} />

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
              border: '1px solid rgba(122, 164, 136, 0.42)',
              background: 'rgba(255, 255, 255, 0.74)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(44, 78, 58, 0.14)',
              cursor: treeNotice.treeId ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{treeNotice.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: 'hsl(146, 30%, 24%)',
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
                  color: 'rgba(68, 92, 78, 0.76)',
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
          weather={weather}
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
          {visibleTrees.map((tree) => {
            const profile = agents.find((agent) => agent.id === tree.id);
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
              />
            );
          })}

          <AgentLink
            agents={agents}
            sceneTrees={visibleTrees.map((tree) => ({
              id: tree.id,
              x: tree.x,
              y: tree.y,
              size: tree.size,
              scale: 1,
              zIndex: 0,
            }))}
          />
        </div>

        {/* Particles */}
        <Particles
          colors={colors}
          weather={weather}
          season={resolvedSeason}
          emissionRateMultiplier={emissionRateMultiplier}
          atmosphere={activeEcologyAtmosphere}
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
            <span>{seasonOptions.find(o => o.value === season)!.icon}</span>
            <span>{seasonOptions.find(o => o.value === season)!.label}</span>
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
                  {seasonHintMap[season]}
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
            <span>{weatherOptions.find(o => o.value === weather)!.icon}</span>
            <span>{weatherOptions.find(o => o.value === weather)!.label}</span>
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
                  {weatherHintMap[weather]}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {weatherOptions.map(opt => {
                    const active = weather === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => { setWeather(opt.value); setOpenPopover(null); }}
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
            <span>{timeOptions.find(o => o.value === timeMode)!.icon}</span>
            <span>{timeOptions.find(o => o.value === timeMode)!.label}</span>
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
                  {timeHintMap[timeMode]}
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

      <ChatPanel
        messages={chatHistory}
        agents={agents}
        collapsed={chatCollapsed}
        onToggleCollapsed={() => setChatCollapsed((v) => !v)}
        onSelectMessage={handleSelectChatMessage}
        onFocusTree={focusTreeById}
      />

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
                background: 'linear-gradient(145deg, rgba(246, 255, 248, 0.86), rgba(237, 252, 241, 0.92))',
                border: '1px solid rgba(133, 176, 142, 0.5)',
                boxShadow: '0 10px 28px rgba(18, 58, 27, 0.2)',
                backdropFilter: 'blur(9px)',
                padding: '10px 16px 11px',
                minWidth: 220,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{authCelebration.emoji}</span>
                <span style={{ fontSize: 16, color: 'hsl(136, 30%, 24%)' }}>{authCelebration.title}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(37, 76, 45, 0.76)' }}>
                {authCelebration.sub}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ForestLoginModal
        open={loginModalOpen}
        mode={authMode}
        identifier={identifierInput}
        email={emailInput}
        password={passwordInput}
        isSubmitting={authSubmitting}
        errorMessage={loginError}
        errorPulse={loginErrorPulse}
        canSubmit={canSubmitAuth}
        onIdentifierChange={handleIdentifierChange}
        onEmailChange={handleEmailChange}
        onPasswordChange={handlePasswordChange}
        onSubmit={handleSubmitAuth}
        onSwitchMode={handleSwitchAuthMode}
        onCancel={handleCancelLogin}
      />

      {/* Wind Chime */}
      <WindChime username={username} onAuthAction={handleLoginEntry} loginPulse={loginPulse} />

      {/* Seed Button */}
      <SeedButton onClick={() => setDrawingOpen(!drawingOpen)} isOpen={drawingOpen} />

      {/* Drawing Panel */}
      <DrawingPanel
        isOpen={drawingOpen}
        onClose={() => setDrawingOpen(false)}
        onPlant={handlePlant}
      />
    </div>
  );
}
