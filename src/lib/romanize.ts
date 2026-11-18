// 拼音比對用的正規化工具（搜尋、之後的反查推測器共用）

/** 粵拼去掉聲調數字：hok6 → hok */
export function stripJyutpingTone(s: string): string {
  return s.toLowerCase().replace(/[1-6]/g, "");
}

/** 台羅去掉調號與調號數字：ha̍k → hak、hàn → han */
export function stripTailoTone(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[1-9]/g, "");
}

/** 一般查詢字串正規化：去調號、轉小寫、去空白 */
export function normalizeQuery(s: string): string {
  return stripTailoTone(s.trim());
}

/** 片假名轉平假名，讓「ガク」也能搜到「がく」 */
export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
