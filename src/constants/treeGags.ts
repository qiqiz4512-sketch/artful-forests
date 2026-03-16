export type GagPersonality = '温柔' | '睿智' | '活泼' | '社恐' | '调皮' | '顽皮' | '神启';

const PERSONALITY_GAGS: Record<'温柔' | '睿智' | '活泼' | '社恐' | '调皮' | '神启', string[]> = {
  温柔: [
    '我的叶子是森林里最好的棉被。',
    '喜欢看云发呆，然后变成云朵的样子。',
    '悄悄说，我偷偷给小草们浇过水。',
    '叶子是森林棉被',
    '看云发呆冠军',
    '偷给小草浇水',
    '风大也先抱抱你',
    '晚风是我的摇篮曲',
    '你的心事我接住',
  ],
  睿智: [
    '我的年轮里藏着地球的秘密。',
    '我不是老，我是有故事。',
    '风吹来八卦，我只听一半。',
    '年轮里有地球机密',
    '我不是老是有故事',
    '八卦我只听一半',
    '答案埋在土里',
    '先扎根再谈远方',
    '沉默是高级聊天',
  ],
  活泼: [
    '我可能是森林里最爱跳舞的树！',
    '我的花瓣会偷偷跳到你头上哦！',
    '阳光下的我，是移动的Disco球！',
    '森林迪斯科担当',
    '花瓣会跳你头上',
    '我会和阳光击掌',
    '风来我就开演唱会',
    '今天也要蹦三圈',
    '树冠是我的舞台',
  ],
  社恐: [
    '别看我，我只是路过。',
    '树多话少，我说的就是我。',
    '嗯...你看到我旁边那棵树了吗？',
    '别看我我路过',
    '树多话少是我',
    '嗯你看到旁边那棵',
    '我先在影子里待机',
    '打招呼缓存中',
    '紧张也算一种可爱',
  ],
  调皮: [
    '我只听得懂风的悄悄话。',
    '我的果子，不甜不要钱！',
    '我超爱把虫子弹到别人头上。',
    '只听得懂风悄悄话',
    '果子不甜不要钱',
    '爱把虫子弹隔壁',
    '恶作剧是艺术',
    '我负责搞笑你鼓掌',
    '今天要偷走一朵云',
  ],
  神启: [
    '我是彩虹色，因为我是被爱画出来的。',
    '我的根连接着次元壁。',
    '别问我从哪来，问就是美术老师家。',
    '彩虹色是被爱画的',
    '根连着次元壁',
    '问来处请找美术老师',
    '我在宇宙开了分号',
    '神谕和风都听我说',
    '我负责让奇迹发芽',
  ],
};

const SHAPE_GAGS: Array<{ pattern: RegExp; lines: string[] }> = [
  { pattern: /willow/, lines: ['我擅长垂柳甩发', '风一吹就拍MV'] },
  { pattern: /pine|spruce|fir|cedar|cypress/, lines: ['针叶系高冷代表', '我站岗冬天不加班'] },
  { pattern: /cherry|sakura|plum|blossom/, lines: ['花开我就上热搜', '粉色是我的语气词'] },
  { pattern: /maple|autumn|ginkgo/, lines: ['我掉的叶子会发光', '秋天是我的主场'] },
  { pattern: /palm/, lines: ['海风来了我先摇', '我天生自带度假滤镜'] },
  { pattern: /bare/, lines: ['我走极简骨感风', '叶子下班我值夜班'] },
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
