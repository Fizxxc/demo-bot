import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function TerminalPage() {
  const user = await requireUser();
  const db = supabaseAdmin();
  const [{ data: tenant }, { data: logs }] = await Promise.all([
    user.tenant_id ? db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null },
    db.from('terminal_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(120)
  ]);
  const terminalLogs = [...(logs || [])].reverse();
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Runtime Control</p>
          <h2>Terminal Bot</h2>
          <p>Jalankan bot, matikan webhook, dan pantau proses seperti command center.</p>
        </div>
        <span className="badge"><span className={`status-dot ${tenant?.is_active ? 'on' : ''}`}></span> {tenant?.is_active ? 'ONLINE' : 'OFFLINE'}</span>
      </div>

      <div className="grid two terminal-grid">
        <div className="card terminal-card">
          <div className="terminal-head">
            <div>
              <b>KOGRAPH:/merchant/bot</b>
              <p>Command yang tersedia: start, stop, status, clear</p>
            </div>
            <span className={tenant?.is_active ? 'pill good' : 'pill'}>{tenant?.is_active ? 'running' : 'stopped'}</span>
          </div>
          <div className="terminal">
            {terminalLogs.map((log) => (
              <div className="log" key={log.id}>
                <span className="time">{new Date(log.created_at).toLocaleString('id-ID')}</span> <span className={`sev sev-${log.severity}`}>[{log.severity}]</span> {log.message}
              </div>
            ))}
            {!terminalLogs.length && <div className="log">Belum ada log. Ketik <b>start</b> atau tekan tombol Start Bot.</div>}
          </div>
          <form className="terminal-input" method="post" action="/api/web/terminal/command">
            <span>$</span>
            <input name="command" placeholder="ketik: start / stop / status / clear" autoComplete="off" required />
            <button className="btn primary" type="submit">Enter</button>
          </form>
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <form method="post" action="/api/web/bot/start"><button className="btn primary wide" type="submit">▶ Start Bot</button></form>
            <form method="post" action="/api/web/bot/stop"><button className="btn danger wide" type="submit">■ Stop Bot</button></form>
          </div>
          <div className="stat-list">
            <div className="stat"><b>Tenant ID</b><p>{tenant?.id || 'Belum ada tenant. Simpan konfigurasi bot dulu.'}</p></div>
            <div className="stat"><b>Bot Username</b><p>{tenant?.bot_username ? `@${tenant.bot_username}` : 'Belum terbaca'}</p></div>
            <div className="stat"><b>Store</b><p>{tenant?.store_name || '-'}</p></div>
          </div>
        </div>
      </div>
    </>
  );
}
