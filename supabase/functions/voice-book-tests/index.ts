import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAge?: number;
  customerGender?: string;
  address: string;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: string; // "06:00 AM - 07:00 AM"
  testIds: string[];
  notes?: string;
  discountPercentage?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json() as BookingRequest;

    // Validate required fields
    const missing: string[] = [];
    if (!bookingData.customerName) missing.push('customerName');
    if (!bookingData.customerPhone) missing.push('customerPhone');
    if (!bookingData.address) missing.push('address');
    if (!bookingData.preferredDate) missing.push('preferredDate');
    if (!bookingData.preferredTime) missing.push('preferredTime');
    if (!bookingData.testIds || bookingData.testIds.length === 0) missing.push('testIds');
    if (missing.length > 0) {
      throw new Error(`Missing required booking information: ${missing.join(', ')}`);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get test details and calculate total
    const { data: tests, error: testsError } = await supabaseClient
      .from('medical_tests')
      .select('id, test_name, customer_price')
      .in('id', bookingData.testIds)
      .eq('is_active', true);

    if (testsError || !tests) {
      console.error('Error fetching tests:', testsError);
      throw new Error('Failed to fetch test details');
    }

    const totalAmount = tests.reduce((sum, test) => sum + parseFloat(test.customer_price.toString()), 0);
    
    // Apply discount (max 25%)
    const discountPercentage = Math.min(25, Math.max(0, bookingData.discountPercentage || 0));
    const discountAmount = (totalAmount * discountPercentage) / 100;
    const finalAmount = totalAmount - discountAmount;

    // Parse time slot to get scheduled time
    const scheduledTime = parseTimeSlotToTimestamp(bookingData.preferredDate, bookingData.preferredTime);

    // Create booking record
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        customer_name: bookingData.customerName,
        customer_phone: bookingData.customerPhone,
        customer_email: bookingData.customerEmail,
        customer_age: bookingData.customerAge,
        customer_gender: bookingData.customerGender,
        address: bookingData.address,
        preferred_date: bookingData.preferredDate,
        preferred_time: bookingData.preferredTime.split(' - ')[0], // Extract start time
        total_amount: totalAmount,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        notes: bookingData.notes,
        collection_scheduled_time: scheduledTime,
        collection_status: 'scheduled'
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      throw new Error('Failed to create booking');
    }

    // Create booking items
    const bookingItems = tests.map(test => ({
      booking_id: booking.id,
      item_id: test.id,
      item_type: 'test',
      item_name: test.test_name,
      quantity: 1,
      unit_price: test.customer_price,
      total_price: test.customer_price
    }));

    const { error: itemsError } = await supabaseClient
      .from('booking_items')
      .insert(bookingItems);

    if (itemsError) {
      console.error('Error creating booking items:', itemsError);
      // Try to rollback booking
      await supabaseClient.from('bookings').delete().eq('id', booking.id);
      throw new Error('Failed to create booking items');
    }

    // Create Google Calendar event
    const calendarResponse = await fetch(`https://fvsjggfdvkfspapwuish.functions.supabase.co/google-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_booking',
        date: bookingData.preferredDate,
        timeSlot: bookingData.preferredTime,
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        tests: tests.map(t => t.test_name),
        bookingId: booking.id
      }),
    });

    const calendarData = await calendarResponse.json();
    
    if (calendarResponse.ok && calendarData.success) {
      // Update booking with calendar event ID
      await supabaseClient
        .from('bookings')
        .update({ 
          calendar_event_id: calendarData.eventId,
          collection_status: 'confirmed'
        })
        .eq('id', booking.id);
    }

    // Send SMS notification
    try {
      await supabaseClient.functions.invoke('send-booking-sms', {
        body: {
          bookingId: booking.id,
          customerName: bookingData.customerName,
          customerPhone: bookingData.customerPhone,
          totalAmount: finalAmount,
          scheduledTime: bookingData.preferredTime,
          scheduledDate: bookingData.preferredDate
        }
      });
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError);
      // Don't fail the booking if SMS fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        totalAmount,
        scheduledDate: bookingData.preferredDate,
        scheduledTime: bookingData.preferredTime,
        tests: tests.map(t => ({ name: t.test_name, price: t.customer_price })),
        calendarEventId: calendarData.eventId,
        message: `Booking confirmed for ${bookingData.customerName}. Collection scheduled on ${bookingData.preferredDate} at ${bookingData.preferredTime}. ${discountPercentage > 0 ? `Discount applied: ${discountPercentage}% (saved ₹${discountAmount.toLocaleString()}). ` : ''}Final amount: ₹${finalAmount.toLocaleString()}. You will receive SMS confirmation shortly.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in voice-book-tests function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

function parseTimeSlotToTimestamp(date: string, timeSlot: string): string {
  const [startTime] = timeSlot.split(' - ');
  const [time, modifier] = startTime.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = modifier === 'AM' ? '00' : '12';
  } else if (modifier === 'PM') {
    hours = String(parseInt(hours, 10) + 12);
  }
  
  const scheduledDateTime = new Date(`${date} ${hours.padStart(2, '0')}:${minutes}:00`);
  return scheduledDateTime.toISOString();
}

serve(handler);