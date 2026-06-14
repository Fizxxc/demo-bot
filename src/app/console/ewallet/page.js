import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

async function loadEwallets() {
  const db = supabaseAdmin();
  const { data: wallets, error } = await db.from('merchant_ewallets').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return { wallets: [], usersById: {}, error: error.message };
  const userIds = [...new Set((wallets || []).map((item) => item.user_id).filter(Boolean))];
  if (!userIds.length) return { wallets: wallets || [], usersById: {}, error: null };
  const { data: users } = await db.from('web_users').select('id,email,name,status,plan_code').in('id', userIds);
  const usersById = Object.fromEntries((users || []).map((user) => [user.id, user]));
  return { wallets: wallets || [], usersById, error: null };
}

export default async function ConsoleEwallet() {
  const { wallets, usersById, error } = await loadEwallets();
  const pending = wallets.filter((item) => item.status === 'pending');
  const reviewed = wallets.filter((item) => item.status !== 'pending');
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Owner Console</p>
          <h2>Validasi E-Wallet</h2>
          <p>Konfirmasi akun valid sebelum merchant bisa withdraw. Data diambil langsung dari tabel merchant_ewallets agar tidak kosong karena relasi Supabase.</p>
        </div>
        <span className="badge">{pending.length} pending</span>
      </div>
      {error && <div className="notice">Gagal membaca e-wallet: {error}</div>}
      <div className="grid two">
        <div className="card">
          <h3>Menunggu Validasi</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>User</th><th>Provider</th><th>Nomor</th><th>Nama Rekening</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {pending.map((e) => {
                  const u = usersById[e.user_id];
                  return (
                    <tr key={e.id}>
                      <td><b>{u?.name || 'Unknown'}</b><br/><span className="muted">{u?.email || e.user_id}</span></td>
                      <td>{e.provider}</td>
                      <td>{e.account_number}</td>
                      <td>{e.account_name}</td>
                      <td><span className="pill">pending</span></td>
                      <td>
                        <div className="nav-links">
                          <form method="post" action="/api/console/ewallet/review"><input type="hidden" name="id" value={e.id}/><input type="hidden" name="status" value="valid"/><button className="btn primary" type="submit">Valid</button></form>
                          <form method="post" action="/api/console/ewallet/review"><input type="hidden" name="id" value={e.id}/><input type="hidden" name="status" value="rejected"/><button className="btn danger" type="submit">Tolak</button></form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!pending.length && <tr><td colSpan="6" className="muted">Belum ada e-wallet yang menunggu validasi.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>Riwayat Validasi</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>User</th><th>Provider</th><th>Nomor</th><th>Status</th><th>Tanggal</th></tr></thead>
              <tbody>
                {reviewed.map((e) => {
                  const u = usersById[e.user_id];
                  return <tr key={e.id}><td>{u?.email || e.user_id}</td><td>{e.provider}</td><td>{e.account_number}</td><td><span className={e.status === 'valid' ? 'pill good' : 'pill'}>{e.status}</span></td><td>{new Date(e.created_at).toLocaleString('id-ID')}</td></tr>;
                })}
                {!reviewed.length && <tr><td colSpan="5" className="muted">Belum ada riwayat validasi.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
