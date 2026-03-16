import { SpeakingPace, TreePersonality } from '@/types/forest';
import { getWorldEcologyHabitatLine, getWorldEcologyZone } from '@/lib/worldEcology';

const NON_SHY_PERSONALITIES: TreePersonality[] = ['温柔', '睿智', '顽皮'];

const NAME_PREFIXES = ['青', '雾', '岚', '溪', '松', '杉', '芽', '木', '风', '云', '星', '露'];
const NAME_SUFFIXES = ['语', '眠', '灯', '歌', '影', '桥', '叶', '石', '舟', '丘', '枝', '心'];

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
}

export function generateRandomProfile(options: GenerateRandomProfileOptions = {}): TreeProfile {
  const paceRoll = Math.random();
  const speakingPace: SpeakingPace =
    paceRoll < CHATTERBOX_CHANCE
      ? 'chatterbox'
      : paceRoll < CHATTERBOX_CHANCE + NORMAL_TALKER_CHANCE
        ? 'normal'
        : 'shy';
  const personality = speakingPace === 'shy' ? '社恐' : randomFrom(NON_SHY_PERSONALITIES);
  const name = `${randomFrom(NAME_PREFIXES)}${randomFrom(NAME_SUFFIXES)}${Math.floor(10 + Math.random() * 90)}`;
  const chatterbox = speakingPace === 'chatterbox';
  const hasWorldContext = typeof options.x === 'number' && typeof options.worldWidth === 'number';
  const ecologyPrefix = hasWorldContext
    ? `${getWorldEcologyZone(options.x!, options.worldWidth!).label}的树。`
    : '';
  const habitatLine = hasWorldContext ? getWorldEcologyHabitatLine(options.x!, options.worldWidth!) : '';
  const baseBio = randomFrom(BIO_LIBRARY[personality]);
  const chatterboxLine = chatterbox ? '这棵树有点话痨，见到邻居就想聊两句。' : '';
  const shyLine = speakingPace === 'shy' ? '天生偏社恐，通常很久才会开口一次。' : '';

  return {
    name,
    personality,
    metadata: {
      bio: [ecologyPrefix, habitatLine, chatterboxLine, shyLine, baseBio].filter(Boolean).join(' '),
      lastWords: randomFrom(LAST_WORDS_LIBRARY[personality]),
      chatterbox,
      speakingPace,
    },
  };
}
