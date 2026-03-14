import { useState, useEffect } from 'react';
import { fetchPackages, fetchPackageBySlug } from '@/lib/api';
import type { PackagePublic, PackageListItem, ParameterCategory, FAQ } from '@/types/package';

interface UsePackagesResult {
  packages: PackageListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePackages(): UsePackagesResult {
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doFetch = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchPackages();

    if (fetchError) {
      console.error('[usePackages] Fetch error:', fetchError);
      setError('Failed to load packages');
      setPackages([]);
    } else if (data?.packages) {
      setPackages(data.packages as unknown as PackageListItem[]);
    } else {
      setPackages([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    doFetch();
  }, []);

  return { packages, loading, error, refetch: doFetch };
}

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
    const doFetch = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setNotFound(false);

      const { data, error: fetchError } = await fetchPackageBySlug(slug);

      if (fetchError) {
        if (fetchError.includes('not found') || fetchError.includes('404')) {
          setNotFound(true);
        } else {
          setError('Failed to load package');
        }
        setPackageData(null);
      } else if (data?.package) {
        const pkg = data.package;
        const typedPackage: PackagePublic = {
          id: pkg.id,
          slug: pkg.slug,
          name: pkg.name,
          status: pkg.status,
          isFeatured: pkg.isFeatured,
          sortOrder: pkg.sortOrder,
          originalPrice: pkg.originalPrice,
          price: pkg.price,
          discountPercent: pkg.discountPercent,
          reportsWithinHours: pkg.reportsWithinHours,
          testsCount: pkg.testsCount,
          requisites: pkg.requisites,
          homeCollectionMinutes: pkg.homeCollectionMinutes,
          highlights: pkg.highlights,
          description: pkg.description,
          parameters: parseJsonArray<ParameterCategory>(pkg.parameters),
          faqs: parseJsonArray<FAQ>(pkg.faqs),
        };
        setPackageData(typedPackage);
      } else {
        setNotFound(true);
        setPackageData(null);
      }

      setLoading(false);
    };

    doFetch();
  }, [slug]);

  return { package_data: packageData, loading, error, notFound };
}
