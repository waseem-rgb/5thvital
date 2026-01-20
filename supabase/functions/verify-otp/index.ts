import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();
    
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if OTP is valid and not expired
    const { data: otpData, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('otp', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpData) {
      console.log('OTP verification failed:', otpError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OTP' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpData.id);

    // Prepare alias email from phone for password auth
    const normalized = String(phone).replace(/[^0-9]/g, '');
    const aliasEmail = `${normalized}@shendetlabs.local`;
    const aliasPassword = `temp_${normalized}`;

    // Ensure a user exists mapped to this phone using an alias email
    let existingUserId: string | null = null;
    const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
    if (!listErr) {
      existingUserId = usersList.users.find(u => u.email === aliasEmail)?.id ?? null;
    }

    if (!existingUserId) {
      // Create the user
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: aliasEmail,
        password: aliasPassword,
        email_confirm: true,
        user_metadata: { phone }
      });
      
      if (createErr) {
        // If the user already exists, continue; otherwise, fail
        const isConflict = String(createErr.message || '').toLowerCase().includes('already') ||
                           String(createErr.status || '').includes('409');
        if (!isConflict) {
          console.error('Create user error:', createErr);
          return new Response(
            JSON.stringify({ error: 'Failed to prepare account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (newUser?.user) {
        // Create profile entry for the new user
        const { error: profileErr } = await supabase
          .from('profiles')
          .insert({
            user_id: newUser.user.id,
            phone: phone
          });
        
        if (profileErr) {
          console.error('Profile creation error:', profileErr);
          // Don't fail the entire flow for profile creation issues
        }
      }
    }

    // Return credentials for client-side sign-in
    return new Response(
      JSON.stringify({ success: true, signIn: { email: aliasEmail, password: aliasPassword } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-otp function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});