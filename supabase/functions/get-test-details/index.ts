import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestDetailsRequest {
  test_name?: string;
  test_code?: string;
  test_ids?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Get test details function called');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { test_name, test_code, test_ids }: TestDetailsRequest = await req.json().catch(() => ({}));
    
    let query = supabase
      .from('medical_tests')
      .select('*')
      .eq('is_active', true);
    
    if (test_ids && test_ids.length > 0) {
      query = query.in('id', test_ids);
    } else if (test_code) {
      query = query.eq('test_code', test_code);
    } else if (test_name) {
      query = query.or(`test_name.ilike.%${test_name}%,synonyms.cs.{${test_name}}`);
    }
    
    const { data: tests, error } = await query.limit(20);
    
    if (error) {
      throw new Error(`Error fetching test details: ${error.message}`);
    }

    // Calculate total pricing if multiple tests
    let totalPrice = 0;
    if (tests && tests.length > 0) {
      totalPrice = tests.reduce((sum, test) => sum + (test.customer_price || 0), 0);
    }

    const response = {
      success: true,
      data: {
        tests: tests || [],
        total_tests: tests?.length || 0,
        total_price: totalPrice,
        currency: 'INR'
      },
      message: tests && tests.length > 0 
        ? `Found ${tests.length} test(s). Total price: ₹${totalPrice}`
        : 'No tests found matching your criteria'
    };

    console.log('Test details response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-test-details function:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Sorry, I could not retrieve the test details at this time.'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});