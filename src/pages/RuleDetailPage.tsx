import { Link, useParams } from "react-router-dom";
import DictLinks from "../components/DictLinks";
import RuleTable from "../components/RuleTable";
import SeenButton from "../components/SeenButton";
import { WORDS, getRule, kanjiByRule } from "../lib/data";
import NotFoundPage from "./NotFoundPage";

export default function RuleDetailPage() {
  const { id = "" } = useParams();
  const rule = getRule(id);
  if (!rule) return <NotFoundPage />;

  const members = kanjiByRule(rule.id);
  // 例詞（例如促音規律的「学校」）不是單字，另外列出
  const exampleWords = rule.examples.filter((e) => [...e].length > 1);

  return (
    <article className="space-y-6">
      <div>
        <Link to="/rules" className="text-sm text-stone-500 hover:underline">← 規律清單</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{rule.title}</h1>
          <span className="rounded bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-700">{rule.category}</span>
          <SeenButton id={`rule:${rule.id}`} />
        </div>
        <p className="mt-2 font-mono text-indigo-700 dark:text-indigo-300">{rule.pattern}</p>
        <p className="mt-2">{rule.summary}</p>
        <p className="mt-3 max-w-3xl leading-relaxed text-stone-700 dark:text-stone-300">{rule.explanation}</p>
      </div>

      {members.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">對照表（{members.length} 字）</h2>
          <p className="flex flex-wrap gap-3 text-xs text-stone-500">
            <span><span className="mr-1 inline-block size-3 rounded-sm bg-amber-100 align-middle dark:bg-amber-900" />部分例外：有些音讀不符合</span>
            <span><span className="mr-1 inline-block size-3 rounded-sm bg-rose-100 align-middle dark:bg-rose-900" />例外：所有音讀都不符合</span>
            <span>點欄位標題可以排序</span>
          </p>
          <RuleTable kanji={members} exceptions={rule.exceptions} />
        </section>
      )}

      {exampleWords.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">例詞</h2>
          <ul className="space-y-2">
            {exampleWords.map((w) => {
              const info = WORDS.find((x) => x.word === w);
              return (
                <li key={w} className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
                  <span lang="ja" className="font-jp text-xl">{w}</span>
                  <span lang="ja" className="font-jp ml-3 text-sm text-stone-500">
                    {info?.reading || "讀音待確認"}
                  </span>
                  <div className="mt-2"><DictLinks q={w} type="word" /></div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-stone-500">詞彙讀音需要 JMdict 資料，補上後會自動顯示。</p>
        </section>
      )}
    </article>
  );
}
