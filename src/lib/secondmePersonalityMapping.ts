/**
 * SecondMe 用户标签（Tags）到树木人格的映射
 * 
 * 用户在 SecondMe 中的标签会影响他们种下的树的初始人格倾向
 */

export interface PersonalityMappingRule {
  tag: string; // SecondMe 标签名称
  personalities: string[]; // 对应的树人格（优先级从高到低）
  weight: number; // 权重 (1-10)
}

export const SECONDME_TAG_TO_PERSONALITY: PersonalityMappingRule[] = [
  // 技术/理性导向
  {
    tag: '极客',
    personalities: ['睿智', '活泼'],
    weight: 8,
  },
  {
    tag: '代码',
    personalities: ['睿智', '神启'],
    weight: 7,
  },
  {
    tag: '技术',
    personalities: ['睿智', '活泼'],
    weight: 7,
  },
  {
    tag: 'AI',
    personalities: ['神启', '睿智'],
    weight: 9,
  },
  {
    tag: '算法',
    personalities: ['睿智', '神启'],
    weight: 8,
  },

  // 创意/艺术导向
  {
    tag: '设计',
    personalities: ['活泼', '温柔'],
    weight: 8,
  },
  {
    tag: '艺术',
    personalities: ['活泼', '神启'],
    weight: 8,
  },
  {
    tag: '写作',
    personalities: ['温柔', '睿智'],
    weight: 7,
  },
  {
    tag: '音乐',
    personalities: ['活泼', '温柔'],
    weight: 8,
  },
  {
    tag: '创意',
    personalities: ['活泼', '神启'],
    weight: 7,
  },

  // 温暖/温柔导向
  {
    tag: '温暖',
    personalities: ['温柔', '活泼'],
    weight: 9,
  },
  {
    tag: '治愈',
    personalities: ['温柔', '活泼'],
    weight: 8,
  },
  {
    tag: '陪伴',
    personalities: ['温柔', '睿智'],
    weight: 8,
  },
  {
    tag: '倾听',
    personalities: ['温柔', '睿智'],
    weight: 7,
  },

  // 调皮/活泼导向
  {
    tag: '冲浪',
    personalities: ['顽皮', '活泼'],
    weight: 9,
  },
  {
    tag: '摇滚',
    personalities: ['顽皮', '活泼'],
    weight: 8,
  },
  {
    tag: '幽默',
    personalities: ['顽皮', '活泼'],
    weight: 8,
  },
  {
    tag: '段子手',
    personalities: ['顽皮', '活泼'],
    weight: 9,
  },
  {
    tag: '二次元',
    personalities: ['顽皮', '活泼'],
    weight: 7,
  },

  // 内向/社恐导向
  {
    tag: '独处',
    personalities: ['社恐', '睿智'],
    weight: 8,
  },
  {
    tag: '内向',
    personalities: ['社恐', '温柔'],
    weight: 7,
  },
  {
    tag: '宅',
    personalities: ['社恐', '睿智'],
    weight: 7,
  },
  {
    tag: '佛系',
    personalities: ['社恐', '温柔'],
    weight: 6,
  },

  // 神秘/神启导向
  {
    tag: '哲学',
    personalities: ['神启', '睿智'],
    weight: 8,
  },
  {
    tag: '神秘',
    personalities: ['神启', '睿智'],
    weight: 8,
  },
  {
    tag: '冥想',
    personalities: ['神启', '温柔'],
    weight: 7,
  },
  {
    tag: '灵性',
    personalities: ['神启', '活泼'],
    weight: 7,
  },
];

/**
 * 根据 SecondMe 用户标签推断默认人格
 * 
 * @param userTags - 用户的标签数组
 * @returns 推荐的人格类型，或 null 如果无匹配
 */
export function inferPersonalityFromTags(userTags: string[] | undefined | null): string | null {
  if (!userTags || userTags.length === 0) return null;

  // 构建标签→规则的映射
  const tagToRules = new Map<string, PersonalityMappingRule>();
  for (const rule of SECONDME_TAG_TO_PERSONALITY) {
    tagToRules.set(rule.tag.toLowerCase(), rule);
  }

  // 计算每个人格的总权重
  const personalityScores = new Map<string, number>();
  
  for (const tag of userTags) {
    const rule = tagToRules.get(tag.toLowerCase());
    if (!rule) continue;

    // 第一个人格（主推）得到全部权重，第二个得到 40%，以此类推
    rule.personalities.forEach((personality, index) => {
      const multiplier = Math.pow(0.6, index); // 按指数衰减
      const score = rule.weight * multiplier;
      personalityScores.set(personality, (personalityScores.get(personality) ?? 0) + score);
    });
  }

  // 返回得分最高的人格
  if (personalityScores.size === 0) return null;

  let bestPersonality = '温柔'; // 默认人格
  let bestScore = 0;

  for (const [personality, score] of personalityScores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestPersonality = personality;
    }
  }

  return bestPersonality;
}

/**
 * 获取用户标签的可视化描述
 */
export function getTagDescription(tag: string): string {
  const rule = SECONDME_TAG_TO_PERSONALITY.find(r => r.tag.toLowerCase() === tag.toLowerCase());
  if (!rule) return tag;
  const personalities = rule.personalities.join(' / ');
  return `${tag} (倾向 ${personalities})`;
}
