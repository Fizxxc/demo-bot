import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { satskoLog } from '../../../../lib/satsko.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const form = await req.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');

  try {
    const db = supabaseAdmin();
    const { data: user } = await db.from('web_users').select('*').eq('email', email).maybeSingle();
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) throw new Error('email_atau_password_salah');
    if (user.status === 'blocked') throw new Error('akun_diblokir');

    await db.from('web_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
    await createSession(user.id);
    await satskoLog({ userId: user.id, type: 'login', severity: 'success', message: 'Login berhasil.', metadata: { email } });

    let target = '/app';
    if (user.role === 'owner') target = '/console';
    else if (!user.plan_code) target = '/pricing?required=1';

    return NextResponse.redirect(new URL(target, req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/portal/masuk?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
