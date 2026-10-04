-- Sanity-gate audit trail. When a pick workflow detects that the data it
-- fetched does not describe the game the user asked for (teams not actually
-- playing each other on the target date, a short-priced favorite carrying a
-- losing record, or odds that resolve to different teams than the schedule),
-- it halts instead of emitting a pick and records the reason here.
create table if not exists public.data_mismatch_log (
  id            bigint generated always as identity primary key,
  sport         text,
  input_text    text,                 -- raw "Away vs Home" the user submitted
  resolved_ids  jsonb,                -- { away_id, home_id, away_school, home_school, game_id, ... }
  reason        text        not null, -- human-readable mismatch explanation
  created_at    timestamptz not null default now()
);

create index if not exists data_mismatch_log_created_idx
  on public.data_mismatch_log (created_at desc);

alter table public.data_mismatch_log enable row level security;

drop policy if exists data_mismatch_log_read   on public.data_mismatch_log;
drop policy if exists data_mismatch_log_write  on public.data_mismatch_log;
drop policy if exists data_mismatch_log_insert on public.data_mismatch_log;

create policy data_mismatch_log_read  on public.data_mismatch_log
  for select using (true);
create policy data_mismatch_log_write on public.data_mismatch_log
  for all using (true) with check (true);

-- The n8n "Log Data Mismatch" node authenticates with the project ANON key, so
-- anon must be able to insert. Explicit insert policy + table grants (RLS still
-- gates reads/writes via the policies above) — matches the open pick_log setup.
create policy data_mismatch_log_insert on public.data_mismatch_log
  for insert to anon, authenticated with check (true);

grant insert, select on public.data_mismatch_log to anon, authenticated;
