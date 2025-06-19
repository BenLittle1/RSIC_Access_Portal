-- Migration script to add requester_email field to guests table
-- Run this in your Supabase SQL editor

-- Add requester_email column to the guests table
ALTER TABLE public.guests 
ADD COLUMN requester_email text;

-- Optional: Add a comment to document the field
COMMENT ON COLUMN public.guests.requester_email IS 'Email address of the person requesting guest access';

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'guests' 
AND table_schema = 'public'
ORDER BY ordinal_position; 