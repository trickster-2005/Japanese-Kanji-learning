import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePopup } from "../context/popupContext";
import { kanjiPath } from "../lib/text";

const base =
  "font-jp cursor-pointer rounded-sm decoration-indigo-400/60 decoration-dotted underline-offset-4 hover:bg-indigo-100 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-indigo-900/50";

/** 可點的漢字：直接連到單字頁 */
export function KanjiText({ c, className = "", children }: { c: string; className?: string; children?: ReactNode }) {
  return (
    <Link to={kanjiPath(c)} lang="ja" className={`${base} ${className}`}>
      {children ?? c}
    </Link>
  );
}

/** 可點的日語詞彙：詞彙沒有獨立頁面，點了開彈窗 */
export function WordText({ w, className = "", children }: { w: string; className?: string; children?: ReactNode }) {
  const { open } = usePopup();
  return (
    <button
      type="button"
      lang="ja"
      aria-haspopup="dialog"
      onClick={(e) => open({ kind: "word", word: w }, e.currentTarget)}
      className={`${base} ${className}`}
    >
      {children ?? w}
    </button>
  );
}
