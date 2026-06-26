'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateMedicationSchema,
  type CreateMedicationInput,
} from '@/lib/schemas/medications';
import { createMedication } from '@/lib/actions/medications';
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

export function AddMedicationSheet() {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, handleSubmit, reset, formState } =
    useForm<CreateMedicationInput>({
      resolver: zodResolver(CreateMedicationSchema),
      defaultValues: { name: '' },
    });

  async function onSubmit(values: CreateMedicationInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await createMedication({ name: values.name });
      reset();
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button data-testid="add-medication-trigger">Add pill</Button>}
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add pill</SheetTitle>
          <SheetDescription>Just a name — check it off each day.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="med-name">Name</Label>
            <Input
              id="med-name"
              data-testid="med-name"
              placeholder="Vitamin D"
              {...register('name')}
            />
            {formState.errors.name && (
              <p className="text-xs text-destructive">
                {formState.errors.name.message}
              </p>
            )}
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting} data-testid="medication-submit">
              {submitting ? 'Saving…' : 'Save pill'}
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
