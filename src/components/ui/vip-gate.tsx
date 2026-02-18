import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVip } from "@/hooks/use-vip";

interface VipGateProps {
  children: React.ReactNode;
  onUpgradeClick: () => void;
}

export const VipGate = ({ children, onUpgradeClick }: VipGateProps) => {
  const { isVIP } = useVip();

  if (isVIP) return <>{children}</>;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred background preview */}
      <div className="pointer-events-none select-none blur-sm opacity-50" aria-hidden>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/75 backdrop-blur-[2px] z-10">
        <div className="text-center space-y-3 px-6">
          <div className="w-11 h-11 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="font-semibold text-sm">VIP Members Only</p>
          <p className="text-xs text-muted-foreground">
            Full reasoning, props & parlays unlocked with VIP.
          </p>
          <Button
            onClick={onUpgradeClick}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold w-full"
            size="sm"
          >
            Upgrade to VIP — $19.99/mo
          </Button>
        </div>
      </div>
    </div>
  );
};
