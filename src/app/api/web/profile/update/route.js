import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { satskoLog } from '../../../../../lib/satsko.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  const form = await req.formData();
  const name = String(form.get('name') || '').trim();
  const returnTo = String(form.get('returnTo') || (user.role === 'owner' ? '/console/profile' : '/app/profile'));
  const safeReturnTo = returnTo.startsWith('/console/profile') || returnTo.startsWith('/app/profile') ? returnTo : '/app/profile';

  try {
    if (!name || name.length < 2) throw new Error('nama_minimal_2_karakter');
    const { error } = await supabaseAdmin().from('web_users').update({ name, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (error) throw error;
    await satskoLog({ userId: user.id, type: 'profile_updated', severity: 'success', message: 'Profil akun diperbarui.' });
    return NextResponse.redirect(new URL(`${safeReturnTo}?success=profile_updated`, req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`${safeReturnTo}?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
