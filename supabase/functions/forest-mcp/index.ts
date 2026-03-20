/**
 * 森灵絮语 MCP Server (Supabase Edge Function)
 *
 * 实现 MCP JSON-RPC 2.0 over HTTP，供 SecondMe / OpenClaw 等客户端调用。
 *
 * 工具列表:
 *   get_forest_trees  — 列出森林所有树木（公开只读）
 *   get_tree_profile  — 获取单棵树的完整档案（需认证）
 *   chat_with_tree    — 与特定树木展开对话（需认证）
 *
 * 认证: Bearer token（SecondMe access_token）
 *   Authorization: Bearer <access_token>
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ─────────────────────────── constants ───────────────────────────────────────

const SECONDME_API_BASE_URL =
  Deno.env.get('SECONDME_API_BASE_URL') ?? 'https://api.mindverse.com/gate/lab';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CHAT_MODEL = 'google_ai_studio/gemini-2.0-flash';
const CHAT_TIMEOUT_MS = 25_000;
const FOREST_TREES_LIMIT = 60;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─────────────────────────── helpers ─────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function rpcOk(id: unknown, result: unknown): Response {
  return jsonResponse({ jsonrpc: '2.0', id, result });
}

function rpcErr(id: unknown, code: number, message: string): Response {
  return jsonResponse({ jsonrpc: '2.0', id, error: { code, message } });
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─────────────────────────── SecondMe auth ───────────────────────────────────

interface SecondMeIdentity {
  secondmeUserId: string;
  name: string | null;
}

async function resolveSecondMeIdentity(
  accessToken: string,
): Promise<SecondMeIdentity | null> {
  try {
    const res = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/info`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.code !== 0 || !payload?.data?.userId) return null;
    return {
      secondmeUserId: String(payload.data.userId),
      name: payload.data.name ?? payload.data.route ?? null,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────── tool implementations ────────────────────────────

async function toolGetForestTrees(
  admin: ReturnType<typeof getAdminClient>,
): Promise<unknown> {
  const { data, error } = await admin
    .from('tree_profiles')
    .select(
      'tree_id, name, personality, generation, energy, bio, last_words, growth_score, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(FOREST_TREES_LIMIT);

  if (error) throw new Error(`DB error: ${error.message}`);

  const trees = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.tree_id,
    name: row.name ?? '未命名',
    personality: row.personality ?? '温柔',
    generation: Number(row.generation ?? 0),
    energy: Number(row.energy ?? 0),
    bio: row.bio ?? null,
    lastWords: row.last_words ?? null,
    growthScore: Number(row.growth_score ?? 0),
    plantedAt: row.created_at,
  }));

  return { trees, total: trees.length };
}

async function toolGetTreeProfile(
  admin: ReturnType<typeof getAdminClient>,
  treeId: string,
): Promise<unknown> {
  const { data, error } = await admin
    .from('tree_profiles')
    .select(
      'tree_id, name, personality, generation, energy, bio, last_words, ' +
        'growth_score, parents, intimacy_map, social_circle, metadata, created_at, updated_at',
    )
    .eq('tree_id', treeId)
    .maybeSingle();

  if (error) throw new Error(`DB error: ${error.message}`);
  if (!data) throw new Error(`Tree not found: ${treeId}`);

  return {
    id: data.tree_id,
    name: data.name,
    personality: data.personality,
    generation: data.generation,
    energy: data.energy,
    bio: data.bio,
    lastWords: data.last_words,
    growthScore: data.growth_score,
    parents: data.parents ?? [],
    intimacyMap: data.intimacy_map ?? {},
    socialCircle: data.social_circle ?? {},
    metadata: data.metadata ?? {},
    plantedAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Chat with a tree by consuming the SecondMe streaming chat API.
 * Accumulates all SSE chunks into a final string.
 */
async function toolChatWithTree(
  admin: ReturnType<typeof getAdminClient>,
  treeId: string,
  message: string,
  accessToken: string,
): Promise<unknown> {
  // Fetch tree profile for personality context
  const { data: tree, error } = await admin
    .from('tree_profiles')
    .select('name, personality, bio, last_words')
    .eq('tree_id', treeId)
    .maybeSingle();

  if (error) throw new Error(`DB error: ${error.message}`);
  if (!tree) throw new Error(`Tree not found: ${treeId}`);

  const personality = (tree.personality as string) ?? '温柔';
  const bio = (tree.bio as string | null) ?? '';
  const lastWords = (tree.last_words as string | null) ?? '';
  const name = (tree.name as string) ?? '森林树木';

  const systemPrompt = [
    `你是一棵名叫"${name}"的树，生活在森灵絮语 AI 互动森林中。`,
    `你的性格：${personality}。`,
    bio ? `你的自我介绍：${bio}` : '',
    lastWords ? `你最近说的话：${lastWords}` : '',
    '请用第一人称、符合性格的语气简短回应（不超过 100 字），富有诗意与情感。',
    '禁止输出 undefined 或 null，回复必须语义完整。',
  ]
    .filter(Boolean)
    .join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  let reply = '';

  try {
    const res = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        model: CHAT_MODEL,
        systemPrompt,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SecondMe chat error ${res.status}: ${text.slice(0, 200)}`);
    }

    // Consume SSE stream
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const chunk = JSON.parse(jsonStr);
            const delta =
              chunk?.choices?.[0]?.delta?.content ??
              chunk?.delta?.text ??
              chunk?.content ??
              '';
            if (typeof delta === 'string') reply += delta;
          } catch {
            // Non-JSON line, skip
          }
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }

  const sanitized = reply.replace(/\bundefined\b|\bnull\b/gi, '').trim();
  return { treeName: name, treeId, reply: sanitized || '（树木沉默了一会儿，风轻轻吹过）' };
}

// ─────────────────────────── MCP tool manifest ───────────────────────────────

const TOOLS_LIST = [
  {
    name: 'get_forest_trees',
    description:
      '获取森灵絮语森林中所有树木的列表，包含名字、性格、成长等级、能量、简介等基本信息。无需认证。',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_tree_profile',
    description:
      '获取森灵絮语中某棵树的完整档案，包括家族关系、亲密度图谱、最近说的话等。需要 SecondMe 认证。',
    inputSchema: {
      type: 'object',
      properties: {
        treeId: { type: 'string', description: '树木的唯一 ID（来自 get_forest_trees 的 id 字段）' },
      },
      required: ['treeId'],
    },
  },
  {
    name: 'chat_with_tree',
    description:
      '与森灵絮语中的某棵树展开一次对话。树木会以自己的性格和记忆回应你的话语。需要 SecondMe 认证。',
    inputSchema: {
      type: 'object',
      properties: {
        treeId: { type: 'string', description: '树木的唯一 ID' },
        message: { type: 'string', description: '你想对这棵树说的话' },
      },
      required: ['treeId', 'message'],
    },
  },
];

// ─────────────────────────── request handler ─────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  // Parse JSON-RPC body
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return rpcErr(null, -32700, 'Parse error: request body must be JSON');
  }

  const { jsonrpc, id, method, params } = body as {
    jsonrpc?: string;
    id?: unknown;
    method?: string;
    params?: Record<string, unknown>;
  };

  if (jsonrpc !== '2.0') {
    return rpcErr(id ?? null, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }

  // ── initialize ─────────────────────────────────────────────────────────────
  if (method === 'initialize') {
    return rpcOk(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'artful-forests', version: '1.0.0' },
    });
  }

  // ── notifications/initialized (client notification, no response needed) ───
  if (method === 'notifications/initialized') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // ── tools/list ─────────────────────────────────────────────────────────────
  if (method === 'tools/list') {
    return rpcOk(id, { tools: TOOLS_LIST });
  }

  // ── tools/call ─────────────────────────────────────────────────────────────
  if (method === 'tools/call') {
    // Extract bearer token
    const authHeader = req.headers.get('Authorization');
    const accessToken =
      authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    const toolName = (params?.name as string | undefined) ?? '';
    const toolArgs = (params?.arguments as Record<string, unknown> | undefined) ?? {};

    // get_forest_trees is public – no auth needed
    if (toolName === 'get_forest_trees') {
      try {
        const admin = getAdminClient();
        const result = await toolGetForestTrees(admin);
        return rpcOk(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        return rpcOk(id, {
          content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
          isError: true,
        });
      }
    }

    // Remaining tools require auth
    if (!accessToken) {
      return rpcErr(id, -32001, 'Unauthorized: missing Bearer token');
    }

    const identity = await resolveSecondMeIdentity(accessToken);
    if (!identity) {
      return rpcErr(id, -32001, 'Unauthorized: invalid or expired SecondMe token');
    }

    const admin = getAdminClient();

    try {
      if (toolName === 'get_tree_profile') {
        const { treeId } = toolArgs as { treeId?: string };
        if (!treeId?.trim()) return rpcErr(id, -32602, 'Invalid params: treeId is required');
        const result = await toolGetTreeProfile(admin, treeId.trim());
        return rpcOk(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      }

      if (toolName === 'chat_with_tree') {
        const { treeId, message } = toolArgs as { treeId?: string; message?: string };
        if (!treeId?.trim()) return rpcErr(id, -32602, 'Invalid params: treeId is required');
        if (!message?.trim()) return rpcErr(id, -32602, 'Invalid params: message is required');
        const result = await toolChatWithTree(admin, treeId.trim(), message.trim(), accessToken);
        return rpcOk(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      }

      return rpcErr(id, -32601, `Method not found: tools/call with name "${toolName}"`);
    } catch (err) {
      return rpcOk(id, {
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
        isError: true,
      });
    }
  }

  return rpcErr(id ?? null, -32601, `Method not found: ${method}`);
});
