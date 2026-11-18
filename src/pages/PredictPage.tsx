import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KanjiText } from "../components/Clickable";
import KanjiLink from "../components/KanjiLink";
import { useSettings } from "../context/useSettings";
import { getRule } from "../lib/data";
import { detectLangs, hintRules, predict, tallyJp, type Lang, type LangResult } from "../lib/predict";

const LANG_NAME: Record<Lang, string> = { yue: "粵拼", nan: "台羅" };
const EXAMPLES = ["hok", "ha̍k", "sam", "tiong", "gin", "man", "jat"];

function Tally({ r }: { r: LangResult }) {
  if (r.jpTally.length === 0) return <p className="text-sm text-stone-500">這些字都還沒有日語音讀資料。</p>;
  return (
    <ul className="space-y-1.5">
      {r.jpTally.map((t) => (
        <li key={t.kana} className="flex flex-wrap items-baseline gap-x-3">
          <span lang="ja" className="font-jp w-20 shrink-0 text-lg">{t.kana}</span>
          <span className="text-xs text-stone-500">{t.chars.length} 字</span>
          <span className="flex flex-wrap gap-x-1">
            {t.chars.map((k) => (
              <KanjiText key={k.char} c={k.char} className="text-lg">{k.jp_char}</KanjiText>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function LangSection({ r }: { r: LangResult }) {
  const { syllable: s } = r;
  const rules = hintRules(s);
  const nearTally = tallyJp(r.near).slice(0, 8);

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <h2 className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-lg font-semibold">當作{LANG_NAME[s.lang]}「{s.plain}」</span>
        <span className="text-sm text-stone-500">
          聲母 {s.initial || "（無）"}・韻尾 {s.coda || "（母音）"}
        </span>
      </h2>

      {rules.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-stone-600 dark:text-stone-300">依規律，日語音讀大概是</h3>
          <ul className="space-y-1 text-sm">
            {rules.map((id) => {
              const rule = getRule(id);
              if (!rule) return null;
              return (
                <li key={id}>
                  <Link to={`/rules/${id}`} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">
                    {rule.title}
                  </Link>
                  ：{rule.jp_hint}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-300">
          資料中唸「{s.plain}」的字（{r.exact.length}）
        </h3>
        {r.exact.length === 0 ? (
          <p className="text-sm text-stone-500">資料中沒有讀音完全相同的字。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {r.exact.map((m) => (
              <KanjiLink key={m.kanji.char} k={m.kanji} />
            ))}
          </div>
        )}
      </div>

      {r.exact.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-300">這些字實際的日語音讀（依字數排列）</h3>
          <Tally r={r} />
        </div>
      )}

      {r.near.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-stone-600 dark:text-stone-300">
            聲母、韻尾相同的字（{r.near.length}）
          </summary>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-x-2">
              {r.near.slice(0, 80).map((m) => (
                <span key={m.kanji.char}>
                  <KanjiText c={m.kanji.char} className="text-lg">{m.kanji.jp_char}</KanjiText>
                  <span className="text-xs text-stone-400">{m.readings[0]}</span>
                </span>
              ))}
              {r.near.length > 80 && <span className="text-stone-400">⋯</span>}
            </div>
            {nearTally.length > 0 && (
              <p className="text-stone-600 dark:text-stone-300">
                常見的日語音讀：
                <span lang="ja" className="font-jp">
                  {nearTally.map((t) => `${t.kana}（${t.chars.length}）`).join("、")}
                </span>
              </p>
            )}
          </div>
        </details>
      )}
    </section>
  );
}

export default function PredictPage() {
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const forced = params.get("lang") as Lang | null;
  const [input, setInput] = useState(q);

  // 自動判斷時，跳過使用者隱藏的語言（除非這樣會什麼都不剩）
  const detected = forced ? [forced] : detectLangs(q);
  const visible = detected.filter((l) => (l === "yue" ? settings.showCantonese : settings.showHokkien));
  const langs = forced || visible.length === 0 ? detected : visible;
  const results = q.trim() ? langs.map((l) => predict(q, l)).filter((r): r is LangResult => !!r) : [];

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (input.trim()) next.set("q", input.trim());
    if (forced) next.set("lang", forced);
    setParams(next);
  }

  function setLang(l: Lang | null) {
    const next = new URLSearchParams(params);
    if (l) next.set("lang", l);
    else next.delete("lang");
    setParams(next);
  }

  const pill = (on: boolean) =>
    `rounded-full border px-3 py-0.5 text-sm ${
      on ? "border-indigo-500 bg-indigo-600 text-white dark:bg-indigo-500" : "border-stone-300 dark:border-stone-600"
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">反查推測器</h1>
        <p className="mt-2 max-w-3xl text-stone-600 dark:text-stone-300">
          輸入一個粵拼或台羅音節（聲調可有可無），看看資料裡唸這個音的字，日語實際怎麼唸，以及相關的規律。
          這是探索工具，結果都來自資料，不是標準答案。
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例如 hok、ha̍k、sam"
          aria-label="粵拼或台羅"
          className="w-56 rounded-md border border-stone-300 bg-white px-3 py-1.5 outline-none focus:border-indigo-500 dark:border-stone-600 dark:bg-stone-800"
        />
        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-700">
          查詢
        </button>
        <span className="ml-2 flex gap-1" role="group" aria-label="輸入類型">
          <button type="button" className={pill(!forced)} aria-pressed={!forced} onClick={() => setLang(null)}>自動</button>
          <button type="button" className={pill(forced === "yue")} aria-pressed={forced === "yue"} onClick={() => setLang("yue")}>粵拼</button>
          <button type="button" className={pill(forced === "nan")} aria-pressed={forced === "nan"} onClick={() => setLang("nan")}>台羅</button>
        </span>
      </form>

      <p className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
        試試看：
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setInput(ex);
              setParams(forced ? { q: ex, lang: forced } : { q: ex });
            }}
            className="rounded border border-stone-300 px-2 py-0.5 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
          >
            {ex}
          </button>
        ))}
      </p>

      {q.trim() && results.length === 0 && <p className="text-stone-500">看不懂這個拼音，請只輸入一個音節。</p>}
      {results.map((r) => (
        <LangSection key={r.syllable.lang} r={r} />
      ))}
    </div>
  );
}
