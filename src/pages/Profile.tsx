import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const SPORTS = [
  { id: "nfl", label: "NFL", defaultOn: true },
  { id: "college-football", label: "College Football", defaultOn: true },
  { id: "nba", label: "NBA", defaultOn: false },
  { id: "mlb", label: "MLB", defaultOn: false },
  { id: "nhl", label: "NHL", defaultOn: false },
];

const NOTIFICATIONS = [
  { id: "daily-picks", label: "Daily picks alert", defaultOn: true },
  { id: "line-movement", label: "Line movement alerts", defaultOn: true },
];

interface ProfileProps {
  onSignOut: () => Promise<void>;
}

const Profile = ({ onSignOut }: ProfileProps) => {
  const [sports, setSports] = useState<Record<string, boolean>>(
    Object.fromEntries(SPORTS.map((s) => [s.id, s.defaultOn]))
  );
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATIONS.map((n) => [n.id, n.defaultOn]))
  );

  return (
    <div className="space-y-4 px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold">Profile ⚙️</h1>

      {/* Sport Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sport Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SPORTS.map(({ id, label }) => (
            <div key={id} className="flex items-center justify-between">
              <Label htmlFor={id} className="cursor-pointer">
                {label}
              </Label>
              <Switch
                id={id}
                checked={sports[id]}
                onCheckedChange={(checked) =>
                  setSports((prev) => ({ ...prev, [id]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATIONS.map(({ id, label }) => (
            <div key={id} className="flex items-center justify-between">
              <Label htmlFor={id} className="cursor-pointer">
                {label}
              </Label>
              <Switch
                id={id}
                checked={notifications[id]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [id]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* VIP Upgrade */}
      <Card className="border-amber-400/50 bg-amber-50/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Go VIP 🔥</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unlock full picks, reasoning, props and parlays. $19.99/month
          </p>
          <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            Upgrade to VIP
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* App Version */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground text-center">
            BobbyVegas v1.0 — Built with 🎲
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
