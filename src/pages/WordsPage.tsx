import { useSearchParams } from "react-router-dom";
import { KanjiText, WordText } from "../components/Clickable";
import DictLinks from "../components/DictLinks";
import { HokkienList } from "../components/Readings";
import SourceText from "../components/SourceText";
import { useSettings } from "../context/useSettings";
import { WORDS } from "../lib/data";
import { WORD_TYPES } from "../lib/labels";
import type { Word, WordType } from "../types";

function WordCard({ w }: { w: Word }) {
  const { settings } = useSettings();
  const h = w.hokkien;
  const hasHokkien = h.literary.length + h.colloquial.length + h.unmarked.length > 0;

  return (
    <li className="space-y-2 rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <WordText w={w.word} className="text-2xl" />
        <span lang="ja" className="font-jp text-stone-600 dark:text-stone-300">
          {w.reading || <span className="text-stone-400">讀音待確認</span>}
        </span>
        {w.alt_readings.length > 0 && (
          <span lang="ja" className="font-jp text-xs text-stone-400">又讀 {w.alt_readings.join("、")}</span>
        )}
      </div>

      <p>{w.meaning_zh}</p>
      {w.note && <p className="text-sm text-stone-600 dark:text-stone-300">{w.note}</p>}

      {(settings.showHokkien && hasHokkien) || (settings.showCantonese && w.cantonese.length > 0) ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {settings.showHokkien && hasHokkien && (
            <span>
              <span className="mr-2 text-stone-500">台語「{w.zh}」</span>
              <HokkienList h={h} />
            </span>
          )}
          {settings.showCantonese && w.cantonese.length > 0 && (
            <span>
              <span className="mr-2 text-stone-500">粵語「{w.zh}」</span>
              {w.cantonese.join("、")}
            </span>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex gap-1">
          {w.kanji.map((c, i) => (
            <KanjiText key={c + i} c={c} className="rounded border border-stone-200 px-1.5 text-lg dark:border-stone-600" />
          ))}
        </span>
        <DictLinks q={w.word} type="word" />
      </div>

      {w.sources.length > 0 && (
        <details className="text-xs text-stone-500">
          <summary className="cursor-pointer select-none">出處</summary>
          <ul className="mt-1 list-inside list-disc">
            {w.sources.map((s) => (
              <li key={s}><SourceText text={s} /></li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export default function WordsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("type");
  const active = WORD_TYPES.some((t) => t.id === raw) ? (raw as WordType) : null;
  const list = active ? WORDS.filter((w) => w.type === active) : WORDS;
  const activeInfo = WORD_TYPES.find((t) => t.id === active);

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${
      on
        ? "border-indigo-500 bg-indigo-600 text-white dark:bg-indigo-500"
        : "border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
    }`;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">詞彙</h1>

      <div className="flex flex-wrap gap-2" role="group" aria-label="依類型篩選">
        <button type="button" className={chip(!active)} aria-pressed={!active} onClick={() => setParams({})}>
          全部
        </button>
        {WORD_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={chip(active === t.id)}
            aria-pressed={active === t.id}
            onClick={() => setParams({ type: t.id })}
          >
            {t.label}
            <span className="ml-1 opacity-70">{WORDS.filter((w) => w.type === t.id).length}</span>
          </button>
        ))}
      </div>

      {activeInfo && <p className="text-stone-600 dark:text-stone-300">{activeInfo.desc}</p>}

      {list.length === 0 ? (
        <p className="text-stone-500">這一類目前還沒有資料。</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((w) => (
            <WordCard key={w.word} w={w} />
          ))}
        </ul>
      )}
    </div>
  );
}
