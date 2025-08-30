import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Play, 
  Zap, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  AlertCircle 
} from 'lucide-react';

interface SportWebhook {
  sport: string;
  webhookUrl: string;
  lastTriggered: Date | null;
  isActive: boolean;
  icon: string;
  color: string;
}

export const MultiSportWebhooks = () => {
  const [sportWebhooks, setSportWebhooks] = useState<SportWebhook[]>([
    {
      sport: 'MLB',
      webhookUrl: localStorage.getItem('webhook_mlb') || '',
      lastTriggered: null,
      isActive: false,
      icon: '⚾',
      color: 'primary'
    },
    {
      sport: 'NFL', 
      webhookUrl: localStorage.getItem('webhook_nfl') || '',
      lastTriggered: null,
      isActive: false,
      icon: '🏈',
      color: 'accent'
    },
    {
      sport: 'College Football',
      webhookUrl: localStorage.getItem('webhook_cfb') || '',
      lastTriggered: null,
      isActive: false,
      icon: '🏟️',
      color: 'neutral'
    },
    {
      sport: 'NBA',
      webhookUrl: localStorage.getItem('webhook_nba') || '',
      lastTriggered: null,
      isActive: false,
      icon: '🏀',
      color: 'win'
    },
    {
      sport: 'NHL',
      webhookUrl: localStorage.getItem('webhook_nhl') || '',
      lastTriggered: null,
      isActive: false,
      icon: '🏒',
      color: 'loss'
    }
  ]);

  const [activeTab, setActiveTab] = useState('MLB');
  const [testTeams, setTestTeams] = useState('Alabama vs Georgia');
  const [testPersona, setTestPersona] = useState('analytical');
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const updateWebhookUrl = (sport: string, url: string) => {
    setSportWebhooks(prev => 
      prev.map(webhook => 
        webhook.sport === sport 
          ? { ...webhook, webhookUrl: url, isActive: !!url }
          : webhook
      )
    );
    localStorage.setItem(`webhook_${sport.toLowerCase().replace(' ', '_')}`, url);
  };

  const testWebhook = async (sport: string, url: string) => {
    if (!url) {
      toast({
        title: 'No URL',
        description: `Please enter a webhook URL for ${sport}`,
        variant: 'destructive'
      });
      return;
    }

    try {
      const testPayload = {
        sport,
        teams: testTeams,
        text: testTeams,
        persona: testPersona,
        targetDate: testDate,
        test: true
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        setSportWebhooks(prev => 
          prev.map(webhook => 
            webhook.sport === sport 
              ? { ...webhook, lastTriggered: new Date() }
              : webhook
          )
        );
        
        toast({
          title: `${sport} Webhook Success`,
          description: 'Test payload sent successfully',
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: `${sport} Webhook Error`,
        description: error instanceof Error ? error.message : 'Failed to test webhook',
        variant: 'destructive'
      });
    }
  };

  const copyWebhookEndpoint = (sport: string) => {
    const endpoint = `${window.location.origin}/webhook/${sport.toLowerCase().replace(' ', '-')}`;
    navigator.clipboard.writeText(endpoint);
    toast({
      title: 'Endpoint Copied',
      description: `${sport} webhook endpoint copied to clipboard`
    });
  };

  const currentWebhook = sportWebhooks.find(w => w.sport === activeTab);

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Multi-Sport Webhook Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Connect separate n8n workflows for each sport
          </p>
        </div>
      </div>

      {/* Sport Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {sportWebhooks.map((webhook) => (
          <div 
            key={webhook.sport}
            className={`text-center p-3 rounded-lg border transition-all cursor-pointer ${
              webhook.isActive 
                ? 'bg-primary/10 border-primary/30' 
                : 'bg-secondary/30 border-border/50 hover:border-primary/20'
            }`}
            onClick={() => setActiveTab(webhook.sport)}
          >
            <div className="text-2xl mb-1">{webhook.icon}</div>
            <div className="text-xs font-medium">{webhook.sport}</div>
            <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${
              webhook.isActive ? 'bg-win' : 'bg-muted'
            }`} />
          </div>
        ))}
      </div>

      {/* Individual Sport Configuration */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full mb-4">
          {sportWebhooks.map((webhook) => (
            <TabsTrigger key={webhook.sport} value={webhook.sport} className="text-xs">
              {webhook.icon} {webhook.sport}
            </TabsTrigger>
          ))}
        </TabsList>

        {sportWebhooks.map((webhook) => (
          <TabsContent key={webhook.sport} value={webhook.sport} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor={`${webhook.sport}-url`}>
                  {webhook.sport} n8n Webhook URL
                </Label>
                <Badge 
                  variant="outline" 
                  className={webhook.isActive ? 'border-win/30 text-win' : 'border-muted/30'}
                >
                  {webhook.isActive ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Input
                  id={`${webhook.sport}-url`}
                  type="url"
                  placeholder={`https://your-n8n-instance.com/webhook/${webhook.sport.toLowerCase()}`}
                  value={webhook.webhookUrl}
                  onChange={(e) => updateWebhookUrl(webhook.sport, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => testWebhook(webhook.sport, webhook.webhookUrl)}
                  disabled={!webhook.webhookUrl}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Test
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Enter the webhook URL from your {webhook.sport} n8n workflow
              </p>

              {webhook.lastTriggered && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-win" />
                  Last triggered: {webhook.lastTriggered.toLocaleString()}
                </div>
              )}
            </div>

            {/* Test Payload */}
            <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
              <h4 className="font-semibold mb-3">Test payload</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`${webhook.sport}-teams`}>Teams</Label>
                  <Input
                    id={`${webhook.sport}-teams`}
                    placeholder={`e.g., ${webhook.sport === 'College Football' ? 'Alabama vs Georgia' : webhook.sport === 'NFL' ? 'Eagles vs Cowboys' : webhook.sport === 'MLB' ? 'Yankees vs Red Sox' : 'Team A vs Team B'}`}
                    value={testTeams}
                    onChange={(e) => setTestTeams(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Format: Team A vs Team B</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${webhook.sport}-persona`}>Persona</Label>
                  <Select value={testPersona} onValueChange={setTestPersona}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analytical">Data-Driven Analyst</SelectItem>
                      <SelectItem value="sharp">Sharp Bettor</SelectItem>
                      <SelectItem value="contrarian">Contrarian Expert</SelectItem>
                      <SelectItem value="cautious">Risk-Averse Advisor</SelectItem>
                      <SelectItem value="aggressive">High-Stakes Gambler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${webhook.sport}-date`}>Target Date</Label>
                  <Input
                    id={`${webhook.sport}-date`}
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">The Test button will send this payload.</p>
            </div>

            {/* Usage Instructions */}
            <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {webhook.sport} Workflow Setup
              </h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>1. Create {webhook.sport} n8n workflow:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Add Webhook trigger node</li>
                  <li>Configure for {webhook.sport} data processing</li>
                  <li>Add {webhook.sport}-specific team parsing</li>
                  <li>Connect to {webhook.sport} odds APIs</li>
                  <li>Add AI analysis optimized for {webhook.sport}</li>
                </ul>
                <p><strong>2. Recommended payload format:</strong></p>
                <pre className="text-xs bg-background/50 p-2 rounded border mt-2">
{`{
  "sport": "${webhook.sport}",
  "teams": "Team A vs Team B",
  "persona": "analytical|sharp|contrarian|cautious|aggressive",
  "targetDate": "2025-08-30"
}`}
                </pre>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Global Settings */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Webhooks stored locally in browser
          </div>
          <div className="text-xs text-muted-foreground">
            {sportWebhooks.filter(w => w.isActive).length} of {sportWebhooks.length} sports configured
          </div>
        </div>
      </div>
    </Card>
  );
};