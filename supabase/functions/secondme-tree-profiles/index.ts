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
  | 'saveTreeChatHighlight'
  | 'saveConversationMessage'
  | 'fetchRecentConversationMessages'
  | 'fetchTreeChatHighlights'
  | 'saveRelationshipEvent'
  | 'fetchTreeRelationshipEvents'
  | 'upsertTreeEngagementEvent'
  | 'fetchTreeEngagementEvents'
  | 'saveTreeGrowthEvent'
  | 'fetchTreeGrowthEvents';

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

  return {
    secondmeUserId: String(payload.data.userId),
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
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { error } = await admin.from('tree_profiles').upsert(row, {
          onConflict: 'secondme_user_id,tree_id',
        });
        if (error) return jsonResponse({ error: 'tree_profiles_upsert_failed', message: error.message }, 400);
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
      case 'saveTreeChatHighlight': {
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { error } = await admin.from('tree_chat_highlights').upsert(row, {
          onConflict: 'secondme_user_id,chat_entry_id',
        });
        if (error) return jsonResponse({ error: 'tree_chat_highlights_upsert_failed', message: error.message }, 400);
        return jsonResponse({ data: true });
      }
      case 'saveConversationMessage': {
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { error } = await admin.from('messages').upsert(row, {
          onConflict: 'secondme_user_id,chat_entry_id',
        });
        if (error) return jsonResponse({ error: 'messages_upsert_failed', message: error.message }, 400);
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
        const row = {
          ...payload,
          secondme_user_id: identity.secondmeUserId,
          user_id: null,
        };
        const { error } = await admin.from('tree_engagement_events').upsert(row, {
          onConflict: 'secondme_user_id,chat_entry_id',
        });
        if (error) return jsonResponse({ error: 'tree_engagement_events_upsert_failed', message: error.message }, 400);
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