import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CalendarIcon,
  Clock,
  Phone,
  MapPin,
  ArrowLeft,
  CheckCircle,
  Circle,
  Download,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────

interface BookingDetails {
  id: string;
  custom_booking_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_age: number;
  customer_gender: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  total_amount: number;
  status: string;
  created_at: string;
  notes: string;
  report_url?: string | null;
  phlebotomist_id?: string | null;
  booking_items: {
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

interface Phlebotomist {
  name: string;
  phone: string;
}

// ─── Status Stepper ──────────────────────────────────────────

const STATUSES = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'phlebotomist_assigned', label: 'Phlebotomist Assigned' },
  { key: 'sample_collected', label: 'Sample Collected' },
  { key: 'processing', label: 'Processing' },
  { key: 'report_ready', label: 'Report Ready' },
] as const;

const StatusStepper = ({ currentStatus }: { currentStatus: string }) => {
  const currentIndex = STATUSES.findIndex((s) => s.key === currentStatus);
  // If status is 'pending' or unknown, nothing is completed yet
  const activeIndex = currentIndex >= 0 ? currentIndex : -1;

  return (
    <div className="flex items-center w-full overflow-x-auto py-4">
      {STATUSES.map((step, i) => {
        const isCompleted = i < activeIndex;
        const isCurrent = i === activeIndex;
        const isFuture = i > activeIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-muted-foreground/30 text-muted-foreground/30'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Circle className={`w-4 h-4 ${isCurrent ? 'fill-current' : ''}`} />
                )}
              </div>
              <span
                className={`text-xs mt-1 text-center whitespace-nowrap ${
                  isFuture ? 'text-muted-foreground/40' : 'text-foreground font-medium'
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STATUSES.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  i < activeIndex ? 'bg-green-500' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Page Component ──────────────────────────────────────────

const OrderDetails = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [phlebotomist, setPhlebotomist] = useState<Phlebotomist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch booking details
  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!orderId) {
        setError('Invalid order ID');
        setLoading(false);
        return;
      }

      try {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', orderId)
          .single();

        if (bookingError) {
          console.error('Error fetching booking:', bookingError);
          setError('Order not found');
          setLoading(false);
          return;
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('booking_items')
          .select('*')
          .eq('booking_id', orderId);

        if (itemsError) {
          console.error('Error fetching items:', itemsError);
          setError('Error loading order details');
          setLoading(false);
          return;
        }

        const fullBooking = { ...bookingData, booking_items: itemsData || [] } as BookingDetails;
        setBooking(fullBooking);

        // Fetch phlebotomist if assigned
        if (bookingData.phlebotomist_id) {
          const { data: phleb } = await supabase
            .from('phlebotomists')
            .select('name, phone')
            .eq('id', bookingData.phlebotomist_id)
            .single();
          if (phleb) setPhlebotomist(phleb);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An error occurred while loading order details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [orderId]);

  // Realtime subscription — listen for status changes on this booking
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`booking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${orderId}`,
        },
        async (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setBooking((prev) => (prev ? { ...prev, ...updated } as BookingDetails : prev));

          // If phlebotomist was just assigned, fetch their info
          if (updated.phlebotomist_id && updated.phlebotomist_id !== booking?.phlebotomist_id) {
            const { data: phleb } = await supabase
              .from('phlebotomists')
              .select('name, phone')
              .eq('id', updated.phlebotomist_id as string)
              .single();
            if (phleb) setPhlebotomist(phleb);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, booking?.phlebotomist_id]);

  // ─── Loading ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  // ─── Error / Not Found ──────────────────────────────────────

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 text-5xl mb-4">&#9888;&#65039;</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-900">Order Confirmed</h1>
          </div>
          <p className="text-gray-600">
            Booking ID: <span className="font-mono font-semibold">{booking.custom_booking_id || booking.id}</span>
          </p>
          <p className="text-sm text-gray-500">
            Booked on {format(new Date(booking.created_at), 'MMM dd, yyyy \'at\' h:mm a')}
          </p>
        </div>

        {/* Status Stepper */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusStepper currentStatus={booking.status} />
          </CardContent>
        </Card>

        {/* Report Download */}
        {booking.report_url && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-green-800 text-lg">Your Report is Ready!</h3>
                <p className="text-green-700 text-sm">Download your lab report as a PDF.</p>
              </div>
              <a href={booking.report_url} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Phlebotomist Info */}
        {phlebotomist && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800">Phlebotomist Assigned</h3>
                <p className="text-blue-700 text-sm">{phlebotomist.name}</p>
                <a href={`tel:${phlebotomist.phone}`} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
                  <Phone className="h-3 w-3" />
                  {phlebotomist.phone}
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-lg">{booking.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-lg">{booking.customer_phone}</p>
                  </div>
                  {booking.customer_email && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-lg">{booking.customer_email}</p>
                    </div>
                  )}
                  {booking.customer_age && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Age</p>
                      <p className="text-lg">{booking.customer_age} years</p>
                    </div>
                  )}
                  {booking.customer_gender && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Gender</p>
                      <p className="text-lg capitalize">{booking.customer_gender}</p>
                    </div>
                  )}
                </div>
                {booking.address && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Address
                    </p>
                    <p className="text-lg">{booking.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {booking.preferred_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Preferred Date</p>
                      <p className="text-lg">{format(new Date(booking.preferred_date), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                  {booking.preferred_time && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Preferred Time
                      </p>
                      <p className="text-lg">{booking.preferred_time}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'} className="mt-1">
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
                {booking.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Special Instructions</p>
                    <p className="text-lg">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.booking_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">&#8377;{item.total_price.toLocaleString()}</p>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount</span>
                  <span>&#8377;{booking.total_amount.toLocaleString()}</span>
                </div>

                <Separator />

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Payment Method</span>
                    <span>Cash on Collection</span>
                  </div>
                  <p className="text-xs">
                    Payment will be collected during sample collection. Free cancellation up to 2 hours before appointment.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="font-semibold text-green-800">Booking Confirmed!</h3>
                  <p className="text-sm text-gray-600">
                    Our team will contact you within 24 hours to confirm the appointment details and schedule sample collection.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
