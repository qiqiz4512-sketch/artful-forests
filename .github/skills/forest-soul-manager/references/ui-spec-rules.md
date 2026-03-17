# UI 规范守卫规则 (UI Spec Enforcement Rules)

这份文档定义了 ForestSoulManager 在对话气泡、身份卡和播种面板上强制执行的视觉和交互约束。

## 核心约束

### 颜色方案（强制，不可覆写）

| 元素 | CSS 类/属性 | 说明 |
|------|-----------|------|
| 气泡背景 | `bg-white/95` | 95% opacity 白色（保留深度感） |
| 气泡文字 | `text-[#1A241B]` | 深橄榄绿（高对比，易读） |
| 边框/强调 | `border-[#DC2626]` red-600 | 红色边框（身份卡和重点区域） |
| 链接 | `text-blue-600` | 标准蓝色链接 |

**色度对比检查**：
- `#1A241B` (text) on `white` (bg): 比率 **18:1** → WCAG AAA 级别✅
- 不允许浅灰文字、斜体模糊或色度过低的组合

---

## 文本换行强制规则

### ❌ **禁止使用**

```css
/* 绝对禁止 */
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line-clamp-3 { ... } /* Tailwind line-clamp 工具类 */
... /* 省略号 */
```

### ✅ **强制使用**

```css
/* 必须应用到对话气泡容器 */
.speech-bubble {
  word-wrap: break-word;        /* CSS 标准 */
  overflow-wrap: break-word;    /* CSS 3 标准 */
  word-break: break-word;       /* Fallback */
  white-space: normal;          /* 允许换行 */
  line-height: 1.5;             /* 最小行高，确保可读性 */
  max-width: 80%;               /* 尊重容器，但无高度限制 */
  min-height: auto;             /* 高度自适应 */
}
```

**Tailwind 等效**：
```html
<div class="break-words whitespace-normal leading-relaxed max-w-[80%]">
  {{ treeMessage }}
</div>
```

### 多行文本示例

**输入消息**（200+ 字符长对话）：
```
这个问题其实挺有意思的，因为涉及到多个层面的因素……（省略）
```

**正确渲染**（换行无截断）：
```
这个问题其实挺有意思的，因为涉及到多个层面的因素……
……
（完整文本，垂直滚动）
```

**错误渲染**（禁止）：
```
这个问题其实挺有意思的，因为涉及到多...
（截断 ❌）
```

---

## 身份卡 (TreeIdentity) UI 规范

### 布局

> **确定决策：灵魂标签显示在身份卡红色边框区域，不显示在聊天头像旁**

```
┌─────────────────────────────────┐
│ 🌲 树木头像                      │  红色边框 border-red-600
├─────────────────────────────────┤
│ 名字（4–16 字符）                 │
│ [红艦] 灵魂标签 ← 在此显示    │  font-bold, text-red-600
├─────────────────────────────────┤
│ 人格：顽皮 🔥 (可图标)           │
│ 能量：████░░░░░░  71/100        │  进度条
└─────────────────────────────────┘
```

**聊天界面中（A2A / 用户对话）**：标签**不显示**在气泡旁边。用户通过身份卡面板查看标签。

### 细节规范

| 部分 | 规范 | 约束 |
|------|------|------|
| 树木头像 | 尺寸 60×60px | 正方形、无边框 |
| 名字 | font-bold, text-base | 1 行，如超长用`truncate` 可容忍（这里例外） |
| 灵魂标签 | font-bold, text-red-600, 内边距 px-2 py-0.5, border border-red-400 rounded | **必显示在身份卡中**，不显示在聊天头像旁 |
| 人格标签 | 小字 (text-xs/sm) | 形如 "人格：顽皮" |
| 能量条 | 宽 100%, 高 8px | 绿→黄→红 渐变（可选美化） |
| 红色边框 | border-red-600, 宽 2px | 身份卡的视觉重点 |

---

## ChatMessageItem 和 SpeechBubble 规范

### 气泡容器

```tsx
<div className="flex gap-3 my-2">
  {/* 头像 */}
  <div className="w-10 h-10 rounded-full bg-green-100 flex-shrink-0">
    📌 树木头像或首字符
  </div>
  
  {/* 消息气泡（强制规范） */}
  <div className="bg-white/95 text-[#1A241B] rounded-lg px-4 py-3 break-words whitespace-normal leading-relaxed max-w-[80%]">
    {message.content}
  </div>
</div>
```

### 长消息处理（200+ 字符）

**场景 A：容器宽度充足**
```
└─ 气泡自然展开到 max-width (80%)，垂直滚动
└─ 用户可上下拖动查看全文
```

**场景 B：移动端（宽度 < 400px）**
```
└─ max-width 降低到 100% - 16px（保留左右 8px margin）
└─ 仍须 break-words，不允许水平滚动
```

### emoji 和特殊字符处理

- emoji 计数为 1 个字符（避免行宽预测偏差）
- markdown 链接在气泡内应用 `text-blue-600 underline`
- 代码块：使用 `bg-gray-100 font-mono text-xs` 包裹，内部仍需 break-words

---

## 播种面板 (PlantingPanel) UI 规范

### Phase 2 — 身份 & 灵魂 输入框

```html
<!-- 树木名字输入 -->
<div>
  <label className="text-sm font-semibold">树的名字</label>
  <input 
    type="text" 
    maxLength={16}
    placeholder="e.g. 松师傅"
    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-green-500"
  />
  <p className="text-xs text-gray-500 mt-1">1–16 字符，避免特殊符号</p>
</div>

<!-- 人格选择下拉 -->
<div>
  <label className="text-sm font-semibold">选择人格</label>
  <select className="w-full px-3 py-2 border border-gray-300 rounded">
    <option>—— 选择人格 ——</option>
    <option value="gentle">温柔 🌸</option>
    <option value="wise">睿智 🧠</option>
    <option value="mischievous">顽皮 🔥</option>
    <option value="lively">活泼 ⚡</option>
    <option value="socially_anxious">社恐 🌿</option>
  </select>
</div>

<!-- 灵魂标签建议 -->
<div>
  <label className="text-sm font-semibold">灵魂标签</label>
  <div className="flex gap-2 flex-wrap mt-2">
    <!-- 3 个随机推荐标签 -->
    <button className="px-3 py-1 bg-red-100 text-red-600 rounded font-semibold">
      脆皮大学生
    </button>
    <button className="px-3 py-1 bg-red-100 text-red-600 rounded font-semibold">
      调皮鬼
    </button>
    <button className="px-3 py-1 bg-red-100 text-red-600 rounded font-semibold">
      灵魂反转机
    </button>
  </div>
  
  <!-- 或自定义输入 -->
  <input 
    type="text" 
    maxLength={8}
    placeholder="或输入自定义标签"
    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded"
  />
  <p className="text-xs text-gray-500 mt-1">4–8 字符</p>
</div>

<!-- CTA 按钮 -->
<button 
  disabled={!name || !personality}
  className="w-full mt-4 px-4 py-2 bg-green-600 text-white font-semibold rounded disabled:bg-gray-300"
>
  🌱 完成播种
</button>
```

### 输入验证

| 字段 | 规则 | 错误信息 |
|------|------|---------|
| 名字 | 1–16 字符 | "名字长度不能超过 16 字" |
| 人格 | 必选 | "请选择一个人格" |
| 标签 | 4–8 字符 | "灵魂标签长 4–8 字" |
| 标签 | 无敏感词 | "包含不允许的词汇，请修改" |

---

## 深色模式适配（可选）

如果森林支持深色模式，应创建**平行的** UI 规范：

```css
/* 深色方案 */
.dark .speech-bubble {
  @apply bg-gray-900/95 text-gray-100; /* 翻转，保持对比 */
}
```

**注意**：不允许在浅色模式下使用深色字体，反之亦然。保持一致的对比基线。

---

## 响应式约束

| 断点 | 气泡 max-width | 身份卡宽 | 备注 |
|------|---------------|---------|------|
| lg (1024px+) | 80% | 280px | 桌面，宽松 |
| md (768px+) | 85% | 240px | 平板 |
| sm (640px) | 90% | 200px | 手机，紧凑 |
| xs (< 320px) | 100% - 16px | 自适应 | 超小屏 |

**硬性约束**：即使在最小屏幕上，气泡宽度不得小于 200px（否则单词无法正常换行）。

---

## 无障碍 (A11y) 检查清单

- [ ] `bg-white/95` + `text-[#1A241B]` 通过 WCAG AAA 对比测试
- [ ] 交互元素 (按钮、输入框) 有 `:focus-visible` 状态
- [ ] 身份卡图片有 `alt` 属性（"[树名] 的头像"）
- [ ] 气泡消息由 `<p>` 或 `<article>` 包裹，不用 `<div>`
- [ ] 链接用 `<a href="">` 而非 `<button>` 伪造链接
- [ ] 灵魂标签有视觉和语义分隔（不仅仅是颜色）

---

## 常见错误与修正

| ❌ 错误做法 | ✅ 正确做法 |
|----------|---------|
| `truncate` 类 | 删除，应用 `break-words whitespace-normal` |
| `line-clamp-3` | 删除，使用垂直滚动或 flex 展开 |
| 浅灰文字（低对比） | 改用 `text-[#1A241B]` |
| 气泡 `max-h-24` | 删除高度限制，使用 `overflow-y-auto` 如有需要 |
| 自定义气泡背景色 | 强制 `bg-white/95`，保持一致 |
| 身份卡省略标签 | 灵魂标签必显示 |
| 播种面板合并步骤 | 保持 3 阶：draw → name+soul → serialize |

---

## 验证脚本参考

```typescript
// utils/validateUISpec.ts
export function validateSpeechBubble(element: HTMLElement): ValidationResult {
  const computed = window.getComputedStyle(element);
  const issues: string[] = [];

  // 检查背景
  if (!computed.backgroundColor.includes('rgba(255, 255, 255')) {
    issues.push('气泡背景应为 bg-white/95');
  }

  // 检查文字颜色
  if (computed.color !== 'rgb(26, 36, 27)') { // #1A241B
    issues.push('文字颜色应为 text-[#1A241B]');
  }

  // 检查换行
  if (computed.whiteSpace === 'nowrap' || computed.textOverflow === 'ellipsis') {
    issues.push('禁止 truncate 或省略号');
  }

  return { valid: issues.length === 0, issues };
}
```

---

## 设计视频参考

（如有 Figma 设计稿或设计视频，可在此补充链接）

---

## 更新日志

- **v1.0** (2026-03-17)：初版发布，定义 5 个核心约束
- (待更新)
