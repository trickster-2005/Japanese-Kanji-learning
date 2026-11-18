import type { HokkienReadings, OnReading } from "../types";
import SpeakButton from "./SpeakButton";

const MISSING = <span className="text-stone-400">待確認</span>;

const LAYER_SHORT: Record<string, string> = { 吳音: "吳", 漢音: "漢", 唐音: "唐", 宋音: "宋", 慣用音: "慣" };

const EXTRA_TITLE = "只見於 Wiktionary，KANJIDIC2 未收（多為現代少用），不列入規律判斷";

/**
 * 日語音讀＋讀音層次標籤。
 * bad 中的讀音以例外色標示；extra（僅見於 Wiktionary）的讀音以灰色顯示。
 * detailed：單字頁用，標籤寫全名，並說明灰色讀音。
 */
export function OnList({ on, bad = [], detailed = false }: { on: OnReading[]; bad?: string[]; detailed?: boolean }) {
  if (on.length === 0) return MISSING;
  const hasExtra = on.some((o) => o.extra);
  return (
    <span>
      <span className={`inline-flex flex-wrap gap-x-3 gap-y-1 ${detailed ? "text-lg" : ""}`}>
        {on.map((o) => (
          <span key={o.kana} title={o.extra ? EXTRA_TITLE : undefined} className={o.extra ? "text-stone-400 dark:text-stone-500" : ""}>
            <span
              lang="ja"
              className={`font-jp ${
                bad.includes(o.kana)
                  ? "rounded bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-700/60 dark:text-amber-50"
                  : ""
              }`}
            >
              {o.kana}
            </span>
            {detailed && <SpeakButton text={o.kana} className="ml-0.5" />}
            <sub className="ml-0.5 text-[10px] text-stone-500 dark:text-stone-400">
              {o.layers.length
                ? o.layers.map((l) => (detailed ? l : LAYER_SHORT[l] ?? l)).join("・")
                : detailed
                  ? "層次待確認"
                  : ""}
            </sub>
          </span>
        ))}
      </span>
      {detailed && hasExtra && <span className="mt-1 block text-xs text-stone-500">灰色：{EXTRA_TITLE}</span>}
    </span>
  );
}

export function CantoneseList({ readings }: { readings: string[] }) {
  return readings.length ? <span>{readings.join("、")}</span> : MISSING;
}

function Tag({ children }: { children: string }) {
  return (
    <span className="mr-0.5 rounded bg-stone-200 px-1 text-[10px] text-stone-600 dark:bg-stone-700 dark:text-stone-300">
      {children}
    </span>
  );
}

/** 台語讀音：文讀、白讀加小標籤，未標文白的直接列出 */
export function HokkienList({ h }: { h: HokkienReadings }) {
  const parts = [
    ...h.literary.map((r) => ({ r, tag: "文" })),
    ...h.colloquial.map((r) => ({ r, tag: "白" })),
    ...h.unmarked.map((r) => ({ r, tag: "" })),
  ];
  if (parts.length === 0) return MISSING;
  return (
    <span className="inline-flex flex-wrap gap-x-2">
      {parts.map(({ r, tag }) => (
        <span key={tag + r}>
          {tag && <Tag>{tag}</Tag>}
          {r}
        </span>
      ))}
    </span>
  );
}
