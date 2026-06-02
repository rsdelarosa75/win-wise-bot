import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  onBack: () => void;
}

const Profile = ({ onSignOut, onBack }: ProfileProps) => {
  const [deleting, setDeleting] = useState(false);
  const [sports, setSports] = useState<Record<string, boolean>>(
    Object.fromEntries(SPORTS.map((s) => [s.id, s.defaultOn]))
  );
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATIONS.map((n) => [n.id, n.defaultOn]))
  );

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
    <div className="space-y-4 px-4 pt-4 pb-24">
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors -ml-1"
          aria-label="Back to Home"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Profile ⚙️</h1>
      </div>

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

      {/* Delete Account */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deleting}
              >
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete your account? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      const { error } = await supabase.rpc("delete_user");
                      if (error) throw error;
                      toast.success("Account deleted successfully");
                      await supabase.auth.signOut();
                      await onSignOut();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to delete account");
                      setDeleting(false);
                    }
                  }}
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* App Version & legal */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            BobbyVegas v1.0 — Built with 🎲
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link
              to="/privacy"
              className="text-primary font-medium underline underline-offset-2 hover:opacity-90 min-h-[44px] inline-flex items-center px-1"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <Link
              to="/terms"
              className="text-primary font-medium underline underline-offset-2 hover:opacity-90 min-h-[44px] inline-flex items-center px-1"
            >
              Terms of Service
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
};

export default Profile;
