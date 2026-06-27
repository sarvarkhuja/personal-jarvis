'use client';

import * as React from 'react';
import { uploadProgressPhoto } from '@/lib/actions/progress-photos';
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
import type { ProgressPhotoPose } from '@/types';

const POSE_OPTIONS: { value: ProgressPhotoPose; label: string }[] = [
  { value: 'front_relaxed', label: 'Front (relaxed)' },
  { value: 'front_flexed', label: 'Front (flexed)' },
  { value: 'side', label: 'Side' },
  { value: 'back_relaxed', label: 'Back (relaxed)' },
  { value: 'back_flexed', label: 'Back (flexed)' },
];

export function ProgressPhotoUploadSheet({ triggerLabel = 'Upload photo' }: { triggerLabel?: string }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(formData: FormData) {
    setServerError(null);
    setSubmitting(true);
    try {
      await uploadProgressPhoto(formData);
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="default" size="sm">{triggerLabel}</Button>} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Upload progress photo</SheetTitle>
          <SheetDescription>JPEG / PNG / WebP / HEIC. Max 10 MB.</SheetDescription>
        </SheetHeader>

        <form action={handleSubmit} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="photo-date">Date</Label>
            <Input id="photo-date" name="date" type="date" defaultValue={today} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="photo-pose">Pose</Label>
            <select
              id="photo-pose"
              name="pose"
              defaultValue="front_relaxed"
              required
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {POSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="photo-file">Image</Label>
            <Input
              id="photo-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              required
            />
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Upload'}
            </Button>
            <SheetClose render={<Button type="button" variant="ghost" />}>Cancel</SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
