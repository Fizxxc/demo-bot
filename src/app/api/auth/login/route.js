import { NextResponse } from 'next/server';
import { createSession, hashPassword, verifyPassword } from '../../../../lib/auth.js';
import { createOrFindAuthUser } from '../../../../lib/authAdmin.js';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';
import { supabasePublic } from '../../../../lib/supabasePublic.js';
import { satskoLog } from '../../../../lib/satsko.js';

export const runtime = 'nodejs';

function targetAfterLogin(user) {
  if (user.role === 'owner') return '/console';
  if (!user.plan_code) return '/pricing?required=1';
  return '/app';
}

export async function POST(req) {
  const form = await req.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');

  try {
    const db = supabaseAdmin();
    let user = null;
    let authUser = null;

    // Login utama lewat Supabase Auth, supaya akun benar-benar ada di Authentication > Users.
    try {
      const auth = await supabasePublic().auth.signInWithPassword({ email, password });
      if (!auth.error && auth.data?.user) authUser = auth.data.user;
    } catch {
      // Kalau SUPABASE_ANON_KEY belum ada, fallback custom login di bawah tetap jalan.
    }

    if (authUser) {
      const byAuth = await db.from('web_users').select('*').eq('auth_user_id', authUser.id).maybeSingle();
      user = byAuth.data;

      if (!user) {
        const byEmail = await db.from('web_users').select('*').eq('email', email).maybeSingle();
        user = byEmail.data;
        if (user && !user.auth_user_id) {
          await db.from('web_users').update({ auth_user_id: authUser.id }).eq('id', user.id);
          user = { ...user, auth_user_id: authUser.id };
        }
      }
    }

    // Fallback untuk akun lama yang dulu cuma ada di web_users.
    if (!user) {
      const { data: oldUser } = await db.from('web_users').select('*').eq('email', email).maybeSingle();
      if (!oldUser || !verifyPassword(password, oldUser.password_salt, oldUser.password_hash)) throw new Error('email_atau_password_salah');
      user = oldUser;

      // Migrasi otomatis akun lama ke Supabase Auth saat login berhasil.
      if (!user.auth_user_id) {
        const migratedAuth = await createOrFindAuthUser({ email, password, name: user.name, role: user.role });
        await db.from('web_users').update({ auth_user_id: migratedAuth.id }).eq('id', user.id);
        user = { ...user, auth_user_id: migratedAuth.id };
      }
    }

    if (user.status === 'blocked') throw new Error('akun_diblokir');

    // Tetap update hash lokal supaya fallback lama aman.
    const { salt, hash } = hashPassword(password);
    await db.from('web_users').update({ password_hash: hash, password_salt: salt, last_login_at: new Date().toISOString() }).eq('id', user.id);
    await createSession(user.id);
    await satskoLog({ userId: user.id, type: 'login', severity: 'success', message: 'Login berhasil.', metadata: { email, auth_user_id: user.auth_user_id } });

    return NextResponse.redirect(new URL(targetAfterLogin(user), req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/portal/masuk?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
