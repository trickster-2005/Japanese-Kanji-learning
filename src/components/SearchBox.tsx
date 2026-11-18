import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBox() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v) navigate(`/search?q=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={onSubmit} role="search">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="漢字／假名／粵拼／台羅"
        aria-label="搜尋"
        className="w-40 rounded-md border border-stone-300 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500 sm:w-52 dark:border-stone-600 dark:bg-stone-800"
      />
    </form>
  );
}
