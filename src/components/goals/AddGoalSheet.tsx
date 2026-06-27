'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateGoalSchema } from '@/lib/schemas/goals';
import { createGoal } from '@/lib/actions/goals';
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
  description: z.string().max(1000).optional(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  parent_goal_id: z.string().uuid().optional().or(z.literal('')),
  linked_habit_id: z.string().uuid().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof FormSchema>;

type Option = { id: string; label: string };

export function AddGoalSheet({
  habitOptions,
  goalOptions,
  defaultParentId,
  triggerLabel = 'Add goal',
}: {
  habitOptions: Option[];
  goalOptions: Option[];
  defaultParentId?: string;
  triggerLabel?: string;
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
        target_date: '',
        parent_goal_id: defaultParentId ?? '',
        linked_habit_id: '',
      },
    });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload = CreateGoalSchema.parse({
        title: values.title,
        description: values.description || null,
        target_date: values.target_date || null,
        parent_goal_id: values.parent_goal_id || null,
        linked_habit_id: values.linked_habit_id || null,
      });
      await createGoal(payload);
      reset();
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            data-testid={
              defaultParentId
                ? `add-subgoal-trigger-${defaultParentId}`
                : 'add-goal-trigger'
            }
            className={
              defaultParentId
                ? 'font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary transition-colors duration-200 ease-out hover:text-text-primary motion-reduce:transition-none'
                : 'inline-flex h-9 items-center rounded-full bg-text-display px-4 font-mono text-[11px] uppercase tracking-[0.08em] text-background transition-opacity duration-200 ease-out hover:opacity-90 motion-reduce:transition-none'
            }
          >
            {triggerLabel}
          </button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{defaultParentId ? 'Add sub-goal' : 'Add goal'}</SheetTitle>
          <SheetDescription>
            {defaultParentId
              ? 'A child of an existing goal.'
              : 'Top-level goal you’re working toward.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              data-testid="goal-title"
              placeholder="Read 12 books"
              {...register('title')}
            />
            {formState.errors.title && (
              <p className="text-xs text-destructive">
                {formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-description">Description</Label>
            <Input
              id="goal-description"
              placeholder="Optional"
              {...register('description')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-target-date">Target date</Label>
            <Input
              id="goal-target-date"
              type="date"
              {...register('target_date')}
            />
            {formState.errors.target_date && (
              <p className="text-xs text-destructive">
                {formState.errors.target_date.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-habit">Linked habit (optional)</Label>
            <Controller
              name="linked_habit_id"
              control={control}
              render={({ field }) => (
                <select
                  id="goal-habit"
                  data-testid="goal-habit"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                >
                  <option value="">— none —</option>
                  {habitOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          {!defaultParentId && goalOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-parent">Parent goal (optional)</Label>
              <Controller
                name="parent_goal_id"
                control={control}
                render={({ field }) => (
                  <select
                    id="goal-parent"
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

          {defaultParentId && (
            <input type="hidden" {...register('parent_goal_id')} />
          )}

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <SheetFooter className="px-0">
            <Button
              type="submit"
              disabled={submitting}
              data-testid="goal-submit"
            >
              {submitting ? 'Saving…' : 'Save goal'}
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
