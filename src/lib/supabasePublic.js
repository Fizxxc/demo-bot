import { createClient } from '@supabase/supabase-js';
import { requiredEnv } from './config.js';

let cachedClient;

export function supabasePublic() {
  if (!cachedClient) {
    cachedClient = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_ANON_KEY'),
      {
        auth: { persistSession: false, autoRefreshToken: false }
      }
    );
  }
  return cachedClient;
}
