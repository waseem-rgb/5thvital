import BookingHero from '@/components/booking/BookingHero';
import HealthScreeningSection from '@/components/booking/HealthScreeningSection';
import SearchTestsSection from '@/components/booking/SearchTestsSection';
import CartSection from '@/components/booking/CartSection';
import CustomerDetailsSection from '@/components/booking/CustomerDetailsSection';
import PrescriptionUploadSection from '@/components/booking/PrescriptionUploadSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState, useRef, useEffect } from 'react';

interface TestItem {
  id: string;
  test_name: string;
  test_code: string;
  body_system: string;
  customer_price: number;
}

const Booking = () => {
  const [cartItems, setCartItems] = useState<TestItem[]>(() => {
    // Load cart from localStorage on mount
    const savedCart = localStorage.getItem('bookingCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [hasProceededToBook, setHasProceededToBook] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bookingCart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Auto-expand accordion sections when tests are added
  useEffect(() => {
    if (cartItems.length > 0) {
      setAccordionValue(['cart', 'details']);
    } else {
      setAccordionValue([]);
    }
  }, [cartItems.length]);


  const handleAddToCart = (test: TestItem) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.id === test.id);
      if (!exists) {
        const newCart = [...prev, test];
        console.log('Added to cart:', test.test_name, 'Total items:', newCart.length);
        return newCart;
      }
      return prev;
    });
  };

  const handleRemoveFromCart = (testId: string) => {
    setCartItems(prev => {
      const newCart = prev.filter(item => item.id !== testId);
      console.log('Removed from cart, remaining items:', newCart.length);
      return newCart;
    });
  };

  const handleProceedToBook = () => {
    console.log('Proceeding to book with cart items:', cartItems.length);
    setHasProceededToBook(true);
    cartRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContinueToDetails = () => {
    detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <div>
        {/* 1. Hero Section - Video, Nav, Tagline Only */}
        <div ref={heroRef}>
          <BookingHero />
        </div>

        {/* 2. Health Screening Packages Section */}
        <HealthScreeningSection onAddToCart={handleAddToCart} />

        {/* 3. Search Tests Section */}
        <SearchTestsSection onAddToCart={handleAddToCart} />

        {/* 4. Prescription Upload Section */}
        <PrescriptionUploadSection />

        {/* 5. Cart and Customer Details - Only visible when cart has items */}
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