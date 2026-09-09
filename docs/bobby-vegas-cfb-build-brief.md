# Bobby Vegas — College Football Pipeline Build Brief

**Target:** Add NCAA FBS football to the Bobby Vegas pick engine, mirroring the
architecture of the existing MLB pipeline.

**Priority:** Build this **first**. The season is already ~3 weeks in, the market
is materially softer than NFL, and the structure of the sport is the closest
analog to the World Cup Asian Handicap method that produced the verified 23-pick
run.

---

## 0. Before writing any code

Read the existing MLB pipeline end to end and match its conventions — module
layout, naming, error handling, Supabase client setup, secret management, and how
picks are written and surfaced to the iOS client. **Do not invent a new pattern.**
This brief describes *what changes per sport*, not a greenfield architecture.

Inspect the current Supabase schema before proposing migrations. Reuse existing
tables wherever the shape fits; only add columns or tables where college football
genuinely needs them.

---

## 1. Data sources

### Primary: CollegeFootballData (CFBD)

`https://api.collegefootballdata.com` — this is the college analog to the MLB
Stats API. Free tier requires an API key sent as `Authorization: Bearer <key>`.
Store it alongside existing secrets, never in the repo.

Endpoints to wire:

| Endpoint | Purpose |
|---|---|
| `/calendar` | Week boundaries — do not hardcode week numbers |
| `/games` | Schedule, venue, neutral-site flag, completion status |
| `/lines` | Historical and current betting lines by book |
| `/stats/season/advanced` | Opponent-adjusted efficiency, success rate, explosiveness |
| `/ratings/sp` | SP+ ratings — use as the baseline power rating |
| `/talent` | Composite team talent — the recruiting-gap signal |
| `/venues` | Stadium coordinates, elevation, dome flag |
| `/teams/fbs` | Team ID mapping and conference assignment |

Rate limits are modest. Cache aggressively — season-level endpoints change once a
week, not once a minute.

### Secondary: ESPN

Reuse the existing ESPN date-fetching module from MLB. The college scoreboard path
is `/apis/site/v2/sports/football/college-football/scoreboard`, and `groups=80`
filters to FBS. Use ESPN for live status and kickoff times only; CFBD is the
source of truth for stats.

### Odds

Route through the existing odds layer that feeds Kalshi Edge Finder. Do not build
a parallel odds ingestion path.

---

## 2. The layer that has no MLB equivalent: garbage-time filtering

This is the single most important thing to get right, and skipping it will quietly
poison every downstream number.

College football produces frequent blowouts. Raw season box scores are badly
distorted by possessions played after the outcome is decided — backups against
backups, run-out-the-clock drives, prevent defense. A team that wins 56–10 looks
far better in raw totals than it actually is.

**Requirements:**

- Prefer CFBD's opponent-adjusted advanced stats over raw box score aggregates.
- Where computing anything from drive or play data, exclude garbage-time
  possessions. A standard threshold: score differential greater than 38 in Q1, 28
  in Q2, 22 in Q3, 16 in Q4.
- Adjust for pace. Tempo variance across FBS is enormous — per-play efficiency is
  meaningful, per-game totals are not comparable between teams.
- Weight recent games more heavily than early-season games, and discount FCS
  opponents heavily or exclude them from ratings entirely.

Treat this the way park factors were treated in MLB: a mandatory normalization
step, not an optional refinement.

---

## 3. Structural edge logic

The college equivalent of bullpen implications is **talent and depth disparity**.

Signals to compute per matchup:

1. **Talent gap** — difference in CFBD composite talent rating. Large gaps predict
   blowouts more reliably in college than any NFL analog.
2. **SP+ differential**, split into offensive and defensive components rather than
   used as a single number.
3. **Explosiveness mismatch** — a team that generates explosive plays against a
   defense that allows them is the primary blowout mechanism.
4. **Rest and travel** — days since last game, time zones crossed, and whether the
   team is crossing two or more. Body-clock disadvantage for early kickoffs after
   westbound travel is real and under-priced.
5. **Altitude** — flag venues above 4,500 feet from the `/venues` elevation field.
6. **Situational spots** — road game sandwiched between two rivalry or ranked
   opponents. Compute from schedule position; do not try to model motivation
   directly.

### Availability data gap

Most conferences do not mandate a public injury report, and coverage is
inconsistent. Do not fabricate a confidence signal you don't have. Instead:

- Attempt to pull availability where a conference publishes it.
- Where unavailable, **flag the pick with a `roster_confidence: low` marker** and
  down-weight it rather than dropping it.

The absence of transparent injury data is part of why the market is soft here. It
is a source of edge, but only if the model is honest about not having it.

---

## 4. Porting the Asian Handicap method

The World Cup approach — backing heavy favorites to cover an alternate handicap
rather than a moneyline — transfers to college football because the sport produces
the same structural condition: enormous talent gaps and routine multi-score wins.

Implement as a distinct pick type:

- Identify matchups where the talent gap, SP+ differential, and explosiveness
  mismatch all point the same direction.
- Evaluate alternate spreads rather than the consensus line, the same way the
  soccer engine evaluates alternate handicaps.
- Require agreement across all three signals before generating a pick. The World
  Cup run came from selectivity, not volume.

**Do not port this logic to NFL.** A separate brief covers why.

---

## 5. Shadow mode and evaluation

Every pick is written with a `published` boolean. Run the first two weeks with
`published = false` while the ratings stabilize.

**Log closing line value on every pick.** Record the line at pick time and the
closing line, and store the difference. With sample sizes this small, CLV is a far
better signal of whether the model has an edge than win rate is — a 6-2 stretch
tells you nothing, consistent positive CLV tells you a lot.

Also record, per pick: every input signal value, the model's estimated win
probability, the implied probability from the price, and the computed edge. When a
pick loses you need to know which layer was wrong.

---

## 6. Supabase schema additions

Check existing tables first. Assuming the MLB pattern uses a shared `picks` table
with a sport discriminator, extend rather than duplicate. New college-specific
storage likely needed:

- `cfb_team_ratings` — weekly snapshot of SP+, talent, adjusted efficiency, pace
- `cfb_venues` — coordinates, elevation, dome flag, surface
- `cfb_matchup_features` — the computed per-game feature vector, one row per game,
  written before pick generation so picks are reproducible
- Extend the picks table with `roster_confidence`, `line_at_pick`,
  `closing_line`, `clv`

Write proper migrations. Do not mutate schema by hand in the dashboard.

---

## 7. Output constraints

Pick copy surfaced to users must not contain guarantee language — no "lock," no
"can't lose," no claimed win rates that aren't computed live from the stored
record. This is an App Store compliance requirement for a gambling-adjacent app,
not a style preference.

---

## 8. Acceptance criteria

- Pipeline runs on a schedule, pulls the current week from `/calendar`, and does
  not require manual week entry.
- Every stat used downstream is opponent-adjusted and garbage-time filtered.
- Every generated pick has a complete stored feature vector and a CLV record.
- Two weeks of shadow-mode picks logged before anything is published.
- Failures are logged and alert rather than failing silently — a pipeline that
  quietly produces stale picks is worse than one that produces none.
