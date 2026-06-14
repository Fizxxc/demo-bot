import { NextResponse } from 'next/server';
import { createSession, hashPassword } from '../../../../lib/auth.js';
import { createOrFindAuthUser } from '../../../../lib/authAdmin.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { satskoLog, ownerNotify } from '../../../../lib/satsko.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const form = await req.formData();
  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');

  try {
    if (!name || !email || password.length < 8) throw new Error('data_tidak_valid');

    const db = supabaseAdmin();
    const existing = await db.from('web_users').select('*').eq('email', email).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.status === 'blocked') throw new Error('akun_diblokir');
    if (existing.data) throw new Error('email_sudah_terdaftar_silakan_login');

    const isOwner = process.env.PLATFORM_OWNER_EMAIL && email === process.env.PLATFORM_OWNER_EMAIL.toLowerCase();
    const role = isOwner ? 'owner' : 'merchant';

    // Penting: buat user di Supabase Authentication juga,
    // jadi email muncul di Dashboard Supabase > Authentication > Users.
    const authUser = await createOrFindAuthUser({ email, password, name, role });

    const { salt, hash } = hashPassword(password);
    const { data: user, error } = await db.from('web_users').insert({
      auth_user_id: authUser.id,
      name,
      email,
      password_hash: hash,
      password_salt: salt,
      role,
      status: isOwner ? 'active' : 'pending_payment'
    }).select('*').single();
    if (error) throw error;

    const walletResult = await db.from('merchant_wallets').insert({ user_id: user.id });
    if (walletResult.error) console.warn('wallet insert warning:', walletResult.error.message);
    await satskoLog({ userId: user.id, type: 'register', severity: 'success', message: 'Akun baru terdaftar dan tersinkron ke Supabase Auth.', metadata: { email, role: user.role, auth_user_id: authUser.id } });
    if (!isOwner) await ownerNotify({ userId: user.id, type: 'new_register', title: 'Merchant baru daftar', message: `${email} baru mendaftar dan diarahkan ke pricing.` });
    await createSession(user.id);

    return NextResponse.redirect(new URL(isOwner ? '/console' : '/pricing?new=1', req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/portal/daftar?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
