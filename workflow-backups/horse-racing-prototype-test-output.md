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
