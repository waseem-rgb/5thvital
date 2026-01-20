import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceBookingRequest {
  phone: string;
  customer_name: string;
  conversation_id?: string;
  test_ids: string[];
  preferred_date: string; // YYYY-MM-DD
  preferred_time: string; // "09:00 AM - 10:00 AM"
  discount_percentage?: number;
  coupon_code?: string;
  agent_notes?: string;
  customer_email?: string;
  customer_gender?: string;
  customer_age?: number;
  address?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request text first to handle empty body
    const requestText = await req.text();
    console.log('Received request:', requestText || '(empty body)');
    
    if (!requestText || requestText.trim() === '') {
      throw new Error('Empty request body - please provide booking data');
    }

    const bookingData: VoiceBookingRequest = JSON.parse(requestText);
    console.log('Voice booking request received:', { 
      phone: bookingData.phone, 
      test_count: bookingData.test_ids?.length 
    });

    // Validate required fields
    if (!bookingData.phone || !bookingData.customer_name) {
      throw new Error('Missing required fields: phone and customer_name are required');
    }

    if (!bookingData.test_ids || bookingData.test_ids.length === 0) {
      throw new Error('At least one test must be selected');
    }

    if (!bookingData.preferred_date || !bookingData.preferred_time) {
      throw new Error('Preferred date and time are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Create voice_booking record (status: pending)
    const { data: voiceBooking, error: voiceBookingError } = await supabase
      .from('voice_bookings')
      .insert({
        phone: bookingData.phone,
        customer_name: bookingData.customer_name,
        conversation_id: bookingData.conversation_id,
        test_ids: bookingData.test_ids,
        preferred_date: bookingData.preferred_date,
        preferred_time: bookingData.preferred_time,
        discount_percentage: bookingData.discount_percentage || 0,
        agent_notes: bookingData.agent_notes,
        booking_status: 'pending',
      })
      .select()
      .single();

    if (voiceBookingError) {
      console.error('Error creating voice booking:', voiceBookingError);
      throw new Error(`Failed to create voice booking: ${voiceBookingError.message}`);
    }

    console.log('Voice booking created:', voiceBooking.id);

    try {
      // Step 2: Fetch test details and calculate pricing
      const { data: tests, error: testsError } = await supabase
        .from('medical_tests')
        .select('id, test_name, customer_price')
        .in('id', bookingData.test_ids)
        .eq('is_active', true);

      if (testsError) {
        throw new Error(`Failed to fetch test details: ${testsError.message}`);
      }

      if (!tests || tests.length === 0) {
        throw new Error('No valid tests found for the provided IDs');
      }

      // Calculate pricing
      const totalAmount = tests.reduce((sum, test) => sum + Number(test.customer_price), 0);
      const discountPercentage = Math.min(bookingData.discount_percentage || 0, 25); // Cap at 25%
      const discountAmount = (totalAmount * discountPercentage) / 100;
      const finalAmount = totalAmount - discountAmount;

      console.log('Pricing calculated:', { totalAmount, discountAmount, finalAmount });

      // Step 3: Check availability with Google Calendar
      console.log('Checking calendar availability...');
      const availabilityResponse = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          action: 'checkAvailability',
          data: {
            date: bookingData.preferred_date,
            timeSlot: bookingData.preferred_time,
          }
        }),
      });

      if (!availabilityResponse.ok) {
        const errorText = await availabilityResponse.text();
        console.error('Calendar availability check failed:', errorText);
        throw new Error('Failed to check calendar availability');
      }

      const availabilityData = await availabilityResponse.json();
      if (!availabilityData.success || !availabilityData.isAvailable) {
        throw new Error(`Time slot ${bookingData.preferred_time} on ${bookingData.preferred_date} is not available`);
      }

      console.log('Time slot is available');

      // Step 4: Create booking in bookings table
      const collectionScheduledTime = parseTimeSlotToTimestamp(
        bookingData.preferred_date,
        bookingData.preferred_time
      );

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_phone: bookingData.phone,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          customer_gender: bookingData.customer_gender,
          customer_age: bookingData.customer_age,
          address: bookingData.address,
          total_amount: totalAmount,
          discount_amount: discountAmount,
          discount_percentage: discountPercentage,
          final_amount: finalAmount,
          coupon_code: bookingData.coupon_code,
          status: 'confirmed',
          collection_status: 'pending',
          collection_scheduled_time: collectionScheduledTime,
          preferred_date: bookingData.preferred_date,
          notes: bookingData.agent_notes,
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      console.log('Booking created:', booking.id, 'Custom ID:', booking.custom_booking_id);

      // Step 5: Create booking items
      const bookingItems = tests.map(test => ({
        booking_id: booking.id,
        item_id: test.id,
        item_type: 'test',
        item_name: test.test_name,
        quantity: 1,
        unit_price: test.customer_price,
        total_price: test.customer_price,
      }));

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItems);

      if (itemsError) {
        console.error('Error creating booking items:', itemsError);
        throw new Error(`Failed to create booking items: ${itemsError.message}`);
      }

      console.log('Booking items created:', bookingItems.length);

      // Step 6: Create Google Calendar event
      console.log('Creating Google Calendar event...');
      const testNames = tests.map(t => t.test_name);
      
      const calendarResponse = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          action: 'createBooking',
          data: {
            bookingId: booking.custom_booking_id,
            customerName: bookingData.customer_name,
            customerPhone: bookingData.phone,
            testNames: testNames,
            date: bookingData.preferred_date,
            timeSlot: bookingData.preferred_time,
          }
        }),
      });

      let calendarEventId = null;
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        calendarEventId = calendarData.eventId;
        console.log('Calendar event created:', calendarEventId);

        // Update booking with calendar event ID
        await supabase
          .from('bookings')
          .update({ calendar_event_id: calendarEventId })
          .eq('id', booking.id);
      } else {
        console.error('Calendar event creation failed (non-blocking)');
      }

      // Step 7: Send SMS notifications
      console.log('Sending SMS notifications...');
      let smsSuccess = false;
      
      try {
        const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-booking-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            bookingId: booking.custom_booking_id,
            customerName: bookingData.customer_name,
            customerPhone: bookingData.phone,
            testNames: testNames.join(', '),
            scheduledDate: bookingData.preferred_date,
            scheduledTime: bookingData.preferred_time,
            totalAmount: finalAmount,
          }),
        });

        if (smsResponse.ok) {
          smsSuccess = true;
          console.log('SMS notifications sent successfully');
        } else {
          console.error('SMS sending failed (non-blocking)');
        }
      } catch (smsError) {
        console.error('SMS error (non-blocking):', smsError);
      }

      // Step 8: Update voice_booking with success
      await supabase
        .from('voice_bookings')
        .update({
          booking_status: 'confirmed',
          booking_id: booking.id,
          confirmed_date: bookingData.preferred_date,
          confirmed_time: bookingData.preferred_time,
          total_amount: totalAmount,
          discount_percentage: discountPercentage,
          final_amount: finalAmount,
          test_names: testNames,
          calendar_event_id: calendarEventId,
          sms_sent: smsSuccess,
          sms_sent_at: smsSuccess ? new Date().toISOString() : null,
        })
        .eq('id', voiceBooking.id);

      // Step 9: Update/Create customer profile
      try {
        const { data: existingProfile } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('phone', bookingData.phone)
          .single();

        const profileData = {
          phone: bookingData.phone,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          gender: bookingData.customer_gender,
          age: bookingData.customer_age,
          address: bookingData.address,
          preferred_time: bookingData.preferred_time.split(' - ')[0], // Extract start time
          last_booking_date: new Date().toISOString(),
          total_bookings: (existingProfile?.total_bookings || 0) + 1,
        };

        if (existingProfile) {
          await supabase
            .from('customer_profiles')
            .update(profileData)
            .eq('phone', bookingData.phone);
        } else {
          await supabase
            .from('customer_profiles')
            .insert(profileData);
        }

        console.log('Customer profile updated');
      } catch (profileError) {
        console.error('Profile update failed (non-blocking):', profileError);
      }

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          booking_id: booking.custom_booking_id,
          voice_booking_id: voiceBooking.id,
          message: `Booking confirmed! Your booking ID is ${booking.custom_booking_id}`,
          details: {
            customer_name: bookingData.customer_name,
            phone: bookingData.phone,
            tests: testNames,
            scheduled_date: bookingData.preferred_date,
            scheduled_time: bookingData.preferred_time,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
            calendar_event_created: !!calendarEventId,
            sms_sent: smsSuccess,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error) {
      // Update voice_booking with failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await supabase
        .from('voice_bookings')
        .update({
          booking_status: 'failed',
          error_messages: [errorMessage],
        })
        .eq('id', voiceBooking.id);

      throw error;
    }

  } catch (error) {
    console.error('Voice booking error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

// Helper function to convert date and time slot to timestamp
function parseTimeSlotToTimestamp(dateStr: string, timeSlot: string): string {
  const startTime = timeSlot.split(' - ')[0].trim();
  const [time, period] = startTime.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const timestamp = new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
  return timestamp.toISOString();
}

serve(handler);
