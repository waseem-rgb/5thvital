/**
 * PackagePublic type - represents a package from the public.packages table.
 * ONLY uses confirmed DB columns: id, slug, title, status, is_featured, sort_order
 * 
 * This is a READ-ONLY type for the public site.
 */
export interface PackagePublic {
  id: string;
  slug: string;
  title: string;
  status: string;
  is_featured: boolean;
  sort_order: number | null;
}

/**
 * Type guard to validate PackagePublic data from database
 */
export function isValidPackage(data: unknown): data is PackagePublic {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.is_featured === 'boolean' &&
    (obj.sort_order === null || typeof obj.sort_order === 'number')
  );
}
