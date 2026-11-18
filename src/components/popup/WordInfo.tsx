import { Link } from "react-router-dom";
import { usePopup } from "../../context/popupContext";
import { useSettings } from "../../context/useSettings";
import { getKanji, getWord } from "../../lib/data";
import { wordTypeLabel } from "../../lib/labels";
import DictLinks from "../DictLinks";
import { HokkienList } from "../Readings";

/** 彈窗內容：詞彙 */
export default function WordInfo({ word }: { word: string }) {
  const { settings } = useSettings();
  const { show } = usePopup();
  const w = getWord(word);
  const chars = [...word].filter((c) => /\p{Script=Han}/u.test(c));

  const hasHokkien = w && w.hokkien.literary.length + w.hokkien.colloquial.length + w.hokkien.unmarked.length > 0;

  return (
    <div className="space-y-3">
      <div className="pr-6">
        <span lang="ja" className="font-jp text-3xl">{word}</span>
        <div lang="ja" className="font-jp mt-1 text-sm text-stone-600 dark:text-stone-300">
          {w?.reading || <span className="text-stone-400">讀音待確認</span>}
          {w && w.alt_readings.length > 0 && <span className="ml-2 text-xs text-stone-400">又讀 {w.alt_readings.join("、")}</span>}
        </div>
      </div>

      {w && (
        <div className="space-y-1 text-sm">
          <p>
            <span className="mr-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-700">{wordTypeLabel(w.type)}</span>
            {w.meaning_zh}
          </p>
          {w.note && <p className="text-stone-600 dark:text-stone-300">{w.note}</p>}
          {settings.showHokkien && hasHokkien && (
            <p>
              <span className="mr-2 text-stone-500">台語「{w.zh}」</span>
              <HokkienList h={w.hokkien} />
            </p>
          )}
          {settings.showCantonese && w.cantonese.length > 0 && (
            <p>
              <span className="mr-2 text-stone-500">粵語「{w.zh}」</span>
              {w.cantonese.join("、")}
            </p>
          )}
        </div>
      )}

      {chars.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chars.map((c, i) => (
            <button
              key={c + i}
              type="button"
              lang="ja"
              onClick={() => show({ kind: "kanji", char: c })}
              className="font-jp rounded border border-stone-200 px-2 py-0.5 text-lg hover:border-indigo-400 dark:border-stone-600"
              title={getKanji(c) ? "看這個字" : "資料中尚未收錄"}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <DictLinks q={word} type="word" />

      {w && (
        <Link to={`/words?type=${w.type}`} className="block text-right text-sm text-indigo-700 hover:underline dark:text-indigo-300">
          {wordTypeLabel(w.type)} →
        </Link>
      )}
    </div>
  );
}
