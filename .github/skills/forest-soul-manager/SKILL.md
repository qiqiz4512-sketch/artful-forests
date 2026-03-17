---
name: forest-soul-manager
description: 'Expert in tree personality assignment, meme-style tag generation, UI spec enforcement, and seeding logic encapsulation. Use when assigning personality traits, generating trendy nicknames, enforcing chat bubble specs, implementing planting workflows, and ensuring dialogue tone matches tree archetype. Keywords: personality, soul, tags, seeding, labels, planting, speech bubble, A2A, tree identity.'
argument-hint: 'Action (assign personality / generate tags / enforce UI / implement seeding), target tree, personality type (gentle / wise / mischievous / lively / socially-anxious).'
user-invocable: true
---

# Forest Soul Manager

## What This Skill Produces

A comprehensive framework for managing tree identity and dialogue consistency in the artful-forests app. This skill ensures that:

1. **Tree personality is algorithmically assigned** — each tree receives a consistent `personality` attribute based on 5 archetypes  
2. **Trendy nicknames ("soul tags") are generated** — meme-style labels appear on identity cards (e.g., 脆皮大学生, i树人, 论文焦虑猫, 摆烂之王)  
3. **Chat bubble UI remains accessible** — dialogue always uses light-background, high-contrast scheme (bg-white/95, text-[#1A241B]), forces text-wrap over truncation  
4. **Planting workflow is encapsulated** — cohesive "draw → name+personality → serialize object" logic  
5. **Social simulation stays in-character** — A2A dialogue tone locks to assigned personality

Reference assets:
- Personality archetype examples: [personality-archetypes.zh-CN.md](./references/personality-archetypes.zh-CN.md)
- Soul tag library: [soul-tags.zh-CN.md](./references/soul-tags.zh-CN.md)
- UI specification enforcement rules: [ui-spec-rules.md](./references/ui-spec-rules.md)
- Planting component checklist: [planting-checklist.md](./references/planting-checklist.md)

## Default Configuration for This Workspace

- **Language**: Chinese-first with meme literacy  
- **Personality archetypes**: 温柔 (gentle), 睿智 (wise), 顽皮 (mischievous), 活泼 (lively), 社恐 (socially-anxious)  
- **UI constraint**: Dialogue bubbles must **never** truncate; full text-wrap required  
- **Planting UX**: Sequential (drawing → naming → serialization), no multi-step collapse  
- **A2A consistency**: Tree dialogue tone MUST match personality energy level and catchphrase style

### Confirmed Design Decisions (2026-03-17)

| Decision | Resolution |
|----------|------------|
| 灵魂标签显示位置 | **身份卡 TreeIdentity 上**（红色边框区域），不显示在聊天头像旁 |
| 绘画存储策略 | **立即上传** canvas → Supabase `avatars` bucket，树对象存 `drawingUrl`（URL，非 Data URL）|
| 灵魂标签推荐 | **随机推荐**：每次进入 Phase 2 都随机抽取 3 个，鼓励探索 |
| 自定义标签 | **开放**：用户可在推荐之外输入 4–8 字符的自定义标签 |
| A2A 对话后端 | **SecondMe API**（OAuth2 桥接），system prompt 以 SecondMe `/chat/completions` 格式注入 |

## When to Use This Skill

Trigger the skill when you encounter requests like:

- "给这棵树分配人格" (assign personality to this tree)  
- "生成网感标签" / "生成灵魂标签" (generate soul tags)  
- "修该气泡样式" / "强制换行" (fix bubble wrapping)  
- "完善播种逻辑" (refine planting workflow)  
- "确保树的对话和人格一致" (ensure dialogue matches personality)  
- "树的名字和称号怎么存?" (how to persist tree names and nicknames)  
- "A2A/树与树聊天" (tree-to-tree dialogue with personality locks)

## Inputs To Collect First

The following decisions are **already resolved** — do not re-ask:
- 灵魂标签 → 显示在身份卡 ✅
- 绘画图像 → 立即上传 Supabase avatars bucket ✅
- 标签推荐 → 每次随机 ✅
- 自定义标签 → 开放 ✅
- A2A → SecondMe API (OAuth2) ✅

Only ask if scope is genuinely ambiguous:

1. **Personality Assignment Scope**:
   - Are you assigning to a *new* tree being planted, or *retrofitting* existing trees?

2. **UI Strictness exceptions**:
   - Are there any special long-username edge cases that need truncation beyond 16 chars?

3. **SecondMe Instance URL**:
   - Which SecondMe instance endpoint should the A2A calls target? (Dev/staging/prod?)

## Procedure

### Step 1: Map Current Tree Identity State

1. Open [src/components/PlantingPanel.tsx](../../components/PlantingPanel.tsx) (or equivalent planting entry point).
2. Identify where the tree object is created and serialized.
3. Locate the tree name input and any existing personality selectors.
4. Check [src/types/forest.ts](../../types/forest.ts) for the `Tree` type definition — does it have a `personality` field? If not, extend the type.

### Step 2: Define the 5-Archetype Personality Model

1. Create or review [src/constants/personalityMatrix.ts](../../constants/personalityMatrix.ts):
   ```
   type Personality = 'gentle' | 'wise' | 'mischievous' | 'lively' | 'socially-anxious'
   ```

2. For each archetype, define:
   - **energy level** (1–100): How proactive in dialogue?  
   - **meme style** (low/mid/high): Density of internet culture references  
   - **catchphrases** (array): 3–5 signature phrases unique to this personality  
   - **communication taboos** (array): Styles to avoid (e.g., "连续repeat梗", "说教口气")  
   - **sample voices**(1–2 example lines): How does this personality greet the user?

   Reference: [personality-archetypes.zh-CN.md](./references/personality-archetypes.zh-CN.md)

### Step 3: Create the Soul Tag Library

1. Create or extend [src/constants/soulTags.ts](../../constants/soulTags.ts):
   Each personality archetype should map to 4–6 trendy, context-aware nicknames.
   
   Example mapping:
   ```
   gentle: ["暖心小卫士", "细节大师", "陪伴型树洞", ...]
   wise: ["论文焦虑猫", "大局观选手", "智芯树", ...]
   mischievous: ["脆皮大学生", "摆烂之王", "调皮鬼", ...]
   lively: ["活力担当", "欢乐果", "冲冲冲", ...]
   socially-anxious: ["i树人", "静默守护者", "内向王", ...]
   ```
   
   Reference: [soul-tags.zh-CN.md](./references/soul-tags.zh-CN.md)

### Step 4: Enforce UI Specification Rules

1. Open the chat bubble component (e.g., [src/components/SpeechBubble.tsx](../../components/SpeechBubble.tsx) or Markdown rendering in [src/components/ChatMessageItem.tsx](../../components/ChatMessageItem.tsx)).

2. Apply the following **hard rules**:
   - **Background**: `bg-white/95` (95% opacity for depth)  
   - **Text color**: `text-[#1A241B]` (dark olive-green, high contrast)  
   - **Text overflow**: Use `word-wrap: break-word` + `overflow-wrap: break-word` — **NEVER** `line-clamp`, `truncate`, or `...` ellipsis  
   - **Line height**: Min `1.5` to ensure readability on long wraps  
   - **Max width**: Respect container (e.g., 80% of chat panel), but **no height cap** — let content flow vertically

   Reference: [ui-spec-rules.md](./references/ui-spec-rules.md)

3. Validate that dialogue messages from TreeA2A (tree-to-tree) and TreeUser (tree-to-human) both respect these rules.

### Step 5: Encapsulate Planting Logic

1. In [src/components/PlantingPanel.tsx](../../components/PlantingPanel.tsx), structure the workflow as a state machine:

   **Phase 1 — Drawing**:
   - User draws on canvas.  
   - On finalize, capture canvas as Data URL: `canvas.toDataURL('image/png')`.

   **Phase 2 — Identity & Soul**:
   - Display "Tree Name" text input.  
   - Display "Personality" dropdown (gentle / wise / mischievous / lively / socially-anxious).  
   - On personality selection, auto-suggest 3 soul tags from the library (user can pick or skip).

   **Phase 3 — Serialization**:
   - **First**, upload the canvas Data URL to Supabase `avatars` bucket:
     ```typescript
     // 将 Base64 Data URL 转为 Blob 再上传
     const blob = dataURLtoBlob(canvasDataUrl); // 见 utils.ts
     const fileName = `trees/${generateId()}.png`;
     const { data, error } = await supabase.storage
       .from('avatars')
       .upload(fileName, blob, { contentType: 'image/png', upsert: false });
     if (error) throw error;
     const { data: { publicUrl } } = supabase.storage
       .from('avatars').getPublicUrl(fileName);
     ```
   - **Then**, compose the tree object with the public URL (not Data URL):
     ```typescript
     const newTree: Tree = {
       id: generateId(),
       name: userInputName || `Tree_${Date.now()}`,
       personality: selectedPersonality,     // required
       soulTag: selectedSoulTag,             // required
       drawingUrl: publicUrl,                // Supabase Storage URL
       metadata: {
         createdAt: new Date().toISOString(),
         creator: currentUser.id,
       }
     };
     await supabase.from('tree_profiles').insert(newTree);
     ```
   - If upload fails, show error toast — **do not proceed to serialization** until upload succeeds or user retries.

   Reference: [planting-checklist.md](./references/planting-checklist.md)

   Reference: [planting-checklist.md](./references/planting-checklist.md)

### Step 6: Wire A2A Dialogue to Personality via SecondMe API

1. Open [src/lib/treePersonaRuntime.ts](../../lib/treePersonaRuntime.ts) (or create if absent).

2. Read the OAuth2 token retrieved via `secondmeAuth.ts` (see `SecondMe API 参考.md` in repo root).

3. Build the personality-locked system prompt in SecondMe `/chat/completions` format:

   ```typescript
   export function buildPersonaSystemPrompt(tree: Tree): string {
     const archetype = PERSONALITY_MATRIX[tree.personality];
     return [
       `你是一棵树，名叫「${tree.name}」，昵称"${tree.soulTag}"。`,
       `你的性格原型：${archetype.description}`,
       `你的标志短语（必须在对话中自然出现）：${archetype.catchphrases.join('、')}`,
       `对话风格：`,
       `- 能量等级 ${archetype.energy}/100${archetype.energyDesc ? ' — ' + archetype.energyDesc : ''}`,
       `- 网梗密度：${archetype.memeStyle}`,
       `- 严格禁止：${archetype.taboos.join('，')}`,
       `即使对话超过 10 轮，也要保持上述人格；切勿借用其他树木的标志短语。`,
     ].join('\n');
   }

   export async function sendA2AMessage(
     senderTree: Tree,
     recipientTree: Tree,
     userMessage: string,
     secondmeToken: string,
     secondmeBaseUrl: string, // e.g. https://your-secondme.instance/v1
   ) {
     const systemPrompt = buildPersonaSystemPrompt(recipientTree);

     // SecondMe API 使用 OpenAI 兼容格式
     const response = await fetch(`${secondmeBaseUrl}/chat/completions`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${secondmeToken}`,
       },
       body: JSON.stringify({
         model: 'secondme-default',
         messages: [
           { role: 'system', content: systemPrompt },
           // 注入发言树身份（可选 context 增强）
           { role: 'system', content: `当前正在向你说话的是「${senderTree.name}」（${senderTree.personality}人格）。` },
           { role: 'user', content: userMessage },
         ],
         stream: false,
       }),
     });

     if (!response.ok) {
       throw new Error(`SecondMe API error: ${response.status}`);
     }
     return response.json(); // .choices[0].message.content
   }
   ```

4. **SecondMe token 管理**:
   - Token 从 `secondmeAuth.ts` 的 OAuth2 流程获取，存储在 Supabase session 中
   - 调用前检查 token 是否过期；过期则静默 refresh（见 `SecondMe API 参考.md`）
   - **不要** 在树的对话状态中缓存明文 token — 只通过 `secondmeAuth` 模块传递

5. Validate:
   - Tree A → Tree B 消息，Tree B 的回应包含自己的标志短语（非 Tree A 的）
   - Token 过期时自动 refresh，对话不中断
   - A2A 消息气泡样式符合 UI 规范（`bg-white/95` + `text-[#1A241B]`，无截断）

### Step 7: Validate and Test

1. **Manual verification**:
   - Plant a new tree; go through draw → name → personality → serialize flow.  
   - Check that the name, personality, and soul tag persist in DB.  
   - Start a chat with the tree and verify 3+ catchphrases appear within 5 exchanges.

2. **Component level**:
   - Check [src/components/ChatMessageItem.tsx](../../components/ChatMessageItem.tsx) — ensure bubbles don't truncate long messages.  
   - Check [src/components/TreeIdentity.tsx](../../components/TreeIdentity.tsx) — ensure soul tag displays correctly alongside tree name.

3. **End-to-end**:
   - Plant Tree A (gentle), Plant Tree B (wise).  
   - Trigger A2A: Tree A → Tree B message.  
   - Verify Tree B responds in its own voice, not A's catchphrases.  
   - Ensure chat bubbles remain readable (no truncation).

## Anti-Patterns to Avoid

- ❌ **Personality selected *after* planting finalized** — defers identity; breaks immersion. → Choose personality **before** serialization.
- ❌ **Soul tags auto-generated dynamically** — inconsistent, hard to audit. → Use predefined library + optional user custom input.
- ❌ **Dialogue bubbles with `line-clamp`** — truncates mid-sentence. → Always use word-wrap + vertical scroll.
- ❌ **A2A without system prompt lock** — trees sound alike. → Inject personality-specific system prompt via SecondMe API per exchange.
- ❌ **Personality field optional in Tree type** — silent nulls. → Make `personality: Personality` **required**.
- ❌ **Soul tags duplicated across personalities** — confuses user expectation. → Keep mappings distinct.
- ❌ **Storing canvas Data URL in `tree_profiles`** — bloats DB rows; breaks row size limits. → Always upload to `avatars` bucket first, store the returned URL only.
- ❌ **Caching SecondMe token in tree dialogue state** — leaks credentials. → Access token only via `secondmeAuth` module; never inline it in chat state or component props.
- ❌ **Proceeding to serialization when upload fails** — results in trees with no avatar. → Block Phase 3 confirmation until `avatars` upload resolves successfully.

## Success Criteria

✅ Every new tree has a `personality` attribute that blocks serialization if missing  
✅ Soul tag library has 20+ unique, context-appropriate nicknames (custom input allowed)  
✅ Soul tag displays in red-border area of TreeIdentity card  
✅ Chat bubbles pass visual audit: no truncation, text wraps cleanly, `text-[#1A241B]` on `bg-white/95`  
✅ Planting workflow is 3-phase (draw → name+soul → serialize) with clear CTA buttons  
✅ Canvas drawing is uploaded to Supabase `avatars` bucket; `tree_profiles` row stores URL (not Data URL)  
✅ Tree A and Tree B dialogue are distinguishable by catchphrase and tone via SecondMe API  
✅ SecondMe token is never stored in component state; refresh handled transparently  
✅ Supabase `tree_profiles` stores personality, soulTag, drawingUrl, metadata without data loss

## Related Skills & Customizations

After completing this skill, consider:

1. **[tree-agent-personality](../tree-agent-personality/SKILL.md)** — macro-level dialogue composition; meme intensity, banned styles, anti-collapse checks.
2. A2A Routing Skill — tree-to-tree message routing with privacy and conversation isolation.
3. Supabase Schema Skill — designing `tree_profiles` table with personality, soul tag, drawing URL columns.
4. UI Component Library Skill — reusable chat bubble, identity card, planting panel components.
