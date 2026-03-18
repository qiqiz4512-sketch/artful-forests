/**
 * useTreeAgentDialogue Hook
 * 在React组件中使用树木Agent对话系统
 */

import { useCallback, useRef, useEffect } from 'react';
import { TreeAgent } from '@/types/forest';
import {
  generateTreeAgentRespons,
  batchGenerateTreeDialogues,
} from '@/lib/treeAgentAdapter';

export interface TreeDialogueOptions {
  weather?: 'sunny' | 'rain' | 'snow' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  intimacy?: number;
  echoText?: string;
  recentTopic?: string;
  allAgents?: TreeAgent[];
  useTemplateOnly?: boolean;
  timeout?: number;
  cacheKey?: string; // 用于缓存对话结果
}

interface DialogueCache {
  [key: string]: {
    dialogue: string;
    timestamp: number;
  };
}

/**
 * Hook for managing tree-to-tree dialogues with caching
 */
export function useTreeAgentDialogue() {
  const cacheRef = useRef<DialogueCache>({});
  const abortControllerRef = useRef<Map<string, AbortController>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 生成对话，使用缓存
   */
  const generateDialogue = useCallback(
    async (
      sender: TreeAgent,
      receiver: TreeAgent,
      options?: TreeDialogueOptions,
    ): Promise<string> => {
      const cacheKey = options?.cacheKey ?? `${sender.id}-${receiver.id}`;

      // 检查缓存
      if (cacheRef.current[cacheKey]) {
        const cached = cacheRef.current[cacheKey];
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.dialogue;
        } else {
          delete cacheRef.current[cacheKey];
        }
      }

      try {
        const dialogue = await generateTreeAgentRespons(sender, receiver, options);

        // 缓存结果
        cacheRef.current[cacheKey] = {
          dialogue,
          timestamp: Date.now(),
        };

        return dialogue;
      } catch (error) {
        console.error('Failed to generate dialogue:', error);
        throw error;
      }
    },
    [],
  );

  /**
   * 批量生成对话
   */
  const batchGenerate = useCallback(
    async (
      pairs: Array<{
        sender: TreeAgent;
        receiver: TreeAgent;
        options?: Omit<TreeDialogueOptions, 'cacheKey' | 'timeout'>;
      }>,
      timeout = 5000,
    ) => {
      const results = await batchGenerateTreeDialogues(
        pairs.map((p) => ({
          ...p,
          context: p.options,
        })),
        { timeout },
      );
      return results;
    },
    [],
  );

  /**
   * 清除缓存
   */
  const clearCache = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      delete cacheRef.current[cacheKey];
    } else {
      cacheRef.current = {};
    }
  }, []);

  /**
   * 获取缓存统计
   */
  const getCacheStats = useCallback(() => {
    const entries = Object.entries(cacheRef.current);
    const totalSize = entries.length;
    const expiredCount = entries.filter(
      ([_, value]) => Date.now() - value.timestamp >= CACHE_TTL,
    ).length;

    return {
      totalEntries: totalSize,
      expiredEntries: expiredCount,
      cacheSize: new Blob([JSON.stringify(cacheRef.current)]).size,
    };
  }, []);

  /**
   * 定期清理过期缓存
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      Object.entries(cacheRef.current).forEach(([key, value]) => {
        if (now - value.timestamp >= CACHE_TTL) {
          delete cacheRef.current[key];
        }
      });
    }, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, []);

  return {
    generateDialogue,
    batchGenerate,
    clearCache,
    getCacheStats,
  };
}

/**
 * 用于A2A场景的简化版本
 * 这个Hook优化了A2A循环中频繁调用的场景
 */
export function useA2ATreeDialogue() {
  const { generateDialogue, batchGenerate } = useTreeAgentDialogue();

  /**
   * 为A2A循环生成对话
   * 优化了参数和缓存策略
   */
  const generateA2AResponse = useCallback(
    async (
      speaker: TreeAgent,
      listener: TreeAgent,
      context: {
        weather?: 'sunny' | 'rain' | 'snow' | 'night';
        season?: 'spring' | 'summer' | 'autumn' | 'winter';
        intimacy: number;
        echoText?: string;
        recentTopic?: string;
      },
    ): Promise<string> => {
      return generateDialogue(speaker, listener, {
        ...context,
        useTemplateOnly: false,
      });
    },
    [generateDialogue],
  );

  /**
   * 预加载可能的对话伙伴的回复
   * 用于减少感知延迟
   */
  const preloadResponses = useCallback(
    async (
      potentialListeners: TreeAgent[],
      speaker: TreeAgent,
      baseContext: Omit<TreeDialogueOptions, 'allAgents'>,
    ) => {
      const pairs = potentialListeners.map((listener) => ({
        sender: listener,
        receiver: speaker,
        options: { ...baseContext, allAgents: [speaker, ...potentialListeners] },
      }));

      return batchGenerate(pairs, 5000);
    },
    [batchGenerate],
  );

  return {
    generateA2AResponse,
    preloadResponses,
  };
}
