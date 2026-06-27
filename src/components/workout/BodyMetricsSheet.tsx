'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UpsertBodyMetricsSchema,
  type UpsertBodyMetricsInput,
} from '@/lib/schemas/body-metrics';
import { upsertBodyMetrics } from '@/lib/actions/body-metrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { BodyMetrics } from '@/types';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const optionalNonneg = z
  .union([z.number().nonnegative(), z.nan()])
  .optional()
  .transform((v) => (v === undefined || Number.isNaN(v) ? undefined : v));

// Weight-only weigh-in. Girth measurements were removed from the workout page in
// the strip-down, so the sheet no longer collects them (the columns remain on the
// body_metrics table but are left null).
const FormSchema = z.object({
  date: dateString,
  weight_kg: optionalNonneg,
  notes: z.string().max(1000).optional(),
});
type FormValues = z.input<typeof FormSchema>;

interface Props {
  triggerLabel: string;
  triggerVariant?: 'default' | 'ghost' | 'outline';
  defaults?: Partial<BodyMetrics> & { date?: string };
  title?: string;
}

export function BodyMetricsSheet({
  triggerLabel,
  triggerVariant = 'default',
  defaults,
  title,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const initial: FormValues = {
    date: defaults?.date ?? today,
    weight_kg: defaults?.weight_kg != null ? Number(defaults.weight_kg) : undefined,
    notes: defaults?.notes ?? '',
  };

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(FormSchema as never),
    defaultValues: initial,
  });

  React.useEffect(() => {
    if (open) reset(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: UpsertBodyMetricsInput = UpsertBodyMetricsSchema.parse({
        date: values.date,
        weight_kg: values.weight_kg ?? null,
        notes: values.notes || null,
      });
      await upsertBodyMetrics(payload);
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant={triggerVariant} size="sm">{triggerLabel}</Button>} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title ?? 'Log weigh-in'}</SheetTitle>
          <SheetDescription>One entry per day; saving overwrites the day&apos;s row.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bm-date">Date</Label>
            <Input id="bm-date" type="date" {...register('date')} />
            {formState.errors.date && (
              <p className="text-xs text-destructive">{formState.errors.date.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bm-weight">Weight (kg)</Label>
            <Input
              id="bm-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              autoFocus
              {...register('weight_kg', { valueAsNumber: true })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bm-notes">Notes</Label>
            <Input id="bm-notes" placeholder="Optional" {...register('notes')} />
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
            <SheetClose render={<Button type="button" variant="ghost" />}>Cancel</SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
