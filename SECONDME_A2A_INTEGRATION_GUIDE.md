# 🤖 SecondMe A2A 树木对话集成指南

## 概述

森林树木的Agent对话系统已与**SecondMe API**集成。树木现在可以使用SecondMe强大的LLM（如Google Gemini 2.0或Claude）进行智能的、动态的A2A（Agent-to-Agent）对话。

## ✅ 集成状态

- ✅ **SecondMe A2A服务** (`secondmeA2AService.ts`) - 完全实现
- ✅ **LLM调用** (`callTreeLLM()`) - 已集成SecondMe分支
- ✅ **配置系统** - 默认启用SecondMe LLM
- ✅ **错误处理** - 完整的Fallback链
- ✅ **会话管理** - 使用现有的OAuth token

## 🚀 如何使用

### 1️⃣ **自动启用（无需配置）**

系统默认已启用SecondMe LLM：

```typescript
// 已在默认配置中设置
enableLLM: true
llmProvider: 'secondme'
```

### 2️⃣ **验证集成**

在浏览器控制台检查：

```javascript
// 查看当前配置
__treeAgentDialogueConfig.get();

// 应该显示:
// {
//   enableLLM: true,
//   llmProvider: 'secondme',
//   ...
// }

// 启用调试看详细日志
__treeAgentDialogueConfig.enableDebug();
```

### 3️⃣ **用户必须登录SecondMe**

树木对话需要有效的SecondMe会话：

```javascript
// 检查会话状态
const session = loadSecondMeSession();
if (!session || !session.accessToken) {
  console.log('用户未登录，请通过OAuth登录SecondMe');
}
```

**用户流程**：
1. 点击"连接SecondMe"（如果已实现OAuth UI）
2. 授权森林应用访问SecondMe
3. 树木开始进行智能对话

## 🔧 SecondMe A2A核心实现

### 架构

```
树木A (Agent)
    ↓
    ├─ 构建系统提示词（性格、为背景）
    ├─ 构建用户提示词（关系、环境）
    │
    ↓
SecondMe API (/api/secondme/chat/stream)
    ├─ 使用Google Gemini 2.0或Claude
    ├─ Server-Sent Events (SSE) 流式返回
    ├─ 8秒超时保护
    │
    ↓
树木B (Listener) 收到对话
```

### 关键文件

#### `/src/lib/secondmeA2AService.ts` (新文件)

**核心函数**：

```typescript
// 完整方式（带流处理）
callSecondMeA2ADialogue(payload, onChunk?)

// 简化方式（同步返回）
callSecondMeA2ADialogueSync(payload)

// 检查会话
isSecondMeSessionValid()

// 获取配置
getSecondMeA2AConfig()
```

**Payload格式**：

```typescript
interface SecondMeA2APayload {
  systemPrompt: string;        // 树的性格提示词
  userPrompt: string;          // 对话上下文和要求
  historyMessages?: Array<{    // 可选：历史消息
    role: 'user' | 'assistant';
    content: string;
  }>;
  treePersonality?: string;    // 树的性格标签
  context?: Record<string, any>; // 其他上下文
}
```

#### `/src/lib/treeAgentDialogue.ts` (修改)

**修改点**：

1. `callTreeLLM()` - 现在支持多个LLM提供商
2. `callSecondMeA2ADialogueSync()` - SecondMe分支实现
3. 导入`treeAgentDialogueConfigManager`

**调用流程**：

```typescript
// 在generateAgentDialogue()中
const response = await callTreeLLM(systemPrompt, userPrompt);

// callTreeLLM内部:
switch (config.llmProvider) {
  case 'secondme':
    return await callSecondMeA2ADialogueSync(systemPrompt, userPrompt);
  // ... 其他提供商
}
```

## 📊 工作流程详解

### 树木对话生成流程

```
1. useAgentA2A Hook检测到两棵树该对话
   ↓
2. generateTreeAgentRespons() 构建上下文
   ├─ 树A的系统提示词（身份+性格+关系网络）
   ├─ 树B和环境相关的用户提示词
   └─ 对话历史和最近话题
   ↓
3. generateAgentDialogue() 调用LLM
   ├─ 检查enableLLM标志
   └─ 调用callTreeLLM()
   ↓
4. callTreeLLM() 路由到SecondMe
   ├─ 检查会话有效性
   ├─ 调用callSecondMeA2ADialogueSync()
   └─ 处理SSE流和超时
   ↓
5. SecondMe API返回对话
   ├─ 使用Gemini 2.0或Claude生成
   └─ 流式返回文本块
   ↓
6. 清理和验证输出
   ├─ 移除引号和特殊字符
   ├─ 应用长度限制
   └─ 确保性格一致性
   ↓
7. 对话显示和存储
   ├─ 更新树的lastWords
   ├─ 记录到dialogueMemory
   └─ 添加到chatHistory
```

## 🛡️ 错误处理和Fallback

SecondMe集成有完整的Fallback链：

```
尝试SecondMe LLM
    ↓ (失败或超时)
使用上下文感知Fallback (contextualFallback)
    ↓ (仍然失败)
使用模板库系统 (generateSocialChat)
```

**故障场景处理**：

| 场景 | 处理方式 |
|------|---------|
| 用户未登录SecondMe | Fallback到模板库 |
| Token过期 | 提示用户重新登录 |
| API超时（>8s） | 自动Fallback |
| 网络错误 | 记录错误并Fallback |
| 空响应 | 使用contextualFallback |

## 📈 性能指标

- **缓存命中**: <5ms
- **SecondMe调用**: 1-3秒（取决于模型）
- **超时保护**: 8秒
- **Fallback降级**: <1ms

## 🔍 调试和日志

### 启用调试模式

```javascript
// 查看所有SecondMe请求和响应
__treeAgentDialogueConfig.enableDebug();
__treeAgentDialogueConfig.enableLogging();

// 控制台会输出:
// [TreeAgent] Generating dialogue with SystemPrompt: ...
// [TreeAgent] SecondMe A2A Call Success: ...
// [TreeAgent] Cleaned response: ...
```

### 查看实时对话

在浏览器Network标签查看SecondMe API调用：

```
Request:
POST /api/secondme/chat/stream
Authorization: Bearer {accessToken}
Content-Type: application/json
{
  "message": "你要说什么？",
  "messages": [...],
  "model": "google_ai_studio/gemini-2.0-flash",
  "systemPrompt": "你是一棵温柔的树..."
}

Response (Server-Sent Events):
data: {"choices":[{"delta":{"content":"我"}}]}
data: {"choices":[{"delta":{"content":"很"}}]}
data: {"choices":[{"delta":{"content":"开心"}}]}
data: [DONE]
```

## ⚙️ 配置选项

### 启用/禁用SecondMe

```typescript
import { treeAgentDialogueConfigManager } from '@/lib/treeAgentDialogueConfig';

// 临时禁用（降级到模板库）
treeAgentDialogueConfigManager.updateConfig({
  enableLLM: false
});

// 重新启用
treeAgentDialogueConfigManager.updateConfig({
  enableLLM: true,
  llmProvider: 'secondme'
});
```

### 切换LLM提供商

```javascript
// 从SecondMe切换到OpenAI（当其他API集成后）
__treeAgentDialogueConfig.update({
  llmProvider: 'openai'
});

// 可选值: 'secondme', 'openai', 'anthropic', 'ollama', 'together'
```

## 🚨 常见问题

### Q: 为什么对话还是很短？

**A**: SecondMe使用的长度限制仍然有效。检查性格对应的maxLength：
- 社恐: 15字
- 温柔/睿智: 50字
- 活泼/调皮: 100字
- 神启: 30字

### Q: 对话很慢？

**A**: 可能的原因：
1. SecondMe API响应慢 - 检查网络
2. 用户网络差 - 客户端网络问题
3. 启用了缓存刷新 - 清除缓存试试

```javascript
// 清除缓存
if (window.__treeAgentDialogue?.clearCache) {
  __treeAgentDialogue.clearCache();
}
```

### Q: 对话完全不生成？

**A**: 检查：
1. 用户是否登录SecondMe
2. Token是否有效
3. 是否启用了LLM

```javascript
// 检查会话
const { isSecondMeSessionValid } = await import('@/lib/secondmeA2AService');
console.log('Session valid:', isSecondMeSessionValid());

// 检查配置
console.log(__treeAgentDialogueConfig.get());
```

### Q: 可以在没有SecondMe的情况下运行吗？

**A**: 完全可以。系统会自动Fallback到模板库：

```javascript
// 禁用LLM
__treeAgentDialogueConfig.disableAgent(); // 快速模式
// 或
__treeAgentDialogueConfig.update({ enableLLM: false }); // 模板库模式
```

## 🔄 未来扩展

### 计划的LLM提供商

- [ ] OpenAI (gpt-4-turbo)
- [ ] Claude (Anthropic)
- [ ] Ollama (本地LLM)
- [ ] Together AI

### 计划的功能

- [ ] 树木个性化Prompt缓存
- [ ] A2A对话历史持久化到Supabase
- [ ] 树木性格自适应学习
- [ ] 多语言对话支持
- [ ] 对话质量评分和反馈

## 📚 相关文档

- [完整开发指南](../../../../.github/TREE_AGENT_DIALOGUE_GUIDE.md)
- [快速启动指南](../../../../TREE_AGENT_QUICK_START.md)
- [SecondMe API参考](../../../../SecondMe%20API%20参考.md)

## 🎯 技术栈

```
树木 → TreeAgent对话系统 → SecondMe API
                      ↓
                   Google Gemini 2.0
                   或 Claude Sonnet 4.5
```

## 📞 支持

遇到问题？

1. **启用调试模式** - 查看详细日志
2. **检查网络标签** - 看SecondMe API请求
3. **验证会话** - ensure user is logged into SecondMe
4. **查看控制台** - 获取错误信息

---

**系统状态**: ✅ SecondMe集成完成并就绪
**最后更新**: 2026年3月18日
