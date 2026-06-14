import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.js';
import { guardMerchantPlan, ownerNotify } from '../../../../../lib/satsko.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await requireUser();
  await guardMerchantPlan(user);
  const form = await req.formData();
  const threadId = String(form.get('threadId') || '');
  const message = String(form.get('message') || '').trim();
  if (!message) return NextResponse.redirect(new URL('/app/support', req.url));
  const db = supabaseAdmin();
  const { data: thread } = await db.from('live_chat_threads').select('*').eq('id', threadId).eq('user_id', user.id).maybeSingle();
  if (!thread) return NextResponse.redirect(new URL('/app/support', req.url));
  await db.from('live_chat_messages').insert({ thread_id: thread.id, sender_role: 'merchant', message });
  await db.from('live_chat_threads').update({ last_user_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', thread.id);
  await ownerNotify({ userId: user.id, type: 'chat_message', title: 'Pesan live chat baru', message: `${user.email}: ${message.slice(0, 120)}`, metadata: { thread_id: thread.id } });
  return NextResponse.redirect(new URL('/app/support', req.url));
}
