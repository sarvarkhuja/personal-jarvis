'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CreateHabitFields,
  type CreateHabitInput,
} from '@/lib/schemas/habits';
import { ALL_DAYS, frequencyFromDays } from '@/lib/domain/habit-frequency';
import { DEFAULT_HABIT_COLOR } from '@/lib/constants/habit-colors';
import { createHabit } from '@/lib/actions/habits';
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
import { DayOfWeekPicker } from './DayOfWeekPicker';
import { ColorPicker } from './ColorPicker';

const KIND_OPTIONS = [
  { value: 'check', label: 'Checkbox (done / not done)' },
  { value: 'counter', label: 'Counter (e.g. glasses, reps)' },
  { value: 'timer', label: 'Timer (track elapsed seconds)' },
] as const;

const FormSchema = CreateHabitFields.omit({
  frequency: true,
  scheduled_time: true,
}).extend({
  days: z.array(z.number().int().min(1).max(7)).min(1, 'Pick at least one day'),
  scheduled_time: z.string().optional(),
});
type FormValues = Omit<CreateHabitInput, 'frequency' | 'scheduled_time'> & {
  days: number[];
  scheduled_time?: string;
};

type GoalOption = { id: string; label: string };

export function AddHabitSheet({ goalOptions }: { goalOptions: GoalOption[] }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const hasGoals = goalOptions.length > 0;

  const { register, handleSubmit, control, reset, watch, setValue, formState } =
    useForm<FormValues>({
      resolver: zodResolver(FormSchema as never),
      defaultValues: {
        name: '',
        goal_id: '',
        kind: 'check',
        target: undefined,
        unit: '',
        scheduled_time: '',
        color: DEFAULT_HABIT_COLOR,
        days: [...ALL_DAYS],
      },
    });

  const kind = watch('kind');

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      await createHabit({
        name: values.name,
        goal_id: values.goal_id,
        kind: values.kind,
        target: values.target ?? undefined,
        unit: values.unit || undefined,
        color: values.color || DEFAULT_HABIT_COLOR,
        frequency: frequencyFromDays(values.days),
        scheduled_time:
          values.kind === 'timer' && values.scheduled_time
            ? values.scheduled_time
            : null,
      });
      reset();
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to create habit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button data-testid="add-habit-trigger">Add habit</Button>}
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add habit</SheetTitle>
          <SheetDescription>
            {hasGoals
              ? 'Track something you want to do regularly. Pick the goal it serves.'
              : 'Habits belong to a goal. Create a goal first.'}
          </SheetDescription>
        </SheetHeader>

        {!hasGoals ? (
          <div
            data-testid="add-habit-no-goals"
            className="flex flex-col gap-3 px-4"
          >
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any active goals yet. A habit must be tied to one.
            </p>
            <Button
              render={
                <Link
                  href="/goals"
                  data-testid="add-habit-goto-goals"
                />
              }
            >
              Go to Goals
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-name">Name</Label>
              <Input
                id="habit-name"
                data-testid="habit-name"
                placeholder="Drink water"
                {...register('name')}
              />
              {formState.errors.name && (
                <p className="text-xs text-destructive">
                  {formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-goal">Goal</Label>
              <Controller
                name="goal_id"
                control={control}
                render={({ field }) => (
                  <select
                    id="habit-goal"
                    data-testid="habit-goal"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  >
                    <option value="" disabled>
                      Select a goal…
                    </option>
                    {goalOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {formState.errors.goal_id && (
                <p className="text-xs text-destructive">
                  {formState.errors.goal_id.message ?? 'Pick a goal'}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-kind">Kind</Label>
              <Controller
                name="kind"
                control={control}
                render={({ field }) => (
                  <select
                    id="habit-kind"
                    data-testid="habit-kind"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      if (e.target.value !== 'timer') {
                        setValue('scheduled_time', '');
                      }
                    }}
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-frequency">Frequency</Label>
              <Controller
                name="days"
                control={control}
                render={({ field }) => (
                  <DayOfWeekPicker
                    id="habit-frequency"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Selecting all seven days means every day.
              </p>
              {formState.errors.days && (
                <p className="text-xs text-destructive">
                  {formState.errors.days.message ?? 'Pick at least one day'}
                </p>
              )}
            </div>

            {kind === 'timer' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-time">Time</Label>
                <Input
                  id="habit-time"
                  type="time"
                  data-testid="habit-time"
                  {...register('scheduled_time')}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Sorts this habit into a part of your day.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-color">Color</Label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <ColorPicker
                    id="habit-color"
                    value={field.value || DEFAULT_HABIT_COLOR}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {serverError && (
              <p className="text-xs text-destructive">{serverError}</p>
            )}

            <SheetFooter className="px-0">
              <Button type="submit" disabled={submitting} data-testid="habit-submit">
                {submitting ? 'Saving…' : 'Save habit'}
              </Button>
              <SheetClose render={<Button type="button" variant="ghost" />}>
                Cancel
              </SheetClose>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
