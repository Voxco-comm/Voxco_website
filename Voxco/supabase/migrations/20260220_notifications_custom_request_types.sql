-- Allow notification types for custom number request approved/rejected (customer notifications)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type::text = ANY (ARRAY[
    'order_status'::character varying,
    'draft_reminder'::character varying,
    'admin_action'::character varying,
    'system'::character varying,
    'signup_approved'::character varying,
    'signup_rejected'::character varying,
    'new_order'::character varying,
    'order_approved'::character varying,
    'order_rejected'::character varying,
    'custom_request_approved'::character varying,
    'custom_request_rejected'::character varying
  ]::text[]));
