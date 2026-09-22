# Bobby Vegas — QB-Adjusted Ratings + Backup QB Rankings

**Depends on:** roster and news layer landing first (nflverse weekly rosters
with IR/PUP/NFI status, plus the news/availability section). This brief assumes
Bobby knows who is starting before it runs.

**Why:** the NFL power rating is EPA-based, which means it rates each offense
*with the quarterback who produced that EPA*. When a starter goes down, the
rating stays put while the market moves the line four to seven points. Every
injured-QB game currently carries a model number that's wrong in a predictable
direction — and the early-season cap catches it as "model uncertainty" rather
than the actual cause. This layer makes the rating move with the quarterback.

---

## 1. Per-QB value table

New scheduled step in `nfl-ratings-workflow.json`, same Tuesday cadence. New
Supabase table `nfl_qb_values`:

| column | meaning |
|---|---|
| season, week | computed through this completed week |
| player_id, player_name, team | nflverse identifiers |
| dropbacks | this season |
| epa_per_dropback | this season, raw |
| prior_epa | preseason prior (see below) |
| qb_value_pts | points above/below league-average starter, regressed |
| is_starter | per current depth chart / roster |
| computed_at | |

**Source:** nflverse `player_stats` (weekly) — passing EPA and dropback
counts per player. Same release family as everything else, no new auth.

**Value in points:** EPA per dropback × average dropbacks per game (~35) →
points per game vs league-average QB. Scale should be sanity-checked against
what the market moves a line when a known starter goes down; that number is
the ground truth.

**Regression:** same `w = g/(g+R)` form as the team ratings, but keyed on
dropbacks rather than games. A starter with 100+ dropbacks is mostly his own
data. A backup with 12 is almost entirely prior.

**Priors, in order of preference:**
1. Prior seasons' EPA per dropback for that player, if 200+ career dropbacks
2. Otherwise **replacement level**: roughly −5 points vs an average starter.
   This is the default for career backups, rookies with no starts, and
   practice-squad call-ups. Tune from the market: when a team goes from
   starter to unknown backup, the line move is the market's replacement-level
   estimate.

---

## 2. QB-adjusted team rating

In the Model Line node, before computing expected margin:

```
starter_baseline = value of the QB who produced most of the team's
                   dropbacks this season (the one the team rating embeds)
current_qb       = value of the QB listed as starting this week
adjustment       = current_qb − starter_baseline
adjusted_rating  = team_rating + adjustment
```

When the same QB is starting, adjustment is zero and nothing changes. When a
backup is in, the rating drops by the gap — which for most teams is five to
eight points, matching what the market does.

Log both `team_rating_raw` and `qb_adjustment` on every pick so the size of
the correction is auditable.

---

## 3. What changes in Bobby's output

**MODEL LINE** gains a line when adjustment ≠ 0:

> 📐 MODEL LINE: Bobby number Eagles −4.5 | Book Eagles −3 | Edge 1.5 toward
> Eagles
> QB adjustment: Bears −6.2 (Williams out, Bagent starting — replacement-level
> prior, 47 career dropbacks)

**Tier logic:** a game with a QB adjustment on either side gets a
`qb_change: true` flag in `pick_log`. Interaction with the early-season cap:
if a large edge is *explained* by the QB adjustment (i.e., the raw rating had
the big gap and the adjusted rating closes it), the cap note should say so —
"gap reflects QB change, not mispricing" — rather than the generic
uncertainty note.

**Stay Away rule:** if the starting QB changed within the last 72 hours and
the backup has fewer than 50 career dropbacks, default to Stay Away regardless
of edge. The market is still finding the number; Bobby shouldn't pretend to
have found it first.

---

## 4. Backup QB Power Rankings — the content piece

A weekly derived view, not a new pipeline. From `nfl_qb_values`, for every
team, the QB2 and their `qb_value_pts`, ranked. Surface as:

- A scheduled Tuesday post (Discord already exists in the soccer workflow;
  same pattern) — "Backup QB Power Rankings, Week N"
- Optionally an in-app view under Edge Finder

Columns worth showing: team, starter, backup, backup value vs replacement,
career dropbacks, one-line note (rookie / journeyman / former starter).

This is the thing to screenshot in the announcement. "Who's actually good if
the starter goes down" is the question of this season and nobody's answering
it cleanly.

---

## 5. Sanity checks before shipping

- Pull three known starter-to-backup line moves from this season. The model's
  `qb_adjustment` for those games should land within two points of what the
  market moved. If it's consistently larger, the replacement prior is too
  harsh; smaller, too generous.
- Confirm the starter_baseline logic picks the right QB for teams that
  changed starters mid-season — the baseline is whoever the *rating* embeds,
  not whoever started Week 1.
- Unit tests as with the ratings and model-line work, loading jsCode from the
  workflow JSON.

---

## 6. Later, not now

- Extend to OL continuity (the brief's other structural factor) once the QB
  layer is stable — same shape, harder data
- CFB version needs a different source; CFBD has player stats but QB
  turnover in college is a different problem
