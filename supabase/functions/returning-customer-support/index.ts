import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomerSupportRequest {
  phone: string;
  query_type?: 'booking_status' | 'report_status' | 'reschedule' | 'cancel' | 'general';
  booking_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let raw = await req.text();
    console.log('[returning-customer-support] Received request:', raw || '(empty body)', 'CT:', contentType);

    // Parse body from JSON, form-encoded, or fallback to query params
    let payload: any = {};
    if (raw && raw.trim() !== '') {
      try {
        payload = JSON.parse(raw);
      } catch {
        try {
          const params = new URLSearchParams(raw);
          payload = Object.fromEntries(params.entries());
        } catch {}
      }
    } else {
      const url = new URL(req.url);
      payload = Object.fromEntries(url.searchParams.entries());
    }

    const { phone, query_type, booking_id }: CustomerSupportRequest = (payload || {}) as any;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎧 Customer support query for:', phone, 'Type:', query_type);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure phone number format
    let formattedPhone = phone;
    if (!phone.startsWith('+91')) {
      formattedPhone = '+91' + phone.replace(/^\+?91?/, '');
    }

    // Get customer's booking history from both regular bookings and voice bookings
    const [bookingsResult, voiceBookingsResult, customerProfileResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .eq('customer_phone', formattedPhone)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('voice_bookings')
        .select('*')
        .eq('phone', formattedPhone)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('customer_profiles')
        .select('*')
        .eq('phone', formattedPhone)
        .single()
    ]);

    const allBookings = [
      ...(bookingsResult.data || []).map(b => ({...b, source: 'booking'})),
      ...(voiceBookingsResult.data || []).map(b => ({...b, source: 'voice_booking'}))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const customerProfile = customerProfileResult.data;
    const totalBookings = allBookings.length;
    const isReturningCustomer = totalBookings > 0;

    if (!isReturningCustomer) {
      return new Response(
        JSON.stringify({
          success: true,
          is_returning_customer: false,
          message: "I don't see any previous bookings for this number. Would you like to make a new booking today?",
          support_info: "As a new customer, I can help you understand our services, pricing, and book your first test."
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle specific query types
    let supportMessage = '';
    let actionable_items: string[] = [];

    if (query_type === 'booking_status' && booking_id) {
      const specificBooking = allBookings.find(b => 
        (b.source === 'booking' && b.custom_booking_id === booking_id) ||
        (b.source === 'voice_booking' && b.id === booking_id)
      );

      if (specificBooking) {
        const status = specificBooking.source === 'booking' ? specificBooking.status : specificBooking.booking_status;
        supportMessage = `Your booking ${booking_id} status is: ${status}. `;
        
        if (status === 'pending') {
          supportMessage += 'Your sample collection is scheduled. Our team will call you 30 minutes before arrival.';
          actionable_items.push('Ensure you\'ve followed any fasting requirements');
          actionable_items.push('Keep your ID ready for verification');
        } else if (status === 'completed') {
          supportMessage += 'Sample collection completed. You should receive your report within 24-48 hours.';
          actionable_items.push('Check SMS/Email for report delivery');
        } else if (status === 'confirmed') {
          supportMessage += 'Your appointment is confirmed. We\'ll send you a reminder before the collection.';
        }
      } else {
        supportMessage = `I couldn't find a booking with ID ${booking_id}. Let me check your recent bookings.`;
      }
    }

    // Generate general support response
    const latestBooking = allBookings[0];
    const latestBookingDate = new Date(latestBooking.created_at).toLocaleDateString();
    const latestStatus = latestBooking.source === 'booking' ? latestBooking.status : latestBooking.booking_status;

    if (!supportMessage) {
      supportMessage = `Welcome back${customerProfile?.customer_name ? `, ${customerProfile.customer_name}` : ''}! `;
      supportMessage += `I see you have ${totalBookings} booking${totalBookings > 1 ? 's' : ''} with us. `;
      supportMessage += `Your most recent booking was on ${latestBookingDate} and is currently ${latestStatus}. `;
      
      if (query_type === 'report_status') {
        supportMessage += 'Reports are typically delivered within 24-48 hours via SMS and email. ';
        actionable_items.push('Check your SMS and email for report links');
        actionable_items.push('Contact us if you haven\'t received it beyond the expected time');
      } else if (query_type === 'reschedule') {
        if (latestStatus === 'pending') {
          supportMessage += 'I can help you reschedule your upcoming appointment. ';
          actionable_items.push('Tell me your preferred new date and time');
          actionable_items.push('Rescheduling is free if done 2+ hours before appointment');
        } else {
          supportMessage += 'Your latest booking appears to be completed. Would you like to make a new booking?';
        }
      } else if (query_type === 'cancel') {
        if (latestStatus === 'pending') {
          supportMessage += 'I can help you cancel your appointment if needed. ';
          actionable_items.push('Cancellation is free if done 4+ hours in advance');
          actionable_items.push('Confirm the booking ID you want to cancel');
        } else {
          supportMessage += 'Your latest booking appears to be completed. Is there something else I can help you with?';
        }
      }
    }

    // Add general support options
    if (actionable_items.length === 0) {
      actionable_items = [
        'Check booking status and reports',
        'Reschedule or cancel appointments', 
        'Book additional tests',
        'Get information about our services'
      ];
    }

    console.log('✅ Generated customer support response for returning customer');

    return new Response(
      JSON.stringify({
        success: true,
        is_returning_customer: true,
        customer_name: customerProfile?.customer_name || 'Valued Customer',
        total_bookings: totalBookings,
        latest_booking: {
          date: latestBookingDate,
          status: latestStatus,
          booking_id: latestBooking.source === 'booking' ? latestBooking.custom_booking_id : latestBooking.id
        },
        support_message: supportMessage,
        actionable_items,
        call_center_mode: true
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in returning-customer-support:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = /required|empty request|invalid/i.test(msg) ? 400 : 500;
    return new Response(
      JSON.stringify({ 
        success: false,
        error: msg,
        support_message: "I'm having trouble accessing your account information right now. Let me help you with your query anyway. What specific information do you need about your booking or our services?"
      }),
      { 
        status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);