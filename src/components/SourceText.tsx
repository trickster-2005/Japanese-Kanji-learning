/** 出處文字：其中的網址變成可點的連結 */
export default function SourceText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all underline">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}
