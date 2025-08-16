import { Button } from "@/components/ui/button";
import { Brain, Menu } from "lucide-react";
import { useState } from "react";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Bet<span className="text-primary">AI</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm hover:text-primary transition-colors">
              Features
            </a>
            <a href="#dashboard" className="text-sm hover:text-primary transition-colors">
              Dashboard
            </a>
            <a href="#automation" className="text-sm hover:text-primary transition-colors">
              Automation
            </a>
            <a href="#personas" className="text-sm hover:text-primary transition-colors">
              AI Personas
            </a>
            <a href="#pricing" className="text-sm hover:text-primary transition-colors">
              Pricing
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button size="sm" className="bg-gradient-primary">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-4">
              <a href="#features" className="py-2 hover:text-primary transition-colors">
                Features
              </a>
              <a href="#dashboard" className="py-2 hover:text-primary transition-colors">
                Dashboard
              </a>
              <a href="#automation" className="py-2 hover:text-primary transition-colors">
                Automation
              </a>
              <a href="#personas" className="py-2 hover:text-primary transition-colors">
                AI Personas
              </a>
              <a href="#pricing" className="py-2 hover:text-primary transition-colors">
                Pricing
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                <Button variant="ghost" size="sm" className="justify-start">
                  Sign In
                </Button>
                <Button size="sm" className="bg-gradient-primary justify-start">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};