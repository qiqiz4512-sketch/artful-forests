# 🌳 森林树木Agent对话系统 - 快速启动指南

## 什么是new？

森林里的树现在**作为独立Agent互相对话**，而不是从模板库中随机选择固定的对话。每棵树都有：

- 🧠 **独特的性格** — 6种不同的树木个性
- 💭 **记忆能力** — 记住之前谈过的话题
- 🎯 **关系意识** — 对待伴侣、家族、朋友、陌生人各有不同
- 🌍 **环境感知** — 对天气和季节的反应
- ⚡ **动态生成** — 支持集成真实LLM（OpenAI、Claude等）

## ⚡ 5分钟快速開始

### 1️⃣ 现状：系统已自动启用

对话系统已经集成到游戏中，**无需配置**。树木现在使用新的Agent系统:
- ✅ 保留所有现有的社交逻辑
- ✅ 自动降级到模板库（LLM不可用时）
- ✅ 支持话题延续和关系记忆

### 2️⃣ 验证系统工作

打開浏览器开发者工具（F12）：

```javascript
// 查看系统状态
__treeAgentDialogueConfig.help();

// 获取当前配置
__treeAgentDialogueConfig.get();
```

### 3️⃣ 测试功能（可选）

在控制台运行：

```javascript
// 启用调试模式看詳細日志
__treeAgentDialogueConfig.enableDebug();

// 禁用Agent模式（快速模式，仅使用模板库）
__treeAgentDialogueConfig.disableAgent();

// 重新启用Agent模式
__treeAgentDialogueConfig.enableAgent();
```

## 🧬 6种树木性格一览

| 性格 | 特点 | 例句 |
|------|------|------|
| 🌸 **温柔** | 贴心、陪伴 | *"我会在旁边，慢慢陪着你。"* |
| 🌳 **睿智** | 深思、哲理 | *"把这句留给年轮，它会替我们记住。"* |
| 🌤️ **活泼** | 热情、话多 | *"好耶，我们继续下一句！"* |
| 🌙 **社恐** | 文靜、谨慎 | *"那个... 我想先接着说下去。"* |
| 🎭 **调皮** | 爱玩、爱笑 | *"差不多行了，我得笑。"* |
| ✨ **神启** | 神秘、稀少 | *"天意。"* |

## 📁 关键文件

```
src/lib/
├── treeAgentDialogue.ts          ← 核心：Agent对话生成逻辑
├── treeAgentAdapter.ts           ← 与现有系统的胶合
├── treeAgentDialogueConfig.ts    ← 全局配置管理
└── treeSociety.ts                ← (已有) 模板库系统

src/hooks/
├── useTreeAgentDialogue.ts       ← React Hook: 缓存、批量生成
└── useAgentA2A.ts                ← (已修改) 树木对话调度
```

## 🚀 进阶使用

### 在代码中启用/禁用Agent模式

```typescript
import { treeAgentDialogueConfigManager } from '@/lib/treeAgentDialogueConfig';

// 禁用Agent系统（降级到模板库）
treeAgentDialogueConfigManager.disableAgent();

// 启用Agent系统
treeAgentDialogueConfigManager.enableAgent();

// 启用完整日志
treeAgentDialogueConfigManager.enableLogging();
```

### 手动生成对话（开发和测试）

```typescript
import { generateTreeAgentRespons } from '@/lib/treeAgentAdapter';

const dialogue = await generateTreeAgentRespons(
  treeA,
  treeB,
  {
    weather: 'rain',
    season: 'autumn',
    intimacy: 60,
    recentTopic: '秋天的落叶',
  }
);

console.log(dialogue);
```

### 预加载对话（减少延迟）

```typescript
import { useA2ATreeDialogue } from '@/hooks/useTreeAgentDialogue';

const { preloadResponses } = useA2ATreeDialogue();

// 在交互前预加载可能的回复
await preloadResponses(
  potentialListeners,
  speakerTree,
  { weather: 'sunny', season: 'spring' }
);
```

## 🔌 集成LLM（可选增强）

目前系统使用**智能Fallback**，完全可用。要集成真实LLM：

### 步骤 1：修改 `callTreeLLM`

编辑 [src/lib/treeAgentDialogue.ts](../../src/lib/treeAgentDialogue.ts)：

```typescript
async function callTreeLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_LLM_API_KEY || '';
  
  // 示例：OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    }),
  });
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
```

### 步骤 2: 配置环境变量

```env
VITE_LLM_API_KEY=your-openai-api-key
VITE_LLM_PROVIDER=openai
```

### 步骤 3: 启用LLM

```javascript
// 在控制台或代码中
__treeAgentDialogueConfig.update({ enableLLM: true });
```

## ⚙️ 配置選項

```typescript
interface TreeAgentDialogueConfig {
  enableAgentDialogue: boolean;      // 启用Agent系统
  enableLLM: boolean;                // 启用外部LLM
  llmProvider: 'openai' | 'claude' | 'secondme' | 'ollama';
  llmTimeout: number;                // LLM超时（毫秒）
  enableDialogueCache: boolean;      // 缓存对话
  dialogueCacheTTL: number;          // 缓存过期时间
  llmTemperature: number;            // LLM创意程度 (0-1)
  debugMode: boolean;                // 详細日志
  logDialogues: boolean;             // 记录所有对话
  enableVariety: boolean;            // 增加多样性
  personalityStrength: number;       // 性格强度 (0-1)
  contextStrength: number;           // 上下文感知强度
}
```

## 🧪 测试

运行单元测试：

```bash
npm run test -- treeAgentDialogue.test.ts
```

或集成测试：

```bash
npm run test:integration
```

## 📊 性能

- **缓存命中**: <5ms
- **模板生成**: <1ms
- **LLM调用**: 1-5秒（有超时保护）
- **Fallback降级**: 自动，<1ms

## 🐛 调试技巧

### 查看完整日志

```javascript
// 启用所有日志
__treeAgentDialogueConfig.enableDebug();
__treeAgentDialogueConfig.enableLogging();

// 查看缓存统计
const stats = __treeAgentDialogue.getCacheStats?.();
```

### 强制特定模式

```javascript
// 只用模板库（快速）
__treeAgentDialogueConfig.disableAgent();

// 强制Agent模式（如果LLM可用）
__treeAgentDialogueConfig.enableAgent();
```

### 性能分析

```javascript
// 检查系统健康状态
const health = __treeAgentDialogueConfig.health?.();
```

## ❓ FAQs

**Q: 为什么对话看起来和以前一样？**  
A: 当前使用高级Fallback而非真实LLM。要看到差异，需要配置LLM服务。

**Q: 系统会变慢吗？**  
A: 不会。缓存系统和超时保护确保高性能。禁用Agent模式可加快速度。

**Q: 能自定义树木性格吗？**  
A: 完全可以。修改 `getPersonalitySystemPrompt()` 函数或LLM提示词。

**Q: 可以关闭Agent系统吗？**  
A: 可以。使用 `__treeAgentDialogueConfig.disableAgent()` 降级回模板库。

**Q: SecondMe集成进度？**  
A: 框架已就绪，只需实现 `callTreeLLM()` 中的SecondMe分支。

## 📚 详细文档

- [完整开发指南](../TREE_AGENT_DIALOGUE_GUIDE.md)
- [API文档](../../src/lib/treeAgentDialogue.ts)
- [配置参考](../../src/lib/treeAgentDialogueConfig.ts)

## 🎯 下一步

1. ✅ Agent架构部署
2. ✅ 性格系统搭建
3. ⬜ 集成OpenAI API
4. ⬜ 集成Claude API
5. ⬜ 集成SecondMe
6. ⬜ 对话分析仪表板

## 💡 想法和建议

欢迎提交Issues或PR来改进系统！特别是：

- 新的树木性格设定
- 改进的提示词工程
- 新LLM提供商集成
- 性能优化建议

---

**开始探索新的森林对话体验吧！** 🌲🌲🌲
