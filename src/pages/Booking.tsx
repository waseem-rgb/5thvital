import BookingHero from '@/components/booking/BookingHero';
import HealthScreeningSection from '@/components/booking/HealthScreeningSection';
import PackagesSection from '@/components/booking/PackagesSection';
import SearchTestsSection from '@/components/booking/SearchTestsSection';
import CartSection from '@/components/booking/CartSection';
import CustomerDetailsSection from '@/components/booking/CustomerDetailsSection';
import PrescriptionUploadSection from '@/components/booking/PrescriptionUploadSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Local storage key for cart persistence.
 * Cart data persists across page refreshes, auth state changes, and navigation.
 */
const CART_STORAGE_KEY = 'bookingCart';

interface TestItem {
  id: string;
  test_name: string;
  test_code: string;
  body_system: string;
  customer_price: number;
}

/**
 * Safely load cart from localStorage with error handling.
 * Returns empty array if storage is unavailable or data is corrupted.
 */
const loadCartFromStorage = (): TestItem[] => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) {
      if (import.meta.env.DEV) {
        console.log('[Cart] No saved cart found in localStorage');
      }
      return [];
    }
    
    const parsed = JSON.parse(savedCart);
    
    // Validate cart structure
    if (!Array.isArray(parsed)) {
      console.warn('[Cart] Invalid cart data (not array), resetting');
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    
    // Filter out invalid items
    const validItems = parsed.filter((item: unknown): item is TestItem => {
      if (!item || typeof item !== 'object') return false;
      const obj = item as Record<string, unknown>;
      return (
        typeof obj.id === 'string' &&
        typeof obj.test_name === 'string' &&
        typeof obj.customer_price === 'number'
      );
    });
    
    if (import.meta.env.DEV) {
      console.log(`[Cart] Loaded ${validItems.length} items from localStorage`, validItems.map(i => i.test_name));
    }
    
    return validItems;
  } catch (error) {
    console.error('[Cart] Error loading cart from localStorage:', error);
    return [];
  }
};

/**
 * Safely save cart to localStorage.
 */
const saveCartToStorage = (items: TestItem[]): void => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    if (import.meta.env.DEV) {
      console.log(`[Cart] Saved ${items.length} items to localStorage`);
    }
  } catch (error) {
    console.error('[Cart] Error saving cart to localStorage:', error);
  }
};

/**
 * Setup dev-only window helpers for debugging cart state.
 */
const setupDevHelpers = (
  getCartItems: () => TestItem[],
  setCartItems: React.Dispatch<React.SetStateAction<TestItem[]>>
) => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    // Dump current cart state
    (window as unknown as Record<string, unknown>).__dumpCart = () => {
      const items = getCartItems();
      console.log('[DEV] Current cart state:', {
        itemCount: items.length,
        totalAmount: items.reduce((sum, item) => sum + item.customer_price, 0),
        items: items.map(i => ({ id: i.id, name: i.test_name, price: i.customer_price })),
        localStorageRaw: localStorage.getItem(CART_STORAGE_KEY)
      });
      return items;
    };

    // Force reload cart from localStorage
    (window as unknown as Record<string, unknown>).__reloadCart = () => {
      const loaded = loadCartFromStorage();
      setCartItems(loaded);
      console.log('[DEV] Cart reloaded from localStorage:', loaded.length, 'items');
      return loaded;
    };

    // Clear cart (for testing)
    (window as unknown as Record<string, unknown>).__clearCart = () => {
      setCartItems([]);
      localStorage.removeItem(CART_STORAGE_KEY);
      console.log('[DEV] Cart cleared');
    };

    console.log('[DEV] Cart debug helpers available:');
    console.log('  - window.__dumpCart() - Show current cart state');
    console.log('  - window.__reloadCart() - Reload cart from localStorage');
    console.log('  - window.__clearCart() - Clear cart completely');
  }
};

const Booking = () => {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<TestItem[]>(() => loadCartFromStorage());
  const [hasProceededToBook, setHasProceededToBook] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  
  // Track previous user state to detect auth transitions
  const prevUserRef = useRef<typeof user>(null);

  // Memoized getter for dev helpers
  const getCartItems = useCallback(() => cartItems, [cartItems]);

  // Setup dev helpers on mount
  useEffect(() => {
    setupDevHelpers(getCartItems, setCartItems);
  }, [getCartItems]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);

  // Handle auth state transitions - ensure cart persists
  useEffect(() => {
    const prevUser = prevUserRef.current;
    
    if (import.meta.env.DEV) {
      console.log('[Cart] Auth state check:', {
        prevUser: prevUser?.id?.slice(0, 8) || 'none',
        currentUser: user?.id?.slice(0, 8) || 'none',
        authLoading,
        cartItemCount: cartItems.length
      });
    }

    // Detect transition from logged-out to logged-in
    if (!prevUser && user && !authLoading) {
      if (import.meta.env.DEV) {
        console.log('[Cart] User logged in - verifying cart persistence');
      }
      
      // Cart should already be in state from localStorage
      // Double-check and reload if state got cleared somehow
      if (cartItems.length === 0) {
        const storedCart = loadCartFromStorage();
        if (storedCart.length > 0) {
          if (import.meta.env.DEV) {
            console.log('[Cart] Restoring cart after login:', storedCart.length, 'items');
          }
          setCartItems(storedCart);
        }
      }
    }

    prevUserRef.current = user;
  }, [user, authLoading, cartItems.length]);

  // Auto-expand accordion sections when tests are added
  useEffect(() => {
    if (cartItems.length > 0) {
      setAccordionValue(['cart', 'details']);
    } else {
      setAccordionValue([]);
    }
  }, [cartItems.length]);

  const handleAddToCart = useCallback((test: TestItem) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.id === test.id);
      if (!exists) {
        const newCart = [...prev, test];
        if (import.meta.env.DEV) {
          console.log('[Cart] Added:', test.test_name, '| Total items:', newCart.length);
        }
        return newCart;
      }
      if (import.meta.env.DEV) {
        console.log('[Cart] Item already in cart:', test.test_name);
      }
      return prev;
    });
  }, []);

  const handleRemoveFromCart = useCallback((testId: string) => {
    setCartItems(prev => {
      const item = prev.find(i => i.id === testId);
      const newCart = prev.filter(item => item.id !== testId);
      if (import.meta.env.DEV) {
        console.log('[Cart] Removed:', item?.test_name || testId, '| Remaining:', newCart.length);
      }
      return newCart;
    });
  }, []);

  const handleProceedToBook = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('[Cart] Proceeding to book with', cartItems.length, 'items');
    }
    setHasProceededToBook(true);
    cartRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cartItems.length]);

  const handleContinueToDetails = useCallback(() => {
    detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen">
      <div>
        {/* 1. Hero Section - Video, Nav, Tagline Only */}
        <div ref={heroRef}>
          <BookingHero />
        </div>

        {/* 2. Health Screening Packages Section */}
        <HealthScreeningSection onAddToCart={handleAddToCart} />

        {/* 3. Featured Packages Section */}
        <PackagesSection />

        {/* 4. Search Tests Section */}
        <SearchTestsSection onAddToCart={handleAddToCart} />

        {/* 5. Prescription Upload Section */}
        <PrescriptionUploadSection />

        {/* 6. Cart and Customer Details - Only visible when cart has items */}
        {cartItems.length > 0 && (
          <Accordion 
            type="multiple" 
            value={accordionValue} 
            onValueChange={setAccordionValue}
            className="w-full"
          >
            <AccordionItem value="cart" className="border-none">
              <AccordionTrigger className="text-2xl sm:text-4xl font-bold text-center py-8 hover:no-underline data-[state=closed]:text-muted-foreground data-[state=open]:text-foreground justify-center">
                Review Your Tests
              </AccordionTrigger>
              <AccordionContent className="pb-0 animate-accordion-down">
                <div ref={cartRef} data-cart className="animate-fade-in">
                  <CartSection
                    cartItems={cartItems} 
                    onRemoveFromCart={handleRemoveFromCart}
                    onContinueToDetails={handleContinueToDetails}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="text-2xl sm:text-4xl font-bold text-center py-8 hover:no-underline data-[state=closed]:text-muted-foreground data-[state=open]:text-foreground justify-center">
                Customer Details
              </AccordionTrigger>
              <AccordionContent className="pb-0 animate-accordion-down">
                <div ref={detailsRef} className="animate-fade-in">
                  <CustomerDetailsSection 
                    cartItems={cartItems}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default Booking;
