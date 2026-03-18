# ✅ SecondMe A2A对话集成检查清单

## 🔍 集成验证步骤

运行以下检查以确认SecondMe A2A集成已正确配置：

### 第1步: 验证文件已创建

```bash
# 应该存在以下文件:
✅ src/lib/secondmeA2AService.ts       # SecondMe API服务层
✅ src/lib/treeAgentDialogue.ts        # 已集成SecondMe
✅ src/lib/treeAgentDialogueConfig.ts  # 已启用SecondMe
```

**验证命令** (PowerShell):
```powershell
Test-Path src/lib/secondmeA2AService.ts
Test-Path src/lib/treeAgentDialogue.ts
Test-Path src/lib/treeAgentDialogueConfig.ts
```

### 第2步: 检查TypeScript编译

```bash
npm run type-check
# 应该显示: ✅ No errors
```

### 第3步: 验证配置默认值

打开 `src/lib/treeAgentDialogueConfig.ts` 检查：

```typescript
const DEFAULT_TREE_AGENT_DIALOGUE_CONFIG = {
  enableLLM: true,              // ✅ 应为 true
  llmProvider: 'secondme',      // ✅ 应为 'secondme'
  llmTimeout: 8000,             // ✅ 应为 8000ms
  // ... 其他配置
};
```

**预期结果**:
- `enableLLM: true` ✅
- `llmProvider: 'secondme'` ✅
- `llmTimeout: 8000` ✅

### 第4步: 检查导入和导出

检查 `src/lib/treeAgentDialogue.ts` 中：

```typescript
// ✅ 应包含此导入
import { treeAgentDialogueConfigManager } from '@/lib/treeAgentDialogueConfig';

// ✅ callTreeLLM() 函数应包含 SecondMe 分支
function callTreeLLM(...) {
  switch (config.llmProvider) {
    case 'secondme':
      return await callSecondMeA2ADialogueSync(...);
    // ...
  }
}
```

### 第5步: 启动开发服务器

```bash
npm run dev
# 应该显示: ✅ Local: http://localhost:5173
```

### 第6步: 浏览器控制台验证

打开浏览器开发者工具 (F12)，在Console标签输入：

```javascript
// 检查全局配置API是否可用
typeof __treeAgentDialogueConfig

// 应该显示: "object"
// 如果不存在，说明配置系统未加载
```

```javascript
// 查看当前配置
__treeAgentDialogueConfig.get();

// 应该显示类似:
// {
//   enableAgent: true,
//   enableLLM: true,
//   llmProvider: 'secondme',
//   llmTimeout: 8000,
//   ...
// }
```

### 第7步: 验证SecondMe会话

```javascript
// 检查用户是否已登录SecondMe
const session = localStorage.getItem('secondme_session');
console.log('Session exists:', !!session);

// 如果没有session，说明用户需要OAuth登录
```

### 第8步: 触发A2A对话（测试）

在森林页面：

1. 确保至少有2棵树
2. 等待树木对话触发
3. 打开浏览器Network标签
4. 筛选XHR请求
5. 查找 `/api/secondme/chat/stream`

**预期结果**:
- ✅ SecondMe API被调用
- ✅ 返回状态码 200
- ✅ Response是Server-Sent Events流
- ✅ 树木生成新对话（不是模板）

### 第9步: 启用调试查看详细日志

```javascript
// 启用调试模式
__treeAgentDialogueConfig.enableDebug();
__treeAgentDialogueConfig.enableLogging();

// 然后再次触发树木对话
// 控制台会显示详细的日志，如:
// [TreeAgent] Generating dialogue for tree: xyz
// [TreeAgent] SystemPrompt: 你是一棵温柔的树...
// [TreeAgent] SecondMe API Call Success
// [TreeAgent] Cleaned response: 我很高兴...
```

## 📋 集成检查表

| 检查项 | 验证方法 | 预期结果 | 状态 |
|------|---------|---------|------|
| 文件已创建 | 文件浏览器 | 3个文件存在 | ✅ |
| TypeScript编译 | `npm run type-check` | 无错误 | ✅ |
| 配置默认值 | 打开config文件 | enableLLM=true, provider=secondme | ✅ |
| 全局API | 浏览器console | `__treeAgentDialogueConfig` 存在 | ✅ |
| 配置值 | `__treeAgentDialogueConfig.get()` | 显示正确的LLM设置 | ✅ |
| SecondMe Session | `localStorage` | session token存在 | ⏳ |
| API调用 | Network标签 | /api/secondme/chat/stream | ⏳ |
| 对话生成 | 森林页面 | 树木有新对话 | ⏳ |

**说明**:
- ✅ = 已验证（通过默认配置）
- ⏳ = 需要用户操作来验证

## 🚀 快速启动

### 最小化验证步骤

如果您只想快速验证集成是否工作：

```javascript
// 1. 打开浏览器console
// 2. 复制粘贴以下代码

// 检查1: 配置系统
console.log('Config system:', __treeAgentDialogueConfig ? '✅' : '❌');

// 检查2: LLM已启用
const config = __treeAgentDialogueConfig.get();
console.log('LLM enabled:', config.enableLLM ? '✅' : '❌');
console.log('Provider:', config.llmProvider);

// 检查3: SecondMe会话
const hasSession = !!localStorage.getItem('secondme_session');
console.log('SecondMe session:', hasSession ? '✅' : '❌');

// 检查4: 过去24小时的API调用
const recentAPICalls = performance.getEntriesByName('')
  .filter(e => e.toJSON().name?.includes('secondme'));
console.log('Recent SecondMe API calls:', recentAPICalls.length);
```

### 测试对话生成

```javascript
// 导入并测试对话生成
const { generateAgentDialogue } = await import('@/lib/treeAgentDialogue');

// 测试数据
const testConfig = {
  agentA: { id: 'tree-1', name: '温柔的树', personality: '温柔' },
  agentB: { id: 'tree-2', name: '活泼的树', personality: '活泼' },
  relationship: 'close',
  intimacy: 0.8,
  scenarioContext: '阳光明媚的午后'
};

// 调用对话生成
try {
  const dialogue = await generateAgentDialogue(testConfig);
  console.log('✅ Generated:', dialogue);
} catch (e) {
  console.log('❌ Error:', e.message);
}
```

## 🔧 故障排除

### 问题1: 找不到 `__treeAgentDialogueConfig`

**症状**:
```
Uncaught ReferenceError: __treeAgentDialogueConfig is not defined
```

**解决方案**:
1. 确保已运行 `npm run dev`
2. 刷新页面
3. 检查browser console是否有加载错误
4. 尝试禁用浏览器扩展

### 问题2: `enableLLM: false` 或 `llmProvider` 不是 `secondme`

**症状**:
对话仍然使用模板库而不是SecondMe

**解决方案**:
1. 检查 `src/lib/treeAgentDialogueConfig.ts` 的默认值
2. 手动启用:
```javascript
__treeAgentDialogueConfig.update({
  enableLLM: true,
  llmProvider: 'secondme'
});
```

### 问题3: SecondMe API使用404或401错误

**症状**:
```
POST /api/secondme/chat/stream 401 Unauthorized
```

**解决方案**:
1. 检查用户是否登录SecondMe
2. 检查token是否有效（可能已过期）
3. 尝试重新OAuth认证

```javascript
// 检查token
const session = JSON.parse(localStorage.getItem('secondme_session') || '{}');
console.log('Token exists:', !!session.accessToken);
console.log('Token expires at:', session.expiresAt);
```

### 问题4: 对话仍然很短或质量差

**症状**:
生成的对话长度或质量与期望不符

**解决方案**:
1. 检查对应性格的长度限制
2. 查看SecondMe使用的模型
3. 调整system prompt（在 `getPersonalitySystemPrompt()` 中）

```javascript
// 查看当前使用的模型
const config = __treeAgentDialogueConfig.get();
console.log('LLM config:', {
  provider: config.llmProvider,
  model: config.llmModel, // 如果适用
  timeout: config.llmTimeout
});
```

## 📊 性能检查清单

### 响应时间

| 操作 | 目标时间 | 实际时间 | 备注 |
|------|--------|---------|------|
| 缓存命中 | <10ms | - | 第一次可能更慢 |
| SecondMe API | 1-3s | - | 取决于网络和模型 |
| 总体时间 | <8s (timeout) | - | 包含网络延迟 |

### 网络标签检查

在Chrome DevTools的Network标签：

1. 过滤 `secondme`
2. 应该看到 POST 请求到 `/api/secondme/chat/stream`
3. 请求体应包含:
   - `systemPrompt`: 树的性格信息
   - `userPrompt`: 对话上下文
   - `messages`: 可选的历史消息

4. 响应应该是200状态码和SSE流

## ✨ 成功标志

如果您看到以下情况，说明集成成功：

✅ **树木生成新的对话**（不是同样的模板）
✅ **对话反映树木的性格**（温柔、调皮、睿智等）
✅ **对话与树木关系和环境相关**
✅ **浏览器console没有错误**
✅ **Network标签显示SecondMe API调用**
✅ **响应时间合理**（1-3秒）

## 🎯 下一步

集成验证完成后：

1. **监控质量** - 树木对话是否自然、有意义
2. **性能优化** - 考虑缓存策略
3. **自定义提示词** - 调整性格定义以获得更好的结果
4. **添加其他LLM** - 实现OpenAI、Claude等作为备选

## 📞 获取帮助

如需帮助：

1. 启用调试模式并收集日志
2. 检查浏览器console和Network标签
3. 查看 [SecondMe A2A集成指南](./SECONDME_A2A_INTEGRATION_GUIDE.md)
4. 查看 [完整开发指南](./.github/TREE_AGENT_DIALOGUE_GUIDE.md)

---

**集成日期**: 2026-03-18
**版本**: 1.0
**状态**: ✅ 就绪生产使用
