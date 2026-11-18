import { useContext } from "react";
import { SettingsContext } from "./settingsContext";

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings 必須在 <SettingsProvider> 裡使用");
  return ctx;
}
