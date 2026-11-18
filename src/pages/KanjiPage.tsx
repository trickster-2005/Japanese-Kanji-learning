import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { WordText } from "../components/Clickable";
import DictLinks from "../components/DictLinks";
import { OnList } from "../components/Readings";
import SourceList from "../components/SourceList";
import SeenButton from "../components/SeenButton";
import { useSettings } from "../context/useSettings";
import { SERIES, getKanji, getRule, getWord } from "../lib/data";
import NotFoundPage from "./NotFoundPage";

const EMPTY = <span className="text-stone-400">待確認</span>;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 border-b border-stone-100 py-2 last:border-0 dark:border-stone-700">
      <dt className="text-sm text-stone-500 dark:text-stone-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const list = (xs: string[]) => (xs.length ? xs.join("、") : EMPTY);

export default function KanjiPage() {
  const { char = "" } = useParams();
  const { settings } = useSettings();
  const k = getKanji(char);
  if (!k) return <NotFoundPage what={`「${char}」`} />;

  const series = SERIES.find((s) => s.phonetic === k.phonetic_series);
  const ruleExc = (id: string) => getRule(id)?.exceptions.find((e) => e.char === k.char);

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex items-baseline gap-3">
          <span lang="ja" className="font-jp text-6xl">{k.jp_char}</span>
          {k.char !== k.jp_char && <span className="text-3xl text-stone-500">{k.char}</span>}
        </div>
        <div className="space-y-2">
          <p className="text-stone-700 dark:text-stone-200">
            {k.meaning_zh ||
              (k.meaning_en.length > 0 ? (
                <>
                  {k.meaning_en.join("; ")}
                  <span className="ml-2 text-xs text-stone-500">（英文釋義，中文釋義待補）</span>
                </>
              ) : (
                EMPTY
              ))}
          </p>
          <SeenButton id={`kanji:${k.char}`} />
        </div>
      </header>

      <DictLinks q={k.jp_char} type="kanji" zh={k.char} />

      <dl className="rounded-lg border border-stone-200 bg-white px-4 dark:border-stone-700 dark:bg-stone-800">
        <Row label="日語音讀">
          <OnList on={k.on} detailed />
        </Row>
        <Row label="日語訓讀"><span lang="ja" className="font-jp">{list(k.kun)}</span></Row>
        {settings.showCantonese && <Row label="粵語（粵拼）">{list(k.cantonese)}</Row>}
        {settings.showHokkien && (
          <>
            {k.hokkien.literary.length + k.hokkien.colloquial.length > 0 && (
              <>
                <Row label="台語文讀">{list(k.hokkien.literary)}</Row>
                <Row label="台語白讀">{list(k.hokkien.colloquial)}</Row>
              </>
            )}
            {(k.hokkien.unmarked.length > 0 || k.hokkien.literary.length + k.hokkien.colloquial.length === 0) && (
              <Row label={k.hokkien.literary.length + k.hokkien.colloquial.length > 0 ? "台語（未標文白）" : "台語"}>
                {list(k.hokkien.unmarked)}
              </Row>
            )}
          </>
        )}
        <Row label="華語">{k.mandarin || EMPTY}</Row>
        <Row label="中古音">
          {k.middle_chinese.length
            ? k.middle_chinese.map((m) => (
                <div key={m.status}>
                  {m.initial}母　{m.rhyme}韻　{m.tone}聲
                  <span className="ml-2 text-xs text-stone-500">{m.status}・{m.fanqie}切</span>
                </div>
              ))
            : EMPTY}
        </Row>
        <Row label="JLPT">
          {k.jlpt ||
            (k.jlpt_old ? (
              <>
                舊制 {k.jlpt_old} 級<span className="ml-2 text-xs text-stone-500">（新制 N 級待補）</span>
              </>
            ) : (
              EMPTY
            ))}
        </Row>
        <Row label="常用漢字">{k.joyo ? "是" : "否"}</Row>
        <Row label="所屬規律">
          <div className="flex flex-wrap gap-1.5">
            {k.rules.map((id) => {
              const exc = ruleExc(id);
              return (
                <Link
                  key={id}
                  to={`/rules/${id}`}
                  title={exc?.reason}
                  className={`rounded px-2 py-0.5 text-sm hover:underline ${
                    exc
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                      : "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
                  }`}
                >
                  {getRule(id)?.title ?? id}
                  {exc && <span className="ml-1 text-xs">（{exc.partial ? "部分例外" : "例外"}）</span>}
                </Link>
              );
            })}
          </div>
        </Row>
        <Row label="聲符字族">
          {series ? (
            <Link to={`/series?q=${encodeURIComponent(series.phonetic)}`} className="hover:underline">
              {series.phonetic}（<span lang="ja" className="font-jp">{series.on}</span>）：{series.members.join("、")}
            </Link>
          ) : (
            <span className="text-stone-400">—</span>
          )}
        </Row>
        <Row label="出處">
          <SourceList sources={k.sources} jp={k.jp_char} />
        </Row>
        {k.notes && <Row label="備註"><span className="text-sm">{k.notes}</span></Row>}
      </dl>

      <section>
        <h2 className="mb-2 font-semibold">常用詞彙</h2>
        {k.words.length === 0 ? (
          <p className="text-sm text-stone-500">目前資料中還沒有。</p>
        ) : (
          <ul className="space-y-3">
            {k.words.map((w) => {
              const info = getWord(w);
              return (
                <li key={w} className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <WordText w={w} className="text-xl" />
                    <span lang="ja" className="font-jp text-sm text-stone-500">{info?.reading || "讀音待確認"}</span>
                    {info && <span className="text-sm">{info.meaning_zh}</span>}
                  </div>
                  <div className="mt-2"><DictLinks q={w} type="word" /></div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
