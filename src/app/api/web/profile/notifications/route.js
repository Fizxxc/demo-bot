import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  const form = await req.formData();
  const enabled = form.get('enabled') === '1';
  const returnTo = String(form.get('returnTo') || (user.role === 'owner' ? '/console/profile' : '/app/profile'));
  const safeReturnTo = returnTo.startsWith('/console/profile') || returnTo.startsWith('/app/profile') ? returnTo : '/app/profile';
  const { error } = await supabaseAdmin().from('web_users').update({ notifications_enabled: enabled, updated_at: new Date().toISOString() }).eq('id', user.id);
  const target = error ? `${safeReturnTo}?error=${encodeURIComponent(error.message)}` : `${safeReturnTo}?success=notifications_saved`;
  return NextResponse.redirect(new URL(target, req.url));
}
