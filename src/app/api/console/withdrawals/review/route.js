import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const owner = await requireOwner();
  const form = await req.formData();
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '') === 'approved' ? 'approved' : 'rejected';
  const db = supabaseAdmin();
  const { data: w } = await db.from('withdrawals').select('*').eq('id', id).maybeSingle();
  if (w?.status === 'pending') {
    await db.from('withdrawals').update({ status, reviewed_by: owner.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (status === 'rejected') {
      const { data: wallet } = await db.from('merchant_wallets').select('*').eq('user_id', w.user_id).maybeSingle();
      await db.from('merchant_wallets').update({ available_balance: Number(wallet?.available_balance || 0) + Number(w.amount || 0), updated_at: new Date().toISOString() }).eq('user_id', w.user_id);
    }
  }
  return NextResponse.redirect(new URL('/console/withdrawals', req.url));
}
