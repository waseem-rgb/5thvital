import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';


interface TestItem {
  id: string;
  test_name: string;
  test_code: string;
  body_system: string;
  customer_price: number;
}

interface CartSectionProps {
  cartItems: TestItem[];
  onRemoveFromCart: (testId: string) => void;
  onContinueToDetails: () => void;
}

const CartSection = ({ cartItems, onRemoveFromCart, onContinueToDetails }: CartSectionProps) => {
  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + item.customer_price, 0);
  };

  return (
    <section className="min-h-screen bg-background flex items-center justify-center py-8 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        {cartItems.length === 0 ? (
          <div className="text-center py-20 sm:py-32">
            <p className="text-foreground text-xl sm:text-2xl font-semibold mb-4">No tests selected yet</p>
            <p className="text-muted-foreground text-sm sm:text-base">Use the search above to add tests</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Test Items Grid */}
            <div className="space-y-5">
              {cartItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="bg-card rounded-3xl p-6 sm:p-8 border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1 min-w-0 space-y-3">
                      <h3 className="font-bold text-foreground text-lg sm:text-xl leading-tight">
                        {item.test_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          {item.test_code}
                        </span>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
                          {item.body_system}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 flex-shrink-0">
                      <div className="text-right">
                        <span className="block font-bold text-foreground text-xl sm:text-2xl whitespace-nowrap">
                          ₹{item.customer_price.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-all duration-200 p-3 hover:bg-muted/80 rounded-2xl group"
                        aria-label={`Remove ${item.test_name}`}
                      >
                        <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-card to-card/95 rounded-3xl p-8 sm:p-10 border-2 border-border/50 shadow-xl">
              <div className="space-y-6">
                <div className="flex justify-between items-baseline pb-6 border-b-2 border-border/50">
                  <div>
                    <p className="text-muted-foreground text-xs sm:text-sm mb-1 font-medium uppercase tracking-wide">Total Amount</p>
                    <span className="text-foreground text-3xl sm:text-4xl font-bold">
                      ₹{getTotalAmount().toLocaleString()}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-sm font-medium bg-muted px-4 py-2 rounded-full">
                    {cartItems.length} {cartItems.length === 1 ? 'test' : 'tests'}
                  </span>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="text-foreground font-semibold text-base sm:text-lg">Payment Method</p>
                      <p className="text-muted-foreground text-sm">Cash on Collection</p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground font-bold text-lg sm:text-xl">COD</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-2xl p-4 sm:p-5">
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      💡 Payment is collected during sample collection. <span className="font-semibold text-foreground">Free cancellation</span> available up to 2 hours before your scheduled appointment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              onClick={onContinueToDetails}
              className="w-full bg-foreground hover:bg-foreground/95 text-background text-lg sm:text-xl py-7 sm:py-8 font-bold rounded-3xl transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 shadow-lg hover:shadow-2xl"
              size="lg"
            >
              Continue to Details →
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CartSection;