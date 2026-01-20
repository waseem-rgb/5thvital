import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PatientLogRequest {
  action: 'store' | 'retrieve';
  phone?: string;
  customer_name?: string;
  customer_email?: string;
  address?: string;
  age?: number;
  gender?: string;
  test_ids?: string[];
  test_names?: string[];
  preferred_date?: string;
  preferred_time?: string;
  booking_status?: string;
  conversation_id?: string;
  agent_notes?: string;
  total_amount?: number;
  final_amount?: number;
  discount_percentage?: number;
}

const AIRTABLE_BASE_ID = 'appYourAirtableBaseId'; // Replace with actual base ID
const AIRTABLE_TABLE_NAME = 'Patient Logs';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY');
    if (!airtableApiKey) {
      throw new Error('Airtable API key not configured');
    }

    const requestData: PatientLogRequest = await req.json();
    const { action, phone } = requestData;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Airtable patient log action:', action, 'Phone:', phone);

    if (action === 'retrieve') {
      if (!phone) {
        return new Response(
          JSON.stringify({ error: 'Phone number is required for retrieval' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Retrieve patient history from Airtable
      const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=SEARCH("${phone}",{Phone})`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Airtable retrieve error:', response.status, await response.text());
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to retrieve patient history',
            is_returning_customer: false,
            history: []
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const records = data.records || [];
      const isReturningCustomer = records.length > 0;
      
      // Format patient history
      const history = records.map((record: any) => ({
        id: record.id,
        customer_name: record.fields['Customer Name'],
        phone: record.fields['Phone'],
        booking_date: record.fields['Booking Date'],
        test_names: record.fields['Test Names'],
        status: record.fields['Status'],
        total_amount: record.fields['Total Amount'],
        notes: record.fields['Notes']
      }));

      const summary = isReturningCustomer 
        ? `Welcome back! I found ${records.length} previous booking${records.length > 1 ? 's' : ''} for ${phone}. Your last booking was on ${records[0]?.fields['Booking Date'] || 'recent date'}.`
        : `This appears to be your first booking with Shendetlabs. Welcome! I'll help you get started.`;

      console.log('✅ Retrieved patient history:', records.length, 'records');

      return new Response(
        JSON.stringify({
          success: true,
          is_returning_customer: isReturningCustomer,
          total_bookings: records.length,
          history,
          summary
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'store') {
      if (!phone || !requestData.customer_name) {
        return new Response(
          JSON.stringify({ error: 'Phone and customer name are required for storing' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store patient data in Airtable
      const recordData = {
        fields: {
          'Customer Name': requestData.customer_name,
          'Phone': phone,
          'Email': requestData.customer_email || '',
          'Address': requestData.address || '',
          'Age': requestData.age || null,
          'Gender': requestData.gender || '',
          'Test Names': requestData.test_names?.join(', ') || '',
          'Test IDs': requestData.test_ids?.join(', ') || '',
          'Preferred Date': requestData.preferred_date || '',
          'Preferred Time': requestData.preferred_time || '',
          'Status': requestData.booking_status || 'pending',
          'Conversation ID': requestData.conversation_id || '',
          'Notes': requestData.agent_notes || '',
          'Total Amount': requestData.total_amount || 0,
          'Final Amount': requestData.final_amount || 0,
          'Discount %': requestData.discount_percentage || 0,
          'Booking Date': new Date().toISOString().split('T')[0],
          'Created At': new Date().toISOString()
        }
      };

      const storeUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
      
      const response = await fetch(storeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData)
      });

      if (!response.ok) {
        console.error('Airtable store error:', response.status, await response.text());
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to store patient data in log',
            message: 'Your booking will proceed, but we may not be able to save your call history.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      
      console.log('✅ Stored patient data in Airtable:', result.id);

      return new Response(
        JSON.stringify({
          success: true,
          record_id: result.id,
          message: 'Patient information has been logged successfully for future reference.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "store" or "retrieve"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in airtable-patient-log:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Patient log system is temporarily unavailable, but your booking can still proceed.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);