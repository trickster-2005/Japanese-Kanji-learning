import { Link } from "react-router-dom";
import { useSettings } from "../context/useSettings";
import type { Rule } from "../types";

export default function RuleCard({ rule }: { rule: Rule }) {
  const { isSeen } = useSettings();
  return (
    <Link
      to={`/rules/${rule.id}`}
      className="block rounded-lg border border-stone-200 bg-white p-4 transition hover:border-indigo-400 hover:shadow-sm dark:border-stone-700 dark:bg-stone-800 dark:hover:border-indigo-500"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{rule.title}</h3>
        {isSeen(`rule:${rule.id}`) && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓</span>}
      </div>
      <p className="mt-1 font-mono text-sm text-indigo-700 dark:text-indigo-300">{rule.pattern}</p>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{rule.summary}</p>
      <p className="mt-2 text-lg tracking-widest">{rule.examples.join("、")}</p>
    </Link>
  );
}
