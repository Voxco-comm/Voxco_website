-- Add company_name column to signup_requests table
ALTER TABLE signup_requests
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add company_name column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS company_name TEXT;
