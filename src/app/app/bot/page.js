import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function BotSetting() {
  const user = await requireUser();
  const { data: tenant } = user.tenant_id ? await supabaseAdmin().from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null };
  return (
    <>
      <div className="topbar"><div><h2>Bot Setting</h2><p>Simpan token bot dan owner Telegram ID. Webhook akan diset otomatis dari tombol Start.</p></div></div>
      <div className="grid two">
        <div className="card">
          <form className="form" method="post" action="/api/web/bot/save">
            <input className="input" name="storeName" defaultValue={tenant?.store_name || ''} placeholder="Nama store" required />
            <input className="input" name="botToken" defaultValue={tenant?.bot_token || ''} placeholder="Token Bot Telegram" required />
            <input className="input" name="ownerTelegramId" defaultValue={tenant?.owner_telegram_id || ''} placeholder="Owner Telegram ID" required />
            <input className="input" name="pakasirProjectSlug" defaultValue={tenant?.pakasir_project_slug || ''} placeholder="Pakasir project slug opsional" />
            <input className="input" name="pakasirApiKey" defaultValue={tenant?.pakasir_api_key || ''} placeholder="Pakasir API key opsional" />
            <button className="btn primary" type="submit">Simpan Bot</button>
          </form>
        </div>
        <div className="card">
          <h3>Control</h3>
          <p>Status: <span className={`status-dot ${tenant?.is_active ? 'on' : ''}`}></span> {tenant?.is_active ? 'Running' : 'Stopped'}</p>
          <div className="nav-links">
            <form method="post" action="/api/web/bot/start"><button className="btn primary" type="submit">Start Bot</button></form>
            <form method="post" action="/api/web/bot/stop"><button className="btn danger" type="submit">Stop Bot</button></form>
          </div>
        </div>
      </div>
    </>
  );
}
