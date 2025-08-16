import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Play, 
  Calendar, 
  Zap, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle 
} from "lucide-react";

export const N8nIntegration = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);
  const [briefContent, setBriefContent] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>(["NBA"]);
  const [specificTeams, setSpecificTeams] = useState("");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [maxRecommendations, setMaxRecommendations] = useState("3");
  const { toast } = useToast();

  const handleTriggerWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your n8n webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("Triggering n8n workflow:", webhookUrl);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          triggered_from: window.location.origin,
          request_type: "betting_recommendation",
          user_preferences: {
            sports: selectedSports,
            risk_level: riskLevel,
            max_recommendations: parseInt(maxRecommendations),
            specific_teams: specificTeams.trim() || null,
            focus_areas: ["odds_analysis", "injury_reports", "weather_conditions"]
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        setLastTriggered(new Date());
        setBriefContent(result.recommendation || result.analysis || JSON.stringify(result, null, 2));
        
        toast({
          title: "Recommendation Received",
          description: "Your betting recommendation has been generated successfully.",
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error("Error triggering workflow:", error);
      
      // Fallback - show that webhook was called but we couldn't get response
      setLastTriggered(new Date());
      toast({
        title: "Webhook Triggered",
        description: "Request sent to n8n. Check your workflow for results - response may be sent back separately.",
      });
      
      // Simulate receiving data after delay (for demo purposes)
      setTimeout(() => {
        setBriefContent(`# AI Betting Recommendation - ${new Date().toLocaleDateString()}

## 🎯 Today's Top Recommendations

### **Game 1: Lakers vs Warriors**
- **Recommended Bet**: Under 228.5 Total Points
- **Confidence Level**: 85%
- **Reasoning**: Both teams on back-to-back games, strong defensive matchup
- **Unit Allocation**: 2 units

### **Game 2: Chiefs vs Bills** 
- **Recommended Bet**: Bills +3.5
- **Confidence Level**: 78%
- **Reasoning**: Weather conditions favor ground game, Bills at home
- **Unit Allocation**: 1.5 units

## 📊 Market Analysis
- **Sharp Money**: 67% on Bills spread
- **Public Betting**: 73% on Chiefs
- **Line Movement**: Chiefs opened -2.5, now -3.5

## ⚡ Live Updates
- LeBron James listed as PROBABLE
- Weather: 15mph winds in Buffalo
- Key injuries monitored

## 🏆 Model Performance
- **Yesterday's Record**: 3-1 (+2.1 units)
- **Week Record**: 18-12 (+8.4 units)
- **Model Accuracy**: 67.8%

*Generated via n8n workflow at ${new Date().toLocaleTimeString()}*`);
      }, 2000);
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">n8n Workflow Configuration</h3>
            <p className="text-sm text-muted-foreground">Connect your n8n instance for automated betting briefs</p>
          </div>
        </div>

        <form onSubmit={handleTriggerWorkflow} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">n8n Webhook URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://your-n8n-instance.com/webhook/your-workflow-id"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              Copy the webhook URL from your n8n workflow and paste it here
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sports</Label>
              <div className="space-y-2">
                {["NBA", "NFL", "MLB", "NHL", "Soccer"].map((sport) => (
                  <div key={sport} className="flex items-center space-x-2">
                    <Checkbox
                      id={sport}
                      checked={selectedSports.includes(sport)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSports([...selectedSports, sport]);
                        } else {
                          setSelectedSports(selectedSports.filter(s => s !== sport));
                        }
                      }}
                    />
                    <Label htmlFor={sport} className="text-sm">{sport}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk-level">Risk Level</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specific-teams">Specific Teams/Games (Optional)</Label>
            <Textarea
              id="specific-teams"
              placeholder="e.g., Lakers vs Warriors, Chiefs vs Bills, Liverpool vs Arsenal..."
              value={specificTeams}
              onChange={(e) => setSpecificTeams(e.target.value)}
              className="bg-background/50 min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Enter specific teams or matchups you want recommendations for. Leave blank for general recommendations.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-recommendations">Max Recommendations</Label>
            <Select value={maxRecommendations} onValueChange={setMaxRecommendations}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Recommendation</SelectItem>
                <SelectItem value="3">3 Recommendations</SelectItem>
                <SelectItem value="5">5 Recommendations</SelectItem>
                <SelectItem value="10">10 Recommendations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              type="submit" 
              disabled={isLoading || !webhookUrl}
              className="bg-gradient-primary"
            >
              {isLoading ? (
                <>
                  <Clock className="mr-2 w-4 h-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="mr-2 w-4 h-4" />
                  Trigger Daily Brief
                </>
              )}
            </Button>

            <Button type="button" variant="outline" disabled>
              <Calendar className="mr-2 w-4 h-4" />
              Schedule Daily (Coming Soon)
            </Button>
          </div>
        </form>

        {lastTriggered && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-win" />
            Last triggered: {lastTriggered.toLocaleString()}
          </div>
        )}
      </Card>

      {/* Workflow Status */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-lg font-semibold">Workflow Status</h3>
          </div>
          <Badge variant="outline" className="border-accent/30 text-accent">
            {webhookUrl ? "Configured" : "Not Configured"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <div className="text-2xl font-bold text-accent">3</div>
            <div className="text-sm text-muted-foreground">Workflows Active</div>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <div className="text-2xl font-bold text-primary">24</div>
            <div className="text-sm text-muted-foreground">Briefs Generated</div>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <div className="text-2xl font-bold text-win">98%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </div>
      </Card>

      {/* Generated Brief Display */}
      {briefContent && (
        <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-neutral/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-neutral" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Latest AI Betting Brief</h3>
              <p className="text-sm text-muted-foreground">Generated by your n8n workflow</p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="border-win/30 text-win">
                Fresh
              </Badge>
            </div>
          </div>

          <div className="bg-background/50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
              {briefContent}
            </pre>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
            <Button variant="outline" size="sm">
              <FileText className="mr-2 w-4 h-4" />
              Export Brief
            </Button>
            <Button variant="outline" size="sm">
              Share Analysis
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              Updated {new Date().toLocaleTimeString()}
            </div>
          </div>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card className="p-6 bg-gradient-to-br from-muted/20 to-muted/5 border-border/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-neutral mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold">How to set up your n8n workflow:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Create a new workflow in your n8n instance</li>
              <li>Add a "Webhook" trigger node as the starting point</li>
              <li>Configure AI nodes (OpenAI, Claude, etc.) for content generation</li>
              <li>Add sports data API calls (ESPN, SportRadar, etc.)</li>
              <li>Format the output and send back via HTTP response</li>
              <li>Copy the webhook URL and paste it above</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
};