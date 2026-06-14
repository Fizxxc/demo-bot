import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function NotificationsPage() {
  const { data } = await supabaseAdmin().from('owner_notifications').select('*, web_users(email)').order('created_at', { ascending: false }).limit(100);
  return <><div className="topbar"><div><h2>Notifikasi SATSKO</h2><p>Semua percobaan akses tanpa plan, akun diblokir, validasi, dan request masuk.</p></div></div><div className="card">{(data || []).map((n) => <div className="stat" key={n.id}><b>{n.title}</b><p>{n.message}</p><span className="muted">{n.web_users?.email || '-'} • {new Date(n.created_at).toLocaleString('id-ID')}</span></div>)}</div></>;
}
