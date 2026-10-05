-- Extend pick_log for the pick-driven NFL upgrade. Non-destructive: add columns,
-- split raw analysis text into a non-readable table, and lock anon/authenticated
-- reads down to the Live-Odds pill columns only. Nothing is dropped or renamed.
-- Premium fields are NOT readable by anon OR authenticated (any logged-in user is
-- authenticated, incl. free tier); subscriber access comes later via a
-- tier-checked RPC / edge function.

-- 1) new structured columns
alter table if exists public.pick_log
  add column if not exists game_id         text,
  add column if not exists run_at          timestamptz not null default now(),
  add column if not exists neutral_site    boolean,
  add column if not exists official_side   text,
  add column if not exists bobby_side      text,
  add column if not exists bobby_market    text,
  add column if not exists bobby_price     integer,
  add column if not exists model_win_prob  numeric,
  add column if not exists ml_edge_pct     numeric,
  add column if not exists best_ev_per_100 numeric,
  add column if not exists kalshi_status   text;

update public.pick_log set run_at = created_at where run_at is null;

create index if not exists pick_log_recent_idx on public.pick_log (sport, run_at desc);

-- 2) raw analysis text in a separate, non-readable table
create table if not exists public.pick_log_raw (
  id          bigint generated always as identity primary key,
  pick_log_id bigint references public.pick_log(id) on delete cascade,
  raw_output  text,
  created_at  timestamptz not null default now()
);
alter table public.pick_log_raw enable row level security;

-- 3) RLS + grants: row access open (using true); COLUMN GRANTS decide readability
drop policy if exists pick_log_read   on public.pick_log;
drop policy if exists pick_log_write  on public.pick_log;
drop policy if exists pick_log_select on public.pick_log;
drop policy if exists pick_log_insert on public.pick_log;

create policy pick_log_select on public.pick_log for select using (true);
create policy pick_log_insert on public.pick_log
  for insert to anon, authenticated with check (true);

revoke all on public.pick_log from anon, authenticated;

-- Pill columns only (+id so the insert can return its id to link the raw row).
-- Identical set for anon AND authenticated — no premium reads for either.
grant insert on public.pick_log to anon, authenticated;
grant select (id, sport, away, home, tier, created_at, run_at, game_id)
  on public.pick_log to anon;
grant select (id, sport, away, home, tier, created_at, run_at, game_id)
  on public.pick_log to authenticated;
-- no UPDATE / DELETE granted to anon or authenticated.

-- pick_log_raw: insert-only for anon/authenticated, like data_mismatch_log; no reads.
drop policy if exists pick_log_raw_insert on public.pick_log_raw;
create policy pick_log_raw_insert on public.pick_log_raw
  for insert to anon, authenticated with check (true);
revoke all on public.pick_log_raw from anon, authenticated;
grant insert on public.pick_log_raw to anon, authenticated;

-- verify 1: SELECT columns per role (expect the same 8 pill cols for both)
select grantee,
       string_agg(column_name, ', ' order by column_name) as select_cols
from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'pick_log'
  and privilege_type = 'SELECT' and grantee in ('anon', 'authenticated')
group by grantee order by grantee;

-- verify 2: no UPDATE/DELETE for anon or authenticated (expect ZERO rows)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'pick_log'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('UPDATE', 'DELETE')
order by grantee, privilege_type;
