-- Add supplier rate columns to numbers (admin-only; customer sees mrc/nrc/currency only)

ALTER TABLE public.numbers
  ADD COLUMN IF NOT EXISTS supplier_mrc NUMERIC,
  ADD COLUMN IF NOT EXISTS supplier_nrc NUMERIC,
  ADD COLUMN IF NOT EXISTS supplier_currency VARCHAR(10);

COMMENT ON COLUMN public.numbers.supplier_mrc IS 'Supplier cost MRC (admin only)';
COMMENT ON COLUMN public.numbers.supplier_nrc IS 'Supplier cost NRC (admin only)';
COMMENT ON COLUMN public.numbers.supplier_currency IS 'Supplier currency (admin only)';
