// 資料裡的出處是短代碼（例如 "jmdict:1206730"），這裡展開成完整說明
import metaData from "../data/meta.json";

interface SourceMeta {
  name: string;
  version: string;
  license: string;
  covers: string;
  url: string;
}

const META = metaData as Record<string, SourceMeta>;
export const SOURCE_META = META;

export interface SourceLine {
  text: string;
  url?: string;
  license?: string;
}

const ver = (id: string) => (META[id]?.version ? `（${META[id].version}）` : "");

/** ctx.jp：日本新字體，用於 Wiktionary 頁名 */
export function describeSource(code: string, ctx: { jp?: string } = {}): SourceLine {
  const [id, detail = ""] = code.split(/:(.*)/s);
  const m = META[id === "yue" || id === "man" || id === "variant" ? "unihan" : id.replace("-word", "")];
  const base = { url: m?.url, license: m?.license };

  switch (id) {
    case "kanjidic2":
      return { ...base, text: `${m.covers}：${m.name}${ver("kanjidic2")}` };
    case "jmdict":
      return { ...base, text: `讀音、英文釋義：${m.name}${ver("jmdict")} 詞條 #${detail}` };
    case "yue":
      return { ...base, text: `粵語：Unicode Unihan kCantonese（${detail}，${META.unihan.version}）` };
    case "man":
      return { ...base, text: `華語：Unicode Unihan kMandarin${ver("unihan")}` };
    case "variant":
      return detail === "unihan"
        ? { ...base, text: "新字體與繁體的對應：Unicode Unihan 異體字欄位（kJapaneseOldVariant 等）" }
        : { url: META.kanjidic2.url, license: META.kanjidic2.license, text: "新字體與繁體的對應：KANJIDIC2 variant 欄位" };
    case "kautian":
      return {
        ...base,
        text: `台語：${m.name}，工作表「名」` + (detail ? `（辭典註明部分讀音出自：${detail}）` : ""),
      };
    case "kautian-word":
      return { ...base, text: `台語：${m.name}，詞目「${detail}」` };
    case "guangyun":
      return { ...base, text: `中古音：${m.name} 韻書/廣韻.csv 小韻 ${detail.split(",").map((x) => `#${x}`).join("、")}` };
    case "wiktionary":
      return {
        license: m.license,
        url: `https://en.wiktionary.org/w/index.php?oldid=${detail}`,
        text: `讀音層次：English Wiktionary「${ctx.jp ?? ""}」{{ja-readings}}`,
      };
    default:
      return { text: code };
  }
}
