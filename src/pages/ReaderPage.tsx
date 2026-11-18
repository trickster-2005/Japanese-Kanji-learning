import { useEffect, useMemo, useState } from "react";
import { WordText } from "../components/Clickable";
import JpText from "../components/JpText";
import KanjiLink from "../components/KanjiLink";
import SpeakButton from "../components/SpeakButton";
import { WORDS, getKanji } from "../lib/data";
import { isKanji } from "../lib/text";

const STORAGE_KEY = "kanji-rules-reader";
const SAMPLE = "学校で日本の漢字を勉強します。東京の大学に行く学生は、毎日新しい言葉を覚えます。";

function loadText(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? SAMPLE;
  } catch {
    return SAMPLE;
  }
}

export default function ReaderPage() {
  const [text, setText] = useState(loadText);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // 存不了就算了
    }
  }, [text]);

  // 文中出現的漢字（依出現順序、不重複）與已收錄的詞彙
  const chars = useMemo(() => [...new Set([...text].filter(isKanji))], [text]);
  const known = chars.map((c) => getKanji(c)).filter((k) => !!k);
  const unknown = chars.filter((c) => !getKanji(c));
  const words = useMemo(
    () =>
      WORDS.filter((w) => w.word.length > 1 && text.includes(w.word)).sort(
        (a, b) => text.indexOf(a.word) - text.indexOf(b.word),
      ),
    [text],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">閱讀模式</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">
          貼上一段日文，下面的文字裡每個漢字都可以點，會顯示讀音、所屬規律和字典連結。
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        lang="ja"
        aria-label="日文內容"
        placeholder="在這裡貼上日文"
        className="font-jp w-full rounded-lg border border-stone-300 bg-white p-3 outline-none focus:border-indigo-500 dark:border-stone-600 dark:bg-stone-800"
      />
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => setText("")} className="rounded border border-stone-300 px-3 py-1 dark:border-stone-600">
          清空
        </button>
        <button type="button" onClick={() => setText(SAMPLE)} className="rounded border border-stone-300 px-3 py-1 dark:border-stone-600">
          範例文字
        </button>
        <SpeakButton text={text} label="全文">朗讀全文</SpeakButton>
      </div>
      {text.trim() && (
        <p className="text-xs text-stone-500">
          「朗讀全文」用的是裝置內建的語音合成，漢字讀法由裝置自行判斷，可能念錯；個別詞彙旁的喇叭念的是資料中的讀音。
        </p>
      )}

      {text.trim() && (
        <>
          <section className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
            <JpText text={text} />
          </section>

          {words.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">文中的詞彙</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {words.map((w) => (
                  <span key={w.word}>
                    <WordText w={w.word} className="text-lg" />
                    <span lang="ja" className="font-jp ml-1 text-xs text-stone-500">{w.reading}</span>
                    {w.reading && <SpeakButton text={w.reading} label={w.word} />}
                  </span>
                ))}
              </div>
            </section>
          )}

          {known.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">文中的漢字</h2>
              <div className="flex flex-wrap gap-2">
                {known.map((k) => (
                  <KanjiLink key={k.char} k={k} />
                ))}
              </div>
              {unknown.length > 0 && (
                <p className="mt-2 text-sm text-stone-500">
                  資料中尚未收錄：<span lang="ja" className="font-jp">{unknown.join("、")}</span>
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
