-- Supplier-side per-use fees (admin only); mirrors other_charges shape for customers

ALTER TABLE public.numbers
  ADD COLUMN IF NOT EXISTS supplier_other_charges jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.numbers.supplier_other_charges IS 'Supplier cost breakdown: inbound/outbound/SMS rates and other fees (admin only)';
