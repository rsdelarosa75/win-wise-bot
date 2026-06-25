import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, TrendingUp, Infinity, Bell } from "lucide-react";

const FREE_TIER_LIMIT = 5;

const PREMIUM_FEATURES = [
  { icon: Zap,         label: "Edge Finder",          desc: "Kalshi vs sportsbook edge detection" },
  { icon: Infinity,    label: "Unlimited Picks",       desc: "No daily cap, ask Bobby anytime" },
  { icon: TrendingUp,  label: "Arbitrage Alerts",      desc: "Cross-book arb opportunities" },
  { icon: Bell,        label: "Daily Telegram Digest", desc: "9am picks delivered to your phone" },
  { icon: Lock,        label: "Premium Avatars",       desc: "High Roller Bobby, Betty Vegas & more" },
];

interface PaywallProps {
  picksUsedToday: number;
  isPremium?: boolean;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

function PickCounter({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, (used / limit) * 100);
  const barColor = remaining === 0 ? "#ef4444" : remaining === 1 ? "#F5A100" : "#22c55e";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Daily picks used</span>
        <span className="font-mono font-bold" style={{ color: barColor }}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      {remaining > 0 ? (
        <p className="text-xs text-muted-foreground">
          {remaining} free {remaining === 1 ? "pick" : "picks"} remaining today
        </p>
      ) : (
        <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>
          Daily limit reached — upgrade for unlimited picks
        </p>
      )}
    </div>
  );
}

// Stripe checkout placeholder — replace with real Stripe integration
async function initiateCheckout() {
  // TODO: call your Stripe checkout session API endpoint
  // e.g. const res = await fetch('/api/stripe/checkout', { method: 'POST' });
  // const { url } = await res.json();
  // window.location.href = url;
  alert("Stripe checkout — wire up /api/stripe/checkout to activate.");
}

export function Paywall({ picksUsedToday, isPremium = false, onUpgrade, onDismiss }: PaywallProps) {
  const [loading, setLoading] = useState(false);
  const limitHit = picksUsedToday >= FREE_TIER_LIMIT;

  if (isPremium) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await initiateCheckout();
      onUpgrade?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
    >
      <Card
        className="w-full max-w-sm rounded-2xl p-6 space-y-5 border"
        style={{
          background: "linear-gradient(160deg, #0f0f0f 0%, #1a1200 100%)",
          borderColor: "#F5A100",
          boxShadow: "0 0 40px rgba(245,161,0,0.25)",
        }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-3xl">🎲</div>
          <h2 className="text-xl font-bold">Bobby Vegas Premium</h2>
          {limitHit ? (
            <p className="text-sm text-muted-foreground">
              You've used all {FREE_TIER_LIMIT} free picks today. Go premium for unlimited access.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unlock the full Bobby Vegas experience
            </p>
          )}
        </div>

        {/* Pick counter */}
        <PickCounter used={picksUsedToday} limit={FREE_TIER_LIMIT} />

        {/* Price */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "rgba(245,161,0,0.08)", border: "1px solid rgba(245,161,0,0.3)" }}
        >
          <p className="text-3xl font-black" style={{ color: "#F5A100" }}>$9.99</p>
          <p className="text-xs text-muted-foreground">per month · cancel anytime</p>
        </div>

        {/* Premium features */}
        <div className="space-y-2">
          {PREMIUM_FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(245,161,0,0.15)" }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: "#F5A100" }} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          className="w-full h-12 text-base font-bold border-0"
          style={{ background: "#F5A100", color: "#000" }}
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? "Loading…" : "Unlock Premium →"}
        </Button>

        {/* Dismiss */}
        {!limitHit && onDismiss && (
          <button
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            onClick={onDismiss}
          >
            Continue with {FREE_TIER_LIMIT - picksUsedToday} free picks remaining
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Powered by Stripe · Secure checkout · No hidden fees
        </p>
      </Card>
    </div>
  );
}

export default Paywall;
