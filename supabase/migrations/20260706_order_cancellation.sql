-- Allow customers to cancel their own orders and custom number requests.
-- 1. Add 'cancelled' as a valid status on both tables.
-- 2. Add customer UPDATE RLS policies so customers can cancel (and edit) their own rows.

-- =============================================
-- 1. STATUS CONSTRAINTS
-- =============================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status::text = ANY (ARRAY[
    'pending'::character varying,
    'documentation_review'::character varying,
    'granted'::character varying,
    'rejected'::character varying,
    'cancelled'::character varying
  ]::text[]));

ALTER TABLE public.custom_number_requests DROP CONSTRAINT IF EXISTS custom_number_requests_status_check;
ALTER TABLE public.custom_number_requests ADD CONSTRAINT custom_number_requests_status_check
  CHECK (status::text = ANY (ARRAY[
    'pending'::character varying,
    'approved'::character varying,
    'rejected'::character varying,
    'cancelled'::character varying
  ]::text[]));

-- =============================================
-- 2. CUSTOMER UPDATE POLICIES
-- =============================================
-- Customers can update (edit quantity / cancel) their own orders.
DROP POLICY IF EXISTS "Customers can update own orders" ON public.orders;
CREATE POLICY "Customers can update own orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = orders.customer_id
      AND customers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = orders.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Customers can update (cancel) their own custom number requests.
DROP POLICY IF EXISTS "Customers can update own custom number requests" ON public.custom_number_requests;
CREATE POLICY "Customers can update own custom number requests"
  ON public.custom_number_requests FOR UPDATE
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );
