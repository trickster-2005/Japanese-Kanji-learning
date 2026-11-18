import type { WordType } from "../types";

export const WORD_TYPES: { id: WordType; label: string; desc: string }[] = [
  { id: "same", label: "免學清單", desc: "意思和中文一樣，認得字就懂，只要記讀音。" },
  { id: "false_friend", label: "假朋友", desc: "字形和中文一樣，意思卻不同，最容易誤會。" },
  { id: "wasei", label: "和製漢語", desc: "日本自己造的漢語詞，有些後來也傳進中文。" },
  { id: "taigi_shared", label: "台日共有詞", desc: "台語也在用的日語漢字詞，會台語的人很熟悉。" },
  { id: "old_meaning", label: "古義保留", desc: "台語、粵語、日語都保留了古代的意思，華語卻不這樣用。" },
];

export const wordTypeLabel = (t: WordType) => WORD_TYPES.find((x) => x.id === t)?.label ?? t;
