/**
 * Cart utility functions for adding packages/tests from any page.
 * Uses localStorage to persist cart across pages and sessions.
 */

const CART_STORAGE_KEY = 'bookingCart';

/**
 * Cart item structure matching Booking.tsx TestItem interface
 */
export interface CartItem {
  id: string;
  test_name: string;
  test_code: string;
  body_system: string;
  customer_price: number;
  /** Original UUID for database insertion (without prefixes like 'pkg_') */
  original_id?: string;
  /** Item type: 'test' for individual tests, 'package' for health packages */
  item_type?: 'test' | 'package';
}

/**
 * Load cart items from localStorage
 */
export function loadCart(): CartItem[] {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return [];
    
    const parsed = JSON.parse(savedCart);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    
    // Filter out invalid items
    return parsed.filter((item: unknown): item is CartItem => {
      if (!item || typeof item !== 'object') return false;
      const obj = item as Record<string, unknown>;
      return (
        typeof obj.id === 'string' &&
        typeof obj.test_name === 'string' &&
        typeof obj.customer_price === 'number'
      );
    });
  } catch {
    return [];
  }
}

/**
 * Save cart items to localStorage
 */
export function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    if (import.meta.env.DEV) {
      console.log('[Cart] Saved', items.length, 'items to localStorage');
    }
  } catch (error) {
    console.error('[Cart] Error saving cart:', error);
  }
}

/**
 * Add a single item to the cart
 * Returns true if item was added, false if it already existed
 */
export function addToCart(item: CartItem): boolean {
  const currentCart = loadCart();
  const exists = currentCart.find(i => i.id === item.id);
  
  if (exists) {
    if (import.meta.env.DEV) {
      console.log('[Cart] Item already in cart:', item.test_name);
    }
    return false;
  }
  
  const newCart = [...currentCart, item];
  saveCart(newCart);
  
  if (import.meta.env.DEV) {
    console.log('[Cart] Added:', item.test_name, '| Total items:', newCart.length);
  }
  
  return true;
}

/**
 * Add a package to the cart (converts package data to cart item format)
 */
export function addPackageToCart(pkg: {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  tests_included?: number | null;
}): boolean {
  const cartItem: CartItem = {
    id: `pkg_${pkg.id}`, // Prefix with 'pkg_' to distinguish from individual tests in UI
    test_name: pkg.title,
    test_code: pkg.slug.toUpperCase().replace(/-/g, '_'),
    body_system: 'Health Package',
    customer_price: pkg.price ?? 0,
    original_id: pkg.id, // Store the raw UUID for database insertion
    item_type: 'package', // Mark as package for booking_items
  };
  
  return addToCart(cartItem);
}

/**
 * Remove an item from the cart by ID
 */
export function removeFromCart(itemId: string): void {
  const currentCart = loadCart();
  const newCart = currentCart.filter(item => item.id !== itemId);
  saveCart(newCart);
}

/**
 * Clear the entire cart
 */
export function clearCart(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
  if (import.meta.env.DEV) {
    console.log('[Cart] Cleared');
  }
}

/**
 * Get cart item count
 */
export function getCartCount(): number {
  return loadCart().length;
}

/**
 * Get cart total
 */
export function getCartTotal(): number {
  return loadCart().reduce((sum, item) => sum + item.customer_price, 0);
}
