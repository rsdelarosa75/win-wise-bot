import { N8nIntegration } from "@/components/ui/n8n-integration";

const Picks = () => {
  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Today's Picks 🎲</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask Bobby for AI-powered betting picks
        </p>
      </div>

      <N8nIntegration />
    </div>
  );
};

export default Picks;
