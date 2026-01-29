-- ============================================================================
-- SUPABASE ADMIN DASHBOARD SETUP - V1
-- Non-destructive migration script for admin-only tables
-- ============================================================================
-- This script is IDEMPOTENT and NON-DESTRUCTIVE:
-- - Uses CREATE IF NOT EXISTS for enums, tables
-- - Uses CREATE OR REPLACE for functions
-- - Checks policy existence before creating
-- - Checks trigger existence before creating
-- - Does NOT DROP any existing objects
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUMS
-- ============================================================================

-- Create admin_role enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE admin_role AS ENUM ('super_admin', 'editor', 'viewer');
    END IF;
END$$;

-- Create lead_status enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Converted', 'Closed');
    END IF;
END$$;

-- ============================================================================
-- SECTION 2: TABLES
-- ============================================================================

-- admins table: stores admin users with their roles
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role admin_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pages table: CMS pages for the admin dashboard
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content_json JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- media table: uploaded files/assets management
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- leads table: contact form submissions and lead management
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    message TEXT,
    source TEXT DEFAULT 'website',
    status lead_status NOT NULL DEFAULT 'New',
    notes TEXT,
    follow_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- settings table: key-value store for admin configuration
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON public.media(uploaded_at DESC);

-- ============================================================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS
-- ============================================================================

-- is_admin(): Returns true if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins
        WHERE id = auth.uid()
    );
$$;

-- current_admin_role(): Returns the role of the current admin user
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS admin_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.admins
    WHERE id = auth.uid()
    LIMIT 1;
$$;

-- can_edit(): Returns true if the current user can edit (super_admin or editor)
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'editor')
    );
$$;

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ADMINS TABLE POLICIES
-- ---------------------------------------------------------------------------

-- admins: SELECT - All admins can view the admins table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admins' 
        AND policyname = 'admins_select_policy_v1'
    ) THEN
        CREATE POLICY admins_select_policy_v1 ON public.admins
            FOR SELECT
            USING (public.is_admin());
    END IF;
END$$;

-- admins: INSERT - Only super_admin can add new admins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admins' 
        AND policyname = 'admins_insert_policy_v1'
    ) THEN
        CREATE POLICY admins_insert_policy_v1 ON public.admins
            FOR INSERT
            WITH CHECK (public.current_admin_role() = 'super_admin');
    END IF;
END$$;

-- admins: UPDATE - Only super_admin can update admins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admins' 
        AND policyname = 'admins_update_policy_v1'
    ) THEN
        CREATE POLICY admins_update_policy_v1 ON public.admins
            FOR UPDATE
            USING (public.current_admin_role() = 'super_admin')
            WITH CHECK (public.current_admin_role() = 'super_admin');
    END IF;
END$$;

-- admins: DELETE - Only super_admin can delete admins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admins' 
        AND policyname = 'admins_delete_policy_v1'
    ) THEN
        CREATE POLICY admins_delete_policy_v1 ON public.admins
            FOR DELETE
            USING (public.current_admin_role() = 'super_admin');
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- PAGES TABLE POLICIES
-- ---------------------------------------------------------------------------

-- pages: SELECT - All admins can view pages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pages' 
        AND policyname = 'pages_select_policy_v1'
    ) THEN
        CREATE POLICY pages_select_policy_v1 ON public.pages
            FOR SELECT
            USING (public.is_admin());
    END IF;
END$$;

-- pages: INSERT - Editors and super_admins can create pages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pages' 
        AND policyname = 'pages_insert_policy_v1'
    ) THEN
        CREATE POLICY pages_insert_policy_v1 ON public.pages
            FOR INSERT
            WITH CHECK (public.can_edit());
    END IF;
END$$;

-- pages: UPDATE - Editors and super_admins can update pages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pages' 
        AND policyname = 'pages_update_policy_v1'
    ) THEN
        CREATE POLICY pages_update_policy_v1 ON public.pages
            FOR UPDATE
            USING (public.can_edit())
            WITH CHECK (public.can_edit());
    END IF;
END$$;

-- pages: DELETE - Editors and super_admins can delete pages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pages' 
        AND policyname = 'pages_delete_policy_v1'
    ) THEN
        CREATE POLICY pages_delete_policy_v1 ON public.pages
            FOR DELETE
            USING (public.can_edit());
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- MEDIA TABLE POLICIES
-- ---------------------------------------------------------------------------

-- media: SELECT - All admins can view media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'media' 
        AND policyname = 'media_select_policy_v1'
    ) THEN
        CREATE POLICY media_select_policy_v1 ON public.media
            FOR SELECT
            USING (public.is_admin());
    END IF;
END$$;

-- media: INSERT - Editors and super_admins can upload media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'media' 
        AND policyname = 'media_insert_policy_v1'
    ) THEN
        CREATE POLICY media_insert_policy_v1 ON public.media
            FOR INSERT
            WITH CHECK (public.can_edit());
    END IF;
END$$;

-- media: UPDATE - Editors and super_admins can update media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'media' 
        AND policyname = 'media_update_policy_v1'
    ) THEN
        CREATE POLICY media_update_policy_v1 ON public.media
            FOR UPDATE
            USING (public.can_edit())
            WITH CHECK (public.can_edit());
    END IF;
END$$;

-- media: DELETE - Editors and super_admins can delete media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'media' 
        AND policyname = 'media_delete_policy_v1'
    ) THEN
        CREATE POLICY media_delete_policy_v1 ON public.media
            FOR DELETE
            USING (public.can_edit());
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- LEADS TABLE POLICIES
-- ---------------------------------------------------------------------------

-- leads: SELECT - All admins can view leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' 
        AND policyname = 'leads_select_policy_v1'
    ) THEN
        CREATE POLICY leads_select_policy_v1 ON public.leads
            FOR SELECT
            USING (public.is_admin());
    END IF;
END$$;

-- leads: INSERT - Allow anonymous insert (public contact form)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' 
        AND policyname = 'leads_insert_anon_policy_v1'
    ) THEN
        CREATE POLICY leads_insert_anon_policy_v1 ON public.leads
            FOR INSERT
            WITH CHECK (true);
    END IF;
END$$;

-- leads: UPDATE - Editors and super_admins can update leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' 
        AND policyname = 'leads_update_policy_v1'
    ) THEN
        CREATE POLICY leads_update_policy_v1 ON public.leads
            FOR UPDATE
            USING (public.can_edit())
            WITH CHECK (public.can_edit());
    END IF;
END$$;

-- leads: DELETE - Editors and super_admins can delete leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' 
        AND policyname = 'leads_delete_policy_v1'
    ) THEN
        CREATE POLICY leads_delete_policy_v1 ON public.leads
            FOR DELETE
            USING (public.can_edit());
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- SETTINGS TABLE POLICIES
-- ---------------------------------------------------------------------------

-- settings: SELECT - All admins can view settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'settings_select_policy_v1'
    ) THEN
        CREATE POLICY settings_select_policy_v1 ON public.settings
            FOR SELECT
            USING (public.is_admin());
    END IF;
END$$;

-- settings: INSERT - Only super_admin can create settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'settings_insert_policy_v1'
    ) THEN
        CREATE POLICY settings_insert_policy_v1 ON public.settings
            FOR INSERT
            WITH CHECK (public.current_admin_role() = 'super_admin');
    END IF;
END$$;

-- settings: UPDATE - Only super_admin can update settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'settings_update_policy_v1'
    ) THEN
        CREATE POLICY settings_update_policy_v1 ON public.settings
            FOR UPDATE
            USING (public.current_admin_role() = 'super_admin')
            WITH CHECK (public.current_admin_role() = 'super_admin');
    END IF;
END$$;

-- settings: DELETE - Only super_admin can delete settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'settings_delete_policy_v1'
    ) THEN
        CREATE POLICY settings_delete_policy_v1 ON public.settings
            FOR DELETE
            USING (public.current_admin_role() = 'super_admin');
    END IF;
END$$;

-- ============================================================================
-- SECTION 6: TRIGGERS FOR updated_at AND updated_by
-- ============================================================================

-- Trigger function to set updated_at and updated_by on UPDATE
CREATE OR REPLACE FUNCTION public.admin_set_updated_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;

-- Trigger for pages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_pages_set_updated_v1'
    ) THEN
        CREATE TRIGGER trg_pages_set_updated_v1
            BEFORE UPDATE ON public.pages
            FOR EACH ROW
            EXECUTE FUNCTION public.admin_set_updated_fields();
    END IF;
END$$;

-- Trigger for leads table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_leads_set_updated_v1'
    ) THEN
        CREATE TRIGGER trg_leads_set_updated_v1
            BEFORE UPDATE ON public.leads
            FOR EACH ROW
            EXECUTE FUNCTION public.admin_set_updated_fields();
    END IF;
END$$;

-- Trigger for settings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_settings_set_updated_v1'
    ) THEN
        CREATE TRIGGER trg_settings_set_updated_v1
            BEFORE UPDATE ON public.settings
            FOR EACH ROW
            EXECUTE FUNCTION public.admin_set_updated_fields();
    END IF;
END$$;

-- ============================================================================
-- SECTION 7: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.admins IS 'Admin users for the dashboard with role-based access';
COMMENT ON TABLE public.pages IS 'CMS pages managed through the admin dashboard';
COMMENT ON TABLE public.media IS 'Uploaded media files and assets';
COMMENT ON TABLE public.leads IS 'Contact form submissions and lead tracking';
COMMENT ON TABLE public.settings IS 'Key-value configuration settings for the admin dashboard';

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if current user is an admin';
COMMENT ON FUNCTION public.current_admin_role() IS 'Returns the admin role of the current user';
COMMENT ON FUNCTION public.can_edit() IS 'Returns true if current user has edit permissions (super_admin or editor)';

-- ============================================================================
-- BOOTSTRAP FIRST SUPER ADMIN (RUN SEPARATELY AFTER CREATING AUTH USER)
-- ============================================================================
-- After creating a user in Supabase Auth, run the following to make them super_admin:
--
-- INSERT INTO public.admins (id, email, role)
-- SELECT id, email, 'super_admin'::admin_role
-- FROM auth.users
-- WHERE email = 'your-admin-email@example.com';
--
-- ============================================================================
