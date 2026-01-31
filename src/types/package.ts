/**
 * ParameterItem - A single test/parameter within a category
 */
export interface ParameterItem {
  name: string;
  description?: string;
}

/**
 * ParameterCategory - A category of parameters with items
 */
export interface ParameterCategory {
  category: string;
  count: number;
  items: ParameterItem[];
}

/**
 * FAQ - Frequently asked question and answer
 */
export interface FAQ {
  question: string;
  answer: string;
}

/**
 * PackagePublic type - represents a package from the public.packages table.
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
  // Pricing
  mrp: number | null;
  price: number | null;
  discount_percent: number | null;
  // Snapshot info
  reports_within_hours: number | null;
  tests_included: number | null;
  requisites: string | null;
  home_collection_minutes: number | null;
  // Content
  highlights: string | null;
  description: string | null;
  // Structured data (JSON)
  parameters: ParameterCategory[] | null;
  faqs: FAQ[] | null;
}

/**
 * PackageListItem - Subset of PackagePublic for listing views
 * Only includes fields needed for cards/previews
 */
export interface PackageListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  is_featured: boolean;
  sort_order: number | null;
  mrp: number | null;
  price: number | null;
  discount_percent: number | null;
  tests_included: number | null;
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

/**
 * Type guard to validate PackageListItem data from database
 */
export function isValidPackageListItem(data: unknown): data is PackageListItem {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.is_featured === 'boolean'
  );
}
