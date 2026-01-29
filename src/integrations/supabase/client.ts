import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// Support both VITE_SUPABASE_ANON_KEY (standard) and VITE_SUPABASE_PUBLISHABLE_KEY (legacy)
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Check for missing environment variables
const missingEnvVars: string[] = [];
if (!SUPABASE_URL) missingEnvVars.push('VITE_SUPABASE_URL');
if (!SUPABASE_ANON_KEY) missingEnvVars.push('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = missingEnvVars.length === 0;

// Log clear error message if env vars are missing
if (!isSupabaseConfigured) {
  console.error(
    `[Supabase Config Error] Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
    `Please set these in your Vercel project settings or .env file.`
  );
}

// Create a placeholder client that will fail gracefully instead of throwing immediately
// This allows the app to render an error page instead of crashing
let supabase: SupabaseClient<Database>;

if (isSupabaseConfigured) {
  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
} else {
  // Create a minimal mock client that won't crash but will fail gracefully on use
  // Using a proxy to catch any method calls and return appropriate error responses
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Return a function that returns a rejected promise or another proxy for chaining
      if (prop === 'from' || prop === 'functions' || prop === 'auth' || prop === 'storage') {
        return new Proxy({}, handler);
      }
      if (prop === 'invoke' || prop === 'select' || prop === 'insert' || prop === 'update' || prop === 'delete' || 
          prop === 'signInWithPassword' || prop === 'signUp' || prop === 'signOut' || prop === 'getSession' ||
          prop === 'onAuthStateChange') {
        return (..._args: unknown[]) => {
          if (prop === 'onAuthStateChange') {
            // Return subscription-like object
            return { data: { subscription: { unsubscribe: () => {} } } };
          }
          return Promise.resolve({ 
            data: null, 
            error: { message: 'Supabase is not configured. Missing environment variables.' } 
          });
        };
      }
      return new Proxy({}, handler);
    }
  };
  
  supabase = new Proxy({}, handler) as unknown as SupabaseClient<Database>;
}

export { supabase };
export { missingEnvVars };
