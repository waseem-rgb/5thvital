import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { PackagePublic, PackageListItem, ParameterCategory, FAQ } from '@/types/package';

interface UsePackagesResult {
  packages: PackageListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Columns selected for package listing (cards/previews)
 */
const LIST_COLUMNS = `
  id, slug, title, status, is_featured, sort_order,
  mrp, price, discount_percent, tests_included
`;

/**
 * Columns selected for single package detail view
 */
const DETAIL_COLUMNS = `
  id, slug, title, status, is_featured, sort_order,
  mrp, price, discount_percent,
  reports_within_hours, tests_included, requisites, home_collection_minutes,
  highlights, description, parameters, faqs
`;

/**
 * Fetch all published packages from public.packages table.
 * 
 * Query:
 *   SELECT ... FROM packages
 *   WHERE status = 'published'
 *   ORDER BY is_featured DESC, sort_order ASC
 * 
 * - Featured packages appear first (is_featured DESC)
 * - Then sorted by sort_order (ASC, nulls last)
 * - No limit: shows all published packages
 * 
 * READ-ONLY: No inserts/updates/deletes
 */
export function usePackages(): UsePackagesResult {
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    if (!isSupabaseConfigured) {
      console.error('[usePackages] Supabase not configured');
      setError('Database not configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Database-level ordering: is_featured DESC, sort_order ASC
      const { data, error: fetchError } = await supabase
        .from('packages')
        .select(LIST_COLUMNS)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (fetchError) {
        console.error('[usePackages] Fetch error:', fetchError);
        setError('Failed to load packages');
        setPackages([]);
        return;
      }

      if (!data || data.length === 0) {
        if (import.meta.env.DEV) {
          console.log('[usePackages] No packages found');
        }
        setPackages([]);
        return;
      }

      if (import.meta.env.DEV) {
        console.log('[usePackages] Loaded', data.length, 'packages');
      }
      
      // Data is already sorted by DB: is_featured DESC, sort_order ASC
      setPackages(data as unknown as PackageListItem[]);
    } catch (err) {
      console.error('[usePackages] Unexpected error:', err);
      setError('Unexpected error loading packages');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return { packages, loading, error, refetch: fetchPackages };
}

/**
 * Parse JSON field safely to typed array
 */
function parseJsonArray<T>(data: unknown): T[] | null {
  if (!data) return null;
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Fetch a single package by slug from public.packages table.
 * 
 * Query:
 *   SELECT ... FROM packages
 *   WHERE slug = :slug AND status = 'published'
 *   LIMIT 1
 * 
 * - Returns full package data including parameters and FAQs
 * - Returns notFound if package doesn't exist or isn't published
 * 
 * READ-ONLY: No inserts/updates/deletes
 */
export function usePackageBySlug(slug: string | undefined): {
  package_data: PackagePublic | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
} {
  const [packageData, setPackageData] = useState<PackagePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPackage = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        console.error('[usePackageBySlug] Supabase not configured');
        setError('Database not configured');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const { data, error: fetchError } = await supabase
          .from('packages')
          .select(DETAIL_COLUMNS)
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No rows returned
            if (import.meta.env.DEV) {
              console.log('[usePackageBySlug] Package not found:', slug);
            }
            setNotFound(true);
            setPackageData(null);
          } else {
            console.error('[usePackageBySlug] Fetch error:', fetchError);
            setError('Failed to load package');
            setPackageData(null);
          }
          return;
        }

        if (!data) {
          setNotFound(true);
          setPackageData(null);
          return;
        }

        // Convert database row to typed PackagePublic
        const typedPackage: PackagePublic = {
          id: data.id,
          slug: data.slug,
          title: data.title,
          status: data.status,
          is_featured: data.is_featured,
          sort_order: data.sort_order,
          mrp: data.mrp,
          price: data.price,
          discount_percent: data.discount_percent,
          reports_within_hours: data.reports_within_hours,
          tests_included: data.tests_included,
          requisites: data.requisites,
          home_collection_minutes: data.home_collection_minutes,
          highlights: data.highlights,
          description: data.description,
          parameters: parseJsonArray<ParameterCategory>(data.parameters),
          faqs: parseJsonArray<FAQ>(data.faqs),
        };

        if (import.meta.env.DEV) {
          console.log('[usePackageBySlug] Loaded package:', typedPackage.title);
        }
        setPackageData(typedPackage);
      } catch (err) {
        console.error('[usePackageBySlug] Unexpected error:', err);
        setError('Unexpected error loading package');
        setPackageData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [slug]);

  return { package_data: packageData, loading, error, notFound };
}
