-- Clear the current inventory so a fresh list can be uploaded.
--
-- Run this in the Supabase SQL editor when you want to remove the existing
-- inventory. This uses the app's soft-delete (hides numbers from both the admin
-- inventory and the customer-facing listings) so existing orders that reference
-- a number are preserved.
--
-- After running this, use "Upload numbers" in the admin dashboard to import the
-- new inventory.

UPDATE public.numbers
SET is_available = false,
    is_reserved = false;

-- ---------------------------------------------------------------------------
-- OPTIONAL: hard delete instead of soft delete.
-- Only removes numbers that are NOT referenced by any order (a hard delete of a
-- referenced number would fail on the foreign key). Uncomment to use.
--
-- DELETE FROM public.numbers
-- WHERE id NOT IN (SELECT number_id FROM public.orders WHERE number_id IS NOT NULL);
