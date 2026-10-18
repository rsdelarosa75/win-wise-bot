-- Prototype table for the Bobby Vegas Horse Racing Picks (PROTOTYPE) n8n workflow.
-- Same column shape as f1_picks (and the other per-sport "_picks" tables): one row
-- per job, inserted as 'processing' by the webhook, then PATCHed to 'complete' once
-- Bobby's analysis finishes. NOT wired into the live app — n8n only, for now.

create table if not exists public.horse_picks (
  id          bigint generated always as identity primary key,
  teams       text        not null,   -- holds "<track> — Race <race_number>" (same slot F1 uses for "driver1 vs driver2")
  sport       text        not null default 'Horse Racing',
  game_date   date,
  status      text        not null default 'processing',   -- processing | complete
  analysis    text        default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

alter table public.horse_picks enable row level security;

drop policy if exists horse_picks_read  on public.horse_picks;
drop policy if exists horse_picks_write on public.horse_picks;

create policy horse_picks_read  on public.horse_picks
  for select using (true);
create policy horse_picks_write on public.horse_picks
  for all using (true) with check (true);
