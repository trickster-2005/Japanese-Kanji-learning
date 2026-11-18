import { Link, useSearchParams } from "react-router-dom";
import { WordText } from "../components/Clickable";
import DictLinks from "../components/DictLinks";
import KanjiLink from "../components/KanjiLink";
import { search } from "../lib/data";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { kanji, words, rules } = search(q);
  const empty = kanji.length + words.length + rules.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">搜尋「{q}」</h1>
      {empty && <p className="text-stone-500">資料中沒有符合的結果。</p>}

      {kanji.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">漢字</h2>
          <div className="flex flex-wrap gap-2">
            {kanji.map((k) => <KanjiLink key={k.char} k={k} />)}
          </div>
        </section>
      )}

      {words.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">詞彙</h2>
          <ul className="space-y-2">
            {words.map((w) => (
              <li key={w.word} className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
                <WordText w={w.word} className="text-lg" />
                <span lang="ja" className="font-jp ml-2 text-sm text-stone-500">{w.reading}</span>
                <span className="ml-2 text-sm">{w.meaning_zh}</span>
                <div className="mt-2"><DictLinks q={w.word} type="word" /></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rules.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">規律</h2>
          <ul className="list-inside list-disc">
            {rules.map((r) => (
              <li key={r.id}><Link to={`/rules/${r.id}`} className="underline">{r.title}</Link>：{r.pattern}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
