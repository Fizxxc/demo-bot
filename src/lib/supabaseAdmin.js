import { createClient } from '@supabase/supabase-js';
import { requiredEnv } from './config.js';

let cachedClient;

export function supabaseAdmin() {
  if (!cachedClient) {
    cachedClient = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-application-name': 'tele-auto-order-node' } }
      }
    );
  }

  return cachedClient;
}
