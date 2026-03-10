-- Migration to fix various issues
-- 1. Update order status check constraint to include 'documentation_review'
-- 2. Fix RLS policy for signup_requests table
-- 3. Add customer_documents table for persistent document storage

-- =============================================
-- 1. UPDATE ORDER STATUS CHECK CONSTRAINT
-- =============================================
-- Drop the existing constraint and add a new one with 'documentation_review' status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status::text = ANY (ARRAY[
    'pending'::character varying, 
    'documentation_review'::character varying,
    'granted'::character varying, 
    'rejected'::character varying
  ]::text[]));

-- =============================================
-- 2. FIX RLS POLICY FOR SIGNUP_REQUESTS TABLE
-- =============================================
-- First, create the signup_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.signup_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  message TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.admin_users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can create signup requests" ON public.signup_requests;
DROP POLICY IF EXISTS "Admins can view all signup requests" ON public.signup_requests;
DROP POLICY IF EXISTS "Admins can update signup requests" ON public.signup_requests;

-- Grant permissions
GRANT ALL ON public.signup_requests TO authenticated;
GRANT ALL ON public.signup_requests TO service_role;
GRANT INSERT ON public.signup_requests TO anon;

-- Policy: Anyone (including anonymous users) can create signup requests
CREATE POLICY "Anyone can create signup requests" ON public.signup_requests
  FOR INSERT WITH CHECK (true);

-- Policy: Admins can view all signup requests
CREATE POLICY "Admins can view all signup requests" ON public.signup_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Admins can update signup requests
CREATE POLICY "Admins can update signup requests" ON public.signup_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- 3. CREATE CUSTOMER_DOCUMENTS TABLE
-- =============================================
-- This table stores documents uploaded by customers that persist across orders
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL, -- e.g., 'id_document', 'proof_of_address', 'business_registration'
  title VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  file_size INTEGER,
  file_type VARCHAR,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Optional: for documents with expiry dates
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.admin_users(id),
  verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for customer_documents
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON public.customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_type ON public.customer_documents(document_type);

-- Enable RLS for customer_documents
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;

-- Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents" ON public.customer_documents
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own documents
CREATE POLICY "Users can insert their own documents" ON public.customer_documents
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their own documents" ON public.customer_documents
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own documents" ON public.customer_documents
  FOR DELETE USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view all customer documents
CREATE POLICY "Admins can view all customer documents" ON public.customer_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Admins can insert customer documents (when approving orders)
CREATE POLICY "Admins can insert customer documents" ON public.customer_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Admins can update all customer documents (for verification)
CREATE POLICY "Admins can update all customer documents" ON public.customer_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- 4. ADD uploaded_files COLUMN TO DRAFT_ORDERS
-- =============================================
-- Add column to store file references in draft orders
ALTER TABLE public.draft_orders 
ADD COLUMN IF NOT EXISTS uploaded_files JSONB DEFAULT '[]';

-- =============================================
-- 5. UPDATE NOTIFICATIONS TYPE CONSTRAINT
-- =============================================
-- Add new notification types
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
    'order_rejected'::character varying
  ]::text[]));


