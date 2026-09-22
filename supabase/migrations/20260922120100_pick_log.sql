-- Every generated pick is logged here (one row per generation). Also backs the
-- 30-minute cache: a fresh row for the same sport+matchup+game_date is returned
-- instead of regenerating. Result fields are nullable and graded later.

create table if not exists public.pick_log (
  id                bigint generated always as identity primary key,

  -- identity / cache key
  sport             text        not null,
  away              text        not null,
  home              text        not null,
  game_date         date,
  kickoff           timestamptz,

  -- the read
  tier              text,                        -- Strong Play | Lean | Fair Line | Stay Away
  pick_type         text,                        -- spread | moneyline | total | none
  side              text,
  line_at_pick      numeric,
  price_at_pick     integer,
  model_spread      numeric,
  book_spread       numeric,
  edge_pts          numeric,
  sportsbook_implied numeric,                    -- devigged
  kalshi_implied    numeric,
  kalshi_volume     numeric,
  gate_passed       boolean,
  confidence        text,

  -- provenance
  model             text,
  prompt_version    text,
  source            text,                        -- app | test
  full_response     text,
  created_at        timestamptz not null default now(),

  -- graded later (nullable)
  final_score       text,
  outcome           text,                        -- win | loss | push | pending
  closing_line      numeric,
  clv               numeric
);

-- Cache lookup: newest fresh row for a matchup.
create index if not exists pick_log_cache_idx
  on public.pick_log (sport, home, away, game_date, created_at desc);

alter table public.pick_log enable row level security;

drop policy if exists pick_log_read  on public.pick_log;
drop policy if exists pick_log_write on public.pick_log;

create policy pick_log_read  on public.pick_log
  for select using (true);
create policy pick_log_write on public.pick_log
  for all using (true) with check (true);
