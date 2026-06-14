import { supabaseAdmin } from './supabaseAdmin.js';

export async function findAuthUserByEmail(email) {
  const target = String(email || '').toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const found = data?.users?.find((user) => String(user.email || '').toLowerCase() === target);
    if (found) return found;
    if (!data?.users || data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

export async function createOrFindAuthUser({ email, password, name, role }) {
  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role }
  });

  if (!error && data?.user) return data.user;

  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
    const existing = await findAuthUserByEmail(email);
    if (existing) return existing;
  }

  throw error || new Error('Gagal membuat Auth user');
}
