-- Migration: Fix guests-profiles relationship
-- This migration adds a proper foreign key relationship between guests and profiles

-- 1. Add a new column to guests table that references profiles.user_id
-- Note: We'll keep inviter_id pointing to auth.users, but add a helper relationship

-- 2. Create a view that makes the relationship clearer
CREATE OR REPLACE VIEW guests_with_profiles AS
SELECT 
  g.*,
  p.full_name as inviter_name,
  p.email as inviter_email,
  p.organization as inviter_organization
FROM guests g
LEFT JOIN profiles p ON g.inviter_id = p.user_id;

-- 3. Grant permissions on the view
GRANT SELECT ON guests_with_profiles TO anon, authenticated;

-- 4. Enable RLS on the view (inherit from guests table)
ALTER VIEW guests_with_profiles SET (security_invoker = true);

-- Alternative approach: Add computed column to make PostgREST understand the relationship
-- This tells PostgREST how to join guests with profiles
COMMENT ON COLUMN guests.inviter_id IS 'References auth.users.id, which maps to profiles.user_id'; 