import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import AutoAiReply from './AutoAiReply.js';

export default async function SupportPage() {
  const user = await requireUser();
  const db = supabaseAdmin();
  let { data: thread } = await db.from('live_chat_threads').select('*').eq('user_id', user.id).eq('status', 'open').maybeSingle();
  if (!thread) {
    const created = await db.from('live_chat_threads').insert({ user_id: user.id }).select('*').single();
    thread = created.data;
  }
  const { data: messages } = await db.from('live_chat_messages').select('*').eq('thread_id', thread.id).order('created_at');
  const lastUser = [...(messages || [])].reverse().find((m) => m.sender_role === 'merchant');
  const lastOwnerOrAi = [...(messages || [])].reverse().find((m) => m.sender_role === 'owner' || m.sender_role === 'ai');
  const shouldAutoAi = Boolean(lastUser && (!lastOwnerOrAi || new Date(lastOwnerOrAi.created_at) < new Date(lastUser.created_at)));
  return (
    <>
      <div className="topbar"><div><h2>Live Chat CS</h2><p>Owner akan membalas. Jika 1 menit belum ada balasan, SATSKO AI akan membantu menjawab.</p></div></div>
      <div className="card">
        <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>{(messages || []).map((m) => <div key={m.id} className="stat"><b>{m.sender_role === 'ai' ? 'SATSKO AI' : m.sender_role}</b><p>{m.message}</p></div>)}</div>
        <form className="form" method="post" action="/api/web/chat/send"><input type="hidden" name="threadId" value={thread.id} /><textarea className="textarea" name="message" placeholder="Tulis pertanyaan kamu..." required /><button className="btn primary" type="submit">Kirim</button></form>
        <form method="post" action="/api/web/chat/ai-reply" style={{ marginTop: 10 }}><input type="hidden" name="threadId" value={thread.id} /><button className="btn" type="submit">Minta SATSKO jawab sekarang</button></form><AutoAiReply threadId={thread.id} shouldRun={shouldAutoAi} />
      </div>
    </>
  );
}
