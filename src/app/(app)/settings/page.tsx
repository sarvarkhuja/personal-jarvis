import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireUserId } from '@/lib/auth/server-user';
import { DeleteAccountButton } from '@/components/account/DeleteAccountButton';
import { createClient } from '@/lib/supabase/server';
import { loadSalahConfig } from '@/lib/data/salah';
import {
  SalahSettingsForm,
  type SalahSettingsValues,
} from '@/components/salah/SalahSettingsForm';

export default async function SettingsPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const cfg = await loadSalahConfig(supabase, userId);
  const { data: cityRow } = await supabase
    .from('salah_settings')
    .select('city')
    .eq('user_id', userId)
    .maybeSingle();
  const salahInitial: SalahSettingsValues = {
    city: (cityRow as { city?: string } | null)?.city ?? 'Tashkent',
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    timezone: cfg.timezone,
    fajr_angle: cfg.fajrAngle,
    isha_angle: cfg.ishaAngle,
    isha_interval: cfg.ishaInterval,
    madhab: cfg.madhab,
    offset_fajr: cfg.offsets.fajr,
    offset_dhuhr: cfg.offsets.dhuhr,
    offset_asr: cfg.offsets.asr,
    offset_maghrib: cfg.offsets.maghrib,
    offset_isha: cfg.offsets.isha,
    late_after_fraction: cfg.lateAfterFraction,
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="font-heading text-2xl font-medium">Settings</h1>
        <p className="text-sm text-muted-foreground">Account &amp; data.</p>
      </header>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-sm font-medium">Export</h2>
        <p className="text-sm text-muted-foreground">
          Download a JSON file containing every row across your tracker tables.
        </p>
        <Button render={<Link href="/api/export" download data-testid="export-link" />}>
          Download my data
        </Button>
      </Card>

      <SalahSettingsForm initial={salahInitial} />

      <Card className="flex flex-col gap-3 border-destructive/50 p-4">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated tracker data.
          This cannot be undone.
        </p>
        <DeleteAccountButton />
      </Card>
    </main>
  );
}
