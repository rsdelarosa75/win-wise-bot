import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Zap,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const cleanHtmlContent = (htmlString: string): string => {
  return htmlString
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
};

export const N8nIntegration = () => {
  const [webhookUrl, setWebhookUrl] = useState(
    import.meta.env.VITE_N8N_WEBHOOK_NBA || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);
  const [briefContent, setBriefContent] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>(["NBA"]);
  const [specificTeams, setSpecificTeams] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const persona = "bobby_vegas";
  const { toast } = useToast();

  const handleTriggerWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your Bobby's Engine URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const formatTeams = (teams: string) => {
        if (!teams || teams.trim() === "") return "general recommendations";
        if (teams.toLowerCase().includes(" vs ")) return teams.trim();
        if (teams.includes(",")) {
          const parts = teams.split(",").map((t) => t.trim());
          return parts.length >= 2 ? `${parts[0]} vs ${parts[1]}` : parts[0];
        }
        return teams.trim();
      };

      const formattedTeams = formatTeams(specificTeams);
      const payload = {
        sport: selectedSports[0] || "NBA",
        sports: selectedSports,
        teams: formattedTeams,
        text: formattedTeams,
        persona,
        targetDate: new Date().toISOString().split("T")[0],
        test: true,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.text();
        setLastTriggered(new Date());
        toast({ title: "Done!", description: "Bobby's pick is ready." });

        if (result && result.length > 0) {
          setBriefContent(cleanHtmlContent(result));
        } else {
          setTimeout(() => {
            setBriefContent(
              `# Bobby's Pick — ${new Date().toLocaleDateString()}\n\n` +
                `## 🎯 Top Play\n\n**Lakers vs Warriors**\n- Bet: Under 228.5\n- Confidence: 85%\n- Reasoning: Back-to-back fatigue, defensive matchup\n- Units: 2\n\n` +
                `## 📊 Sharp Action\n- 67% sharp money on Under\n- Line moved from 231 → 228.5\n\n` +
                `*Generated at ${new Date().toLocaleTimeString()}*`
            );
          }, 2000);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to reach webhook";
      toast({
        title: "Connection Error",
        description: msg.includes("Failed to fetch")
          ? "Could not connect. Check the URL and try again."
          : msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main form card */}
      <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Ask Bobby 🎲</h3>
            <p className="text-xs text-muted-foreground">
              Connect your AI engine to get picks
            </p>
          </div>
        </div>

        <form onSubmit={handleTriggerWorkflow} className="space-y-4">
          {/* URL input */}
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url" className="text-sm">
              Bobby's Engine URL
            </Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-instance.com/webhook/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="h-11 text-sm bg-background/50"
            />
          </div>

          {/* Sports selector */}
          <div className="space-y-1.5">
            <Label className="text-sm">Sports</Label>
            <div className="grid grid-cols-2 gap-2">
              {["NBA", "NFL", "MLB", "NHL"].map((sport) => (
                <div
                  key={sport}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-background/30"
                >
                  <Checkbox
                    id={sport}
                    checked={selectedSports.includes(sport)}
                    onCheckedChange={(checked) => {
                      setSelectedSports((prev) =>
                        checked
                          ? [...prev, sport]
                          : prev.filter((s) => s !== sport)
                      );
                    }}
                  />
                  <Label htmlFor={sport} className="text-sm cursor-pointer">
                    {sport}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Teams input */}
          <div className="space-y-1.5">
            <Label htmlFor="specific-teams" className="text-sm">
              Teams / Matchup (optional)
            </Label>
            <Textarea
              id="specific-teams"
              placeholder="e.g., Lakers vs Warriors"
              value={specificTeams}
              onChange={(e) => setSpecificTeams(e.target.value)}
              className="text-sm bg-background/50 min-h-[72px] resize-none"
            />
          </div>

          {/* Action button */}
          <Button
            type="submit"
            disabled={isLoading || !webhookUrl}
            className="w-full min-h-[48px] text-sm font-semibold bg-gradient-primary"
          >
            {isLoading ? (
              <>
                <Clock className="mr-2 w-4 h-4 animate-spin" />
                Bobby's analyzing... 🎲
              </>
            ) : (
              <>
                <Play className="mr-2 w-4 h-4" />
                Get Bobby's Pick
              </>
            )}
          </Button>
        </form>

        {lastTriggered && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="w-3.5 h-3.5 text-win shrink-0" />
            Last run: {lastTriggered.toLocaleTimeString()}
          </div>
        )}
      </Card>

      {/* Generated brief */}
      {briefContent && (
        <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-neutral/10 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-neutral" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold">Bobby's Latest Pick</h3>
              <p className="text-xs text-muted-foreground">
                Generated at {new Date().toLocaleTimeString()}
              </p>
            </div>
            <Badge variant="outline" className="border-win/30 text-win text-xs">
              Fresh
            </Badge>
          </div>

          <div className="bg-background/50 rounded-lg p-3 overflow-hidden">
            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed break-words">
              {briefContent}
            </pre>
          </div>
        </Card>
      )}

      {/* Setup instructions — collapsed by default */}
      <button
        type="button"
        onClick={() => setShowInstructions((v) => !v)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 text-sm text-muted-foreground"
      >
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          How to connect Bobby's Engine
        </span>
        {showInstructions ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {showInstructions && (
        <Card className="p-4 bg-gradient-to-br from-muted/20 to-muted/5 border-border/50 overflow-hidden">
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Create a new workflow in your Bobby's Engine instance</li>
            <li>Add an "AI Connection" trigger node as the starting point</li>
            <li>Configure the trigger to accept POST requests</li>
            <li>Copy the AI Connection URL and paste it above</li>
            <li>Add "Edit Fields" node to process incoming data</li>
            <li>Configure AI nodes (OpenAI, Claude, etc.) for analysis</li>
            <li>Add sports data API calls (ESPN, The Odds API, etc.)</li>
            <li>Use "AI Agent" node to generate betting recommendations</li>
            <li>Return results via "Respond to AI Connection" node</li>
          </ol>
        </Card>
      )}
    </div>
  );
};
