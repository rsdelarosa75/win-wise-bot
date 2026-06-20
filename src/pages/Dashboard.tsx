import React, { useState } from "react";
import { TelegramAnalyses } from "@/components/ui/telegram-analyses";
import { LiveOdds } from "@/components/ui/live-odds";
import { Card } from "@/components/ui/card";
import type { GameOdds } from "@/components/ui/live-odds";

type Sport = "Soccer" | "NHL" | "WNBA" | "MLB" | "NFL" | "NCAAFB" | "NBA";

interface DashboardProps {
  onPicksTabClick: () => void;
  onGameSelect: (teams: string, date: string, odds?: GameOdds, sport?: Sport) => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 17) return "Good afternoon 👋";
  return "Good evening 👋";
};

const SPORT_BUTTONS: { sport: Sport; emoji: string; label: string }[] = [
  { sport: "Soccer", emoji: "⚽", label: "Soccer" },
  { sport: "NHL",    emoji: "🏒", label: "NHL" },
  { sport: "WNBA",   emoji: "🏀", label: "WNBA" },
  { sport: "MLB",    emoji: "⚾", label: "MLB" },
  { sport: "NFL",    emoji: "🏈", label: "NFL" },
  { sport: "NCAAFB", emoji: "🏈", label: "NCAAFB" },
  { sport: "NBA",    emoji: "🏀", label: "NBA" },
];

const Dashboard = ({ onPicksTabClick, onGameSelect }: DashboardProps) => {
  const [oddsSport, setOddsSport] = useState<Sport>("Soccer");
  const [picksLabel, setPicksLabel] = useState("Today's Picks");

  const handleSportsChange = (sports: string[]) => {
    if (sports.length === 1) {
      setPicksLabel(`Today's ${sports[0]} Picks`);
    } else {
      setPicksLabel("Today's Picks");
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
    <div className="space-y-5 px-4 pt-6 pb-24">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] mt-1" style={{ color: '#F5A100' }}>
          Where AI Meets the Action
        </p>
        {/* Sports icons */}
        <div className="flex items-center gap-3 text-xl mt-2">
          {['🏈', '⚾', '🏀', '🏒', '⚽'].map((emoji, i) => (
            <span
              key={emoji}
              style={{ animation: `bv-shimmer 2.6s ease-in-out ${i * 0.4}s infinite` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Live Odds */}
      <div>
        <h2 className="text-base font-semibold mb-2">Live Odds</h2>

        {/* Sport selector */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {SPORT_BUTTONS.map(({ sport, emoji, label }) => (
            <button
              key={sport}
              onClick={() => setOddsSport(sport)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                oddsSport === sport
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/50 text-muted-foreground border-border/50 hover:border-primary/40"
              }`}
            >
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>

        <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-x-hidden">
          <LiveOdds sport={oddsSport} onGameSelect={onGameSelect} />
        </Card>
      </div>

      {/* Today's Picks */}
      <div>
        <h2 className="text-base font-semibold mb-3">{picksLabel}</h2>
        <TelegramAnalyses onPicksTabClick={onPicksTabClick} onSportsChange={handleSportsChange} />
      </div>
    </div>
    </div>
  );
};

export default Dashboard;
