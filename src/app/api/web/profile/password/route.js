import { NextResponse } from 'next/server';
import { requireUser, hashPassword, verifyPassword } from '../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { satskoLog } from '../../../../../lib/satsko.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  const form = await req.formData();
  const oldPassword = String(form.get('oldPassword') || '');
  const newPassword = String(form.get('newPassword') || '');
  const confirmPassword = String(form.get('confirmPassword') || '');
  const returnTo = String(form.get('returnTo') || (user.role === 'owner' ? '/console/profile' : '/app/profile'));
  const safeReturnTo = returnTo.startsWith('/console/profile') || returnTo.startsWith('/app/profile') ? returnTo : '/app/profile';

  try {
    if (!verifyPassword(oldPassword, user.password_salt, user.password_hash)) throw new Error('password_lama_salah');
    if (newPassword.length < 8) throw new Error('password_minimal_8_karakter');
    if (newPassword !== confirmPassword) throw new Error('konfirmasi_password_tidak_sama');

    const db = supabaseAdmin();
    if (user.auth_user_id) {
      const { error: authError } = await db.auth.admin.updateUserById(user.auth_user_id, { password: newPassword });
      if (authError) throw authError;
    }

    const { salt, hash } = hashPassword(newPassword);
    const { error } = await db.from('web_users').update({ password_hash: hash, password_salt: salt, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (error) throw error;
    await satskoLog({ userId: user.id, type: 'password_changed', severity: 'success', message: 'Password akun diperbarui.' });
    return NextResponse.redirect(new URL(`${safeReturnTo}?success=password_updated`, req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`${safeReturnTo}?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
