/** 漢字（不含々〆ヶ〇這類符號） */
export const isKanji = (c: string) => /\p{Script=Han}/u.test(c) && !"々〆ヶ〇".includes(c);

/** 去掉濁點、半濁點：ぼう → ほう（比較「同音」時不分清濁） */
export const plainKana = (kana: string) =>
  kana.normalize("NFD").replace(/[゙゚]/g, "").normalize("NFC");

/** 單字頁網址 */
export const kanjiPath = (c: string) => `/kanji/${encodeURIComponent(c)}`;
