-- Add number types: Non-Geographic, 2WV

-- numbers table: drop existing check and add new one
ALTER TABLE public.numbers DROP CONSTRAINT IF EXISTS numbers_number_type_check;
ALTER TABLE public.numbers ADD CONSTRAINT numbers_number_type_check
  CHECK (number_type IN ('Geographic', 'Mobile', 'Toll-Free', 'Non-Geographic', '2WV'));

-- custom_number_requests: drop and add (constraint name may vary)
ALTER TABLE public.custom_number_requests DROP CONSTRAINT IF EXISTS custom_number_requests_number_type_check;
ALTER TABLE public.custom_number_requests ADD CONSTRAINT custom_number_requests_number_type_check
  CHECK (number_type IN ('Geographic', 'Mobile', 'Toll-Free', 'Non-Geographic', '2WV'));
