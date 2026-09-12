## Sep 8 stopping point
- CFBD wired and working (calendar/games/records auth OK, week resolved at runtime)
- Odds node wired for first time — emits 85 items
- Prompt audited, phantom sections removed
- BLOCKED: Bobby Vegas AI node reports "No input data", produces nothing.
  Everything upstream green with real item counts. Bypassing CFBD Get Records
  didn't help. Check: does any connection actually land on the node's input,
  and is the OpenAI credential bound after import?

## Sep 12 — working
- v2 live, full pick with odds/records/venue confirmed (Ohio State at Texas)
- Root causes fixed: dead OpenAI key, "Authroization" typo in CFBD credential,
  .item paired-item failures, odds board array-in-one-item shape
- OPEN: Kalshi branch dead (odds_cache has no NCAAFB rows) → Edge Finder empty
- OPEN: workflow only queries current week; future-week games return not-found
- OPEN: app has no direct matchup entry for CFB — must enter via a game card
  and edit the team names in the dialog
