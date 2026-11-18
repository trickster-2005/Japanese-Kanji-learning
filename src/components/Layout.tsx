import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { KANJI, WORDS } from "../lib/data";
import Header from "./Header";

export default function Layout() {
  // 換頁時回到頁面頂端（例如從長表格點進單字頁）
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
        收錄 {KANJI.length.toLocaleString()} 個漢字、{WORDS.length.toLocaleString()} 個詞，讀音都取自開放資料（出處見各頁面）。單字的中文釋義尚待補充。
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 px-4 py-4 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
        漢字規律館 · 用台語、粵語推日語音讀 · 只做瀏覽與查詢 ·{" "}
        <Link to="/settings" className="underline">
          資料來源與授權
        </Link>
      </footer>
    </div>
  );
}
