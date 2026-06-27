import { Skeleton } from '@/components/ui/skeleton';

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      <Skeleton className="h-3 w-28" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </section>
  );
}

export default function TodayLoading() {
  return (
    <main className="w-full space-y-4 px-4 py-8">
      {/* DAY STRIP signature placeholder */}
      <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
        <div className="mb-8 flex items-baseline justify-between">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-16 w-44" />
        <Skeleton className="mt-8 h-8 w-full" />
        <Skeleton className="mt-6 h-4 w-2/3" />
      </section>

      {/* masonry placeholder */}
      <div className="gap-4 lg:columns-2 xl:columns-3">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={3} />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
      </div>
    </main>
  );
}
