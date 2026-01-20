import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomerRequest {
  phone: string;
  action: 'get_history' | 'save_preferences' | 'get_profile';
  customer_name?: string;
  preferences?: any;
  customer_email?: string;
  address?: string;
  age?: number;
  gender?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: CustomerRequest = await req.json();
    
    console.log('Customer profile request:', requestData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, action, customer_name, preferences, customer_email, address, age, gender } = requestData;

    if (!phone) {
      throw new Error('Phone number is required');
    }

    switch (action) {
      case 'get_profile':
      case 'get_history': {
        // Get customer profile
        const { data: profile, error: profileError } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('phone', phone)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching customer profile:', profileError);
          throw new Error('Failed to fetch customer profile');
        }

        // Get booking history
        const { data: bookingHistory, error: historyError } = await supabase
          .from('voice_bookings')
          .select(`
            *,
            booking_id
          `)
          .eq('phone', phone)
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyError) {
          console.error('Error fetching booking history:', historyError);
          // Don't throw error, just log it
        }

        // Get regular bookings as well
        const { data: regularBookings, error: regularError } = await supabase
          .from('bookings')
          .select(`
            id,
            customer_name,
            total_amount,
            final_amount,
            status,
            preferred_date,
            preferred_time,
            created_at
          `)
          .eq('customer_phone', phone)
          .order('created_at', { ascending: false })
          .limit(10);

        if (regularError) {
          console.error('Error fetching regular bookings:', regularError);
        }

        const isReturningCustomer = profile !== null || (bookingHistory && bookingHistory.length > 0) || (regularBookings && regularBookings.length > 0);

        return new Response(JSON.stringify({
          success: true,
          is_returning_customer: isReturningCustomer,
          profile: profile || null,
          voice_booking_history: bookingHistory || [],
          regular_booking_history: regularBookings || [],
          total_bookings: (profile?.total_bookings || 0) + (bookingHistory?.length || 0) + (regularBookings?.length || 0),
          summary: isReturningCustomer ? 
            `Welcome back${profile?.customer_name ? `, ${profile.customer_name}` : ''}! You have ${(bookingHistory?.length || 0) + (regularBookings?.length || 0)} previous bookings with us.` :
            'New customer - no previous booking history found.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'save_preferences': {
        // Update or create customer profile
        const profileData: any = {
          phone,
          updated_at: new Date().toISOString()
        };

        if (customer_name) profileData.customer_name = customer_name;
        if (customer_email) profileData.customer_email = customer_email;
        if (address) profileData.address = address;
        if (age) profileData.age = age;
        if (gender) profileData.gender = gender;
        if (preferences) {
          profileData.preferences = preferences;
        }

        const { data: updatedProfile, error: updateError } = await supabase
          .from('customer_profiles')
          .upsert(profileData, {
            onConflict: 'phone',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (updateError) {
          console.error('Error updating customer profile:', updateError);
          throw new Error('Failed to update customer profile');
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Customer preferences saved successfully',
          profile: updatedProfile
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action specified');
    }

  } catch (error: any) {
    console.error('Error in manage-customer-profile function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);