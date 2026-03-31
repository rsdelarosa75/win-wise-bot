import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { usePicks } from "@/hooks/use-picks";
import type { SavedPick } from "@/hooks/use-picks";

const getUnits = (confidence: string | null): number => {
  if (confidence === "High") return 3;
  if (confidence === "Medium") return 2;
  return 1;
};

const fmtUnits = (u: number) =>
  u > 0 ? `+${u.toFixed(1)}u` : u < 0 ? `${u.toFixed(1)}u` : "0u";

const fmtPct = (n: number) =>
  n > 0 ? `+${n.toFixed(1)}%` : n < 0 ? `${n.toFixed(1)}%` : "0%";

/** Picks are newest-first from Supabase; streak = current run from most recent settled pick */
const computeStreak = (picksNewestFirst: SavedPick[]): string => {
  const settled = picksNewestFirst.filter(
    (p) => p.result === "win" || p.result === "loss"
  );
  if (!settled.length) return "—";
  const first = settled[0].result!;
  let n = 0;
  for (const p of settled) {
    if (p.result === first) n++;
    else break;
  }
  return `${first === "win" ? "W" : "L"}${n}`;
};

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-0.5 text-muted-foreground">{label}</p>
      <p className="font-bold tabular-nums" style={{ color: "#F5A100" }}>
        {fmtUnits(val)}
      </p>
    </div>
  );
};

const Tracker = () => {
  const { picks, loading, updateResult } = usePicks();

  const wins = useMemo(
    () => picks.filter((p) => p.result === "win").length,
    [picks]
  );
  const losses = useMemo(
    () => picks.filter((p) => p.result === "loss").length,
    [picks]
  );

  const unitsWon = useMemo(
    () =>
      picks
        .filter((p) => p.result === "win")
        .reduce((s, p) => s + getUnits(p.confidence), 0),
    [picks]
  );
  const unitsLost = useMemo(
    () =>
      picks
        .filter((p) => p.result === "loss")
        .reduce((s, p) => s + getUnits(p.confidence), 0),
    [picks]
  );
  const netUnits = +((unitsWon - unitsLost).toFixed(2));

  const totalWagered = useMemo(
    () =>
      picks
        .filter((p) => p.result === "win" || p.result === "loss")
        .reduce((s, p) => s + getUnits(p.confidence), 0),
    [picks]
  );
  const settledCount = wins + losses;
  const roi =
    totalWagered > 0 ? +((netUnits / totalWagered) * 100).toFixed(1) : null;

  const streakStr = useMemo(() => computeStreak(picks), [picks]);

  const chartData = useMemo(() => {
    const chronological = [...picks]
      .filter((p) => p.result === "win" || p.result === "loss")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    let running = 0;
    return chronological.map((p) => {
      const u = getUnits(p.confidence);
      running = +(running + (p.result === "win" ? u : -u)).toFixed(2);
      return {
        date: new Date(p.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        units: running,
      };
    });
  }, [picks]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 overflow-x-hidden px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold">Season Tracker</h1>

      {/* HEADER STATS — 4 cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Overall Record
          </span>
          <span className="text-xl font-black tabular-nums leading-none text-foreground">
            {wins}-{losses}
          </span>
          <span className="text-[10px] text-muted-foreground">W-L</span>
        </div>

        <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Units
          </span>
          <span
            className="text-xl font-black tabular-nums leading-none"
            style={{
              color:
                netUnits > 0 ? "#F5A100" : netUnits < 0 ? "#ef4444" : "#888888",
            }}
          >
            {fmtUnits(netUnits)}
          </span>
          <span className="text-[10px] text-muted-foreground">net</span>
        </div>

        <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            ROI
          </span>
          <span
            className="text-xl font-black tabular-nums leading-none"
            style={{
              color:
                roi == null
                  ? "#888888"
                  : roi > 0
                    ? "#F5A100"
                    : roi < 0
                      ? "#ef4444"
                      : "#888888",
            }}
          >
            {roi == null ? "—" : fmtPct(roi)}
          </span>
          <span className="text-[10px] text-muted-foreground">return</span>
        </div>

        <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Streak
          </span>
          <span className="text-xl font-black tabular-nums leading-none text-primary">
            {streakStr}
          </span>
          <span className="text-[10px] text-muted-foreground">current</span>
        </div>
      </div>

      {/* PERFORMANCE CHART */}
      {chartData.length > 0 && (
        <Card className="overflow-hidden border-border/50 bg-black/40">
          <CardContent className="px-2 pb-3 pt-4">
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Cumulative units
            </p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2A2A2A"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#888888", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#888888", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}u`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="units"
                    stroke="#F5A100"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#F5A100", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#F5A100" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PICKS HISTORY */}
      {picks.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="space-y-2 py-12 text-center">
            <p className="text-3xl">📊</p>
            <p className="text-sm font-semibold">No picks saved yet</p>
            <p className="text-xs text-muted-foreground">
              Save picks from the Picks tab to build your season tracker
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Picks history
            </h2>
            <span className="text-xs text-muted-foreground">
              {picks.length} picks · newest first
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/30">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background/80">
                  <th className="whitespace-nowrap px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Matchup
                  </th>
                  <th className="min-w-[120px] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pick
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Confidence
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Result
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Units
                  </th>
                </tr>
              </thead>
              <tbody>
                {picks.map((pick) => {
                  const u = getUnits(pick.confidence);
                  const unitDisplay =
                    pick.result === "win"
                      ? `+${u}u`
                      : pick.result === "loss"
                        ? `-${u}u`
                        : pick.result === "push"
                          ? "0u"
                          : "—";
                  const unitColor =
                    pick.result === "win"
                      ? "#22c55e"
                      : pick.result === "loss"
                        ? "#ef4444"
                        : pick.result === "push"
                          ? "#a3a3a3"
                          : "#737373";

                  return (
                    <tr
                      key={pick.id}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-muted-foreground">
                        {new Date(pick.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="max-w-[140px] px-3 py-3 align-middle">
                        <span
                          className="line-clamp-2 text-xs font-medium leading-snug"
                          title={pick.teams}
                        >
                          {pick.teams}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-3 py-3 align-middle">
                        <span
                          className="line-clamp-2 text-xs text-foreground/90"
                          style={{ color: "#F5A100" }}
                          title={pick.pick ?? ""}
                        >
                          {pick.pick ?? "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-xs">
                        {pick.confidence ?? "—"}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-1">
                          {pick.result === "push" && (
                            <span className="mr-1 text-[10px] font-semibold uppercase text-slate-400">
                              Push
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => updateResult(pick.id, "win")}
                            className={`min-h-[44px] min-w-[56px] rounded-md border px-2 text-[10px] font-bold uppercase transition-colors ${
                              pick.result === "win"
                                ? "border-green-500/60 bg-green-500/20 text-green-400"
                                : "border-border/60 text-muted-foreground hover:border-green-500/40"
                            }`}
                          >
                            Win
                          </button>
                          <button
                            type="button"
                            onClick={() => updateResult(pick.id, "loss")}
                            className={`min-h-[44px] min-w-[56px] rounded-md border px-2 text-[10px] font-bold uppercase transition-colors ${
                              pick.result === "loss"
                                ? "border-red-500/60 bg-red-500/20 text-red-400"
                                : "border-border/60 text-muted-foreground hover:border-red-500/40"
                            }`}
                          >
                            Loss
                          </button>
                          <button
                            type="button"
                            onClick={() => updateResult(pick.id, null)}
                            className={`min-h-[44px] min-w-[76px] rounded-md border px-2 text-[10px] font-bold uppercase transition-colors ${
                              pick.result == null
                                ? "border-slate-500/60 bg-slate-500/15 text-slate-300"
                                : "border-border/60 text-muted-foreground hover:border-slate-500/40"
                            }`}
                          >
                            Pending
                          </button>
                        </div>
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-3 text-right align-middle text-xs font-bold tabular-nums"
                        style={{ color: unitColor }}
                      >
                        {unitDisplay}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Units: High = 3u, Medium = 2u, Low = 1u. Win credits +units, loss
            debits −units. Mark results to update stats and chart.
          </p>
        </div>
      )}
    </div>
  );
};

export default Tracker;
