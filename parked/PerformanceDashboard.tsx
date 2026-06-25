import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Result = "W" | "L" | "P"; // Win / Loss / Push

interface Pick {
  id: string;
  sport: string;
  teams: string;
  pick_summary: string;
  result?: Result;
  odds?: number;           // American odds, e.g. -110, +140
  created_at: string;
  game_date?: string;
}

interface SportStat {
  sport: string;
  emoji: string;
  wins: number;
  losses: number;
  pushes: number;
}

const SPORT_EMOJIS: Record<string, string> = {
  Soccer: "⚽", NHL: "🏒", WNBA: "🏀", MLB: "⚾",
  NFL: "🏈", NCAAFB: "🏈", NBA: "🏀", F1: "🏎️",
  Tennis: "🎾", Golf: "⛳",
};

// Convert American odds to decimal ROI per unit
function oddsToRoi(americanOdds: number): number {
  if (americanOdds > 0) return americanOdds / 100;
  return 100 / Math.abs(americanOdds);
}

function computeRoi(picks: Pick[]): number {
  let profit = 0;
  let units = 0;
  for (const p of picks) {
    if (!p.result || p.result === "P") continue;
    const odds = p.odds ?? -110;
    units += 1;
    if (p.result === "W") profit += oddsToRoi(odds);
    else profit -= 1;
  }
  return units > 0 ? (profit / units) * 100 : 0;
}

function winRate(picks: Pick[]): number {
  const settled = picks.filter((p) => p.result === "W" || p.result === "L");
  if (!settled.length) return 0;
  return (settled.filter((p) => p.result === "W").length / settled.length) * 100;
}

function currentStreak(picks: Pick[]): { count: number; type: "W" | "L" | "–" } {
  const settled = [...picks]
    .filter((p) => p.result === "W" || p.result === "L")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (!settled.length) return { count: 0, type: "–" };
  const type = settled[0].result as "W" | "L";
  let count = 0;
  for (const p of settled) {
    if (p.result === type) count++;
    else break;
  }
  return { count, type };
}

async function fetchSavedPicks(userId?: string): Promise<Pick[]> {
  const filter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/saved_picks?select=*&order=created_at.desc&limit=100${filter}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!res.ok) return [];
  return res.json();
}

interface PerformanceDashboardProps {
  userId?: string;
  publicView?: boolean;
}

export function PerformanceDashboard({ userId, publicView = false }: PerformanceDashboardProps) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "sports">("overview");

  useEffect(() => {
    fetchSavedPicks(userId).then((data) => {
      setPicks(data);
      setLoading(false);
    });
  }, [userId]);

  const settled      = picks.filter((p) => p.result === "W" || p.result === "L");
  const wins         = settled.filter((p) => p.result === "W").length;
  const losses       = settled.filter((p) => p.result === "L").length;
  const roi          = computeRoi(picks);
  const wr           = winRate(picks);
  const streak       = currentStreak(picks);

  // Sport breakdown
  const sportMap: Record<string, SportStat> = {};
  for (const p of settled) {
    if (!sportMap[p.sport]) {
      sportMap[p.sport] = { sport: p.sport, emoji: SPORT_EMOJIS[p.sport] ?? "🎲", wins: 0, losses: 0, pushes: 0 };
    }
    if (p.result === "W") sportMap[p.sport].wins++;
    else sportMap[p.sport].losses++;
  }
  const hotSport = Object.values(sportMap).sort((a, b) => {
    const wrA = a.wins / (a.wins + a.losses || 1);
    const wrB = b.wins / (b.wins + b.losses || 1);
    return wrB - wrA;
  })[0];

  const tabs = ["overview", "history", "sports"] as const;

  if (loading) {
    return (
      <div className="px-4 pt-6 flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Bobby's Record 📊</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {publicView ? "Public win/loss tracker" : "Your pick history & ROI"}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
            style={{
              background: activeTab === t ? "#F5A100" : "transparent",
              color: activeTab === t ? "#000" : "#9ca3af",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {/* Win / Loss / ROI row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Wins", value: wins, color: "#22c55e" },
              { label: "Losses", value: losses, color: "#ef4444" },
              { label: "ROI", value: `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`, color: roi >= 0 ? "#22c55e" : "#ef4444" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="p-3 text-center border border-white/10" style={{ background: "#0f0f0f" }}>
                <p className="text-2xl font-black" style={{ color }}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </Card>
            ))}
          </div>

          {/* Win rate bar */}
          <Card className="p-4 border border-white/10 space-y-2" style={{ background: "#0f0f0f" }}>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-bold" style={{ color: wr >= 55 ? "#22c55e" : wr >= 50 ? "#F5A100" : "#ef4444" }}>
                {wr.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${wr}%`, background: "#F5A100" }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {settled.length} settled picks · {picks.filter((p) => !p.result).length} pending
            </p>
          </Card>

          {/* Streak + hot sport */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 border border-white/10" style={{ background: "#0f0f0f" }}>
              <p className="text-xs text-muted-foreground">Current Streak</p>
              <div className="flex items-center gap-1.5 mt-1">
                {streak.type === "W" ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : streak.type === "L" ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xl font-black" style={{ color: streak.type === "W" ? "#22c55e" : streak.type === "L" ? "#ef4444" : "#9ca3af" }}>
                  {streak.count}{streak.type !== "–" ? streak.type : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {streak.type === "W" ? "🔥 On fire" : streak.type === "L" ? "🥶 Cold spell" : "No history yet"}
              </p>
            </Card>

            <Card className="p-3 border border-white/10" style={{ background: "#0f0f0f" }}>
              <p className="text-xs text-muted-foreground">Hottest Sport</p>
              {hotSport ? (
                <>
                  <p className="text-xl font-black mt-1" style={{ color: "#F5A100" }}>
                    {hotSport.emoji} {hotSport.sport}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hotSport.wins}W–{hotSport.losses}L
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No data yet</p>
              )}
            </Card>
          </div>

          {/* Bobby vs Human comparison */}
          <Card className="p-4 border border-white/10 space-y-3" style={{ background: "#0f0f0f" }}>
            <p className="text-sm font-semibold">Bobby Vegas vs Average Bettor</p>
            {[
              { label: "Bobby Vegas", pct: wr, color: "#F5A100" },
              { label: "Average Bettor", pct: 47.5, color: "#6b7280" },
            ].map(({ label, pct, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">* Average bettor win rate ~47.5% after vig</p>
          </Card>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {picks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No picks saved yet.</p>
          )}
          {picks.map((p) => (
            <Card key={p.id} className="p-3 border border-white/10 flex items-start gap-3" style={{ background: "#0f0f0f" }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{
                  background: p.result === "W" ? "rgba(34,197,94,0.2)" : p.result === "L" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)",
                  color: p.result === "W" ? "#22c55e" : p.result === "L" ? "#ef4444" : "#9ca3af",
                }}
              >
                {p.result ?? "–"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{SPORT_EMOJIS[p.sport] ?? "🎲"} {p.sport} · {p.game_date ?? p.created_at.split("T")[0]}</p>
                <p className="text-sm font-semibold truncate">{p.teams}</p>
                <p className="text-xs text-muted-foreground truncate">{p.pick_summary}</p>
              </div>
              {p.odds && (
                <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: "#F5A100" }}>
                  {p.odds > 0 ? "+" : ""}{p.odds}
                </span>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* SPORTS TAB */}
      {activeTab === "sports" && (
        <div className="space-y-2">
          {Object.values(sportMap).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No settled picks yet.</p>
          )}
          {Object.values(sportMap)
            .sort((a, b) => (b.wins / (b.wins + b.losses || 1)) - (a.wins / (a.wins + a.losses || 1)))
            .map((s) => {
              const total = s.wins + s.losses;
              const wr = total ? (s.wins / total) * 100 : 0;
              return (
                <Card key={s.sport} className="p-4 border border-white/10 space-y-2" style={{ background: "#0f0f0f" }}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{s.emoji} {s.sport}</span>
                    <Badge
                      className="text-xs border-0"
                      style={{
                        background: wr >= 60 ? "rgba(34,197,94,0.2)" : wr >= 50 ? "rgba(245,161,0,0.2)" : "rgba(239,68,68,0.2)",
                        color: wr >= 60 ? "#22c55e" : wr >= 50 ? "#F5A100" : "#ef4444",
                      }}
                    >
                      {wr.toFixed(0)}% ({s.wins}W–{s.losses}L)
                    </Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${wr}%`,
                        background: wr >= 60 ? "#22c55e" : wr >= 50 ? "#F5A100" : "#ef4444",
                      }}
                    />
                  </div>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default PerformanceDashboard;
