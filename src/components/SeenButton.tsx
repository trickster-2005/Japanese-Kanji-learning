import { useSettings } from "../context/useSettings";

/** 「已看過」書籤：純標記，不計分 */
export default function SeenButton({ id }: { id: string }) {
  const { isSeen, toggleSeen } = useSettings();
  const seen = isSeen(id);
  return (
    <button
      type="button"
      onClick={() => toggleSeen(id)}
      aria-pressed={seen}
      className={`rounded-md border px-2.5 py-1 text-xs ${
        seen
          ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
      }`}
    >
      {seen ? "✓ 已看過" : "標記為已看過"}
    </button>
  );
}
