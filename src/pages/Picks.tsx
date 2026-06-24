import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, RefreshCw, TrendingUp } from "lucide-react";
import { N8nIntegration } from "@/components/ui/n8n-integration";
import { Card } from "@/components/ui/card";
import type { GameOdds } from "@/components/ui/live-odds";

const SUPABASE_URL = "https://mocdziwqxbvjibylqxoz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2R6aXdxeGJ2amlieWxxeG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzU3MzUsImV4cCI6MjA4Njk1MTczNX0.2nRMRP55DYk8a5WRdK6NHTn4fADmiGH99kqbWo2TquI";

type Sport = "Soccer" | "NHL" | "WNBA" | "MLB" | "NFL" | "NCAAFB" | "NBA" | "F1";

const SPORT_EMOJIS: Record<string, string> = {
  NBA: "🏀", WNBA: "🏀", NHL: "🏒", NFL: "🏈", NCAAFB: "🏈", Soccer: "⚽", MLB: "⚾", F1: "🏎️",
};

interface KalshiMarket {
  ticker: string;
  title: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  yes_bid_dollars?: string;
  no_bid_dollars?: string;
  volume_fp?: string | number;
}

interface CacheRow {
  sport: string;
  data: { markets?: KalshiMarket[] };
  updated_at: string;
}

interface EdgeItem {
  sport: string;
  ticker: string;
  yesTeam: string;
  noTeam: string;
  yesProb: number;
  noProb: number;
  edgeScore: number;
  volume: number;
  drawProb?: number;
}

const WNBA_TEAMS: Record<string, string> = {
  'Atlanta': 'Atlanta Dream',
  'Chicago': 'Chicago Sky',
  'Connecticut': 'Connecticut Sun',
  'Dallas': 'Dallas Wings',
  'Golden State': 'Golden State Valkyries',
  'Indiana': 'Indiana Fever',
  'Las Vegas': 'Las Vegas Aces',
  'Los Angeles': 'Los Angeles Sparks',
  'Minnesota': 'Minnesota Lynx',
  'New York': 'New York Liberty',
  'Phoenix': 'Phoenix Mercury',
  'Portland': 'Portland Fire',
  'Seattle': 'Seattle Storm',
  'Toronto': 'Toronto Tempo',
  'Washington': 'Washington Mystics',
};

const NBA_TEAMS: Record<string, string> = {
  'Atlanta': 'Atlanta Hawks', 'Boston': 'Boston Celtics', 'Brooklyn': 'Brooklyn Nets',
  'Charlotte': 'Charlotte Hornets', 'Chicago': 'Chicago Bulls', 'Cleveland': 'Cleveland Cavaliers',
  'Dallas': 'Dallas Mavericks', 'Denver': 'Denver Nuggets', 'Detroit': 'Detroit Pistons',
  'Golden State': 'Golden State Warriors', 'Houston': 'Houston Rockets', 'Indiana': 'Indiana Pacers',
  'LA Clippers': 'LA Clippers', 'Los Angeles': 'Los Angeles Lakers', 'Memphis': 'Memphis Grizzlies',
  'Miami': 'Miami Heat', 'Milwaukee': 'Milwaukee Bucks', 'Minnesota': 'Minnesota Timberwolves',
  'New Orleans': 'New Orleans Pelicans', 'New York': 'New York Knicks', 'Oklahoma City': 'Oklahoma City Thunder',
  'Orlando': 'Orlando Magic', 'Philadelphia': 'Philadelphia 76ers', 'Phoenix': 'Phoenix Suns',
  'Portland': 'Portland Trail Blazers', 'Sacramento': 'Sacramento Kings', 'San Antonio': 'San Antonio Spurs',
  'Toronto': 'Toronto Raptors', 'Utah': 'Utah Jazz', 'Washington': 'Washington Wizards',
};

const NHL_TEAMS: Record<string, string> = {
  'Anaheim': 'Anaheim Ducks', 'Boston': 'Boston Bruins', 'Buffalo': 'Buffalo Sabres',
  'Calgary': 'Calgary Flames', 'Carolina': 'Carolina Hurricanes', 'Chicago': 'Chicago Blackhawks',
  'Colorado': 'Colorado Avalanche', 'Columbus': 'Columbus Blue Jackets', 'Dallas': 'Dallas Stars',
  'Detroit': 'Detroit Red Wings', 'Edmonton': 'Edmonton Oilers', 'Florida': 'Florida Panthers',
  'Los Angeles': 'Los Angeles Kings', 'Minnesota': 'Minnesota Wild', 'Montreal': 'Montreal Canadiens',
  'Nashville': 'Nashville Predators', 'New Jersey': 'New Jersey Devils', 'NY Islanders': 'New York Islanders',
  'NY Rangers': 'New York Rangers', 'New York': 'New York Rangers', 'Ottawa': 'Ottawa Senators',
  'Philadelphia': 'Philadelphia Flyers', 'Pittsburgh': 'Pittsburgh Penguins', 'San Jose': 'San Jose Sharks',
  'Seattle': 'Seattle Kraken', 'St. Louis': 'St. Louis Blues', 'Tampa Bay': 'Tampa Bay Lightning',
  'Toronto': 'Toronto Maple Leafs', 'Utah': 'Utah Hockey Club', 'Vancouver': 'Vancouver Canucks',
  'Vegas': 'Vegas Golden Knights', 'Washington': 'Washington Capitals', 'Winnipeg': 'Winnipeg Jets',
};

const MLB_TEAMS: Record<string, string> = {
  'Arizona': 'Arizona Diamondbacks', 'Atlanta': 'Atlanta Braves', 'Baltimore': 'Baltimore Orioles',
  'Boston': 'Boston Red Sox', 'Chicago Cubs': 'Chicago Cubs', 'Chicago': 'Chicago White Sox',
  'Cincinnati': 'Cincinnati Reds', 'Cleveland': 'Cleveland Guardians', 'Colorado': 'Colorado Rockies',
  'Detroit': 'Detroit Tigers', 'Houston': 'Houston Astros', 'Kansas City': 'Kansas City Royals',
  'Los Angeles Dodgers': 'Los Angeles Dodgers', 'Los Angeles': 'Los Angeles Angels',
  'Miami': 'Miami Marlins', 'Milwaukee': 'Milwaukee Brewers', 'Minnesota': 'Minnesota Twins',
  'New York Mets': 'New York Mets', 'New York': 'New York Yankees', 'Oakland': 'Oakland Athletics',
  'Philadelphia': 'Philadelphia Phillies', 'Pittsburgh': 'Pittsburgh Pirates', 'San Diego': 'San Diego Padres',
  'San Francisco': 'San Francisco Giants', 'Seattle': 'Seattle Mariners', 'St. Louis': 'St. Louis Cardinals',
  'Tampa Bay': 'Tampa Bay Rays', 'Texas': 'Texas Rangers', 'Toronto': 'Toronto Blue Jays',
  'Washington': 'Washington Nationals',
};

const NFL_TEAMS: Record<string, string> = {
  'Arizona': 'Arizona Cardinals', 'Atlanta': 'Atlanta Falcons', 'Baltimore': 'Baltimore Ravens',
  'Buffalo': 'Buffalo Bills', 'Carolina': 'Carolina Panthers', 'Chicago': 'Chicago Bears',
  'Cincinnati': 'Cincinnati Bengals', 'Cleveland': 'Cleveland Browns', 'Dallas': 'Dallas Cowboys',
  'Denver': 'Denver Broncos', 'Detroit': 'Detroit Lions', 'Green Bay': 'Green Bay Packers',
  'Houston': 'Houston Texans', 'Indianapolis': 'Indianapolis Colts', 'Jacksonville': 'Jacksonville Jaguars',
  'Kansas City': 'Kansas City Chiefs', 'Las Vegas': 'Las Vegas Raiders',
  'Los Angeles Chargers': 'Los Angeles Chargers', 'Los Angeles Rams': 'Los Angeles Rams', 'Los Angeles': 'Los Angeles Rams',
  'Miami': 'Miami Dolphins', 'Minnesota': 'Minnesota Vikings', 'New England': 'New England Patriots',
  'New Orleans': 'New Orleans Saints', 'New York Giants': 'New York Giants', 'New York Jets': 'New York Jets', 'New York': 'New York Jets',
  'Philadelphia': 'Philadelphia Eagles', 'Pittsburgh': 'Pittsburgh Steelers',
  'San Francisco': 'San Francisco 49ers', 'Seattle': 'Seattle Seahawks',
  'Tampa Bay': 'Tampa Bay Buccaneers', 'Tennessee': 'Tennessee Titans', 'Washington': 'Washington Commanders',
};

const SPORT_TEAM_MAP: Record<string, Record<string, string>> = {
  WNBA: WNBA_TEAMS, NBA: NBA_TEAMS, NHL: NHL_TEAMS, MLB: MLB_TEAMS, NFL: NFL_TEAMS,
};

function cleanTeamName(name: string): string {
  return name
    .replace(/\s+pro football game\??/gi, '')
    .replace(/\s+winner\??/gi, '')
    .replace(/\s+wins\??/gi, '')
    .replace(/[?!.,]+$/, '')
    .trim();
}

function expandTeamName(city: string, sport: string): string {
  const map = SPORT_TEAM_MAP[sport];
  return map?.[city] ?? city;
}

// Kalshi-implied odds, used only as a fallback when the real Odds API has no
// matching game — N8nIntegration prefers genuine sportsbook lines when available.
function kalshiProbToAmericanOdds(probPercent: number): string {
  const p = probPercent / 100;
  if (p <= 0 || p >= 1) return 'N/A';
  const odds = p > 0.5
    ? Math.round(-(p / (1 - p)) * 100)
    : Math.round(((1 - p) / p) * 100);
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function parseNoTeamFromTitle(title: string, yesTeam: string): string {
  const match = title.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s+winner[?!]?)?$/i);
  if (!match) return "";
  const t1 = match[1].trim();
  const t2 = match[2].trim();
  const yL = yesTeam.toLowerCase();
  const firstWord = yL.split(" ").find((w) => w.length > 3) ?? yL;
  return cleanTeamName(t1.toLowerCase().includes(firstWord) ? t2 : t1);
}

function buildEdgeItem(sport: string, m: KalshiMarket, yes: number): EdgeItem | null {
  const no = parseFloat(m.no_bid_dollars ?? "0");
  const yesTeam = cleanTeamName(m.yes_sub_title!.trim());
  let noTeam    = cleanTeamName((m.no_sub_title ?? "").trim());
  if (!noTeam || noTeam === yesTeam) noTeam = parseNoTeamFromTitle(m.title, yesTeam);
  if (!noTeam || noTeam === yesTeam) return null;

  const yesProb   = Math.round(yes * 1000) / 10;
  const noProb    = no > 0 ? Math.round(no * 1000) / 10 : Math.round((1 - yes) * 1000) / 10;
  const edgeScore = Math.round(Math.abs(yes - 0.5) * 1000) / 10;
  const volume    = parseFloat(String(m.volume_fp ?? "0")) || 0;

  return { sport, ticker: m.ticker, yesTeam, noTeam, yesProb, noProb, edgeScore, volume };
}

function parseEdges(rows: CacheRow[]): EdgeItem[] {
  const edges: EdgeItem[] = [];
  // Soccer markets carry 3 outcomes (team1 win / team2 win / draw) under one
  // shared title, so they need to be grouped per-title rather than per-row.
  const soccerByTitle = new Map<string, { market: KalshiMarket; yes: number }[]>();

  for (const row of rows) {
    for (const m of row.data?.markets ?? []) {
      if (!m.yes_bid_dollars || !m.yes_sub_title) continue;
      const yes = parseFloat(m.yes_bid_dollars);
      if (isNaN(yes) || yes <= 0 || yes >= 1) continue;

      if (row.sport === "Soccer") {
        const list = soccerByTitle.get(m.title) ?? [];
        list.push({ market: m, yes });
        soccerByTitle.set(m.title, list);
        continue;
      }

      const edge = buildEdgeItem(row.sport, m, yes);
      if (edge) edges.push(edge);
    }
  }

  // Soccer: pick the home-team market — the highest yes_bid above 40% — as
  // the game's representative, ignoring the draw outcome and the other team.
  for (const list of soccerByTitle.values()) {
    const candidates = list.filter(
      (e) => cleanTeamName(e.market.yes_sub_title!.trim()).toLowerCase() !== "draw"
    );
    if (candidates.length === 0) continue;
    const home = candidates.reduce((best, cur) => (cur.yes > best.yes ? cur : best));
    if (home.yes <= 0.4) continue;

    const edge = buildEdgeItem("Soccer", home.market, home.yes);
    if (!edge) continue;

    const drawEntry = list.find(
      (e) => cleanTeamName(e.market.yes_sub_title!.trim()).toLowerCase() === "draw"
    );
    if (drawEntry) edge.drawProb = Math.round(drawEntry.yes * 1000) / 10;
    edge.volume = list.reduce((sum, e) => sum + (parseFloat(String(e.market.volume_fp ?? "0")) || 0), 0);

    edges.push(edge);
  }

  // Deduplicate: keep highest-volume market per unique team pair
  const seen = new Map<string, EdgeItem>();
  for (const edge of edges) {
    const key = [edge.yesTeam, edge.noTeam].sort().join('_vs_');
    const existing = seen.get(key);
    if (!existing || edge.volume > existing.volume) seen.set(key, edge);
  }

  return [...seen.values()].sort((a, b) => b.edgeScore - a.edgeScore || b.volume - a.volume);
}

function formatRelativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function getEdgeStyle(score: number) {
  // color = button bg / bar fill / border accent (always colored in both modes)
  // textColor = badge label text (gold in dark, near-black in light via CSS var)
  if (score >= 10) return { icon: "🔥", label: "Strong Edge",   color: "#F5A100", border: "rgba(245,161,0,0.35)",  bg: "rgba(245,161,0,0.07)"  };
  if (score >= 5)  return { icon: "⚡", label: "Moderate Edge", color: "#EAB308", border: "rgba(234,179,8,0.30)",  bg: "rgba(234,179,8,0.06)"  };
  return              { icon: "✅", label: "Markets Agree",  color: "#22c55e", border: "rgba(34,197,94,0.25)", bg: "rgba(34,197,94,0.05)" };
}

interface PicksProps {
  pendingPick?: { teams: string; date: string; odds?: GameOdds; sport?: Sport } | null;
  onPendingPickConsumed?: () => void;
  onBack?: () => void;
}

const Picks = ({ pendingPick, onPendingPickConsumed, onBack }: PicksProps = {}) => {
  const [edges, setEdges]       = useState<EdgeItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ teams: string; sport: Sport; date: string; odds?: GameOdds } | null>(null);

  const fetchEdges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/odds_cache?select=sport,data,updated_at`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows: CacheRow[] = await res.json();
      setEdges(parseEdges(rows));
      setLastFetch(new Date().toISOString());
    } catch {
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEdges();
    const id = setInterval(fetchEdges, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchEdges]);

  // Game tapped from Live Odds on Dashboard → auto-open Bobby's analysis
  useEffect(() => {
    if (!pendingPick) return;
    setSelected({
      teams: pendingPick.teams,
      sport: (pendingPick.sport ?? "NBA") as Sport,
      date:  pendingPick.date,
      odds:  pendingPick.odds,
    });
    onPendingPickConsumed?.();
  }, [pendingPick]);

  const todayYmd = new Date().toLocaleDateString("en-CA");

  // ── Bobby's analysis view ────────────────────────────────────────────
  if (selected) {
    return (
      <div style={{ height: "100dvh", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div className="px-4 pt-6 pb-24 space-y-4">
          <div className="flex items-center gap-1 mb-1">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors -ml-1"
              aria-label="Back to Edge Finder"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Bobby's Pick</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[220px]">{selected.teams}</p>
            </div>
          </div>
          <N8nIntegration
            sport={selected.sport}
            pendingPick={{ teams: selected.teams, date: selected.date, odds: selected.odds, sport: selected.sport }}
            onPendingPickConsumed={() => {}}
          />
        </div>
      </div>
    );
  }

  // ── Edge Finder main view ────────────────────────────────────────────
  return (
    <div style={{ height: "100dvh", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
      <div className="px-4 pt-6 pb-24 space-y-4">

        {/* Header */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors -ml-1"
              aria-label="Back to Home"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Edge Finder ⚡</h1>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-muted-foreground">Active Kalshi edges · all sports</p>
            <button
              onClick={fetchEdges}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          {lastFetch && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated {formatRelativeTime(lastFetch)} · auto-refreshes every 30 min
            </p>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[104px] rounded-xl bg-card/50 animate-pulse border border-border/30" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && edges.length === 0 && (
          <Card className="border-border/40">
            <div className="py-14 text-center space-y-2 px-6">
              <p className="text-4xl">📊</p>
              <p className="text-sm font-semibold">No active edges right now</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Check back closer to game time —{"\n"}Kalshi markets open 24–48h before tipoff
              </p>
            </div>
          </Card>
        )}

        {/* Edge rows */}
        {!loading && edges.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {edges.length} market{edges.length !== 1 ? "s" : ""} · sorted by edge
            </p>
            <div className="space-y-2">
              {edges.map((edge) => {
                const style    = getEdgeStyle(edge.edgeScore);
                const emoji    = SPORT_EMOJIS[edge.sport] ?? "🎮";
                const favTeam  = edge.yesProb >= 50 ? edge.yesTeam : edge.noTeam;
                const favProb  = edge.yesProb >= 50 ? edge.yesProb : edge.noProb;
                const dogTeam  = edge.yesProb >= 50 ? edge.noTeam  : edge.yesTeam;
                const dogProb  = edge.yesProb >= 50 ? edge.noProb  : edge.yesProb;

                return (
                  <div
                    key={edge.ticker}
                    className="rounded-xl border p-3"
                    style={{ borderColor: style.border, backgroundColor: style.bg }}
                  >
                    {/* Sport chip + edge badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{emoji}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {edge.sport}
                        </span>
                      </div>
                      {/* Badge text uses --bv-accent-text: gold in dark, near-black in light */}
                      <span className="text-xs font-bold tabular-nums" style={{ color: "hsl(var(--bv-accent-text))" }}>
                        {style.icon} {edge.edgeScore.toFixed(1)}% edge
                      </span>
                    </div>

                    {/* Teams + probabilities */}
                    <div className="mb-2.5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug min-w-0 truncate">{favTeam}</span>
                        <span className="text-sm font-black tabular-nums shrink-0" style={{ color: "hsl(var(--bv-accent-text))" }}>
                          {favProb}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground min-w-0 truncate">{dogTeam}</span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{dogProb}%</span>
                      </div>
                    </div>

                    {/* Probability bar */}
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2.5">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${favProb}%`, backgroundColor: style.color }}
                      />
                    </div>

                    {/* Volume + Get Pick button */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        Vol: ${Math.round(edge.volume).toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          const team1 = expandTeamName(edge.yesTeam, edge.sport);
                          const team2 = expandTeamName(edge.noTeam, edge.sport);
                          if (!team1 || !team2 || team1 === team2) {
                            console.error('[EdgeFinder] Invalid teams:', team1, team2);
                            return;
                          }
                          const ml1 = kalshiProbToAmericanOdds(edge.yesProb);
                          const ml2 = kalshiProbToAmericanOdds(edge.noProb);
                          const edgeOdds: GameOdds = { team1, team2, ml1, ml2 };
                          if (edge.sport === "Soccer" && edge.drawProb !== undefined) {
                            edgeOdds.draw = kalshiProbToAmericanOdds(edge.drawProb);
                          }
                          setSelected({
                            teams: `${team1} vs ${team2}`,
                            sport: edge.sport as Sport,
                            date: todayYmd,
                            odds: edgeOdds,
                          });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-all active:scale-95"
                        style={{ backgroundColor: style.color }}
                      >
                        Get Pick
                        <TrendingUp className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Picks;
