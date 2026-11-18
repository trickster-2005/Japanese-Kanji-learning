import { Link } from "react-router-dom";

export default function NotFoundPage({ what = "這個頁面" }: { what?: string }) {
  return (
    <section className="py-12 text-center">
      <h1 className="text-xl font-bold">找不到{what}</h1>
      <p className="mt-2 text-stone-500">
        <Link to="/" className="underline">回首頁</Link>
      </p>
    </section>
  );
}
