/**
 * TreeAgent对话适配器
 * 将新的Agent-based对话系统与现有的treeSociety和useAgentA2A集成
 */

import { TreeAgent } from '@/types/forest';
import {
  generateAgentDialogue,
  generateContextualFallback,
  TreeAgentContext,
} from '@/lib/treeAgentDialogue';
import { generateSocialChat, isDivineTree } from '@/lib/treeSociety';
import { getWorldEcologyZone, inferWorldWidthFromPositions } from '@/lib/worldEcology';

/**
 * 新型森林对话生成器
 * 使用Agent-based系统生成动态对话，fallback到模板库
 */
export async function generateTreeAgentRespons(
  sender: TreeAgent,
  receiver: TreeAgent,
  options?: {
    weather?: 'sunny' | 'rain' | 'snow' | 'night';
    season?: 'spring' | 'summer' | 'autumn' | 'winter';
    intimacy?: number;
    echoText?: string;
    recentTopic?: string;
    allAgents?: TreeAgent[];
    useTemplateOnly?: boolean; // 如果为true，仅使用模板库（用于调试）
  },
): Promise<string> {
  // 如果禁用了Agent模式，直接返回模板对话
  if (options?.useTemplateOnly) {
    return generateSocialChat(sender, receiver, {
      weather: options.weather,
      season: options.season,
      intimacy: options.intimacy,
      echoText: options.echoText,
    });
  }

  // 神启树使用特殊规则
  if (isDivineTree(sender)) {
    // 神启树的对话由treeSociety处理
    return generateSocialChat(sender, receiver, {
      weather: options?.weather,
      season: options?.season,
      intimacy: options?.intimacy,
      echoText: options?.echoText,
    });
  }

  try {
    // 构建Agent对话上下文
    const allAgentsForWidth = options?.allAgents ?? [sender, receiver];
    const worldWidth = inferWorldWidthFromPositions(
      allAgentsForWidth.map((a) => a.position.x),
    );

    const context: TreeAgentContext = {
      speaker: sender,
      listener: receiver,
      relation: getRelationTypeSimple(sender, receiver),
      intimacy: options?.intimacy ?? sender.intimacyMap[receiver.id] ?? 0,
      weather: options?.weather,
      season: options?.season,
      recentTopic: options?.recentTopic,
      echoText: options?.echoText,
      worldWidth,
    };

    // 如果新系统不可用，使用高级fallback而不是基础fallback
    // 这保证了至少能生成有上下文的回复
    try {
      const response = await generateAgentDialogue(context);
      if (response && response.length > 0) {
        return response;
      }
    } catch (error) {
      console.warn('Agent dialogue generation failed, trying contextual fallback');
    }

    // Fallback 1: 上下文感知的fallback
    const contextualResponse = generateContextualFallback(context);
    if (contextualResponse) {
      return contextualResponse;
    }

    throw new Error('All dialogue generation methods failed');
  } catch (error) {
    console.warn(
      'Tree agent dialogue failed, falling back to template system',
      sender.id,
      receiver.id,
      error,
    );

    // Fallback 2: 使用现有的模板库系统
    return generateSocialChat(sender, receiver, {
      weather: options?.weather,
      season: options?.season,
      intimacy: options?.intimacy,
      echoText: options?.echoText,
    });
  }
}

/**
 * 获取两棵树之间的简单关系类型
 * （从treeSociety复制，避免循环依赖）
 */
function getRelationTypeSimple(
  sender: TreeAgent,
  receiver: TreeAgent,
): 'partner' | 'family' | 'friend' | 'stranger' {
  if (sender.socialCircle.partner === receiver.id) return 'partner';
  if (sender.socialCircle.family.includes(receiver.id)) return 'family';
  if (sender.socialCircle.friends.includes(receiver.id) ||
      (sender.intimacyMap[receiver.id] ?? 0) >= 65) {
    return 'friend';
  }
  return 'stranger';
}

/**
 * 批量生成多个树的对话
 * 用于预生成或并行生成对话
 */
export async function batchGenerateTreeDialogues(
  pairs: Array<{
    sender: TreeAgent;
    receiver: TreeAgent;
    context?: Omit<Parameters<typeof generateTreeAgentRespons>[2], 'useTemplateOnly'>;
  }>,
  options?: {
    timeout?: number;
    parallelLimit?: number;
  },
): Promise<Array<{ pair: (typeof pairs)[number]; dialogue: string; error?: Error }>> {
  const { timeout = 5000, parallelLimit = 3 } = options ?? {};

  const results: Array<{ pair: (typeof pairs)[number]; dialogue: string; error?: Error }> = [];

  // 并行处理，但限制并发数
  for (let i = 0; i < pairs.length; i += parallelLimit) {
    const batch = pairs.slice(i, i + parallelLimit);
    const promises = batch.map(async (pair) => {
      try {
        const promise = generateTreeAgentRespons(pair.sender, pair.receiver, pair.context);
        const dialogue = await Promise.race([
          promise,
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Dialogue generation timeout')), timeout),
          ),
        ]);
        return { pair, dialogue };
      } catch (error) {
        return { pair, dialogue: '', error: error as Error };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 检查Agent对话系统是否可用
 * 返回状态信息用于调试
 */
export async function checkTreeAgentDialogueHealth(): Promise<{
  isHealthy: boolean;
  llmAvailable: boolean;
  fallbackAvailable: boolean;
  details: Record<string, any>;
}> {
  return {
    isHealthy: true, // 目前总是健康的，因为总有fallback
    llmAvailable: false, // TODO: 检查LLM服务可用性
    fallbackAvailable: true, // 模板库总是可用
    details: {
      message: 'Tree Agent dialogue system is operational',
      recommendedUsage: 'Use generateTreeAgentRespons for all tree-to-tree dialogues',
      llmStatus: 'Not integrated yet - using template fallback',
    },
  };
}
