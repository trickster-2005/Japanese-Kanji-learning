import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePopup } from "../../context/popupContext";
import { useSettings } from "../../context/useSettings";
import { WORDS, getKanji, getRule } from "../../lib/data";
import DictLinks from "../DictLinks";
import { CantoneseList, HokkienList, OnList } from "../Readings";

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-2 py-1 text-sm">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span>{children}</span>
    </div>
  );
}

/** 彈窗內容：單字 */
export default function KanjiInfo({ char }: { char: string }) {
  const { settings } = useSettings();
  const { show } = usePopup();
  const k = getKanji(char);

  if (!k) {
    return (
      <div className="space-y-3 pr-6">
        <span lang="ja" className="font-jp text-4xl">{char}</span>
        <p className="text-sm text-stone-500">資料中還沒收錄這個字，可以先查字典：</p>
        <DictLinks q={char} type="kanji" zh={char} />
      </div>
    );
  }

  const words = WORDS.filter((w) => w.word.includes(k.jp_char)).slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2 pr-6">
        <span lang="ja" className="font-jp text-4xl">{k.jp_char}</span>
        {k.char !== k.jp_char && <span className="text-xl text-stone-500">{k.char}</span>}
        <span className="ml-1 truncate text-xs text-stone-500">{k.meaning_zh || k.meaning_en.slice(0, 3).join("; ")}</span>
      </div>

      <div className="divide-y divide-stone-100 dark:divide-stone-700">
        <Line label="日語">
          <OnList on={k.on} />
        </Line>
        {settings.showCantonese && (
          <Line label="粵語">
            <CantoneseList readings={k.cantonese} />
          </Line>
        )}
        {settings.showHokkien && (
          <Line label="台語">
            <HokkienList h={k.hokkien} />
          </Line>
        )}
        {k.mandarin && <Line label="華語">{k.mandarin}</Line>}
      </div>

      {k.rules.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {k.rules.map((id) => {
            const exc = getRule(id)?.exceptions.find((e) => e.char === k.char);
            return (
              <Link
                key={id}
                to={`/rules/${id}`}
                title={exc?.reason}
                className={`rounded px-1.5 py-0.5 text-xs hover:underline ${
                  exc
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                    : "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
                }`}
              >
                {getRule(id)?.title ?? id}
                {exc && "＊"}
              </Link>
            );
          })}
        </div>
      )}

      {words.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {words.map((w) => (
            <button
              key={w.word}
              type="button"
              lang="ja"
              onClick={() => show({ kind: "word", word: w.word })}
              className="font-jp text-indigo-700 hover:underline dark:text-indigo-300"
            >
              {w.word}
            </button>
          ))}
        </div>
      )}

      <DictLinks q={k.jp_char} type="kanji" zh={k.char} />

      <Link to={`/kanji/${encodeURIComponent(k.char)}`} className="block text-right text-sm text-indigo-700 hover:underline dark:text-indigo-300">
        完整資料 →
      </Link>
    </div>
  );
}
