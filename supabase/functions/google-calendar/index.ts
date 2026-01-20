import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string }>;
}

interface AvailabilityRequest {
  date: string; // YYYY-MM-DD format
  timeSlot: string; // "06:00 AM - 07:00 AM" format
}

interface BookingRequest extends AvailabilityRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  tests: string[];
  bookingId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...data } = await req.json();

    // Get Google Calendar credentials
    const { data: secretData, error: secretError } = await supabaseClient
      .from('vault.secrets')
      .select('secret')
      .eq('name', 'GOOGLE_SERVICE_ACCOUNT_KEY')
      .single();

    if (secretError || !secretData) {
      console.error('Failed to get Google service account key:', secretError);
      throw new Error('Google Calendar credentials not found');
    }

    const serviceAccountKey = JSON.parse(secretData.secret);

    // Get access token for Google Calendar API
    const jwt = await createJWT(serviceAccountKey);
    const accessToken = await getAccessToken(jwt);

    switch (action) {
      case 'check_availability':
        return await checkAvailability(accessToken, data as AvailabilityRequest);
      
      case 'create_booking':
        return await createBooking(accessToken, data as BookingRequest);
      
      case 'get_time_slots':
        return await getAvailableTimeSlots(accessToken, data.date);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in google-calendar function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function createJWT(serviceAccountKey: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccountKey.private_key_id,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m: string) => {
    const replacements: { [key: string]: string } = {'+': '-', '/': '_', '=': ''};
    return replacements[m] || m;
  });
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m: string) => {
    const replacements: { [key: string]: string } = {'+': '-', '/': '_', '=': ''};
    return replacements[m] || m;
  });

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import private key
  const privateKeyPem = serviceAccountKey.private_key;
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[+/=]/g, (m: string) => {
      const replacements: { [key: string]: string } = {'+': '-', '/': '_', '=': ''};
      return replacements[m] || m;
    });

  return `${signatureInput}.${encodedSignature}`;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAccessToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function checkAvailability(accessToken: string, { date, timeSlot }: AvailabilityRequest): Promise<Response> {
  const { startTime, endTime } = parseTimeSlot(date, timeSlot);
  
  // Query existing events in this time slot
  const calendarId = 'primary'; // Use primary calendar
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${startTime}&timeMax=${endTime}&singleEvents=true`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to check availability: ${JSON.stringify(data)}`);
  }

  // Count existing bookings (assume each event represents one booking)
  const existingBookings = data.items?.length || 0;
  const maxBookingsPerSlot = 5; // Allow multiple bookings per hour slot
  const isAvailable = existingBookings < maxBookingsPerSlot;

  return new Response(
    JSON.stringify({ 
      available: isAvailable, 
      existingBookings, 
      maxBookingsPerSlot 
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function createBooking(accessToken: string, bookingData: BookingRequest): Promise<Response> {
  const { startTime, endTime } = parseTimeSlot(bookingData.date, bookingData.timeSlot);
  
  const event: CalendarEvent = {
    summary: `Home Collection - ${bookingData.customerName}`,
    description: `Medical Test Collection\nCustomer: ${bookingData.customerName}\nPhone: ${bookingData.customerPhone}\nTests: ${bookingData.tests.join(', ')}\nBooking ID: ${bookingData.bookingId}`,
    start: {
      dateTime: startTime,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endTime,
      timeZone: 'Asia/Kolkata',
    },
  };

  if (bookingData.customerEmail) {
    event.attendees = [{ email: bookingData.customerEmail }];
  }

  const calendarId = 'primary';
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${JSON.stringify(data)}`);
  }

  return new Response(
    JSON.stringify({ 
      eventId: data.id, 
      eventUrl: data.htmlLink,
      success: true 
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function getAvailableTimeSlots(accessToken: string, date: string): Promise<Response> {
  const timeSlots = [
    "06:00 AM - 07:00 AM",
    "07:00 AM - 08:00 AM", 
    "08:00 AM - 09:00 AM",
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM"
  ];

  const availableSlots = [];
  
  for (const slot of timeSlots) {
    const { startTime, endTime } = parseTimeSlot(date, slot);
    
    const calendarId = 'primary';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${startTime}&timeMax=${endTime}&singleEvents=true`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      const existingBookings = data.items?.length || 0;
      const maxBookingsPerSlot = 5;
      
      if (existingBookings < maxBookingsPerSlot) {
        availableSlots.push({
          slot,
          availableSpots: maxBookingsPerSlot - existingBookings
        });
      }
    }
  }

  return new Response(
    JSON.stringify({ availableSlots }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function parseTimeSlot(date: string, timeSlot: string) {
  const [startTime, endTime] = timeSlot.split(' - ');
  
  const startDateTime = new Date(`${date} ${convertTo24Hour(startTime)}`);
  const endDateTime = new Date(`${date} ${convertTo24Hour(endTime)}`);
  
  return {
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
  };
}

function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = modifier === 'AM' ? '00' : '12';
  } else if (modifier === 'PM') {
    hours = String(parseInt(hours, 10) + 12);
  }
  
  return `${hours.padStart(2, '0')}:${minutes}:00`;
}

serve(handler);