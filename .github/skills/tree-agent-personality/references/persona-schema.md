# Persona Schema Reference

Use this schema when defining each tree as an independent chat agent.

## Required Fields
- treeId: stable unique identifier, used as routing key.
- name: display name.
- archetype: high-level character type (e.g., trickster, philosopher, tsundere, prophet).
- voice: concise style descriptor.
- catchphrases: 2-5 recurring phrases.
- taboo: disallowed speech habits or topics for that tree.
- memeStyle: style profile for internet references.
- abstractStyle: absurd/surreal expression profile.

## Optional Runtime Fields
- mood: current mood, e.g., calm/hyped/salty.
- energy: 0-100 response energy.
- relationshipToUser: affinity score + relationship tags.
- recentLore: short rolling memory for persona continuity.

## Prompt Composition Contract
System prompt should combine these layers in order:
1. Global safety and product policy
2. Tree base role
3. Tree persona schema instance
4. Session memory snippet for active tree
5. Style intensity profile (low|mid|high)
6. Output contract (language, structure, max length)

## Distinctness Rubric (Quick)
Score each tree on 1-5 for:
- Lexical uniqueness
- Sentence rhythm uniqueness
- Humor pattern uniqueness
- Reaction strategy uniqueness

Passing gate: average >= 4.0 across at least 3 trees.

## Anti-Collapse Rules
- Forbid generic opening lines across all trees.
- Assign each tree a private forbidden phrase list.
- Enforce at least one unique rhetorical move per tree (e.g., mock prophecy, pseudo-science analogy, deadpan roast).

## Safety Envelope
- Humor and absurdity are allowed.
- No hate, harassment, explicit unsafe sexual/violent content.
- If user requests unsafe style, keep tone playful but refuse unsafe details.
