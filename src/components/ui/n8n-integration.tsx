import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Clock, CheckCircle, FileText, Bookmark, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePicks } from "@/hooks/use-picks";
import { toast as sonnerToast } from "sonner";

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

// Extract a labelled field from analysis text, e.g. "CONFIDENCE: High"
const extractField = (text: string, ...keys: string[]): string | null => {
  for (const key of keys) {
    const re = new RegExp(`${key}\\s*[:\\-]\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    if (m) return m[1].replace(/\*\*/g, "").trim();
  }
  return null;
};

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p:          ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  strong:     ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em:         ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
  h1:         ({ children }) => <h1 className="font-bold text-base mt-3 mb-1 text-primary">{children}</h1>,
  h2:         ({ children }) => <h2 className="font-semibold text-sm mt-2 mb-1 text-primary">{children}</h2>,
  h3:         ({ children }) => <h3 className="font-medium text-sm mt-2 mb-0.5 text-primary/80">{children}</h3>,
  ul:         ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1.5 pl-1">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1.5 pl-1">{children}</ol>,
  li:         ({ children }) => <li className="leading-snug">{children}</li>,
  code:       ({ children }) => <code className="bg-primary/10 text-primary px-1 rounded text-xs font-mono">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground italic">{children}</blockquote>,
};

export const N8nIntegration = () => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_NBA || "";
  const { user } = useAuth();
  const { savePick } = usePicks();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);
  const [briefContent, setBriefContent] = useState("");
  const [specificTeams, setSpecificTeams] = useState("");
  const [targetDate, setTargetDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [pickSaved, setPickSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset saved state whenever new content arrives
  useEffect(() => { setPickSaved(false); }, [briefContent]);

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

      if (response.status === 403) throw new Error("403");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rawText = await response.text();
      console.log("[N8nIntegration] Response status:", response.status);
      console.log("[N8nIntegration] Response body:", rawText);

      setLastTriggered(new Date());
      toast({ title: "Bobby's pick is ready 🎲" });

      if (!rawText || rawText.trim().length === 0) {
        setBriefContent(
          'Bobby returned an empty response. Make sure your n8n workflow has a "Respond to Webhook" node at the end.'
        );
        return;
      }

      let displayContent = rawText;
      try {
        const parsed = JSON.parse(rawText);
        console.log("[N8nIntegration] Parsed JSON:", parsed);
        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        const textContent =
          data?.analysis ?? data?.output ?? data?.text ??
          data?.message ?? data?.content ?? data?.recommendation ??
          data?.result ?? null;

        if (typeof textContent === "string") {
          displayContent = textContent;
        } else if (typeof textContent === "object" && textContent !== null) {
          displayContent = JSON.stringify(textContent, null, 2);
        } else {
          displayContent = JSON.stringify(parsed, null, 2);
        }
      } catch {
        console.log("[N8nIntegration] Not JSON — showing raw text as-is");
      }

      const cleanContent = cleanHtmlContent(displayContent);
      setBriefContent(cleanContent);

      // Push this pick to the Home screen's Bobby's Picks section
      const pickText   = extractField(cleanContent, "BOBBY'S PICK", "Bobby's Pick", "Pick", "Recommendation", "BET", "My Pick");
      const confRaw    = extractField(cleanContent, "CONFIDENCE", "Confidence Level", "Confidence Score");
      const oddsText   = extractField(cleanContent, "ODDS", "Current Odds", "Moneyline", "Line", "Spread");
      const confNorm   = (["High", "Medium", "Low"].includes(confRaw ?? "") ? confRaw : "High") as "High" | "Medium" | "Low";
      const newAnalysis = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        command: "/webhook",
        teams: specificTeams.trim() || "NBA Analysis",
        persona: "bobby_vegas",
        analysis: cleanContent,
        confidence: confNorm,
        status: "win" as const,
        odds: oddsText ?? null,
        sport: "NBA",
        recommendation: pickText ?? null,
      };
      const existing: unknown[] = JSON.parse(localStorage.getItem("webhook_analyses") ?? "[]");
      const updated = [newAnalysis, ...existing]
        .filter((a, i, arr) =>
          arr.findIndex((x) => (x as { id: string }).id === (a as { id: string }).id) === i
        )
        .slice(0, 10);
      localStorage.setItem("webhook_analyses", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("webhookAnalysisAdded", { detail: newAnalysis }));
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

  const handleSavePick = async () => {
    if (!user) {
      sonnerToast("Sign in to save picks");
      return;
    }

    setIsSaving(true);
    try {
      const teams = specificTeams.trim() || "NBA Analysis";
      const pick = extractField(
        briefContent,
        "BOBBY'S PICK", "Bobby's Pick", "Pick", "Recommendation", "BET", "My Pick"
      );
      const confidence = extractField(
        briefContent,
        "CONFIDENCE", "Confidence Level", "Confidence"
      );

      await savePick({
        teams,
        sport: "NBA",
        pick: pick ?? null,
        confidence: (confidence as "High" | "Medium" | "Low") ?? "High",
        analysis: briefContent,
        odds: extractField(briefContent, "ODDS", "Current Odds", "Line") ?? null,
        bet_type: extractField(briefContent, "BET TYPE", "Bet Type", "TYPE") ?? null,
      });

      setPickSaved(true);
      sonnerToast("Saved to Tracker! 🎲✅");
    } catch {
      sonnerToast("Failed to save pick. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form card */}
      <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Result card */}
      {briefContent && (
        <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-neutral shrink-0" />
            <h3 className="text-sm font-semibold">Bobby's Pick</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          {/* Markdown analysis */}
          <div className="bg-background/50 rounded-lg p-3 mb-4">
            <ReactMarkdown className="text-sm leading-relaxed" components={mdComponents}>
              {briefContent}
            </ReactMarkdown>
          </div>

          {/* Save Pick button */}
          {user ? (
            <Button
              onClick={handleSavePick}
              disabled={pickSaved || isSaving}
              className="w-full min-h-[48px] font-bold text-black"
              style={{ backgroundColor: pickSaved ? undefined : '#F5A100' }}
              variant={pickSaved ? "outline" : "default"}
            >
              {pickSaved ? (
                <>
                  <Check className="mr-2 w-4 h-4 text-win" />
                  <span className="text-win">Saved to Tracker!</span>
                </>
              ) : isSaving ? (
                <>
                  <Clock className="mr-2 w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 w-4 h-4" />
                  Save Pick 🎲
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-2">
              <span className="text-primary">Sign in</span> to save picks to your Tracker
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
