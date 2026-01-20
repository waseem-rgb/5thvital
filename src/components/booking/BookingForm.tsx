import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CartItem } from '@/types/booking';

interface BookingFormProps {
  cartItems: CartItem[];
  totalAmount: number;
  onBack: () => void;
}

const BookingForm = ({ cartItems, totalAmount, onBack }: BookingFormProps) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          total_amount: totalAmount,
          discount_amount: 0,
          final_amount: totalAmount,
          notes: bookingData.notes || null
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking items
      const bookingItems = cartItems.map(item => ({
        booking_id: booking.id,
        item_type: item.type,
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
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
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Booking Confirmed!</h2>
            <p className="text-muted-foreground">
              Your booking has been successfully submitted. Our team will contact you within 24 hours to confirm the appointment details.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - Form Fields */}
          <div className="space-y-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  value={bookingData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="e.g., Sivananda"
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
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
                        "mt-1 pr-10",
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
                  <Label htmlFor="age" className="text-sm font-medium">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={bookingData.customerAge}
                    onChange={(e) => handleInputChange('customerAge', e.target.value)}
                    placeholder="e.g., 28"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={bookingData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="e.g., john.doe@email.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
                <Select onValueChange={(value) => handleInputChange('customerGender', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <Textarea
                  id="address"
                  value={bookingData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g., 123 MG Road, Bangalore, Karnataka - 560001"
                  className="mt-1 min-h-[80px]"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">Enter complete address for home sample collection</p>
              </div>
            </div>

            {/* Appointment */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !bookingData.preferredDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingData.preferredDate ? format(bookingData.preferredDate, "MMM dd") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bookingData.preferredDate}
                        onSelect={(date) => setBookingData(prev => ({ ...prev, preferredDate: date }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium">Time</Label>
                  <Select onValueChange={(value) => handleInputChange('preferredTime', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={bookingData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="e.g., Please call before arriving"
                  className="mt-1 min-h-[60px]"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Right Side - Cart & Payment */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Cart & Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex justify-between items-center py-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            {item.type === 'test' ? 'Test' : 'Profile'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                
                <hr />
                
                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Home Collection</span>
                    <span className="text-green-600 font-medium">FREE</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Payment Method</p>
                  <p className="text-xs text-muted-foreground">Cash on Collection</p>
                </div>

                {/* Confirm Button */}
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !bookingData.customerName || !bookingData.customerPhone}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                </Button>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Payment collected during sample collection. Free cancellation up to 2 hours before appointment.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;