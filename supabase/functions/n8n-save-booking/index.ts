import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface N8NBookingRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_age?: number;
  customer_gender?: string;
  address?: string;
  preferred_date?: string;
  preferred_time?: string;
  notes?: string;
  test_ids: string[];
  coupon_code?: string;
}

// Helper function to parse time slot to timestamp
function parseTimeSlotToTimestamp(dateStr: string, timeSlot: string): string {
  const date = new Date(dateStr);
  const [startTime] = timeSlot.split(' - ');
  const [time, period] = startTime.split(' ');
  const [hours, minutes] = time.split(':');
  
  let hour = parseInt(hours);
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  date.setHours(hour, parseInt(minutes), 0, 0);
  return date.toISOString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('N8N Save Booking function called');
    
    const bookingData: N8NBookingRequest = await req.json();
    console.log('Received booking data from n8n:', JSON.stringify(bookingData, null, 2));

    // Validate required fields
    if (!bookingData.customer_name || !bookingData.customer_phone || !bookingData.test_ids || bookingData.test_ids.length === 0) {
      console.error('Missing required fields:', {
        customer_name: !!bookingData.customer_name,
        customer_phone: !!bookingData.customer_phone,
        test_ids: bookingData.test_ids?.length || 0
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: customer_name, customer_phone, and test_ids are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch test details and prices
    console.log('Fetching test details for IDs:', bookingData.test_ids);
    const { data: tests, error: testsError } = await supabase
      .from('medical_tests')
      .select('*')
      .in('id', bookingData.test_ids);

    if (testsError) {
      console.error('Error fetching tests:', testsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch test details' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!tests || tests.length === 0) {
      console.error('No tests found for provided IDs');
      return new Response(
        JSON.stringify({ error: 'No valid tests found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate amounts
    const totalAmount = tests.reduce((sum, test) => sum + Number(test.customer_price), 0);
    console.log('Total amount calculated:', totalAmount);

    // Apply discount logic (similar to voice-book-tests)
    let discountPercentage = 0;
    let discountAmount = 0;

    if (bookingData.coupon_code) {
      // Simple coupon logic - you can enhance this
      if (bookingData.coupon_code.toUpperCase() === 'HEALTH10') {
        discountPercentage = 10;
      } else if (bookingData.coupon_code.toUpperCase() === 'SAVE20') {
        discountPercentage = 20;
      } else if (bookingData.coupon_code.toUpperCase() === 'WELLNESS25') {
        discountPercentage = 25;
      }
      
      discountAmount = (totalAmount * discountPercentage) / 100;
      console.log('Discount applied:', { discountPercentage, discountAmount });
    }

    const finalAmount = totalAmount - discountAmount;

    // Parse preferred time if provided
    let collectionScheduledTime = null;
    if (bookingData.preferred_date && bookingData.preferred_time) {
      try {
        collectionScheduledTime = parseTimeSlotToTimestamp(bookingData.preferred_date, bookingData.preferred_time);
        console.log('Collection time parsed:', collectionScheduledTime);
      } catch (error) {
        console.error('Error parsing collection time:', error);
      }
    }

    // Create booking record
    console.log('Creating booking record...');
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_name: bookingData.customer_name,
        customer_phone: bookingData.customer_phone,
        customer_email: bookingData.customer_email,
        customer_age: bookingData.customer_age,
        customer_gender: bookingData.customer_gender,
        address: bookingData.address,
        preferred_date: bookingData.preferred_date ? new Date(bookingData.preferred_date).toISOString().split('T')[0] : null,
        preferred_time: bookingData.preferred_time ? bookingData.preferred_time.split(' - ')[0] : null,
        notes: bookingData.notes,
        total_amount: totalAmount,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        collection_scheduled_time: collectionScheduledTime,
        status: 'confirmed'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Booking created successfully:', booking.id);

    // Create booking items
    console.log('Creating booking items...');
    const bookingItems = tests.map(test => ({
      booking_id: booking.id,
      item_id: test.id,
      item_type: 'test',
      item_name: test.test_name,
      quantity: 1,
      unit_price: Number(test.customer_price),
      total_price: Number(test.customer_price)
    }));

    const { error: itemsError } = await supabase
      .from('booking_items')
      .insert(bookingItems);

    if (itemsError) {
      console.error('Error creating booking items:', itemsError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking items' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Booking items created successfully');

    // Try to create Google Calendar event (optional - won't fail if it doesn't work)
    try {
      if (collectionScheduledTime) {
        console.log('Creating Google Calendar event...');
        const { data: calendarResult } = await supabase.functions.invoke('google-calendar', {
          body: {
            booking_id: booking.id,
            customer_name: bookingData.customer_name,
            customer_phone: bookingData.customer_phone,
            collection_time: collectionScheduledTime,
            tests: tests.map(test => test.test_name)
          }
        });

        if (calendarResult?.event_id) {
          console.log('Calendar event created:', calendarResult.event_id);
          // Update booking with calendar event ID
          await supabase
            .from('bookings')
            .update({ calendar_event_id: calendarResult.event_id })
            .eq('id', booking.id);
        }
      }
    } catch (calendarError) {
      console.error('Calendar event creation failed (non-critical):', calendarError);
    }

    // Try to send SMS notification (optional - won't fail if it doesn't work)
    try {
      console.log('Sending SMS notification...');
      await supabase.functions.invoke('send-booking-sms', {
        body: {
          booking_id: booking.id,
          customer_name: bookingData.customer_name,
          customer_phone: bookingData.customer_phone,
          tests: tests.map(test => test.test_name),
          final_amount: finalAmount,
          collection_time: collectionScheduledTime
        }
      });
      console.log('SMS sent successfully');
    } catch (smsError) {
      console.error('SMS sending failed (non-critical):', smsError);
    }

    // Return success response
    const response = {
      success: true,
      booking_id: booking.id,
      customer_name: bookingData.customer_name,
      customer_phone: bookingData.customer_phone,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      tests: tests.map(test => ({
        id: test.id,
        name: test.test_name,
        price: test.customer_price
      })),
      collection_time: collectionScheduledTime,
      order_link: `https://${req.headers.get('host')}/order-details?id=${booking.id}`,
      message: 'Booking created successfully via n8n integration'
    };

    console.log('Booking process completed successfully:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in n8n-save-booking function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});