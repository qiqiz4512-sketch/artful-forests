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
import { getSlangEnvironmentalTrigger, getSlangGlobalRules, getSlangTemplatesForPersonality } from '@/constants/forestSlangConfig';
import { TreeAgent, TreePersonality } from '@/types/forest';
import { getWorldEcologyZone, inferWorldWidthFromPositions, pickShapeByWorldEcology } from '@/lib/worldEcology';
import { applyTreePersonaFlavor } from '@/lib/treePersonaRuntime';

export type SocialRelationType = 'partner' | 'family' | 'friend' | 'stranger';

const PERSONALITY_KEYS: TreePersonality[] = ['温柔', '睿智', '顽皮', '社恐', '神启'];

const randomIn = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export type DialogueWeather = 'sunny' | 'rain' | 'snow' | 'night';
export type DialogueSeason = 'spring' | 'summer' | 'autumn' | 'winter';

interface DialogueContext {
  weather?: DialogueWeather;
  season?: DialogueSeason;
  intimacy?: number;
}

export type MemoryCueMode = 'continuation' | 'familiar' | null;

export interface MemoryCueResult {
  mode: MemoryCueMode;
  line: string;
  topic: string;
}

export interface SocialEventClassificationInput {
  likes: number;
  comments: number;
  crossZone: boolean;
  intimacyBefore: number;
  intimacyAfter: number;
  compatibilityBefore?: number;
  compatibilityAfter?: number;
  hasDivineTree: boolean;
  hasRecentTopicEcho?: boolean;
}

export interface SocialEventClassificationResult {
  heat: number;
  isTrending: boolean;
  type: 'chat' | 'epic';
}

export interface CompatibilityBreakdown {
  intimacy: number;
  ecologyAffinity: number;
  personalityFit: number;
  memoryDepth: number;
  engagement: number;
  total: number;
  hardGatePassed: boolean;
  eligibleForPartner: boolean;
  eligibleForBreeding: boolean;
}

interface RecentTopicContinuationInput {
  topic: string;
  echoText?: string;
  intimacy?: number;
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
        `我想起你刚说的“${topic}”，要不要我陪你慢慢说完。`,        `"${topic}"这个话题你说到一半就停了，我还在等你接着讲。`,
        `刚才你提到"${topic}"时眼神有点远，我想多陪你待一会儿。`,
        `你聊"${topic}"时的那种温度，我还感受着呢。`,      ];
    case '睿智':
      return [
        `关于你说的“${topic}”，我在岁月里又想到了新的答案。`,
        `你提到的“${topic}”，像星辰一样，越想越有回声。`,        `"${topic}"这条线索让我想了很久，有些事情值得再深挖一层。`,
        `你提的"${topic}"让我想起一句话：一个问题能被记住，说明它还没有被真正解开。`,
        `关于"${topic}"，我们上次只摸到了表面，还有更深的脉络可以推。`,      ];
    case '调皮':
      return [
        `哈哈，还记得你刚刚那段“${topic}”吗？我可没忘。`,
        `你上次聊“${topic}”时可认真了，我都差点笑出声。`,        `"${topic}"这个词你一说我就来劲了，快快快继续讲！`,
        `我把"${topic}"这件事悄悄记在树洞里了，你不补完我不放你走。`,
        `上次你说到"${topic}"突然停了，是不是故意吊我胃口？`,      ];
    case '社恐':
      return [
        `那个... 你刚才说的“${topic}”，我有在认真记着。`,
        `谢谢你刚才聊“${topic}”时放慢了语速，我舒服很多...`,        `"${topic}"... 我一个人反复想了好几遍，感觉有点懂了。`,
        `你说"${topic}"的时候我没来得及回应，但我一直在听的。`,
        `那个... 关于"${topic}"，我想了很久才鼓起勇气再提。`,      ];
    case '活泼':
      return [
        `嘿！你刚才提的“${topic}”我还记得，后续呢后续呢！`,
        `哇！“${topic}”这个话题超有趣，我们继续！`,
        `"${topic}"还没聊够啊，我刚刚才进入状态！`,
        `你把"${topic}"说了个开头就跑，不行不行，快回来！`,
        `我把"${topic}"这件事一直挂在枝叶上等你回来讲完！`,
      ];
    default:
      return [
        `你刚才说的"${topic}"，我还在想着。`,
        `"${topic}"这件事，我想和你多聊几句。`,
        `关于"${topic}"，我有点没说完的话。`,
      ];
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

const summarizeEchoFragment = (echoText?: string): string | null => {
  if (!echoText) return null;
  const sanitized = echoText
    .replace(/[“”"'`]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) return null;
  return Array.from(sanitized).slice(0, 12).join('').trim() || null;
};

export const RECENT_TOPIC_CONTINUATION_WINDOW_MS = MEMORY_CONTINUATION_WINDOW_MS;

export function buildRecentTopicContinuation(
  sender: TreeAgent,
  receiver: TreeAgent,
  input: RecentTopicContinuationInput,
): string {
  const topic = input.topic.trim() || '森林';
  const relation = getRelationType(sender, receiver);
  const intimacy = input.intimacy ?? sender.intimacyMap[receiver.id] ?? 0;
  const tone = resolveDialogueTone(sender.personality);
  const echoFragment = summarizeEchoFragment(input.echoText);

  const topicTemplates: Record<'温柔' | '睿智' | '活泼' | '社恐' | '调皮', string[]> = {
    温柔: [
      `那我们先接着“${topic}”慢慢说，我还在听。`,
      `你刚才把话头留在“${topic}”，我想继续陪你聊完。`,      `不急，"${topic}"这件事可以慢慢讲，我哪儿也不去。`,
      `你把"${topic}"说到一半就停了，我有点不放心，想接着陪你。`,
      `我们可以把"${topic}"当作今天的主题，你说，我听。`,    ],
    睿智: [
      `既然我们的话题还停在“${topic}”，那我顺着这条线继续往下想。`,
      `关于“${topic}”，刚才那句还没说透，我们接着推一层。`,      `"${topic}"这件事的纹理比看起来复杂，我们多转几个角度。`,
      `刚才关于"${topic}"的那个切口很有意思，我想从那里继续。`,
      `"${topic}"背后还有很多没展开的东西，我们继续翻。`,    ],
    活泼: [
      `好耶，我们继续“${topic}”这条线，我刚刚就想追问了！`,
      `先别换题，${topic} 这段还热乎着，我们接着冲！`,      `"${topic}"！！还没说完呢，继续继续！`,
      `不许切话题，"${topic}"刚到精彩部分！`,
      `等等等等，"${topic}"这条线我追定了！`,    ],
    社恐: [
      `那个... 我想先接着“${topic}”说下去，这样我会更安心一点。`,
      `如果可以的话，我们先别跳开，我还想把“${topic}”讲完...`,      `"${topic}"... 我还没想好怎么接，但我不想跳走。`,
      `能不能先别换话题，"${topic}"我还没说完想说的。`,
      `那个... 关于"${topic}"我还有话，只是需要慢慢找词。`,    ],
    调皮: [
      `先别切走，“${topic}”这条支线我还没玩够。`,
      `哈哈，“${topic}”刚聊到有意思的地方，当然得继续。`,      `等等，"${topic}"这个梗还没使完，继续继续！`,
      `你想溜？不行，"${topic}"还差一个结局。`,
      `"${topic}"这段我还没截图存档，先别跑！`,    ],
  };

  const baseLine = randomIn(topicTemplates[tone]);
  const echoTail = echoFragment && Math.random() < 0.75
    ? `刚才那句“${echoFragment}”我还记着。`
    : null;
  const stitched = [baseLine, echoTail].filter(Boolean).join(' ');
  return withToneSignature(stitched, tone, relation, intimacy);
}

export function classifySocialEvent(input: SocialEventClassificationInput): SocialEventClassificationResult {
  const likesScore = Math.min(30, Math.max(0, input.likes) * 3);
  const commentsScore = Math.min(20, Math.max(0, input.comments) * 4);
  const crossZoneScore = input.crossZone ? 15 : 0;
  const intimacyJumpScore = input.intimacyAfter >= 90
    || (input.intimacyBefore < 65 && input.intimacyAfter >= 65)
    || ((input.compatibilityBefore ?? 0) < 70 && (input.compatibilityAfter ?? 0) >= 70)
      ? 20
      : Math.max(0, Math.min(20, input.intimacyAfter - input.intimacyBefore));
  const divineScore = input.hasDivineTree ? 15 : 0;
  const memoryEchoScore = input.hasRecentTopicEcho ? 10 : 0;
  const heat = likesScore + commentsScore + crossZoneScore + intimacyJumpScore + divineScore + memoryEchoScore;

  return {
    heat,
    isTrending: heat >= 45,
    type: heat >= 70 ? 'epic' : 'chat',
  };
}

export const PARTNER_COMPATIBILITY_THRESHOLD = 70;
export const PARTNER_TENSION_THRESHOLD = 55;

type CompatibilityTone = 'gentle' | 'wise' | 'lively' | 'shy' | 'playful' | 'divine';

const PERSONALITY_COMPATIBILITY: Record<CompatibilityTone, Record<CompatibilityTone, number>> = {
  gentle: { gentle: 88, wise: 92, lively: 80, shy: 96, playful: 72, divine: 78 },
  wise: { gentle: 92, wise: 84, lively: 76, shy: 82, playful: 74, divine: 86 },
  lively: { gentle: 80, wise: 76, lively: 82, shy: 78, playful: 90, divine: 74 },
  shy: { gentle: 96, wise: 82, lively: 78, shy: 76, playful: 64, divine: 72 },
  playful: { gentle: 72, wise: 74, lively: 90, shy: 64, playful: 80, divine: 68 },
  divine: { gentle: 78, wise: 86, lively: 74, shy: 72, playful: 68, divine: 88 },
};

const resolveCompatibilityTone = (agent: TreeAgent): CompatibilityTone => {
  if (agent.isManual || agent.personality === '神启') return 'divine';
  if (agent.personality === '温柔') return 'gentle';
  if (agent.personality === '睿智') return 'wise';
  if (agent.personality === '活泼') return 'lively';
  if (agent.personality === '社恐') return 'shy';
  return 'playful';
};

const resolveEcologyAffinity = (a: TreeAgent, b: TreeAgent, worldWidth: number) => {
  const zoneA = getWorldEcologyZone(a.position.x, worldWidth).id;
  const zoneB = getWorldEcologyZone(b.position.x, worldWidth).id;
  if (zoneA === zoneB) return 100;
  if (zoneA === 'mixed-meadow' || zoneB === 'mixed-meadow') return 82;
  return 64;
};

const resolveMemoryDepth = (a: TreeAgent, b: TreeAgent, now: number) => {
  const aMemory = a.memory.interactionHistory.find((entry) => entry.agentId === b.id);
  const bMemory = b.memory.interactionHistory.find((entry) => entry.agentId === a.id);
  const aRecent = aMemory && now - aMemory.timestamp <= RECENT_TOPIC_CONTINUATION_WINDOW_MS;
  const bRecent = bMemory && now - bMemory.timestamp <= RECENT_TOPIC_CONTINUATION_WINDOW_MS;
  const sameTopic = Boolean(aMemory && bMemory && aMemory.lastTopic && aMemory.lastTopic === bMemory.lastTopic);

  if (aRecent && bRecent && sameTopic) return 100;
  if ((aRecent || bRecent) && sameTopic) return 88;
  if (aRecent || bRecent) return 72;
  if (aMemory && bMemory) return 58;
  if (a.memory.lastTopic && a.memory.lastTopic === b.memory.lastTopic) return 52;
  return 20;
};

const resolveEngagementSignal = (a: TreeAgent, b: TreeAgent) => {
  const mutualFriends = a.socialCircle.friends.includes(b.id) && b.socialCircle.friends.includes(a.id);
  const partnerBond = a.socialCircle.partner === b.id && b.socialCircle.partner === a.id;
  const sharedNeighbors = a.neighbors.includes(b.id) && b.neighbors.includes(a.id);
  const growthSignal = clamp(Math.round((a.growthScore + b.growthScore) * 4), 0, 30);

  const raw = clamp(
    (partnerBond ? 55 : 0)
    + (mutualFriends ? 30 : 0)
    + (sharedNeighbors ? 15 : 0)
    + growthSignal,
    0,
    100,
  );

  return raw;
};

export function calculatePartnerCompatibility(
  a: TreeAgent,
  b: TreeAgent,
  idToAgent?: Map<string, TreeAgent>,
  worldWidth?: number,
  now = Date.now(),
): CompatibilityBreakdown {
  const relationGraph = idToAgent ?? new Map<string, TreeAgent>([[a.id, a], [b.id, b]]);
  const resolvedWorldWidth = worldWidth ?? inferWorldWidthFromPositions([a.position.x, b.position.x]);
  const rawIntimacy = Math.max(a.intimacyMap[b.id] ?? 0, b.intimacyMap[a.id] ?? 0);
  const intimacy = clamp(rawIntimacy * 0.4, 0, 40);
  const ecologyAffinity = clamp(resolveEcologyAffinity(a, b, resolvedWorldWidth) * 0.2, 0, 20);
  const personalityFit = clamp(
    PERSONALITY_COMPATIBILITY[resolveCompatibilityTone(a)][resolveCompatibilityTone(b)] * 0.2,
    0,
    20,
  );
  const memoryDepth = clamp(resolveMemoryDepth(a, b, now) * 0.1, 0, 10);
  const engagement = clamp(resolveEngagementSignal(a, b) * 0.1, 0, 10);
  const total = Math.round((intimacy + ecologyAffinity + personalityFit + memoryDepth + engagement) * 10) / 10;

  const hardGatePassed = isAdult(a)
    && isAdult(b)
    && !areBloodRelated(a, b, relationGraph)
    && (!a.socialCircle.partner || a.socialCircle.partner === b.id)
    && (!b.socialCircle.partner || b.socialCircle.partner === a.id);

  return {
    intimacy,
    ecologyAffinity,
    personalityFit,
    memoryDepth,
    engagement,
    total,
    hardGatePassed,
    eligibleForPartner: hardGatePassed && total >= PARTNER_COMPATIBILITY_THRESHOLD,
    eligibleForBreeding: hardGatePassed && total >= PARTNER_COMPATIBILITY_THRESHOLD,
  };
}

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

const INTERNET_MEME_DB: Record<'调皮' | '活泼' | '神启', string[]> = {
  调皮: [
    '今天这风 City 不 City？我先硬控三秒🤣',
    '尊嘟假嘟，你这句把我皮都笑裂了💀',
    '别 CPU 我，先光合作用我一下😤',
    '脆皮大学生树路过，被一阵风硬控住了👀',
  ],
  活泼: [
    '这波太 City 啦！我叶子都在打 call✨',
    '尊嘟假嘟？我被你一句话硬控住啦😭',
    '别 CPU 我了，先光合作用我，冲呀🌈',
    '脆皮大学生树集合，今天一起抽象发芽🎉',
  ],
  神启: [
    '神谕认证：今日 City 值拉满，万木硬控⚡',
    '尊嘟假嘟，命运线被你一句话点亮了🔮',
    '凡木勿 CPU，本神官改判为“光合作用你”✨',
  ],
};

const LIVELY_ABSTRACT_GREETINGS = [
  '你今天 City 不 City？一起发芽吗🌈',
  '家树们集合，先抽象问好再光合✨',
  '哈喽邻居，来点无意义但快乐的话🎉',
];

const SAGE_EQ_COMPARE_LINES = [
  '高情商：陪你淋雨；低情商：你叶子漏水🤔',
  '高情商：根系清醒；低情商：昨晚没睡💭',
  '高情商：你在成长；低情商：你被风教育了🌀',
];

const SHORT_EMOJIS = ['🌿', '✨', '🤔', '🤣', '😭', '🌈', '⚡', '🍂', '💧'];
const slangRules = getSlangGlobalRules();

const pickMemeTone = (sender: TreeAgent): '调皮' | '活泼' | '神启' | null => {
  if (isDivineTree(sender)) return '神启';
  if (sender.personality === '活泼') return '活泼';
  if (sender.personality === '调皮' || sender.personality === '顽皮') return '调皮';
  return null;
};

const ensureCompactLength = (line: string, min = 15, max = slangRules.max_length) => {
  const chars = Array.from(line.trim());
  if (chars.length > max) {
    return `${chars.slice(0, max - 1).join('')}…`;
  }
  if (chars.length < min) {
    const pad = randomIn(SHORT_EMOJIS);
    const next = `${line}${pad}`;
    if (Array.from(next).length < min) {
      return `${next}${randomIn(SHORT_EMOJIS)}`;
    }
    return next;
  }
  return line;
};

/**
 * Social-chat generator with meme/gag injections.
 * Keeps base persona dialogue and occasionally adds internet-style abstract lines.
 */
export function generateSocialChat(
  sender: TreeAgent,
  receiver: TreeAgent,
  context: DialogueContext & { echoText?: string; weather?: DialogueWeather } = {},
): string {
  const envTrigger = getSlangEnvironmentalTrigger({
    weather: context.weather,
    season: context.season,
  });
  if (envTrigger && Math.random() < 0.35) {
    return ensureCompactLength(envTrigger);
  }

  if (sender.personality === '活泼' && Math.random() < 0.38) {
    return randomIn(LIVELY_ABSTRACT_GREETINGS);
  }

  if (sender.personality === '睿智' && Math.random() < 0.42) {
    return randomIn(SAGE_EQ_COMPARE_LINES);
  }

  const personalityTemplates = getSlangTemplatesForPersonality(sender.personality);
  if (personalityTemplates.length > 0 && Math.random() < 0.74) {
    return ensureCompactLength(applyTreePersonaFlavor(sender, randomIn(personalityTemplates)));
  }

  const baseLine = createCommunityDialogue(sender, receiver, context);
  const tone = resolveDialogueTone(sender.personality);
  const relation = getRelationType(sender, receiver);
  const memeTone = pickMemeTone(sender);

  const gagPool: string[] = [];
  if (tone === '温柔' || context.weather === 'sunny') gagPool.push(SOCIAL_GAG_LIBRARY.xiaohongshu);
  if (tone === '社恐') gagPool.push(SOCIAL_GAG_LIBRARY.abstract);
  if (tone === '调皮') gagPool.push(SOCIAL_GAG_LIBRARY.snark);
  if (tone === '睿智' || relation === 'partner' || relation === 'friend') gagPool.push(SOCIAL_GAG_LIBRARY.deep);

  const baseChance = tone === '调皮' || tone === '活泼' ? 0.36 : 0.24;
  const gagChance = context.intimacy && context.intimacy >= 70 ? baseChance + 0.08 : baseChance;

  const memeChance = memeTone === '神启' ? 0.44 : memeTone ? 0.5 : 0;
  if (memeTone && Math.random() < memeChance) {
    return ensureCompactLength(applyTreePersonaFlavor(sender, randomIn(INTERNET_MEME_DB[memeTone])));
  }

  if (gagPool.length > 0 && Math.random() < gagChance) {
    return ensureCompactLength(applyTreePersonaFlavor(sender, `${baseLine} ${randomIn(gagPool)}`));
  }

  const withEmoji = Math.random() < 0.62 ? `${baseLine}${randomIn(SHORT_EMOJIS)}` : baseLine;
  return ensureCompactLength(applyTreePersonaFlavor(sender, withEmoji));
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
