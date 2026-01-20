import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  limit?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let raw = await req.text();
    console.log('[voice-search-tests] Received request:', raw || '(empty body)', 'CT:', contentType);

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

    const { query, limit = 10 } = (payload || {}) as SearchRequest;

    if (!query) {
      return new Response(JSON.stringify({ success: false, error: 'Search query is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Enhanced search: by name, description, body system, test_code, profile_name with query normalization
    const rawQuery = String(query || '').trim();
    const normalized = rawQuery
      .toLowerCase()
      .replace(/\s+/g, ' ') // collapse spaces
      .replace(/[^a-z0-9\s]/g, ''); // strip punctuation

    // Simple alias map for common user phrasing
    const aliases: Record<string, string[]> = {
      'lft': ['liver function test', 'liver function'],
      'liver function': ['liver function test', 'lft'],
      'cbc': ['complete blood count'],
      'blood sugar': ['fasting blood sugar', 'fbs', 'glucose'],
    };

    const expansions = new Set<string>([rawQuery, normalized]);
    if (aliases[normalized]) {
      for (const a of aliases[normalized]) expansions.add(a);
    }

    const ors: string[] = [];
    const profileOrs: string[] = [];
    for (const q of expansions) {
      const escaped = q.replace(/,/g, ''); // commas break the or() syntax
      // Tests search fields
      ors.push(`test_name.ilike.%${escaped}%`);
      ors.push(`description.ilike.%${escaped}%`);
      ors.push(`body_system.ilike.%${escaped}%`);
      ors.push(`test_code.ilike.%${escaped}%`);
      ors.push(`profile_name.ilike.%${escaped}%`);
      // Attempt array contains match for synonyms when token has no spaces
      if (!/\s/.test(escaped) && escaped.length > 0) {
        ors.push(`synonyms.cs.{${escaped}}`);
        ors.push(`synonyms.cs.{${escaped.toUpperCase()}}`);
      }
      // Profiles search fields
      profileOrs.push(`profile_name.ilike.%${escaped}%`);
      profileOrs.push(`description.ilike.%${escaped}%`);
      profileOrs.push(`category.ilike.%${escaped}%`);
    }

    console.log('[voice-search-tests] Incoming query:', { rawQuery, normalized, expansions: Array.from(expansions), limit });

    const { data: tests, error } = await supabaseClient
      .from('medical_tests')
      .select('id, test_name, customer_price, body_system, description, test_code, profile_name')
      .eq('is_active', true)
      .or(ors.join(','))
      .limit(limit);

    console.log('[voice-search-tests] Found tests:', tests?.length || 0);

    if (error) {
      console.error('Error searching tests:', error);
      throw new Error('Failed to search medical tests');
    }

    // Also search health profiles (packages) so LFT-like profiles are returned
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('health_profiles')
      .select('id, profile_name, customer_price, description, category')
      .eq('is_active', true)
      .or(profileOrs.join(','))
      .limit(limit);

    console.log('[voice-search-tests] Found profiles:', profiles?.length || 0);

    if (profilesError) {
      console.error('Error searching health profiles:', profilesError);
      // Don't throw – still return tests if available
    }

    // Format results for voice agent (unified shape)
    const formattedTests = (tests || []).map(test => ({
      id: test.id,
      type: 'test',
      name: test.test_name,
      price: test.customer_price,
      bodySystem: test.body_system,
      description: test.description
    }));

    const formattedProfiles = (profiles || []).map(p => ({
      id: p.id,
      type: 'profile',
      name: p.profile_name,
      price: p.customer_price,
      bodySystem: p.category, // reuse field for display in UI
      description: p.description
    }));

    const combined = [...formattedTests, ...formattedProfiles];
    const limited = combined.slice(0, limit);

    return new Response(
      JSON.stringify({
        success: true,
        tests: limited, // keep key name for compatibility with client
        totalFound: combined.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in voice-search-tests function:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = /required|empty request|invalid/i.test(msg) ? 400 : 500;
    return new Response(
      JSON.stringify({
        success: false, 
        error: msg
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);