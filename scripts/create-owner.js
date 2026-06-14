import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2] || process.env.PLATFORM_OWNER_EMAIL;
const password = process.argv[3] || process.env.PLATFORM_OWNER_PASSWORD;
const name = process.argv[4] || 'Owner';
if (!email || !password) {
  console.error('Usage: node scripts/create-owner.js owner@email.com password "Owner Name"');
  process.exit(1);
}
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
const { data, error } = await db.from('web_users').upsert({
  email: email.toLowerCase(),
  name,
  password_hash: hash,
  password_salt: salt,
  role: 'owner',
  status: 'active'
}, { onConflict: 'email' }).select('id,email,role,status').single();
if (error) throw error;
console.log('Owner ready:', data);
