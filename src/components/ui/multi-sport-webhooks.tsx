import { useState, useEffect } from 'react';
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
  AlertCircle,
  Clock
} from 'lucide-react';

interface SportWebhook {
  sport: string;
  webhookUrl: string;
  lastTriggered: Date | null;
  isActive: boolean;
  comingSoon: boolean;
  icon: string;
  color: string;
}

export const MultiSportWebhooks = () => {
  const [sportWebhooks, setSportWebhooks] = useState<SportWebhook[]>([
    {
      sport: 'NBA',
      webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_NBA || '',
      lastTriggered: null,
      isActive: !!import.meta.env.VITE_N8N_WEBHOOK_NBA,
      comingSoon: false,
      icon: '🏀',
      color: 'win'
    },
    {
      sport: 'NFL',
      webhookUrl: '',
      lastTriggered: null,
      isActive: false,
      comingSoon: true,
      icon: '🏈',
      color: 'accent'
    },
    {
      sport: 'MLB',
      webhookUrl: '',
      lastTriggered: null,
      isActive: false,
      comingSoon: true,
      icon: '⚾',
      color: 'primary'
    },
    {
      sport: 'College Football',
      webhookUrl: '',
      lastTriggered: null,
      isActive: false,
      comingSoon: true,
      icon: '🏟️',
      color: 'neutral'
    },
    {
      sport: 'NHL',
      webhookUrl: '',
      lastTriggered: null,
      isActive: false,
      comingSoon: true,
      icon: '🏒',
      color: 'loss'
    }
  ]);

  const [activeTab, setActiveTab] = useState('NBA');
  const [testTeams, setTestTeams] = useState('Lakers vs Celtics');

  useEffect(() => {
    const nbaUrl = import.meta.env.VITE_N8N_WEBHOOK_NBA;
    console.log('[MultiSportWebhooks] VITE_N8N_WEBHOOK_NBA =', nbaUrl ?? 'undefined (not set)');
  }, []);
  const [testPersona, setTestPersona] = useState('analytical');
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

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
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.status === 403) {
        throw new Error('403');
      }

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
        
        // Read and log the full response before doing anything with it
        const responseText = await response.text();
        console.log('[MultiSportWebhooks] Response status:', response.status);
        console.log('[MultiSportWebhooks] Response body:', responseText);

        let newAnalysis: object;

        try {
          const parsed = JSON.parse(responseText);
          console.log('[MultiSportWebhooks] Parsed JSON:', parsed);

          // Unwrap arrays: n8n often returns [{ ... }]
          const data = Array.isArray(parsed) ? parsed[0] : parsed;

          // Extract analysis text — may be a string, a nested object, or missing
          const rawAnalysis =
            data?.analysis ??
            data?.output ??
            data?.text ??
            data?.message ??
            data?.content ??
            data?.recommendation ??
            data?.result ??
            data;

          const analysisString =
            typeof rawAnalysis === 'string'
              ? rawAnalysis
              : JSON.stringify(rawAnalysis, null, 2);

          newAnalysis = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            command: '/webhook',
            teams: data?.teams || `${sport} Analysis`,
            persona: data?.persona || 'bobby_vegas',
            analysis: analysisString,
            confidence: data?.confidence || 'High',
            status: 'win',
            odds: data?.recommendation || data?.odds || 'Live Analysis',
            sport: data?.sport || sport,
          };

          console.log('[MultiSportWebhooks] Storing analysis:', newAnalysis);
        } catch {
          console.log('[MultiSportWebhooks] Not JSON — storing raw text as analysis');
          // Store raw text verbatim so it still shows up in the dashboard
          newAnalysis = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            command: '/webhook',
            teams: `${sport} Analysis`,
            persona: 'bobby_vegas',
            analysis: responseText || '(empty response)',
            confidence: 'High',
            status: 'win',
            odds: 'Live Analysis',
            sport,
          };
        }

        const existingAnalyses = JSON.parse(localStorage.getItem('webhook_analyses') || '[]');
        const updatedAnalyses = [newAnalysis, ...existingAnalyses.slice(0, 9)];
        localStorage.setItem('webhook_analyses', JSON.stringify(updatedAnalyses));
        console.log('[MultiSportWebhooks] Stored analyses count:', updatedAnalyses.length);
        console.log('[MultiSportWebhooks] Dispatching webhookAnalysisAdded');
        window.dispatchEvent(new CustomEvent('webhookAnalysisAdded', { detail: newAnalysis }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to test webhook';
      toast({
        title: `${sport} Webhook Error`,
        description:
          msg === '403' || msg.includes('403')
            ? "Bobby's taking a timeout, try again in a moment 🎲"
            : msg,
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
          <h3 className="text-xl font-semibold">Multi-Sport AI Connection</h3>
          <p className="text-sm text-muted-foreground">
            Connect separate Bobby's Engine workflows for each sport
          </p>
        </div>
      </div>

      {/* Sport Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {sportWebhooks.map((webhook) => (
          <div
            key={webhook.sport}
            className={`text-center p-3 rounded-lg border transition-all ${
              webhook.comingSoon
                ? 'bg-muted/20 border-border/30 opacity-50 cursor-not-allowed'
                : webhook.isActive
                ? 'bg-primary/10 border-primary/30 cursor-pointer'
                : 'bg-secondary/30 border-border/50 cursor-pointer hover:border-primary/20'
            }`}
            onClick={() => !webhook.comingSoon && setActiveTab(webhook.sport)}
          >
            <div className="text-2xl mb-1">{webhook.icon}</div>
            <div className="text-xs font-medium">{webhook.sport}</div>
            {webhook.comingSoon ? (
              <div className="text-[10px] text-muted-foreground mt-1">Soon</div>
            ) : (
              <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${
                webhook.isActive ? 'bg-win' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Individual Sport Configuration — only show non-coming-soon tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-1 w-full mb-4">
          {sportWebhooks.filter(w => !w.comingSoon).map((webhook) => (
            <TabsTrigger key={webhook.sport} value={webhook.sport} className="text-xs">
              {webhook.icon} {webhook.sport}
            </TabsTrigger>
          ))}
        </TabsList>

        {sportWebhooks.filter(w => !w.comingSoon).map((webhook) => (
          <TabsContent key={webhook.sport} value={webhook.sport} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{webhook.sport} AI Connection</span>
                <Badge
                  variant="outline"
                  className={webhook.isActive ? 'border-win/30 text-win' : 'border-muted/30 text-muted-foreground'}
                >
                  {webhook.isActive ? 'Connected' : 'Not Configured'}
                </Badge>
              </div>

              {webhook.isActive ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => testWebhook(webhook.sport, webhook.webhookUrl)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Test {webhook.sport} Connection
                </Button>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-loss/10 border border-loss/30 rounded-md">
                  <AlertCircle className="w-4 h-4 text-loss mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-loss">Webhook not configured</p>
                    <p className="text-xs text-muted-foreground">
                      Add <code className="font-mono bg-background/50 px-1 rounded">VITE_N8N_WEBHOOK_{webhook.sport.toUpperCase().replace(' ', '_')}</code> to your <code className="font-mono bg-background/50 px-1 rounded">.env</code> file and restart the dev server.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                <Clock className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-700">
                  Betting analysis results typically take 1 minute to process
                </p>
              </div>

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
                    placeholder={`e.g., ${webhook.sport === 'College Football' ? 'Alabama vs Florida State' : webhook.sport === 'NFL' ? 'Eagles vs Cowboys' : webhook.sport === 'MLB' ? 'Yankees vs Red Sox' : 'Team A vs Team B'}`}
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
                      <SelectItem value="bobby-vegas">Bobby Vegas</SelectItem>
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
                <p><strong>1. Create {webhook.sport} Bobby's Engine workflow:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Add AI Connection trigger node</li>
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
            AI Connections configured via environment variables
          </div>
          <div className="text-xs text-muted-foreground">
            {sportWebhooks.filter(w => w.isActive).length} live · {sportWebhooks.filter(w => w.comingSoon).length} coming soon
          </div>
        </div>
      </div>
    </Card>
  );
};