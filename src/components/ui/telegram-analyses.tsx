import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { testAddAnalysis } from '@/utils/webhook-handler';

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
  // Optional enriched metrics coming from the AI/webhook
  recommendation?: string;
  bet_type?: string;
  confidence_percentage?: number;
  confidence_interval?: string;
  expected_value?: string;
  kelly_criterion?: number;
  units?: number;
  key_factors?: string[];
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
  const [showImporter, setShowImporter] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

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
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 shadow-card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center shadow-sm">
            <MessageSquare className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">AI Workflow Analyses</h3>
            <p className="text-sm text-muted-foreground">
              Live betting insights from your automated workflows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-accent/30 text-accent px-3 py-1">
            {analyses.length} Active
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowImporter((v) => !v)}
            className="border-accent/30 hover:bg-accent/10"
          >
            Import JSON
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-primary/30 hover:bg-primary/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {showImporter && (
        <div className="mb-4 rounded-lg border border-border/30 p-3 bg-background/60">
          <div className="text-sm mb-2 text-muted-foreground">Paste n8n JSON analysis</div>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"favorite_team":"..."}'
            className="mb-2"
            rows={6}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { const ok = testAddAnalysis(jsonInput); if (ok) { setJsonInput(''); setShowImporter(false); } }}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => setShowImporter(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div 
              key={analysis.id}
              className="p-5 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl border border-border/30 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {analysis.command}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 ${getPersonaColor(analysis.persona)}`}
                  >
                    {analysis.persona}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(analysis.timestamp)}
                  </div>
                </div>
                <Badge 
                  variant="outline"
                  className={`text-sm px-3 py-1 font-semibold
                    ${analysis.confidence === 'High' ? 'border-win/40 text-win bg-win/5' : ''}
                    ${analysis.confidence === 'Medium' ? 'border-neutral/40 text-neutral bg-neutral/5' : ''}
                    ${analysis.confidence === 'Low' ? 'border-loss/40 text-loss bg-loss/5' : ''}
                  `}
                >
                  {analysis.confidence} Confidence
                </Badge>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-lg mb-2 flex items-center gap-3 text-foreground">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  {analysis.teams}
                  {analysis.sport && (
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      {analysis.sport}
                    </Badge>
                  )}
                </h4>
                {analysis.odds && (
                  <div className="text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-lg inline-block">
                    <strong>Current Odds:</strong> {analysis.odds}
                  </div>
                )}
              </div>

              <div className="bg-background/70 rounded-xl p-4 border border-border/20">
                {(() => {
                  try {
                    // Try to parse as JSON first
                    const parsed = typeof analysis.analysis === 'string' 
                      ? JSON.parse(analysis.analysis)
                      : analysis.analysis;

                    const metrics = {
                      recommendation: parsed?.recommendation ?? parsed?.recommendation_team ?? analysis.recommendation,
                      bet_type: parsed?.bet_type ?? analysis.bet_type,
                      confidence_percentage: parsed?.confidence_percentage ?? analysis.confidence_percentage,
                      confidence_interval: parsed?.confidence_interval ?? analysis.confidence_interval,
                      expected_value: parsed?.expected_value ?? analysis.expected_value,
                      kelly_criterion: parsed?.kelly_criterion ?? analysis.kelly_criterion,
                      units: parsed?.units ?? analysis.units,
                      key_factors: parsed?.key_factors ?? analysis.key_factors,
                      analysisText: parsed?.analysis ?? parsed?.content ?? analysis.analysis,
                      recommendation_side: parsed?.recommendation_side,
                    };

                    // Handle both JSON structure and markdown parsing for favorite/underdog
                    const analysisTextFull = metrics.analysisText || "";
                    
                    // First try to get from JSON structure (for newer API responses)
                    let favoriteTeam: { team: string; odds: string } | undefined;
                    let underdogTeam: { team: string; odds: string } | undefined;
                    
                    if (parsed?.favorite_team && parsed?.favorite_odds) {
                      favoriteTeam = { 
                        team: parsed.favorite_team, 
                        odds: parsed.favorite_odds.toString() 
                      };
                    }
                    if (parsed?.underdog_team && parsed?.underdog_odds) {
                      underdogTeam = { 
                        team: parsed.underdog_team, 
                        odds: parsed.underdog_odds.toString() 
                      };
                    }
                    
                    // Fallback to markdown parsing if JSON structure not available
                    if (!favoriteTeam || !underdogTeam) {
                      const favRegexA = /\*\*Favorite:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/;
                      const dogRegexA = /\*\*Underdog:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/;
                      const favRegexB = /Favorite:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/;
                      const dogRegexB = /Underdog:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/;

                      const favM = analysisTextFull.match(favRegexA) || analysisTextFull.match(favRegexB);
                      const dogM = analysisTextFull.match(dogRegexA) || analysisTextFull.match(dogRegexB);

                      if (!favoriteTeam && favM) {
                        favoriteTeam = { team: favM[1].trim(), odds: favM[2].trim() };
                      }
                      if (!underdogTeam && dogM) {
                        underdogTeam = { team: dogM[1].trim(), odds: dogM[2].trim() };
                      }
                    }

                    const parseAmerican = (s: string) => {
                      const m = s.replace(/,/g, '').match(/([+-]?\d+)/);
                      return m ? parseInt(m[1], 10) : Number.NaN;
                    };

                    let inversionDetected = false;
                    if (favoriteTeam && underdogTeam) {
                      const fo = parseAmerican(favoriteTeam.odds);
                      const doo = parseAmerican(underdogTeam.odds);
                      if (!Number.isNaN(fo) && !Number.isNaN(doo) && fo > doo) {
                        inversionDetected = true;
                        const tmp = favoriteTeam; favoriteTeam = underdogTeam; underdogTeam = tmp;
                      }
                    }

                    const recTeam = metrics.recommendation?.toLowerCase().trim();
                    const recSide = metrics.recommendation_side || 
                      (recTeam
                        ? (favoriteTeam && recTeam.includes(favoriteTeam.team.toLowerCase())) ? 'Favorite'
                          : (underdogTeam && recTeam.includes(underdogTeam.team.toLowerCase())) ? 'Underdog'
                          : undefined
                        : undefined);

                    if (parsed && typeof parsed === 'object') {
                      return (
                        <div className="space-y-3">
                          {/* Enhanced Analysis with Confidence Metrics */}
                          {(metrics.confidence_percentage || metrics.confidence_interval || metrics.expected_value) && (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              {metrics.confidence_percentage && (
                                <div className="text-center p-2 bg-win/10 rounded border border-win/20">
                                  <div className="text-xs text-muted-foreground">Win Probability</div>
                                  <div className="font-semibold text-win text-sm">{metrics.confidence_percentage}%</div>
                                </div>
                              )}
                              {metrics.confidence_interval && (
                                <div className="text-center p-2 bg-neutral/10 rounded border border-neutral/20">
                                  <div className="text-xs text-muted-foreground">95% CI</div>
                                  <div className="font-semibold text-neutral text-sm">{metrics.confidence_interval}</div>
                                </div>
                              )}
                              {metrics.expected_value && (
                                <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                                  <div className="text-xs text-muted-foreground">Expected Value</div>
                                  <div className="font-semibold text-primary text-sm">{metrics.expected_value}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Betting Recommendation Row */}
                          {(metrics.recommendation || metrics.units || metrics.bet_type || metrics.kelly_criterion) && (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              {metrics.recommendation && (
                                  <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                                    <div className="text-xs text-muted-foreground">Recommendation</div>
                                    <div className="font-semibold text-primary text-sm">
                                      {metrics.recommendation}
                                      {recSide && (
                                        <span className="ml-1 text-xs text-muted-foreground">({recSide})</span>
                                      )}
                                    </div>
                                    {(metrics.bet_type || recSide) && (
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {metrics.bet_type}
                                        {recSide === 'Favorite' && favoriteTeam ? ` • ${favoriteTeam.odds}` : ''}
                                        {recSide === 'Underdog' && underdogTeam ? ` • ${underdogTeam.odds}` : ''}
                                      </div>
                                    )}
                                  </div>
                              )}
                              {metrics.units && (
                                <div className="text-center p-2 bg-accent/10 rounded border border-accent/20">
                                  <div className="text-xs text-muted-foreground">Units</div>
                                  <div className="font-semibold text-accent text-sm">{metrics.units}</div>
                                  <div className="text-xs text-muted-foreground">Recommended</div>
                                </div>
                              )}
                              {metrics.kelly_criterion && (
                                <div className="text-center p-2 bg-secondary/20 rounded border border-border/30">
                                  <div className="text-xs text-muted-foreground">Kelly %</div>
                                  <div className="font-semibold text-foreground text-sm">{metrics.kelly_criterion}%</div>
                                  <div className="text-xs text-muted-foreground">Optimal Size</div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Key Factors */}
                          {metrics.key_factors && metrics.key_factors.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Key Factors</div>
                              <div className="flex flex-wrap gap-1">
                                {metrics.key_factors.map((factor: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Enhanced Analysis Content with Odds Extraction */}
                          <div className="space-y-3">
                            {inversionDetected && (
                              <div className="text-xs p-2 bg-accent/10 rounded border border-accent/20">
                                Note: Corrected favorite/underdog labels based on American odds.
                              </div>
                            )}
                            {/* Extract and display odds information */}
                            {(() => {
const analysisText = metrics.analysisText || "";
                               
// Extract favorite/underdog info (supports **Favorite:** and Favorite:)
const favoriteMatch = analysisText.match(/\*\*Favorite:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/) || analysisText.match(/Favorite:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/);
const underdogMatch = analysisText.match(/\*\*Underdog:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/) || analysisText.match(/Underdog:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/);
                               
// Normalize by American odds: negative = favorite
const parseAmerican = (s: string) => {
  const m = s.replace(/,/g, '').match(/([+-]?\d+)/);
  return m ? parseInt(m[1], 10) : Number.NaN;
};

const favCand = favoriteMatch ? { team: favoriteMatch[1].trim(), odds: favoriteMatch[2].trim() } : null;
const dogCand = underdogMatch ? { team: underdogMatch[1].trim(), odds: underdogMatch[2].trim() } : null;

let favorite = favCand || undefined;
let underdog = dogCand || undefined;

if (favCand && dogCand) {
  const fo = parseAmerican(favCand.odds);
  const doo = parseAmerican(dogCand.odds);
  if (!Number.isNaN(fo) && !Number.isNaN(doo)) {
    if (fo <= doo) {
      favorite = favCand;
      underdog = dogCand;
    } else {
      favorite = dogCand;
      underdog = favCand;
    }
  }
}

if (favorite || underdog) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <span>AI Analysis Odds</span>
        <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-500">
          Not Live Market
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {favorite && (
          <div className="p-2 bg-loss/10 rounded border border-loss/20">
            <div className="text-xs text-muted-foreground">AI: Favorite</div>
            <div className="font-semibold text-loss text-sm">{favorite.team}</div>
            <div className="text-xs text-muted-foreground">{favorite.odds}</div>
          </div>
        )}
        {underdog && (
          <div className="p-2 bg-win/10 rounded border border-win/20">
            <div className="text-xs text-muted-foreground">AI: Underdog</div>
            <div className="font-semibold text-win text-sm">{underdog.team}</div>
            <div className="text-xs text-muted-foreground">{underdog.odds}</div>
          </div>
        )}
      </div>
    </div>
  );
}
return null;
                            })()}
                            
                            {(() => {
                              // Language correction for mismatches in narrative text
                              const originalText = metrics.analysisText || "";
                              const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                              let correctedText = originalText;
                              let note = '';

                              if (recSide === 'Favorite' && favoriteTeam) {
                                const team = favoriteTeam.team;
                                const escapedTeam = escapeRegExp(team);
                                correctedText = correctedText
                                  .replace(new RegExp(`\\*\\*Underdog:\\*\\*\\s*${escapedTeam}\\s*\\(([^)]+)\\)`, 'gi'), `**Favorite:** ${team} ($1)`) // label swap
                                  .replace(new RegExp(`Underdog:\\s*${escapedTeam}\\s*\\(([^)]+)\\)`, 'gi'), `Favorite: ${team} ($1)`) // label swap
                                  .replace(new RegExp(`(${escapedTeam}[^\\.\\n]{0,120}?)\\bunderdog\\b`, 'gi'), `$1favorite`) // nearby wording
                                  // Upset/narrative cleanup when the pick is the favorite
                                  .replace(/\b(pull(?:s|ing)?\s+off\s+the\s+upset|pulls?\s+the\s+upset|pull(?:s|ing)?\s+an\s+upset)\b/gi, 'secure the win')
                                  .replace(new RegExp(`(${escapedTeam}[^\\.\\n]{0,200}?)(\\bupset\\b)`, 'gi'), '$1win')
                                  .replace(new RegExp(`(${escapedTeam}[^\\.\\n]{0,200}?\\bas\\s+an\\s+)underdog\\b`, 'gi'), '$1favorite');
                                if (correctedText !== originalText) note = `${team} is the favorite in this matchup.`;
                              } else if (recSide === 'Underdog' && underdogTeam) {
                                const team = underdogTeam.team;
                                const escapedTeam = escapeRegExp(team);
                                correctedText = correctedText
                                  .replace(new RegExp(`\\*\\*Favorite:\\*\\*\\s*${escapedTeam}\\s*\\(([^)]+)\\)`, 'gi'), `**Underdog:** ${team} ($1)`)
                                  .replace(new RegExp(`Favorite:\\s*${escapedTeam}\\s*\\(([^)]+)\\)`, 'gi'), `Underdog: ${team} ($1)`)
                                  .replace(new RegExp(`(${escapedTeam}[^\\.\\n]{0,120}?)\\bfavorite\\b`, 'gi'), `$1underdog`);
                                if (correctedText !== originalText) note = `${team} is the underdog in this matchup.`;
                              }

                              return (
                                <>
                                  {note && (
                                    <div className="text-xs p-2 bg-primary/10 rounded border border-primary/20">
                                      Correction: {note}
                                    </div>
                                  )}
                                  <div 
                                    className="text-sm leading-relaxed prose-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: correctedText
                                        .replace(/\n\n/g, "<br><br>")
                                        .replace(/\n/g, "<br>")
                                        .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-foreground'>$1</strong>")
                                        .replace(/#{3}\s*(.*?)(?=<br>|$)/g, "<h3 class='font-semibold text-base mb-2 mt-3 text-primary'>$1</h3>")
                                        .replace(/#{2}\s*(.*?)(?=<br>|$)/g, "<h2 class='font-semibold text-lg mb-2 mt-4 text-primary'>$1</h2>")
                                        .replace(/#{1}\s*(.*?)(?=<br>|$)/g, "<h1 class='font-bold text-xl mb-3 mt-4 text-primary'>$1</h1>")
                                        .replace(/\"square money\"/g, "<span class='bg-loss/20 text-loss px-1 rounded text-xs font-medium'>square money</span>")
                                        .replace(/\"sharp money\"/g, "<span class='bg-win/20 text-win px-1 rounded text-xs font-medium'>sharp money</span>")
                                        .replace(/\(currently\s*([^)]+)\)/g, "<span class='bg-primary/20 text-primary px-1 rounded text-xs font-medium'>$1</span>")
                                    }}
                                  />
                                </>
                              );
                            })()}
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
const favoriteMatch = analysisText.match(/\*\*Favorite:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/) || analysisText.match(/Favorite:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/);
const underdogMatch = analysisText.match(/\*\*Underdog:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/) || analysisText.match(/Underdog:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/);
                           
// Normalize by American odds: negative = favorite
const parseAmerican = (s: string) => {
  const m = s.replace(/,/g, '').match(/([+-]?\d+)/);
  return m ? parseInt(m[1], 10) : Number.NaN;
};

const favCand = favoriteMatch ? { team: favoriteMatch[1].trim(), odds: favoriteMatch[2].trim() } : null;
const dogCand = underdogMatch ? { team: underdogMatch[1].trim(), odds: underdogMatch[2].trim() } : null;

let favorite = favCand || undefined;
let underdog = dogCand || undefined;

if (favCand && dogCand) {
  const fo = parseAmerican(favCand.odds);
  const doo = parseAmerican(dogCand.odds);
  if (!Number.isNaN(fo) && !Number.isNaN(doo)) {
    if (fo <= doo) {
      favorite = favCand;
      underdog = dogCand;
    } else {
      favorite = dogCand;
      underdog = favCand;
    }
  }
}

if (favorite || underdog) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <span>AI Analysis Odds</span>
        <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-500">
          Not Live Market
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {favorite && (
          <div className="p-2 bg-loss/10 rounded border border-loss/20">
            <div className="text-xs text-muted-foreground">AI: Favorite</div>
            <div className="font-semibold text-loss text-sm">{favorite.team}</div>
            <div className="text-xs text-muted-foreground">{favorite.odds}</div>
          </div>
        )}
        {underdog && (
          <div className="p-2 bg-win/10 rounded border border-win/20">
            <div className="text-xs text-muted-foreground">AI: Underdog</div>
            <div className="font-semibold text-win text-sm">{underdog.team}</div>
            <div className="text-xs text-muted-foreground">{underdog.odds}</div>
          </div>
        )}
      </div>
    </div>
  );
}
return null;
                         })()}
                        
                        {(() => {
                          // Correct mislabeling in narrative text when odds imply otherwise
                          const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                          let correctedText = analysisText;

                          const favoriteMatch2 = analysisText.match(/\*\*Favorite:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/) || analysisText.match(/Favorite:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/);
                          const underdogMatch2 = analysisText.match(/\*\*Underdog:\*\*\s*([^ (]+[^)]*)\s*\(([^)]+)\)/) || analysisText.match(/Underdog:\s*([^ (]+[^)]*)\s*\(([^)]+)\)/);
                          const parseAmerican2 = (s: string) => { const m = s.replace(/,/g, '').match(/([+-]?\d+)/); return m ? parseInt(m[1], 10) : Number.NaN; };
                          const favCand2 = favoriteMatch2 ? { team: favoriteMatch2[1].trim(), odds: favoriteMatch2[2].trim() } : null;
                          const dogCand2 = underdogMatch2 ? { team: underdogMatch2[1].trim(), odds: underdogMatch2[2].trim() } : null;

                          if (favCand2 && dogCand2) {
                            const fo = parseAmerican2(favCand2.odds);
                            const doo = parseAmerican2(dogCand2.odds);
                            if (!Number.isNaN(fo) && !Number.isNaN(doo) && fo > doo) {
                              // Swap labels for correct display
                              const favTeam = dogCand2.team;
                              const dogTeam = favCand2.team;
                              const favEsc = escapeRegExp(favTeam);
                              const dogEsc = escapeRegExp(dogTeam);
                              correctedText = correctedText
                                .replace(new RegExp(`\\*\\*Favorite:\\*\\*\\s*${dogEsc}\\s*\\(([^)]+)\\)`, 'gi'), `**Favorite:** ${favTeam} ($1)`)
                                .replace(new RegExp(`Favorite:\\s*${dogEsc}\\s*\\(([^)]+)\\)`, 'gi'), `Favorite: ${favTeam} ($1)`)
                                .replace(new RegExp(`\\*\\*Underdog:\\*\\*\\s*${favEsc}\\s*\\(([^)]+)\\)`, 'gi'), `**Underdog:** ${dogTeam} ($1)`)
                                .replace(new RegExp(`Underdog:\\s*${favEsc}\\s*\\(([^)]+)\\)`, 'gi'), `Underdog: ${dogTeam} ($1)`);
                            }
                          }

                          return (
                            <div 
                              className="text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: correctedText
                                  .replace(/\n\n/g, "<br><br>")
                                  .replace(/\n/g, "<br>")
                                  .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
                                  .replace(/#{3}\s*(.*?)(?=<br>|$)/g, "<h3 class='font-semibold text-base mb-2 mt-3 text-primary'>$1</h3>")
                                  .replace(/#{2}\s*(.*?)(?=<br>|$)/g, "<h2 class='font-semibold text-lg mb-2 mt-4 text-primary'>$1</h2>")
                                  .replace(/#{1}\s*(.*?)(?=<br>|$)/g, "<h1 class='font-bold text-xl mb-3 mt-4 text-primary'>$1</h1>")
                                  .replace(/\"square money\"/g, "<span class='bg-loss/20 text-loss px-1 rounded text-xs font-medium'>square money</span>")
                                  .replace(/\"sharp money\"/g, "<span class='bg-win/20 text-win px-1 rounded text-xs font-medium'>sharp money</span>")
                                  .replace(/\(currently\s*([^)]+)\)/g, "<span class='bg-primary/20 text-primary px-1 rounded text-xs font-medium'>$1</span>")
                              }}
                            />
                          );
                        })()}
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