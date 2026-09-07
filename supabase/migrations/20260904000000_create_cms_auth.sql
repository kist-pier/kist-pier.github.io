create type public.cms_role as enum ('admin', 'member');

create table public.cms_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role public.cms_role not null,
  member_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_profiles_email_not_blank check (length(trim(email)) > 3),
  constraint cms_profiles_name_not_blank check (length(trim(display_name)) > 0),
  constraint cms_profiles_member_id_format check (
    member_id is null or member_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create table public.cms_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_email text not null,
  actor_role public.cms_role not null,
  action text not null,
  target_path text not null,
  commit_sha text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index cms_audit_logs_actor_idx on public.cms_audit_logs (actor_user_id, created_at desc);
create index cms_audit_logs_created_idx on public.cms_audit_logs (created_at desc);

create or replace function public.set_cms_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cms_profiles_set_updated_at
before update on public.cms_profiles
for each row execute function public.set_cms_updated_at();

alter table public.cms_profiles enable row level security;
alter table public.cms_audit_logs enable row level security;

revoke all on table public.cms_profiles from anon, authenticated;
revoke all on table public.cms_audit_logs from anon, authenticated;
grant select on table public.cms_profiles to authenticated;

-- The Edge Function reaches both tables through PostgREST with a secret (service_role) key, so its
-- grants must be explicit rather than inherited from the project's default privileges: Supabase is
-- removing the automatic "expose new tables" grants (new projects from 2026-05-30, all projects
-- from 2026-10-30), and without these two lines every CMS request fails with a permission error.
-- Only the two verbs the function actually uses are granted.
grant select on table public.cms_profiles to service_role;
grant insert on table public.cms_audit_logs to service_role;

create policy "users can read only their cms profile"
on public.cms_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.cms_profiles is
  'Invite-only CMS role and optional link to a stable id in _data/members.yml.';
comment on table public.cms_audit_logs is
  'Server-written record of CMS changes and the resulting Git commit.';
