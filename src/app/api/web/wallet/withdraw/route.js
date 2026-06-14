import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, ownerNotify } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { parseNominal } from '../../../../../lib/money.js';
import { getMonthlyLimit, isWithdrawDay, monthRange, WITHDRAW_FEE_RATE, WITHDRAW_MAX, WITHDRAW_MIN } from '../../../../../lib/walletRules.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const ewalletId = String(form.get('ewalletId') || '');
  const amount = parseNominal(String(form.get('amount') || ''));
  const back = (reason) => NextResponse.redirect(new URL(`/app/wallet?error=${reason}`, req.url));

  if (!isWithdrawDay()) return back('withdraw_hanya_hari_sabtu');
  if (!amount || amount < WITHDRAW_MIN) return back('minimal_20000');
  if (amount > WITHDRAW_MAX) return back('maksimal_1000000');

  const db = supabaseAdmin();
  const { data: ewallet } = await db.from('merchant_ewallets').select('*').eq('id', ewalletId).eq('user_id', user.id).eq('status', 'valid').maybeSingle();
  if (!ewallet) return back('ewallet_belum_valid');

  const { data: wallet } = await db.from('merchant_wallets').select('*').eq('user_id', user.id).maybeSingle();
  if (Number(wallet?.available_balance || 0) < amount) return back('saldo_tidak_cukup');

  const { start, end } = monthRange();
  const { data: monthly } = await db.from('withdrawals').select('amount').eq('user_id', user.id).gte('created_at', start).lt('created_at', end).in('status', ['pending', 'approved', 'paid']);
  const used = (monthly || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
  const limit = getMonthlyLimit(user.plan_code);
  if (used + amount > limit) return back('limit_bulanan_terlampaui');

  const fee = Math.ceil(amount * WITHDRAW_FEE_RATE);
  const net = amount - fee;
  const { data: withdrawal, error } = await db.from('withdrawals').insert({ user_id: user.id, ewallet_id: ewallet.id, amount, service_fee: fee, net_amount: net }).select('*').single();
  if (error) throw error;
  await db.from('merchant_wallets').update({ available_balance: Number(wallet.available_balance) - amount, updated_at: new Date().toISOString() }).eq('user_id', user.id);
  await ownerNotify({ userId: user.id, type: 'withdraw_request', title: 'Withdraw baru', message: `${user.email} mengajukan withdraw ${amount}.`, metadata: { withdrawal_id: withdrawal.id } });
  return NextResponse.redirect(new URL('/app/wallet?success=withdraw_requested', req.url));
}
