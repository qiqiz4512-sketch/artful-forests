-- Tree profile persistence for deep-link pages.
-- Run after supabase/auth_setup.sql.

create extension if not exists pgcrypto;

create table if not exists public.tree_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tree_id text not null,
  name text not null,
  personality text not null,
  generation integer not null default 0,
  energy integer not null default 0,
  is_manual boolean not null default false,
  bio text,
  last_words text,
  growth_score numeric not null default 0,
  parents jsonb not null default '[]'::jsonb,
  intimacy_map jsonb not null default '{}'::jsonb,
  social_circle jsonb not null default '{}'::jsonb,
  drawing_image_data text,
  drawing_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tree_id)
);

alter table public.tree_profiles
  add column if not exists parents jsonb not null default '[]'::jsonb;

alter table public.tree_profiles
  add column if not exists secondme_user_id text;
alter table public.tree_profiles
  alter column user_id drop not null;

alter table public.tree_chat_highlights
  add column if not exists secondme_user_id text;
alter table public.tree_chat_highlights
  alter column user_id drop not null;

alter table public.tree_relationship_events
  add column if not exists secondme_user_id text;
alter table public.tree_relationship_events
  alter column user_id drop not null;

alter table public.tree_engagement_events
  add column if not exists secondme_user_id text;
alter table public.tree_engagement_events
  alter column user_id drop not null;

alter table public.tree_growth_events
  add column if not exists secondme_user_id text;
alter table public.tree_growth_events
  alter column user_id drop not null;

alter table public.messages
  add column if not exists secondme_user_id text;
alter table public.messages
  alter column user_id drop not null;

create table if not exists public.tree_chat_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_entry_id text not null,
  tree_id text not null,
  partner_tree_id text,
  partner_name text,
  message text not null,
  likes integer not null default 0,
  comments integer not null default 0,
  source text,
  type text,
  created_at timestamptz not null,
  inserted_at timestamptz not null default now(),
  unique (user_id, chat_entry_id)
);

create table if not exists public.tree_relationship_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tree_id text not null,
  related_tree_id text,
  event_type text not null,
  event_label text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tree_engagement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_entry_id text not null,
  tree_id text not null,
  related_tree_id text,
  summary text not null,
  likes integer not null default 0,
  comments integer not null default 0,
  is_trending boolean not null default false,
  source text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (user_id, chat_entry_id)
);

create table if not exists public.tree_growth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tree_id text not null,
  stage text not null,
  growth_score numeric not null default 0,
  summary text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_entry_id text not null,
  speaker_tree_id text not null,
  listener_tree_id text not null,
  message text not null,
  source_type text not null check (source_type in ('user', 'llm', 'system')),
  conversation_mode text not null default 'direct' check (conversation_mode in ('direct', 'group')),
  created_at timestamptz not null,
  inserted_at timestamptz not null default now(),
  unique (user_id, chat_entry_id)
);

create or replace function public.set_tree_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tree_profiles_updated_at on public.tree_profiles;
create trigger trg_tree_profiles_updated_at
before update on public.tree_profiles
for each row execute function public.set_tree_profiles_updated_at();

drop trigger if exists trg_tree_engagement_events_updated_at on public.tree_engagement_events;
create trigger trg_tree_engagement_events_updated_at
before update on public.tree_engagement_events
for each row execute function public.set_tree_profiles_updated_at();

create index if not exists idx_tree_profiles_user_tree on public.tree_profiles(user_id, tree_id);
create index if not exists idx_tree_profiles_user_updated on public.tree_profiles(user_id, updated_at desc);
create unique index if not exists idx_tree_profiles_secondme_tree_unique on public.tree_profiles(secondme_user_id, tree_id);
create index if not exists idx_tree_profiles_secondme_updated on public.tree_profiles(secondme_user_id, updated_at desc);
create index if not exists idx_tree_chat_highlights_user_tree_time on public.tree_chat_highlights(user_id, tree_id, created_at desc);
create unique index if not exists idx_tree_chat_highlights_secondme_chat_unique on public.tree_chat_highlights(secondme_user_id, chat_entry_id);
create index if not exists idx_tree_chat_highlights_secondme_tree_time on public.tree_chat_highlights(secondme_user_id, tree_id, created_at desc);
create index if not exists idx_tree_relationship_events_user_tree_time on public.tree_relationship_events(user_id, tree_id, created_at desc);
create index if not exists idx_tree_relationship_events_secondme_tree_time on public.tree_relationship_events(secondme_user_id, tree_id, created_at desc);
create index if not exists idx_tree_engagement_events_user_tree_time on public.tree_engagement_events(user_id, tree_id, created_at desc);
create unique index if not exists idx_tree_engagement_events_secondme_chat_unique on public.tree_engagement_events(secondme_user_id, chat_entry_id);
create index if not exists idx_tree_engagement_events_secondme_tree_time on public.tree_engagement_events(secondme_user_id, tree_id, created_at desc);
create index if not exists idx_tree_growth_events_user_tree_time on public.tree_growth_events(user_id, tree_id, created_at desc);
create index if not exists idx_tree_growth_events_secondme_tree_time on public.tree_growth_events(secondme_user_id, tree_id, created_at desc);
create index if not exists idx_messages_user_time on public.messages(user_id, created_at desc);
create index if not exists idx_messages_user_source on public.messages(user_id, source_type, created_at desc);
create unique index if not exists idx_messages_secondme_chat_unique on public.messages(secondme_user_id, chat_entry_id);
create index if not exists idx_messages_secondme_time on public.messages(secondme_user_id, created_at desc);
create index if not exists idx_messages_secondme_source on public.messages(secondme_user_id, source_type, created_at desc);

alter table public.tree_profiles enable row level security;
alter table public.tree_chat_highlights enable row level security;
alter table public.tree_relationship_events enable row level security;
alter table public.tree_engagement_events enable row level security;
alter table public.tree_growth_events enable row level security;
alter table public.messages enable row level security;

drop policy if exists "tree_profiles_own_all" on public.tree_profiles;
create policy "tree_profiles_own_all"
on public.tree_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tree_chat_highlights_own_all" on public.tree_chat_highlights;
create policy "tree_chat_highlights_own_all"
on public.tree_chat_highlights
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tree_relationship_events_own_all" on public.tree_relationship_events;
create policy "tree_relationship_events_own_all"
on public.tree_relationship_events
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tree_engagement_events_own_all" on public.tree_engagement_events;
create policy "tree_engagement_events_own_all"
on public.tree_engagement_events
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tree_growth_events_own_all" on public.tree_growth_events;
create policy "tree_growth_events_own_all"
on public.tree_growth_events
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "messages_own_all" on public.messages;
create policy "messages_own_all"
on public.messages
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
