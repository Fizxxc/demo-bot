import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const email = (process.argv[2] || '').toLowerCase();
const password = process.argv[3] || '';
if (!email || !password) {
  console.error('Usage: node scripts/sync-auth-user.js user@email.com passwordBaru');
  process.exit(1);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: webUser, error: webError } = await db.from('web_users').select('*').eq('email', email).maybeSingle();
if (webError) throw webError;
if (!webUser) throw new Error('Email tidak ada di web_users');

let authUser = null;
const created = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: webUser.name, role: webUser.role }
});
if (created.data?.user) authUser = created.data.user;
if (created.error) {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  authUser = data?.users?.find((u) => String(u.email || '').toLowerCase() === email);
}
if (!authUser) throw created.error || new Error('Gagal membuat/menemukan Supabase Auth user');

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
const { data: updated, error } = await db.from('web_users').update({
  auth_user_id: authUser.id,
  password_hash: hash,
  password_salt: salt,
  updated_at: new Date().toISOString()
}).eq('id', webUser.id).select('id,email,auth_user_id,status,role').single();
if (error) throw error;
console.log('Synced:', updated);
