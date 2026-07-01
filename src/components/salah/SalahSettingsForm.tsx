'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSalahSettings } from '@/lib/actions/salah';
import { TASHKENT_DEFAULT } from '@/lib/domain/salah';

export type SalahSettingsValues = {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  fajr_angle: number;
  isha_angle: number;
  isha_interval: number;
  madhab: 'hanafi' | 'shafi';
  offset_fajr: number;
  offset_dhuhr: number;
  offset_asr: number;
  offset_maghrib: number;
  offset_isha: number;
  late_after_fraction: number;
};

const TASHKENT_PRESET: SalahSettingsValues = {
  city: 'Tashkent',
  latitude: TASHKENT_DEFAULT.latitude,
  longitude: TASHKENT_DEFAULT.longitude,
  timezone: TASHKENT_DEFAULT.timezone,
  fajr_angle: TASHKENT_DEFAULT.fajrAngle,
  isha_angle: TASHKENT_DEFAULT.ishaAngle,
  isha_interval: TASHKENT_DEFAULT.ishaInterval,
  madhab: TASHKENT_DEFAULT.madhab,
  offset_fajr: TASHKENT_DEFAULT.offsets.fajr,
  offset_dhuhr: TASHKENT_DEFAULT.offsets.dhuhr,
  offset_asr: TASHKENT_DEFAULT.offsets.asr,
  offset_maghrib: TASHKENT_DEFAULT.offsets.maghrib,
  offset_isha: TASHKENT_DEFAULT.offsets.isha,
  late_after_fraction: TASHKENT_DEFAULT.lateAfterFraction,
};

export function SalahSettingsForm({ initial }: { initial: SalahSettingsValues }) {
  const [values, setValues] = React.useState<SalahSettingsValues>(initial);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const num = (k: keyof SalahSettingsValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: Number(e.target.value) }));
  const str = (k: keyof SalahSettingsValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await updateSalahSettings(values);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPending(false);
    }
  };

  const field = (k: keyof SalahSettingsValues, label: string, step = '1') => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={k} className="text-xs">
        {label}
      </Label>
      <Input
        id={k}
        type="number"
        step={step}
        value={values[k] as number}
        onChange={num(k)}
      />
    </div>
  );

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Salah / prayer times</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setValues(TASHKENT_PRESET)}
        >
          Tashkent (Muftiyat)
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Default angles match the islom.uz timetable (±1–2 min). Tune per-prayer
        offsets to pin exactly to your local table.
      </p>

      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="city" className="text-xs">City</Label>
          <Input id="city" value={values.city} onChange={str('city')} />
        </div>
        {field('latitude', 'Latitude', 'any')}
        {field('longitude', 'Longitude', 'any')}
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="timezone" className="text-xs">Timezone (IANA)</Label>
          <Input id="timezone" value={values.timezone} onChange={str('timezone')} />
        </div>
        {field('fajr_angle', 'Fajr angle°', 'any')}
        {field('isha_angle', 'Isha angle°', 'any')}
        {field('isha_interval', 'Isha interval (min, 0 = angle)')}

        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="madhab" className="text-xs">Asr madhab</Label>
          <select
            id="madhab"
            value={values.madhab}
            onChange={(e) =>
              setValues((v) => ({ ...v, madhab: e.target.value as 'hanafi' | 'shafi' }))
            }
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="hanafi">Hanafi (later Asr)</option>
            <option value="shafi">Standard (Shafi/Maliki/Hanbali)</option>
          </select>
        </div>

        {field('offset_fajr', 'Fajr offset (min)')}
        {field('offset_dhuhr', 'Dhuhr offset (min)')}
        {field('offset_asr', 'Asr offset (min)')}
        {field('offset_maghrib', 'Maghrib offset (min)')}
        {field('offset_isha', 'Isha offset (min)')}
        {field('late_after_fraction', 'Late after (fraction 0–1)', 'any')}

        <div className="col-span-2 mt-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-xs text-muted-foreground">Saved.</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </form>
    </Card>
  );
}
