'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateEventSchema, EventKindSchema } from '@/lib/schemas/events';
import { createEvent } from '@/lib/actions/events';
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

const FormSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM').default('09:00'),
  durationMinutes: z.number().int().min(0).max(60 * 24 * 2).default(60),
  kind: EventKindSchema.default('event'),
  linked_goal_id: z.string().uuid().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof FormSchema>;

type Option = { id: string; label: string };

export function AddEventSheet({
  goalOptions,
  defaultDate,
  triggerLabel = 'Add event',
  triggerVariant = 'default',
}: {
  goalOptions: Option[];
  defaultDate: string;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'ghost' | 'outline';
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState } =
    useForm<FormValues>({
      resolver: zodResolver(FormSchema as never),
      defaultValues: {
        title: '',
        description: '',
        date: defaultDate,
        time: '09:00',
        durationMinutes: 60,
        kind: 'event',
        linked_goal_id: '',
      },
    });

  // Reset the date field if defaultDate changes (different day clicked).
  React.useEffect(() => {
    reset((v) => ({ ...v, date: defaultDate }));
  }, [defaultDate, reset]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const startsAt = new Date(`${values.date}T${values.time}:00`);
      const endsAt =
        values.durationMinutes > 0
          ? new Date(startsAt.getTime() + values.durationMinutes * 60_000)
          : null;
      const payload = CreateEventSchema.parse({
        title: values.title,
        description: values.description || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        kind: values.kind,
        linked_goal_id: values.linked_goal_id || null,
      });
      await createEvent(payload);
      reset({ ...values, title: '', description: '' });
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            data-testid={`add-event-trigger-${defaultDate}`}
            variant={triggerVariant}
            size="sm"
          >
            {triggerLabel}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add event</SheetTitle>
          <SheetDescription>{defaultDate}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              data-testid="event-title"
              placeholder="Dentist"
              {...register('title')}
            />
            {formState.errors.title && (
              <p className="text-xs text-destructive">
                {formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                data-testid="event-date"
                {...register('date')}
              />
              {formState.errors.date && (
                <p className="text-xs text-destructive">
                  {formState.errors.date.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                data-testid="event-time"
                placeholder="09:00"
                {...register('time')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-duration">Duration (min)</Label>
              <Input
                id="event-duration"
                type="number"
                inputMode="numeric"
                {...register('durationMinutes', { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-kind">Kind</Label>
              <Controller
                name="kind"
                control={control}
                render={({ field }) => (
                  <select
                    id="event-kind"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    <option value="event">event</option>
                    <option value="appointment">appointment</option>
                    <option value="milestone">milestone</option>
                  </select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Input
              id="event-description"
              placeholder="Optional"
              {...register('description')}
            />
          </div>

          {goalOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-goal">Linked goal (optional)</Label>
              <Controller
                name="linked_goal_id"
                control={control}
                render={({ field }) => (
                  <select
                    id="event-goal"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  >
                    <option value="">— none —</option>
                    {goalOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          )}

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <SheetFooter className="px-0">
            <Button
              type="submit"
              disabled={submitting}
              data-testid="event-submit"
            >
              {submitting ? 'Saving…' : 'Save event'}
            </Button>
            <SheetClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
