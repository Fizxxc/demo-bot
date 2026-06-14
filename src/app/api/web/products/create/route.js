import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { parseNominal } from '../../../../../lib/money.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  if (!user.tenant_id) return NextResponse.redirect(new URL('/app/bot?error=setup_bot_first', req.url));
  const form = await req.formData();
  const code = String(form.get('code') || '').trim().replace(/\s+/g, '').toUpperCase();
  const name = String(form.get('name') || '').trim();
  const price = parseNominal(String(form.get('price') || ''));
  const description = String(form.get('description') || '').trim();
  if (!code || !name || !price) return NextResponse.redirect(new URL('/app/products?error=invalid', req.url));
  await supabaseAdmin().from('products').insert({ tenant_id: user.tenant_id, code, name, price, description, is_active: true });
  return NextResponse.redirect(new URL('/app/products?success=created', req.url));
}
