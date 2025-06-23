-- 1. Create the profiles table
-- This table stores public user data and links to the auth.users table
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  username text,
  email text,
  organization text,
  authentication_status text DEFAULT 'Pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Function to handle new user registration
-- This function automatically creates a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username, email, organization)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.email,
    new.raw_user_meta_data->>'organization'
  );
  RETURN new;
END;
$$;

-- 4. Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Function to handle profile updates timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$;

-- 6. Trigger to update the updated_at timestamp
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. RLS Policy: Users can view and update their own profile
CREATE POLICY "Users can view and update their own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. RLS Policy: Allow authenticated users to read profiles for organization checks
-- This is needed for the guests table policies to work
CREATE POLICY "Allow profile lookup for organization checks"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- 10. Create the guests table
CREATE TABLE public.guests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  visit_date date NOT NULL,
  estimated_arrival time NOT NULL,
  arrival_status boolean DEFAULT false,
  floor_access text NOT NULL,
  inviter_id uuid NOT NULL,
  organization text NOT NULL,
  requester_email text,
  CONSTRAINT guests_pkey PRIMARY KEY (id),
  CONSTRAINT guests_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 11. Enable Row Level Security on the guests table
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policy: Users can view guests from their organization or Security can view all
CREATE POLICY "Users can view guests from their organization or Security can view all"
ON public.guests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (p.organization = guests.organization OR p.organization = 'Security')
  )
);

-- 13. RLS Policy: Users can add guests to their organization or Security can add to any
CREATE POLICY "Users can add guests to their organization or Security can add to any"
ON public.guests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (p.organization = guests.organization OR p.organization = 'Security')
  )
);

-- 14. RLS Policy: Users can update arrival status for guests they can view
CREATE POLICY "Users can update arrival status for guests they can view"
ON public.guests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (p.organization = guests.organization OR p.organization = 'Security')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (p.organization = guests.organization OR p.organization = 'Security')
  )
);

-- 15. Grant permissions on guests table
GRANT ALL ON public.guests TO anon, authenticated;

-- 16. Additional policies for Security organization administrative access
-- Allow Security users to manage all profiles
CREATE POLICY "Security users can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'organization' = 'Security'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'organization' = 'Security'
  )
);

-- 17. Allow Security users to manage all guests
CREATE POLICY "Security users can manage all guests"
ON public.guests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'organization' = 'Security'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'organization' = 'Security'
  )
); 