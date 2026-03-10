-- admin_settings table and get_notification_email RPC for email notifications.
-- Admin dashboard stores notification_email here; send-email API uses the RPC to read it (bypasses RLS).

CREATE TABLE IF NOT EXISTS public.admin_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.admin_settings IS 'Admin-only settings (e.g. notification_email for new order/signup emails)';

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can manage admin_settings"
  ON public.admin_settings FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true));

-- Service role and authenticated (for RPC caller context) need access; RPC uses SECURITY DEFINER
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

-- RPC used by send-email API to get notification email (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_notification_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  out_val TEXT;
BEGIN
  SELECT setting_value INTO out_val
  FROM public.admin_settings
  WHERE setting_key = 'notification_email'
  LIMIT 1;
  RETURN NULLIF(TRIM(COALESCE(out_val, '')), '');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notification_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_email() TO service_role;

COMMENT ON FUNCTION public.get_notification_email() IS 'Returns admin notification email for new order/signup alerts; used by send-email API';
