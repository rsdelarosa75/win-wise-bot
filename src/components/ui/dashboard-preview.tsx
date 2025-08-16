import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";

export const DashboardPreview = () => {
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
                  <div className="text-2xl font-bold text-win">8</div>
                  <div className="text-sm text-muted-foreground">High Confidence</div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-neutral/10 rounded-lg flex items-center justify-center mx-auto">
                    <Activity className="w-6 h-6 text-neutral" />
                  </div>
                  <div className="text-2xl font-bold text-neutral">15</div>
                  <div className="text-sm text-muted-foreground">Medium Risk</div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-loss/10 rounded-lg flex items-center justify-center mx-auto">
                    <TrendingDown className="w-6 h-6 text-loss" />
                  </div>
                  <div className="text-2xl font-bold text-loss">3</div>
                  <div className="text-sm text-muted-foreground">Avoid</div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary">$2.4K</div>
                  <div className="text-sm text-muted-foreground">Potential Value</div>
                </div>
              </div>
            </Card>
            
            {/* Live Games */}
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
              <h3 className="text-xl font-semibold mb-4">Live Games & Odds</h3>
              <div className="space-y-3">
                {[
                  { team1: "Lakers", team2: "Warriors", odds1: "+150", odds2: "-180", confidence: "High", status: "win" },
                  { team1: "Celtics", team2: "Heat", odds1: "-120", odds2: "+100", confidence: "Medium", status: "neutral" },
                  { team1: "Nuggets", team2: "Suns", odds1: "+200", odds2: "-250", confidence: "Low", status: "loss" }
                ].map((game, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-medium">{game.team1}</span> vs <span className="font-medium">{game.team2}</span>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="text-muted-foreground">{game.odds1}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{game.odds2}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`
                          ${game.status === 'win' ? 'border-win/30 text-win' : ''}
                          ${game.status === 'neutral' ? 'border-neutral/30 text-neutral' : ''}
                          ${game.status === 'loss' ? 'border-loss/30 text-loss' : ''}
                        `}
                      >
                        {game.confidence}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          
          {/* News & Insights */}
          <div className="space-y-6">
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
                  { name: "Money Making Mitch", style: "Low Risk", active: true },
                  { name: "Bobby Vegas", style: "High Risk", active: false },
                  { name: "Value Finder Vic", style: "Value Betting", active: false }
                ].map((persona, index) => (
                  <div key={index} className={`p-3 rounded-lg border transition-all duration-200 ${
                    persona.active 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-secondary/20 border-border/30 hover:border-primary/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{persona.name}</div>
                        <div className="text-xs text-muted-foreground">{persona.style}</div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${persona.active ? 'bg-primary' : 'bg-muted'}`} />
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