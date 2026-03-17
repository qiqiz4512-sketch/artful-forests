---
name: forest-a2a-simulator
description: 'Simulate forest social evolution for tree-to-tree dialogue, intimacy updates, kinship-safe pairing, memory echo continuity, ecology-based chat frequency, epic/trending chat cards, and scene-to-panel linkage. Use when modifying tree dialogue, optimizing A2A logic, handling tree relationships, generating social logs, or tuning intimacy, breeding, epic cards, and energy links.'
argument-hint: 'Goal, target subsystem (scheduler | memory | intimacy | breeding | epic UI | social log), and whether to keep rule-based dialogue or integrate SecondMe.'
user-invocable: true
---

# Forest A2A Simulator

## What This Skill Produces

This skill packages the forest's tree-to-tree social simulation into a reusable workflow that stays aligned with the current repository architecture.

It is responsible for:

1. Ecology-based chat cadence: use tree distance, ecology zone, and world mood weights to decide who talks and how often.
2. Personality-driven interaction strategy: lively trees initiate more often, shy trees speak briefly, and divine/manual trees trigger adoration and epic flows.
3. Memory continuity: always check memory first and prefer echo/continuation text over random chatter when recent topics exist.
4. Intimacy and relationship evolution: update intimacy per interaction and switch tone when trees move from stranger to friend/partner/family states.
5. Kinship-safe social rules: forbid near-kin pairing; allow partner/breeding logic only for adult, compatible, non-blood-related trees.
6. Visual/UI linkage: render scene energy links and mirror the interaction into the right-side chat panel with time groups, relation chips, and message types.
7. Epic/trending escalation: classify divine/manual-tree events as epic and mark social heat for UI surfaces and profile timelines.
8. Dialogue shaping: append ecology-appropriate tail phrases and dynamically constrain message length by personality and speaking pace.

## Workspace Defaults

- Scope: workspace-shared skill in .github/skills.
- Runtime baseline: current A2A logic is local/rule-based in [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts), not SecondMe-first.
- Chat state + memory live in [src/stores/useForestStore.ts](../../../src/stores/useForestStore.ts).
- Relationship and dialogue helpers live in [src/lib/treeSociety.ts](../../../src/lib/treeSociety.ts).
- Scene linkage is rendered by [src/components/AgentLink.tsx](../../../src/components/AgentLink.tsx).
- Right-side social chat rendering lives in [src/components/ChatPanel.tsx](../../../src/components/ChatPanel.tsx), [src/components/chat-panel/useChatPanelState.ts](../../../src/components/chat-panel/useChatPanelState.ts), and [src/components/chat-panel/ChatMessageItem.tsx](../../../src/components/chat-panel/ChatMessageItem.tsx).
- Tree profile timeline persistence already tracks relationship/highlight/trending events in [src/lib/treeProfileRepository.ts](../../../src/lib/treeProfileRepository.ts).

### Confirmed Design Decisions (2026-03-17)

1. Keep current repository semantics: hand-drawn/manual trees are treated as divine trees for adoration routing, epic channeling, and scene-link emphasis.
2. Upgrade epic/hot-score detection from a simple flag into a composite rule using likes, comments, cross-ecology spread, and intimacy jumps.
3. Add an explicit partner-compatibility score before breeding or special “繁育幼苗” decrees are allowed.

## When to Use

Use this skill when prompts include or imply:

- “修改树木对话”
- “优化 A2A 逻辑”
- “处理树木关系”
- “生成社交日志”
- “调整亲密度/伴侣/繁育规则”
- “加上记忆续聊 / Echo Text”
- “给神启树做朝拜 / Epic 对话”
- “让主场景连线和聊天面板联动”

## Existing Repository Facts To Preserve

1. Tree social data already exists on the agent model in [src/types/forest.ts](../../../src/types/forest.ts):
   - socialCircle.friends/family/partner
   - intimacyMap
   - memory.lastTopic / interactionHistory / timestamp / recallingUntil

2. The current runtime already implements core A2A branches in [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts):
   - ecology-weighted speaker selection
   - divine/manual-tree adoration routing
   - memory cue stitching
   - relation gain updates
   - epic/trending history entries

3. The current relationship gates already exist in [src/lib/treeSociety.ts](../../../src/lib/treeSociety.ts):
   - adult threshold: energy >= 45
   - friend threshold: intimacy >= 65 or explicit friend link
   - blood-related detection across parents/ancestors

4. Current divine semantics must be preserved:
   - manual trees are divine-equivalent for epic/adoration routing
   - do not split “手绘树” and “神启树” into separate channels unless explicitly requested

5. The current UI already understands three message channels in [src/components/chat-panel/useChatPanelState.ts](../../../src/components/chat-panel/useChatPanelState.ts):
   - a2a
   - u2a
   - epic

## Procedure

### Step 1: Map The End-to-End Social Pipeline

Before changing anything, trace the full path:

1. Scheduler and turn-taking: [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts)
2. Relationship and memory rules: [src/lib/treeSociety.ts](../../../src/lib/treeSociety.ts)
3. Shared state mutations: [src/stores/useForestStore.ts](../../../src/stores/useForestStore.ts)
4. Scene link effects: [src/components/AgentLink.tsx](../../../src/components/AgentLink.tsx)
5. Right panel grouping and message rendering: [src/components/ChatPanel.tsx](../../../src/components/ChatPanel.tsx)

Do not redesign one stage in isolation. A2A in this repo is a pipeline, not a single function.

### Step 2: Model Social Frequency From Ecology + Distance + Persona

Use ecology as the base driver of who gets to speak.

Implementation anchors:

- `getWorldEcologySocialMood()` and `getWorldEcologyZone()` from [src/lib/worldEcology.ts](../../../src/lib/worldEcology.ts)
- `neighbors` resolution in [src/stores/useForestStore.ts](../../../src/stores/useForestStore.ts)
- starter/receiver weighting in [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts)

Default rule set for this workspace:

1. Candidate starter trees must be `IDLE`, have neighbors, and pass speaking cooldown.
2. Starter weight = ecology conversation weight × personality talk rate × chatterbox bonus.
3. Receiver weight = nearby target ecology conversation weight.
4. If a manual/divine tree is idle, nearby trees may bypass normal routing and enter adoration flow.
5. Cross-zone chats are allowed and should generate bridge-style wording, not be treated as invalid.

When extending frequency logic, preserve these behaviors:

- 活泼 / 顽皮 / 调皮 speak more often.
- 社恐 speaks much less often and should be cooldown-limited.
- divine/manual trees distort nearby social gravity.

### Step 3: Apply Personality-Driven Interaction Strategy

Personality is not just voice; it also affects initiative.

Required behaviors:

1. Lively trees can proactively approach shy trees more often than the reverse.
2. Divine/manual trees trigger “朝拜 / 关注” routing for nearby normal trees.
3. Chatterbox trees may produce longer messages and shorter cooldowns.
4. Socially anxious trees should keep short replies and avoid flood-style output.

Repository anchors:

- `PERSONALITY_TALK_RATE`, cooldown, and compacting rules in [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts)
- persona language material in [src/constants/personaMatrix.ts](../../../src/constants/personaMatrix.ts)
- tone resolution in [src/constants/dialogueLibrary.ts](../../../src/constants/dialogueLibrary.ts)

### Step 4: Memory First, Randomness Second

When generating a new line, check memory before inventing new content.

Required order:

1. Check recent same-pair conversation echo text.
2. Check receiver memory via `resolveMemoryCue()`.
3. If there is a continuation/familiar cue, inject it ahead of the newly generated message.
4. Only then fall back to base social chat generation.

Current repository thresholds to preserve:

- continuation window: 5 minutes
- familiar decay window: 30 minutes
- memory retention also decays with distance

Implementation anchors:

- `resolveMemoryCue()` in [src/lib/treeSociety.ts](../../../src/lib/treeSociety.ts)
- `recordDialogueMemory()` and `setMemoryRecallingFor()` in [src/stores/useForestStore.ts](../../../src/stores/useForestStore.ts)
- pair echo relay in [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts)

Quality rule:

- If memory exists, produce an echo/continuation line first. Do not let the system jump to a random unrelated joke unless retention checks fail.

### Step 5: Update Intimacy And Promote Relationship Tone

Each interaction should move the relationship graph.

Current repo rule set:

1. Relation gain per turn:
   - partner: +4
   - friend: +3
   - family: +2
   - stranger: +1
2. Friend tone can come from explicit friend link or intimacy >= 65.
3. Partner confession gate currently requires:
   - intimacy >= 90
   - both trees adult
   - not blood-related
   - neither tree already partnered elsewhere

Implementation anchors:

- `changeIntimacy()` and `setPartner()` in [src/stores/useForestStore.ts](../../../src/stores/useForestStore.ts)
- `getRelationType()`, `isAdult()`, and `areBloodRelated()` in [src/lib/treeSociety.ts](../../../src/lib/treeSociety.ts)

When changing thresholds, update all three layers together:

1. Dialogue generation tone
2. Store mutation and relationship graph
3. UI chips / profile timeline wording

### Step 6: Enforce Kinship-Safe Pairing And Breeding Gates

This repo already treats social simulation and breeding as connected systems.

Required rules:

1. Never allow near-kin romantic or breeding progression.
2. Only adult trees may enter breeding/partner-confirmation logic.
3. Breeding or “繁育幼苗” special decree must require compatible partner state, not just proximity.
4. If the pair is family, the tone may become warm/familiar but must never drift into partner scripting.

Default compatibility model for this workspace:

1. Compatibility is only evaluated after these hard gates pass:
   - both trees are adult
   - not blood-related
   - neither side is locked to another partner
2. Then compute a compatibility score from 0 to 100:
   - intimacy score: 40% weight
   - ecology affinity: 20% weight
   - personality complement or resonance: 20% weight
   - memory continuity depth: 10% weight
   - recent positive engagement signal: 10% weight
3. Suggested default threshold:
   - `>= 70`: eligible for partner confirmation / breeding decree
   - `55-69`: can produce ambiguous romantic tension but not breeding
   - `< 55`: remain social-only

Suggested implementation shape:

```ts
type CompatibilityBreakdown = {
  intimacy: number;
  ecologyAffinity: number;
  personalityFit: number;
  memoryDepth: number;
  engagement: number;
  total: number;
};
```

Keep the score explainable. Avoid opaque randomness for relationship escalation.

Repository anchors:

- blood relation traversal in [src/lib/treeSociety.ts](../../../src/lib/treeSociety.ts)
- auto-breeding hooks in [src/hooks/useAutoPlanting.ts](../../../src/hooks/useAutoPlanting.ts)
- partner/family/friend state on [src/types/forest.ts](../../../src/types/forest.ts)

### Step 7: Sync Scene Effects With Chat Panel

An A2A event is complete only when both the scene and the panel react.

Scene requirements:

1. Active chat creates a visible energy line between speaking trees.
2. Divine/manual-tree adoration creates devotion links.
3. Memory recall events create temporary memory-colored links.

Panel requirements:

1. The same event must be inserted into chat history.
2. Message channel must resolve correctly: `a2a`, `u2a`, or `epic`.
3. Right-side panel must keep time grouping and relation chip rendering intact.
4. A2A cards should surface speaker persona and relation tags.

Implementation anchors:

- scene effect rendering: [src/components/AgentLink.tsx](../../../src/components/AgentLink.tsx)
- chat history insertion: [src/stores/useForestStore.ts](../../../src/stores/useForestStore.ts)
- time grouping: [src/components/chat-panel/ChatTimeGroup.tsx](../../../src/components/chat-panel/ChatTimeGroup.tsx)
- A2A message card metadata: [src/components/chat-panel/ChatMessageItem.tsx](../../../src/components/chat-panel/ChatMessageItem.tsx)

### Step 8: Detect Epic / Trending Nodes

This workspace already distinguishes “epic” from normal A2A.

Current behavior to preserve unless intentionally changed:

1. If a divine/manual tree is involved, the event remains eligible for `type: 'epic'`.
2. Manual trees remain divine-equivalent; do not downgrade them to ordinary social chatter.
3. Epic entries should render with a dedicated announcement-like card in the chat panel.
4. Trending/engagement state should remain compatible with tree profile timeline persistence.

Composite hot-score rule for this workspace:

1. Build a social heat score per event:
    - likes contribution: 0-30
    - comments contribution: 0-20
    - cross-zone spread bonus: 0 or 15
    - intimacy jump bonus: 0-20
    - divine/manual participation bonus: 0 or 15
2. Recommended classification:
    - `>= 70`: epic + trending
    - `45-69`: trending only
    - `< 45`: normal social log
3. Cross-zone spread should trigger when speaker and listener belong to different ecology zones.
4. Intimacy jump bonus should trigger on meaningful leaps, for example:
    - stranger -> friend threshold crossing
    - friend -> partner threshold crossing
    - compatibility score entering breeding-eligible range

Suggested event classifier:

```ts
function classifySocialEvent(input: {
   likes: number;
   comments: number;
   crossZone: boolean;
   intimacyBefore: number;
   intimacyAfter: number;
   compatibilityBefore?: number;
   compatibilityAfter?: number;
   hasDivineTree: boolean;
}) {
   const likesScore = Math.min(30, input.likes * 3);
   const commentsScore = Math.min(20, input.comments * 4);
   const crossZoneScore = input.crossZone ? 15 : 0;
   const intimacyScore = input.intimacyAfter >= 90
      || (input.intimacyBefore < 65 && input.intimacyAfter >= 65)
      || ((input.compatibilityBefore ?? 0) < 70 && (input.compatibilityAfter ?? 0) >= 70)
         ? 20
         : Math.max(0, Math.min(20, input.intimacyAfter - input.intimacyBefore));
   const divineScore = input.hasDivineTree ? 15 : 0;
   const heat = likesScore + commentsScore + crossZoneScore + intimacyScore + divineScore;

   return {
      heat,
      isTrending: heat >= 45,
      type: heat >= 70 ? 'epic' : 'chat',
   };
}
```

Implementation anchors:

- epic/trending insertion in [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts)
- epic card rendering in [src/components/chat-panel/ChatMessageItem.tsx](../../../src/components/chat-panel/ChatMessageItem.tsx)
- downstream timeline persistence in [src/lib/treeProfileRepository.ts](../../../src/lib/treeProfileRepository.ts)

If you add a new “hot search” layer, define it explicitly:

- entry condition
- visual style
- persistence rule
- interaction with existing `epic` channel

In this workspace, `isTrending` and `type: 'epic'` are related but not identical:

- `isTrending` = social heat is high enough to surface broadly
- `type: 'epic'` = high-ceremony event that deserves epic card treatment

### Step 9: Constrain Text Length And Append Ecology Tail Lines

Dialogue should feel alive, not noisy.

Required rules:

1. Append ecology tail phrases from the current zone when appropriate.
2. If trees are from different ecology zones, use cross-zone bridge lines instead of local tail phrases.
3. Prevent meaningless repetition and strip `undefined/null` text artifacts.
4. Dynamically constrain message length:
   - 社恐: extremely short, default max around 5 chars in compact mode
   - 普通: around 50 chars
   - 话痨 / 活泼 / 顽皮: can expand to ~200 chars

Implementation anchors:

- message sanitation and compaction in [src/hooks/useAgentA2A.ts](../../../src/hooks/useAgentA2A.ts)
- ecology phrase tails in [src/lib/worldEcology.ts](../../../src/lib/worldEcology.ts)
- social chat generation in [src/lib/treeSociety.ts](../../../src/lib/treeSociety.ts)

### Step 10: Validate Across Runtime, UI, And Persistence

Minimum completion checks:

1. Runtime:
   - speaker cooldown still works
   - memory-first reply path still works
   - intimacy increments match intended thresholds
   - partner gate cannot be triggered by blood relatives

2. UI:
   - active chat draws scene links
   - memory recall draws recall links
   - A2A entries appear in chat panel with correct channel and relation chips
   - epic entries render in epic style rather than normal bubble style

3. Persistence / profile surfaces:
   - trending/engagement-compatible fields remain intact
   - relationship timeline still reflects intimacy and partner updates

## Anti-Patterns To Avoid

- Removing memory checks and replacing them with pure random dialogue.
- Updating intimacy without updating visible relation tags or partner state.
- Allowing partner/breeding logic to bypass blood-related checks.
- Treating every manual-tree interaction as ordinary `a2a` instead of `epic` when divine/manual semantics are intended.
- Adding new social heat concepts without defining how they map to `type` and `isTrending`.
- Changing scheduler weights without retesting scene-link cadence and panel message density.
- Letting ecology tails or meme endings overwhelm the actual narrative content.

## Success Criteria

✅ Chat frequency reflects ecology weight, distance, and persona initiative.
✅ 社恐 / 普通 / 话痨 message lengths visibly differ and remain readable.
✅ Memory-rich pairs continue old topics before generating fresh randomness.
✅ Intimacy changes cause believable tone changes across stranger/friend/partner/family.
✅ Near-kin pairs never enter romance/breeding progression.
✅ Breeding / partner escalation only happens after an explicit compatibility score clears the configured threshold.
✅ Active A2A events create both scene links and chat-panel entries.
✅ Hand-drawn/manual trees continue to behave as divine-equivalent trees for epic/adoration logic.
✅ Epic/trending classification uses a composite score rather than a single hard-coded flag.
✅ Divine/manual-tree conversations render as epic cards and remain compatible with trending/profile systems.
✅ Ecology tails feel zone-aware and do not create spammy repetition.

## Example Prompts

- 优化树木 A2A 逻辑，让活泼树更容易主动找社恐树聊天，但不要打爆聊天面板。
- 给森林社交加上记忆续聊：如果 5 分钟内聊过同一话题，就先说 Echo Text。
- 调整亲密度阈值，让朋友更容易形成，但仍然禁止近亲进入伴侣关系。
- 把神启树附近的自动朝拜对话强化成 Epic 节点，并同步到右侧聊天面板。
- 生成一套社交日志规则，让跨生态区聊天会带上不同的尾句。
- 给繁育系统增加伴侣匹配度公式，只有高兼容度树对才能触发繁育幼苗诏令。
- 重写热搜判定：综合 likes、comments、跨生态区传播和亲密度跃迁来决定是否上 Epic 卡。

## Related Customizations To Create Next

1. SecondMe A2A Bridge Skill: if tree-to-tree dialogue moves from local rules to remote LLM orchestration.
2. Relationship Timeline Skill: if TreeProfile timeline becomes the primary storytelling surface.
3. Social Analytics Skill: if you want deterministic trending, heat scores, and dashboard metrics.
4. Breeding Policy Skill: if reproduction logic needs its own explicit gene, kinship, and lifecycle constraints.