-- Keep-alive endpoint for the Supabase free plan.
--
-- Free projects are paused after ~7 days of low activity, which takes the CMS offline until an
-- Owner resumes it in the dashboard. A scheduled GitHub Actions job calls this function every few
-- days so the project always has recent database traffic.
--
-- The count is read and discarded on purpose: the point is to touch a real table through the
-- connection pool, not to return anything. Callers only get the server time back, so exposing this
-- to anon leaks nothing about who has a CMS account.

create or replace function public.cms_heartbeat()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_count bigint;
begin
  select count(*) into profile_count from public.cms_profiles;
  return now();
end;
$$;

revoke all on function public.cms_heartbeat() from public;
grant execute on function public.cms_heartbeat() to anon, authenticated;
