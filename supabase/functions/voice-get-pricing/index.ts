import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingRequest {
  testIds: string[];
  discountPercentage?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let raw = await req.text();
    console.log('[voice-get-pricing] Received request:', raw || '(empty body)', 'CT:', contentType);

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

    let { testIds, discountPercentage = 0 } = (payload || {}) as PricingRequest & { testIds?: any };

    if (typeof testIds === 'string') {
      // Support comma-separated ids
      testIds = testIds.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Test IDs are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get test details and prices
    const { data: tests, error } = await supabaseClient
      .from('medical_tests')
      .select('id, test_name, customer_price, body_system')
      .in('id', testIds)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching test prices:', error);
      throw new Error('Failed to fetch test pricing information');
    }

    if (!tests || tests.length === 0) {
      throw new Error('No valid tests found for the provided IDs');
    }

    // Calculate total price
    const totalPrice = tests.reduce((sum, test) => sum + parseFloat(test.customer_price.toString()), 0);
    
    // Apply discount (max 25%)
    const validDiscountPercentage = Math.min(25, Math.max(0, discountPercentage));
    const discountAmount = (totalPrice * validDiscountPercentage) / 100;
    const finalAmount = totalPrice - discountAmount;

    // Format test details for voice response
    const testDetails = tests.map(test => ({
      id: test.id,
      name: test.test_name,
      price: parseFloat(test.customer_price.toString()),
      bodySystem: test.body_system,
      formattedPrice: `₹${test.customer_price}`
    }));

    return new Response(
      JSON.stringify({
        success: true,
        tests: testDetails,
        totalPrice,
        discountPercentage: validDiscountPercentage,
        discountAmount,
        finalAmount,
        formattedTotal: `₹${totalPrice.toLocaleString()}`,
        formattedDiscount: validDiscountPercentage > 0 ? `₹${discountAmount.toLocaleString()}` : null,
        formattedFinal: `₹${finalAmount.toLocaleString()}`,
        testCount: tests.length,
        breakdown: testDetails.map(test => `${test.name}: ${test.formattedPrice}`).join(', ')
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in voice-get-pricing function:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = /required|empty request|invalid/i.test(msg) ? 400 : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
        totalPrice: 0
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);