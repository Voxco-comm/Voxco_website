-- Allow admins to insert orders (e.g. when fulfilling a custom number request for a customer).
-- Without this, admin insert fails with "new row violates row-level security policy for table orders".

-- Ensure RLS is enabled on orders (no-op if already enabled)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Admins can insert any order (e.g. creating an order on behalf of a customer after custom fulfillment)
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;
CREATE POLICY "Admins can insert orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
  );
