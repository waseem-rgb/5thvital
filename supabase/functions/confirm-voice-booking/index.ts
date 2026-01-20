import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingConfirmationRequest {
  phone: string;
  customer_name: string;
  conversation_id?: string;
  test_ids: string[];
  preferred_date: string;
  preferred_time?: string;
  discount_percentage?: number;
  agent_notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: BookingConfirmationRequest = await req.json();
    
    console.log('Confirm voice booking request:', requestData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, customer_name, conversation_id, test_ids, preferred_date, preferred_time, discount_percentage = 0, agent_notes } = requestData;

    // Validate required fields
    if (!phone || !customer_name || !test_ids || test_ids.length === 0) {
      throw new Error('Missing required fields: phone, customer_name, and test_ids are required');
    }

    // Fetch test details and calculate pricing
    const { data: testsData, error: testsError } = await supabase
      .from('medical_tests')
      .select('id, test_name, customer_price')
      .in('id', test_ids);

    if (testsError) {
      console.error('Error fetching tests:', testsError);
      throw new Error('Failed to fetch test details');
    }

    if (!testsData || testsData.length === 0) {
      throw new Error('No valid tests found for the provided IDs');
    }

    // Calculate totals
    const total_amount = testsData.reduce((sum, test) => sum + Number(test.customer_price), 0);
    const discount_amount = (total_amount * discount_percentage) / 100;
    const final_amount = total_amount - discount_amount;
    
    const test_names = testsData.map(test => test.test_name);

    // Check availability first
    console.log('Checking availability for:', preferred_date, preferred_time);
    
    let availabilityResponse;
    try {
      availabilityResponse = await supabase.functions.invoke('voice-check-availability', {
        body: { 
          date: preferred_date, 
          timeSlot: preferred_time 
        }
      });

      if (availabilityResponse.error) {
        console.error('Availability check error:', availabilityResponse.error);
        throw new Error('Failed to check availability');
      }

      console.log('Availability response:', availabilityResponse.data);

      // If checking specific time slot and it's not available
      if (preferred_time && availabilityResponse.data && !availabilityResponse.data.available) {
        return new Response(JSON.stringify({
          success: false,
          message: `The requested time slot ${preferred_time} on ${preferred_date} is not available. Please choose another time.`,
          available_slots: availabilityResponse.data.available_slots || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Continue without availability check as fallback
    }

    // Create voice booking record
    const { data: voiceBooking, error: voiceBookingError } = await supabase
      .from('voice_bookings')
      .insert({
        phone,
        customer_name,
        conversation_id,
        booking_status: 'pending',
        test_ids,
        test_names,
        total_amount,
        discount_percentage,
        final_amount,
        preferred_date,
        preferred_time: preferred_time || null,
        agent_notes,
        sms_sent: false
      })
      .select()
      .single();

    if (voiceBookingError) {
      console.error('Error creating voice booking:', voiceBookingError);
      throw new Error('Failed to create voice booking record');
    }

    console.log('Voice booking created:', voiceBooking.id);

    // Create the actual booking via n8n-save-booking function
    const bookingPayload = {
      customer_name,
      customer_phone: phone,
      test_ids,
      preferred_date,
      preferred_time: preferred_time || "09:00 AM - 10:00 AM", // Default time if not specified
      total_amount,
      discount_percentage,
      final_amount,
      voice_booking_id: voiceBooking.id
    };

    console.log('Creating booking via n8n-save-booking:', bookingPayload);

    const bookingResponse = await supabase.functions.invoke('n8n-save-booking', {
      body: bookingPayload
    });

    if (bookingResponse.error) {
      console.error('Booking creation error:', bookingResponse.error);
      
      // Update voice booking with error
      await supabase
        .from('voice_bookings')
        .update({ 
          booking_status: 'failed',
          error_messages: [bookingResponse.error.message || 'Failed to create booking']
        })
        .eq('id', voiceBooking.id);

      throw new Error(`Failed to create booking: ${bookingResponse.error.message}`);
    }

    console.log('Booking created successfully:', bookingResponse.data);

    // Update voice booking with success status and booking reference
    const updateData: any = {
      booking_status: 'confirmed',
      booking_id: bookingResponse.data?.booking_id,
      sms_sent: true,
      sms_sent_at: new Date().toISOString()
    };

    if (bookingResponse.data?.calendar_event_id) {
      updateData.calendar_event_id = bookingResponse.data.calendar_event_id;
    }

    await supabase
      .from('voice_bookings')
      .update(updateData)
      .eq('id', voiceBooking.id);

    // Update customer profile
    await supabase
      .from('customer_profiles')
      .upsert({
        phone,
        customer_name,
        preferred_time: preferred_time ? preferred_time.split(' - ')[0] : null,
        total_bookings: 1, // Will be handled by trigger/function later
        last_booking_date: new Date().toISOString(),
        preferences: {
          frequently_booked_tests: test_names,
          preferred_discount: discount_percentage > 0 ? discount_percentage : null
        }
      }, {
        onConflict: 'phone',
        ignoreDuplicates: false
      });

    return new Response(JSON.stringify({
      success: true,
      message: `Booking confirmed! Your appointment is scheduled for ${preferred_date}${preferred_time ? ` at ${preferred_time}` : ''}. You will receive SMS confirmation shortly.`,
      voice_booking_id: voiceBooking.id,
      booking_id: bookingResponse.data?.booking_id,
      total_amount,
      final_amount,
      tests: test_names
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in confirm-voice-booking function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to confirm booking. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);