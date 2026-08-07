-- VTripPlanner 7.13D
-- Public media bucket for authenticated travel-post uploads.
-- One user post supports exactly one small image or video at this stage.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'travel-post-media',
  'travel-post-media',
  TRUE,
  6291456,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'vtripplanner_travel_post_media_insert_own'
  ) THEN
    CREATE POLICY "vtripplanner_travel_post_media_insert_own"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'travel-post-media'
        AND (storage.foldername(name))[1] =
          (SELECT auth.jwt()->>'sub')
      );
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'vtripplanner_travel_post_media_select_own'
  ) THEN
    CREATE POLICY "vtripplanner_travel_post_media_select_own"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'travel-post-media'
        AND (storage.foldername(name))[1] =
          (SELECT auth.jwt()->>'sub')
      );
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'vtripplanner_travel_post_media_delete_own'
  ) THEN
    CREATE POLICY "vtripplanner_travel_post_media_delete_own"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'travel-post-media'
        AND (storage.foldername(name))[1] =
          (SELECT auth.jwt()->>'sub')
      );
  END IF;
END
$migration$;
