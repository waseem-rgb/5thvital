import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingCart, Plus, Minus, Trash2, Calendar } from 'lucide-react';
import BookingForm from './BookingForm';
import type { CartItem } from '@/types/booking';

interface BookingCartProps {
  items: CartItem[];
  totalAmount: number;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateItem: (id: string, type: 'test' | 'profile', quantity: number) => void;
  onRemoveItem: (id: string, type: 'test' | 'profile') => void;
}

const BookingCart = ({ 
  items, 
  totalAmount, 
  isOpen, 
  onToggle, 
  onUpdateItem, 
  onRemoveItem 
}: BookingCartProps) => {
  const [showBookingForm, setShowBookingForm] = useState(false);

  const handleQuantityChange = (item: CartItem, change: number) => {
    const newQuantity = item.quantity + change;
    onUpdateItem(item.id, item.type, newQuantity);
  };

  const handleProceedToBooking = () => {
    setShowBookingForm(true);
  };

  if (showBookingForm) {
    return (
      <BookingForm 
        cartItems={items}
        totalAmount={totalAmount}
        onBack={() => setShowBookingForm(false)}
      />
    );
  }

  return (
    <>
      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet open={isOpen} onOpenChange={onToggle}>
          <SheetTrigger asChild>
            <Button 
              size="lg" 
              className="rounded-full h-14 w-14 shadow-lg relative"
            >
              <ShoppingCart className="w-6 h-6" />
              {items.length > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground min-w-[1.5rem] h-6 rounded-full flex items-center justify-center text-xs"
                >
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Your Cart ({items.length} items)
              </SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-4 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add some tests or health profiles to get started
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {items.map((item) => (
                    <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{item.name}</h4>
                            <Badge variant="secondary" className="mt-1">
                              {item.type === 'test' ? 'Test' : 'Profile'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveItem(item.id, item.type)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item, -1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              ₹{item.price.toLocaleString()} each
                            </p>
                            <p className="font-bold text-primary">
                              ₹{(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Total and Checkout */}
                  <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>₹{totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Home Collection:</span>
                        <span className="text-green-600">FREE</span>
                      </div>
                      <hr />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                      </div>
                      
                      <Button 
                        onClick={handleProceedToBooking}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Calendar className="w-4 h-4" />
                        Proceed to Book
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default BookingCart;