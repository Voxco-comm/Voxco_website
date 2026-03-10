-- Fix: Add missing policy for admins to insert customer documents
-- This policy was missing, causing document saves to fail when admins approve orders

-- Drop if exists to avoid errors on re-run
DROP POLICY IF EXISTS "Admins can insert customer documents" ON public.customer_documents;

-- Policy: Admins can insert customer documents (when approving orders)
CREATE POLICY "Admins can insert customer documents" ON public.customer_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

