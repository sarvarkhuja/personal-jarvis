export default function HabitsLoading() {
  return (
    <main className="w-full px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-medium tracking-tight text-text-display">
            Habits
          </h1>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
            [ LOADING… ]
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            [ CONSISTENCY ]
          </span>
          <div className="dot-grid-subtle mt-6 h-20 w-full rounded md:h-24" />
        </section>

        <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <section
              key={i}
              className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6"
            >
              <div className="dot-grid-subtle h-24 w-full rounded" />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
