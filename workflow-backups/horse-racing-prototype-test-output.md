# Horse Racing Prototype — Test Output

Test call: `POST /webhook/horse-picks` with `{"track": "Keeneland", "race_number": 5, "date": "2026-10-18"}`
Workflow: `Bobby Vegas Horse Racing Picks (PROTOTYPE)` (id `0HrhfmhdcZyNeWKp`), briefly activated for this one test call, then deactivated.
Data source: SAMPLE (hand-built fictional race card — see Sample Race Card node)

## Bobby's full output

🏇 RACE: Keeneland — Race 5 — 6 Furlongs — Dirt — Fast
📋 FIELD SNAPSHOT: #1 Harborline (ML 8-1), #2 Quiet Larceny (ML 5-1), #3 Mo Stable Genius (ML 9-2), #4 Bayou Bandit (ML 3-1), #7 Chalk Eater (ML 5-2)
⚡ PACE SETUP: Harborline, Bayou Bandit, and Chalk Eater are expected to lead; Mo Stable Genius and Turf Tantrum are positioned to close.
🎯 BOBBY'S PICK: Bayou Bandit (Win)
💰 VALUE PLAY: None this race
🎟️ EXOTIC IDEA: Exacta: Bayou Bandit over Mo Stable Genius
💡 REASONING: Bayou Bandit has shown consistent speed figures, a recent class drop, and a solid performance history at this distance. With a favorable pace setup, he should contend strongly against the other early speed horses. Mo Stable Genius, while slightly less consistent, can close well and is positioned to capitalize on any fading leaders.
🔥 CONFIDENCE: Medium
⚠️ Parimutuel odds change until post. Verify final odds. For entertainment only. Bet responsibly.

## Rerun after adding the PACE PRESSURE rule

Same sample race, same request, after adding the PACE PRESSURE rule to the Horse Racing layer
(3+ projected leaders → CONTESTED PACE, favor closers/stalkers, don't pick a front-runner to win
without a clear speed edge; 1 projected leader → LONE SPEED, upgrade that horse; a closer at 4-1+
in a contested-pace race is a value play).

🏇 RACE: Keeneland — Race 5 — 6 Furlongs — Dirt — Fast
📋 FIELD SNAPSHOT: Harborline (8-1), Quiet Larceny (5-1), Mo Stable Genius (9-2), Bayou Bandit (3-1), Off The Record (15-1), Chalk Eater (5-2)
⚡ PACE SETUP: Harborline, Bayou Bandit, and Chalk Eater are expected to push for the lead, while Mo Stable Genius and Turf Tantrum will look to close from the back.
🎯 BOBBY'S PICK: Mo Stable Genius — Win
💰 VALUE PLAY: Off The Record (15-1)
🎟️ EXOTIC IDEA: Exacta: Mo Stable Genius over Chalk Eater
💡 REASONING: Mo Stable Genius has shown solid recent form and benefits from dropping in class, making him a prime candidate to close on the leaders. The early speed setup suggests a contested pace that may favor his closing style. Off The Record, despite a long layoff, could surprise given the class drop and has shown competitive speed figures in the past.
🔥 CONFIDENCE: Medium
⚠️ Parimutuel odds change until post. Verify final odds. For entertainment only. Bet responsibly.

**What changed:** with three horses now reading as early speed (Harborline, Bayou Bandit, Chalk
Eater), the rule correctly stopped Bobby from picking a front-runner to win and pushed the pick to
a closer (Mo Stable Genius) instead — exactly the intended effect. One nit: the Value Play he named,
Off The Record, is tagged "Stalker" in the sample data, not "Closer" — the rule's letter says
"a closer at 4-1+", and Bobby applied the spirit of it to a stalker instead. Not wrong, but worth
knowing if you want the rule to bite only on horses tagged exactly "Closer."

## Rerun after three more fixes (EXACTA CONSISTENCY, LAYOFF FLAG, FIELD SNAPSHOT completeness)

Same sample race, same request, run twice to check consistency (identical pick both times):

🏇 RACE: Keeneland — Race 5 — 6 Furlongs — Dirt — Fast
📋 FIELD SNAPSHOT: #1 Harborline (ML 8-1), #2 Quiet Larceny (ML 5-1), #3 Mo Stable Genius (ML 9-2), #4 Bayou Bandit (ML 3-1), #5 Off The Record (ML 15-1 — 180 days off), #6 Sloppy Sam (ML 12-1), #7 Chalk Eater (ML 5-2), #8 Turf Tantrum (ML 10-1), #9 Night Shift Nancy (ML 20-1)
⚡ PACE SETUP: Early speed from Harborline, Bayou Bandit, and Chalk Eater. Closers include Mo Stable Genius and Turf Tantrum.
🎯 BOBBY'S PICK: #4 Bayou Bandit (Win)
💰 VALUE PLAY: None this race
🎟️ EXOTIC IDEA: Exacta: Bayou Bandit over Mo Stable Genius
💡 REASONING: Bayou Bandit has the best recent speed figures in this field, and with the dropping class, he stands to capitalize on his early speed. The other early speed horses may tire, opening up the opportunity for closers like Mo Stable Genius, but I believe Bayou Bandit can hold off the competition.
🔥 CONFIDENCE: High
⚠️ Parimutuel odds change until post. Verify final odds. For entertainment only. Bet responsibly.

**Scorecard:**
- FIELD SNAPSHOT completeness: **works** — all 9 horses listed, Off The Record's 180-day layoff flagged inline.
- LAYOFF FLAG (next to name in Pick/Value Play): **not exercised** — no 90+ day horse was picked or named Value Play in this draw, so the rule was never triggered. Unconfirmed either way.
- EXACTA CONSISTENCY / underlying pace rule: **not holding**, consistently across both reruns. Three horses project early speed (contested pace), yet Bobby picked a front-runner (Bayou Bandit) to win and placed it in the top exacta slot, justified as "best recent speed figures" — which isn't actually true against the sample data: Chalk Eater's last 3 figures (91, 89, 87) beat Bayou Bandit's (92, 89, 72) on both average and floor. gpt-4o-mini at temperature 0.7 is asserting an edge rather than checking it. Prompt-following gap, not a bug in the rule text — flagged for a possible follow-up (e.g. force an explicit side-by-side figure comparison before picking, or lower temperature).

## Rerun after moving pace/figure logic into Assemble Context (deterministic) + temperature 0.3

Pace scenario, figure ranking, speed_edge, eligible_win_candidates, and value_candidates are now
computed in code (same pattern as MLB's bullpen-vulnerability rule) and handed to the prompt as
PRE-COMPUTED FACTS the model must not recalculate. For this race, the code computed:

- PACE SCENARIO: CONTESTED — 3 Early horses (Harborline, Bayou Bandit, Chalk Eater). SPEED EDGE:
  Chalk Eater (avg 89.0) clears the next-best Early horse, Bayou Bandit (avg 84.3), by 4.7 points.
- ELIGIBLE WIN CANDIDATES: Chalk Eater, Quiet Larceny, Off The Record, Mo Stable Genius,
  Turf Tantrum, Sloppy Sam, Night Shift Nancy (Harborline and Bayou Bandit excluded — Early
  horses without the speed edge, in a contested-pace race).
- VALUE CANDIDATES (eligible @ 4-1+): Quiet Larceny, Off The Record, Mo Stable Genius,
  Turf Tantrum, Sloppy Sam, Night Shift Nancy.
- LAYOFF FLAGS: Off The Record (180 days off).

Ran 3 times to confirm consistency — **all three identical**:

🏇 RACE: Keeneland — Race 5 — 6 Furlongs — Dirt — Fast
📋 FIELD SNAPSHOT: Harborline (8-1), Quiet Larceny (5-1), Mo Stable Genius (9-2), Bayou Bandit (3-1), Off The Record (15-1 — layoff risk / 180 days off), Sloppy Sam (12-1), Chalk Eater (5-2), Turf Tantrum (10-1), Night Shift Nancy (20-1)
⚡ PACE SETUP: Early speed from Harborline, Bayou Bandit, and Chalk Eater; Mo Stable Genius and Turf Tantrum will close.
🎯 BOBBY'S PICK: Chalk Eater (Win)
💰 VALUE PLAY: None this race
🎟️ EXOTIC IDEA: Exacta: Chalk Eater over Quiet Larceny
💡 REASONING: Chalk Eater has a significant speed edge over the other early horses, clearing them by 3+ average figure points. With a strong recent form and a favorable pace scenario, it should maintain its lead. Quiet Larceny is a solid stalker that could capitalize if Chalk Eater falters.
🔥 CONFIDENCE: High
⚠️ Parimutuel odds change until post. Verify final odds. For entertainment only. Bet responsibly.

**This resolves the previous bug, not just the inconsistency.** Chalk Eater's real figure edge
(4.7 points over the next Early horse) is exactly what the old prose rule was supposed to catch
and didn't — Bobby previously picked Bayou Bandit (the wrong Early horse) and asserted an edge
that wasn't there. Now the math is done in code before the model ever sees the field, the pick is
restricted to eligible_win_candidates, and the exacta never puts an excluded Early horse
(Harborline/Bayou Bandit) in the top-2. All three runs matched exactly at temperature 0.3.
Off The Record, is tagged "Stalker" in the sample data, not "Closer" — the rule's letter says
"a closer at 4-1+", and Bobby applied the spirit of it to a stalker instead. Not wrong, but worth
knowing if you want the rule to bite only on horses tagged exactly "Closer."
