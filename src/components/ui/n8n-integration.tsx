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

const normalizeTeamToken = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, " ");

const teamMatchesUser = (apiFullName: string, userFragment: string) => {
  const a = normalizeTeamToken(apiFullName);
  const u = normalizeTeamToken(userFragment);
  if (!u || !a) return false;
  if (a === u) return true;
  if (a.includes(u) || u.includes(a)) return true;
  const words = u.split(/\s+/).filter((w) => w.length > 2);
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
};

/** Local calendar YYYY-MM-DD (matches <input type="date"> and localYmd on game times). */
const todayLocalYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Fetches NBA odds from The Odds API, fuzzy-matches the typed matchup, formats Moneyline | Spread.
 */
async function fetchMatchupOddsForWebhook(
  teamsValue: string,
  targetDate: string
): Promise<MatchupOddsResult> {
  const empty = (): MatchupOddsResult => ({
    matchedGame: null,
    oddsPayload: "",
    backToBack: "",
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

  const scoresUrl =
    "https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?" +
    new URLSearchParams({
      apiKey: apiKey.trim(),
      daysFrom: "3",
      dateFormat: "iso",
    });

  try {
    const [oddsRes, scoresRes] = await Promise.all([fetch(oddsUrl), fetch(scoresUrl)]);
    const oddsData: unknown = await oddsRes.json();
    const scoresData: unknown = await scoresRes.json();

    console.log("[N8nIntegration] Odds API full response:", oddsData);
    console.log("[N8nIntegration] Scores API (recent games):", scoresData);

    const scoresGames = Array.isArray(scoresData) ? (scoresData as OddsApiGame[]) : [];
    console.log(
      "[N8nIntegration] Back-to-back check: yesterday (local) =",
      yesterdayLocalYmd(),
      "| score rows:",
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
      console.log("[N8nIntegration] backToBack (odds unavailable):", backToBackOnly || "(empty)");
      return {
        matchedGame: null,
        oddsPayload: "",
        backToBack: backToBackOnly,
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

    console.log("Matched game:", matchedGame);
    console.log("Odds payload being sent:", oddsPayload);
    console.log("[N8nIntegration] backToBack:", backToBack || "(empty)");

    return { matchedGame, oddsPayload, backToBack };
  } catch (e) {
    console.log("[N8nIntegration] Odds prefetch fetch error:", e);
    return empty();
  }
}

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

interface N8nIntegrationProps {
  pendingPick?: { teams: string; date: string; odds?: GameOdds } | null;
  onPendingPickConsumed?: () => void;
}

export const N8nIntegration = ({ pendingPick, onPendingPickConsumed }: N8nIntegrationProps = {}) => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_NBA || "";
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
  const triggerFetch = async (teamsValue: string, dateValue: string, odds?: GameOdds) => {
    if (!webhookUrl) {
      toast({
        title: "Not configured",
        description: "VITE_N8N_WEBHOOK_NBA is not set.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const teams = teamsValue.trim() || "general recommendations";

      const { oddsPayload: apiOddsPayload, backToBack: apiBackToBack } =
        await fetchMatchupOddsForWebhook(teamsValue, dateValue);
      let oddsPayload = apiOddsPayload;
      if (!oddsPayload && odds) {
        oddsPayload = formatGameOddsProp(odds);
        console.log(
          "[N8nIntegration] Using Live Odds card fallback for odds:",
          oddsPayload
        );
      }

      const payload: Record<string, unknown> = {
        sport: "NBA",
        sports: ["NBA"],
        teams,
        text: teams,
        persona: "bobby_vegas",
        targetDate: dateValue,
        test: true,
        odds: oddsPayload,
        backToBack: apiBackToBack,
      };

      console.log(
        "[N8nIntegration] N8N webhook POST body:",
        JSON.stringify(payload)
      );

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 403) throw new Error("403");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rawText = await response.text();
      console.log("[N8nIntegration] Response status:", response.status);
      console.log("[N8nIntegration] Response body:", rawText);

      setLastTriggered(new Date());
      toast({ title: "Bobby's pick is ready 🎲" });

      if (!rawText || rawText.trim().length === 0) {
        setBriefContent(
          'Bobby returned an empty response. Make sure your n8n workflow has a "Respond to Webhook" node at the end.'
        );
        return;
      }

      let displayContent = rawText;
      try {
        const parsed = JSON.parse(rawText);
        console.log("[N8nIntegration] Parsed JSON:", parsed);
        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        // Handle OpenAI-style response: { message: { role, content } }
        const messageContent = typeof data?.message === 'object' && data?.message !== null
          ? data.message?.content ?? null
          : null;
        const textContent =
          data?.analysis ?? data?.output ?? data?.text ??
          messageContent ?? data?.content ?? data?.recommendation ??
          data?.result ?? null;

        if (typeof textContent === "string") {
          displayContent = textContent;
        } else if (typeof textContent === "object" && textContent !== null) {
          displayContent = JSON.stringify(textContent, null, 2);
        } else {
          displayContent = JSON.stringify(parsed, null, 2);
        }
      } catch {
        console.log("[N8nIntegration] Not JSON — showing raw text as-is");
      }

      const cleanContent = cleanHtmlContent(displayContent);
      setBriefContent(cleanContent);

      // Push this pick to the Home screen's Bobby's Picks section
      const pickText  = extractField(cleanContent, "BOBBY'S PICK", "Bobby's Pick", "Pick", "Recommendation", "BET", "My Pick");
      const oddsText  = extractField(cleanContent, "ODDS", "Current Odds", "Moneyline", "Line", "Spread");
      const confMatch = cleanContent.match(/CONFIDENCE[^:\n]*:\s*\*{0,2}(High|Medium|Low)\*{0,2}/i);
      const confNorm  = (confMatch ? confMatch[1] : "Medium") as "High" | "Medium" | "Low";
      const newAnalysis = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        command: "/webhook",
        teams: teamsValue.trim() || "NBA Analysis",
        persona: "bobby_vegas",
        analysis: cleanContent,
        confidence: confNorm,
        status: "win" as const,
        odds: oddsPayload || oddsText || null,
        sport: "NBA",
        recommendation: pickText ?? null,
      };
      const existing: unknown[] = JSON.parse(localStorage.getItem("webhook_analyses") ?? "[]");
      const updated = [newAnalysis, ...existing]
        .filter((a, i, arr) =>
          arr.findIndex((x) => (x as { id: string }).id === (a as { id: string }).id) === i
        )
        .slice(0, 10);
      localStorage.setItem("webhook_analyses", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("webhookAnalysisAdded", { detail: newAnalysis }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Connection Error",
        description:
          msg === "403" || msg.includes("403")
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
    triggerFetch(pendingPick.teams, pendingPick.date, pendingPick.odds);
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
      const teams = specificTeams.trim() || "NBA Analysis";
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
        sport: "NBA",
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
              placeholder="e.g., Lakers vs Warriors"
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
            <span className="text-6xl animate-bounce">🎲</span>
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
            <FileText className="w-4 h-4 text-neutral shrink-0" />
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
