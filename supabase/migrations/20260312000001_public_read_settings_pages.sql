-- Allow anonymous/public users to read settings and pages
-- Required for customer-facing site to fetch hero config, promo banners, CMS pages

-- settings: public SELECT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'settings'
        AND policyname = 'settings_public_select'
    ) THEN
        CREATE POLICY settings_public_select ON public.settings
            FOR SELECT
            USING (true);
    END IF;
END$$;

-- pages: public SELECT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'pages'
        AND policyname = 'pages_public_select'
    ) THEN
        CREATE POLICY pages_public_select ON public.pages
            FOR SELECT
            USING (true);
    END IF;
END$$;
