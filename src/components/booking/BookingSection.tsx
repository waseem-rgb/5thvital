import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestItem {
  id: string;
  test_name: string;
  test_code: string;
  body_system: string;
  customer_price: number;
}

interface BookingSectionProps {
  cartItems: TestItem[];
  onRemoveFromCart: (testId: string) => void;
}

const BookingSection = ({ cartItems, onRemoveFromCart }: BookingSectionProps) => {
  console.log('BookingSection rendered with cart items:', cartItems.length);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [bookingData, setBookingData] = useState({
    customerName: '',
    customerPhone: '+91 ',
    customerEmail: '',
    customerAge: '',
    customerGender: '',
    address: '',
    preferredDate: undefined as Date | undefined,
    preferredTime: '',
    notes: ''
  });

  const { toast } = useToast();

  const timeSlots = [
    '07:00 AM - 09:00 AM',
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 07:00 PM'
  ];

  const handleInputChange = (field: string, value: string) => {
    // Format phone number as user types
    if (field === 'customerPhone') {
      // Always ensure it starts with +91
      if (!value.startsWith('+91 ')) {
        // If user tries to delete the prefix, restore it
        const digits = value.replace(/\D/g, '');
        if (digits.length === 0) {
          setBookingData(prev => ({ ...prev, [field]: '+91 ' }));
          setIsPhoneValid(false);
          return;
        }
        // Extract just the phone number digits (remove country code if present)
        const phoneDigits = digits.startsWith('91') ? digits.slice(2) : digits;
        if (phoneDigits.length <= 10) {
          setBookingData(prev => ({ ...prev, [field]: `+91 ${phoneDigits}` }));
          setIsPhoneValid(phoneDigits.length === 10);
        }
        return;
      }
      
      // If value already starts with +91, just validate length
      const digitsAfterPrefix = value.slice(4).replace(/\D/g, '');
      if (digitsAfterPrefix.length <= 10) {
        setBookingData(prev => ({ ...prev, [field]: `+91 ${digitsAfterPrefix}` }));
        setIsPhoneValid(digitsAfterPrefix.length === 10);
      }
      return;
    }
    
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + item.customer_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast({
        title: "No Tests Selected",
        description: "Please select at least one test to proceed.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          customer_name: bookingData.customerName,
          customer_phone: bookingData.customerPhone,
          customer_email: bookingData.customerEmail,
          customer_age: bookingData.customerAge ? parseInt(bookingData.customerAge) : null,
          customer_gender: bookingData.customerGender || null,
          address: bookingData.address,
          preferred_date: bookingData.preferredDate?.toISOString().split('T')[0],
          preferred_time: bookingData.preferredTime || null,
          total_amount: getTotalAmount(),
          discount_amount: 0,
          final_amount: getTotalAmount(),
          notes: bookingData.notes || null
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking items
      const bookingItems = cartItems.map(item => ({
        booking_id: booking.id,
        item_type: 'test',
        item_id: item.id,
        item_name: item.test_name,
        quantity: 1,
        unit_price: item.customer_price,
        total_price: item.customer_price
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItems);

      if (itemsError) throw itemsError;

      setIsSuccess(true);
      toast({
        title: "Booking Confirmed!",
        description: "Your booking has been successfully submitted. We'll contact you soon.",
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-white/10 backdrop-blur-sm py-20">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-8 text-center space-y-4 shadow-2xl">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Booking Confirmed!</h2>
            <p className="text-white/90">
              Your booking has been successfully submitted. Our team will contact you within 24 hours to confirm the appointment details.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30">
              Return to Home
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-white/10 backdrop-blur-sm py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - Customer Details Form */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Customer Details</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-white">Full Name</Label>
                  <Input
                    id="name"
                    value={bookingData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="e.g., Sivananda"
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/70 backdrop-blur-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-white">Phone</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        value={bookingData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        onFocus={(e) => {
                          // Position cursor after +91 space if field only contains prefix
                          if (e.target.value === '+91 ') {
                            setTimeout(() => e.target.setSelectionRange(4, 4), 0);
                          }
                        }}
                        placeholder="e.g., +91 98765 43210"
                        className={cn(
                          "mt-1 bg-white/10 border-white/20 text-white placeholder-white/70 backdrop-blur-sm pr-10",
                          isPhoneValid && "border-green-500 focus-visible:ring-green-500"
                        )}
                        required
                      />
                      {isPhoneValid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-scale-in">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="age" className="text-sm font-medium text-white">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={bookingData.customerAge}
                      onChange={(e) => handleInputChange('customerAge', e.target.value)}
                      placeholder="e.g., 28"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/70 backdrop-blur-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={bookingData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="e.g., john.doe@email.com"
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/70 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="gender" className="text-sm font-medium text-white">Gender</Label>
                  <Select onValueChange={(value) => handleInputChange('customerGender', value)}>
                    <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white backdrop-blur-sm">
                      <SelectValue placeholder="Select gender" className="text-white/70" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/20 backdrop-blur-xl">
                      <SelectItem value="male" className="text-white hover:bg-white/10">Male</SelectItem>
                      <SelectItem value="female" className="text-white hover:bg-white/10">Female</SelectItem>
                      <SelectItem value="other" className="text-white hover:bg-white/10">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-medium text-white">Address</Label>
                  <Textarea
                    id="address"
                    value={bookingData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="e.g., 123 MG Road, Bangalore, Karnataka - 560001"
                    className="mt-1 min-h-[80px] bg-white/10 border-white/20 text-white placeholder-white/70 backdrop-blur-sm"
                    rows={3}
                  />
                  <p className="text-xs text-white/70 mt-1">Enter complete address for home sample collection</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-white">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1 bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20",
                            !bookingData.preferredDate && "text-white/70"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {bookingData.preferredDate ? format(bookingData.preferredDate, "MMM dd") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-black/90 border-white/20 backdrop-blur-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={bookingData.preferredDate}
                          onSelect={(date) => setBookingData(prev => ({ ...prev, preferredDate: date }))}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-white">Time</Label>
                    <Select onValueChange={(value) => handleInputChange('preferredTime', value)}>
                      <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white backdrop-blur-sm">
                        <SelectValue placeholder="Select time" className="text-white/70" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/20 backdrop-blur-xl">
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot} className="text-white hover:bg-white/10">
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-white">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={bookingData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="e.g., Please call before arriving"
                    className="mt-1 min-h-[60px] bg-white/10 border-white/20 text-white placeholder-white/70 backdrop-blur-sm"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Selected Tests Cart */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg text-foreground">
              <h2 className="text-xl font-bold mb-4">Selected Tests ({cartItems.length})</h2>
              
              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No tests selected yet</p>
                  <p className="text-muted-foreground text-sm mt-2">Use the search above to add tests</p>
                </div>
              ) : (
                <>
                  {/* Test Items */}
                  <div className="space-y-3 mb-6">
                    {cartItems.map((item) => (
                      <div key={item.id} className="bg-secondary rounded-lg p-4 border border-border">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{item.test_name}</h3>
                            <p className="text-muted-foreground text-xs mt-1">{item.test_code}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">₹{item.customer_price.toLocaleString()}</span>
                            <button
                              onClick={() => onRemoveFromCart(item.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              aria-label={`Remove ${item.test_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-border pt-4 mb-6">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total</span>
                      <span>₹{getTotalAmount().toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-secondary p-3 rounded-lg mb-4">
                    <p className="text-sm font-medium mb-1">Payment Method</p>
                    <p className="text-xs text-muted-foreground">Cash on Collection</p>
                  </div>

                  {/* Confirm Button */}
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !bookingData.customerName || !bookingData.customerPhone || cartItems.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-3 leading-relaxed">
                    Payment collected during sample collection. Free cancellation up to 2 hours before appointment.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingSection;