/**
 * 树木Agent对话系统配置
 * 管理Agent对话的全局设置和功能开关
 */

export interface TreeAgentDialogueConfig {
  /**
   * 是否启用Agent-based对话系统
   * true: 使用新的Agent系统（带LLM fallback到模板库）
   * false: 仅使用模板库
   * @default true
   */
  enableAgentDialogue: boolean;

  /**
   * 是否启用LLM集成
   * 需要配置API密钥才能工作
   * @default false (当前LLM集成还未实现)
   */
  enableLLM: boolean;

  /**
   * LLM API类型
   * @default 'openai'
   */
  llmProvider: 'openai' | 'anthropic' | 'secondme' | 'ollama' | 'together';

  /**
   * LLM模型选择
   */
  llmModel: {
    openai: string;
    anthropic: string;
    secondme: string;
    ollama: string;
    together: string;
  };

  /**
   * LLM调用的超时时间（毫秒）
   * @default 5000
   */
  llmTimeout: number;

  /**
   * 是否缓存对话结果
   * @default true
   */
  enableDialogueCache: boolean;

  /**
   * 对话缓存的TTL（毫秒）
   * @default 300000 (5分钟)
   */
  dialogueCacheTTL: number;

  /**
   * LLM温度参数（0-1，越高越随机）
   * @default 0.8
   */
  llmTemperature: number;

  /**
   * 最大对话长度（字符数）
   * 会根据性格进一步限制
   * @default 200
   */
  maxDialogueLength: number;

  /**
   * 调试模式：输出更多日志信息
   * @default false
   */
  debugMode: boolean;

  /**
   * 记录对话日志以供分析
   * @default false
   */
  logDialogues: boolean;

  /**
   * 对话日志最大条数
   * @default 1000
   */
  maxLogEntries: number;

  /**
   * 是否启用对话多样性增强
   * 增加随机性，避免重复对话
   * @default true
   */
  enableVariety: boolean;

  /**
   * 多样性检查窗口大小
   * 检查最近N条对话是否相似
   * @default 5
   */
  varietyCheckWindow: number;

  /**
   * Agent性格强度（0-1）
   * 越高则对话越符合设定性格
   * @default 0.85
   */
  personalityStrength: number;

  /**
   * 上下文感知强度（0-1）
   * 越高则对话越符合关系和环境
   * @default 0.75
   */
  contextStrength: number;

  /**
   * 启用特殊树（神启、手动树）的特殊对话规则
   * @default true
   */
  enableDivineTreeRules: boolean;

  /**
   * 启用话题记忆和延续
   * @default true
   */
  enableTopicMemory: boolean;

  /**
   * 启用亲密度对对话风格的影响
   * @default true
   */
  enableIntimacyInfluence: boolean;

  /**
   * 启用季节和天气对对话的影响
   * @default true
   */
  enableEnvironmentInfluence: boolean;
}

/**
 * 默认配置
 */
export const DEFAULT_TREE_AGENT_DIALOGUE_CONFIG: TreeAgentDialogueConfig = {
  enableAgentDialogue: true,
  enableLLM: true,
  llmProvider: 'ollama', // 本地优先，无需登录；如有 API Key 可改为 'openai'/'together'
  llmModel: {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-haiku-4-5',
    secondme: 'google_ai_studio/gemini-2.0-flash',
    ollama: 'qwen2.5:3b',
    together: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
  },
  llmTimeout: 10000,
  enableDialogueCache: true,
  dialogueCacheTTL: 5 * 60 * 1000,
  llmTemperature: 0.8,
  maxDialogueLength: 200,
  debugMode: false,
  logDialogues: false,
  maxLogEntries: 1000,
  enableVariety: true,
  varietyCheckWindow: 5,
  personalityStrength: 0.85,
  contextStrength: 0.75,
  enableDivineTreeRules: true,
  enableTopicMemory: true,
  enableIntimacyInfluence: true,
  enableEnvironmentInfluence: true,
};

/**
 * 全局配置状态
 */
class TreeAgentDialogueConfigManager {
  private config: TreeAgentDialogueConfig = { ...DEFAULT_TREE_AGENT_DIALOGUE_CONFIG };

  /**
   * 获取当前配置
   */
  getConfig(): TreeAgentDialogueConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<TreeAgentDialogueConfig>): void {
    this.config = { ...this.config, ...updates };
    if (this.config.debugMode) {
      console.log('[TreeAgentDialogue] Config updated:', this.config);
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_TREE_AGENT_DIALOGUE_CONFIG };
  }

  /**
   * 启用Agent模式
   */
  enableAgent(): void {
    this.updateConfig({ enableAgentDialogue: true });
  }

  /**
   * 禁用Agent模式（降级到模板库）
   */
  disableAgent(): void {
    this.updateConfig({ enableAgentDialogue: false });
  }

  /**
   * 启用调试模式
   */
  enableDebug(): void {
    this.updateConfig({ debugMode: true });
  }

  /**
   * 禁用调试模式
   */
  disableDebug(): void {
    this.updateConfig({ debugMode: false });
  }

  /**
   * 启用对话日志记录
   */
  enableLogging(): void {
    this.updateConfig({ logDialogues: true });
  }

  /**
   * 禁用对话日志记录
   */
  disableLogging(): void {
    this.updateConfig({ logDialogues: false });
  }

  /**
   * 检查特定功能是否启用
   */
  isFeatureEnabled(feature: keyof TreeAgentDialogueConfig): boolean {
    const value = this.config[feature];
    return typeof value === 'boolean' ? value : false;
  }

  /**
   * 配置LLM
   */
  configureLLM(provider: 'openai' | 'anthropic' | 'secondme' | 'ollama' | 'together',
               model: string,
               timeout?: number): void {
    this.updateConfig({
      llmProvider: provider,
      llmModel: { ...this.config.llmModel, [provider]: model },
      llmTimeout: timeout ?? this.config.llmTimeout,
    });
  }

  /**
   * 获取LLM配置
   */
  getLLMConfig(): { provider: string; model: string; timeout: number } {
    return {
      provider: this.config.llmProvider,
      model: this.config.llmModel[this.config.llmProvider as keyof typeof this.config.llmModel],
      timeout: this.config.llmTimeout,
    };
  }
}

/**
 * 全局配置管理器单例
 */
export const treeAgentDialogueConfigManager = new TreeAgentDialogueConfigManager();

/**
 * 导出为全局函数便于console访问（开发环境）
 */
if (typeof window !== 'undefined') {
  (window as any).__treeAgentDialogueConfig = {
    get: () => treeAgentDialogueConfigManager.getConfig(),
    update: (updates: Partial<TreeAgentDialogueConfig>) =>
      treeAgentDialogueConfigManager.updateConfig(updates),
    reset: () => treeAgentDialogueConfigManager.resetToDefault(),
    enableAgent: () => treeAgentDialogueConfigManager.enableAgent(),
    disableAgent: () => treeAgentDialogueConfigManager.disableAgent(),
    enableDebug: () => treeAgentDialogueConfigManager.enableDebug(),
    disableDebug: () => treeAgentDialogueConfigManager.disableDebug(),
    enableLogging: () => treeAgentDialogueConfigManager.enableLogging(),
    disableLogging: () => treeAgentDialogueConfigManager.disableLogging(),
    help: () => `
Available commands:
  __treeAgentDialogueConfig.get()                     - Get current config
  __treeAgentDialogueConfig.update({...})            - Update config
  __treeAgentDialogueConfig.reset()                  - Reset to defaults
  __treeAgentDialogueConfig.enableAgent()            - Enable Agent mode
  __treeAgentDialogueConfig.disableAgent()           - Disable Agent mode
  __treeAgentDialogueConfig.enableDebug()            - Enable debug logging
  __treeAgentDialogueConfig.disableDebug()           - Disable debug logging
  __treeAgentDialogueConfig.enableLogging()          - Enable dialogue logging
  __treeAgentDialogueConfig.disableLogging()         - Disable dialogue logging
  __treeAgentDialogueConfig.help()                   - Show this help
    `,
  };
}
