-- Bridge schema between local app data and SecondMe identities/data exchange.
-- Run after supabase/auth_setup.sql.

create extension if not exists pgcrypto;

-- 1) User <-> SecondMe identity binding
create table if not exists public.secondme_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  secondme_user_id text not null,
  secondme_agent_id text,
  secondme_space_id text,
  display_name text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'revoked', 'disabled')),
  token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (secondme_user_id)
);

-- 2) Data source registry (what local data can be synchronized)
create table if not exists public.secondme_data_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('chat_history', 'tree_profile', 'memory_note', 'manual_upload', 'external_webhook')),
  source_key text not null,
  source_label text,
  source_path text,
  is_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_type, source_key)
);

-- 3) Fine-grained data consent controls
create table if not exists public.secondme_consent_scopes (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.secondme_identities(id) on delete cascade,
  scope_key text not null,
  permission text not null check (permission in ('allow', 'deny', 'mask')),
  rule jsonb not null default '{}'::jsonb,
  effective_from timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_id, scope_key)
);

-- 4) Outbound queue: local -> SecondMe
create table if not exists public.secondme_outbox (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.secondme_identities(id) on delete cascade,
  data_source_id uuid references public.secondme_data_sources(id) on delete set null,
  event_type text not null,
  dedupe_key text,
  payload jsonb not null,
  payload_hash text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'dead')),
  attempt_count integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) Inbound log: SecondMe -> local
create table if not exists public.secondme_inbox (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.secondme_identities(id) on delete cascade,
  external_event_id text,
  event_type text not null,
  payload jsonb not null,
  payload_hash text,
  processed boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (identity_id, external_event_id)
);

-- 6) Sync task execution tracking
create table if not exists public.secondme_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.secondme_identities(id) on delete cascade,
  direction text not null check (direction in ('export', 'import', 'bidirectional')),
  trigger_type text not null check (trigger_type in ('manual', 'schedule', 'webhook', 'retry')),
  status text not null default 'queued' check (status in ('queued', 'running', 'success', 'partial', 'failed', 'canceled')),
  started_at timestamptz,
  finished_at timestamptz,
  total_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  context jsonb not null default '{}'::jsonb,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7) Cursor/checkpoint for incremental synchronization
create table if not exists public.secondme_sync_checkpoints (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.secondme_identities(id) on delete cascade,
  checkpoint_key text not null,
  checkpoint_value text,
  checkpoint_time timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_id, checkpoint_key)
);

-- 8) Audit trail for compliance and troubleshooting
create table if not exists public.secondme_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  identity_id uuid references public.secondme_identities(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  ip inet,
  user_agent text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_secondme_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_secondme_identities_updated_at on public.secondme_identities;
create trigger trg_secondme_identities_updated_at
before update on public.secondme_identities
for each row execute function public.set_secondme_updated_at();

drop trigger if exists trg_secondme_data_sources_updated_at on public.secondme_data_sources;
create trigger trg_secondme_data_sources_updated_at
before update on public.secondme_data_sources
for each row execute function public.set_secondme_updated_at();

drop trigger if exists trg_secondme_consent_scopes_updated_at on public.secondme_consent_scopes;
create trigger trg_secondme_consent_scopes_updated_at
before update on public.secondme_consent_scopes
for each row execute function public.set_secondme_updated_at();

drop trigger if exists trg_secondme_outbox_updated_at on public.secondme_outbox;
create trigger trg_secondme_outbox_updated_at
before update on public.secondme_outbox
for each row execute function public.set_secondme_updated_at();

drop trigger if exists trg_secondme_sync_jobs_updated_at on public.secondme_sync_jobs;
create trigger trg_secondme_sync_jobs_updated_at
before update on public.secondme_sync_jobs
for each row execute function public.set_secondme_updated_at();

drop trigger if exists trg_secondme_sync_checkpoints_updated_at on public.secondme_sync_checkpoints;
create trigger trg_secondme_sync_checkpoints_updated_at
before update on public.secondme_sync_checkpoints
for each row execute function public.set_secondme_updated_at();

-- Indexes for common read/write patterns
create index if not exists idx_secondme_identities_user on public.secondme_identities(user_id);
create index if not exists idx_secondme_identities_status on public.secondme_identities(status);

create index if not exists idx_secondme_data_sources_user_enabled on public.secondme_data_sources(user_id, is_enabled);
create index if not exists idx_secondme_data_sources_type on public.secondme_data_sources(source_type);

create index if not exists idx_secondme_outbox_status_retry on public.secondme_outbox(status, next_retry_at);
create index if not exists idx_secondme_outbox_identity_created on public.secondme_outbox(identity_id, created_at desc);
create index if not exists idx_secondme_outbox_dedupe on public.secondme_outbox(identity_id, dedupe_key) where dedupe_key is not null;

create index if not exists idx_secondme_inbox_identity_created on public.secondme_inbox(identity_id, created_at desc);
create index if not exists idx_secondme_inbox_processed on public.secondme_inbox(processed, created_at);

create index if not exists idx_secondme_sync_jobs_identity_created on public.secondme_sync_jobs(identity_id, created_at desc);
create index if not exists idx_secondme_sync_jobs_status on public.secondme_sync_jobs(status);

create index if not exists idx_secondme_audit_logs_user_created on public.secondme_audit_logs(user_id, created_at desc);
create index if not exists idx_secondme_audit_logs_identity_created on public.secondme_audit_logs(identity_id, created_at desc);

-- RLS
alter table public.secondme_identities enable row level security;
alter table public.secondme_data_sources enable row level security;
alter table public.secondme_consent_scopes enable row level security;
alter table public.secondme_outbox enable row level security;
alter table public.secondme_inbox enable row level security;
alter table public.secondme_sync_jobs enable row level security;
alter table public.secondme_sync_checkpoints enable row level security;
alter table public.secondme_audit_logs enable row level security;

drop policy if exists "secondme_identities_own_all" on public.secondme_identities;
create policy "secondme_identities_own_all"
on public.secondme_identities
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "secondme_data_sources_own_all" on public.secondme_data_sources;
create policy "secondme_data_sources_own_all"
on public.secondme_data_sources
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "secondme_consent_scopes_own_all" on public.secondme_consent_scopes;
create policy "secondme_consent_scopes_own_all"
on public.secondme_consent_scopes
for all
to authenticated
using (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_consent_scopes.identity_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_consent_scopes.identity_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "secondme_outbox_own_all" on public.secondme_outbox;
create policy "secondme_outbox_own_all"
on public.secondme_outbox
for all
to authenticated
using (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_outbox.identity_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_outbox.identity_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "secondme_inbox_own_all" on public.secondme_inbox;
create policy "secondme_inbox_own_all"
on public.secondme_inbox
for all
to authenticated
using (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_inbox.identity_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_inbox.identity_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "secondme_sync_jobs_own_all" on public.secondme_sync_jobs;
create policy "secondme_sync_jobs_own_all"
on public.secondme_sync_jobs
for all
to authenticated
using (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_sync_jobs.identity_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_sync_jobs.identity_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "secondme_sync_checkpoints_own_all" on public.secondme_sync_checkpoints;
create policy "secondme_sync_checkpoints_own_all"
on public.secondme_sync_checkpoints
for all
to authenticated
using (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_sync_checkpoints.identity_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.secondme_identities i
    where i.id = secondme_sync_checkpoints.identity_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "secondme_audit_logs_own_select" on public.secondme_audit_logs;
create policy "secondme_audit_logs_own_select"
on public.secondme_audit_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "secondme_audit_logs_own_insert" on public.secondme_audit_logs;
create policy "secondme_audit_logs_own_insert"
on public.secondme_audit_logs
for insert
to authenticated
with check (user_id = auth.uid());

-- Optional helper view for dashboard pages
create or replace view public.secondme_sync_overview as
select
  i.user_id,
  i.id as identity_id,
  i.secondme_user_id,
  i.status as identity_status,
  i.last_synced_at,
  (
    select count(*)
    from public.secondme_outbox o
    where o.identity_id = i.id
      and o.status in ('pending', 'processing', 'failed')
  ) as pending_outbox,
  (
    select count(*)
    from public.secondme_inbox n
    where n.identity_id = i.id
      and n.processed = false
  ) as pending_inbox
from public.secondme_identities i;

-- Minimal RPC layer for app integration
create or replace function public.secondme_upsert_identity(
  p_secondme_user_id text,
  p_secondme_agent_id text default null,
  p_secondme_space_id text default null,
  p_display_name text default null,
  p_avatar_url text default null,
  p_token_encrypted text default null,
  p_refresh_token_encrypted text default null,
  p_token_expires_at timestamptz default null
)
returns public.secondme_identities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.secondme_identities;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if coalesce(trim(p_secondme_user_id), '') = '' then
    raise exception 'secondme_user_id is required';
  end if;

  insert into public.secondme_identities (
    user_id,
    profile_id,
    secondme_user_id,
    secondme_agent_id,
    secondme_space_id,
    display_name,
    avatar_url,
    token_encrypted,
    refresh_token_encrypted,
    token_expires_at,
    status,
    last_synced_at
  )
  values (
    v_user_id,
    v_user_id,
    trim(p_secondme_user_id),
    nullif(trim(p_secondme_agent_id), ''),
    nullif(trim(p_secondme_space_id), ''),
    nullif(trim(p_display_name), ''),
    nullif(trim(p_avatar_url), ''),
    nullif(trim(p_token_encrypted), ''),
    nullif(trim(p_refresh_token_encrypted), ''),
    p_token_expires_at,
    'active',
    now()
  )
  on conflict (user_id)
  do update
  set secondme_user_id = excluded.secondme_user_id,
      secondme_agent_id = excluded.secondme_agent_id,
      secondme_space_id = excluded.secondme_space_id,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      token_encrypted = coalesce(excluded.token_encrypted, public.secondme_identities.token_encrypted),
      refresh_token_encrypted = coalesce(excluded.refresh_token_encrypted, public.secondme_identities.refresh_token_encrypted),
      token_expires_at = coalesce(excluded.token_expires_at, public.secondme_identities.token_expires_at),
      status = 'active',
      last_synced_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.secondme_enqueue_outbox(
  p_identity_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_data_source_id uuid default null,
  p_dedupe_key text default null,
  p_next_retry_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_owned boolean;
  v_outbox_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_identity_id is null then
    raise exception 'identity_id is required';
  end if;

  if coalesce(trim(p_event_type), '') = '' then
    raise exception 'event_type is required';
  end if;

  if p_payload is null then
    raise exception 'payload is required';
  end if;

  select exists (
    select 1
    from public.secondme_identities i
    where i.id = p_identity_id
      and i.user_id = v_user_id
  ) into v_owned;

  if not v_owned then
    raise exception 'identity not found or not owned by current user';
  end if;

  insert into public.secondme_outbox (
    identity_id,
    data_source_id,
    event_type,
    dedupe_key,
    payload,
    payload_hash,
    status,
    next_retry_at
  )
  values (
    p_identity_id,
    p_data_source_id,
    trim(p_event_type),
    nullif(trim(p_dedupe_key), ''),
    p_payload,
    md5(p_payload::text),
    'pending',
    p_next_retry_at
  )
  returning id into v_outbox_id;

  return v_outbox_id;
end;
$$;

create or replace function public.secondme_ingest_inbox(
  p_identity_id uuid,
  p_external_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_owned boolean;
  v_inbox_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_identity_id is null then
    raise exception 'identity_id is required';
  end if;

  if coalesce(trim(p_event_type), '') = '' then
    raise exception 'event_type is required';
  end if;

  if p_payload is null then
    raise exception 'payload is required';
  end if;

  select exists (
    select 1
    from public.secondme_identities i
    where i.id = p_identity_id
      and i.user_id = v_user_id
  ) into v_owned;

  if not v_owned then
    raise exception 'identity not found or not owned by current user';
  end if;

  insert into public.secondme_inbox (
    identity_id,
    external_event_id,
    event_type,
    payload,
    payload_hash,
    processed
  )
  values (
    p_identity_id,
    nullif(trim(p_external_event_id), ''),
    trim(p_event_type),
    p_payload,
    md5(p_payload::text),
    false
  )
  on conflict (identity_id, external_event_id)
  do update
  set payload = excluded.payload,
      payload_hash = excluded.payload_hash,
      processed = false,
      processed_at = null,
      processing_error = null
  returning id into v_inbox_id;

  return v_inbox_id;
end;
$$;

create or replace function public.secondme_mark_inbox_processed(
  p_inbox_id uuid,
  p_success boolean,
  p_processing_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_updated integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.secondme_inbox n
  set processed = p_success,
      processed_at = case when p_success then now() else null end,
      processing_error = case when p_success then null else nullif(trim(p_processing_error), '') end
  where n.id = p_inbox_id
    and exists (
      select 1
      from public.secondme_identities i
      where i.id = n.identity_id
        and i.user_id = v_user_id
    );

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.secondme_upsert_identity(text, text, text, text, text, text, text, timestamptz) from public;
grant execute on function public.secondme_upsert_identity(text, text, text, text, text, text, text, timestamptz) to authenticated;

revoke all on function public.secondme_enqueue_outbox(uuid, text, jsonb, uuid, text, timestamptz) from public;
grant execute on function public.secondme_enqueue_outbox(uuid, text, jsonb, uuid, text, timestamptz) to authenticated;

revoke all on function public.secondme_ingest_inbox(uuid, text, text, jsonb) from public;
grant execute on function public.secondme_ingest_inbox(uuid, text, text, jsonb) to authenticated;

revoke all on function public.secondme_mark_inbox_processed(uuid, boolean, text) from public;
grant execute on function public.secondme_mark_inbox_processed(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';