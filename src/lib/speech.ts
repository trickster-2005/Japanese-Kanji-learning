// 日語朗讀：使用瀏覽器內建的 Web Speech API（裝置上的語音合成），不連外部服務。
// 只朗讀資料檔裡的假名讀音；閱讀模式朗讀整段原文時，漢字讀法由裝置自行判斷。

export type VoiceState =
  | { status: "unsupported" }
  /** voice 為 null：瀏覽器還沒回報語音清單，只指定 lang="ja-JP" 試著念 */
  | { status: "ready"; voice: SpeechSynthesisVoice | null }
  /** 有語音清單，但裡面沒有日語 */
  | { status: "none" };

const supported =
  typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

function pickJaVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ja = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("ja"));
  // 優先用本機語音（離線也能念、延遲低）
  return ja.find((v) => v.localService) ?? ja[0] ?? null;
}

function compute(): VoiceState {
  if (!supported) return { status: "unsupported" };
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return { status: "ready", voice: null };
  const v = pickJaVoice(voices);
  return v ? { status: "ready", voice: v } : { status: "none" };
}

let state: VoiceState = compute();
const listeners = new Set<() => void>();

function refresh(): void {
  const next = compute();
  const same =
    next.status === state.status &&
    (next.status !== "ready" || state.status !== "ready" || next.voice === state.voice);
  if (same) return;
  state = next;
  listeners.forEach((l) => l());
}

// 語音清單是非同步載入的，一載入就更新（不等第一顆按鈕出現）
if (supported) window.speechSynthesis.addEventListener("voiceschanged", refresh);

/** 給 useSyncExternalStore 用：語音清單載好時通知所有按鈕 */
export function subscribeVoices(fn: () => void): () => void {
  listeners.add(fn);
  refresh();
  return () => listeners.delete(fn);
}

export const getVoiceState = () => state;

/** 朗讀一段日文；會先停掉正在念的內容。回傳的 utterance 可用來掛結束事件。 */
export function speakJa(text: string, voice: SpeechSynthesisVoice | null): SpeechSynthesisUtterance {
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  const v = voice ?? pickJaVoice(synth.getVoices());
  if (v) u.voice = v;
  u.rate = 0.9;
  synth.speak(u);
  return u;
}

export function stopSpeaking(): void {
  if (supported) window.speechSynthesis.cancel();
}
