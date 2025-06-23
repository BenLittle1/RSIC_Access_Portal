-- Migration: Add Email Processing Support
-- Description: Adds tables and functions to support email-to-guest processing
-- Date: 2024-12-24

-- 1. Create the email_processed_guests table
CREATE TABLE public.email_processed_guests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender_email text NOT NULL,
  email_subject text,
  original_email_content text NOT NULL,
  extracted_data jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending',
  confidence_score decimal(3,2),
  ai_model_used text DEFAULT 'gemini-1.5-flash',
  processing_errors text[],
  guest_id uuid NULL, -- Links to guests table when approved and created
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamp with time zone NULL,
  approved_by uuid NULL,
  rejected_reason text NULL,
  CONSTRAINT email_processed_guests_pkey PRIMARY KEY (id),
  CONSTRAINT email_processed_guests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT email_processed_guests_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL,
  CONSTRAINT email_processed_guests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'approved', 'rejected', 'error'))
);

-- 2. Create indexes for performance
CREATE INDEX idx_email_processed_guests_user_id ON public.email_processed_guests(user_id);
CREATE INDEX idx_email_processed_guests_status ON public.email_processed_guests(processing_status);
CREATE INDEX idx_email_processed_guests_created_at ON public.email_processed_guests(created_at);
CREATE INDEX idx_email_processed_guests_sender_email ON public.email_processed_guests(sender_email);

-- 3. Enable Row Level Security
ALTER TABLE public.email_processed_guests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Users can view their own email processed guests
CREATE POLICY "Users can view their own email processed guests"
ON public.email_processed_guests
FOR SELECT
USING (auth.uid() = user_id);

-- 5. RLS Policy: Security can view all email processed guests
CREATE POLICY "Security can view all email processed guests"
ON public.email_processed_guests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.organization = 'Security'
  )
);

-- 6. RLS Policy: Users can insert their own email processed guests
CREATE POLICY "Users can insert their own email processed guests"
ON public.email_processed_guests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 7. RLS Policy: Users can update their own email processed guests
CREATE POLICY "Users can update their own email processed guests"
ON public.email_processed_guests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. RLS Policy: Security can update any email processed guests
CREATE POLICY "Security can update any email processed guests"
ON public.email_processed_guests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.organization = 'Security'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.organization = 'Security'
  )
);

-- 9. Function to automatically update processed_at timestamp
CREATE OR REPLACE FUNCTION public.handle_email_guest_processed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update processed_at when status changes from pending
  IF OLD.processing_status = 'pending' AND NEW.processing_status != 'pending' THEN
    NEW.processed_at = timezone('utc'::text, now());
    NEW.approved_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- 10. Trigger to update processed_at timestamp
CREATE TRIGGER handle_email_guest_processed_at
  BEFORE UPDATE ON public.email_processed_guests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_email_guest_processed();

-- 11. Create email processing statistics view
CREATE VIEW public.email_processing_stats AS
SELECT 
  user_id,
  COUNT(*) as total_emails_processed,
  COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE processing_status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE processing_status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE processing_status = 'error') as error_count,
  AVG(confidence_score) as avg_confidence_score,
  MAX(created_at) as last_email_processed
FROM public.email_processed_guests 
GROUP BY user_id;

-- 12. Enable RLS on the view
ALTER VIEW public.email_processing_stats SET (security_barrier = true);

-- 13. Grant permissions
GRANT ALL ON public.email_processed_guests TO anon, authenticated;
GRANT SELECT ON public.email_processing_stats TO anon, authenticated;

-- 14. Add email processing settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_processing_enabled boolean DEFAULT true,
ADD COLUMN max_daily_email_processing integer DEFAULT 10,
ADD COLUMN last_email_processed_at timestamp with time zone NULL;

-- 15. Create function to check email processing limits
CREATE OR REPLACE FUNCTION public.check_email_processing_limit(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.profiles%ROWTYPE;
  daily_count integer;
BEGIN
  -- Get user profile by email
  SELECT * INTO user_record 
  FROM public.profiles 
  WHERE email = user_email AND email_processing_enabled = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check daily limit
  SELECT COUNT(*) INTO daily_count
  FROM public.email_processed_guests
  WHERE user_id = user_record.user_id
  AND created_at >= CURRENT_DATE;
  
  RETURN daily_count < user_record.max_daily_email_processing;
END;
$$;

-- 16. Create function to log email processing attempt
CREATE OR REPLACE FUNCTION public.log_email_processing(
  user_email text,
  email_subject text,
  email_content text,
  extracted_data jsonb,
  confidence_score decimal,
  processing_errors text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.profiles%ROWTYPE;
  new_record_id uuid;
BEGIN
  -- Get user profile by email
  SELECT * INTO user_record 
  FROM public.profiles 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found for email: %', user_email;
  END IF;
  
  -- Insert new email processing record
  INSERT INTO public.email_processed_guests (
    user_id,
    sender_email,
    email_subject,
    original_email_content,
    extracted_data,
    confidence_score,
    processing_errors
  ) VALUES (
    user_record.user_id,
    user_email,
    email_subject,
    email_content,
    extracted_data,
    confidence_score,
    processing_errors
  ) RETURNING id INTO new_record_id;
  
  -- Update last processed timestamp
  UPDATE public.profiles 
  SET last_email_processed_at = NOW()
  WHERE user_id = user_record.user_id;
  
  RETURN new_record_id;
END;
$$; 