// 反查推測器：輸入粵拼或台羅，找出資料裡讀音相同／相近的字，並整理它們的日語音讀。
// 「可能的日語音讀」完全由資料統計而來，不是程式自己編的讀音。
import type { Kanji } from "../types";
import { KANJI } from "./data";
import { stripJyutpingTone, stripTailoTone } from "./romanize";

export type Lang = "yue" | "nan";

export interface Syllable {
  lang: Lang;
  /** 去掉聲調後的整個音節 */
  plain: string;
  initial: string;
  /** 韻尾：p t k h m n ng，或空字串（母音結尾） */
  coda: string;
}

const INITIALS: Record<Lang, string[]> = {
  // 粵拼聲母（長的放前面，先比對）
  yue: ["gw", "kw", "ng", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "w", "z", "c", "s", "j"],
  // 台羅聲母
  nan: ["tsh", "ts", "ph", "th", "kh", "ng", "p", "b", "m", "t", "n", "l", "k", "g", "h", "s", "j"],
};

const CODAS: Record<Lang, string[]> = {
  yue: ["ng", "p", "t", "k", "m", "n"],
  nan: ["ng", "p", "t", "k", "h", "m", "n"],
};

export function plainOf(s: string, lang: Lang): string {
  const base = lang === "yue" ? stripJyutpingTone(s) : stripTailoTone(s);
  return base.replace(/[^a-z]/g, "");
}

export function parseSyllable(raw: string, lang: Lang): Syllable | null {
  const plain = plainOf(raw, lang);
  if (!plain) return null;
  let initial = INITIALS[lang].find((i) => plain.startsWith(i) && plain.length > i.length) ?? "";
  // 粵語「ng」單獨成音節（五、吳）時沒有聲母
  if (lang === "yue" && plain === "ng") initial = "";
  // 台羅鼻化 -nn 不是韻尾，先拿掉再判斷
  const body = lang === "nan" ? plain.replace(/nn$/, "") : plain;
  const rest = body.slice(initial.length);
  const coda = CODAS[lang].find((c) => rest.endsWith(c) && rest.length > c.length) ?? "";
  return { lang, plain, initial, coda };
}

/** 猜輸入的是粵拼還是台羅；分不出來時兩種都查 */
export function detectLangs(raw: string): Lang[] {
  const s = raw.trim().toLowerCase();
  const hasDiacritic = /[̀-ͯ]/.test(s.normalize("NFD"));
  if (hasDiacritic || /ts|oo|nn$|[^n]h$|^ph|^th|^kh/.test(s)) return ["nan"];
  if (/[1-6]$/.test(s) || /^[zc]|eo|oe|yu|aa/.test(s)) return ["yue"];
  return ["yue", "nan"];
}

function readingsOf(k: Kanji, lang: Lang): string[] {
  if (lang === "yue") return k.cantonese;
  return [...k.hokkien.literary, ...k.hokkien.colloquial, ...k.hokkien.unmarked];
}

export interface Match {
  kanji: Kanji;
  /** 符合的原始讀音（含聲調） */
  readings: string[];
}

export interface JpTally {
  kana: string;
  chars: Kanji[];
}

export interface LangResult {
  syllable: Syllable;
  exact: Match[];
  /** 聲母、韻尾相同，只有母音不同 */
  near: Match[];
  /** 讀音相同的字，日語音讀依出現次數排列 */
  jpTally: JpTally[];
}

export function tallyJp(matches: Match[]): JpTally[] {
  const map = new Map<string, Kanji[]>();
  for (const { kanji } of matches) {
    for (const o of kanji.on) {
      if (o.extra) continue;
      const list = map.get(o.kana) ?? [];
      if (!list.includes(kanji)) list.push(kanji);
      map.set(o.kana, list);
    }
  }
  return [...map.entries()]
    .map(([kana, chars]) => ({ kana, chars }))
    .sort((a, b) => b.chars.length - a.chars.length || a.kana.localeCompare(b.kana, "ja"));
}

export function predict(raw: string, lang: Lang): LangResult | null {
  const syllable = parseSyllable(raw, lang);
  if (!syllable) return null;
  const exact: Match[] = [];
  const near: Match[] = [];
  for (const k of KANJI) {
    const rs = readingsOf(k, lang);
    const hit = rs.filter((r) => plainOf(r, lang) === syllable.plain);
    if (hit.length) {
      exact.push({ kanji: k, readings: hit });
      continue;
    }
    const close = rs.filter((r) => {
      const p = parseSyllable(r, lang);
      return p && p.initial === syllable.initial && p.coda === syllable.coda;
    });
    if (close.length) near.push({ kanji: k, readings: close });
  }
  return { syllable, exact, near, jpTally: tallyJp(exact) };
}

/** 依聲母、韻尾找出相關規律（只是提示，實際以資料為準） */
export function hintRules(s: Syllable): string[] {
  const ids: string[] = [];
  const { lang, initial, coda } = s;
  if (lang === "yue") {
    if (initial === "h") ids.push("initial-h-to-k");
    if (initial === "f") ids.push("initial-f-to-h");
    if (initial === "ng") ids.push("initial-ng-to-g");
    if (initial === "m") ids.push("initial-m-to-b");
    if (initial === "j") ids.push("initial-j-to-j-n");
    if (initial === "z" || initial === "c") ids.push("initial-z-to-ch");
  } else {
    if (initial === "h") ids.push("initial-h-to-k", "initial-f-to-h");
    if (initial === "g") ids.push("initial-ng-to-g");
    if (initial === "b") ids.push("initial-m-to-b");
    if (initial === "j" || initial === "l") ids.push("initial-j-to-j-n");
    if (initial === "t" || initial === "th") ids.push("initial-z-to-ch");
  }
  if (coda === "k") ids.push("coda-k");
  if (coda === "t") ids.push("coda-t");
  if (coda === "p") ids.push("coda-p");
  if (coda === "m" || coda === "n") ids.push("coda-m-n");
  if (coda === "ng") ids.push("coda-ng");
  return ids;
}
