import { House, Target, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "home" | "picks" | "tracker" | "profile";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "picks", label: "Picks", icon: Target },
  { id: "tracker", label: "Tracker", icon: TrendingUp },
  { id: "profile", label: "Profile", icon: User },
];

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border flex items-stretch">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
