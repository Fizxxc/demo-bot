import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import AutoAiReply from './AutoAiReply.js';

function senderLabel(role) {
  if (role === 'ai') return 'SATSKO AI';
  if (role === 'owner') return 'CS Kograph';
  return 'Saya';
}

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
      <div className="topbar">
        <div>
          <p className="eyebrow">Support Room</p>
          <h2>Live Chat CS</h2>
          <p>Chat dengan owner. Kalau belum dibalas, SATSKO AI bisa membantu menjawab pertanyaan umum.</p>
        </div>
        <a className="btn" href="https://t.me/Cs_Kograph" target="_blank" rel="noreferrer">Telegram @Cs_Kograph</a>
      </div>
      <div className="card chat-card">
        <div className="chat-header">
          <div><b>CS Kograph</b><p>Biasanya membalas secepat mungkin</p></div>
          <span className="pill good">online</span>
        </div>
        <div className="chat-box">
          {(messages || []).map((m) => {
            const mine = m.sender_role === 'merchant';
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
          {!messages?.length && <div className="empty-chat">Mulai chat dengan CS Kograph. Tanyakan tentang bot, pembayaran, withdraw, atau fitur dashboard.</div>}
        </div>
        <form className="chat-compose" method="post" action="/api/web/chat/send">
          <input type="hidden" name="threadId" value={thread.id} />
          <textarea name="message" placeholder="Tulis pesan kamu..." required />
          <button className="btn primary" type="submit">Kirim</button>
        </form>
        <form method="post" action="/api/web/chat/ai-reply" style={{ marginTop: 10 }}>
          <input type="hidden" name="threadId" value={thread.id} />
          <button className="btn" type="submit">Minta SATSKO jawab sekarang</button>
        </form>
        <AutoAiReply threadId={thread.id} shouldRun={shouldAutoAi} />
      </div>
    </>
  );
}
