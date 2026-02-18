import { TelegramAnalyses } from "@/components/ui/telegram-analyses";
import { LiveOdds } from "@/components/ui/live-odds";
import { Card } from "@/components/ui/card";

interface DashboardProps {
  onUpgradeClick: () => void;
}

const Dashboard = ({ onUpgradeClick }: DashboardProps) => {
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
        <p className="text-sm text-muted-foreground mt-0.5">Bobby's got picks ready for you</p>
      </div>

      {/* Today's NBA Picks */}
      <div>
        <h2 className="text-base font-semibold mb-3">Today's NBA Picks</h2>
        <TelegramAnalyses onUpgradeClick={onUpgradeClick} />
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
