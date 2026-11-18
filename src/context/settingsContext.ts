import { createContext } from "react";
import { DEFAULT_DICT_ID } from "../config/dictionaries";
import type { Settings } from "../types";

export const SETTINGS_KEY = "kanji-rules-settings";

export const DEFAULT_SETTINGS: Settings = {
  showCantonese: true,
  showHokkien: true,
  darkMode: false,
  defaultDict: DEFAULT_DICT_ID,
  seen: [],
};

export interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  isSeen: (key: string) => boolean;
  toggleSeen: (key: string) => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
