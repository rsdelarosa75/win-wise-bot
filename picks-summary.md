# Picks Archive — Summary Report
_Generated 2026-06-26 from bobby_picks_export.csv_

---

## 1. Top-line

| Metric | Value |
|---|---|
| Total picks | 934 |
| Date range | 2026-05-27 → 2026-06-26 |
| Days of history | 29 days |

---

## 2. Per-sport breakdown

| Sport | Picks | % of total | First pick | Last pick | Days dormant | Status |
|---|---|---|---|---|---|---|
| Soccer | 577 | 61.8% | 2026-06-11 | 2026-06-26 | -1d | **ACTIVE** |
| MLB | 171 | 18.3% | 2026-06-04 | 2026-06-26 | -1d | **ACTIVE** |
| WNBA | 86 | 9.2% | 2026-05-27 | 2026-06-26 | -1d | **ACTIVE** |
| NBA | 56 | 6.0% | 2026-05-27 | 2026-06-20 | 5d | **DORMANT** |
| NHL | 22 | 2.4% | 2026-05-27 | 2026-06-21 | 4d | **DORMANT** |
| NCAAFB | 10 | 1.1% | 2026-06-04 | 2026-06-25 | 0d | **ACTIVE** |
| NFL | 7 | 0.7% | 2026-06-08 | 2026-06-25 | 0d | **ACTIVE** |
| F1 | 5 | 0.5% | 2026-06-15 | 2026-06-17 | 8d | **DORMANT** |

---

## 3. Dormancy flag

- 🟢 **Soccer** — last pick 2026-06-26 (-1 days ago) — **ACTIVE**
- 🟢 **MLB** — last pick 2026-06-26 (-1 days ago) — **ACTIVE**
- 🟢 **WNBA** — last pick 2026-06-26 (-1 days ago) — **ACTIVE**
- 🔴 **NBA** — last pick 2026-06-20 (5 days ago) — **DORMANT**
- 🔴 **NHL** — last pick 2026-06-21 (4 days ago) — **DORMANT**
- 🟢 **NCAAFB** — last pick 2026-06-25 (0 days ago) — **ACTIVE**
- 🟢 **NFL** — last pick 2026-06-25 (0 days ago) — **ACTIVE**
- 🔴 **F1** — last pick 2026-06-17 (8 days ago) — **DORMANT**

---

## 4. Data completeness

| Field | Populated | Total | Coverage |
|---|---|---|---|
| Picks with odds data | 224 | 934 | 23% |
| Soccer picks with matched Kalshi market | 10 | 577 | 1% |
| Soccer picks with structured bobby_pick field | 206 | 577 | 35% |

---

## 5. Verdict

**Looks like non-use, not a bug.** The dormant sports (NBA, NHL, F1) tapered off at different times (F1 (2026-06-17), NBA (2026-06-20), NHL (2026-06-21)), which matches sport-season calendars rather than a single infrastructure failure. Different last-write dates across unrelated sports suggest the workflows are healthy but simply were not triggered — no evidence of a shared logging break.
