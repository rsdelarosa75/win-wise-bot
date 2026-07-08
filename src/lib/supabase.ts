import { createClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://placeholder.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "placeholder-anon-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Auth and database features will be unavailable."
  );
}

const hasNativePrefs = Capacitor.isPluginAvailable('Preferences');

const CapacitorStorageAdapter = {
  getItem: async (key: string) =>
    hasNativePrefs ? (await Preferences.get({ key })).value : localStorage.getItem(key),
  setItem: async (key: string, value: string) =>
    hasNativePrefs ? Preferences.set({ key, value }) : localStorage.setItem(key, value),
  removeItem: async (key: string) =>
    hasNativePrefs ? Preferences.remove({ key }) : localStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CapacitorStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export type { User, Session };
