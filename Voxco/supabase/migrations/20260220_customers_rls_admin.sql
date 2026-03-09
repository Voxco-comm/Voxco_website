-- Allow admins to manage customers (update is_disabled, delete) for User management in Admin dashboard.
-- Customers can only read/update their own row.

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customers can view and update their own record (e.g. last_login_at, profile)
DROP POLICY IF EXISTS "Customers can view own record" ON public.customers;
CREATE POLICY "Customers can view own record" ON public.customers
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own record" ON public.customers;
CREATE POLICY "Customers can update own record" ON public.customers
  FOR UPDATE USING (user_id = auth.uid());

-- Admins can view and update any customer (for disable user)
DROP POLICY IF EXISTS "Admins can select customers" ON public.customers;
CREATE POLICY "Admins can select customers" ON public.customers
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true));

DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
CREATE POLICY "Admins can update customers" ON public.customers
  FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true));

DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true));

-- Admins can insert (e.g. when approving signup)
DROP POLICY IF EXISTS "Admins can insert customers" ON public.customers;
CREATE POLICY "Admins can insert customers" ON public.customers
  FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true));

-- Ensure authenticated role has table grants (RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
