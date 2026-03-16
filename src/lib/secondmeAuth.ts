const SECONDME_STATE_STORAGE_KEY = 'secondme.oauth.state';
const SECONDME_SESSION_STORAGE_KEY = 'secondme.oauth.session';

export interface SecondMeUserProfile {
  userId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  route: string | null;
}

export interface SecondMeSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scope: string[];
  user: SecondMeUserProfile | null;
}

export interface SecondMeCallbackParams {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
}

const parseScope = (scope: string | string[] | null | undefined): string[] => {
  if (Array.isArray(scope)) return scope.filter(Boolean);
  if (!scope) return [];
  return scope.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean);
};

export function buildSecondMeAuthorizeUrl(options: {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  responseType?: string;
  scope?: string;
  state: string;
}): string {
  const url = new URL(options.authorizeUrl);
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('response_type', options.responseType ?? 'code');
  url.searchParams.set('state', options.state);

  if (options.scope?.trim()) {
    url.searchParams.set('scope', options.scope.trim());
  }

  return url.toString();
}

export function createSecondMeState(): string {
  const state = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  sessionStorage.setItem(SECONDME_STATE_STORAGE_KEY, state);
  return state;
}

export function consumeSecondMeState(): string | null {
  const state = sessionStorage.getItem(SECONDME_STATE_STORAGE_KEY);
  sessionStorage.removeItem(SECONDME_STATE_STORAGE_KEY);
  return state;
}

export function readSecondMeCallbackParams(url: URL = new URL(window.location.href)): SecondMeCallbackParams {
  return {
    code: url.searchParams.get('code'),
    state: url.searchParams.get('state'),
    error: url.searchParams.get('error'),
    errorDescription: url.searchParams.get('error_description'),
  };
}

export function clearSecondMeCallbackParams(url: URL = new URL(window.location.href)) {
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  window.history.replaceState({}, document.title, url.toString());
}

export function saveSecondMeSession(input: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  scope?: string | string[] | null;
  user?: SecondMeUserProfile | null;
}) {
  const session: SecondMeSession = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? null,
    expiresAt: Date.now() + Math.max(0, input.expiresIn) * 1000,
    scope: parseScope(input.scope),
    user: input.user ?? null,
  };

  localStorage.setItem(SECONDME_SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function loadSecondMeSession(): SecondMeSession | null {
  const raw = localStorage.getItem(SECONDME_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SecondMeSession;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(SECONDME_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SECONDME_SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearSecondMeSession() {
  localStorage.removeItem(SECONDME_SESSION_STORAGE_KEY);
}