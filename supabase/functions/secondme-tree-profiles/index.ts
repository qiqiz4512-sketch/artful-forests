import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-secondme-access-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SECONDME_API_BASE_URL = Deno.env.get('SECONDME_API_BASE_URL') ?? 'https://api.mindverse.com/gate/lab';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type ActionName =
  | 'upsertTreeProfile'
  | 'fetchTreeProfile'
  | 'fetchAllTreeProfiles'
  | 'deleteTreeProfile'
  | 'saveTreeChatHighlight'
  | 'saveConversationMessage'
  | 'fetchRecentConversationMessages'
  | 'fetchTreeChatHighlights'
  | 'saveRelationshipEvent'
  | 'fetchTreeRelationshipEvents'
  | 'upsertTreeEngagementEvent'
  | 'fetchTreeEngagementEvents'
  | 'saveTreeGrowthEvent'
  | 'fetchTreeGrowthEvents'
  | 'fetchRandomForestOwner'
  | 'fetchTreeProfilesByOwner'
  | 'fetchForestDirectory'
  | 'refreshOwnerNickname';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function invalid(message: string, status = 400) {
  return jsonResponse({ error: 'invalid_request', message }, status);
}

function normalizeLimit(input: unknown, fallback = 30) {
  const parsed = Number(input ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(200, Math.floor(parsed)));
}

async function resolveSecondMeIdentity(accessToken: string) {
  const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/info`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.code !== 0 || !payload?.data?.userId) {
    return null;
  }

  const d = payload.data;
  const displayName = String(d.name ?? d.route ?? d.email ?? '').trim() || null;
  return {
    secondmeUserId: String(d.userId),
    displayName,
  };
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const { action, payload } = await request.json() as { action?: ActionName; payload?: Record<string, unknown> };
    if (!action) {
      return invalid('action is required');
    }

    const accessToken = request.headers.get('x-secondme-access-token') ?? String(payload?.accessToken ?? '');
    if (!accessToken) {
      return jsonResponse({ error: 'missing_access_token' }, 401);
    }

    const identity = await resolveSecondMeIdentity(accessToken);
    if (!identity) {
      return jsonResponse({ error: 'invalid_secondme_session' }, 401);
    }

    const admin = getAdminClient();

    switch (action) {
      case 'upsertTreeProfile': {
        const treeId = String(payload?.tree_id ?? '').trim();
        if (!treeId) return invalid('tree_id is required');
        const baseMetadata = (payload?.metadata ?? {}) as Record<string, unknown>;
        // Prefer nickname supplied by the frontend (from localStorage session),
        // fall back to what the SecondMe identity API returned.
        const ownerNickname = String(baseMetadata.ownerNickname ?? identity.displayName ?? '').trim() || null;
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
          metadata: {
            ...baseMetadata,
            ownerNickname,
          },
        };
        const { data: existing } = await admin
          .from('tree_profiles')
          .select('id')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('tree_id', treeId)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await admin
            .from('tree_profiles')
            .update(row)
            .eq('secondme_user_id', identity.secondmeUserId)
            .eq('tree_id', treeId);
          if (error) return jsonResponse({ error: 'tree_profiles_update_failed', message: error.message }, 400);
        } else {
          const { error } = await admin.from('tree_profiles').insert(row);
          if (error) return jsonResponse({ error: 'tree_profiles_insert_failed', message: error.message }, 400);
        }
        return jsonResponse({ data: true });
      }
      case 'fetchTreeProfile': {
        const treeId = String(payload?.treeId ?? '').trim();
        if (!treeId) return invalid('treeId is required');
        const { data, error } = await admin
          .from('tree_profiles')
          .select('*')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('tree_id', treeId)
          .maybeSingle();
        if (error) return jsonResponse({ error: 'tree_profiles_fetch_failed', message: error.message }, 400);
        return jsonResponse({ data });
      }
      case 'fetchAllTreeProfiles': {
        const { data, error } = await admin
          .from('tree_profiles')
          .select('*')
          .eq('secondme_user_id', identity.secondmeUserId)
          .order('updated_at', { ascending: false });
        if (error) return jsonResponse({ error: 'tree_profiles_fetch_all_failed', message: error.message }, 400);
        return jsonResponse({ data: data ?? [] });
      }
      case 'deleteTreeProfile': {
        const treeId = String(payload?.treeId ?? '').trim();
        if (!treeId) return invalid('treeId is required');
        const { error } = await admin
          .from('tree_profiles')
          .delete()
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('tree_id', treeId);
        if (error) return jsonResponse({ error: 'tree_profiles_delete_failed', message: error.message }, 400);
        return jsonResponse({ data: true });
      }
      case 'saveTreeChatHighlight': {
        const chatEntryId = String(payload?.chat_entry_id ?? '').trim();
        if (!chatEntryId) return invalid('chat_entry_id is required');
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { data: existing } = await admin
          .from('tree_chat_highlights')
          .select('id')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('chat_entry_id', chatEntryId)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await admin
            .from('tree_chat_highlights')
            .update(row)
            .eq('secondme_user_id', identity.secondmeUserId)
            .eq('chat_entry_id', chatEntryId);
          if (error) return jsonResponse({ error: 'tree_chat_highlights_update_failed', message: error.message }, 400);
        } else {
          const { error } = await admin.from('tree_chat_highlights').insert(row);
          if (error) return jsonResponse({ error: 'tree_chat_highlights_insert_failed', message: error.message }, 400);
        }
        return jsonResponse({ data: true });
      }
      case 'saveConversationMessage': {
        const chatEntryId = String(payload?.chat_entry_id ?? '').trim();
        if (!chatEntryId) return invalid('chat_entry_id is required');
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { data: existing } = await admin
          .from('messages')
          .select('id')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('chat_entry_id', chatEntryId)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await admin
            .from('messages')
            .update(row)
            .eq('secondme_user_id', identity.secondmeUserId)
            .eq('chat_entry_id', chatEntryId);
          if (error) return jsonResponse({ error: 'messages_update_failed', message: error.message }, 400);
        } else {
          const { error } = await admin.from('messages').insert(row);
          if (error) return jsonResponse({ error: 'messages_insert_failed', message: error.message }, 400);
        }
        return jsonResponse({ data: true });
      }
      case 'fetchRecentConversationMessages': {
        let query = admin
          .from('messages')
          .select('*')
          .eq('secondme_user_id', identity.secondmeUserId)
          .order('created_at', { ascending: false })
          .limit(normalizeLimit(payload?.limit));
        if (typeof payload?.sourceType === 'string' && payload.sourceType) {
          query = query.eq('source_type', payload.sourceType);
        }
        const { data, error } = await query;
        if (error) return jsonResponse({ error: 'messages_fetch_failed', message: error.message }, 400);
        return jsonResponse({ data: data ?? [] });
      }
      case 'fetchTreeChatHighlights': {
        const treeId = String(payload?.treeId ?? '').trim();
        if (!treeId) return invalid('treeId is required');
        const { data, error } = await admin
          .from('tree_chat_highlights')
          .select('*')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('tree_id', treeId)
          .order('created_at', { ascending: false })
          .limit(normalizeLimit(payload?.limit));
        if (error) return jsonResponse({ error: 'tree_chat_highlights_fetch_failed', message: error.message }, 400);
        return jsonResponse({ data: data ?? [] });
      }
      case 'saveRelationshipEvent': {
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { error } = await admin.from('tree_relationship_events').insert(row);
        if (error) return jsonResponse({ error: 'tree_relationship_events_insert_failed', message: error.message }, 400);
        return jsonResponse({ data: true });
      }
      case 'fetchTreeRelationshipEvents': {
        const treeId = String(payload?.treeId ?? '').trim();
        if (!treeId) return invalid('treeId is required');
        const { data, error } = await admin
          .from('tree_relationship_events')
          .select('*')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('tree_id', treeId)
          .order('created_at', { ascending: false })
          .limit(normalizeLimit(payload?.limit));
        if (error) return jsonResponse({ error: 'tree_relationship_events_fetch_failed', message: error.message }, 400);
        return jsonResponse({ data: data ?? [] });
      }
      case 'upsertTreeEngagementEvent': {
        const chatEntryId = String(payload?.chat_entry_id ?? '').trim();
        if (!chatEntryId) return invalid('chat_entry_id is required');
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { data: existing } = await admin
          .from('tree_engagement_events')
          .select('id')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('chat_entry_id', chatEntryId)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await admin
            .from('tree_engagement_events')
            .update(row)
            .eq('secondme_user_id', identity.secondmeUserId)
            .eq('chat_entry_id', chatEntryId);
          if (error) return jsonResponse({ error: 'tree_engagement_events_update_failed', message: error.message }, 400);
        } else {
          const { error } = await admin.from('tree_engagement_events').insert(row);
          if (error) return jsonResponse({ error: 'tree_engagement_events_insert_failed', message: error.message }, 400);
        }
        return jsonResponse({ data: true });
      }
      case 'fetchTreeEngagementEvents': {
        const treeId = String(payload?.treeId ?? '').trim();
        if (!treeId) return invalid('treeId is required');
        const { data, error } = await admin
          .from('tree_engagement_events')
          .select('*')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('tree_id', treeId)
          .order('created_at', { ascending: false })
          .limit(normalizeLimit(payload?.limit));
        if (error) return jsonResponse({ error: 'tree_engagement_events_fetch_failed', message: error.message }, 400);
        return jsonResponse({ data: data ?? [] });
      }
      case 'saveTreeGrowthEvent': {
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { error } = await admin.from('tree_growth_events').insert(row);
        if (error) return jsonResponse({ error: 'tree_growth_events_insert_failed', message: error.message }, 400);
        return jsonResponse({ data: true });
      }
      case 'fetchTreeGrowthEvents': {
        const treeId = String(payload?.treeId ?? '').trim();
        if (!treeId) return invalid('treeId is required');
        const { data, error } = await admin
          .from('tree_growth_events')
          .select('*')
          .eq('secondme_user_id', identity.secondmeUserId)
          .eq('tree_id', treeId)
          .order('created_at', { ascending: false })
          .limit(normalizeLimit(payload?.limit));
        if (error) return jsonResponse({ error: 'tree_growth_events_fetch_failed', message: error.message }, 400);
        return jsonResponse({ data: data ?? [] });
      }
      case 'refreshOwnerNickname': {
        // Backfill ownerNickname into all tree profiles for the current user.
        // nickname is provided by the frontend from their localStorage session.
        const nickname = String(payload?.nickname ?? '').trim();
        if (!nickname) return invalid('nickname is required');

        // Fetch all rows for this user to update metadata one by one
        const { data: rows, error: fetchErr } = await admin
          .from('tree_profiles')
          .select('id, metadata')
          .eq('secondme_user_id', identity.secondmeUserId);
        if (fetchErr) return jsonResponse({ error: 'refresh_nickname_fetch_failed', message: fetchErr.message }, 400);
        if (!rows || rows.length === 0) return jsonResponse({ data: { updated: 0 } });

        // Batch update – Supabase JS doesn't support per-row metadata merge in one call,
        // so we update all rows to the same value (ownerNickname only differs per user, not per tree)
        const { error: updateErr } = await admin.rpc('update_owner_nickname', {
          p_secondme_user_id: identity.secondmeUserId,
          p_nickname: nickname,
        }).maybeSingle();

        // If the RPC doesn't exist yet, fall back to individual updates
        if (updateErr) {
          for (const row of rows as Array<{ id: string; metadata: Record<string, unknown> | null }>) {
            const updatedMeta = { ...(row.metadata ?? {}), ownerNickname: nickname };
            await admin.from('tree_profiles').update({ metadata: updatedMeta }).eq('id', row.id);
          }
        }

        return jsonResponse({ data: { updated: rows.length } });
      }
      case 'fetchForestDirectory': {
        // Fetch all manual trees grouped by owner, count per owner
        const { data, error } = await admin
          .from('tree_profiles')
          .select('secondme_user_id, metadata')
          .eq('is_manual', true)
          .not('secondme_user_id', 'is', null);
        if (error) return jsonResponse({ error: 'fetch_forest_directory_failed', message: error.message }, 400);
        if (!data || data.length === 0) return jsonResponse({ data: [] });

        // Group by secondme_user_id, count trees, collect first nickname found
        const ownerMap = new Map<string, { count: number; nickname: string | null }>();
        for (const row of data as Array<{ secondme_user_id: string; metadata: Record<string, unknown> | null }>) {
          const uid = row.secondme_user_id;
          if (!uid) continue;
          const nickname = String(row.metadata?.ownerNickname ?? '').trim() || null;
          const existing = ownerMap.get(uid);
          if (existing) {
            existing.count += 1;
            if (!existing.nickname && nickname) existing.nickname = nickname;
          } else {
            ownerMap.set(uid, { count: 1, nickname });
          }
        }

        const result = [...ownerMap.entries()].map(([ownerId, { count, nickname }]) => {
          const shortId = ownerId.slice(-6);
          return {
            ownerId,
            ownerName: nickname ?? `旅者-${shortId}`,
            treeCount: count,
            isSelf: ownerId === identity.secondmeUserId,
          };
        });

        // Sort: others first (more trees first), self last
        result.sort((a, b) => {
          if (a.isSelf) return 1;
          if (b.isSelf) return -1;
          return b.treeCount - a.treeCount;
        });

        return jsonResponse({ data: result });
      }
      case 'fetchRandomForestOwner': {
        // Get distinct secondme_user_ids that have manual trees, excluding current user
        const { data, error } = await admin
          .from('tree_profiles')
          .select('secondme_user_id')
          .eq('is_manual', true)
          .neq('secondme_user_id', identity.secondmeUserId)
          .not('secondme_user_id', 'is', null)
          .limit(50);
        if (error) return jsonResponse({ error: 'fetch_random_forest_owner_failed', message: error.message }, 400);
        if (!data || data.length === 0) return jsonResponse({ data: null });

        const uniqueOwners = [...new Set(data.map((r: { secondme_user_id: string }) => r.secondme_user_id).filter(Boolean))];
        if (uniqueOwners.length === 0) return jsonResponse({ data: null });

        const randomOwner = uniqueOwners[Math.floor(Math.random() * uniqueOwners.length)];
        // Fetch a nickname for this owner from their tree profiles
        const { data: nicknameRows } = await admin
          .from('tree_profiles')
          .select('metadata')
          .eq('secondme_user_id', randomOwner)
          .eq('is_manual', true)
          .limit(1);
        const storedNickname = String((nicknameRows?.[0]?.metadata as Record<string, unknown> | null)?.ownerNickname ?? '').trim() || null;
        const shortId = String(randomOwner).slice(-6);
        return jsonResponse({ data: { ownerId: randomOwner, ownerName: storedNickname ?? `旅者-${shortId}` } });
      }
      case 'fetchTreeProfilesByOwner': {
        const ownerId = String(payload?.ownerId ?? '').trim();
        if (!ownerId) return invalid('ownerId is required');
        const { data, error } = await admin
          .from('tree_profiles')
          .select('*')
          .eq('secondme_user_id', ownerId)
          .eq('is_manual', true)
          .order('updated_at', { ascending: false });
        if (error) return jsonResponse({ error: 'fetch_tree_profiles_by_owner_failed', message: error.message }, 400);
        return jsonResponse({ data: data ?? [] });
      }
      default:
        return invalid(`unsupported action: ${action}`);
    }
  } catch (error) {
    return jsonResponse({
      error: 'unexpected_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});