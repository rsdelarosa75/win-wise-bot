import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePicks } from "@/hooks/use-picks";
import type { SavedPick } from "@/hooks/use-picks";

const RESULT_OPTIONS = [
  { value: "win", label: "Win", classes: "border-win/40 text-win bg-win/5 hover:bg-win/15" },
  { value: "loss", label: "Loss", classes: "border-loss/40 text-loss bg-loss/5 hover:bg-loss/15" },
  { value: "push", label: "Push", classes: "border-neutral/40 text-neutral bg-neutral/5 hover:bg-neutral/15" },
] as const;

const ResultBadge = ({ result }: { result: SavedPick["result"] }) => {
  if (!result) return <span className="text-xs text-muted-foreground">Pending</span>;
  const opt = RESULT_OPTIONS.find((o) => o.value === result);
  return (
    <Badge variant="outline" className={`text-xs ${opt?.classes}`}>
      {opt?.label}
    </Badge>
  );
};

const PickCard = ({
  pick,
  onUpdateResult,
}: {
  pick: SavedPick;
  onUpdateResult: (id: string, result: "win" | "loss" | "push") => Promise<void>;
}) => {
  const date = new Date(pick.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Card>
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{pick.teams}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {pick.sport && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {pick.sport}
                </Badge>
              )}
              {pick.confidence && (
                <span className="text-xs text-muted-foreground">{pick.confidence} conf.</span>
              )}
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
          </div>
          <ResultBadge result={pick.result} />
        </div>

        {/* Pick + Odds */}
        {(pick.pick || pick.odds) && (
          <div className="bg-secondary/30 rounded-md px-3 py-2 space-y-0.5">
            {pick.pick && (
              <p className="text-xs font-medium">
                Pick: <span className="text-primary">{pick.pick}</span>
              </p>
            )}
            {pick.odds && (
              <p className="text-xs text-muted-foreground">Odds: {pick.odds}</p>
            )}
          </div>
        )}

        {/* Result selector */}
        <div className="flex gap-2">
          {RESULT_OPTIONS.map(({ value, label, classes }) => (
            <button
              key={value}
              onClick={() => onUpdateResult(pick.id, value)}
              className={`flex-1 text-xs py-1 rounded border font-medium transition-colors
                ${pick.result === value
                  ? classes
                  : "border-border text-muted-foreground hover:border-border/80"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const Tracker = () => {
  const { picks, loading, updateResult } = usePicks();

  const wins = picks.filter((p) => p.result === "win").length;
  const losses = picks.filter((p) => p.result === "loss").length;
  const pushes = picks.filter((p) => p.result === "push").length;

  // Flat $100/pick ROI: win nets ~$91 (standard -110), loss costs $100, push = $0
  const roi = wins * 91 - losses * 100;
  const roiLabel = roi === 0
    ? "Even"
    : roi > 0
    ? `up $${roi.toFixed(0)}`
    : `down $${Math.abs(roi).toFixed(0)}`;

  return (
    <div className="space-y-4 px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold">My Pick Tracker 📊</h1>

      {/* Record card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Season Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-around text-center py-1">
            {[
              { value: wins, label: "Win", color: "text-green-500" },
              { value: losses, label: "Loss", color: "text-red-500" },
              { value: pushes, label: "Push", color: "text-yellow-500" },
            ].map(({ value, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className={`text-3xl font-bold ${color}`}>{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground text-xs border-t border-border pt-3">
            {picks.filter((p) => p.result).length > 0
              ? `If $100/pick, you're ${roiLabel}`
              : "Start saving picks to track ROI"}
          </p>
        </CardContent>
      </Card>

      {/* Picks list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : picks.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-2">
            <p className="text-2xl">📌</p>
            <p className="text-sm font-medium">No picks saved yet</p>
            <p className="text-xs text-muted-foreground">
              Save picks from the Picks tab to track your record
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {picks.map((pick) => (
            <PickCard key={pick.id} pick={pick} onUpdateResult={updateResult} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Tracker;
