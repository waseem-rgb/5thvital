import BookingHero from '@/components/booking/BookingHero';
import PackagesSection from '@/components/booking/PackagesSection';
import SearchTestsSection from '@/components/booking/SearchTestsSection';
import CartSection from '@/components/booking/CartSection';
import CustomerDetailsSection from '@/components/booking/CustomerDetailsSection';
import PrescriptionUploadSection from '@/components/booking/PrescriptionUploadSection';
import MobileAuthModal from '@/components/auth/MobileAuthModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingCart } from 'lucide-react';

const CART_STORAGE_KEY = 'bookingCart';

interface TestItem {
  id: string;
  test_name: string;
  test_code: string;
  body_system: string;
  customer_price: number;
  original_id?: string;
  item_type?: 'test' | 'package';
}

const loadCartFromStorage = (): TestItem[] => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return [];
    const parsed = JSON.parse(savedCart);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    return parsed.filter((item: unknown): item is TestItem => {
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
};

const saveCartToStorage = (items: TestItem[]): void => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('[Cart] Error saving cart:', error);
  }
};

const Booking = () => {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<TestItem[]>(() => loadCartFromStorage());
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const prevUserRef = useRef<typeof user>(null);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);

  // Handle auth state transitions — preserve cart + auto-advance if pending checkout
  useEffect(() => {
    const prevUser = prevUserRef.current;

    if (!prevUser && user && !authLoading) {
      // Just logged in — restore cart if state got cleared
      if (cartItems.length === 0) {
        const storedCart = loadCartFromStorage();
        if (storedCart.length > 0) {
          setCartItems(storedCart);
        }
      }

      // Auto-advance to details if user was trying to checkout
      if (pendingCheckout) {
        setPendingCheckout(false);
        setAccordionValue(['cart', 'details']);
        setTimeout(() => {
          detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    }

    prevUserRef.current = user;
  }, [user, authLoading, cartItems.length, pendingCheckout]);

  const handleAddToCart = useCallback((test: TestItem | { id: string; name: string; testCode?: string | null; category?: string | null; price: number | string }) => {
    // Normalize camelCase API response to internal snake_case cart format
    const normalized: TestItem = 'test_name' in test
      ? test as TestItem
      : {
          id: test.id,
          test_name: test.name,
          test_code: test.testCode || '',
          body_system: test.category || '',
          customer_price: typeof test.price === 'string' ? parseFloat(test.price) : test.price,
        };

    setCartItems(prev => {
      const exists = prev.find(item => item.id === normalized.id);
      if (!exists) {
        return [...prev, normalized];
      }
      return prev;
    });
    // DO NOT scroll or expand accordion — keep user at search
  }, []);

  const handleRemoveFromCart = useCallback((testId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== testId));
  }, []);

  const handleContinueToDetails = useCallback(() => {
    if (!user) {
      // Guest — show login modal, preserve cart
      setPendingCheckout(true);
      setShowAuthModal(true);
      return;
    }
    // Logged in — show details section
    setAccordionValue(['cart', 'details']);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [user]);

  // Scroll to cart section
  const handleGoToCart = useCallback(() => {
    setAccordionValue(['cart']);
    setTimeout(() => {
      cartRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Clear cart after successful booking
  const handleBookingSuccess = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const cartTotal = cartItems.reduce((sum, item) => sum + (typeof item.customer_price === 'string' ? parseFloat(item.customer_price) : item.customer_price), 0);

  // Hide the floating cart bar when customer details section is open
  const isInCheckout = accordionValue.includes('details');

  return (
    <div className="min-h-screen">
      <MobileAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      <div>
        {/* Hero Section */}
        <BookingHero />

        {/* Health Screening Packages (DB-driven) */}
        <PackagesSection />

        {/* Search Tests Section — user stays here after adding */}
        <SearchTestsSection onAddToCart={handleAddToCart} />

        {/* Prescription Upload */}
        <PrescriptionUploadSection />

        {/* Cart + Customer Details — visible when cart has items */}
        {cartItems.length > 0 && (
          <Accordion
            type="multiple"
            value={accordionValue}
            onValueChange={setAccordionValue}
            className="w-full"
          >
            <AccordionItem value="cart" className="border-none">
              <AccordionTrigger className="text-xl sm:text-4xl font-bold text-center py-6 sm:py-8 hover:no-underline data-[state=closed]:text-muted-foreground data-[state=open]:text-foreground justify-center">
                Review Your Tests ({cartItems.length})
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
              <AccordionTrigger className="text-xl sm:text-4xl font-bold text-center py-6 sm:py-8 hover:no-underline data-[state=closed]:text-muted-foreground data-[state=open]:text-foreground justify-center">
                Customer Details
              </AccordionTrigger>
              <AccordionContent className="pb-0 animate-accordion-down">
                <div ref={detailsRef} className="animate-fade-in">
                  <CustomerDetailsSection
                    cartItems={cartItems}
                    onBookingSuccess={handleBookingSuccess}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

      {/* Floating Cart Bar — hidden when customer details section is open */}
      {cartItems.length > 0 && !isInCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-foreground text-background border-t shadow-2xl safe-area-bottom">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <button
              onClick={handleGoToCart}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold truncate">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart
                </p>
                <p className="text-xs opacity-80">
                  Total: ₹{cartTotal.toLocaleString()}
                </p>
              </div>
            </button>
            <button
              onClick={handleContinueToDetails}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Checkout →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
