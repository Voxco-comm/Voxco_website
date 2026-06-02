-- Flag orders placed below the number's MOQ (customer confirmed admin review)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS below_moq_at_order boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.below_moq_at_order IS 'True when customer placed order with quantity below MOQ and confirmed admin review';
