-- Tighten RLS on data_mismatch_log.
-- The n8n "Log Data Mismatch" node writes with the project ANON key (role: anon)
-- using Prefer: return=minimal, so anon needs INSERT only — never
-- select/update/delete. Service role bypasses RLS and keeps full admin access.
-- Replaces the permissive policies from 20261003120000.

drop policy if exists data_mismatch_log_read   on public.data_mismatch_log;
drop policy if exists data_mismatch_log_write  on public.data_mismatch_log;
drop policy if exists data_mismatch_log_insert on public.data_mismatch_log;

alter table public.data_mismatch_log enable row level security;

-- Only anon INSERT is allowed. With no select/update/delete policy present,
-- anon and authenticated are implicitly denied those operations under RLS.
create policy data_mismatch_log_anon_insert on public.data_mismatch_log
  for insert to anon with check (true);

-- Least-privilege grants: strip everything, then grant anon INSERT only.
revoke all on public.data_mismatch_log from anon, authenticated;
grant insert on public.data_mismatch_log to anon;

-- Verify: expect exactly one policy — data_mismatch_log_anon_insert / INSERT / {anon}
select policyname, cmd, roles
from   pg_policies
where  schemaname = 'public' and tablename = 'data_mismatch_log'
order  by policyname;
