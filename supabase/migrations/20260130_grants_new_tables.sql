-- Ensure all new tables and objects are accessible to authenticated users and service role.
-- Run this after other 20260130 migrations. Idempotent.

-- Schema usage (if not already granted)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;

-- custom_number_requests (new table)
GRANT SELECT, INSERT, UPDATE ON public.custom_number_requests TO authenticated;
GRANT ALL ON public.custom_number_requests TO service_role;

-- Sequences used by new tables (for INSERT default uuid)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- orders: new columns (admin_request_changes, admin_request_changes_at) are part of existing table;
-- no extra grants needed if orders already has SELECT/UPDATE for authenticated.
-- Ensure authenticated can update orders (admin updates status)
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
