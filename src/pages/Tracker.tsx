import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePicks } from "@/hooks/use-picks";
import type { SavedPick } from "@/hooks/use-picks";

// ── Helpers ───────────────────────────────────────────────────
const getUnits = (confidence: string | null): number => {
  if (confidence === "High")   return 3;
  if (confidence === "Medium") return 2;
  return 1;
};

const fmtUnits = (u: number) =>
  u > 0 ? `+${u.toFixed(1)}u` : u < 0 ? `${u.toFixed(1)}u` : "0u";

const fmtPct = (n: number) =>
  n > 0 ? `+${n.toFixed(1)}%` : n < 0 ? `${n.toFixed(1)}%` : "0%";

const streak = (picks: SavedPick[]): string => {
  const settled = picks.filter(p => p.result === "win" || p.result === "loss");
  if (!settled.length) return "—";
  const first = settled[0].result!;
  let count = 0;
  for (const p of settled) {
    if (p.result === first) count++;
    else break;
  }
  return `${first === "win" ? "W" : "L"}${count}`;
};

// ── Stat box ──────────────────────────────────────────────────
const StatBox = ({
  label, value, sub, positive,
}: { label: string; value: string; sub?: string; positive?: boolean | null }) => (
  <div className="flex-1 min-w-0 bg-card rounded-xl border border-border p-3 flex flex-col gap-0.5">
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
    <span
      className="text-xl font-black tabular-nums leading-none"
      style={{
        color: positive === true ? '#22c55e'
             : positive === false ? '#ef4444'
             : '#F5A100',
      }}
    >
      {value}
    </span>
    {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
  </div>
);

// ── Custom Tooltip ────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold" style={{ color: val >= 0 ? '#22c55e' : '#ef4444' }}>
        {fmtUnits(val)}
      </p>
    </div>
  );
};

// ── Pick row ─────────────────────────────────────────────────
const RESULT_OPTS = [
  { value: "win",  label: "W", activeClass: "bg-green-500/20 border-green-500/60 text-green-400" },
  { value: "loss", label: "L", activeClass: "bg-red-500/20  border-red-500/60  text-red-400"   },
  { value: "push", label: "P", activeClass: "bg-slate-500/20 border-slate-400/60 text-slate-400"},
] as const;

const PickRow = ({
  pick,
  onUpdateResult,
}: {
  pick: SavedPick;
  onUpdateResult: (id: string, result: "win" | "loss" | "push") => Promise<void>;
}) => {
  const date = new Date(pick.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
  const units = getUnits(pick.confidence);
  const unitsDelta =
    pick.result === "win"  ?  units
  : pick.result === "loss" ? -units
  : null;

  return (
    <div className="border-b border-border/40 py-3 space-y-2">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight truncate">{pick.teams}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{date}</span>
            {pick.sport && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{pick.sport}</Badge>
            )}
            {pick.confidence && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 h-4
                  ${pick.confidence === "High"   ? "border-green-500/40 text-green-400" : ""}
                  ${pick.confidence === "Medium" ? "border-yellow-500/40 text-yellow-400" : ""}
                  ${pick.confidence === "Low"    ? "border-slate-500/40 text-slate-400" : ""}
                `}
              >
                {pick.confidence}
              </Badge>
            )}
            {pick.bet_type && (
              <span className="text-[10px] text-muted-foreground capitalize">{pick.bet_type}</span>
            )}
          </div>
        </div>
        {/* Units delta */}
        <div className="shrink-0 text-right">
          {unitsDelta !== null ? (
            <span
              className="text-sm font-black tabular-nums"
              style={{ color: unitsDelta > 0 ? '#22c55e' : '#ef4444' }}
            >
              {fmtUnits(unitsDelta)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{units}u at stake</span>
          )}
        </div>
      </div>

      {/* Bobby's Pick */}
      {pick.pick && (
        <p className="text-xs font-medium" style={{ color: '#F5A100' }}>
          🎯 {pick.pick}
        </p>
      )}

      {/* Result toggle */}
      <div className="flex gap-2">
        {RESULT_OPTS.map(({ value, label, activeClass }) => (
          <button
            key={value}
            onClick={() => onUpdateResult(pick.id, value)}
            className={`flex-1 text-xs py-1.5 rounded-lg border font-bold transition-all min-h-[36px]
              ${pick.result === value
                ? activeClass
                : "border-border/50 text-muted-foreground hover:border-border active:scale-95"
              }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Sport summary row ─────────────────────────────────────────
const SportRow = ({ sport, picks }: { sport: string; picks: SavedPick[] }) => {
  const wins   = picks.filter(p => p.result === "win").length;
  const losses = picks.filter(p => p.result === "loss").length;
  const settled = wins + losses;
  const unitsWon  = picks.filter(p => p.result === "win").reduce((s, p)  => s + getUnits(p.confidence), 0);
  const unitsLost = picks.filter(p => p.result === "loss").reduce((s, p) => s + getUnits(p.confidence), 0);
  const netUnits  = unitsWon - unitsLost;
  const totalWagered = picks.filter(p => p.result === "win" || p.result === "loss")
    .reduce((s, p) => s + getUnits(p.confidence), 0);
  const roi = totalWagered > 0 ? (netUnits / totalWagered) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className="w-10 text-xs font-bold text-muted-foreground uppercase shrink-0">{sport}</div>
      <div className="flex-1 text-sm font-semibold">
        <span className="text-green-400">{wins}</span>
        <span className="text-muted-foreground mx-1">-</span>
        <span className="text-red-400">{losses}</span>
        {picks.filter(p => p.result === "push").length > 0 && (
          <>
            <span className="text-muted-foreground mx-1">-</span>
            <span className="text-slate-400">{picks.filter(p => p.result === "push").length}</span>
          </>
        )}
      </div>
      <div className={`text-xs font-bold tabular-nums ${netUnits >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {fmtUnits(netUnits)}
      </div>
      <div className={`text-xs font-bold tabular-nums w-14 text-right ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {settled > 0 ? fmtPct(roi) : '—'}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
const Tracker = () => {
  const { picks, loading, updateResult } = usePicks();

  // Core stats
  const wins   = useMemo(() => picks.filter(p => p.result === "win").length,  [picks]);
  const losses = useMemo(() => picks.filter(p => p.result === "loss").length, [picks]);
  const pushes = useMemo(() => picks.filter(p => p.result === "push").length, [picks]);
  const settled = wins + losses;

  const unitsWon  = useMemo(() => picks.filter(p => p.result === "win").reduce((s, p)  => s + getUnits(p.confidence), 0), [picks]);
  const unitsLost = useMemo(() => picks.filter(p => p.result === "loss").reduce((s, p) => s + getUnits(p.confidence), 0), [picks]);
  const netUnits  = +(unitsWon - unitsLost).toFixed(1);

  const totalWagered = useMemo(() => picks.filter(p => p.result === "win" || p.result === "loss")
    .reduce((s, p) => s + getUnits(p.confidence), 0), [picks]);
  const roi = totalWagered > 0 ? +((netUnits / totalWagered) * 100).toFixed(1) : 0;

  const currentStreak = useMemo(() => streak(picks), [picks]);
  const streakPositive = currentStreak.startsWith("W") ? true : currentStreak.startsWith("L") ? false : null;

  // Chart data — cumulative units from oldest to newest settled pick
  const chartData = useMemo(() => {
    const settledPicks = [...picks]
      .filter(p => p.result === "win" || p.result === "loss")
      .reverse();
    let running = 0;
    return settledPicks.map(p => {
      const u = getUnits(p.confidence);
      running = +(running + (p.result === "win" ? u : -u)).toFixed(1);
      return {
        date: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        units: running,
      };
    });
  }, [picks]);

  // Sport breakdown
  const sportGroups = useMemo(() => {
    const groups: Record<string, SavedPick[]> = {};
    for (const p of picks) {
      const s = p.sport ?? "Other";
      if (!groups[s]) groups[s] = [];
      groups[s].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [picks]);

  // Motivational line
  const winPct = settled > 0 ? wins / settled : null;
  const motivational = winPct === null ? null
    : winPct > 0.6  ? "Bobby's on fire 🔥"
    : winPct >= 0.4 ? "Staying in the game 💪"
    : "Time to trust the process 🎯";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-5 w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold">My Tracker 📊</h1>

      {/* ── Header stats row ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox
          label="Record"
          value={`${wins}-${losses}${pushes ? `-${pushes}` : ""}`}
          sub={motivational ?? "No settled picks yet"}
          positive={winPct !== null ? winPct > 0.5 : null}
        />
        <StatBox
          label="Units"
          value={fmtUnits(netUnits)}
          sub={`${totalWagered}u wagered`}
          positive={netUnits > 0 ? true : netUnits < 0 ? false : null}
        />
        <StatBox
          label="ROI"
          value={settled > 0 ? fmtPct(roi) : "—"}
          sub="return on investment"
          positive={roi > 0 ? true : roi < 0 ? false : null}
        />
        <StatBox
          label="Streak"
          value={currentStreak}
          sub="current run"
          positive={streakPositive}
        />
      </div>

      {/* ── Performance chart ────────────────────────────── */}
      {chartData.length > 1 && (
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="pt-4 pb-2 px-2">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Cumulative Units
              </span>
              <div className="flex items-center gap-1 text-xs font-bold" style={{ color: netUnits >= 0 ? '#22c55e' : '#ef4444' }}>
                {netUnits >= 0
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />
                }
                {fmtUnits(netUnits)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#666', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#666', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}u`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="units"
                  stroke="#F5A100"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#F5A100', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#F5A100' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Picks history ────────────────────────────────── */}
      {picks.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-3xl">📌</p>
            <p className="text-sm font-semibold">No picks saved yet</p>
            <p className="text-xs text-muted-foreground">
              Save picks from the Picks tab to track your record
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Pick History
            </h2>
            <span className="text-xs text-muted-foreground">{picks.length} picks</span>
          </div>
          <Card className="border-border/40">
            <CardContent className="px-4 py-0">
              {picks.map(pick => (
                <PickRow key={pick.id} pick={pick} onUpdateResult={updateResult} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Sport summary ────────────────────────────────── */}
      {sportGroups.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
            By Sport
          </h2>
          <Card className="border-border/40">
            <CardContent className="px-4 py-1">
              {/* Column headers */}
              <div className="flex items-center gap-3 py-2 border-b border-border/40">
                <div className="w-10 text-[10px] text-muted-foreground uppercase shrink-0">Sport</div>
                <div className="flex-1 text-[10px] text-muted-foreground uppercase">W-L</div>
                <div className="text-[10px] text-muted-foreground uppercase">Units</div>
                <div className="w-14 text-right text-[10px] text-muted-foreground uppercase">ROI</div>
              </div>
              {sportGroups.map(([sport, sportPicks]) => (
                <SportRow key={sport} sport={sport} picks={sportPicks} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Tracker;
