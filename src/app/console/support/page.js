import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

function senderLabel(role) {
  if (role === 'owner') return 'Saya';
  if (role === 'ai') return 'SATSKO AI';
  return 'Merchant';
}

export default async function ConsoleSupport({ searchParams }) {
  const sp = await searchParams;
  const db = supabaseAdmin();
  const threadId = sp?.thread;
  const { data: threads } = await db.from('live_chat_threads').select('*, web_users(email,name)').order('updated_at', { ascending: false }).limit(30);
  const activeId = threadId || threads?.[0]?.id;
  const { data: messages } = activeId ? await db.from('live_chat_messages').select('*').eq('thread_id', activeId).order('created_at') : { data: [] };
  const activeThread = (threads || []).find((t) => t.id === activeId);
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Owner Console</p>
          <h2>Live Chat CS</h2>
          <p>Balas merchant dengan tampilan chat dua arah. Balasan owner tampil di kanan.</p>
        </div>
      </div>
      <div className="grid chat-layout">
        <div className="card thread-list">
          <h3>Threads</h3>
          {(threads || []).map((t) => (
            <a key={t.id} className={`thread-item ${t.id === activeId ? 'active' : ''}`} href={`/console/support?thread=${t.id}`}>
              <b>{t.web_users?.name || t.web_users?.email}</b>
              <span>{t.web_users?.email}</span>
              <small>{t.status}</small>
            </a>
          ))}
          {!threads?.length && <p className="muted">Belum ada percakapan.</p>}
        </div>
        <div className="card chat-card">
          <div className="chat-header">
            <div><b>{activeThread?.web_users?.name || 'Pilih thread'}</b><p>{activeThread?.web_users?.email || 'Belum ada chat aktif'}</p></div>
            <span className="pill good">CS mode</span>
          </div>
          <div className="chat-box">
            {(messages || []).map((m) => {
              const mine = m.sender_role === 'owner';
              return (
                <div key={m.id} className={`chat-row ${mine ? 'right' : 'left'}`}>
                  <div className="chat-bubble">
                    <span>{senderLabel(m.sender_role)}</span>
                    <p>{m.message}</p>
                    <small>{new Date(m.created_at).toLocaleString('id-ID')}</small>
                  </div>
                </div>
              );
            })}
            {!messages?.length && <div className="empty-chat">Pilih thread untuk mulai membalas.</div>}
          </div>
          {activeId && (
            <form className="chat-compose" method="post" action="/api/console/chat/reply">
              <input type="hidden" name="threadId" value={activeId} />
              <textarea name="message" placeholder="Balas sebagai owner..." required />
              <button className="btn primary" type="submit">Kirim Balasan</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
