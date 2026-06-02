-- Fix "permission denied for table countries" when admins add countries from the dashboard.
-- RLS policies alone are not enough: the authenticated role needs table-level GRANTs.

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Public read (number search, dropdowns)
DROP POLICY IF EXISTS "Anyone can view countries" ON public.countries;
CREATE POLICY "Anyone can view countries" ON public.countries
  FOR SELECT
  USING (true);

-- Admin manage (split by command so INSERT has explicit WITH CHECK)
DROP POLICY IF EXISTS "Admins can manage countries" ON public.countries;

DROP POLICY IF EXISTS "Admins can insert countries" ON public.countries;
CREATE POLICY "Admins can insert countries" ON public.countries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
  );

DROP POLICY IF EXISTS "Admins can update countries" ON public.countries;
CREATE POLICY "Admins can update countries" ON public.countries
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
  );

DROP POLICY IF EXISTS "Admins can delete countries" ON public.countries;
CREATE POLICY "Admins can delete countries" ON public.countries
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
  );

-- Table privileges (RLS still applies)
GRANT SELECT ON public.countries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT ALL ON public.countries TO service_role;
