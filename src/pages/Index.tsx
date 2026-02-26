import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/ui/bottom-nav";
import { AuthScreen } from "@/components/ui/auth-screen";
import Dashboard from "@/pages/Dashboard";
import Picks from "@/pages/Picks";
import Tracker from "@/pages/Tracker";
import Profile from "@/pages/Profile";

type Tab = "home" | "picks" | "tracker" | "profile";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  if (loading) {
    return (
      <div className="phone-shell flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="phone-shell">
        <AuthScreen onAuthSuccess={() => {}} />
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case "home":
        return <Dashboard onUpgradeClick={() => setActiveTab("profile")} onPicksTabClick={() => setActiveTab("picks")} />;
      case "picks":
        return <Picks />;
      case "tracker":
        return <Tracker />;
      case "profile":
        return <Profile onSignOut={signOut} />;
    }
  };

  return (
    <div className="phone-shell">
      <main className="pb-16 overflow-y-auto">{renderPage()}</main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
