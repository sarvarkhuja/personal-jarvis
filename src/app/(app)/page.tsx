import { Suspense } from 'react';
import { requireUserId } from '@/lib/auth/server-user';
import { loadProfile } from '@/lib/data/profile';
import { formatInTimeZone } from 'date-fns-tz';
import { DailyEvidence } from '@/components/home/DailyEvidence';
import { FutureSelfPanel } from '@/components/home/FutureSelfPanel';
import { PageLoading } from '@/components/layout/PageLoading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

async function HomeHeader({ userId, now }: { userId: string; now: Date }) {
  const profile = await loadProfile(userId);
  const displayName = profile.display_name;
  return (
    <header className="mb-2 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-mono text-sm font-medium uppercase leading-none tracking-[0.2em] text-text-primary">JARVIS</h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {formatInTimeZone(now, profile.timezone ?? 'UTC', 'EEE d MMMM yyyy').toUpperCase()}
        </p>
      </div>
      {displayName && (
        <div className="flex size-10 shrink-0 items-center justify-center border border-border-visible font-mono text-[13px] uppercase text-text-primary">
          {displayName[0].toUpperCase()}
        </div>
      )}
    </header>
  );
}

export default async function HomePage() {
  const userId = await requireUserId();
  const now = new Date();

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 pb-8 pt-16 md:px-8 md:pt-8">
      <Suspense fallback={<div className="min-h-14" aria-hidden="true" />}>
        <HomeHeader userId={userId} now={now} />
      </Suspense>
      <Tabs defaultValue="future-self" className="w-full gap-6">
        <TabsList variant="line" aria-label="Homepage sections" className="min-h-11 w-full sm:w-fit">
          <TabsTrigger value="future-self" className="min-h-11 px-5">Future self</TabsTrigger>
          <TabsTrigger value="daily-evidence" className="min-h-11 px-5">Daily evidence</TabsTrigger>
        </TabsList>
        <TabsContent value="future-self" keepMounted>
          <Suspense fallback={<PageLoading embedded />}>
            <FutureSelfPanel userId={userId} now={now} />
          </Suspense>
        </TabsContent>
        <TabsContent value="daily-evidence" keepMounted>
          <Suspense fallback={<PageLoading embedded />}>
            <DailyEvidence userId={userId} now={now} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  );
}
