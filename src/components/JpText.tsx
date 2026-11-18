import { isKanji } from "../lib/text";
import { KanjiText } from "./Clickable";

/** 把一段日文裡的每個漢字變成可點的按鈕，其他文字照原樣顯示（保留換行） */
export default function JpText({ text }: { text: string }) {
  const parts: { kanji: boolean; s: string }[] = [];
  for (const c of text) {
    const kanji = isKanji(c);
    const last = parts[parts.length - 1];
    if (!kanji && last && !last.kanji) last.s += c;
    else parts.push({ kanji, s: c });
  }
  return (
    <div lang="ja" className="font-jp text-lg leading-loose whitespace-pre-wrap">
      {parts.map((p, i) => (p.kanji ? <KanjiText key={i} c={p.s} /> : <span key={i}>{p.s}</span>))}
    </div>
  );
}
