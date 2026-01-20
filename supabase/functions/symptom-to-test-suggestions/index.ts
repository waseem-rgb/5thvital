import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SymptomRequest {
  symptoms: string;
  customer_name?: string;
  phone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, customer_name, phone }: SymptomRequest = await req.json();

    if (!symptoms) {
      return new Response(
        JSON.stringify({ error: 'Symptoms are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Analyzing symptoms:', symptoms);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get available medical tests from Supabase
    const { data: tests, error: testsError } = await supabase
      .from('medical_tests')
      .select('id, test_name, test_code, description, body_system, customer_price')
      .eq('is_active', true);

    if (testsError) {
      console.error('Error fetching tests:', testsError);
      throw new Error('Failed to fetch available tests');
    }

    // Create context about available tests for AI
    const testsContext = tests?.map(test => 
      `${test.test_name} (${test.test_code}): ${test.description} - Body System: ${test.body_system} - Price: ₹${test.customer_price}`
    ).join('\n') || '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a medical laboratory assistant for Shendetlabs, named ZARA. Based on symptoms described by customers, suggest relevant medical tests from our available catalog.

IMPORTANT GUIDELINES:
- Never provide medical diagnosis or advice
- Always recommend consulting a doctor
- Only suggest tests from our available catalog
- Be helpful and reassuring
- Explain why each test might be relevant
- Mention that tests should be done under medical supervision

Available Tests Catalog:
${testsContext}

Format your response as a friendly medical assistant explaining which tests might be helpful and why, always emphasizing the need for medical consultation.`
          },
          {
            role: 'user',
            content: `A customer ${customer_name ? `named ${customer_name}` : ''} is describing these symptoms: "${symptoms}". What medical tests from our catalog would you suggest they consider, and why? Please be helpful but emphasize they should consult their doctor.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices[0].message.content;

    // Extract test names mentioned to get actual test IDs
    const suggestedTestIds: string[] = [];
    const suggestedTests = tests?.filter(test => {
      const testMentioned = suggestions.toLowerCase().includes(test.test_name.toLowerCase()) ||
                           (test.test_code && suggestions.toLowerCase().includes(test.test_code.toLowerCase()));
      if (testMentioned) {
        suggestedTestIds.push(test.id);
      }
      return testMentioned;
    }) || [];

    console.log('✅ Generated test suggestions for symptoms:', symptoms);

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        suggested_tests: suggestedTests,
        suggested_test_ids: suggestedTestIds,
        disclaimer: "These are general test suggestions based on your symptoms. Please consult with your doctor for proper medical advice and diagnosis."
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in symptom-to-test-suggestions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: "I'm sorry, I'm having trouble analyzing symptoms right now. Please describe your health concerns and I'll help you find the right tests, or consult with your doctor for medical advice."
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);