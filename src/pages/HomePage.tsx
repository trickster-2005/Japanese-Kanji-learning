import { Link } from "react-router-dom";
import { KanjiText } from "../components/Clickable";
import RuleCard from "../components/RuleCard";
import { RULES, RULE_CATEGORIES, getKanji } from "../lib/data";

// 讀音一律從資料檔取，不寫死在畫面上
const heroReadings = ["漢", "海", "學"].map((c) => getKanji(c)?.on[0]?.kana ?? "？").join("、");

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-gradient-to-br from-indigo-50 to-amber-50 p-6 dark:from-indigo-950/60 dark:to-stone-800">
        <h1 className="text-2xl font-bold sm:text-3xl">用台語、粵語推日語音讀</h1>
        <p className="mt-3 leading-relaxed text-stone-700 dark:text-stone-200">
          日語的音讀、台語和粵語的讀音，都是從中古漢語分支出來的。
          以中古漢語為樞紐，你已經會的台語或粵語發音，可以對應出日語漢字的音讀——
          例如粵語、台語唸 <b>h</b> 的「<KanjiText c="漢" />、<KanjiText c="海" />、<KanjiText c="學" />」，日語唸 <b>k</b>：
          <span lang="ja" className="font-jp">{heroReadings}</span>。
        </p>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          這裡只做瀏覽、探索、查詢。每個漢字和詞彙都能點進日語字典。
        </p>
      </section>

      {RULE_CATEGORIES.map((cat) => {
        const rules = RULES.filter((r) => r.category === cat);
        if (rules.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="mb-3 text-lg font-semibold">{cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((r) => (
                <RuleCard key={r.id} rule={r} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-sm text-stone-500 dark:text-stone-400">
        <Link to="/rules" className="underline">看全部規律 →</Link>
      </p>
    </div>
  );
}
