import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";

const isIOS = Capacitor.getPlatform() === "ios";

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen = ({ onAuthSuccess }: AuthScreenProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      onAuthSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError(null);
    try {
      const rawNonce = crypto.randomUUID();
      const encoder = new TextEncoder();
      const data = encoder.encode(rawNonce);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashedNonce = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { response } = await SignInWithApple.authorize({
        clientId: "com.bobbyvegasai.picks",
        redirectURI: `${supabaseUrl}/auth/v1/callback`,
        scopes: "name email",
        state: crypto.randomUUID(),
        nonce: hashedNonce,
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: response.identityToken,
        nonce: rawNonce,
      });
      if (error) throw error;
      onAuthSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // 1001 = user cancelled, 1000 = unknown (simulator / iCloud not signed in)
      if (msg.includes("1001") || msg.includes("1000")) return;
      if (msg.toLowerCase().includes("icloud") || msg.toLowerCase().includes("not signed in")) {
        setError("Sign in with Apple requires iCloud. Please sign in to iCloud in Settings.");
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div
      style={{
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        backgroundColor: '#0A0A0A',
      } as React.CSSProperties}
    >
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-10 text-center">
        <img
          src="/bobby-vegas-logo.png"
          alt="BOBBY VEGA$"
          width={300}
          className="mx-auto mb-3"
          style={{
            animation: 'bv-fade-in 0.9s ease-out both, bv-glow-pulse 2.4s ease-in-out 1s infinite',
          }}
        />

        {/* Sports ball shimmer row */}
        <div className="flex items-center justify-center gap-4 text-2xl my-3">
          {['🏈', '⚾', '🏀', '🏒'].map((emoji, i) => (
            <span
              key={emoji}
              style={{ animation: `bv-shimmer 2.6s ease-in-out ${i * 0.4}s infinite` }}
            >
              {emoji}
            </span>
          ))}
        </div>

        <p className="text-sm text-foreground/70">
          Your Trusted AI Sports Advisor
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-secondary rounded-lg p-1 mb-6 w-full max-w-xs">
        <button
          onClick={() => { setMode("signin"); setError(null); }}
          className={`flex-1 min-h-[44px] text-sm font-medium rounded-md transition-colors ${
            mode === "signin"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode("signup"); setError(null); }}
          className={`flex-1 min-h-[44px] text-sm font-medium rounded-md transition-colors ${
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full min-h-[48px] font-black uppercase tracking-widest text-black"
          style={{ backgroundColor: '#F5A100' }}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              Please wait…
            </span>
          ) : mode === "signin" ? "Sign In" : "Get Started"}
        </Button>
      </form>

      {/* Divider + Apple sign-in — iOS only */}
      {isIOS && (
        <>
          <div className="flex items-center gap-3 my-5 w-full max-w-xs">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Sign in with Apple */}
          <div className="w-full max-w-xs">
            {/* Apple HIG compliant: black bg, white text/logo, rounded corners */}
            <button
              type="button"
              onClick={handleApple}
              style={{
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: '8px',
                width: '100%',
                minHeight: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600',
                fontSize: '15px',
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.36.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.54 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Sign in with Apple
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  );
};
