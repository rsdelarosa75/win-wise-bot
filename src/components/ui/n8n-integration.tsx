import { useState, useEffect, useRef } from "react";
import type { GameOdds } from "@/components/ui/live-odds";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Clock, CheckCircle, FileText, Bookmark, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePicks } from "@/hooks/use-picks";
import { toast as sonnerToast } from "sonner";

const cleanHtmlContent = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

// ── The Odds API: fetch lines for typed matchup before webhook ─────────
interface OddsApiGame {
  commence_time: string;
  away_team: string;
  home_team: string;
  bookmakers?: Array<{
    markets?: Array<{
      key: string;
      outcomes?: Array<{ name: string; price: number; point?: number }>;
    }>;
  }>;
}

// Known alternate names → canonical nickname (lowercase)
const TEAM_ALIASES: Record<string, string> = {
  "a's": "athletics",
  "oak": "athletics",
  "sac": "athletics",      // Sacramento Athletics
  "chisox": "white sox",
  "chi sox": "white sox",
  "sox": "sox",            // matches both Red Sox and White Sox via substring
  "la dodgers": "dodgers",
  "la angels": "angels",
  "la rams": "rams",
  "ny yankees": "yankees",
  "ny mets": "mets",
  "sf giants": "giants",
  "sf": "giants",
};

const normalizeTeamToken = (s: string): string => {
  const lower = s.toLowerCase().trim().replace(/\s+/g, " ");
  return TEAM_ALIASES[lower] ?? lower;
};

const teamMatchesUser = (apiFullName: string, userFragment: string) => {
  const a = normalizeTeamToken(apiFullName);
  const u = normalizeTeamToken(userFragment);
  if (!u || !a) return false;
  if (a === u) return true;
  if (a.includes(u) || u.includes(a)) return true;
  // Word-level fallback: every meaningful word in the user fragment appears in the API name
  // Use length > 1 (not > 2) so short but meaningful tokens like "A's" → "athletics" alias handles it
  const words = u.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return false;
  return words.every((w) => a.includes(w));
};

const parseMatchupTeams = (raw: string): [string, string] | null => {
  const t = raw.trim();
  if (!t) return null;
  const vs = t.split(/\s+vs\.?\s+/i);
  if (vs.length === 2 && vs[0].trim() && vs[1].trim()) {
    return [vs[0].trim(), vs[1].trim()];
  }
  const at = t.split(/\s+@\s+|\s+at\s+/i);
  if (at.length === 2 && at[0].trim() && at[1].trim()) {
    return [at[0].trim(), at[1].trim()];
  }
  return null;
};

const gameMatchesUserTeams = (game: OddsApiGame, u1: string, u2: string) =>
  (teamMatchesUser(game.away_team, u1) && teamMatchesUser(game.home_team, u2)) ||
  (teamMatchesUser(game.away_team, u2) && teamMatchesUser(game.home_team, u1));

const localYmd = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const extractMlSpread = (game: OddsApiGame) => {
  let awayMl = "N/A";
  let homeMl = "N/A";
  let awaySpr: string | null = null;
  let homeSpr: string | null = null;

  for (const bm of game.bookmakers ?? []) {
    const h2h = bm.markets?.find((m) => m.key === "h2h");
    if (h2h?.outcomes) {
      const h = h2h.outcomes.find((o) => o.name === game.home_team);
      const a = h2h.outcomes.find((o) => o.name === game.away_team);
      if (h && a) {
        homeMl = h.price > 0 ? `+${h.price}` : `${h.price}`;
        awayMl = a.price > 0 ? `+${a.price}` : `${a.price}`;
        break;
      }
    }
  }
  for (const bm of game.bookmakers ?? []) {
    const spreads = bm.markets?.find((m) => m.key === "spreads");
    if (spreads?.outcomes) {
      const h = spreads.outcomes.find((o) => o.name === game.home_team);
      const a = spreads.outcomes.find((o) => o.name === game.away_team);
      if (h?.point !== undefined && a?.point !== undefined) {
        homeSpr = h.point > 0 ? `+${h.point}` : `${h.point}`;
        awaySpr = a.point > 0 ? `+${a.point}` : `${a.point}`;
        break;
      }
    }
  }
  return { awayMl, homeMl, awaySpr, homeSpr };
};

const formatOddsForPayload = (game: OddsApiGame) => {
  const { awayMl, homeMl, awaySpr, homeSpr } = extractMlSpread(game);
  let s = `Moneyline: ${game.away_team} ${awayMl} / ${game.home_team} ${homeMl}`;
  if (awaySpr != null && homeSpr != null) {
    s += ` | Spread: ${game.away_team} ${awaySpr} / ${game.home_team} ${homeSpr}`;
  }
  return s;
};

const pickBestGame = (candidates: OddsApiGame[], targetDate: string): OddsApiGame | null => {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const onDate = candidates.filter((g) => localYmd(g.commence_time) === targetDate);
  const pool = onDate.length > 0 ? onDate : candidates;
  return [...pool].sort(
    (a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
  )[0];
};

/** Local calendar date for "yesterday" (back-to-back detection). */
const yesterdayLocalYmd = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayLocalYmd = () => {
  const d = new Date();
  return d.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
};


const resolveCanonicalTeam = (userTeam: string, matched: OddsApiGame | null): string => {
  if (!matched) return userTeam;
  if (teamMatchesUser(matched.away_team, userTeam)) return matched.away_team;
  if (teamMatchesUser(matched.home_team, userTeam)) return matched.home_team;
  return userTeam;
};

/** True if `team` appears in this game and tip-off falls on `ymd` (local). */
const teamPlayedOnLocalDate = (games: OddsApiGame[], team: string, ymd: string) =>
  games.some(
    (g) =>
      (teamMatchesUser(g.away_team, team) || teamMatchesUser(g.home_team, team)) &&
      localYmd(g.commence_time) === ymd
  );

/**
 * Uses Odds API scores (recent completed) + odds list (upcoming) to detect a game on yesterday's calendar.
 */
const computeBackToBack = (
  oddsGames: OddsApiGame[],
  scoresGames: OddsApiGame[],
  awayUser: string,
  homeUser: string,
  matchedGame: OddsApiGame | null
): string => {
  const y = yesterdayLocalYmd();
  const away = resolveCanonicalTeam(awayUser, matchedGame);
  const home = resolveCanonicalTeam(homeUser, matchedGame);
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const t of [away, home]) {
    const key = normalizeTeamToken(t);
    if (seen.has(key)) continue;
    seen.add(key);
    const played =
      teamPlayedOnLocalDate(scoresGames, t, y) || teamPlayedOnLocalDate(oddsGames, t, y);
    if (played) {
      parts.push(`${t} are on a back to back - played yesterday`);
    }
  }
  return parts.join(" ");
};

type MatchupOddsResult = {
  matchedGame: OddsApiGame | null;
  oddsPayload: string;
  backToBack: string;
  injuries: string;
  teamRecords: string;
};

/** ESPN /injuries team block */
interface EspnTeamInjuryBlock {
  displayName?: string;
  injuries?: Array<{
    status?: string;
    athlete?: { displayName?: string };
    details?: { type?: string; detail?: string };
  }>;
}

const INJURIES_ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";

/**
 * ESPN NBA injuries, filtered to the two matchup teams. Returns a single line for Bobby's webhook.
 */
async function fetchInjuryReport(awayTeam: string, homeTeam: string): Promise<string> {
  console.log("[Injuries] Fetching ESPN injury report");
  try {
    const res = await fetch(INJURIES_ESPN_URL);
    console.log("[Injuries] Response status:", res.status);

    const data: unknown = await res.json();
    console.log(
      "[Injuries] Raw (truncated):",
      JSON.stringify(data ?? null).slice(0, 500)
    );

    if (!res.ok) {
      console.log("[Injuries] Request failed (non-OK status)");
      return "No injury data available";
    }

    const blocks = (data as { injuries?: EspnTeamInjuryBlock[] })?.injuries ?? [];
    const matching = blocks.filter(
      (b) =>
        b.displayName &&
        (teamMatchesUser(b.displayName, awayTeam) ||
          teamMatchesUser(b.displayName, homeTeam))
    );

    console.log(
      "[Injuries] Matching team blocks:",
      matching.length,
      matching.map((m) => m.displayName)
    );

    if (matching.length === 0) {
      console.log("[Injuries] No ESPN team blocks matched away/home");
      return "No injury entries for these teams on ESPN.";
    }

    const parts: string[] = [];
    for (const block of matching) {
      const header = `${(block.displayName ?? "Team").toUpperCase()} INJURIES:`;
      const rows = (block.injuries ?? []).map((inj) => {
        const name = inj.athlete?.displayName ?? "Unknown";
        const status = inj.status ?? "Unknown";
        const typ =
          inj.details?.type ??
          inj.details?.detail ??
          "Unknown";
        return `${name} - ${status} - ${typ}`;
      });
      parts.push(
        rows.length > 0 ? `${header} ${rows.join("; ")}` : `${header} None listed`
      );
    }

    const out = parts.join(" | ");
    console.log("[Injuries] Formatted result:", out);
    return out;
  } catch (e) {
    console.log("[Injuries] Fetch error:", e);
    return "No injury data available";
  }
}

/**
 * Fetch probable starting pitchers for an MLB matchup from ESPN's scoreboard.
 * Returns a formatted string like "Away: Gerrit Cole | Home: Shane Bieber" or fallback.
 */
async function fetchMlbProbablePitchers(
  awayTeam: string,
  homeTeam: string,
  targetDate: string
): Promise<string> {
  try {
    const dateParam = targetDate.replace(/-/g, "");
    const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateParam}`;
    console.log("[MLB Pitchers] Fetching ESPN MLB scoreboard:", url);
    const res = await fetch(url);
    console.log("[MLB Pitchers] ESPN response status:", res.status);
    if (!res.ok) return "Probable pitchers unavailable";
    const data: unknown = await res.json();

    const events = (data as { events?: unknown[] })?.events ?? [];
    console.log("[MLB Pitchers] Total events on scoreboard:", events.length);
    console.log("[MLB Pitchers] All games:", events.map((e: any) => {
      const c = e.competitions?.[0];
      const away = c?.competitors?.find((x: any) => x.homeAway === "away")?.team?.displayName ?? "?";
      const home = c?.competitors?.find((x: any) => x.homeAway === "home")?.team?.displayName ?? "?";
      const probables = (c?.probables ?? []).map((p: any) => `${p.homeAway}: ${p.athlete?.displayName ?? "TBD"}`);
      return `${away} @ ${home} | probables: [${probables.join(", ") || "none"}]`;
    }));

    for (const event of events as Array<{
      competitions?: Array<{
        competitors?: Array<{ homeAway?: string; team?: { displayName?: string } }>;
        probables?: Array<{
          homeAway?: string;
          athlete?: { displayName?: string; shortName?: string };
        }>;
      }>;
    }>) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const competitors = comp.competitors ?? [];
      const away = competitors.find((c) => c.homeAway === "away");
      const home = competitors.find((c) => c.homeAway === "home");
      if (!away?.team?.displayName || !home?.team?.displayName) continue;

      if (
        !teamMatchesUser(away.team.displayName, awayTeam) &&
        !teamMatchesUser(home.team.displayName, awayTeam)
      ) continue;
      if (
        !teamMatchesUser(away.team.displayName, homeTeam) &&
        !teamMatchesUser(home.team.displayName, homeTeam)
      ) continue;

      const probables = comp.probables ?? [];
      console.log("[MLB Pitchers] Matched game:", away.team.displayName, "@", home.team.displayName);
      console.log("[MLB Pitchers] Raw probables array:", JSON.stringify(probables));
      const awayPitcher = probables.find((p) => p.homeAway === "away")?.athlete?.displayName ?? "TBD";
      const homePitcher = probables.find((p) => p.homeAway === "home")?.athlete?.displayName ?? "TBD";
      const result = `${away.team.displayName}: ${awayPitcher} | ${home.team.displayName}: ${homePitcher}`;
      console.log("[MLB Pitchers] Final result:", result);
      return result;
    }

    console.log("[MLB Pitchers] No matching game found for", awayTeam, "vs", homeTeam);
    return "Probable pitchers not yet announced";
  } catch (e) {
    console.log("[MLB Pitchers] Fetch error:", e);
    return "Probable pitchers unavailable";
  }
}

/**
 * Fetch MLB team records (overall/home/away, streak, runs/game, run differential)
 * via the same proxy pattern used for NBA records to avoid CORS.
 */
async function fetchMlbTeamRecords(awayTeam: string, homeTeam: string): Promise<string> {
  console.log("[MLB Records] Fetching direct from ESPN — away:", awayTeam, "| home:", homeTeam);
  try {
    const teamsRes = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams?limit=50"
    );
    if (!teamsRes.ok) return "No team record data available";
    const teamsData = await teamsRes.json();
    const teams: Array<{ id: string; displayName: string; shortDisplayName?: string; nickname?: string }> =
      teamsData.sports[0].leagues[0].teams.map((t: { team: unknown }) => t.team);

    const findTeam = (name: string) => {
      const lower = name.toLowerCase();
      return teams.find(
        (t) =>
          t.displayName.toLowerCase().includes(lower) ||
          lower.includes(t.displayName.toLowerCase()) ||
          t.shortDisplayName?.toLowerCase().includes(lower) ||
          t.nickname?.toLowerCase().includes(lower)
      );
    };

    const homeObj = findTeam(homeTeam);
    const awayObj = findTeam(awayTeam);
    console.log("[MLB Records] Matched teams — home:", homeObj?.displayName, "| away:", awayObj?.displayName);

    if (!homeObj || !awayObj) return "Team records unavailable";

    const [homeRes, awayRes] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${homeObj.id}`),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${awayObj.id}`),
    ]);
    const [homeData, awayData] = await Promise.all([homeRes.json(), awayRes.json()]);

    const formatRecord = (data: unknown, name: string): string => {
      const items = (data as { team?: { record?: { items?: Array<{ type?: string; summary?: string; stats?: Array<{ name?: string; value?: number }> }> } } })?.team?.record?.items ?? [];
      const overall = items.find((r) => r.type === "total") ?? items[0];
      const home    = items.find((r) => r.type === "home")  ?? items[1];
      const away    = items.find((r) => r.type === "road")  ?? items[2];
      if (!overall) return `${name}: Record unavailable`;
      const stats = overall.stats ?? [];
      const statVal = (key: string) => stats.find((s) => s.name === key)?.value;
      const streakRaw = statVal("streak");
      const streak =
        streakRaw === undefined ? "—"
        : streakRaw > 0 ? `W${Math.round(Math.abs(streakRaw))}`
        : streakRaw < 0 ? `L${Math.round(Math.abs(streakRaw))}`
        : "0";
      const rfStr   = statVal("avgPointsFor")     !== undefined ? statVal("avgPointsFor")!.toFixed(1)     : "—";
      const raStr   = statVal("avgPointsAgainst") !== undefined ? statVal("avgPointsAgainst")!.toFixed(1) : "—";
      const diff    = statVal("differential");
      const diffStr = diff !== undefined ? (diff >= 0 ? `+${Math.round(diff)}` : `${Math.round(diff)}`) : "—";
      return (
        `${name.toUpperCase()}: ${overall.summary ?? "—"} overall | ` +
        `${home?.summary ?? "—"} home | ${away?.summary ?? "—"} away | ` +
        `Streak: ${streak} | Runs: ${rfStr}/game scored, ${raStr}/game allowed | ` +
        `Run differential: ${diffStr}`
      );
    };

    const records = formatRecord(homeData, homeObj.displayName) + "\n" + formatRecord(awayData, awayObj.displayName);
    console.log("[MLB Records] Final records:\n", records);
    return records;
  } catch (err) {
    console.error("[MLB Records] ESPN fetch error:", err);
    return "No team record data available";
  }
}

const ESPN_NBA_TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";

type EspnTeamListEntry = { id: string; displayName: string };

function parseEspnNbaTeamList(data: unknown): EspnTeamListEntry[] {
  const sports = (data as {
    sports?: Array<{ leagues?: Array<{ teams?: Array<{ team?: { id?: string; displayName?: string } }> }> }>;
  })?.sports ?? [];
  const teams = sports[0]?.leagues?.[0]?.teams ?? [];
  const out: EspnTeamListEntry[] = [];
  for (const entry of teams) {
    const t = entry?.team;
    const id = t?.id != null ? String(t.id) : "";
    const displayName = t?.displayName;
    if (id && displayName) out.push({ id, displayName });
  }
  return out;
}

function findEspnTeamByUserFragment(
  teams: EspnTeamListEntry[],
  userFragment: string
): EspnTeamListEntry | null {
  for (const t of teams) {
    if (teamMatchesUser(t.displayName, userFragment)) return t;
  }
  return null;
}

function recordStatValue(
  stats: Array<{ name?: string; value?: number }> | undefined,
  name: string
): number | undefined {
  const s = stats?.find((x) => x.name === name);
  return s?.value;
}

function formatStreakFromStats(
  stats: Array<{ name?: string; value?: number }> | undefined
): string {
  const v = recordStatValue(stats, "streak");
  if (v === undefined || Number.isNaN(v)) return "—";
  const n = Math.round(Math.abs(v));
  if (v > 0) return `W${n}`;
  if (v < 0) return `L${n}`;
  return "0";
}

function formatOneTeamRecordLine(displayName: string, recordJson: unknown): string | null {
  const items = (recordJson as {
    team?: { record?: { items?: Array<{ summary?: string; stats?: Array<{ name?: string; value?: number }> }> } };
  })?.team?.record?.items ?? [];
  if (items.length < 3) return null;
  const overall = items[0]?.summary ?? "—";
  const home = items[1]?.summary ?? "—";
  const away = items[2]?.summary ?? "—";
  const stats0 = items[0]?.stats ?? [];
  const streak = formatStreakFromStats(stats0);
  const apf = recordStatValue(stats0, "avgPointsFor");
  const apa = recordStatValue(stats0, "avgPointsAgainst");
  const apfStr = apf !== undefined ? apf.toFixed(1) : "—";
  const apaStr = apa !== undefined ? apa.toFixed(1) : "—";
  const label = displayName.toUpperCase();
  return `${label}: ${overall} overall | ${home} home | ${away} away | Streak: ${streak} | Avg: ${apfStr} pts for / ${apaStr} pts against`;
}

async function fetchTeamRecords(awayTeam: string, homeTeam: string): Promise<string> {
  console.log("[NBA Records] Fetching direct from ESPN — away:", awayTeam, "| home:", homeTeam);
  try {
    const teamsRes = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50"
    );
    if (!teamsRes.ok) return "No team record data available";
    const teamsData = await teamsRes.json();
    const teams: Array<{ id: string; displayName: string }> =
      teamsData.sports[0].leagues[0].teams.map((t: { team: unknown }) => t.team);

    const findTeam = (name: string) => {
      const lower = name.toLowerCase();
      return teams.find(
        (t) =>
          t.displayName.toLowerCase().includes(lower) ||
          lower.includes(t.displayName.toLowerCase())
      );
    };

    const homeObj = findTeam(homeTeam);
    const awayObj = findTeam(awayTeam);
    console.log("[NBA Records] Matched — home:", homeObj?.displayName, "| away:", awayObj?.displayName);

    if (!homeObj || !awayObj) return "Team records unavailable";

    const [homeRes, awayRes] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${homeObj.id}`),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${awayObj.id}`),
    ]);
    const [homeData, awayData] = await Promise.all([homeRes.json(), awayRes.json()]);

    const formatRecord = (data: unknown, name: string): string => {
      const items = (data as { team?: { record?: { items?: Array<{ type?: string; summary?: string }> } } })
        ?.team?.record?.items ?? [];
      const overall = items.find((r) => r.type === "total") ?? items[0];
      const home    = items.find((r) => r.type === "home")  ?? items[1];
      const away    = items.find((r) => r.type === "road")  ?? items[2];
      if (!overall) return `${name}: Record unavailable`;
      return `${name}: ${overall.summary ?? "—"} overall | Home: ${home?.summary ?? "—"} | Away: ${away?.summary ?? "—"}`;
    };

    const records = formatRecord(homeData, homeObj.displayName) + "\n" + formatRecord(awayData, awayObj.displayName);
    console.log("[NBA Records] Final records:\n", records);
    return records;
  } catch (err) {
    console.error("[NBA Records] ESPN fetch error:", err);
    return "No team record data available";
  }
}


async function fetchMatchupOddsForWebhook(
  teamsValue: string,
  targetDate: string
): Promise<MatchupOddsResult> {
  const empty = (): MatchupOddsResult => ({
    matchedGame: null,
    oddsPayload: "",
    backToBack: "",
    injuries: "",
    teamRecords: "",
  });

  const apiKey = import.meta.env.VITE_ODDS_API_KEY as string | undefined;
  if (!apiKey?.trim()) {
    console.log("[N8nIntegration] Odds prefetch: missing VITE_ODDS_API_KEY");
    return empty();
  }

  const trimmed = teamsValue.trim();
  const pair = parseMatchupTeams(trimmed);
  if (!pair) {
    console.log("[N8nIntegration] Odds prefetch: could not parse teams from:", teamsValue);
    return empty();
  }

  const [awayTeam, homeTeam] = pair;
  const oddsUrl =
    "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?" +
    new URLSearchParams({
      apiKey: apiKey.trim(),
      regions: "us",
      markets: "h2h,spreads",
      oddsFormat: "american",
      dateFormat: "iso",
    });

  const yesterday = yesterdayLocalYmd().replace(/-/g, "");
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${yesterday}`;

  try {
    console.log("[B2B] Fetching ESPN scoreboard (yesterday)");
    const [oddsRes, espnRes, injuriesStr, teamRecordsStr] = await Promise.all([
      fetch(oddsUrl),
      fetch(espnUrl),
      fetchInjuryReport(awayTeam, homeTeam),
      fetchTeamRecords(awayTeam, homeTeam),
    ]);
    const oddsData: unknown = await oddsRes.json();
    const espnData: unknown = await espnRes.json();

    console.log("[B2B] ESPN response status:", espnRes.status);
    console.log(
      "[B2B] ESPN raw (truncated):",
      JSON.stringify(espnData ?? null).slice(0, 500)
    );
    console.log("[B2B] Yesterday date:", yesterdayLocalYmd());

    const espnEvents = (espnData as { events?: unknown[] })?.events ?? [];
    const scoresData: OddsApiGame[] = espnEvents.map((event: {
      date?: string;
      competitions?: Array<{
        competitors?: Array<{ homeAway?: string; team?: { displayName?: string } }>;
      }>;
    }) => {
      const competitors = event.competitions?.[0]?.competitors ?? [];
      const away = competitors.find((c) => c.homeAway === "away");
      const home = competitors.find((c) => c.homeAway === "home");
      return {
        commence_time: event.date ?? "",
        away_team: away?.team?.displayName ?? "",
        home_team: home?.team?.displayName ?? "",
      };
    });

    console.log(
      "[B2B] ESPN games:",
      scoresData.map((g) => `${g.away_team} @ ${g.home_team}`)
    );

    const scoresGames = scoresData;

    console.log("[N8nIntegration] Odds API full response:", oddsData);
    console.log(
      "[N8nIntegration] Back-to-back check: yesterday (local) =",
      yesterdayLocalYmd(),
      "| ESPN game rows:",
      scoresGames.length
    );

    if (!oddsRes.ok) {
      console.log("[N8nIntegration] Odds API HTTP error:", oddsRes.status, oddsData);
    }
    const games = Array.isArray(oddsData) ? (oddsData as OddsApiGame[]) : [];
    if (!Array.isArray(oddsData)) {
      console.log("[N8nIntegration] Odds API: expected games array, got:", typeof oddsData);
    }

    if (!oddsRes.ok || !Array.isArray(oddsData)) {
      const backToBackOnly = computeBackToBack(
        games,
        scoresGames,
        awayTeam,
        homeTeam,
        null
      );
      console.log("[B2B] Back to back result:", backToBackOnly);
      console.log("[N8nIntegration] backToBack (odds unavailable):", backToBackOnly || "(empty)");
      return {
        matchedGame: null,
        oddsPayload: "",
        backToBack: backToBackOnly,
        injuries: injuriesStr,
        teamRecords: teamRecordsStr,
      };
    }

    console.log(
      "Odds API games:",
      games.map((g) => g.away_team + " vs " + g.home_team)
    );
    console.log("Searching for:", awayTeam, "vs", homeTeam);

    const matches = games.filter(
      (g) =>
        g?.away_team &&
        g?.home_team &&
        gameMatchesUserTeams(g, awayTeam, homeTeam)
    );
    console.log("[N8nIntegration] Odds games matching teams:", matches.length);

    const matchedGame = pickBestGame(matches, targetDate);
    const oddsPayload = matchedGame ? formatOddsForPayload(matchedGame) : "";

    const backToBack = computeBackToBack(games, scoresGames, awayTeam, homeTeam, matchedGame);

    console.log("[B2B] Back to back result:", backToBack);
    console.log("Matched game:", matchedGame);
    console.log("Odds payload being sent:", oddsPayload);
    console.log("[N8nIntegration] backToBack:", backToBack || "(empty)");

    return {
      matchedGame,
      oddsPayload,
      backToBack,
      injuries: injuriesStr,
      teamRecords: teamRecordsStr,
    };
  } catch (e) {
    console.log("[N8nIntegration] Odds prefetch fetch error:", e);
    return empty();
  }
}

const isProcessingResponse = (rawText: string): boolean => {
  try {
    const data = JSON.parse(rawText);
    return (Array.isArray(data) ? data[0] : data)?.status === "processing";
  } catch {
    return false;
  }
};

// True when the response contains a real analysis (stop polling)
const isReadyResponse = (rawText: string): boolean => {
  if (!rawText || !rawText.trim()) return false;
  if (rawText.includes("MONEYLINE")) return true;
  try {
    const data = JSON.parse(rawText);
    const obj = Array.isArray(data) ? data[0] : data;
    if (obj?.analysis != null) return true;
    // Any non-processing JSON with meaningful text content counts
    const textContent =
      obj?.output ?? obj?.text ?? obj?.content ?? obj?.recommendation ?? obj?.result;
    return typeof textContent === "string" && textContent.trim().length > 20;
  } catch {
    // Plain text response long enough to be an analysis
    return rawText.trim().length > 20;
  }
};

const parseWebhookDisplayContent = (rawText: string): string => {
  try {
    const parsed = JSON.parse(rawText);
    const data = Array.isArray(parsed) ? parsed[0] : parsed;
    const messageContent =
      typeof data?.message === "object" && data?.message !== null
        ? data.message?.content ?? null
        : null;
    const textContent =
      data?.analysis ?? data?.output ?? data?.text ??
      messageContent ?? data?.content ?? data?.recommendation ??
      data?.result ?? null;
    if (typeof textContent === "string") return textContent;
    if (typeof textContent === "object" && textContent !== null)
      return JSON.stringify(textContent, null, 2);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return rawText;
  }
};

const formatGameOddsProp = (o: GameOdds): string => {
  let s = `Moneyline: ${o.team1} ${o.ml1} / ${o.team2} ${o.ml2}`;
  if (o.spread1 && o.spread2 && o.spread1 !== "N/A" && o.spread2 !== "N/A") {
    s += ` | Spread: ${o.team1} ${o.spread1} / ${o.team2} ${o.spread2}`;
  }
  return s;
};

// Extract a labelled field from analysis text, e.g. "CONFIDENCE: High"
const extractField = (text: string, ...keys: string[]): string | null => {
  for (const key of keys) {
    const re = new RegExp(`${key}\\s*[:\\-]\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    if (m) return m[1].replace(/\*\*/g, "").trim();
  }
  return null;
};

// ── Plain text renderer (replaces ReactMarkdown for Safari compat) ──
const renderInline = (raw: string) => {
  const parts = raw.split("**");
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
      : <span key={i}>{part}</span>
  );
};

const renderAnalysis = (text: string) => {
  if (!text) return null;
  return (
    <div className="text-sm leading-relaxed" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
      {text.split("\n").map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-2" />;
        const trimmed = line.trim();
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          return (
            <p key={idx} className="flex gap-1.5 mb-0.5">
              <span className="shrink-0 text-muted-foreground mt-0.5">•</span>
              <span>{renderInline(trimmed.replace(/^[-•]\s+/, ""))}</span>
            </p>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <p key={idx} className="flex gap-1.5 mb-0.5">
              <span className="shrink-0 text-muted-foreground">{numMatch[1]}.</span>
              <span>{renderInline(numMatch[2])}</span>
            </p>
          );
        }
        return <p key={idx} className="mb-1">{renderInline(line)}</p>;
      })}
    </div>
  );
};

type Sport = "NBA" | "MLB" | "WNBA" | "NHL" | "NFL";

const SPORT_CONFIG: Record<Sport, { webhookUrl: string }> = {
  NBA:  { webhookUrl: "https://eleven48ai.app.n8n.cloud/webhook/nba-picks"  },
  MLB:  { webhookUrl: "https://eleven48ai.app.n8n.cloud/webhook/mlb-picks"  },
  WNBA: { webhookUrl: "https://eleven48ai.app.n8n.cloud/webhook/wnba-picks" },
  NHL:  { webhookUrl: "https://eleven48ai.app.n8n.cloud/webhook/nhl-picks"  },
  NFL:  { webhookUrl: "https://eleven48ai.app.n8n.cloud/webhook/nfl-picks"  },
};

interface N8nIntegrationProps {
  sport?: Sport;
  pendingPick?: { teams: string; date: string; odds?: GameOdds; sport?: Sport } | null;
  onPendingPickConsumed?: () => void;
}

export const N8nIntegration = ({ sport = "NBA", pendingPick, onPendingPickConsumed }: N8nIntegrationProps = {}) => {
  // Ref always holds the latest sport so async closures never read a stale value
  const sportRef = useRef<Sport>(sport);
  sportRef.current = sport;

  const { user } = useAuth();
  const { savePick } = usePicks();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);
  const [briefContent, setBriefContent] = useState("");
  const [specificTeams, setSpecificTeams] = useState("");
  const [targetDate, setTargetDate] = useState(() => todayLocalYmd());
  const [pickSaved, setPickSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const LOADING_MESSAGES = [
    "Bobby is analyzing the odds...",
    "Checking the injury reports...",
    "Consulting the crystal ball...",
    "Running the numbers...",
  ];

  // Cycle loading messages every 2 seconds while waiting
  useEffect(() => {
    if (!isLoading) return;
    setLoadingMsgIdx(0);
    const interval = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Reset saved state whenever new content arrives
  useEffect(() => { setPickSaved(false); }, [briefContent]);

  // Core fetch logic — called from both form submit and auto-trigger
  const triggerFetch = async (teamsValue: string, dateValue: string, odds?: GameOdds, sportOverride?: Sport) => {
    console.log("[DEBUG] sportRef.current at fetch time:", sportRef.current);
    console.log("[DEBUG] sportOverride:", sportOverride);
    const currentSport = sportOverride ?? sportRef.current;
    const { webhookUrl: url } = SPORT_CONFIG[currentSport];
    console.log("[DEBUG] derived url:", url);

    console.group("[N8nIntegration] triggerFetch called");
    console.log("sport (ref):", currentSport);
    console.log("url (derived):", url);
    console.log("teams:", teamsValue, "| date:", dateValue);
    console.groupEnd();

    setIsLoading(true);

    try {
      const teams = teamsValue.trim() || "general recommendations";

      let oddsPayload = "";
      let sportPayload: Record<string, unknown> = {};

      if (currentSport === "NBA") {
        const result = await fetchMatchupOddsForWebhook(teamsValue, dateValue);
        oddsPayload = result.oddsPayload;
        if (!oddsPayload && odds) {
          oddsPayload = formatGameOddsProp(odds);
          console.log("[N8nIntegration] Using Live Odds card fallback for odds:", oddsPayload);
        }
        console.log("[BobbyVegas] apiInjuries:", result.injuries);
        sportPayload = {
          odds: oddsPayload,
          backToBack: result.backToBack,
          injuries: result.injuries,
          teamRecords: result.teamRecords,
        };
      } else if (currentSport === "MLB") {
        const pair = parseMatchupTeams(teamsValue.trim());
        const [awayTeam, homeTeam] = pair ?? [teamsValue.trim(), ""];
        if (odds) oddsPayload = formatGameOddsProp(odds);

        const [pitchers, mlbTeamRecords] = await Promise.all([
          fetchMlbProbablePitchers(awayTeam, homeTeam, dateValue),
          fetchMlbTeamRecords(awayTeam, homeTeam),
        ]);

        console.log("[MLB] Probable pitchers:", pitchers);
        console.log("[MLB] Team records:", mlbTeamRecords);

        // Build a fully-interpolated prompt so n8n workflows that inject
        // {{ $json.text }} pick up every data point without extra field mappings.
        const mlbPromptText = [
          `MLB BETTING ANALYSIS REQUEST — ${teams} — ${dateValue}`,
          ``,
          `STARTING PITCHERS (Factor #1 — most important):`,
          `${pitchers}`,
          ``,
          `TEAM RECORDS & STANDINGS:`,
          `${mlbTeamRecords}`,
          ...(oddsPayload ? [``, `CURRENT ODDS:`, `${oddsPayload}`] : []),
          ``,
          `ANALYSIS INSTRUCTIONS:`,
          `You are Bobby Vegas, an elite MLB betting analyst. Provide a structured pick for the matchup above.`,
          ``,
          `REQUIRED ANALYSIS ORDER:`,
          `1. STARTING PITCHER MATCHUP — This is the #1 factor. Analyze each pitcher's ERA, last 3-5 starts, K/9, WHIP, BB/9, and historical splits vs this opposing lineup. Who has the edge on the mound?`,
          `2. TEAM RECORDS & FORM — Use the records above. Which team is playing better baseball right now? Factor in home/away splits and current streak.`,
          `3. BULLPEN — Which bullpen is better rested and more reliable in the late innings?`,
          `4. OFFENSIVE MATCHUP — How does each lineup fare against the opposing starter's pitch mix and handedness?`,
          `5. PARK FACTORS & CONDITIONS — Is this a hitter's park or pitcher's park? Any weather factors affecting ball flight?`,
          ``,
          `DO NOT mention back-to-back games, rest days, pace of play, or any basketball-related metrics. This is baseball.`,
          ``,
          `Conclude with a clear BOBBY'S PICK, BET TYPE (moneyline / run line / total), CONFIDENCE (High/Medium/Low), and UNITS (1-5).`,
        ].join("\n");

        sportPayload = {
          ...(oddsPayload && { odds: oddsPayload }),
          probablePitchers: pitchers,
          teamRecords: mlbTeamRecords,
          text: mlbPromptText,
          prompt: mlbPromptText,
        };
      }

      const payload: Record<string, unknown> = {
        sport: currentSport,
        sports: [currentSport],
        teams,
        text: teams,          // overridden by sportPayload.text for MLB
        persona: "bobby_vegas",
        targetDate: dateValue,
        test: true,
        ...sportPayload,      // MLB sets text + prompt to the full interpolated prompt
      };

      const headers = { "Content-Type": "application/json", "Accept": "application/json" };
      const body = JSON.stringify(payload);

      console.group(`[N8nIntegration] ▶ ${currentSport} request`);
      console.log("URL:", url);
      console.log("Payload:", payload);
      console.groupEnd();

      // NBA responds in seconds; all other sports use a 180s timeout
      const controller = new AbortController();
      const timeoutId = currentSport !== "NBA"
        ? setTimeout(() => controller.abort(), 180_000)
        : null;

      let response: Response;
      try {
        response = await fetch(url, { method: "POST", headers, body, signal: controller.signal });
      } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
      }

      if (response.status === 403) throw new Error("403");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rawText = await response.text();
      console.group(`[N8nIntegration] ◀ Response`);
      console.log("Status:", response.status);
      console.log("Body:", rawText);
      console.groupEnd();

      setLastTriggered(new Date());
      toast({ title: "Bobby's pick is ready 🎲" });

      if (!rawText || !rawText.trim()) {
        setBriefContent(
          'Bobby returned an empty response. Make sure your n8n workflow has a "Respond to Webhook" node at the end.'
        );
        return;
      }

      const displayContent = parseWebhookDisplayContent(rawText);
      console.log("[N8nIntegration] Display content:", displayContent.slice(0, 200));

      const cleanContent = cleanHtmlContent(displayContent);
      setBriefContent(cleanContent);

      // Only save real Bobby Vegas analysis — never raw JSON or processing stubs.
      const isRealAnalysis = (text: string): boolean => {
        if (!text || text.trim().length < 50) return false;
        const lower = text.toLowerCase();
        if (lower.includes('"status"') || lower.includes('"jobid"') || lower.includes('"processing"')) return false;
        return /GAME:|PICK:|CONFIDENCE:|MONEYLINE|BOBBY'S PICK|BET TYPE/i.test(text);
      };

      // Push this pick to the Home screen's Bobby's Picks section
      if (isRealAnalysis(cleanContent)) {
        const pickText  = extractField(cleanContent, "BOBBY'S PICK", "Bobby's Pick", "Pick", "Recommendation", "BET", "My Pick");
        const oddsText  = extractField(cleanContent, "ODDS", "Current Odds", "Moneyline", "Line", "Spread");
        const confMatch = cleanContent.match(/CONFIDENCE[^:\n]*:\s*\*{0,2}(High|Medium|Low)\*{0,2}/i);
        const confNorm  = (confMatch ? confMatch[1] : "Medium") as "High" | "Medium" | "Low";
        const newAnalysis = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          command: "/webhook",
          teams: teamsValue.trim() || `${currentSport} Analysis`,
          persona: "bobby_vegas",
          analysis: cleanContent,
          confidence: confNorm,
          status: "win" as const,
          odds: oddsPayload || oddsText || null,
          sport: currentSport,
          recommendation: pickText ?? null,
        };
        // Purge any existing entries that contain raw JSON / processing stubs.
        const existing: unknown[] = JSON.parse(localStorage.getItem("webhook_analyses") ?? "[]");
        const updated = [newAnalysis, ...existing]
          .filter((a) => isRealAnalysis((a as { analysis?: string }).analysis ?? ""))
          .filter((a, i, arr) =>
            arr.findIndex((x) => (x as { id: string }).id === (a as { id: string }).id) === i
          )
          .slice(0, 10);
        localStorage.setItem("webhook_analyses", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("webhookAnalysisAdded", { detail: newAnalysis }));
        console.log("[N8nIntegration] Pick saved to history.");
      } else {
        console.warn("[N8nIntegration] Skipped saving — response does not look like real analysis:", cleanContent.slice(0, 100));
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: isAbort ? "Analysis timed out" : "Connection Error",
        description: isAbort
          ? "Bobby's analysis took longer than 3 minutes — try again 🎲"
          : msg === "403" || msg.includes("403")
          ? "Bobby's taking a timeout, try again in a moment 🎲"
          : msg.includes("Failed to fetch")
          ? "Could not reach Bobby's Engine. Check the URL."
          : msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-trigger when a game card is tapped from Live Odds
  const pendingPickRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingPick) return;
    const key = `${pendingPick.teams}|${pendingPick.date}`;
    if (pendingPickRef.current === key) return;
    pendingPickRef.current = key;
    setSpecificTeams(pendingPick.teams);
    setTargetDate(pendingPick.date);
    onPendingPickConsumed?.();
    triggerFetch(pendingPick.teams, pendingPick.date, pendingPick.odds, pendingPick.sport);
  }, [pendingPick]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerFetch(specificTeams, targetDate);
  };

  const handleSavePick = async () => {
    if (!user) {
      sonnerToast("Sign in to save picks");
      return;
    }

    setIsSaving(true);
    try {
      const teams = specificTeams.trim() || `${sportRef.current} Analysis`;
      const pick = extractField(
        briefContent,
        "BOBBY'S PICK", "Bobby's Pick", "Pick", "Recommendation", "BET", "My Pick"
      );
      const confidence = extractField(
        briefContent,
        "CONFIDENCE", "Confidence Level", "Confidence"
      );

      await savePick({
        teams,
        sport: sportRef.current,
        pick: pick ?? null,
        confidence: (confidence as "High" | "Medium" | "Low") ?? "High",
        analysis: briefContent,
        odds: extractField(briefContent, "ODDS", "Current Odds", "Line") ?? null,
        bet_type: extractField(briefContent, "BET TYPE", "Bet Type", "TYPE") ?? null,
      });

      setPickSaved(true);
      sonnerToast("Saved to Tracker! 🎲✅");
    } catch {
      sonnerToast("Failed to save pick. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form card */}
      <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="teams" className="text-sm font-medium">
              Teams / Matchup
            </Label>
            <Input
              id="teams"
              placeholder={
                sport === "MLB"  ? "e.g., Red Sox vs Yankees"  :
                sport === "WNBA" ? "e.g., Liberty vs Aces"     :
                sport === "NHL"  ? "e.g., Panthers vs Oilers"  :
                sport === "NFL"  ? "e.g., Chiefs vs Bills"      :
                                   "e.g., Lakers vs Warriors"
              }
              value={specificTeams}
              onChange={(e) => setSpecificTeams(e.target.value)}
              className="h-11 text-sm bg-background/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target-date" className="text-sm font-medium">
              Target Date
            </Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-11 text-sm bg-background/50"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] text-sm font-black text-black uppercase tracking-wide"
            style={{ backgroundColor: '#F5A100' }}
          >
            <Play className="mr-2 w-4 h-4" />
            {isLoading ? "Bobby's on it…" : "Get Bobby's Pick"}
          </Button>
        </form>

        {lastTriggered && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="w-3.5 h-3.5 text-win shrink-0" />
            Last run: {lastTriggered.toLocaleTimeString()}
          </div>
        )}
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card className="p-8 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <span className="text-6xl animate-bounce">
              {({ NBA: "🏀", MLB: "⚾", WNBA: "🏀", NHL: "🏒", NFL: "🏈" } as Record<string, string>)[sport] ?? "🎲"}
            </span>
            <p className="text-sm font-medium text-foreground/80 text-center transition-all duration-500">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
          </div>
        </Card>
      )}

      {/* Result card */}
      {briefContent && !isLoading && (
        <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-x-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base leading-none">
              {({ NBA: "🏀", MLB: "⚾", WNBA: "🏀", NHL: "🏒", NFL: "🏈" } as Record<string, string>)[sport] ?? "🎲"}
            </span>
            <h3 className="text-sm font-semibold">Bobby's Pick</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          {/* Analysis text */}
          <div className="bg-background/50 rounded-lg p-3 mb-4 w-full">
            {renderAnalysis(briefContent)}
          </div>

          {/* Save Pick button */}
          {user ? (
            <Button
              onClick={handleSavePick}
              disabled={pickSaved || isSaving}
              className="w-full min-h-[48px] font-bold text-black"
              style={{ backgroundColor: pickSaved ? undefined : '#F5A100' }}
              variant={pickSaved ? "outline" : "default"}
            >
              {pickSaved ? (
                <>
                  <Check className="mr-2 w-4 h-4 text-win" />
                  <span className="text-win">Saved to Tracker!</span>
                </>
              ) : isSaving ? (
                <>
                  <Clock className="mr-2 w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 w-4 h-4" />
                  Save Pick 🎲
                </>
              )}
            </Button>
          ) : (
            <div className="w-full min-h-[44px] flex items-center justify-center rounded-lg border border-border/50 bg-secondary/30">
              <p className="text-xs text-center text-muted-foreground">
                <span className="text-primary font-semibold">Sign in</span> to save picks to your Tracker
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
