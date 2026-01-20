import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LabInfoRequest {
  query?: string;
  category?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Lab info function called');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { query, category }: LabInfoRequest = await req.json().catch(() => ({}));
    
    // Get health profiles (test packages)
    let profileQuery = supabase
      .from('health_profiles')
      .select('*')
      .eq('is_active', true);
    
    if (category) {
      profileQuery = profileQuery.eq('category', category);
    }
    
    if (query) {
      profileQuery = profileQuery.or(`profile_name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    
    const { data: profiles, error: profileError } = await profileQuery.limit(10);
    
    if (profileError) {
      throw new Error(`Error fetching health profiles: ${profileError.message}`);
    }

    // Get individual medical tests
    let testQuery = supabase
      .from('medical_tests')
      .select('*')
      .eq('is_active', true);
    
    if (query) {
      testQuery = testQuery.or(`test_name.ilike.%${query}%,description.ilike.%${query}%,body_system.ilike.%${query}%`);
    }
    
    const { data: tests, error: testError } = await testQuery.limit(10);
    
    if (testError) {
      throw new Error(`Error fetching medical tests: ${testError.message}`);
    }

    const response = {
      success: true,
      data: {
        health_profiles: profiles || [],
        medical_tests: tests || [],
        total_profiles: profiles?.length || 0,
        total_tests: tests?.length || 0
      },
      message: `Found ${(profiles?.length || 0) + (tests?.length || 0)} lab services matching your query`
    };

    console.log('Lab info response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-lab-info function:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Sorry, I could not retrieve the lab information at this time.'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});