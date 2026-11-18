import { useSettings } from "../context/useSettings";

function Pill({ on, label, title, onClick }: { on: boolean; label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className={`rounded-md border px-2 py-1 text-xs ${
        on
          ? "border-indigo-400 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-900/50 dark:text-indigo-200"
          : "border-stone-300 text-stone-400 line-through dark:border-stone-600 dark:text-stone-500"
      }`}
    >
      {label}
    </button>
  );
}

/** 粵語欄、台語欄顯示開關＋深色模式 */
export default function DisplayToggles() {
  const { settings, update } = useSettings();
  return (
    <div className="flex items-center gap-1">
      <Pill
        on={settings.showCantonese}
        label="粵"
        title="顯示／隱藏粵語"
        onClick={() => update({ showCantonese: !settings.showCantonese })}
      />
      <Pill
        on={settings.showHokkien}
        label="台"
        title="顯示／隱藏台語"
        onClick={() => update({ showHokkien: !settings.showHokkien })}
      />
      <button
        type="button"
        onClick={() => update({ darkMode: !settings.darkMode })}
        title={settings.darkMode ? "切換為淺色模式" : "切換為深色模式"}
        aria-label="切換深色模式"
        className="rounded-md border border-stone-300 px-2 py-1 text-xs dark:border-stone-600"
      >
        {settings.darkMode ? "☀" : "☾"}
      </button>
    </div>
  );
}
