-- =============================================
-- FIX TABLE PERMISSIONS FOR SUPABASE
-- Run this in the Supabase SQL Editor to fix permission issues
-- =============================================

-- =============================================
-- UPDATE NOTIFICATION TYPE CONSTRAINT
-- Add new notification types for order notifications
-- =============================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'order_status', 
    'draft_reminder', 
    'admin_action', 
    'system', 
    'signup_approved', 
    'signup_rejected',
    'new_order',
    'order_approved',
    'order_rejected'
  ));

-- Grant permissions for draft_orders table
GRANT ALL ON public.draft_orders TO authenticated;
GRANT ALL ON public.draft_orders TO service_role;

-- Grant permissions for number_requirements table
GRANT ALL ON public.number_requirements TO authenticated;
GRANT ALL ON public.number_requirements TO service_role;
GRANT SELECT ON public.number_requirements TO anon;

-- Grant permissions for notifications table
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;

DROP POLICY IF EXISTS "Users can view their own draft orders" ON public.draft_orders;
DROP POLICY IF EXISTS "Users can insert their own draft orders" ON public.draft_orders;
DROP POLICY IF EXISTS "Users can update their own draft orders" ON public.draft_orders;
DROP POLICY IF EXISTS "Users can delete their own draft orders" ON public.draft_orders;

DROP POLICY IF EXISTS "Anyone can view number requirements" ON public.number_requirements;
DROP POLICY IF EXISTS "Admins can manage number requirements" ON public.number_requirements;

-- Recreate RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can insert notifications for any user" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Recreate RLS policies for draft_orders
CREATE POLICY "Users can view their own draft orders" ON public.draft_orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own draft orders" ON public.draft_orders
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own draft orders" ON public.draft_orders
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own draft orders" ON public.draft_orders
  FOR DELETE USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Recreate RLS policies for number_requirements
CREATE POLICY "Anyone can view number requirements" ON public.number_requirements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage number requirements" ON public.number_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- ENABLE REALTIME FOR NOTIFICATIONS
-- =============================================
-- Add notifications table to realtime publication for real-time updates
DO $$
BEGIN
  -- Check if the publication exists and add the table
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Try to add the table to the publication
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
      RAISE NOTICE 'Added notifications to supabase_realtime publication';
    EXCEPTION 
      WHEN duplicate_object THEN
        RAISE NOTICE 'notifications table already in supabase_realtime publication';
      WHEN others THEN
        RAISE NOTICE 'Could not add notifications to realtime: %', SQLERRM;
    END;
  END IF;
END $$;

-- =============================================
-- VERIFY PERMISSIONS
-- =============================================
-- Check that tables have proper grants
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('notifications', 'draft_orders', 'number_requirements');

