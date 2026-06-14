import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function ConsoleSupport({ searchParams }) {
  const sp = await searchParams;
  const db = supabaseAdmin();
  const threadId = sp?.thread;
  const { data: threads } = await db.from('live_chat_threads').select('*, web_users(email,name)').order('updated_at', { ascending: false }).limit(30);
  const activeId = threadId || threads?.[0]?.id;
  const { data: messages } = activeId ? await db.from('live_chat_messages').select('*').eq('thread_id', activeId).order('created_at') : { data: [] };
  return (
    <>
      <div className="topbar"><div><h2>Live Chat CS</h2><p>Jika owner tidak balas 1 menit, merchant dapat meminta SATSKO AI menjawab.</p></div></div>
      <div className="grid two">
        <div className="card"><h3>Threads</h3>{(threads || []).map((t) => <p key={t.id}><a className="btn" href={`/console/support?thread=${t.id}`}>{t.web_users?.email} • {t.status}</a></p>)}</div>
        <div className="card"><h3>Chat</h3><div style={{ display:'grid', gap:12 }}>{(messages || []).map((m) => <div key={m.id} className="stat"><b>{m.sender_role}</b><p>{m.message}</p></div>)}</div>{activeId && <form className="form" method="post" action="/api/console/chat/reply" style={{ marginTop:18 }}><input type="hidden" name="threadId" value={activeId}/><textarea className="textarea" name="message" placeholder="Balas sebagai owner" required/><button className="btn primary" type="submit">Kirim Balasan</button></form>}</div>
      </div>
    </>
  );
}
