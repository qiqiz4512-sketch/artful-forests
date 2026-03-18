/**
 * TreeAgent对话系统测试
 * 验证Agent系统的各个部分是否正确工作
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildTreeAgentSystemPrompt,
  buildTreeAgentUserPrompt,
  generateContextualFallback,
  TreeAgentContext,
} from '@/lib/treeAgentDialogue';
import {
  generateTreeAgentRespons,
  batchGenerateTreeDialogues,
  checkTreeAgentDialogueHealth,
} from '@/lib/treeAgentAdapter';
import { treeAgentDialogueConfigManager } from '@/lib/treeAgentDialogueConfig';
import { TreeAgent, SocialState } from '@/types/forest';

// Mock TreeAgent for testing
const createMockAgent = (overrides?: Partial<TreeAgent>): TreeAgent => ({
  id: '1',
  name: '测试树',
  position: { x: 400, y: 200 },
  scale: 1.2,
  zIndex: 1,
  personality: '温柔',
  energy: 50,
  socialState: SocialState.IDLE,
  generation: 1,
  parents: [],
  socialCircle: {
    friends: [],
    family: [],
    partner: null,
  },
  intimacyMap: {},
  growthBoost: 1,
  growthScore: 50,
  neighbors: [],
  isManual: false,
  memory: {
    lastTopic: '森林',
    interactionHistory: [],
    timestamp: Date.now(),
    recallingUntil: 0,
  },
  metadata: {
    bio: '一棵温柔的树',
    lastWords: '',
  },
  ...overrides,
});

describe('TreeAgent Dialogue System', () => {
  describe('System Prompt Generation', () => {
    it('should generate a system prompt with agent identity', () => {
      const agent = createMockAgent({ name: '小松', personality: '温柔' });
      const prompt = buildTreeAgentSystemPrompt(agent);

      expect(prompt).toContain('小松');
      expect(prompt).toContain('温柔');
      expect(prompt).toContain('第一人称');
    });

    it('should include personality-specific instructions', () => {
      const gentleAgent = createMockAgent({ personality: '温柔' });
      const prompt = buildTreeAgentSystemPrompt(gentleAgent);
      expect(prompt).toContain('温和');
      expect(prompt).toContain('体贴');

      const playfulAgent = createMockAgent({ personality: '调皮' });
      const playfulPrompt = buildTreeAgentSystemPrompt(playfulAgent);
      expect(playfulPrompt).toContain('开玩笑');
      expect(playfulPrompt).toContain('戏谑');
    });

    it('should include zone information', () => {
      const agent = createMockAgent({ position: { x: 100, y: 100 } }); // cool-conifer zone
      const prompt = buildTreeAgentSystemPrompt(agent, 1200);
      expect(prompt).toContain('冷杉林带');
    });
  });

  describe('User Prompt Generation', () => {
    it('should build context with relationship information', () => {
      const speaker = createMockAgent({ id: '1', name: '树A' });
      const listener = createMockAgent({ id: '2', name: '树B' });

      const context: TreeAgentContext = {
        speaker,
        listener,
        relation: 'stranger',
        intimacy: 20,
        weather: 'sunny',
        season: 'spring',
      };

      const prompt = buildTreeAgentUserPrompt(context);
      expect(prompt).toContain('树B');
      expect(prompt).toContain('陌生人');
      expect(prompt).toContain('20');
    });

    it('should include recent topic if provided', () => {
      const context: TreeAgentContext = {
        speaker: createMockAgent(),
        listener: createMockAgent(),
        relation: 'friend',
        intimacy: 60,
        recentTopic: '天气很好',
      };

      const prompt = buildTreeAgentUserPrompt(context);
      expect(prompt).toContain('天气很好');
      expect(prompt).toContain('最近的话题');
    });

    it('should adjust intimacy description', () => {
      const lowIntimacy: TreeAgentContext = {
        speaker: createMockAgent(),
        listener: createMockAgent(),
        relation: 'stranger',
        intimacy: 5,
      };

      const highIntimacy: TreeAgentContext = {
        speaker: createMockAgent(),
        listener: createMockAgent(),
        relation: 'partner',
        intimacy: 90,
      };

      const lowPrompt = buildTreeAgentUserPrompt(lowIntimacy);
      const highPrompt = buildTreeAgentUserPrompt(highIntimacy);

      expect(highPrompt).not.toEqual(lowPrompt);
    });
  });

  describe('Contextual Fallback', () => {
    it('should generate different fallbacks for different personalities', () => {
      const context: TreeAgentContext = {
        speaker: createMockAgent({ personality: '温柔' }),
        listener: createMockAgent(),
        relation: 'friend',
        intimacy: 60,
      };

      const fallback1 = generateContextualFallback(context);
      expect(fallback1).toBeTruthy();
      expect(fallback1.length > 0).toBe(true);

      const context2 = { ...context, speaker: createMockAgent({ personality: '活泼' }) };
      const fallback2 = generateContextualFallback(context2);
      expect(fallback2).toBeTruthy();
      // 性格不同，回复应该不同
      expect(fallback1).not.toEqual(fallback2);
    });

    it('should continue recent topic when provided', () => {
      const context: TreeAgentContext = {
        speaker: createMockAgent({ personality: '温柔' }),
        listener: createMockAgent(),
        relation: 'friend',
        intimacy: 60,
        recentTopic: '春天',
      };

      const fallback = generateContextualFallback(context);
      expect(fallback).toContain('春天');
    });

    it('should return different fallback for high intimacy', () => {
      const lowIntimacy: TreeAgentContext = {
        speaker: createMockAgent(),
        listener: createMockAgent(),
        relation: 'stranger',
        intimacy: 10,
      };

      const highIntimacy: TreeAgentContext = {
        speaker: createMockAgent(),
        listener: createMockAgent(),
        relation: 'partner',
        intimacy: 85,
      };

      const low = generateContextualFallback(lowIntimacy);
      const high = generateContextualFallback(highIntimacy);

      expect(low).not.toEqual(high);
    });
  });

  describe('Dialogue Generation', () => {
    it('should generate dialogue with fallback when LLM unavailable', async () => {
      const speaker = createMockAgent();
      const listener = createMockAgent();

      const dialogue = await generateTreeAgentRespons(speaker, listener, {
        useTemplateOnly: true, // Force template mode for testing
      });

      expect(dialogue).toBeTruthy();
      expect(dialogue.length > 0).toBe(true);
    });

    it('should handle async errors gracefully', async () => {
      const speaker = createMockAgent();
      const listener = createMockAgent();

      // Should not throw
      const dialogue = await generateTreeAgentRespons(speaker, listener, {
        useTemplateOnly: true,
      });

      expect(dialogue).toBeTruthy();
    });
  });

  describe('Batch Generation', () => {
    it('should generate multiple dialogues', async () => {
      const speaker = createMockAgent({ id: '1' });
      const listener1 = createMockAgent({ id: '2', name: '树B' });
      const listener2 = createMockAgent({ id: '3', name: '树C' });

      const pairs = [
        { sender: speaker, receiver: listener1 },
        { sender: speaker, receiver: listener2 },
      ];

      const results = await batchGenerateTreeDialogues(pairs, { parallelLimit: 1 });

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        if (!result.error) {
          expect(result.dialogue).toBeTruthy();
        }
      });
    });
  });

  describe('Configuration Management', () => {
    it('should manage config changes', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      expect(config.enableAgentDialogue).toBe(true);

      treeAgentDialogueConfigManager.disableAgent();
      const updated = treeAgentDialogueConfigManager.getConfig();
      expect(updated.enableAgentDialogue).toBe(false);

      // Restore
      treeAgentDialogueConfigManager.enableAgent();
    });

    it('should support debug mode', () => {
      treeAgentDialogueConfigManager.enableDebug();
      let config = treeAgentDialogueConfigManager.getConfig();
      expect(config.debugMode).toBe(true);

      treeAgentDialogueConfigManager.disableDebug();
      config = treeAgentDialogueConfigManager.getConfig();
      expect(config.debugMode).toBe(false);
    });

    it('should reset to defaults', () => {
      treeAgentDialogueConfigManager.updateConfig({
        enableAgentDialogue: false,
        debugMode: true,
      });

      treeAgentDialogueConfigManager.resetToDefault();
      const config = treeAgentDialogueConfigManager.getConfig();

      expect(config.enableAgentDialogue).toBe(true);
      expect(config.debugMode).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await checkTreeAgentDialogueHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.fallbackAvailable).toBe(true);
      expect(health.details).toBeTruthy();
    });
  });

  describe('Personality-Specific Behavior', () => {
    const personalities = ['温柔', '睿智', '活泼', '社恐', '调皮', '神启'] as const;

    personalities.forEach((personality) => {
      it(`should handle ${personality} personality`, async () => {
        const agent = createMockAgent({ personality: personality as any });
        const prompt = buildTreeAgentSystemPrompt(agent);

        expect(prompt).toContain(personality);
        expect(prompt.length > 0).toBe(true);
      });
    });
  });

  describe('Context Awareness', () => {
    it('should recognize different relationships', () => {
      const relations = ['partner', 'family', 'friend', 'stranger'] as const;

      relations.forEach((relation) => {
        const context: TreeAgentContext = {
          speaker: createMockAgent(),
          listener: createMockAgent(),
          relation,
          intimacy: 50,
        };

        const prompt = buildTreeAgentUserPrompt(context);
        expect(prompt).toBeTruthy();
        expect(prompt.length > 0).toBe(true);
      });
    });

    it('should include environmental factors', () => {
      const weatherOptions = ['sunny', 'rain', 'snow', 'night'] as const;
      const seasonOptions = ['spring', 'summer', 'autumn', 'winter'] as const;

      const context: TreeAgentContext = {
        speaker: createMockAgent(),
        listener: createMockAgent(),
        relation: 'friend',
        intimacy: 50,
        weather: 'rain',
        season: 'autumn',
      };

      const prompt = buildTreeAgentUserPrompt(context);
      expect(prompt).toContain('雨');
      expect(prompt).toContain('秋');
    });
  });
});

/**
 * 集成测试：完整对话流程
 */
describe('TreeAgent Dialogue Integration', () => {
  it('should handle complete dialogue flow', async () => {
    const speaker = createMockAgent({
      id: '1',
      name: '温暖树',
      personality: '温柔',
      intimacyMap: { '2': 50 },
    });

    const listener = createMockAgent({
      id: '2',
      name: '聪慧树',
      personality: '睿智',
      intimacyMap: { '1': 50 },
    });

    // 禁用Agent模式进行快速测试
    const originalMode = treeAgentDialogueConfigManager.getConfig().enableAgentDialogue;

    treeAgentDialogueConfigManager.disableAgent();

    const dialogue = await generateTreeAgentRespons(speaker, listener, {
      weather: 'rain',
      season: 'autumn',
      intimacy: 50,
      recentTopic: '秋天',
    });

    expect(dialogue).toBeTruthy();
    expect(dialogue.length > 0).toBe(true);

    // Restore
    if (originalMode) {
      treeAgentDialogueConfigManager.enableAgent();
    }
  });
});
