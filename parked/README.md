# Bobby Vegas — Parked Features

All features in this directory are **complete and ready to activate** but intentionally not wired into the live app. Nothing here runs automatically.

---

## Feature Index

| # | File | Type | Est. Activation |
|---|------|------|-----------------|
| 1 | `tennis-workflow.json` | N8N Workflow | 15 min |
| 2 | `golf-workflow.json` | N8N Workflow | 15 min |
| 3 | `EdgeFinder.tsx` | React Component | 30 min |
| 4 | `Paywall.tsx` | React Component | 2–4 hrs |
| 5 | `AvatarSelection.tsx` | React Component | 1–2 hrs |
| 6 | `PerformanceDashboard.tsx` | React Component | 1 hr |
| 7 | `betty-vegas-config.js` | App Config | 2–3 days |
| 8 | `telegram-bobby-bot.js` | Node.js Bot | 30 min |
| 9 | `AntiParlayNudge.tsx` | React Component | 20 min |
| 10 | `polymarket-cache-workflow.json` | N8N Workflow | 20 min |

---

## 1. Tennis Workflow (`tennis-workflow.json`)

N8N workflow that delivers tennis match picks via Bobby Vegas. Covers H2H, surface win rate, recent form, and rankings.

**Webhook:** `https://eleven48ai.app.n8n.cloud/webhook/tennis-picks`
**ESPN:** `site.api.espn.com/apis/site/v2/sports/tennis/scoreboard`

### To Activate
1. In N8N → Import Workflow → upload `tennis-workflow.json`
2. **Important:** Update the Odds API URL to the active tournament key. Tennis odds are tournament-specific on The Odds API (e.g., `tennis_atp_wimbledon`, `tennis_wta_us_open`). The file ships with `tennis_atp` as a placeholder.
3. Activate the workflow
4. Add `Tennis` to `src/components/ui/n8n-integration.tsx` `SPORT_CONFIG`:
   ```ts
   Tennis: { webhookUrl: "https://eleven48ai.app.n8n.cloud/webhook/tennis-picks" },
   ```
5. Add `Tennis` to the sport type union in `Index.tsx`, `Picks.tsx`, and `live-odds.tsx`
6. Add `🎾 Tennis` pill to SPORT_BUTTONS arrays

### Dependencies
- Active Odds API tournament key for current tennis event
- N8N Cloud account with available workflow slots

---

## 2. Golf Workflow (`golf-workflow.json`)

Golf picks workflow. Supports outrights (winner, top-5, long shot), course fit analysis, and weather context.

**Webhook:** `https://eleven48ai.app.n8n.cloud/webhook/golf-picks`
**ESPN:** `site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`

### To Activate
1. In N8N → Import Workflow → upload `golf-workflow.json`
2. **Important:** Update the Odds API URL to the active tournament. Golf outrights are event-specific (e.g., `golf_masters_tournament_winner`, `golf_us_open_winner`). Placeholder ships as `golf_pga_championship_winner`.
3. Activate the workflow
4. Add `Golf` to `SPORT_CONFIG` in `n8n-integration.tsx`:
   ```ts
   Golf: { webhookUrl: "https://eleven48ai.app.n8n.cloud/webhook/golf-picks" },
   ```
5. Add sport pill `⛳ Golf` to SPORT_BUTTONS arrays

### Dependencies
- Active PGA/LIV tournament in progress
- Correct Odds API sport key for active tournament

---

## 3. Edge Finder (`EdgeFinder.tsx`)

Visual component showing sportsbook implied probability vs Kalshi prediction market. Animated gold badge fires when edge ≥ 5%. Includes Sharp Meter (1–10) and "Follow the Money" Kalshi volume.

### To Activate
1. Copy `EdgeFinder.tsx` → `src/components/ui/EdgeFinder.tsx`
2. Import in `n8n-integration.tsx` or the picks result card:
   ```tsx
   import { EdgeFinder } from "@/components/ui/EdgeFinder";
   ```
3. Wire up props from the Bobby Vegas analysis response. The analysis JSON needs:
   - `sbImpliedPct` — convert sportsbook American odds to implied probability
   - `kalshiPct` — read from `odds_cache` table for the matching sport
   - `kalshiVolume` — from Kalshi API volume field
   - `sharpMeter` — parse from Bobby Vegas confidence (High=8, Medium=5, Low=3)
4. Add to the pick result card below the analysis text

### Dependencies
- Kalshi cache workflow running (already live)
- `odds_cache` Supabase table populated

---

## 4. Paywall (`Paywall.tsx`)

Free tier pick counter (5/day) with upgrade prompt and Stripe checkout placeholder. Shows premium features list and price ($9.99/month).

### To Activate
1. Copy `Paywall.tsx` → `src/components/ui/Paywall.tsx`
2. Set up Stripe:
   - Create a product + monthly price in Stripe dashboard
   - Add `/api/stripe/checkout` API endpoint (Vercel serverless function) that creates a Stripe Checkout session
   - Set `STRIPE_SECRET_KEY` in Vercel env vars
   - Wire up Stripe webhook for `checkout.session.completed` → set `is_premium = true` in Supabase `profiles` table
3. Add a `picks_today` column to Supabase `profiles` table (reset daily via cron or edge function)
4. In `n8n-integration.tsx`, wrap the submit handler:
   ```tsx
   if (picksToday >= 5 && !isPremium) { setShowPaywall(true); return; }
   ```
5. Render `<Paywall picksUsedToday={picksToday} isPremium={isPremium} onDismiss={...} />`

### Dependencies
- Stripe account + product created
- `/api/stripe/checkout` Vercel serverless function
- `profiles` table with `is_premium` and `picks_today` columns
- Supabase daily reset (edge function or cron)

---

## 5. Avatar Selection (`AvatarSelection.tsx`)

5 Bobby Vegas personas with distinct GPT prompt styles. Premium avatars (High Roller Bobby, Betty Vegas) locked behind paywall. Selection saved to Supabase `profiles.avatar`.

### To Activate
1. Copy `AvatarSelection.tsx` → `src/components/ui/AvatarSelection.tsx`
2. Add `avatar` column to Supabase `profiles` table:
   ```sql
   ALTER TABLE profiles ADD COLUMN avatar TEXT DEFAULT 'classic_bobby';
   ```
3. Add an Avatar tab to the Profile page or bottom nav
4. Wire the selected avatar's `promptStyle` into the N8N webhook payload:
   ```ts
   body: JSON.stringify({ sport, teams, team1, team2, avatarPrompt: selectedAvatar.promptStyle })
   ```
5. In each N8N workflow, inject `{{ $json.avatarPrompt }}` into the OpenAI system message before the default Bobby Vegas persona text
6. Gate premium avatars: pass `isPremium` prop and show `Paywall` if locked avatar is tapped

### Dependencies
- Paywall activated (for premium avatar lock)
- `profiles.avatar` column in Supabase
- N8N workflows updated to accept `avatarPrompt` in webhook body

---

## 6. Performance Dashboard (`PerformanceDashboard.tsx`)

Public win/loss record tracker. Shows ROI, win rate bar, current streak, hot sport, pick history, and Bobby Vegas vs Average Bettor comparison chart.

### To Activate
1. Copy `PerformanceDashboard.tsx` → `src/components/ui/PerformanceDashboard.tsx`
2. Ensure `saved_picks` table has these columns:
   ```sql
   result        TEXT,        -- 'W', 'L', or 'P'
   odds          INTEGER,     -- American odds e.g. -110, +140
   pick_summary  TEXT,        -- one-line pick description
   game_date     DATE
   ```
3. Add a **Record** tab to the bottom nav or Profile page:
   ```tsx
   import { PerformanceDashboard } from "@/components/ui/PerformanceDashboard";
   // render in the tab
   ```
4. For public leaderboard: set `publicView={true}` and omit `userId` to show aggregate stats
5. To log results: add an admin interface or Supabase dashboard trigger to update `result` column after each game

### Dependencies
- `saved_picks` table with `result`, `odds`, `pick_summary`, `game_date` columns
- Manual or automated result logging process

---

## 7. Betty Vegas App Fork (`betty-vegas-config.js`)

Complete configuration for a BettyVegas white-label fork. Defines persona prompt, rose gold color scheme, WNBA/Tennis/Soccer sport priority, `betty_` Supabase table prefix, and `betty-` webhook path prefix.

### To Activate
1. Create a new Vite project (copy this repo)
2. Replace `tailwind.config.js` CSS variables with `BETTY_CONFIG.cssVars`
3. Replace all `#F5A100` gold references with `#E8B4A0` (rose gold)
4. Import `BETTY_CONFIG` in `n8n-integration.tsx` and swap:
   - `SPORT_CONFIG` webhook URLs → `BETTY_CONFIG.webhooks`
   - Default sport order → `BETTY_CONFIG.primarySports`
5. Create duplicate N8N workflows for each sport with `betty-` prefix paths and `BETTY_CONFIG.systemPrompt` injected into OpenAI node
6. Create Supabase tables with `betty_` prefix
7. Update App Store metadata with `BETTY_CONFIG.appStore` values
8. Submit as separate App Store listing

### Dependencies
- New Vercel project and deployment pipeline
- Duplicate N8N workflows with betty- webhook paths
- Separate Supabase schema (or same project, different table prefix)
- App Store developer account + app submission (~1–2 week review)

---

## 8. Telegram Bobby Bot (`telegram-bobby-bot.js`)

Long-polling Telegram bot. Users send `/pick [sport] [Team A vs Team B]` and receive a formatted Bobby Vegas pick. Includes `/today` for the day's top game, rate limiting (3 picks/user/day), and F1 Supabase polling.

### To Activate
1. Create bot via `@BotFather` on Telegram → `/newbot` → set username to `@BobbyVegasDaily_Bot`
2. Copy the bot token into `.env`:
   ```
   TELEGRAM_BOT_TOKEN=<your_token>
   ```
3. Run the bot:
   ```bash
   node parked/telegram-bobby-bot.js
   ```
4. Or keep alive with pm2:
   ```bash
   pm2 start parked/telegram-bobby-bot.js --name bobby-telegram-bot
   pm2 save
   ```
5. To upgrade rate limits for premium users: add a Supabase lookup for `profiles.is_premium` and set a higher `FREE_TIER_LIMIT` per user

### Dependencies
- Telegram Bot token from @BotFather
- All Bobby Vegas N8N webhooks live and active
- Tennis + Golf webhooks activated if those commands are wanted

---

## 9. Anti-Parlay Nudge (`AntiParlayNudge.tsx`)

Warning banner when a user tries to parlay multiple picks. Shows probability math, "the house loves parlays" messaging, and logs all dismissals to Supabase `parlay_dismissals` table.

### To Activate
1. Copy `AntiParlayNudge.tsx` → `src/components/ui/AntiParlayNudge.tsx`
2. Create `parlay_dismissals` table in Supabase:
   ```sql
   CREATE TABLE parlay_dismissals (
     id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id      UUID REFERENCES auth.users(id),
     pick_count   INTEGER,
     dismissed_at TIMESTAMPTZ DEFAULT now()
   );
   ```
3. Wherever users can add multiple picks (a parlay builder UI), render:
   ```tsx
   import { AntiParlayNudge } from "@/components/ui/AntiParlayNudge";
   <AntiParlayNudge
     pickCount={selectedPicks.length}
     picks={selectedPicks.map(p => p.label)}
     userId={user.id}
     onDismiss={() => setShowParlayWarning(false)}
   />
   ```
4. Show when `pickCount >= 2`

### Dependencies
- `parlay_dismissals` Supabase table
- A parlay builder or multi-pick UI to trigger it from

---

## 10. Polymarket Cache Workflow (`polymarket-cache-workflow.json`)

Scheduled N8N workflow fetching Polymarket CLOB sports markets every 30 minutes and upserting into Supabase `polymarket_cache` table. Second prediction market data source alongside Kalshi.

**CLOB API:** `https://clob.polymarket.com/markets?active=true&tag=[sport]`

### To Activate
1. In N8N → Import Workflow → upload `polymarket-cache-workflow.json`
2. Create `polymarket_cache` table in Supabase:
   ```sql
   CREATE TABLE polymarket_cache (
     sport       TEXT PRIMARY KEY,
     data        JSONB,
     updated_at  TIMESTAMPTZ DEFAULT now()
   );
   ```
3. Activate the workflow — it runs every 30 minutes automatically
4. To use in Bobby Vegas prompts: add a "Get Polymarket Cache" HTTP node to each sport workflow (same pattern as the existing "Get Kalshi Cache" node), pointing to:
   ```
   GET /rest/v1/polymarket_cache?sport=eq.MLB&select=data,updated_at
   ```
5. Add Polymarket implied probability to the edge detection logic (compare vs sportsbook; flag ≥5% gap)

### Polymarket API notes
- No auth required for public market data
- Tags for sports: `nba`, `mlb`, `nhl`, `nfl`, `soccer`, `tennis`
- Key fields: `tokens[].price` (0.0–1.0 probability), `volume` (total USDC traded)
- Markets refresh ~every few minutes on-chain

### Dependencies
- `polymarket_cache` Supabase table created
- N8N workflow activated
- Sport workflows updated to read from `polymarket_cache` (optional but needed for edge detection)

---

## Activation Priority Recommendation

| Priority | Feature | Why |
|----------|---------|-----|
| 🔥 High | Telegram Bobby Bot (#8) | Zero dependencies, immediate user value |
| 🔥 High | Anti-Parlay Nudge (#9) | Drop-in component, 20 min activation |
| 🔥 High | Tennis Workflow (#1) | Wimbledon season = high search volume |
| ⚡ Medium | Performance Dashboard (#6) | Builds trust and retention |
| ⚡ Medium | Polymarket Cache (#10) | Adds second data source for edge detection |
| ⚡ Medium | Edge Finder (#3) | High visual impact once Kalshi + Polymarket are solid |
| 🕐 Later | Paywall (#4) | Needs Stripe setup + user base first |
| 🕐 Later | Avatar Selection (#5) | Depends on Paywall being live |
| 🕐 Later | Golf Workflow (#2) | Seasonal — activate when major tournament starts |
| 🔮 Future | Betty Vegas Fork (#7) | Separate product, 2–3 day build |
