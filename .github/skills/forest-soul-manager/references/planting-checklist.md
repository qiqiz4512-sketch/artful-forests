# 播种逻辑检查清单 (Planting Checklist)

这份清单确保 PlantingPanel 的三个阶段（绘画 → 起名+人格 → 序列化）一致、完整、可测。

---

## Pre-Planting: 准备阶段

### 文件检查

- [ ] [src/types/forest.ts](../../types/forest.ts) 中 `Tree` 类型包含 `personality: Personality` 字段（**必需，不可选**）
- [ ] [src/types/forest.ts](../../types/forest.ts) 中 `Tree` 类型包含 `soulTag: string` 字段
- [ ] [src/types/forest.ts](../../types/forest.ts) 中 `Tree` 类型包含 `drawingDataUrl: string` 字段
- [ ] [src/constants/personalityMatrix.ts](../../constants/personalityMatrix.ts) 导出 `PERSONALITY_MATRIX` 对象（5 个人格）
- [ ] [src/constants/soulTags.ts](../../constants/soulTags.ts) 导出 `SOUL_TAGS_BY_PERSONALITY` 映射

### 组件检查

- [ ] [src/components/PlantingPanel.tsx](../../components/PlantingPanel.tsx) 存在且包含 3 个明确的阶段
  - Phase 1: DrawingCanvas
  - Phase 2: IdentityForm (名字 + 人格 + 灵魂标签)
  - Phase 3: Confirmation
- [ ] [src/components/TreeIdentity.tsx](../../components/TreeIdentity.tsx) 显示树名 + 人格 + 灵魂标签
- [ ] [src/components/SpeechBubble.tsx](../../components/SpeechBubble.tsx) 或 ChatMessageItem apply 了 `break-words whitespace-normal` 样式

---

## Phase 1: 绘画 (Drawing)

### Canvas 设置

- [ ] Canvas 尺寸至少 256×256px（建议 512×512px）
- [ ] Canvas 背景是白色或透明（便于后续组合）
- [ ] 画笔工具至少包括：钢笔（free draw）、橡皮、颜色选择器
- [ ] 撤销/重做功能可用

### 提交流程

- [ ] 「完成绘画」 / 「next step」 按钮在 canvas 下方
- [ ] 点击后，將 canvas 转换为 Data URL: `canvas.toDataURL('image/png')`
- [ ] Data URL 存储在内存变量（或状态），**不立即上传**到 Supabase
- [ ] 显示预览：缩小的 canvas 图像（缩放到 120×120px）显示在 Phase 2 顶部确认

### UX 检查

- [ ] 用户可以返回重新绘画（不必重新开始）
- [ ] 完成绘画后有明确的「下一步」CTA
- [ ] 不强制完美（允许涂鸦、简笔）

---

## Phase 2: 身份与灵魂 (Identity & Soul)

### 树木名字输入

- [ ] 输入框宽度 100%，最小高 40px
- [ ] maxLength 16 字符
- [ ] placeholder: "e.g. 松师傅"
- [ ] 验证：1–16 字符，无特殊符号（可允许 emoji？）
- [ ] 错误提示清晰（"名字长度不能超过 16 字"）
- [ ] 默认值：空（用户输入）或可选自动生成（基于绘画提取特征）

### 人格选择下拉

- [ ] 下拉框宽度 100%，最小高 40px
- [ ] 5 个选项 + placeholder ("—— 选择人格 ——")
  ```
  - 温柔 🌸 (gentle)
  - 睿智 🧠 (wise)
  - 顽皮 🔥 (mischievous)
  - 活泼 ⚡ (lively)
  - 社恐 🌿 (socially_anxious)
  ```
- [ ] 验证：必选，不能为空
- [ ] 错误提示：「请选择一个人格」

### 灵魂标签选择

- [ ] 人格选中后，立即展示 3 个**随机**灵魂标签
- [ ] 每次返回 Phase 2 时，标签集合重新随机（同一人格可能有不同的推荐）
- [ ] 每个标签是可点击的按钮，点击后该标签被选中（视觉反馈：加粗或背景颜色）
- [ ] 或下方提供文本输入框，用户可自定义标签
  - maxLength: 8 字符
  - 验证：4–8 字符，无敏感词
  - 错误提示清晰

- [ ] 选中状态显示（例如：边框加粗、背景 bg-red-200）
- [ ] 最终选中的标签在 Phase 3 预览中显示

### 数据流

```
用户选择人格 
  → 系统查询 SOUL_TAGS_BY_PERSONALITY[personality]
  → 随机取 3 个
  → 渲染 3 个标签按钮
  → 用户点击其一或输入自定义
  → 将选中的 soulTag 存储在状态
```

### UX 检查

- [ ] 可返回 Phase 1 重新绘画（不丢失输入的名字和人格）
  - 建议：保存到临时 sessionStorage
- [ ] 「下一步」CTA 禁用条件：`!name || !personality || !soulTag`
- [ ] 进度条或 breadcrumb 显示 "第 2 步/3 步"

---

## Phase 3: 确认与序列化 (Confirmation & Serialization)

### 预览内容

```
┌─ 绘画预览 ────────────────────┐
│ [缩小的树木图像 120×120]       │
└─────────────────────────────┘

┌─ 身份确认 ────────────────────┐
│ 树名：「松师傅」                │
│ 人格：顽皮 🔥                  │
│ 灵魂标签：[脆皮大学生]         │
└─────────────────────────────┘
```

### 大对象序列化

> **确定策略：立即上传到 Supabase `avatars` bucket，存储 URL（非 Data URL）**

**第一步：上传画作图到 avatars bucket**
```typescript
const blob = dataURLtoBlob(formState.canvasDataUrl);
const fileName = `trees/${generateId()}.png`;
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(fileName, blob, { contentType: 'image/png', upsert: false });
if (error) {
  // 显示错误 toast，阻止进入序列化 — 不要穿靓继续
  throw error;
}
const { data: { publicUrl } } = supabase.storage
  .from('avatars').getPublicUrl(fileName);
```

**第二步：构建 tree 对象（URL 而非 Data URL）**
```typescript
const newTree: Tree = {
  id: generateId(),
  name: formState.name,
  personality: formState.personality,     // 必需
  soulTag: formState.soulTag,             // 必需
  drawingUrl: publicUrl,                  // Supabase Storage 公共 URL
  metadata: {
    createdAt: new Date().toISOString(),
    creator: currentUser?.id || 'anonymous',
  }
};
await supabase.from('tree_profiles').insert(newTree);
```

- [ ] 上传失败时：显示错误 toast，保持 Phase 3 页面开放（不自动关闭）
- [ ] `tree_profiles` 表中的 `drawing_url` 字段类型为 `text`，存储 Storage public URL
- [ ] **禁止**将 Data URL（base64）写入 `tree_profiles` 任何列—会超过 Postgres 行大小限制

### 按钮和流程

- [ ] 「确认并完成」按钮：
  - [ ] 点击后触发序列化 + 持久化
  - [ ] 显示加载动画（如 Supabase）
  - [ ] 成功后显示 success toast
  - [ ] 返回森林主界面，新树出现在地图上

- [ ] 「返回编辑」按钮：
  - [ ] 返回 Phase 2，保存所有输入
  - [ ] 可从任意阶段返回 (甚至从 Phase 3 回到 Phase 1)

- [ ] 「取消」按钮（可选）：
  - [ ] 清空所有状态，关闭 PlantingPanel
  - [ ] 确认对话：「取消播种？你的绘画将丢失。」

### 支线场景

**场景 A：用户多次返回修改**
```
Phase 1 (draw) → Phase 2 (name+soul) → Phase 1 (redraw) → Phase 2 → Phase 3 ✓
```
- [ ] 返回时保留上次的输入（名字、人格、灵魂标签）
- [ ] 重新获取 Data URL（新的 canvas 图像）

**场景 B：丢失网络连接（Supabase）**
```
Phase 3 点击「完成」[图像上传失败] → toast: "绘画上传失败，请重试"
```
- [ ] 保留 Phase 3 页面开放，不自动跳转
- [ ] 提供「重试上传」按鈕（重新调用 upload 逻辑）
- [ ] **不提供**「离线保存」 — 已确定策略为必须上传后才序列化

**场景 C：用户提交空输入**
```
用户点击「完成」，但未选择人格
```
- [ ] Phase 2 的提交按钮禁用（`disabled={!personality}` 等）
- [ ] 或提交时显示 validation error toast
- [ ] 焦点回到首次出错的输入框

---

## 单元测试清单

### PlantingPanel 组件测试

```typescript
describe('PlantingPanel', () => {
  test('Phase 1: 绘画完成后可进入 Phase 2', () => {
    // 1. 绘制 canvas
    // 2. 点击「完成绘画」
    // 3. 断言：PhaseIndicator 显示 "2/3"，IdentityForm 可见
  });

  test('Phase 2: 未选人格时提交按钮禁用', () => {
    // 1. 输入名字和灵魂标签，但不选人格
    // 2. 断言：「完成」按钮 disabled
  });

  test('Phase 2: 选人格后，3 个灵魂标签随机出现', () => {
    // 1. 选择「顽皮」
    // 2. 断言：渲染 3 个标签，都来自 SOUL_TAGS_BY_PERSONALITY['mischievous']
  });

  test('Phase 3: 序列化对象包含所有字段', () => {
    // 1. 完整走通 Phase 1 → 2 → 3
    // 2. 点击「完成」
    // 3. 断言：生成的 tree 对象有 id, name, personality, soulTag, drawingDataUrl, metadata
  });

  test('可从 Phase 3 返回 Phase 1 并修改', () => {
    // 1. 进到 Phase 3
    // 2. 点击「返回编辑」
    // 3. 返回到 Phase 1 或 Phase 2（取决于实现）
    // 4. 修改绘画
    // 5. 再次进到 Phase 3，新图像已更新
  });
});
```

### 集成测试示例

```typescript
describe('Planting E2E', () => {
  test('完整流程：绘画 → 起名 → 人格 → 完成', async () => {
    // 1. 打开 PlantingPanel
    // 2. 在 canvas 上绘制（模拟鼠标事件）
    // 3. 点击「完成绘画」
    // 4. 输入名字「松师傅」
    // 5. 选择人格「顽皮」
    // 6. 点击灵魂标签「脆皮大学生」
    // 7. 点击「完成播种」
    // 8. 待 Supabase.insert() 完成
    // 9. 断言：森林地图中出现新树，名字和标签可见
    // 10. A2A 对话开始，树的回应包含顽皮的标志短语
  });
});
```

---

## UI/UX 验收标准

◻ **外观检查**
- [ ] 三个 Phase 的视觉层级清晰
- [ ] Phase 2 的表单布局整洁，输入框对齐
- [ ] 灵魂标签按钮在 hover 时有反馈（背景色变化或阴影）
- [ ] 错误提示文字为红色，清晰可读

◻ **交互检查**
- [ ] 键盘导航：Tab 能遍历所有输入框和按钮
- [ ] 移动端：Phase 2 表单在竖屏下不会水平滚动
- [ ] 返回操作：浏览器后退键或「返回编辑」都能安全返回

◻ **性能检查**
- [ ] Canvas drawing 帧率 > 30fps
- [ ] Phase 之间切换 < 300ms
- [ ] Supabase.insert 超时设置为 10s（有重试）

---

## 上线前最终检查清单

- [ ] 所有代码通过 ESLint 和 TypeScript 编译
- [ ] 单元测试覆盖率 > 80%
- [ ] E2E 测试通过（完整流程 × 3 次）
- [ ] 测试环境中 Supabase 连接正常
- [ ] 所有错误信息已本地化（中文）
- [ ] 移动端适配验证（iPhone SE, iPad, Android)
- [ ] 屏幕阅读器兼容性检查（NVDA / JAWS）
- [ ] 无障碍对比度检查（WCAG AA）
- [ ] 文档已更新（在 SKILL.md 和本清单中）
- [ ] 团队 Code Review 通过
- [ ] Product Owner 验收完成

---

## 相关代码路径

| 组件/文件 | 职责 |
|----------|------|
| `PlantingPanel.tsx` | 3 阶段状态机、流程控制 |
| `DrawingCanvas.tsx` | Canvas 绘画、Data URL 转换 |
| `IdentityForm.tsx` | 名字、人格、灵魂标签输入 |
| `forest.ts (types)` | Tree 类型定义 |
| `personalityMatrix.ts` | 人格常量 + 能量、梗密度等属性 |
| `soulTags.ts` | 灵魂标签库 |
| `forestStore.ts` | 本地树状态管理 |
| `supabase.ts` | Supabase 连接和 CRUD |

---

## 常见陷阱与避免

| ⚠️ 风险 | ✅ 避免方案 |
|--------|----------|
| 绘画后丢失 canvas | 保存 Data URL 在状态，不依赖 DOM canvas 元素 |
| 返回后表单重置 | 使用 sessionStorage 或状态管理持久化输入 |
| 灵魂标签空值 | 表单验证中强制检查，按钮禁用条件包含 `!soulTag` |
| Supabase 上传超时 | 设置 timeout 和重试机制；本地优先插入以加快 UX |
| 网络错误后无法恢复 | 提供「重试」按钮；不自动关闭 PlantingPanel |
| 另一用户同时播种 | 树 ID 用 UUID，不依赖时间戳防冲突 |

---

## 维护和迭代

**月度检查**：
- [ ] 检查屏幕阅读器兼容性（新版本浏览器）
- [ ] 采集用户反馈："播种流程哪个环节卡住了？"
- [ ] 对比数据：绘画完成率、人格选择分布、最常用标签

**季度迭代**：
- [ ] 考虑 Phase 之间的 AI-辅助：基于绘画风格建议人格
- [ ] 考虑 Phase 4：选择起始族群（Socially-anxious 树优先聚集等）

---

## 更新日志

- **v1.0** (2026-03-17)：初版发布，3 阶段流程定义完毕
- (待更新)
