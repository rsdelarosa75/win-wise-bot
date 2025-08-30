import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Zap, ExternalLink, Copy } from "lucide-react";

export function ZapierIntegration() {
  const [webhookUrl, setWebhookUrl] = useState(() => 
    localStorage.getItem('zapier_webhook_url') || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveWebhook = () => {
    localStorage.setItem('zapier_webhook_url', webhookUrl);
    toast({
      title: "Webhook Saved",
      description: "Your Zapier webhook URL has been saved",
    });
  };

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your Zapier webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("Triggering Zapier webhook:", webhookUrl);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          triggered_from: window.location.origin,
          request_type: "manual_trigger",
        }),
      });

      toast({
        title: "Request Sent",
        description: "The request was sent to Zapier. Check your Zap's history to confirm it was triggered.",
      });
    } catch (error) {
      console.error("Error triggering webhook:", error);
      toast({
        title: "Error",
        description: "Failed to trigger the Zapier webhook. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyInstructions = () => {
    const instructions = `Setup Instructions:
1. Create a new Zap in Zapier
2. Add "Webhooks by Zapier" as the trigger
3. Choose "Catch Hook" 
4. Copy the webhook URL and paste it below
5. Configure your n8n workflow to send results to this Zapier webhook
6. In Zapier, add actions to process and send data back to this app

Example payload your n8n should send to Zapier:
{
  "teams": "Team A vs Team B",
  "persona": "analytical", 
  "analysis": "Your analysis text",
  "confidence": "High",
  "sport": "MLB"
}`;
    
    navigator.clipboard.writeText(instructions);
    toast({
      title: "Instructions Copied",
      description: "Setup instructions copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Zapier Integration
        </CardTitle>
        <CardDescription>
          Alternative way to connect your workflow results to the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zapier-webhook">Zapier Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="zapier-webhook"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <Button 
              variant="outline" 
              onClick={handleSaveWebhook}
              disabled={!webhookUrl}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleTrigger}
            disabled={!webhookUrl || isLoading}
            className="flex-1"
          >
            {isLoading ? "Triggering..." : "Test Trigger"}
          </Button>
          <Button 
            variant="outline" 
            onClick={copyInstructions}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Setup Guide
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-3">
          <h4 className="font-medium text-sm">Quick Setup:</h4>
          <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
            <li>Create a Zapier webhook trigger</li>
            <li>Connect your n8n workflow to send results to Zapier</li>
            <li>Configure Zapier to send formatted results back to this app</li>
            <li>Use the webhook URL above for testing</li>
          </ol>
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="w-4 h-4" />
            <a 
              href="https://zapier.com/apps/webhook/integrations" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Set up Zapier Webhooks
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}