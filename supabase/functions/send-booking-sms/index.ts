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

    // Format phone number to E.164 format (ensure it starts with +)
    let formattedPhone = customerPhone.trim().replace(/\D/g, ''); // Remove all non-digits
    
    // Enhanced E.164 formatting for Indian numbers
    if (formattedPhone.length === 10) {
      // Standard 10-digit Indian number
      formattedPhone = '+91' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) {
      // Indian number with leading 0 (remove it)
      formattedPhone = '+91' + formattedPhone.slice(1);
    } else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
      // Indian number with country code but no +
      formattedPhone = '+' + formattedPhone;
    } else if (formattedPhone.length === 13 && formattedPhone.startsWith('91')) {
      // Indian number with country code and extra digit
      formattedPhone = '+91' + formattedPhone.slice(2);
    } else if (formattedPhone.length > 10 && !customerPhone.startsWith('+')) {
      // Extract last 10 digits for Indian format
      formattedPhone = '+91' + formattedPhone.slice(-10);
    } else if (customerPhone.startsWith('+')) {
      // Already in international format
      formattedPhone = customerPhone.trim();
    } else {
      // Default to Indian format with last 10 digits
      formattedPhone = '+91' + formattedPhone.slice(-10);
    }
    
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

    // Manager notification number
    const managerPhone = '+917993448425';
    
    // Manager message body
    const managerMessageBody = `New booking received! Customer: ${customerName} (${formattedPhone}). Total: ₹${totalAmount.toLocaleString()}. ${scheduledDate && scheduledTime ? `Scheduled: ${scheduledDate} at ${scheduledTime}` : 'Schedule pending'}. Booking ID: ${bookingId}`;

    console.log('Sending SMS to manager:', managerPhone);
    console.log('Manager message:', managerMessageBody);

    // Send SMS to customer with retry mechanism
    let customerAttempts = 0;
    let customerResponse;
    let customerResult;
    
    while (customerAttempts < 3) {
      try {
        customerResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioFromNumber,
              To: formattedPhone,
              Body: messageBody,
            }),
          }
        );

        customerResult = await customerResponse.json();
        
        if (customerResponse.ok) {
          console.log('Customer SMS sent successfully on attempt', customerAttempts + 1, ':', customerResult.sid);
          break;
        } else {
          console.error(`Customer SMS attempt ${customerAttempts + 1} failed:`, customerResult);
          customerAttempts++;
          if (customerAttempts < 3) {
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`Customer SMS attempt ${customerAttempts + 1} error:`, error);
        customerAttempts++;
        if (customerAttempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Send SMS to manager with retry mechanism
    let managerAttempts = 0;
    let managerResponse;
    let managerResult;
    
    while (managerAttempts < 3) {
      try {
        managerResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioFromNumber,
              To: managerPhone,
              Body: managerMessageBody,
            }),
          }
        );

        managerResult = await managerResponse.json();
        
        if (managerResponse.ok) {
          console.log('Manager SMS sent successfully on attempt', managerAttempts + 1, ':', managerResult.sid);
          break;
        } else {
          console.error(`Manager SMS attempt ${managerAttempts + 1} failed:`, managerResult);
          managerAttempts++;
          if (managerAttempts < 3) {
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`Manager SMS attempt ${managerAttempts + 1} error:`, error);
        managerAttempts++;
        if (managerAttempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Check if either SMS failed
    const customerFailed = !customerResponse || !customerResponse.ok;
    const managerFailed = !managerResponse || !managerResponse.ok;

    if (customerFailed || managerFailed) {
      let errorMessages = [];
      
      if (customerFailed) {
        console.error('Customer SMS failed. Final result:', customerResult);
        errorMessages.push(`Customer SMS failed: ${customerResult?.message || customerResult?.detail || 'No response received'}`);
      }
      
      if (managerFailed) {
        console.error('Manager SMS failed. Final result:', managerResult);
        errorMessages.push(`Manager SMS failed: ${managerResult?.message || managerResult?.detail || 'No response received'}`);
      }
      
      // Extract meaningful error information
      const errorInfo = {
        error: errorMessages.join('; '),
        customerErrorCode: customerResult?.code || customerResult?.error_code || 'UNKNOWN',
        managerErrorCode: managerResult?.code || managerResult?.error_code || 'UNKNOWN',
        customerMessage: customerResult?.message || customerResult?.detail || 'No response received',
        managerMessage: managerResult?.message || managerResult?.detail || 'No response received',
        formattedPhone: formattedPhone,
        managerPhone: managerPhone,
        twilioFromNumber: twilioFromNumber,
        customerDetails: customerResult,
        managerDetails: managerResult
      };
      
      console.error('SMS Error Details:', errorInfo);
      
      return new Response(
        JSON.stringify(errorInfo),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Both SMS messages sent successfully');
    console.log('Customer SMS Response:', {
      sid: customerResult.sid,
      status: customerResult.status,
      to: customerResult.to,
      from: customerResult.from
    });
    console.log('Manager SMS Response:', {
      sid: managerResult.sid,
      status: managerResult.status,
      to: managerResult.to,
      from: managerResult.from
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        customerMessageSid: customerResult.sid,
        managerMessageSid: managerResult.sid,
        formattedPhone: formattedPhone,
        managerPhone: managerPhone,
        twilioFromNumber: twilioFromNumber
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