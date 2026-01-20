import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AvailabilityRequest {
  date: string; // YYYY-MM-DD format
  timeSlot?: string; // Optional specific slot to check
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let raw = await req.text();
    console.log('[voice-check-availability] Received request:', raw || '(empty body)', 'CT:', contentType);

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

    const { date, timeSlot } = (payload || {}) as AvailabilityRequest;

    if (!date) {
      return new Response(JSON.stringify({ success: false, error: 'Date is required', availableSlots: [] }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate that the date is not in the past
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot book for past dates',
          availableSlots: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call Google Calendar function to check availability
    const calendarResponse = await fetch(`https://fvsjggfdvkfspapwuish.functions.supabase.co/google-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: timeSlot ? 'check_availability' : 'get_time_slots',
        date,
        timeSlot
      }),
    });

    const calendarData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      throw new Error(calendarData.error || 'Failed to check availability');
    }

    if (timeSlot) {
      // Checking specific slot
      return new Response(
        JSON.stringify({
          success: true,
          date,
          timeSlot,
          available: calendarData.available,
          existingBookings: calendarData.existingBookings,
          maxBookingsPerSlot: calendarData.maxBookingsPerSlot
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Getting all available slots
      return new Response(
        JSON.stringify({
          success: true,
          date,
          availableSlots: calendarData.availableSlots
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in voice-check-availability function:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = /required|empty request|invalid/i.test(msg) ? 400 : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
        availableSlots: []
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);