-- =====================================================
-- Voxco Database Migration
-- Run this SQL in Supabase Dashboard SQL Editor
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Supabase Auth
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- =====================================================
-- 2. COUNTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    country_code VARCHAR(10) NOT NULL UNIQUE,
    regulator VARCHAR(500),
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Prefix/area code information stored as JSONB
    -- Structure: {"prefixes": ["+1", "+44"], "area_codes": ["416", "647"]}
    prefix_area_code JSONB DEFAULT '{}'::jsonb,
    -- Metadata for tracking updates
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255), -- Can store admin user ID or system identifier
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for country code lookups
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(country_code);
-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_countries_requirements ON countries USING GIN (requirements);
CREATE INDEX IF NOT EXISTS idx_countries_prefix ON countries USING GIN (prefix_area_code);

-- =====================================================
-- 3. NUMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    number VARCHAR(50) NOT NULL UNIQUE, -- The actual phone number (e.g., +14161234567)
    number_type VARCHAR(50) NOT NULL CHECK (number_type IN ('Geographic', 'Mobile', 'Toll-Free')),
    sms_capability VARCHAR(20) NOT NULL CHECK (sms_capability IN ('SMS only', 'Voice only', 'Both')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('Inbound only', 'Outbound only', 'Both')),
    -- Pricing
    mrc DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Monthly Recurring Charge
    nrc DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Non-Recurring Charge
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    moq INTEGER NOT NULL DEFAULT 1, -- Minimum Order Quantity
    -- Additional data stored as JSONB
    other_charges JSONB DEFAULT '{}'::jsonb, -- For additional regulatory/activation fees
    features JSONB DEFAULT '{}'::jsonb, -- For features like call forwarding, API integration, etc.
    -- Availability and status
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_reserved BOOLEAN NOT NULL DEFAULT false, -- For pending orders
    reserved_until TIMESTAMPTZ, -- When reservation expires
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for numbers table
CREATE INDEX IF NOT EXISTS idx_numbers_country ON numbers(country_id);
CREATE INDEX IF NOT EXISTS idx_numbers_available ON numbers(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_numbers_type ON numbers(number_type);
CREATE INDEX IF NOT EXISTS idx_numbers_sms_capability ON numbers(sms_capability);
CREATE INDEX IF NOT EXISTS idx_numbers_direction ON numbers(direction);
CREATE INDEX IF NOT EXISTS idx_numbers_search ON numbers(country_id, number_type, sms_capability, direction, is_available);

-- =====================================================
-- 4. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    number_id UUID NOT NULL REFERENCES numbers(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'rejected')),
    -- Order details
    mrc_at_order DECIMAL(10, 2), -- Store pricing at time of order
    nrc_at_order DECIMAL(10, 2),
    currency_at_order VARCHAR(10),
    -- Uploaded documents - JSONB structure:
    -- {
    --   "documents": [
    --     {"requirement_key": "govt_id", "title": "Government ID", "file_path": "orders/uuid/...", "file_name": "id.pdf", "uploaded_at": "..."}
    --   ],
    --   "customer_type": "individual" | "business",
    --   "notes": "customer notes"
    -- }
    uploaded_documents JSONB DEFAULT '{}'::jsonb,
    -- Admin notes
    admin_notes TEXT,
    rejected_reason TEXT, -- If status is rejected
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    granted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ
);

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(number_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- =====================================================
-- 5. ADMIN USERS TABLE (for admin dashboard)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- References auth.users(id) from Supabase Auth
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'support')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- =====================================================
-- 6. AUDIT LOG TABLE (for tracking changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID, -- References admin_users(id) or customers(id)
    changed_by_type VARCHAR(20) CHECK (changed_by_type IN ('admin', 'customer', 'system')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);

-- =====================================================
-- 7. FUNCTIONS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_numbers_updated_at BEFORE UPDATE ON numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. FUNCTION FOR COUNTRIES REQUIREMENTS UPDATE
-- =====================================================
-- This function can be called by Edge Functions or cron jobs
-- to update country requirements

CREATE OR REPLACE FUNCTION update_country_requirements(
    p_country_id UUID,
    p_requirements JSONB,
    p_prefix_area_code JSONB DEFAULT NULL,
    p_updated_by VARCHAR(255) DEFAULT 'system'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_data JSONB;
BEGIN
    -- Get old data for audit log
    SELECT requirements INTO v_old_data FROM countries WHERE id = p_country_id;
    
    -- Update country requirements
    UPDATE countries
    SET 
        requirements = p_requirements,
        prefix_area_code = COALESCE(p_prefix_area_code, prefix_area_code),
        last_updated_at = NOW(),
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE id = p_country_id;
    
    -- Log the change
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by_type,
        changed_by
    ) VALUES (
        'countries',
        p_country_id,
        'UPDATE',
        jsonb_build_object('requirements', v_old_data),
        jsonb_build_object('requirements', p_requirements),
        'system',
        NULL
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. FUNCTION FOR ORDER STATUS UPDATES
-- =====================================================
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_status VARCHAR(20),
    p_admin_notes TEXT DEFAULT NULL,
    p_rejected_reason TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(20);
    v_number_id UUID;
BEGIN
    -- Get current status and number_id
    SELECT status, number_id INTO v_old_status, v_number_id
    FROM orders WHERE id = p_order_id;
    
    IF v_old_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update order status
    UPDATE orders
    SET 
        status = p_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        rejected_reason = COALESCE(p_rejected_reason, rejected_reason),
        granted_at = CASE WHEN p_status = 'granted' THEN NOW() ELSE granted_at END,
        rejected_at = CASE WHEN p_status = 'rejected' THEN NOW() ELSE rejected_at END,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- If order is granted, mark number as unavailable
    IF p_status = 'granted' THEN
        UPDATE numbers
        SET is_available = false,
            updated_at = NOW()
        WHERE id = v_number_id;
    END IF;
    
    -- If order is rejected and number was reserved, make it available again
    IF p_status = 'rejected' AND v_old_status = 'pending' THEN
        UPDATE numbers
        SET is_reserved = false,
            reserved_until = NULL,
            updated_at = NOW()
        WHERE id = v_number_id;
    END IF;
    
    -- Log the change
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by,
        changed_by_type
    ) VALUES (
        'orders',
        p_order_id,
        'UPDATE',
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', p_status, 'admin_notes', p_admin_notes),
        p_changed_by,
        'admin'
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. FUNCTION FOR RESERVING NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION reserve_number(
    p_number_id UUID,
    p_reservation_duration_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE numbers
    SET 
        is_reserved = true,
        reserved_until = NOW() + (p_reservation_duration_minutes || ' minutes')::INTERVAL,
        updated_at = NOW()
    WHERE id = p_number_id 
        AND is_available = true 
        AND is_reserved = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. FUNCTION TO RELEASE EXPIRED RESERVATIONS
-- =====================================================
-- This can be called by a cron job
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE numbers
    SET 
        is_reserved = false,
        reserved_until = NULL,
        updated_at = NOW()
    WHERE is_reserved = true 
        AND reserved_until < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Customers: Users can only see/update their own data
CREATE POLICY "Customers can view own data"
    ON customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Customers can update own data"
    ON customers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Customers can insert own data"
    ON customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Countries: Public read access (for number search)
CREATE POLICY "Anyone can view countries"
    ON countries FOR SELECT
    USING (true);

-- Numbers: Public read access for available numbers
CREATE POLICY "Anyone can view available numbers"
    ON numbers FOR SELECT
    USING (is_available = true OR is_reserved = true);

-- Orders: Users can only see their own orders
CREATE POLICY "Customers can view own orders"
    ON orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = orders.customer_id 
            AND customers.user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can create own orders"
    ON orders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = orders.customer_id 
            AND customers.user_id = auth.uid()
        )
    );

-- Admin users: Only admins can view
CREATE POLICY "Admins can view admin users"
    ON admin_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Audit logs: Only admins can view
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Admin policies for orders
CREATE POLICY "Admins can view all orders"
    ON orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can update orders"
    ON orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Admin policies for numbers
CREATE POLICY "Admins can view all numbers"
    ON numbers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can manage numbers"
    ON numbers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Admin policies for countries
CREATE POLICY "Admins can manage countries"
    ON countries FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Admin policies for customers (view only for support)
CREATE POLICY "Admins can view customers"
    ON customers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- =====================================================
-- 13. FUNCTION TO AUTO-CREATE CUSTOMER ON USER SIGNUP
-- =====================================================
-- This function can be called via a database trigger when a user signs up
-- Or called from your application after user registration

CREATE OR REPLACE FUNCTION create_customer_from_auth_user(
    p_user_id UUID,
    p_email TEXT,
    p_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    INSERT INTO customers (user_id, email, name)
    VALUES (p_user_id, p_email, COALESCE(p_name, split_part(p_email, '@', 1)))
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, customers.name),
        updated_at = NOW()
    RETURNING id INTO v_customer_id;
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. VIEWS FOR ADMIN DASHBOARD
-- =====================================================

-- View for order summary with customer and number details
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id as order_id,
    o.status,
    o.quantity,
    o.created_at as order_date,
    o.granted_at,
    o.rejected_at,
    c.id as customer_id,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    n.id as number_id,
    n.number as phone_number,
    n.number_type,
    n.country_id,
    co.name as country_name,
    co.country_code,
    o.mrc_at_order,
    o.nrc_at_order,
    o.currency_at_order,
    o.admin_notes,
    o.rejected_reason
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN numbers n ON n.id = o.number_id
JOIN countries co ON co.id = n.country_id;

-- Note: available_numbers_summary view has been removed
-- Use numbers table directly with countries JOIN via FK relationship
-- Example: SELECT n.*, co.name as country_name, co.country_code 
--          FROM numbers n JOIN countries co ON co.id = n.country_id

-- View for customer order statistics
CREATE OR REPLACE VIEW customer_order_stats AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.email,
    COUNT(o.id) as total_orders,
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN o.status = 'granted' THEN 1 END) as granted_orders,
    COUNT(CASE WHEN o.status = 'rejected' THEN 1 END) as rejected_orders,
    SUM(CASE WHEN o.status = 'granted' THEN o.quantity ELSE 0 END) as total_numbers_granted,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.email;

-- =====================================================
-- 15. ADMIN HELPER FUNCTIONS
-- =====================================================

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_customers', (SELECT COUNT(*) FROM customers),
        'total_orders', (SELECT COUNT(*) FROM orders),
        'pending_orders', (SELECT COUNT(*) FROM orders WHERE status = 'pending'),
        'granted_orders', (SELECT COUNT(*) FROM orders WHERE status = 'granted'),
        'rejected_orders', (SELECT COUNT(*) FROM orders WHERE status = 'rejected'),
        'total_numbers', (SELECT COUNT(*) FROM numbers),
        'available_numbers', (SELECT COUNT(*) FROM numbers WHERE is_available = true),
        'reserved_numbers', (SELECT COUNT(*) FROM numbers WHERE is_reserved = true),
        'total_countries', (SELECT COUNT(*) FROM countries),
        'recent_orders_24h', (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '24 hours')
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search numbers with filters
CREATE OR REPLACE FUNCTION search_numbers(
    p_country_id UUID DEFAULT NULL,
    p_number_type VARCHAR(50) DEFAULT NULL,
    p_sms_capability VARCHAR(20) DEFAULT NULL,
    p_direction VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    number VARCHAR(50),
    number_type VARCHAR(50),
    sms_capability VARCHAR(20),
    direction VARCHAR(20),
    mrc DECIMAL(10,2),
    nrc DECIMAL(10,2),
    currency VARCHAR(10),
    moq INTEGER,
    country_name VARCHAR(255),
    country_code VARCHAR(10),
    is_available BOOLEAN,
    is_reserved BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.number,
        n.number_type,
        n.sms_capability,
        n.direction,
        n.mrc,
        n.nrc,
        n.currency,
        n.moq,
        co.name as country_name,
        co.country_code,
        n.is_available,
        n.is_reserved
    FROM numbers n
    JOIN countries co ON co.id = n.country_id
    WHERE 
        (p_country_id IS NULL OR n.country_id = p_country_id)
        AND (p_number_type IS NULL OR n.number_type = p_number_type)
        -- SMS/Voice capability: include "Both" when searching for specific option
        -- If searching for "SMS only" or "Voice only", also include numbers with "Both"
        AND (
            p_sms_capability IS NULL 
            OR n.sms_capability = p_sms_capability 
            OR (p_sms_capability != 'Both' AND n.sms_capability = 'Both')
        )
        -- Direction: include "Both" when searching for specific option
        -- If searching for "Inbound only" or "Outbound only", also include numbers with "Both"
        AND (
            p_direction IS NULL 
            OR n.direction = p_direction 
            OR (p_direction != 'Both' AND n.direction = 'Both')
        )
        AND (n.is_available = true OR n.is_reserved = true)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 16. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE customers IS 'Stores customer/user information for the platform';
COMMENT ON TABLE countries IS 'Stores country information and regulatory requirements. Requirements are updated regularly via cron jobs.';
COMMENT ON TABLE numbers IS 'Stores available phone numbers in inventory with pricing and capabilities';
COMMENT ON TABLE orders IS 'Stores customer orders for phone numbers';
COMMENT ON TABLE admin_users IS 'Stores admin user accounts for dashboard access';
COMMENT ON TABLE audit_logs IS 'Audit trail for all database changes';

COMMENT ON COLUMN countries.requirements IS 'JSONB structure: {number_allocation: {...}, sub_allocation: {...}, number_porting: {...}}';
COMMENT ON COLUMN countries.prefix_area_code IS 'JSONB structure: {prefixes: [...], area_codes: [...]}';
COMMENT ON COLUMN numbers.other_charges IS 'JSONB for additional regulatory or activation fees';
COMMENT ON COLUMN numbers.features IS 'JSONB for features like call forwarding, API integration, etc.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Set up Supabase Edge Function for updating country requirements
-- 2. Set up cron job (pg_cron extension) to call release_expired_reservations()
-- 3. Link customers.user_id to auth.users(id) if using Supabase Auth
-- 4. Adjust RLS policies based on your authentication setup
-- 5. Create admin users manually or via signup flow
-- =====================================================

