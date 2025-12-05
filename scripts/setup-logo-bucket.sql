-- Script to create company-logos storage bucket
-- Run this in Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public Access for Logo"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload/update logos
CREATE POLICY IF NOT EXISTS "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY IF NOT EXISTS "Authenticated users can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Allow authenticated users to delete logos
CREATE POLICY IF NOT EXISTS "Authenticated users can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-logos');
