import { usePopup } from "../context/popupContext";
import type { Kanji } from "../types";

/** 漢字小方塊：大字為新字體，繁體不同時附在右下。點了開彈窗（彈窗裡有「完整資料」連結）。 */
export default function KanjiLink({ k }: { k: Kanji }) {
  const { open } = usePopup();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => open({ kind: "kanji", char: k.char }, e.currentTarget)}
      className="inline-flex items-baseline gap-0.5 rounded-md border border-stone-200 bg-white px-2 py-1 hover:border-indigo-400 dark:border-stone-700 dark:bg-stone-800"
    >
      <span lang="ja" className="font-jp text-2xl">{k.jp_char}</span>
      {k.char !== k.jp_char && <span className="text-xs text-stone-500">{k.char}</span>}
    </button>
  );
}
