export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function ConsoleUsers() {
  const { data } = await supabaseAdmin().from('web_users').select('*').order('created_at', { ascending: false }).limit(100);
  return <><div className="topbar"><div><h2>Users</h2><p>Role owner dan merchant dibedakan otomatis.</p></div></div><div className="card"><table className="table"><thead><tr><th>Email</th><th>Nama</th><th>Role</th><th>Status</th><th>Plan</th><th>Daftar</th></tr></thead><tbody>{(data || []).map((u) => <tr key={u.id}><td>{u.email}</td><td>{u.name}</td><td>{u.role}</td><td>{u.status}</td><td>{u.plan_code || '-'}</td><td>{new Date(u.created_at).toLocaleString('id-ID')}</td></tr>)}</tbody></table></div></>;
}
