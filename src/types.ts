// 全站共用型別定義

/** 日語音讀的層次（來源：English Wiktionary 的 ja-readings） */
export type ReadingLayer = "吳音" | "漢音" | "唐音" | "宋音" | "慣用音";

export interface OnReading {
  kana: string;
  /** 同一個讀音可能同時是吳音和漢音；空陣列表示待確認 */
  layers: ReadingLayer[];
  /** true：只見於 Wiktionary、KANJIDIC2 沒收的讀音（多為現代少用），不列入規律判斷 */
  extra?: boolean;
}

export interface HokkienReadings {
  /** 文讀音（Tâi-lô） */
  literary: string[];
  /** 白讀音（Tâi-lô） */
  colloquial: string[];
  /** 辭典未標文白的讀音 */
  unmarked: string[];
}

/** 中古音（廣韻）的一個音韻地位。多音字會有好幾筆。 */
export interface MiddleChinese {
  /** 聲母（切韻聲類），例如「匣」 */
  initial: string;
  /** 廣韻韻目，例如「覺」 */
  rhyme: string;
  /** 聲調：平／上／去／入 */
  tone: string;
  /** tshet-uinh 音韻地位描述，例如「匣二江入」 */
  status: string;
  /** 反切 */
  fanqie: string;
}

export type JlptLevel = "N1" | "N2" | "N3" | "N4" | "N5" | "";

export interface Kanji {
  /** 繁體字 */
  char: string;
  /** 日本新字體 */
  jp_char: string;
  on: OnReading[];
  kun: string[];
  /** 粵拼 */
  cantonese: string[];
  hokkien: HokkienReadings;
  /** 漢語拼音 */
  mandarin: string;
  middle_chinese: MiddleChinese[];
  /** 所屬聲符（對應 series.json 的 phonetic） */
  phonetic_series: string;
  /** 規律 id */
  rules: string[];
  meaning_zh: string;
  /** KANJIDIC2 英文釋義（meaning_zh 有資料前先顯示這個） */
  meaning_en: string[];
  jlpt: JlptLevel;
  /** KANJIDIC2 的舊制 JLPT 級數（1–4，2010 年以前） */
  jlpt_old: number | null;
  joyo: boolean;
  /** 常用詞彙（日本新字體） */
  words: string[];
  notes: string;
  /** 各欄位的資料出處 */
  sources: string[];
}

export type WordType =
  | "same"
  | "false_friend"
  | "wasei"
  | "taigi_shared"
  | "old_meaning";

export interface Word {
  word: string;
  /** JMdict 的主要讀音 */
  reading: string;
  /** JMdict 的其他讀音 */
  alt_readings: string[];
  /** 日語意思（中文說明，人工編寫） */
  meaning_zh: string;
  /** JMdict 英文釋義 */
  gloss_en: string[];
  type: WordType;
  kanji: string[];
  rules: string[];
  /** 查台語、粵語用的字形，例如「案內」「走」 */
  zh: string;
  hokkien: HokkienReadings;
  /** 只有單字（zh 一個字）時才有 */
  cantonese: string[];
  note: string;
  sources: string[];
}

export type RuleCategory = "聲母" | "韻尾" | "促音" | "讀音層次";

export interface RuleException {
  char: string;
  reason: string;
  /** true：只有部分音讀不符合；false：全部音讀都不符合 */
  partial: boolean;
  /** 不符合規律的日語音讀 */
  readings: string[];
}

export interface Rule {
  id: string;
  title: string;
  category: RuleCategory;
  summary: string;
  explanation: string;
  pattern: string;
  examples: string[];
  exceptions: RuleException[];
}

export interface Series {
  phonetic: string;
  on: string;
  members: string[];
}

// ---- 字典 ----

export type DictLookupType = "kanji" | "word";

export interface JpDict {
  id: string;
  name: string;
  /** 查單字的網址模板，{q} 會被替換 */
  kanji: string;
  /** 查詞彙的網址模板，{q} 會被替換 */
  word: string;
}

export interface OtherDict {
  id: string;
  name: string;
  url: string;
}

// ---- 使用者設定 ----

export interface Settings {
  showCantonese: boolean;
  showHokkien: boolean;
  darkMode: boolean;
  defaultDict: string;
  /** 「已看過」書籤：只做標記，不計分 */
  seen: string[];
}
