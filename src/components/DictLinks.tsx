import { OTHER_DICTS, fillTemplate, jpDictUrl, orderedJpDicts } from "../config/dictionaries";
import { useSettings } from "../context/useSettings";
import type { DictLookupType } from "../types";

interface Props {
  /** 日語查詢字串，必須是日本新字體 */
  q: string;
  type: DictLookupType;
  /** 繁體字形；有提供時，額外顯示粵語、台語字典 */
  zh?: string;
}

const linkProps = { target: "_blank", rel: "noopener noreferrer" } as const;

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors";
const primary =
  "border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-400 dark:bg-indigo-500";
const normal =
  "border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700";
const other =
  "border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40";

/** 一排外部字典小按鈕。預設字典排第一並以實心顯示。 */
export default function DictLinks({ q, type, zh }: Props) {
  const { settings } = useSettings();
  const dicts = orderedJpDicts(settings.defaultDict);

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`在字典查「${q}」`}>
      {dicts.map((d, i) => (
        <a
          key={d.id}
          href={jpDictUrl(d, q, type)}
          {...linkProps}
          className={`${base} ${i === 0 ? primary : normal}`}
        >
          {d.name}
        </a>
      ))}
      {zh &&
        OTHER_DICTS.filter((d) => {
          if (d.id === "wordshk") return settings.showCantonese;
          if (d.id === "moedict") return settings.showHokkien;
          return true;
        }).map((d) => (
          <a key={d.id} href={fillTemplate(d.url, zh)} {...linkProps} className={`${base} ${other}`}>
            {d.name}
          </a>
        ))}
    </div>
  );
}
