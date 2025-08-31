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
  sport?: string;
}

export const TelegramAnalyses = () => {
  const [analyses, setAnalyses] = useState<TelegramAnalysis[]>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('webhook_analyses');
    const webhookAnalyses = stored ? JSON.parse(stored) : [];
    
    // Default mock data if no webhook analyses
    const mockData = [
      {
        id: 'mock1',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        command: '/analyze',
        teams: 'Chiefs vs Bills',
        persona: 'Sharp Bettor',
        analysis: '🎯 **Chiefs vs Bills Analysis** \n\n**Recommendation:** Bills +3.5 \n**Confidence:** 85% \n**Reasoning:** Weather conditions favor ground game, Bills strong at home. Sharp money moving toward Buffalo despite public on KC.',
        confidence: 'High' as const,
        status: 'win' as const,
        odds: 'Bills +3.5 (-110)'
      }
    ];
    
    return webhookAnalyses.length > 0 ? webhookAnalyses : mockData;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listen for new webhook analyses
  useEffect(() => {
    const handleNewAnalysis = (event: CustomEvent) => {
      console.log("Received webhookAnalysisAdded event:", event.detail);
      const newAnalysis = event.detail;
      setAnalyses(prev => {
        console.log("Current analyses:", prev.length);
        const updated = [newAnalysis, ...prev.slice(0, 9)];
        console.log("Updated analyses:", updated.length);
        return updated;
      });
    };
    
    // Also refresh from localStorage periodically
    const refreshFromStorage = () => {
      const stored = localStorage.getItem('webhook_analyses');
      if (stored) {
        try {
          const webhookAnalyses = JSON.parse(stored);
          setAnalyses(webhookAnalyses);
          console.log("Refreshed from storage, count:", webhookAnalyses.length);
        } catch (e) {
          console.error("Error parsing stored analyses:", e);
        }
      }
    };
    
    console.log("Setting up webhookAnalysisAdded listener");
    window.addEventListener('webhookAnalysisAdded', handleNewAnalysis as EventListener);
    
    // Refresh every 5 seconds to catch any missed updates
    const interval = setInterval(refreshFromStorage, 5000);
    
    return () => {
      console.log("Removing webhookAnalysisAdded listener");
      window.removeEventListener('webhookAnalysisAdded', handleNewAnalysis as EventListener);
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Reload from localStorage
    const stored = localStorage.getItem('webhook_analyses');
    if (stored) {
      const webhookAnalyses = JSON.parse(stored);
      setAnalyses(webhookAnalyses);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
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
            <h3 className="text-xl font-semibold">Recent Workflow Analyses</h3>
            <p className="text-sm text-muted-foreground">
              Latest results from your n8n webhook workflows
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
                  {analysis.sport && (
                    <Badge variant="outline" className="text-xs">
                      {analysis.sport}
                    </Badge>
                  )}
                </h4>
              </div>

              <div className="bg-background/50 rounded p-3">
                {(() => {
                  try {
                    // Try to parse as JSON first
                    const parsed = typeof analysis.analysis === 'string' 
                      ? JSON.parse(analysis.analysis) 
                      : analysis.analysis;
                    
                    if (parsed && typeof parsed === 'object') {
                      return (
                        <div className="space-y-3">
                          {/* Key Metrics Row */}
                          {(parsed.recommendation || parsed.confidence_percentage || parsed.units) && (
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              {parsed.recommendation && (
                                <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                                  <div className="text-xs text-muted-foreground">Recommendation</div>
                                  <div className="font-semibold text-primary text-sm">{parsed.recommendation}</div>
                                  {parsed.bet_type && (
                                    <div className="text-xs text-muted-foreground capitalize">{parsed.bet_type}</div>
                                  )}
                                </div>
                              )}
                              {parsed.confidence_percentage && (
                                <div className="text-center p-2 bg-win/10 rounded border border-win/20">
                                  <div className="text-xs text-muted-foreground">Confidence</div>
                                  <div className="font-semibold text-win text-sm">{parsed.confidence_percentage}%</div>
                                  <div className="text-xs text-muted-foreground">{parsed.confidence || "High"}</div>
                                </div>
                              )}
                              {parsed.units && (
                                <div className="text-center p-2 bg-accent/10 rounded border border-accent/20">
                                  <div className="text-xs text-muted-foreground">Units</div>
                                  <div className="font-semibold text-accent text-sm">{parsed.units}</div>
                                  <div className="text-xs text-muted-foreground">Recommended</div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Key Factors */}
                          {parsed.key_factors && parsed.key_factors.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Key Factors</div>
                              <div className="flex flex-wrap gap-1">
                                {parsed.key_factors.map((factor: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Enhanced Analysis Content with Odds Extraction */}
                          <div className="space-y-3">
                            {/* Extract and display odds information */}
                            {(() => {
                              const analysisText = parsed.analysis || "";
                              
                              // Extract favorite/underdog info
                              const favoriteMatch = analysisText.match(/\*\*Favorite:\*\*\s*([^(]+)\s*\(([^)]+)\)/);
                              const underdogMatch = analysisText.match(/\*\*Underdog:\*\*\s*([^(]+)\s*\(([^)]+)\)/);
                              
                              if (favoriteMatch || underdogMatch) {
                                return (
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    {favoriteMatch && (
                                      <div className="p-2 bg-loss/10 rounded border border-loss/20">
                                        <div className="text-xs text-muted-foreground">Favorite</div>
                                        <div className="font-semibold text-loss text-sm">{favoriteMatch[1].trim()}</div>
                                        <div className="text-xs text-muted-foreground">{favoriteMatch[2]}</div>
                                      </div>
                                    )}
                                    {underdogMatch && (
                                      <div className="p-2 bg-win/10 rounded border border-win/20">
                                        <div className="text-xs text-muted-foreground">Underdog</div>
                                        <div className="font-semibold text-win text-sm">{underdogMatch[1].trim()}</div>
                                        <div className="text-xs text-muted-foreground">{underdogMatch[2]}</div>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            <div 
                              className="text-sm leading-relaxed prose-sm"
                              dangerouslySetInnerHTML={{
                                __html: (parsed.analysis || parsed.content || "")
                                  .replace(/\n\n/g, "<br><br>")
                                  .replace(/\n/g, "<br>")
                                  .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-foreground'>$1</strong>")
                                  .replace(/#{3}\s*(.*?)(?=<br>|$)/g, "<h3 class='font-semibold text-base mb-2 mt-3 text-primary'>$1</h3>")
                                  .replace(/#{2}\s*(.*?)(?=<br>|$)/g, "<h2 class='font-semibold text-lg mb-2 mt-4 text-primary'>$1</h2>")
                                  .replace(/#{1}\s*(.*?)(?=<br>|$)/g, "<h1 class='font-bold text-xl mb-3 mt-4 text-primary'>$1</h1>")
                                  .replace(/"square money"/g, "<span class='bg-loss/20 text-loss px-1 rounded text-xs font-medium'>square money</span>")
                                  .replace(/"sharp money"/g, "<span class='bg-win/20 text-win px-1 rounded text-xs font-medium'>sharp money</span>")
                                  .replace(/\(currently\s*([^)]+)\)/g, "<span class='bg-primary/20 text-primary px-1 rounded text-xs font-medium'>$1</span>")
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    // Enhanced fallback string formatting for raw text analysis
                    const analysisText = analysis.analysis || "";
                    
                    return (
                      <div className="space-y-3">
                        {/* Extract odds from raw text */}
                        {(() => {
                          const favoriteMatch = analysisText.match(/Favorite:\s*([^(]+)\s*\(([^)]+)\)/);
                          const underdogMatch = analysisText.match(/Underdog:\s*([^(]+)\s*\(([^)]+)\)/);
                          
                          if (favoriteMatch || underdogMatch) {
                            return (
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                {favoriteMatch && (
                                  <div className="p-2 bg-loss/10 rounded border border-loss/20">
                                    <div className="text-xs text-muted-foreground">Favorite</div>
                                    <div className="font-semibold text-loss text-sm">{favoriteMatch[1].trim()}</div>
                                    <div className="text-xs text-muted-foreground">{favoriteMatch[2]}</div>
                                  </div>
                                )}
                                {underdogMatch && (
                                  <div className="p-2 bg-win/10 rounded border border-win/20">
                                    <div className="text-xs text-muted-foreground">Underdog</div>
                                    <div className="font-semibold text-win text-sm">{underdogMatch[1].trim()}</div>
                                    <div className="text-xs text-muted-foreground">{underdogMatch[2]}</div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        <div 
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: analysisText
                              .replace(/\n\n/g, "<br><br>")
                              .replace(/\n/g, "<br>")
                              .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
                              .replace(/#{3}\s*(.*?)(?=<br>|$)/g, "<h3 class='font-semibold text-base mb-2 mt-3 text-primary'>$1</h3>")
                              .replace(/#{2}\s*(.*?)(?=<br>|$)/g, "<h2 class='font-semibold text-lg mb-2 mt-4 text-primary'>$1</h2>")
                              .replace(/#{1}\s*(.*?)(?=<br>|$)/g, "<h1 class='font-bold text-xl mb-3 mt-4 text-primary'>$1</h1>")
                              .replace(/"square money"/g, "<span class='bg-loss/20 text-loss px-1 rounded text-xs font-medium'>square money</span>")
                              .replace(/"sharp money"/g, "<span class='bg-win/20 text-win px-1 rounded text-xs font-medium'>sharp money</span>")
                              .replace(/\(currently\s*([^)]+)\)/g, "<span class='bg-primary/20 text-primary px-1 rounded text-xs font-medium'>$1</span>")
                          }}
                        />
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Connected to your n8n webhook workflows
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