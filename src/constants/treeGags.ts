export type GagPersonality = '温柔' | '睿智' | '活泼' | '社恐' | '调皮' | '顽皮' | '神启';

const PERSONALITY_GAGS: Record<'温柔' | '睿智' | '活泼' | '社恐' | '调皮' | '神启', string[]> = {
  温柔: [
    '把风声收成了晚安。',
    '会在清晨慢慢醒来。',
    '身边总有一点温柔。',
    '叶子里藏着安静。',
    '习惯把情绪放轻。',
  ],
  睿智: [
    '答案通常长在时间里。',
    '会先想清楚再开口。',
    '根系比语言更坚定。',
    '年轮里留着判断。',
    '习惯把目光放远。',
  ],
  活泼: [
    '一有风就会轻轻摇。',
    '阳光来了会更精神。',
    '今天也长得很有活力。',
    '树冠里有一点节奏。',
    '站着也像在发光。',
  ],
  社恐: [
    '更习惯先安静一会儿。',
    '风小一点时再靠近。',
    '会把心事藏进树影。',
    '今天适合低调生长。',
    '正在慢慢熟悉四周。',
  ],
  调皮: [
    '偶尔会冒出小主意。',
    '风一吹就想做点怪。',
    '枝叶里藏着一点调皮。',
    '今天也不太安分。',
    '会把无聊拨开一点。',
  ],
  神启: [
    '像是被光认真照过。',
    '会替远方留一点回声。',
    '风停时更像一则预言。',
    '枝头有微光停留。',
    '像从更高处看过来。',
  ],
};

const SHAPE_GAGS: Array<{ pattern: RegExp; lines: string[] }> = [
  { pattern: /willow/, lines: ['风经过时会更柔软', '枝条总是先一步摇动'] },
  { pattern: /pine|spruce|fir|cedar|cypress/, lines: ['在冷风里也站得很稳', '枝叶习惯朝上生长'] },
  { pattern: /cherry|sakura|plum|blossom/, lines: ['开花时会更显眼一些', '颜色里有一点春天'] },
  { pattern: /maple|autumn|ginkgo/, lines: ['叶色会慢慢沉下来', '季节一到就更有层次'] },
  { pattern: /palm/, lines: ['风来了就顺着摆动', '站着也带一点松弛感'] },
  { pattern: /bare/, lines: ['枝干线条会更清楚', '安静时更容易被看见'] },
];

const randomIn = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const RECENT_GAGS = new Map<string, string[]>();
const RECENT_GAG_LIMIT = 3;

const capGagLength = (line: string, maxChars = 15) => {
  const chars = Array.from(line.trim());
  if (chars.length <= maxChars) return line.trim();
  return `${chars.slice(0, maxChars - 1).join('')}…`;
};

export function pickTreeIdentityGag(input: {
  personality?: string;
  shapeId?: string;
  isManual?: boolean;
  dedupeKey?: string;
}): string {
  const tone = input.isManual
    ? '神启'
    : input.personality === '顽皮'
      ? '调皮'
      : (input.personality as '温柔' | '睿智' | '活泼' | '社恐' | '调皮' | '神启' | undefined) ?? '温柔';

  const shapePool = SHAPE_GAGS.find((item) => item.pattern.test(input.shapeId ?? ''))?.lines ?? [];
  const tonePool = PERSONALITY_GAGS[tone] ?? PERSONALITY_GAGS.温柔;

  const useShape = shapePool.length > 0 && Math.random() < 0.46;
  const sourcePool = useShape ? shapePool : tonePool;
  const dedupeKey = input.dedupeKey ?? `${tone}:${input.shapeId ?? 'none'}`;
  const recent = RECENT_GAGS.get(dedupeKey) ?? [];

  const filteredPool = sourcePool.filter((line) => !recent.includes(capGagLength(line)));
  const pickedRaw = randomIn(filteredPool.length > 0 ? filteredPool : sourcePool);
  const picked = capGagLength(pickedRaw);

  const nextRecent = [...recent, picked].slice(-RECENT_GAG_LIMIT);
  RECENT_GAGS.set(dedupeKey, nextRecent);
  return picked;
}

export function getTreeIdentityGagBackground(input: {
  personality?: string;
  shapeId?: string;
  isManual?: boolean;
  maxItems?: number;
}): string[] {
  const tone = input.isManual
    ? '神启'
    : input.personality === '顽皮'
      ? '调皮'
      : (input.personality as '温柔' | '睿智' | '活泼' | '社恐' | '调皮' | '神启' | undefined) ?? '温柔';

  const maxItems = Math.max(1, Math.min(6, input.maxItems ?? 3));
  const shapePool = SHAPE_GAGS.find((item) => item.pattern.test(input.shapeId ?? ''))?.lines ?? [];
  const tonePool = PERSONALITY_GAGS[tone] ?? PERSONALITY_GAGS.温柔;
  const merged = [...shapePool, ...tonePool].map((line) => capGagLength(line));
  const deduped = Array.from(new Set(merged));
  return deduped.slice(0, maxItems);
}
