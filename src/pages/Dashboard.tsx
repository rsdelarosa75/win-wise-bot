import { DashboardPreview } from "@/components/ui/dashboard-preview";
import { MultiSportWebhooks } from "@/components/ui/multi-sport-webhooks";

const Dashboard = () => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 px-4 pt-6">
      <div>
        <h1 className="text-2xl font-bold">Good morning 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
        <p className="text-base text-foreground mt-2">Bobby's got picks ready for you</p>
      </div>

      <DashboardPreview />
      <MultiSportWebhooks />
    </div>
  );
};

export default Dashboard;
