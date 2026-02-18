import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Brain, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-sports-professional.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Content */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-secondary border border-primary/20 rounded-full px-4 py-2 text-sm">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">AI Sports Betting Advisor</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Stop Guessing.
              </span>
              <br />
              <span className="text-foreground">Start Winning.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              BobbyVegas analyzes lines, weather, trends, and sharp money so you don't have to. Get AI-powered picks delivered daily.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-gradient-primary hover:shadow-primary transition-all duration-200">
              Get Today's Picks
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="border-primary/30 hover:border-primary transition-colors">
              See How It Works
            </Button>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-3 gap-6 pt-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">AI Pick Analysis</h3>
              <p className="text-sm text-muted-foreground">Real-time data</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold">Live Odds</h3>
              <p className="text-sm text-muted-foreground">Odds tracking</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-neutral/10 rounded-lg flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6 text-neutral" />
              </div>
              <h3 className="font-semibold">Weather Impact</h3>
              <p className="text-sm text-muted-foreground">Custom strategies</p>
            </div>
          </div>
        </div>
        
        {/* Hero Image */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-xl transform rotate-1" />
          <img 
            src={heroImage} 
            alt="Professional Sports Analytics Dashboard" 
            className="relative w-full h-auto rounded-2xl shadow-xl border border-border"
          />
        </div>
      </div>
    </section>
  );
};