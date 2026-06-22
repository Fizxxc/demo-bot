'use client';
import { useEffect, useState } from 'react';

const PROMPTS = [
  'Kenapa bot Telegram saya tidak respon?',
  'Bagaimana cara validasi e-wallet?',
  'Kenapa QRIS tidak muncul?',
  'Jelaskan aturan withdraw',
  'Bedanya Basic, Plus, dan Promax apa?'
];

export default function HelpWidget({ enabled = false }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(PROMPTS[0]);
  const [returnTo, setReturnTo] = useState('/app/support');

  useEffect(() => {
    setReturnTo(`${window.location.pathname}${window.location.search}`);
  }, []);

  if (!enabled) return null;

  return (
    <div className="help-widget">
      {open && (
        <div className="help-panel">
          <div className="help-panel-head">
            <div>
              <span className="eyebrow">SATSKO Help</span>
              <h3>Butuh bantuan cepat?</h3>
              <p>Pilih prompt atau tulis kendala. SATSKO akan menjawab dan menyimpan ke Live Chat.</p>
            </div>
            <button className="help-close" onClick={() => setOpen(false)} type="button">×</button>
          </div>
          <div className="prompt-list">
            {PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setMessage(prompt)}>{prompt}</button>
            ))}
          </div>
          <form className="help-form" method="post" action="/api/web/chat/widget">
            <input type="hidden" name="returnTo" value={returnTo} />
            <textarea name="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis pertanyaan kamu..." required />
            <button className="btn primary wide" type="submit">Kirim ke SATSKO</button>
          </form>
        </div>
      )}
      <button className="help-fab" onClick={() => setOpen((value) => !value)} type="button">
        <span>💬</span>
        <b>Help</b>
      </button>
    </div>
  );
}
