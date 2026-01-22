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

const handler = async (req: Request): Promise<Response> => {
  console.log('SMS function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, customerName, customerPhone, totalAmount, scheduledTime, scheduledDate }: SMSRequest = await req.json();
    console.log('SMS request data:', { bookingId, customerName, customerPhone, totalAmount, scheduledTime, scheduledDate });

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

    console.log('SMS request data:', { bookingId, customerName, customerPhone, totalAmount, scheduledTime, scheduledDate });

    const formattedPhone = formatPhoneE164India(customerPhone);
    console.log('Phone number formatting:', {
      original: customerPhone,
      digitsOnly: customerPhone.trim().replace(/\D/g, ''),
      formatted: formattedPhone
    });

    let messageBody = `Hi ${customerName}! Your medical test booking has been confirmed. Total: ₹${totalAmount.toLocaleString()}.`;
    
    if (scheduledDate && scheduledTime) {
      messageBody += ` Home collection scheduled on ${scheduledDate} at ${scheduledTime}.`;
    } else {
      messageBody += ` We'll contact you soon to schedule home sample collection (6am-11am).`;
    }
    
    messageBody += ` Booking ID: ${bookingId}`;

    console.log('Sending SMS to customer:', formattedPhone);
    console.log('Customer message:', messageBody);

    // Manager/admin notification number (configurable via backend secret)
    const managerPhoneRaw = Deno.env.get('ADMIN_PHONE_NUMBER') || '+917993448425';
    const managerPhone = formatPhoneE164India(managerPhoneRaw);
    
    // Manager message body
    const managerMessageBody = `New booking received! Customer: ${customerName} (${formattedPhone}). Total: ₹${totalAmount.toLocaleString()}. ${scheduledDate && scheduledTime ? `Scheduled: ${scheduledDate} at ${scheduledTime}` : 'Schedule pending'}. Booking ID: ${bookingId}`;

    console.log('Sending SMS to manager:', managerPhone);
    console.log('Manager message:', managerMessageBody);

    // Send SMS to customer (critical)
    const customerSend = await sendTwilioSms({
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      from: twilioFromNumber,
      to: formattedPhone,
      body: messageBody,
      label: 'Customer',
    });

    // Send SMS to manager/admin (non-critical)
    const managerSend = await sendTwilioSms({
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      from: twilioFromNumber,
      to: managerPhone,
      body: managerMessageBody,
      label: 'Manager',
    });

    if (!customerSend.ok) {
      const errorInfo = {
        error: `Customer SMS failed: ${customerSend.result?.message || customerSend.result?.detail || 'No response received'}`,
        customerErrorCode: customerSend.result?.code || customerSend.result?.error_code || 'UNKNOWN',
        customerMessage: customerSend.result?.message || customerSend.result?.detail || 'No response received',
        formattedPhone,
        managerPhone,
        twilioFromNumber,
        customerDetails: customerSend.result,
      };

      console.error('SMS Error Details (customer):', errorInfo);

      return new Response(JSON.stringify(errorInfo), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!managerSend.ok) {
      console.warn('Manager/admin SMS failed (non-critical).', {
        managerPhone,
        managerDetails: managerSend.result,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        customerMessageSid: customerSend.sid,
        managerMessageSid: managerSend.sid,
        managerSmsSent: managerSend.ok,
        managerError: managerSend.ok
          ? null
          : {
              code: managerSend.result?.code || managerSend.result?.error_code || 'UNKNOWN',
              message: managerSend.result?.message || managerSend.result?.detail || 'No response received',
            },
        formattedPhone,
        managerPhone,
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