---
name: tree-agent-personality
description: 'Build and iterate a tree-as-agent conversation system. Use when implementing per-tree persona chat, meme-style dialogue, absurd/funny tone control, and identity-linked prompts in this forest app. Keywords: tree agent, persona, dialogue, meme, abstract, roleplay, in-character, a2a, secondme.'
argument-hint: 'Goal, target files, meme intensity (default high), and whether to persist to Supabase.'
user-invocable: true
---

# Tree Agent Personality System

## What This Skill Produces
This skill guides implementation of a multi-agent tree chat experience where each tree has a distinct personality, speech style, and meme/absurd flavor while remaining coherent, safe, and testable.

Primary references:
- Persona schema: [persona-schema](./references/persona-schema.md)
- Example persona seeds: [tree-personas.zh-CN.example](./assets/tree-personas.zh-CN.example.json)

Output expectations:
- Every tree can be treated as an independent chat agent with stable identity.
- Persona differences are obvious in tone, catchphrases, and reaction style.
- Dialogue supports internet meme flavor and abstract humor with configurable intensity.
- State and identity flow are wired so conversation context follows the selected tree.

## Default Profile For This Workspace
- Scope: workspace-shared skill (checked into repository).
- Language style: Chinese internet-native tone with occasional English meme tokens.
- Meme intensity default: `high`.
- Persistence default: local state first; no mandatory Supabase/SecondMe persistence.

## When to Use
Use this skill when prompts include:
- "每棵树都是一个 agent"
- "每棵树性格不同"
- "加入梗/抽象/搞笑对话"
- "树人格设定、提示词、对话系统"
- "SecondMe/A2A/多智能体聊天" integration

## Inputs To Collect First
1. Scope:
- Feature prototype only, or production-ready with persistence and permissions.
2. Runtime path:
- Local mock personas only, or backend/Supabase/SecondMe connected.
3. Tone policy:
- Meme intensity (`low|mid|high`, default `high`) and banned styles/phrases.
4. Acceptance rules:
- What counts as "personality is distinct" and "funny enough".

## Procedure
1. Map current architecture.
- Locate tree identity sources, chat UI state, and message transport.
- Confirm where per-tree metadata can be attached.
- Check existing persona/dialogue constants before creating new schemas.

2. Define persona schema.
- Create or extend a tree persona model with at least:
  - `treeId`, `name`, `archetype`, `voice`, `taboo`, `memeStyle`, `abstractStyle`, `catchphrases`.
- Add optional dynamic fields:
  - `mood`, `energy`, `relationshipToUser`, `recentLore`.
- Keep persona data separable from UI rendering logic.

3. Build prompt composition strategy.
- Compose system prompt from:
  - base role + tree persona + session memory + meme intensity profile.
- Add tone guardrails:
  - humorous and surreal is allowed; harassment, hate, and explicit unsafe content is blocked.
- Add anti-collapse checks:
  - avoid every tree sounding identical by enforcing per-tree lexical and rhetorical constraints.

4. Implement tree-scoped dialogue state.
- Route chat by `activeTreeId`.
- Maintain independent short-term memory per tree.
- Ensure switching trees does not leak private thread context unless explicitly shared.

5. Add meme/abstract style controls.
- Implement configurable style layer:
  - `low`: light references, mostly normal conversation.
  - `mid`: recognizable internet tone + playful metaphors.
  - `high` (workspace default): stronger absurdism and punchline density with coherence fallback.
- Add fallback behavior when model drifts:
  - if nonsense probability is too high, auto-step down one level.

6. Integrate transport layer.
- For local mode: deterministic mock responder for development.
- For remote mode: connect to existing A2A/SecondMe hooks/services.
- Preserve a consistent message contract across modes.

7. Validate with scenario tests.
- Prepare test prompts for at least 3 distinct trees.
- Verify:
  - persona separability,
  - humor quality,
  - context isolation,
  - error handling when backend is unavailable.

8. Ship with observability.
- Add lightweight logs/metrics:
  - persona selected, response latency, fallback count, moderation/failure events.
- Ensure no sensitive tokens/personally identifying data leak into client logs.

## Quick Kickoff Command Shape
When invoking this skill, include:
- Goal summary (1 sentence)
- Target files/components
- Tree count and tree IDs
- Meme intensity (default high)
- Local-only or backend-connected mode

Example invocation payload (natural language):
- "Implement 3 tree agents in ChatPanel and store, use pine_guard_01/ginkgo_oracle_02/willow_drifter_03, high meme intensity, local-only mode, add persona distinctness tests."

## Decision Points And Branching
- If no backend is required:
  - prioritize local persona engine + deterministic fixtures for rapid iteration (workspace default).
- If backend identity sync is required:
  - enforce identity ownership checks and consent scopes before message export/import.
- If meme style hurts clarity:
  - reduce intensity, keep persona voice markers, and preserve user intent first.
- If multiple trees converge in tone:
  - tighten persona constraints (word bank, sentence rhythm, taboo list).

## Language And Tone Rules
- Keep responses primarily in Chinese internet vernacular.
- Allow sparse English meme words (for example: "bro", "meta", "NPC", "buff") only when they reinforce persona.
- "搞抽象" should remain understandable: each reply must still contain a clear semantic answer path.

## Quality Gates (Completion Checks)
1. Distinctness:
- Blind test with mixed replies can identify the tree speaker above chance.
2. Coherence:
- Replies stay on-topic while retaining persona voice.
3. Safety:
- Meme/abstract style never bypasses safety and moderation constraints.
4. Isolation:
- Tree A private context is not leaked to Tree B by default.
5. Resilience:
- On API failure, user gets graceful fallback, not broken UI.
6. Maintainability:
- Persona config is data-driven and easy to extend with new trees.

## Deliverables Checklist
- Persona schema and seed data
- Prompt composer with style controls
- Tree-scoped chat state/store updates
- UI controls for tree selection and style intensity
- Integration path (local and/or remote)
- Tests for persona distinctness and context isolation

## Suggested Prompt Patterns
- "Use tree-agent-personality: implement per-tree persona chat for selected tree IDs, meme intensity mid, local mode only."
- "Use tree-agent-personality: wire Supabase-backed tree identity and ensure context isolation across trees."
- "Use tree-agent-personality: refactor prompts so each tree has unique catchphrases and taboo topics."
