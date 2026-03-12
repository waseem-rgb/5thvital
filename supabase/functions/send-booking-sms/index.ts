import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  scheduledTime?: string;
  scheduledDate?: string;
  testNames?: string[];
  address?: string;
}

function formatPhoneE164India(input: string): string {
  const trimmed = (input || '').trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  // Enhanced E.164 formatting for Indian numbers
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `+91${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  // Default to Indian format with last 10 digits (best-effort)
  return `+91${digitsOnly.slice(-10)}`;
}

async function sendTwilioSms(params: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
  label: string;
}) {
  const { accountSid, authToken, from, to, body, label } = params;

  let attempts = 0;
  let response: Response | undefined;
  let result: any;

  while (attempts < 3) {
    try {
      response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: from,
            To: to,
            Body: body,
          }),
        }
      );

      result = await response.json();

      if (response.ok) {
        console.log(`${label} SMS sent successfully on attempt`, attempts + 1, ':', result.sid);
        return { ok: true as const, sid: result.sid, response, result };
      }

      console.error(`${label} SMS attempt ${attempts + 1} failed:`, result);
      attempts++;
      if (attempts < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`${label} SMS attempt ${attempts + 1} error:`, error);
      attempts++;
      if (attempts < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return { ok: false as const, sid: undefined, response, result };
}

/**
 * Read a setting from the settings table.
 * The settings table stores value as JSONB, which may be a quoted string.
 */
async function getSettingValue(supabase: any, key: string, fallback: string = ''): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) return fallback;

    const val = data.value;
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null && 'value' in val) return String(val.value);
    return String(val);
  } catch {
    return fallback;
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log('SMS function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, customerName, customerPhone, totalAmount, scheduledTime, scheduledDate, testNames, address }: SMSRequest = await req.json();
    console.log('SMS request data:', { bookingId, customerName, customerPhone, totalAmount, scheduledTime, scheduledDate, testNames, address });

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      console.error('Missing Twilio configuration');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = formatPhoneE164India(customerPhone);
    console.log('Phone number formatting:', {
      original: customerPhone,
      digitsOnly: customerPhone.trim().replace(/\D/g, ''),
      formatted: formattedPhone
    });

    // ── CUSTOMER SMS (critical) ─────────────────────────────────

    // Fetch helpline number from settings (fallback to default)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const helplineNumber = await getSettingValue(supabase, 'contact_phone', '+91 8689070763');

    const testsLine = testNames && testNames.length > 0
      ? `\nTests: ${testNames.join(', ')}`
      : '';
    const addressLine = address ? `\nAddress: ${address}` : '';

    let messageBody = `Hi ${customerName}! Your booking is confirmed.\nID: ${bookingId}\nTotal: ₹${totalAmount.toLocaleString()}${testsLine}`;

    if (scheduledDate && scheduledTime) {
      messageBody += `\nCollection: ${scheduledDate} at ${scheduledTime}`;
    } else {
      messageBody += `\nWe'll contact you to schedule home sample collection (6am-11am).`;
    }

    messageBody += `${addressLine}\nHelpline: ${helplineNumber}\n- 5thVital`;

    console.log('Sending SMS to customer:', formattedPhone);

    const customerSend = await sendTwilioSms({
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      from: twilioFromNumber,
      to: formattedPhone,
      body: messageBody,
      label: 'Customer',
    });

    if (!customerSend.ok) {
      const errorInfo = {
        error: `Customer SMS failed: ${customerSend.result?.message || customerSend.result?.detail || 'No response received'}`,
        customerErrorCode: customerSend.result?.code || customerSend.result?.error_code || 'UNKNOWN',
        customerMessage: customerSend.result?.message || customerSend.result?.detail || 'No response received',
        formattedPhone,
        twilioFromNumber,
        customerDetails: customerSend.result,
      };

      console.error('SMS Error Details (customer):', errorInfo);

      return new Response(JSON.stringify(errorInfo), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── ADMIN SMS (non-critical, DB-driven) ─────────────────────

    // Fetch admin phone numbers from settings table
    // Falls back to ADMIN_PHONE_NUMBER env var → then hardcoded default
    const envFallback = Deno.env.get('ADMIN_PHONE_NUMBER') || '+917993448425';
    const adminPhone1Raw = await getSettingValue(supabase, 'admin_notify_phone', envFallback);
    const adminPhone2Raw = await getSettingValue(supabase, 'admin_notify_phone_2', '');

    const adminPhone1 = adminPhone1Raw ? formatPhoneE164India(adminPhone1Raw) : '';
    const adminPhone2 = adminPhone2Raw ? formatPhoneE164India(adminPhone2Raw) : '';

    // Admin alert message — compact, scannable format
    const slotInfo = scheduledDate && scheduledTime
      ? `Slot: ${scheduledDate} ${scheduledTime}`
      : 'Schedule pending';
    const testsInfo = testNames && testNames.length > 0
      ? `\nTests: ${testNames.join(', ')}`
      : '';
    const addrInfo = address ? `\nAddr: ${address}` : '';
    const adminMessageBody = `🔔 New Booking | ${customerName} | ${slotInfo} | ₹${totalAmount.toLocaleString()} | Ph: ${formattedPhone} | ID: ${bookingId}${testsInfo}${addrInfo}`;

    console.log('Admin notify phones:', { adminPhone1, adminPhone2 });

    // Build admin SMS promises
    const adminPromises: Promise<{ label: string; ok: boolean; sid?: string; error?: any }>[] = [];

    if (adminPhone1) {
      adminPromises.push(
        sendTwilioSms({
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          from: twilioFromNumber,
          to: adminPhone1,
          body: adminMessageBody,
          label: 'Admin-1',
        }).then(r => ({ label: 'Admin-1', ok: r.ok, sid: r.sid, error: r.ok ? undefined : r.result }))
      );
    }

    if (adminPhone2) {
      adminPromises.push(
        sendTwilioSms({
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          from: twilioFromNumber,
          to: adminPhone2,
          body: adminMessageBody,
          label: 'Admin-2',
        }).then(r => ({ label: 'Admin-2', ok: r.ok, sid: r.sid, error: r.ok ? undefined : r.result }))
      );
    }

    // Fire all admin SMS in parallel — failures logged, never thrown
    const adminResults = await Promise.allSettled(adminPromises);

    const adminSummary = adminResults.map((r, i) => {
      if (r.status === 'fulfilled') {
        if (!r.value.ok) {
          console.warn(`${r.value.label} SMS failed (non-critical):`, r.value.error);
        }
        return { label: r.value.label, ok: r.value.ok, sid: r.value.sid };
      }
      console.error(`Admin SMS promise ${i} rejected:`, r.reason);
      return { label: `Admin-${i + 1}`, ok: false, sid: undefined };
    });

    return new Response(
      JSON.stringify({
        success: true,
        customerMessageSid: customerSend.sid,
        adminSmsSummary: adminSummary,
        formattedPhone,
        twilioFromNumber,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-booking-sms function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
