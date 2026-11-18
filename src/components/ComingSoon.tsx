export default function ComingSoon({ title, stage, desc }: { title: string; stage: number; desc: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-300">{desc}</p>
      <p className="mt-4 rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
        此頁將在階段 {stage} 建置。
      </p>
    </section>
  );
}
