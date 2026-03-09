-- Custom number requests: clients request a number not in inventory.
-- Same info as admin "Add number to inventory"; admin can fulfill by adding to inventory.

CREATE TABLE IF NOT EXISTS public.custom_number_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  number_type VARCHAR(50) NOT NULL CHECK (number_type IN ('Geographic', 'Mobile', 'Toll-Free')),
  sms_capability VARCHAR(20) NOT NULL CHECK (sms_capability IN ('SMS only', 'Voice only', 'Both')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('Inbound only', 'Outbound only', 'Both')),
  mrc NUMERIC NOT NULL DEFAULT 0,
  nrc NUMERIC NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  moq INTEGER NOT NULL DEFAULT 1,
  specification TEXT,
  bill_pulse VARCHAR(50),
  requirements_text TEXT,
  other_charges JSONB DEFAULT '{}',
  features JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_number_requests_customer_id ON public.custom_number_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_custom_number_requests_status ON public.custom_number_requests(status);
CREATE INDEX IF NOT EXISTS idx_custom_number_requests_created_at ON public.custom_number_requests(created_at DESC);

ALTER TABLE public.custom_number_requests ENABLE ROW LEVEL SECURITY;

-- Customers can insert their own requests
CREATE POLICY "Customers can insert own custom number requests"
  ON public.custom_number_requests FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Customers can select their own; admins can select all
CREATE POLICY "Customers can select own custom number requests"
  ON public.custom_number_requests FOR SELECT
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
  );

-- Only admins can update (e.g. approve, reject, add notes)
CREATE POLICY "Admins can update custom number requests"
  ON public.custom_number_requests FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true));

GRANT ALL ON public.custom_number_requests TO authenticated;
GRANT ALL ON public.custom_number_requests TO service_role;

COMMENT ON TABLE public.custom_number_requests IS 'Client requests for a custom number not in inventory; admin can fulfill by adding to inventory';
