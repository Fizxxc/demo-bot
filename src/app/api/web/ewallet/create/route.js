import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, ownerNotify } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const provider = String(form.get('provider') || '').toLowerCase();
  const accountNumber = String(form.get('accountNumber') || '').trim();
  const accountName = String(form.get('accountName') || '').trim();
  if (!['gopay','dana','shopeepay','ovo'].includes(provider)) return NextResponse.redirect(new URL('/app/ewallet?error=provider', req.url));
  const { data, error } = await supabaseAdmin().from('merchant_ewallets').insert({ user_id: user.id, provider, account_number: accountNumber, account_name: accountName }).select('*').single();
  if (error) throw error;
  await ownerNotify({ userId: user.id, type: 'ewallet_review', title: 'E-Wallet perlu validasi', message: `${user.email} menambahkan ${provider}.`, metadata: { ewallet_id: data.id } });
  return NextResponse.redirect(new URL('/app/ewallet?success=submitted', req.url));
}
