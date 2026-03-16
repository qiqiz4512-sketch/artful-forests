/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_ANON_KEY: string;
	readonly VITE_SECONDME_SSO_ENABLED?: string;
	readonly VITE_SECONDME_OAUTH_AUTHORIZE_URL?: string;
	readonly VITE_SECONDME_REDIRECT_URI?: string;
	readonly VITE_SECONDME_RESPONSE_TYPE?: string;
	readonly VITE_SECONDME_SCOPE?: string;
	readonly VITE_SECONDME_CLIENT_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
