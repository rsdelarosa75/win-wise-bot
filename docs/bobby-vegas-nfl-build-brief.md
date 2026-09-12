# Bobby Vegas — NFL Pipeline Build Brief

**Target:** Add NFL to the Bobby Vegas pick engine, mirroring the architecture of
the existing MLB pipeline.

**Priority:** Build second, after college football. Ship to shadow mode
immediately, but **do not publish NFL picks in Week 1 or Week 2.**

---

## 0. Read this before writing code

Two things make NFL structurally different from every sport already in the engine.
Both change the design.

**There is no NFL equivalent of the MLB Stats API.** MLB gave you a free, official,
comprehensive feed. The NFL does not publish one. The substitute is a community
data project with a different ingestion pattern — this is a rewrite of that layer,
not a swap of a base URL.

**The NFL is the sharpest betting market in existence.** Lines are efficient,
liquidity is enormous, and the number of genuine edges per week is small. A model
that surfaces eight confident NFL picks a week is broken. Design for selectivity
and expect the pipeline to produce nothing on many slates. Returning zero picks is
a valid, correct output and the code must handle it as such.

As with the college brief: read the existing MLB pipeline first and match its
conventions. This describes what changes per sport, not a new architecture.

---

## 1. Data sources

### Primary: nflverse

`https://github.com/nflverse/nflverse-data/releases` publishes season data as
release assets in parquet and CSV. The Python client is `nfl_data_py`
(or `nflreadpy`, check which is current at build time — verify before pinning).

Datasets to ingest:

| Dataset | Purpose |
|---|---|
| `pbp` | Play-by-play with EPA, CPOE, success rate precomputed |
| `schedules` | Game schedule, rest days, venue, roof type |
| `injuries` | Weekly practice participation and game designations |
| `rosters` | Depth chart and position group availability |
| `snap_counts` | Actual usage, more reliable than depth chart position |

Important: these are file releases, not a live API. Build ingestion around
scheduled pulls with local caching and a freshness check, not per-request fetches.
Data for a given week updates over the days following it.

### Secondary: ESPN

Reuse the existing ESPN date-fetching module. Path is
`/apis/site/v2/sports/football/nfl/scoreboard`. Use for kickoff times and live
status only.

### Weather: Open-Meteo

`https://api.open-meteo.com/v1/forecast` — free, no API key, forecast by
latitude/longitude. Build a stadium coordinate table with a roof flag; skip the
weather call entirely for domes and retractables reported closed.

### Odds

Route through the existing odds layer feeding Kalshi Edge Finder. Do not build a
second odds path.

---

## 2. The bullpen analog: the injury clock

Bullpen implications worked in MLB because it was roster-state information,
released on a predictable schedule, that materially changed outcomes and that
casual money underweighted. The NFL equivalent is the injury reporting cadence.

The clock:

- **Wednesday–Friday** — practice participation reports (full / limited / did not
  participate)
- **Friday** — final game status designations
- **90 minutes before kickoff** — inactives published

Model requirements:

1. Weight by position group, not by player count. Quarterback and offensive line
   availability dominate; a missing third receiver is close to noise.
2. Treat the **progression** across the week as signal, not just the final
   designation. A player who goes DNP → limited → full is a different situation
   from one who goes full → limited → DNP.
3. Offensive line continuity deserves its own feature. Units that have started
   together perform measurably better than the sum of individual grades.
4. Handle the 90-minute inactive window explicitly. Either generate picks after
   inactives post, or mark pre-inactive picks with a
   `pending_inactives` flag so the model's uncertainty is recorded honestly.

---

## 3. The park-factor analog: weather, with wind dominant

Wind is the single largest weather effect on NFL outcomes, primarily through
passing efficiency and totals. It matters more than temperature or precipitation.

- Pull sustained wind speed, gusts, temperature, and precipitation probability at
  kickoff time.
- Treat wind above roughly 15 mph as a meaningful passing and kicking suppressor;
  scale rather than using a hard cutoff.
- Skip entirely for domes. Retractable-roof stadiums need a roof-status check, not
  an assumption.
- Denver's altitude affects kicking distance and ball flight — flag it as a
  separate feature from weather.

**Rest differential** belongs in this layer too: Thursday games on short rest, post-bye
advantages, and international games with travel and time-zone disruption.

---

## 4. Key numbers — and why the World Cup method does not port

**Do not implement the Asian Handicap alternate-line approach for NFL.**

That method works in soccer and college football because those sports produce
routine multi-score wins driven by large talent gaps. NFL games do not. Outcomes
cluster tightly, and the margin distribution has heavy mass on **3 and 7** —
artifacts of the scoring system that make those numbers structurally different
from the numbers around them.

Consequences for the model:

- Half a point is not worth a constant amount. Moving a line from 2.5 to 3.5 is a
  far larger change than 5.5 to 6.5. Any edge calculation that treats spread
  movement linearly will be wrong.
- Build a margin-of-victory distribution from historical data and price spreads
  against it, rather than assuming a normal distribution.
- Evaluate buying and selling points through key numbers explicitly, and account
  for the vig change when doing so.

If the sport needs a distinctive pick type, look at totals in high-wind spots and
at situational rest mismatches — not at alternate handicaps.

---

## 5. Shadow mode — mandatory, not optional

Week 1 has the highest variance of the NFL season and no current-year data. Priors
are built entirely on offseason projections. Publishing picks into that is
gambling on the pipeline rather than testing it.

- Run **weeks 1 through 3 with `published = false`.**
- Review the shadow record before enabling publication, and review it on CLV, not
  on win-loss. Three weeks of NFL picks is far too small a sample for record to
  mean anything; consistent positive closing line value is the only meaningful
  early signal.
- Log line at pick time, closing line, and the difference on every pick.
- Store the full feature vector, model win probability, implied probability, and
  computed edge for each pick so losses are diagnosable.

---

## 6. Supabase schema additions

Inspect the existing schema first and extend the shared picks table rather than
duplicating it. Likely new storage:

- `nfl_team_ratings` — weekly EPA-based offensive and defensive ratings
- `nfl_injury_reports` — practice participation by player and day, retained across
  the week so progression is queryable
- `nfl_stadiums` — coordinates, roof type, surface, altitude flag
- `nfl_matchup_features` — computed feature vector per game, written before pick
  generation
- `nfl_margin_distribution` — the historical margin table backing key-number pricing
- Extend picks with `pending_inactives`, `line_at_pick`, `closing_line`, `clv`

Proper migrations, not dashboard edits.

---

## 7. Output constraints

No guarantee language in user-facing pick copy — no "lock," no "can't lose," no
static win-rate claims. Any record shown must be computed live from stored results.
App Store compliance requirement for a gambling-adjacent app.

---

## 8. Acceptance criteria

- nflverse ingestion runs on a schedule with freshness checks and cache
  invalidation; no per-request file pulls.
- Injury data retains full weekly progression, not just final designations.
- Spread pricing uses an empirical margin distribution with key numbers handled
  explicitly.
- **Producing zero picks on a slate is handled as a normal, successful run.**
- Three weeks of shadow picks with CLV logged before anything publishes.
- Failures alert rather than silently serving stale picks.
