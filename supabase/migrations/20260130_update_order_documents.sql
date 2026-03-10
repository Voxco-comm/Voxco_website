-- Function to update order documents JSONB field
-- This ensures all documents are properly saved
CREATE OR REPLACE FUNCTION update_order_documents(
    p_order_id UUID,
    p_uploaded_documents JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update the order with the provided documents
    UPDATE orders
    SET 
        uploaded_documents = p_uploaded_documents,
        admin_request_changes = NULL,
        admin_request_changes_at = NULL,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Return the updated documents
    SELECT uploaded_documents INTO v_result
    FROM orders
    WHERE id = p_order_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update order documents: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_order_documents(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_documents(UUID, JSONB) TO service_role;
