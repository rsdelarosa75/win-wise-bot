/**
 * Betty Vegas — AI Sports Picks
 * App fork configuration. Drop this file as the config layer for a Betty Vegas
 * white-label build. Swap branding, persona prompt, sport priorities, and DB prefix.
 *
 * "Wanna lose money? Bet like a guy. Wanna win big? Bet like Betty Vegas."
 */

export const BETTY_CONFIG = {
  // ── Identity ───────────────────────────────────────────────────────────────
  appName:    "Betty Vegas — AI Sports Picks",
  shortName:  "Betty Vegas",
  tagline:    "Wanna lose money? Bet like a guy. Wanna win big? Bet like Betty Vegas.",
  mascotEmoji: "💅",
  appStoreId: null, // set when submitted as separate app

  // ── Color scheme ───────────────────────────────────────────────────────────
  colors: {
    background:   "#0A0A0A",
    backgroundAlt: "#0f0c0b",
    primary:      "#E8B4A0",   // Rose gold — replaces Bobby's #F5A100 gold
    primaryDark:  "#c4906b",
    primaryLight: "#f0cabb",
    accent:       "#d4a0a0",
    cardBg:       "#141010",
    border:       "rgba(232,180,160,0.2)",
    success:      "#22c55e",
    danger:       "#ef4444",
  },

  // ── CSS variable overrides (paste into tailwind.config.js / global.css) ───
  cssVars: {
    "--primary":          "22 45% 76%",   // rose gold in HSL
    "--primary-foreground": "0 0% 5%",
    "--accent":           "10 40% 72%",
    "--ring":             "22 45% 76%",
  },

  // ── Sport priorities ───────────────────────────────────────────────────────
  // Listed in order of display prominence in Betty Vegas
  primarySports: ["WNBA", "Tennis", "Soccer"],
  allSports:     ["WNBA", "Tennis", "Soccer", "MLB", "NHL", "NBA", "NFL", "NCAAFB"],

  // ── Webhook paths (all prefixed betty-) ───────────────────────────────────
  webhooks: {
    WNBA:   "https://eleven48ai.app.n8n.cloud/webhook/betty-wnba-picks",
    Tennis: "https://eleven48ai.app.n8n.cloud/webhook/betty-tennis-picks",
    Soccer: "https://eleven48ai.app.n8n.cloud/webhook/betty-soccer-picks",
    MLB:    "https://eleven48ai.app.n8n.cloud/webhook/betty-mlb-picks",
    NHL:    "https://eleven48ai.app.n8n.cloud/webhook/betty-nhl-picks",
    NBA:    "https://eleven48ai.app.n8n.cloud/webhook/betty-nba-picks",
    NFL:    "https://eleven48ai.app.n8n.cloud/webhook/betty-nfl-picks",
    NCAAFB: "https://eleven48ai.app.n8n.cloud/webhook/betty-ncaafb-picks",
  },

  // ── Supabase table prefix ──────────────────────────────────────────────────
  // All tables use betty_ prefix: betty_picks, betty_saved_picks, betty_profiles, etc.
  supabasePrefix: "betty_",

  // ── AI Persona Prompt ──────────────────────────────────────────────────────
  // Replaces Bobby Vegas system prompt in all N8N workflows
  systemPrompt: `You are Betty Vegas — the sharpest AI sports bettor on the planet.

You're sharp, witty, and three steps ahead of the market. You specialize in WNBA, Tennis, and Soccer — sports that the male-dominated betting market systematically underanalyzes, creating real edges.

Your personality:
- Confident but precise — you never hedge when you have conviction
- You call out lazy analysis and overreacted public lines
- You have a dry wit: "The boys bet the chalk. Betty fades it."
- You respect the numbers and the tape equally
- You're not anti-man, you're pro-sharp. The edge doesn't have a gender.

Your betting philosophy:
- Find markets that recreational bettors (mostly male) ignore or misvalue
- WNBA is chronically underanalyzed — that's your bread and butter
- Tennis surfaces and fatigue scheduling create consistent edges
- Soccer xG models are underutilized in American sportsbooks

Format your picks:
BETTY'S PICK: [selection]
BEST BET: [specific bet type + line]
CONFIDENCE: High / Medium / Low
THE EDGE: [one sharp sentence on why this is a value play]
FADE IF: [the one thing that would change your pick]`,

  // ── Cron / daily picks Telegram message header ─────────────────────────────
  telegramHeader: "💅 Betty Vegas Daily Picks",

  // ── App Store metadata ─────────────────────────────────────────────────────
  appStore: {
    name:        "Betty Vegas — AI Sports Picks",
    subtitle:    "Sharp. Feminine. Data-driven.",
    description:
      "Betty Vegas is the AI sports bettor built for fans who are tired of chalk and bad angles. " +
      "Specializing in WNBA, Tennis, and Soccer — the markets the boys skip — Betty finds value " +
      "where the market is lazy. Sharp picks. Rose gold attitude.",
    keywords:    ["sports betting", "WNBA picks", "tennis picks", "soccer picks", "AI bettor", "Betty Vegas"],
    category:    "Sports",
    ageRating:   "17+",
  },

  // ── Feature flags (what differs from Bobby Vegas) ─────────────────────────
  features: {
    edgeFinder:       true,
    paywall:          true,
    avatarSelection:  false,  // Betty is a single persona
    antiParlayNudge:  true,
    performanceDash:  true,
    telegramBot:      true,
    kalshiEdge:       true,
    polymarketEdge:   true,   // Betty gets Polymarket too
  },
};

export default BETTY_CONFIG;
