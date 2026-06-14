import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { ownerNotify } from '../../../../../lib/satsko.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const owner = await requireOwner();
  const form = await req.formData();
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '') === 'valid' ? 'valid' : 'rejected';
  try {
    if (!id) throw new Error('ewallet_id_kosong');
    const db = supabaseAdmin();
    const { data: wallet, error: readError } = await db.from('merchant_ewallets').select('*').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!wallet) throw new Error('ewallet_tidak_ditemukan');
    const { error } = await db.from('merchant_ewallets').update({ status, reviewed_by: owner.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await ownerNotify({ userId: wallet.user_id, type: 'ewallet_reviewed', title: `E-Wallet ${status}`, message: `E-wallet ${wallet.provider} ${wallet.account_number} ditandai ${status}.`, metadata: { ewallet_id: id } });
    return NextResponse.redirect(new URL(`/console/ewallet?success=ewallet_${status}`, req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/console/ewallet?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
