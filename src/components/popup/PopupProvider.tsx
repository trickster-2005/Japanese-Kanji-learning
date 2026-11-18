import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { PopupContext, type PopupTarget } from "../../context/popupContext";
import WordInfo from "./WordInfo";

interface OpenState {
  target: PopupTarget;
  anchor: HTMLElement;
  /** 打開時的路由；換頁後自動視為關閉 */
  locationKey: string;
}

const WIDTH = 320;
const GAP = 6;
const MOBILE = 640;

/** 詞彙點擊彈窗：桌機貼在被點的詞旁邊，手機從底部滑出 */
export default function PopupProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<OpenState | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mobile, setMobile] = useState(() => window.innerWidth < MOBILE);
  const boxRef = useRef<HTMLDivElement>(null);

  // 用路徑判斷是否換頁（從網址列直接改 hash 時，location.key 不一定會變）
  const where = location.pathname + location.search;
  const current = state && state.locationKey === where ? state : null;

  // 用 Esc 或關閉鈕關掉時，焦點回到原本被點的字；點旁邊關掉時不搶焦點
  const close = useCallback(
    (restoreFocus = true) => {
      if (restoreFocus) current?.anchor.focus({ preventScroll: true });
      setState(null);
    },
    [current],
  );

  const open = useCallback(
    (target: PopupTarget, anchor: HTMLElement) => setState({ target, anchor, locationKey: where }),
    [where],
  );

  // 定位：先畫出來量高度，再決定放在下方或上方
  const place = useCallback(() => {
    if (!current || !boxRef.current) return;
    const isMobile = window.innerWidth < MOBILE;
    setMobile(isMobile);
    if (isMobile) return;
    const r = current.anchor.getBoundingClientRect();
    const h = boxRef.current.offsetHeight;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - WIDTH - 8);
    const below = r.bottom + GAP;
    const top = below + h > window.innerHeight - 8 && r.top - GAP - h > 8 ? r.top - GAP - h : below;
    setPos({ top, left });
  }, [current]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!boxRef.current?.contains(t) && !current.anchor.contains(t)) close(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    boxRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [current, close, place]);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <PopupContext.Provider value={value}>
      {children}
      {current && (
        <div
          ref={boxRef}
          role="dialog"
          aria-label="詞彙資訊"
          tabIndex={-1}
          style={mobile ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? 0, width: WIDTH }}
          className={`fixed z-50 overflow-y-auto border border-stone-200 bg-white text-stone-900 shadow-xl outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 ${
            mobile ? "inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl p-4 pb-6" : "max-h-[80vh] rounded-xl p-4"
          }`}
        >
          <button
            type="button"
            onClick={() => close()}
            aria-label="關閉"
            className="absolute top-2 right-2 rounded px-2 text-lg leading-none text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            ×
          </button>
          <WordInfo word={current.target.word} />
        </div>
      )}
    </PopupContext.Provider>
  );
}
