import DictLinks from "../components/DictLinks";
import { JP_DICTS } from "../config/dictionaries";
import { useSettings } from "../context/useSettings";
import { SOURCE_META } from "../lib/sources";

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4" />
      {label}
    </label>
  );
}

export default function SettingsPage() {
  const { settings, update } = useSettings();

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">設定</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">預設日語字典</h2>
        <p className="text-sm text-stone-500">預設字典會排在字典按鈕的第一個。</p>
        {JP_DICTS.map((d) => (
          <label key={d.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="defaultDict"
              value={d.id}
              checked={settings.defaultDict === d.id}
              onChange={() => update({ defaultDict: d.id })}
              className="size-4"
            />
            {d.name}
          </label>
        ))}
        <div className="pt-2">
          <p className="mb-1 text-xs text-stone-500">預覽：</p>
          <DictLinks q="学校" type="word" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">顯示</h2>
        <Check checked={settings.showCantonese} onChange={(v) => update({ showCantonese: v })} label="顯示粵語" />
        <Check checked={settings.showHokkien} onChange={(v) => update({ showHokkien: v })} label="顯示台語" />
        <Check checked={settings.darkMode} onChange={(v) => update({ darkMode: v })} label="深色模式" />
      </section>

      <section id="sources" className="scroll-mt-24 space-y-2">
        <h2 className="font-semibold">資料來源與授權</h2>
        <p className="text-sm text-stone-500">網站上所有讀音都來自下列開放資料，各字、各詞的頁面也列出了個別出處。</p>
        <ul className="space-y-2 text-sm">
          {Object.entries(SOURCE_META).map(([id, m]) => (
            <li key={id}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                {m.name}
              </a>
              {m.version && <span className="ml-1 text-stone-500">（{m.version}）</span>}
              <span className="ml-2 rounded bg-stone-100 px-1.5 text-xs dark:bg-stone-700">{m.license}</span>
              <div className="text-stone-600 dark:text-stone-300">{m.covers}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">已看過標記</h2>
        <p className="text-sm text-stone-500">
          目前標記了 {settings.seen.length} 項。標記只存在這台裝置的瀏覽器裡。
        </p>
        <button
          type="button"
          disabled={settings.seen.length === 0}
          onClick={() => update({ seen: [] })}
          className="rounded-md border border-stone-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-stone-600"
        >
          清除所有標記
        </button>
      </section>
    </div>
  );
}
