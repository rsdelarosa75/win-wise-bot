import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveOdds } from "@/components/ui/live-odds";
import { OddsApiSettings } from "@/components/ui/odds-api-settings";
import { TelegramAnalyses } from "@/components/ui/telegram-analyses";
import { GameWeather } from "@/components/ui/game-weather";
import { MultiSportWebhooks } from "@/components/ui/multi-sport-webhooks";
import { useOddsApi } from "@/hooks/use-odds-api";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";

interface TelegramAnalysis {
  id: string;
  timestamp: string;
  command: string;
  teams: string;
  persona: string;
  analysis: string;
  confidence: string;
  status: string;
  odds: string;
  sport?: string;
  recommendation?: string;
  bet_type?: string;
  confidence_percentage?: number;
  units?: number;
  key_factors?: string[];
}

interface DashboardPreviewProps {
  onUpgradeClick: () => void;
}

export const DashboardPreview = ({ onUpgradeClick }: DashboardPreviewProps) => {
  const { apiKey, saveApiKey, removeApiKey, hasApiKey, games } = useOddsApi();
  const [activePersona, setActivePersona] = useState("Money Making Mitch");
  const [analyses, setAnalyses] = useState<TelegramAnalysis[]>([]);
  
  useEffect(() => {
    const loadAnalyses = () => {
      try {
        const stored = localStorage.getItem('webhook_analyses');
        if (stored) {
          setAnalyses(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load analyses:', error);
      }
    };

    loadAnalyses();
    
    // Listen for updates
    const handleAnalysisUpdate = () => loadAnalyses();
    window.addEventListener('webhookAnalysisAdded', handleAnalysisUpdate);
    
    return () => {
      window.removeEventListener('webhookAnalysisAdded', handleAnalysisUpdate);
    };
  }, []);

  // Calculate real metrics from analyses
  const metrics = {
    highConfidence: analyses.filter(a => a.confidence === 'High').length,
    mediumRisk: analyses.filter(a => a.confidence === 'Medium').length,
    avoid: analyses.filter(a => a.confidence === 'Low' || a.status === 'loss').length,
    potentialValue: analyses.reduce((total, analysis) => {
      // Extract estimated value from analysis or calculate based on units
      const units = analysis.units || 1;
      const baseValue = units * 100; // $100 per unit
      return total + baseValue;
    }, 0)
  };
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-primary">Intelligent</span> Analytics Dashboard
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get comprehensive insights with real-time data, advanced analytics, and AI-powered recommendations
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Stats Overview */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:shadow-card-hover transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Today's Opportunities</h3>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Live
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-win/10 rounded-lg flex items-center justify-center mx-auto">
                    <TrendingUp className="w-6 h-6 text-win" />
                  </div>
                  <div className="text-2xl font-bold text-win">{metrics.highConfidence}</div>
                  <div className="text-sm text-muted-foreground">High Confidence</div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-neutral/10 rounded-lg flex items-center justify-center mx-auto">
                    <Activity className="w-6 h-6 text-neutral" />
                  </div>
                  <div className="text-2xl font-bold text-neutral">{metrics.mediumRisk}</div>
                  <div className="text-sm text-muted-foreground">Medium Risk</div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-loss/10 rounded-lg flex items-center justify-center mx-auto">
                    <TrendingDown className="w-6 h-6 text-loss" />
                  </div>
                  <div className="text-2xl font-bold text-loss">{metrics.avoid}</div>
                  <div className="text-sm text-muted-foreground">Avoid</div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${metrics.potentialValue >= 1000 
                      ? `${(metrics.potentialValue / 1000).toFixed(1)}K` 
                      : metrics.potentialValue}
                  </div>
                  <div className="text-sm text-muted-foreground">Potential Value</div>
                </div>
              </div>
            </Card>
            
            {/* Live Games */}
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
              <h3 className="text-xl font-semibold mb-4">Live Games & Odds</h3>
              <LiveOdds />
            </Card>
            
            {/* Odds API Settings */}
            <OddsApiSettings
              apiKey={apiKey}
              onSaveApiKey={saveApiKey}
              onRemoveApiKey={removeApiKey}
              hasApiKey={hasApiKey}
            />
            
            {/* Multi-Sport Webhooks */}
            <MultiSportWebhooks />
          </div>
          
          {/* News & Insights */}
          <div className="space-y-6">
            {/* Telegram Analyses */}
            <TelegramAnalyses onUpgradeClick={onUpgradeClick} />
            
            {/* Game Weather */}
            <GameWeather games={games} />
            
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
              <h3 className="text-xl font-semibold mb-4">Latest News Impact</h3>
              <div className="space-y-4">
                {[
                  { title: "Star Player Injury Update", impact: "High", team: "Lakers", type: "loss" },
                  { title: "Weather Conditions Alert", impact: "Medium", team: "Chiefs", type: "neutral" },
                  { title: "Coaching Change Confirmed", impact: "High", team: "Heat", type: "win" }
                ].map((news, index) => (
                  <div key={index} className="p-3 bg-secondary/20 rounded-lg border border-border/30">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm leading-tight">{news.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`
                          text-xs
                          ${news.type === 'win' ? 'border-win/30 text-win' : ''}
                          ${news.type === 'neutral' ? 'border-neutral/30 text-neutral' : ''}
                          ${news.type === 'loss' ? 'border-loss/30 text-loss' : ''}
                        `}
                      >
                        {news.impact}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{news.team}</div>
                  </div>
                ))}
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
              <h3 className="text-xl font-semibold mb-4">AI Personas</h3>
              <div className="space-y-3">
                {[
                  { name: "Money Making Mitch", style: "Low Risk" },
                  { name: "Bobby Vegas", style: "High Risk" },
                  { name: "Value Finder Vic", style: "Value Betting" }
                ].map((persona, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      activePersona === persona.name
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-secondary/20 border-border/30 hover:border-primary/20 hover:bg-primary/5'
                    }`}
                    onClick={() => setActivePersona(persona.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{persona.name}</div>
                        <div className="text-xs text-muted-foreground">{persona.style}</div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activePersona === persona.name ? 'bg-primary' : 'bg-muted'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};