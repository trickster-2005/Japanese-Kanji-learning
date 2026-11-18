import { describeSource } from "../lib/sources";

/** 出處清單：短代碼展開成說明、授權與連結 */
export default function SourceList({ sources, jp }: { sources: string[]; jp?: string }) {
  if (sources.length === 0) return <span className="text-stone-400">待確認</span>;
  return (
    <ul className="list-inside list-disc space-y-0.5 text-xs text-stone-600 dark:text-stone-300">
      {sources.map((code) => {
        const s = describeSource(code, { jp });
        return (
          <li key={code}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">
                {s.text}
              </a>
            ) : (
              s.text
            )}
            {s.license && <span className="ml-1 text-stone-400">［{s.license}］</span>}
          </li>
        );
      })}
    </ul>
  );
}
