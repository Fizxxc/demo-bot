import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { askSatskoAI } from '../../../../../lib/huggingface.js';
import { listPlans } from '../../../../../lib/plans.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const threadId = String(form.get('threadId') || '');
  const db = supabaseAdmin();
  const { data: thread } = await db.from('live_chat_threads').select('*').eq('id', threadId).eq('user_id', user.id).maybeSingle();
  if (!thread) return NextResponse.redirect(new URL('/app/support', req.url));
  const { data: messages } = await db.from('live_chat_messages').select('*').eq('thread_id', thread.id).order('created_at', { ascending: false }).limit(5);
  const lastUser = (messages || []).find((m) => m.sender_role === 'merchant');
  if (!lastUser) return NextResponse.redirect(new URL('/app/support', req.url));
  const lastOwnerTime = thread.last_owner_reply_at ? new Date(thread.last_owner_reply_at).getTime() : 0;
  const lastUserTime = new Date(lastUser.created_at).getTime();
  const oneMinutePassed = Date.now() - lastUserTime >= 60 * 1000;
  if (!oneMinutePassed && lastOwnerTime < lastUserTime) {
    // tombol manual tetap boleh memaksa AI, tapi beri jeda kecil supaya tidak spam
  }
  const context = listPlans().map((p) => `${p.name}: harga ${p.price}, benefit ${p.benefits.join(', ')}, limit withdraw ${p.monthlyWithdrawLimit}`).join('\n') + '\nWithdraw hari Sabtu, fee 10%, min 20000, max 1000000 per request. E-wallet: Gopay, Dana, Shopeepay, Ovo. Produk bot auto order Telegram, QRIS Pakasir, Supabase.';
  const answer = await askSatskoAI({ question: lastUser.message, context });
  await db.from('live_chat_messages').insert({ thread_id: thread.id, sender_role: 'ai', message: answer });
  await db.from('live_chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);
  return NextResponse.redirect(new URL('/app/support', req.url));
}
