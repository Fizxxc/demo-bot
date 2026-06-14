import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, terminalLog } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const db = supabaseAdmin();
  const { data: wallet } = await db.from('merchant_wallets').select('*').eq('user_id', user.id).maybeSingle();
  const amount = Number(wallet?.merchant_balance || 0);
  if (amount > 0) {
    await db.from('merchant_wallets').update({ merchant_balance: 0, available_balance: Number(wallet.available_balance || 0) + amount, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    await terminalLog({ userId: user.id, tenantId: user.tenant_id, type: 'wallet_settle', severity: 'success', message: `Saldo penjualan ${amount} dicairkan ke saldo akun.` });
  }
  return NextResponse.redirect(new URL('/app/wallet', req.url));
}
