-- Allow authenticated users (e.g. admin when fulfilling custom requests) to insert orders.
-- Customers insert via app flow; admin inserts when approving a custom number request.
GRANT INSERT ON public.orders TO authenticated;
