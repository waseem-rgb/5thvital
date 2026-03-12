-- Create coupons table if not already created by admin panel migration
CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    type text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'flat')),
    value numeric NOT NULL CHECK (value > 0),
    active boolean NOT NULL DEFAULT true,
    starts_at timestamptz,
    ends_at timestamptz,
    min_order_amount numeric DEFAULT 0,
    max_discount numeric,
    max_uses int,
    used_count int NOT NULL DEFAULT 0,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_percent_value CHECK (type != 'percent' OR (value > 0 AND value <= 100)),
    CONSTRAINT valid_dates CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active coupons (for validation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'coupons'
        AND policyname = 'Anyone can validate coupons'
    ) THEN
        CREATE POLICY "Anyone can validate coupons"
            ON public.coupons
            FOR SELECT
            TO anon, authenticated
            USING (active = true);
    END IF;
END$$;

-- Create the validate_coupon function if not exists
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_code text,
    p_subtotal numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon record;
    v_discount numeric;
    v_final_amount numeric;
    v_now timestamptz := now();
BEGIN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = UPPER(p_code)
    AND active = true;

    IF v_coupon IS NULL THEN
        RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
    END IF;

    IF v_coupon.starts_at IS NOT NULL AND v_now < v_coupon.starts_at THEN
        RETURN json_build_object('valid', false, 'error', 'Coupon is not yet active');
    END IF;

    IF v_coupon.ends_at IS NOT NULL AND v_now > v_coupon.ends_at THEN
        RETURN json_build_object('valid', false, 'error', 'Coupon has expired');
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
        RETURN json_build_object('valid', false, 'error', 'Coupon usage limit reached');
    END IF;

    IF v_coupon.min_order_amount IS NOT NULL AND p_subtotal < v_coupon.min_order_amount THEN
        RETURN json_build_object('valid', false, 'error', format('Minimum order amount is ₹%s', v_coupon.min_order_amount));
    END IF;

    IF v_coupon.type = 'percent' THEN
        v_discount := p_subtotal * (v_coupon.value / 100);
        IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
            v_discount := v_coupon.max_discount;
        END IF;
    ELSE
        v_discount := v_coupon.value;
    END IF;

    IF v_discount > p_subtotal THEN
        v_discount := p_subtotal;
    END IF;

    v_final_amount := p_subtotal - v_discount;

    RETURN json_build_object(
        'valid', true,
        'code', v_coupon.code,
        'type', v_coupon.type,
        'value', v_coupon.value,
        'discount', v_discount,
        'subtotal', p_subtotal,
        'final_amount', v_final_amount,
        'description', COALESCE(v_coupon.description,
            CASE
                WHEN v_coupon.type = 'percent' THEN format('%s%% off', v_coupon.value)
                ELSE format('₹%s off', v_coupon.value)
            END
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon TO anon, authenticated;

-- Seed WELCOME35 coupon: 35% off, no minimum, max ₹2000 discount
INSERT INTO public.coupons (code, type, value, active, description, min_order_amount, max_discount)
VALUES ('WELCOME35', 'percent', 35, true, '35% off welcome discount for new customers', 0, 2000)
ON CONFLICT (code) DO NOTHING;
