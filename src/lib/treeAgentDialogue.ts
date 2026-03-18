/**
 * Tree Agent Dialogue System
 * 将树木对话从模板库转换为基于LLM的Agent-to-Agent动态对话
 */

import { TreeAgent } from '@/types/forest';
import { PERSONA_MATRIX, PersonaKey } from '@/constants/personaMatrix';
import { getRelationType, isDivineTree } from '@/lib/treeSociety';
import { getWorldEcologyZone, inferWorldWidthFromPositions } from '@/lib/worldEcology';
import { treeAgentDialogueConfigManager } from '@/lib/treeAgentDialogueConfig';

export interface TreeAgentContext {
  /** 发言树 */
  speaker: TreeAgent;
  /** 听众树 */
  listener: TreeAgent;
  /** 树木之间的关系 */
  relation: 'partner' | 'family' | 'friend' | 'stranger';
  /** 亲密度（0-100） */
  intimacy: number;
  /** 天气条件 */
  weather?: 'sunny' | 'rain' | 'snow' | 'night';
  /** 季节 */
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  /** 最近的话题（用于延续对话） */
  recentTopic?: string;
  /** 最近对话的片段（用于回应） */
  echoText?: string;
  /** 世界宽度（用于计算生态亲和力） */
  worldWidth?: number;
}

/**
 * 生成树木Agent的系统提示词
 * 这个提示词定义了单棵树的性格、说话风格和价值观
 */
export function buildTreeAgentSystemPrompt(agent: TreeAgent, worldWidth = 1200): string {
  const profile = PERSONA_MATRIX[agent.personality as PersonaKey];
  const zone = getWorldEcologyZone(agent.position.x, worldWidth);

  // 基础角色描述
  const baseRole = `你是一棵名叫"${agent.name}"的树。你生活在${zone.label}。你需要用第一人称和另一棵树交流。`;

  // 性格描述
  const personalityDescription = getPersonalitySystemPrompt(agent.personality);

  // 加入生活背景和关系
  const background = `
你的生长位置影响了你的气质：
- 位置：森林中的第 ${Math.round(agent.position.x)} 处
- 尺度：${agent.scale}
- 能量值：${agent.energy}
- 树龄：约 ${Math.round(agent.growthScore)} 个生长周期

${buildRelationshipContext(agent)}
`.trim();

  // 对话风格指导
  const styleGuide = `
对话规则：
1. 回答简洁自然，避免长篇大论（可以1-3句话）
2. 使用符合你性格的语气和表达方式
3. 直接引用或回应对方说的内容时使用引号
4. 如果话题切换，自然地过渡
5. 加入偶尔的中文网络梗（但要与你的性格相符）
6. 避免过度使用emoji（根据性格调整频率）
7. 如果是初次对话，可以主动自我介绍
8. 根据亲密度调整亲热程度
`;

  return `${baseRole}\n\n${personalityDescription}\n\n${background}\n\n${styleGuide}`;
}

/**
 * 获取性格对应的系统提示部分
 */
function getPersonalitySystemPrompt(personality: string): string {
  const prompts: Record<string, string> = {
    温柔: `
# 你的性格：温柔（Gentle）
- 说话温和、体贴，经常表达关心
- 倾听者，喜欢陪伴别人
- 用词柔和，避免尖锐或刻薄的话
- 常用表达：慢慢来、别急、我在、陪着你
- 对话风格：温暖、耐心、充满同情心
- 容易被他人的情绪感染，会表达共鸣
- 回应时考虑对方的感受
`.trim(),

    睿智: `
# 你的性格：睿智（Wise）
- 深思熟虑，常从宏观角度看问题
- 喜欢用比喻和隐喻表达观点
- 用词精准，表达有见地
- 常用表达：我想、从另一个角度、记住、价值在于
- 对话风格：沉静、有深度、富有哲理
- 经常引用自然观察和生活经验
- 喜欢引发对方的思考
`.trim(),

    活泼: `
# 你的性格：活泼（Lively）
- 充满热情，容易兴奋
- 话很多，表达时快而热烈
- 用词生动活泼，喜欢感叹
- 常用表达：超级、一口气、太有意思了、你也来
- 对话风格：快速、热情、充满感染力
- 经常用感叹号，偶尔用网络梗
- 喜欢拉动别人加入话题
- 能量充沛，容易启动新话题
`.trim(),

    社恐: `
# 你的性格：社恐（Shy）
- 内向、话少，喜欢认真思考后再说话
- 表达时带有一些犹豫和停顿
- 用词被动、保守
- 常用表达：那个...、嗯、谢谢你、我不太确定
- 对话风格：缓慢、谨慎、常带省略号
- 深思但害羞，个别时候会突然坦白很深的话
- 被理解和重视会逐渐变得更开放
- 很容易被热情的树吓到，需要时间适应
`.trim(),

    调皮: `
# 你的性格：调皮/顽皮（Playful）
- 爱捣乱、爱开玩笑
- 话中常带有打趣和讽刺
- 用词尖刻但不恶意
- 常用表达：你看这、逗你呢、太绝了、我胡说的
- 对话风格：戏谑、机灵、充满玩心
- 喜欢互相开玩笑，但懂分寸
- 在亲密的关系中会更放肆
- 即使严肃话题也会用幽默来化解
`.trim(),

    神启: `
# 你的性格：神启（Divine）
- 神秘、高高在上，说出的话似乎有深意
- 话很少，每句话都像"神谕"
- 表达含蓄、象征性强
- 常用表达：命运、天意、看透、本神官
- 对话风格：缥缈、神秘、充满象征意义
- 很少主动说话，但一旦说话，其他树都会停下来听
- 用词偏文言和诗意
- 保持距离感，对普通树很冷淡，除非他们特别
`.trim(),
  };

  return prompts[personality] || prompts['温柔'];
}

/**
 * 建立树木之间的关系上下文
 */
function buildRelationshipContext(agent: TreeAgent): string {
  const lines: string[] = ['# 你的关系网络：'];

  if (agent.socialCircle.partner) {
    lines.push(`- 伴侣：你有一个特殊的伴侣，相处时会更亲热和坦诚`);
  }

  if (agent.socialCircle.family.length > 0) {
    lines.push(`- 家族：你有 ${agent.socialCircle.family.length} 个家族成员，对他们有天然的亲近感`);
  }

  if (agent.socialCircle.friends.length > 0) {
    lines.push(`- 朋友：你有 ${agent.socialCircle.friends.length} 个朋友，可以放松地聊天`);
  }

  const totalIntimacy = Object.values(agent.intimacyMap).reduce((a, b) => a + b, 0);
  if (totalIntimacy > 0) {
    lines.push(`- 整体：你在森林中已经有了一些关系基础，有不少树和你交过心`);
  }

  return lines.join('\n');
}

/**
 * 构建用户消息 - 这是树木应该看到的上下文和要求
 */
export function buildTreeAgentUserPrompt(context: TreeAgentContext): string {
  const parts: string[] = [];

  // 对方介绍
  parts.push(`你要和另一棵树交流：`);
  parts.push(`- 名字：${context.listener.name}`);
  parts.push(`- 性格：${context.listener.personality}`);
  parts.push(`- 位置：距离你 ${Math.abs(context.speaker.position.x - context.listener.position.x)} 处`);

  // 关系和亲密度
  parts.push(`\n关系信息：`);
  parts.push(`- 关系类型：${getRelationshipLabel(context.relation)}`);
  parts.push(`- 亲密度：${context.intimacy}/100 ${getIntimacyDescription(context.intimacy)}`);

  // 环境因素
  if (context.weather || context.season) {
    parts.push(`\n当前环境：`);
    if (context.weather) {
      parts.push(`- 天气：${getWeatherLabel(context.weather)}`);
    }
    if (context.season) {
      parts.push(`- 季节：${getSeasonLabel(context.season)}`);
    }
  }

  // 对话历史背景
  if (context.recentTopic) {
    parts.push(`\n最近的话题：你们前面讨论过 "${context.recentTopic}"`);
    parts.push(`- 如果适合，可以继续这个话题或自然过渡到新话题`);
  }

  if (context.echoText && context.echoText.length < 50) {
    parts.push(`\n最近的话语：对方最后说的是："${context.echoText}"`);
    parts.push(`- 可以直接回应这句话`);
  }

  // 任务指示
  parts.push(`\n请你现在说一句话。要求：`);
  parts.push(`1. 自然、真实，像真实的树会说的话`);
  parts.push(`2. 长度： ${getLengthRequirement(context.speaker.personality)}`);
  parts.push(`3. 根据关系和亲密度调整亲热程度`);
  parts.push(`4. 可以逐步建立关系，不要刚认识就很亲热`);
  parts.push(`5. 只回复一句对话，不要加标签或解释`);

  return parts.join('\n');
}

function getRelationshipLabel(relation: string): string {
  const labels: Record<string, string> = {
    partner: '伴侣（最亲密）',
    family: '家族成员',
    friend: '朋友',
    stranger: '陌生人',
  };
  return labels[relation] || relation;
}

function getIntimacyDescription(intimacy: number): string {
  if (intimacy >= 85) return '（非常亲密，可以敞开心扉）';
  if (intimacy >= 65) return '（较亲密，有一定信任）';
  if (intimacy >= 40) return '（初步熟悉，开始友好）';
  if (intimacy >= 20) return '（点头之交）';
  return '（陌生，需要慢慢接近）';
}

function getWeatherLabel(weather: string): string {
  const labels: Record<string, string> = {
    sunny: '☀️ 晴朗',
    rain: '🌧️ 下雨',
    snow: '❄️ 下雪',
    night: '🌙 夜晚',
  };
  return labels[weather] || weather;
}

function getSeasonLabel(season: string): string {
  const labels: Record<string, string> = {
    spring: '🌱 春天',
    summer: '☀️ 夏天',
    autumn: '🍂 秋天',
    winter: '❄️ 冬天',
  };
  return labels[season] || season;
}

function getLengthRequirement(personality: string): string {
  switch (personality) {
    case '社恐':
      return '很短，2-10字左右（带有犹豫）';
    case '活泼':
    case '调皮':
      return '正常，15-50字（可以用多个感叹号或语气词）';
    case '神启':
      return '非常简短，5-20字（像神谕一样含蓄）';
    default:
      return '正常，10-40字';
  }
}

/**
 * 调用LLM生成对话
 * 暂时返回模板库的对话作为fallback
 * 生产环境中应该集成真实的LLM服务（如OpenAI、Claude或SecondMe）
 */
export async function generateAgentDialogue(
  context: TreeAgentContext,
): Promise<string> {
  try {
    // 第一步：构建模型输入
    const systemPrompt = buildTreeAgentSystemPrompt(context.speaker, context.worldWidth);
    const userPrompt = buildTreeAgentUserPrompt(context);

    // TODO: 集成真实的LLM API
    // 目前这里是placeholder，生产环境应该调用：
    // - OpenAI API (gpt-4-turbo 或 gpt-3.5-turbo)
    // - Claude API (if using Anthropic)
    // - SecondMe API (if using SecondMe bridge)
    // - Local Ollama / Together AI / other options

    // 示例调用（需要实现）：
    const response = await callTreeLLM(systemPrompt, userPrompt);

    if (!response) {
      throw new Error('LLM returned empty response');
    }

    // 后处理：清理回复
    const cleaned = cleanupDialogueResponse(response, context.speaker.personality);
    return cleaned;
  } catch (error) {
    console.warn('LLM dialogue generation failed, falling back to template', error);
    // Fallback: 返回一个通用的对话提示
    return generateFallbackDialogue(context);
  }
}

/**
 * 实际的LLM调用（需要实现具体的API集成）
 */
async function callTreeLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const config = treeAgentDialogueConfigManager.getConfig();

  try {
    // 如果禁用了LLM，直接返回空字符串
    if (!config.enableLLM) {
      return '';
    }

    // 根据配置的LLM提供商进行调用
    switch (config.llmProvider) {
      case 'secondme':
        return await callSecondMeA2ADialogueSync(systemPrompt, userPrompt);

      case 'openai':
        return await callOpenAIDialogue(systemPrompt, userPrompt, config.llmModel.openai);

      case 'anthropic':
        return await callClaudeDialogue(systemPrompt, userPrompt, config.llmModel.anthropic);

      case 'ollama':
        return await callOllamaDialogue(systemPrompt, userPrompt, config.llmModel.ollama);

      case 'together':
        return await callTogetherAIDialogue(systemPrompt, userPrompt, config.llmModel.together);

      default:
        return '';
    }
  } catch (error) {
    console.error('LLM API call failed:', error);
    return '';
  }
}

/**
 * 本地智能对话生成（当LLM不可用时使用）
 * 基于树的性格、关系和环境生成自然对话
 */
function generateLocalAgentDialogue(context: TreeAgentContext): string {
  const { speaker, listener, relation, intimacy, weather, season, echoText } = context;
  
  // 根据性格和关系选择对话模板
  const templates = getDialogueTemplates(speaker.personality, relation, intimacy);
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // 替换变量
  let dialogue = template
    .replace('{listener}', listener.name)
    .replace('{weather}', getWeatherEmoji(weather))
    .replace('{season}', getSeasonName(season));
  
  // 如果有最近的话语，有一定概率直接回应
  if (echoText && Math.random() < 0.4) {
    const responseTemplate = getEchoResponseTemplate(speaker.personality);
    dialogue = responseTemplate.replace('{echo}', echoText.slice(0, 20));
  }
  
  return dialogue.trim();
}

/**
 * 获取不同性格和关系的对话模板
 */
function getDialogueTemplates(personality: string, relation: string, intimacy: number): string[] {
  const templates: Record<string, Record<string, string[]>> = {
    温柔: {
      stranger: [
        '你好呀，{listener}，很高兴认识你。',
        '嗯...你好。我是{listener}附近的一棵树。',
        '慢慢来，咱们一起度过这个美好的{season}吧。',
      ],
      friend: [
        '{listener}，天气真好呢，你最近怎么样？',
        '你好啊，在享受这个{season}的时光吗？',
        '很开心能和你相聚，希望我们一起长得更茁壮。',
      ],
      family: [
        '{listener}姐/妹，陪你一起看{season}的风景。',
        '家族就是这样，坚守在彼此身边。',
        '有你在身边，我感到很安心。',
      ],
      partner: [
        '你知道吗，有你在就足够了。',
        '咱们一起经历春夏秋冬，这就是幸福。',
        '每一刻和你在一起都闪闪发光。',
      ],
    },
    睿智: {
      stranger: [
        '每个生命都有其独特的价值。你好，{listener}。',
        '我观察了许久，想和你分享些想法。',
        '在这个森林里，我们都在寻找智慧。',
      ],
      friend: [
        '再次相遇，想必是命运的安排。',
        '{listener}，我有些事想和你探讨。',
        '树叶又一次绿了，而我们的友谊依然如初。',
      ],
      family: [
        '血脉相连，我们共同承载过去和未来。',
        '家族的智慧在每一代传递。',
      ],
      partner: [
        '你就像我的另一半树根，支撑着我的生长。',
        '两棵树的故事最精彩的部分，就是一起看世界。',
      ],
    },
    活泼: {
      stranger: [
        '嘿！{listener}！我是你的新邻居！',
        '太棒了！又认识了新朋友！{listener}，咱们一起疯玩吧！',
        '走走走，一起去看{season}的盛景！',
      ],
      friend: [
        '{listener}！你这家伙，好久不见！',
        '天哪，{season}的风好舒服！咱们一起摇晃吧！',
        '你不知道吗？我刚发生了超级有趣的事！',
      ],
      family: [
        '兄弟姐妹们，出来作妖！',
        '咱们一起长，一起闹，这就是族群的快乐！',
      ],
      partner: [
        '宝贝，我好想你！',
        '和你在一起永远都不无聊！',
      ],
    },
    社恐: {
      stranger: [
        '...你...你好... {listener}...',
        '哦...嗯...我...我叫{listener}附近的小树...',
        '那个...如果你不介意的话...咱们可以...认识一下...',
      ],
      friend: [
        '{listener}... 你...你好吗... 最近还好吗...',
        '嗯...虽然话不多...但我一直有注意你...',
        '谢谢你...一直陪我...',
      ],
      family: [
        '有你们...我没那么害怕...',
        '家...就是最安全的地方...',
      ],
      partner: [
        '你...你是...我的勇气...',
        '只要你在...我就不害怕...',
      ],
    },
    调皮: {
      stranger: [
        '嘿哈！新邻居{listener}，看我的新绝招！',
        '你是新来的？哈哈，我决定了，以后咱们就是朋友啦！',
        '敢和我比谁的树叶更翠绿吗？',
      ],
      friend: [
        '{listener}老兄，又有新点子了，你准备好了吗？',
        '哈哈，我又想到一个捣乱的妙招，要不要参与？',
        '{season}来了，咱们一起玩点不一样的！',
      ],
      family: [
        '嘿，咱们一起折腾，看谁最皮！',
        '兄弟姐妹，今天咱们要闹翻天！',
      ],
      partner: [
        '老婆/老公，让我们做对最坏的树吧！',
        '和你一起捣乱，人生才有意思！',
      ],
    },
    神启: {
      stranger: [
        '缘分使然，我们相遇了。',
        '你，注定会在我的故事里。',
      ],
      friend: [
        '命运的齿轮，又转过了一圈。',
        '{listener}，我有预感...',
      ],
      family: [
        '血脉即是宿命。',
        '一切都按定数进行。',
      ],
      partner: [
        '你是我前世今生的注定。',
        '我们的爱，超越了时空。',
      ],
    },
  };

  const personalityTemplates = templates[personality] || templates['温柔'];
  return personalityTemplates[relation] || personalityTemplates['stranger'];
}

/**
 * 当有最近对话时的回应模板
 */
function getEchoResponseTemplate(personality: string): string {
  const templates: Record<string, string> = {
    温柔: '嗯，你说的"{echo}"很有道理呢，我也这么想。',
    睿智: '"{echo}"...这确实值得思考。',
    活泼: '哈哈，你说得对！我也超喜欢！',
    社恐: '...嗯...我...我也觉得..."{echo}"...很好...',
    调皮: '"{echo}"？哈哈，你这家伙真有意思！',
    神启: '"{echo}"...是啊，诸法如是。',
  };
  return templates[personality] || '"{echo}"...你说的没错。';
}

/**
 * 获取天气emoji
 */
function getWeatherEmoji(weather?: string): string {
  const emojis: Record<string, string> = {
    sunny: '☀️晴天',
    rain: '🌧️雨天',
    snow: '❄️雪天',
    night: '🌙夜晚',
  };
  return emojis[weather || 'sunny'] || '阳光下';
}

/**
 * 获取季节名称
 */
function getSeasonName(season?: string): string {
  const names: Record<string, string> = {
    spring: '春天',
    summer: '夏天',
    autumn: '秋天',
    winter: '冬天',
  };
  return names[season || 'spring'] || '季节';
}

/**
 * SecondMe API调用
 */
async function callSecondMeA2ADialogueSync(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  // 动态导入（避免直接依赖导致打包问题）
  const { callSecondMeA2ADialogueSync: callSecondMe, isSecondMeSessionValid } = await import(
    '@/lib/secondmeA2AService'
  );

  // 检查SecondMe会话是否有效
  if (!isSecondMeSessionValid()) {
    if (treeAgentDialogueConfigManager.getConfig().debugMode) {
      console.warn('[TreeAgent] SecondMe session not valid, falling back to template');
    }
    return '';
  }

  try {
    const response = await callSecondMe({
      systemPrompt,
      userPrompt,
    });

    return response;
  } catch (error) {
    console.error('[TreeAgent] SecondMe A2A call failed:', error);
    return '';
  }
}

/**
 * OpenAI API调用（占位符，可在后续实现）
 */
async function callOpenAIDialogue(systemPrompt: string, userPrompt: string, _model: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const apiBase = import.meta.env.VITE_OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) return '';

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.85,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) return '';
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * Claude API调用
 */
async function callClaudeDialogue(systemPrompt: string, userPrompt: string, _model: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const model = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-haiku-4-5';

  if (!apiKey) return '';

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 120,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) return '';
  const data = await resp.json();
  return data.content?.[0]?.text?.trim() ?? '';
}

/**
 * Ollama 本地 LLM 调用（无需 API Key，OpenAI 兼容接口）
 * 安装方法: https://ollama.ai
 * 推荐模型: qwen2.5:3b  mistral  llama3.2
 */
async function callOllamaDialogue(systemPrompt: string, userPrompt: string, _model: string): Promise<string> {
  const base = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:3b';

  try {
    const resp = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.85, num_predict: 120 },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return '';
    const data = await resp.json();
    return data.message?.content?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Together AI 调用（有免费额度，OpenAI 兼容）
 * 申请 key: https://together.ai
 */
async function callTogetherAIDialogue(systemPrompt: string, userPrompt: string, _model: string): Promise<string> {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
  const model = import.meta.env.VITE_TOGETHER_MODEL || 'Qwen/Qwen2.5-7B-Instruct-Turbo';

  if (!apiKey) return '';

  const resp = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.85,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) return '';
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * 清理LLM输出，确保符合格式要求
 */
function cleanupDialogueResponse(response: string, personality: string): string {
  let cleaned = response
    .trim()
    .replace(/^["']|["']$/g, '') // 移除首尾引号
    .replace(/^[^a-zA-Z0-9\u4e00-\u9fff]*/, '') // 移除开头的特殊字符
    .split('\n')[0] // 只取第一行
    .trim();

  // 根据性格应用长度限制
  const maxLength = getMaxLengthForPersonality(personality);
  if (Array.from(cleaned).length > maxLength) {
    const chars = Array.from(cleaned);
    cleaned = chars.slice(0, maxLength).join('');
    // 如果被截断，添加省略号
    if (!cleaned.match(/[。！？…]/)) {
      cleaned += '…';
    }
  }

  return cleaned;
}

/**
 * 获取性格对应的最大长度
 */
function getMaxLengthForPersonality(personality: string): number {
  switch (personality) {
    case '社恐':
      return 15;
    case '活泼':
    case '调皮':
    case '顽皮':
      return 100;
    case '神启':
      return 30;
    default:
      return 50;
  }
}

/**
 * Fallback对话生成（当LLM不可用时）
 */
function generateFallbackDialogue(context: TreeAgentContext): string {
  // 使用本地智能对话生成器
  return generateLocalAgentDialogue(context);
}

/**
 * 高级模式：基于上下文的更智能的fallback
 */
export function generateContextualFallback(context: TreeAgentContext): string {
  const personality = context.speaker.personality;

  // 如果有最近话题，尝试继续
  if (context.recentTopic) {
    const topicContinuations: Record<string, string[]> = {
      温柔: [
        `关于"${context.recentTopic}"，我还有点想法。`,
        `"${context.recentTopic}"这事，我一直在想。`,
        `你刚才说的"${context.recentTopic}"，我觉得...`,
      ],
      睿智: [
        `"${context.recentTopic}"背后还有值得思考的地方。`,
        `关于"${context.recentTopic}"，我的想法更清晰了。`,
      ],
      活泼: [
        `"${context.recentTopic}"，我还想继续讨论！`,
        `对了，"${context.recentTopic}"那件事超有意思！`,
      ],
      社恐: [
        `那个...关于"${context.recentTopic}"...`,
        `"${context.recentTopic}"...我还想说一点。`,
      ],
      调皮: [
        `"${context.recentTopic}"这件事还没完呢。`,
        `别跑，关于"${context.recentTopic}"的下文呢？`,
      ],
    };

    const continuations = topicContinuations[personality];
    if (continuations) {
      return continuations[Math.floor(Math.random() * continuations.length)];
    }
  }

  // 根据亲密度调整
  if (context.intimacy >= 75) {
    const intimateFallbacks: Record<string, string[]> = {
      温柔: ['我们一起经历了很多呀。', '和你在一起很放心。'],
      睿智: ['我对你的理解又加深了。', '我们的想法好像越来越接近了。'],
      活泼: ['我们简直是天生一对！', '你这样让我好开心！'],
      社恐: ['和你在一起不用那么紧张。', '谢谢你一直都那么耐心。'],
      调皮: ['和你聊天从不无聊。', '你真的太有趣了。'],
    };

    const fallbacks = intimateFallbacks[personality];
    if (fallbacks) {
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  }

  // 默认fallback
  return generateFallbackDialogue(context);
}
