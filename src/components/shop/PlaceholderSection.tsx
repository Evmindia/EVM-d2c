export function PlaceholderSection({ title, note }: { title: string; note: string }) {
  const id = `ph-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-10 shadow-sm">
      <h2 id={id} className="text-xl font-light tracking-tight text-neutral-900 sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 rounded-2xl border border-neutral-200/70 bg-[#f9f8f6] p-5 text-xs text-neutral-600 leading-relaxed">
        <p>{note}</p>
      </div>
    </section>
  );
}
