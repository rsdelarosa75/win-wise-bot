import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface AntiParlayNudgeProps {
  pickCount: number;          // how many picks the user is trying to parlay
  picks?: string[];           // labels for the picks, e.g. ["Yankees ML", "Lakers -4.5"]
  userId?: string;            // for logging dismissals to Supabase
  onDismiss?: () => void;
}

// Rough parlay win probability: each pick assumed ~52% (breakeven +vig)
function parlayWinProb(legs: number, perLegPct = 52): number {
  return (perLegPct / 100) ** legs * 100;
}

// American odds for a standard correlated N-leg parlay at ~-110 each leg
function parlayPayout(legs: number): string {
  const mult = (1.909090909) ** legs; // -110 = 1.9090... decimal
  const american = Math.round((mult - 1) * 100);
  return `+${american}`;
}

async function logDismissal(userId: string | undefined, pickCount: number) {
  if (!userId || !SUPABASE_URL) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/parlay_dismissals`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        pick_count: pickCount,
        dismissed_at: new Date().toISOString(),
      }),
    });
  } catch (_) {}
}

export function AntiParlayNudge({ pickCount, picks = [], userId, onDismiss }: AntiParlayNudgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || pickCount < 2) return null;

  const winPct     = parlayWinProb(pickCount).toFixed(1);
  const payout     = parlayPayout(pickCount);
  const housePct   = (100 - parseFloat(winPct)).toFixed(1);

  const handleDismiss = async () => {
    setDismissed(true);
    await logDismissal(userId, pickCount);
    onDismiss?.();
  };

  const message =
    pickCount === 2
      ? "Two-teamers are the sportsbook's favorite appetizer."
      : pickCount === 3
      ? "Three legs, three chances for the house to win."
      : pickCount >= 5
      ? `${pickCount}-leg parlay? The house is already celebrating.`
      : "The more legs, the bigger the house edge.";

  return (
    <div
      className="rounded-xl p-4 border relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a0a00 0%, #0f0f0f 100%)",
        borderColor: "rgba(239,68,68,0.5)",
        boxShadow: "0 0 16px rgba(239,68,68,0.1)",
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 pr-6">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-400">Bobby Vegas doesn't like parlays.</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>

      {/* Picks list */}
      {picks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {picks.map((p, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: "rgba(255,255,255,0.07)", color: "#9ca3af" }}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg py-2 px-1" style={{ background: "rgba(255,255,255,0.05)" }}>
          <p className="text-lg font-black text-red-400">{winPct}%</p>
          <p className="text-xs text-muted-foreground leading-tight">Your win chance</p>
        </div>
        <div className="rounded-lg py-2 px-1" style={{ background: "rgba(255,255,255,0.05)" }}>
          <p className="text-lg font-black text-muted-foreground">{payout}</p>
          <p className="text-xs text-muted-foreground leading-tight">Payout if you hit</p>
        </div>
        <div className="rounded-lg py-2 px-1" style={{ background: "rgba(255,255,255,0.05)" }}>
          <p className="text-lg font-black" style={{ color: "#F5A100" }}>{housePct}%</p>
          <p className="text-xs text-muted-foreground leading-tight">House wins this</p>
        </div>
      </div>

      {/* Bobby's take */}
      <div
        className="mt-3 rounded-lg p-3 text-xs"
        style={{ background: "rgba(245,161,0,0.06)", borderLeft: "3px solid #F5A100" }}
      >
        <span className="font-bold" style={{ color: "#F5A100" }}>Bobby says: </span>
        <span className="text-muted-foreground">
          "The house loves parlays. I don't. Take your best single-game edge and hit it clean.
          Sharps don't parlay. They grind."
        </span>
      </div>

      {/* Dismiss link */}
      <button
        onClick={handleDismiss}
        className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 text-center"
      >
        I know the risk, let me parlay anyway →
      </button>
    </div>
  );
}

export default AntiParlayNudge;
