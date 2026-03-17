# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Supabase Auth integration

This project now supports authentication with:

- SecondMe SSO only

### 1) Configure env vars

Create a `.env` file in the project root (or copy `.env.example`):

```bash
VITE_SUPABASE_URL=https://giooyiclaivgxmedfljk.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Enable SecondMe login modal
VITE_SECONDME_SSO_ENABLED=true

# Preferred (Supabase Enterprise SSO)
# Example: sso_1234567890abcdef
VITE_SECONDME_SSO_PROVIDER_ID=

# Optional fallback (OAuth/OIDC provider name). Leave empty unless configured in Supabase.
VITE_SECONDME_OAUTH_PROVIDER=
VITE_SECONDME_OAUTH_SCOPE="openid profile email"
VITE_SECONDME_OAUTH_ACCESS_TYPE=offline
VITE_SECONDME_OAUTH_PROMPT=consent
# If your Supabase OIDC setup needs a query-level provider key, set this value.
# Example: secondme
VITE_SECONDME_OAUTH_QUERY_PROVIDER=
```

### 2) Initialize Supabase SQL

Run the SQL in `supabase/auth_setup.sql` inside your Supabase SQL Editor.

If you want tree data, chat highlights, and tree biography pages to persist across devices via SecondMe identity, also run:

```bash
supabase/tree_profiles_setup.sql
```

### Notes

- SecondMe SSO button appears only when `VITE_SECONDME_SSO_ENABLED=true`.
- Login call priority: `VITE_SECONDME_SSO_PROVIDER_ID` -> `VITE_SECONDME_OAUTH_PROVIDER`.
- If neither is set, login is blocked with a config error prompt.
- The current runtime stores the SecondMe session locally, then uses Supabase Edge Functions for token exchange and tree-profile persistence.

### 3) Configure SecondMe in Supabase

In Supabase Dashboard:

Option A (recommended): Enterprise SSO

- Authentication -> SSO -> create provider
- Copy provider ID and set `VITE_SECONDME_SSO_PROVIDER_ID`

Option B: OAuth / OIDC provider

- Authentication -> Providers -> configure your OIDC provider for SecondMe
- Set `VITE_SECONDME_OAUTH_PROVIDER` to that provider name (do not use `oidc` unless actually enabled)
- Add your callback URLs (Supabase callback + app redirect URL)

After this is configured, users can click "使用 SecondMe 单点登录" in the login modal.

## SecondMe 数据桥接

- 桥接建表 SQL：`supabase/secondme_bridge_setup.sql`
- 树资料持久化 SQL：`supabase/tree_profiles_setup.sql`
- 信息表规划文档：`doc/secondme-桥接信息表规划.md`
- Edge Functions：`secondme-oauth-exchange`、`secondme-tree-profiles`
- 最小可用 RPC：`secondme_upsert_identity`、`secondme_enqueue_outbox`、`secondme_ingest_inbox`、`secondme_mark_inbox_processed`

建议执行顺序：

1. 先执行 `supabase/auth_setup.sql`
2. 再执行 `supabase/tree_profiles_setup.sql`
3. 如果需要桥接层，再执行 `supabase/secondme_bridge_setup.sql`
4. 部署 `secondme-oauth-exchange`
5. 部署 `secondme-tree-profiles`