import { Navigation } from "@/components/ui/navigation";
import { HeroSection } from "@/components/ui/hero-section";
import { FeaturesSection } from "@/components/ui/features-section";
import { DashboardPreview } from "@/components/ui/dashboard-preview";
import { AutomationHub } from "@/components/ui/automation-hub";
import { CTASection } from "@/components/ui/cta-section";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <div id="features">
          <FeaturesSection />
        </div>
        <div id="dashboard">
          <DashboardPreview />
        </div>
        <div id="automation">
          <AutomationHub />
        </div>
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
