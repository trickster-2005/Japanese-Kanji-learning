import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadJSON, saveJSON } from "../lib/storage";
import type { Settings } from "../types";
import { DEFAULT_SETTINGS, SETTINGS_KEY, SettingsContext } from "./settingsContext";

export default function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS),
  );

  useEffect(() => {
    saveJSON(SETTINGS_KEY, settings);
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const toggleSeen = useCallback((key: string) => {
    setSettings((s) => ({
      ...s,
      seen: s.seen.includes(key) ? s.seen.filter((k) => k !== key) : [...s.seen, key],
    }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      update,
      toggleSeen,
      isSeen: (key: string) => settings.seen.includes(key),
    }),
    [settings, update, toggleSeen],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
