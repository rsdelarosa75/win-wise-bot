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
}

function parseNoTeamFromTitle(title: string, yesTeam: string): string {
  const match = title.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s+winner[?!]?)?$/i);
  if (!match) return "";
  const t1 = match[1].trim();
  const t2 = match[2].trim();
  const yL = yesTeam.toLowerCase();
  const firstWord = yL.split(" ").find((w) => w.length > 3) ?? yL;
  return t1.toLowerCase().includes(firstWord) ? t2 : t1;
}

function parseEdges(rows: CacheRow[]): EdgeItem[] {
  const edges: EdgeItem[] = [];
  for (const row of rows) {
    for (const m of row.data?.markets ?? []) {
      if (!m.yes_bid_dollars || !m.yes_sub_title) continue;
      const yes = parseFloat(m.yes_bid_dollars);
      const no  = parseFloat(m.no_bid_dollars ?? "0");
      if (isNaN(yes) || yes <= 0 || yes >= 1) continue;

      const yesTeam = m.yes_sub_title.trim();
      const noTeam  = (m.no_sub_title ?? "").trim() || parseNoTeamFromTitle(m.title, yesTeam);
      if (!noTeam) continue;

      const yesProb   = Math.round(yes * 1000) / 10;
      const noProb    = no > 0 ? Math.round(no * 1000) / 10 : Math.round((1 - yes) * 1000) / 10;
      const edgeScore = Math.round(Math.abs(yes - 0.5) * 1000) / 10;
      const volume    = parseFloat(String(m.volume_fp ?? "0")) || 0;

      edges.push({ sport: row.sport, ticker: m.ticker, yesTeam, noTeam, yesProb, noProb, edgeScore, volume });
    }
  }
  return edges.sort((a, b) => b.edgeScore - a.edgeScore || b.volume - a.volume);
}

function formatRelativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function getEdgeStyle(score: number) {
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
  const [selected, setSelected] = useState<{ teams: string; sport: Sport; date: string } | null>(null);

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
            pendingPick={{ teams: selected.teams, date: selected.date }}
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
                      <span className="text-xs font-bold tabular-nums" style={{ color: style.color }}>
                        {style.icon} {edge.edgeScore.toFixed(1)}% edge
                      </span>
                    </div>

                    {/* Teams + probabilities */}
                    <div className="mb-2.5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug min-w-0 truncate">{favTeam}</span>
                        <span className="text-sm font-black tabular-nums shrink-0" style={{ color: style.color }}>
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
                        onClick={() =>
                          setSelected({
                            teams: `${edge.yesTeam} vs ${edge.noTeam}`,
                            sport: edge.sport as Sport,
                            date: todayYmd,
                          })
                        }
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
