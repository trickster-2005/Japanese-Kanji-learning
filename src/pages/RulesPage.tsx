import RuleCard from "../components/RuleCard";
import { RULES, RULE_CATEGORIES } from "../lib/data";

export default function RulesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">規律清單</h1>
      {RULE_CATEGORIES.map((cat) => {
        const rules = RULES.filter((r) => r.category === cat);
        if (rules.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="mb-3 text-lg font-semibold">
              {cat} <span className="text-sm font-normal text-stone-500">（{rules.length}）</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((r) => (
                <RuleCard key={r.id} rule={r} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
