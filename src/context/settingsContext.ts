import { createContext } from "react";
import { DEFAULT_DICT_ID } from "../config/dictionaries";
import type { Settings } from "../types";

export const SETTINGS_KEY = "kanji-rules-settings";
export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  showCantonese: true,
  showHokkien: true,
  darkMode: false,
  showTts: true,
  defaultDict: DEFAULT_DICT_ID,
  version: SETTINGS_VERSION,
  seen: [],
};

/**
 * 舊版設定遷移。
 * v1 → v2：預設字典從 Jisho 改成 JapanDict。v1 不管有沒有選過都會自動存下 "jisho"，
 * 分不出是不是使用者自己選的，所以一律換成新的預設；之後在設定頁的選擇會照常保留。
 */
export function migrateSettings(s: Settings): Settings {
  if ((s.version ?? 1) < 2) {
    return {
      ...s,
      defaultDict: s.defaultDict === "jisho" ? DEFAULT_DICT_ID : s.defaultDict,
      version: SETTINGS_VERSION,
    };
  }
  return s;
}

export interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  isSeen: (key: string) => boolean;
  toggleSeen: (key: string) => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
