-- Fix search_numbers: when "SMS only", "Voice only", "Inbound only", or "Outbound only"
-- is selected, return only exact matches (exclude numbers with "Both").
-- Previously "only" included "Both"; "only" should mean exclusive.

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
        -- SMS/Voice: exact match only; "SMS only" / "Voice only" must not include "Both"
        AND (p_sms_capability IS NULL OR n.sms_capability = p_sms_capability)
        -- Direction: exact match only; "Inbound only" / "Outbound only" must not include "Both"
        AND (p_direction IS NULL OR n.direction = p_direction)
        AND (n.is_available = true OR n.is_reserved = true)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
