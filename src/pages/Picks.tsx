import { N8nIntegration } from "@/components/ui/n8n-integration";

const Picks = () => {
  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Today's Picks 🎲</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask Bobby for AI-powered betting picks
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

      <N8nIntegration />
    </div>
  );
};

export default Picks;
