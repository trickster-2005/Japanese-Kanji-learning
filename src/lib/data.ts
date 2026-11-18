// 資料載入與查詢索引。所有讀音都只從 /src/data/*.json 讀取。
import kanjiData from "../data/kanji.json";
import rulesData from "../data/rules.json";
import seriesData from "../data/series.json";
import wordsData from "../data/words.json";
import type { Kanji, Rule, RuleCategory, Series, Word } from "../types";
import { normalizeQuery, stripJyutpingTone, stripTailoTone, toHiragana } from "./romanize";

export const KANJI = kanjiData as Kanji[];
export const WORDS = wordsData as Word[];
export const RULES = rulesData as Rule[];
export const SERIES = seriesData as Series[];

export const RULE_CATEGORIES: RuleCategory[] = ["聲母", "韻尾", "促音", "讀音層次"];

// 繁體字與新字體都能查到同一筆
const kanjiIndex = new Map<string, Kanji>();
for (const k of KANJI) {
  kanjiIndex.set(k.char, k);
  kanjiIndex.set(k.jp_char, k);
}

const ruleIndex = new Map(RULES.map((r) => [r.id, r]));
const wordIndex = new Map(WORDS.map((w) => [w.word, w]));

export const getKanji = (c: string) => kanjiIndex.get(c);
export const getRule = (id: string) => ruleIndex.get(id);
export const getWord = (w: string) => wordIndex.get(w);

export const kanjiByRule = (id: string) => KANJI.filter((k) => k.rules.includes(id));

export interface SearchResults {
  kanji: Kanji[];
  words: Word[];
  rules: Rule[];
}

/** 全站搜尋：漢字、假名、粵拼、台羅、華語拼音 */
export function search(raw: string): SearchResults {
  const q = raw.trim();
  if (!q) return { kanji: [], words: [], rules: [] };
  const norm = normalizeQuery(q);
  const kana = toHiragana(q);

  const kanji = KANJI.filter(
    (k) =>
      q.includes(k.char) ||
      q.includes(k.jp_char) ||
      k.on.some((o) => o.kana === kana) ||
      k.kun.some((r) => r.replace(/[.-]/g, "") === kana) ||
      k.cantonese.some((c) => c === q.toLowerCase() || stripJyutpingTone(c) === norm) ||
      [...k.hokkien.literary, ...k.hokkien.colloquial, ...k.hokkien.unmarked].some((h) => stripTailoTone(h) === norm) ||
      stripTailoTone(k.mandarin) === norm,
  );

  const words = WORDS.filter(
    (w) => w.word.includes(q) || (w.reading !== "" && w.reading.includes(kana)) || w.meaning_zh.includes(q),
  );

  const rules = RULES.filter(
    (r) => r.title.includes(q) || r.summary.includes(q) || r.pattern.toLowerCase().includes(q.toLowerCase()),
  );

  return { kanji, words, rules };
}
