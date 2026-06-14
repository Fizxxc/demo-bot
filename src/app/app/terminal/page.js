import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function TerminalPage() {
  const user = await requireUser();
  const db = supabaseAdmin();
  const [{ data: tenant }, { data: logs }] = await Promise.all([
    user.tenant_id ? db.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle() : { data: null },
    db.from('terminal_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(80)
  ]);
  return (
    <>
      <div className="topbar"><div><h2>Terminal</h2><p>Monitor bot berjalan, mati, atau error.</p></div><span className="badge"><span className={`status-dot ${tenant?.is_active ? 'on' : ''}`}></span> {tenant?.is_active ? 'ONLINE' : 'OFFLINE'}</span></div>
      <div className="terminal">
        {(logs || []).map((log) => <div className="log" key={log.id}><span className="time">{new Date(log.created_at).toLocaleString('id-ID')}</span> [{log.severity}] {log.message}</div>)}
        {!logs?.length && <div className="log">Belum ada log. Start bot untuk mulai.</div>}
      </div>
    </>
  );
}
