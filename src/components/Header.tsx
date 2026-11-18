import { Link, NavLink } from "react-router-dom";
import DisplayToggles from "./DisplayToggles";
import SearchBox from "./SearchBox";

const NAV = [
  { to: "/rules", label: "規律" },
  { to: "/words", label: "詞彙" },
  { to: "/series", label: "字族" },
  { to: "/predict", label: "反查" },
  { to: "/reader", label: "閱讀" },
  { to: "/settings", label: "設定" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur dark:border-stone-700 dark:bg-stone-900/90">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link to="/" className="text-lg font-bold tracking-wide text-indigo-700 dark:text-indigo-300">
          漢字規律館
        </Link>
        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `shrink-0 rounded px-2 py-1 text-sm ${
                  isActive
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox />
          <DisplayToggles />
        </div>
      </div>
    </header>
  );
}
