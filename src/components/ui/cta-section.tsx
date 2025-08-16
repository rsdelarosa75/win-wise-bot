import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Star } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card/90 to-card/50 border-primary/20 shadow-2xl">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative z-10 p-12 lg:p-16 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">Ready to Get Started?</span>
            </div>
            
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              Start Making
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Smarter Bets Today
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Join thousands of successful bettors who use our AI-powered platform to make 
              data-driven decisions and maximize their returns.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-gradient-primary hover:shadow-primary transition-all duration-300 text-lg px-8 py-6"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-primary/30 hover:border-primary transition-colors text-lg px-8 py-6"
              >
                Schedule Demo
              </Button>
            </div>
            
            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-neutral text-neutral" />
                  ))}
                </div>
                <span>4.9/5 from 2,500+ users</span>
              </div>
              
              <div className="hidden sm:block w-px h-4 bg-border" />
              
              <div className="flex items-center gap-4">
                <span>Trusted by</span>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">
                    ESPN
                  </div>
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">
                    DK
                  </div>
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">
                    FD
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};