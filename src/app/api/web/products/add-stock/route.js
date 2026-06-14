import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  if (!user.tenant_id) return NextResponse.redirect(new URL('/app/bot?error=setup_bot_first', req.url));
  const form = await req.formData();
  const productId = String(form.get('productId') || '');
  const text = String(form.get('accounts') || '');
  const { data: product } = await supabaseAdmin().from('products').select('id').eq('tenant_id', user.tenant_id).eq('id', productId).maybeSingle();
  if (!product) return NextResponse.redirect(new URL('/app/products?error=product_not_found', req.url));
  const accounts = text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [username, password, tipe = '', extra = ''] = line.split('|').map((v) => v.trim());
    if (!username || !password) return null;
    return { tenant_id: user.tenant_id, product_id: product.id, username, password, tipe, extra, status: 'available' };
  }).filter(Boolean);
  if (!accounts.length) return NextResponse.redirect(new URL('/app/products?error=no_accounts', req.url));
  await supabaseAdmin().from('product_accounts').insert(accounts);
  return NextResponse.redirect(new URL('/app/products?success=stock_added', req.url));
}
