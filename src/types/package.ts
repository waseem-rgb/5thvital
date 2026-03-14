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
 * PackagePublic type - represents a package from the API.
 */
export interface PackagePublic {
  id: string;
  slug: string;
  name: string;
  status: string;
  isFeatured: boolean;
  sortOrder: number | null;
  // Pricing
  originalPrice: number | null;
  price: number | null;
  discountPercent: number | null;
  // Snapshot info
  reportsWithinHours: number | null;
  testsCount: number | null;
  requisites: string | null;
  homeCollectionMinutes: number | null;
  // Content
  highlights: string | null;
  description: string | null;
  // Structured data (JSON)
  parameters: ParameterCategory[] | null;
  faqs: FAQ[] | null;
}

/**
 * PackageListItem - Subset of PackagePublic for listing views
 */
export interface PackageListItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  isFeatured: boolean;
  sortOrder: number | null;
  originalPrice: number | null;
  price: number | null;
  discountPercent: number | null;
  testsCount: number | null;
}

/**
 * Type guard to validate PackagePublic data from API
 */
export function isValidPackage(data: unknown): data is PackagePublic {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.status === 'string'
  );
}

/**
 * Type guard to validate PackageListItem data from API
 */
export function isValidPackageListItem(data: unknown): data is PackageListItem {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.status === 'string'
  );
}
