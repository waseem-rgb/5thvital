-- Add SEO fields to pages table for customer-facing CMS pages
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- Add a status column so admins can draft pages before publishing
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
