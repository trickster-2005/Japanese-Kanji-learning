import { KanjiText } from "../components/Clickable";
import { CantoneseList, HokkienList } from "../components/Readings";
import { useSettings } from "../context/useSettings";
import { SERIES, getKanji } from "../lib/data";
import type { Kanji, Series } from "../types";

/** 字族成員：共同音讀以綠色標出 */
function Member({ k, shared, isPhonetic }: { k: Kanji; shared: string; isPhonetic?: boolean }) {
  const { settings } = useSettings();
  const on = k.on.filter((o) => !o.extra);
  const hasShared = on.some((o) => o.kana === shared);

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
            className={o.kana === shared ? "rounded bg-emerald-100 px-1 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100" : ""}
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
    <section id={s.phonetic} className="scroll-mt-24 space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <h2 className="flex flex-wrap items-baseline gap-3">
        <span className="text-xl font-semibold">聲符「{s.phonetic}」</span>
        <span className="text-sm text-stone-600 dark:text-stone-300">
          共同音讀
          <span lang="ja" className="font-jp ml-1 rounded bg-emerald-100 px-1.5 text-base text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
            {s.on}
          </span>
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

export default function SeriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">聲符字族</h1>
        <p className="mt-2 max-w-3xl text-stone-600 dark:text-stone-300">
          形聲字的聲符（表音的部分）相同時，日語音讀也常常相同。認得聲符，就能猜出一整群字的音讀。
          「共同音讀」是這個字族裡出現最多次的現代音讀（依 KANJIDIC2 計算）。
        </p>
      </div>
      {SERIES.map((s) => (
        <SeriesCard key={s.phonetic} s={s} />
      ))}
    </div>
  );
}
