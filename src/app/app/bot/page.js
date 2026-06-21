export const dynamic = 'force-dynamic';
import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import MascotCard from '../../../components/MascotCard.js';

export default async function BotSetting() {
  const user = await requireUser();
  const { data: tenant } = user.tenant_id ? await supabaseAdmin().from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null };
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Konfigurasi</p>
          <h2>Bot Setting</h2>
          <p>Simpan token bot, owner Telegram ID, dan credential payment. Start/stop bot sekarang dilakukan dari Terminal Bot.</p>
        </div>
        <a className="btn primary" href="/app/terminal">Buka Terminal</a>
      </div>
      <div className="grid two">
        <div className="card">
          <h3>Identitas Bot</h3>
          <form className="form" method="post" action="/api/web/bot/save">
            <input className="input" name="storeName" defaultValue={tenant?.store_name || ''} placeholder="Nama store" required />
            <input className="input" name="botToken" defaultValue={tenant?.bot_token || ''} placeholder="Token Bot Telegram" required />
            <input className="input" name="ownerTelegramId" defaultValue={tenant?.owner_telegram_id || ''} placeholder="Owner Telegram ID" required />
            <input className="input" name="pakasirProjectSlug" defaultValue={tenant?.pakasir_project_slug || ''} placeholder="Pakasir project slug opsional" />
            <input className="input" name="pakasirApiKey" defaultValue={tenant?.pakasir_api_key || ''} placeholder="Pakasir API key opsional" />
            <button className="btn primary" type="submit">Simpan Konfigurasi</button>
          </form>
        </div>
        <MascotCard
          image="/assets/mascots/presenter-point.webp"
          title="Konfigurasi dijelaskan dengan jelas."
          text="Pose presentasi dipakai untuk halaman pengaturan supaya terasa seperti guided setup yang mudah diikuti."
          badge="Setting Mascot"
        />
        <div className="card soft-card">
          <h3>Status Bot</h3>
          <p><span className={`status-dot ${tenant?.is_active ? 'on' : ''}`}></span> {tenant?.is_active ? 'Running' : 'Stopped'}</p>
          <p className="muted">Untuk keamanan dan monitoring yang lebih jelas, proses start/stop webhook dipindah ke Terminal Bot. Di sana kamu bisa melihat setiap langkah proses secara realtime dari log.</p>
          <div className="notice-mini">Tip: ketik <b>start</b>, <b>stop</b>, atau <b>status</b> di Terminal Bot.</div>
        </div>
      </div>
    </>
  );
}
