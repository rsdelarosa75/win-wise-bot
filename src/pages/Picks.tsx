import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { N8nIntegration } from "@/components/ui/n8n-integration";
import type { GameOdds } from "@/components/ui/live-odds";

type Sport = "NBA" | "MLB" | "WNBA" | "NHL" | "NFL" | "NCAAFB";

interface PicksProps {
  pendingPick?: { teams: string; date: string; odds?: GameOdds; sport?: Sport } | null;
  onPendingPickConsumed?: () => void;
  onBack?: () => void;
}

const SPORT_BUTTONS: { sport: Sport; emoji: string; label: string }[] = [
  { sport: "NBA",    emoji: "🏀", label: "NBA" },
  { sport: "MLB",    emoji: "⚾", label: "MLB" },
  { sport: "WNBA",   emoji: "🏀", label: "WNBA" },
  { sport: "NHL",    emoji: "🏒", label: "NHL" },
  { sport: "NFL",    emoji: "🏈", label: "NFL" },
  { sport: "NCAAFB", emoji: "🏈", label: "NCAAFB" },
];

const Picks = ({ pendingPick, onPendingPickConsumed, onBack }: PicksProps = {}) => {
  const [sport, setSport] = useState<Sport>("NBA");

  // Auto-select the correct sport tab when a game card tap arrives with sport info
  useEffect(() => {
    if (pendingPick?.sport) {
      console.log("[Picks] Auto-selecting sport from pendingPick:", pendingPick.sport);
      setSport(pendingPick.sport);
    }
  }, [pendingPick]);

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div>
        <div className="flex items-center gap-1 mb-1">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors -ml-1"
            aria-label="Back to Home"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Today's Picks 🎲</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Ask Bobby for AI-powered betting picks
        </p>

        {/* Sport selector */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {SPORT_BUTTONS.map(({ sport: s, emoji, label }) => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                sport === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/50 text-muted-foreground border-border/50 hover:border-primary/40"
              }`}
            >
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>
      </div>

      <N8nIntegration
        sport={sport}
        pendingPick={pendingPick}
        onPendingPickConsumed={onPendingPickConsumed}
      />
    </div>
    </div>
  );
};

export default Picks;
