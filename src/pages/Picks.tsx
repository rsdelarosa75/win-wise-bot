import { N8nIntegration } from "@/components/ui/n8n-integration";

const Picks = () => {
  return (
    <div className="space-y-6 px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold">Today's Picks 🎲</h1>

      <N8nIntegration />

      <p className="text-sm text-muted-foreground text-center pb-4">
        Enter your N8N webhook URL to pull live AI picks
      </p>
    </div>
  );
};

export default Picks;
