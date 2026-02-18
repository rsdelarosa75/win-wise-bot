import { DashboardPreview } from "@/components/ui/dashboard-preview";
import { MultiSportWebhooks } from "@/components/ui/multi-sport-webhooks";

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
    <div className="space-y-6 px-4 pt-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold">Good morning 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
        <p className="text-base text-foreground mt-2">Bobby's got picks ready for you</p>
      </div>

      <DashboardPreview onUpgradeClick={onUpgradeClick} />
      <MultiSportWebhooks />
    </div>
  );
};

export default Dashboard;
