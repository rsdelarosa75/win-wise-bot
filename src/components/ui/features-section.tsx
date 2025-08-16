import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  TrendingUp, 
  Newspaper, 
  Users, 
  Brain, 
  Shield,
  Zap,
  BarChart3 
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: Database,
      title: "Real-time Sports Data",
      description: "Access comprehensive stats from multiple leagues and sports with live updates and historical analysis.",
      color: "primary"
    },
    {
      icon: TrendingUp,
      title: "Advanced Odds Analysis",
      description: "Compare odds across multiple sportsbooks and identify value opportunities with AI-powered insights.",
      color: "accent"
    },
    {
      icon: Newspaper,
      title: "News Impact Analysis",
      description: "Get instant analysis of how breaking news affects betting lines and player performance.",
      color: "neutral"
    },
    {
      icon: Users,
      title: "Custom AI Personas",
      description: "Create personalized betting advisors with different risk profiles and strategies tailored to your style.",
      color: "primary"
    },
    {
      icon: Brain,
      title: "Machine Learning Models",
      description: "Leverage advanced algorithms that learn from historical data to predict outcomes and identify patterns.",
      color: "accent"
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Track your betting performance with detailed analytics and insights to improve your strategy over time.",
      color: "neutral"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-background via-card/10 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">Advanced Analytics</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Professional Sports Betting
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Analytics Platform
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Our comprehensive platform combines real-time data, market analysis, and intelligent insights 
            to give you the edge you need in sports betting.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-8 bg-card border-border hover:shadow-card-hover transition-all duration-200 group"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200 ${
                  feature.color === 'primary' ? 'bg-primary/10' :
                  feature.color === 'accent' ? 'bg-accent/10' :
                  'bg-neutral/10'
                }`}>
                  <Icon className={`w-8 h-8 ${
                    feature.color === 'primary' ? 'text-primary' :
                    feature.color === 'accent' ? 'text-accent' :
                    'text-neutral'
                  }`} />
                </div>
                
                <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {feature.description}
                </p>
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-start p-0 h-auto text-primary hover:text-primary hover:bg-transparent group-hover:translate-x-2 transition-transform"
                >
                  Learn more →
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 bg-card/50 border border-primary/20 rounded-full p-2">
            <div className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Secure & Reliable</span>
            </div>
            <span className="text-sm text-muted-foreground px-4">
              Bank-level security • 99.9% uptime • Real-time processing
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};