import { TelegramAnalyses } from "@/components/ui/telegram-analyses";
import { LiveOdds } from "@/components/ui/live-odds";
import { Card } from "@/components/ui/card";

interface DashboardProps {
  onUpgradeClick: () => void;
  onPicksTabClick: () => void;
}

const Dashboard = ({ onUpgradeClick, onPicksTabClick }: DashboardProps) => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5 px-4 pt-6 pb-24">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Good morning 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] mt-1" style={{ color: '#F5A100' }}>
          Where AI Meets the Action
        </p>
        {/* Sports icons */}
        <div className="flex items-center gap-3 text-xl mt-2">
          {['🏈', '⚾', '🏀', '🏒'].map((emoji, i) => (
            <span
              key={emoji}
              style={{ animation: `bv-shimmer 2.6s ease-in-out ${i * 0.4}s infinite` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Today's NBA Picks */}
      <div>
        <h2 className="text-base font-semibold mb-3">Today's NBA Picks</h2>
        <TelegramAnalyses onUpgradeClick={onUpgradeClick} onPicksTabClick={onPicksTabClick} />
      </div>

      {/* Live Odds */}
      <div>
        <h2 className="text-base font-semibold mb-3">Live Odds</h2>
        <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
          <LiveOdds />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
