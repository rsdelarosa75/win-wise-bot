import { useState, useEffect, useCallback } from "react";

// Reads Bobby's four-tier read from the pick_log table so the Live Odds cards can
// show the tier a game was actually assigned — same taxonomy and same 30-minute
// freshness window as the workflow cache. Only NFL writes pick_log today, so pills
// appear only where a fresh pick exists; every other game shows none.
const SUPABASE_URL = "https://mocdziwqxbvjibylqxoz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2R6aXdxeGJ2amlieWxxeG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzU3MzUsImV4cCI6MjA4Njk1MTczNX0.2nRMRP55DYk8a5WRdK6NHTn4fADmiGH99kqbWo2TquI";

export type PickTier = "Strong Play" | "Lean" | "Fair Line" | "Stay Away";
const VALID: PickTier[] = ["Strong Play", "Lean", "Fair Line", "Stay Away"];

const FRESH_MS = 30 * 60 * 1000;
const norm = (s: string) => (s || "").toLowerCase().trim();

export function usePickTiers(sport: string) {
  const [tiers, setTiers] = useState<Map<string, PickTier>>(new Map());

  const fetchTiers = useCallback(async () => {
    if (!sport) return;
    try {
      const since = new Date(Date.now() - FRESH_MS).toISOString();
      const url =
        `${SUPABASE_URL}/rest/v1/pick_log?sport=eq.${encodeURIComponent(sport)}` +
        `&created_at=gt.${since}&select=away,home,tier,created_at&order=created_at.desc&limit=200`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return;
      const rows: Array<{ away: string; home: string; tier: string | null }> = await res.json();
      const next = new Map<string, PickTier>();
      for (const r of rows) {
        if (!r.tier || !VALID.includes(r.tier as PickTier)) continue;
        const key = norm(r.away) + "|" + norm(r.home);
        if (!next.has(key)) next.set(key, r.tier as PickTier); // rows are newest-first; keep the latest
      }
      setTiers(next);
    } catch {
      /* leave the last good map in place */
    }
  }, [sport]);

  useEffect(() => {
    fetchTiers();
    const id = setInterval(fetchTiers, 60 * 1000); // re-poll within the 30-min window
    return () => clearInterval(id);
  }, [fetchTiers]);

  const tierFor = useCallback(
    (away?: string, home?: string): PickTier | null => {
      if (!away || !home) return null;
      return tiers.get(norm(away) + "|" + norm(home)) ?? null;
    },
    [tiers],
  );

  return { tierFor };
}
