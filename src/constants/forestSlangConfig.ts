export type ForestSlangPersonality = '顽皮' | '睿智' | '活泼' | '社恐' | '神启';

export const forestSlangConfig = {
  forest_slang_config: {
    global_rules: {
      max_length: 30,
      style: '朋友圈/即刻简短风格',
      emoji_frequency: 'high',
    },
    personalities: {
      '顽皮 (Naughty)': {
        tags: ['抽象文学', '谐音梗', '冲浪达人'],
        templates: [
          '家人们谁懂啊，今天的露水一股子平替味，尊嘟假嘟？🥤',
          '别光合作用了，出来嗨！整棵树都 City 起来了。🏙️',
          '这就是森林之光吗？我直接原地起跳，硬控我 30 秒。✨',
          '抽象派根系，长得随心所欲，主打一个“根”深蒂固。🤡',
        ],
      },
      '睿智 (Wise)': {
        tags: ['职场黑话', '凡尔赛', '高情商'],
        templates: [
          '长期主义 +1，今天的年轮也在悄悄写注释。📖',
          '高情商：根系深；低情商：宅得久。懂得都懂。😏',
          '拒绝内卷，我只是一棵会光合作用的咸鱼树。🐟',
          '格局打开，视野拉满，这片林子的底层逻辑被我玩明白了。🌐',
        ],
      },
      '活泼 (Lively)': {
        tags: ['饭圈用语', '夸夸群', '热梗复读机'],
        templates: [
          '又是为森林美貌破防的一天！给这片草甸点个赞。💖',
          '前面的老松树真给力！这就是 2026 森林年度最佳吗？🏆',
          '咱就是说一整个惊艳住，今天的风好有颗粒感。🌪️',
          '拒绝精神内耗，有事直接摇晃树枝。摇就完了！🌿',
        ],
      },
      '社恐 (Social Phobia)': {
        tags: ['玩梗自黑', '佛系', '求放过'],
        templates: [
          '别看我，在深蹲。社交额度已欠费，只想当个木头。😶',
          '今天的我是一棵脆皮树，风大一点皮都要裂了。🍂',
          'i树在线求放过，只要我不动，就没人发现我在偷懒。🐢',
          '已开启“防沉迷”模式，请勿乱点，容易卡顿。🛑',
        ],
      },
      '神启 (Divine)': {
        tags: ['中二病', '史诗感', '降维打击'],
        templates: [
          '感受到来自虚空的 Surge 了吗？那是我的能量在溢出。⚡',
          '凡人，别动我的根。这叫“神性肃静”，你不懂。🤫',
          '刚才那道极光是我发的朋友圈，点赞量过亿了。🌌',
          '作为森林主理树，我这一年轮下去，你可能会“断网”。🔥',
        ],
      },
    },
    environmental_triggers: {
      下雨: '根系开始“长脑子”了，想写诗。🌧️',
      深夜: '熬最晚的夜，做最绿的梦。😴',
      秋天: '头发掉光了，彻底“秃”然了。🍂',
    },
  },
} as const;

const PERSONALITY_TO_CONFIG_KEY: Record<ForestSlangPersonality, keyof typeof forestSlangConfig.forest_slang_config.personalities> = {
  顽皮: '顽皮 (Naughty)',
  睿智: '睿智 (Wise)',
  活泼: '活泼 (Lively)',
  社恐: '社恐 (Social Phobia)',
  神启: '神启 (Divine)',
};

const normalizePersonality = (personality: string): ForestSlangPersonality => {
  if (personality === '调皮') return '顽皮';
  if (personality === '顽皮') return '顽皮';
  if (personality === '睿智') return '睿智';
  if (personality === '活泼') return '活泼';
  if (personality === '社恐') return '社恐';
  return '神启';
};

export const getSlangTemplatesForPersonality = (personality: string) => {
  const normalized = normalizePersonality(personality);
  const key = PERSONALITY_TO_CONFIG_KEY[normalized];
  return [...forestSlangConfig.forest_slang_config.personalities[key].templates];
};

export const getSlangTagsForPersonality = (personality: string) => {
  const normalized = normalizePersonality(personality);
  const key = PERSONALITY_TO_CONFIG_KEY[normalized];
  return [...forestSlangConfig.forest_slang_config.personalities[key].tags];
};

export const getSlangGlobalRules = () => forestSlangConfig.forest_slang_config.global_rules;

export const getSlangEnvironmentalTrigger = (input: {
  weather?: 'sunny' | 'rain' | 'snow' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
}) => {
  if (input.weather === 'rain') return forestSlangConfig.forest_slang_config.environmental_triggers.下雨;
  if (input.weather === 'night') return forestSlangConfig.forest_slang_config.environmental_triggers.深夜;
  if (input.season === 'autumn') return forestSlangConfig.forest_slang_config.environmental_triggers.秋天;
  return null;
};
