import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getVoiceState, speakJa, stopSpeaking, subscribeVoices } from "../lib/speech";

const NO_VOICE = "這台裝置沒有日語語音，可在系統設定加裝日語語音後再試";

/**
 * 朗讀按鈕。text 是要念的內容（盡量給假名讀音），label 是給螢幕閱讀器與提示用的文字。
 * 瀏覽器不支援語音合成時不顯示。
 */
export default function SpeakButton({
  text,
  label,
  className = "",
  children,
}: {
  text: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const voice = useSyncExternalStore(subscribeVoices, getVoiceState, getVoiceState);
  const [speaking, setSpeaking] = useState(false);
  const mine = useRef<SpeechSynthesisUtterance | null>(null);

  // 離開頁面時，如果正在念的是這顆按鈕的內容就停掉
  useEffect(
    () => () => {
      if (mine.current) stopSpeaking();
    },
    [],
  );

  if (voice.status === "unsupported" || !text.trim()) return null;
  const disabled = voice.status === "none";
  const what = label ?? text;

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (voice.status !== "ready") return;
    if (speaking) {
      stopSpeaking();
      return;
    }
    const u = speakJa(text, voice.voice);
    mine.current = u;
    setSpeaking(true);
    const done = () => {
      if (mine.current === u) mine.current = null;
      setSpeaking(false);
    };
    u.addEventListener("end", done);
    u.addEventListener("error", done);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={speaking ? `停止朗讀「${what}」` : `朗讀「${what}」`}
      title={disabled ? NO_VOICE : speaking ? "停止" : `朗讀「${what}」`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full align-middle text-stone-500 hover:bg-indigo-100 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-300 ${
        speaking ? "text-indigo-700 dark:text-indigo-300" : ""
      } ${children ? "border border-stone-300 px-3 py-1 text-sm dark:border-stone-600" : "p-1"} ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" />
        {speaking ? (
          <path d="M16 9h6v6h-6z" fill="currentColor" stroke="none" />
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
      {children}
    </button>
  );
}
