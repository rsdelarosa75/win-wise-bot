import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface TelegramAnalysis {
  id: string;
  timestamp: string;
  command: string;
  teams: string;
  persona: string;
  analysis: string;
  confidence: 'High' | 'Medium' | 'Low';
  status: 'win' | 'neutral' | 'loss';
  odds?: string;
}

export const TelegramAnalyses = () => {
  const [analyses, setAnalyses] = useState<TelegramAnalysis[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
      command: '/analyze',
      teams: 'Chiefs vs Bills',
      persona: 'Sharp Bettor',
      analysis: '🎯 **Chiefs vs Bills Analysis** \n\n**Recommendation:** Bills +3.5 \n**Confidence:** 85% \n**Reasoning:** Weather conditions favor ground game, Bills strong at home. Sharp money moving toward Buffalo despite public on KC.',
      confidence: 'High',
      status: 'win',
      odds: 'Bills +3.5 (-110)'
    },
    {
      id: '2', 
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
      command: '/quick',
      teams: 'Yankees vs Red Sox',
      persona: 'Data-Driven Analyst',
      analysis: '⚾ **Yankees vs Red Sox** \n\n**Recommendation:** Under 9.5 runs \n**Confidence:** 72% \n**Reasoning:** Strong pitching matchup, wind blowing in at Fenway. Historical under trend in rivalry games.',
      confidence: 'Medium',
      status: 'neutral',
      odds: 'Under 9.5 (-115)'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago  
      command: '/persona contrarian',
      teams: 'Lakers vs Warriors',
      persona: 'Contrarian Expert',
      analysis: '🏀 **Lakers vs Warriors** \n\n**Recommendation:** AVOID \n**Confidence:** Low \n**Reasoning:** Too much public hype, inflated lines. Wait for better spots with less media attention.',
      confidence: 'Low', 
      status: 'loss',
      odds: 'No Play'
    }
  ]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call to fetch latest analyses
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return time.toLocaleDateString();
  };

  const getPersonaColor = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'sharp bettor': return 'border-win/30 text-win';
      case 'data-driven analyst': return 'border-primary/30 text-primary';
      case 'contrarian expert': return 'border-accent/30 text-accent';
      case 'risk-averse advisor': return 'border-neutral/30 text-neutral';
      case 'high-stakes gambler': return 'border-loss/30 text-loss';
      default: return 'border-muted-foreground/30 text-muted-foreground';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Recent Telegram Analyses</h3>
            <p className="text-sm text-muted-foreground">
              Latest results from your n8n Telegram workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-accent/30 text-accent">
            {analyses.length} Recent
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div 
              key={analysis.id}
              className="p-4 bg-secondary/30 rounded-lg border border-border/50 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {analysis.command}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPersonaColor(analysis.persona)}`}
                  >
                    {analysis.persona}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(analysis.timestamp)}
                  </div>
                </div>
                <Badge 
                  variant="outline"
                  className={`text-xs
                    ${analysis.status === 'win' ? 'border-win/30 text-win' : ''}
                    ${analysis.status === 'neutral' ? 'border-neutral/30 text-neutral' : ''}
                    ${analysis.status === 'loss' ? 'border-loss/30 text-loss' : ''}
                  `}
                >
                  {analysis.confidence}
                </Badge>
              </div>

              <div className="mb-3">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {analysis.teams}
                  {analysis.odds && (
                    <span className="text-muted-foreground">• {analysis.odds}</span>
                  )}
                </h4>
              </div>

              <div className="bg-background/50 rounded p-3">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground">
                  {analysis.analysis}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Connected to your Telegram → n8n workflow
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground">
              Auto-refreshes when new analyses arrive
            </div>
            <div className="w-2 h-2 bg-win rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </Card>
  );
};