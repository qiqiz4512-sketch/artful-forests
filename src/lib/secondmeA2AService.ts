/**
 * SecondMe A2A (Agent-to-Agent) 对话服务
 * 用于树木Agent之间进行智能对话
 */

import { loadSecondMeSession } from '@/lib/secondmeAuth';

const SECONDME_API_BASE_URL = import.meta.env.VITE_SECONDME_API_BASE_URL || 'https://api.mindverse.com/gate/lab';
const SECONDME_A2A_MODEL = 'google_ai_studio/gemini-2.0-flash'; // 可选: 'anthropic/claude-sonnet-4-5'
const SECONDME_A2A_TIMEOUT_MS = 8000; // A2A对话超时较短（不是用户交互）

export interface SecondMeA2APayload {
  /** 发言树的系统提示词（性格、身份等） */
  systemPrompt: string;
  /** 要发送给LLM的用户提示词 */
  userPrompt: string;
  /** 历史消息（用于上下文） */
  historyMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 树木性格信息 */
  treePersonality?: string;
  /** 森林相关的上下文 */
  context?: Record<string, any>;
}

export interface SecondMeA2AResult {
  success: boolean;
  message: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 调用SecondMe A2A对话API
 * 和Index.tsx中的streamSecondMeChat相似，但针对树木对话优化
 */
export async function callSecondMeA2ADialogue(
  payload: SecondMeA2APayload,
  onChunk?: (chunk: string) => void,
): Promise<SecondMeA2AResult> {
  // 获取已保存的SecondMe会话
  const session = loadSecondMeSession();
  if (!session || !session.accessToken) {
    return {
      success: false,
      message: 'SecondMe会话未初始化',
      error: {
        code: 'SECONDME_SESSION_NOT_FOUND',
        message: '用户未登录或SessionToken已过期',
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SECONDME_A2A_TIMEOUT_MS);

  let accumulatedMessage = '';

  try {
    const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: payload.userPrompt,
        messages: [
          { role: 'system', content: payload.systemPrompt },
          ...(payload.historyMessages ?? []),
          { role: 'user', content: payload.userPrompt },
        ],
        model: SECONDME_A2A_MODEL,
        systemPrompt: payload.systemPrompt,
        context: {
          treePersonality: payload.treePersonality,
          ...payload.context,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      return {
        success: false,
        message: `SecondMe API返回错误: ${response.status}`,
        error: {
          code: 'SECONDME_API_ERROR',
          message: response.statusText || '未知错误',
        },
      };
    }

    // 处理Server-Sent Events流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        // 处理SSE格式
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            // 流结束
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content ?? '';
            if (chunk) {
              accumulatedMessage += chunk;
              if (onChunk) {
                onChunk(chunk);
              }
            }
          } catch (e) {
            // 忽略JSON解析错误
            console.warn('SecondMe SSE parse error:', e);
          }
        }
      }
    }

    window.clearTimeout(timeoutId);

    if (!accumulatedMessage) {
      return {
        success: false,
        message: '收到空的SecondMe响应',
        error: {
          code: 'SECONDME_EMPTY_RESPONSE',
          message: '没有生成对话内容',
        },
      };
    }

    return {
      success: true,
      message: accumulatedMessage,
    };
  } catch (error) {
    window.clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'SecondMe A2A对话超时',
          error: {
            code: 'SECONDME_TIMEOUT',
            message: `请求超过${SECONDME_A2A_TIMEOUT_MS}ms限制`,
          },
        };
      }

      return {
        success: false,
        message: `SecondMe调用失败: ${error.message}`,
        error: {
          code: 'SECONDME_CALL_FAILED',
          message: error.message,
        },
      };
    }

    return {
      success: false,
      message: '未知错误',
      error: {
        code: 'UNKNOWN_ERROR',
        message: String(error),
      },
    };
  }
}

/**
 * 简化版本：返回完整消息而不是流
 * 用于Agent对话系统的直接集成
 */
export async function callSecondMeA2ADialogueSync(
  payload: SecondMeA2APayload,
): Promise<string> {
  const result = await callSecondMeA2ADialogue(payload);

  if (!result.success) {
    console.error('SecondMe A2A dialogue failed:', result.error);
    return '';
  }

  return result.message;
}

/**
 * 检查SecondMe会话是否有效
 */
export function isSecondMeSessionValid(): boolean {
  try {
    const session = loadSecondMeSession();
    if (!session || !session.accessToken) return false;

    // 检查token是否过期
    if (session.expiresAt && session.expiresAt < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 获取SecondMe API配置信息
 */
export function getSecondMeA2AConfig() {
  return {
    apiBase: SECONDME_API_BASE_URL,
    model: SECONDME_A2A_MODEL,
    timeout: SECONDME_A2A_TIMEOUT_MS,
    endpoint: `${SECONDME_API_BASE_URL}/api/secondme/chat/stream`,
  };
}
