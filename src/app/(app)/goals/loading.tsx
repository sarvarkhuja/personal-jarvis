export default function GoalsLoading() {
  return (
    <div className="w-full space-y-4 px-4 py-8">
      <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ HORIZON ]
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
          [ LOADING… ]
        </div>
      </section>
      <div className="gap-4 lg:columns-2 xl:columns-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <section
            key={i}
            className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-5"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
              [ LOADING… ]
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
