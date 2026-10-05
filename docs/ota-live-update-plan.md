# OTA Live-Update Plan (Capgo / alternatives) — PLAN ONLY, not implemented

## TL;DR
The app **already live-updates** today: `capacitor.config.ts` sets
`server.url = https://win-wise-bot.vercel.app`, so the iOS shell loads the live web
app and a **Vercel deploy already reaches iOS with no App Store review**. A dedicated
OTA layer (Capgo etc.) only becomes worthwhile if we move to a **bundled** app (ship
`dist/` inside the binary, drop `server.url`) for offline support and to reduce the
"web wrapper" App Store risk — while *keeping* no-review JS updates. This doc plans
that path; adopt it only if we decide to bundle.

## Current model vs bundled + OTA
| | Today (remote `server.url`) | Bundled + OTA (Capgo) |
|---|---|---|
| JS/UI update path | Vercel deploy (instant, no review) | OTA bundle push (no review) |
| Offline / cold-launch w/o network | ✗ (needs network) | ✓ (last bundle cached) |
| App Store 4.2 "wrapper" risk | Higher | Lower (real bundled app) |
| Infra to run | none (Vercel) | OTA service / self-host |
| Native changes | Xcode rebuild | Xcode rebuild |

## Options & approximate cost (verify current pricing before committing)
- **Capgo** (`@capgo/capacitor-updater`) — open-source plugin. Cloud plans roughly
  **$12–20/mo** (solo) up to **~$250/mo** (teams/high MAU); **self-host for free**
  (you run the update server + storage). Best cost/flexibility.
- **Capawesome Cloud** — similar model, comparable low-cost tiers.
- **Ionic Appflow Live Updates** — official but enterprise-priced (historically
  **~$500/mo+**). Overkill here.
- **Build your own** — host versioned `dist/` zips on Vercel/S3 and use the Capgo
  plugin pointed at your own URL; near-zero cost, more maintenance.

## Setup steps (Capgo cloud path)
1. `npm i @capgo/capacitor-updater`
2. Remove `server.url` from `capacitor.config.ts` (switch to bundled `webDir: 'dist'`).
3. `npm run build && npx cap sync ios`
4. `npx @capgo/cli login <API_KEY>` then `npx @capgo/cli app add com.bobbyvegasai.picks`
5. In app bootstrap, call `CapacitorUpdater.notifyAppReady()`; configure auto-update
   (check on app resume) to a **channel** (e.g. `production`).
6. Do one **native App Store release** of the bundled app (baseline that contains the
   updater).
7. CI on push to `main`: `npm run build` → `npx @capgo/cli bundle upload --channel production`.
   Thereafter JS/asset changes ship OTA; users get them on next resume.
8. Keep a staging channel + a rollback (Capgo supports reverting to a prior bundle).

## Apple guideline considerations
- **Allowed:** OTA updates that change **HTML/JS/CSS/assets** running in the Capacitor
  WebView are permitted — same basis as React Native CodePush / Expo updates.
  Guideline **3.3.1** permits executing downloaded interpreted code when it's served to
  the app's WebView/JS runtime and doesn't change the app's primary purpose; **2.5.2**
  bars downloading **native executable** code — so never OTA native plugins or binaries.
- **Don't change the app's core purpose or add un-reviewed "features/products" via OTA**
  (e.g. introducing real-money wagering) — that requires review and could trigger removal.
- Moving to a **bundled** app generally **improves** standing vs the current remote-URL
  wrapper on Guideline **4.2** (minimum functionality) because there's a real offline app.
- Still subject to **4.8** (Sign in with Apple) and **5.3** (gambling framing: keep it
  entertainment/analysis, age-gated as needed).

## Recommendation
If we stay on `server.url` remote, **no OTA tooling is needed** — Vercel is the update
channel. Adopt **Capgo (cloud, cheapest tier) with a bundled app** only when we want
offline support and to harden App Store compliance; budget ~1 day to wire it + 1 native
release to seed the updater.
