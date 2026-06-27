import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PillsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36" />
      </header>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <Card className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-32" />
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
