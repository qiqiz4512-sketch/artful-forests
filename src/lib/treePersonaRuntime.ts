import { TreeAgent } from '@/types/forest';

type RuntimeTone = 'gentle' | 'sage' | 'playful' | 'shy' | 'divine';

interface RuntimePersonaFlavor {
  seed: number;
  tone: RuntimeTone;
  catchphrase: string;
  rhetoricStyle: 'prefix' | 'question' | 'ellipsis' | 'vow' | 'wink';
  memeToken: string;
  abstractMetaphor: string;
}

const CATCHPHRASES: Record<RuntimeTone, string[]> = {
  gentle: ['慢慢来哈，', '先抱抱这阵风，', '今天也稳稳生长，'],
  sage: ['听年轮一句，', '按长期主义看，', '先把根扎稳，'],
  playful: ['整活时间到，', '别慌我来加 buff，', '主打一个拿捏，'],
  shy: ['那个... ', '我小声说一句，', '要不我们慢一点，'],
  divine: ['愿枝叶同辉，', '此刻皆被看见，', '让光落在你心上，'],
};

const MEME_TOKENS: Record<RuntimeTone, string[]> = {
  gentle: ['稳了', '拿捏住了'],
  sage: ['长期主义+1', '逻辑在线'],
  playful: ['DNA动了', 'buff 叠满', 'NPC 震惊'],
  shy: ['低调+1', '我先潜行'],
  divine: ['星光校准完成', '祝福已生效'],
};

const ABSTRACT_METAPHORS: Record<RuntimeTone, string[]> = {
  gentle: ['露水把焦虑折成了纸船'],
  sage: ['年轮在土里悄悄写注释'],
  playful: ['风把树冠当成了蹦床'],
  shy: ['月光把影子缝成了毯子'],
  divine: ['群星在枝梢上盖了印章'],
};

const TABOO_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(kill|suicide|murder|rape|porn|nude)\b/gi, replacement: 'unsafe' },
  { pattern: /(去死|自杀|杀人|暴力|血腥|色情|黄暴|仇恨)/g, replacement: '不合适内容' },
  { pattern: /\s+/g, replacement: ' ' },
];

const MAX_OUTPUT_LEN = 120;

const hashString = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const pickBySeed = <T,>(items: T[], seed: number): T => items[seed % items.length];

const normalizeTone = (agent: Pick<TreeAgent, 'personality' | 'isManual'>): RuntimeTone => {
  if (agent.isManual || agent.personality === '神启') return 'divine';
  if (agent.personality === '温柔') return 'gentle';
  if (agent.personality === '睿智') return 'sage';
  if (agent.personality === '社恐') return 'shy';
  return 'playful';
};

const clampOutput = (line: string): string => {
  const chars = Array.from(line.trim());
  if (chars.length <= MAX_OUTPUT_LEN) return line.trim();
  return `${chars.slice(0, MAX_OUTPUT_LEN - 1).join('')}…`;
};

const sanitizeTaboo = (line: string): string => {
  let next = line;
  TABOO_PATTERNS.forEach(({ pattern, replacement }) => {
    next = next.replace(pattern, replacement);
  });
  return clampOutput(next);
};

export const generateTreePersonaRuntime = (
  agent: Pick<TreeAgent, 'id' | 'name' | 'personality' | 'isManual'>,
): RuntimePersonaFlavor => {
  const tone = normalizeTone(agent);
  const seed = hashString(`${agent.id}|${agent.name}|${agent.personality}|${agent.isManual ? 1 : 0}`);

  return {
    seed,
    tone,
    catchphrase: pickBySeed(CATCHPHRASES[tone], seed),
    rhetoricStyle: pickBySeed(['prefix', 'question', 'ellipsis', 'vow', 'wink'], seed >> 3),
    memeToken: pickBySeed(MEME_TOKENS[tone], seed >> 5),
    abstractMetaphor: pickBySeed(ABSTRACT_METAPHORS[tone], seed >> 7),
  };
};

const applyRhetoricStyle = (line: string, flavor: RuntimePersonaFlavor): string => {
  switch (flavor.rhetoricStyle) {
    case 'prefix':
      return `${flavor.catchphrase}${line}`;
    case 'question':
      return /[？?]$/.test(line) ? line : `${line}，你觉得呢？`;
    case 'ellipsis':
      return line.includes('...') || line.includes('…') ? line : `${line}...`;
    case 'vow':
      return `${line}，我会把这句记进年轮。`;
    case 'wink':
      return `${line}，懂的都懂。`;
    default:
      return line;
  }
};

export const applyTreePersonaFlavor = (
  agent: Pick<TreeAgent, 'id' | 'name' | 'personality' | 'isManual'>,
  baseLine: string,
): string => {
  const raw = sanitizeTaboo(baseLine || '');
  if (!raw) return raw;

  const flavor = generateTreePersonaRuntime(agent);
  const lineSeed = hashString(`${flavor.seed}|${raw}`);

  let next = applyRhetoricStyle(raw, flavor);

  const allowMeme = flavor.tone !== 'divine' && lineSeed % 5 !== 0;
  if (allowMeme && !next.includes(flavor.memeToken)) {
    next = `${next} ${flavor.memeToken}`;
  }

  const allowAbstract = lineSeed % 3 !== 0;
  if (allowAbstract && !next.includes(flavor.abstractMetaphor)) {
    next = `${next}。像${flavor.abstractMetaphor}。`;
  }

  return sanitizeTaboo(next);
};
