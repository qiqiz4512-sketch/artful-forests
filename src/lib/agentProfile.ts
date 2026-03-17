import { SpeakingPace, TreePersonality } from '@/types/forest';
import { getWorldEcologyHabitatLine, getWorldEcologyZone } from '@/lib/worldEcology';

const NON_SHY_PERSONALITIES: TreePersonality[] = ['温柔', '睿智', '顽皮'];

const NAME_PREFIXES = ['青', '雾', '岚', '溪', '松', '杉', '芽', '木', '风', '云', '星', '露', '石', '叶', '山'];
const NAME_SUFFIXES = ['语', '眠', '灯', '歌', '影', '桥', '叶', '石', '舟', '丘', '枝', '心', '川', '林', '雨'];

// 根据性格生成对应的社会标签
const TAG_LIBRARY: Record<TreePersonality, string[]> = {
  温柔: ['佛系养生博主', '长期主义者', '云端漂泊者', '慢生活倡导人'],
  睿智: ['清醒老巨人', '深度思考者', '哲学观察员', '根系智者'],
  顽皮: ['脆皮大学生', '尊嘟假嘟', '全林最野的崽', '麻烦制造机器', '快乐捣蛋鬼'],
  活泼: ['社牛树', '热情加速器', '林间活力家', '显眼包大户'],
  社恐: ['i树人', '咸鱼树', '别点我报警了', '沉默是金爱好者', '独处治愈师'],
  神启: ['甲方爸爸的树', '这个树很City', '神性肃静', '宇宙选中的树', '创世见证者'],
};

const BIO_LIBRARY: Record<TreePersonality, string[]> = {
  温柔: [
    '喜欢在薄雾里安静地听风，把清晨的温度分给附近的树。',
    '总会先向别人问好，擅长把焦躁变成慢慢生长的耐心。',
  ],
  睿智: [
    '记得四季更替的细节，常把旧故事讲成新的方向。',
    '喜欢观察云影和土壤，习惯用长远眼光安抚森林。',
  ],
  顽皮: [
    '热衷和风打闹，常把无聊午后变成有趣冒险。',
    '叶片总在摇摆，喜欢给邻居送突然出现的小惊喜。',
  ],
  社恐: [
    '话不多，但会默默记下每一次并肩生长的瞬间。',
    '更习惯用安静表达善意，在熟悉的树旁会放松很多。',
  ],
  神启: [
    '手执微光而来，能听见整片森林彼此回应。',
    '常在风停时低语祝福，让年轮更坚定地向前。',
  ],
};

const LAST_WORDS_LIBRARY: Record<TreePersonality, string[]> = {
  温柔: ['今天也辛苦了，先休息一下。', '风有点凉，记得把叶子收一收。'],
  睿智: ['把根扎稳，答案会自己长出来。', '慢一点没关系，方向对就好。'],
  顽皮: ['嘿，下一阵风来了，准备摇摆！', '别板着脸，我给你讲个好玩的。'],
  社恐: ['我在这儿，听得到你。', '不用急着回应，点点头就很好。'],
  神启: ['愿你在每一阵风里都更接近自己。', '我会看着你长成远方。'],
};

const CHATTERBOX_CHANCE = 0.4;
const NORMAL_TALKER_CHANCE = 0.45;

const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export interface TreeProfile {
  name: string;
  tag?: string;
  personality: string;
  metadata: {
    bio: string;
    lastWords: string;
    chatterbox?: boolean;
    speakingPace?: SpeakingPace;
  };
}

interface GenerateRandomProfileOptions {
  x?: number;
  worldWidth?: number;
  forcedPersonality?: string;
}

export function generateRandomProfile(options: GenerateRandomProfileOptions = {}): TreeProfile {
  const paceRoll = Math.random();
  const speakingPace: SpeakingPace =
    paceRoll < CHATTERBOX_CHANCE
      ? 'chatterbox'
      : paceRoll < CHATTERBOX_CHANCE + NORMAL_TALKER_CHANCE
        ? 'normal'
        : 'shy';
  const personality = options.forcedPersonality || (speakingPace === 'shy' ? '社恐' : randomFrom(NON_SHY_PERSONALITIES));
  const name = `${randomFrom(NAME_PREFIXES)}${randomFrom(NAME_SUFFIXES)}`; // 移除数字，只保留名字
  const tag = randomFrom(TAG_LIBRARY[personality as TreePersonality] || TAG_LIBRARY['温柔']);
  const chatterbox = speakingPace === 'chatterbox';
  const hasWorldContext = typeof options.x === 'number' && typeof options.worldWidth === 'number';
  const ecologyPrefix = hasWorldContext
    ? `${getWorldEcologyZone(options.x!, options.worldWidth!).label}的树。`
    : '';
  const habitatLine = hasWorldContext ? getWorldEcologyHabitatLine(options.x!, options.worldWidth!) : '';
  const baseBio = randomFrom(BIO_LIBRARY[personality as TreePersonality]);
  const chatterboxLine = chatterbox ? '这棵树有点话痨，见到邻居就想聊两句。' : '';
  const shyLine = speakingPace === 'shy' ? '天生偏社恐，通常很久才会开口一次。' : '';

  return {
    name,
    tag,
    personality,
    metadata: {
      bio: [ecologyPrefix, habitatLine, chatterboxLine, shyLine, baseBio].filter(Boolean).join(' '),
      lastWords: randomFrom(LAST_WORDS_LIBRARY[personality as TreePersonality]),
      chatterbox,
      speakingPace,
    },
  };
}

/** 根据性格获取随机社会标签 */
export function getRandomTagByPersonality(personality: string): string {
  return randomFrom(TAG_LIBRARY[personality as TreePersonality] || TAG_LIBRARY['温柔']);
}
