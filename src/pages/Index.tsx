import { useState } from "react";
import { BottomNav } from "@/components/ui/bottom-nav";
import Dashboard from "@/pages/Dashboard";
import Picks from "@/pages/Picks";
import Tracker from "@/pages/Tracker";
import Profile from "@/pages/Profile";

type Tab = "home" | "picks" | "tracker" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const renderPage = () => {
    switch (activeTab) {
      case "home":
        return <Dashboard />;
      case "picks":
        return <Picks />;
      case "tracker":
        return <Tracker />;
      case "profile":
        return <Profile />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">{renderPage()}</main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
