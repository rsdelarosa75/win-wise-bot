-- Power ratings for the NFL model line. One row per (season, week, team),
-- written weekly by nfl-ratings-workflow.json after MNF. The pick workflow
-- reads the latest week's rows to build Bobby's own spread.

create table if not exists public.nfl_team_ratings (
  id            bigint generated always as identity primary key,
  season        integer     not null,
  week          integer     not null,           -- ratings computed THROUGH this completed week
  team          text        not null,           -- nflverse abbreviation (LA = Rams)
  off_epa       numeric,                         -- offensive EPA per play (unadjusted, this season)
  def_epa       numeric,                         -- EPA per play allowed (unadjusted, this season)
  rating        numeric     not null,            -- points vs league average (prior-anchored, opp-adjusted, scaled)
  games_played  integer     not null,
  computed_at   timestamptz not null default now(),
  unique (season, week, team)
);

create index if not exists nfl_team_ratings_season_week_idx
  on public.nfl_team_ratings (season, week);

-- The pipeline authenticates with the Supabase anon key (same as odds_cache /
-- f1_picks), so allow that role to read and upsert. Tighten later if a service
-- key is introduced for the scheduled job.
alter table public.nfl_team_ratings enable row level security;

drop policy if exists nfl_team_ratings_read  on public.nfl_team_ratings;
drop policy if exists nfl_team_ratings_write on public.nfl_team_ratings;

create policy nfl_team_ratings_read  on public.nfl_team_ratings
  for select using (true);
create policy nfl_team_ratings_write on public.nfl_team_ratings
  for all using (true) with check (true);
