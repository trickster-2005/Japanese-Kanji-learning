import { useState } from "react";
import { useSettings } from "../context/useSettings";
import { stripTailoTone } from "../lib/romanize";
import type { Kanji, RuleException } from "../types";
import { KanjiText } from "./Clickable";
import { CantoneseList, HokkienList, OnList } from "./Readings";

type SortKey = "char" | "jp" | "yue" | "nan";

const firstHokkien = (k: Kanji) =>
  stripTailoTone(k.hokkien.literary[0] ?? k.hokkien.unmarked[0] ?? k.hokkien.colloquial[0] ?? "");

const sortValue: Record<SortKey, (k: Kanji, i: number) => string | number> = {
  char: (_k, i) => i,
  jp: (k) => k.on[0]?.kana ?? "",
  yue: (k) => k.cantonese[0] ?? "",
  nan: firstHokkien,
};

interface SortState {
  key: SortKey;
  asc: boolean;
}

function SortHeader({ k, label, sort, onSort }: { k: SortKey; label: string; sort: SortState; onSort: (s: SortState) => void }) {
  const active = sort.key === k;
  return (
    <th className="px-3 py-2 text-left font-medium" aria-sort={active ? (sort.asc ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort({ key: k, asc: active ? !sort.asc : true })}
        className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-300"
      >
        {label}
        <span className="text-xs text-stone-400">{active ? (sort.asc ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

interface Props {
  kanji: Kanji[];
  exceptions: RuleException[];
}

/** 規律對照表：日語｜粵語｜台語，可排序，例外字以顏色標示 */
export default function RuleTable({ kanji, exceptions }: Props) {
  const { settings } = useSettings();
  const [sort, setSort] = useState<SortState>({ key: "char", asc: true });
  const excByChar = new Map(exceptions.map((e) => [e.char, e]));

  const rows = kanji
    .map((k, i) => ({ k, v: sortValue[sort.key](k, i) }))
    .sort((a, b) => {
      const c = typeof a.v === "number" ? a.v - (b.v as number) : String(a.v).localeCompare(String(b.v), "ja");
      return sort.asc ? c : -c;
    })
    .map((r) => r.k);

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
      <table className="w-full text-sm">
        <thead className="bg-stone-100 dark:bg-stone-800">
          <tr>
            <SortHeader k="char" label="字" sort={sort} onSort={setSort} />
            <SortHeader k="jp" label="日語音讀" sort={sort} onSort={setSort} />
            {settings.showCantonese && <SortHeader k="yue" label="粵語" sort={sort} onSort={setSort} />}
            {settings.showHokkien && <SortHeader k="nan" label="台語" sort={sort} onSort={setSort} />}
            <th className="px-3 py-2 text-left font-medium">中古音</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const exc = excByChar.get(k.char);
            const tone = !exc
              ? ""
              : exc.partial
                ? "bg-amber-50 dark:bg-amber-950/40"
                : "bg-rose-50 dark:bg-rose-950/40";
            return (
              <tr key={k.char} className={`border-t border-stone-200 align-top dark:border-stone-700 ${tone}`}>
                <td className="px-3 py-2">
                  <KanjiText c={k.char} className="text-xl">{k.jp_char}</KanjiText>
                  {k.char !== k.jp_char && <span className="ml-1 text-xs text-stone-500">{k.char}</span>}
                </td>
                <td className="px-3 py-2">
                  <OnList on={k.on} bad={exc?.readings} />
                  {exc && (
                    <p className={`mt-1 text-xs ${exc.partial ? "text-amber-800 dark:text-amber-300" : "text-rose-700 dark:text-rose-300"}`}>
                      {exc.partial ? "部分例外" : "例外"}：{exc.reason}
                    </p>
                  )}
                </td>
                {settings.showCantonese && <td className="px-3 py-2"><CantoneseList readings={k.cantonese} /></td>}
                {settings.showHokkien && <td className="px-3 py-2"><HokkienList h={k.hokkien} /></td>}
                <td className="px-3 py-2 text-xs text-stone-600 dark:text-stone-300">
                  {k.middle_chinese.map((m) => `${m.initial}母 ${m.rhyme}韻 ${m.tone}`).join("／") || "待確認"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
