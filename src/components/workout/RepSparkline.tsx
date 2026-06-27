// Compact rep history strip. `history` is oldest→newest, only logged weeks.
// Pads on the left with hollow cells so the strip is always `weeks` wide.
export function RepSparkline({
  history,
  weeks = 8,
}: {
  history: { reps: number }[]
  weeks?: number
}) {
  const reps = history.slice(-weeks).map((h) => h.reps)
  const padded: (number | null)[] = [
    ...Array(Math.max(0, weeks - reps.length)).fill(null),
    ...reps,
  ]
  const max = Math.max(1, ...reps)

  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden="true">
      {padded.map((v, i) => (
        <div
          key={i}
          className={`w-1.5 ${v == null ? 'bg-border/40' : 'bg-text-primary'}`}
          style={{ height: v == null ? '14%' : `${Math.max(14, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}
