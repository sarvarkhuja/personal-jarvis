'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UpsertWeeklyLiftSchema,
  type UpsertWeeklyLiftInput,
} from '@/lib/schemas/weekly-lifts';
import { upsertWeeklyLift } from '@/lib/actions/weekly-lifts';
import type { LiftKey } from '@/lib/utils/lift-metrics';
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

const repsField = z
  .union([z.number().int().nonnegative(), z.nan()])
  .refine((v) => !Number.isNaN(v), { message: 'Enter reps' });

const weightField = z
  .union([z.number().nonnegative(), z.nan()])
  .optional()
  .transform((v) => (v === undefined || Number.isNaN(v) ? undefined : v));

function makeSchema(bodyweight: boolean) {
  return z
    .object({ reps: repsField, weight_kg: weightField })
    .superRefine((val, ctx) => {
      if (!bodyweight && val.weight_kg === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weight_kg'],
          message: 'Enter weight',
        });
      }
    });
}

type FormValues = { reps?: number; weight_kg?: number };

interface Props {
  exercise: LiftKey;
  display: string;
  bodyweight: boolean;
  weekStart: string;
  current: { weight: number | null; reps: number } | null;
  previous: { weight: number | null; reps: number } | null;
  triggerLabel: string;
}

export function LiftLogSheet({
  exercise,
  display,
  bodyweight,
  weekStart,
  current,
  previous,
  triggerLabel,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const initial: FormValues = {
    reps: current?.reps ?? undefined,
    weight_kg: current?.weight ?? previous?.weight ?? undefined,
  };

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(bodyweight) as never),
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
      const payload: UpsertWeeklyLiftInput = UpsertWeeklyLiftSchema.parse({
        exercise,
        week_start: weekStart,
        weight_kg: values.weight_kg ?? null,
        reps: values.reps as number,
      });
      await upsertWeeklyLift(payload);
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  const lastWeekText = previous
    ? `Last week: ${previous.weight != null ? `${previous.weight} kg` : 'BW'} × ${previous.reps} reps`
    : 'No previous entry yet.';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="sm">{triggerLabel}</Button>} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{display} · this week</SheetTitle>
          <SheetDescription>{lastWeekText}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lift-reps">Reps</Label>
            <Input
              id="lift-reps"
              type="number"
              inputMode="numeric"
              autoFocus
              {...register('reps', { valueAsNumber: true })}
            />
            {formState.errors.reps && (
              <p className="text-xs text-destructive">{formState.errors.reps.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lift-weight">
              {bodyweight ? 'Added weight (kg, optional)' : 'Weight (kg)'}
            </Label>
            <Input
              id="lift-weight"
              type="number"
              inputMode="decimal"
              step="0.5"
              {...register('weight_kg', { valueAsNumber: true })}
            />
            {formState.errors.weight_kg && (
              <p className="text-xs text-destructive">{formState.errors.weight_kg.message}</p>
            )}
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
