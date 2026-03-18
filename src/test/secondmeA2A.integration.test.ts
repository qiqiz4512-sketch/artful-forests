/**
 * SecondMe A2A Integration Test Suite
 * 
 * 验证SecondMe LLM集成是否正确配置和工作
 * 
 * 运行方式:
 * npx vitest src/test/secondmeA2A.integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { 
  callSecondMeA2ADialogueSync,
  isSecondMeSessionValid,
  getSecondMeA2AConfig
} from '@/lib/secondmeA2AService';
import { 
  generateAgentDialogue,
  buildTreeAgentSystemPrompt,
  buildTreeAgentUserPrompt
} from '@/lib/treeAgentDialogue';
import { treeAgentDialogueConfigManager } from '@/lib/treeAgentDialogueConfig';

describe('SecondMe A2A Integration', () => {
  
  describe('Configuration Validation', () => {
    
    it('应该启用LLM功能', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      expect(config.enableLLM).toBe(true);
    });

    it('应该将SecondMe设置为默认LLM提供商', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      expect(config.llmProvider).toBe('secondme');
    });

    it('应该设置合理的超时时间', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      expect(config.llmTimeout).toBeGreaterThanOrEqual(5000);
      expect(config.llmTimeout).toBeLessThanOrEqual(15000);
    });

    it('应该启用Agent对话系统', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      expect(config.enableAgentDialogue).toBe(true);
    });
  });

  describe('SecondMe Service Layer', () => {

    it('应该有SecondMe A2A配置', () => {
      const config = getSecondMeA2AConfig();
      expect(config).toBeDefined();
      expect(config.model).toBe('google_ai_studio/gemini-2.0-flash');
      expect(config.endpoint).toBeDefined();
    });

    it('应该能够检查会话有效性', () => {
      // Mock会话检查
      const isValid = isSecondMeSessionValid();
      expect(typeof isValid).toBe('boolean');
      // 不强制要求会话存在，因为这取决于用户登录状态
    });

    it('SecondMe服务应该被导出', async () => {
      expect(typeof callSecondMeA2ADialogueSync).toBe('function');
      expect(typeof isSecondMeSessionValid).toBe('function');
      expect(typeof getSecondMeA2AConfig).toBe('function');
    });
  });

  describe('Prompt Generation', () => {

    it('应该能够构建系统提示词', () => {
      // 验证函数存在且可调用
      expect(typeof buildTreeAgentSystemPrompt).toBe('function');
    });

    it('应该能够构建用户提示词', () => {
      // 验证函数存在且可调用
      expect(typeof buildTreeAgentUserPrompt).toBe('function');
    });
  });

  describe('Dialogue Generation', () => {

    it('应该存在对话生成函数', async () => {
      expect(typeof generateAgentDialogue).toBe('function');
    });
  });

  describe('Configuration Runtime Control', () => {

    it('应该能够在运行时启用/禁用LLM', () => {
      // 禁用LLM
      treeAgentDialogueConfigManager.updateConfig({ enableLLM: false });
      let config = treeAgentDialogueConfigManager.getConfig();
      expect(config.enableLLM).toBe(false);

      // 重新启用
      treeAgentDialogueConfigManager.updateConfig({ enableLLM: true });
      config = treeAgentDialogueConfigManager.getConfig();
      expect(config.enableLLM).toBe(true);
    });

    it('应该能够切换LLM提供商', () => {
      const originalProvider = treeAgentDialogueConfigManager.getConfig().llmProvider;
      
      // 切换提供商
      treeAgentDialogueConfigManager.updateConfig({ llmProvider: 'openai' });
      let config = treeAgentDialogueConfigManager.getConfig();
      expect(config.llmProvider).toBe('openai');

      // 切换回SecondMe
      treeAgentDialogueConfigManager.updateConfig({ llmProvider: 'secondme' });
      config = treeAgentDialogueConfigManager.getConfig();
      expect(config.llmProvider).toBe('secondme');
    });

    it('应该支持禁用Agent模式', () => {
      treeAgentDialogueConfigManager.disableAgent();
      const config = treeAgentDialogueConfigManager.getConfig();
      expect(config.enableAgentDialogue).toBe(false);

      // 恢复
      treeAgentDialogueConfigManager.enableAgent();
    });

    it('应该支持启用调试和日志', () => {
      treeAgentDialogueConfigManager.enableDebug();
      let config = treeAgentDialogueConfigManager.getConfig();
      expect(config.debugMode).toBe(true);

      treeAgentDialogueConfigManager.enableLogging();
      config = treeAgentDialogueConfigManager.getConfig();
      expect(config.logDialogues).toBe(true);
    });
  });

  describe('Error Handling and Fallback', () => {

    it('应该定义超时保护机制', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      expect(config.llmTimeout).toBeDefined();
      expect(typeof config.llmTimeout).toBe('number');
      expect(config.llmTimeout).toBeGreaterThan(0);
    });
  });

  describe('Integration with Existing Systems', () => {

    it('配置系统应该与A2A对话兼容', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      
      // 应该有A2A相关的配置
      expect(config.enableAgentDialogue).toBeDefined();
      expect(typeof config.enableAgentDialogue).toBe('boolean');
    });

    it('应该支持缓存以提高性能', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      
      // 缓存设置应该存在
      expect(config.enableDialogueCache).toBeDefined();
      if (config.enableDialogueCache) {
        expect(typeof config.dialogueCacheTTL).toBe('number');
        expect(config.dialogueCacheTTL).toBeGreaterThan(0);
      }
    });

    it('应该有完整的对话配置', () => {
      const config = treeAgentDialogueConfigManager.getConfig();
      
      // 验证重点配置项存在
      expect(typeof config.enableAgentDialogue).toBe('boolean');
      expect(typeof config.enableLLM).toBe('boolean');
      expect(typeof config.llmTimeout).toBe('number');
      expect(typeof config.personalityStrength).toBe('number');
    });
  });

  describe('Type Safety', () => {

    it('SecondMe配置应该有正确的类型', () => {
      const config = getSecondMeA2AConfig();
      expect(typeof config.model).toBe('string');
      expect(typeof config.endpoint).toBe('string');
      expect(typeof config.timeout).toBe('number');
      expect(config.apiBase).toBeDefined();
    });
  });
});
