import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, ownerNotify } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';
import { askSatskoAI } from '../../../../../lib/huggingface.js';
import { listPlans } from '../../../../../lib/plans.js';

export const runtime = 'nodejs';

function safeReturnPath(path) {
  const value = String(path || '/app/support');
  if (value.startsWith('/app') || value.startsWith('/billing') || value.startsWith('/pricing')) return value;
  return '/app/support';
}

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const message = String(form.get('message') || '').trim();
  const returnTo = safeReturnPath(form.get('returnTo'));
  if (!message) return NextResponse.redirect(new URL(`${returnTo}?error=message_empty`, req.url));

  const db = supabaseAdmin();
  let { data: thread } = await db.from('live_chat_threads').select('*').eq('user_id', user.id).eq('status', 'open').maybeSingle();
  if (!thread) {
    const created = await db.from('live_chat_threads').insert({ user_id: user.id }).select('*').single();
    thread = created.data;
  }

  await db.from('live_chat_messages').insert({ thread_id: thread.id, sender_role: 'merchant', message });
  await db.from('live_chat_threads').update({ last_user_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', thread.id);

  const context = listPlans().map((p) => `${p.name}: harga ${p.price}, benefit ${p.benefits.join(', ')}, limit withdraw ${p.monthlyWithdrawLimit}`).join('\n') + '\nWithdraw hari Sabtu, fee 10%, min 20000, max 1000000 per request. E-wallet: Gopay, Dana, Shopeepay, Ovo. Produk bot auto order Telegram, QRIS Pakasir, Supabase.';
  const answer = await askSatskoAI({ question: message, context });
  await db.from('live_chat_messages').insert({ thread_id: thread.id, sender_role: 'ai', message: answer });
  await db.from('live_chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);
  await ownerNotify({ userId: user.id, type: 'help_widget_message', title: 'Pertanyaan Help Widget', message: `${user.email}: ${message.slice(0, 120)}`, metadata: { thread_id: thread.id } });

  return NextResponse.redirect(new URL(`${returnTo}?success=satsko_answered`, req.url));
}
