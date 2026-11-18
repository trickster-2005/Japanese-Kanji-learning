import type { DictLookupType, JpDict, OtherDict } from "../types";

// 所有外部字典的連結模板集中在這裡，{q} 會被替換成查詢字串。
// 日語字典一律用日本新字體（jp_char）查詢；粵語、台語字典用繁體字查詢。

export const JP_DICTS: JpDict[] = [
  { id: "jisho",      name: "Jisho",      kanji: "https://jisho.org/search/{q}%20%23kanji", word: "https://jisho.org/search/{q}" },
  { id: "weblio",     name: "Weblio",     kanji: "https://www.weblio.jp/content/{q}",       word: "https://www.weblio.jp/content/{q}" },
  { id: "kotobank",   name: "コトバンク", kanji: "https://kotobank.jp/search?q={q}",        word: "https://kotobank.jp/search?q={q}" },
  { id: "wiktionary", name: "Wiktionary", kanji: "https://ja.wiktionary.org/wiki/{q}",      word: "https://ja.wiktionary.org/wiki/{q}" },
];

// 選用：粵語、台語字典
export const OTHER_DICTS: OtherDict[] = [
  { id: "wordshk", name: "粵典",         url: "https://words.hk/zidin/{q}" },
  { id: "moedict", name: "萌典（台語）", url: "https://www.moedict.tw/'{q}" },
];

export const DEFAULT_DICT_ID = JP_DICTS[0].id;

/** 把模板中的 {q} 換成編碼後的查詢字串 */
export function fillTemplate(template: string, q: string): string {
  return template.split("{q}").join(encodeURIComponent(q));
}

export function jpDictUrl(dict: JpDict, q: string, type: DictLookupType): string {
  return fillTemplate(type === "kanji" ? dict.kanji : dict.word, q);
}

/** 依使用者的預設字典排序：預設的排第一 */
export function orderedJpDicts(defaultId: string): JpDict[] {
  const first = JP_DICTS.find((d) => d.id === defaultId);
  if (!first) return JP_DICTS;
  return [first, ...JP_DICTS.filter((d) => d.id !== defaultId)];
}
