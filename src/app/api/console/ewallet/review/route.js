import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const owner = await requireOwner();
  const form = await req.formData();
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '') === 'valid' ? 'valid' : 'rejected';
  await supabaseAdmin().from('merchant_ewallets').update({ status, reviewed_by: owner.id, reviewed_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.redirect(new URL('/console/ewallet', req.url));
}
