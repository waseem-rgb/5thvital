-- Atomic booking creation: insert booking + items in a single transaction
-- Uses SECURITY DEFINER to bypass RLS (the function validates auth internally)
-- This eliminates the RLS sub-select timing issue that caused booking_items failures

CREATE OR REPLACE FUNCTION public.create_booking_with_items(
    p_user_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_age INT DEFAULT NULL,
    p_customer_gender TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_preferred_date DATE DEFAULT NULL,
    p_preferred_time TIME DEFAULT NULL,
    p_total_amount NUMERIC DEFAULT 0,
    p_discount_percentage NUMERIC DEFAULT 0,
    p_discount_amount NUMERIC DEFAULT 0,
    p_final_amount NUMERIC DEFAULT 0,
    p_coupon_code TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_custom_booking_id TEXT;
    v_item JSONB;
    v_caller_id UUID;
BEGIN
    -- Verify caller identity: if p_user_id is provided, it must match auth.uid()
    v_caller_id := auth.uid();
    IF p_user_id IS NOT NULL AND v_caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Authentication required');
    END IF;
    IF p_user_id IS NOT NULL AND v_caller_id != p_user_id THEN
        RETURN json_build_object('success', false, 'error', 'User ID mismatch');
    END IF;

    -- Validate required fields
    IF p_customer_name IS NULL OR p_customer_phone IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Customer name and phone are required');
    END IF;
    IF jsonb_array_length(p_items) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'At least one item is required');
    END IF;

    -- Step 1: Insert booking
    INSERT INTO public.bookings (
        user_id, customer_name, customer_phone, customer_email,
        customer_age, customer_gender, address,
        preferred_date, preferred_time,
        total_amount, discount_percentage, discount_amount,
        final_amount, coupon_code, notes
    ) VALUES (
        p_user_id, p_customer_name, p_customer_phone, p_customer_email,
        p_customer_age, p_customer_gender, p_address,
        p_preferred_date, p_preferred_time,
        p_total_amount, p_discount_percentage, p_discount_amount,
        p_final_amount, p_coupon_code, p_notes
    )
    RETURNING id, custom_booking_id INTO v_booking_id, v_custom_booking_id;

    -- Step 2: Insert all booking items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.booking_items (
            booking_id, item_type, item_id, item_name,
            quantity, unit_price, total_price
        ) VALUES (
            v_booking_id,
            COALESCE(v_item->>'item_type', 'test'),
            v_item->>'item_id',
            v_item->>'item_name',
            COALESCE((v_item->>'quantity')::int, 1),
            (v_item->>'unit_price')::numeric,
            (v_item->>'total_price')::numeric
        );
    END LOOP;

    -- Both succeeded (if anything above fails, the whole transaction rolls back)
    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'custom_booking_id', v_custom_booking_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Transaction auto-rolls back, return error details
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'code', SQLSTATE
    );
END;
$$;

-- Grant execute to both authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.create_booking_with_items TO authenticated, anon;

-- Also add DELETE policy on bookings for authenticated users (for rollback cleanup)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bookings'
        AND policyname = 'bookings_delete_auth'
    ) THEN
        CREATE POLICY "bookings_delete_auth"
        ON public.bookings
        FOR DELETE
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END$$;
