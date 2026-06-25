import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type AvatarKey =
  | "classic_bobby"
  | "street_bobby"
  | "tech_bobby"
  | "high_roller_bobby"
  | "betty_vegas";

interface Avatar {
  key: AvatarKey;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  promptStyle: string;   // injected into Bobby Vegas system prompt
  premium: boolean;
}

export const AVATARS: Avatar[] = [
  {
    key: "classic_bobby",
    name: "Classic Bobby",
    emoji: "🎩",
    tagline: "Sharp, suave Vegas OG",
    description: "The original. Suit, dice, 40 years of Vegas wisdom. Never chases. Always sharp.",
    promptStyle:
      "You are Bobby Vegas — a sharp, suave, old-school Vegas handicapper. " +
      "Speak with authority and confidence. Use classic betting terminology. " +
      "You've seen it all. Give concise, decisive picks with a Vegas insider's swagger.",
    premium: false,
  },
  {
    key: "street_bobby",
    name: "Street Bobby",
    emoji: "🧢",
    tagline: "Gritty contrarian fade king",
    description: "Hoodie, snapback, loves fading the public. Finds value where nobody's looking.",
    promptStyle:
      "You are Street Bobby — a gritty, contrarian sports bettor who thrives on fading the public. " +
      "Speak casually but sharply. Call out hype, find the overlooked angle. " +
      "You're not afraid to be unpopular with your picks. Keep it real.",
    premium: false,
  },
  {
    key: "tech_bobby",
    name: "Tech Bobby",
    emoji: "💻",
    tagline: "Data-driven spreads specialist",
    description: "Glasses, laptop, model-first. Only bets when the numbers say so. No gut, all data.",
    promptStyle:
      "You are Tech Bobby — a quantitative sports analyst who only bets when statistical models agree. " +
      "Lead with numbers: percentages, historical trends, sample sizes, regression to mean. " +
      "Reference specific stats. Be analytical, not emotional. Show your math.",
    premium: false,
  },
  {
    key: "high_roller_bobby",
    name: "High Roller Bobby",
    emoji: "🥂",
    tagline: "Big swings, tuxedo energy",
    description: "Tuxedo, champagne. Only interested in the biggest lines and boldest calls.",
    promptStyle:
      "You are High Roller Bobby — you think big, bet bigger. " +
      "You're not interested in small edges. You want the bold call, the big swing, the +EV play " +
      "that separates you from the recreational bettors. Be dramatic. Be confident. Go big.",
    premium: true,
  },
  {
    key: "betty_vegas",
    name: "Betty Vegas",
    emoji: "💅",
    tagline: "Sharp feminine specialist",
    description:
      "Elegant, gold. Specializes in WNBA, Tennis, and Soccer. Fades the guys who think they know.",
    promptStyle:
      "You are Betty Vegas — sharp, witty, and always three steps ahead of the market. " +
      "You specialize in WNBA, Tennis, and Soccer. " +
      "You're done watching men bet badly. Give precise, elegant picks with a knowing confidence. " +
      "Wanna win big? Bet like Betty Vegas.",
    premium: true,
  },
];

interface AvatarSelectionProps {
  userId: string;
  currentAvatar?: AvatarKey;
  isPremium?: boolean;
  onSelect?: (avatar: AvatarKey) => void;
  onUpgradeClick?: () => void;
}

async function saveAvatarToSupabase(userId: string, avatarKey: AvatarKey) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ avatar: avatarKey, updated_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) throw new Error(`Supabase PATCH failed: ${res.status}`);
}

export function AvatarSelection({
  userId,
  currentAvatar = "classic_bobby",
  isPremium = false,
  onSelect,
  onUpgradeClick,
}: AvatarSelectionProps) {
  const [selected, setSelected] = useState<AvatarKey>(currentAvatar);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSelect = (avatar: Avatar) => !avatar.premium || isPremium;

  const handleSelect = async (avatar: Avatar) => {
    if (!canSelect(avatar)) {
      onUpgradeClick?.();
      return;
    }
    setSelected(avatar.key);
    setSaved(false);
    setSaving(true);
    try {
      await saveAvatarToSupabase(userId, avatar.key);
      setSaved(true);
      onSelect?.(avatar.key);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("[AvatarSelection] Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Choose Your Bobby 🎲</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your avatar shapes Bobby's personality and betting style
        </p>
      </div>

      <div className="space-y-3">
        {AVATARS.map((avatar) => {
          const isSelected = selected === avatar.key;
          const locked = !canSelect(avatar);

          return (
            <Card
              key={avatar.key}
              onClick={() => handleSelect(avatar)}
              className="p-4 cursor-pointer transition-all active:scale-[0.98] border relative overflow-hidden"
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, #1a1200 0%, #0f0f0f 100%)"
                  : "#0f0f0f",
                borderColor: isSelected ? "#F5A100" : locked ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)",
                boxShadow: isSelected ? "0 0 16px rgba(245,161,0,0.2)" : undefined,
                opacity: locked ? 0.7 : 1,
              }}
            >
              <div className="flex items-start gap-4">
                {/* Emoji avatar */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{
                    background: isSelected
                      ? "rgba(245,161,0,0.15)"
                      : "rgba(255,255,255,0.06)",
                    border: isSelected ? "1.5px solid rgba(245,161,0,0.4)" : "1.5px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {avatar.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{avatar.name}</span>
                    {avatar.premium && (
                      <Badge
                        className="text-xs px-1.5 py-0 border-0"
                        style={{ background: "rgba(245,161,0,0.2)", color: "#F5A100" }}
                      >
                        Premium
                      </Badge>
                    )}
                    {isSelected && !locked && (
                      <Badge className="text-xs px-1.5 py-0 bg-green-500/20 text-green-400 border-0">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{avatar.tagline}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
                    {avatar.description}
                  </p>
                </div>

                {/* Lock icon */}
                {locked && (
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
              </div>

              {/* Selected indicator bar */}
              {isSelected && !locked && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "#F5A100" }}
                />
              )}
            </Card>
          );
        })}
      </div>

      {/* Save confirmation */}
      {(saving || saved) && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold"
          style={{ background: saving ? "#1a1a1a" : "#22c55e", color: "#fff" }}
        >
          {saving ? "Saving…" : "✓ Avatar saved"}
        </div>
      )}

      {/* Upgrade prompt for premium avatars */}
      {!isPremium && (
        <div
          className="rounded-xl p-4 text-center border"
          style={{ borderColor: "rgba(245,161,0,0.3)", background: "rgba(245,161,0,0.05)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#F5A100" }}>
            🔒 Unlock High Roller Bobby & Betty Vegas
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Premium avatars unlock with Bobby Vegas Premium
          </p>
          <Button
            size="sm"
            className="border-0 font-bold"
            style={{ background: "#F5A100", color: "#000" }}
            onClick={onUpgradeClick}
          >
            Upgrade to Premium →
          </Button>
        </div>
      )}
    </div>
  );
}

export default AvatarSelection;
