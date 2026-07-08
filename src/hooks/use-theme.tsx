import { useState, useCallback, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export type Theme = "dark" | "light";

const THEME_KEY = "bv-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    Preferences.get({ key: THEME_KEY }).then(({ value }) => {
      const resolved = (value as Theme | null) === "light" ? "light" : "dark";
      setThemeState(resolved);
      applyTheme(resolved);
    });
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    Preferences.set({ key: THEME_KEY, value: t });
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggleTheme, setTheme };
}
