-- Create the private storage bucket for progress photos and lock it down with RLS.
-- Path convention: <user_id>/<photo_id>.<ext> — we authorize by checking the first folder segment.

INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users select own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users insert own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own progress photos" ON storage.objects;

CREATE POLICY "Users select own progress photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users insert own progress photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own progress photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own progress photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
