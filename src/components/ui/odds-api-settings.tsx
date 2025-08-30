import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface OddsApiSettingsProps {
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onRemoveApiKey: () => void;
  hasApiKey: boolean;
}

export const OddsApiSettings = ({ 
  apiKey, 
  onSaveApiKey, 
  onRemoveApiKey, 
  hasApiKey 
}: OddsApiSettingsProps) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!inputKey.trim()) {
      toast({
        title: 'Invalid API Key',
        description: 'Please enter a valid API key',
        variant: 'destructive'
      });
      return;
    }

    onSaveApiKey(inputKey.trim());
    toast({
      title: 'API Key Saved',
      description: 'Your Odds API key has been saved to local storage',
    });
  };

  const handleRemove = () => {
    onRemoveApiKey();
    setInputKey('');
    toast({
      title: 'API Key Removed',
      description: 'Your API key has been removed from local storage',
    });
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">The Odds API Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure your API key to display live odds for MLB, NFL, and College Football
          </p>
        </div>
        {hasApiKey && (
          <Badge variant="outline" className="border-win/30 text-win ml-auto">
            Connected
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">The Odds API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your The Odds API key"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button onClick={handleSave} disabled={!inputKey.trim()}>
              <Key className="w-4 h-4 mr-2" />
              Save
            </Button>
            {hasApiKey && (
              <Button variant="outline" onClick={handleRemove}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>

        {!hasApiKey && (
          <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Get Your API Key
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              To display live odds data, you need an API key from The Odds API:
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside mb-4">
              <li>Visit The Odds API website</li>
              <li>Sign up for a free account</li>
              <li>Get your API key from the dashboard</li>
              <li>Paste it above and click Save</li>
            </ol>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://the-odds-api.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Get API Key
              </a>
            </Button>
          </div>
        )}

        {hasApiKey && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">MLB</div>
              <div className="text-xs text-muted-foreground">Baseball</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-accent">NFL</div>
              <div className="text-xs text-muted-foreground">Football</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-neutral">NCAAF</div>
              <div className="text-xs text-muted-foreground">College Football</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};