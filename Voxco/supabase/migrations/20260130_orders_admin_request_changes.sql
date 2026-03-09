-- Add columns for admin to request client to upload/change requirements.
-- Non-mandatory uploads stay; admins can request missing items from the list.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS admin_request_changes TEXT,
ADD COLUMN IF NOT EXISTS admin_request_changes_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.admin_request_changes IS 'Message from admin requesting client to upload or update specific requirements/documents';
COMMENT ON COLUMN public.orders.admin_request_changes_at IS 'When the admin requested changes';
