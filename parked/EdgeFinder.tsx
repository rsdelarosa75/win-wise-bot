import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EdgeFinderProps {
  sport: string;
  team1: string;
  team2: string;
  sbImpliedPct: number;      // sportsbook implied probability 0–100
  kalshiPct: number | null;  // Kalshi yes_bid as 0–100, null if unavailable
  kalshiVolume?: number;     // total contracts traded on Kalshi
  sharpMeter?: number;       // 1–10 confidence score from Bobby Vegas
}

function PctBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SharpMeter({ value }: { value: number }) {
  const clamped = Math.min(10, Math.max(1, Math.round(value)));
  const color =
    clamped >= 8 ? "#22c55e" :
    clamped >= 5 ? "#F5A100" :
    "#ef4444";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Sharp Meter</span>
        <span className="font-mono font-semibold" style={{ color }}>{clamped}/10</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-sm transition-all duration-300"
            style={{ backgroundColor: i < clamped ? color : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </div>
    </div>
  );
}

export function EdgeFinder({
  sport,
  team1,
  team2,
  sbImpliedPct,
  kalshiPct,
  kalshiVolume,
  sharpMeter = 5,
}: EdgeFinderProps) {
  const [pulse, setPulse] = useState(false);

  const edge = kalshiPct !== null ? Math.abs(kalshiPct - sbImpliedPct) : null;
  const hasEdge = edge !== null && edge >= 5;
  const edgeDirection =
    kalshiPct !== null && kalshiPct > sbImpliedPct ? "Kalshi HIGHER" : "Kalshi LOWER";

  // Pulse animation on edge alert
  useEffect(() => {
    if (!hasEdge) return;
    const id = setInterval(() => setPulse((p) => !p), 900);
    return () => clearInterval(id);
  }, [hasEdge]);

  const formatVolume = (v?: number) => {
    if (!v) return "—";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <Card
      className="p-4 space-y-4 border"
      style={{
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1400 100%)",
        borderColor: hasEdge ? "#F5A100" : "rgba(255,255,255,0.1)",
        boxShadow: hasEdge ? "0 0 20px rgba(245,161,0,0.2)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{sport}</p>
          <p className="text-sm font-semibold mt-0.5">
            {team1} <span className="text-muted-foreground">vs</span> {team2}
          </p>
        </div>
        {hasEdge && (
          <Badge
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold border-0"
            style={{
              background: pulse ? "#F5A100" : "rgba(245,161,0,0.85)",
              color: "#000",
              transition: "background 0.4s ease",
            }}
          >
            ⚡ EDGE ALERT {edge?.toFixed(1)}%
          </Badge>
        )}
        {!hasEdge && kalshiPct !== null && (
          <Badge variant="secondary" className="text-xs">No Edge</Badge>
        )}
      </div>

      {/* Odds Comparison Bars */}
      <div className="space-y-3">
        <PctBar label="Sportsbook Implied" pct={sbImpliedPct} color="#6b7280" />
        {kalshiPct !== null ? (
          <PctBar label="Kalshi Market" pct={kalshiPct} color="#F5A100" />
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Kalshi data unavailable for this game
          </div>
        )}
      </div>

      {/* Edge detail */}
      {hasEdge && edge !== null && (
        <div
          className="rounded-lg p-3 text-xs space-y-1"
          style={{ background: "rgba(245,161,0,0.08)", border: "1px solid rgba(245,161,0,0.3)" }}
        >
          <p className="font-semibold" style={{ color: "#F5A100" }}>
            🔀 {edgeDirection} by {edge.toFixed(1)} percentage points
          </p>
          <p className="text-muted-foreground">
            Prediction markets are pricing this differently from sportsbooks. Bobby Vegas flags
            gaps ≥ 5% as potential value opportunities.
          </p>
        </div>
      )}

      {/* Follow the Money — Kalshi volume */}
      {kalshiVolume !== undefined && (
        <div className="flex items-center justify-between py-2 border-t border-white/10">
          <div>
            <p className="text-xs text-muted-foreground">Follow the Money</p>
            <p className="text-sm font-mono font-bold" style={{ color: "#F5A100" }}>
              {formatVolume(kalshiVolume)} Kalshi volume
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Smart money signal</p>
            <p className="text-xs font-semibold text-green-400">
              {kalshiVolume >= 50_000 ? "High liquidity ✓" : "Low liquidity ⚠"}
            </p>
          </div>
        </div>
      )}

      {/* Sharp Meter */}
      <SharpMeter value={sharpMeter} />
    </Card>
  );
}

export default EdgeFinder;
