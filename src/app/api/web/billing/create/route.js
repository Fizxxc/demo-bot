import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { getPlan } from '../../../../../lib/plans.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { createPlatformQris, platformOrderId } from '../../../../../lib/platformPayments.js';
import { satskoLog } from '../../../../../lib/satsko.js';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (user.role === 'owner') return NextResponse.redirect(new URL('/console', req.url));
    const form = await req.formData();
    const plan = getPlan(String(form.get('plan') || ''));
    if (!plan) throw new Error('Plan tidak valid');

    const orderId = platformOrderId('PLAN');
    const payment = await createPlatformQris({ orderId, amount: plan.price });

    const { data: purchase, error } = await supabaseAdmin().from('plan_purchases').insert({
      user_id: user.id,
      plan_code: plan.code,
      order_id: orderId,
      amount: plan.price,
      fee: Number(payment.fee || 0),
      total_payment: Number(payment.total_payment || plan.price),
      payment_number: payment.payment_number,
      raw: payment
    }).select('*').single();
    if (error) throw error;

    await satskoLog({ userId: user.id, type: 'plan_invoice_created', message: `Invoice plan ${plan.code} dibuat.` });
    return NextResponse.redirect(new URL(`/billing/invoice/${purchase.id}`, req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/pricing?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
