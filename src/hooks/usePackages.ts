import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { PackagePublic } from '@/types/package';

interface UsePackagesResult {
  packages: PackagePublic[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch all published packages from public.packages table.
 * - Filters: status = 'published'
 * - Order: sort_order asc (nulls last)
 * - Featured packages are sorted first client-side
 * 
 * READ-ONLY: No inserts/updates/deletes
 */
export function usePackages(): UsePackagesResult {
  const [packages, setPackages] = useState<PackagePublic[]>([]);
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
      const { data, error: fetchError } = await supabase
        .from('packages')
        .select('id, slug, title, status, is_featured, sort_order')
        .eq('status', 'published')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (fetchError) {
        console.error('[usePackages] Fetch error:', fetchError);
        setError('Failed to load packages');
        setPackages([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log('[usePackages] No packages found');
        setPackages([]);
        return;
      }

      // Sort: featured first, then by sort_order
      const sortedPackages = [...data].sort((a, b) => {
        // Featured packages come first
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        
        // Then by sort_order (nulls last)
        const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });

      console.log('[usePackages] Loaded', sortedPackages.length, 'packages');
      setPackages(sortedPackages as PackagePublic[]);
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
 * Fetch a single package by slug from public.packages table.
 * - Filters: status = 'published' AND slug = provided slug
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
          .select('id, slug, title, status, is_featured, sort_order')
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No rows returned
            console.log('[usePackageBySlug] Package not found:', slug);
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

        console.log('[usePackageBySlug] Loaded package:', data.title);
        setPackageData(data as PackagePublic);
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
