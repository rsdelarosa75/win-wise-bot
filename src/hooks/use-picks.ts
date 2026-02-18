import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export interface SavedPick {
  id: string;
  user_id: string;
  teams: string;
  sport: string | null;
  pick: string | null;
  confidence: string | null;
  analysis: string | null;
  odds: string | null;
  bet_type: string | null;
  result: "win" | "loss" | "push" | null;
  created_at: string;
}

export interface SavePickData {
  teams: string;
  sport?: string | null;
  pick?: string | null;
  confidence?: string | null;
  analysis?: string | null;
  odds?: string | null;
  bet_type?: string | null;
}

interface UsePicksReturn {
  picks: SavedPick[];
  loading: boolean;
  savePick: (data: SavePickData) => Promise<void>;
  updateResult: (id: string, result: "win" | "loss" | "push") => Promise<void>;
}

export const usePicks = (): UsePicksReturn => {
  const { user } = useAuth();
  const [picks, setPicks] = useState<SavedPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPicks([]);
      setLoading(false);
      return;
    }

    const fetchPicks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("saved_picks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPicks(data as SavedPick[]);
      }
      setLoading(false);
    };

    fetchPicks();
  }, [user]);

  const savePick = async (pickData: SavePickData): Promise<void> => {
    if (!user) return;

    const { data, error } = await supabase
      .from("saved_picks")
      .insert({ user_id: user.id, ...pickData })
      .select()
      .single();

    if (!error && data) {
      setPicks((prev) => [data as SavedPick, ...prev]);
    }
  };

  const updateResult = async (
    id: string,
    result: "win" | "loss" | "push"
  ): Promise<void> => {
    const { error } = await supabase
      .from("saved_picks")
      .update({ result })
      .eq("id", id);

    if (!error) {
      setPicks((prev) =>
        prev.map((p) => (p.id === id ? { ...p, result } : p))
      );
    }
  };

  return { picks, loading, savePick, updateResult };
};
