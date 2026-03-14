const SPECIES_LABELS: Record<string, string> = {
  'pine-classic': '松树',
  'spruce-dark': '云杉',
  'fir-slim': '冷杉',
  'teardrop-cedar': '雪松',
  'cedar-layered': '层雪松',
  'cedar-mint': '薄荷雪松',
  'cedar-blue': '蓝雪松',
  'cypress-column': '柏树',
  'larch-gold': '落叶松',
  'birch-white': '白桦',
  'birch-bare-silver': '银桦枯枝',
  'oak-broad': '橡树',
  'oak-bare-winter': '冬栎',
  'elm-vase': '榆树',
  'beech-copper': '榉树',
  'chestnut-amber': '栗树',
  'aspen-quiver': '白杨',
  'maple-wide': '阔枫',
  'maple-crimson': '赤枫',
  'maple-bare-ember': '枫枝',
  'red-maple-star': '红枫',
  'autumn-round': '秋冠树',
  'yellow-poplar': '黄杨叶杨',
  'ginkgo-fan': '银杏',
  'weeping-willow': '垂柳',
  'olive-rounded': '橄榄树',
  'apple-fruit': '苹果树',
  'pear-soft': '梨树',
  'round-lime': '圆冠阔叶',
  'canopy-bubble': '泡冠树',
  'moss-round': '苔冠树',
  'palm-tropical': '棕榈',
  'cherry-blossom': '樱花树',
  'sakura-cloud': '云樱',
  'plum-pink': '梅树',
  'blossom-white': '白花树',
  'orange-watercolor': '橘彩树',
};

const SPECIES_PHRASES: Record<string, string[]> = {
  'oak-broad': ['年轮很多，话可以慢慢说。', '再大的风，也只是路过树冠。'],
  'oak-bare-winter': ['冬天把叶子放下，骨架才更清楚。', '枝条空着，风就更容易穿过去。'],
  'elm-vase': ['街角的风声，我也听得懂。', '枝冠撑开一点，影子就能多护住几棵树。'],
  'beech-copper': ['铜色叶缘会记住傍晚的光。', '风掠过去时，叶片会发出很细的响声。'],
  'chestnut-amber': ['栗色总在秋天最先亮起来。', '枝头沉一点，心里反而更稳。'],
  'aspen-quiver': ['别靠太近，我的叶子很容易颤。', '一点点风，也足够让整棵树回应。'],
  'birch-bare-silver': ['雪还没落下，枝条先安静了。', '树皮很亮，像把冬天悄悄照白。'],
  'maple-bare-ember': ['叶子虽然走了，火色还留在枝节里。', '冬天会把锋利的轮廓显出来。'],
  'larch-gold': ['我会在针叶里，悄悄练习落叶。', '金色针束抖一下，像很轻的铃声。'],
  'weeping-willow': ['水边的风，总会先来摸我的枝条。', '慢慢垂下来，也是一种拥抱。'],
  'cherry-blossom': ['今天有一点适合开花的心情。', '花会落下，但香气还会留下。'],
  'pine-classic': ['向上长的时候，根也要更稳。', '松针知道怎样把冬天守住。'],
};

const FALLBACK_PHRASES = [
  '风很温柔',
  '慢慢长大吧',
  '今天也辛苦了',
  '你做得很好',
  '深呼吸，放轻松',
  '一切都会好的',
  '阳光正好',
  '谢谢你来看我',
  '你是独一无二的',
  '世界因你而美好',
  '每一天都是新的开始',
  '愿你被温柔以待',
];

const FAMILY_LABELS: Array<[RegExp, string]> = [
  [/pine|spruce|fir|cedar|cypress/, '针叶树'],
  [/oak|elm|beech|chestnut/, '落叶阔叶树'],
  [/birch|aspen/, '轻叶林木'],
  [/maple|ginkgo|autumn|poplar/, '秋叶树'],
  [/cherry|sakura|plum|blossom/, '花树'],
  [/willow/, '柳树'],
];

export function getTreeSpeciesLabel(shapeId?: string): string {
  if (!shapeId) return '树';
  if (SPECIES_LABELS[shapeId]) return SPECIES_LABELS[shapeId];
  const family = FAMILY_LABELS.find(([pattern]) => pattern.test(shapeId));
  return family?.[1] ?? '树';
}

export function getTreeSpeciesPhrases(shapeId?: string): string[] {
  if (!shapeId) return FALLBACK_PHRASES;
  return SPECIES_PHRASES[shapeId] ?? FALLBACK_PHRASES;
}