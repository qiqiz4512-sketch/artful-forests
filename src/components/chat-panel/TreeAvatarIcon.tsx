/**
 * TreeAvatarIcon — 根据树木性格渲染不同外形的迷你树木 SVG 头像
 *
 * 性格 → 树形对应关系：
 *  温柔 → 圆蓬蓬的樱花云雾树（粉）
 *  睿智 → 三层叠塔松树（蓝灰）
 *  顽皮 → 锯齿星形爆炸树（橙）
 *  活泼 → 满是小花的圆冠树（黄绿）
 *  社恐 → 小椭圆冠、垂枝（灰）
 *  神启 → 火焰/泪滴形神圣树（金）
 */

interface TreeSvgProps {
  color: string;
}

const CANONICAL_PERSONALITIES = ['温柔', '睿智', '顽皮', '活泼', '社恐', '神启'] as const;

const PERSONALITY_ALIAS: Record<string, (typeof CANONICAL_PERSONALITIES)[number]> = {
  调皮: '顽皮',
  乐子人: '顽皮',
  内向: '社恐',
  腼腆: '社恐',
  外向: '活泼',
};

const normalizePersonality = (personality: string) => {
  const raw = personality.trim();
  if (!raw) return '温柔' as const;
  if (raw in PERSONALITY_ALIAS) return PERSONALITY_ALIAS[raw];
  if ((CANONICAL_PERSONALITIES as readonly string[]).includes(raw)) {
    return raw as (typeof CANONICAL_PERSONALITIES)[number];
  }
  return null;
};

const hashText = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getFallbackCanonicalPersonality = (personality: string) => {
  const idx = hashText(personality) % CANONICAL_PERSONALITIES.length;
  return CANONICAL_PERSONALITIES[idx];
};

/** 温柔 — 软糯云朵状樱花树 */
function GentleTree({ color }: TreeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {/* 三圆叠成蓬松树冠 */}
      <circle cx="8.5"  cy="11" r="4.2" fill={color} fillOpacity="0.8"  />
      <circle cx="12"   cy="8.5" r="4.8" fill={color} fillOpacity="0.92" />
      <circle cx="15.5" cy="11" r="4.2" fill={color} fillOpacity="0.8"  />
      {/* 白色花瓣亮点 */}
      <circle cx="9.5"  cy="9"  r="1.1" fill="white" fillOpacity="0.38" />
      <circle cx="14"   cy="7.8" r="0.9" fill="white" fillOpacity="0.3"  />
      <circle cx="12.5" cy="11.5" r="0.7" fill="white" fillOpacity="0.25" />
      {/* 树干 */}
      <rect x="11" y="14.5" width="2" height="5.5" rx="1" fill={color} fillOpacity="0.58" />
    </svg>
  );
}

/** 睿智 — 三层叠塔松树 */
function WiseTree({ color }: TreeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {/* 三层等腰三角形，从上到下递宽 */}
      <polygon points="12,4 9,9.5 15,9.5"    fill={color} fillOpacity="0.68" />
      <polygon points="12,7 7.5,13 16.5,13"  fill={color} fillOpacity="0.82" />
      <polygon points="12,10 5.5,17 18.5,17" fill={color} fillOpacity="0.96" />
      {/* 树干 */}
      <rect x="11" y="17" width="2" height="3.5" rx="0.5" fill={color} fillOpacity="0.62" />
    </svg>
  );
}

/** 顽皮 — 不对称锯齿星形爆炸树 */
function MischievousTree({ color }: TreeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {/* 歪歪扭扭的爆炸星形树冠 */}
      <path
        d="M13 3.5 L15.2 8.6 L20.2 7.4 L16.8 11.2 L20.5 14.3 L15.1 13.1 L14 18 L11.8 13.8 L8.6 17.2 L9.3 13 L4.2 14.2 L7.8 10.6 L4.3 7.2 L9.6 9.1 Z"
        fill={color}
        fillOpacity="0.9"
      />
      {/* 略弯的树干 */}
      <path
        d="M12 18 Q13.5 19.5 12.5 21.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.65"
      />
      {/* 调皮的小白点 */}
      <circle cx="11.5" cy="11" r="1.2" fill="white" fillOpacity="0.25" />
    </svg>
  );
}

/** 活泼 — 满是小花的大圆冠树 */
function LivelyTree({ color }: TreeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {/* 大圆树冠 */}
      <circle cx="12" cy="10" r="7.5" fill={color} fillOpacity="0.85" />
      {/* 分布均匀的小花点 */}
      <circle cx="8.5"  cy="8"    r="1.4" fill="white" fillOpacity="0.48" />
      <circle cx="13"   cy="6.5"  r="1.2" fill="white" fillOpacity="0.42" />
      <circle cx="16"   cy="10"   r="1.4" fill="white" fillOpacity="0.48" />
      <circle cx="9.5"  cy="12.5" r="1.1" fill="white" fillOpacity="0.38" />
      <circle cx="14.8" cy="13"   r="1.3" fill="white" fillOpacity="0.44" />
      <circle cx="11.5" cy="10"   r="1"   fill="white" fillOpacity="0.3"  />
      {/* 树干 */}
      <rect x="11" y="17" width="2" height="4.5" rx="1" fill={color} fillOpacity="0.6" />
    </svg>
  );
}

/** 社恐 — 小椭圆冠、垂枝、细干 */
function ShyTree({ color }: TreeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {/* 小而内敛的椭圆树冠 */}
      <ellipse cx="12" cy="9" rx="5.5" ry="4.2" fill={color} fillOpacity="0.7" />
      {/* 左侧垂枝 */}
      <path d="M7.5 11.5 Q5 15 4.5 18"     stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
      {/* 右侧垂枝 */}
      <path d="M16.5 11.5 Q19 15 19 18"    stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
      {/* 中间小叶 */}
      <path d="M12.5 13 Q13 16 12 18"       stroke={color} strokeWidth="1"   strokeLinecap="round" fill="none" strokeOpacity="0.4" />
      {/* 细树干 */}
      <rect x="11.5" y="13" width="1" height="7.5" rx="0.5" fill={color} fillOpacity="0.48" />
    </svg>
  );
}

/** 神启 — 火焰/泪滴形光辉树，带辐射线 */
function DivineTree({ color }: TreeSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      {/* 火焰形树冠 */}
      <path
        d="M12 2 C14.8 4.8 18 7.5 18 11 C18 14.5 15.2 16.5 12 16.5 C8.8 16.5 6 14.5 6 11 C6 7.5 9.2 4.8 12 2Z"
        fill={color}
        fillOpacity="0.9"
      />
      {/* 内层高光 */}
      <path
        d="M12 5.5 C13.8 7.5 15.5 9 15.5 11 C15.5 13.2 14 15 12 15 C10 15 8.5 13.2 8.5 11 C8.5 9 10.2 7.5 12 5.5Z"
        fill="white"
        fillOpacity="0.2"
      />
      {/* 顶部辐射线 */}
      <line x1="12"  y1="2"  x2="12"  y2="0.5" stroke={color} strokeWidth="1.2" strokeOpacity="0.55" strokeLinecap="round" />
      <line x1="18"  y1="5"  x2="19.5" y2="3.5" stroke={color} strokeWidth="1"   strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="6"   y1="5"  x2="4.5"  y2="3.5" stroke={color} strokeWidth="1"   strokeOpacity="0.45" strokeLinecap="round" />
      {/* 树干 */}
      <rect x="11" y="16.5" width="2" height="4.5" rx="1" fill={color} fillOpacity="0.65" />
    </svg>
  );
}

const PERSONALITY_COLOR: Record<string, string> = {
  温柔: '#E7849B',
  睿智: '#5D91A6',
  顽皮: '#D98958',
  活泼: '#A5962D',
  社恐: '#888888',
  神启: '#D4A72C',
};

type TreeComponent = (props: TreeSvgProps) => JSX.Element;

const TREE_MAP: Record<string, TreeComponent> = {
  温柔: GentleTree,
  睿智: WiseTree,
  顽皮: MischievousTree,
  活泼: LivelyTree,
  社恐: ShyTree,
  神启: DivineTree,
};

interface TreeAvatarIconProps {
  personality: string;
}

/** 根据性格渲染对应外形的树木 SVG 头像，填满父容器 */
export function TreeAvatarIcon({ personality }: TreeAvatarIconProps) {
  const canonical = normalizePersonality(personality) ?? getFallbackCanonicalPersonality(personality);
  const color = PERSONALITY_COLOR[canonical] ?? '#6a997b';
  const TreeComp = TREE_MAP[canonical] ?? GentleTree;
  return <TreeComp color={color} />;
}
