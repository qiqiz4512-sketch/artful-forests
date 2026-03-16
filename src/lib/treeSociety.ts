import { PRESET_TREE_SHAPES, TreeShapePreset } from '@/constants/treeShapes';
import {
  DIVINE_ADORATION_QUOTES,
  DIVINE_ADORATION_REPLIES,
  NIGHT_THEME_LINES,
  PERSONALITY_DICTIONARY,
  PERSONALITY_PAIR_MATRIX,
  RELATION_CONTEXT_LIBRARY,
  pickWithRandomOffset,
  resolveDialogueTone,
} from '@/constants/dialogueLibrary';
import { PERSONA_MATRIX, PersonaKey } from '@/constants/personaMatrix';
import { TreeAgent, TreePersonality } from '@/types/forest';
import { pickShapeByWorldEcology } from '@/lib/worldEcology';
import { applyTreePersonaFlavor } from '@/lib/treePersonaRuntime';

export type SocialRelationType = 'partner' | 'family' | 'friend' | 'stranger';

const PERSONALITY_KEYS: TreePersonality[] = ['温柔', '睿智', '顽皮', '社恐', '神启'];

const randomIn = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export type DialogueWeather = 'sunny' | 'rain' | 'snow' | 'night';

interface DialogueContext {
  weather?: DialogueWeather;
  intimacy?: number;
}

export type MemoryCueMode = 'continuation' | 'familiar' | null;

export interface MemoryCueResult {
  mode: MemoryCueMode;
  line: string;
  topic: string;
}

interface WeightedBucket {
  lines: string[];
  weight: number;
}

const weightedPickBucket = (buckets: WeightedBucket[]): string[] => {
  const normalized = buckets.filter((bucket) => bucket.lines.length > 0 && bucket.weight > 0);
  if (normalized.length === 0) return [];
  const total = normalized.reduce((sum, bucket) => sum + bucket.weight, 0);
  let cursor = Math.random() * total;
  for (const bucket of normalized) {
    cursor -= bucket.weight;
    if (cursor <= 0) return bucket.lines;
  }
  return normalized[normalized.length - 1].lines;
};

const MEMORY_CONTINUATION_WINDOW_MS = 5 * 60 * 1000;
const MEMORY_DECAY_WINDOW_MS = 30 * 60 * 1000;
const MEMORY_DISTANCE_DECAY_PX = 1400;
const PLAYFUL_STINGERS = ['说好了，不许突然害羞。', '这句先别忘，我们回头验收。', '先笑一下，再继续。'];
const TONE_SIGNATURES: Record<'温柔' | '睿智' | '活泼' | '社恐' | '调皮', string[]> = {
  温柔: ['我会在旁边，慢慢陪着你。', '别急，我们一步一步来。'],
  睿智: ['慢一点，答案会更清楚。', '把这句留给年轮，它会替我们记住。'],
  活泼: ['这一段我先记成开心章节！', '好耶，我们继续下一句！'],
  社恐: ['谢谢你愿意听我慢慢说。', '我会努力把下一句说清楚。'],
  调皮: ['这句先存档，回头我还要加戏。', '不行，我现在就想偷笑。'],
};

const withToneSignature = (
  line: string,
  tone: '温柔' | '睿智' | '活泼' | '社恐' | '调皮',
  relation: SocialRelationType,
  intimacy: number,
) => {
  let result = line.trim();

  if (tone === '社恐' && !/(那个|嗯|我\.\.\.)/.test(result) && Math.random() < 0.2) {
    result = `那个... ${result}`;
  }

  if (tone === '活泼' && !/[!！]$/.test(result) && Math.random() < 0.34) {
    result = `${result}！`;
  }

  const signatureChance = relation === 'stranger'
    ? 0.08
    : intimacy >= 78
      ? 0.24
      : 0.14;

  if (result.length <= 40 && Math.random() < signatureChance) {
    result = `${result} ${randomIn(TONE_SIGNATURES[tone])}`;
  }

  return result;
};

const memoryContinuationLines = (tone: string, topic: string): string[] => {
  switch (tone) {
    case '温柔':
      return [
        `你刚才聊到“${topic}”，我一直记在心里。现在好一点了吗？`,
        `我想起你刚说的“${topic}”，要不要我陪你慢慢说完。`,
      ];
    case '睿智':
      return [
        `关于你说的“${topic}”，我在岁月里又想到了新的答案。`,
        `你提到的“${topic}”，像星辰一样，越想越有回声。`,
      ];
    case '调皮':
      return [
        `哈哈，还记得你刚刚那段“${topic}”吗？我可没忘。`,
        `你上次聊“${topic}”时可认真了，我都差点笑出声。`,
      ];
    case '社恐':
      return [
        `那个... 你刚才说的“${topic}”，我有在认真记着。`,
        `谢谢你刚才聊“${topic}”时放慢了语速，我舒服很多...`,
      ];
    case '活泼':
      return [
        `嘿！你刚才提的“${topic}”我还记得，后续呢后续呢！`,
        `哇！“${topic}”这个话题超有趣，我们继续！`,
      ];
    default:
      return [`你刚才说的“${topic}”，我还在想着。`];
  }
};

const memoryFamiliarLines = (tone: string, topic: string, impression: string): string[] => {
  switch (tone) {
    case '温柔':
      return [
        `你又来了呀。上次你聊“${topic}”时情绪有点低落，现在好些了吗？`,
        `再次见到你真好，我还记得你那次关于“${topic}”的心事。`,
      ];
    case '睿智':
      return [
        `又见面了。你上次提到“${topic}”，我想了很久。`,
        `欢迎回来，关于“${topic}”与远方，我有了新理解。`,
      ];
    case '调皮':
      return [
        `嘿，又是你呀！上次“${topic}”那个糗事我可还记着呢，${impression}风格太明显了。`,
        `你回来啦？我还等着听你把“${topic}”那段讲完。`,
      ];
    case '社恐':
      return [
        `那个... 又见到你了，谢谢你上次陪我安静地聊“${topic}”。`,
        `嗯... 你还记得吗，上次你让我在“${topic}”里慢慢说。`,
      ];
    case '活泼':
      return [
        `嘿！老朋友！你上次说“${topic}”时我就想继续追问啦！`,
        `哇又遇见你！上回“${topic}”故事你还没讲完呢！`,
      ];
    default:
      return [`嘿，又见面了，你上次说“${topic}”我还记得。`];
  }
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const normalizePersonality = (value: string): TreePersonality =>
  PERSONALITY_KEYS.includes(value as TreePersonality) ? (value as TreePersonality) : '温柔';

export const isDivineTree = (agent?: Pick<TreeAgent, 'personality' | 'isManual'> | null) =>
  Boolean(agent && (agent.isManual || agent.personality === '神启'));

export function isAdult(agent: TreeAgent): boolean {
  return agent.energy >= 45;
}

function getAncestorSet(start: TreeAgent, idToAgent: Map<string, TreeAgent>, depthLimit = 4): Set<string> {
  const visited = new Set<string>();
  let frontier = [...start.parents];
  let depth = 0;
  while (frontier.length > 0 && depth < depthLimit) {
    const next: string[] = [];
    frontier.forEach((id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const parent = idToAgent.get(id);
      if (parent) next.push(...parent.parents);
    });
    frontier = next;
    depth += 1;
  }
  return visited;
}

export function areBloodRelated(a: TreeAgent, b: TreeAgent, idToAgent: Map<string, TreeAgent>): boolean {
  if (a.id === b.id) return true;
  if (a.parents.includes(b.id) || b.parents.includes(a.id)) return true;
  const aParents = new Set(a.parents);
  if (b.parents.some((id) => aParents.has(id))) return true;

  const aAnc = getAncestorSet(a, idToAgent);
  const bAnc = getAncestorSet(b, idToAgent);
  if ([...aAnc].some((id) => bAnc.has(id))) return true;
  if (aAnc.has(b.id) || bAnc.has(a.id)) return true;
  return false;
}

export function getRelationType(sender: TreeAgent, receiver: TreeAgent): SocialRelationType {
  if (sender.socialCircle.partner === receiver.id) return 'partner';
  if (sender.socialCircle.family.includes(receiver.id)) return 'family';
  if (sender.socialCircle.friends.includes(receiver.id) || (sender.intimacyMap[receiver.id] ?? 0) >= 65) return 'friend';
  return 'stranger';
}

export function createPersonalityDialogue(sender: TreeAgent, receiver: TreeAgent, context: DialogueContext = {}): string {
  if (isDivineTree(sender) && !isDivineTree(receiver)) {
    return pickWithRandomOffset(DIVINE_ADORATION_REPLIES);
  }

  if (!isDivineTree(sender) && isDivineTree(receiver)) {
    return pickWithRandomOffset(DIVINE_ADORATION_QUOTES);
  }

  const relation = getRelationType(sender, receiver);
  const senderTone = resolveDialogueTone(sender.personality);
  const receiverTone = resolveDialogueTone(receiver.personality);
  const intimacy = context.intimacy ?? sender.intimacyMap[receiver.id] ?? 0;
  const relationWeight = relation === 'partner' ? 4.8 : relation === 'family' ? 3.9 : relation === 'friend' ? 3 : 1.8;
  const intimacyWeight = 1 + intimacy / 100;

  const pairLines = PERSONALITY_PAIR_MATRIX[senderTone]?.[receiverTone] ?? [];
  const toneLines = PERSONALITY_DICTIONARY[senderTone];
  const relationLines = RELATION_CONTEXT_LIBRARY[relation];
  const nightLines = context.weather === 'night' ? NIGHT_THEME_LINES : [];

  const baseBucket = weightedPickBucket([
    { lines: pairLines, weight: relationWeight + intimacyWeight + 1.1 },
    { lines: relationLines, weight: relationWeight + intimacyWeight },
    { lines: toneLines, weight: 2.4 },
    { lines: nightLines, weight: context.weather === 'night' ? 2.8 : 0 },
  ]);

  const baseLine = baseBucket.length > 0 ? pickWithRandomOffset(baseBucket) : pickWithRandomOffset(toneLines);
  const tailPool = [
    ...(relation === 'partner' ? relationLines : []),
    ...(relation === 'family' ? relationLines : []),
    ...nightLines,
  ];

  const tailChance = relation === 'partner' ? 0.55 : relation === 'family' ? 0.5 : relation === 'friend' ? 0.4 : 0.26;
  let finalLine = baseLine;

  if (tailPool.length === 0 || Math.random() > tailChance) {
    if ((senderTone === '调皮' || senderTone === '活泼') && Math.random() < 0.2) {
      finalLine = `${baseLine} ${randomIn(PLAYFUL_STINGERS)}`;
    } else {
      finalLine = baseLine;
    }
  } else {
    const tail = pickWithRandomOffset(tailPool);
    const stitched = tail === baseLine ? baseLine : `${baseLine} ${tail}`;
    if ((senderTone === '调皮' || senderTone === '活泼') && Math.random() < 0.14) {
      finalLine = `${stitched} ${randomIn(PLAYFUL_STINGERS)}`;
    } else {
      finalLine = stitched;
    }
  }

  return withToneSignature(finalLine, senderTone, relation, intimacy);
}

/** Internet-community-style dialogue: uses PERSONA_MATRIX language, emojis, slang */
export function createCommunityDialogue(
  sender: TreeAgent,
  receiver: TreeAgent,
  context: DialogueContext & { echoText?: string; weather?: DialogueWeather } = {},
): string {
  // Divine trees keep their special speech
  if (isDivineTree(sender) && !isDivineTree(receiver)) {
    return pickWithRandomOffset(DIVINE_ADORATION_REPLIES);
  }
  if (!isDivineTree(sender) && isDivineTree(receiver)) {
    return pickWithRandomOffset(DIVINE_ADORATION_QUOTES);
  }

  const senderKey = sender.personality as PersonaKey;
  const receiverKey = receiver.personality as PersonaKey;
  const profile = PERSONA_MATRIX[senderKey] ?? PERSONA_MATRIX['温柔'];
  const relation = getRelationType(sender, receiver);
  const intimacy = context.intimacy ?? sender.intimacyMap[receiver.id] ?? 0;

  // Choose base line: pair-specific > context weather > general pool
  let baseLine: string;
  const pairPool = profile.pairLines[receiverKey];
  const weatherKey = context.weather as keyof typeof profile.contextLines | undefined;
  const contextPool = weatherKey ? profile.contextLines[weatherKey] : undefined;

  const roll = Math.random();
  if (pairPool && pairPool.length > 0 && (roll < 0.35 || !contextPool)) {
    baseLine = randomIn(pairPool);
  } else if (contextPool && contextPool.length > 0 && roll < 0.6) {
    baseLine = randomIn(contextPool);
  } else {
    baseLine = randomIn(profile.lines);
  }

  // Echo relay: reference a word from recent conversation ~25%
  if (context.echoText && context.echoText.length > 4 && Math.random() < 0.25) {
    const words = context.echoText
      .replace(/[😭✨🎉🐞🌈🥹😌💧☀️🌿🤔🌀🤌📊💭😰👁️📝🙃😳🤣💅💀😤]/gu, '')
      .split(/[\s，。！？、…]+/)
      .filter((w) => w.length >= 2 && w.length <= 6);
    if (words.length > 0) {
      const echo = randomIn(words);
      baseLine = `"${echo}" 哈哈！${baseLine}`;
    }
  }

  // Partner/family intimate suffix
  if ((relation === 'partner' || relation === 'family') && intimacy >= 70 && Math.random() < 0.3) {
    const intimateTail: Record<string, string> = {
      partner: '（只说给你听）',
      family: '（咱家人都这样吧',
    };
    baseLine = `${baseLine} ${intimateTail[relation]}`;
  }

  return baseLine;
}

const SOCIAL_GAG_LIBRARY = {
  xiaohongshu: '家人们谁懂啊，今天的露水一整个惊艳住，平替版SK2了属于是💅。',
  abstract: '鉴定为纯纯的脆皮大学生树，风吹一下就emo了😭。',
  snark: '你小子长这么高，是想在树顶蹭造物主的 Wi-Fi 吗？🤔',
  deep: '有些树表面在扎根，实际在地下已经跟邻居偷偷牵手赢麻了。',
} as const;

/**
 * Social-chat generator with meme/gag injections.
 * Keeps base persona dialogue and occasionally adds internet-style abstract lines.
 */
export function generateSocialChat(
  sender: TreeAgent,
  receiver: TreeAgent,
  context: DialogueContext & { echoText?: string; weather?: DialogueWeather } = {},
): string {
  const baseLine = createCommunityDialogue(sender, receiver, context);
  const tone = resolveDialogueTone(sender.personality);
  const relation = getRelationType(sender, receiver);

  const gagPool: string[] = [];
  if (tone === '温柔' || context.weather === 'sunny') gagPool.push(SOCIAL_GAG_LIBRARY.xiaohongshu);
  if (tone === '社恐') gagPool.push(SOCIAL_GAG_LIBRARY.abstract);
  if (tone === '调皮') gagPool.push(SOCIAL_GAG_LIBRARY.snark);
  if (tone === '睿智' || relation === 'partner' || relation === 'friend') gagPool.push(SOCIAL_GAG_LIBRARY.deep);

  const baseChance = tone === '调皮' || tone === '活泼' ? 0.36 : 0.24;
  const gagChance = context.intimacy && context.intimacy >= 70 ? baseChance + 0.08 : baseChance;

  if (gagPool.length > 0 && Math.random() < gagChance) {
    return applyTreePersonaFlavor(sender, `${baseLine} ${randomIn(gagPool)}`);
  }

  return applyTreePersonaFlavor(sender, baseLine);
}

export function resolveMemoryCue(sender: TreeAgent, receiver: TreeAgent, now = Date.now()): MemoryCueResult | null {
  const memory = receiver.memory;
  if (!memory) return null;

  const topic = memory.lastTopic || '森林';
  const age = now - (memory.timestamp || 0);
  const distance = Math.abs(sender.position.x - receiver.position.x);
  const receiverTone = resolveDialogueTone(receiver.personality);

  if (memory.timestamp > 0 && age <= MEMORY_CONTINUATION_WINDOW_MS) {
    return {
      mode: 'continuation',
      topic,
      line: pickWithRandomOffset(memoryContinuationLines(receiverTone, topic)),
    };
  }

  const familiar = memory.interactionHistory.find((item) => item.agentId === sender.id);
  if (!familiar) return null;

  const familiarAge = now - familiar.timestamp;
  const ageFactor = clamp(1 - familiarAge / MEMORY_DECAY_WINDOW_MS, 0, 1);
  const distanceFactor = clamp(1 - distance / MEMORY_DISTANCE_DECAY_PX, 0, 1);
  const retention = ageFactor * 0.7 + distanceFactor * 0.3;
  if (retention < 0.28) return null;

  return {
    mode: 'familiar',
    topic: familiar.lastTopic || topic,
    line: pickWithRandomOffset(
      memoryFamiliarLines(receiverTone, familiar.lastTopic || topic, familiar.personalityImpression),
    ),
  };
}

const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = hex.replace('#', '').trim();
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('')}`;

export function mixHexColor(a: string, b: string, mutation = 0): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const mutate = () => (Math.random() * 2 - 1) * mutation;
  return rgbToHex((ar + br) * 0.5 + mutate(), (ag + bg) * 0.5 + mutate(), (ab + bb) * 0.5 + mutate());
}

export function buildChildShape(
  parentA: TreeAgent,
  parentB: TreeAgent,
  x: number,
  worldWidth: number,
): TreeShapePreset {
  const shapeA = parentA.shape;
  const shapeB = parentB.shape;
  const fallback = pickShapeByWorldEcology(x, worldWidth);

  if (!shapeA || !shapeB) {
    return Math.random() < 0.5 ? fallback : PRESET_TREE_SHAPES[Math.floor(Math.random() * PRESET_TREE_SHAPES.length)];
  }

  if (Math.random() < 0.5) {
    return Math.random() < 0.5 ? shapeA : shapeB;
  }

  const base = Math.random() < 0.5 ? shapeA : shapeB;
  const mixedLeaves = mixHexColor(shapeA.colorPalette.leaves, shapeB.colorPalette.leaves, 20);
  const mixedTrunk = mixHexColor(shapeA.colorPalette.trunk, shapeB.colorPalette.trunk, 12);
  const accentA = shapeA.colorPalette.accent ?? shapeA.colorPalette.leaves;
  const accentB = shapeB.colorPalette.accent ?? shapeB.colorPalette.leaves;
  const mixedAccent = mixHexColor(accentA, accentB, 24);

  return {
    ...base,
    id: `${base.id}-child-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    colorPalette: {
      trunk: mixedTrunk,
      leaves: mixedLeaves,
      accent: mixedAccent,
    },
  };
}

export function getAttentionTargetId(agent: TreeAgent): string | null {
  if (agent.socialCircle.partner) return agent.socialCircle.partner;
  const sorted = Object.entries(agent.intimacyMap)
    .filter(([id]) => !agent.socialCircle.family.includes(id))
    .sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  return sorted[0][1] >= 72 ? sorted[0][0] : null;
}
