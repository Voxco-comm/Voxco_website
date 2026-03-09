-- Fix RLS policy for signup_requests table
-- This migration ensures anonymous users can create signup requests

-- =============================================
-- COMPLETELY RESET SIGNUP_REQUESTS TABLE POLICIES
-- =============================================

-- Drop ALL existing policies on signup_requests
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'signup_requests' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.signup_requests', pol.policyname);
    END LOOP;
END $$;

-- Make sure RLS is enabled
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to roles
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant ALL permissions on the table
GRANT ALL ON public.signup_requests TO anon;
GRANT ALL ON public.signup_requests TO authenticated;
GRANT ALL ON public.signup_requests TO service_role;

-- Grant usage on the sequence (if using serial/bigserial IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- CREATE NEW POLICIES
-- =============================================

-- Policy 1: ANYONE can INSERT (most important for signup)
-- This allows both anonymous and authenticated users to create signup requests
CREATE POLICY "allow_insert_signup_requests" ON public.signup_requests
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Only admins can SELECT all signup requests
CREATE POLICY "admins_select_signup_requests" ON public.signup_requests
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy 3: Only admins can UPDATE signup requests
CREATE POLICY "admins_update_signup_requests" ON public.signup_requests
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy 4: Only admins can DELETE signup requests
CREATE POLICY "admins_delete_signup_requests" ON public.signup_requests
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- ALTERNATIVE: DISABLE RLS FOR THIS TABLE
-- =============================================
-- If the above policies still don't work, uncomment the line below
-- to completely disable RLS for signup_requests table.
-- This is safe because this table only contains signup requests,
-- not sensitive user data.

-- ALTER TABLE public.signup_requests DISABLE ROW LEVEL SECURITY;


