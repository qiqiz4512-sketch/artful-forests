-- Profiles table for username <-> user mapping
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

-- Logged-in user can read/update own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Registration flow writes profile row from client.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- Remove public anonymous profile reading.
drop policy if exists "profiles_lookup_for_login" on public.profiles;

-- Resolve login identifier with a controlled RPC surface.
-- Returns the same value when identifier is already an email,
-- or resolves username -> email from profiles.
create or replace function public.resolve_login_email(identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  resolved_email text;
begin
  normalized := lower(trim(identifier));

  if normalized is null or normalized = '' then
    return null;
  end if;

  if normalized ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return normalized;
  end if;

  select email
  into resolved_email
  from public.profiles
  where lower(username) = normalized
  limit 1;

  return resolved_email;
end;
$$;

-- Pre-check username availability during registration without exposing profile rows.
create or replace function public.is_username_available(candidate text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  exists_username boolean;
begin
  normalized := lower(trim(candidate));

  if normalized is null or normalized = '' then
    return false;
  end if;

  select exists(
    select 1
    from public.profiles
    where lower(username) = normalized
  )
  into exists_username;

  return not exists_username;
end;
$$;

-- Pre-check email availability to avoid repeated signUp email rate limits.
create or replace function public.is_email_available(candidate text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  exists_email boolean;
begin
  normalized := lower(trim(candidate));

  if normalized is null or normalized = '' then
    return false;
  end if;

  select exists(
    select 1
    from auth.users
    where lower(email) = normalized
  )
  into exists_email;

  return not exists_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

revoke all on function public.is_email_available(text) from public;
grant execute on function public.is_email_available(text) to anon, authenticated;

-- Refresh PostgREST schema cache so newly created RPC functions are immediately visible.
notify pgrst, 'reload schema';
