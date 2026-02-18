import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Clock, CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const cleanHtmlContent = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

export const N8nIntegration = () => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_NBA || "";
  const [isLoading, setIsLoading] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);
  const [briefContent, setBriefContent] = useState("");
  const [specificTeams, setSpecificTeams] = useState("");
  const [targetDate, setTargetDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webhookUrl) {
      toast({
        title: "Not configured",
        description: "VITE_N8N_WEBHOOK_NBA is not set.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const teams = specificTeams.trim() || "general recommendations";
      const payload = {
        sport: "NBA",
        sports: ["NBA"],
        teams,
        text: teams,
        persona: "bobby_vegas",
        targetDate,
        test: true,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 403) {
        throw new Error("403");
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rawText = await response.text();
      console.log('[N8nIntegration] Response status:', response.status);
      console.log('[N8nIntegration] Response body:', rawText);

      setLastTriggered(new Date());
      toast({ title: "Bobby's pick is ready 🎲" });

      if (!rawText || rawText.trim().length === 0) {
        setBriefContent(
          'Bobby returned an empty response. Make sure your n8n workflow has a "Respond to Webhook" node at the end.'
        );
        return;
      }

      // Try JSON first — n8n can return many shapes
      let displayContent = rawText;
      try {
        const parsed = JSON.parse(rawText);
        console.log('[N8nIntegration] Parsed JSON:', parsed);

        // Unwrap arrays: n8n often returns [{ ... }]
        const data = Array.isArray(parsed) ? parsed[0] : parsed;

        // Walk common field names where the analysis text might live
        const textContent =
          data?.analysis ??
          data?.output ??
          data?.text ??
          data?.message ??
          data?.content ??
          data?.recommendation ??
          data?.result ??
          null;

        if (typeof textContent === 'string') {
          displayContent = textContent;
        } else if (typeof textContent === 'object' && textContent !== null) {
          displayContent = JSON.stringify(textContent, null, 2);
        } else {
          // No known field — pretty-print the whole response
          displayContent = JSON.stringify(parsed, null, 2);
        }
      } catch {
        console.log('[N8nIntegration] Not JSON — showing raw text as-is');
        // displayContent already holds rawText
      }

      setBriefContent(cleanHtmlContent(displayContent));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Connection Error",
        description:
          msg === "403" || msg.includes("403")
            ? "Bobby's taking a timeout, try again in a moment 🎲"
            : msg.includes("Failed to fetch")
            ? "Could not reach Bobby's Engine. Check the URL."
            : msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teams */}
          <div className="space-y-1.5">
            <Label htmlFor="teams" className="text-sm font-medium">
              Teams / Matchup
            </Label>
            <Input
              id="teams"
              placeholder="e.g., Lakers vs Warriors"
              value={specificTeams}
              onChange={(e) => setSpecificTeams(e.target.value)}
              className="h-11 text-sm bg-background/50"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="target-date" className="text-sm font-medium">
              Target Date
            </Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-11 text-sm bg-background/50"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] text-sm font-semibold bg-gradient-primary"
          >
            {isLoading ? (
              <>
                <Clock className="mr-2 w-4 h-4 animate-spin" />
                Bobby's analyzing… 🎲
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

      {/* Result */}
      {briefContent && (
        <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-neutral shrink-0" />
            <h3 className="text-sm font-semibold">Bobby's Pick</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
          <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed break-words bg-background/50 rounded-lg p-3">
            {briefContent}
          </pre>
        </Card>
      )}
    </div>
  );
};
