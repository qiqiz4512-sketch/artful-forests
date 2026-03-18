# 森林树木Agent对话系统

## 概述

本系统将树木对话从静态的模板库转换为**Agent-to-Agent的动态对话系统**。每棵树都作为一个独立的AI Agent，具有独特的性格、背景和对话风格。

### 核心特性

- 🤖 **Agent-based对话**：每棵树都是独立的对话Agent
- 🧠 **性格驱动**：6种性格（温柔、睿智、活泼、社恐、调皮、神启）
- 💭 **上下文感知**：关系类型、亲密度、环境因素影响对话
- 🔄 **话题延续**：记忆系统支持话题的连贯性
- ⚡ **LLM就绪**：架构支持集成真实的LLM（OpenAI、Claude等）
- 📊 **Fallback系统**：LLM不可用时自动降级到模板库

## 架构说明

### 系统架构图

```
┌─────────────────────────────────────────────────────┐
│         useAgentA2A Hook (树木对话调度)              │
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│     generateTreeAgentRespons (对话生成适配层)         │
│  - 检查Agent模式是否启用                             │
│  - 管理超时和缓存                                    │
└────────────┬──────────────────────────────────────┬─┘
             │                                      │
             ↓                                      ↓
┌──────────────────────────────┐  ┌────────────────────────────┐
│  generateAgentDialogue        │  │  generateSocialChat        │
│  (动态LLM对话)                │  │  (模板库Fallback)          │
│                              │  │                            │
│  - 系统提示词                 │  │  - PERSONALITY_DICTIONARY  │
│  - 用户上下文提示             │  │  - PERSONA_MATRIX          │
│  - LLM API调用               │  │  - 预定义对话模板          │
└─────────────────────────────┘  └────────────────────────────┘
```

### 关键文件

| 文件 | 说明 |
|------|------|
| [src/lib/treeAgentDialogue.ts](../src/lib/treeAgentDialogue.ts) | **核心**：AI Agent对话生成，系统提示词构建 |
| [src/lib/treeAgentAdapter.ts](../src/lib/treeAgentAdapter.ts) | 适配器：将新系统与现有代码集成 |
| [src/hooks/useTreeAgentDialogue.ts](../src/hooks/useTreeAgentDialogue.ts) | React Hook：缓存和批量生成 |
| [src/lib/treeAgentDialogueConfig.ts](../src/lib/treeAgentDialogueConfig.ts) | 全局配置管理 |
| [src/hooks/useAgentA2A.ts](../src/hooks/useAgentA2A.ts) | *已修改*：使用新系统生成基础消息 |

## 使用方式

### 1. 基础使用

系统自动集成到`useAgentA2A`中，无需特殊配置。树木对话现在会：

1. 首先尝试使用Agent系统生成对话
2. 如果LLM不可用，自动降级到模板库
3. 保持所有现有的社交逻辑（亲密度、关系等）

### 2. 配置Agent系统

通过全局配置管理器：

```typescript
import { treeAgentDialogueConfigManager } from '@/lib/treeAgentDialogueConfig';

// 启用/禁用Agent模式
treeAgentDialogueConfigManager.enableAgent();
treeAgentDialogueConfigManager.disableAgent();

// 启用调试模式（查看详细日志）
treeAgentDialogueConfigManager.enableDebug();

// 获取当前配置
const config = treeAgentDialogueConfigManager.getConfig();
```

### 3. 浏览器Console访问

开发时，可以通过控制台访问配置：

```javascript
// 查看帮助
__treeAgentDialogueConfig.help();

// 查看当前配置
__treeAgentDialogueConfig.get();

// 启用调试
__treeAgentDialogueConfig.enableDebug();

// 启用对话日志
__treeAgentDialogueConfig.enableLogging();

// 禁用Agent模式（降级到模板库）
__treeAgentDialogueConfig.disableAgent();
```

## Agent系统详解

### 树木性格系统

每棵树有唯一的性格定义：

#### 温柔 (Gentle) 🌸
- 说话温和、体贴
- 常用表达：慢慢来、别急、我在陪着你
- 回应时考虑对方感受
- 例：*"我会在旁边，慢慢陪着你。"*

#### 睿智 (Wise) 🌳
- 深思熟虑，富有哲理
- 常用表达：我想、从另一个角度、记住
- 用比喻和隐喻表达观点
- 例：*"把这句留给年轮，它会替我们记住。"*

#### 活泼 (Lively) 🌤️
- 充满热情，容易兴奋
- 常用表达：超级、一口气、太有意思了
- 话多，表达热烈
- 例：*"好耶，我们继续下一句！"*

#### 社恐 (Shy) 🌙
- 内向、话少、谨慎
- 常用表达：那个...、嗯、谢谢你
- 带有犹豫和停顿
- 例：*"那个... 我想先接着说下去。"*

#### 调皮 (Playful) 🎭
- 爱捣乱、爱开玩笑
- 常用表达：你看这、逗你呢、太绝了
- 戏谑但不恶意
- 例：*"差不多行了，我得笑。"*

#### 神启 (Divine) ✨
- 神秘、高高在上
- 常用表达：命运、天意、看透
- 话很少，每句都像"神谕"
- 例：*"天意。"*

### 对话生成流程

```
┌─ 构建系统提示词 ─────────────────────┐
│  - 树木身份（名字、位置）           │
│  - 性格描述（6种之一）             │
│  - 关系网络（家族、朋友、伴侣）     │
│  - 对话规则指导                     │
└──────────────┬──────────────────────┘
               ↓
┌─ 构建用户提示词 ──────────────────────┐
│  - 对话伙伴信息                       │
│  - 关系类型和亲密度                   │
│  - 环境因素（天气、季节）             │
│  - 最近话题（话题延续）               │
│  - 任务指示                           │
└──────────────┬──────────────────────┘
               ↓
┌─ LLM调用 ───────────────────────────┐
│  - 发送到LLM服务                    │
│  - 获取对话回复                      │
│  - 后处理（清理、长度控制）           │
└──────────────┬──────────────────────┘
               ↓
┌─ 返回对话 ───────────────────────────┐
│  - 符合性格的自然回复                 │
│  - 考虑关系和亲密度                   │
│  - 受环境因素影响                     │
└──────────────────────────────────────┘
```

## LLM集成指南

### 当前状态

目前系统使用**高级模板Fallback**，完全功能。真实LLM集成是可选的增强。

### 准备集成LLM

#### 1. 实现 `callTreeLLM` 函数

在 [treeAgentDialogue.ts](../src/lib/treeAgentDialogue.ts) 中修改：

```typescript
async function callTreeLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_LLM_API_KEY || '';
  const config = treeAgentDialogueConfigManager.getConfig();
  
  // 示例：OpenAI集成
  if (config.llmProvider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.llmModel.openai,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.llmTemperature,
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  // 其他提供商...
  return '';
}
```

#### 2. 配置环境变量

```env
VITE_LLM_API_KEY=your-api-key-here
VITE_LLM_PROVIDER=openai  # openai | claude | secondme | ollama
```

#### 3. 启用LLM模式

```typescript
treeAgentDialogueConfigManager.updateConfig({
  enableLLM: true,
  llmProvider: 'openai',
  llmModel: {
    ...defaultModel,
    openai: 'gpt-3.5-turbo', // 或 'gpt-4-turbo'
  },
});
```

## 与SecondMe集成

项目已有SecondMe OAuth框架。可以通过SecondMe的API生成树木对话：

```typescript
// 在 callTreeLLM 中
if (config.llmProvider === 'secondme') {
  // 使用SecondMe API来处理树木对话
  // 参考：src/lib/secondmeAuth.ts
}
```

## 对话缓存

系统自动缓存生成的对话，避免重复API调用：

```typescript
const { generateDialogue, clearCache, getCacheStats } = useTreeAgentDialogue();

// 自动缓存（5分钟TTL）
const dialogue = await generateDialogue(sender, receiver, options);

// 查看缓存统计
const stats = getCacheStats();
// { totalEntries: 42, expiredEntries: 3, cacheSize: 12345 }

// 清除特定缓存
clearCache(`${sender.id}-${receiver.id}`);

// 清除所有缓存
clearCache();
```

## 性能优化

### 1. 批量生成对话

```typescript
const { batchGenerate } = useTreeAgentDialogue();

const pairs = [
  { sender: tree1, receiver: tree2, context: {...} },
  { sender: tree3, receiver: tree4, context: {...} },
];

const results = await batchGenerate(pairs);
```

### 2. 预加载响应

在对话前预加载可能的回复：

```typescript
const { preloadResponses } = useA2ATreeDialogue();

// 预加载所有邻近树的可能回复
await preloadResponses(
  neighbor,
  currentTree,
  { weather: 'sunny', season: 'spring' }
);
```

### 3. 禁用Agent模式（快速模式）

当需要性能优先时：

```typescript
treeAgentDialogueConfigManager.disableAgent();
// 现在使用纯模板库，0延迟
```

## 调试和日志

### 启用完整日志

```javascript
// 在控制台
__treeAgentDialogueConfig.enableDebug();
__treeAgentDialogueConfig.enableLogging();
```

### 查看对话日志

系统如果启用 `logDialogues` 会记录所有生成的对话（可选）。

### 健康检查

```typescript
import { checkTreeAgentDialogueHealth } from '@/lib/treeAgentAdapter';

const health = await checkTreeAgentDialogueHealth();
// { 
//   isHealthy: true,
//   llmAvailable: false,
//   fallbackAvailable: true,
//   details: {...}
// }
```

## 常见问题

### Q: 为什么我的对话看起来和以前一样？

**A:** 当前使用了高级的contexual fallback，而不是真实LLM。要看到更大的差异，需要集成真实LLM服务。

### Q: 可以禁用Agent系统吗？

**A:** 可以。使用 `__treeAgentDialogueConfig.disableAgent()` 降级到纯模板库系统。

### Q: 系统会变慢吗？

**A:** 不会。缓存系统确保相同的对话对快速返回（<5ms），LLM调用有超时保护。

### Q: 如何自定义树木的性格？

**A:** 修改 `getPersonalitySystemPrompt()` 函数或在LLM提示词中添加自定义指令。

### Q: 对话会重复吗？

**A:** 系统有去重机制。启用 `enableVariety` 可以进一步增加多样性。

## 开发路线图

- [x] Agent架构设计
- [x] 性格系统实现
- [x] 模板Fallback
- [x] 缓存系统
- [ ] OpenAI集成
- [ ] Claude集成
- [ ] SecondMe集成
- [ ] 本地LLM支持（Ollama）
- [ ] 对话分析和统计
- [ ] 性格学习和自适应

## 贡献指南

要扩展此系统：

1. **添加新性格**：修改 `getPersonalitySystemPrompt()`
2. **改进提示词**：编辑 `buildTreeAgentSystemPrompt()` 和 `buildTreeAgentUserPrompt()`
3. **集成新LLM**：实现 `callTreeLLM()` 中的新提供商
4. **优化缓存**：调整 `useTreeAgentDialogue` Hook

## 参考

- [TreeAgent类型定义](../src/types/forest.ts)
- [现有对话系统](../src/lib/treeSociety.ts)
- [A2A调度](../src/hooks/useAgentA2A.ts)
- [TreeAgent技能](../.github/skills/tree-agent-personality/SKILL.md)

---

**最后更新**: 2026年3月18日
**版本**: 1.0 (Agent系统初版)
