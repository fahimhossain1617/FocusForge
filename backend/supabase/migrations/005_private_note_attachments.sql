-- Keep the backend migration directory in sync with the deployable schema.
UPDATE storage.buckets SET public = false WHERE id = 'note-attachments';
DROP POLICY IF EXISTS "Allow public read access to note attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read their own note attachments" ON storage.objects;
CREATE POLICY "Allow authenticated users to read their own note attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Allow users to update their own note attachments" ON storage.objects;
CREATE POLICY "Allow users to update their own note attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
