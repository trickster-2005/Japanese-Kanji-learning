import { createContext, useContext } from "react";

export type PopupTarget = { kind: "kanji"; char: string } | { kind: "word"; word: string };

export interface PopupContextValue {
  /** 打開彈窗；anchor 是被點的元素，用來定位與關閉後還原焦點 */
  open: (target: PopupTarget, anchor: HTMLElement) => void;
  /** 在已開的彈窗裡切換內容（例如從詞點到其中一個字） */
  show: (target: PopupTarget) => void;
  /** restoreFocus 預設 true：焦點回到原本被點的元素 */
  close: (restoreFocus?: boolean) => void;
}

export const PopupContext = createContext<PopupContextValue | null>(null);

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error("usePopup 必須在 <PopupProvider> 裡使用");
  return ctx;
}
