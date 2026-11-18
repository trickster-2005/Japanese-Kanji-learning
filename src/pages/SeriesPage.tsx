import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KanjiText } from "../components/Clickable";
import { CantoneseList, HokkienList } from "../components/Readings";
import { useSettings } from "../context/useSettings";
import { SERIES, getKanji } from "../lib/data";
import { toHiragana } from "../lib/romanize";
import { plainKana } from "../lib/text";
import type { Kanji, Series } from "../types";

const SAME = "rounded bg-emerald-100 px-1 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100";
const VOICED = "rounded bg-emerald-50 px-1 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-800";

/** 字族成員：和共同音讀相同的音讀標深綠，只差清濁的標淺綠 */
function Member({ k, shared, isPhonetic }: { k: Kanji; shared: string; isPhonetic?: boolean }) {
  const { settings } = useSettings();
  const on = k.on.filter((o) => !o.extra);
  const plain = plainKana(shared);
  const hasShared = on.some((o) => plainKana(o.kana) === plain);

  return (
    <div
      className={`rounded-lg border p-3 ${
        isPhonetic
          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
          : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
      }`}
    >
      <div className="flex items-baseline gap-1">
        <KanjiText c={k.char} className="text-3xl">{k.jp_char}</KanjiText>
        {k.char !== k.jp_char && <span className="text-sm text-stone-500">{k.char}</span>}
        {isPhonetic && <span className="ml-auto text-xs text-indigo-700 dark:text-indigo-300">聲符</span>}
        {!isPhonetic && !hasShared && <span className="ml-auto text-xs text-amber-700 dark:text-amber-300">無共同音讀</span>}
      </div>
      <div lang="ja" className="font-jp mt-1 flex flex-wrap gap-x-2 text-sm">
        {on.map((o) => (
          <span
            key={o.kana}
            className={o.kana === shared ? SAME : plainKana(o.kana) === plain ? VOICED : ""}
            title={o.kana !== shared && plainKana(o.kana) === plain ? "和共同音讀只差清濁" : undefined}
          >
            {o.kana}
          </span>
        ))}
      </div>
      {settings.showCantonese && (
        <div className="mt-1 text-xs text-stone-600 dark:text-stone-300">
          <span className="mr-1 text-stone-400">粵</span>
          <CantoneseList readings={k.cantonese} />
        </div>
      )}
      {settings.showHokkien && (
        <div className="mt-1 text-xs text-stone-600 dark:text-stone-300">
          <span className="mr-1 text-stone-400">台</span>
          <HokkienList h={k.hokkien} />
        </div>
      )}
    </div>
  );
}

function SeriesCard({ s }: { s: Series }) {
  const phonetic = getKanji(s.phonetic);
  const members = s.members.map((m) => getKanji(m)).filter((k): k is Kanji => !!k);

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <h2 className="flex flex-wrap items-baseline gap-3">
        <span className="text-xl font-semibold">聲符「{s.phonetic}」</span>
        <span className="text-sm text-stone-600 dark:text-stone-300">
          共同音讀
          <span lang="ja" className="font-jp ml-1 rounded bg-emerald-100 px-1.5 text-base text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
            {s.on}
          </span>
        </span>
        <span className="text-xs text-stone-500">
          {s.members.length} 字中 {s.shared} 字同音
          {s.source === "manual" && "・人工指定"}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {phonetic && <Member k={phonetic} shared={s.on} isPhonetic />}
        {members.map((k) => (
          <Member key={k.char} k={k} shared={s.on} />
        ))}
      </div>
    </section>
  );
}

const PAGE = 20;

/** 字族裡任何一個字（繁體或新字體）或共同音讀符合 */
function matches(s: Series, q: string): boolean {
  if (!q) return true;
  const kana = toHiragana(q);
  if (s.on === kana) return true;
  return [s.phonetic, ...s.members].some((c) => {
    const k = getKanji(c);
    return q.includes(c) || (k !== undefined && q.includes(k.jp_char));
  });
}

export default function SeriesPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const [shown, setShown] = useState(PAGE);
  const list = SERIES.filter((s) => matches(s, q));

  function setQuery(v: string) {
    setShown(PAGE);
    setParams(v ? { q: v } : {}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">聲符字族</h1>
        <p className="mt-2 max-w-3xl text-stone-600 dark:text-stone-300">
          形聲字由形旁（表意）和聲旁（表音）組成。聲旁相同時，日語音讀也常常相同，認得聲旁就能猜出一整群字的音讀。
          字族是程式依漢字結構資料（IDS）自動找出的：去掉部首後剩下的部件就是聲旁候選，至少有兩個字和聲旁同音才收錄。
          「共同音讀」依 KANJIDIC2 計算：深綠是同音，淺綠是只差清濁（例如ほう和ぼう），也算同音。
        </p>
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="找字族：輸入漢字或音讀，例如「晴」「せい」"
        aria-label="篩選字族"
        lang="ja"
        className="w-full max-w-md rounded-md border border-stone-300 bg-white px-3 py-1.5 outline-none focus:border-indigo-500 dark:border-stone-600 dark:bg-stone-800"
      />

      {!q && SERIES.length > 1 && (
        <details>
          <summary className="cursor-pointer text-sm text-stone-600 select-none dark:text-stone-300">
            全部聲旁（{SERIES.length}）
          </summary>
          <div lang="ja" className="font-jp mt-2 flex flex-wrap gap-1">
            {SERIES.map((s) => (
              <button
                key={s.phonetic}
                type="button"
                onClick={() => setQuery(s.phonetic)}
                className="rounded border border-stone-200 px-1.5 text-lg hover:border-indigo-400 dark:border-stone-700"
                title={`${s.on}（${s.members.length} 字）`}
              >
                {getKanji(s.phonetic)?.jp_char ?? s.phonetic}
              </button>
            ))}
          </div>
        </details>
      )}

      {list.length === 0 ? (
        <p className="text-stone-500">沒有符合的字族。</p>
      ) : (
        <>
          {q && <p className="text-sm text-stone-500">找到 {list.length} 組</p>}
          {list.slice(0, shown).map((s) => (
            <SeriesCard key={s.phonetic} s={s} />
          ))}
          {shown < list.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mx-auto block rounded-md border border-stone-300 px-4 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
            >
              顯示更多（還有 {list.length - shown} 組）
            </button>
          )}
        </>
      )}
    </div>
  );
}
