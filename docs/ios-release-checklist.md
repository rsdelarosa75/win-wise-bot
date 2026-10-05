# iOS Release Checklist — Bobby Vegas (`com.bobbyvegasai.picks`)

> **Read this first — how the app loads.** `capacitor.config.ts` sets
> `server.url = https://win-wise-bot.vercel.app`. The iOS app is a Capacitor shell
> that **loads the live Vercel web app at runtime**. Consequences:
>
> - **Frontend / JS / UI / workflow-prompt changes ship via a Vercel deploy** and
>   reach iOS automatically on the next app launch. **No Xcode rebuild, no TestFlight,
>   no App Store submission** for those.
> - **A native rebuild (below) is only needed when native code changes:** a Capacitor
>   plugin added/updated, `capacitor.config.ts`, app icon/splash, `Info.plist`
>   permissions, the bundle id, the marketing/build version, or the `server.url`
>   target itself.
>
> So the recent date-shift fix needs **only a Vercel deploy** — skip to "Web deploy".

---

## Web deploy (covers most changes, including iOS content)

1. Merge/push to `main`.
2. Confirm the Vercel deployment for the new commit is **Ready** (Vercel dashboard →
   Deployments → match the commit SHA). If GitHub auto-deploy isn't enabled:
   `vercel --prod` from the repo root (or "Redeploy" in the dashboard).
3. In the iOS app, pull-to-refresh or relaunch — it reloads the new Vercel bundle.

## Native release (only for native/plugin/version changes)

Prereqs: macOS, Xcode (current), CocoaPods, an Apple Developer account with access to
the `com.bobbyvegasai.picks` App Store Connect record.

1. **Build web assets** (used by native plugins / fallback):
   ```
   npm ci
   npm run build        # vite build -> dist/
   ```
2. **Sync to iOS:**
   ```
   npx cap sync ios     # copies web + native plugins, installs pods
   ```
3. **Open in Xcode:**
   ```
   npx cap open ios     # opens ios/App/App.xcworkspace
   ```
4. **Version bump** (Xcode → target **App** → General):
   - **Version** (CFBundleShortVersionString, e.g. `1.4.0`) — bump for a user-facing release.
   - **Build** (CFBundleVersion, e.g. `16`) — must be **higher than the last uploaded build**
     (App Store Connect rejects duplicates; history shows builds up to 15).
5. **Signing** (Signing & Capabilities): Team set, "Automatically manage signing" on,
   provisioning profile resolves. Confirm **Sign in with Apple** capability is present
   (required since the 4.8 rejection remediation).
6. **Select device:** target **Any iOS Device (arm64)** (not a simulator).
7. **Archive:** Product ▸ Archive. When the Organizer opens, select the archive ▸
   **Distribute App** ▸ **App Store Connect** ▸ **Upload**.
8. **Processing:** wait for App Store Connect → TestFlight to finish processing the build
   (a few minutes to ~1 hour).

### Ship to testers WITHOUT a full App Store review
- **TestFlight — Internal testing:** add the build to an internal group (up to 100 of
  your own team). Available **immediately after processing, no App Store review**.
- **TestFlight — External testing:** needs a one-time **Beta App Review** (usually < 24h),
  lighter than a full release review.

### Full public release (App Store review required)
1. App Store Connect → the app → **(+) Version**, set the version string.
2. Attach the processed build, update "What's New", screenshots if changed.
3. **Submit for Review.** Typical review ~24–48h. Required only for public release.

## Pre-submit gotchas (Bobby Vegas specific)
- **Guideline 4.2 / 4.7 (web wrapper):** because the app loads a remote URL, Apple can
  flag "minimum functionality." Keep native value present (Sign in with Apple, Share,
  Preferences) and ensure the experience isn't just a website.
- **Guideline 4.8 (Sign in with Apple):** must remain available wherever third-party
  sign-in is offered (this caused a prior rejection).
- **`allowNavigation: ['*']`** is broad — Apple may ask about external navigation; scope
  it down if questioned.
- Gambling-adjacent content: ensure age gating / "entertainment only" framing per
  Guideline 5.3 if reviewers raise it.
