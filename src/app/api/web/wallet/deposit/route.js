import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { parseNominal } from '../../../../../lib/money.js';
import { createPlatformQris, platformOrderId } from '../../../../../lib/platformPayments.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const amount = parseNominal(String(form.get('amount') || ''));
  if (!amount || amount < 10000) return NextResponse.redirect(new URL('/app/wallet?error=min_deposit_10000', req.url));
  const orderId = platformOrderId('MDEP');
  const payment = await createPlatformQris({ orderId, amount });
  const { data: dep, error } = await supabaseAdmin().from('merchant_deposits').insert({
    user_id: user.id,
    order_id: orderId,
    amount,
    fee: Number(payment.fee || 0),
    total_payment: Number(payment.total_payment || amount),
    payment_number: payment.payment_number,
    raw: payment
  }).select('*').single();
  if (error) throw error;
  return NextResponse.redirect(new URL(`/billing/invoice/${dep.id}?type=merchant_deposit`, req.url));
}
