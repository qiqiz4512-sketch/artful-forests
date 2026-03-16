import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
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
    const {
      code,
      redirectUri,
      clientId,
    } = await request.json();

    const apiBaseUrl = Deno.env.get('SECONDME_API_BASE_URL') ?? 'https://api.mindverse.com/gate/lab';
    const envClientId = Deno.env.get('SECONDME_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('SECONDME_CLIENT_SECRET') ?? '';
    const resolvedClientId = envClientId || clientId || '';

    if (!code || !redirectUri || !resolvedClientId || !clientSecret) {
      return jsonResponse({
        error: 'missing_required_fields',
        message: 'code, redirectUri, SECONDME_CLIENT_ID, SECONDME_CLIENT_SECRET are required',
      }, 400);
    }

    const tokenResponse = await fetch(`${apiBaseUrl}/api/oauth/token/code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: resolvedClientId,
        client_secret: clientSecret,
      }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || tokenPayload?.code !== 0 || !tokenPayload?.data?.accessToken) {
      return jsonResponse({
        error: 'token_exchange_failed',
        details: tokenPayload,
      }, 400);
    }

    const accessToken = tokenPayload.data.accessToken as string;
    const refreshToken = tokenPayload.data.refreshToken as string | undefined;
    const expiresIn = Number(tokenPayload.data.expiresIn ?? 0);
    const scope = tokenPayload.data.scope ?? [];

    const userInfoResponse = await fetch(`${apiBaseUrl}/api/secondme/user/info`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userInfoPayload = await userInfoResponse.json().catch(() => null);

    return jsonResponse({
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresIn,
      scope,
      user: userInfoPayload?.data
        ? {
            userId: String(userInfoPayload.data.userId ?? ''),
            name: userInfoPayload.data.name ?? null,
            email: userInfoPayload.data.email ?? null,
            avatar: userInfoPayload.data.avatar ?? null,
            route: userInfoPayload.data.route ?? null,
          }
        : null,
    });
  } catch (error) {
    return jsonResponse({
      error: 'unexpected_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});