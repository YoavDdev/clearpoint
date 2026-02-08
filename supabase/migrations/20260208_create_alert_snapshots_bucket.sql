-- Create storage bucket for alert snapshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'alert-snapshots',
  'alert-snapshots',
  true,
  1048576,  -- 1MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their own snapshots
CREATE POLICY "Users can view own alert snapshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'alert-snapshots'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM auth.users WHERE id = auth.uid()
  )
);

-- Allow service role to upload (via API ingest)
CREATE POLICY "Service role can upload alert snapshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'alert-snapshots'
);

-- Allow public read access (snapshots are served via public URL)
CREATE POLICY "Public read access for alert snapshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'alert-snapshots'
);
