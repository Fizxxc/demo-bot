import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/auth.js';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin.js';

export const runtime = 'nodejs';

export async function POST(req) {
  await requireOwner();
  const form = await req.formData();
  const threadId = String(form.get('threadId') || '');
  const message = String(form.get('message') || '').trim();
  if (message) {
    await supabaseAdmin().from('live_chat_messages').insert({ thread_id: threadId, sender_role: 'owner', message });
    await supabaseAdmin().from('live_chat_threads').update({ last_owner_reply_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', threadId);
  }
  return NextResponse.redirect(new URL(`/console/support?thread=${threadId}`, req.url));
}
